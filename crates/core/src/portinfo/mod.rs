//! PortDock Port Inspector — COM 포트 하나를 기준으로 장치·드라이버·문제 코드·설정·절전·연결 기록·COM 번호 예약을 읽는다.
//! 관리자 권한 없이 읽기만 한다(쓰기·고치기 없음). 읽지 못한 항목은 `errors` 에 «무엇: 이유» 로 남기고 나머지를 계속 읽는다.
//!
//! 읽는 곳(모두 Windows 가 일반 사용자에게 읽기를 허용하는 곳):
//! - 장치 목록·속성·상태: CfgMgr32(CM_Get_Device_ID_List·CM_Get_DevNode_Property·CM_Get_DevNode_Status)
//! - 장치 설정: 장치의 하드웨어 키(Device Parameters, CM_Open_DevNode_Key) · HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Ports
//! - COM 번호 예약: HKLM\SYSTEM\CurrentControlSet\Control\COM Name Arbiter(ComDB) · HKLM\HARDWARE\DEVICEMAP\SERIALCOMM
//! - 절전: 전원 옵션(PowerReadACValueIndex) · WMI root\WMI MSPower_DeviceEnable
//! - 연결 기록: 이벤트 로그 Microsoft-Windows-Kernel-PnP/Configuration · System(Kernel-PnP·UserPnp)
//! - 이더넷: GetAdaptersAddresses(net.rs) · WMI root\StandardCimv2 MSFT_NetAdapter(이중 방식)
//! - 랜카드 점검: WMI root\StandardCimv2 MSFT_NetAdapterAdvancedPropertySettingData(고급 탭 값)·MSFT_NetConnectionProfile(네트워크 프로필) ·
//!   root\WMI MSPower_DeviceEnable · 장치 드라이버 키(CM_REGISTRY_SOFTWARE)의 PnPCapabilities · GetIfEntry2(오류·버린 패킷) ·
//!   INetFwPolicy2(방화벽 프로필 켜짐). `Get-NetAdapterPowerManagement` 경로는 일반 사용자로 실패해 쓰지 않는다
//! - USB 경로: CM_Get_Parent 사슬 · DEVPKEY_Device_Address(허브 포트 번호) · 허브 장치 인터페이스에 «조회» IOCTL
//!   (IOCTL_USB_GET_NODE_INFORMATION · IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX(_V2) — 둘 다 FILE_ANY_ACCESS)
//! - 이 PC 점검(장비 PC 설정): 레지스트리(빠른 시작·최대 절전·업데이트 정책·사용 시간·재시작 대기·화면 보호기·W32Time) ·
//!   전원 계획(PowerReadAC/DCValueIndex — 절전·최대 절전·화면 끄기·PCIe ASPM·USB 선택적 절전) ·
//!   이벤트 로그 System(Kernel-Power 41 · EventLog 6008 · WHEA-Logger·disk·Ntfs 경고 이상 · Time-Service).
//!   `powercfg /requests`·Defender 예외·SMART(디스크 신뢰성 카운터)는 관리자만 읽을 수 있어 읽지 않는다
//! - 무선(0.5.0, wireless.rs): Wi-Fi 어댑터(MSFT_NetAdapter NdisPhysicalMedium 9)·드라이버·장치 절전·전원 계획 «무선 어댑터 절전 모드»,
//!   이벤트 로그 Microsoft-Windows-WLAN-AutoConfig/Operational 8003(끊김 이유 — SSID·프로필 이름은 버린다)·드라이버 경고·오류(System),
//!   블루투스 라디오(Bluetooth 클래스 BTHUSB 등)·USB 경로·서비스 상태(SCM 조회)·System BTHUSB/BTHPORT 이벤트,
//!   블루투스 오디오 끝점(MMDevices 레지스트리 + IMMDeviceEnumerator 기본 장치). 위치 권한이 필요한 것(SSID·신호·채널·주변 AP)과
//!   주변 장치 검색은 하지 않는다

