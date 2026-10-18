//! Modbus 마스터(폴링 도구) — 요청 만들기, 응답 맞추기·검사(바이트 수·CRC·예외·MBAP 트랜잭션·RS-485 에코),
//! 타임아웃·재시도·요청 간격, 폴링 일정, 국번 찾기·주소 범위 찾기.
//!
//! 통로(`Link`)는 시리얼·TCP 세션이든 시험용 가짜든 같다. 세션에서 받은 조각을 그대로 넘겨받아
//! 응답 길이를 요청으로 계산해 이어 붙이므로, USB 어댑터가 응답을 쪼개 보내도 하나로 맞춘다.
//! `Engine` 은 통로 하나를 쥐고 도는 일꾼 스레드다 — 폴링·한 번 읽기·쓰기·찾기를 차례로 한다(버스는 하나).

use crate::checksum::crc16_modbus;
use crate::modbus::{AddrStyle, Summarizer, Wire, exception_text};
use crate::serial::{Reply, Responder};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

/// 한 번에 읽을 수 있는 최대 개수 — 코일·입력 접점(01·02)
pub const MAX_READ_BITS: u16 = 2000;
/// 한 번에 읽을 수 있는 최대 개수 — 레지스터(03·04)
pub const MAX_READ_REGS: u16 = 125;
/// 0F 로 한 번에 쓸 수 있는 코일 수
pub const MAX_WRITE_BITS: usize = 1968;
/// 10 으로 한 번에 쓸 수 있는 레지스터 수
pub const MAX_WRITE_REGS: usize = 123;
/// 브로드캐스트(국번 0) 뒤 다음 요청까지 쉬는 최소 시간(규격의 «turnaround delay»)
pub const BROADCAST_GAP_MS: u64 = 100;

fn u16_at(b: &[u8], i: usize) -> Option<u16> {
    Some(u16::from_be_bytes([*b.get(i)?, *b.get(i + 1)?]))
}

fn now_ms() -> u64 {
    crate::event::now_ms()
}

// ---------------------------------------------------------------- 요청 만들기

pub fn is_read_fc(fc: u8) -> bool {
    matches!(fc, 0x01..=0x04)
}

/// 읽기 요청 PDU(함수 코드부터). 개수·주소 범위를 검사한다
pub fn read_pdu(fc: u8, start: u16, qty: u16) -> Result<Vec<u8>, String> {
    let max = match fc {
        0x01 | 0x02 => MAX_READ_BITS,
        0x03 | 0x04 => MAX_READ_REGS,
        _ => return Err(crate::tr!(format!("읽기 함수가 아닙니다: {fc:02X}"), format!("Not a read function: {fc:02X}"))),
    };
    if qty == 0 || qty > max {
        return Err(crate::tr!(format!("FC{fc:02X} 개수는 1~{max} 입니다 (지금 {qty})"), format!("FC{fc:02X} quantity must be 1–{max} (now {qty})")));
    }
    if start as u32 + qty as u32 > 65_536 {
        return Err(crate::tr!(format!("주소 {start} 부터 {qty}개가 65535 를 넘습니다"), format!("{qty} items from address {start} run past 65535")));
    }
    let mut p = vec![fc];
    p.extend(start.to_be_bytes());
    p.extend(qty.to_be_bytes());
    Ok(p)
}

/// FC05 — 코일 하나 켜기(FF00)·끄기(0000)
pub fn write_coil_pdu(addr: u16, on: bool) -> Vec<u8> {
    let mut p = vec![0x05];
    p.extend(addr.to_be_bytes());
    p.extend(if on { [0xFF, 0x00] } else { [0x00, 0x00] });
    p
}

/// FC06 — 레지스터 하나
pub fn write_register_pdu(addr: u16, v: u16) -> Vec<u8> {
    let mut p = vec![0x06];
    p.extend(addr.to_be_bytes());
    p.extend(v.to_be_bytes());
    p
}

fn check_span(start: u16, n: usize, max: usize) -> Result<(), String> {
    if n == 0 || n > max {
        return Err(crate::tr!(format!("한 번에 1~{max}개까지 씁니다 (지금 {n})"), format!("1–{max} items per write (now {n})")));
    }
    if start as usize + n > 65_536 {
        return Err(crate::tr!(format!("주소 {start} 부터 {n}개가 65535 를 넘습니다"), format!("{n} items from address {start} run past 65535")));
    }
    Ok(())
}

/// FC0F — 코일 여러 개(0 이 아니면 켬)
pub fn write_coils_pdu(start: u16, bits: &[u16]) -> Result<Vec<u8>, String> {
    check_span(start, bits.len(), MAX_WRITE_BITS)?;
    let mut packed = vec![0u8; bits.len().div_ceil(8)];
    for (i, &b) in bits.iter().enumerate() {
        if b != 0 {
            packed[i / 8] |= 1 << (i % 8);
        }
    }
    let mut p = vec![0x0F];
    p.extend(start.to_be_bytes());
    p.extend((bits.len() as u16).to_be_bytes());
    p.push(packed.len() as u8);
    p.extend(packed);
    Ok(p)
}

/// FC10 — 레지스터 여러 개
pub fn write_registers_pdu(start: u16, regs: &[u16]) -> Result<Vec<u8>, String> {
    check_span(start, regs.len(), MAX_WRITE_REGS)?;
    let mut p = vec![0x10];
    p.extend(start.to_be_bytes());
    p.extend((regs.len() as u16).to_be_bytes());
    p.push((regs.len() * 2) as u8);
    for v in regs {
        p.extend(v.to_be_bytes());
    }
    Ok(p)
}

/// 화면의 쓰기 — 한 칸이면 05·06, 여러 칸(타입 값 등)이거나 «늘 0F/10» 이면 0F·10
pub fn write_pdu(bits: bool, start: u16, values: &[u16], force_multi: bool) -> Result<Vec<u8>, String> {
    match (bits, values.len() == 1 && !force_multi) {
        (true, true) => Ok(write_coil_pdu(start, values[0] != 0)),
        (false, true) => Ok(write_register_pdu(start, values[0])),
        (true, false) => write_coils_pdu(start, values),
        (false, false) => write_registers_pdu(start, values),
    }
}

/// 보낼 바이트(ADU) — RTU: 국번 + PDU + CRC(작은 쪽 먼저), TCP: MBAP 7바이트 + PDU
pub fn frame(wire: Wire, tid: u16, unit: u8, pdu: &[u8]) -> Vec<u8> {
    match wire {
        Wire::Rtu => {
            let mut v = Vec::with_capacity(pdu.len() + 3);
            v.push(unit);
            v.extend(pdu);
            let crc = crc16_modbus(&v);
            v.extend(crc.to_le_bytes());
            v
        }
        Wire::Tcp => {
            let mut v = Vec::with_capacity(pdu.len() + 7);
            v.extend(tid.to_be_bytes());
            v.extend([0, 0]);
            v.extend((pdu.len() as u16 + 1).to_be_bytes());
            v.push(unit);
            v.extend(pdu);
            v
        }
    }
}

// ---------------------------------------------------------------- 응답 검사

/// 거래 하나의 결과
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "result", rename_all = "kebab-case")]
pub enum Outcome {
    /// 정상. 읽기면 값(비트는 0/1), 쓰기면 빈 목록
    Ok { values: Vec<u16> },
    /// 장비가 예외로 답함
    Exception { code: u8 },
    /// 시간 안에 답이 없음
    Timeout,
    /// RTU CRC 가 틀림
    Crc { why: String },
    /// 모양이 틀린 응답(바이트 수·국번·함수·MBAP·덜 옴)
    Bad { why: String },
    /// 보내지 못함(포트 끊김 등)
    SendError { why: String },
    /// 국번 0 — 답을 기다리지 않는다
    Broadcast,
}

impl Outcome {
    pub fn is_ok(&self) -> bool {
        matches!(self, Self::Ok { .. } | Self::Broadcast)
    }

    /// 짧은 이름(«ok», «timeout» …) — 통계·CSV
    pub fn name(&self) -> &'static str {
        match self {
            Self::Ok { .. } => "ok",
            Self::Exception { .. } => "exception",
            Self::Timeout => "timeout",
            Self::Crc { .. } => "crc",
            Self::Bad { .. } => "bad",
            Self::SendError { .. } => "send-error",
            Self::Broadcast => "broadcast",
        }
    }

    /// 다시 보내 볼 만한 실패(타임아웃·CRC·모양 틀림). 예외·보내기 실패는 다시 보내도 같다
    fn retryable(&self) -> bool {
        matches!(self, Self::Timeout | Self::Crc { .. } | Self::Bad { .. })
    }

    /// 사람이 읽는 한 줄
    pub fn text(&self) -> String {
        match self {
            Self::Ok { .. } => crate::tr!("정상", "OK").into(),
            Self::Exception { code } => exception_text(*code),
            Self::Timeout => crate::tr!("응답 없음(타임아웃)", "No response (timeout)").into(),
            Self::Crc { why } | Self::Bad { why } | Self::SendError { why } => why.clone(),
            Self::Broadcast => crate::tr!("브로드캐스트 — 응답 없음", "Broadcast — no response").into(),
        }
    }
}

fn bits_of(bytes: &[u8], count: usize) -> Vec<u16> {
    (0..count).map(|i| ((bytes[i / 8] >> (i % 8)) & 1) as u16).collect()
}

/// 응답 PDU 를 보낸 요청 PDU 와 맞춰 본다 — 함수 코드·바이트 수·되돌아온 주소/값
pub fn check_pdu(req: &[u8], resp: &[u8]) -> Outcome {
    let bad = |why: String| Outcome::Bad { why };
    let (Some(&fc), Some(&rf)) = (req.first(), resp.first()) else {
        return bad(crate::tr!("빈 응답", "Empty response").into());
    };
    if rf == fc | 0x80 {
        return if resp.len() == 2 {
            Outcome::Exception { code: resp[1] }
        } else {
            bad(crate::tr!(format!("예외 응답 길이가 틀림 ({}바이트)", resp.len()), format!("Exception reply has a wrong length ({} bytes)", resp.len())))
        };
    }
    if rf != fc {
        return bad(crate::tr!(format!("함수 코드가 다름 — 보냄 {fc:02X}, 받음 {rf:02X}"), format!("Function code mismatch — sent {fc:02X}, got {rf:02X}")));
    }
    let qty = u16_at(req, 3).unwrap_or(0) as usize;
    let count_bad = |want: usize| {
        bad(crate::tr!(
            format!("바이트 수가 틀림 — 기대 {want}, 받음 {} (데이터 {}바이트)", resp.get(1).copied().unwrap_or(0), resp.len().saturating_sub(2)),
            format!("Wrong byte count — expected {want}, got {} ({} data bytes)", resp.get(1).copied().unwrap_or(0), resp.len().saturating_sub(2))
        ))
    };
    match fc {
        0x01 | 0x02 => {
            let want = qty.div_ceil(8);
            if resp.len() != 2 + want || resp[1] as usize != want {
                return count_bad(want);
            }
            Outcome::Ok { values: bits_of(&resp[2..], qty) }
        }
        0x03 | 0x04 => {
            let want = qty * 2;
            if resp.len() != 2 + want || resp[1] as usize != want {
                return count_bad(want);
            }
            Outcome::Ok { values: resp[2..].as_chunks::<2>().0.iter().map(|c| u16::from_be_bytes(*c)).collect() }
        }
        // 05·06 은 요청을 그대로 되돌려 준다
        0x05 | 0x06 => {
            if resp != req {
                return bad(crate::tr!("되돌아온 주소·값이 보낸 것과 다름", "Echoed address/value differs from the request").into());
            }
            Outcome::Ok { values: Vec::new() }
        }
        // 0F·10 은 시작 주소·개수를 되돌려 준다
        0x0F | 0x10 => {
            if resp.len() != 5 || resp[1..5] != req[1..5] {
                return bad(crate::tr!("되돌아온 시작 주소·개수가 보낸 것과 다름", "Echoed start/quantity differs from the request").into());
            }
            Outcome::Ok { values: Vec::new() }
        }
        _ => bad(crate::tr!(format!("이 프로그램이 풀지 않는 함수 {fc:02X}"), format!("Function {fc:02X} is not decoded here"))),
    }
}

