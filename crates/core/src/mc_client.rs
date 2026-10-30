//! MC 프로토콜(SLMP) 클라이언트 — 3E 프레임 이진 코드로 일괄 읽기(0401)·일괄 쓰기(1401)만.
//! PortDock MCP(crates/mcp)가 쓴다. 서버 흉내(mc.rs)와 같은 매뉴얼을 따르고, 시험은 그 서버와 교차로 한다.
//!
//! 근거(공개 매뉴얼, 저장소에는 넣지 않고 링크만 — mc.rs 머리 주석과 같은 문서):
//! - SLMP Reference Manual SH(NA)-080956ENG rev. L — 4장 메시지 형식(3E 부머리 5000·D000, 네트워크·국·I/O·멀티드롭,
//!   길이 = 감시 타이머부터 끝까지, 종료 코드), 5.2 디바이스 코드와 0401·1401(서브 0000 워드 단위·0001 비트 단위)
//! - MELSEC Communication Protocol Reference Manual SH-080008 rev. AB — 5장 이더넷 메시지(3E 프레임)
//!
//! 요청은 늘 «자기 국»(네트워크 00·국 FF·I/O 03FF·멀티드롭 00)으로 보낸다. 4E·ASCII·랜덤·블록 읽기는 하지 않는다.

use crate::mc::{DEVICES, Dev, end_code_text};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

/// 0401·1401 워드 단위 한 번 최대 점 수(SLMP 5.2)
pub const MAX_WORDS: u32 = 960;
/// 0401·1401 비트 단위(이진) 한 번 최대 점 수(SLMP 5.2)
pub const MAX_BITS: u32 = 7168;
/// 3E 이진 응답 머리(부머리 2 + 네트워크·국·I/O 2·멀티드롭 + 길이 2) 길이
const RESP_HEAD: usize = 9;

/// «D100» · «X1F» · «ZR10» · «SM400» → (디바이스, 번호). X·Y·B·W·ZR 는 16진 번호(mc.rs DEVICES 의 hex)
pub fn parse_address(s: &str) -> Result<(Dev, u32), String> {
    let t = s.trim().to_ascii_uppercase();
    // 두 글자 이름(SM·SD·ZR·TS …)을 먼저 본다 — «S» 로 시작하는 한 글자 디바이스는 없지만 순서로 확실히
    let mut names: Vec<_> = DEVICES.iter().collect();
    names.sort_by_key(|d| std::cmp::Reverse(d.name.len()));
    let bad = || crate::tr!(format!("디바이스 주소를 읽지 못함: «{s}» (예: D100, M0, X1F)"), format!("Cannot read device address «{s}» (e.g. D100, M0, X1F)"));
    for d in names {
        if let Some(num) = t.strip_prefix(d.name) {
            if num.is_empty() {
                return Err(bad());
            }
            let n = u32::from_str_radix(num, if d.hex { 16 } else { 10 }).map_err(|_| bad())?;
            return Ok((d.dev, n));
        }
    }
    Err(bad())
}

/// 3E 이진 요청 프레임(자기 국) — 명령·서브 명령 뒤 몸통을 받아 머리·길이를 붙인다
fn frame_3e(timer_250ms: u16, cmd: u16, sub: u16, body: &[u8]) -> Vec<u8> {
    let mut f = vec![0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00];
    // 길이 = 감시 타이머(2) + 명령(2) + 서브 명령(2) + 몸통
    f.extend(((6 + body.len()) as u16).to_le_bytes());
    f.extend(timer_250ms.to_le_bytes());
    f.extend(cmd.to_le_bytes());
    f.extend(sub.to_le_bytes());
    f.extend(body);
    f
}

/// 디바이스 지정(번호 3바이트 + 코드 1바이트, 서브 0000·0001)
fn device_bytes(dev: Dev, start: u32) -> Result<[u8; 4], String> {
    if start > 0xFF_FFFF {
        return Err(crate::tr!(format!("번호가 너무 큼: {start}"), format!("Device number too large: {start}")));
    }
    let b = start.to_le_bytes();
    Ok([b[0], b[1], b[2], dev.info().code])
}

fn check_count(dev: Dev, n: u32, bits: bool) -> Result<(), String> {
    if bits && !dev.bits() {
        return Err(crate::tr!(format!("{} 는 워드 디바이스라 비트 단위로 읽고 쓸 수 없습니다", dev.name()), format!("{} is a word device — bit units are not allowed", dev.name())));
    }
    let max = if bits { MAX_BITS } else { MAX_WORDS };
    if n == 0 || n > max {
        return Err(crate::tr!(format!("점 수는 1~{max} 입니다 (지금 {n})"), format!("Point count must be 1–{max} (now {n})")));
    }
    Ok(())
}

