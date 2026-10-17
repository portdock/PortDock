//! 포트 목록 — COM 번호만이 아니라 장치 이름·USB 정보까지.

use serde::Serialize;
use serialport::{SerialPortType, available_ports};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PortInfo {
    pub name: String,
    /// "usb" | "pci" | "bluetooth" | "unknown"
    pub kind: &'static str,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
}

impl PortInfo {
    /// 다시 꽂았을 때 같은 장치인지 알아보는 열쇠. USB 일련번호가 있으면 그것,
    /// 없으면 VID:PID, 그것도 없으면 포트 이름.
    pub fn identity(&self) -> String {
        match (&self.serial_number, self.vid, self.pid) {
            (Some(sn), Some(v), Some(p)) if !sn.is_empty() => format!("{v:04X}:{p:04X}:{sn}"),
            (_, Some(v), Some(p)) => format!("{v:04X}:{p:04X}@{}", self.name),
            _ => self.name.clone(),
        }
    }
}

pub fn list() -> Vec<PortInfo> {
    let mut ports: Vec<PortInfo> = available_ports()
        .unwrap_or_default()
        .into_iter()
        // 맥은 같은 장치가 /dev/tty.* 와 /dev/cu.* 로 두 번 나온다 — cu 만 쓴다
        .filter(|p| !p.port_name.starts_with("/dev/tty.") || cfg!(not(target_os = "macos")))
        .map(|p| match p.port_type {
            SerialPortType::UsbPort(u) => PortInfo {
                name: p.port_name,
                kind: "usb",
                vid: Some(u.vid),
                pid: Some(u.pid),
                serial_number: u.serial_number,
                manufacturer: u.manufacturer,
                product: u.product,
            },
            other => PortInfo {
                name: p.port_name,
                kind: match other {
                    SerialPortType::PciPort => "pci",
                    SerialPortType::BluetoothPort => "bluetooth",
                    _ => "unknown",
                },
                vid: None,
                pid: None,
                serial_number: None,
                manufacturer: None,
                product: None,
            },
        })
        .collect();
    ports.sort_by_key(|a| natural_key(&a.name));
    ports
}

/// COM2 가 COM10 앞에 오도록
fn natural_key(name: &str) -> (String, u32) {
    let digits: String = name.chars().rev().take_while(|c| c.is_ascii_digit()).collect();
    let num = digits.chars().rev().collect::<String>().parse().unwrap_or(0);
    (name.trim_end_matches(|c: char| c.is_ascii_digit()).to_string(), num)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn natural_sort() {
        let mut v = vec!["COM10", "COM2", "COM1"];
        v.sort_by_key(|n| natural_key(n));
        assert_eq!(v, vec!["COM1", "COM2", "COM10"]);
    }

    #[test]
    fn identity_prefers_serial_number() {
        let mut p = PortInfo {
            name: "COM5".into(),
            kind: "usb",
            vid: Some(0x0403),
            pid: Some(0x6001),
            serial_number: Some("A12345".into()),
            manufacturer: None,
            product: None,
        };
        assert_eq!(p.identity(), "0403:6001:A12345");
        p.serial_number = None;
        assert_eq!(p.identity(), "0403:6001@COM5");
    }
}
