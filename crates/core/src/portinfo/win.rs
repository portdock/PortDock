//! Windows 에서 읽기 — CfgMgr32·레지스트리·전원 옵션·이벤트 로그. 모두 읽기 권한(KEY_READ)만 쓴다.

use super::parse::{self, com_number, filetime_ms};
use super::tables::{self, Problem};
use super::{Ancestor, ComNumbers, Driver, EventList, NicList, NicProp, NicStats, NicSummary, PnpEvent, PortEntry, PortReport, Power, PowerDevice, RegValue, Status, is_usb_device};
use crate::tr;
use std::collections::HashMap;
use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{
    CM_GETIDLIST_FILTER_CLASS, CM_GETIDLIST_FILTER_NONE, CM_GETIDLIST_FILTER_PRESENT, CM_Get_DevNode_PropertyW, CM_Get_DevNode_Status, CM_Get_Device_ID_ListW,
    CM_Get_Device_ID_List_SizeW, CM_Get_Parent, CM_LOCATE_DEVNODE_NORMAL, CM_LOCATE_DEVNODE_PHANTOM, CM_Locate_DevNodeW, CM_Open_DevNode_Key, CM_REGISTRY_HARDWARE, CM_REGISTRY_SOFTWARE,
    CR_BUFFER_SMALL, CR_SUCCESS, DN_HAS_PROBLEM, DN_STARTED, RegDisposition_OpenExisting,
};
use windows_sys::Win32::Devices::Properties::{
    DEVPKEY_Device_BusReportedDeviceDesc, DEVPKEY_Device_Class, DEVPKEY_Device_DeviceDesc, DEVPKEY_Device_DriverDate, DEVPKEY_Device_DriverInfPath,
    DEVPKEY_Device_DriverProvider, DEVPKEY_Device_DriverVersion, DEVPKEY_Device_FirstInstallDate, DEVPKEY_Device_FriendlyName, DEVPKEY_Device_HardwareIds,
    DEVPKEY_Device_LastArrivalDate, DEVPKEY_Device_LastRemovalDate, DEVPKEY_Device_LocationInfo, DEVPKEY_Device_Manufacturer, DEVPKEY_Device_Service, DEVPROP_TYPE_FILETIME,
    DEVPROP_TYPE_STRING, DEVPROP_TYPE_STRING_LIST, DEVPROP_TYPE_UINT32, DEVPROPTYPE,
};
use windows_sys::Win32::Foundation::{DEVPROPKEY, ERROR_FILE_NOT_FOUND, ERROR_INSUFFICIENT_BUFFER, ERROR_MORE_DATA, ERROR_NO_MORE_ITEMS, ERROR_SUCCESS, HLOCAL, LocalFree};
use windows_sys::Win32::System::EventLog::{
    EVT_HANDLE, EvtClose, EvtFormatMessage, EvtFormatMessageEvent, EvtNext, EvtOpenPublisherMetadata, EvtQuery, EvtQueryChannelPath, EvtQueryReverseDirection, EvtRender,
    EvtRenderEventXml,
};
use windows_sys::Win32::NetworkManagement::IpHelper::{GetIfEntry2, MIB_IF_ROW2};
use windows_sys::Win32::System::Power::{PowerGetActiveScheme, PowerReadACValueIndex, PowerReadDCValueIndex};
use windows_sys::Win32::System::Registry::{
    HKEY, HKEY_LOCAL_MACHINE, KEY_READ, REG_BINARY, REG_DWORD, REG_EXPAND_SZ, REG_MULTI_SZ, REG_QWORD, REG_SZ, RegCloseKey, RegEnumValueW, RegOpenKeyExW, RegQueryValueExW,
};
use windows_sys::core::GUID;

/// 포트(COM·LPT) 장치 클래스 GUID
const PORTS_CLASS: &str = "{4d36e978-e325-11ce-bfc1-08002be10318}";
const PORTS_KEY: &str = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Ports";
const ARBITER_KEY: &str = r"SYSTEM\CurrentControlSet\Control\COM Name Arbiter";
const SERIALCOMM_KEY: &str = r"HARDWARE\DEVICEMAP\SERIALCOMM";
/// 전원 옵션 — USB 설정 하위 그룹과 «USB 선택적 절전 설정»(powercfg /q 의 GUID)
const GUID_USB_SUBGROUP: GUID = GUID::from_u128(0x2a737441_1930_4402_8d77_b2bebba308a3);
const GUID_USB_SELECTIVE_SUSPEND: GUID = GUID::from_u128(0x48e6b7a6_50f5_4782_a5d4_53bb8f07e226);
/// 이벤트를 훑는 최대 건수(로그가 아주 커도 오래 걸리지 않게)와 돌려줄 최대 건수
const EVENT_SCAN_MAX: usize = 50_000;
const EVENT_KEEP: usize = 200;

pub(super) fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub(super) fn from_wide(buf: &[u16]) -> String {
    let n = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..n])
}

/// 널로 나뉜 글 목록(MULTI_SZ) → Vec
pub(super) fn multi_sz(buf: &[u16]) -> Vec<String> {
    buf.split(|&c| c == 0).filter(|s| !s.is_empty()).map(String::from_utf16_lossy).collect()
}

pub(super) fn os_err(code: u32) -> String {
    std::io::Error::from_raw_os_error(code as i32).to_string()
}

// ---------------------------------------------------------------- CfgMgr32

