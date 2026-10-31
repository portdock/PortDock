//! (0.10.0) 현장 PC 노출 점검 — 같은 망의 다른 PC 가 이 PC 에 닿을 수 있는 설정을 읽기만 한다(관리자 권한 없이, KEY_READ).
//! 원격 데스크톱(fDenyTSConnections·네트워크 수준 인증·포트) · SMBv1(mrxsmb10·srv 서비스 키 — 기능 설치 목록은 관리자만이라 서비스 키로 본다) ·
//! 방화벽 프로필(INetFwPolicy2 — 랜카드 점검과 같은 읽기) · 0.0.0.0/:: 에서 듣는 TCP 포트(GetExtendedTcpTable) ·
//! 자동 로그온(AutoAdminLogon 과 DefaultPassword 값이 «있는지» 만 — 비밀번호 내용은 읽지 않는다) · 자동 실행(AutoPlay·NoDriveTypeAutoRun).
//! 바꾸는 호출은 없다.

use super::PcExposure;
use super::win::{Key, from_wide, open_key_in, os_err, query_value, u16s, value_exists};
use crate::tr;
use windows_sys::Win32::Foundation::ERROR_FILE_NOT_FOUND;
use windows_sys::Win32::System::Registry::{HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, REG_DWORD, REG_EXPAND_SZ, REG_SZ};

const TS: &str = r"SYSTEM\CurrentControlSet\Control\Terminal Server";
const RDP_TCP: &str = r"SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp";
const MRXSMB10: &str = r"SYSTEM\CurrentControlSet\Services\mrxsmb10";
const SRV: &str = r"SYSTEM\CurrentControlSet\Services\srv";
const LANMAN: &str = r"SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters";
const WINLOGON: &str = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon";
const AUTOPLAY: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers";
const EXPLORER_POLICY: &str = r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer";

/// 키 열기 — 없으면 Ok(None), 막히면 Err(이유)
fn open(root: HKEY, path: &str) -> Result<Option<Key>, String> {
    match open_key_in(root, path) {
        Ok(k) => Ok(Some(k)),
        Err(ERROR_FILE_NOT_FOUND) => Ok(None),
        Err(e) => Err(format!("{path}: {}", os_err(e))),
    }
}

fn dword(k: Option<&Key>, name: &str) -> Option<u32> {
    match query_value(k?, name) {
        Ok(Some((REG_DWORD, b))) if b.len() >= 4 => Some(u32::from_le_bytes(b[..4].try_into().ok()?)),
        _ => None,
    }
}

fn string(k: Option<&Key>, name: &str) -> Option<String> {
    match query_value(k?, name) {
        Ok(Some((REG_SZ | REG_EXPAND_SZ, b))) => Some(from_wide(&u16s(&b)).trim().to_string()),
        _ => None,
    }
}

/// 서비스 키로 본 SMBv1 부품 상태 — 키 없음 «absent», 시작 유형 4 «disabled», 그 밖 «enabled». `off` 가 true 면(서버 SMB1=0) «disabled»
fn smb_state(path: &str, off: bool, errors: &mut Vec<String>) -> Option<&'static str> {
    match open(HKEY_LOCAL_MACHINE, path) {
        Ok(None) => Some("absent"),
        Ok(Some(k)) => Some(if off || dword(Some(&k), "Start") == Some(4) { "disabled" } else { "enabled" }),
        Err(e) => {
            errors.push(format!("SMBv1: {e}"));
            None
        }
    }
}

pub fn read(errors: &mut Vec<String>) -> PcExposure {
    let mut out = PcExposure::default();
    let mut err = |e: String| errors.push(e);

    // 원격 데스크톱
    match open(HKEY_LOCAL_MACHINE, TS) {
        Ok(k) => out.rdp_deny = dword(k.as_ref(), "fDenyTSConnections"),
        Err(e) => err(e),
    }
    match open(HKEY_LOCAL_MACHINE, RDP_TCP) {
        Ok(k) => {
            out.rdp_nla = dword(k.as_ref(), "UserAuthentication");
            out.rdp_port = dword(k.as_ref(), "PortNumber");
        }
        Err(e) => err(e),
    }

    // SMBv1 — 서버는 LanmanServer\Parameters SMB1=0 이면 꺼진 것
    let lanman_off = open(HKEY_LOCAL_MACHINE, LANMAN).ok().flatten().and_then(|k| dword(Some(&k), "SMB1")) == Some(0);
    let mut smb_errors = Vec::new();
    out.smb1_client = smb_state(MRXSMB10, false, &mut smb_errors);
    out.smb1_server = smb_state(SRV, lanman_off, &mut smb_errors);
    smb_errors.into_iter().for_each(&mut err);

    // 방화벽
    match super::wmi::firewall() {
        Ok(f) => out.firewall = f,
        Err(e) => err(format!("{}: {e}", tr!("방화벽 프로필", "Firewall profiles"))),
    }

    // 모든 주소에서 듣는 포트
    match crate::net::open_listeners() {
        Ok(l) => {
            out.listeners = l;
            out.listeners_read = true;
        }
        Err(e) => err(format!("{}: {e}", tr!("듣는 TCP 포트", "Listening TCP ports"))),
    }

    // 자동 로그온 — 비밀번호는 «값이 있는지» 만
    match open(HKEY_LOCAL_MACHINE, WINLOGON) {
        Ok(Some(k)) => {
            out.auto_logon = Some(string(Some(&k), "AutoAdminLogon").as_deref() == Some("1"));
            out.auto_logon_password = value_exists(&k, "DefaultPassword").ok();
        }
        Ok(None) => {}
        Err(e) => err(e),
    }

    // 자동 실행 — 지금 사용자의 AutoPlay, 정책(HKLM 먼저)
    if let Ok(k) = open(HKEY_CURRENT_USER, AUTOPLAY) {
        out.autoplay_off = Some(dword(k.as_ref(), "DisableAutoplay") == Some(1));
    }
    let policy = |root| open(root, EXPLORER_POLICY).ok().flatten().and_then(|k| dword(Some(&k), "NoDriveTypeAutoRun"));
    out.autorun_policy = policy(HKEY_LOCAL_MACHINE).or_else(|| policy(HKEY_CURRENT_USER));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 관리자 없이 이 PC 의 노출 설정을 읽는다(값은 PC 마다 다르니 «읽혔는지» 와 모양만 — 값·이름은 찍지 않는다)
    #[test]
    fn reads_exposure_without_admin() {
        let mut errors = Vec::new();
        let x = read(&mut errors);
        assert!(errors.is_empty(), "{errors:?}");
        assert!(x.listeners_read);
        assert!(x.smb1_client.is_some() && x.smb1_server.is_some());
        assert_eq!(x.firewall.len(), 3);
        assert!(x.auto_logon.is_some());
        // 프로세스 이름에 경로가 남지 않는다
        assert!(x.listeners.iter().all(|l| l.process.as_deref().is_none_or(|n| !n.contains('\\'))));
    }
}
