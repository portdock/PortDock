//! Modbus RTU 프레임 풀이. 방향을 모르므로 길이로 요청/응답을 가린다.

use crate::checksum::ChecksumKind;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ModbusInfo {
    pub slave: u8,
    pub function: u8,
    pub function_name: &'static str,
    /// "request" | "response" | "exception" | "unknown"
    pub kind: &'static str,
    pub crc_ok: bool,
    /// 사람이 읽는 항목 (이름, 값)
    pub fields: Vec<(String, String)>,
    /// 레지스터 값(03·04 응답, 10 요청) 또는 코일 비트(01·02 응답, 0F 요청)
    pub values: Vec<u16>,
}

fn function_name(f: u8) -> &'static str {
    match f & 0x7F {
        0x01 => "Read Coils",
        0x02 => "Read Discrete Inputs",
        0x03 => "Read Holding Registers",
        0x04 => "Read Input Registers",
        0x05 => "Write Single Coil",
        0x06 => "Write Single Register",
        0x0F => "Write Multiple Coils",
        0x10 => "Write Multiple Registers",
        0x17 => "Read/Write Multiple Registers",
        _ => "Unknown",
    }
}

fn exception_name(code: u8) -> &'static str {
    match code {
        0x01 => "Illegal Function",
        0x02 => "Illegal Data Address",
        0x03 => "Illegal Data Value",
        0x04 => "Server Device Failure",
        0x05 => "Acknowledge",
        0x06 => "Server Device Busy",
        0x08 => "Memory Parity Error",
        0x0A => "Gateway Path Unavailable",
        0x0B => "Gateway Target Failed to Respond",
        _ => "Unknown",
    }
}

fn u16_at(b: &[u8], i: usize) -> u16 {
    u16::from_be_bytes([b[i], b[i + 1]])
}

fn bits(bytes: &[u8], count: usize) -> Vec<u16> {
    (0..count).map(|i| ((bytes[i / 8] >> (i % 8)) & 1) as u16).collect()
}

fn regs(bytes: &[u8]) -> Vec<u16> {
    bytes.as_chunks::<2>().0.iter().map(|c| u16::from_be_bytes([c[0], c[1]])).collect()
}

pub fn decode(frame: &[u8]) -> Option<ModbusInfo> {
    if frame.len() < 4 {
        return None;
    }
    let crc_ok = ChecksumKind::Crc16Modbus.verify(frame) == Some(true);
    let pdu = &frame[1..frame.len() - 2];
    let (slave, function) = (frame[0], frame[1]);
    let mut info = ModbusInfo {
        slave,
        function,
        function_name: function_name(function),
        kind: "unknown",
        crc_ok,
        fields: Vec::new(),
        values: Vec::new(),
    };
    let field = |k: &str, v: String| (k.to_string(), v);

    if function & 0x80 != 0 && pdu.len() == 2 {
        info.kind = "exception";
        info.fields.push(field("exception", format!("0x{:02X} {}", pdu[1], exception_name(pdu[1]))));
        return Some(info);
    }
    match (function, pdu.len()) {
        // FC01·02 응답 바이트수 3 이면 요청과 길이가 같다 — 둘 다 보여 준다
        (0x01 | 0x02, 5) if pdu[1] == 3 => {
            info.kind = "request or response";
            info.fields.push(field("as request: start", u16_at(pdu, 1).to_string()));
            info.fields.push(field("as request: quantity", u16_at(pdu, 3).to_string()));
            info.fields.push(field("as response: byte count", "3".into()));
            info.values = bits(&pdu[2..], 24);
        }
        // 읽기 요청: 함수 + 시작주소 + 개수
        (0x01..=0x04, 5) => {
            info.kind = "request";
            info.fields.push(field("start", u16_at(pdu, 1).to_string()));
            info.fields.push(field("quantity", u16_at(pdu, 3).to_string()));
        }
        // 읽기 응답: 함수 + 바이트수 + 데이터
        (0x01..=0x04, n) if n >= 2 && pdu[1] as usize == n - 2 => {
            info.kind = "response";
            let data = &pdu[2..];
            info.fields.push(field("byte count", pdu[1].to_string()));
            info.values = if function <= 0x02 { bits(data, data.len() * 8) } else { regs(data) };
        }
        (0x05 | 0x06, 5) => {
            info.kind = "request/response";
            info.fields.push(field("address", u16_at(pdu, 1).to_string()));
            let v = u16_at(pdu, 3);
            let shown = if function == 0x05 {
                match v {
                    0xFF00 => "ON".to_string(),
                    0x0000 => "OFF".to_string(),
                    _ => format!("0x{v:04X} (invalid)"),
                }
            } else {
                v.to_string()
            };
            info.fields.push(field("value", shown));
            info.values = vec![v];
        }
        // 다중 쓰기 응답: 함수 + 시작주소 + 개수
        (0x0F | 0x10, 5) => {
            info.kind = "response";
            info.fields.push(field("start", u16_at(pdu, 1).to_string()));
            info.fields.push(field("quantity", u16_at(pdu, 3).to_string()));
        }
        // 다중 쓰기 요청: 함수 + 시작 + 개수 + 바이트수 + 데이터
        (0x0F | 0x10, n) if n >= 6 && pdu[5] as usize == n - 6 => {
            info.kind = "request";
            let qty = u16_at(pdu, 3) as usize;
            info.fields.push(field("start", u16_at(pdu, 1).to_string()));
            info.fields.push(field("quantity", qty.to_string()));
            let data = &pdu[6..];
            info.values = if function == 0x0F { bits(data, qty.min(data.len() * 8)) } else { regs(data) };
        }
        _ => {}
    }
    Some(info)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_crc(body: &[u8]) -> Vec<u8> {
        let mut v = body.to_vec();
        v.extend(ChecksumKind::Crc16Modbus.compute(body));
        v
    }

    #[test]
    fn read_holding_request_and_response() {
        let req = decode(&with_crc(&[0x01, 0x03, 0x00, 0x6B, 0x00, 0x03])).unwrap();
        assert_eq!(req.kind, "request");
        assert!(req.crc_ok);
        assert_eq!(req.fields[0], ("start".into(), "107".into()));

        let resp = decode(&with_crc(&[0x01, 0x03, 0x06, 0x02, 0x2B, 0x00, 0x00, 0x00, 0x64])).unwrap();
        assert_eq!(resp.kind, "response");
        assert_eq!(resp.values, vec![555, 0, 100]);
    }

    #[test]
    fn ambiguous_coil_response() {
        let f = decode(&with_crc(&[0x01, 0x01, 0x03, 0xFF, 0x00, 0x01])).unwrap();
        assert_eq!(f.kind, "request or response");
        assert_eq!(f.values.len(), 24);
    }

    #[test]
    fn exception_and_bad_crc() {
        let ex = decode(&with_crc(&[0x01, 0x83, 0x02])).unwrap();
        assert_eq!(ex.kind, "exception");
        assert!(ex.fields[0].1.contains("Illegal Data Address"));

        let mut bad = with_crc(&[0x01, 0x06, 0x00, 0x01, 0x00, 0x03]);
        bad[5] = 0x04;
        assert!(!decode(&bad).unwrap().crc_ok);
    }

    #[test]
    fn write_multiple_registers_request() {
        let req = decode(&with_crc(&[0x01, 0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02])).unwrap();
        assert_eq!(req.kind, "request");
        assert_eq!(req.values, vec![10, 258]);
    }
}
