//! 실시간 캡처 세션 — Windows 11 내장 Packet Monitor API(`pktmonapi.dll`)를 쓴다.
//!
//! ## 왜 이 방법인가 (조사 근거)
//! - Npcap 은 재배포 금지라 제외. 설치할 것이 없는 내장 기능만 쓴다.
//! - Packet Monitor(pktmon)는 Windows 10 1809+ 내장. 그 위에 Microsoft 가 문서화한 **C API**(`pktmonapi.dll`,
//!   Microsoft Learn «Packet Monitor API»)가 있고, 이 PC(Windows 11 26300)의 System32 에 실제로 있으며 20개를 내보낸다
//!   (PacketMonitorInitialize·CreateLiveSession·EnumDataSources·AddSingleDataSourceToSession·AddCaptureConstraint·
//!   CreateRealtimeStream·AttachOutputToSession·SetSessionActive …).
//!   **실시간 스트림**(`PacketMonitorCreateRealtimeStream`)은 패킷마다 콜백을 부르고, 프레임 바이트·메타데이터(구성 요소·
//!   방향·유형·FILETIME 시각·버림 사유)를 준다. ETW 이벤트 160(Microsoft-Windows-PktMon)을 직접 파싱할 필요가 없다.
//! - **커널 필터**: `PacketMonitorAddCaptureConstraint`(IP·포트·프로토콜·MAC·VLAN). 여러 개면 OR, 없으면 전부.
//! - ETW 직접 방식(StartTrace + EnableTraceEx2 로 `Microsoft-Windows-NDIS-PacketCapture` {2ED6006E-…} 이벤트 1001 의
//!   MiniportIfIndex·LowerIfIndex·FragmentSize·Fragment 를 읽는 법)도 이 PC 의 공급자 메타데이터(`Get-WinEvent -ListProvider`)로
//!   필드 배치를 확인했으나 채택하지 않았다: 문서화된 API 가 없어 이벤트 모양이 바뀔 위험이 크고, 방향·루프백·필터를 직접 해야 한다.
//!   pktmon API 가 실패하는 PC 에 대비한 대안으로만 남긴다(구현 안 함).
//! - 루프백: pktmon 은 NIC 가 아니라 TCP/IP 스택의 구성 요소도 데이터 원본으로 본다. `SourceScope::All` 로 모든 구성 요소를
//!   붙이면 스택 안에서 도는 127.0.0.1 패킷이 보일 것으로 **예상**하나, 이 세션은 관리자가 아니어서 **확인하지 못했다**.
//!   `SourceScope::NetworkInterfaces` 만으로 루프백이 되는지도 미확인 — tools/capture-probe-test.ps1 이 둘 다 돌려 세어 준다.
//!
//! ## 한계
//! - 관리자 권한 필요(없으면 `CaptureError::NeedAdmin`).
//! - 같은 패킷이 스택의 여러 계층에서 여러 번 보고된다(Frame::appearance). 중복을 줄이려면 `dedup_appearances`.
//! - 스트림은 최대 9000 바이트까지만 잘라 준다(문서). 그보다 큰 합쳐 보내기(LSO) 프레임은 잘린다.
//! - x64 Windows 만 지원(콜백이 큰 구조체를 포인터로 받는 규약을 가정).

use crate::CaptureError;
use crate::frame::Frame;
use crate::pktmon_types::{CaptureFilter, DataSource};

/// 어떤 구성 요소를 붙일까
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum SourceScope {
    /// 네트워크 인터페이스(NIC)만 — 보통 이쪽이 중복이 적다
    #[default]
    NetworkInterfaces,
    /// 스택의 모든 구성 요소 — 루프백이 필요할 때
    All,
}

#[derive(Clone, Debug)]
pub struct StartOptions {
    pub scope: SourceScope,
    /// 비어 있지 않으면 이름(또는 설명)에 이 글자가 들어 있는 구성 요소만(대소문자 무시)
    pub name_contains: Vec<String>,
    /// 커널 필터(OR). 비면 전부
    pub filters: Vec<CaptureFilter>,
    /// 패킷당 최대 바이트(1..=9000)
    pub truncation: u16,
    /// 링 버퍼 배율(1..=10, 기본 버퍼 256KB)
    pub buffer_multiplier: u16,
    /// 같은 패킷의 두 번째 이후 나타남을 버린다(버림 보고는 항상 통과)
    pub dedup_appearances: bool,
    /// 관리자 확인 없이 API 를 그대로 부른다 — API 가 비관리자에게 주는 실제 오류를 보려는 진단용
    pub skip_admin_check: bool,
}

impl Default for StartOptions {
    fn default() -> Self {
        Self { scope: SourceScope::default(), name_contains: Vec::new(), filters: Vec::new(), truncation: 9000, buffer_multiplier: 4, dedup_appearances: false, skip_admin_check: false }
    }
}

/// 중지 때 알려 주는 숫자
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct StopStats {
    /// 콜백이 받은 레코드
    pub records: u64,
    /// 해석하지 못한 레코드
    pub parse_errors: u64,
    /// dedup 으로 버린 것
    pub dedup_skipped: u64,
    /// PktMon 이 «스트림에 쓰지 못함» 으로 센 누락(처리가 느리면 늘어난다)
    pub missed_write: u64,
    pub missed_read: u64,
}

#[cfg(windows)]
mod imp;
#[cfg(windows)]
pub use imp::*;

#[cfg(not(windows))]
mod stub {
    use super::*;
    pub struct CaptureSession;
    impl CaptureSession {
        pub fn stop(&mut self) -> StopStats {
            StopStats::default()
        }
        pub fn data_sources(&self) -> &[DataSource] {
            &[]
        }
    }
    pub fn is_elevated() -> bool {
        false
    }
    pub fn list_data_sources(_all: bool) -> Result<Vec<DataSource>, CaptureError> {
        Err(CaptureError::Unsupported("Windows 가 아닙니다".into()))
    }
    pub fn start(_o: &StartOptions, _f: impl Fn(Frame) + Send + Sync + 'static) -> Result<CaptureSession, CaptureError> {
        Err(CaptureError::Unsupported("Windows 가 아닙니다".into()))
    }
}
#[cfg(not(windows))]
pub use stub::*;