/// 0401 일괄 읽기 요청. `bits` = 비트 단위(서브 0001, 비트 디바이스만), 아니면 워드 단위(서브 0000 — 비트 디바이스는 16점 = 1워드)
pub fn read_request(dev: Dev, start: u32, count: u32, bits: bool, timer_250ms: u16) -> Result<Vec<u8>, String> {
    check_count(dev, count, bits)?;
    let mut body = device_bytes(dev, start)?.to_vec();
    body.extend((count as u16).to_le_bytes());
    Ok(frame_3e(timer_250ms, 0x0401, if bits { 0x0001 } else { 0x0000 }, &body))
}

/// 1401 일괄 쓰기 요청. 비트 단위면 값은 0/1(한 점 4비트, 앞 점이 위 4비트), 워드 단위면 워드
pub fn write_request(dev: Dev, start: u32, values: &[u16], bits: bool, timer_250ms: u16) -> Result<Vec<u8>, String> {
    check_count(dev, values.len() as u32, bits)?;
    let mut body = device_bytes(dev, start)?.to_vec();
    body.extend((values.len() as u16).to_le_bytes());
    if bits {
        if values.iter().any(|&v| v > 1) {
            return Err(crate::tr!("비트 값은 0 또는 1 입니다", "Bit values must be 0 or 1").into());
        }
        for pair in values.chunks(2) {
            body.push(((pair[0] as u8) << 4) | pair.get(1).map_or(0, |&b| b as u8));
        }
    } else {
        for v in values {
            body.extend(v.to_le_bytes());
        }
    }
    Ok(frame_3e(timer_250ms, 0x1401, if bits { 0x0001 } else { 0x0000 }, &body))
}

/// 응답 머리에서 전체 길이를 안다(9바이트가 모였을 때). 3E 이진 응답이 아니면 Err
pub fn response_len(head: &[u8]) -> Result<Option<usize>, String> {
    if head.len() < RESP_HEAD {
        return Ok(None);
    }
    if head[..2] != [0xD0, 0x00] {
        return Err(crate::tr!(format!("3E 이진 응답이 아님 (부머리 {:02X} {:02X})", head[0], head[1]), format!("Not a 3E binary response (subheader {:02X} {:02X})", head[0], head[1])));
    }
    Ok(Some(RESP_HEAD + u16::from_le_bytes([head[7], head[8]]) as usize))
}

/// 응답 풀기 결과
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Reply {
    /// 종료 코드 0 — 종료 코드 뒤 데이터
    Ok(Vec<u8>),
    /// 종료 코드가 0 이 아님
    Error { end_code: u16 },
}

/// 응답 프레임 하나(머리 포함)를 푼다
pub fn parse_response(f: &[u8]) -> Result<Reply, String> {
    let Some(total) = response_len(f)? else {
        return Err(crate::tr!("응답이 너무 짧음", "Response too short").into());
    };
    if f.len() != total || total < RESP_HEAD + 2 {
        return Err(crate::tr!(format!("응답 길이가 틀림 (머리 {total}, 받음 {})", f.len()), format!("Wrong response length (header says {total}, got {})", f.len())));
    }
    let end = u16::from_le_bytes([f[9], f[10]]);
    if end != 0 {
        return Ok(Reply::Error { end_code: end });
    }
    Ok(Reply::Ok(f[11..].to_vec()))
}

/// 읽기 응답 데이터 → 값(비트 단위면 0/1, 워드 단위면 워드)
pub fn decode_read(data: &[u8], count: u32, bits: bool) -> Result<Vec<u16>, String> {
    let want = if bits { (count as usize).div_ceil(2) } else { count as usize * 2 };
    if data.len() != want {
        return Err(crate::tr!(format!("데이터 길이가 틀림 — 기대 {want}, 받음 {}", data.len()), format!("Wrong data length — expected {want}, got {}", data.len())));
    }
    Ok(if bits {
        (0..count as usize).map(|i| ((data[i / 2] >> if i % 2 == 0 { 4 } else { 0 }) & 1) as u16).collect()
    } else {
        data.as_chunks::<2>().0.iter().map(|c| u16::from_le_bytes(*c)).collect()
    })
}

/// 종료 코드 한 줄(«C056 — …»)
pub fn end_code_line(code: u16) -> String {
    format!("{code:04X} — {}", end_code_text(code))
}

/// TCP 로 붙은 MC 클라이언트 — 한 번에 요청 하나
pub struct Client {
    stream: TcpStream,
    timeout: Duration,
}

impl Client {
    pub fn connect(addr: SocketAddr, timeout: Duration) -> Result<Self, String> {
        let stream = TcpStream::connect_timeout(&addr, timeout).map_err(|e| format!("{addr}: {}", crate::oserr::net(&e)))?;
        let _ = stream.set_nodelay(true);
        stream.set_write_timeout(Some(timeout)).map_err(|e| e.to_string())?;
        Ok(Self { stream, timeout })
    }

