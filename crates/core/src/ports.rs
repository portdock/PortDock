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
    // 장치 목록에 안 잡히는 포트(모뎀으로 분류된 포트·일부 가상 포트)도 SERIALCOMM 에는 있다(0.3.0)
    with_extra(listed(), crate::portinfo::serialcomm_names())
}

/// 목록에 없는 COM 이름을 더한다 — «COMn» 모양만, 이미 있는 이름(대소문자 무시)은 빼고. 장치 정보는 없다(kind "unknown")
pub fn with_extra(mut ports: Vec<PortInfo>, names: impl IntoIterator<Item = String>) -> Vec<PortInfo> {
    for n in names {
        let n = n.trim();
        let ok = n.len() > 3 && n.len() <= 6 && n[..3].eq_ignore_ascii_case("COM") && n[3..].bytes().all(|b| b.is_ascii_digit()) && !n[3..].starts_with('0');
        if !ok || ports.iter().any(|p| p.name.eq_ignore_ascii_case(n)) {
            continue;
        }
        ports.push(PortInfo { name: format!("COM{}", &n[3..]), kind: "unknown", vid: None, pid: None, serial_number: None, manufacturer: None, product: None });
    }
    ports.sort_by_key(|a| natural_key(&a.name));
    ports
}

fn listed() -> Vec<PortInfo> {
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
    fn extra_names_from_serialcomm() {
        let usb = PortInfo { name: "COM3".into(), kind: "usb", vid: Some(1), pid: Some(2), serial_number: None, manufacturer: None, product: Some("X".into()) };
        let v = with_extra(vec![usb.clone()], ["com3", "COM12", "COM2", " COM12 ", "COM0", "COM", r"\Device\Serial0", "COM1234", "COM05"].map(String::from));
        let names: Vec<&str> = v.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, ["COM2", "COM3", "COM12"]);
        // 이미 있던 포트는 장치 정보 그대로
        assert_eq!(v[1], usb);
        assert_eq!(v[2].kind, "unknown");
        assert!(with_extra(Vec::new(), Vec::<String>::new()).is_empty());
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