/// 장치 인스턴스 ID 목록
fn device_ids(class: Option<&str>, present_only: bool) -> Vec<String> {
    let filter = class.map(wide);
    let fptr = filter.as_ref().map_or(std::ptr::null(), |f| f.as_ptr());
    let mut flags = if class.is_some() { CM_GETIDLIST_FILTER_CLASS } else { CM_GETIDLIST_FILTER_NONE };
    if present_only {
        flags |= CM_GETIDLIST_FILTER_PRESENT;
    }
    for _ in 0..4 {
        let mut len = 0u32;
        // SAFETY: len 은 쓰기 가능한 u32, fptr 은 널이거나 널로 끝나는 글
        if unsafe { CM_Get_Device_ID_List_SizeW(&mut len, fptr, flags) } != CR_SUCCESS || len == 0 {
            return Vec::new();
        }
        let mut buf = vec![0u16; len as usize];
        // SAFETY: buf 는 len 글자
        let r = unsafe { CM_Get_Device_ID_ListW(fptr, buf.as_mut_ptr(), len, flags) };
        if r == CR_SUCCESS {
            return multi_sz(&buf);
        }
        if r != CR_BUFFER_SMALL {
            return Vec::new();
        }
    }
    Vec::new()
}

/// 지금 연결된 USB 장치(허브 아님 포함) 인스턴스 ID — 시험용
#[cfg(test)]
pub(super) fn usb_device_ids() -> Vec<String> {
    device_ids(None, true).into_iter().filter(|id| id.to_ascii_uppercase().starts_with(r"USB\VID_")).collect()
}

/// 인스턴스 ID → devinst. `phantom` 이면 지금 없는 장치도
pub(super) fn locate(id: &str, phantom: bool) -> Option<u32> {
    let w = wide(id);
    let mut dn = 0u32;
    // SAFETY: w 는 널로 끝나는 글
    let r = unsafe { CM_Locate_DevNodeW(&mut dn, w.as_ptr(), if phantom { CM_LOCATE_DEVNODE_PHANTOM } else { CM_LOCATE_DEVNODE_NORMAL }) };
    (r == CR_SUCCESS).then_some(dn)
}

pub(super) fn prop_raw(dn: u32, key: &DEVPROPKEY) -> Option<(DEVPROPTYPE, Vec<u8>)> {
    let mut ty: DEVPROPTYPE = 0;
    let mut size = 0u32;
    // SAFETY: 크기만 묻는다(버퍼 널)
    let r = unsafe { CM_Get_DevNode_PropertyW(dn, key, &mut ty, std::ptr::null_mut(), &mut size, 0) };
    if r != CR_BUFFER_SMALL || size == 0 {
        return None;
    }
    let mut buf = vec![0u8; size as usize];
    // SAFETY: buf 는 size 바이트
    let r = unsafe { CM_Get_DevNode_PropertyW(dn, key, &mut ty, buf.as_mut_ptr(), &mut size, 0) };
    if r != CR_SUCCESS {
        return None;
    }
    buf.truncate(size as usize);
    Some((ty, buf))
}

pub(super) fn u16s(b: &[u8]) -> Vec<u16> {
    b.as_chunks::<2>().0.iter().map(|c| u16::from_le_bytes(*c)).collect()
}

pub(super) fn prop_string(dn: u32, key: &DEVPROPKEY) -> Option<String> {
    let (ty, b) = prop_raw(dn, key)?;
    if ty != DEVPROP_TYPE_STRING {
        return None;
    }
    let s = from_wide(&u16s(&b));
    (!s.trim().is_empty()).then(|| s.trim().to_string())
}

pub(super) fn prop_u32(dn: u32, key: &DEVPROPKEY) -> Option<u32> {
    let (ty, b) = prop_raw(dn, key)?;
    if ty != DEVPROP_TYPE_UINT32 || b.len() < 4 {
        return None;
    }
    Some(u32::from_le_bytes(b[..4].try_into().ok()?))
}

fn prop_strings(dn: u32, key: &DEVPROPKEY) -> Vec<String> {
    match prop_raw(dn, key) {
        Some((ty, b)) if ty == DEVPROP_TYPE_STRING_LIST => multi_sz(&u16s(&b)),
        _ => Vec::new(),
    }
}

fn prop_time(dn: u32, key: &DEVPROPKEY) -> Option<u64> {
    let (ty, b) = prop_raw(dn, key)?;
    if ty != DEVPROP_TYPE_FILETIME || b.len() < 8 {
        return None;
    }
    filetime_ms(u64::from_le_bytes(b[..8].try_into().ok()?))
}

/// (상태 비트, 문제 코드) — 지금 연결된 장치만
fn node_status(dn: u32) -> Option<(u32, u32)> {
    let (mut st, mut prob) = (0u32, 0u32);
    // SAFETY: 쓰기 가능한 u32 둘
    (unsafe { CM_Get_DevNode_Status(&mut st, &mut prob, dn, 0) } == CR_SUCCESS).then_some((st, prob))
}

pub(super) fn parent(dn: u32) -> Option<u32> {
    let mut p = 0u32;
    // SAFETY: 쓰기 가능한 u32
    (unsafe { CM_Get_Parent(&mut p, dn, 0) } == CR_SUCCESS).then_some(p)
}

/// devinst → 인스턴스 ID(DEVPKEY_Device_InstanceId)
pub(super) fn instance_id(dn: u32) -> Option<String> {
    prop_string(dn, &windows_sys::Win32::Devices::Properties::DEVPKEY_Device_InstanceId)
}

pub(super) fn display_name(dn: u32, id: &str) -> String {
    prop_string(dn, &DEVPKEY_Device_FriendlyName).or_else(|| prop_string(dn, &DEVPKEY_Device_DeviceDesc)).unwrap_or_else(|| id.to_string())
}

