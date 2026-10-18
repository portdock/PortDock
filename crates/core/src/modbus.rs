//! Modbus 프레임 풀이. `decode` 는 방향을 모르는 RTU 프레임을 길이로 요청/응답을 가리고,
//! `Summarizer` 는 방향을 아는 통신 기록 한 줄을 사람이 읽는 한 줄 요약으로 만든다(RTU·TCP).

use crate::checksum::ChecksumKind;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
        0x08 => "Diagnostics",
        0x16 => "Mask Write Register",
        0x17 => "Read/Write Multiple Registers",
        0x2B => "Read Device Identification",
        _ => "Unknown",
    }
}

pub fn exception_name(code: u8) -> &'static str {
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
        // 마스크 쓰기: 요청·응답이 같다
        (0x16, 7) => {
            info.kind = "request/response";
            info.fields.push(field("address", u16_at(pdu, 1).to_string()));
            info.fields.push(field("and mask", format!("0x{:04X}", u16_at(pdu, 3))));
            info.fields.push(field("or mask", format!("0x{:04X}", u16_at(pdu, 5))));
        }
        // 읽기/쓰기 요청: 읽기 시작·개수, 쓰기 시작·개수, 바이트수, 데이터
        (0x17, n) if n >= 10 && pdu[9] as usize == n - 10 => {
            info.kind = "request";
            info.fields.push(field("read start", u16_at(pdu, 1).to_string()));
            info.fields.push(field("read quantity", u16_at(pdu, 3).to_string()));
            info.fields.push(field("write start", u16_at(pdu, 5).to_string()));
            info.fields.push(field("write quantity", u16_at(pdu, 7).to_string()));
            info.values = regs(&pdu[10..]);
        }
        (0x17, n) if n >= 2 && pdu[1] as usize == n - 2 => {
            info.kind = "response";
            info.fields.push(field("byte count", pdu[1].to_string()));
            info.values = regs(&pdu[2..]);
        }
        // 진단: 하위 함수 + 데이터(00 이면 그대로 되돌아온다 — 요청·응답이 같다)
        (0x08, n) if n >= 3 => {
            info.kind = "request/response";
            let sub = u16_at(pdu, 1);
            info.fields.push(field("sub-function", format!("0x{sub:04X}{}", if sub == 0 { " Return Query Data" } else { "" })));
            info.values = regs(&pdu[3..]);
        }
        (0x2B, 4) if pdu[1] == 0x0E => {
            info.kind = "request";
            info.fields.push(field("read device id code", pdu[2].to_string()));
            info.fields.push(field("object id", pdu[3].to_string()));
        }
        (0x2B, n) if n >= 7 && pdu[1] == 0x0E => {
            info.kind = "response";
            info.fields.push(field("conformity", format!("0x{:02X}", pdu[3])));
            for (id, text) in device_objects(&pdu[1..]) {
                info.fields.push(field(&format!("object {id}"), text));
            }
        }
        _ => {}
    }
    Some(info)
}

/// 2B/0E 응답(MEI 부터)의 객체들 (번호, 글자). 모양이 틀린 뒷부분은 버린다
fn device_objects(p: &[u8]) -> Vec<(u8, String)> {
    let mut out = Vec::new();
    let Some(&n) = p.get(5) else { return out };
    let mut i = 6;
    for _ in 0..n {
        let (Some(&id), Some(&len)) = (p.get(i), p.get(i + 1)) else { break };
        let Some(b) = p.get(i + 2..i + 2 + len as usize) else { break };
        out.push((id, String::from_utf8_lossy(b).into_owned()));
        i += 2 + len as usize;
    }
    out
}

// ---------------------------------------------------------------- 통신 기록 요약

/// 프레임 모양 — RTU(국번 + PDU + CRC) 또는 Modbus TCP(MBAP + PDU)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Wire {
    #[default]
    Rtu,
    Tcp,
}

/// 주소를 어떻게 보일지 — 0 기준·1 기준, 또는 PLC 표기(40001 식)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddrStyle {
    #[serde(default)]
    pub base: u16,
    #[serde(default)]
    pub plc: bool,
}

