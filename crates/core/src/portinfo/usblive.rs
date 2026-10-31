//! (0.10.0) USB 연결 기록(Hardware Tester) — 지금 연결된 USB 장치 목록, 도착·제거 알림, 예전 기록.
//! - 장치 목록·이름·속성(마지막 연결·분리 시각): CfgMgr32(CM_Get_Device_ID_List · CM_Get_DevNode_PropertyW)
//! - 허브 포트·협상 속도: usb.rs 와 같은 허브 «조회» IOCTL(FILE_ANY_ACCESS)
//! - 도착·제거: CM_Register_Notification(GUID_DEVINTERFACE_USB_DEVICE 인터페이스) — 창·메시지 루프 없이, 알림만 받는다
//! - 예전 기록: 이벤트 로그 Microsoft-Windows-Kernel-PnP/Configuration(장치 구성·시작·삭제 — 다시 꽂을 때마다 남지는 않는다)
//!
//! 바꾸는 호출은 없다. 인스턴스 ID(장치 일련번호가 들 수 있음)는 이 모듈과 호출한 백엔드 안에서만 쓴다.

use super::parse::{self, iso_ms};
use super::pchealth::{interface_instance_id, is_usb_device_node, usb_vid_pid};
use super::win::{device_ids, display_name, locate, prop_string, prop_time, scan_events};
use super::{UsbConfigEvent, UsbDevice, UsbNotice, UsbPast, usb};
use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{
    CM_NOTIFY_ACTION, CM_NOTIFY_ACTION_DEVICEINTERFACEARRIVAL, CM_NOTIFY_ACTION_DEVICEINTERFACEREMOVAL, CM_NOTIFY_EVENT_DATA, CM_NOTIFY_FILTER, CM_NOTIFY_FILTER_0,
    CM_NOTIFY_FILTER_0_0, CM_NOTIFY_FILTER_TYPE_DEVICEINTERFACE, CM_Register_Notification, CM_Unregister_Notification, CR_SUCCESS, HCMNOTIFICATION,
};
use windows_sys::Win32::Devices::Properties::{DEVPKEY_Device_BusReportedDeviceDesc, DEVPKEY_Device_FirstInstallDate, DEVPKEY_Device_LastArrivalDate, DEVPKEY_Device_LastRemovalDate};
use windows_sys::Win32::Devices::Usb::GUID_DEVINTERFACE_USB_DEVICE;

const CONFIG_LOG: &str = "Microsoft-Windows-Kernel-PnP/Configuration";
/// 돌려줄 예전 이벤트 최대 건수
const HISTORY_KEEP: usize = 300;

/// 보일 이름 — USB 장치가 스스로 알린 제품 이름이 있으면 그것, 없으면 장치 관리자 이름. 인스턴스 ID 는 이름으로 쓰지 않는다
fn name_of(dn: u32, id: &str) -> String {
    if let Some(n) = prop_string(dn, &DEVPKEY_Device_BusReportedDeviceDesc) {
        return n;
    }
    let n = display_name(dn, id);
    if n == id { crate::tr!("USB 장치", "USB device").to_string() } else { n }
}

pub fn device(id: &str) -> Option<UsbDevice> {
    if !is_usb_device_node(id) {
        return None;
    }
    let dn = locate(id, false)?;
    let (vid, pid) = usb_vid_pid(id);
    let (ports, speed, below_capable, hub) = usb::place(dn);
    Some(UsbDevice { id: id.to_string(), name: name_of(dn, id), vid, pid, hub, ports, speed, below_capable })
}

pub fn devices() -> Vec<UsbDevice> {
    device_ids(None, true).iter().filter(|id| is_usb_device_node(id)).filter_map(|id| device(id)).collect()
}

type Callback = Box<dyn Fn(UsbNotice) + Send + Sync>;

/// 알림 등록 — 놓으면 끊는다(CM_Unregister_Notification 은 돌고 있는 콜백이 끝날 때까지 기다린다)
pub struct Watch {
    handle: HCMNOTIFICATION,
    ctx: *mut Callback,
}

// SAFETY: 핸들과 콜백 상자는 이 값이 혼자 쥐고, 놓을 때 등록을 먼저 끊은 뒤 상자를 푼다. 콜백 자체는 Send + Sync
unsafe impl Send for Watch {}

impl Drop for Watch {
    fn drop(&mut self) {
        // SAFETY: 우리가 등록한 핸들. 끊긴 뒤에는 콜백이 다시 불리지 않으므로 상자를 풀어도 된다
        unsafe {
            CM_Unregister_Notification(self.handle);
            drop(Box::from_raw(self.ctx));
        }
    }
}

