//! 시리얼 세션.
//! - 읽기 스레드: 수신 · 프레임 구분 · 50ms 묶음 전송 · 끊김 감지 · 자동 재연결
//! - 쓰기 스레드: 송신 큐. 부분 쓰기를 이어 쓰고, 흐름 제어로 막혀도 화면을 멈추지 않는다
//!
//! 윈도우 serialport 는 읽기·쓰기가 같은 동기 핸들과 같은 timeout 을 쓴다(4.10 com.rs).
//! 그래서 timeout 은 짧게(5ms) 두고, 쓰기 쪽에서 TimedOut 을 «아직 못 보냄» 으로 보고 이어 쓴다.

use crate::autoreply::Rule;
use crate::ports::PortInfo;
use crate::checksum::ChecksumKind;
use crate::framer::{Cut, FrameMode, Framer};
use crate::ports;
use serde::{Deserialize, Serialize};
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::fs::File;
use std::io::{BufWriter, ErrorKind, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

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

pub use crate::event::{EventSink, Frame, SessionEvent, log_line, now_ms};

type Port = Box<dyn SerialPort>;

/// 받은 프레임에 답하는 쪽(Modbus 슬레이브 흉내 등)이 돌려주는 것
pub struct Reply {
    pub bytes: Option<Vec<u8>>,
    pub delay_ms: u64,
    /// 사건 줄로 남길 말
    pub note: Option<String>,
}

/// 프로그램이 꽂는 응답기. 자동응답 규칙보다 먼저 불린다.
pub type Responder = Box<dyn FnMut(&[u8]) -> Reply + Send>;

struct Shared {
    /// 지금 적용된 설정 — 연결 중 변경·재연결에 쓴다
    cfg: Mutex<SerialConfig>,
    framer: Mutex<Framer>,
    rx_check: Mutex<Option<ChecksumKind>>,
    /// 쓰기용 복제 핸들. 끊기면 None — 재연결할 때 읽기 스레드가 새로 넣는다
    writer: Mutex<Option<Port>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<BufWriter<File>>>,
    rules: Mutex<Vec<Rule>>,
    responder: Mutex<Option<Responder>>,
    /// 마지막으로 응답기·규칙이 보낸 것과 보낸 시각 — 그 직후 똑같은 것이 들어오면
    /// 루프백·에코로 보고 다시 답하지 않는다. 한 번 쓰면 비운다(Modbus 05·06 처럼
    /// 요청과 응답이 같은 경우, 다음 정상 요청까지 막지 않도록)
    last_reply: Mutex<Option<(Vec<u8>, Instant)>>,
    /// 목록 감시 스레드가 «장치가 목록에서 사라짐» 을 알리는 자리
    gone: AtomicBool,
    stop: AtomicBool,
}

pub struct Session {
    shared: Arc<Shared>,
    tx: Option<Sender<Vec<u8>>>,
    reader: Option<JoinHandle<()>>,
    writer: Option<JoinHandle<()>>,
    watcher: Option<JoinHandle<()>>,
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
    /// 열 때 포트 목록에 있었는지. 없던 포트(일부 가상 COM, \\.\COMn 직접 입력)는
    /// 목록 감시로 끊김을 판단하지 않는다 — 읽기 오류로만
    listed: bool,
}

impl Identity {
    fn of(name: &str) -> Self {
        match ports::list().into_iter().find(|p| p.name == name) {
            Some(p) => Self {
                key: p.identity(),
                vid_pid: p.vid.zip(p.pid),
                has_serial: p.serial_number.as_deref().is_some_and(|s| !s.is_empty()),
                listed: true,
            },
            None => Self { key: name.to_string(), vid_pid: None, has_serial: false, listed: false },
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

/// 버려지기만 해도 스레드가 멈추게(보관함에서 지워진 세션 등). `stop` 은 끝까지 기다린다.
impl Drop for Session {
    fn drop(&mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
    }
}

impl Session {
    /// `responder` 는 첫 바이트가 오기 전에 꽂혀 있어야 시작 직후 요청도 놓치지 않는다
    pub fn start(
        cfg: SerialConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        responder: Option<Responder>,
        events: EventSink,
    ) -> Result<Self, String> {
        let port = open(&cfg)?;
        let identity = Identity::of(&cfg.port);
        let writer_handle = port.try_clone().map_err(|e| e.to_string())?;
        let shared = Arc::new(Shared {
            cfg: Mutex::new(cfg.clone()),
            framer: Mutex::new(Framer::new(mode)),
            rx_check: Mutex::new(rx_check),
            writer: Mutex::new(Some(writer_handle)),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            rules: Mutex::new(Vec::new()),
            responder: Mutex::new(responder),
            last_reply: Mutex::new(None),
            gone: AtomicBool::new(false),
            stop: AtomicBool::new(false),
        });
        events.send(SessionEvent::Status { state: "connected", port: cfg.port.clone(), message: None });
        note(&shared, format!("OPEN {}", describe(&cfg)));
        note(&shared, format!("FRAMING {}", describe_framing(shared.framer.lock().unwrap().mode())));
        if let Some(k) = rx_check {
            note(&shared, format!("RXCHECK {}", k.name()));
        }

        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        let (s, ev) = (shared.clone(), events.clone());
        let writer = std::thread::spawn(move || writer_loop(rx, s, ev));
        // 포트 목록 조회(SetupAPI)는 수십~수백 ms 걸린다 — 읽기 스레드를 막지 않게 따로
        let watcher = identity.listed.then(|| {
            let (s, id) = (shared.clone(), identity.clone());
            std::thread::spawn(move || watch_loop(s, id))
        });
        let (s, replies) = (shared.clone(), tx.clone());
        let reader = std::thread::spawn(move || reader_loop(port, cfg, identity, s, events, replies));
        Ok(Self { shared, tx: Some(tx), reader: Some(reader), writer: Some(writer), watcher })
    }

    pub fn set_framing(&self, mode: FrameMode, rx_check: Option<ChecksumKind>) {
        {
            let mut f = self.shared.framer.lock().unwrap();
            if *f.mode() != mode {
                note(&self.shared, format!("FRAMING {}", describe_framing(&mode)));
                f.set_mode(mode);
            }
        }
        let mut rc = self.shared.rx_check.lock().unwrap();
        if *rc != rx_check {
            note(&self.shared, format!("RXCHECK {}", rx_check.map_or("none", |k| k.name())));
            *rc = rx_check;
        }
    }

    pub fn set_responder(&self, r: Option<Responder>) {
        *self.shared.responder.lock().unwrap() = r;
    }

    pub fn set_auto_reply(&self, rules: Vec<Rule>) {
        let names: Vec<String> = rules.iter().map(|r| r.name.clone()).collect();
        *self.shared.rules.lock().unwrap() = rules;
        note(&self.shared, if names.is_empty() { "AUTO-REPLY off".into() } else { format!("AUTO-REPLY {}", names.join(", ")) });
    }

    /// 연결을 끊지 않고 속도·패리티 등을 바꾼다. 바뀐 항목을 로그에 남긴다.
    pub fn reconfigure(&self, new: SerialConfig) -> Result<(), String> {
        let old = self.shared.cfg.lock().unwrap().clone();
        let changes = diff(&old, &new);
        if changes.is_empty() {
            return Ok(());
        }
        let online = {
            let mut w = self.shared.writer.lock().unwrap();
            match w.as_mut() {
                Some(port) => {
                    apply(port.as_mut(), &new).map_err(|e| e.to_string())?;
                    true
                }
                None => false,
            }
        };
        let mut cfg = self.shared.cfg.lock().unwrap();
        let port_name = cfg.port.clone();
        *cfg = SerialConfig { port: port_name, ..new };
        drop(cfg);
        let later = if online { "" } else { " (다시 연결될 때 적용)" };
        note(&self.shared, format!("SET {}{later}", changes.join(", ")));
        Ok(())
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
        let started = file.is_some();
        {
            let mut log = self.shared.log.lock().unwrap();
            if let Some(old) = log.as_mut() {
                let _ = old.flush();
            }
            *log = file;
        }
        // 파일 첫 줄에 지금 설정을 남겨 로그만 보고도 조건을 알 수 있게
        if started {
            let cfg = self.shared.cfg.lock().unwrap().clone();
            note(&self.shared, format!("LOG START {}", describe(&cfg)));
        }
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        drop(self.tx.take()); // 쓰기 스레드가 큐 끝을 보고 나온다
        for t in [self.writer.take(), self.reader.take(), self.watcher.take()].into_iter().flatten() {
            let _ = t.join();
        }
    }
}

fn note(s: &Shared, text: String) {
    s.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(text), peer: None });
}

/// «COM3 9600 8N1 flow=none DTR=0 RTS=0»
pub fn describe(c: &SerialConfig) -> String {
    let parity = match c.parity.as_str() {
        "odd" => 'O',
        "even" => 'E',
        _ => 'N',
    };
    format!(
        "{} {} {}{}{} flow={} DTR={} RTS={}",
        c.port, c.baud, c.data_bits, parity, c.stop_bits, c.flow, c.dtr as u8, c.rts as u8
    )
}

fn describe_framing(m: &FrameMode) -> String {
    match m {
        FrameMode::Gap { gap_ms } => format!("gap {gap_ms}ms"),
        FrameMode::Terminator { bytes, gap_ms } => {
            let hex: Vec<String> = bytes.iter().map(|b| format!("{b:02X}")).collect();
            format!("terminator [{}] gap {gap_ms}ms", hex.join(" "))
        }
        FrameMode::Fixed { len, gap_ms } => format!("fixed {len} gap {gap_ms}ms"),
        FrameMode::ModbusRtu { baud } => format!("modbus-rtu @{baud}"),
    }
}

/// 바뀐 항목 목록 «baud 9600→115200»
fn diff(a: &SerialConfig, b: &SerialConfig) -> Vec<String> {
    let mut out = Vec::new();
    let mut d = |k: &str, x: String, y: String| {
        if x != y {
            out.push(format!("{k} {x}→{y}"));
        }
    };
    d("baud", a.baud.to_string(), b.baud.to_string());
    d("data", a.data_bits.to_string(), b.data_bits.to_string());
    d("parity", a.parity.clone(), b.parity.clone());
    d("stop", a.stop_bits.to_string(), b.stop_bits.to_string());
    d("flow", a.flow.clone(), b.flow.clone());
    d("DTR", (a.dtr as u8).to_string(), (b.dtr as u8).to_string());
    d("RTS", (a.rts as u8).to_string(), (b.rts as u8).to_string());
    d("autoReconnect", a.auto_reconnect.to_string(), b.auto_reconnect.to_string());
    out
}

/// 열린 포트에 설정을 적용 (DCB 는 복제 핸들로 바꿔도 같은 포트에 적용된다)
fn apply(p: &mut dyn SerialPort, c: &SerialConfig) -> serialport::Result<()> {
    p.set_baud_rate(c.baud)?;
    p.set_data_bits(match c.data_bits {
        5 => DataBits::Five,
        6 => DataBits::Six,
        7 => DataBits::Seven,
        _ => DataBits::Eight,
    })?;
    p.set_parity(match c.parity.as_str() {
        "odd" => Parity::Odd,
        "even" => Parity::Even,
        _ => Parity::None,
    })?;
    p.set_stop_bits(if c.stop_bits == 2 { StopBits::Two } else { StopBits::One })?;
    p.set_flow_control(match c.flow.as_str() {
        "hardware" => FlowControl::Hardware,
        "software" => FlowControl::Software,
        _ => FlowControl::None,
    })?;
    p.write_data_terminal_ready(c.dtr)?;
    p.write_request_to_send(c.rts)?;
    Ok(())
}

const BATCH: Duration = Duration::from_millis(50);
const WATCH: Duration = Duration::from_secs(1);

fn status(events: &EventSink, state: &'static str, port: &str, message: Option<String>) {
    events.send(SessionEvent::Status { state, port: port.to_string(), message });
}

fn reader_loop(
    port: Port,
    cfg: SerialConfig,
    identity: Identity,
    s: Arc<Shared>,
    events: EventSink,
    replies: Sender<Vec<u8>>,
) {
    let mut port = Some(port);
    let mut name = cfg.port.clone();
    let mut buf = [0u8; 4096];
    let mut last_flush = Instant::now();
    let mut last_lines = Instant::now();
    let mut lines: Option<[bool; 4]> = None;
    let _ = cfg; // 이후로는 s.cfg(연결 중 바뀐 설정 포함)를 쓴다
    loop {
        if s.stop.load(Ordering::SeqCst) {
            drain(&s, &replies);
            drop(port.take());
            note(&s, "CLOSE".into());
            flush(&s, &events);
            status(&events, "closed", &name, None);
            return;
        }
        let Some(p) = port.as_mut() else { unreachable!() };
        let mut lost: Option<String> = match p.read(&mut buf) {
            Ok(0) => None,
            Ok(n) => {
                let frames = s.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                push_rx(&s, frames, &replies);
                None
            }
            Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => None,
            Err(e) => Some(e.to_string()),
        };
        // 일부 드라이버(블루투스 SPP 등)는 뽑혀도 TimedOut 만 낸다 → 목록 감시 스레드가 알려 준다
        if lost.is_none() && s.gone.swap(false, Ordering::SeqCst) {
            lost = Some("장치가 목록에서 사라졌습니다".into());
        }
        if let Some(msg) = lost {
            drain(&s, &replies);
            // 핸들을 먼저 닫는다 — 쥐고 있으면 같은 COM 을 다시 열 때 Access denied
            drop(port.take());
            *s.writer.lock().unwrap() = None;
            note(&s, format!("LOST {msg}"));
            flush(&s, &events);
            status(&events, "disconnected", &name, Some(msg));
            let before: Vec<String> = ports::list().into_iter().map(|p| p.name).collect();
            match reconnect(&identity, &before, &s, &events) {
                Some((p, n)) => {
                    note(&s, if n == name { format!("RECONNECT {n}") } else { format!("RECONNECT {name} → {n}") });
                    s.cfg.lock().unwrap().port = n.clone();
                    port = Some(p);
                    name = n;
                    lines = None;
                }
                None => {
                    note(&s, "CLOSE".into());
                    flush(&s, &events);
                    return;
                }
            }
            continue;
        }
        // 입력 신호선(CTS·DSR·RI·CD)은 100ms 마다 보고, 바뀌면 기록한다
        if last_lines.elapsed() >= Duration::from_millis(100) {
            last_lines = Instant::now();
            if let Some(p) = port.as_mut() {
                let now = [
                    p.read_clear_to_send().unwrap_or(false),
                    p.read_data_set_ready().unwrap_or(false),
                    p.read_ring_indicator().unwrap_or(false),
                    p.read_carrier_detect().unwrap_or(false),
                ];
                if lines != Some(now) {
                    if let Some(prev) = lines {
                        for (i, label) in ["CTS", "DSR", "RI", "CD"].iter().enumerate() {
                            if prev[i] != now[i] {
                                note(&s, format!("{label} {}", if now[i] { "ON" } else { "OFF" }));
                            }
                        }
                    }
                    lines = Some(now);
                    events.send(SessionEvent::Lines { cts: now[0], dsr: now[1], ri: now[2], cd: now[3] });
                }
            }
        }
        let tail = s.framer.lock().unwrap().poll(Instant::now());
        if let Some(f) = tail {
            push_rx(&s, vec![f], &replies);
        }
        if last_flush.elapsed() >= BATCH {
            flush(&s, &events);
            last_flush = Instant::now();
        }
    }
}

/// 송신 큐. 부분 쓰기와 TimedOut 을 이어 쓰고, 정해진 시간 안에 못 보내면 오류를 알린다.
/// FlushFileBuffers(flush) 는 흐름 제어로 막히면 끝없이 기다리므로 부르지 않는다.
fn writer_loop(rx: Receiver<Vec<u8>>, s: Arc<Shared>, events: EventSink) {
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
        // 이론 송신 시간(1바이트 = 약 11비트)의 3배 + 1초. 연결 중 속도를 바꿨을 수 있어 매번 읽는다
        let baud = s.cfg.lock().unwrap().baud;
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
            s.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "tx", bytes: bytes[..sent].to_vec(), check: None, note: None, peer: None });
        }
        if let Some(message) = error {
            events.send(SessionEvent::Error { message });
        }
    }
}