/// 받은 바이트를 얼마나 쓸지
#[derive(Debug, Clone, PartialEq)]
pub enum Take {
    /// 더 받아야 한다
    More,
    /// 앞의 n 바이트는 우리 응답이 아님(RS-485 에코·지난 트랜잭션의 늦은 응답) — 버리고 계속 기다린다
    Skip(usize),
    /// 앞의 n 바이트가 응답 하나
    Done(usize, Outcome),
}

/// RTU 응답 길이(CRC 포함) — 앞부분만으로 알 수 있으면
fn rtu_len(buf: &[u8]) -> Option<usize> {
    let f = *buf.get(1)?;
    if f & 0x80 != 0 {
        return Some(5);
    }
    match f {
        0x01..=0x04 => Some(5 + *buf.get(2)? as usize),
        0x05 | 0x06 | 0x0F | 0x10 => Some(8),
        // 모르는 함수 — 받은 만큼을 응답으로 본다(틀린 응답으로 끝낸다)
        _ => (buf.len() >= 5).then_some(buf.len()),
    }
}

/// 받은 바이트(`buf`)에서 응답 하나를 찾는다. `sent` 는 보낸 ADU(RS-485 에코를 알아보는 데 쓴다 — 비우면 보지 않음)
pub fn take(wire: Wire, tid: u16, unit: u8, req: &[u8], sent: &[u8], buf: &[u8]) -> Take {
    match wire {
        Wire::Rtu => {
            // 에코: 보낸 것이 그대로 먼저 돌아오면 버린다. 05·06 은 응답이 요청과 같아 가릴 수 없다 — 그대로 응답으로 본다
            let echo_ok = !sent.is_empty() && !matches!(req.first(), Some(0x05 | 0x06));
            if echo_ok && !buf.is_empty() {
                if buf.len() >= sent.len() && buf.starts_with(sent) {
                    return Take::Skip(sent.len());
                }
                if buf.len() < sent.len() && sent.starts_with(buf) {
                    return Take::More;
                }
            }
            let Some(n) = rtu_len(buf) else { return Take::More };
            if buf.len() < n {
                return Take::More;
            }
            let f = &buf[..n];
            if crc16_modbus(&f[..n - 2]).to_le_bytes() != f[n - 2..] {
                return Take::Done(n, Outcome::Crc { why: crate::tr!("CRC 오류", "CRC error").into() });
            }
            if f[0] != unit {
                let why = crate::tr!(format!("국번이 다름 — 보냄 {unit}, 받음 {}", f[0]), format!("Slave ID mismatch — sent {unit}, got {}", f[0]));
                return Take::Done(n, Outcome::Bad { why });
            }
            Take::Done(n, check_pdu(req, &f[1..n - 2]))
        }
        Wire::Tcp => {
            if buf.len() < 7 {
                return Take::More;
            }
            let len = u16_at(buf, 4).unwrap_or(0) as usize;
            if !(2..=254).contains(&len) {
                let why = crate::tr!(format!("MBAP 길이 칸이 틀림 ({len})"), format!("Bad MBAP length field ({len})"));
                return Take::Done(buf.len(), Outcome::Bad { why });
            }
            let total = 6 + len;
            if buf.len() < total {
                return Take::More;
            }
            if u16_at(buf, 2) != Some(0) {
                return Take::Done(total, Outcome::Bad { why: crate::tr!("MBAP 프로토콜 ID 가 0 이 아님", "MBAP protocol ID is not 0").into() });
            }
            if u16_at(buf, 0) != Some(tid) {
                return Take::Skip(total);
            }
            if buf[6] != unit {
                let why = crate::tr!(format!("유닛 ID 가 다름 — 보냄 {unit}, 받음 {}", buf[6]), format!("Unit ID mismatch — sent {unit}, got {}", buf[6]));
                return Take::Done(total, Outcome::Bad { why });
            }
            Take::Done(total, check_pdu(req, &buf[7..total]))
        }
    }
}

// ---------------------------------------------------------------- 통로와 거래

/// 바이트를 보내고 받은 조각을 꺼내는 통로
pub trait Link: Send {
    fn send(&mut self, bytes: &[u8]) -> Result<(), String>;
    /// 받은 조각 하나를 `wait` 까지 기다린다
    fn recv(&mut self, wait: Duration) -> Option<Vec<u8>>;
    /// 쌓인 것을 버린다(새 요청 직전)
    fn clear(&mut self) {}
}

/// 바이트를 내보내는 함수(세션의 send)
pub type SendFn = Box<dyn FnMut(&[u8]) -> Result<(), String> + Send>;

/// 보내는 함수 + 받은 조각 통로. 세션(시리얼·TCP)에는 `forwarding_responder` 를 응답기로 꽂는다
pub struct ChannelLink {
    send: SendFn,
    rx: Receiver<Vec<u8>>,
}

impl ChannelLink {
    pub fn new(send: impl FnMut(&[u8]) -> Result<(), String> + Send + 'static, rx: Receiver<Vec<u8>>) -> Self {
        Self { send: Box::new(send), rx }
    }
}

impl Link for ChannelLink {
    fn send(&mut self, bytes: &[u8]) -> Result<(), String> {
        (self.send)(bytes)
    }

    fn recv(&mut self, wait: Duration) -> Option<Vec<u8>> {
        match self.rx.recv_timeout(wait) {
            Ok(b) => Some(b),
            Err(RecvTimeoutError::Timeout) => None,
            // 세션이 사라졌다 — 기다리는 시간만큼 쉬어 헛돌지 않게
            Err(RecvTimeoutError::Disconnected) => {
                std::thread::sleep(wait);
                None
            }
        }
    }

    fn clear(&mut self) {
        while self.rx.try_recv().is_ok() {}
    }
}

/// 세션이 받은 프레임을 통로로 넘기는 응답기(답은 보내지 않는다)
pub fn forwarding_responder() -> (Responder, Receiver<Vec<u8>>) {
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    let r: Responder = Box::new(move |frame: &[u8]| {
        let _ = tx.send(frame.to_vec());
        Reply { bytes: None, delay_ms: 0, note: None }
    });
    (r, rx)
}

/// 응답 기다림·재시도·요청 간격
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timing {
    /// 응답을 기다리는 시간(ms)
    pub timeout_ms: u64,
    /// 타임아웃·CRC·모양 틀림이면 다시 보내는 횟수
    #[serde(default)]
    pub retries: u8,
    /// 앞 거래가 끝난 뒤 다음 요청까지 쉬는 시간(ms)
    #[serde(default)]
    pub delay_ms: u64,
}

impl Default for Timing {
    fn default() -> Self {
        Self { timeout_ms: 1000, retries: 0, delay_ms: 20 }
    }
}

impl Timing {
    pub fn check(&self) -> Result<(), String> {
        if !(10..=60_000).contains(&self.timeout_ms) {
            return Err(crate::tr!("응답 기다림은 10~60000 ms 입니다", "Response timeout must be 10–60000 ms").into());
        }
        if self.retries > 10 {
            return Err(crate::tr!("재시도는 0~10 번입니다", "Retries must be 0–10").into());
        }
        if self.delay_ms > 60_000 {
            return Err(crate::tr!("요청 간격은 0~60000 ms 입니다", "Delay between requests must be 0–60000 ms").into());
        }
        Ok(())
    }
}

/// 보낸 것 한 번
#[derive(Debug, Clone, PartialEq)]
pub struct Try {
    /// 보낸 시각(유닉스 ms)
    pub ts: u64,
    pub request: Vec<u8>,
    /// 응답(또는 시간 안에 온 조각)
    pub response: Vec<u8>,
    /// 응답을 받은 시각(유닉스 ms)
    pub rx_ts: u64,
    pub outcome: Outcome,
    /// 보낸 뒤 응답이 다 올 때까지(ms) — 응답이 없으면 0
    pub rtt_ms: f64,
}

/// 거래 하나(재시도 포함)
#[derive(Debug, Clone, PartialEq)]
pub struct Exchange {
    pub unit: u8,
    pub pdu: Vec<u8>,
    pub tries: Vec<Try>,
}

impl Exchange {
    pub fn last(&self) -> &Try {
        self.tries.last().expect("거래에는 시도가 하나 이상 있다")
    }
    pub fn outcome(&self) -> &Outcome {
        &self.last().outcome
    }
}

/// 요청을 하나씩 보내고 응답을 맞춘다
pub struct Master {
    pub wire: Wire,
    pub timing: Timing,
    tid: u16,
    /// 이때 전에는 보내지 않는다(요청 간격·브로드캐스트 쉼)
    next_ok: Option<Instant>,
}

impl Master {
    pub fn new(wire: Wire, timing: Timing) -> Self {
        Self { wire, timing, tid: 0, next_ok: None }
    }

    /// 거래 하나 — 실패하면 `timing.retries` 만큼 다시
    pub fn transact(&mut self, link: &mut dyn Link, unit: u8, pdu: &[u8]) -> Exchange {
        let timing = self.timing;
        self.transact_with(link, unit, pdu, timing)
    }

    /// 거래 하나(기다림·재시도를 이번만 다르게 — 찾기 등)
    pub fn transact_with(&mut self, link: &mut dyn Link, unit: u8, pdu: &[u8], timing: Timing) -> Exchange {
        let mut tries = Vec::new();
        for _ in 0..=timing.retries {
            let t = self.once(link, unit, pdu, timing);
            let again = t.outcome.retryable();
            tries.push(t);
            if !again || unit == 0 {
                break;
            }
        }
        Exchange { unit, pdu: pdu.to_vec(), tries }
    }

