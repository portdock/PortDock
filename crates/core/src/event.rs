//! 모든 PortDock 세션(시리얼·TCP·UDP)이 화면·로그로 내보내는 공통 모양.

use serde::Serialize;
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

