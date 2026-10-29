//! 무선 점검(0.5.0) — Wi-Fi·블루투스를 관리자 권한·위치 권한 없이 읽기만 한다.
//! - Wi-Fi: MSFT_NetAdapter(NdisPhysicalMedium 9)·장치 속성(드라이버·문제 코드)·MSPower_DeviceEnable·전원 계획 «무선 어댑터 절전 모드»,
//!   WLAN-AutoConfig/Operational 8003(끊김 이유 코드·문구만 — SSID·BSSID·프로필 이름은 꺼내지 않는다)·드라이버 원본의 System 경고·오류.
//!   연결된 네트워크 이름·신호·채널·주변 AP 는 위치 권한이 필요해 읽지 않는다(Wlan API 를 쓰지 않는다 — 무선 랜 서비스가 없는
//!   Windows Server 에는 wlanapi.dll 이 없을 수도 있다)
//! - 블루투스: Bluetooth 클래스의 라디오(BTHUSB 등)·USB 경로·장치 절전·서비스 상태(SCM 조회)·System BTHUSB/BTHPORT 경고·오류,
//!   소리 끝점(MMDevices 레지스트리)의 핸즈프리/스테레오 구분과 기본 장치(IMMDeviceEnumerator). 주변 장치 검색은 하지 않는다
//!
//! 바꾸는 호출은 없다(KEY_READ · PowerRead* · EvtQuery · SERVICE_QUERY_STATUS · WMI SELECT).

use super::parse;
use super::tables;
use super::win::{self, Key, device_ids, display_name, driver_of, from_wide, locate, node_status, open_key_in, os_err, prop_string, query_value, scan_events, subkeys, u16s, wide};
use super::{BtAudio, BtRadio, Bluetooth, ServiceState, Wifi, WifiAdapter, Wireless};
use crate::tr;
use std::collections::HashMap;
use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{DN_HAS_PROBLEM, DN_STARTED};
use windows_sys::Win32::Devices::Properties::DEVPKEY_Device_Service;
use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_SUCCESS, HLOCAL, LocalFree};
use windows_sys::Win32::System::Power::{PowerGetActiveScheme, PowerReadACValueIndex, PowerReadDCValueIndex};
use windows_sys::Win32::System::Registry::{HKEY_LOCAL_MACHINE, REG_DWORD, REG_EXPAND_SZ, REG_SZ};
use windows_sys::Win32::System::Services::{CloseServiceHandle, OpenSCManagerW, OpenServiceW, QueryServiceStatus, SC_HANDLE, SC_MANAGER_CONNECT, SERVICE_QUERY_STATUS, SERVICE_STATUS};
use windows_sys::core::GUID;

/// 블루투스 장치 클래스
const BT_CLASS: &str = "{e0cbf06c-cd8b-4647-bb8a-263b43f0f974}";
/// 전원 옵션 — 무선 어댑터 설정 하위 그룹과 «절전 모드»(powercfg /q 의 GUID)
const GUID_WIRELESS_SUBGROUP: GUID = GUID::from_u128(0x19cbb8fa_5279_450e_9fac_8a3d5fedd0c1);
const GUID_WIRELESS_POWER_SAVING: GUID = GUID::from_u128(0x12bbebe6_58d6_4636_95bb_3217ef867c1a);
const WLAN_LOG: &str = "Microsoft-Windows-WLAN-AutoConfig/Operational";
/// 블루투스 이벤트 원본(System 로그) — 라디오 USB 드라이버·블루투스 스택
const BT_PROVIDERS: [&str; 2] = ["BTHUSB", "BTHPORT"];
/// 읽을 서비스 — 블루투스 지원 서비스·오디오 게이트웨이(핸즈프리 통화)·AVCTP(오디오 리모컨)
const BT_SERVICES: [&str; 3] = ["bthserv", "BTAGService", "BthAvctpSvc"];
const MMDEVICES: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio";
/// MMDevices 속성 이름 — PKEY_Device_DeviceDesc(«헤드셋») · PKEY_DeviceInterface_FriendlyName(장치 이름) ·
/// KS 장치 인스턴스 ID · 장치 인터페이스 경로
const P_DESC: &str = "{a45c254e-df1c-4efd-8020-67d146a850e0},2";
const P_IFACE_NAME: &str = "{b3f8fa53-0004-438e-9003-51a46e139bfc},6";
const P_KS_ID: &str = "{b3f8fa53-0004-438e-9003-51a46e139bfc},2";
const P_IFACE_PATH: &str = "{233164c8-1b2c-4c7d-bc68-b671687a2567},1";