// ---------------------------------------------------------------- 레지스트리

pub(super) struct Key(HKEY);

impl Drop for Key {
    fn drop(&mut self) {
        // SAFETY: 우리가 연 키
        unsafe { RegCloseKey(self.0) };
    }
}

fn open_key(path: &str) -> Result<Key, u32> {
    open_key_in(HKEY_LOCAL_MACHINE, path)
}

/// HKLM·HKCU 아래 키를 읽기 권한으로 연다
pub(super) fn open_key_in(root: HKEY, path: &str) -> Result<Key, u32> {
    let w = wide(path);
    let mut h: HKEY = std::ptr::null_mut();
    // SAFETY: 읽기 권한으로만 연다
    let r = unsafe { RegOpenKeyExW(root, w.as_ptr(), 0, KEY_READ, &mut h) };
    if r == ERROR_SUCCESS { Ok(Key(h)) } else { Err(r) }
}

/// 장치의 하드웨어 키(Device Parameters)
fn open_device_key(dn: u32) -> Result<Key, String> {
    open_devnode_key(dn, CM_REGISTRY_HARDWARE)
}

/// 장치의 하드웨어 키(CM_REGISTRY_HARDWARE) 또는 드라이버 키(CM_REGISTRY_SOFTWARE — Control\Class\{클래스}\000N)
fn open_devnode_key(dn: u32, which: u32) -> Result<Key, String> {
    let mut h: HKEY = std::ptr::null_mut();
    // SAFETY: 읽기 권한으로 이미 있는 키만 연다
    let r = unsafe { CM_Open_DevNode_Key(dn, KEY_READ, 0, RegDisposition_OpenExisting, &mut h, which) };
    if r == CR_SUCCESS { Ok(Key(h)) } else { Err(format!("CONFIGRET {r}")) }
}

/// 키의 값 하나(종류, 바이트). 없으면 Ok(None)
pub(super) fn query_value(k: &Key, name: &str) -> Result<Option<(u32, Vec<u8>)>, u32> {
    let w = wide(name);
    let mut ty = 0u32;
    let mut size = 0u32;
    // SAFETY: 크기만 묻는다
    let r = unsafe { RegQueryValueExW(k.0, w.as_ptr(), std::ptr::null(), &mut ty, std::ptr::null_mut(), &mut size) };
    if r == ERROR_FILE_NOT_FOUND {
        return Ok(None);
    }
    if r != ERROR_SUCCESS {
        return Err(r);
    }
    let mut buf = vec![0u8; size as usize + 2];
    let mut n = buf.len() as u32;
    // SAFETY: buf 는 n 바이트
    let r = unsafe { RegQueryValueExW(k.0, w.as_ptr(), std::ptr::null(), &mut ty, buf.as_mut_ptr(), &mut n) };
    if r != ERROR_SUCCESS {
        return Err(r);
    }
    buf.truncate(n as usize);
    Ok(Some((ty, buf)))
}

/// 키의 모든 값(이름, 종류, 바이트)
fn all_values(k: &Key) -> Vec<(String, u32, Vec<u8>)> {
    let mut out = Vec::new();
    let mut i = 0u32;
    loop {
        let mut name = vec![0u16; 16_384];
        let mut nlen = name.len() as u32;
        let mut ty = 0u32;
        let mut data = vec![0u8; 4096];
        let mut dlen = data.len() as u32;
        // SAFETY: 버퍼 크기를 함께 넘긴다
        let mut r = unsafe { RegEnumValueW(k.0, i, name.as_mut_ptr(), &mut nlen, std::ptr::null(), &mut ty, data.as_mut_ptr(), &mut dlen) };
        if r == ERROR_MORE_DATA {
            data = vec![0u8; dlen as usize + 2];
            nlen = name.len() as u32;
            dlen = data.len() as u32;
            // SAFETY: 위와 같음(더 큰 버퍼)
            r = unsafe { RegEnumValueW(k.0, i, name.as_mut_ptr(), &mut nlen, std::ptr::null(), &mut ty, data.as_mut_ptr(), &mut dlen) };
        }
        if r == ERROR_NO_MORE_ITEMS || r != ERROR_SUCCESS {
            break;
        }
        data.truncate(dlen as usize);
        out.push((String::from_utf16_lossy(&name[..nlen as usize]), ty, data));
        i += 1;
        if i > 4096 {
            break;
        }
    }
    out
}

/// 레지스트리 값 → 보이는 값
fn reg_value(name: String, ty: u32, data: &[u8]) -> RegValue {
    let (value, kind, num) = match ty {
        REG_DWORD if data.len() >= 4 => {
            let v = u32::from_le_bytes(data[..4].try_into().unwrap_or_default());
            (v.to_string(), "dword", Some(v as u64))
        }
        REG_QWORD if data.len() >= 8 => {
            let v = u64::from_le_bytes(data[..8].try_into().unwrap_or_default());
            (v.to_string(), "qword", Some(v))
        }
        REG_SZ | REG_EXPAND_SZ => (from_wide(&u16s(data)), "string", None),
        REG_MULTI_SZ => (multi_sz(&u16s(data)).join(" · "), "multi", None),
        REG_BINARY => (data.iter().take(64).map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(" ") + if data.len() > 64 { " …" } else { "" }, "binary", None),
        _ => (format!("({} bytes)", data.len()), "other", None),
    };
    let note = parse::param_note(&name, num.map(|n| n as u32));
    RegValue { name, value, kind, num, note }
}

