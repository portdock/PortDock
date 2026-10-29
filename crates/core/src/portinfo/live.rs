//! 기록기용 짧은 읽기(Hardware Tester) — 몇 초마다 다시 부르는 가벼운 읽기만. 무선 탭(wireless.rs)과 같은 곳을 같은 권한으로 읽는다.
//! - 블루투스 장치 연결 여부: Bluetooth 클래스 장치 노드(BTHENUM\DEV_·BTHLE\DEV_) 의 PnP 속성 «연결됨»
//!   ({83da6326-97a6-4088-9453-a1923f573b29},15, Boolean — 장치 관리자 «속성 → 자세히 → 연결됨» 과 같은 값). 관리자 권한 없이 읽힌다.
//!   «있음(페어링)» 은 연결과 다르다 — 페어링된 장치는 꺼져 있어도 노드가 있다.
//! - Wi-Fi 연결·끊김: WLAN-AutoConfig/Operational 8001(연결)·8003(끊김 — 이유 코드·문구만, SSID·프로필 이름은 꺼내지 않는다)
//! - 블루투스 오디오 끝점(무선 탭과 같은 bt_audio)
//!
//! 바꾸는 호출은 없다(CM_Get_DevNode_PropertyW · EvtQuery · 레지스트리 KEY_READ · IMMDeviceEnumerator 기본 장치 ID).

use super::win::{device_ids, display_name, locate, prop_raw, scan_events};
use super::{BtAudio, BtLink, WlanEvent, parse, wireless};
use windows_sys::Win32::Devices::Properties::DEVPROP_TYPE_BOOLEAN;
use windows_sys::Win32::Foundation::DEVPROPKEY;
use windows_sys::core::GUID;

const BT_CLASS: &str = "{e0cbf06c-cd8b-4647-bb8a-263b43f0f974}";
const WLAN_LOG: &str = "Microsoft-Windows-WLAN-AutoConfig/Operational";
/// 장치 «연결됨» 속성
const DEVPKEY_DEVICE_IS_CONNECTED: DEVPROPKEY = DEVPROPKEY { fmtid: GUID::from_u128(0x83da6326_97a6_4088_9453_a1923f573b29), pid: 15 };

pub fn bt_links() -> Vec<BtLink> {
    // 페어링된 장치 노드는 «지금 있음» 으로 남는다 — present 만 훑어도 꺼진 장치까지 나온다
    let mut out = Vec::new();
    for id in device_ids(Some(BT_CLASS), true) {
        if !parse::is_bt_device_node(&id) {
            continue;
        }
        let Some(dn) = locate(&id, false) else { continue };
        let connected = match prop_raw(dn, &DEVPKEY_DEVICE_IS_CONNECTED) {
            Some((DEVPROP_TYPE_BOOLEAN, b)) if !b.is_empty() => Some(b[0] != 0),
            _ => None,
        };
        out.push(BtLink { name: display_name(dn, &id), id, connected });
    }
    out
}

pub fn wlan_events(within_ms: u64) -> Result<Vec<WlanEvent>, String> {
    let mut out = Vec::new();
    scan_events(WLAN_LOG, &parse::wlan_link_query(within_ms), &mut |e| out.extend(parse::wlan_link_event(&e)))?;
    out.sort_by_key(|e| e.time);
    Ok(out)
}

pub fn bt_audio() -> (Vec<BtAudio>, Vec<String>) {
    let mut errors = Vec::new();
    let defaults = super::wmi::default_audio().unwrap_or_else(|e| {
        errors.push(format!("{}: {e}", crate::tr!("기본 소리 장치", "Default sound device")));
        Vec::new()
    });
    let a = wireless::bt_audio(&defaults, &mut errors);
    (a, errors)
}
