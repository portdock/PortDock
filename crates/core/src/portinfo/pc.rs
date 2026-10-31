//! 이 PC 점검(장비 PC 설정) — 레지스트리·전원 계획·System 이벤트 로그를 읽기만 한다(KEY_READ · PowerRead* · EvtQuery).
//! 바꾸는 호출은 없다. 외부 프로그램(powercfg·w32tm)도 띄우지 않는다.
//! 관리자만 읽을 수 있는 것(`powercfg /requests`·Defender 예외·SATA 디스크 SMART 패스스루)은 읽지 않는다.
//! (0.10.0) 블루스크린·갑자기 꺼짐(System 1001·41·6008 한 건씩) · 작은 메모리 덤프 폴더 목록(이름·시각·크기만 — 내용은 열지 않는다) ·
//! 저장장치 수명(disk.rs) · 깨어난 기록(Power-Troubleshooter 1 — powercfg 를 띄우지 않는다) · 배터리(GetSystemPowerStatus → root\WMI)

use super::parse::{self, file_name};
use super::win::{Evt, Key, from_wide, open_key_in, os_err, query_value, render_xml, u16s, wide};
use super::pchealth::{PC_CRASH_KEEP, PC_WAKE_KEEP, crash_from_event, crash_query, wake_from_event, wake_query};
use super::win::scan_events_with;
use super::{PcBattery, PcCheck, PcCrash, PcDump, PcEventCount, PcPowerValue, PcScreenSaver, PcTime, PcUpdate, PcWake};
use crate::tr;
use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_NO_MORE_ITEMS, ERROR_SUCCESS, HLOCAL, LocalFree};
use windows_sys::Win32::System::EventLog::{EvtNext, EvtQuery, EvtQueryChannelPath, EvtQueryReverseDirection};
use windows_sys::Win32::System::Power::{GetSystemPowerStatus, PowerGetActiveScheme, PowerReadACValueIndex, PowerReadDCValueIndex, PowerReadFriendlyName, SYSTEM_POWER_STATUS};
use windows_sys::Win32::System::Registry::{HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, REG_DWORD, REG_EXPAND_SZ, REG_SZ};
use windows_sys::core::GUID;

const SESSION_POWER: &str = r"SYSTEM\CurrentControlSet\Control\Session Manager\Power";
const CONTROL_POWER: &str = r"SYSTEM\CurrentControlSet\Control\Power";
const WU_POLICY: &str = r"SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate";
const WU_AU_POLICY: &str = r"SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU";
const WU_UX: &str = r"SOFTWARE\Microsoft\WindowsUpdate\UX\Settings";
const WU_REBOOT: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired";
const CBS_REBOOT: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending";
const SESSION_MANAGER: &str = r"SYSTEM\CurrentControlSet\Control\Session Manager";
const DESKTOP: &str = r"Control Panel\Desktop";
const W32TIME: &str = r"SYSTEM\CurrentControlSet\Services\W32Time";
const W32TIME_PARAMS: &str = r"SYSTEM\CurrentControlSet\Services\W32Time\Parameters";
const W32TIME_POLICY: &str = r"SOFTWARE\Policies\Microsoft\W32Time\Parameters";

/// 전원 계획 설정(powercfg /q 의 GUID — 하위 그룹, 설정)
const POWER_SETTINGS: [(&str, GUID, GUID); 5] = [
    // 절전 → 다음 시간 후 절전 모드로 전환(STANDBYIDLE)
    ("sleep", GUID::from_u128(0x238c9fa8_0aad_41ed_83f4_97be242c8f20), GUID::from_u128(0x29f6c1db_86da_48c5_9fdb_f2b67b1f44da)),
    // 절전 → 다음 시간 이후에 최대 절전 모드로 전환(HIBERNATEIDLE)
    ("hibernate", GUID::from_u128(0x238c9fa8_0aad_41ed_83f4_97be242c8f20), GUID::from_u128(0x9d7815a6_7ee4_497e_8888_515a05f02364)),
    // 디스플레이 → 다음 시간 이후에 끄기(VIDEOIDLE)
    ("display", GUID::from_u128(0x7516b95f_f776_4464_8c53_06167f40cc99), GUID::from_u128(0x3c0bc021_c8a8_4e07_a973_6b14cbcb2b7e)),
    // PCI Express → 링크 상태 전원 관리(ASPM)
    ("aspm", GUID::from_u128(0x501a4d13_42af_4429_9fd1_a8218c268e20), GUID::from_u128(0xee12f906_d277_404b_b6da_e5fa1a576df5)),
    // USB 설정 → USB 선택적 절전 설정
    ("usbSuspend", GUID::from_u128(0x2a737441_1930_4402_8d77_b2bebba308a3), GUID::from_u128(0x48e6b7a6_50f5_4782_a5d4_53bb8f07e226)),
];
/// 이벤트를 훑는 최대 건수(로그가 아주 커도 오래 걸리지 않게)
const EVENT_SCAN_MAX: usize = 50_000;

