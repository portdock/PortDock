//! USB 경로 — COM 장치에서 위로 올라가며 허브 사슬·허브 포트 번호·협상 속도·허브 전원을 읽는다.
//! 허브는 장치 인터페이스(GUID_DEVINTERFACE_USB_HUB)를 접근 권한 0(FILE_ANY_ACCESS IOCTL 만)으로 열고, 막히면 USBView 처럼
//! GENERIC_WRITE 로 한 번 더 연다. 부르는 IOCTL 은 «조회» 둘(노드 정보·연결 정보) 뿐 — 허브·장치 설정을 바꾸지 않는다.

use super::parse::{location_port, usb_below_capable, usb_speed};
use super::win::{display_name, instance_id, multi_sz, parent, prop_string, prop_u32, wide};
use super::{UsbHop, UsbPath};
use std::collections::HashMap;
use std::fs::File;
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::AsRawHandle;
use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{CM_GET_DEVICE_INTERFACE_LIST_PRESENT, CM_Get_Device_Interface_List_SizeW, CM_Get_Device_Interface_ListW, CR_BUFFER_SMALL, CR_SUCCESS};
use windows_sys::Win32::Devices::Properties::{DEVPKEY_Device_Address, DEVPKEY_Device_LocationInfo};
use windows_sys::Win32::Devices::Usb::{
    GUID_DEVINTERFACE_USB_HUB, IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX, IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX_V2, IOCTL_USB_GET_NODE_INFORMATION, USB_NODE_CONNECTION_INFORMATION_EX,
    USB_NODE_CONNECTION_INFORMATION_EX_V2, USB_NODE_INFORMATION, USB_PIPE_INFO,
};
use windows_sys::Win32::System::IO::DeviceIoControl;

/// FILE_SHARE_READ | FILE_SHARE_WRITE
const SHARE_RW: u32 = 0x1 | 0x2;
const GENERIC_WRITE: u32 = 0x4000_0000;
/// 사슬을 올라가는 최대 칸(허브는 USB 규격상 5단까지)
const MAX_DEPTH: usize = 12;

/// 장치가 허브면 그 허브 인터페이스 경로(«\\?\USB#ROOT_HUB30#…#{f18a0e88-…}»)
fn hub_interface(id: &str) -> Option<String> {
    let w = wide(id);
    for _ in 0..3 {
        let mut len = 0u32;
        // SAFETY: len 은 쓰기 가능한 u32, w 는 널로 끝나는 글
        if unsafe { CM_Get_Device_Interface_List_SizeW(&mut len, &GUID_DEVINTERFACE_USB_HUB, w.as_ptr(), CM_GET_DEVICE_INTERFACE_LIST_PRESENT) } != CR_SUCCESS || len <= 1 {
            return None;
        }
        let mut buf = vec![0u16; len as usize];
        // SAFETY: buf 는 len 글자
        let r = unsafe { CM_Get_Device_Interface_ListW(&GUID_DEVINTERFACE_USB_HUB, w.as_ptr(), buf.as_mut_ptr(), len, CM_GET_DEVICE_INTERFACE_LIST_PRESENT) };
        if r == CR_SUCCESS {
            return multi_sz(&buf).into_iter().next();
        }
        if r != CR_BUFFER_SMALL {
            return None;
        }
    }
    None
}

fn open_hub(path: &str) -> Result<File, String> {
    let open = |access: u32| std::fs::OpenOptions::new().access_mode(access).share_mode(SHARE_RW).open(path);
    open(0).or_else(|_| open(GENERIC_WRITE)).map_err(|e| e.to_string())
}

/// 같은 구조체를 넣고 받는 조회 IOCTL(METHOD_BUFFERED)
fn ioctl_bytes(f: &File, code: u32, buf: &mut [u8], in_len: usize) -> Result<usize, String> {
    let mut got = 0u32;
    // SAFETY: buf 는 len 바이트, 앞 in_len 바이트를 입력으로 넘기고 같은 버퍼로 받는다
    let ok = unsafe { DeviceIoControl(f.as_raw_handle(), code, buf.as_ptr().cast(), in_len as u32, buf.as_mut_ptr().cast(), buf.len() as u32, &mut got, std::ptr::null_mut()) } != 0;
    if ok { Ok(got as usize) } else { Err(std::io::Error::last_os_error().to_string()) }
}

