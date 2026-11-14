//! PortDock Packet 캡처 — Windows 내장 PktMon API(pktmonapi.dll)로 실시간 패킷 캡처. Npcap·드라이버 설치 없음.
//!
//! 방식과 근거는 `session.rs` 맨 위 설명. 읽기·듣기만 한다 — 패킷을 만들어 보내지 않는다.
//! `pcapng`·`frame`·`pktmon_types` 는 윈도우 API 에 기대지 않아 crates/packet 으로 옮겨도 된다.

pub mod adapters;
pub mod frame;
pub mod pcapng;
pub mod pktmon_types;
mod session;

pub use adapters::{Adapter, list_adapters};
pub use frame::{Direction, Frame, LinkType, Summary, summarize};
pub use pktmon_types::{CaptureFilter, DataSource};
pub use session::{CaptureSession, SourceScope, StartOptions, StopStats, is_elevated, list_data_sources, start};

use std::fmt;

/// 사람이 읽는 캡처 오류
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureError {
    /// 관리자 권한이 아님
    NeedAdmin,
    /// 이 PC 에 pktmonapi.dll 이 없음(오래된 Windows) 또는 윈도우가 아님
    Unsupported(String),
    /// 같은 이름의 PktMon 세션이 이미 있음
    Busy,
    /// 필터·옵션 값이 잘못됨
    BadOption(String),
    /// 그 밖의 API 오류 — 호출 이름과 HRESULT
    Api { call: &'static str, hresult: u32 },
}

impl CaptureError {
    pub(crate) fn from_hresult(call: &'static str, hr: u32) -> Self {
        match hr {
            0x8007_0005 => Self::NeedAdmin,                 // E_ACCESSDENIED
            0x8007_00B7 | 0x8007_0020 => Self::Busy,        // ALREADY_EXISTS · SHARING_VIOLATION
            0x8007_007E | 0x8007_007F => Self::Unsupported("pktmonapi.dll 을 불러오지 못했습니다".into()),
            _ => Self::Api { call, hresult: hr },
        }
    }
}

impl fmt::Display for CaptureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NeedAdmin => write!(f, "관리자 권한이 필요합니다. 프로그램을 «관리자 권한으로 실행» 해 주세요."),
            Self::Unsupported(why) => write!(f, "이 PC 에서는 실시간 캡처를 쓸 수 없습니다(Windows 11 의 Packet Monitor 필요): {why}"),
            Self::Busy => write!(f, "다른 패킷 캡처가 같은 이름으로 이미 실행 중입니다. 관리자 명령 창에서 `pktmon stop` 을 실행한 뒤 다시 시도해 주세요."),
            Self::BadOption(s) => write!(f, "캡처 설정이 올바르지 않습니다: {s}"),
            Self::Api { call, hresult } => write!(f, "캡처 시작에 실패했습니다({call}, 오류 코드 0x{hresult:08X})."),
        }
    }
}

impl std::error::Error for CaptureError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn errors_are_readable_korean() {
        assert_eq!(CaptureError::from_hresult("PacketMonitorInitialize", 0x8007_0005), CaptureError::NeedAdmin);
        assert!(CaptureError::NeedAdmin.to_string().starts_with("관리자 권한이 필요합니다"));
        assert_eq!(CaptureError::from_hresult("x", 0x8007_00B7), CaptureError::Busy);
        let e = CaptureError::from_hresult("PacketMonitorCreateLiveSession", 0x8000_4005);
        assert!(e.to_string().contains("0x80004005") && e.to_string().contains("PacketMonitorCreateLiveSession"));
        assert!(matches!(CaptureError::from_hresult("x", 0x8007_007E), CaptureError::Unsupported(_)));
    }
}
