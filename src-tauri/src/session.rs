//! 시리얼 세션.
//! - 읽기 스레드: 수신 · 프레임 구분 · 50ms 묶음 전송 · 끊김 감지 · 자동 재연결
//! - 쓰기 스레드: 송신 큐. 부분 쓰기를 이어 쓰고, 흐름 제어로 막혀도 화면을 멈추지 않는다
//!
//! 윈도우 serialport 는 읽기·쓰기가 같은 동기 핸들과 같은 timeout 을 쓴다(4.10 com.rs).
//! 그래서 timeout 은 짧게(5ms) 두고, 쓰기 쪽에서 TimedOut 을 «아직 못 보냄» 으로 보고 이어 쓴다.

use crate::checksum::ChecksumKind;
use crate::framer::{Cut, FrameMode, Framer};
use crate::ports::{self, PortInfo};
use serde::{Deserialize, Serialize};
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::fs::File;
use std::io::{BufWriter, ErrorKind, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::ipc::Channel;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialConfig {
    pub port: String,
    pub baud: u32,
    pub data_bits: u8,
    /// "none" | "odd" | "even"
    pub parity: String,
    /// 1 | 2
    pub stop_bits: u8,
    /// "none" | "hardware" | "software"
    pub flow: String,
    #[serde(default)]
    pub dtr: bool,
    #[serde(default)]
    pub rts: bool,
    #[serde(default = "yes")]
    pub auto_reconnect: bool,
}

fn yes() -> bool {
    true
}

#[derive(Debug, Clone, Serialize)]
pub struct Frame {
    /// 유닉스 시각(ms)
    pub ts: u64,
    /// "rx" | "tx"
    pub dir: &'static str,
    pub bytes: Vec<u8>,
    /// 수신 검증 체크섬이 설정돼 있을 때 결과
    pub check: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionEvent {
    Frames { frames: Vec<Frame> },
    /// "connected" | "disconnected" | "reconnecting" | "closed"
    Status { state: &'static str, port: String, message: Option<String> },
    /// 송신 실패 등 연결은 유지되는 오류
    Error { message: String },
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

type Port = Box<dyn SerialPort>;

struct Shared {
    framer: Mutex<Framer>,
    rx_check: Mutex<Option<ChecksumKind>>,
    /// 쓰기용 복제 핸들. 끊기면 None — 재연결할 때 읽기 스레드가 새로 넣는다
    writer: Mutex<Option<Port>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<BufWriter<File>>>,
    stop: AtomicBool,
}

pub struct Session {
    shared: Arc<Shared>,
    tx: Option<Sender<Vec<u8>>>,
    reader: Option<JoinHandle<()>>,
    writer: Option<JoinHandle<()>>,
}

fn open(cfg: &SerialConfig) -> Result<Port, String> {
    let mut p = serialport::new(&cfg.port, cfg.baud)
        .data_bits(match cfg.data_bits {
            5 => DataBits::Five,
            6 => DataBits::Six,
            7 => DataBits::Seven,
            _ => DataBits::Eight,
        })
        .parity(match cfg.parity.as_str() {
            "odd" => Parity::Odd,
            "even" => Parity::Even,
            _ => Parity::None,
        })
        .stop_bits(if cfg.stop_bits == 2 { StopBits::Two } else { StopBits::One })
        .flow_control(match cfg.flow.as_str() {
            "hardware" => FlowControl::Hardware,
            "software" => FlowControl::Software,
            _ => FlowControl::None,
        })
        .timeout(Duration::from_millis(5))
        .open()
        .map_err(|e| format!("{}: {e}", cfg.port))?;
    let _ = p.write_data_terminal_ready(cfg.dtr);
    let _ = p.write_request_to_send(cfg.rts);
    Ok(p)
}

/// 다시 꽂힌 장치를 알아보는 기준
#[derive(Clone)]
struct Identity {
    key: String,
    /// 일련번호 없는 USB(CH340 등)는 VID:PID 만으로 «새로 나타난 단 하나» 를 찾는다
    vid_pid: Option<(u16, u16)>,
    has_serial: bool,
}

impl Identity {
    fn of(name: &str) -> Self {
        match ports::list().into_iter().find(|p| p.name == name) {
            Some(p) => Self {
                key: p.identity(),
                vid_pid: p.vid.zip(p.pid),
                has_serial: p.serial_number.as_deref().is_some_and(|s| !s.is_empty()),
            },
            None => Self { key: name.to_string(), vid_pid: None, has_serial: false },
        }
    }

    fn present(&self, list: &[PortInfo]) -> bool {
        list.iter().any(|p| p.identity() == self.key)
    }

    /// 재연결 대상. `before` 는 끊긴 순간의 포트 이름들.
    fn find<'a>(&self, list: &'a [PortInfo], before: &[String]) -> Option<&'a PortInfo> {
        if let Some(p) = list.iter().find(|p| p.identity() == self.key) {
            return Some(p);
        }
        if self.has_serial {
            return None;
        }
        let (v, pid) = self.vid_pid?;
        let fresh: Vec<&PortInfo> = list
            .iter()
            .filter(|p| p.vid == Some(v) && p.pid == Some(pid) && !before.contains(&p.name))
            .collect();
        (fresh.len() == 1).then(|| fresh[0])
    }
}

impl Session {
    pub fn start(
        cfg: SerialConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        events: Channel<SessionEvent>,
    ) -> Result<Self, String> {
        let port = open(&cfg)?;
        let identity = Identity::of(&cfg.port);
        let writer_handle = port.try_clone().map_err(|e| e.to_string())?;
        let shared = Arc::new(Shared {
            framer: Mutex::new(Framer::new(mode)),
            rx_check: Mutex::new(rx_check),
            writer: Mutex::new(Some(writer_handle)),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            stop: AtomicBool::new(false),
        });
        let _ = events.send(SessionEvent::Status { state: "connected", port: cfg.port.clone(), message: None });

        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        let (s, ev, baud) = (shared.clone(), events.clone(), cfg.baud);
        let writer = std::thread::spawn(move || writer_loop(rx, baud, s, ev));
        let s = shared.clone();
        let reader = std::thread::spawn(move || reader_loop(port, cfg, identity, s, events));
        Ok(Self { shared, tx: Some(tx), reader: Some(reader), writer: Some(writer) })
    }

    pub fn set_framing(&self, mode: FrameMode, rx_check: Option<ChecksumKind>) {
        self.shared.framer.lock().unwrap().set_mode(mode);
        *self.shared.rx_check.lock().unwrap() = rx_check;
    }

    /// 송신 큐에 넣는다. 실제로 나간 뒤 화면에 TX 줄이 찍힌다.
    pub fn send(&self, bytes: Vec<u8>) -> Result<(), String> {
        if self.shared.writer.lock().unwrap().is_none() {
            return Err("포트가 끊겨 있습니다".into());
        }
        self.tx.as_ref().ok_or("세션이 닫혔습니다")?.send(bytes).map_err(|_| "세션이 닫혔습니다".to_string())
    }

    /// 수신·송신 프레임을 파일에 계속 덧붙인다. None 이면 멈춘다.
    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        let file = match path {
            Some(p) => Some(BufWriter::new(
                std::fs::OpenOptions::new().create(true).append(true).open(&p).map_err(|e| format!("{p}: {e}"))?,
            )),
            None => None,
        };
        let mut log = self.shared.log.lock().unwrap();
        if let Some(old) = log.as_mut() {
            let _ = old.flush();
        }
        *log = file;
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        drop(self.tx.take()); // 쓰기 스레드가 큐 끝을 보고 나온다
        for t in [self.reader.take(), self.writer.take()].into_iter().flatten() {
            let _ = t.join();
        }
    }
}

const BATCH: Duration = Duration::from_millis(50);
const WATCH: Duration = Duration::from_secs(1);

fn status(events: &Channel<SessionEvent>, state: &'static str, port: &str, message: Option<String>) {
    let _ = events.send(SessionEvent::Status { state, port: port.to_string(), message });
}

fn reader_loop(port: Port, cfg: SerialConfig, identity: Identity, s: Arc<Shared>, events: Channel<SessionEvent>) {
    let mut port = Some(port);
    let mut name = cfg.port.clone();
    let mut buf = [0u8; 4096];
    let mut last_flush = Instant::now();
    let mut last_watch = Instant::now();
    loop {
        if s.stop.load(Ordering::SeqCst) {
            drop(port.take());
            flush(&s, &events);
            status(&events, "closed", &name, None);
            return;
        }
        let Some(p) = port.as_mut() else { unreachable!() };
        let mut lost: Option<String> = match p.read(&mut buf) {
            Ok(0) => None,
            Ok(n) => {
                let frames = s.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                push_rx(&s, frames);
                None
            }
            Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => None,
            Err(e) => Some(e.to_string()),
        };
        // 일부 드라이버(블루투스 SPP 등)는 뽑혀도 TimedOut 만 낸다 → 목록에서 사라졌는지 따로 본다
        if lost.is_none() && last_watch.elapsed() >= WATCH {
            last_watch = Instant::now();
            if !identity.present(&ports::list()) {
                lost = Some("장치가 목록에서 사라졌습니다".into());
            }
        }
        if let Some(msg) = lost {
            // 핸들을 먼저 닫는다 — 쥐고 있으면 같은 COM 을 다시 열 때 Access denied
            drop(port.take());
            *s.writer.lock().unwrap() = None;
            flush(&s, &events);
            status(&events, "disconnected", &name, Some(msg));
            let before: Vec<String> = ports::list().into_iter().map(|p| p.name).collect();
            match reconnect(&cfg, &identity, &before, &s, &events) {
                Some((p, n)) => {
                    port = Some(p);
                    name = n;
                }
                None => return,
            }
            continue;
        }
        if let Some(f) = s.framer.lock().unwrap().poll(Instant::now()) {
            push_rx(&s, vec![f]);
        }
        if last_flush.elapsed() >= BATCH {
            flush(&s, &events);
            last_flush = Instant::now();
        }
    }
}

/// 송신 큐. 부분 쓰기와 TimedOut 을 이어 쓰고, 정해진 시간 안에 못 보내면 오류를 알린다.
/// FlushFileBuffers(flush) 는 흐름 제어로 막히면 끝없이 기다리므로 부르지 않는다.
fn writer_loop(rx: Receiver<Vec<u8>>, baud: u32, s: Arc<Shared>, events: Channel<SessionEvent>) {
    loop {
        let bytes = match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(b) => b,
            Err(RecvTimeoutError::Timeout) => {
                if s.stop.load(Ordering::SeqCst) {
                    return;
                }
                continue;
            }
            Err(RecvTimeoutError::Disconnected) => return,
        };
        // 이론 송신 시간(1바이트 = 약 11비트)의 3배 + 1초
        let budget = Duration::from_millis(1_000 + bytes.len() as u64 * 11 * 3_000 / baud.max(1) as u64);
        let deadline = Instant::now() + budget;
        let mut sent = 0;
        let mut error = None;
        while sent < bytes.len() {
            if s.stop.load(Ordering::SeqCst) {
                return;
            }
            let mut w = s.writer.lock().unwrap();
            let Some(port) = w.as_mut() else {
                error = Some("포트가 끊겨 있습니다".to_string());
                break;
            };
            match port.write(&bytes[sent..]) {
                Ok(n) => sent += n,
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                Err(e) => {
                    error = Some(e.to_string());
                    break;
                }
            }
            drop(w);
            if sent < bytes.len() {
                if Instant::now() >= deadline {
                    error = Some(format!("송신 시간 초과 — {sent}/{} 바이트만 나감 (흐름 제어·CTS 확인)", bytes.len()));
                    break;
                }
                std::thread::sleep(Duration::from_millis(1));
            }
        }
        if sent > 0 {
            s.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "tx", bytes: bytes[..sent].to_vec(), check: None });
        }
        if let Some(message) = error {
            let _ = events.send(SessionEvent::Error { message });
        }
    }
}

