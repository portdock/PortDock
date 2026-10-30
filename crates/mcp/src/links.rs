//! 통로 — Modbus 마스터(core modbus_master::Link)가 쓰는 TCP·시리얼 통로, 시리얼 포트 열기.
//! 호출 하나마다 열고 닫는다(열어 둔 채 두지 않는다).

use portdock_core::modbus_master::Link;
use serde::Deserialize;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

/// TCP 통로(Modbus TCP·RTU over TCP)
pub struct TcpLink(TcpStream);

impl TcpLink {
    pub fn connect(addr: SocketAddr, timeout: Duration) -> Result<Self, String> {
        let s = TcpStream::connect_timeout(&addr, timeout).map_err(|e| format!("{addr}: {}", portdock_core::oserr::net(&e)))?;
        let _ = s.set_nodelay(true);
        s.set_write_timeout(Some(timeout)).map_err(|e| e.to_string())?;
        Ok(Self(s))
    }
}

impl Link for TcpLink {
    fn send(&mut self, bytes: &[u8]) -> Result<(), String> {
        self.0.write_all(bytes).map_err(|e| portdock_core::oserr::net(&e))
    }

    fn recv(&mut self, wait: Duration) -> Option<Vec<u8>> {
        self.0.set_read_timeout(Some(wait.max(Duration::from_millis(1)))).ok()?;
        let mut b = [0u8; 1024];
        match self.0.read(&mut b) {
            Ok(n) if n > 0 => Some(b[..n].to_vec()),
            // 끊김 — 기다리는 시간만큼 쉬어 헛돌지 않게(Master 가 타임아웃으로 끝낸다)
            Ok(_) => {
                std::thread::sleep(wait);
                None
            }
            Err(_) => None,
        }
    }

    fn clear(&mut self) {
        let _ = self.0.set_nonblocking(true);
        let mut b = [0u8; 1024];
        while matches!(self.0.read(&mut b), Ok(n) if n > 0) {}
        let _ = self.0.set_nonblocking(false);
    }
}

/// 시리얼 통로(Modbus RTU)
pub struct SerialLink(Box<dyn serialport::SerialPort>);

impl SerialLink {
    pub fn open(o: &SerialOpts) -> Result<Self, String> {
        open_serial(o).map(Self)
    }
}

impl Link for SerialLink {
    fn send(&mut self, bytes: &[u8]) -> Result<(), String> {
        self.0.write_all(bytes).map_err(|e| portdock_core::oserr::serial_io(&e))
    }

    fn recv(&mut self, wait: Duration) -> Option<Vec<u8>> {
        self.0.set_timeout(wait.max(Duration::from_millis(1))).ok()?;
        let mut b = [0u8; 1024];
        match self.0.read(&mut b) {
            Ok(n) if n > 0 => Some(b[..n].to_vec()),
            _ => None,
        }
    }

    fn clear(&mut self) {
        let _ = self.0.clear(serialport::ClearBuffer::Input);
    }
}

/// Serial parity: none (default), odd or even
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, serde::Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum Parity {
    #[default]
    None,
    Odd,
    Even,
}

/// 시리얼 설정 — 도구 인자에서 모은 값
#[derive(Debug, Clone)]
pub struct SerialOpts {
    pub port: String,
    pub baud: u32,
    pub data_bits: u8,
    pub parity: Parity,
    pub stop_bits: u8,
    /// None 이면 드라이버 기본값을 그대로 둔다
    pub dtr: Option<bool>,
    pub rts: Option<bool>,
}

impl SerialOpts {
    pub fn check(&self) -> Result<(), String> {
        let p = self.port.trim();
        let com = p.len() > 3 && p[..3].eq_ignore_ascii_case("COM") && p[3..].bytes().all(|b| b.is_ascii_digit());
        if !com {
            return Err(format!("serial port must look like «COM3», not «{p}» / 포트 이름은 «COM3» 꼴입니다"));
        }
        if !(50..=4_000_000).contains(&self.baud) {
            return Err("baud must be 50–4000000 / 통신 속도는 50~4000000".into());
        }
        if !matches!(self.data_bits, 7 | 8) {
            return Err("data_bits must be 7 or 8 / 데이터 비트는 7 또는 8".into());
        }
        if !matches!(self.stop_bits, 1 | 2) {
            return Err("stop_bits must be 1 or 2 / 정지 비트는 1 또는 2".into());
        }
        Ok(())
    }
}

/// 시리얼 포트 열기 — 설정 검사 뒤. 다른 프로그램이 쥐고 있으면 core 의 안내 문구로 실패
pub fn open_serial(o: &SerialOpts) -> Result<Box<dyn serialport::SerialPort>, String> {
    o.check()?;
    let port = o.port.trim();
    let mut p = serialport::new(port, o.baud)
        .data_bits(if o.data_bits == 7 { serialport::DataBits::Seven } else { serialport::DataBits::Eight })
        .parity(match o.parity {
            Parity::None => serialport::Parity::None,
            Parity::Odd => serialport::Parity::Odd,
            Parity::Even => serialport::Parity::Even,
        })
        .stop_bits(if o.stop_bits == 2 { serialport::StopBits::Two } else { serialport::StopBits::One })
        .flow_control(serialport::FlowControl::None)
        .timeout(Duration::from_millis(50))
        .open()
        .map_err(|e| {
            let listed = portdock_core::ports::list().iter().any(|x| x.name.eq_ignore_ascii_case(port));
            format!("{port}: {}", portdock_core::oserr::serial_open(&e, listed))
        })?;
    if let Some(on) = o.dtr {
        let _ = p.write_data_terminal_ready(on);
    }
    if let Some(on) = o.rts {
        let _ = p.write_request_to_send(on);
    }
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(port: &str) -> SerialOpts {
        SerialOpts { port: port.into(), baud: 9600, data_bits: 8, parity: Parity::None, stop_bits: 1, dtr: None, rts: None }
    }

    #[test]
    fn serial_settings_checked_before_open() {
        assert!(opts("COM3").check().is_ok());
        assert!(opts("com12").check().is_ok());
        for bad in ["", "COM", "/dev/ttyS0", "\\\\.\\COM3", "LPT1", "COM3x"] {
            assert!(opts(bad).check().is_err(), "{bad}");
        }
        assert!(SerialOpts { baud: 10, ..opts("COM3") }.check().is_err());
        assert!(SerialOpts { data_bits: 5, ..opts("COM3") }.check().is_err());
        assert!(SerialOpts { stop_bits: 3, ..opts("COM3") }.check().is_err());
    }
}