unsafe extern "system" fn on_notify(_h: HCMNOTIFICATION, context: *const core::ffi::c_void, action: CM_NOTIFY_ACTION, data: *const CM_NOTIFY_EVENT_DATA, size: u32) -> u32 {
    let arrived = match action {
        CM_NOTIFY_ACTION_DEVICEINTERFACEARRIVAL => true,
        CM_NOTIFY_ACTION_DEVICEINTERFACEREMOVAL => false,
        _ => return 0,
    };
    if context.is_null() || data.is_null() {
        return 0;
    }
    // SAFETY: Windows 가 준 size 바이트 안에서만 읽는다 — SymbolicLink 는 널로 끝나는 UTF-16
    let link = unsafe {
        let start = std::ptr::addr_of!((*data).u.DeviceInterface.SymbolicLink) as *const u16;
        let max = (size as usize).saturating_sub(start as usize - data as usize) / 2;
        let s = std::slice::from_raw_parts(start, max);
        let n = s.iter().position(|&c| c == 0).unwrap_or(s.len());
        String::from_utf16_lossy(&s[..n])
    };
    if let Some(id) = interface_instance_id(&link).filter(|id| is_usb_device_node(id)) {
        // SAFETY: watch() 가 넘긴 Callback 상자 — Watch 가 살아 있는 동안 유효
        let f = unsafe { &*(context as *const Callback) };
        f(UsbNotice { arrived, id, time: crate::event::now_ms() });
    }
    0
}

pub fn watch(f: Callback) -> Result<Watch, String> {
    let ctx = Box::into_raw(Box::new(f));
    let filter = CM_NOTIFY_FILTER {
        cbSize: std::mem::size_of::<CM_NOTIFY_FILTER>() as u32,
        Flags: 0,
        FilterType: CM_NOTIFY_FILTER_TYPE_DEVICEINTERFACE,
        Reserved: 0,
        u: CM_NOTIFY_FILTER_0 { DeviceInterface: CM_NOTIFY_FILTER_0_0 { ClassGuid: GUID_DEVINTERFACE_USB_DEVICE } },
    };
    let mut handle: HCMNOTIFICATION = std::ptr::null_mut();
    // SAFETY: filter 는 크기를 채운 구조체, ctx 는 Watch 가 놓을 때까지 산다
    let r = unsafe { CM_Register_Notification(&filter, ctx as *const _, Some(on_notify), &mut handle) };
    if r != CR_SUCCESS {
        // SAFETY: 등록에 실패해 아무도 쓰지 않는 상자
        drop(unsafe { Box::from_raw(ctx) });
        return Err(format!("CM_Register_Notification: CONFIGRET {r}"));
    }
    Ok(Watch { handle, ctx })
}

pub fn history(days: u32) -> (Vec<UsbPast>, Vec<UsbConfigEvent>, Vec<String>) {
    let mut errors = Vec::new();
    let mut past = Vec::new();
    for id in device_ids(None, false).into_iter().filter(|id| is_usb_device_node(id)) {
        let Some(dn) = locate(&id, true) else { continue };
        let (vid, pid) = usb_vid_pid(&id);
        past.push(UsbPast {
            name: name_of(dn, &id),
            vid,
            pid,
            present: locate(&id, false).is_some(),
            last_arrival: prop_time(dn, &DEVPKEY_Device_LastArrivalDate),
            last_removal: prop_time(dn, &DEVPKEY_Device_LastRemovalDate),
            first_install: prop_time(dn, &DEVPKEY_Device_FirstInstallDate),
            id,
        });
    }
    let ms = u64::from(days) * 86_400_000;
    let mut events = Vec::new();
    let q = format!("*[System[TimeCreated[timediff(@SystemTime) <= {ms}]]]");
    if let Err(e) = scan_events(CONFIG_LOG, &q, &mut |ev| {
        if events.len() >= HISTORY_KEEP {
            return;
        }
        let Some(dev) = ev.data.iter().find(|(k, _)| k == "DeviceInstanceId").map(|(_, v)| v.trim().to_string()) else { return };
        if !is_usb_device_node(&dev) {
            return;
        }
        events.push(UsbConfigEvent { time: iso_ms(&ev.time).unwrap_or(0), id: ev.id, kind: parse::event_kind(&ev.provider, ev.id), device: dev });
    }) {
        errors.push(format!("{CONFIG_LOG}: {e}"));
    }
    events.sort_by_key(|e| std::cmp::Reverse(e.time));
    (past, events, errors)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 이 PC 에서 관리자 없이 USB 목록·예전 기록을 읽고 알림을 등록했다 끊는다. 값(이름·ID)은 찍지 않는다 — 개수와 모양만
    #[test]
    #[ignore = "이 PC 의 실제 USB 장치를 읽는다 — cargo test -- --ignored 로"]
    fn reads_usb_without_admin() {
        let now = devices();
        assert!(now.iter().all(|d| !d.name.is_empty() && d.name != d.id && is_usb_device_node(&d.id)));
        let with_speed = now.iter().filter(|d| d.speed.is_some()).count();
        let (past, events, errors) = history(30);
        assert!(errors.is_empty(), "{} errors", errors.len());
        assert!(past.len() >= now.len());
        assert!(events.windows(2).all(|w| w[0].time >= w[1].time));
        let w = watch(Box::new(|_| {})).expect("알림 등록");
        drop(w);
        println!("USB 장치 {} (속도 읽음 {with_speed}) · 예전 장치 {} · 30일 이벤트 {}", now.len(), past.len(), events.len());
    }
}
