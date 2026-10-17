//! 시리얼 세션 — 읽기 스레드 하나가 수신·프레임 구분·묶음 전송·자동 재연결을 맡는다.

use crate::checksum::ChecksumKind;
use crate::framer::{FrameMode, Framer};
use crate::ports::{self, PortInfo};
use serde::{Deserialize, Serialize};
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::fs::File;
use std::io::{BufWriter, ErrorKind, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
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
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

struct Shared {
    framer: Mutex<Framer>,
    rx_check: Mutex<Option<ChecksumKind>>,
    writer: Mutex<Option<Box<dyn SerialPort>>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<BufWriter<File>>>,
    stop: AtomicBool,
}

pub struct Session {
    shared: Arc<Shared>,
    thread: Option<JoinHandle<()>>,
}

fn open(cfg: &SerialConfig) -> Result<Box<dyn SerialPort>, String> {
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

impl Session {
    pub fn start(
        cfg: SerialConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        events: Channel<SessionEvent>,
    ) -> Result<Self, String> {
        let port = open(&cfg)?;
        let identity = ports::list()
            .into_iter()
            .find(|p| p.name == cfg.port)
            .map(|p| p.identity())
            .unwrap_or_else(|| cfg.port.clone());
        let writer = port.try_clone().map_err(|e| e.to_string())?;
        let shared = Arc::new(Shared {
            framer: Mutex::new(Framer::new(mode)),
            rx_check: Mutex::new(rx_check),
            writer: Mutex::new(Some(writer)),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            stop: AtomicBool::new(false),
        });
        let _ = events.send(SessionEvent::Status { state: "connected", port: cfg.port.clone(), message: None });
        let s = shared.clone();
        let thread = std::thread::spawn(move || reader_loop(port, cfg, identity, s, events));
        Ok(Self { shared, thread: Some(thread) })
    }

    pub fn set_framing(&self, mode: FrameMode, rx_check: Option<ChecksumKind>) {
        self.shared.framer.lock().unwrap().set_mode(mode);
        *self.shared.rx_check.lock().unwrap() = rx_check;
    }

    /// 보내고, 화면에 보일 송신 프레임을 같은 묶음 흐름에 넣는다.
    pub fn send(&self, bytes: &[u8]) -> Result<(), String> {
        let mut w = self.shared.writer.lock().unwrap();
        let port = w.as_mut().ok_or("포트가 끊겨 있습니다")?;
        port.write_all(bytes).map_err(|e| e.to_string())?;
        port.flush().map_err(|e| e.to_string())?;
        self.shared.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "tx", bytes: bytes.to_vec(), check: None });
        Ok(())
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
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

const BATCH: Duration = Duration::from_millis(50);

fn reader_loop(
    mut port: Box<dyn SerialPort>,
    cfg: SerialConfig,
    identity: String,
    s: Arc<Shared>,
    events: Channel<SessionEvent>,
) {
    let mut buf = [0u8; 4096];
    let mut last_flush = Instant::now();
    loop {
        if s.stop.load(Ordering::SeqCst) {
            flush(&s, &events);
            let _ = events.send(SessionEvent::Status { state: "closed", port: cfg.port.clone(), message: None });
            return;
        }
        match port.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => {
                let frames = s.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                push_rx(&s, frames);
            }
            Err(e) if e.kind() == ErrorKind::TimedOut || e.kind() == ErrorKind::WouldBlock => {}
            Err(e) => {
                // USB 를 뽑았거나 장치가 리셋됨
                flush(&s, &events);
                *s.writer.lock().unwrap() = None;
                let _ = events.send(SessionEvent::Status {
                    state: "disconnected",
                    port: cfg.port.clone(),
                    message: Some(e.to_string()),
                });
                match reconnect(&cfg, &identity, &s, &events) {
                    Some(p) => port = p,
                    None => return,
                }
                continue;
            }
        }
        let tail = s.framer.lock().unwrap().poll(Instant::now());
        if let Some(f) = tail {
            push_rx(&s, vec![f]);
        }
        if last_flush.elapsed() >= BATCH {
            flush(&s, &events);
            last_flush = Instant::now();
        }
    }
}

fn push_rx(s: &Shared, frames: Vec<Vec<u8>>) {
    if frames.is_empty() {
        return;
    }
    let check = *s.rx_check.lock().unwrap();
    let ts = now_ms();
    let mut pending = s.pending.lock().unwrap();
    for bytes in frames {
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
    identity: &str,
    s: &Shared,
    events: &Channel<SessionEvent>,
) -> Option<Box<dyn SerialPort>> {
    if !cfg.auto_reconnect {
        let _ = events.send(SessionEvent::Status { state: "closed", port: cfg.port.clone(), message: None });
        return None;
    }
    let _ = events.send(SessionEvent::Status { state: "reconnecting", port: cfg.port.clone(), message: None });
    loop {
        for _ in 0..10 {
            if s.stop.load(Ordering::SeqCst) {
                let _ = events.send(SessionEvent::Status { state: "closed", port: cfg.port.clone(), message: None });
                return None;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let found: Option<PortInfo> = ports::list().into_iter().find(|p| p.identity() == identity);
        let Some(info) = found else { continue };
        // 일련번호로 찾았으면 COM 번호가 바뀌었어도 새 이름으로 연다
        let mut c = cfg.clone();
        c.port = info.name.clone();
        if let Ok(p) = open(&c)
            && let Ok(w) = p.try_clone() {
                *s.writer.lock().unwrap() = Some(w);
                let msg = (c.port != cfg.port).then(|| format!("{} → {}", cfg.port, c.port));
                let _ = events.send(SessionEvent::Status { state: "connected", port: c.port, message: msg });
                return Some(p);
            }
    }
}