    /// 감시 타이머(250ms 단위) — 기다림에 맞춰 1~(기다림/250)
    fn timer(&self) -> u16 {
        (self.timeout.as_millis() / 250).clamp(1, 0xFFFF) as u16
    }

    /// 요청 하나 보내고 응답 프레임 하나 받기
    pub fn transact(&mut self, req: &[u8]) -> Result<Vec<u8>, String> {
        self.stream.write_all(req).map_err(|e| crate::oserr::net(&e))?;
        let deadline = Instant::now() + self.timeout;
        let mut buf = Vec::new();
        let mut chunk = [0u8; 4096];
        loop {
            if let Some(total) = response_len(&buf)?
                && buf.len() >= total
            {
                buf.truncate(total);
                return Ok(buf);
            }
            let left = deadline.saturating_duration_since(Instant::now());
            if left.is_zero() {
                return Err(if buf.is_empty() {
                    crate::tr!("응답 없음(타임아웃)", "No response (timeout)").to_string()
                } else {
                    crate::tr!(format!("응답이 끝까지 오지 않음 ({}바이트만 옴)", buf.len()), format!("Incomplete response (only {} bytes)", buf.len()))
                });
            }
            self.stream.set_read_timeout(Some(left.max(Duration::from_millis(1)))).map_err(|e| e.to_string())?;
            match self.stream.read(&mut chunk) {
                Ok(0) => return Err(crate::tr!("상대가 연결을 끊었습니다", "The peer closed the connection").into()),
                Ok(n) => buf.extend_from_slice(&chunk[..n]),
                Err(e) if matches!(e.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut) => {}
                Err(e) => return Err(crate::oserr::net(&e)),
            }
        }
    }

    /// 0401 일괄 읽기
    pub fn read(&mut self, dev: Dev, start: u32, count: u32, bits: bool) -> Result<Vec<u16>, String> {
        let req = read_request(dev, start, count, bits, self.timer())?;
        match parse_response(&self.transact(&req)?)? {
            Reply::Ok(data) => decode_read(&data, count, bits),
            Reply::Error { end_code } => Err(crate::tr!(format!("PLC 가 오류로 답함: {}", end_code_line(end_code)), format!("The PLC answered with an error: {}", end_code_line(end_code)))),
        }
    }

