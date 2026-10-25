//! Modbus TCP «Read Device Identification»(FC 2B / MEI 0E, 기본 등급) — 502 가 열린 장비의 제조사·제품·버전.
//! 읽기 전용 요청 하나만 보낸다(레지스터를 건드리지 않는다).

use portdock_core::tr;
use serde::Serialize;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

/// 장비가 답한 식별 정보
#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Ident {
    /// 답한 유닛 ID
    pub unit: u8,
    pub vendor: String,
    pub product: String,
    pub revision: String,
}

/// 답 하나를 푼 것
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reply {
    pub unit: u8,
    pub more: bool,
    pub next: u8,
    pub objects: Vec<(u8, String)>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseError {
    /// 예외 응답(FC 0xAB) — 코드
    Exception(u8),
    /// 모양이 틀림 — 이유
    Bad(&'static str),
}

/// 요청 프레임(MBAP + PDU). code 1 = 기본 등급(0 제조사·1 제품 코드·2 버전), object = 시작 객체
pub fn request(tid: u16, unit: u8, object: u8) -> [u8; 11] {
    let t = tid.to_be_bytes();
    [t[0], t[1], 0, 0, 0, 5, unit, 0x2B, 0x0E, 0x01, object]
}

/// 응답 풀기. tid 가 다르거나 길이가 맞지 않으면 Bad
pub fn parse(r: &[u8], tid: u16) -> Result<Reply, ParseError> {
    if r.len() < 9 {
        return Err(ParseError::Bad("short"));
    }
    if u16::from_be_bytes([r[0], r[1]]) != tid || r[2] != 0 || r[3] != 0 {
        return Err(ParseError::Bad("mbap"));
    }
    if usize::from(u16::from_be_bytes([r[4], r[5]])) != r.len() - 6 {
        return Err(ParseError::Bad("length"));
    }
    let unit = r[6];
    match r[7] {
        0xAB => return Err(ParseError::Exception(r[8])),
        0x2B => {}
        _ => return Err(ParseError::Bad("function")),
    }
    // 2B 0E code conformity more next n
    if r.len() < 14 || r[8] != 0x0E {
        return Err(ParseError::Bad("mei"));
    }
    let more = r[11] == 0xFF;
    let next = r[12];
    let n = usize::from(r[13]);
    let mut objects = Vec::with_capacity(n);
    let mut i = 14;
    for _ in 0..n {
        if i + 2 > r.len() {
            return Err(ParseError::Bad("object"));
        }
        let (id, len) = (r[i], usize::from(r[i + 1]));
        let end = i + 2 + len;
        if end > r.len() {
            return Err(ParseError::Bad("object"));
        }
        let text = String::from_utf8_lossy(&r[i + 2..end]).trim_matches(|c: char| c == '\0' || c.is_whitespace()).to_string();
        objects.push((id, text));
        i = end;
    }
    Ok(Reply { unit, more, next, objects })
}

fn exception_name(code: u8) -> String {
    let name = match code {
        1 => tr!("지원하지 않는 기능", "illegal function"),
        2 => tr!("없는 객체", "illegal data address"),
        3 => tr!("잘못된 값", "illegal data value"),
        4 => tr!("장비 오류", "device failure"),
        0x0A => tr!("게이트웨이 경로 없음", "gateway path unavailable"),
        0x0B => tr!("게이트웨이 뒤 장비 응답 없음", "gateway target failed to respond"),
        _ => "?",
    };
    format!("{} {code:02X} ({name})", tr!("예외", "exception"))
}

fn exchange(s: &mut TcpStream, req: &[u8]) -> std::io::Result<Vec<u8>> {
    s.write_all(req)?;
    let mut head = [0u8; 6];
    s.read_exact(&mut head)?;
    let len = usize::from(u16::from_be_bytes([head[4], head[5]]));
    if !(2..=254).contains(&len) {
        return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "MBAP length"));
    }
    let mut body = vec![0u8; len];
    s.read_exact(&mut body)?;
    let mut all = head.to_vec();
    all.extend_from_slice(&body);
    Ok(all)
}