/// 장치 하드웨어 키의 PortName
fn port_name(dn: u32) -> Option<String> {
    let k = open_device_key(dn).ok()?;
    match query_value(&k, "PortName") {
        Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => Some(from_wide(&u16s(&b)).trim().to_string()).filter(|s| !s.is_empty()),
        _ => None,
    }
}

/// SERIALCOMM — (장치 경로 이름, COM 이름)
fn serialcomm() -> Result<Vec<(String, String)>, u32> {
    let k = match open_key(SERIALCOMM_KEY) {
        Ok(k) => k,
        // 열린 시리얼 장치가 하나도 없으면 키가 없다
        Err(ERROR_FILE_NOT_FOUND) => return Ok(Vec::new()),
        Err(e) => return Err(e),
    };
    Ok(all_values(&k).into_iter().filter(|(_, ty, _)| *ty == REG_SZ).map(|(n, _, d)| (n, from_wide(&u16s(&d)))).collect())
}

/// SERIALCOMM 의 COM 이름만(포트 목록 보강 — ports::list). 못 읽으면 빈 목록
pub(crate) fn serialcomm_names() -> Vec<String> {
    serialcomm().map(|v| v.into_iter().map(|(_, c)| c.trim().to_string()).collect()).unwrap_or_default()
}

// ---------------------------------------------------------------- 목록

fn vid_pid_of(dn: u32, id: &str) -> Option<(u16, u16)> {
    if let Some(v) = tables::vid_pid(id) {
        return Some(v);
    }
    // FTDI 의 일부·가상 COM 은 자기 ID 에 없다 — 바로 위 장치에서
    let p = parent(dn)?;
    tables::vid_pid(&instance_id(p)?)
}

fn entry(id: &str) -> Option<(u32, PortEntry)> {
    let dn = locate(id, true)?;
    let present = locate(id, false).is_some();
    let (vid, pid) = vid_pid_of(dn, id).map_or((None, None), |(v, p)| (Some(v), Some(p)));
    let problem = if present { node_status(dn).filter(|(st, _)| st & DN_HAS_PROBLEM != 0).map(|(_, p)| p) } else { None };
    Some((
        dn,
        PortEntry {
            port: port_name(dn),
            name: display_name(dn, id),
            instance_id: id.to_string(),
            present,
            vid,
            pid,
            problem,
            class: prop_string(dn, &DEVPKEY_Device_Class).unwrap_or_default(),
        },
    ))
}

pub fn list(hidden: bool) -> Vec<PortEntry> {
    let mut out: Vec<PortEntry> = device_ids(Some(PORTS_CLASS), !hidden)
        .iter()
        .filter_map(|id| entry(id).map(|(_, e)| e))
        // LPT(프린터 포트)는 뺀다 — COM 이름이 없고 이름에 LPT 가 든 것
        .filter(|e| e.port.as_deref().is_some_and(|p| com_number(p).is_some()) || !e.name.to_ascii_uppercase().contains("LPT"))
        .collect();
    // Ports 클래스가 아닌 COM(모뎀·가상 COM 드라이버 등) — 지금 열 수 있는 이름만 장치 정보 없이
    if let Ok(sc) = serialcomm() {
        for (dev, com) in sc {
            if !out.iter().any(|e| e.port.as_deref().is_some_and(|p| p.eq_ignore_ascii_case(&com))) {
                out.push(PortEntry { port: Some(com), name: dev, instance_id: String::new(), present: true, vid: None, pid: None, problem: None, class: String::new() });
            }
        }
    }
    out
}

// ---------------------------------------------------------------- 포트 하나

fn ancestors(dn: u32) -> Vec<Ancestor> {
    let mut out = Vec::new();
    let mut cur = dn;
    while let Some(p) = parent(cur) {
        let Some(id) = instance_id(p) else { break };
        if id.to_ascii_uppercase().starts_with(r"HTREE\ROOT") {
            break;
        }
        out.push(Ancestor { name: display_name(p, &id), service: prop_string(p, &DEVPKEY_Device_Service), instance_id: id });
        cur = p;
        if out.len() >= 8 {
            break;
        }
    }
    out
}

fn status_of(dn: u32, present: bool) -> Status {
    if !present {
        return Status { present, started: false, problem: None, disabled: false };
    }
    match node_status(dn) {
        Some((st, prob)) => {
            let problem: Option<Problem> = (st & DN_HAS_PROBLEM != 0).then(|| tables::problem(prob));
            Status { present, started: st & DN_STARTED != 0, disabled: problem.as_ref().is_some_and(|p| p.code == 22), problem }
        }
        None => Status { present, started: false, problem: None, disabled: false },
    }
}

/// 전원 옵션 «USB 선택적 절전»(AC, DC)
fn usb_suspend() -> (Option<bool>, Option<bool>, Option<String>) {
    let mut scheme: *mut GUID = std::ptr::null_mut();
    // SAFETY: 받은 GUID 는 LocalFree 로 돌려준다
    let r = unsafe { PowerGetActiveScheme(std::ptr::null_mut(), &mut scheme) };
    if r != ERROR_SUCCESS || scheme.is_null() {
        return (None, None, Some(format!("{}: {}", tr!("전원 옵션", "Power options"), os_err(r))));
    }
    let (mut ac, mut dc) = (0u32, 0u32);
    // SAFETY: scheme 은 위에서 받은 GUID
    let ra = unsafe { PowerReadACValueIndex(std::ptr::null_mut(), scheme, &GUID_USB_SUBGROUP, &GUID_USB_SELECTIVE_SUSPEND, &mut ac) };
    let rd = unsafe { PowerReadDCValueIndex(std::ptr::null_mut(), scheme, &GUID_USB_SUBGROUP, &GUID_USB_SELECTIVE_SUSPEND, &mut dc) };
    unsafe { LocalFree(scheme as HLOCAL) };
    let err = (ra != ERROR_SUCCESS).then(|| format!("{}: {}", tr!("USB 선택적 절전", "USB selective suspend"), os_err(ra)));
    ((ra == ERROR_SUCCESS).then_some(ac != 0), (rd == ERROR_SUCCESS).then_some(dc != 0), err)
}