/// 키 열기 — 없으면 None(오류 아님), 다른 실패는 errors 에
fn open(root: HKEY, path: &str, errors: &mut Vec<String>) -> Option<Key> {
    match open_key_in(root, path) {
        Ok(k) => Some(k),
        Err(ERROR_FILE_NOT_FOUND) => None,
        Err(e) => {
            errors.push(format!("{path}: {}", os_err(e)));
            None
        }
    }
}

/// 키가 있는지만(값은 읽지 않는다). 읽기가 막히면 None + errors
fn key_exists(path: &str, errors: &mut Vec<String>) -> Option<bool> {
    match open_key_in(HKEY_LOCAL_MACHINE, path) {
        Ok(_) => Some(true),
        Err(ERROR_FILE_NOT_FOUND) => Some(false),
        Err(e) => {
            errors.push(format!("{path}: {}", os_err(e)));
            None
        }
    }
}

fn dword(k: Option<&Key>, name: &str) -> Option<u32> {
    match query_value(k?, name) {
        Ok(Some((REG_DWORD, b))) if b.len() >= 4 => Some(u32::from_le_bytes(b[..4].try_into().ok()?)),
        // 화면 보호기 값처럼 문자열로 든 수도 있다
        Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => from_wide(&u16s(&b)).trim().parse().ok(),
        _ => None,
    }
}

fn string(k: Option<&Key>, name: &str) -> Option<String> {
    match query_value(k?, name) {
        Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => Some(from_wide(&u16s(&b)).trim().to_string()).filter(|s| !s.is_empty()),
        _ => None,
    }
}

/// 값이 있고 비어 있지 않은지(종류 무관)
fn has_value(k: Option<&Key>, name: &str) -> bool {
    matches!(k.map(|k| query_value(k, name)), Some(Ok(Some((_, ref b)))) if b.iter().any(|&x| x != 0))
}

/// 지금 전원 계획의 이름과 값들
fn power(errors: &mut Vec<String>) -> (Option<String>, Vec<PcPowerValue>) {
    let mut scheme: *mut GUID = std::ptr::null_mut();
    // SAFETY: 받은 GUID 는 LocalFree 로 돌려준다
    let r = unsafe { PowerGetActiveScheme(std::ptr::null_mut(), &mut scheme) };
    if r != ERROR_SUCCESS || scheme.is_null() {
        errors.push(format!("{}: {}", tr!("전원 계획", "Power plan"), os_err(r)));
        return (None, Vec::new());
    }
    let mut name = None;
    let mut size = 0u32;
    // SAFETY: 크기만 묻는다(버퍼 널)
    if unsafe { PowerReadFriendlyName(std::ptr::null_mut(), scheme, std::ptr::null(), std::ptr::null(), std::ptr::null_mut(), &mut size) } == ERROR_SUCCESS && size > 0 {
        let mut buf = vec![0u8; size as usize];
        // SAFETY: buf 는 size 바이트
        if unsafe { PowerReadFriendlyName(std::ptr::null_mut(), scheme, std::ptr::null(), std::ptr::null(), buf.as_mut_ptr(), &mut size) } == ERROR_SUCCESS {
            name = Some(from_wide(&u16s(&buf))).filter(|s| !s.trim().is_empty());
        }
    }
    let mut out = Vec::new();
    for (id, sub, setting) in &POWER_SETTINGS {
        let (mut ac, mut dc) = (0u32, 0u32);
        // SAFETY: scheme 은 위에서 받은 GUID, 읽기만
        let ra = unsafe { PowerReadACValueIndex(std::ptr::null_mut(), scheme, sub, setting, &mut ac) };
        let rd = unsafe { PowerReadDCValueIndex(std::ptr::null_mut(), scheme, sub, setting, &mut dc) };
        out.push(PcPowerValue { id, ac: (ra == ERROR_SUCCESS).then_some(ac), dc: (rd == ERROR_SUCCESS).then_some(dc) });
    }
    // SAFETY: PowerGetActiveScheme 이 준 메모리
    unsafe { LocalFree(scheme as HLOCAL) };
    if out.iter().all(|v| v.ac.is_none()) {
        errors.push(tr!("전원 계획 값: 읽지 못함", "Power plan values: not read").into());
    }
    (name, out)
}

