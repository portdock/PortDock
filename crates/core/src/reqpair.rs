//! 중계 기록의 요청/응답 짝(0.8.0) — A→B 프레임을 요청, B→A 프레임을 응답으로 보고 Modbus TCP(트랜잭션 ID)·
//! MC 3E/4E(이진·ASCII, 4E 는 일련번호·3E 는 먼저 온 요청부터)를 짝지어 응답 시간을 잰다.
//! 정해진 시간 안에 응답이 없거나, 같은 열쇠의 새 요청이 오거나, 연결이 닫히면 «무응답».
//! 프레임 모양 풀이는 tcp::is_mbap·mc::recognize 를 그대로 쓴다. 화면 없이 값만 — 시험은 이 파일 아래.

use crate::mc;
use serde::Serialize;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// 이 시간 안에 응답이 없으면 무응답
pub const NO_REPLY: Duration = Duration::from_millis(3_000);
/// 짝을 기다리는 요청의 최대 수(넘으면 가장 오래된 것을 무응답으로)
const MAX_PENDING: usize = 256;

/// 기록 줄에 붙는 짝 표시
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairMark {
    /// 요청 번호(세션 안에서 1부터)
    pub id: u64,
    /// "req" | "rsp" | "miss"(무응답 — 사건 줄)
    pub role: &'static str,
    /// "modbus" | "mc"
    pub proto: &'static str,
    /// 함수·명령 «FC03»·«0401»
    pub what: String,
    /// 응답: 요청 첫 바이트 → 응답 첫 바이트(ms, µs 까지). 무응답: 기다린 시간
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rt_ms: Option<f64>,
    /// 응답이 오류면 «EXC 02»(Modbus 예외)·«C056»(MC 종료 코드)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Key {
    /// 트랜잭션 ID·유닛·함수(예외 비트 뺀 것)
    Modbus { tid: u16, unit: u8, fc: u8 },
    /// 3E: 같은 형식의 가장 오래된 요청
    Mc3 { fmt: mc::Format },
    /// 4E: 일련번호
    Mc4 { fmt: mc::Format, serial: u16 },
}

struct Pending {
    id: u64,
    key: Key,
    what: String,
    at: Instant,
}

/// 쌍 하나(연결 하나)의 짝 상태. 요청 번호는 세션이 넘긴 계수기로
pub struct Pairer {
    pending: VecDeque<Pending>,
    timeout: Duration,
}

/// 요청 프레임의 열쇠와 이름. Modbus TCP 먼저(MBAP 길이 칸이 맞아야), 아니면 MC
fn request_key(b: &[u8]) -> Option<(Key, &'static str, String)> {
    if crate::tcp::is_mbap(b) && b[7] & 0x80 == 0 && b[7] != 0 {
        return Some((Key::Modbus { tid: u16::from_be_bytes([b[0], b[1]]), unit: b[6], fc: b[7] }, "modbus", format!("FC{:02X}", b[7])));
    }
    let s = mc::recognize(b)?;
    if s.response {
        return None;
    }
    let key = match s.serial {
        Some(serial) => Key::Mc4 { fmt: s.fmt, serial },
        None => Key::Mc3 { fmt: s.fmt },
    };
    Some((key, "mc", format!("{:04X}", s.command)))
}

/// 응답 프레임의 열쇠(MC 3E 는 형식만)와 오류 표시
fn response_key(b: &[u8]) -> Option<(Key, Option<String>)> {
    if crate::tcp::is_mbap(b) && b[7] != 0 {
        let fc = b[7] & 0x7F;
        let err = (b[7] & 0x80 != 0).then(|| format!("EXC {:02X}", b.get(8).copied().unwrap_or(0)));
        return Some((Key::Modbus { tid: u16::from_be_bytes([b[0], b[1]]), unit: b[6], fc }, err));
    }
    let s = mc::recognize(b)?;
    if !s.response {
        return None;
    }
    let err = s.end.filter(|&e| e != 0).map(|e| format!("{e:04X}"));
    let key = match s.serial {
        Some(serial) => Key::Mc4 { fmt: s.fmt, serial },
        None => Key::Mc3 { fmt: s.fmt },
    };
    Some((key, err))
}

fn ms(d: Duration) -> f64 {
    (d.as_micros() as f64) / 1000.0
}

impl Default for Pairer {
    fn default() -> Self {
        Self::new(NO_REPLY)
    }
}

impl Pairer {
    pub fn new(timeout: Duration) -> Self {
        Self { pending: VecDeque::new(), timeout }
    }

    fn miss(p: Pending, waited: Duration) -> PairMark {
        PairMark { id: p.id, role: "miss", proto: proto_of(p.key), what: p.what, rt_ms: Some(ms(waited)), error: None }
    }