    fn once(&mut self, link: &mut dyn Link, unit: u8, pdu: &[u8], timing: Timing) -> Try {
        if let Some(t) = self.next_ok {
            let now = Instant::now();
            if t > now {
                std::thread::sleep(t - now);
            }
        }
        link.clear();
        self.tid = self.tid.wrapping_add(1);
        let tid = self.tid;
        let sent = frame(self.wire, tid, unit, pdu);
        let ts = now_ms();
        let t0 = Instant::now();
        let gap = Duration::from_millis(timing.delay_ms);
        let mut done = |outcome: Outcome, response: Vec<u8>, rtt: Option<Duration>, extra_gap: Duration| {
            self.next_ok = Some(Instant::now() + gap.max(extra_gap));
            Try { ts, request: sent.clone(), rx_ts: if rtt.is_some() { now_ms() } else { 0 }, response, outcome, rtt_ms: rtt.map_or(0.0, |d| d.as_secs_f64() * 1000.0) }
        };
        if let Err(why) = link.send(&sent) {
            return done(Outcome::SendError { why }, Vec::new(), None, Duration::ZERO);
        }
        if unit == 0 {
            return done(Outcome::Broadcast, Vec::new(), None, Duration::from_millis(BROADCAST_GAP_MS));
        }
        let deadline = t0 + Duration::from_millis(timing.timeout_ms);
        let mut buf: Vec<u8> = Vec::new();
        loop {
            match take(self.wire, tid, unit, pdu, &sent, &buf) {
                Take::More => {}
                Take::Skip(n) => {
                    buf.drain(..n.min(buf.len()));
                    continue;
                }
                Take::Done(n, outcome) => {
                    buf.truncate(n);
                    return done(outcome, buf, Some(t0.elapsed()), Duration::ZERO);
                }
            }
            let now = Instant::now();
            if now >= deadline {
                break;
            }
            if let Some(chunk) = link.recv(deadline - now) {
                buf.extend(chunk);
            }
        }
        // 시간이 다 됐다 — 에코로 미뤄 둔 것까지 한 번 더 보고, 덜 온 응답이면 그 이유를
        if !buf.is_empty() {
            if let Take::Done(n, outcome) = take(self.wire, tid, unit, pdu, &[], &buf) {
                buf.truncate(n);
                return done(outcome, buf, Some(t0.elapsed()), Duration::ZERO);
            }
            let why = crate::tr!(format!("응답이 끝까지 오지 않음 ({}바이트만 옴)", buf.len()), format!("Incomplete response (only {} bytes)", buf.len()));
            return done(Outcome::Bad { why }, buf, Some(t0.elapsed()), Duration::ZERO);
        }
        done(Outcome::Timeout, Vec::new(), None, Duration::ZERO)
    }
}

// ---------------------------------------------------------------- 폴링 일정

/// 표 하나의 폴링 순서. 주기(ms)가 0 이면 손으로만(«한 번 읽기»)
#[derive(Debug, Clone)]
struct Slot {
    interval: Duration,
    next: Instant,
}

/// 여러 표의 폴링 일정 — 때가 된 것 중 가장 오래 기다린 표부터. 밀려도 몰아서 읽지 않는다
#[derive(Debug, Default)]
pub struct Scheduler {
    slots: BTreeMap<u32, Slot>,
}

impl Scheduler {
    /// 표의 주기를 정한다(0 이면 뺀다). 주기가 그대로면 순서도 그대로
    pub fn set(&mut self, id: u32, interval_ms: u64, now: Instant) {
        if interval_ms == 0 {
            self.slots.remove(&id);
            return;
        }
        let interval = Duration::from_millis(interval_ms);
        match self.slots.get_mut(&id) {
            Some(s) if s.interval == interval => {}
            Some(s) => {
                s.interval = interval;
                s.next = s.next.min(now + interval);
            }
            None => {
                self.slots.insert(id, Slot { interval, next: now });
            }
        }
    }

    /// 목록에 없는 표를 뺀다
    pub fn retain(&mut self, ids: &[u32]) {
        self.slots.retain(|id, _| ids.contains(id));
    }

    /// 지금 읽을 표(때가 된 것 중 가장 앞선 예정)
    pub fn due(&self, now: Instant) -> Option<u32> {
        self.slots.iter().filter(|(_, s)| s.next <= now).min_by_key(|(id, s)| (s.next, **id)).map(|(id, _)| *id)
    }

    /// 읽기를 시작한 시각으로 다음 예정을 잡는다. 이미 지났으면(장비가 느림) 지금부터 — 밀린 것을 몰아서 하지 않는다
    pub fn done(&mut self, id: u32, started: Instant, now: Instant) {
        if let Some(s) = self.slots.get_mut(&id) {
            let next = started + s.interval;
            s.next = if next < now { now } else { next };
        }
    }

    /// 다음 예정까지 남은 시간(없으면 None)
    pub fn wait(&self, now: Instant) -> Option<Duration> {
        self.slots.values().map(|s| s.next.saturating_duration_since(now)).min()
    }
}

// ---------------------------------------------------------------- 일꾼

/// 폴링 표 하나
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PollSpec {
    pub id: u32,
    /// 국번(유닛 ID) 1~255 — 읽기에 0(브로드캐스트)은 못 쓴다
    pub unit: u8,
    /// 01·02·03·04
    pub fc: u8,
    pub start: u16,
    pub qty: u16,
    /// 폴링 주기(ms). 0 이면 «한 번 읽기» 로만
    pub interval_ms: u64,
    #[serde(default = "yes")]
    pub enabled: bool,
}

fn yes() -> bool {
    true
}

impl PollSpec {
    pub fn check(&self) -> Result<(), String> {
        if self.unit == 0 {
            return Err(crate::tr!("읽기 국번은 1~255 입니다(0 은 브로드캐스트 — 답이 없음)", "Read slave ID must be 1–255 (0 is broadcast — no reply)").into());
        }
        if self.interval_ms != 0 && !(10..=86_400_000).contains(&self.interval_ms) {
            return Err(crate::tr!("폴링 주기는 10ms~24시간입니다(0 = 손으로만)", "Poll interval must be 10 ms – 24 h (0 = manual)").into());
        }
        read_pdu(self.fc, self.start, self.qty).map(|_| ())
    }

    fn pdu(&self) -> Vec<u8> {
        read_pdu(self.fc, self.start, self.qty).unwrap_or_default()
    }
}

/// 국번 찾기 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanIds {
    pub from: u8,
    pub to: u8,
    /// 물어볼 함수(01~04)·주소
    pub fc: u8,
    pub addr: u16,
    pub timeout_ms: u64,
}

/// 주소 범위 찾기 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanAddrs {
    pub unit: u8,
    pub fc: u8,
    pub from: u16,
    /// 끝 주소(포함)
    pub to: u16,
    /// 한 번에 읽어 보는 개수
    pub block: u16,
    pub timeout_ms: u64,
    /// 덩어리가 예외면 한 칸씩 다시 확인
    #[serde(default = "yes")]
    pub fine: bool,
}

/// 통신 기록 한 줄 — 화면의 Frame 과 같은 모양(+ 풀이 «sum», 어느 표인지)
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Line {
    pub ts: u64,
    /// "tx" | "rx" | "ev"
    pub dir: &'static str,
    pub bytes: Vec<u8>,
    /// RTU 응답의 CRC 결과(TCP·요청은 None)
    pub check: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table: Option<u32>,
}

/// 폴링(또는 한 번 읽기) 결과
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PollResult {
    pub table: u32,
    pub ts: u64,
    pub outcome: Outcome,
    pub rtt_ms: f64,
    pub tries: u8,
}

/// 화면으로 보내는 사건
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case", rename_all_fields = "camelCase")]
pub enum MasterEvent {
    /// 통신 기록 줄과 폴링 결과 묶음(0.05초마다)
    Batch { lines: Vec<Line>, polls: Vec<PollResult> },
    /// 쓰기 결과
    Write { token: u64, table: u32, outcome: Outcome, rtt_ms: f64 },
    /// 국번 찾기: 답한 국번(예외·CRC 오류도 «누군가 있음»)
    ScanHit { unit: u8, outcome: Outcome, rtt_ms: f64 },
    /// 주소 찾기: 지금까지 읽힌 범위(시작, 끝 — 포함)
    ScanRanges { ranges: Vec<(u16, u16)> },
    ScanProgress { done: u32, total: u32 },
    /// 찾기 끝. stopped 는 스스로 멈춘 이유(예외 01·연속 무응답)
    ScanDone { kind: &'static str, found: u32, cancelled: bool, stopped: Option<String> },
}

/// 표 하나의 통계
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableStats {
    /// 보낸 요청(재시도 포함)
    pub requests: u64,
    pub ok: u64,
    pub exceptions: u64,
    pub timeouts: u64,
    pub crc: u64,
    /// 모양이 틀린 응답
    pub bad: u64,
    pub send_errors: u64,
    pub avg_ms: f64,
    pub max_ms: f64,
    pub last_ms: f64,
    #[serde(skip)]
    rtt_sum: f64,
    #[serde(skip)]
    rtt_n: u64,
}

impl TableStats {
    fn count(&mut self, t: &Try) {
        self.requests += 1;
        match &t.outcome {
            Outcome::Ok { .. } | Outcome::Broadcast => self.ok += 1,
            Outcome::Exception { .. } => self.exceptions += 1,
            Outcome::Timeout => self.timeouts += 1,
            Outcome::Crc { .. } => self.crc += 1,
            Outcome::Bad { .. } => self.bad += 1,
            Outcome::SendError { .. } => self.send_errors += 1,
        }
        if t.rtt_ms > 0.0 {
            self.rtt_sum += t.rtt_ms;
            self.rtt_n += 1;
            self.avg_ms = self.rtt_sum / self.rtt_n as f64;
            self.max_ms = self.max_ms.max(t.rtt_ms);
            self.last_ms = t.rtt_ms;
        }
    }

    pub fn errors(&self) -> u64 {
        self.exceptions + self.timeouts + self.crc + self.bad + self.send_errors
    }
}

/// 전체 + 표별 통계
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub total: TableStats,
    /// 표 번호(글자) → 통계
    pub tables: BTreeMap<String, TableStats>,
}

/// 찾기·쓰기 등 표가 없는 거래의 표 번호
pub const NO_TABLE: u32 = u32::MAX;

enum Job {
    Tables(Vec<PollSpec>),
    Timing(Timing),
    Style(AddrStyle),
    ReadOnce(u32),
    Write { token: u64, table: u32, unit: u8, pdu: Vec<u8> },
    ScanIds(ScanIds),
    ScanAddrs(ScanAddrs),
}

pub type Sink = Arc<dyn Fn(MasterEvent) + Send + Sync>;

/// 일꾼 — 통로 하나를 쥐고 폴링·한 번 읽기·쓰기·찾기를 차례로 한다
pub struct Engine {
    tx: Sender<Job>,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    scan_cancel: Arc<AtomicBool>,
    scanning: Arc<AtomicBool>,
    stats: Arc<Mutex<Stats>>,
    thread: Option<JoinHandle<()>>,
}

impl Drop for Engine {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        self.scan_cancel.store(true, Ordering::SeqCst);
    }
}