pub mod parse;
pub mod tables;
#[cfg(windows)]
mod win;
#[cfg(windows)]
mod pc;
#[cfg(windows)]
mod usb;
#[cfg(windows)]
mod wireless;
#[cfg(windows)]
mod live;
#[cfg(windows)]
mod wmi;

use serde::Serialize;
pub use tables::{Chip, Problem, Text};

/// 지금 열 수 있는 COM 이름(HKLM\HARDWARE\DEVICEMAP\SERIALCOMM) — 포트 목록 보강(0.3.0, ports::list). 읽기만
pub(crate) fn serialcomm_names() -> Vec<String> {
    #[cfg(windows)]
    return win::serialcomm_names();
    #[cfg(not(windows))]
    Vec::new()
}

/// 목록의 한 줄 — COM 포트 장치(지금 없는 것 포함)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortEntry {
    /// «COM3». 장치에 COM 이름이 없으면 None
    pub port: Option<String>,
    /// 장치 관리자에 보이는 이름
    pub name: String,
    /// 장치 인스턴스 ID. 장치를 찾지 못한 COM 이름(SERIALCOMM 에만 있음)은 빈 글
    pub instance_id: String,
    /// 지금 연결돼 있는지
    pub present: bool,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    /// 문제 코드(있을 때만, 지금 연결된 장치만)
    pub problem: Option<u32>,
    /// 장치 클래스 이름(«Ports» 등)
    pub class: String,
}

/// 드라이버
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Driver {
    pub provider: Option<String>,
    pub version: Option<String>,
    /// 드라이버 날짜(유닉스 ms)
    pub date: Option<u64>,
    pub inf: Option<String>,
    /// 드라이버 서비스 이름(«FTSER2K», «usbser» …) — Process Explorer «Find Handle» 에 넣을 이름
    pub service: Option<String>,
}

/// 위로 이어진 장치(USB 장치·허브)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ancestor {
    pub instance_id: String,
    pub name: String,
    pub service: Option<String>,
}

/// 장치 상태
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    /// 지금 연결돼 있는지
    pub present: bool,
    /// 드라이버가 시작됐는지(연결된 장치만)
    pub started: bool,
    /// 문제 코드와 뜻(없으면 None)
    pub problem: Option<Problem>,
    /// 사용 안 함(문제 코드 22)
    pub disabled: bool,
}

/// 장치 하드웨어 키(Device Parameters)의 값 하나
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegValue {
    pub name: String,
    /// 보이는 값(DWORD 는 십진수, 문자열은 그대로, 바이너리는 HEX)
    pub value: String,
    /// «dword» · «string» · «multi» · «binary» · «qword» · «other»
    pub kind: &'static str,
    /// DWORD·QWORD 면 수
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num: Option<u64>,
    /// 풀이(공개 문서로 확인된 이름만)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<Text>,
}