    /// A→B 프레임. 알아보는 요청이면 (요청 표시, 이 요청 때문에 무응답이 된 앞 요청들). next = 요청 번호 계수기
    pub fn request(&mut self, b: &[u8], at: Instant, next: &mut u64) -> Option<(PairMark, Vec<PairMark>)> {
        let (key, proto, what) = request_key(b)?;
        let mut missed = Vec::new();
        // 같은 열쇠(Modbus 트랜잭션·4E 일련번호)가 아직 기다리면 앞 것은 답을 못 받은 것(3E 는 줄 서기라 그대로)
        if !matches!(key, Key::Mc3 { .. })
            && let Some(i) = self.pending.iter().position(|p| p.key == key)
        {
            let p = self.pending.remove(i).expect("index");
            let waited = at.saturating_duration_since(p.at);
            missed.push(Self::miss(p, waited));
        }
        if self.pending.len() >= MAX_PENDING
            && let Some(p) = self.pending.pop_front()
        {
            let waited = at.saturating_duration_since(p.at);
            missed.push(Self::miss(p, waited));
        }
        *next += 1;
        let id = *next;
        self.pending.push_back(Pending { id, key, what: what.clone(), at });
        Some((PairMark { id, role: "req", proto, what, rt_ms: None, error: None }, missed))
    }

    /// B→A 프레임. 기다리던 요청과 맞으면 응답 표시(응답 시간 포함)
    pub fn response(&mut self, b: &[u8], at: Instant) -> Option<PairMark> {
        let (key, error) = response_key(b)?;
        let i = self.pending.iter().position(|p| p.key == key)?;
        let p = self.pending.remove(i).expect("index");
        Some(PairMark { id: p.id, role: "rsp", proto: proto_of(key), what: p.what, rt_ms: Some(ms(at.saturating_duration_since(p.at))), error })
    }

    /// 기다린 시간이 넘은 요청들 → 무응답
    pub fn expire(&mut self, now: Instant) -> Vec<PairMark> {
        let mut out = Vec::new();
        while let Some(p) = self.pending.front() {
            let waited = now.saturating_duration_since(p.at);
            if waited < self.timeout {
                break;
            }
            let p = self.pending.pop_front().expect("front");
            out.push(Self::miss(p, waited));
        }
        out
    }

    /// 연결이 닫힘 — 남은 요청은 모두 무응답
    pub fn close(&mut self, now: Instant) -> Vec<PairMark> {
        self.pending.drain(..).map(|p| {
            let waited = now.saturating_duration_since(p.at);
            Self::miss(p, waited)
        }).collect()
    }
}

fn proto_of(k: Key) -> &'static str {
    match k {
        Key::Modbus { .. } => "modbus",
        _ => "mc",
    }
}