fn push_rx(s: &Shared, frames: Vec<Cut>) {
    if frames.is_empty() {
        return;
    }
    let check = *s.rx_check.lock().unwrap();
    // Instant(첫 바이트) → 벽시계 ms
    let (now_i, now_w) = (Instant::now(), now_ms());
    let mut pending = s.pending.lock().unwrap();
    for (at, bytes) in frames {
        let ts = now_w.saturating_sub(now_i.saturating_duration_since(at).as_millis() as u64);
        let c = check.and_then(|k| k.verify(&bytes));
        pending.push(Frame { ts, dir: "rx", bytes, check: c });
    }
}

fn flush(s: &Shared, events: &Channel<SessionEvent>) {
    let frames = std::mem::take(&mut *s.pending.lock().unwrap());
    if frames.is_empty() {
        return;
    }
    if let Some(log) = s.log.lock().unwrap().as_mut() {
        for f in &frames {
            let _ = writeln!(log, "{}", log_line(f));
        }
        let _ = log.flush();
    }
    let _ = events.send(SessionEvent::Frames { frames });
}

/// «2026-10-17 21:05:03.123 RX 01 03 00 00 [OK]»
pub fn log_line(f: &Frame) -> String {
    let t = chrono::DateTime::from_timestamp_millis(f.ts as i64)
        .map(|d| d.with_timezone(&chrono::Local).format("%Y-%m-%d %H:%M:%S%.3f").to_string())
        .unwrap_or_default();
    let hex: Vec<String> = f.bytes.iter().map(|b| format!("{b:02X}")).collect();
    let check = match f.check {
        Some(true) => " [OK]",
        Some(false) => " [CHECK FAIL]",
        None => "",
    };
    format!("{t} {} {}{check}", f.dir.to_uppercase(), hex.join(" "))
}