/// 절전 — 장치 하나의 «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음»
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerDevice {
    pub instance_id: String,
    pub name: String,
    /// true = PC 가 끌 수 있음(켜짐)
    pub can_turn_off: bool,
    /// 이 장치 자신인지(아니면 위로 이어진 USB 장치·허브)
    pub own: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Power {
    /// 전원 옵션 «USB 선택적 절전» — 전원 연결 시(AC)·배터리(DC). None = 읽지 못함(항목이 없는 PC 포함)
    pub usb_suspend_ac: Option<bool>,
    pub usb_suspend_dc: Option<bool>,
    /// 장치·위 장치들의 «PC 가 끌 수 있음». WMI 에 항목이 없는 장치는 빠진다
    pub devices: Vec<PowerDevice>,
}

/// USB 경로의 한 칸(장치 → 허브 → 루트 허브 → 컨트롤러 순)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbHop {
    pub instance_id: String,
    pub name: String,
    /// «device» · «hub» · «root»(루트 허브) · «controller»(USB 호스트 컨트롤러)
    pub kind: &'static str,
    /// 위 허브의 몇 번 포트에 꽂혔는지
    pub port: Option<u32>,
    /// 위 허브가 알려 준 협상 속도 «low» · «full» · «high» · «super» · «super+». 모르면 None
    pub speed: Option<&'static str>,
    /// 더 빠른 속도(SuperSpeed)를 낼 수 있다고 알리는데 그보다 낮게 붙었는지
    pub below_capable: bool,
    /// 허브만 — 버스 전원(true)·자체 전원(false)
    pub bus_powered: Option<bool>,
    /// 허브만 — 포트 수
    pub ports: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbPath {
    pub hops: Vec<UsbHop>,
    /// 읽지 못한 것 «무엇: 이유»
    pub errors: Vec<String>,
}

/// 포트 하나의 점검 결과(읽은 값)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortReport {
    pub entry: PortEntry,
    /// 읽은 시각(유닉스 ms)
    pub read_at: u64,
    pub description: Option<String>,
    /// USB 장치가 스스로 알린 제품 이름(«FT232R USB UART» 등)
    pub bus_description: Option<String>,
    pub manufacturer: Option<String>,
    pub location: Option<String>,
    pub hardware_ids: Vec<String>,
    pub chip: Option<Chip>,
    pub driver: Driver,
    pub status: Status,
    /// 마지막 연결·분리 시각(유닉스 ms, 장치 속성)
    pub last_arrival: Option<u64>,
    pub last_removal: Option<u64>,
    pub first_install: Option<u64>,
    pub ancestors: Vec<Ancestor>,
    /// Device Parameters 의 값들(이름순)
    pub params: Vec<RegValue>,
    /// Windows 포트 기본값(«9600,n,8,1») — Ports 키에 그 COM 항목이 있을 때
    pub port_default: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port_default_note: Option<Text>,
    pub power: Power,
    /// USB 장치면 허브 사슬·포트·속도. USB 가 아니면 None
    pub usb_path: Option<UsbPath>,
    /// 읽지 못한 항목 «무엇: 이유»
    pub errors: Vec<String>,
}

/// COM 번호 예약(ComDB)과 실제 장치
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComNumbers {
    /// ComDB 를 읽었는지(값이 없으면 false — COM 장치를 꽂은 적이 없는 PC)
    pub comdb_found: bool,
    /// ComDB 에 예약된 번호
    pub reserved: Vec<u16>,
    /// 지금 연결된 장치의 번호
    pub present: Vec<u16>,
    /// 지금 없는(숨은) 장치가 쥔 번호와 장치 이름
    pub hidden: Vec<(u16, String)>,
    /// 예약됐지만 아는 장치가 하나도 없는 번호
    pub orphan: Vec<u16>,
    /// 둘 이상의 장치가 같은 번호를 쥔 경우(번호, 장치 이름들)
    pub shared: Vec<(u16, Vec<String>)>,
    /// SERIALCOMM(지금 열 수 있는 COM 이름) 목록
    pub serialcomm: Vec<String>,
    pub errors: Vec<String>,
}