fn hours(k: Option<&Key>) -> Option<(u32, u32)> {
    Some((dword(k, "ActiveHoursStart")?, dword(k, "ActiveHoursEnd")?))
}

fn update(errors: &mut Vec<String>) -> PcUpdate {
    let au = open(HKEY_LOCAL_MACHINE, WU_AU_POLICY, errors);
    let wu = open(HKEY_LOCAL_MACHINE, WU_POLICY, errors);
    let ux = open(HKEY_LOCAL_MACHINE, WU_UX, errors);
    PcUpdate {
        no_auto_update: dword(au.as_ref(), "NoAutoUpdate"),
        au_options: dword(au.as_ref(), "AUOptions"),
        no_auto_reboot: dword(au.as_ref(), "NoAutoRebootWithLoggedOnUsers"),
        always_auto_reboot: dword(au.as_ref(), "AlwaysAutoRebootAtScheduledTime"),
        exclude_drivers: dword(wu.as_ref(), "ExcludeWUDriversInQualityUpdate"),
        policy_active_hours: if dword(wu.as_ref(), "SetActiveHours") == Some(1) { hours(wu.as_ref()) } else { None },
        active_hours: hours(ux.as_ref()),
        smart_active_hours: dword(ux.as_ref(), "SmartActiveHoursState"),
    }
}

fn reboot_pending(errors: &mut Vec<String>) -> Vec<&'static str> {
    let mut out = Vec::new();
    if key_exists(WU_REBOOT, errors) == Some(true) {
        out.push("windowsUpdate");
    }
    if key_exists(CBS_REBOOT, errors) == Some(true) {
        out.push("servicing");
    }
    let sm = open(HKEY_LOCAL_MACHINE, SESSION_MANAGER, errors);
    if has_value(sm.as_ref(), "PendingFileRenameOperations") {
        out.push("fileRename");
    }
    out
}

fn screen_saver(errors: &mut Vec<String>) -> PcScreenSaver {
    let k = open(HKEY_CURRENT_USER, DESKTOP, errors);
    PcScreenSaver {
        active: dword(k.as_ref(), "ScreenSaveActive").map(|v| v != 0),
        program: string(k.as_ref(), "SCRNSAVE.EXE").map(|p| file_name(&p)).filter(|s| !s.is_empty()),
        timeout: dword(k.as_ref(), "ScreenSaveTimeOut"),
        secure: dword(k.as_ref(), "ScreenSaverIsSecure").map(|v| v != 0),
    }
}

fn time(errors: &mut Vec<String>) -> PcTime {
    let pol = open(HKEY_LOCAL_MACHINE, W32TIME_POLICY, errors);
    let par = open(HKEY_LOCAL_MACHINE, W32TIME_PARAMS, errors);
    let svc = open(HKEY_LOCAL_MACHINE, W32TIME, errors);
    let pol_type = string(pol.as_ref(), "Type");
    let policy = pol_type.is_some();
    PcTime {
        kind: pol_type.or_else(|| string(par.as_ref(), "Type")),
        ntp_server: if policy { string(pol.as_ref(), "NtpServer").or_else(|| string(par.as_ref(), "NtpServer")) } else { string(par.as_ref(), "NtpServer") },
        policy,
        service_start: dword(svc.as_ref(), "Start"),
    }
}

