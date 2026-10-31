//! (0.10.0) 저장장치 수명 — 디스크 장치 인터페이스(GUID_DEVINTERFACE_DISK)를 접근 권한 0 으로 열고 «조회» IOCTL 만 부른다
//! (IOCTL_STORAGE_GET_DEVICE_NUMBER · IOCTL_STORAGE_QUERY_PROPERTY — 둘 다 FILE_ANY_ACCESS).
//! - 버스 종류: StorageDeviceProperty 의 머리(36 바이트)만 받는다 — 그 뒤의 제조사·모델·일련번호 글은 받지 않는다
//! - NVMe: StorageDeviceProtocolSpecificProperty 로 SMART/Health 로그(0x02)
//! - SATA: 같은 방식으로 ATA 장치 통계 로그(0x04)를 «시도» — 거부되면 «관리자만 읽을 수 있음» 으로 두고 다른 길로 돌아가지 않는다
//! - 모델 이름: 디스크 장치의 장치 관리자 이름(CfgMgr32)
//!
//! 쓰는 IOCTL·SMART 명령(패스스루)은 부르지 않는다.

use super::pchealth::{ata_health, bus_kind, interface_instance_id, nvme_health, protocol_query, protocol_reply};
use super::win::{display_name, locate, multi_sz};
use super::PcDisk;
use std::fs::File;
use std::os::windows::fs::OpenOptionsExt;
use std::os::windows::io::AsRawHandle;
use windows_sys::Win32::Devices::DeviceAndDriverInstallation::{CM_GET_DEVICE_INTERFACE_LIST_PRESENT, CM_Get_Device_Interface_List_SizeW, CM_Get_Device_Interface_ListW, CR_BUFFER_SMALL, CR_SUCCESS};
use windows_sys::Win32::Foundation::ERROR_ACCESS_DENIED;
use windows_sys::Win32::System::IO::DeviceIoControl;
use windows_sys::core::GUID;

/// GUID_DEVINTERFACE_DISK
const DISK_INTERFACE: GUID = GUID::from_u128(0x53f56307_b6bf_11d0_94f2_00a0c91efb8b);
/// CTL_CODE(IOCTL_STORAGE_BASE, 0x0500, METHOD_BUFFERED, FILE_ANY_ACCESS)
const IOCTL_STORAGE_QUERY_PROPERTY: u32 = 0x002D_1400;
/// CTL_CODE(IOCTL_STORAGE_BASE, 0x0420, METHOD_BUFFERED, FILE_ANY_ACCESS)
const IOCTL_STORAGE_GET_DEVICE_NUMBER: u32 = 0x002D_1080;
const SHARE_RW: u32 = 0x1 | 0x2;
/// STORAGE_DEVICE_DESCRIPTOR 에서 BusType 까지(RawPropertiesLength 포함) — 글 영역(모델·일련번호)은 받지 않는다
const DESCRIPTOR_HEAD: usize = 36;

fn interfaces() -> Vec<String> {
    for _ in 0..3 {
        let mut len = 0u32;
        // SAFETY: len 은 쓰기 가능한 u32, 장치 ID 는 널(모든 디스크)
        if unsafe { CM_Get_Device_Interface_List_SizeW(&mut len, &DISK_INTERFACE, std::ptr::null(), CM_GET_DEVICE_INTERFACE_LIST_PRESENT) } != CR_SUCCESS || len <= 1 {
            return Vec::new();
        }
        let mut buf = vec![0u16; len as usize];
        // SAFETY: buf 는 len 글자
        let r = unsafe { CM_Get_Device_Interface_ListW(&DISK_INTERFACE, std::ptr::null(), buf.as_mut_ptr(), len, CM_GET_DEVICE_INTERFACE_LIST_PRESENT) };
        if r == CR_SUCCESS {
            return multi_sz(&buf);
        }
        if r != CR_BUFFER_SMALL {
            return Vec::new();
        }
    }
    Vec::new()
}

/// 넣은 버퍼를 그대로 받는 조회 IOCTL. Err = Windows 오류 번호
fn ioctl(f: &File, code: u32, input: &[u8], out: &mut [u8]) -> Result<usize, i32> {
    let mut got = 0u32;
    // SAFETY: input·out 은 각자 길이만큼 유효
    let ok = unsafe { DeviceIoControl(f.as_raw_handle(), code, input.as_ptr().cast(), input.len() as u32, out.as_mut_ptr().cast(), out.len() as u32, &mut got, std::ptr::null_mut()) } != 0;
    if ok { Ok(got as usize) } else { Err(std::io::Error::last_os_error().raw_os_error().unwrap_or(-1)) }
}