fn reg_string(k: &Key, name: &str) -> Option<String> {
    match query_value(k, name) {
        Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => Some(from_wide(&u16s(&b)).trim().to_string()).filter(|s| !s.is_empty()),
        _ => None,
    }
}

fn reg_dword(k: &Key, name: &str) -> Option<u32> {
    match query_value(k, name) {
        Ok(Some((REG_DWORD, b))) if b.len() >= 4 => Some(u32::from_le_bytes(b[..4].try_into().ok()?)),
        _ => None,
    }
}

/// 전원 계획 «무선 어댑터 절전 모드» (AC, DC). 항목이 없는 PC(데스크톱·서버)는 None
fn wireless_power_saving(errors: &mut Vec<String>) -> (Option<u32>, Option<u32>) {
    let mut scheme: *mut GUID = std::ptr::null_mut();
    // SAFETY: 받은 GUID 는 LocalFree 로 돌려준다
    let r = unsafe { PowerGetActiveScheme(std::ptr::null_mut(), &mut scheme) };
    if r != ERROR_SUCCESS || scheme.is_null() {
        errors.push(format!("{}: {}", tr!("전원 계획", "Power plan"), os_err(r)));
        return (None, None);
    }
    let (mut ac, mut dc) = (0u32, 0u32);
    // SAFETY: scheme 은 위에서 받은 GUID, 읽기만
    let ra = unsafe { PowerReadACValueIndex(std::ptr::null_mut(), scheme, &GUID_WIRELESS_SUBGROUP, &GUID_WIRELESS_POWER_SAVING, &mut ac) };
    let rd = unsafe { PowerReadDCValueIndex(std::ptr::null_mut(), scheme, &GUID_WIRELESS_SUBGROUP, &GUID_WIRELESS_POWER_SAVING, &mut dc) };
    // SAFETY: PowerGetActiveScheme 이 준 메모리
    unsafe { LocalFree(scheme as HLOCAL) };
    ((ra == ERROR_SUCCESS).then_some(ac), (rd == ERROR_SUCCESS).then_some(dc))
}

/// 드라이버 시작 여부와 장치 문제 코드(지금 연결된 장치만)
fn status(dn: u32) -> (bool, Option<super::Problem>) {
    match node_status(dn) {
        Some((st, prob)) => (st & DN_STARTED != 0, (st & DN_HAS_PROBLEM != 0).then(|| tables::problem(prob))),
        None => (false, None),
    }
}

struct Svc(SC_HANDLE);
impl Drop for Svc {
    fn drop(&mut self) {
        if !self.0.is_null() {
            // SAFETY: 우리가 연 핸들
            unsafe { CloseServiceHandle(self.0) };
        }
    }
}

/// 서비스 상태 — SCM 에 연결 권한·상태 조회 권한으로만 연다. 시작 유형은 레지스트리 Services\<이름>\Start
fn service(scm: &Svc, name: &str) -> ServiceState {
    let start_type = open_key_in(HKEY_LOCAL_MACHINE, &format!(r"SYSTEM\CurrentControlSet\Services\{name}")).ok().and_then(|k| reg_dword(&k, "Start"));
    let w = wide(name);
    // SAFETY: 널로 끝나는 글, 조회 권한만
    let h = Svc(unsafe { OpenServiceW(scm.0, w.as_ptr(), SERVICE_QUERY_STATUS) });
    if h.0.is_null() {
        // ERROR_SERVICE_DOES_NOT_EXIST(1060) = 이 PC 에 없음(블루투스 없는 서버 등)
        return ServiceState { name: name.into(), found: false, state: None, start_type };
    }
    // SAFETY: SERVICE_STATUS 는 C 구조체 — 0 으로 채워 받는다
    let mut st: SERVICE_STATUS = unsafe { std::mem::zeroed() };
    let ok = unsafe { QueryServiceStatus(h.0, &mut st) } != 0;
    ServiceState { name: name.into(), found: true, state: ok.then(|| parse::service_state(st.dwCurrentState)), start_type }
}

fn services(errors: &mut Vec<String>) -> Vec<ServiceState> {
    // SAFETY: 이 PC 의 SCM 에 연결 권한만
    let scm = Svc(unsafe { OpenSCManagerW(std::ptr::null(), std::ptr::null(), SC_MANAGER_CONNECT) });
    if scm.0.is_null() {
        errors.push(format!("{}: {}", tr!("서비스 관리자", "Service Control Manager"), std::io::Error::last_os_error()));
        return Vec::new();
    }
    BT_SERVICES.iter().map(|n| service(&scm, n)).collect()
}