/// COM 이름 → 그 이름을 쥔 장치(지금 있는 것 먼저)
fn find_by_com(com: &str) -> Option<PortEntry> {
    list(true).into_iter().find(|e| e.port.as_deref().is_some_and(|p| p.eq_ignore_ascii_case(com)))
}

pub fn report(id: &str) -> Result<PortReport, String> {
    let id = id.trim();
    let read_at = crate::event::now_ms();
    // COM 이름으로 물으면 장치를 찾는다
    let inst = if !id.contains('\\') && com_number(id).is_some() {
        let e = find_by_com(id).ok_or_else(|| tr!(format!("{id} 장치를 찾을 수 없습니다"), format!("Cannot find a device for {id}")))?;
        if e.instance_id.is_empty() {
            // Ports 클래스 밖의 COM — 장치 정보 없이
            return Ok(PortReport {
                entry: e,
                read_at,
                description: None,
                bus_description: None,
                manufacturer: None,
                location: None,
                hardware_ids: Vec::new(),
                chip: None,
                driver: Driver::default(),
                status: Status { present: true, started: true, problem: None, disabled: false },
                last_arrival: None,
                last_removal: None,
                first_install: None,
                ancestors: Vec::new(),
                params: Vec::new(),
                port_default: None,
                port_default_note: None,
                power: Power::default(),
                usb_path: None,
                errors: vec![tr!("장치 정보: 포트 장치 목록에 없는 COM 입니다(모뎀·가상 COM 드라이버 등)", "Device info: this COM is not in the port device list (modem, virtual COM driver …)").into()],
            });
        }
        e.instance_id
    } else {
        id.to_string()
    };
    let (dn, entry) = entry(&inst).ok_or_else(|| tr!(format!("장치를 찾을 수 없습니다: {inst}"), format!("Device not found: {inst}")))?;
    let mut errors = Vec::new();
    let ancestors = ancestors(dn);
    let chip = entry.vid.zip(entry.pid).and_then(|(v, p)| tables::chip(v, p));
    let driver = Driver {
        provider: prop_string(dn, &DEVPKEY_Device_DriverProvider),
        version: prop_string(dn, &DEVPKEY_Device_DriverVersion),
        date: prop_time(dn, &DEVPKEY_Device_DriverDate),
        inf: prop_string(dn, &DEVPKEY_Device_DriverInfPath),
        service: prop_string(dn, &DEVPKEY_Device_Service),
    };
    let params = match open_device_key(dn) {
        Ok(k) => {
            let mut v: Vec<RegValue> = all_values(&k).into_iter().map(|(n, t, d)| reg_value(n, t, &d)).collect();
            v.sort_by_key(|r| r.name.to_lowercase());
            v
        }
        Err(e) => {
            errors.push(format!("Device Parameters: {e}"));
            Vec::new()
        }
    };
    let port_default = match (&entry.port, open_key(PORTS_KEY)) {
        (Some(p), Ok(k)) => match query_value(&k, &format!("{p}:")) {
            Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => Some(from_wide(&u16s(&b))),
            Ok(_) => None,
            Err(e) => {
                errors.push(format!("{PORTS_KEY}: {}", os_err(e)));
                None
            }
        },
        (Some(_), Err(e)) => {
            errors.push(format!("{PORTS_KEY}: {}", os_err(e)));
            None
        }
        _ => None,
    };
    let (ac, dc, perr) = usb_suspend();
    errors.extend(perr);
    let mut power = Power { usb_suspend_ac: ac, usb_suspend_dc: dc, devices: Vec::new() };
    match super::wmi::device_power() {
        Ok(map) => {
            let chain = std::iter::once((inst.clone(), entry.name.clone(), true)).chain(ancestors.iter().filter(|a| a.instance_id.to_ascii_uppercase().starts_with("USB\\")).map(|a| (a.instance_id.clone(), a.name.clone(), false)));
            for (iid, name, own) in chain {
                if let Some(on) = map.get(&iid.to_ascii_uppercase()) {
                    power.devices.push(PowerDevice { instance_id: iid, name, can_turn_off: *on, own });
                }
            }
        }
        Err(e) => errors.push(format!("WMI MSPower_DeviceEnable: {e}")),
    }
    let usb_path = if entry.present { super::usb::path(dn) } else { None };
    Ok(PortReport {
        usb_path,
        status: status_of(dn, entry.present),
        description: prop_string(dn, &DEVPKEY_Device_DeviceDesc),
        bus_description: prop_string(dn, &DEVPKEY_Device_BusReportedDeviceDesc),
        manufacturer: prop_string(dn, &DEVPKEY_Device_Manufacturer),
        location: prop_string(dn, &DEVPKEY_Device_LocationInfo),
        hardware_ids: prop_strings(dn, &DEVPKEY_Device_HardwareIds),
        last_arrival: prop_time(dn, &DEVPKEY_Device_LastArrivalDate),
        last_removal: prop_time(dn, &DEVPKEY_Device_LastRemovalDate),
        first_install: prop_time(dn, &DEVPKEY_Device_FirstInstallDate),
        port_default_note: port_default.as_deref().and_then(parse::port_default_note),
        port_default,
        entry,
        read_at,
        chip,
        driver,
        ancestors,
        params,
        power,
        errors,
    })
}

