//! WMI 읽기 — 장치의 «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음»(root\WMI MSPower_DeviceEnable)과
//! 랜카드 링크 속도·이중 방식(root\StandardCimv2 MSFT_NetAdapter). 둘 다 일반 사용자 권한으로 읽힌다.
//! COM 은 따로 만든 스레드에서 MTA 로 초기화한다(화면·tauri 스레드의 COM 설정과 섞이지 않게).

use std::collections::HashMap;
use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoSetProxyBlanket, CoUninitialize, EOAC_NONE, RPC_C_AUTHN_LEVEL_CALL,
    RPC_C_IMP_LEVEL_IMPERSONATE,
};
use windows::Win32::System::Variant::{VARIANT, VT_BOOL, VT_BSTR, VT_I4, VT_UI4, VariantClear};
use windows::Win32::System::Wmi::{IWbemClassObject, IWbemLocator, WBEM_FLAG_FORWARD_ONLY, WBEM_FLAG_RETURN_IMMEDIATELY, WbemLocator};
use windows::core::{BSTR, PCWSTR};

/// RPC_C_AUTHN_WINNT · RPC_C_AUTHZ_NONE (Win32_System_Rpc 기능을 켜지 않으려고 값으로)
const RPC_C_AUTHN_WINNT: u32 = 10;
const RPC_C_AUTHZ_NONE: u32 = 0;

#[derive(Debug, Clone, PartialEq)]
enum Val {
    Str(String),
    Bool(bool),
    Num(i64),
    Null,
}

impl Val {
    fn str(&self) -> Option<String> {
        match self {
            Val::Str(s) => Some(s.clone()),
            Val::Num(n) => Some(n.to_string()),
            _ => None,
        }
    }
    fn bool(&self) -> Option<bool> {
        match self {
            Val::Bool(b) => Some(*b),
            _ => None,
        }
    }
    fn num(&self) -> Option<i64> {
        match self {
            Val::Num(n) => Some(*n),
            // WMI 는 uint64 를 글자로 준다
            Val::Str(s) => s.trim().parse().ok(),
            _ => None,
        }
    }
}

/// VARIANT 를 읽고 비운다
unsafe fn take(v: &mut VARIANT) -> Val {
    // SAFETY: vt 를 보고 그 모양으로만 읽는다
    let out = unsafe {
        let inner = &v.Anonymous.Anonymous;
        match inner.vt {
            VT_BSTR => Val::Str(inner.Anonymous.bstrVal.to_string()),
            VT_BOOL => Val::Bool(inner.Anonymous.boolVal.as_bool()),
            VT_I4 => Val::Num(inner.Anonymous.lVal as i64),
            VT_UI4 => Val::Num(inner.Anonymous.ulVal as i64),
            _ => Val::Null,
        }
    };
    // SAFETY: 우리가 받은 VARIANT
    let _ = unsafe { VariantClear(v) };
    out
}

fn wstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// WQL 질의 하나 — 줄마다 필드 값
fn query_now(namespace: &str, wql: &str, fields: &[&str]) -> Result<Vec<HashMap<String, Val>>, String> {
    // SAFETY: COM 호출 — 결과 인터페이스는 windows 크레이트가 Release 한다
    unsafe {
        let loc: IWbemLocator = CoCreateInstance(&WbemLocator, None, CLSCTX_INPROC_SERVER).map_err(|e| e.message())?;
        let svc = loc.ConnectServer(&BSTR::from(namespace), &BSTR::new(), &BSTR::new(), &BSTR::new(), 0, &BSTR::new(), None).map_err(|e| e.message())?;
        CoSetProxyBlanket(&svc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, PCWSTR::null(), RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, None, EOAC_NONE).map_err(|e| e.message())?;
        let en = svc.ExecQuery(&BSTR::from("WQL"), &BSTR::from(wql), WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY, None).map_err(|e| e.message())?;
        let names: Vec<Vec<u16>> = fields.iter().map(|f| wstr(f)).collect();
        let mut rows = Vec::new();
        loop {
            let mut objs: [Option<IWbemClassObject>; 1] = [None];
            let mut got = 0u32;
            let hr = en.Next(5_000, &mut objs, &mut got);
            if hr.is_err() {
                return Err(windows::core::Error::from_hresult(hr).message());
            }
            if got == 0 {
                break;
            }
            let Some(o) = objs[0].take() else { break };
            let mut row = HashMap::new();
            for (f, w) in fields.iter().zip(&names) {
                let mut v = VARIANT::default();
                let val = if o.Get(PCWSTR(w.as_ptr()), 0, &mut v, None, None).is_ok() { take(&mut v) } else { Val::Null };
                row.insert((*f).to_string(), val);
            }
            rows.push(row);
            if rows.len() > 10_000 {
                break;
            }
        }
        Ok(rows)
    }
}