    /// 1401 일괄 쓰기
    pub fn write(&mut self, dev: Dev, start: u32, values: &[u16], bits: bool) -> Result<(), String> {
        let req = write_request(dev, start, values, bits, self.timer())?;
        match parse_response(&self.transact(&req)?)? {
            Reply::Ok(_) => Ok(()),
            Reply::Error { end_code } => Err(crate::tr!(format!("PLC 가 오류로 답함: {}", end_code_line(end_code)), format!("The PLC answered with an error: {}", end_code_line(end_code)))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mc::Server;
    use std::net::TcpListener;
    use std::sync::{Arc, Mutex};

    #[test]
    fn address_names_and_hex() {
        assert_eq!(parse_address("D100").unwrap(), (Dev::D, 100));
        assert_eq!(parse_address(" m0 ").unwrap(), (Dev::M, 0));
        assert_eq!(parse_address("X1F").unwrap(), (Dev::X, 0x1F));
        assert_eq!(parse_address("ZR10").unwrap(), (Dev::Zr, 0x10));
        assert_eq!(parse_address("SM400").unwrap(), (Dev::Sm, 400));
        assert_eq!(parse_address("SD10").unwrap(), (Dev::Sd, 10));
        assert_eq!(parse_address("TN5").unwrap(), (Dev::Tn, 5));
        for bad in ["", "D", "Q10", "D1A", "X1G", "100"] {
            assert!(parse_address(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn read_request_bytes_match_manual_layout() {
        // D100 부터 3워드, 감시 타이머 4(1초): 50 00 | 00 FF FF 03 00 | 0C 00 | 04 00 | 01 04 | 00 00 | 64 00 00 A8 | 03 00
        let f = read_request(Dev::D, 100, 3, false, 4).unwrap();
        assert_eq!(f, vec![0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0C, 0x00, 0x04, 0x00, 0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xA8, 0x03, 0x00]);
        // 비트 단위 M10 ×5 → 서브 0001
        let f = read_request(Dev::M, 10, 5, true, 4).unwrap();
        assert_eq!(&f[13..15], &[0x01, 0x00]);
        assert_eq!(f[18], 0x90);
        // 워드 디바이스를 비트로·점 수 범위 밖은 오류
        assert!(read_request(Dev::D, 0, 1, true, 4).is_err());
        assert!(read_request(Dev::D, 0, 0, false, 4).is_err());
        assert!(read_request(Dev::D, 0, MAX_WORDS + 1, false, 4).is_err());
        assert!(read_request(Dev::M, 0, MAX_BITS, true, 4).is_ok());
    }

    #[test]
    fn write_request_packs_bits_high_nibble_first() {
        let f = write_request(Dev::Y, 0, &[1, 0, 1], true, 4).unwrap();
        assert_eq!(&f[f.len() - 2..], &[0x10, 0x10]);
        assert!(write_request(Dev::Y, 0, &[2], true, 4).is_err());
        let f = write_request(Dev::D, 0, &[0x1234], false, 4).unwrap();
        assert_eq!(&f[f.len() - 2..], &[0x34, 0x12]);
    }

    #[test]
    fn parse_and_decode() {
        // 종료 코드 0: D0 00 00 FF FF 03 00 | 06 00 | 00 00 | 34 12 78 56
        let ok = [0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x06, 0x00, 0x00, 0x00, 0x34, 0x12, 0x78, 0x56];
        let Reply::Ok(data) = parse_response(&ok).unwrap() else { panic!() };
        assert_eq!(decode_read(&data, 2, false).unwrap(), vec![0x1234, 0x5678]);
        // 비트 3점: 0x10 0x10 → 1 0 1
        assert_eq!(decode_read(&[0x10, 0x10], 3, true).unwrap(), vec![1, 0, 1]);
        assert!(decode_read(&[0x10], 3, true).is_err());
        // 오류 응답: 종료 코드 C056
        let err = [0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0B, 0x00, 0x56, 0xC0, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x01, 0x04, 0x00, 0x00];
        assert_eq!(parse_response(&err).unwrap(), Reply::Error { end_code: 0xC056 });
        assert!(parse_response(&ok[..10]).is_err());
        assert!(parse_response(&[0x50, 0, 0, 0, 0, 0, 0, 0, 0]).is_err());
    }

    /// 127.0.0.1 에 MC 서버 흉내(mc.rs)를 띄운다 — 연결 하나를 받아 요청마다 답한다
    fn spawn_server(server: Arc<Mutex<Server>>) -> SocketAddr {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = l.local_addr().unwrap();
        std::thread::spawn(move || {
            let (mut s, _) = l.accept().unwrap();
            let mut buf = Vec::new();
            let mut chunk = [0u8; 4096];
            loop {
                // 요청 길이 = 9 + 길이 칸
                while buf.len() >= 9 && buf.len() >= 9 + u16::from_le_bytes([buf[7], buf[8]]) as usize {
                    let n = 9 + u16::from_le_bytes([buf[7], buf[8]]) as usize;
                    let frame: Vec<u8> = buf.drain(..n).collect();
                    let (resp, _) = server.lock().unwrap().handle(&frame);
                    if let Some(r) = resp {
                        s.write_all(&r).unwrap();
                    }
                }
                match s.read(&mut chunk) {
                    Ok(0) | Err(_) => return,
                    Ok(n) => buf.extend_from_slice(&chunk[..n]),
                }
            }
        });
        addr
    }

    #[test]
    fn round_trip_with_server_emulator() {
        let server = Arc::new(Mutex::new(Server::with_seed(1)));
        server.lock().unwrap().mem.set(Dev::D, 100, &[11, 22, 33]).unwrap();
        server.lock().unwrap().mem.set(Dev::M, 5, &[1, 1, 0, 1]).unwrap();
        let addr = spawn_server(server.clone());
        let mut c = Client::connect(addr, Duration::from_secs(2)).unwrap();
        assert_eq!(c.read(Dev::D, 100, 3, false).unwrap(), vec![11, 22, 33]);
        assert_eq!(c.read(Dev::M, 5, 4, true).unwrap(), vec![1, 1, 0, 1]);
        // M0~M15 를 워드 하나로: M5·M6·M8 → 비트 5·6·8
        assert_eq!(c.read(Dev::M, 0, 1, false).unwrap(), vec![(1 << 5) | (1 << 6) | (1 << 8)]);
        c.write(Dev::D, 200, &[7, 8], false).unwrap();
        c.write(Dev::Y, 0x10, &[1, 0, 1], true).unwrap();
        assert_eq!(server.lock().unwrap().mem.get(Dev::D, 200, 2).unwrap(), vec![7, 8]);
        assert_eq!(server.lock().unwrap().mem.get(Dev::Y, 0x10, 3).unwrap(), vec![1, 0, 1]);
        // 범위 밖 → 서버가 C056 으로 답함
        let size = server.lock().unwrap().mem.size(Dev::D);
        let e = c.read(Dev::D, size - 1, 2, false).unwrap_err();
        assert!(e.contains("C056"), "{e}");
    }
}