/// 장치의 PnP 이벤트 하나
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PnpEvent {
    /// 유닉스 ms
    pub time: u64,
    pub id: u32,
    pub provider: String,
    /// «start» · «install» · «delete» · «problem» · «other»
    pub kind: &'static str,
    /// 1 위험 · 2 오류 · 3 경고 · 4 정보
    pub level: u8,
    /// Windows 가 만든 설명(PC 언어). 못 만들면 None
    pub message: Option<String>,
    /// 어느 장치의 이벤트인지(이 장치 또는 위 USB 장치)
    pub device: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventList {
    pub events: Vec<PnpEvent>,
    /// 찾아본 기간(일)
    pub days: u32,
    /// 읽지 못한 로그 «로그: 이유»
    pub errors: Vec<String>,
}

/// 랜카드 고급 속성 하나(장치 관리자 «고급» 탭의 한 줄)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NicProp {
    /// 레지스트리 키워드(«*JumboPacket» — `*` 로 시작하면 Microsoft 표준 키워드)
    pub keyword: String,
    /// 드라이버가 붙인 이름(PC 언어)
    pub name: String,
    /// 보이는 값(«사용 안 함», «512» …). 드라이버가 안 주면 None
    pub display: Option<String>,
    /// 레지스트리에 든 원값. 아직 한 번도 바꾸지 않아 값이 없으면 None(그때는 기본값이 쓰인다)
    pub raw: Option<String>,
    /// 드라이버 기본값(원값)
    pub default: Option<String>,
    /// 고를 수 있는 원값들(목록형). 숫자형이면 빈 목록
    pub valid: Vec<String>,
    /// 숫자형의 범위
    pub min: Option<i64>,
    pub max: Option<i64>,
}

/// 랜카드 통계(부팅·연결 뒤 누적, GetIfEntry2)
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NicStats {
    pub in_packets: u64,
    pub out_packets: u64,
    /// 받았지만 오류로 버린 것(CRC 등)
    pub in_errors: u64,
    /// 오류는 없었지만 버린 것(버퍼 모자람 등 — 모르는 프로토콜은 따로 셈)
    pub in_discards: u64,
    pub out_errors: u64,
    pub out_discards: u64,
}

/// 이 PC 랜카드 요약 + 점검 값
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NicSummary {
    pub name: String,
    pub description: String,
    pub up: bool,
    /// 링크 속도(bps). 모르면 None
    pub speed: Option<u64>,
    /// 전이중이면 true, 반이중이면 false, 모르면 None
    pub full_duplex: Option<bool>,
    pub ipv4: Vec<String>,
    pub gateway: Option<String>,
    /// 장치 인스턴스 ID(PnP)
    pub pnp_id: Option<String>,
    /// 고급 속성(키워드순). 드라이버가 알리지 않으면 빈 목록
    pub advanced: Vec<NicProp>,
    /// «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음»(MSPower_DeviceEnable). WMI 에 항목이 없으면 None
    pub can_turn_off: Option<bool>,
    /// 드라이버 키의 PnPCapabilities(없으면 None — 기본 동작)
    pub pnp_capabilities: Option<u32>,
    pub stats: Option<NicStats>,
    /// 네트워크 프로필 «public» · «private» · «domain». 프로필이 없으면(식별 안 된 네트워크·끊김) None
    pub profile: Option<&'static str>,
    /// 네트워크 이름(프로필)
    pub network: Option<String>,
}