/// 블루투스 소리 끝점(사용 가능 상태) — MMDevices 레지스트리. `defaults` = 기본 끝점 (흐름, 역할, ID)
fn bt_audio(defaults: &[(&'static str, &'static str, String)], errors: &mut Vec<String>) -> Vec<BtAudio> {
    let mut out = Vec::new();
    for (flow, sub) in [("render", "Render"), ("capture", "Capture")] {
        let path = format!(r"{MMDEVICES}\{sub}");
        let root = match open_key_in(HKEY_LOCAL_MACHINE, &path) {
            Ok(k) => k,
            // 소리 장치가 한 번도 없던 PC(서버)
            Err(ERROR_FILE_NOT_FOUND) => continue,
            Err(e) => {
                errors.push(format!("MMDevices {sub}: {}", os_err(e)));
                continue;
            }
        };
        for key in subkeys(&root) {
            let Ok(k) = open_key_in(HKEY_LOCAL_MACHINE, &format!(r"{path}\{key}")) else { continue };
            if !reg_dword(&k, "DeviceState").is_some_and(parse::endpoint_active) {
                continue;
            }
            let Ok(p) = open_key_in(HKEY_LOCAL_MACHINE, &format!(r"{path}\{key}\Properties")) else { continue };
            let info = format!("{} {}", reg_string(&p, P_KS_ID).unwrap_or_default(), reg_string(&p, P_IFACE_PATH).unwrap_or_default());
            let Some(kind) = parse::bt_audio_kind(&info) else { continue };
            let name = match (reg_string(&p, P_DESC), reg_string(&p, P_IFACE_NAME)) {
                (Some(d), Some(v)) => format!("{d} ({v})"),
                (Some(x), None) | (None, Some(x)) => x,
                (None, None) => key.clone(),
            };
            let me = key.to_ascii_lowercase();
            let is_default = |role: &str| defaults.iter().any(|(f, r, id)| *f == flow && *r == role && parse::endpoint_key(id) == me);
            out.push(BtAudio { name, flow, kind, default_console: is_default("console"), default_comms: is_default("comms") });
        }
    }
    out
}

/// System 로그에서 이 원본들의 경고·오류 건수. 로그를 못 읽으면 Err
fn provider_events(providers: &[String], days: u32) -> Result<Vec<super::EventCount>, String> {
    let Some(q) = parse::providers_query(providers, days) else { return Ok(Vec::new()) };
    let mut raw = Vec::new();
    scan_events("System", &q, &mut |e| raw.push((e.provider, e.id, e.level, parse::iso_ms(&e.time).unwrap_or(0))))?;
    Ok(parse::event_counts(raw))
}

fn joined<T>(r: std::thread::Result<Result<T, String>>) -> Result<T, String> {
    r.unwrap_or_else(|_| Err("thread panicked".to_string()))
}