/// System 로그에서 최근 `days` 일의 예기치 않은 종료·하드웨어·시간 서비스 이벤트 건수
fn events(days: u32) -> Result<Vec<PcEventCount>, String> {
    let (wp, wq) = (wide("System"), wide(&parse::pc_events_query(days)));
    // SAFETY: 널로 끝나는 글, 세션 0 = 이 PC
    let h = Evt(unsafe { EvtQuery(0, wp.as_ptr(), wq.as_ptr(), EvtQueryChannelPath | EvtQueryReverseDirection) });
    if h.0 == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let mut raw = Vec::new();
    let mut scanned = 0usize;
    let mut batch = [0isize; 64];
    loop {
        let mut got = 0u32;
        // SAFETY: batch 는 64칸, 받은 핸들은 Evt 가 닫는다
        if unsafe { EvtNext(h.0, batch.len() as u32, batch.as_mut_ptr(), 2_000, 0, &mut got) } == 0 {
            let e = std::io::Error::last_os_error();
            if e.raw_os_error() == Some(ERROR_NO_MORE_ITEMS as i32) || scanned > 0 {
                break;
            }
            return Err(e.to_string());
        }
        for &ev in &batch[..got as usize] {
            let ev = Evt(ev);
            scanned += 1;
            let Some(re) = render_xml(ev.0).as_deref().and_then(parse::parse_event_xml) else { continue };
            raw.push((re.provider, re.id, re.level, parse::iso_ms(&re.time).unwrap_or(0)));
        }
        if scanned >= EVENT_SCAN_MAX {
            break;
        }
    }
    Ok(parse::pc_event_counts(raw))
}

/// 블루스크린·갑자기 꺼짐 한 건씩(새것부터)
fn crashes(days: u32) -> Result<Vec<PcCrash>, String> {
    let mut out = Vec::new();
    scan_events_with("System", &crash_query(days), false, &mut |e, _| {
        if out.len() < PC_CRASH_KEEP
            && let Some(c) = crash_from_event(&e)
        {
            out.push(c);
        }
    })?;
    out.sort_by_key(|c| std::cmp::Reverse(c.time));
    Ok(out)
}

/// 절전에서 깨어난 기록(새것부터) — Windows 문구의 «깨운 원본» 줄을 함께
fn wakes(days: u32) -> Result<Vec<PcWake>, String> {
    let mut out = Vec::new();
    scan_events_with("System", &wake_query(days), true, &mut |e, msg| {
        if out.len() < PC_WAKE_KEEP {
            out.push(wake_from_event(&e, msg.as_deref()));
        }
    })?;
    out.sort_by_key(|w| std::cmp::Reverse(w.time));
    Ok(out)
}

/// %SystemRoot%\Minidump 의 .dmp — 이름·시각·크기만(새것부터, 최대 50). 폴더가 없으면 빈 목록
fn dumps() -> Result<Vec<PcDump>, String> {
    let root = std::env::var_os("SystemRoot").map(std::path::PathBuf::from).unwrap_or_else(|| r"C:\Windows".into());
    let dir = root.join("Minidump");
    let rd = match std::fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(e.to_string()),
    };
    let mut out: Vec<PcDump> = rd
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".dmp") {
                return None;
            }
            let m = e.metadata().ok()?;
            let time = m.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok()?.as_millis() as u64;
            Some(PcDump { name, time, size: m.len() })
        })
        .collect();
    out.sort_by_key(|d| std::cmp::Reverse(d.time));
    out.truncate(50);
    Ok(out)
}

/// 배터리 — 시스템 배터리가 없으면(데스크톱) 빈 목록
fn batteries(errors: &mut Vec<String>) -> Vec<PcBattery> {
    let mut st = SYSTEM_POWER_STATUS::default();
    // SAFETY: 쓰기 가능한 구조체
    if unsafe { GetSystemPowerStatus(&mut st) } == 0 || st.BatteryFlag == 255 || st.BatteryFlag & 128 != 0 {
        return Vec::new();
    }
    super::wmi::batteries().unwrap_or_else(|e| {
        errors.push(format!("{}: {e}", tr!("배터리", "Battery")));
        Vec::new()
    })
}