/// 표 짧은 이름과 PLC 앞자리
fn table_of(func: u8) -> Option<(&'static str, u32)> {
    Some(match func {
        0x01 | 0x05 | 0x0F => ("CO", 0),
        0x02 => ("DI", 1),
        0x03 | 0x06 | 0x10 | 0x16 | 0x17 => ("HR", 4),
        0x04 => ("IR", 3),
        _ => return None,
    })
}

impl AddrStyle {
    /// 주소 하나 — PLC 표기는 9999 까지 5자리(40001), 넘으면 6자리(410000)
    pub fn addr(&self, prefix: u32, a: u32) -> String {
        if self.plc {
            if a < 9999 { format!("{prefix}{:04}", a + 1) } else { format!("{prefix}{:05}", a + 1) }
        } else {
            (a + self.base as u32).to_string()
        }
    }

    fn span(&self, prefix: u32, start: u32, qty: u32) -> String {
        if qty <= 1 {
            self.addr(prefix, start)
        } else {
            format!("{}..{}", self.addr(prefix, start), self.addr(prefix, start + qty - 1))
        }
    }
}

/// 값 목록 — 앞의 몇 개만(뒤는 «…»)
fn list(vals: &[u16], max: usize) -> String {
    let mut s: Vec<String> = vals.iter().take(max).map(|v| v.to_string()).collect();
    if vals.len() > max {
        s.push("…".into());
    }
    s.join(", ")
}

/// 예외 코드의 뜻(한국어는 짧은 뜻 + 영어 이름)
pub fn exception_text(code: u8) -> String {
    let ko = match code {
        0x01 => "지원하지 않는 함수",
        0x02 => "없는 주소",
        0x03 => "잘못된 값",
        0x04 => "장비 고장",
        0x05 => "받음(처리 중)",
        0x06 => "장비 바쁨",
        0x08 => "메모리 패리티 오류",
        0x0A => "게이트웨이 경로 없음",
        0x0B => "게이트웨이 대상 응답 없음",
        _ => "알 수 없음",
    };
    crate::tr!(format!("예외 {code:02X} {ko} ({})", exception_name(code)), format!("exception {code:02X} {}", exception_name(code)))
}

/// 방향을 아는 통신 기록 줄을 한 줄 요약으로. 응답 줄은 같은 상대의 직전 요청과 짝지어 주소를 붙인다.
#[derive(Debug, Default)]
pub struct Summarizer {
    pub wire: Wire,
    pub style: AddrStyle,
    /// 상대(시리얼은 "") → 마지막 요청(유닛, PDU)
    last: HashMap<String, (u8, Vec<u8>)>,
}

impl Summarizer {
    pub fn new(wire: Wire, style: AddrStyle) -> Self {
        Self { wire, style, last: HashMap::new() }
    }