// ---------------------------------------------------------------- COM 번호

pub fn com_numbers() -> ComNumbers {
    let mut c = ComNumbers::default();
    match open_key(ARBITER_KEY) {
        Ok(k) => match query_value(&k, "ComDB") {
            Ok(Some((REG_BINARY, b))) => {
                c.comdb_found = true;
                c.reserved = parse::comdb_numbers(&b);
            }
            Ok(_) => {}
            Err(e) => c.errors.push(format!("ComDB: {}", os_err(e))),
        },
        Err(ERROR_FILE_NOT_FOUND) => {}
        Err(e) => c.errors.push(format!("{ARBITER_KEY}: {}", os_err(e))),
    }
    let all = list(true);
    let mut owners: HashMap<u16, Vec<String>> = HashMap::new();
    for e in &all {
        let Some(n) = e.port.as_deref().and_then(com_number) else { continue };
        owners.entry(n).or_default().push(e.name.clone());
        if e.present {
            c.present.push(n);
        } else {
            c.hidden.push((n, e.name.clone()));
        }
    }
    c.present.sort_unstable();
    c.present.dedup();
    c.hidden.sort();
    c.orphan = c.reserved.iter().copied().filter(|n| !owners.contains_key(n)).collect();
    let mut shared: Vec<(u16, Vec<String>)> = owners.into_iter().filter(|(_, v)| v.len() > 1).collect();
    shared.sort();
    c.shared = shared;
    match serialcomm() {
        Ok(v) => c.serialcomm = v.into_iter().map(|(_, com)| com).collect(),
        Err(e) => c.errors.push(format!("SERIALCOMM: {}", os_err(e))),
    }
    c.serialcomm.sort_by_key(|n| com_number(n).unwrap_or(u16::MAX));
    c
}

// ---------------------------------------------------------------- 이벤트

pub(super) struct Evt(pub(super) EVT_HANDLE);

impl Drop for Evt {
    fn drop(&mut self) {
        if self.0 != 0 {
            // SAFETY: 우리가 받은 핸들
            unsafe { EvtClose(self.0) };
        }
    }
}

pub(super) fn render_xml(ev: EVT_HANDLE) -> Option<String> {
    let mut used = 0u32;
    let mut count = 0u32;
    // SAFETY: 크기만 묻는다
    unsafe { EvtRender(0, ev, EvtRenderEventXml, 0, std::ptr::null_mut(), &mut used, &mut count) };
    if used == 0 {
        return None;
    }
    let mut buf = vec![0u16; (used as usize).div_ceil(2) + 1];
    // SAFETY: buf 는 used 바이트 이상
    let ok = unsafe { EvtRender(0, ev, EvtRenderEventXml, (buf.len() * 2) as u32, buf.as_mut_ptr() as *mut _, &mut used, &mut count) } != 0;
    ok.then(|| from_wide(&buf))
}

fn format_message(meta: EVT_HANDLE, ev: EVT_HANDLE) -> Option<String> {
    if meta == 0 {
        return None;
    }
    let mut used = 0u32;
    // SAFETY: 크기만 묻는다
    let ok = unsafe { EvtFormatMessage(meta, ev, 0, 0, std::ptr::null(), EvtFormatMessageEvent, 0, std::ptr::null_mut(), &mut used) } != 0;
    if ok || used == 0 || std::io::Error::last_os_error().raw_os_error() != Some(ERROR_INSUFFICIENT_BUFFER as i32) {
        return None;
    }
    let mut buf = vec![0u16; used as usize + 1];
    // SAFETY: buf 는 used 글자 이상
    let ok = unsafe { EvtFormatMessage(meta, ev, 0, 0, std::ptr::null(), EvtFormatMessageEvent, buf.len() as u32, buf.as_mut_ptr(), &mut used) } != 0;
    ok.then(|| from_wide(&buf).trim().to_string()).filter(|s| !s.is_empty())
}

/// 로그 하나를 새것부터 훑어 이 장치들의 이벤트를 모은다
fn scan_log(path: &str, query: &str, ids: &[String], metas: &mut HashMap<String, Evt>, out: &mut Vec<PnpEvent>) -> Result<(), String> {
    let (wp, wq) = (wide(path), wide(query));
    // SAFETY: 널로 끝나는 글, 세션 0 = 이 PC
    let h = Evt(unsafe { EvtQuery(0, wp.as_ptr(), wq.as_ptr(), EvtQueryChannelPath | EvtQueryReverseDirection) });
    if h.0 == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let mut scanned = 0usize;
    let mut batch = [0isize; 64];
    loop {
        let mut got = 0u32;
        // SAFETY: batch 는 64칸, 받은 핸들은 아래에서 닫는다
        if unsafe { EvtNext(h.0, batch.len() as u32, batch.as_mut_ptr(), 2_000, 0, &mut got) } == 0 {
            let e = std::io::Error::last_os_error();
            // ERROR_NO_MORE_ITEMS = 끝
            if e.raw_os_error() == Some(ERROR_NO_MORE_ITEMS as i32) {
                return Ok(());
            }
            return if scanned == 0 { Err(e.to_string()) } else { Ok(()) };
        }
        for &raw in &batch[..got as usize] {
            let ev = Evt(raw);
            scanned += 1;
            let Some(xml) = render_xml(ev.0) else { continue };
            let Some(re) = parse::parse_event_xml(&xml) else { continue };
            if !parse::event_matches(&re, ids) || out.len() >= EVENT_KEEP {
                continue;
            }
            let device = re.data.iter().map(|(_, v)| v.trim()).find(|v| ids.iter().any(|i| v.eq_ignore_ascii_case(i))).unwrap_or_default().to_string();
            let meta = metas.entry(re.provider.clone()).or_insert_with(|| {
                let w = wide(&re.provider);
                // SAFETY: 널로 끝나는 글
                Evt(unsafe { EvtOpenPublisherMetadata(0, w.as_ptr(), std::ptr::null(), 0, 0) })
            });
            out.push(PnpEvent {
                time: parse::iso_ms(&re.time).unwrap_or(0),
                id: re.id,
                kind: parse::event_kind(&re.provider, re.id),
                level: re.level,
                message: format_message(meta.0, ev.0),
                provider: re.provider,
                device,
            });
        }
        if scanned >= EVENT_SCAN_MAX || out.len() >= EVENT_KEEP {
            return Ok(());
        }
    }
}

