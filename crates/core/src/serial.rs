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
use crate::delay::Delayer;
use crate::ports;
use crate::replyguard::{ReplyGuard, Verdict, flood_note, serial_tx_time, ECHO_MARGIN};
use serde::{Deserialize, Serialize};
use serialport::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::io::{ErrorKind, Read, Write};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, SyncSender, TrySendError};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialConfig {
    pub port: String,
    pub baud: u32,
    pub data_bits: u8,
    /// "none" | "odd" | "even" | "mark" | "space" (mark·space 는 윈도우 DCB 로 직접 설정)
    pub parity: String,
    /// 1 | 1.5 | 2 (1.5 는 윈도우 DCB 로 직접 설정 — 대개 데이터 비트 5 에서만 된다)
    pub stop_bits: f32,
    /// "none" | "hardware" | "software"
    pub flow: String,
    #[serde(default)]
    pub dtr: bool,
    #[serde(default)]
    pub rts: bool,
    #[serde(default = "yes")]
    pub auto_reconnect: bool,
    /// RS-485 송신 방향 제어(RTS): "off"(또는 빈 값) | "driver"(DCB RTS_CONTROL_TOGGLE) | "software"(보낼 때만 RTS 켬).
    /// 켜져 있으면 RTS 칸은 쓰지 않는다. 하드웨어 흐름 제어와는 함께 쓸 수 없다(흐름 제어가 이긴다)
    #[serde(default)]
    pub rs485: String,
}

fn yes() -> bool {
    true
}

pub use crate::codec::Pace;
pub use crate::event::{EventSink, Frame, Progress, SessionEvent, log_line, now_ms};
use crate::event::{LogWriter, closed_reason, waiting_reason};

type Port = Box<dyn SerialPort>;

/// RS-485 방향 제어 방식(설정 해석)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Rs485 {
    Off,
    Driver,
    Software,
}

fn rs485(c: &SerialConfig) -> Rs485 {
    if c.flow == "hardware" {
        return Rs485::Off;
    }
    match c.rs485.as_str() {
        "driver" => Rs485::Driver,
        "software" => Rs485::Software,
        _ => Rs485::Off,
    }
}

/// 쓰기용 핸들 + (윈도우) 같은 장치의 원시 핸들 — serialport 가 못 하는 DCB 설정(Mark·Space 패리티,
/// 1.5 정지 비트, RTS 토글)에 쓴다. 0 이면 없음(윈도우 밖·시험용 가짜 포트)
struct Out {
    port: Port,
    raw: isize,
}

/// 쓰기 스레드가 처리하는 일
enum Job {
    Bytes(Vec<u8>),
    /// 천천히 보내기(문자·줄 사이 지연, 파일) — 진행을 알리고 취소할 수 있다
    Paced { id: u64, bytes: Vec<u8>, pace: Pace },
    /// Break 신호(ms)
    Break(u32),
}

/// DCB 확장 — serialport(4.10)가 다루지 않는 값. 계산은 순수 함수로(시험), 적용은 윈도우에서만
pub mod dcb {
    pub const NOPARITY: u8 = 0;
    pub const ODDPARITY: u8 = 1;
    pub const EVENPARITY: u8 = 2;
    pub const MARKPARITY: u8 = 3;
    pub const SPACEPARITY: u8 = 4;
    pub const ONESTOPBIT: u8 = 0;
    pub const ONE5STOPBITS: u8 = 1;
    pub const TWOSTOPBITS: u8 = 2;
    /// DCB 비트 칸: fParity = 1번 비트, fRtsControl = 12~13번 비트
    pub const F_PARITY: u32 = 1 << 1;
    pub const RTS_SHIFT: u32 = 12;
    pub const RTS_CONTROL_TOGGLE: u32 = 3;

    /// 바꿔야 할 것
    #[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
    pub struct Want {
        /// MARKPARITY · SPACEPARITY
        pub parity: Option<u8>,
        pub one5: bool,
        pub rts_toggle: bool,
    }

    impl Want {
        pub fn any(&self) -> bool {
            self.parity.is_some() || self.one5 || self.rts_toggle
        }
    }

    /// (비트 칸, Parity, StopBits) → 바꾼 값. 손대지 않는 비트는 그대로
    pub fn patch(mut bits: u32, mut parity: u8, mut stop: u8, w: Want) -> (u32, u8, u8) {
        if let Some(p) = w.parity {
            parity = p;
            bits |= F_PARITY;
        }
        if w.one5 {
            stop = ONE5STOPBITS;
        }
        if w.rts_toggle {
            bits = (bits & !(0b11 << RTS_SHIFT)) | (RTS_CONTROL_TOGGLE << RTS_SHIFT);
        }
        (bits, parity, stop)
    }
}

fn dcb_want(c: &SerialConfig, rts_toggle: bool) -> dcb::Want {
    dcb::Want {
        parity: match c.parity.as_str() {
            "mark" => Some(dcb::MARKPARITY),
            "space" => Some(dcb::SPACEPARITY),
            _ => None,
        },
        one5: is_one5(c.stop_bits),
        rts_toggle,
    }
}

fn is_one5(stop: f32) -> bool {
    (stop - 1.5).abs() < 0.01
}