fn push_rx(s: &Shared, frames: Vec<Cut>, replies: &Sender<Vec<u8>>) {
    if frames.is_empty() {
        return;
    }
    let check = *s.rx_check.lock().unwrap();
    let term = s.framer.lock().unwrap().terminator().to_vec();
    let baud = s.cfg.lock().unwrap().baud;
    // Instant(첫 바이트) → 벽시계 ms
    let (now_i, now_w) = (Instant::now(), now_ms());
    let mut pending = s.pending.lock().unwrap();
    for (at, bytes) in frames {
        let ts = now_w.saturating_sub(now_i.saturating_duration_since(at).as_millis() as u64);
        let c = check.and_then(|k| k.verify_before(&bytes, &term));
        // 방금 우리가 보낸 응답이 그 직후 그대로 돌아온 것이면(루프백·에코) 답하지 않는다 — 무한 반복 방지.
        // 판정 창 = 응답 송신 시간 + 300ms. 한 번 쓰면 비운다
        let echo = {
            let mut lr = s.last_reply.lock().unwrap();
            let hit = lr.as_ref().is_some_and(|(b, t)| {
                *b == bytes && t.elapsed() < Duration::from_millis(300 + b.len() as u64 * 11_000 / baud.max(1) as u64)
            });
            if hit {
                *lr = None;
            }
            hit
        };
        let mut answer: Option<(Vec<u8>, u64, Option<String>)> = None;
        if !echo {
            if let Some(resp) = s.responder.lock().unwrap().as_mut() {
                let r = resp(&bytes);
                if r.bytes.is_some() || r.note.is_some() {
                    answer = Some((r.bytes.unwrap_or_default(), r.delay_ms, r.note));
                }
            } else {
                // 규칙은 위에서부터 처음 맞는 하나만
                let hit = s.rules.lock().unwrap().iter().find(|r| r.reply != bytes && r.is_match(&bytes)).cloned();
                answer = hit.map(|r| (r.reply, r.delay_ms, Some(format!("AUTO {}", r.name))));
            }
        }
        pending.push(Frame { ts, dir: "rx", bytes, check: c, note: None, peer: None });
        if let Some((reply, delay_ms, note)) = answer {
            if let Some(n) = note {
                pending.push(Frame { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(n), peer: None });
            }
            if reply.is_empty() {
                continue;
            }
            *s.last_reply.lock().unwrap() = Some((reply.clone(), Instant::now() + Duration::from_millis(delay_ms)));
            if delay_ms == 0 {
                let _ = replies.send(reply);
            } else {
                let tx = replies.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(delay_ms));
                    let _ = tx.send(reply);
                });
            }
        }
    }
}