/// 방화벽 프로필 하나
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FirewallProfile {
    /// «domain» · «private» · «public»
    pub profile: &'static str,
    /// 켜짐. 읽지 못하면 None
    pub enabled: Option<bool>,
    /// 지금 쓰이는 프로필인지
    pub current: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NicList {
    pub nics: Vec<NicSummary>,
    /// 방화벽 프로필 켜짐(읽지 못하면 빈 목록 + errors)
    pub firewall: Vec<FirewallProfile>,
    pub errors: Vec<String>,
}

/// 전원 계획 값 하나 — 전원 연결(AC)·배터리(DC). 못 읽으면 None
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcPowerValue {
    /// «sleep»(절전까지 초) · «hibernate»(최대 절전까지 초) · «display»(화면 끄기까지 초) · «aspm»(0 끔 · 1 보통 · 2 최대) · «usbSuspend»(0 끔 · 1 켬)
    pub id: &'static str,
    pub ac: Option<u32>,
    pub dc: Option<u32>,
}

/// Windows 업데이트 — 정책(그룹 정책·관리 도구가 정한 값)과 사용자 설정(사용 시간). 값이 없으면 None
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcUpdate {
    /// 정책 …\WindowsUpdate\AU NoAutoUpdate(1 = 자동 업데이트 끔)
    pub no_auto_update: Option<u32>,
    /// 정책 AUOptions(2 다운로드 전 알림 · 3 자동 다운로드·설치 알림 · 4 자동 다운로드·예약 설치 · 5 로컬 관리자가 고름 · 7 설치·재시작 알림)
    pub au_options: Option<u32>,
    /// 정책 NoAutoRebootWithLoggedOnUsers(1 = 로그인한 사용자가 있으면 자동 재시작 안 함)
    pub no_auto_reboot: Option<u32>,
    /// 정책 AlwaysAutoRebootAtScheduledTime
    pub always_auto_reboot: Option<u32>,
    /// 정책 …\WindowsUpdate ExcludeWUDriversInQualityUpdate(1 = 드라이버는 업데이트에서 뺌)
    pub exclude_drivers: Option<u32>,
    /// 정책으로 정한 사용 시간(SetActiveHours = 1 일 때 시작·끝 시)
    pub policy_active_hours: Option<(u32, u32)>,
    /// 사용자 설정 사용 시간(시작·끝 시)
    pub active_hours: Option<(u32, u32)>,
    /// 사용 시간 자동 조정(1 켬)
    pub smart_active_hours: Option<u32>,
}

/// 시간 동기화(W32Time) 설정
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcTime {
    /// «NTP» · «NT5DS»(도메인) · «AllSync» · «NoSync»
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub ntp_server: Option<String>,
    /// 정책 키(…\Policies\Microsoft\W32Time\Parameters)의 값인지
    pub policy: bool,
    /// W32Time 서비스 시작 유형(2 자동 · 3 수동(필요할 때) · 4 사용 안 함)
    pub service_start: Option<u32>,
}

/// 화면 보호기(지금 사용자)
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcScreenSaver {
    /// ScreenSaveActive
    pub active: Option<bool>,
    /// 화면 보호기 파일 이름(경로 뺌). 없으면 None — 고른 화면 보호기가 없음
    pub program: Option<String>,
    /// 대기 시간(초)
    pub timeout: Option<u32>,
    /// 다시 시작할 때 로그온 화면 표시
    pub secure: Option<bool>,
}

/// 이벤트 묶음 한 줄 — 같은 원본·ID 의 건수와 마지막 시각
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcEventCount {
    /// «unexpected»(예기치 않은 종료) · «hardware»(하드웨어 오류·경고) · «time»(시간 서비스)
    pub group: &'static str,
    pub provider: String,
    pub id: u32,
    /// 마지막 것의 수준(1 위험 · 2 오류 · 3 경고 · 4 정보)
    pub level: u8,
    pub count: u32,
    /// 마지막 시각(유닉스 ms)
    pub last: u64,
}

/// 이 PC 점검 — 장비 PC 로 쓸 때 볼 설정과 최근 기록(읽은 값)
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PcCheck {
    pub read_at: u64,
    /// 이벤트를 찾아본 기간(일)
    pub days: u32,
    /// 빠른 시작(HiberbootEnabled)
    pub fast_startup: Option<bool>,
    /// 최대 절전 사용(HibernateEnabled) — 꺼져 있으면 빠른 시작도 쓰이지 않는다
    pub hibernate_enabled: Option<bool>,
    /// 지금 전원 계획 이름
    pub scheme: Option<String>,
    pub power: Vec<PcPowerValue>,
    pub update: PcUpdate,
    /// 재시작 대기 표시 «windowsUpdate»(RebootRequired 키) · «servicing»(구성 요소 RebootPending 키) · «fileRename»(PendingFileRenameOperations)
    pub reboot_pending: Vec<&'static str>,
    pub screen_saver: PcScreenSaver,
    pub time: PcTime,
    /// 기간 안의 이벤트 건수(원본·ID 별)
    pub events: Vec<PcEventCount>,
    /// 읽지 못한 것 «무엇: 이유»
    pub errors: Vec<String>,
}

/// Wi-Fi 어댑터 하나
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiAdapter {
    /// 인터페이스 이름(«Wi-Fi»)
    pub name: String,
    /// 어댑터 설명(제품 이름)
    pub description: String,
    /// 무선 연결됨(MediaConnectState). 네트워크 이름(SSID)은 읽지 않는다
    pub connected: bool,
    pub driver: Driver,
    /// 장치 관리자 문제 코드(있을 때만)
    pub problem: Option<Problem>,
    /// «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음». WMI 에 항목이 없으면 None
    pub can_turn_off: Option<bool>,
}

/// Wi-Fi 끊김(WLAN-AutoConfig 8003) 이유 하나 — 이유 코드·Windows 문구(PC 언어)별 건수와 마지막 시각
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReasonCount {
    pub code: Option<u32>,
    pub reason: String,
    pub count: u32,
    pub last: u64,
}

/// 이벤트 원본·ID 별 건수(경고·오류만)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventCount {
    pub provider: String,
    pub id: u32,
    /// 가장 무거운 수준(1 위험 · 2 오류 · 3 경고)
    pub level: u8,
    pub count: u32,
    pub last: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Wifi {
    pub adapters: Vec<WifiAdapter>,
    /// 전원 계획 «무선 어댑터 설정 → 절전 모드»(0 최대 성능 · 1 절전 낮음 · 2 절전 보통 · 3 최대 절전). 항목이 없으면 None
    pub power_save_ac: Option<u32>,
    pub power_save_dc: Option<u32>,
    /// 끊김 이유별 건수(기간 안, 많은 것부터). SSID·BSSID·프로필 이름은 읽은 뒤 버린다
    pub disconnects: Vec<ReasonCount>,
    /// WLAN-AutoConfig 로그를 읽었는지
    pub log_read: bool,
    /// Wi-Fi 드라이버(서비스 이름 = 이벤트 원본)의 System 경고·오류
    pub driver_events: Vec<EventCount>,
}

/// 블루투스 라디오(어댑터)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BtRadio {
    pub name: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub driver: Driver,
    pub started: bool,
    pub problem: Option<Problem>,
    pub can_turn_off: Option<bool>,
    /// USB 라디오면 허브 사슬(Port Inspector USB 경로와 같음)
    pub usb_path: Option<UsbPath>,
}