/// WMI 가 이만큼 답하지 않으면 «읽지 못함» 으로 돌려준다(서비스가 멈춘 PC 에서 ConnectServer 가 끝나지 않는 일이 있다)
const QUERY_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// 따로 만든 스레드에서 COM 을 열고 질의. `QUERY_TIMEOUT` 을 넘기면 그 스레드는 버려 두고 오류를 돌려준다
fn query(namespace: &'static str, wql: &'static str, fields: &'static [&'static str]) -> Result<Vec<HashMap<String, Val>>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        // SAFETY: 이 스레드에서만 COM 을 쓴다 — 끝나면 닫는다
        let hr = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let r = if hr.is_err() {
            Err(hr.message())
        } else {
            let r = query_now(namespace, wql, fields);
            unsafe { CoUninitialize() };
            r
        };
        // 시간을 넘겨 받는 쪽이 떠났으면 보낼 곳이 없다 — 무시
        let _ = tx.send(r);
    });
    match rx.recv_timeout(QUERY_TIMEOUT) {
        Ok(r) => r,
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => Err(format!("no answer in {}s", QUERY_TIMEOUT.as_secs())),
        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => Err("WMI thread panicked".into()),
    }
}

/// MSPower_DeviceEnable — 인스턴스 ID(대문자) → «PC 가 끌 수 있음»
pub fn device_power() -> Result<HashMap<String, bool>, String> {
    let rows = query(r"root\WMI", "SELECT InstanceName, Enable FROM MSPower_DeviceEnable", &["InstanceName", "Enable"])?;
    Ok(rows
        .into_iter()
        .filter_map(|r| {
            let name = r.get("InstanceName")?.str()?;
            let on = r.get("Enable")?.bool()?;
            Some((instance_of(&name).to_ascii_uppercase(), on))
        })
        .collect())
}

/// WMI 인스턴스 이름(«USB\VID_0403&PID_6001\A12345_0») → 장치 인스턴스 ID(끝의 «_숫자» 를 뗀다)
fn instance_of(name: &str) -> &str {
    match name.rfind('_') {
        Some(i) if i + 1 < name.len() && name[i + 1..].chars().all(|c| c.is_ascii_digit()) => &name[..i],
        _ => name,
    }
}

pub struct Adapter {
    pub name: String,
    pub description: String,
    pub up: bool,
    pub speed: Option<u64>,
    pub full_duplex: Option<bool>,
}

/// MSFT_NetAdapter — 실제 하드웨어 랜카드만
pub fn net_adapters() -> Result<Vec<Adapter>, String> {
    let rows = query(
        r"root\StandardCimv2",
        "SELECT Name, InterfaceDescription, Speed, FullDuplex, MediaConnectState, HardwareInterface FROM MSFT_NetAdapter",
        &["Name", "InterfaceDescription", "Speed", "FullDuplex", "MediaConnectState", "HardwareInterface"],
    )?;
    Ok(rows
        .into_iter()
        .filter(|r| r.get("HardwareInterface").and_then(Val::bool).unwrap_or(true))
        .filter_map(|r| {
            Some(Adapter {
                name: r.get("Name")?.str()?,
                description: r.get("InterfaceDescription").and_then(Val::str).unwrap_or_default(),
                // MediaConnectState: 1 연결됨 · 2 끊김 · 0 모름
                up: r.get("MediaConnectState").and_then(Val::num) == Some(1),
                speed: r.get("Speed").and_then(Val::num).and_then(|n| u64::try_from(n).ok()),
                full_duplex: r.get("FullDuplex").and_then(Val::bool),
            })
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn instance_names() {
        assert_eq!(instance_of(r"USB\VID_0403&PID_6001\A12345_0"), r"USB\VID_0403&PID_6001\A12345");
        assert_eq!(instance_of(r"USB\ROOT_HUB30\4&1A2B&0&0_0"), r"USB\ROOT_HUB30\4&1A2B&0&0");
        assert_eq!(instance_of("NOSUFFIX"), "NOSUFFIX");
        assert_eq!(instance_of("A_B"), "A_B");
    }

    /// 관리자 없이 WMI 두 질의가 실제로 읽힌다(이 PC)
    #[test]
    fn reads_wmi_without_admin() {
        let p = device_power().expect("MSPower_DeviceEnable");
        // USB 허브·컨트롤러가 있는 PC 면 보통 항목이 있다 — 비어도 실패로 보지 않는다(가상 PC)
        let _ = p.len();
        let n = net_adapters().expect("MSFT_NetAdapter");
        assert!(n.iter().all(|a| !a.name.is_empty()));
    }
}