    /// 프레임 → (머리 글자, 유닛, PDU). 모양이 틀리면 Err(이유)
    fn split<'a>(&self, b: &'a [u8]) -> Result<(String, u8, &'a [u8]), String> {
        match self.wire {
            Wire::Rtu => {
                if b.len() < 4 || ChecksumKind::Crc16Modbus.verify(b) != Some(true) {
                    return Err(crate::tr!("CRC 오류 — 무시", "bad CRC — ignored").into());
                }
                Ok((String::new(), b[0], &b[1..b.len() - 2]))
            }
            Wire::Tcp => {
                let ok = b.len() >= 8 && b[2] == 0 && b[3] == 0 && u16::from_be_bytes([b[4], b[5]]) as usize == b.len() - 6;
                if !ok {
                    return Err(crate::tr!("MBAP 머리가 틀림 — 무시", "bad MBAP header — ignored").into());
                }
                Ok((format!("#{} ", u16::from_be_bytes([b[0], b[1]])), b[6], &b[7..]))
            }
        }
    }

    /// 한 줄 요약. dir: "rx"(마스터 요청) · "tx"(우리 응답). 그 밖은 None
    pub fn line(&mut self, dir: &str, bytes: &[u8], peer: Option<&str>) -> Option<String> {
        if !matches!(dir, "rx" | "tx") || bytes.is_empty() {
            return None;
        }
        let (head, unit, pdu) = match self.split(bytes) {
            Ok(x) => x,
            Err(why) => return Some(why),
        };
        let key = peer.unwrap_or("").to_string();
        if dir == "rx" {
            let s = format!("{head}{}", self.request(unit, pdu));
            self.last.insert(key, (unit, pdu.to_vec()));
            return Some(s);
        }
        let fc = pdu.first().map(|f| f & 0x7F);
        let req = self.last.get(&key).filter(|(u, p)| *u == unit && p.first().copied() == fc).map(|(_, p)| p.clone());
        Some(format!("{head}{}", self.response(unit, req.as_deref(), pdu)))
    }

    /// 요청 요약 «id1 FC03 HR 0..9 (10)», «id1 FC10 HR 100..101 ← 1, 2»
    pub fn request(&self, unit: u8, pdu: &[u8]) -> String {
        let Some(&f) = pdu.first() else { return format!("id{unit}") };
        let st = self.style;
        let u = |i: usize| pdu.get(i..i + 2).map(|b| u16::from_be_bytes([b[0], b[1]]) as u32);
        let what = match (f, table_of(f), u(1), u(3)) {
            (0x01..=0x04, Some((t, p)), Some(a), Some(n)) => format!("{t} {} ({n})", st.span(p, a, n)),
            (0x05, Some((t, p)), Some(a), Some(v)) => {
                let on = match v {
                    0xFF00 => "ON".to_string(),
                    0 => "OFF".to_string(),
                    _ => format!("0x{v:04X}?"),
                };
                format!("{t} {} ← {on}", st.addr(p, a))
            }
            (0x06, Some((t, p)), Some(a), Some(v)) => format!("{t} {} ← {v}", st.addr(p, a)),
            (0x0F, Some((t, p)), Some(a), Some(n)) if pdu.len() > 6 => {
                let b = bits(&pdu[6..], (n as usize).min((pdu.len() - 6) * 8));
                format!("{t} {} ← {}", st.span(p, a, n), list(&b, 16))
            }
            (0x10, Some((t, p)), Some(a), Some(n)) if pdu.len() > 6 => format!("{t} {} ← {}", st.span(p, a, n), list(&regs(&pdu[6..]), 8)),
            (0x16, Some((t, p)), Some(a), Some(and)) => format!("{t} {} AND 0x{and:04X} OR 0x{:04X}", st.addr(p, a), u(5).unwrap_or(0)),
            (0x17, Some((t, p)), Some(a), Some(n)) if pdu.len() > 10 => {
                let (wa, wn) = (u(5).unwrap_or(0), u(7).unwrap_or(0));
                format!("{t} R {} ({n}) · W {} ← {}", st.span(p, a, n), st.span(p, wa, wn), list(&regs(&pdu[10..]), 8))
            }
            (0x08, _, Some(sub), _) => {
                if sub == 0 {
                    crate::tr!("되돌려 보내기(08/00)", "Return Query Data (08/00)").to_string()
                } else {
                    format!("sub 0x{sub:04X}")
                }
            }
            (0x2B, _, _, _) if pdu.get(1) == Some(&0x0E) => {
                let (code, obj) = (pdu.get(2).copied().unwrap_or(0), pdu.get(3).copied().unwrap_or(0));
                crate::tr!(format!("장치 식별 코드 {code} 객체 {obj}"), format!("Device ID code {code} object {obj}"))
            }
            _ => function_name(f).to_string(),
        };
        format!("id{unit} FC{f:02X} {what}")
    }

    /// 응답 요약 «id1 FC03 HR 0..9 → 정상: 1, 2, …», «… → 예외 02 없는 주소 (Illegal Data Address)»
    pub fn response(&self, unit: u8, req: Option<&[u8]>, pdu: &[u8]) -> String {
        let Some(&f) = pdu.first() else { return format!("id{unit}") };
        let st = self.style;
        let fc = f & 0x7F;
        let ru = |i: usize| req.and_then(|r| r.get(i..i + 2)).map(|b| u16::from_be_bytes([b[0], b[1]]) as u32);
        // 짝지은 요청의 주소
        let place = match (table_of(fc), ru(1), ru(3)) {
            (Some((t, p)), Some(a), Some(n)) if matches!(fc, 0x01..=0x04 | 0x0F | 0x10 | 0x17) => format!(" {t} {}", st.span(p, a, n)),
            (Some((t, p)), Some(a), _) => format!(" {t} {}", st.addr(p, a)),
            _ => String::new(),
        };
        let ok = crate::tr!("정상", "OK");
        let tail = if f & 0x80 != 0 {
            exception_text(pdu.get(1).copied().unwrap_or(0))
        } else {
            match fc {
                0x01 | 0x02 if pdu.len() >= 2 => {
                    let n = ru(3).map(|n| n as usize).unwrap_or((pdu.len() - 2) * 8);
                    format!("{ok}: {}", list(&bits(&pdu[2..], n.min((pdu.len() - 2) * 8)), 16))
                }
                0x03 | 0x04 | 0x17 if pdu.len() >= 2 => format!("{ok}: {}", list(&regs(&pdu[2..]), 8)),
                0x2B if pdu.get(1) == Some(&0x0E) => {
                    let objs: Vec<String> = device_objects(&pdu[1..]).into_iter().map(|(_, t)| format!("«{t}»")).collect();
                    format!("{ok}: {}", objs.join(" "))
                }
                _ => ok.to_string(),
            }
        };
        format!("id{unit} FC{fc:02X}{place} → {tail}")
    }
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
    fn new_function_names_and_fields() {
        let m = decode(&with_crc(&[0x01, 0x16, 0x00, 0x04, 0x00, 0xF2, 0x00, 0x25])).unwrap();
        assert_eq!(m.function_name, "Mask Write Register");
        assert_eq!(m.fields[1].1, "0x00F2");
        let rw = decode(&with_crc(&[0x01, 0x17, 0, 0, 0, 2, 0, 5, 0, 1, 2, 0x12, 0x34])).unwrap();
        assert_eq!((rw.kind, rw.values.clone()), ("request", vec![0x1234]));
        let d = decode(&with_crc(&[0x01, 0x08, 0, 0, 0xA5, 0x37])).unwrap();
        assert!(d.fields[0].1.contains("Return Query Data"));
        let id = decode(&with_crc(&[0x01, 0x2B, 0x0E, 1, 0x81, 0, 0, 1, 0, 2, b'H', b'i'])).unwrap();
        assert_eq!(id.kind, "response");
        assert_eq!(id.fields[1], ("object 0".into(), "Hi".into()));
    }

    // 언어(전역)를 바꾸는 시험은 하나로 — 나란히 도는 다른 시험과 섞이지 않게
    #[test]
    fn summarizer_lines() {
        crate::i18n::set_lang("ko");
        let mut s = Summarizer::new(Wire::Rtu, AddrStyle::default());
        assert_eq!(s.line("rx", &with_crc(&[1, 3, 0, 0, 0, 10]), None).unwrap(), "id1 FC03 HR 0..9 (10)");
        assert_eq!(s.line("tx", &with_crc(&[1, 3, 6, 0, 1, 0, 2, 0, 3]), None).unwrap(), "id1 FC03 HR 0..9 → 정상: 1, 2, 3");
        assert_eq!(s.line("rx", &with_crc(&[1, 0x10, 0, 100, 0, 2, 4, 0, 1, 0, 2]), None).unwrap(), "id1 FC10 HR 100..101 ← 1, 2");
        assert_eq!(s.line("tx", &with_crc(&[1, 0x10, 0, 100, 0, 2]), None).unwrap(), "id1 FC10 HR 100..101 → 정상");
        assert_eq!(s.line("rx", &with_crc(&[1, 3, 0, 200, 0, 1]), None).unwrap(), "id1 FC03 HR 200 (1)");
        assert_eq!(s.line("tx", &with_crc(&[1, 0x83, 2]), None).unwrap(), "id1 FC03 HR 200 → 예외 02 없는 주소 (Illegal Data Address)");
        // CRC 가 틀린 줄, 사건 줄
        let mut bad = with_crc(&[1, 3, 0, 0, 0, 1]);
        bad[7] ^= 1;
        assert!(s.line("rx", &bad, None).unwrap().contains("CRC"));
        assert_eq!(s.line("ev", &[], None), None);
        // 1 기준·PLC 표기
        s.style = AddrStyle { base: 1, plc: false };
        assert_eq!(s.request(1, &[3, 0, 0, 0, 10]), "id1 FC03 HR 1..10 (10)");
        s.style = AddrStyle { base: 0, plc: true };
        assert_eq!(s.request(1, &[3, 0, 0, 0, 10]), "id1 FC03 HR 40001..40010 (10)");
        assert_eq!(s.request(2, &[5, 0, 3, 0xFF, 0]), "id2 FC05 CO 00004 ← ON");
        assert_eq!(s.request(2, &[4, 0x27, 0x10, 0, 1]), "id2 FC04 IR 310001 (1)");

        // Modbus TCP — 트랜잭션 번호를 앞에, 짝은 상대별로
        let mut s = Summarizer::new(Wire::Tcp, AddrStyle::default());
        assert_eq!(s.line("rx", &[0, 7, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2], Some("10.0.0.5:5000")).unwrap(), "#7 id1 FC03 HR 0..1 (2)");
        s.line("rx", &[0, 1, 0, 0, 0, 6, 1, 6, 0, 9, 0, 1], Some("10.0.0.6:6000"));
        assert_eq!(s.line("tx", &[0, 7, 0, 0, 0, 7, 1, 3, 4, 0, 5, 0, 6], Some("10.0.0.5:5000")).unwrap(), "#7 id1 FC03 HR 0..1 → 정상: 5, 6");
        assert!(s.line("rx", &[0, 1, 0, 1, 0, 6, 1, 3, 0, 0, 0, 1], None).unwrap().contains("MBAP"));
        // 새 함수들
        assert_eq!(s.request(1, &[0x16, 0, 4, 0, 0xF2, 0, 0x25]), "id1 FC16 HR 4 AND 0x00F2 OR 0x0025");
        assert_eq!(s.request(1, &[0x17, 0, 0, 0, 3, 0, 1, 0, 2, 4, 0, 0xAA, 0, 0xBB]), "id1 FC17 HR R 0..2 (3) · W 1..2 ← 170, 187");
        assert_eq!(s.request(1, &[0x08, 0, 0, 0xA5, 0x37]), "id1 FC08 되돌려 보내기(08/00)");
        assert_eq!(s.request(1, &[0x0F, 0, 0, 0, 3, 1, 0b101]), "id1 FC0F CO 0..2 ← 1, 0, 1");
        let id = [0x2B, 0x0E, 1, 0x81, 0, 0, 2, 0, 2, b'A', b'B', 1, 1, b'X'];
        assert_eq!(s.response(1, Some(&[0x2B, 0x0E, 1, 0]), &id), "id1 FC2B → 정상: «AB» «X»");
        assert_eq!(s.request(1, &[0x2B, 0x0E, 1, 0]), "id1 FC2B 장치 식별 코드 1 객체 0");
        assert_eq!(list(&[1, 2, 3, 4, 5, 6, 7, 8, 9], 8), "1, 2, 3, 4, 5, 6, 7, 8, …");

        crate::i18n::set_lang("en");
        assert_eq!(s.response(1, None, &[0x83, 2]), "id1 FC03 → exception 02 Illegal Data Address");
        crate::i18n::set_lang("ko");
    }

    #[test]
    fn write_multiple_registers_request() {
        let req = decode(&with_crc(&[0x01, 0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02])).unwrap();
        assert_eq!(req.kind, "request");
        assert_eq!(req.values, vec![10, 258]);
    }
}