/// 서비스 상태(SCM 조회만)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceState {
    /// «bthserv» 등
    pub name: String,
    /// 이 PC 에 서비스가 있는지
    pub found: bool,
    /// «running» · «stopped» · «starting» · «stopping» · «paused» · «other». 못 읽으면 None
    pub state: Option<&'static str>,
    /// 시작 유형(2 자동 · 3 수동 · 4 사용 안 함)
    pub start_type: Option<u32>,
}

/// 블루투스 오디오 끝점(사용 가능 상태인 것만)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BtAudio {
    /// 소리 설정에 보이는 이름(«헤드셋 (…)») — 화면에만. 결과 복사·저장에서는 화면 쪽이 가린다
    pub name: String,
    /// «render»(출력) · «capture»(입력)
    pub flow: &'static str,
    /// «handsFree»(핸즈프리·통화용) · «stereo»(A2DP) · «other»
    pub kind: &'static str,
    /// 기본 장치(콘솔·멀티미디어)인지
    pub default_console: bool,
    /// 기본 통신 장치인지
    pub default_comms: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bluetooth {
    pub radios: Vec<BtRadio>,
    pub services: Vec<ServiceState>,
    /// System BTHUSB·BTHPORT 경고·오류
    pub events: Vec<EventCount>,
    /// System 로그를 읽었는지
    pub log_read: bool,
    pub audio: Vec<BtAudio>,
}

/// 무선 점검(Wi-Fi·블루투스) — 읽은 값
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Wireless {
    pub read_at: u64,
    pub days: u32,
    pub wifi: Wifi,
    pub bt: Bluetooth,
    /// 읽지 못한 것 «무엇: 이유»
    pub errors: Vec<String>,
}