pub fn events(inst: &str, days: u32) -> EventList {
    let mut list = EventList { days, ..Default::default() };
    let mut ids = vec![inst.trim().to_string()];
    if let Some(dn) = locate(inst.trim(), true) {
        ids.extend(ancestors(dn).into_iter().filter(is_usb_device).map(|a| a.instance_id));
    }
    let ms = u64::from(days) * 86_400_000;
    let mut metas = HashMap::new();
    let logs = [
        ("Microsoft-Windows-Kernel-PnP/Configuration", format!("*[System[TimeCreated[timediff(@SystemTime) <= {ms}]]]")),
        ("System", format!("*[System[Provider[@Name='Microsoft-Windows-Kernel-PnP' or @Name='Microsoft-Windows-UserPnp'] and TimeCreated[timediff(@SystemTime) <= {ms}]]]")),
    ];
    for (path, q) in &logs {
        if let Err(e) = scan_log(path, q, &ids, &mut metas, &mut list.events) {
            list.errors.push(format!("{path}: {e}"));
        }
    }
    list.events.sort_by_key(|e| std::cmp::Reverse(e.time));
    list.events.truncate(EVENT_KEEP);
    list
}

// ---------------------------------------------------------------- 이더넷

/// 랜카드 드라이버 키의 PnPCapabilities(값이 없으면 None — 기본 동작)
fn pnp_capabilities(pnp_id: &str) -> Result<Option<u32>, String> {
    let dn = locate(pnp_id, false).ok_or_else(|| "device not found".to_string())?;
    let k = open_devnode_key(dn, CM_REGISTRY_SOFTWARE)?;
    match query_value(&k, "PnPCapabilities") {
        Ok(Some((REG_DWORD, b))) if b.len() >= 4 => Ok(Some(u32::from_le_bytes(b[..4].try_into().unwrap_or_default()))),
        Ok(_) => Ok(None),
        Err(e) => Err(os_err(e)),
    }
}

/// GetIfEntry2 — 받은·보낸 패킷과 오류·버린 수
fn if_stats(if_index: u32) -> Result<NicStats, String> {
    // SAFETY: MIB_IF_ROW2 는 C 구조체 — 0 으로 채우고 번호만 넣어 묻는다
    let mut row: MIB_IF_ROW2 = unsafe { std::mem::zeroed() };
    row.InterfaceIndex = if_index;
    let r = unsafe { GetIfEntry2(&mut row) };
    if r != ERROR_SUCCESS {
        return Err(os_err(r));
    }
    Ok(NicStats {
        in_packets: row.InUcastPkts.saturating_add(row.InNUcastPkts),
        out_packets: row.OutUcastPkts.saturating_add(row.OutNUcastPkts),
        in_errors: row.InErrors,
        in_discards: row.InDiscards,
        out_errors: row.OutErrors,
        out_discards: row.OutDiscards,
    })
}

fn joined<T>(r: std::thread::Result<Result<T, String>>) -> Result<T, String> {
    r.unwrap_or_else(|_| Err("thread panicked".to_string()))
}