/// 허브 정보 — (버스 전원인지, 포트 수)
fn hub_info(f: &File) -> Result<(bool, u32), String> {
    let mut buf = vec![0u8; std::mem::size_of::<USB_NODE_INFORMATION>()];
    let n = ioctl_bytes(f, IOCTL_USB_GET_NODE_INFORMATION, &mut buf, 0)?;
    if n < std::mem::size_of::<USB_NODE_INFORMATION>() {
        return Err(format!("short answer ({n} bytes)"));
    }
    // SAFETY: 크기를 확인한 버퍼 — 묶음(packed) 구조체라 맞춤 없이 읽는다
    let info: USB_NODE_INFORMATION = unsafe { std::ptr::read_unaligned(buf.as_ptr().cast()) };
    // SAFETY: 허브에 물었으니 HubInformation 쪽
    let hub = unsafe { info.u.HubInformation };
    Ok((hub.HubIsBusPowered, u32::from(hub.HubDescriptor.bNumberOfPorts)))
}

/// 허브 포트 하나의 연결 정보 — 협상 속도 바이트
fn port_speed(f: &File, port: u32) -> Result<u8, String> {
    let head = std::mem::size_of::<USB_NODE_CONNECTION_INFORMATION_EX>();
    // 열린 파이프 목록이 뒤에 붙는다 — 넉넉히
    let mut buf = vec![0u8; head + 32 * std::mem::size_of::<USB_PIPE_INFO>()];
    buf[..4].copy_from_slice(&port.to_le_bytes());
    let n = ioctl_bytes(f, IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX, &mut buf, head)?;
    if n < head.min(32) {
        return Err(format!("short answer ({n} bytes)"));
    }
    // SAFETY: 버퍼는 구조체보다 크다
    let c: USB_NODE_CONNECTION_INFORMATION_EX = unsafe { std::ptr::read_unaligned(buf.as_ptr().cast()) };
    Ok(c.Speed)
}

/// _V2 — SuperSpeed 동작·가능 표시(Windows 8 이후). 못 읽으면 None
fn port_flags_v2(f: &File, port: u32) -> Option<u32> {
    let size = std::mem::size_of::<USB_NODE_CONNECTION_INFORMATION_EX_V2>();
    let mut v = USB_NODE_CONNECTION_INFORMATION_EX_V2 { ConnectionIndex: port, Length: size as u32, ..Default::default() };
    // USB 1.1·2.0·3.0 을 안다고 알린다
    v.SupportedUsbProtocols.ul = 0b111;
    // SAFETY: 구조체를 바이트로 보고 넘긴다(크기 그대로)
    let mut buf = unsafe { std::slice::from_raw_parts((&v as *const USB_NODE_CONNECTION_INFORMATION_EX_V2).cast::<u8>(), size) }.to_vec();
    let n = ioctl_bytes(f, IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX_V2, &mut buf, size).ok()?;
    if n < size {
        return None;
    }
    // SAFETY: 크기를 확인한 버퍼
    let out: USB_NODE_CONNECTION_INFORMATION_EX_V2 = unsafe { std::ptr::read_unaligned(buf.as_ptr().cast()) };
    // SAFETY: 합집합의 u32 쪽
    Some(unsafe { out.Flags.ul })
}

fn is_root_hub(id: &str) -> bool {
    id.to_ascii_uppercase().starts_with(r"USB\ROOT_HUB")
}

/// 허브가 아님(No) · 열림 · 허브인데 열지 못함
enum Hub {
    No,
    Open(File),
    Failed,
}

/// 허브 인스턴스 ID → 연 허브(한 번만 연다)
#[derive(Default)]
struct Hubs(HashMap<String, Hub>);

impl Hubs {
    /// 허브인지(열기에 실패해도 허브면 true — 오류는 errors 에)
    fn is_hub(&mut self, id: &str, errors: &mut Vec<String>) -> bool {
        let e = self.0.entry(id.to_string()).or_insert_with(|| match hub_interface(id) {
            None => Hub::No,
            Some(p) => match open_hub(&p) {
                Ok(f) => Hub::Open(f),
                Err(e) => {
                    errors.push(format!("{} {id}: {e}", crate::tr!("허브 열기", "Open hub")));
                    Hub::Failed
                }
            },
        });
        !matches!(e, Hub::No)
    }
    fn file(&self, id: &str) -> Option<&File> {
        match self.0.get(id) {
            Some(Hub::Open(f)) => Some(f),
            _ => None,
        }
    }
}