/// 무응답 사건 줄 문구 «NO REPLY #12 FC03 (3000 ms)»
pub fn miss_note(m: &PairMark, closed: bool) -> String {
    let waited = m.rt_ms.unwrap_or(0.0).round() as u64;
    if closed {
        crate::tr!(format!("NO REPLY #{} {} (연결 끊김, {waited} ms)", m.id, m.what), format!("NO REPLY #{} {} (connection closed, {waited} ms)", m.id, m.what))
    } else {
        crate::tr!(format!("NO REPLY #{} {} ({waited} ms)", m.id, m.what), format!("NO REPLY #{} {} ({waited} ms)", m.id, m.what))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mb(tid: u16, unit: u8, pdu: &[u8]) -> Vec<u8> {
        let mut v = tid.to_be_bytes().to_vec();
        v.extend([0, 0]);
        v.extend(((pdu.len() + 1) as u16).to_be_bytes());
        v.push(unit);
        v.extend(pdu);
        v
    }

    #[test]
    fn modbus_pairs_by_transaction_id_out_of_order() {
        let t0 = Instant::now();
        let mut p = Pairer::default();
        let mut n = 0;
        let (r1, m) = p.request(&mb(1, 1, &[3, 0, 0, 0, 2]), t0, &mut n).unwrap();
        assert!(m.is_empty());
        let (r2, _) = p.request(&mb(2, 1, &[3, 0, 10, 0, 1]), t0 + Duration::from_millis(1), &mut n).unwrap();
        assert_eq!((r1.id, r1.role, r1.proto, r1.what.as_str()), (1, "req", "modbus", "FC03"));
        assert_eq!(r2.id, 2);
        // 2번 응답이 먼저
        let a2 = p.response(&mb(2, 1, &[3, 2, 0, 7]), t0 + Duration::from_micros(4_250)).unwrap();
        assert_eq!((a2.id, a2.role, a2.rt_ms, a2.error.as_deref()), (2, "rsp", Some(3.25), None));
        // 1번은 예외 응답(83 02)
        let a1 = p.response(&mb(1, 1, &[0x83, 0x02]), t0 + Duration::from_millis(9)).unwrap();
        assert_eq!((a1.id, a1.rt_ms, a1.error.as_deref()), (1, Some(9.0), Some("EXC 02")));
        // 짝 없는 응답·다른 유닛은 표시 없음
        assert!(p.response(&mb(1, 1, &[3, 2, 0, 7]), t0).is_none());
        p.request(&mb(5, 1, &[3, 0, 0, 0, 1]), t0, &mut n).unwrap();
        assert!(p.response(&mb(5, 2, &[3, 2, 0, 7]), t0).is_none());
        // 모양이 아니면 None
        assert!(p.request(b"HELLO\r\n", t0, &mut n).is_none());
    }

    #[test]
    fn same_transaction_again_marks_the_old_one_as_missed() {
        let t0 = Instant::now();
        let mut p = Pairer::default();
        let mut n = 10;
        p.request(&mb(0, 1, &[3, 0, 0, 0, 1]), t0, &mut n).unwrap();
        let (r, missed) = p.request(&mb(0, 1, &[3, 0, 0, 0, 1]), t0 + Duration::from_millis(1500), &mut n).unwrap();
        assert_eq!(r.id, 12);
        assert_eq!(missed.len(), 1);
        assert_eq!((missed[0].id, missed[0].role, missed[0].rt_ms), (11, "miss", Some(1500.0)));
        assert_eq!(miss_note(&missed[0], false), "NO REPLY #11 FC03 (1500 ms)");
    }

    #[test]
    fn timeout_and_close_give_misses() {
        let t0 = Instant::now();
        let mut p = Pairer::new(Duration::from_millis(100));
        let mut n = 0;
        p.request(&mb(1, 1, &[3, 0, 0, 0, 1]), t0, &mut n).unwrap();
        p.request(&mb(2, 1, &[3, 0, 0, 0, 1]), t0 + Duration::from_millis(80), &mut n).unwrap();
        assert!(p.expire(t0 + Duration::from_millis(99)).is_empty());
        let m = p.expire(t0 + Duration::from_millis(120));
        assert_eq!(m.iter().map(|x| x.id).collect::<Vec<_>>(), vec![1]);
        let c = p.close(t0 + Duration::from_millis(130));
        assert_eq!((c.len(), c[0].id, c[0].rt_ms), (1, 2, Some(50.0)));
        assert!(p.close(t0).is_empty());
    }

    /// MC 3E 이진: 자기 국 머리 + 길이 + 감시 타이머 + 명령
    fn b3(cmd: &[u8]) -> Vec<u8> {
        let mut v = vec![0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00];
        v.extend(((2 + cmd.len()) as u16).to_le_bytes());
        v.extend([0x10, 0x00]);
        v.extend(cmd);
        v
    }
    fn b3_rsp(end: u16, data: &[u8]) -> Vec<u8> {
        let mut v = vec![0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00];
        v.extend(((2 + data.len()) as u16).to_le_bytes());
        v.extend(end.to_le_bytes());
        v.extend(data);
        v
    }

    #[test]
    fn mc_3e_pairs_in_order_and_4e_by_serial() {
        let t0 = Instant::now();
        let mut p = Pairer::default();
        let mut n = 0;
        let read = [0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xA8, 0x01, 0x00];
        let (r1, _) = p.request(&b3(&read), t0, &mut n).unwrap();
        let (r2, m) = p.request(&b3(&read), t0 + Duration::from_millis(1), &mut n).unwrap();
        assert!(m.is_empty(), "3E requests queue up");
        assert_eq!((r1.proto, r1.what.as_str()), ("mc", "0401"));
        let a = p.response(&b3_rsp(0, &[1, 0]), t0 + Duration::from_millis(5)).unwrap();
        assert_eq!((a.id, a.rt_ms), (r1.id, Some(5.0)));
        let b = p.response(&b3_rsp(0xC056, &[0, 0xFF, 0xFF, 0x03, 0, 1, 4, 0, 0]), t0 + Duration::from_millis(7)).unwrap();
        assert_eq!((b.id, b.error.as_deref()), (r2.id, Some("C056")));

        // 4E 이진: 일련번호로
        let e4 = |serial: u16| {
            let mut v = vec![0x54, 0x00];
            v.extend(serial.to_le_bytes());
            v.extend([0, 0]);
            v.extend(&b3(&read)[2..]);
            v
        };
        let e4r = |serial: u16| {
            let mut v = vec![0xD4, 0x00];
            v.extend(serial.to_le_bytes());
            v.extend([0, 0]);
            v.extend(&b3_rsp(0, &[9, 0])[2..]);
            v
        };
        let (x, _) = p.request(&e4(0x10), t0, &mut n).unwrap();
        let (y, _) = p.request(&e4(0x11), t0, &mut n).unwrap();
        assert_eq!(p.response(&e4r(0x11), t0 + Duration::from_millis(2)).unwrap().id, y.id);
        assert_eq!(p.response(&e4r(0x10), t0 + Duration::from_millis(3)).unwrap().id, x.id);
        assert!(p.response(&e4r(0x10), t0).is_none());
        // ASCII 3E
        let ra = format!("500000FF03FF00{:04X}0010{}", 4 + 20, "04010000D*0001000001").into_bytes();
        let (z, _) = p.request(&ra, t0, &mut n).unwrap();
        let rr = format!("D00000FF03FF00{:04X}0000{}", 4 + 4, "0007").into_bytes();
        assert_eq!(p.response(&rr, t0 + Duration::from_millis(1)).unwrap().id, z.id);
    }
}