/// 유닛 1, 안 되면 255 로 물어본다. 둘 다 안 되면 마지막 이유
pub fn ident(addr: SocketAddr, timeout: Duration) -> Result<Ident, String> {
    let mut s = TcpStream::connect_timeout(&addr, timeout).map_err(|e| portdock_core::oserr::net(&e))?;
    s.set_read_timeout(Some(timeout)).ok();
    s.set_write_timeout(Some(timeout)).ok();
    s.set_nodelay(true).ok();
    let mut last = String::new();
    let mut tid: u16 = 0x4E53; // «NS»
    for unit in [1u8, 255] {
        let mut out = Ident { unit, ..Default::default() };
        let mut object = 0u8;
        let mut ok = false;
        // «더 있음» 이면 이어서 — 기본 등급은 보통 한 번에 온다
        for _ in 0..4 {
            tid = tid.wrapping_add(1);
            let raw = match exchange(&mut s, &request(tid, unit, object)) {
                Ok(r) => r,
                Err(e) => {
                    last = portdock_core::oserr::net(&e);
                    // 연결이 끊겼거나 시간 초과 — 다음 유닛은 새 연결로
                    if let Ok(n) = TcpStream::connect_timeout(&addr, timeout) {
                        n.set_read_timeout(Some(timeout)).ok();
                        n.set_write_timeout(Some(timeout)).ok();
                        s = n;
                    }
                    break;
                }
            };
            match parse(&raw, tid) {
                Ok(r) => {
                    ok = true;
                    for (id, text) in r.objects {
                        match id {
                            0 => out.vendor = text,
                            1 => out.product = text,
                            2 => out.revision = text,
                            _ => {}
                        }
                    }
                    if !r.more || r.next <= object {
                        break;
                    }
                    object = r.next;
                }
                Err(ParseError::Exception(c)) => {
                    last = exception_name(c);
                    break;
                }
                Err(ParseError::Bad(why)) => {
                    last = format!("{} ({why})", tr!("알 수 없는 응답", "Unexpected reply"));
                    break;
                }
            }
        }
        if ok && !(out.vendor.is_empty() && out.product.is_empty() && out.revision.is_empty()) {
            return Ok(out);
        }
    }
    Err(if last.is_empty() { tr!("답이 없습니다", "No answer").into() } else { last })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_bytes() {
        assert_eq!(request(0x1234, 1, 0), [0x12, 0x34, 0, 0, 0, 5, 1, 0x2B, 0x0E, 0x01, 0x00]);
        assert_eq!(request(7, 255, 2), [0, 7, 0, 0, 0, 5, 0xFF, 0x2B, 0x0E, 0x01, 0x02]);
    }

    fn reply(tid: u16, unit: u8, more: u8, next: u8, objs: &[(u8, &str)]) -> Vec<u8> {
        let mut pdu = vec![unit, 0x2B, 0x0E, 0x01, 0x01, more, next, objs.len() as u8];
        for (id, t) in objs {
            pdu.push(*id);
            pdu.push(t.len() as u8);
            pdu.extend_from_slice(t.as_bytes());
        }
        let mut out = tid.to_be_bytes().to_vec();
        out.extend_from_slice(&[0, 0]);
        out.extend_from_slice(&(pdu.len() as u16).to_be_bytes());
        out.extend(pdu);
        out
    }

    #[test]
    fn parse_basic_reply() {
        let r = reply(9, 1, 0, 0, &[(0, "PortDock"), (1, "SLAVE-1"), (2, "1.0")]);
        let p = parse(&r, 9).unwrap();
        assert_eq!(p.unit, 1);
        assert!(!p.more);
        assert_eq!(p.objects, vec![(0, "PortDock".into()), (1, "SLAVE-1".into()), (2, "1.0".into())]);
    }

    #[test]
    fn parse_more_follows_and_padding() {
        let r = reply(3, 255, 0xFF, 2, &[(0, "ACME\0\0"), (1, " X1 ")]);
        let p = parse(&r, 3).unwrap();
        assert!(p.more);
        assert_eq!(p.next, 2);
        assert_eq!(p.objects, vec![(0, "ACME".into()), (1, "X1".into())]);
    }

    #[test]
    fn parse_exception_and_errors() {
        // 예외: FC 0xAB, 코드 01
        let ex = [0, 5, 0, 0, 0, 3, 1, 0xAB, 0x01];
        assert_eq!(parse(&ex, 5), Err(ParseError::Exception(1)));
        // tid 가 다름
        assert_eq!(parse(&ex, 6), Err(ParseError::Bad("mbap")));
        // 길이 칸이 실제와 다름
        let mut r = reply(1, 1, 0, 0, &[(0, "A")]);
        r.push(0);
        assert_eq!(parse(&r, 1), Err(ParseError::Bad("length")));
        // 객체 길이가 프레임 밖
        let mut r = reply(1, 1, 0, 0, &[(0, "ABC")]);
        let n = r.len();
        r[n - 4] = 9;
        assert_eq!(parse(&r, 1), Err(ParseError::Bad("object")));
        // 다른 함수
        assert_eq!(parse(&[0, 1, 0, 0, 0, 3, 1, 0x03, 0x00], 1), Err(ParseError::Bad("function")));
        assert_eq!(parse(&[0, 1, 0], 1), Err(ParseError::Bad("short")));
    }

    /// 가짜 장비(이 PC 안 TCP)와 실제로 주고받기 — 유닛 1 은 예외, 255 는 답
    #[test]
    fn ident_falls_back_to_unit_255() {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = l.local_addr().unwrap();
        let t = std::thread::spawn(move || {
            let (mut c, _) = l.accept().unwrap();
            for _ in 0..2 {
                let mut req = [0u8; 11];
                if c.read_exact(&mut req).is_err() {
                    return;
                }
                let tid = u16::from_be_bytes([req[0], req[1]]);
                let out = if req[6] == 1 { vec![req[0], req[1], 0, 0, 0, 3, 1, 0xAB, 0x01] } else { reply(tid, 255, 0, 0, &[(0, "PortDock"), (1, "NS"), (2, "0.1")]) };
                c.write_all(&out).unwrap();
            }
        });
        let id = ident(addr, Duration::from_millis(1500)).unwrap();
        assert_eq!(id, Ident { unit: 255, vendor: "PortDock".into(), product: "NS".into(), revision: "0.1".into() });
        t.join().unwrap();
    }
}