/// COM 장치(devinst)의 USB 경로. 사슬에 USB 장치가 없으면 None
pub fn path(dn: u32) -> Option<UsbPath> {
    // 장치에서 위로(HTREE\ROOT 전까지)
    let mut chain: Vec<(u32, String)> = Vec::new();
    let mut cur = Some(dn);
    while let Some(d) = cur {
        let Some(id) = instance_id(d) else { break };
        if id.to_ascii_uppercase().starts_with(r"HTREE\ROOT") || chain.len() >= MAX_DEPTH {
            break;
        }
        chain.push((d, id));
        cur = parent(d);
    }
    if !chain.iter().any(|(_, id)| id.to_ascii_uppercase().starts_with(r"USB\")) {
        return None;
    }
    let mut out = UsbPath::default();
    let mut hubs = Hubs::default();
    for (i, (d, id)) in chain.iter().enumerate() {
        let d = *d;
        if out.hops.last().is_some_and(|h| h.kind == "root") {
            // 루트 허브 바로 위 = USB 호스트 컨트롤러
            out.hops.push(UsbHop { name: display_name(d, id), instance_id: id.clone(), kind: "controller", port: None, speed: None, below_capable: false, bus_powered: None, ports: None });
            break;
        }
        if !id.to_ascii_uppercase().starts_with(r"USB\") {
            continue;
        }
        let root = is_root_hub(id);
        let parent_id = chain.get(i + 1).map(|(_, p)| p.as_str());
        let parent_is_hub = parent_id.is_some_and(|p| hubs.is_hub(p, &mut out.errors));
        // 복합 장치의 인터페이스(…&MI_00)처럼 허브에 바로 꽂히지 않은 것은 건너뛴다(포트는 위 장치가 가진다)
        if !root && !parent_is_hub {
            continue;
        }
        let own_hub = hubs.is_hub(id, &mut out.errors);
        let mut hop = UsbHop {
            name: display_name(d, id),
            instance_id: id.clone(),
            kind: if root { "root" } else if own_hub { "hub" } else { "device" },
            port: None,
            speed: None,
            below_capable: false,
            bus_powered: None,
            ports: None,
        };
        if let Some(f) = hubs.file(id) {
            match hub_info(f) {
                Ok((bus, ports)) => {
                    hop.bus_powered = Some(bus);
                    hop.ports = Some(ports);
                }
                Err(e) => out.errors.push(format!("IOCTL_USB_GET_NODE_INFORMATION {id}: {e}")),
            }
        }
        if !root {
            hop.port = prop_u32(d, &DEVPKEY_Device_Address).filter(|n| *n > 0).or_else(|| prop_string(d, &DEVPKEY_Device_LocationInfo).as_deref().and_then(location_port));
            if let (Some(port), Some(f)) = (hop.port, parent_id.and_then(|p| hubs.file(p))) {
                match port_speed(f, port) {
                    Ok(sp) => {
                        let v2 = port_flags_v2(f, port);
                        hop.speed = usb_speed(sp, v2);
                        hop.below_capable = usb_below_capable(v2);
                    }
                    Err(e) => out.errors.push(format!("IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX {id}: {e}")),
                }
            }
        }
        out.hops.push(hop);
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::win::locate;

    /// 이 PC 의 USB 장치 아무거나 — 관리자 없이 허브를 열어 속도·포트를 읽는다(USB 장치가 없는 PC 면 건너뜀)
    #[test]
    fn reads_usb_path_without_admin() {
        let mut checked = 0;
        for id in super::super::win::usb_device_ids().into_iter().take(30) {
            let Some(dn) = locate(&id, false) else { continue };
            let Some(p) = path(dn) else { continue };
            assert!(p.errors.iter().all(|e| !e.contains("Open hub") && !e.contains("허브 열기")), "{:?}", p.errors);
            if let Some(first) = p.hops.first()
                && first.kind == "device"
            {
                assert!(first.port.is_some(), "{id}: 포트 번호 없음");
                assert!(first.speed.is_some(), "{id}: 속도 없음 {:?}", p.errors);
                checked += 1;
            }
            assert!(p.hops.iter().filter(|h| h.kind == "root").count() <= 1);
            if checked >= 3 {
                break;
            }
        }
        let _ = checked;
    }
}