impl Engine {
    pub fn start(link: Box<dyn Link>, wire: Wire, timing: Timing, style: AddrStyle, tables: Vec<PollSpec>, sink: Sink) -> Self {
        let (tx, rx) = mpsc::channel();
        let stop = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));
        let scan_cancel = Arc::new(AtomicBool::new(false));
        let scanning = Arc::new(AtomicBool::new(false));
        let stats = Arc::new(Mutex::new(Stats::default()));
        let mut w = Worker {
            link,
            master: Master::new(wire, timing),
            summ: Summarizer::new(wire, style),
            tables: BTreeMap::new(),
            sched: Scheduler::default(),
            sink,
            stats: stats.clone(),
            stop: stop.clone(),
            paused: paused.clone(),
            scan_cancel: scan_cancel.clone(),
            scanning: scanning.clone(),
            lines: Vec::new(),
            polls: Vec::new(),
            last_flush: Instant::now(),
            last_send_error: None,
        };
        w.set_tables(tables);
        let thread = std::thread::spawn(move || w.run(rx));
        Self { tx, stop, paused, scan_cancel, scanning, stats, thread: Some(thread) }
    }

    fn job(&self, j: Job) {
        let _ = self.tx.send(j);
    }

    pub fn set_tables(&self, t: Vec<PollSpec>) {
        self.job(Job::Tables(t));
    }
    pub fn set_timing(&self, t: Timing) {
        self.job(Job::Timing(t));
    }
    pub fn set_style(&self, s: AddrStyle) {
        self.job(Job::Style(s));
    }
    pub fn read_once(&self, table: u32) {
        self.job(Job::ReadOnce(table));
    }
    /// 쓰기 — 결과는 `MasterEvent::Write { token }` 로
    pub fn write(&self, token: u64, table: u32, unit: u8, pdu: Vec<u8>) {
        self.job(Job::Write { token, table, unit, pdu });
    }
    /// 찾기 중에는 폴링이 멈춘다(버스는 하나)
    pub fn scan_ids(&self, cfg: ScanIds) {
        self.scan_cancel.store(false, Ordering::SeqCst);
        self.scanning.store(true, Ordering::SeqCst);
        self.job(Job::ScanIds(cfg));
    }
    pub fn scan_addrs(&self, cfg: ScanAddrs) {
        self.scan_cancel.store(false, Ordering::SeqCst);
        self.scanning.store(true, Ordering::SeqCst);
        self.job(Job::ScanAddrs(cfg));
    }
    pub fn cancel_scan(&self) {
        self.scan_cancel.store(true, Ordering::SeqCst);
    }
    pub fn scanning(&self) -> bool {
        self.scanning.load(Ordering::SeqCst)
    }
    /// 모든 표의 자동 폴링을 멈춘다(한 번 읽기·쓰기는 된다)
    pub fn set_paused(&self, on: bool) {
        self.paused.store(on, Ordering::SeqCst);
    }
    pub fn stats(&self) -> Stats {
        self.stats.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }
    pub fn reset_stats(&self) {
        *self.stats.lock().unwrap_or_else(|e| e.into_inner()) = Stats::default();
    }
    /// 멈추고 스레드가 끝날 때까지 기다린다
    pub fn stop(mut self) {
        self.stop.store(true, Ordering::SeqCst);
        self.scan_cancel.store(true, Ordering::SeqCst);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
    /// 멈추라고만 알린다(기다리지 않는다 — 세션 사건 통로 안에서 부를 때)
    pub fn signal_stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
        self.scan_cancel.store(true, Ordering::SeqCst);
    }
}

const FLUSH: Duration = Duration::from_millis(50);
/// 보내기 실패(포트 끊김)가 이어지면 이만큼 쉬며 다시 해 본다
const SEND_ERROR_BACKOFF: Duration = Duration::from_millis(500);

struct Worker {
    link: Box<dyn Link>,
    master: Master,
    summ: Summarizer,
    tables: BTreeMap<u32, PollSpec>,
    sched: Scheduler,
    sink: Sink,
    stats: Arc<Mutex<Stats>>,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    scan_cancel: Arc<AtomicBool>,
    scanning: Arc<AtomicBool>,
    lines: Vec<Line>,
    polls: Vec<PollResult>,
    last_flush: Instant,
    /// 이어지는 보내기 실패는 기록 줄을 한 번만
    last_send_error: Option<String>,
}

/// 요청 줄의 풀이에 붙일 PDU — RTU 는 국번·CRC, TCP 는 MBAP 를 뗀다
fn pdu_of(wire: Wire, adu: &[u8]) -> Option<(u8, &[u8])> {
    match wire {
        Wire::Rtu if adu.len() >= 4 => Some((adu[0], &adu[1..adu.len() - 2])),
        Wire::Tcp if adu.len() >= 8 => Some((adu[6], &adu[7..])),
        _ => None,
    }
}

impl Worker {
    fn set_tables(&mut self, list: Vec<PollSpec>) {
        let now = Instant::now();
        let ids: Vec<u32> = list.iter().map(|t| t.id).collect();
        self.sched.retain(&ids);
        self.tables.clear();
        for t in list {
            if t.check().is_err() {
                continue;
            }
            self.sched.set(t.id, if t.enabled { t.interval_ms } else { 0 }, now);
            self.tables.insert(t.id, t);
        }
    }

    fn emit(&mut self, e: MasterEvent) {
        self.flush();
        (self.sink)(e);
    }

    fn flush(&mut self) {
        self.last_flush = Instant::now();
        if self.lines.is_empty() && self.polls.is_empty() {
            return;
        }
        let e = MasterEvent::Batch { lines: std::mem::take(&mut self.lines), polls: std::mem::take(&mut self.polls) };
        (self.sink)(e);
    }

    fn maybe_flush(&mut self) {
        if self.last_flush.elapsed() >= FLUSH {
            self.flush();
        }
    }

    /// 거래 하나 + 기록 줄 + 통계
    fn exchange(&mut self, table: u32, unit: u8, pdu: &[u8], timing: Option<Timing>) -> Exchange {
        let timing = timing.unwrap_or(self.master.timing);
        let ex = self.master.transact_with(self.link.as_mut(), unit, pdu, timing);
        self.record(table, &ex, timing.timeout_ms);
        ex
    }

    fn record(&mut self, table: u32, ex: &Exchange, timeout_ms: u64) {
        {
            let mut st = self.stats.lock().unwrap_or_else(|e| e.into_inner());
            for t in &ex.tries {
                st.total.count(t);
                if table != NO_TABLE {
                    st.tables.entry(table.to_string()).or_default().count(t);
                }
            }
        }
        let tab = (table != NO_TABLE).then_some(table);
        let wire = self.master.wire;
        for (i, t) in ex.tries.iter().enumerate() {
            if let Outcome::SendError { why } = &t.outcome {
                if self.last_send_error.as_deref() != Some(why) {
                    self.last_send_error = Some(why.clone());
                    self.lines.push(Line { ts: t.ts, dir: "ev", bytes: Vec::new(), check: None, note: Some(format!("SEND FAIL {why}")), sum: None, table: tab });
                }
                continue;
            }
            self.last_send_error = None;
            // Modbus TCP 는 트랜잭션 번호를 앞에(«#7 id1 FC03 …») — 요청·응답 짝을 눈으로 맞춘다
            let head = |adu: &[u8]| match (wire, adu.get(..2)) {
                (Wire::Tcp, Some(b)) => format!("#{} ", u16::from_be_bytes([b[0], b[1]])),
                _ => String::new(),
            };
            let req_sum = pdu_of(wire, &t.request).map(|(u, p)| format!("{}{}", head(&t.request), self.summ.request(u, p)));
            let retry = if i > 0 { crate::tr!(format!(" (재시도 {i})"), format!(" (retry {i})")) } else { String::new() };
            self.lines.push(Line { ts: t.ts, dir: "tx", bytes: t.request.clone(), check: None, note: None, sum: req_sum.map(|s| format!("{s}{retry}")), table: tab });
            if !t.response.is_empty() {
                let rsum = match &t.outcome {
                    Outcome::Ok { .. } | Outcome::Exception { .. } => pdu_of(wire, &t.response).map(|(u, p)| format!("{}{}", head(&t.response), self.summ.response(u, Some(&ex.pdu), p))),
                    other => Some(other.text()),
                };
                let check = (wire == Wire::Rtu).then_some(!matches!(t.outcome, Outcome::Crc { .. }));
                let rtt = format!(" · {:.0} ms", t.rtt_ms);
                self.lines.push(Line { ts: t.rx_ts.max(t.ts), dir: "rx", bytes: t.response.clone(), check, note: None, sum: rsum.map(|s| format!("{s}{rtt}")), table: tab });
            }
            if matches!(t.outcome, Outcome::Timeout | Outcome::Broadcast) {
                let note = match t.outcome {
                    Outcome::Timeout => format!("TIMEOUT {timeout_ms} ms · id{}", ex.unit),
                    _ => format!("BROADCAST FC{:02X}", ex.pdu.first().copied().unwrap_or(0)),
                };
                self.lines.push(Line { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(note), sum: None, table: tab });
            }
        }
    }

    fn poll(&mut self, id: u32) {
        let Some(spec) = self.tables.get(&id).cloned() else { return };
        let ex = self.exchange(id, spec.unit, &spec.pdu(), None);
        let t = ex.last();
        let mut outcome = t.outcome.clone();
        // 비트 읽기 응답은 바이트 단위라 뒤가 남을 수 있다 — 요청한 개수만
        if let Outcome::Ok { values } = &mut outcome {
            values.truncate(spec.qty as usize);
        }
        self.polls.push(PollResult { table: id, ts: t.ts, outcome, rtt_ms: t.rtt_ms, tries: ex.tries.len() as u8 });
    }

    fn job(&mut self, j: Job) {
        match j {
            Job::Tables(t) => self.set_tables(t),
            Job::Timing(t) => self.master.timing = t,
            Job::Style(s) => self.summ.style = s,
            Job::ReadOnce(id) => self.poll(id),
            Job::Write { token, table, unit, pdu } => {
                let ex = self.exchange(table, unit, &pdu, None);
                let t = ex.last();
                let (outcome, rtt) = (t.outcome.clone(), t.rtt_ms);
                let ok = outcome.is_ok();
                self.emit(MasterEvent::Write { token, table, outcome, rtt_ms: rtt });
                // 쓴 표를 바로 다시 읽어 화면이 새 값을 보이게
                if ok && self.tables.contains_key(&table) {
                    self.poll(table);
                }
            }
            Job::ScanIds(cfg) => self.scan_ids(&cfg),
            Job::ScanAddrs(cfg) => self.scan_addrs(&cfg),
        }
    }

    /// 찾기 끝 — «찾는 중» 을 먼저 내리고 알린다
    fn scan_done(&mut self, kind: &'static str, found: u32, cancelled: bool, stopped: Option<String>) {
        self.scanning.store(false, Ordering::SeqCst);
        self.emit(MasterEvent::ScanDone { kind, found, cancelled, stopped });
    }

    fn halted(&self) -> bool {
        self.stop.load(Ordering::SeqCst)
    }

    fn cancelled(&self) -> bool {
        self.halted() || self.scan_cancel.load(Ordering::SeqCst)
    }