/// 무선 점검 — Wi-Fi·블루투스 설정과 최근 `days` 일 이벤트(관리자 권한·위치 권한 없이, 주변 장치 검색 없이)
pub fn wireless(days: u32) -> Wireless {
    let days = days.clamp(1, 365);
    #[cfg(windows)]
    {
        wireless::read(days)
    }
    #[cfg(not(windows))]
    {
        Wireless { days, read_at: crate::event::now_ms(), errors: vec![crate::tr!("Windows 에서만 읽을 수 있습니다", "Available on Windows only").into()], ..Default::default() }
    }
}

/// 짝지은 블루투스 장치 하나와 지금 연결 여부(Hardware Tester 연결 기록기). 인스턴스 ID(장치 주소가 든다)·이름은
/// 백엔드 안에서만 쓰고, 화면에는 번호와 이름만, 저장·복사에는 번호만 간다 — 그래서 Serialize 하지 않는다
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BtLink {
    pub id: String,
    pub name: String,
    /// PnP «연결됨» 속성. 못 읽으면 None
    pub connected: Option<bool>,
}

/// Wi-Fi 연결(8001)·끊김(8003) 한 건 — 이유 코드·Windows 문구만(SSID·프로필 이름 없음)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WlanEvent {
    pub time: u64,
    pub connected: bool,
    pub code: Option<u32>,
    pub reason: Option<String>,
}

/// 짝지은 블루투스 장치들의 지금 연결 여부(관리자 권한 없이, 주변 검색 없이)
pub fn bt_links() -> Vec<BtLink> {
    #[cfg(windows)]
    return live::bt_links();
    #[cfg(not(windows))]
    Vec::new()
}

/// 최근 `within_ms` 안의 Wi-Fi 연결·끊김(오래된 것부터). 로그가 없는 PC(서버)면 Err
pub fn wlan_events(within_ms: u64) -> Result<Vec<WlanEvent>, String> {
    #[cfg(windows)]
    return live::wlan_events(within_ms);
    #[cfg(not(windows))]
    {
        let _ = within_ms;
        Err(crate::tr!("Windows 에서만 읽을 수 있습니다", "Available on Windows only").into())
    }
}

/// 블루투스 오디오 끝점(무선 탭과 같은 값)과 읽지 못한 것
pub fn bt_audio() -> (Vec<BtAudio>, Vec<String>) {
    #[cfg(windows)]
    return live::bt_audio();
    #[cfg(not(windows))]
    (Vec::new(), vec![crate::tr!("Windows 에서만 읽을 수 있습니다", "Available on Windows only").into()])
}

/// 이 PC 점검 — 설정과 최근 `days` 일 이벤트(관리자 권한 없이)
pub fn pc(days: u32) -> PcCheck {
    let days = days.clamp(1, 365);
    #[cfg(windows)]
    {
        pc::read(days)
    }
    #[cfg(not(windows))]
    {
        PcCheck { days, read_at: crate::event::now_ms(), errors: vec![crate::tr!("Windows 에서만 읽을 수 있습니다", "Available on Windows only").into()], ..Default::default() }
    }
}

/// COM 포트 장치 목록 — `hidden` 이면 지금 없는 장치(예전에 꽂았던 것)도. 이름(COM 번호)순, 지금 있는 것이 먼저
pub fn list(hidden: bool) -> Vec<PortEntry> {
    #[cfg(windows)]
    let mut v = win::list(hidden);
    #[cfg(not(windows))]
    let mut v: Vec<PortEntry> = {
        let _ = hidden;
        Vec::new()
    };
    v.sort_by_key(|e| (!e.present, e.port.as_deref().and_then(parse::com_number).unwrap_or(u16::MAX), e.name.to_lowercase()));
    v
}

