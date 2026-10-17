//! 모든 PortDock 세션(시리얼·TCP·UDP)이 화면·로그로 내보내는 공통 모양.

use serde::Serialize;
use std::io::{BufWriter, Write};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct Frame {
    /// 유닉스 시각(ms)
    pub ts: u64,
    /// "rx" | "tx" | "ev"(연결·설정 변경·신호선 등 사건)
    pub dir: &'static str,
    pub bytes: Vec<u8>,
    /// 수신 검증 체크섬이 설정돼 있을 때 결과
    pub check: Option<bool>,
    /// 사건 줄의 내용. 예: «SET baud 9600→115200»
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    /// TCP·UDP: 상대 주소(«192.168.0.10:502»). 시리얼은 None
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peer: Option<String>,
}

impl Frame {
    pub fn data(dir: &'static str, bytes: Vec<u8>, check: Option<bool>, peer: Option<String>) -> Self {
        Self { ts: now_ms(), dir, bytes, check, note: None, peer }
    }

    pub fn event(note: String) -> Self {
        Self { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(note), peer: None }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionEvent {
    Frames { frames: Vec<Frame> },
    /// "connected" | "disconnected" | "reconnecting" | "closed"
    Status { state: &'static str, port: String, message: Option<String> },
    /// 송신 실패 등 연결은 유지되는 오류
    Error { message: String },
    /// 입력 신호선 상태
    Lines { cts: bool, dsr: bool, ri: bool, cd: bool },
    /// TCP 서버: 지금 붙어 있는 상대들
    Peers { peers: Vec<Peer> },
}

#[derive(Debug, Clone, Serialize)]
pub struct Peer {
    pub id: u64,
    pub addr: String,
}

/// 화면 쪽으로 사건을 넘기는 통로. 앱이 Tauri Channel 등을 감싸서 넘긴다.
#[derive(Clone)]
pub struct EventSink(Arc<dyn Fn(SessionEvent) + Send + Sync>);

impl EventSink {
    pub fn new(f: impl Fn(SessionEvent) + Send + Sync + 'static) -> Self {
        Self(Arc::new(f))
    }

    pub fn send(&self, e: SessionEvent) {
        (self.0)(e);
    }
}

/// 프레임 로그 파일. 쓰기·flush 가 한 번이라도 실패하면(디스크 가득·USB 메모리 뽑힘 등)
/// 그 파일 기록은 멈추고, 실패를 한 번만 알린다.
pub struct LogWriter {
    path: String,
    w: BufWriter<Box<dyn Write + Send>>,
}

impl LogWriter {
    /// 이어 쓰기로 연다
    pub fn open(path: &str) -> Result<Self, String> {
        let f = std::fs::OpenOptions::new().create(true).append(true).open(path).map_err(|e| format!("{path}: {e}"))?;
        Ok(Self::from_writer(path, Box::new(f)))
    }

    pub fn from_writer(path: &str, w: Box<dyn Write + Send>) -> Self {
        Self { path: path.to_string(), w: BufWriter::new(w) }
    }

    fn write(&mut self, frames: &[Frame]) -> std::io::Result<()> {
        for f in frames {
            writeln!(self.w, "{}", log_line(f))?;
        }
        self.w.flush()
    }
}

/// 프레임들을 로그에 쓴다. 실패하면 기록을 멈추고(slot = None) 알릴 문구를 돌려준다.
pub fn write_log(slot: &mut Option<LogWriter>, frames: &[Frame]) -> Option<String> {
    let log = slot.as_mut()?;
    let err = log.write(frames).err()?;
    let path = log.path.clone();
    *slot = None;
    Some(crate::tr!(
        format!("로그 파일 쓰기 실패 — 기록을 멈췄습니다: {path} ({err})"),
        format!("Log file write failed — logging stopped: {path} ({err})")
    ))
}

/// 세션의 묶음 전송 — 로그에 쓰고 화면으로 보낸다. 로그 실패는 사건 줄과 오류로 한 번 알린다.
pub fn flush_frames(mut frames: Vec<Frame>, log: &std::sync::Mutex<Option<LogWriter>>, events: &EventSink) {
    if frames.is_empty() {
        return;
    }
    let failed = write_log(&mut log.lock().unwrap(), &frames);
    if let Some(msg) = &failed {
        frames.push(Frame::event(msg.clone()));
    }
    events.send(SessionEvent::Frames { frames });
    if let Some(message) = failed {
        events.send(SessionEvent::Error { message });
    }
}

/// 재접속을 기다리는 동안 상태 문구 — 직전 실패 이유를 덮어쓰지 않고 이어 보여 준다
pub fn waiting_reason(reason: &str) -> String {
    crate::tr!(format!("재접속 대기 · 마지막 실패: {reason}"), format!("Waiting to reconnect · last failure: {reason}"))
}

/// 끊긴 뒤 닫힐 때 상태 문구
pub fn closed_reason(reason: &str) -> String {
    crate::tr!(format!("마지막 실패: {reason}"), format!("Last failure: {reason}"))
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
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
    let peer = f.peer.as_ref().map(|p| format!(" [{p}]")).unwrap_or_default();
    match &f.note {
        Some(n) => format!("{t} EV {n}"),
        None => format!("{t} {}{peer} {}{check}", f.dir.to_uppercase(), hex.join(" ")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct Broken;
    impl Write for Broken {
        fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
            Err(std::io::Error::other("disk full"))
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Err(std::io::Error::other("disk full"))
        }
    }

    #[test]
    fn log_failure_is_reported_once_and_stops_logging() {
        let log = Mutex::new(Some(LogWriter::from_writer("X:\\gone.log", Box::new(Broken))));
        let got = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let events = EventSink::new(move |e| g.lock().unwrap().push(e));
        flush_frames(vec![Frame::data("rx", vec![1], None, None)], &log, &events);
        flush_frames(vec![Frame::data("rx", vec![2], None, None)], &log, &events);
        assert!(log.lock().unwrap().is_none());
        let got = got.lock().unwrap();
        let errors: Vec<&String> = got.iter().filter_map(|e| if let SessionEvent::Error { message } = e { Some(message) } else { None }).collect();
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("X:\\gone.log") && errors[0].contains("disk full"));
        // 첫 묶음에는 사건 줄이 붙는다
        let SessionEvent::Frames { frames } = &got[0] else { panic!() };
        assert_eq!(frames.last().unwrap().dir, "ev");
    }
}