    fn run(&mut self, rx: Receiver<Job>) {
        loop {
            if self.halted() {
                break;
            }
            // 1) 할 일(쓰기·한 번 읽기·찾기·설정) 먼저
            match rx.try_recv() {
                Ok(j) => {
                    self.job(j);
                    self.maybe_flush();
                    continue;
                }
                Err(mpsc::TryRecvError::Disconnected) => break,
                Err(mpsc::TryRecvError::Empty) => {}
            }
            // 2) 때가 된 폴링
            let now = Instant::now();
            if !self.paused.load(Ordering::SeqCst)
                && let Some(id) = self.sched.due(now)
            {
                self.poll(id);
                self.sched.done(id, now, Instant::now());
                // 포트가 끊겨 보내지 못하면 잠깐 쉰다(같은 오류를 빠르게 되풀이하지 않게)
                if self.last_send_error.is_some() {
                    self.flush();
                    std::thread::sleep(SEND_ERROR_BACKOFF);
                }
                self.maybe_flush();
                continue;
            }
            // 3) 다음 예정까지(최대 50ms) 할 일을 기다린다
            self.flush();
            let wait = if self.paused.load(Ordering::SeqCst) { FLUSH } else { self.sched.wait(Instant::now()).unwrap_or(FLUSH).min(FLUSH) };
            match rx.recv_timeout(wait) {
                Ok(j) => {
                    self.job(j);
                    self.maybe_flush();
                }
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
        self.flush();
    }

    fn scan_timing(&self, timeout_ms: u64) -> Timing {
        Timing { timeout_ms: timeout_ms.clamp(10, 60_000), retries: 0, delay_ms: self.master.timing.delay_ms }
    }

    fn scan_ids(&mut self, cfg: &ScanIds) {
        let (from, to) = (cfg.from.max(1), cfg.to.max(cfg.from.max(1)));
        let total = (to - from) as u32 + 1;
        let timing = self.scan_timing(cfg.timeout_ms);
        let mut found = 0u32;
        let mut cancelled = false;
        let pdu = match read_pdu(cfg.fc, cfg.addr, 1) {
            Ok(p) => p,
            Err(e) => {
                self.scan_done("ids", 0, false, Some(e));
                return;
            }
        };
        for (i, unit) in (from..=to).enumerate() {
            if self.cancelled() {
                cancelled = true;
                break;
            }
            let ex = self.exchange(NO_TABLE, unit, &pdu, Some(timing));
            let t = ex.last();
            if let Outcome::SendError { why } = &t.outcome {
                let why = why.clone();
                self.scan_done("ids", found, false, Some(why));
                return;
            }
            // 정상·예외·CRC·모양 틀림 — 어쨌든 그 국번에 무언가 있다
            if !matches!(t.outcome, Outcome::Timeout) {
                found += 1;
                let (outcome, rtt_ms) = (t.outcome.clone(), t.rtt_ms);
                self.emit(MasterEvent::ScanHit { unit, outcome, rtt_ms });
            }
            if i % 4 == 3 || unit == to {
                self.emit(MasterEvent::ScanProgress { done: i as u32 + 1, total });
            }
        }
        self.scan_done("ids", found, cancelled, None);
    }

    fn scan_addrs(&mut self, cfg: &ScanAddrs) {
        let max = if matches!(cfg.fc, 0x01 | 0x02) { MAX_READ_BITS } else { MAX_READ_REGS };
        let block = cfg.block.clamp(1, max) as u32;
        let (from, to) = (cfg.from as u32, (cfg.to as u32).max(cfg.from as u32));
        let total = to - from + 1;
        let timing = self.scan_timing(cfg.timeout_ms);
        let mut ranges: Vec<(u16, u16)> = Vec::new();
        let mut silent = 0u32;
        let mut a = from;
        let mut stopped = None;
        let mut cancelled = false;
        let add = |ranges: &mut Vec<(u16, u16)>, s: u32, n: u32| {
            let (s, e) = (s as u16, (s + n - 1) as u16);
            match ranges.last_mut() {
                Some(last) if last.1 as u32 + 1 >= s as u32 => last.1 = last.1.max(e),
                _ => ranges.push((s, e)),
            }
        };
        'outer: while a <= to {
            if self.cancelled() {
                cancelled = true;
                break;
            }
            let n = block.min(to - a + 1);
            let Ok(pdu) = read_pdu(cfg.fc, a as u16, n as u16) else { break };
            let ex = self.exchange(NO_TABLE, cfg.unit, &pdu, Some(timing));
            match ex.outcome().clone() {
                Outcome::Ok { .. } => {
                    silent = 0;
                    add(&mut ranges, a, n);
                    self.emit(MasterEvent::ScanRanges { ranges: ranges.clone() });
                }
                // 지원하지 않는 함수 — 더 해 봐야 같다
                Outcome::Exception { code: 1 } => {
                    stopped = Some(exception_text(1));
                    break;
                }
                Outcome::Exception { .. } if n > 1 && cfg.fine => {
                    silent = 0;
                    for k in 0..n {
                        if self.cancelled() {
                            cancelled = true;
                            break 'outer;
                        }
                        let Ok(p1) = read_pdu(cfg.fc, (a + k) as u16, 1) else { break };
                        let one = self.exchange(NO_TABLE, cfg.unit, &p1, Some(timing));
                        match one.outcome() {
                            Outcome::Ok { .. } => {
                                add(&mut ranges, a + k, 1);
                                self.emit(MasterEvent::ScanRanges { ranges: ranges.clone() });
                            }
                            Outcome::Exception { code: 1 } => {
                                stopped = Some(exception_text(1));
                                break 'outer;
                            }
                            Outcome::SendError { why } => {
                                stopped = Some(why.clone());
                                break 'outer;
                            }
                            _ => {}
                        }
                    }
                }
                Outcome::Exception { .. } => silent = 0,
                Outcome::SendError { why } => {
                    stopped = Some(why);
                    break;
                }
                // 무응답·CRC — 세 번 이어지면 장비가 없거나 설정이 틀렸다
                _ => {
                    silent += 1;
                    if silent >= 3 {
                        stopped = Some(crate::tr!("세 번 이어서 응답이 없어 멈췄습니다 — 국번·통신 설정을 확인하세요", "Stopped after three requests in a row got no valid reply — check the slave ID and line settings").into());
                        break;
                    }
                }
            }
            a += n;
            self.emit(MasterEvent::ScanProgress { done: (a - from).min(total), total });
        }
        let found = ranges.iter().map(|(s, e)| (*e - *s) as u32 + 1).sum();
        self.scan_done("addrs", found, cancelled, stopped);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modbus_slave::{Slave, Table};
    use crate::regmap::{ValueType, WordOrder, decode, encode};
    use std::collections::VecDeque;

    fn with_crc(body: &[u8]) -> Vec<u8> {
        let mut v = body.to_vec();
        v.extend(crc16_modbus(body).to_le_bytes());
        v
    }

    fn fast(timeout_ms: u64, retries: u8) -> Timing {
        Timing { timeout_ms, retries, delay_ms: 0 }
    }

    // ------------------------------------------------------------ 요청 만들기

    #[test]
    fn builds_every_function() {
        assert_eq!(read_pdu(1, 0x13, 0x25).unwrap(), vec![1, 0, 0x13, 0, 0x25]);
        assert_eq!(read_pdu(2, 0xC4, 0x16).unwrap(), vec![2, 0, 0xC4, 0, 0x16]);
        assert_eq!(read_pdu(3, 0x6B, 3).unwrap(), vec![3, 0, 0x6B, 0, 3]);
        assert_eq!(read_pdu(4, 8, 1).unwrap(), vec![4, 0, 8, 0, 1]);
        assert_eq!(write_coil_pdu(0xAC, true), vec![5, 0, 0xAC, 0xFF, 0]);
        assert_eq!(write_coil_pdu(0xAC, false), vec![5, 0, 0xAC, 0, 0]);
        assert_eq!(write_register_pdu(1, 3), vec![6, 0, 1, 0, 3]);
        // 규격 예: 코일 20~29 에 CD 01
        assert_eq!(write_coils_pdu(0x13, &[1, 0, 1, 1, 0, 0, 1, 1, 1, 0]).unwrap(), vec![0x0F, 0, 0x13, 0, 0x0A, 2, 0xCD, 0x01]);
        assert_eq!(write_registers_pdu(1, &[0x000A, 0x0102]).unwrap(), vec![0x10, 0, 1, 0, 2, 4, 0, 0x0A, 1, 2]);
        // 한 칸 쓰기는 05·06, «늘 0F/10» 이면 다중
        assert_eq!(write_pdu(true, 7, &[1], false).unwrap()[0], 0x05);
        assert_eq!(write_pdu(false, 7, &[9], false).unwrap()[0], 0x06);
        assert_eq!(write_pdu(true, 7, &[1], true).unwrap()[0], 0x0F);
        assert_eq!(write_pdu(false, 7, &[9], true).unwrap()[0], 0x10);
        assert_eq!(write_pdu(false, 7, &[1, 2], false).unwrap()[0], 0x10);
        // 한도
        assert!(read_pdu(3, 0, 0).is_err());
        assert!(read_pdu(3, 0, 126).is_err());
        assert!(read_pdu(1, 0, 2000).is_ok());
        assert!(read_pdu(1, 0, 2001).is_err());
        assert!(read_pdu(3, 65_535, 2).is_err());
        assert!(read_pdu(5, 0, 1).is_err());
        assert!(write_registers_pdu(0, &[0; 124]).is_err());
        assert!(write_coils_pdu(0, &[0; 1969]).is_err());
        assert!(write_registers_pdu(65_535, &[1, 2]).is_err());
        // 감싸기 — RTU 규격 예 01 03 00 6B 00 03 → CRC 74 17, TCP MBAP
        assert_eq!(frame(Wire::Rtu, 0, 1, &[3, 0, 0x6B, 0, 3]), vec![1, 3, 0, 0x6B, 0, 3, 0x74, 0x17]);
        assert_eq!(frame(Wire::Tcp, 0x1234, 9, &[3, 0, 0, 0, 1]), vec![0x12, 0x34, 0, 0, 0, 6, 9, 3, 0, 0, 0, 1]);
    }

    // ------------------------------------------------------------ 응답 검사

    #[test]
    fn checks_responses() {
        let req = read_pdu(3, 0, 2).unwrap();
        assert_eq!(check_pdu(&req, &[3, 4, 0, 1, 0, 2]), Outcome::Ok { values: vec![1, 2] });
        // 바이트 수가 틀림·데이터 모자람·함수 다름·예외
        assert!(matches!(check_pdu(&req, &[3, 2, 0, 1]), Outcome::Bad { .. }));
        assert!(matches!(check_pdu(&req, &[3, 4, 0, 1, 0]), Outcome::Bad { .. }));
        assert!(matches!(check_pdu(&req, &[4, 4, 0, 1, 0, 2]), Outcome::Bad { .. }));
        assert_eq!(check_pdu(&req, &[0x83, 2]), Outcome::Exception { code: 2 });
        assert!(matches!(check_pdu(&req, &[0x83, 2, 0]), Outcome::Bad { .. }));
        // 비트: 10개 → 2바이트, 남는 비트는 버린다
        let rb = read_pdu(1, 0, 10).unwrap();
        assert_eq!(check_pdu(&rb, &[1, 2, 0b1010_0101, 0b11]), Outcome::Ok { values: vec![1, 0, 1, 0, 0, 1, 0, 1, 1, 1] });
        assert!(matches!(check_pdu(&rb, &[1, 1, 0xFF]), Outcome::Bad { .. }));
        // 쓰기 되돌림
        let w = write_register_pdu(5, 9);
        assert_eq!(check_pdu(&w, &w), Outcome::Ok { values: vec![] });
        assert!(matches!(check_pdu(&w, &[6, 0, 5, 0, 8]), Outcome::Bad { .. }));
        let wm = write_registers_pdu(5, &[1, 2]).unwrap();
        assert_eq!(check_pdu(&wm, &[0x10, 0, 5, 0, 2]), Outcome::Ok { values: vec![] });
        assert!(matches!(check_pdu(&wm, &[0x10, 0, 5, 0, 3]), Outcome::Bad { .. }));
    }

    #[test]
    fn take_rtu_crc_unit_echo_and_parts() {
        let req = read_pdu(3, 0, 1).unwrap();
        let sent = frame(Wire::Rtu, 0, 1, &req);
        let resp = with_crc(&[1, 3, 2, 0x12, 0x34]);
        // 조각으로 와도 다 모이면
        for k in 0..resp.len() {
            assert_eq!(take(Wire::Rtu, 0, 1, &req, &sent, &resp[..k]), Take::More, "{k}");
        }
        assert_eq!(take(Wire::Rtu, 0, 1, &req, &sent, &resp), Take::Done(7, Outcome::Ok { values: vec![0x1234] }));
        // CRC 틀림
        let mut bad = resp.clone();
        bad[6] ^= 1;
        assert!(matches!(take(Wire::Rtu, 0, 1, &req, &sent, &bad), Take::Done(7, Outcome::Crc { .. })));
        // 다른 국번
        assert!(matches!(take(Wire::Rtu, 0, 1, &req, &sent, &with_crc(&[2, 3, 2, 0, 0])), Take::Done(7, Outcome::Bad { .. })));
        // 예외
        assert_eq!(take(Wire::Rtu, 0, 1, &req, &sent, &with_crc(&[1, 0x83, 2])), Take::Done(5, Outcome::Exception { code: 2 }));
        // RS-485 에코: 보낸 것이 먼저 오면 버리고, 덜 온 에코는 기다린다
        assert_eq!(take(Wire::Rtu, 0, 1, &req, &sent, &sent[..3]), Take::More);
        let mut both = sent.clone();
        both.extend(&resp);
        assert_eq!(take(Wire::Rtu, 0, 1, &req, &sent, &both), Take::Skip(8));
        // 05·06 은 응답이 요청과 같다 — 에코로 보지 않는다
        let w = write_register_pdu(1, 1);
        let ws = frame(Wire::Rtu, 0, 1, &w);
        assert_eq!(take(Wire::Rtu, 0, 1, &w, &ws, &ws), Take::Done(8, Outcome::Ok { values: vec![] }));
    }

    #[test]
    fn take_tcp_transaction_matching() {
        let req = read_pdu(3, 0, 1).unwrap();
        let ok = [0, 7, 0, 0, 0, 5, 1, 3, 2, 0, 9];
        assert_eq!(take(Wire::Tcp, 7, 1, &req, &[], &ok[..10]), Take::More);
        assert_eq!(take(Wire::Tcp, 7, 1, &req, &[], &ok), Take::Done(11, Outcome::Ok { values: vec![9] }));
        // 지난 트랜잭션(6)의 늦은 응답은 건너뛴다
        let mut late = vec![0, 6, 0, 0, 0, 5, 1, 3, 2, 0, 1];
        assert_eq!(take(Wire::Tcp, 7, 1, &req, &[], &late), Take::Skip(11));
        late.extend(ok);
        assert_eq!(take(Wire::Tcp, 7, 1, &req, &[], &late[11..]), Take::Done(11, Outcome::Ok { values: vec![9] }));
        // 프로토콜 ID·유닛·길이 칸
        assert!(matches!(take(Wire::Tcp, 7, 1, &req, &[], &[0, 7, 0, 1, 0, 5, 1, 3, 2, 0, 9]), Take::Done(11, Outcome::Bad { .. })));
        assert!(matches!(take(Wire::Tcp, 7, 1, &req, &[], &[0, 7, 0, 0, 0, 5, 2, 3, 2, 0, 9]), Take::Done(11, Outcome::Bad { .. })));
        assert!(matches!(take(Wire::Tcp, 7, 1, &req, &[], &[0, 7, 0, 0, 0, 0, 1]), Take::Done(7, Outcome::Bad { .. })));
        assert_eq!(take(Wire::Tcp, 7, 1, &req, &[], &[0, 7, 0, 0, 0, 3, 1, 0x83, 2]), Take::Done(9, Outcome::Exception { code: 2 }));
    }

    // ------------------------------------------------------------ 가짜 통로

    type Answer = Box<dyn FnMut(&[u8]) -> Vec<Vec<u8>> + Send>;

    /// 각본대로 답하는 통로 — 보낸 것을 보고 돌려줄 조각들을 고른다
    struct Script {
        answer: Answer,
        q: VecDeque<Vec<u8>>,
        sent: Arc<Mutex<Vec<Vec<u8>>>>,
    }

    impl Script {
        fn new(answer: impl FnMut(&[u8]) -> Vec<Vec<u8>> + Send + 'static) -> (Self, Arc<Mutex<Vec<Vec<u8>>>>) {
            let sent = Arc::new(Mutex::new(Vec::new()));
            (Self { answer: Box::new(answer), q: VecDeque::new(), sent: sent.clone() }, sent)
        }
    }

    impl Link for Script {
        fn send(&mut self, bytes: &[u8]) -> Result<(), String> {
            self.sent.lock().unwrap().push(bytes.to_vec());
            let out = (self.answer)(bytes);
            self.q.extend(out);
            Ok(())
        }
        fn recv(&mut self, wait: Duration) -> Option<Vec<u8>> {
            let r = self.q.pop_front();
            if r.is_none() {
                std::thread::sleep(wait.min(Duration::from_millis(2)));
            }
            r
        }
        fn clear(&mut self) {
            self.q.clear();
        }
    }

    /// core 의 Slave 와 직접 붙은 통로(메모리 안)
    struct SlaveLink {
        slave: Arc<Mutex<Slave>>,
        wire: Wire,
        q: VecDeque<Vec<u8>>,
    }

    impl Link for SlaveLink {
        fn send(&mut self, bytes: &[u8]) -> Result<(), String> {
            let mut s = self.slave.lock().unwrap();
            let (r, _) = if self.wire == Wire::Tcp { s.handle_tcp(bytes) } else { s.handle(bytes) };
            if let Some(r) = r {
                // 쪼개서 보낸다 — 이어 붙이기도 같이 시험
                let mid = r.len() / 2;
                self.q.push_back(r[..mid].to_vec());
                self.q.push_back(r[mid..].to_vec());
            }
            Ok(())
        }
        fn recv(&mut self, wait: Duration) -> Option<Vec<u8>> {
            let r = self.q.pop_front();
            if r.is_none() {
                std::thread::sleep(wait.min(Duration::from_millis(2)));
            }
            r
        }
        fn clear(&mut self) {
            self.q.clear();
        }
    }

    fn slave_link(wire: Wire) -> (SlaveLink, Arc<Mutex<Slave>>) {
        let slave = Arc::new(Mutex::new(Slave::with_seed(7)));
        (SlaveLink { slave: slave.clone(), wire, q: VecDeque::new() }, slave)
    }

    #[test]
    fn retries_timeouts_and_echo() {
        // 처음 두 번은 답이 없고 세 번째에 답한다 → 재시도 2 면 성공
        let mut n = 0;
        let (mut link, sent) = Script::new(move |b| {
            n += 1;
            if n < 3 { vec![] } else { vec![with_crc(&[b[0], 3, 2, 0, 5])] }
        });
        let mut m = Master::new(Wire::Rtu, fast(20, 2));
        let ex = m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap());
        assert_eq!(ex.tries.len(), 3);
        assert_eq!(ex.tries[0].outcome, Outcome::Timeout);
        assert_eq!(ex.outcome(), &Outcome::Ok { values: vec![5] });
        assert_eq!(sent.lock().unwrap().len(), 3);
        // 예외는 다시 보내지 않는다
        let (mut link, sent) = Script::new(|b| vec![with_crc(&[b[0], 0x83, 2])]);
        let ex = m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap());
        assert_eq!((ex.tries.len(), ex.outcome().clone()), (1, Outcome::Exception { code: 2 }));
        assert_eq!(sent.lock().unwrap().len(), 1);
        // CRC 오류가 이어지면 재시도 끝에 CRC
        let (mut link, _) = Script::new(|b| {
            let mut r = with_crc(&[b[0], 3, 2, 0, 5]);
            r[6] ^= 0xFF;
            vec![r]
        });
        let ex = m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap());
        assert_eq!(ex.tries.len(), 3);
        assert!(matches!(ex.outcome(), Outcome::Crc { .. }));
        // 에코 + 응답(한 바이트씩)
        let (mut link, _) = Script::new(|b| {
            let mut all = b.to_vec();
            all.extend(with_crc(&[b[0], 3, 2, 0xAB, 0xCD]));
            all.into_iter().map(|x| vec![x]).collect()
        });
        let ex = m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap());
        assert_eq!(ex.outcome(), &Outcome::Ok { values: vec![0xABCD] });
        assert_eq!(ex.last().response.len(), 7);
        // 덜 온 응답은 «모양 틀림»(덜 옴)
        let (mut link, _) = Script::new(|b| vec![vec![b[0], 3, 2, 0]]);
        let ex = Master::new(Wire::Rtu, fast(20, 0)).transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap());
        assert!(matches!(ex.outcome(), Outcome::Bad { .. }));
        assert_eq!(ex.last().response, vec![1, 3, 2, 0]);
        // 브로드캐스트는 기다리지 않는다
        let (mut link, _) = Script::new(|_| vec![]);
        let t0 = Instant::now();
        let ex = m.transact(&mut link, 0, &write_register_pdu(0, 1));
        assert_eq!((ex.tries.len(), ex.outcome().clone()), (1, Outcome::Broadcast));
        assert!(t0.elapsed() < Duration::from_millis(15));
    }

    #[test]
    fn tcp_skips_late_reply_from_previous_transaction() {
        // 첫 요청은 늦게 답해(다음 요청 때 같이 온다) 타임아웃, 둘째 요청은 지난 응답을 건너뛰고 제 것을 받는다
        let mut held: Option<Vec<u8>> = None;
        let mut first = true;
        let (mut link, _) = Script::new(move |b| {
            let reply = |b: &[u8], v: u8| vec![b[0], b[1], 0, 0, 0, 5, b[6], 3, 2, 0, v];
            if first {
                first = false;
                held = Some(reply(b, 1));
                vec![]
            } else {
                vec![held.take().unwrap(), reply(b, 2)]
            }
        });
        let mut m = Master::new(Wire::Tcp, fast(20, 0));
        assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap()).outcome(), &Outcome::Timeout);
        // clear() 가 먼저 불리지만 늦은 응답은 보낸 뒤에 온다
        assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap()).outcome(), &Outcome::Ok { values: vec![2] });
    }

    #[test]
    fn delay_between_requests() {
        let (mut link, _) = Script::new(|b| vec![with_crc(&[b[0], 3, 2, 0, 1])]);
        let mut m = Master::new(Wire::Rtu, Timing { timeout_ms: 50, retries: 0, delay_ms: 30 });
        let pdu = read_pdu(3, 0, 1).unwrap();
        m.transact(&mut link, 1, &pdu);
        let t0 = Instant::now();
        m.transact(&mut link, 1, &pdu);
        assert!(t0.elapsed() >= Duration::from_millis(28), "{:?}", t0.elapsed());
    }

    // ------------------------------------------------------------ 폴링 일정

    #[test]
    fn scheduler_timing() {
        let t0 = Instant::now();
        let ms = |n: u64| t0 + Duration::from_millis(n);
        let mut s = Scheduler::default();
        s.set(1, 100, t0);
        s.set(2, 300, t0);
        s.set(3, 0, t0); // 손으로만 — 일정에 없다
        // 처음엔 둘 다 바로. 번호가 작은 것부터(같은 예정)
        assert_eq!(s.due(t0), Some(1));
        s.done(1, t0, ms(5));
        assert_eq!(s.due(ms(5)), Some(2));
        s.done(2, ms(5), ms(10));
        assert_eq!(s.due(ms(10)), None);
        assert_eq!(s.wait(ms(10)), Some(Duration::from_millis(90)));
        assert_eq!(s.due(ms(100)), Some(1));
        s.done(1, ms(100), ms(102));
        // 둘 다 때가 지났으면 더 오래 기다린 표(1: 200ms 예정)부터
        assert_eq!(s.due(ms(305)), Some(1));
        s.done(1, ms(305), ms(306));
        assert_eq!(s.due(ms(306)), Some(2));
        // 장비가 느려 600ms 걸렸다 — 다음 예정은 «지금»(밀린 것을 몰아서 하지 않는다)
        s.done(2, ms(306), ms(900));
        assert_eq!(s.due(ms(900)), Some(1));
        s.done(1, ms(900), ms(901));
        assert_eq!(s.due(ms(901)), Some(2), "밀린 표가 다음");
        s.done(2, ms(901), ms(902));
        assert_eq!(s.due(ms(902)), None, "표마다 한 번씩만");
        assert_eq!(s.wait(ms(902)), Some(Duration::from_millis(98)));
        // 주기를 줄이면 다음 예정도 당겨진다, 0 이면 빠진다
        s.set(2, 50, ms(902));
        assert!(s.wait(ms(902)).unwrap() <= Duration::from_millis(50));
        s.set(2, 0, ms(902));
        s.retain(&[]);
        assert_eq!(s.wait(ms(902)), None);
    }

    // ------------------------------------------------------------ 찾기(가짜 통로)

    fn collect() -> (Sink, Arc<Mutex<Vec<MasterEvent>>>) {
        let ev = Arc::new(Mutex::new(Vec::new()));
        let e2 = ev.clone();
        (Arc::new(move |e| e2.lock().unwrap().push(e)), ev)
    }

    fn wait_for(ev: &Arc<Mutex<Vec<MasterEvent>>>, what: impl Fn(&MasterEvent) -> bool) -> MasterEvent {
        let t0 = Instant::now();
        loop {
            if let Some(e) = ev.lock().unwrap().iter().find(|e| what(e)) {
                return e.clone();
            }
            assert!(t0.elapsed() < Duration::from_secs(10), "사건이 오지 않음");
            std::thread::sleep(Duration::from_millis(5));
        }
    }

    #[test]
    fn id_scan_with_fake_transport() {
        // 국번 3 은 정상, 17 은 예외(있긴 있다), 나머지는 무응답
        let (link, sent) = Script::new(|b| match b[0] {
            3 => vec![with_crc(&[3, 3, 2, 0, 0])],
            17 => vec![with_crc(&[17, 0x83, 2])],
            _ => vec![],
        });
        let (sink, ev) = collect();
        let e = Engine::start(Box::new(link), Wire::Rtu, fast(1000, 3), AddrStyle::default(), vec![], sink);
        e.scan_ids(ScanIds { from: 1, to: 20, fc: 3, addr: 0, timeout_ms: 10 });
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { .. }));
        assert_eq!(done, MasterEvent::ScanDone { kind: "ids", found: 2, cancelled: false, stopped: None });
        let hits: Vec<(u8, &'static str)> = ev.lock().unwrap().iter().filter_map(|e| if let MasterEvent::ScanHit { unit, outcome, .. } = e { Some((*unit, outcome.name())) } else { None }).collect();
        assert_eq!(hits, vec![(3, "ok"), (17, "exception")]);
        // 찾기는 재시도하지 않는다(20개 국번 = 20번)
        assert_eq!(sent.lock().unwrap().len(), 20);
        assert!(!e.scanning());
        let last = ev.lock().unwrap().iter().rev().find_map(|e| if let MasterEvent::ScanProgress { done, total } = e { Some((*done, *total)) } else { None });
        assert_eq!(last, Some((20, 20)));
        e.stop();
    }

    #[test]
    fn id_scan_cancel() {
        let (link, _) = Script::new(|_| vec![]);
        let (sink, ev) = collect();
        let e = Engine::start(Box::new(link), Wire::Rtu, Timing::default(), AddrStyle::default(), vec![], sink);
        e.scan_ids(ScanIds { from: 1, to: 247, fc: 3, addr: 0, timeout_ms: 20 });
        std::thread::sleep(Duration::from_millis(60));
        e.cancel_scan();
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { .. }));
        assert!(matches!(done, MasterEvent::ScanDone { cancelled: true, found: 0, .. }));
        e.stop();
    }

    // ------------------------------------------------------------ Slave 와 끝에서 끝까지(메모리)

    #[test]
    fn master_reads_and_writes_slave_rtu_and_tcp() {
        for wire in [Wire::Rtu, Wire::Tcp] {
            let (mut link, slave) = slave_link(wire);
            slave.lock().unwrap().models.get_mut(&1).unwrap().holding[3] = 1234;
            let mut m = Master::new(wire, fast(100, 0));
            assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 2, 2).unwrap()).outcome(), &Outcome::Ok { values: vec![0, 1234] });
            // f32 CDAB 를 10~11 에 쓰고(FC10) 다시 읽어 푼다
            let regs = encode(123.456, ValueType::F32, WordOrder::Cdab);
            assert_eq!(regs, vec![0xE979, 0x42F6]);
            assert!(m.transact(&mut link, 1, &write_registers_pdu(10, &regs).unwrap()).outcome().is_ok());
            assert_eq!(&slave.lock().unwrap().models[&1].holding[10..12], &[0xE979, 0x42F6]);
            let Outcome::Ok { values } = m.transact(&mut link, 1, &read_pdu(3, 10, 2).unwrap()).outcome().clone() else { panic!() };
            assert!((decode(&values, ValueType::F32, WordOrder::Cdab).unwrap() - 123.456).abs() < 1e-4);
            // 코일 05·0F, 입력 접점은 읽기만
            assert!(m.transact(&mut link, 1, &write_coil_pdu(4, true)).outcome().is_ok());
            assert!(m.transact(&mut link, 1, &write_coils_pdu(0, &[1, 0, 1]).unwrap()).outcome().is_ok());
            assert_eq!(m.transact(&mut link, 1, &read_pdu(1, 0, 5).unwrap()).outcome(), &Outcome::Ok { values: vec![1, 0, 1, 0, 1] });
            slave.lock().unwrap().models.get_mut(&1).unwrap().discrete[2] = 1;
            assert_eq!(m.transact(&mut link, 1, &read_pdu(2, 0, 3).unwrap()).outcome(), &Outcome::Ok { values: vec![0, 0, 1] });
            slave.lock().unwrap().models.get_mut(&1).unwrap().input[0] = 0xFFFF;
            assert_eq!(m.transact(&mut link, 1, &read_pdu(4, 0, 1).unwrap()).outcome(), &Outcome::Ok { values: vec![0xFFFF] });
            assert!(m.transact(&mut link, 1, &write_register_pdu(50, 7)).outcome().is_ok());
            // 범위 밖(기본 0~99) → 예외 02, 없는 국번 → 무응답
            assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 99, 2).unwrap()).outcome(), &Outcome::Exception { code: 2 });
            assert_eq!(m.transact(&mut link, 9, &read_pdu(3, 0, 1).unwrap()).outcome(), &Outcome::Timeout);
            // 장애 주입: CRC(RTU)·MBAP 길이(TCP)·무응답·예외
            {
                let mut s = slave.lock().unwrap();
                s.faults.bad_crc = true;
                s.faults.bad_mbap_len = true;
            }
            let o = m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap()).outcome().clone();
            match wire {
                Wire::Rtu => assert!(matches!(o, Outcome::Crc { .. }), "{o:?}"),
                // 길이 칸이 1 크면 덜 온 응답으로 기다리다 끝난다
                Wire::Tcp => assert!(matches!(o, Outcome::Bad { .. }), "{o:?}"),
            }
            {
                let mut s = slave.lock().unwrap();
                s.faults.bad_crc = false;
                s.faults.bad_mbap_len = false;
                s.faults.force_exception = 6;
            }
            assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap()).outcome(), &Outcome::Exception { code: 6 });
            slave.lock().unwrap().faults.force_exception = 0;
            slave.lock().unwrap().faults.no_response = true;
            assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 0, 1).unwrap()).outcome(), &Outcome::Timeout);
        }
    }

    #[test]
    fn engine_polls_writes_and_scans_against_slave() {
        let (link, slave) = slave_link(Wire::Rtu);
        {
            let mut s = slave.lock().unwrap();
            s.models.insert(3, Default::default());
            s.models.get_mut(&1).unwrap().holding[0] = 42;
            // 보유 레지스터는 5~24 만 답한다
            s.models.get_mut(&1).unwrap().ranges.insert(Table::HoldingRegisters, (5, 20));
        }
        let (sink, ev) = collect();
        let table = PollSpec { id: 7, unit: 1, fc: 3, start: 5, qty: 3, interval_ms: 20, enabled: true };
        let e = Engine::start(Box::new(link), Wire::Rtu, fast(100, 0), AddrStyle::default(), vec![table.clone()], sink);
        // 폴링 결과와 기록 줄
        wait_for(&ev, |e| matches!(e, MasterEvent::Batch { polls, .. } if polls.iter().any(|p| p.table == 7 && p.outcome == Outcome::Ok { values: vec![0, 0, 0] })));
        let line = wait_for(&ev, |e| matches!(e, MasterEvent::Batch { lines, .. } if !lines.is_empty()));
        let MasterEvent::Batch { lines, .. } = line else { panic!() };
        assert_eq!(lines[0].dir, "tx");
        assert_eq!(lines[0].sum.as_deref(), Some("id1 FC03 HR 5..7 (3)"));
        assert_eq!(lines[1].dir, "rx");
        assert_eq!(lines[1].check, Some(true));
        // 쓰기 → 결과 + 바로 다시 읽기(새 값)
        let regs = encode(-2.5, ValueType::F32, WordOrder::Cdab);
        e.write(1, 7, 1, write_pdu(false, 6, &regs, false).unwrap());
        let w = wait_for(&ev, |e| matches!(e, MasterEvent::Write { token: 1, .. }));
        assert!(matches!(w, MasterEvent::Write { outcome: Outcome::Ok { .. }, table: 7, .. }));
        wait_for(&ev, |e| matches!(e, MasterEvent::Batch { polls, .. } if polls.iter().any(|p| p.outcome == Outcome::Ok { values: vec![0, regs[0], regs[1]] })));
        assert_eq!(decode(&slave.lock().unwrap().models[&1].holding[6..8], ValueType::F32, WordOrder::Cdab), Some(-2.5));
        // 통계
        let st = e.stats();
        assert!(st.tables["7"].ok >= 2 && st.tables["7"].requests >= 3, "{st:?}");
        assert_eq!(st.tables["7"].errors(), 0);
        // 국번 찾기(1·3 이 답한다) — 찾는 동안 폴링은 쉰다
        e.set_paused(true);
        ev.lock().unwrap().clear();
        e.scan_ids(ScanIds { from: 1, to: 5, fc: 3, addr: 5, timeout_ms: 15 });
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { .. }));
        assert!(matches!(done, MasterEvent::ScanDone { found: 2, .. }), "{done:?}");
        // 국번 3 은 0~99 가 기본 — 주소 5 를 읽으니 정상, 국번 1 도 정상
        // 주소 범위 찾기: 0~39 를 10개씩 → 5~24 만 읽힌다(예외 덩어리는 한 칸씩 확인)
        ev.lock().unwrap().clear();
        e.scan_addrs(ScanAddrs { unit: 1, fc: 3, from: 0, to: 39, block: 10, timeout_ms: 15, fine: true });
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { kind: "addrs", .. }));
        assert!(matches!(done, MasterEvent::ScanDone { found: 20, cancelled: false, stopped: None, .. }), "{done:?}");
        let ranges = ev.lock().unwrap().iter().rev().find_map(|e| if let MasterEvent::ScanRanges { ranges } = e { Some(ranges.clone()) } else { None });
        assert_eq!(ranges, Some(vec![(5, 24)]));
        // 없는 국번이면 세 번 무응답 뒤 스스로 멈춘다
        ev.lock().unwrap().clear();
        e.scan_addrs(ScanAddrs { unit: 9, fc: 3, from: 0, to: 999, block: 10, timeout_ms: 10, fine: true });
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { kind: "addrs", .. }));
        assert!(matches!(done, MasterEvent::ScanDone { found: 0, stopped: Some(_), .. }), "{done:?}");
        // 지원하지 않는 함수(예외 01)면 바로 멈춘다
        slave.lock().unwrap().faults.force_exception = 1;
        ev.lock().unwrap().clear();
        e.scan_addrs(ScanAddrs { unit: 1, fc: 3, from: 0, to: 999, block: 10, timeout_ms: 10, fine: true });
        let done = wait_for(&ev, |e| matches!(e, MasterEvent::ScanDone { kind: "addrs", .. }));
        assert!(matches!(done, MasterEvent::ScanDone { found: 0, stopped: Some(_), .. }), "{done:?}");
        e.stop();
    }

    #[test]
    fn engine_tcp_lines_carry_transaction_id() {
        let (link, _slave) = slave_link(Wire::Tcp);
        let (sink, ev) = collect();
        let t = PollSpec { id: 1, unit: 1, fc: 4, start: 0, qty: 2, interval_ms: 0, enabled: true };
        let e = Engine::start(Box::new(link), Wire::Tcp, fast(100, 0), AddrStyle { base: 0, plc: true }, vec![t], sink);
        e.read_once(1);
        let b = wait_for(&ev, |e| matches!(e, MasterEvent::Batch { lines, .. } if lines.len() >= 2));
        let MasterEvent::Batch { lines, polls } = b else { panic!() };
        assert_eq!(lines[0].sum.as_deref(), Some("#1 id1 FC04 IR 30001..30002 (2)"));
        assert!(lines[1].sum.as_deref().is_some_and(|s| s.starts_with("#1 id1 FC04 IR 30001..30002 → ")), "{:?}", lines[1].sum);
        assert_eq!(lines[1].check, None, "TCP 에는 CRC 가 없다");
        assert_eq!(polls[0].outcome, Outcome::Ok { values: vec![0, 0] });
        e.stop();
    }

    #[test]
    fn engine_manual_table_and_send_errors() {
        // 보내기가 늘 실패하는 통로 — 기록 줄은 한 번만, 결과는 send-error
        struct Dead;
        impl Link for Dead {
            fn send(&mut self, _: &[u8]) -> Result<(), String> {
                Err("port gone".into())
            }
            fn recv(&mut self, _: Duration) -> Option<Vec<u8>> {
                None
            }
        }
        let (sink, ev) = collect();
        let manual = PollSpec { id: 1, unit: 1, fc: 4, start: 0, qty: 2, interval_ms: 0, enabled: true };
        let e = Engine::start(Box::new(Dead), Wire::Rtu, fast(50, 0), AddrStyle::default(), vec![manual], sink);
        std::thread::sleep(Duration::from_millis(80));
        assert!(!ev.lock().unwrap().iter().any(|e| matches!(e, MasterEvent::Batch { .. })), "손으로만 읽는 표는 저절로 읽지 않는다");
        e.read_once(1);
        e.read_once(1);
        wait_for(&ev, |e| matches!(e, MasterEvent::Batch { polls, .. } if polls.iter().any(|p| p.outcome.name() == "send-error")));
        std::thread::sleep(Duration::from_millis(80));
        let evs = ev.lock().unwrap().clone();
        let fails = evs.iter().flat_map(|e| if let MasterEvent::Batch { lines, .. } = e { lines.clone() } else { vec![] }).filter(|l| l.note.as_deref().is_some_and(|n| n.starts_with("SEND FAIL"))).count();
        assert_eq!(fails, 1);
        assert_eq!(e.stats().tables["1"].send_errors, 2);
        e.stop();
    }

    #[test]
    fn spec_and_timing_checks_and_json() {
        let p: PollSpec = serde_json::from_str(r#"{"id":1,"unit":1,"fc":3,"start":0,"qty":10,"intervalMs":1000}"#).unwrap();
        assert!(p.enabled && p.check().is_ok());
        assert!(PollSpec { unit: 0, ..p.clone() }.check().is_err());
        assert!(PollSpec { qty: 126, ..p.clone() }.check().is_err());
        assert!(PollSpec { interval_ms: 5, ..p.clone() }.check().is_err());
        assert!(PollSpec { fc: 6, ..p.clone() }.check().is_err());
        let t: Timing = serde_json::from_str(r#"{"timeoutMs":500}"#).unwrap();
        assert_eq!(t, Timing { timeout_ms: 500, retries: 0, delay_ms: 0 });
        assert!(Timing { timeout_ms: 5, ..t }.check().is_err());
        assert!(Timing { retries: 11, ..t }.check().is_err());
        // 사건 모양(화면이 읽는 이름)
        let v = serde_json::to_value(MasterEvent::Write { token: 3, table: 1, outcome: Outcome::Exception { code: 2 }, rtt_ms: 1.5 }).unwrap();
        assert_eq!(v["type"], "write");
        assert_eq!(v["outcome"]["result"], "exception");
        assert_eq!(v["outcome"]["code"], 2);
        assert_eq!(v["rttMs"], 1.5);
        let v = serde_json::to_value(MasterEvent::ScanRanges { ranges: vec![(1, 2)] }).unwrap();
        assert_eq!(v["type"], "scan-ranges");
        let v = serde_json::to_value(Outcome::SendError { why: "x".into() }).unwrap();
        assert_eq!(v["result"], "send-error");
        let s = serde_json::to_value(Stats::default()).unwrap();
        assert!(s["total"].get("rttSum").is_none() && s["total"]["avgMs"] == 0.0);
    }

    // ------------------------------------------------------------ 진짜 TCP(같은 PC)로 Slave 와

    #[test]
    fn loopback_tcp_against_slave_session() {
        use crate::event::EventSink;
        use crate::framer::FrameMode;
        use crate::tcp::{TcpConfig, TcpSession};

        let slave = Arc::new(Mutex::new(Slave::with_seed(3)));
        let s2 = slave.clone();
        let responder: Responder = Box::new(move |f: &[u8]| {
            let (bytes, _) = s2.lock().unwrap().handle_tcp(f);
            Reply { bytes, delay_ms: 0, note: None }
        });
        // 설정은 JSON 으로 — 다른 칸이 늘어도(기본값이 있으면) 이 시험은 그대로
        let cfg = |mode: &str, port: u16| -> TcpConfig { serde_json::from_value(serde_json::json!({ "mode": mode, "host": "127.0.0.1", "port": port, "noDelay": true, "autoReconnect": false })).unwrap() };
        let server = TcpSession::start(cfg("server", 0), FrameMode::modbus_tcp(), None, Some(responder), EventSink::new(|_| {})).unwrap();
        let port = server.local_addr().unwrap().port();
        let (fwd, rx) = forwarding_responder();
        let client = Arc::new(TcpSession::start(cfg("client", port), FrameMode::modbus_tcp(), None, Some(fwd), EventSink::new(|_| {})).unwrap());
        let c2 = client.clone();
        let mut link = ChannelLink::new(move |b: &[u8]| c2.send(None, b).map(|_| ()), rx);
        // 접속될 때까지
        let t0 = Instant::now();
        while client.send(None, &[]).is_err() {
            assert!(t0.elapsed() < Duration::from_secs(5), "접속되지 않음");
            std::thread::sleep(Duration::from_millis(20));
        }
        let mut m = Master::new(Wire::Tcp, fast(1000, 1));
        let regs = encode(123.456, ValueType::F32, WordOrder::Cdab);
        assert!(m.transact(&mut link, 1, &write_registers_pdu(20, &regs).unwrap()).outcome().is_ok());
        let Outcome::Ok { values } = m.transact(&mut link, 1, &read_pdu(3, 20, 2).unwrap()).outcome().clone() else { panic!() };
        assert_eq!(values, vec![0xE979, 0x42F6]);
        assert!((decode(&values, ValueType::F32, WordOrder::Cdab).unwrap() - 123.456).abs() < 1e-4);
        assert_eq!(m.transact(&mut link, 1, &read_pdu(3, 150, 1).unwrap()).outcome(), &Outcome::Exception { code: 2 });
        drop(link);
        Arc::try_unwrap(client).ok().unwrap().stop();
        server.stop();
    }
}