fn os_text(code: i32) -> String {
    std::io::Error::from_raw_os_error(code).to_string()
}

/// 로그 페이지 하나 — (프로토콜, 데이터 종류, 로그, 페이지)
fn log_page(f: &File, protocol: u32, log: u32, page: u32) -> Result<Vec<u8>, i32> {
    let q = protocol_query(protocol, 2, log, page, 512);
    let mut out = vec![0u8; q.len()];
    let n = ioctl(f, IOCTL_STORAGE_QUERY_PROPERTY, &q, &mut out)?;
    out.truncate(n);
    protocol_reply(&out).map(<[u8]>::to_vec).ok_or(-1)
}

/// 거부(관리자만) · 다른 실패
fn failed(code: i32) -> (&'static str, Option<String>) {
    if code == ERROR_ACCESS_DENIED as i32 { ("adminOnly", None) } else { ("unsupported", Some(if code < 0 { "short answer".to_string() } else { os_text(code) })) }
}

fn read_one(path: &str) -> Option<PcDisk> {
    // 접근 권한 0 — 조회 IOCTL(FILE_ANY_ACCESS)만 된다. 읽기·쓰기 핸들은 열지 않는다
    let f = std::fs::OpenOptions::new().access_mode(0).share_mode(SHARE_RW).open(path).ok()?;
    let mut num = [0u8; 12];
    let index = match ioctl(&f, IOCTL_STORAGE_GET_DEVICE_NUMBER, &[], &mut num) {
        Ok(n) if n >= 8 => u32::from_le_bytes(num[4..8].try_into().ok()?),
        _ => return None,
    };
    let model = interface_instance_id(path).and_then(|id| locate(&id, false).map(|dn| display_name(dn, &id)).filter(|n| *n != id));
    // StorageDeviceProperty(0), PropertyStandardQuery(0) — 머리만 받는다
    let mut head = [0u8; DESCRIPTOR_HEAD];
    let bus = match ioctl(&f, IOCTL_STORAGE_QUERY_PROPERTY, &[0u8; 12], &mut head) {
        Ok(n) if n >= 32 => bus_kind(u32::from_le_bytes(head[28..32].try_into().ok()?)),
        _ => "other",
    };
    let mut d = PcDisk { index, model, bus, state: "unsupported", health: None, error: None };
    match bus {
        "nvme" => match log_page(&f, 3, 2, 0) {
            Ok(log) => match nvme_health(&log) {
                Some(h) => {
                    d.state = "ok";
                    d.health = Some(h);
                }
                None => {
                    d.state = "error";
                    d.error = Some("short answer".into());
                }
            },
            Err(c) => (d.state, d.error) = failed(c),
        },
        "sata" => {
            // 장치 통계 로그 0x04 — 1 일반 · 4 오류 · 5 온도 · 7 SSD. 첫 페이지가 거부되면 더 묻지 않는다
            match log_page(&f, 2, 4, 1) {
                Ok(general) => {
                    let page = |p| log_page(&f, 2, 4, p).ok();
                    let (errs, temp, ssd) = (page(4), page(5), page(7));
                    match ata_health(Some(&general), errs.as_deref(), temp.as_deref(), ssd.as_deref()) {
                        Some(h) => {
                            d.state = "ok";
                            d.health = Some(h);
                        }
                        None => d.state = "unsupported",
                    }
                }
                Err(c) => (d.state, d.error) = failed(c),
            }
        }
        _ => {}
    }
    Some(d)
}

/// 이 PC 디스크들(번호순)
pub fn read() -> Vec<PcDisk> {
    let mut out: Vec<PcDisk> = interfaces().iter().filter_map(|p| read_one(p)).collect();
    out.sort_by_key(|d| d.index);
    out.dedup_by_key(|d| d.index);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 이 PC 디스크를 관리자 없이 읽는다 — NVMe 가 있으면 상태 로그가 읽혀야 한다. 모델·일련번호는 찍지 않는다
    #[test]
    #[ignore = "이 PC 의 실제 디스크를 읽는다 — cargo test -- --ignored 로"]
    fn reads_disks_without_admin() {
        let disks = read();
        assert!(!disks.is_empty(), "디스크가 하나도 없음");
        for d in &disks {
            if d.bus == "nvme" {
                assert_eq!(d.state, "ok", "NVMe 디스크 {} 상태 로그: {:?}", d.index, d.error);
                let h = d.health.as_ref().unwrap();
                assert!(h.temperature_c.is_some_and(|t| (0..120).contains(&t)) && h.percentage_used.is_some() && h.power_on_hours.is_some());
            }
            println!("디스크 {} · {} · {}", d.index, d.bus, d.state);
        }
    }
}