pub fn nics() -> NicList {
    let mut out = NicList::default();
    let ifs = crate::net::interfaces();
    // WMI 질의는 서로 기다리지 않게 함께 돌린다(하나가 멈춰도 10초 뒤 나머지는 보인다)
    let (adapters, adv, profiles, power, firewall) = std::thread::scope(|sc| {
        let a = sc.spawn(super::wmi::net_adapters);
        let b = sc.spawn(super::wmi::advanced_props);
        let c = sc.spawn(super::wmi::connection_profiles);
        let d = sc.spawn(super::wmi::device_power);
        let e = sc.spawn(super::wmi::firewall);
        (joined(a.join()), joined(b.join()), joined(c.join()), joined(d.join()), joined(e.join()))
    });
    let mut adv: Vec<(String, NicProp)> = adv.unwrap_or_else(|e| {
        out.errors.push(format!("WMI MSFT_NetAdapterAdvancedPropertySettingData: {e}"));
        Vec::new()
    });
    adv.sort_by_key(|x| x.1.keyword.to_lowercase());
    let profiles = profiles.unwrap_or_else(|e| {
        out.errors.push(format!("WMI MSFT_NetConnectionProfile: {e}"));
        HashMap::new()
    });
    let power = power.unwrap_or_else(|e| {
        out.errors.push(format!("WMI MSPower_DeviceEnable: {e}"));
        HashMap::new()
    });
    match firewall {
        Ok(f) => out.firewall = f,
        Err(e) => out.errors.push(format!("{}: {e}", tr!("방화벽 프로필", "Firewall profiles"))),
    }
    match adapters {
        Ok(ads) => {
            for a in ads {
                let mine: Vec<&crate::net::Interface> = ifs.iter().filter(|i| i.name == a.name).collect();
                let caps = match a.pnp_id.as_deref().map(pnp_capabilities) {
                    Some(Ok(v)) => v,
                    Some(Err(e)) => {
                        out.errors.push(format!("{} PnPCapabilities: {e}", a.name));
                        None
                    }
                    None => None,
                };
                let stats = match a.if_index.map(if_stats) {
                    Some(Ok(s)) => Some(s),
                    Some(Err(e)) => {
                        out.errors.push(format!("{} GetIfEntry2: {e}", a.name));
                        None
                    }
                    None => None,
                };
                let (profile, network) = a.if_index.and_then(|i| profiles.get(&i).cloned()).unwrap_or((None, None));
                out.nics.push(NicSummary {
                    ipv4: mine.iter().map(|i| format!("{}/{}", i.ipv4, i.prefix)).collect(),
                    gateway: mine.iter().find_map(|i| i.gateway.clone()),
                    up: a.up,
                    speed: a.speed.filter(|s| *s > 0 && a.up),
                    full_duplex: a.full_duplex.filter(|_| a.up),
                    can_turn_off: a.pnp_id.as_deref().and_then(|id| power.get(&id.to_ascii_uppercase()).copied()),
                    advanced: adv.iter().filter(|(n, _)| *n == a.name).map(|(_, p)| p.clone()).collect(),
                    pnp_capabilities: caps,
                    stats,
                    profile,
                    network,
                    pnp_id: a.pnp_id,
                    name: a.name,
                    description: a.description,
                });
            }
        }
        Err(e) => {
            out.errors.push(format!("WMI MSFT_NetAdapter: {e}"));
            // WMI 를 못 읽으면 IP 만이라도
            for i in ifs.iter().filter(|i| !i.loopback) {
                if let Some(n) = out.nics.iter_mut().find(|n| n.name == i.name) {
                    n.ipv4.push(format!("{}/{}", i.ipv4, i.prefix));
                    continue;
                }
                out.nics.push(NicSummary {
                    name: i.name.clone(),
                    description: i.description.clone(),
                    up: i.up,
                    speed: None,
                    full_duplex: None,
                    ipv4: vec![format!("{}/{}", i.ipv4, i.prefix)],
                    gateway: i.gateway.clone(),
                    pnp_id: None,
                    advanced: Vec::new(),
                    can_turn_off: None,
                    pnp_capabilities: None,
                    stats: None,
                    profile: None,
                    network: None,
                });
            }
        }
    }
    out.nics.sort_by_key(|n| (!n.up, n.name.to_lowercase()));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 관리자 없이 이 PC 의 장치 속성·레지스트리·전원 옵션·이벤트 로그를 실제로 읽는다(COM 장치가 없어도 되는 것만 단정)
    #[test]
    fn reads_without_admin() {
        // 장치는 하나 이상 있다(USB 컨트롤러·디스크 등) — 속성이 읽혀야 한다
        let all = device_ids(None, true);
        assert!(!all.is_empty(), "장치 목록을 읽지 못함");
        let mut with_driver = 0;
        for id in all.iter().take(40) {
            let dn = locate(id, false).expect("목록에 있는 장치는 찾아져야 한다");
            if prop_string(dn, &DEVPKEY_Device_DriverVersion).is_some() {
                with_driver += 1;
            }
            let _ = node_status(dn).expect("상태를 읽지 못함");
        }
        assert!(with_driver > 0, "드라이버 버전을 하나도 읽지 못함");
        // 포트 기본값 키(대부분 PC 에 있음) — 열기 실패는 «없음» 만 허용
        match open_key(PORTS_KEY) {
            Ok(k) => drop(all_values(&k)),
            Err(e) => assert_eq!(e, ERROR_FILE_NOT_FOUND),
        }
        // 전원 옵션 — USB 선택적 절전 항목이 없는 PC 도 있으니 오류만 아니면
        let (ac, _dc, err) = usb_suspend();
        assert!(ac.is_some() || err.is_some());
        // 이벤트 로그 — 아무 장치나 이벤트를 하나라도 읽을 수 있는지(없는 장치는 빈 목록)
        let e = events(r"USB\VID_FFFF&PID_FFFF\NOPE", 1);
        assert!(e.events.is_empty());
        assert!(e.errors.iter().all(|x| !x.contains("Kernel-PnP/Configuration")), "{:?}", e.errors);
    }

    /// 랜카드 점검 값 — 관리자 없이 드라이버 키·통계가 읽힌다(랜카드가 하나라도 있는 PC)
    #[test]
    fn nic_check_without_admin() {
        let n = nics();
        assert!(n.errors.iter().all(|e| !e.contains("MSFT_NetAdapter:")), "{:?}", n.errors);
        assert!(n.errors.iter().all(|e| !e.contains("PnPCapabilities") && !e.contains("GetIfEntry2")), "{:?}", n.errors);
        for x in &n.nics {
            assert!(x.stats.is_some(), "{} 통계를 읽지 못함", x.name);
            for p in &x.advanced {
                assert!(!p.keyword.is_empty() && !p.name.is_empty());
            }
        }
        assert_eq!(n.firewall.len(), 3, "{:?}", n.errors);
    }
}