pub fn read(days: u32) -> Wireless {
    let mut errors = Vec::new();
    // WMI·COM 질의는 서로 기다리지 않게 함께(하나가 멈춰도 10초 뒤 나머지는 보인다)
    let (adapters, power, defaults) = std::thread::scope(|sc| {
        let a = sc.spawn(super::wmi::net_adapters);
        let b = sc.spawn(super::wmi::device_power);
        let c = sc.spawn(super::wmi::default_audio);
        (joined(a.join()), joined(b.join()), joined(c.join()))
    });
    let power: HashMap<String, bool> = power.unwrap_or_else(|e| {
        errors.push(format!("WMI MSPower_DeviceEnable: {e}"));
        HashMap::new()
    });
    let defaults = defaults.unwrap_or_else(|e| {
        errors.push(format!("{}: {e}", tr!("기본 소리 장치", "Default sound device")));
        Vec::new()
    });

    // ---- Wi-Fi
    let mut wifi = Wifi::default();
    match adapters {
        Ok(list) => {
            for a in list.into_iter().filter(|a| a.wireless) {
                let dn = a.pnp_id.as_deref().and_then(|id| locate(id, false));
                let (driver, problem) = dn.map_or((Default::default(), None), |dn| (driver_of(dn), status(dn).1));
                wifi.adapters.push(WifiAdapter {
                    can_turn_off: a.pnp_id.as_deref().and_then(|id| power.get(&id.to_ascii_uppercase()).copied()),
                    name: a.name,
                    description: a.description,
                    connected: a.up,
                    driver,
                    problem,
                });
            }
        }
        Err(e) => errors.push(format!("WMI MSFT_NetAdapter: {e}")),
    }
    (wifi.power_save_ac, wifi.power_save_dc) = wireless_power_saving(&mut errors);
    let mut raw = Vec::new();
    match scan_events(WLAN_LOG, &parse::wlan_query(days), &mut |e| raw.extend(parse::wlan_disconnect(&e))) {
        Ok(()) => wifi.log_read = true,
        // 무선 랜 서비스가 없는 PC(서버)에는 로그 채널이 없다 — 어댑터가 있을 때만 «읽지 못함» 으로 적는다
        Err(e) if !wifi.adapters.is_empty() => errors.push(format!("{WLAN_LOG}: {e}")),
        Err(_) => {}
    }
    wifi.disconnects = parse::reason_counts(raw);
    let wifi_svcs: Vec<String> = wifi.adapters.iter().filter_map(|a| a.driver.service.clone()).collect();
    match provider_events(&wifi_svcs, days) {
        Ok(v) => wifi.driver_events = v,
        Err(e) => errors.push(format!("{}: {e}", tr!("이벤트 로그 System", "Event log System"))),
    }

    // ---- 블루투스
    let mut bt = Bluetooth::default();
    for id in device_ids(Some(BT_CLASS), true) {
        let Some(dn) = locate(&id, false) else { continue };
        let svc = prop_string(dn, &DEVPKEY_Device_Service);
        if !parse::is_bt_radio(&id, svc.as_deref()) {
            continue;
        }
        let (started, problem) = status(dn);
        let vp = tables::vid_pid(&id).or_else(|| win::parent(dn).and_then(win::instance_id).and_then(|p| tables::vid_pid(&p)));
        bt.radios.push(BtRadio {
            name: display_name(dn, &id),
            vid: vp.map(|v| v.0),
            pid: vp.map(|v| v.1),
            driver: driver_of(dn),
            started,
            problem,
            can_turn_off: power.get(&id.to_ascii_uppercase()).copied(),
            usb_path: if id.to_ascii_uppercase().starts_with("USB\\") { super::usb::path(dn) } else { None },
        });
    }
    bt.services = services(&mut errors);
    let provs: Vec<String> = BT_PROVIDERS.iter().map(|s| s.to_string()).collect();
    match provider_events(&provs, days) {
        Ok(v) => {
            bt.events = v;
            bt.log_read = true;
        }
        Err(e) => errors.push(format!("{}: {e}", tr!("이벤트 로그 System", "Event log System"))),
    }
    bt.audio = bt_audio(&defaults, &mut errors);
    errors.dedup();
    Wireless { read_at: crate::event::now_ms(), days, wifi, bt, errors }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 관리자 없이 이 PC 에서 실제로 읽는다. CI(Windows Server)에는 Wi-Fi·블루투스가 없으니 «없으면 없음» 만 단정한다
    #[test]
    fn reads_this_pc_without_admin() {
        let w = read(7);
        assert_eq!(w.days, 7);
        assert!(w.read_at > 0);
        // 어댑터·라디오가 있으면 이름이 있다(없으면 빈 목록 — 오류 아님)
        assert!(w.wifi.adapters.iter().all(|a| !a.name.is_empty()));
        assert!(w.bt.radios.iter().all(|r| !r.name.is_empty()));
        assert!(w.wifi.disconnects.iter().all(|r| r.count > 0));
        assert!(w.wifi.driver_events.iter().chain(&w.bt.events).all(|e| e.count > 0 && (1..=3).contains(&e.level)));
        // 서비스는 셋 다 «있음/없음» 으로 답한다(SCM 은 관리자 없이 열린다)
        assert_eq!(w.bt.services.len(), 3, "{:?}", w.errors);
        // System 로그는 관리자 없이 읽힌다
        assert!(w.bt.log_read, "{:?}", w.errors);
        // 블루투스 오디오 끝점만 — 종류는 셋 가운데 하나
        assert!(w.bt.audio.iter().all(|a| ["handsFree", "stereo", "other"].contains(&a.kind) && ["render", "capture"].contains(&a.flow)));
        // 서버·무선 없는 PC 에서도 WMI·SCM 오류는 없어야 한다
        assert!(w.errors.iter().all(|e| !e.contains("MSFT_NetAdapter") && !e.contains("Service Control") && !e.contains("서비스 관리자")), "{:?}", w.errors);
    }
}