/// 포트 하나 읽기 — 인스턴스 ID(목록의 instance_id) 또는 COM 이름(«COM3»)
pub fn report(id: &str) -> Result<PortReport, String> {
    #[cfg(windows)]
    {
        win::report(id)
    }
    #[cfg(not(windows))]
    {
        let _ = id;
        Err(crate::tr!("Windows 에서만 읽을 수 있습니다", "Available on Windows only").into())
    }
}

/// COM 번호 예약 상태
pub fn com_numbers() -> ComNumbers {
    #[cfg(windows)]
    {
        win::com_numbers()
    }
    #[cfg(not(windows))]
    {
        ComNumbers::default()
    }
}

/// 이 장치(와 위 USB 장치)의 최근 `days` 일 PnP 이벤트(새것이 먼저, 최대 200건)
pub fn events(instance_id: &str, days: u32) -> EventList {
    let days = days.clamp(1, 365);
    #[cfg(windows)]
    {
        win::events(instance_id, days)
    }
    #[cfg(not(windows))]
    {
        let _ = instance_id;
        EventList { days, ..Default::default() }
    }
}

/// 이 PC 랜카드 요약(링크 속도·이중·IPv4)과 점검 값(고급 속성·절전·통계·프로필·방화벽) — 루프백·가상 어댑터는 뺀다
pub fn nics() -> NicList {
    #[cfg(windows)]
    {
        win::nics()
    }
    #[cfg(not(windows))]
    {
        NicList::default()
    }
}

/// «USB\…\…» 처럼 USB 장치(허브 아님)인지 — 이벤트를 찾을 때 이 장치와 함께 볼 위 장치
pub(crate) fn is_usb_device(a: &Ancestor) -> bool {
    let id = a.instance_id.to_ascii_uppercase();
    let hub = a.service.as_deref().is_some_and(|s| s.eq_ignore_ascii_case("usbhub") || s.eq_ignore_ascii_case("usbhub3"));
    id.starts_with("USB\\VID_") && !hub
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn usb_device_filter() {
        let a = |id: &str, svc: Option<&str>| Ancestor { instance_id: id.into(), name: String::new(), service: svc.map(Into::into) };
        assert!(is_usb_device(&a(r"USB\VID_0403&PID_6001\A1", Some("FTDIBUS"))));
        assert!(!is_usb_device(&a(r"USB\VID_05E3&PID_0610\1", Some("USBHUB3"))));
        assert!(!is_usb_device(&a(r"USB\ROOT_HUB30\4&1", Some("USBHUB3"))));
        assert!(!is_usb_device(&a(r"PCI\VEN_8086&DEV_A36D\3", Some("USBXHCI"))));
    }

    /// 이 PC 에서 실제로 읽어 본다 — 관리자 없이, COM 장치가 하나도 없어도 실패하지 않아야 한다
    #[cfg(windows)]
    #[test]
    fn reads_this_pc_without_admin() {
        let now = list(false);
        let all = list(true);
        assert!(all.len() >= now.len());
        assert!(now.iter().all(|e| e.present));
        for e in all.iter().take(5) {
            let id = if e.instance_id.is_empty() { e.port.clone().unwrap_or_default() } else { e.instance_id.clone() };
            let r = report(&id).expect("목록에 있는 장치는 읽혀야 한다");
            assert_eq!(r.entry.instance_id, e.instance_id);
        }
        // 없는 장치는 오류(멈추지 않고)
        assert!(report(r"USB\VID_FFFF&PID_FFFF\NOPE").is_err());
        let c = com_numbers();
        // 예약 번호 = 아는 장치 + 주인 없는 번호
        for n in &c.orphan {
            assert!(c.reserved.contains(n));
        }
        let ev = events(r"USB\VID_FFFF&PID_FFFF\NOPE", 3);
        assert!(ev.events.is_empty(), "없는 장치의 이벤트는 없다");
        let n = nics();
        assert!(n.nics.iter().all(|x| !x.name.is_empty()));
    }
}