/// 프레임 구분기에 남은 미완성 바이트를 내보낸다(닫기·끊김 직전)
fn drain(s: &Shared, replies: &Sender<Vec<u8>>) {
    let tail = s.framer.lock().unwrap().poll(Instant::now() + Duration::from_secs(3600));
    if let Some(f) = tail {
        push_rx(s, vec![f], replies);
    }
}

/// 1초마다 포트 목록에서 장치가 사라졌는지 본다(연결돼 있을 때만)
fn watch_loop(s: Arc<Shared>, identity: Identity) {
    while !s.stop.load(Ordering::SeqCst) {
        for _ in 0..(WATCH.as_millis() / 50) {
            if s.stop.load(Ordering::SeqCst) {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let online = s.writer.lock().unwrap().is_some();
        if online && !identity.present(&ports::list()) {
            s.gone.store(true, Ordering::SeqCst);
        }
    }
}

fn flush(s: &Shared, events: &EventSink) {
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
    events.send(SessionEvent::Frames { frames });
}

/// 같은 장치가 다시 나타날 때까지 기다렸다가 연다. 사용자가 닫으면 None.
/// 설정은 매 회차 다시 읽는다 — 기다리는 동안 사용자가 속도를 바꾸거나 자동 재연결을 끌 수 있다
fn reconnect(identity: &Identity, before: &[String], s: &Shared, events: &EventSink) -> Option<(Port, String)> {
    let first = s.cfg.lock().unwrap().clone();
    if !first.auto_reconnect {
        status(events, "closed", &first.port, None);
        return None;
    }
    status(events, "reconnecting", &first.port, None);
    loop {
        for _ in 0..10 {
            if s.stop.load(Ordering::SeqCst) {
                status(events, "closed", &first.port, None);
                return None;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let cfg = s.cfg.lock().unwrap().clone();
        if !cfg.auto_reconnect {
            note(s, "RECONNECT cancelled".into());
            status(events, "closed", &cfg.port, None);
            return None;
        }
        let list = ports::list();
        let Some(info) = identity.find(&list, before) else { continue };
        // COM 번호가 바뀌었어도 같은 장치면 새 이름으로 연다
        let mut c = cfg.clone();
        c.port = info.name.clone();
        let Ok(p) = open(&c) else { continue };
        let Ok(w) = p.try_clone() else { continue };
        s.gone.store(false, Ordering::SeqCst);
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

    fn cfg() -> SerialConfig {
        SerialConfig {
            port: "COM3".into(),
            baud: 9600,
            data_bits: 8,
            parity: "none".into(),
            stop_bits: 1,
            flow: "none".into(),
            dtr: false,
            rts: false,
            auto_reconnect: true,
        }
    }

    #[test]
    fn describe_and_diff() {
        assert_eq!(describe(&cfg()), "COM3 9600 8N1 flow=none DTR=0 RTS=0");
        let mut b = cfg();
        b.baud = 115_200;
        b.parity = "even".into();
        assert_eq!(diff(&cfg(), &b), vec!["baud 9600→115200", "parity none→even"]);
        assert!(diff(&cfg(), &cfg()).is_empty());
    }

    #[test]
    fn event_log_line() {
        let f = Frame { ts: 0, dir: "ev", bytes: vec![], check: None, note: Some("SET baud 9600→115200".into()), peer: None };
        assert!(log_line(&f).ends_with(" EV SET baud 9600→115200"));
    }

    #[test]
    fn reconnect_by_serial_number_even_if_com_changes() {
        let id = Identity { key: usb("COM3", 0x0403, 0x6001, Some("A1")).identity(), vid_pid: Some((0x0403, 0x6001)), has_serial: true, listed: true };
        let list = vec![usb("COM7", 0x0403, 0x6001, Some("A1"))];
        assert_eq!(id.find(&list, &[]).unwrap().name, "COM7");
        // 일련번호가 다른 같은 칩에는 붙지 않는다
        let other = vec![usb("COM7", 0x0403, 0x6001, Some("B2"))];
        assert!(id.find(&other, &[]).is_none());
    }

    #[test]
    fn no_serial_takes_single_fresh_port_only() {
        let id = Identity { key: usb("COM3", 0x1A86, 0x7523, None).identity(), vid_pid: Some((0x1A86, 0x7523)), has_serial: false, listed: true };
        let before = vec!["COM4".to_string()];
        // 다른 USB 구멍에 꽂아 COM9 로 나타남 — 새로 생긴 것이 하나뿐이면 그것
        let list = vec![usb("COM4", 0x1A86, 0x7523, None), usb("COM9", 0x1A86, 0x7523, None)];
        assert_eq!(id.find(&list, &before).unwrap().name, "COM9");
        // 새로 생긴 것이 둘이면 어느 것인지 모르므로 기다린다
        let list2 = vec![usb("COM9", 0x1A86, 0x7523, None), usb("COM10", 0x1A86, 0x7523, None)];
        assert!(id.find(&list2, &before).is_none());
    }
}