/// DCB 에 직접 적용(바꿀 것이 없으면 아무것도 하지 않는다)
#[cfg(windows)]
fn set_dcb(raw: isize, w: dcb::Want) -> Result<(), String> {
    use windows_sys::Win32::Devices::Communication::{DCB, GetCommState, SetCommState};
    if !w.any() {
        return Ok(());
    }
    if raw == 0 {
        return Err(crate::tr!("포트 핸들이 없습니다", "No port handle").into());
    }
    let h = raw as windows_sys::Win32::Foundation::HANDLE;
    // SAFETY: DCB 는 C 구조체(0 으로 채워도 됨), h 는 열린 COM 핸들(쓰기 핸들이 살아 있는 동안만 부른다)
    unsafe {
        let mut d: DCB = std::mem::zeroed();
        d.DCBlength = std::mem::size_of::<DCB>() as u32;
        if GetCommState(h, &mut d) == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let (bits, parity, stop) = dcb::patch(d._bitfield, d.Parity, d.StopBits, w);
        d._bitfield = bits;
        d.Parity = parity;
        d.StopBits = stop;
        if SetCommState(h, &d) == 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_dcb(_raw: isize, w: dcb::Want) -> Result<(), String> {
    if w.any() { Err(crate::tr!("이 운영체제에서는 지원하지 않습니다", "Not supported on this OS").into()) } else { Ok(()) }
}

/// Mark·Space·1.5 와 RS-485 를 포트에 적용한다. 돌려주는 값: 소프트웨어로 RTS 를 켜고 끌지.
/// 드라이버 토글을 드라이버가 거절하면 소프트웨어로 바꾸고(note 에 이유) 계속한다
fn apply_ext(out: &mut Out, c: &SerialConfig) -> Result<(bool, Option<String>), String> {
    let mode = rs485(c);
    let base = dcb_want(c, false);
    let detail = |e: String| {
        let what = [
            base.parity.map(|p| if p == dcb::MARKPARITY { "parity mark" } else { "parity space" }),
            base.one5.then_some("stop 1.5"),
        ];
        let what: Vec<&str> = what.into_iter().flatten().collect();
        crate::tr!(
            format!("이 포트(드라이버)는 {} 을(를) 받지 않습니다: {e}", what.join(", ")),
            format!("This port (driver) does not accept {}: {e}", what.join(", "))
        )
    };
    let mut soft = mode == Rs485::Software;
    let mut note = None;
    if mode == Rs485::Driver {
        match set_dcb(out.raw, dcb_want(c, true)) {
            Ok(()) => {}
            Err(e) => {
                // 패리티·정지 비트 때문에 실패했을 수 있다 — 토글 없이 다시 해 보고, 그것도 안 되면 그 이유
                set_dcb(out.raw, base).map_err(detail)?;
                soft = true;
                note = Some(crate::tr!(
                    format!("RS485 드라이버 토글(RTS_CONTROL_TOGGLE)을 받지 않아 프로그램이 RTS 를 켜고 끕니다: {e}"),
                    format!("RS485 driver toggle (RTS_CONTROL_TOGGLE) refused — the program toggles RTS instead: {e}")
                ));
            }
        }
    } else {
        set_dcb(out.raw, base).map_err(detail)?;
    }
    if soft {
        // 받는 쪽으로(RTS 꺼짐)
        let _ = out.port.write_request_to_send(false);
    }
    Ok((soft, note))
}

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
    writer: Mutex<Option<Out>>,
    /// RS-485 를 프로그램이 켜고 끄는 중(소프트웨어 방식, 또는 드라이버가 토글을 거절)
    soft_rts: AtomicBool,
    /// 천천히 보내기 번호 — 이 번호 이하는 취소
    next_job: AtomicU64,
    cancel_upto: AtomicU64,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<LogWriter>>,
    rules: Mutex<Vec<Rule>>,
    responder: Mutex<Option<Responder>>,
    /// 마지막으로 응답기·규칙이 보낸 것 — RS-485 에코 창에 쓴다.
    /// 에코 창: 응답기·규칙이 보낸 바이트가 그대로(바이트까지 같게) 되돌아오고, 그 첫 바이트가
    /// 송신 시작(지연 응답은 예약 시각)부터 «송신 시간(문자당 11비트) + 50ms» 안이면 에코로 보고 다시 답하지 않는다.
    /// 좁게 두는 까닭: 05·06 쓰기는 응답 = 요청이라, 마스터가 응답을 받고 같은 쓰기를 곧바로 다시 보내도 답해야 한다.
    /// 창 밖에서 같은 것이 계속 오면(느린 에코·상대의 되돌려 보내기) 초당 상한(`replyguard::LOOP_LIMIT`)을 넘는 몫만
    /// 답하지 않고 사건 줄 «AUTO 멈춤 …» 을 남긴다. 자세한 판단은 `replyguard`
    last_reply: Mutex<ReplyGuard>,
    /// 지연 응답 예약 — 응답마다 스레드를 만들지 않고 하나가 시간 순으로(상한 `delay::MAX_PENDING`)
    delayed: Delayer,
    /// 목록 감시 스레드가 «장치가 목록에서 사라짐» 을 알리는 자리
    gone: AtomicBool,
    /// 지금 열린 장치의 식별 — 재연결로 COM 번호가 바뀌면 읽기 스레드가 새것으로 바꾼다
    /// (일련번호 없는 USB 는 식별에 포트 이름이 들어 있어, 옛것으로 감시하면 «사라짐» 으로 오인한다)
    identity: Mutex<Identity>,
    stop: AtomicBool,
}

/// 송신 대기열에 쌓아 둘 수 있는 최대 건수. 흐름 제어(CTS)로 막힌 채 반복 송신이 돌면
/// 끝없이 쌓이지 않도록 — 가득 차면 새 송신을 거절한다
pub const SEND_QUEUE_MAX: usize = 64;

fn queue_full() -> String {
    crate::tr!(
        "송신 대기열이 가득 찼습니다 — 흐름 제어(CTS)로 막혀 있을 수 있습니다",
        "The send queue is full — flow control (CTS) may be blocking it"
    )
    .into()
}

pub struct Session {
    shared: Arc<Shared>,
    tx: Option<SyncSender<Job>>,
    reader: Option<JoinHandle<()>>,
    writer: Option<JoinHandle<()>>,
    watcher: Option<JoinHandle<()>>,
}

/// 연 포트 — 읽기 핸들, 쓰기 핸들, RS-485 를 프로그램이 켜고 끌지, 알릴 말
struct Opened {
    reader: Port,
    writer: Out,
    soft_rts: bool,
    note: Option<String>,
}

#[cfg(windows)]
fn open_handles(b: serialport::SerialPortBuilder) -> serialport::Result<(Port, Out)> {
    use std::os::windows::io::AsRawHandle;
    let p = b.open_native()?;
    let w = p.try_clone_native()?;
    let raw = w.as_raw_handle() as isize;
    Ok((Box::new(p), Out { port: Box::new(w), raw }))
}

#[cfg(not(windows))]
fn open_handles(b: serialport::SerialPortBuilder) -> serialport::Result<(Port, Out)> {
    let p = b.open()?;
    let w = p.try_clone()?;
    Ok((p, Out { port: w, raw: 0 }))
}

fn parity_of(c: &SerialConfig) -> Parity {
    match c.parity.as_str() {
        "odd" => Parity::Odd,
        "even" => Parity::Even,
        // mark·space 는 «없음» 으로 연 뒤 DCB 로 바꾼다
        _ => Parity::None,
    }
}

fn stop_of(c: &SerialConfig) -> StopBits {
    if c.stop_bits >= 1.75 { StopBits::Two } else { StopBits::One }
}

fn open(cfg: &SerialConfig) -> Result<Opened, String> {
    let builder = serialport::new(&cfg.port, cfg.baud)
        .data_bits(match cfg.data_bits {
            5 => DataBits::Five,
            6 => DataBits::Six,
            7 => DataBits::Seven,
            _ => DataBits::Eight,
        })
        .parity(parity_of(cfg))
        .stop_bits(stop_of(cfg))
        .flow_control(match cfg.flow.as_str() {
            "hardware" => FlowControl::Hardware,
            "software" => FlowControl::Software,
            _ => FlowControl::None,
        })
        .timeout(Duration::from_millis(5));
    let (mut p, mut w) = open_handles(builder).map_err(|e| {
        let listed = ports::list().iter().any(|p| p.name.eq_ignore_ascii_case(&cfg.port));
        format!("{}: {}", cfg.port, crate::oserr::serial_open(&e, listed))
    })?;
    let (soft_rts, note) = apply_ext(&mut w, cfg).map_err(|e| format!("{}: {e}", cfg.port))?;
    let _ = p.write_data_terminal_ready(cfg.dtr);
    // 하드웨어 흐름제어(RTS/CTS)·RS-485 방향 제어면 RTS 는 드라이버·프로그램 몫
    if cfg.flow != "hardware" && rs485(cfg) == Rs485::Off {
        let _ = p.write_request_to_send(cfg.rts);
    }
    Ok(Opened { reader: p, writer: w, soft_rts, note })
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
        match ports::list().iter().find(|p| p.name == name) {
            Some(p) => Self::from_info(p),
            None => Self { key: name.to_string(), vid_pid: None, has_serial: false, listed: false },
        }
    }

    fn from_info(p: &PortInfo) -> Self {
        Self {
            key: p.identity(),
            vid_pid: p.vid.zip(p.pid),
            has_serial: p.serial_number.as_deref().is_some_and(|s| !s.is_empty()),
            listed: true,
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

impl Shared {
    fn new(
        cfg: SerialConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        responder: Option<Responder>,
        writer: Out,
        identity: Identity,
    ) -> Self {
        Self {
            cfg: Mutex::new(cfg),
            framer: Mutex::new(Framer::new(mode)),
            rx_check: Mutex::new(rx_check),
            writer: Mutex::new(Some(writer)),
            soft_rts: AtomicBool::new(false),
            next_job: AtomicU64::new(1),
            cancel_upto: AtomicU64::new(0),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            rules: Mutex::new(Vec::new()),
            responder: Mutex::new(responder),
            last_reply: Mutex::new(ReplyGuard::new()),
            delayed: Delayer::new(),
            gone: AtomicBool::new(false),
            identity: Mutex::new(identity),
            stop: AtomicBool::new(false),
        }
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
        let opened = open(&cfg)?;
        let port = opened.reader;
        let identity = Identity::of(&cfg.port);
        let shared = Arc::new(Shared::new(cfg.clone(), mode, rx_check, responder, opened.writer, identity.clone()));
        shared.soft_rts.store(opened.soft_rts, Ordering::SeqCst);
        events.send(SessionEvent::Status { state: "connected", port: cfg.port.clone(), message: None });
        note(&shared, format!("OPEN {}", describe(&cfg)));
        if let Some(n) = opened.note {
            note(&shared, n);
        }
        note(&shared, format!("FRAMING {}", describe_framing(shared.framer.lock().unwrap().mode())));
        if let Some(k) = rx_check {
            note(&shared, format!("RXCHECK {}", k.describe()));
        }

        let (tx, rx) = mpsc::sync_channel::<Job>(SEND_QUEUE_MAX);
        let (s, ev) = (shared.clone(), events.clone());
        let writer = std::thread::spawn(move || writer_loop(rx, s, ev));
        // 포트 목록 조회(SetupAPI)는 수십~수백 ms 걸린다 — 읽기 스레드를 막지 않게 따로
        let watcher = identity.listed.then(|| {
            let s = shared.clone();
            std::thread::spawn(move || watch_loop(s))
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
            note(&self.shared, format!("RXCHECK {}", rx_check.map_or("none".into(), |k| k.describe())));
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
        // 쓰기 핸들 자물쇠를 쥔 채 설정까지 바꾼다 — 재연결이 핸들을 넣는 순간과 겹쳐도
        // 둘 중 하나가 새 설정을 포트에 적용한다(install_writer 참고). 순서: writer → cfg
        let mut w = self.shared.writer.lock().unwrap();
        let mut fallback = None;
        let online = match w.as_mut() {
            Some(out) => {
                let (soft, n) = apply(out, &new)?;
                self.shared.soft_rts.store(soft, Ordering::SeqCst);
                fallback = n;
                true
            }
            None => false,
        };
        let mut cfg = self.shared.cfg.lock().unwrap();
        let port_name = cfg.port.clone();
        *cfg = SerialConfig { port: port_name, ..new };
        drop(cfg);
        drop(w);
        let later = if online { "" } else { crate::tr!(" (다시 연결될 때 적용)", " (applies on reconnect)") };
        note(&self.shared, format!("SET {}{later}", changes.join(", ")));
        if let Some(n) = fallback {
            note(&self.shared, n);
        }
        Ok(())
    }

    fn enqueue(&self, job: Job) -> Result<(), String> {
        if self.shared.writer.lock().unwrap().is_none() {
            return Err(crate::tr!("포트가 끊겨 있습니다", "The port is disconnected").into());
        }
        let closed = || crate::tr!("세션이 닫혔습니다", "The session is closed").to_string();
        match self.tx.as_ref().ok_or_else(closed)?.try_send(job) {
            Ok(()) => Ok(()),
            Err(TrySendError::Full(_)) => Err(queue_full()),
            Err(TrySendError::Disconnected(_)) => Err(closed()),
        }
    }

    /// 송신 큐에 넣는다. 실제로 나간 뒤 화면에 TX 줄이 찍힌다.
    pub fn send(&self, bytes: Vec<u8>) -> Result<(), String> {
        self.enqueue(Job::Bytes(bytes))
    }

    /// 천천히 보내기(문자 간·줄 간 지연, 파일). 돌려주는 번호로 진행(`SessionEvent::Progress`)을 알아보고 취소한다
    pub fn send_paced(&self, bytes: Vec<u8>, pace: Pace) -> Result<u64, String> {
        let id = self.shared.next_job.fetch_add(1, Ordering::SeqCst);
        self.enqueue(Job::Paced { id, bytes, pace })?;
        Ok(id)
    }

    /// 지금·대기 중인 천천히 보내기를 모두 멈춘다(보통 송신은 그대로)
    pub fn cancel_send(&self) {
        let last = self.shared.next_job.load(Ordering::SeqCst).saturating_sub(1);
        self.shared.cancel_upto.fetch_max(last, Ordering::SeqCst);
    }

    /// Break 신호(TX 를 ms 동안 0 으로) — 앞서 넣은 송신이 다 나간 뒤에
    pub fn send_break(&self, ms: u32) -> Result<(), String> {
        if !(1..=10_000).contains(&ms) {
            return Err(crate::tr!("Break 길이는 1~10000 ms 입니다", "Break duration must be 1–10000 ms").into());
        }
        self.enqueue(Job::Break(ms))
    }

    /// 수신·송신 프레임을 파일에 계속 덧붙인다. None 이면 멈춘다.
    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        let file = path.as_deref().map(LogWriter::open).transpose()?;
        let started = file.is_some();
        // 앞 파일에 남은 줄은 다음 묶음 전송 때 새 파일로 간다(BufWriter 는 버릴 때 비운다)
        *self.shared.log.lock().unwrap() = file;
        // 파일 첫 줄에 지금 설정을 남겨 로그만 보고도 조건을 알 수 있게
        if started {
            let cfg = self.shared.cfg.lock().unwrap().clone();
            note(&self.shared, format!("LOG START {}", describe(&cfg)));
        }
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        self.shared.delayed.close();
        drop(self.tx.take()); // 쓰기 스레드가 큐 끝을 보고 나온다
        for t in [self.writer.take(), self.reader.take(), self.watcher.take()].into_iter().flatten() {
            let _ = t.join();
        }
    }
}

fn note(s: &Shared, text: String) {
    s.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(text), peer: None });
}

/// «COM3 9600 8N1 flow=none DTR=0 RTS=0» (+ RS-485 방향 제어가 켜져 있으면 « RS485=driver»)
pub fn describe(c: &SerialConfig) -> String {
    let parity = match c.parity.as_str() {
        "odd" => 'O',
        "even" => 'E',
        "mark" => 'M',
        "space" => 'S',
        _ => 'N',
    };
    let mut s = format!(
        "{} {} {}{}{} flow={} DTR={} RTS={}",
        c.port, c.baud, c.data_bits, parity, c.stop_bits, c.flow, c.dtr as u8, c.rts as u8
    );
    match rs485(c) {
        Rs485::Off => {}
        Rs485::Driver => s.push_str(" RS485=driver"),
        Rs485::Software => s.push_str(" RS485=software"),
    }
    s
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
        FrameMode::ModbusRtuRequest { baud, min_gap_ms } => format!("modbus-rtu-request @{baud} min gap {min_gap_ms}ms"),
        FrameMode::LengthField { offset, size, adjust, max, gap_ms } => format!("length-field @{offset}+{size} {adjust:+} max {max} gap {gap_ms}ms"),
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
    let r = |c: &SerialConfig| match rs485(c) {
        Rs485::Off => "off",
        Rs485::Driver => "driver",
        Rs485::Software => "software",
    };
    d("RS485", r(a).into(), r(b).into());
    out
}

/// 열린 포트에 설정을 적용 (DCB 는 복제 핸들로 바꿔도 같은 포트에 적용된다).
/// 돌려주는 값: (RS-485 를 프로그램이 켜고 끌지, 드라이버 토글을 못 써서 바꿨다는 말)
fn apply(out: &mut Out, c: &SerialConfig) -> Result<(bool, Option<String>), String> {
    let e = |e: serialport::Error| e.to_string();
    let p = out.port.as_mut();
    p.set_baud_rate(c.baud).map_err(e)?;
    p.set_data_bits(match c.data_bits {
        5 => DataBits::Five,
        6 => DataBits::Six,
        7 => DataBits::Seven,
        _ => DataBits::Eight,
    })
    .map_err(e)?;
    p.set_parity(parity_of(c)).map_err(e)?;
    p.set_stop_bits(stop_of(c)).map_err(e)?;
    // 흐름 제어를 다시 정하면 RTS 토글도 풀린다 — 아래 apply_ext 가 다시 건다
    p.set_flow_control(match c.flow.as_str() {
        "hardware" => FlowControl::Hardware,
        "software" => FlowControl::Software,
        _ => FlowControl::None,
    })
    .map_err(e)?;
    p.write_data_terminal_ready(c.dtr).map_err(e)?;
    let r = apply_ext(out, c)?;
    if c.flow != "hardware" && rs485(c) == Rs485::Off {
        out.port.write_request_to_send(c.rts).map_err(e)?;
    }
    Ok(r)
}

const BATCH: Duration = Duration::from_millis(50);
const WATCH: Duration = Duration::from_secs(1);

fn status(events: &EventSink, state: &'static str, port: &str, message: Option<String>) {
    events.send(SessionEvent::Status { state, port: port.to_string(), message });
}

fn reader_loop(
    port: Port,
    cfg: SerialConfig,
    mut identity: Identity,
    s: Arc<Shared>,
    events: EventSink,
    replies: SyncSender<Job>,
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
            Err(e) => Some(crate::oserr::serial_io(&e)),
        };
        // 일부 드라이버(블루투스 SPP 등)는 뽑혀도 TimedOut 만 낸다 → 목록 감시 스레드가 알려 준다
        if lost.is_none() && s.gone.swap(false, Ordering::SeqCst) {
            lost = Some(crate::tr!("장치가 목록에서 사라졌습니다", "The device disappeared from the port list").into());
        }
        if let Some(msg) = lost {
            drain(&s, &replies);
            // 핸들을 먼저 닫는다 — 쥐고 있으면 같은 COM 을 다시 열 때 Access denied
            drop(port.take());
            *s.writer.lock().unwrap() = None;
            note(&s, format!("LOST {msg}"));
            flush(&s, &events);
            status(&events, "disconnected", &name, Some(msg.clone()));
            let before: Vec<String> = ports::list().into_iter().map(|p| p.name).collect();
            match reconnect(&identity, &before, &s, &events, &msg) {
                Some((p, n, id)) => {
                    note(&s, if n == name { format!("RECONNECT {n}") } else { format!("RECONNECT {name} → {n}") });
                    s.cfg.lock().unwrap().port = n.clone();
                    identity = id;
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
fn writer_loop(rx: Receiver<Job>, s: Arc<Shared>, events: EventSink) {
    loop {
        let job = match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(j) => j,
            Err(RecvTimeoutError::Timeout) => {
                if s.stop.load(Ordering::SeqCst) {
                    return;
                }
                continue;
            }
            Err(RecvTimeoutError::Disconnected) => return,
        };
        let stopping = match job {
            Job::Bytes(bytes) => {
                let w = transmit(&s, &bytes, 0, &|| false);
                if w.sent > 0 {
                    push_tx(&s, &bytes[..w.sent]);
                }
                if let Some(message) = w.error {
                    events.send(SessionEvent::Error { message });
                }
                w.stopping
            }
            Job::Paced { id, bytes, pace } => run_paced(&s, &events, id, &bytes, pace),
            Job::Break(ms) => run_break(&s, &events, ms),
        };
        if stopping {
            return;
        }
    }
}

fn push_tx(s: &Shared, bytes: &[u8]) {
    s.pending.lock().unwrap().push(Frame { ts: now_ms(), dir: "tx", bytes: bytes.to_vec(), check: None, note: None, peer: None });
}

/// 한 덩어리를 보낸 결과
struct Wrote {
    sent: usize,
    error: Option<String>,
    /// 세션을 닫는 중이라 그만둠
    stopping: bool,
    cancelled: bool,
    /// 마지막으로 바이트가 나간 때
    last: Instant,
}

/// 한 글자가 줄에 머무는 시간(시작 1 + 데이터 + 패리티 + 정지)
fn char_time(c: &SerialConfig) -> Duration {
    let bits = 1.0 + c.data_bits as f64 + if c.parity == "none" { 0.0 } else { 1.0 } + c.stop_bits.max(1.0) as f64;
    Duration::from_secs_f64(bits / c.baud.max(1) as f64)
}

/// 부분 쓰기·TimedOut 을 이어 쓴다. `char_ms` > 0 이면 한 바이트씩 사이를 둔다. `cancel` 이 참이 되면 그 자리에서 멈춘다
fn write_piece(s: &Shared, bytes: &[u8], char_ms: u32, cancel: &dyn Fn() -> bool) -> Wrote {
    // 이론 송신 시간(1바이트 = 약 11비트)의 3배 + 1초 + 문자 간 지연. 연결 중 속도를 바꿨을 수 있어 매번 읽는다
    let baud = s.cfg.lock().unwrap().baud;
    let per_byte_ms = 11 * 3_000 / baud.max(1) as u64 + char_ms as u64;
    let deadline = Instant::now() + Duration::from_millis(1_000 + bytes.len() as u64 * per_byte_ms);
    let step = if char_ms > 0 { 1 } else { bytes.len().max(1) };
    let mut w = Wrote { sent: 0, error: None, stopping: false, cancelled: false, last: Instant::now() };
    while w.sent < bytes.len() {
        // 닫는 중이면 그만 보내되, 이미 나간 만큼은 TX 로 남긴다
        if s.stop.load(Ordering::SeqCst) {
            w.stopping = true;
            break;
        }
        if cancel() {
            w.cancelled = true;
            break;
        }
        let mut slot = s.writer.lock().unwrap();
        let Some(out) = slot.as_mut() else {
            w.error = Some(crate::tr!("포트가 끊겨 있습니다", "The port is disconnected").to_string());
            break;
        };
        let end = (w.sent + step).min(bytes.len());
        let progressed = match out.port.write(&bytes[w.sent..end]) {
            Ok(n) => {
                w.sent += n;
                w.last = Instant::now();
                n > 0
            }
            Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => false,
            Err(e) => {
                w.error = Some(crate::oserr::serial_io(&e));
                break;
            }
        };
        drop(slot);
        if w.sent < bytes.len() {
            if Instant::now() >= deadline {
                w.error = Some(crate::tr!(
                    format!("송신 시간 초과 — {}/{} 바이트만 나감 (흐름 제어·CTS 확인)", w.sent, bytes.len()),
                    format!("Send timed out — only {}/{} bytes went out (check flow control / CTS)", w.sent, bytes.len())
                ));
                break;
            }
            if progressed && char_ms > 0 {
                std::thread::sleep(Duration::from_millis(char_ms as u64));
            } else if !progressed {
                std::thread::sleep(Duration::from_millis(1));
            }
        }
    }
    w
}

fn set_rts(s: &Shared, on: bool) {
    if let Some(out) = s.writer.lock().unwrap().as_mut() {
        let _ = out.port.write_request_to_send(on);
    }
}

/// RS-485(소프트웨어): 마지막 바이트가 줄을 다 떠날 때까지 기다린다 — 쓰기 시작 + 전체 송신 시간과
/// 마지막 쓰기 + 한 글자 중 늦은 쪽 + 한 글자 여유, 그리고 드라이버 송신 버퍼가 빌 때까지(최대 0.2초 더)
fn wait_drained(s: &Shared, t0: Instant, sent: usize, last: Instant) {
    let c = s.cfg.lock().unwrap().clone();
    let ch = char_time(&c);
    let until = (t0 + ch * sent as u32).max(last + ch) + ch;
    let cap = until + Duration::from_millis(200);
    loop {
        let now = Instant::now();
        let empty = s.writer.lock().unwrap().as_ref().is_none_or(|o| o.port.bytes_to_write().map_or(true, |n| n == 0));
        if (now >= until && empty) || now >= cap || s.stop.load(Ordering::SeqCst) {
            return;
        }
        std::thread::sleep(if now < until { (until - now).min(Duration::from_millis(5)) } else { Duration::from_millis(1) });
    }
}

/// 보내기 — RS-485 소프트웨어 방식이면 그동안만 RTS 를 켠다
fn transmit(s: &Shared, bytes: &[u8], char_ms: u32, cancel: &dyn Fn() -> bool) -> Wrote {
    let soft = s.soft_rts.load(Ordering::SeqCst);
    if soft {
        set_rts(s, true);
    }
    let t0 = Instant::now();
    let w = write_piece(s, bytes, char_ms, cancel);
    if soft {
        wait_drained(s, t0, w.sent, w.last);
        set_rts(s, false);
    }
    w
}

/// 잠깐 쉬기 — 닫거나 취소하면 바로 깬다. 깨운 이유가 있으면 true
fn nap(s: &Shared, ms: u32, cancel: &dyn Fn() -> bool) -> bool {
    let until = Instant::now() + Duration::from_millis(ms as u64);
    while Instant::now() < until {
        if s.stop.load(Ordering::SeqCst) || cancel() {
            return true;
        }
        std::thread::sleep((until - Instant::now()).min(Duration::from_millis(10)));
    }
    false
}

/// 천천히 보내기 — 조각(줄·덩어리)마다 TX 줄, 0.1초마다 진행. 돌려주는 값: 세션을 닫는 중이었는지
fn run_paced(s: &Shared, events: &EventSink, id: u64, bytes: &[u8], pace: Pace) -> bool {
    let total = bytes.len() as u64;
    let cancel = || s.cancel_upto.load(Ordering::SeqCst) >= id;
    let progress = |sent: u64, done: bool, cancelled: bool, error: Option<String>| {
        events.send(SessionEvent::Progress(Progress { id, sent, total, done, cancelled, error }));
    };
    progress(0, false, false, None);
    let mut sent = 0u64;
    let mut last_report = Instant::now();
    let (mut cancelled, mut stopping, mut error) = (false, false, None);
    for (i, r) in pace.pieces(bytes).into_iter().enumerate() {
        if i > 0 && pace.line_delay_ms > 0 && nap(s, pace.line_delay_ms, &cancel) {
            stopping = s.stop.load(Ordering::SeqCst);
            cancelled = !stopping;
            break;
        }
        let piece = &bytes[r];
        let w = transmit(s, piece, pace.char_delay_ms, &cancel);
        if w.sent > 0 {
            push_tx(s, &piece[..w.sent]);
        }
        sent += w.sent as u64;
        if w.error.is_some() || w.stopping || w.cancelled {
            (error, stopping, cancelled) = (w.error, w.stopping, w.cancelled);
            break;
        }
        if last_report.elapsed() >= Duration::from_millis(100) {
            last_report = Instant::now();
            progress(sent, false, false, None);
        }
    }
    if cancelled {
        note(s, format!("SEND CANCELLED {sent}/{total}"));
    }
    if let Some(message) = &error {
        events.send(SessionEvent::Error { message: message.clone() });
    }
    progress(sent, true, cancelled || stopping, error);
    stopping
}

/// Break — TX 를 정한 시간 동안 0(spacing)으로. 사건 줄 «BREAK 100ms»
fn run_break(s: &Shared, events: &EventSink, ms: u32) -> bool {
    let r = match s.writer.lock().unwrap().as_mut() {
        Some(out) => out.port.set_break().map_err(|e| e.to_string()),
        None => Err(crate::tr!("포트가 끊겨 있습니다", "The port is disconnected").to_string()),
    };
    if let Err(message) = r {
        events.send(SessionEvent::Error { message: crate::tr!(format!("Break 실패: {message}"), format!("Break failed: {message}")) });
        return false;
    }
    note(s, format!("BREAK {ms}ms"));
    let stopping = nap(s, ms, &|| false);
    if let Some(out) = s.writer.lock().unwrap().as_mut() {
        let _ = out.port.clear_break();
    }
    stopping
}

fn push_rx(s: &Shared, frames: Vec<Cut>, replies: &SyncSender<Job>) {
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
        let ts = crate::event::wall_ms(at, now_i, now_w);
        let c = check.and_then(|k| k.verify_before(&bytes, &term));
        // 방금 우리가 보낸 응답이 송신 중에 그대로 들어온 것이면(RS-485 에코·루프백) 답하지 않는다 — 무한 반복 방지.
        // 판정은 첫 바이트 시각으로: 송신 시작 ~ 송신 시간 + 50ms. 정상 마스터는 응답을 다 받은 뒤 보내므로 창 밖이다.
        // 창 밖이어도 방금 보낸 응답과 같은 것이 1초에 100번을 넘으면 그 나머지는 답하지 않는다(Flood — 사건 줄은 처음 한 번)
        let echo = match s.last_reply.lock().unwrap().check(&bytes, at, Some(ECHO_MARGIN)) {
            Verdict::Answer => false,
            Verdict::Echo => true,
            Verdict::Flood { first } => {
                if first {
                    pending.push(Frame::event(flood_note()));
                }
                true
            }
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
                // 응답이 요청과 같아도 답한다(05·06 정상 응답) — 되돌아온 것은 위 `echo` 가 막는다
                let hit = s.rules.lock().unwrap().iter().find(|r| r.is_match(&bytes)).cloned();
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
            s.last_reply.lock().unwrap().sent(&reply, Instant::now() + Duration::from_millis(delay_ms), serial_tx_time(reply.len(), baud));
            // 대기열이 가득 차면(흐름 제어로 막힘) 응답을 버린다 — 읽기 스레드를 막지 않게
            if delay_ms == 0 {
                if let Err(TrySendError::Full(_)) = replies.try_send(Job::Bytes(reply)) {
                    pending.push(Frame::event(format!("AUTO {}", queue_full())));
                }
            } else {
                let tx = replies.clone();
                if let Err(e) = s.delayed.schedule(Duration::from_millis(delay_ms), move || {
                    let _ = tx.try_send(Job::Bytes(reply));
                }) {
                    pending.push(Frame::event(e.note()));
                }
            }
        }
    }
}

/// 프레임 구분기에 남은 미완성 바이트를 내보낸다(닫기·끊김 직전)
fn drain(s: &Shared, replies: &SyncSender<Job>) {
    let tail = s.framer.lock().unwrap().flush();
    if let Some(f) = tail {
        push_rx(s, vec![f], replies);
    }
}

/// 1초마다 포트 목록에서 장치가 사라졌는지 본다(연결돼 있을 때만)
fn watch_loop(s: Arc<Shared>) {
    while !s.stop.load(Ordering::SeqCst) {
        for _ in 0..(WATCH.as_millis() / 50) {
            if s.stop.load(Ordering::SeqCst) {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        let online = s.writer.lock().unwrap().is_some();
        if !online {
            continue;
        }
        let list = ports::list();
        // 목록을 읽는 동안(수백 ms) 재연결로 식별이 바뀌었을 수 있어 읽은 뒤에 본다
        let identity = s.identity.lock().unwrap().clone();
        if identity.listed && !identity.present(&list) && s.writer.lock().unwrap().is_some() {
            s.gone.store(true, Ordering::SeqCst);
        }
    }
}

fn flush(s: &Shared, events: &EventSink) {
    let frames = std::mem::take(&mut *s.pending.lock().unwrap());
    crate::event::flush_frames(frames, &s.log, events);
}

/// 같은 장치가 다시 나타날 때까지 기다렸다가 연다. 사용자가 닫으면 None.
/// 설정은 매 회차 다시 읽는다 — 기다리는 동안 사용자가 속도를 바꾸거나 자동 재연결을 끌 수 있다.
/// 상태 문구에는 끊긴 이유(`reason`)를 이어 붙인다 — 다시 열기 실패가 생기면 그것으로 바꾼다
fn reconnect(identity: &Identity, before: &[String], s: &Shared, events: &EventSink, reason: &str) -> Option<(Port, String, Identity)> {
    let first = s.cfg.lock().unwrap().clone();
    if !first.auto_reconnect {
        status(events, "closed", &first.port, Some(closed_reason(reason)));
        return None;
    }
    let mut last = reason.to_string();
    status(events, "reconnecting", &first.port, Some(waiting_reason(&last)));
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
            status(events, "closed", &cfg.port, Some(closed_reason(&last)));
            return None;
        }
        let list = ports::list();
        let Some(info) = identity.find(&list, before) else { continue };
        // COM 번호가 바뀌었어도 같은 장치면 새 이름으로 연다
        let mut c = cfg.clone();
        c.port = info.name.clone();
        let o = match open(&c) {
            Ok(o) => o,
            Err(e) => {
                // 다시 나타났는데 못 연다(다른 프로그램이 먼저 잡음 등) — 바뀐 이유만 알린다
                if e != last {
                    last = e;
                    status(events, "reconnecting", &first.port, Some(waiting_reason(&last)));
                }
                continue;
            }
        };
        let id = Identity::from_info(info);
        // 식별을 먼저 바꾸고 나서 «연결됨» 으로 — 감시 스레드가 옛 식별로 «사라짐» 을 내지 않게
        *s.identity.lock().unwrap() = id.clone();
        s.gone.store(false, Ordering::SeqCst);
        if let Some(n) = o.note {
            note(s, n);
        }
        install_writer(s, o.writer, o.soft_rts, &c);
        let msg = (c.port != cfg.port).then(|| format!("{} → {}", cfg.port, c.port));
        status(events, "connected", &c.port, msg);
        return Some((o.reader, c.port, id));
    }
}

/// 다시 연 포트의 쓰기 핸들을 넣는다. 연 뒤 넣기 전에 사용자가 설정을 바꿨으면
/// (reconfigure 가 핸들이 없어 «다시 연결될 때 적용» 으로 미뤄 둔 것) 여기서 포트에 적용한다.
/// 설정 비교와 넣기를 writer 자물쇠 안에서 해 reconfigure 와 엇갈리지 않는다
fn install_writer(s: &Shared, mut w: Out, soft_rts: bool, opened: &SerialConfig) {
    let mut slot = s.writer.lock().unwrap();
    let now = s.cfg.lock().unwrap().clone();
    let mut soft = soft_rts;
    if !diff(opened, &now).is_empty() {
        match apply(&mut w, &now) {
            Ok((sw, n)) => {
                soft = sw;
                if let Some(n) = n {
                    note(s, n);
                }
            }
            Err(e) => note(s, format!("SET failed: {e}")),
        }
    }
    s.soft_rts.store(soft, Ordering::SeqCst);
    *slot = Some(w);
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
            stop_bits: 1.0,
            flow: "none".into(),
            dtr: false,
            rts: false,
            auto_reconnect: true,
            rs485: String::new(),
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

    /// 시험용 포트 — 적용된 속도를 기록한다. `open` 이 거짓이면 쓰기는 늘 막혀 있다(CTS 막힘 흉내),
    /// 참이면 받아 들이고 `log` 에 «W n»(쓴 바이트 수)·«RTS 1/0»·«BRK 1/0» 을 남긴다
    #[derive(Clone)]
    struct Fake {
        baud: Arc<Mutex<u32>>,
        open: bool,
        log: Arc<Mutex<Vec<String>>>,
    }

    impl Fake {
        fn blocked(baud: &Arc<Mutex<u32>>) -> Self {
            Self { baud: baud.clone(), open: false, log: Default::default() }
        }
        fn open(baud: &Arc<Mutex<u32>>) -> Self {
            Self { baud: baud.clone(), open: true, log: Default::default() }
        }
        fn push(&self, s: String) {
            self.log.lock().unwrap().push(s);
        }
    }

    impl Read for Fake {
        fn read(&mut self, _: &mut [u8]) -> std::io::Result<usize> {
            Err(ErrorKind::TimedOut.into())
        }
    }

    impl Write for Fake {
        fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
            if !self.open {
                return Err(ErrorKind::TimedOut.into());
            }
            self.push(format!("W {}", b.len()));
            Ok(b.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    impl SerialPort for Fake {
        fn name(&self) -> Option<String> {
            None
        }
        fn baud_rate(&self) -> serialport::Result<u32> {
            Ok(*self.baud.lock().unwrap())
        }
        fn data_bits(&self) -> serialport::Result<DataBits> {
            Ok(DataBits::Eight)
        }
        fn flow_control(&self) -> serialport::Result<FlowControl> {
            Ok(FlowControl::None)
        }
        fn parity(&self) -> serialport::Result<Parity> {
            Ok(Parity::None)
        }
        fn stop_bits(&self) -> serialport::Result<StopBits> {
            Ok(StopBits::One)
        }
        fn timeout(&self) -> Duration {
            Duration::from_millis(5)
        }
        fn set_baud_rate(&mut self, b: u32) -> serialport::Result<()> {
            *self.baud.lock().unwrap() = b;
            Ok(())
        }
        fn set_data_bits(&mut self, _: DataBits) -> serialport::Result<()> {
            Ok(())
        }
        fn set_flow_control(&mut self, _: FlowControl) -> serialport::Result<()> {
            Ok(())
        }
        fn set_parity(&mut self, _: Parity) -> serialport::Result<()> {
            Ok(())
        }
        fn set_stop_bits(&mut self, _: StopBits) -> serialport::Result<()> {
            Ok(())
        }
        fn set_timeout(&mut self, _: Duration) -> serialport::Result<()> {
            Ok(())
        }
        fn write_request_to_send(&mut self, on: bool) -> serialport::Result<()> {
            self.push(format!("RTS {}", on as u8));
            Ok(())
        }
        fn write_data_terminal_ready(&mut self, _: bool) -> serialport::Result<()> {
            Ok(())
        }
        fn read_clear_to_send(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }
        fn read_data_set_ready(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }
        fn read_ring_indicator(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }
        fn read_carrier_detect(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }
        fn bytes_to_read(&self) -> serialport::Result<u32> {
            Ok(0)
        }
        fn bytes_to_write(&self) -> serialport::Result<u32> {
            Ok(0)
        }
        fn clear(&self, _: serialport::ClearBuffer) -> serialport::Result<()> {
            Ok(())
        }
        fn try_clone(&self) -> serialport::Result<Box<dyn SerialPort>> {
            Ok(Box::new(self.clone()))
        }
        fn set_break(&self) -> serialport::Result<()> {
            self.push("BRK 1".into());
            Ok(())
        }
        fn clear_break(&self) -> serialport::Result<()> {
            self.push("BRK 0".into());
            Ok(())
        }
    }

    fn out(f: Fake) -> Out {
        Out { port: Box::new(f), raw: 0 }
    }

    fn shared_with(c: SerialConfig, f: Fake) -> Arc<Shared> {
        let id = Identity { key: "COM3".into(), vid_pid: None, has_serial: false, listed: false };
        Arc::new(Shared::new(c, FrameMode::Gap { gap_ms: 20 }, None, None, out(f), id))
    }

    fn fake_shared(baud: &Arc<Mutex<u32>>) -> Arc<Shared> {
        shared_with(cfg(), Fake::blocked(baud))
    }

    /// 쓰기 스레드까지 붙은 시험 세션 + 받은 사건들
    fn live(s: Arc<Shared>) -> (Session, Arc<Mutex<Vec<SessionEvent>>>) {
        let got = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let (tx, rx) = mpsc::sync_channel::<Job>(SEND_QUEUE_MAX);
        let (s2, ev) = (s.clone(), EventSink::new(move |e| g.lock().unwrap().push(e)));
        let writer = std::thread::spawn(move || writer_loop(rx, s2, ev));
        (Session { shared: s, tx: Some(tx), reader: None, writer: Some(writer), watcher: None }, got)
    }

    fn wait_for(mut f: impl FnMut() -> bool) {
        let until = Instant::now() + Duration::from_secs(5);
        while !f() {
            assert!(Instant::now() < until, "timed out");
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    fn tx_frames(s: &Shared) -> Vec<Vec<u8>> {
        s.pending.lock().unwrap().iter().filter(|f| f.dir == "tx").map(|f| f.bytes.clone()).collect()
    }

    fn notes(s: &Shared) -> Vec<String> {
        s.pending.lock().unwrap().iter().filter_map(|f| f.note.clone()).collect()
    }

    /// 흐름 제어로 막힌 채 계속 보내도 대기열이 끝없이 늘지 않는다 — 가득 차면 거절
    #[test]
    fn send_queue_is_bounded_while_blocked() {
        let baud = Arc::new(Mutex::new(9600));
        let (session, _) = live(fake_shared(&baud));
        let mut accepted = 0;
        let err = loop {
            match session.send(vec![0x55; 8]) {
                Ok(()) => accepted += 1,
                Err(e) => break e,
            }
            assert!(accepted <= SEND_QUEUE_MAX + 1, "queue grew past the cap");
        };
        assert!(accepted >= SEND_QUEUE_MAX, "accepted {accepted}");
        assert_eq!(err, queue_full());
        session.stop();
    }

    /// 재연결로 포트를 다시 연 뒤 핸들을 넣기 전에 설정을 바꿨다면, 넣을 때 새 설정이 포트에 적용된다
    #[test]
    fn reconfigure_before_writer_install_applies_on_install() {
        let baud = Arc::new(Mutex::new(9600));
        let shared = fake_shared(&baud);
        let opened = cfg(); // 재연결 때 9600 으로 열었다
        *shared.writer.lock().unwrap() = None; // 아직 핸들을 넣기 전
        let session = Session { shared: shared.clone(), tx: None, reader: None, writer: None, watcher: None };
        let mut new = cfg();
        new.baud = 115_200;
        session.reconfigure(new).unwrap();
        assert_eq!(*baud.lock().unwrap(), 9600, "offline — not applied yet");
        install_writer(&shared, out(Fake::blocked(&baud)), false, &opened);
        assert_eq!(*baud.lock().unwrap(), 115_200);
        assert!(shared.writer.lock().unwrap().is_some());
        // 바뀐 것이 없으면 건드리지 않는다
        *baud.lock().unwrap() = 1;
        let same = shared.cfg.lock().unwrap().clone();
        install_writer(&shared, out(Fake::blocked(&baud)), false, &same);
        assert_eq!(*baud.lock().unwrap(), 1);
    }

    /// 일련번호 없는 USB 가 COM3 → COM9 로 다시 붙은 뒤, 목록 감시는 새 식별로 봐야 한다.
    /// 옛 식별(«…@COM3»)로 보면 1초 뒤 «사라짐» → 끊김 → COM9 는 이미 `before` 에 있어 영영 재연결 대기
    #[test]
    fn identity_follows_reconnected_com_name() {
        let old = Identity::from_info(&usb("COM3", 0x1A86, 0x7523, None));
        let now = vec![usb("COM9", 0x1A86, 0x7523, None)];
        let found = old.find(&now, &[]).unwrap();
        assert!(!old.present(&now), "stale identity looks gone");
        let new = Identity::from_info(found);
        assert!(new.present(&now));
        assert!(new.listed && !new.has_serial && new.vid_pid == Some((0x1A86, 0x7523)));
    }

    /// DCB 값 — Mark·Space 는 Parity 3·4 + fParity, 1.5 정지 비트는 StopBits 1, RTS 토글은 fRtsControl = 3.
    /// 다른 비트(fBinary·fOutxCtsFlow·fDtrControl …)는 그대로
    #[test]
    fn dcb_patch_values() {
        let none = dcb::Want::default();
        assert!(!none.any());
        assert_eq!(dcb::patch(0x0001, dcb::NOPARITY, dcb::ONESTOPBIT, none), (0x0001, dcb::NOPARITY, dcb::ONESTOPBIT));
        let mark = dcb::Want { parity: Some(dcb::MARKPARITY), ..none };
        assert_eq!(dcb::patch(0x0001, dcb::NOPARITY, dcb::ONESTOPBIT, mark), (0x0003, 3, 0));
        let space = dcb::Want { parity: Some(dcb::SPACEPARITY), ..none };
        assert_eq!(dcb::patch(0x0011, dcb::EVENPARITY, dcb::TWOSTOPBITS, space), (0x0013, 4, 2));
        let one5 = dcb::Want { one5: true, ..none };
        assert_eq!(dcb::patch(0x0001, dcb::ODDPARITY, dcb::ONESTOPBIT, one5), (0x0001, dcb::ODDPARITY, 1));
        // 12~13번 비트: 1(Enable) → 3(Toggle). 14번(fAbortOnError)·4~5번(fDtrControl)은 그대로
        let toggle = dcb::Want { rts_toggle: true, ..none };
        let bits = 0x0001 | (1 << 12) | (1 << 14) | (1 << 4);
        assert_eq!(dcb::patch(bits, 0, 0, toggle).0, 0x0001 | (3 << 12) | (1 << 14) | (1 << 4));
        // 설정 → 바꿀 것
        let mut c = cfg();
        assert!(!dcb_want(&c, false).any());
        c.parity = "space".into();
        c.stop_bits = 1.5;
        assert_eq!(dcb_want(&c, true), dcb::Want { parity: Some(dcb::SPACEPARITY), one5: true, rts_toggle: true });
        assert!(matches!(parity_of(&c), Parity::None) && matches!(stop_of(&c), StopBits::One));
        c.stop_bits = 2.0;
        assert!(matches!(stop_of(&c), StopBits::Two));
    }

    #[test]
    fn describe_extended_line_settings() {
        let mut c = cfg();
        c.parity = "mark".into();
        c.stop_bits = 1.5;
        c.rs485 = "software".into();
        assert_eq!(describe(&c), "COM3 9600 8M1.5 flow=none DTR=0 RTS=0 RS485=software");
        // 하드웨어 흐름 제어면 RS-485 는 꺼진 것으로 본다
        c.flow = "hardware".into();
        assert_eq!(rs485(&c), Rs485::Off);
        let mut b = cfg();
        b.rs485 = "driver".into();
        assert_eq!(diff(&cfg(), &b), vec!["RS485 off→driver"]);
        // 예전 설정 JSON(stopBits 정수, rs485 없음)도 읽는다
        let old: SerialConfig =
            serde_json::from_str(r#"{"port":"COM1","baud":9600,"dataBits":8,"parity":"none","stopBits":2,"flow":"none"}"#).unwrap();
        assert_eq!(old.stop_bits, 2.0);
        assert_eq!(rs485(&old), Rs485::Off);
    }

    /// RS-485 소프트웨어 방식: 쓰기 앞뒤로 RTS 1 → W → RTS 0, 끝은 마지막 바이트가 나갈 시간 뒤
    #[test]
    fn rs485_software_toggles_rts_around_each_send() {
        let baud = Arc::new(Mutex::new(9600));
        let f = Fake::open(&baud);
        let log = f.log.clone();
        let mut c = cfg();
        c.rs485 = "software".into();
        let s = shared_with(c, f);
        s.soft_rts.store(true, Ordering::SeqCst);
        let t = Instant::now();
        let w = transmit(&s, &[0x55; 10], 0, &|| false);
        // 10바이트 @9600 8N1 ≈ 10.4ms + 한 글자 여유
        assert!(t.elapsed() >= Duration::from_millis(11), "{:?}", t.elapsed());
        assert_eq!(w.sent, 10);
        assert_eq!(*log.lock().unwrap(), vec!["RTS 1", "W 10", "RTS 0"]);
        // 끄면 RTS 를 건드리지 않는다
        log.lock().unwrap().clear();
        s.soft_rts.store(false, Ordering::SeqCst);
        transmit(&s, &[1, 2], 0, &|| false);
        assert_eq!(*log.lock().unwrap(), vec!["W 2"]);
    }

    /// 천천히 보내기: 줄마다 TX 줄, 문자 간 지연이면 한 바이트씩, 진행 사건은 끝(done)으로 마친다
    #[test]
    fn paced_send_by_line_with_char_delay() {
        let baud = Arc::new(Mutex::new(115_200));
        let f = Fake::open(&baud);
        let log = f.log.clone();
        let s = shared_with(cfg(), f);
        let (session, got) = live(s.clone());
        let id = session.send_paced(b"AB\nC".to_vec(), Pace { char_delay_ms: 2, line_delay_ms: 30, by_line: true, chunk: 0 }).unwrap();
        wait_for(|| got.lock().unwrap().iter().any(|e| matches!(e, SessionEvent::Progress(p) if p.done)));
        assert_eq!(tx_frames(&s), vec![b"AB\n".to_vec(), b"C".to_vec()]);
        assert_eq!(log.lock().unwrap().iter().filter(|l| l.as_str() == "W 1").count(), 4, "one byte per write");
        let last = got.lock().unwrap().iter().rev().find_map(|e| if let SessionEvent::Progress(p) = e { Some(p.clone()) } else { None }).unwrap();
        assert_eq!(last, Progress { id, sent: 4, total: 4, done: true, cancelled: false, error: None });
        session.stop();
    }

    /// 취소하면 그 자리에서 멈추고 «SEND CANCELLED n/m», 진행은 cancelled
    #[test]
    fn paced_send_cancel() {
        let baud = Arc::new(Mutex::new(115_200));
        let s = shared_with(cfg(), Fake::open(&baud));
        let (session, got) = live(s.clone());
        session.send_paced(vec![0x41; 200], Pace { char_delay_ms: 5, ..Pace::default() }).unwrap();
        wait_for(|| tx_frames(&s).is_empty() && got.lock().unwrap().iter().any(|e| matches!(e, SessionEvent::Progress(_))));
        std::thread::sleep(Duration::from_millis(30));
        session.cancel_send();
        wait_for(|| got.lock().unwrap().iter().any(|e| matches!(e, SessionEvent::Progress(p) if p.done)));
        let p = got.lock().unwrap().iter().rev().find_map(|e| if let SessionEvent::Progress(p) = e { Some(p.clone()) } else { None }).unwrap();
        assert!(p.cancelled && p.sent > 0 && p.sent < 200, "{p:?}");
        assert!(notes(&s).iter().any(|n| n.starts_with("SEND CANCELLED ")));
        // 취소 뒤에 넣은 것은 그대로 나간다
        session.send(vec![1]).unwrap();
        wait_for(|| tx_frames(&s).last() == Some(&vec![1]));
        session.stop();
    }

    /// Break: set_break → (ms) → clear_break, 사건 줄 «BREAK 30ms». 범위 밖이면 거절
    #[test]
    fn break_signal() {
        let baud = Arc::new(Mutex::new(9600));
        let f = Fake::open(&baud);
        let log = f.log.clone();
        let s = shared_with(cfg(), f);
        let (session, _) = live(s.clone());
        assert!(session.send_break(0).is_err());
        let t = Instant::now();
        session.send_break(30).unwrap();
        wait_for(|| log.lock().unwrap().iter().any(|l| l == "BRK 0"));
        assert!(t.elapsed() >= Duration::from_millis(30));
        assert_eq!(*log.lock().unwrap(), vec!["BRK 1", "BRK 0"]);
        assert!(notes(&s).contains(&"BREAK 30ms".to_string()));
        session.stop();
    }

    /// 응답 = 요청(Modbus 06) 인 응답기 — 받은 것을 그대로 돌려준다
    fn mirror() -> Responder {
        Box::new(|b: &[u8]| Reply { bytes: Some(b.to_vec()), delay_ms: 0, note: None })
    }

    fn replies_of(rx: &mpsc::Receiver<Job>) -> usize {
        rx.try_iter().filter(|j| matches!(j, Job::Bytes(_))).count()
    }

    /// RS-485 에코(보낸 응답이 곧바로 그대로 들어옴)는 무시하고, 응답을 다 보낸 뒤 같은 06 이 다시 오면 답한다
    #[test]
    fn echo_is_ignored_but_repeated_write_is_answered() {
        let s = shared_with(cfg(), Fake::blocked(&Arc::new(Mutex::new(9600))));
        *s.responder.lock().unwrap() = Some(mirror());
        let (tx, rx) = mpsc::sync_channel::<Job>(16);
        let req = vec![0x01, 0x06, 0x00, 0x01, 0x00, 0x03, 0x98, 0x0B];
        push_rx(&s, vec![(Instant::now(), req.clone())], &tx);
        assert_eq!(replies_of(&rx), 1, "first request answered");
        // 에코 — 보낸 응답이 그대로 곧바로
        push_rx(&s, vec![(Instant::now(), req.clone())], &tx);
        assert_eq!(replies_of(&rx), 0, "echo ignored");
        // 다시 답한 뒤 100ms 지나 같은 쓰기 — 정상 요청
        push_rx(&s, vec![(Instant::now(), req.clone())], &tx);
        assert_eq!(replies_of(&rx), 1);
        std::thread::sleep(Duration::from_millis(100));
        push_rx(&s, vec![(Instant::now(), req.clone())], &tx);
        assert_eq!(replies_of(&rx), 1, "repeated write after the reply is answered");
    }
}