pub fn read(days: u32) -> PcCheck {
    let mut errors = Vec::new();
    let sp = open(HKEY_LOCAL_MACHINE, SESSION_POWER, &mut errors);
    let cp = open(HKEY_LOCAL_MACHINE, CONTROL_POWER, &mut errors);
    let fast_startup = dword(sp.as_ref(), "HiberbootEnabled").map(|v| v != 0);
    let hibernate_enabled = dword(cp.as_ref(), "HibernateEnabled").map(|v| v != 0);
    let (scheme, power) = power(&mut errors);
    let update = update(&mut errors);
    let reboot_pending = reboot_pending(&mut errors);
    let screen_saver = screen_saver(&mut errors);
    let time = time(&mut errors);
    let events = events(days).unwrap_or_else(|e| {
        errors.push(format!("{}: {e}", tr!("이벤트 로그 System", "Event log System")));
        Vec::new()
    });
    let crashes = crashes(days).unwrap_or_else(|e| {
        errors.push(format!("{} (1001·41·6008): {e}", tr!("이벤트 로그 System", "Event log System")));
        Vec::new()
    });
    let wakes = wakes(days).unwrap_or_else(|e| {
        errors.push(format!("{} (Power-Troubleshooter): {e}", tr!("이벤트 로그 System", "Event log System")));
        Vec::new()
    });
    let (dumps, dumps_read) = match dumps() {
        Ok(d) => (d, true),
        Err(e) => {
            errors.push(format!("Minidump: {e}"));
            (Vec::new(), false)
        }
    };
    let disks = super::disk::read();
    let batteries = batteries(&mut errors);
    let exposure = super::exposure::read(&mut errors);
    PcCheck { read_at: crate::event::now_ms(), days, fast_startup, hibernate_enabled, scheme, power, update, reboot_pending, screen_saver, time, events, crashes, dumps, dumps_read, disks, wakes, batteries, exposure, errors }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 관리자 없이 이 PC 의 설정·전원 계획·System 로그를 실제로 읽는다(값은 PC 마다 다르니 «읽혔는지» 만)
    #[test]
    fn reads_this_pc_without_admin() {
        let pc = read(30);
        assert!(pc.errors.is_empty(), "{:?}", pc.errors);
        // HiberbootEnabled 는 Windows Server(CI 러너)에 없을 수 있어 읽혔는지는 보지 않는다
        assert_eq!(pc.power.len(), 5);
        assert!(pc.power.iter().any(|v| v.ac.is_some()), "전원 계획 값을 하나도 읽지 못함");
        assert!(pc.time.service_start.is_some(), "W32Time 서비스 키를 읽지 못함");
        for e in &pc.events {
            assert!(e.count > 0 && e.last > 0);
        }
        // 화면 보호기 파일 이름에 경로가 남지 않는다
        assert!(pc.screen_saver.program.as_deref().is_none_or(|p| !p.contains('\\')));
        // (0.10.0) 블루스크린·꺼짐·깨어남·덤프는 새것부터, 경로가 남지 않는다
        assert!(pc.crashes.windows(2).all(|w| w[0].time >= w[1].time));
        assert!(pc.crashes.iter().all(|c| c.dump.as_deref().is_none_or(|d| !d.contains('\\'))));
        assert!(pc.wakes.iter().all(|w| w.timer_owner.as_deref().is_none_or(|d| !d.contains('\\'))));
        assert!(pc.dumps_read && pc.dumps.iter().all(|d| !d.name.contains('\\')));
    }

    /// 이 PC 의 저장장치·블루스크린·깨어남·배터리 읽기 — 관리자 없이. 이름·모델은 찍지 않는다(개수와 상태만)
    #[test]
    #[ignore = "이 PC 의 실제 기록을 읽는다 — cargo test -- --ignored 로"]
    fn reads_health_without_admin() {
        let pc = read(365);
        assert!(pc.errors.is_empty(), "{} errors", pc.errors.len());
        assert!(!pc.disks.is_empty());
        for d in &pc.disks {
            println!("디스크 {} {} {}", d.index, d.bus, d.state);
        }
        let codes: Vec<String> = pc.crashes.iter().map(|c| format!("{}:{:?}", c.kind, c.code.map(|x| format!("{x:#x}")))).collect();
        let sources = pc.wakes.iter().filter(|w| w.source.is_some()).count();
        println!("365일: 꺼짐·블루스크린 {} {codes:?} · 덤프 {} · 깨어남 {} (원본 읽음 {sources}) · 배터리 {}", pc.crashes.len(), pc.dumps.len(), pc.wakes.len(), pc.batteries.len());
    }
}