/// 같은 장치가 다시 나타날 때까지 기다렸다가 연다. 사용자가 닫으면 None.
fn reconnect(
    cfg: &SerialConfig,
    identity: &Identity,
    before: &[String],
    s: &Shared,
    events: &Channel<SessionEvent>,
) -> Option<(Port, String)> {
    if !cfg.auto_reconnect {
        status(events, "closed", &cfg.port, None);
        return None;
    }
    status(events, "reconnecting", &cfg.port, None);
    loop {
        for _ in 0..10 {
            if s.stop.load(Ordering::SeqCst) {
                status(events, "closed", &cfg.port, None);
                return None;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let list = ports::list();
        let Some(info) = identity.find(&list, before) else { continue };
        // COM 번호가 바뀌었어도 같은 장치면 새 이름으로 연다
        let mut c = cfg.clone();
        c.port = info.name.clone();
        let Ok(p) = open(&c) else { continue };
        let Ok(w) = p.try_clone() else { continue };
        *s.writer.lock().unwrap() = Some(w);
        let msg = (c.port != cfg.port).then(|| format!("{} → {}", cfg.port, c.port));
        status(events, "connected", &c.port, msg);
        return Some((p, c.port));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn usb(name: &str, vid: u16, pid: u16, sn: Option<&str>) -> PortInfo {
        PortInfo {
            name: name.into(),
            kind: "usb",
            vid: Some(vid),
            pid: Some(pid),
            serial_number: sn.map(Into::into),
            manufacturer: None,
            product: None,
        }
    }

    #[test]
    fn reconnect_by_serial_number_even_if_com_changes() {
        let id = Identity { key: usb("COM3", 0x0403, 0x6001, Some("A1")).identity(), vid_pid: Some((0x0403, 0x6001)), has_serial: true };
        let list = vec![usb("COM7", 0x0403, 0x6001, Some("A1"))];
        assert_eq!(id.find(&list, &[]).unwrap().name, "COM7");
        // 일련번호가 다른 같은 칩에는 붙지 않는다
        let other = vec![usb("COM7", 0x0403, 0x6001, Some("B2"))];
        assert!(id.find(&other, &[]).is_none());
    }

    #[test]
    fn no_serial_takes_single_fresh_port_only() {
        let id = Identity { key: usb("COM3", 0x1A86, 0x7523, None).identity(), vid_pid: Some((0x1A86, 0x7523)), has_serial: false };
        let before = vec!["COM4".to_string()];
        // 다른 USB 구멍에 꽂아 COM9 로 나타남 — 새로 생긴 것이 하나뿐이면 그것
        let list = vec![usb("COM4", 0x1A86, 0x7523, None), usb("COM9", 0x1A86, 0x7523, None)];
        assert_eq!(id.find(&list, &before).unwrap().name, "COM9");
        // 새로 생긴 것이 둘이면 어느 것인지 모르므로 기다린다
        let list2 = vec![usb("COM9", 0x1A86, 0x7523, None), usb("COM10", 0x1A86, 0x7523, None)];
        assert!(id.find(&list2, &before).is_none());
    }
}
