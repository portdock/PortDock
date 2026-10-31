//! Modbus TCP ↔ RTU 게이트웨이(0.10.0) — 포트 나눔(`share`)의 세 번째 방식.
//! SCADA·HMI·PC 프로그램이 Modbus TCP 로 붙으면 MBAP 요청을 RTU 프레임(국번 = Unit ID, CRC)으로 바꿔
//! 연 COM 포트(RS-485)로 보내고, 응답을 다시 MBAP 로 돌려준다.
//!
//! - RTU 버스는 반이중 — 요청은 모든 클라이언트를 통틀어 한 번에 하나씩 줄 세운다(`Engine::run`).
//! - 보내기 전 3.5 문자 간격(19200 bps 초과는 1.75ms)을 지킨다 — 앞 응답·앞 요청의 끝에서부터.
//! - 응답 타임아웃 → 예외 0x0B(게이트웨이 대상 응답 없음). 허용 국번 밖 → 예외 0x0A(경로 없음).
//! - Unit ID 0 → 방송(응답을 기다리지 않음, 클라이언트에도 답하지 않음) 또는 기본 국번으로 바꿔 보내기(설정).
//! - CRC 가 맞지 않거나 다른 국번·함수의 응답은 버리고 계속 기다린다.
//!
//! 변환·줄 세우기·타임아웃 판정은 화면 없이 값만 — 시험은 이 파일 아래(가짜 직렬 포트로 왕복).

use crate::checksum::crc16_modbus;
use crate::rtu_sniff::{crc_ok, response_len, silence_for};
use crate::share::Port;
use serde::{Deserialize, Serialize};
use std::ops::RangeInclusive;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, SyncSender, TrySendError};
use std::sync::{Condvar, Mutex};
use std::time::{Duration, Instant};

/// MBAP 머리(트랜잭션 ID 2 · 프로토콜 2 · 길이 2 · Unit ID 1)
pub const MBAP_HEAD: usize = 7;
/// 줄에 세워 둘 수 있는 요청 수 — 넘치면 예외 0x06(장비 바쁨)
pub const QUEUE_MAX: usize = 64;
/// 받기 버퍼 상한(기다리는 요청이 없을 때 버스에서 들어온 바이트)
const BUS_MAX: usize = 1024;

/// Unit ID 0 을 어떻게 다루나
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Unit0 {
    /// RTU 방송(국번 0) — 응답을 기다리지 않는다
    #[default]
    Broadcast,
    /// 기본 국번으로 바꿔 보낸다
    Default,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GatewayConfig {
    /// 응답 타임아웃(ms) — 보낸 프레임이 다 나간 뒤부터
    pub timeout_ms: u32,
    pub unit0: Unit0,
    /// Unit ID 0 을 «기본 국번» 으로 다룰 때의 국번(1~247)
    pub default_unit: u8,
    /// 보낼 국번 «1-10, 17». 비우면 1~247 모두. 밖이면 예외 0x0A
    pub units: String,
    /// 방송 뒤 다음 요청까지 쉬는 시간(ms) — 장비가 방송을 처리할 틈
    pub broadcast_delay_ms: u32,
}

impl Default for GatewayConfig {
    fn default() -> Self {
        Self { timeout_ms: 1000, unit0: Unit0::Broadcast, default_unit: 1, units: String::new(), broadcast_delay_ms: 100 }
    }
}

/// MBAP 요청 하나
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Mbap {
    pub tid: u16,
    pub unit: u8,
    /// 함수 코드 + 데이터
    pub pdu: Vec<u8>,
}

impl Mbap {
    pub fn fc(&self) -> u8 {
        self.pdu.first().copied().unwrap_or(0)
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Parsed {
    /// 더 와야 한다
    Need,
    /// 프레임 하나와 그 길이(버퍼에서 뗄 바이트 수)
    Frame(Mbap, usize),
    /// Modbus TCP 가 아니다 — 연결을 끊는다
    Bad(String),
}

/// 버퍼 앞에서 MBAP 프레임 하나를 읽는다
pub fn parse_mbap(buf: &[u8]) -> Parsed {
    if buf.len() < MBAP_HEAD {
        return Parsed::Need;
    }
    let proto = u16::from_be_bytes([buf[2], buf[3]]);
    if proto != 0 {
        return Parsed::Bad(crate::tr!(format!("프로토콜 ID {proto} — Modbus TCP(0)가 아님"), format!("protocol ID {proto} — not Modbus TCP (0)")));
    }
    let len = u16::from_be_bytes([buf[4], buf[5]]) as usize;
    if !(2..=254).contains(&len) {
        return Parsed::Bad(crate::tr!(format!("MBAP 길이 {len} — 2~254 밖"), format!("MBAP length {len} — outside 2–254")));
    }
    if buf.len() < 6 + len {
        return Parsed::Need;
    }
    Parsed::Frame(Mbap { tid: u16::from_be_bytes([buf[0], buf[1]]), unit: buf[6], pdu: buf[7..6 + len].to_vec() }, 6 + len)
}

/// MBAP 프레임 바이트(응답)
pub fn mbap_bytes(tid: u16, unit: u8, pdu: &[u8]) -> Vec<u8> {
    let mut v = Vec::with_capacity(MBAP_HEAD + pdu.len());
    v.extend_from_slice(&tid.to_be_bytes());
    v.extend_from_slice(&[0, 0]);
    v.extend_from_slice(&((pdu.len() + 1) as u16).to_be_bytes());
    v.push(unit);
    v.extend_from_slice(pdu);
    v
}

/// 예외 응답 PDU
pub fn exception_pdu(fc: u8, code: u8) -> Vec<u8> {
    vec![fc | 0x80, code]
}

/// RTU 프레임(국번 + PDU + CRC 낮은 바이트 먼저)
pub fn rtu_frame(unit: u8, pdu: &[u8]) -> Vec<u8> {
    let mut v = Vec::with_capacity(pdu.len() + 3);
    v.push(unit);
    v.extend_from_slice(pdu);
    let crc = crc16_modbus(&v).to_le_bytes();
    v.extend_from_slice(&crc);
    v
}

/// «1-10, 17» → 범위들. 비면 빈 목록(= 모두)
pub fn parse_units(s: &str) -> Result<Vec<RangeInclusive<u8>>, String> {
    let bad = |p: &str| crate::tr!(format!("국번 «{p}» — 1~247 또는 «1-10» 모양으로"), format!("unit «{p}» — use 1–247 or a range like «1-10»"));
    let mut out = Vec::new();
    for part in s.split([',', ' ', ';']).map(str::trim).filter(|p| !p.is_empty()) {
        let (a, b) = match part.split_once('-') {
            Some((a, b)) => (a.trim(), b.trim()),
            None => (part, part),
        };
        let (Ok(a), Ok(b)) = (a.parse::<u8>(), b.parse::<u8>()) else { return Err(bad(part)) };
        if a == 0 || b > 247 || a > b {
            return Err(bad(part));
        }
        out.push(a..=b);
    }
    Ok(out)
}

/// 요청을 어디로 보내나
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Route {
    /// 이 국번으로 보내고 응답을 기다린다
    Unit(u8),
    /// 국번 0 으로 보내고 기다리지 않는다
    Broadcast,
    /// 보내지 않고 예외 0x0A
    NoRoute,
}

pub fn route(unit: u8, cfg: &GatewayConfig, allowed: &[RangeInclusive<u8>]) -> Route {
    let u = match (unit, cfg.unit0) {
        (0, Unit0::Broadcast) => return Route::Broadcast,
        (0, Unit0::Default) => cfg.default_unit,
        (u, _) => u,
    };
    if !(1..=247).contains(&u) || (!allowed.is_empty() && !allowed.iter().any(|r| r.contains(&u))) {
        return Route::NoRoute;
    }
    Route::Unit(u)
}

/// 3.5 문자 시간(1문자 = 11비트). 19200 bps 초과는 1.75ms(Modbus 규격)
pub fn frame_gap(baud: u32) -> Duration {
    if baud > 19_200 { Duration::from_micros(1_750) } else { Duration::from_micros(38_500_000 / baud.max(1) as u64) }
}

/// `len` 바이트가 선로에 나가는 시간(1문자 = 11비트)
pub fn tx_time(len: usize, baud: u32) -> Duration {
    Duration::from_micros(len as u64 * 11_000_000 / baud.max(1) as u64)
}

/// 받은 응답 판정
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Check {
    Wait,
    /// 앞에서 이 길이가 맞는 응답
    Done(usize),
    /// 버린다 — CRC 오류·잘린 프레임
    Crc,
    /// 버린다 — 다른 국번·함수의 프레임
    Foreign,
}

/// 받기 버퍼가 `unit`·`fc` 요청의 응답인지. `quiet` = 마지막 바이트 뒤로 프레임 끝으로 볼 만큼 조용함
pub fn check_response(buf: &[u8], unit: u8, fc: u8, quiet: bool) -> Check {
    if buf.is_empty() {
        return Check::Wait;
    }
    if buf.len() >= 2 && (buf[0] != unit || buf[1] & 0x7F != fc & 0x7F) {
        return if quiet { Check::Foreign } else { Check::Wait };
    }
    match response_len(buf) {
        Some(l) if buf.len() >= l && crc_ok(&buf[..l]) => Check::Done(l),
        None if quiet && crc_ok(buf) => Check::Done(buf.len()),
        _ if quiet => Check::Crc,
        _ => Check::Wait,
    }
}

/// 통계(화면 칸)
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GwStats {
    /// 받은 요청(모든 클라이언트)
    pub requests: u64,
    /// 장비가 돌려준 정상 응답
    pub responses: u64,
    /// 장비가 돌려준 예외 응답
    pub exceptions: u64,
    /// 응답 없음 → 예외 0x0B
    pub timeouts: u64,
    /// 버린 응답(CRC 오류·잘림)
    pub crc_errors: u64,
    /// 경로 없음 → 예외 0x0A
    pub no_route: u64,
    /// 방송(응답 안 기다림)
    pub broadcasts: u64,
    /// 줄이 넘쳐 예외 0x06
    pub busy: u64,
    pub last_ms: Option<f64>,
    pub avg_ms: Option<f64>,
    pub max_ms: Option<f64>,
    #[serde(skip)]
    rtt_sum: f64,
}

impl GwStats {
    fn rtt(&mut self, d: Duration) {
        let ms = (d.as_secs_f64() * 10_000.0).round() / 10.0;
        let n = (self.responses + self.exceptions) as f64; // 이번 것 포함
        self.rtt_sum += ms;
        self.last_ms = Some(ms);
        self.avg_ms = Some((self.rtt_sum / n.max(1.0) * 10.0).round() / 10.0);
        self.max_ms = Some(self.max_ms.map_or(ms, |m| m.max(ms)));
    }
}

/// 버스에서 받은 바이트 — 세션의 읽기 스레드가 넣고(`feed`), 게이트웨이가 꺼낸다
#[derive(Default)]
pub struct Bus {
    state: Mutex<(Vec<u8>, Option<Instant>)>,
    cv: Condvar,
}

impl Bus {
    pub fn feed(&self, bytes: &[u8]) {
        let mut g = self.state.lock().unwrap();
        g.0.extend_from_slice(bytes);
        if g.0.len() > BUS_MAX {
            let cut = g.0.len() - BUS_MAX;
            g.0.drain(..cut);
        }
        g.1 = Some(Instant::now());
        self.cv.notify_all();
    }

    fn clear(&self) {
        self.state.lock().unwrap().0.clear();
    }

    /// 마지막 바이트 뒤로 흐른 시간(받은 적 없으면 None)
    fn idle(&self) -> Option<Duration> {
        self.state.lock().unwrap().1.map(|t| t.elapsed())
    }
}

/// 한 번 주고받은 결과
#[derive(Debug, Clone, PartialEq)]
pub enum Outcome {
    /// 장비 응답 PDU(정상 또는 예외)와 응답 시간
    Reply(Vec<u8>, Duration),
    Timeout,
    Broadcast,
    /// 포트로 보내지 못함(끊김 등)
    SendFailed(String),
}

/// 기록 줄 상대 칸 «TCP #1 → RTU 국번 3 FC03»
pub fn peer_label(client: u64, route: Route, fc: u8) -> String {
    match route {
        Route::Unit(u) => crate::tr!(format!("TCP #{client} → RTU 국번 {u} FC{fc:02X}"), format!("TCP #{client} → RTU unit {u} FC{fc:02X}")),
        Route::Broadcast => crate::tr!(format!("TCP #{client} → RTU 방송(국번 0) FC{fc:02X}"), format!("TCP #{client} → RTU broadcast (unit 0) FC{fc:02X}")),
        Route::NoRoute => crate::tr!(format!("TCP #{client} → 경로 없음 FC{fc:02X}"), format!("TCP #{client} → no route FC{fc:02X}")),
    }
}

/// 요청 하나를 버스에 보내고 응답을 기다린다. `free_at` = 버스가 다음 요청을 받을 수 있는 때(앞 프레임 끝 + 간격)
#[allow(clippy::too_many_arguments)]
pub fn transact(port: &dyn Port, bus: &Bus, cfg: &GatewayConfig, route: Route, pdu: &[u8], peer: String, free_at: &mut Instant, stop: &AtomicBool, crc_errors: &mut u64) -> Outcome {
    let unit = match route {
        Route::Unit(u) => u,
        Route::Broadcast => 0,
        Route::NoRoute => return Outcome::Timeout,
    };
    let baud = port.config().baud;
    let gap = frame_gap(baud);
    let timeout = Duration::from_millis(cfg.timeout_ms.clamp(20, 60_000) as u64);
    // 3.5 문자 간격 — 앞 프레임 끝에서, 그리고 버스가 그만큼 조용해질 때까지(시끄러워도 타임아웃만큼만 기다림)
    let wait_until = Instant::now() + timeout;
    loop {
        let now = Instant::now();
        let quiet = bus.idle().is_none_or(|d| d >= gap);
        if (now >= *free_at && quiet) || now >= wait_until || stop.load(Ordering::SeqCst) {
            break;
        }
        std::thread::sleep(gap.min(Duration::from_millis(2)));
    }
    let frame = rtu_frame(unit, pdu);
    let tx = tx_time(frame.len(), baud);
    // 2선식 변환기 에코: 보낸 프레임이 그대로 먼저 돌아오면 버린다(Modbus Master 와 같은 규칙).
    // 05·06 은 정상 응답이 요청과 같아 가릴 수 없다 — 그대로 응답으로 본다
    let echo = if matches!(pdu.first(), Some(0x05 | 0x06)) { Vec::new() } else { frame.clone() };
    bus.clear();
    if let Err(e) = port.send_from(frame, peer) {
        return Outcome::SendFailed(e);
    }
    let sent = Instant::now();
    if route == Route::Broadcast {
        *free_at = sent + tx + gap + Duration::from_millis(cfg.broadcast_delay_ms.min(10_000) as u64);
        return Outcome::Broadcast;
    }
    let deadline = sent + tx + timeout;
    let silence = silence_for(baud);
    let fc = pdu.first().copied().unwrap_or(0);
    let mut g = bus.state.lock().unwrap();
    loop {
        let now = Instant::now();
        let quiet = g.1.is_some_and(|t| now.duration_since(t) >= silence);
        if !echo.is_empty() && !g.0.is_empty() {
            if g.0.starts_with(&echo) {
                g.0.drain(..echo.len());
                continue;
            }
            if echo.starts_with(&g.0) && !quiet {
                // 에코가 아직 덜 왔다
                g = wait_bus(&bus.cv, g, (deadline.saturating_duration_since(now)).min(Duration::from_millis(5)));
                if Instant::now() >= deadline || stop.load(Ordering::SeqCst) {
                    g.0.clear();
                    *free_at = Instant::now() + gap;
                    return Outcome::Timeout;
                }
                continue;
            }
        }
        match check_response(&g.0, unit, fc, quiet) {
            Check::Done(l) => {
                let pdu = g.0[1..l - 2].to_vec();
                g.0.clear();
                *free_at = now + gap;
                return Outcome::Reply(pdu, now.duration_since(sent));
            }
            Check::Crc => {
                *crc_errors += 1;
                g.0.clear();
            }
            Check::Foreign => g.0.clear(),
            Check::Wait => {}
        }
        if now >= deadline || stop.load(Ordering::SeqCst) {
            g.0.clear();
            *free_at = now + gap;
            return Outcome::Timeout;
        }
        // 조용함 판정을 위해 짧게 깨어난다
        let step = (deadline - now).min(Duration::from_millis(5));
        g = wait_bus(&bus.cv, g, step);
    }
}

fn wait_bus<'a, T>(cv: &Condvar, g: std::sync::MutexGuard<'a, T>, d: Duration) -> std::sync::MutexGuard<'a, T> {
    cv.wait_timeout(g, d).unwrap().0
}

/// 줄에 선 요청 하나
pub struct Request {
    pub client: u64,
    pub mbap: Mbap,
    pub route: Route,
}

/// 게이트웨이가 클라이언트에게 답하는 곳(포트 나눔의 클라이언트 목록)
pub trait Clients {
    fn alive(&self, id: u64) -> bool;
    fn reply(&self, id: u64, bytes: Vec<u8>);
}

/// 줄 세우기·보내기·통계
pub struct Engine {
    cfg: GatewayConfig,
    allowed: Vec<RangeInclusive<u8>>,
    pub bus: Bus,
    tx: SyncSender<Request>,
    rx: Mutex<Receiver<Request>>,
    stats: Mutex<(GwStats, bool)>,
}

impl Engine {
    pub fn new(cfg: GatewayConfig) -> Result<Self, String> {
        let allowed = parse_units(&cfg.units)?;
        if cfg.unit0 == Unit0::Default && !(1..=247).contains(&cfg.default_unit) {
            return Err(crate::tr!("기본 국번은 1~247", "The default unit must be 1–247").into());
        }
        let (tx, rx) = mpsc::sync_channel(QUEUE_MAX);
        Ok(Self { cfg, allowed, bus: Bus::default(), tx, rx: Mutex::new(rx), stats: Mutex::new((GwStats::default(), false)) })
    }

    pub fn stats(&self) -> GwStats {
        self.stats.lock().unwrap().0.clone()
    }

    fn bump(&self, f: impl FnOnce(&mut GwStats)) {
        let mut g = self.stats.lock().unwrap();
        f(&mut g.0);
        g.1 = true;
    }

    /// 클라이언트가 보낸 요청 하나 — 경로 없음·줄 넘침은 바로 예외로 답한다
    pub fn submit(&self, client: u64, m: Mbap, port: &dyn Port, clients: &dyn Clients) {
        self.bump(|s| s.requests += 1);
        let route = route(m.unit, &self.cfg, &self.allowed);
        if route == Route::NoRoute {
            self.bump(|s| s.no_route += 1);
            port.note(crate::tr!(
                format!("GW TCP #{client} Unit ID {} 경로 없음 → 예외 0A", m.unit),
                format!("GW TCP #{client} unit ID {} has no route → exception 0A", m.unit)
            ));
            clients.reply(client, mbap_bytes(m.tid, m.unit, &exception_pdu(m.fc(), 0x0A)));
            return;
        }
        let (tid, unit, fc) = (m.tid, m.unit, m.fc());
        if let Err(TrySendError::Full(_)) = self.tx.try_send(Request { client, mbap: m, route }) {
            self.bump(|s| s.busy += 1);
            port.note(crate::tr!(format!("GW 줄이 꽉 참({QUEUE_MAX}) → 예외 06"), format!("GW queue full ({QUEUE_MAX}) → exception 06")));
            clients.reply(client, mbap_bytes(tid, unit, &exception_pdu(fc, 0x06)));
        }
    }

    /// 줄에서 하나씩 꺼내 보낸다 — `stop` 이 켜질 때까지. 통계가 바뀌면 `on_stats` 로(많아도 0.25초에 한 번)
    pub fn run(&self, port: &dyn Port, clients: &dyn Clients, stop: &AtomicBool, on_stats: &dyn Fn(GwStats)) {
        let rx = self.rx.lock().unwrap();
        let mut free_at = Instant::now();
        let mut last_emit = Instant::now() - Duration::from_secs(1);
        while !stop.load(Ordering::SeqCst) {
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(req) => self.one(req, port, clients, &mut free_at, stop),
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => break,
            }
            let dirty = std::mem::take(&mut self.stats.lock().unwrap().1);
            if dirty && last_emit.elapsed() >= Duration::from_millis(250) {
                last_emit = Instant::now();
                on_stats(self.stats());
            } else if dirty {
                self.stats.lock().unwrap().1 = true;
            }
        }
    }

    fn one(&self, req: Request, port: &dyn Port, clients: &dyn Clients, free_at: &mut Instant, stop: &AtomicBool) {
        // 줄에 선 사이 끊긴 클라이언트의 요청은 버스에 보내지 않는다
        if !clients.alive(req.client) {
            return;
        }
        let Request { client, mbap: m, route } = req;
        let fc = m.fc();
        let label = peer_label(client, route, fc);
        let mut crc = 0;
        let out = transact(port, &self.bus, &self.cfg, route, &m.pdu, label.clone(), free_at, stop, &mut crc);
        if crc > 0 {
            self.bump(|s| s.crc_errors += crc);
            port.note(crate::tr!(format!("GW {label}: 깨진 응답 {crc}개 버림(CRC 오류·잘림)"), format!("GW {label}: dropped {crc} broken response(s) (CRC error / cut short)")));
        }
        match out {
            Outcome::Reply(pdu, rtt) => {
                let exc = pdu.first().is_some_and(|f| f & 0x80 != 0);
                self.bump(|s| {
                    if exc {
                        s.exceptions += 1
                    } else {
                        s.responses += 1
                    }
                    s.rtt(rtt);
                });
                clients.reply(client, mbap_bytes(m.tid, m.unit, &pdu));
            }
            Outcome::Broadcast => self.bump(|s| s.broadcasts += 1),
            Outcome::Timeout => {
                self.bump(|s| s.timeouts += 1);
                let ms = self.cfg.timeout_ms;
                port.note(crate::tr!(format!("GW {label}: 응답 없음({ms}ms) → 예외 0B"), format!("GW {label}: no response ({ms} ms) → exception 0B")));
                clients.reply(client, mbap_bytes(m.tid, m.unit, &exception_pdu(fc, 0x0B)));
            }
            Outcome::SendFailed(e) => {
                self.bump(|s| s.timeouts += 1);
                port.note(crate::tr!(format!("GW {label}: 보내지 못함 — {e} → 예외 0B"), format!("GW {label}: send failed — {e} → exception 0B")));
                clients.reply(client, mbap_bytes(m.tid, m.unit, &exception_pdu(fc, 0x0B)));
            }
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::serial::SerialConfig;
    use std::sync::Arc;

    #[test]
    fn mbap_parse_and_build() {
        // 트랜잭션 1, Unit 3, FC03 0000 0002
        let req = [0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x03, 0x03, 0x00, 0x00, 0x00, 0x02];
        assert_eq!(parse_mbap(&req[..6]), Parsed::Need);
        assert_eq!(parse_mbap(&req[..11]), Parsed::Need);
        let Parsed::Frame(m, n) = parse_mbap(&req) else { panic!() };
        assert_eq!((m.tid, m.unit, m.fc(), n), (1, 3, 0x03, 12));
        assert_eq!(mbap_bytes(m.tid, m.unit, &m.pdu), req.to_vec());
        assert!(matches!(parse_mbap(&[0, 1, 0, 1, 0, 6, 1, 3, 0, 0, 0, 1]), Parsed::Bad(_)));
        assert!(matches!(parse_mbap(&[0, 1, 0, 0, 0, 1, 1]), Parsed::Bad(_)));
        assert_eq!(exception_pdu(0x03, 0x0B), vec![0x83, 0x0B]);
    }

    #[test]
    fn rtu_frame_has_crc_low_byte_first() {
        // 01 03 0000 000A → C5 CD
        assert_eq!(rtu_frame(1, &[0x03, 0x00, 0x00, 0x00, 0x0A]), vec![0x01, 0x03, 0x00, 0x00, 0x00, 0x0A, 0xC5, 0xCD]);
    }

    #[test]
    fn routes_unit0_and_allowed_units() {
        let mut cfg = GatewayConfig::default();
        assert_eq!(route(0, &cfg, &[]), Route::Broadcast);
        assert_eq!(route(5, &cfg, &[]), Route::Unit(5));
        assert_eq!(route(250, &cfg, &[]), Route::NoRoute);
        cfg.unit0 = Unit0::Default;
        cfg.default_unit = 7;
        assert_eq!(route(0, &cfg, &[]), Route::Unit(7));
        let allowed = parse_units("1-3, 7").unwrap();
        assert_eq!(route(2, &cfg, &allowed), Route::Unit(2));
        assert_eq!(route(5, &cfg, &allowed), Route::NoRoute);
        assert_eq!(route(0, &cfg, &allowed), Route::Unit(7));
        assert!(parse_units("").unwrap().is_empty());
        assert!(parse_units("0").is_err() && parse_units("5-2").is_err() && parse_units("248").is_err() && parse_units("x").is_err());
    }

    #[test]
    fn frame_gap_and_tx_time() {
        assert_eq!(frame_gap(9600), Duration::from_micros(4010));
        assert_eq!(frame_gap(115_200), Duration::from_micros(1750));
        assert_eq!(tx_time(8, 9600), Duration::from_micros(9166));
    }

    #[test]
    fn check_response_cases() {
        let ok = rtu_frame(3, &[0x03, 0x04, 0x00, 0x01, 0x00, 0x02]);
        assert_eq!(check_response(&ok, 3, 0x03, false), Check::Done(ok.len()));
        assert_eq!(check_response(&ok[..5], 3, 0x03, false), Check::Wait);
        assert_eq!(check_response(&ok[..5], 3, 0x03, true), Check::Crc);
        let mut bad = ok.clone();
        bad[4] ^= 1;
        assert_eq!(check_response(&bad, 3, 0x03, false), Check::Wait);
        assert_eq!(check_response(&bad, 3, 0x03, true), Check::Crc);
        assert_eq!(check_response(&ok, 4, 0x03, true), Check::Foreign);
        let exc = rtu_frame(3, &[0x83, 0x02]);
        assert_eq!(check_response(&exc, 3, 0x03, false), Check::Done(5));
        // 모르는 함수(길이 모름) — 조용해지고 CRC 가 맞으면
        let odd = rtu_frame(3, &[0x41, 0x01, 0x02]);
        assert_eq!(check_response(&odd, 3, 0x41, false), Check::Wait);
        assert_eq!(check_response(&odd, 3, 0x41, true), Check::Done(odd.len()));
    }

    /// 가짜 직렬 포트 + RTU 장비 — 보낸 프레임에 `answer` 로 답을 만들어 버스에 넣는다
    pub(crate) struct FakeRtu {
        pub sent: Mutex<Vec<(Vec<u8>, String, Instant)>>,
        pub notes: Mutex<Vec<String>>,
        pub bus: Mutex<Option<Arc<Engine>>>,
        pub answer: fn(&[u8]) -> Option<Vec<u8>>,
        pub baud: u32,
        /// 2선식 변환기처럼 보낸 것을 곧바로 되돌려 준다(에코)
        pub echo: AtomicBool,
    }

    impl FakeRtu {
        pub(crate) fn new(baud: u32, answer: fn(&[u8]) -> Option<Vec<u8>>) -> Arc<Self> {
            Arc::new(Self { sent: Mutex::new(Vec::new()), notes: Mutex::new(Vec::new()), bus: Mutex::new(None), answer, baud, echo: AtomicBool::new(false) })
        }
    }

    /// 국번 1~3 은 FC03 에 레지스터 값(주소 + 1)으로 답한다. 국번 9 는 CRC 를 깨서 답한다
    pub(crate) fn device(req: &[u8]) -> Option<Vec<u8>> {
        let (unit, fc) = (req[0], req[1]);
        if unit == 0 || unit > 9 || !crc_ok(req) {
            return None;
        }
        if fc != 0x03 {
            return Some(rtu_frame(unit, &[fc | 0x80, 0x01]));
        }
        let start = u16::from_be_bytes([req[2], req[3]]);
        let n = u16::from_be_bytes([req[4], req[5]]);
        let mut pdu = vec![0x03, (n * 2) as u8];
        for i in 0..n {
            pdu.extend_from_slice(&(start + i + 1).to_be_bytes());
        }
        let mut f = rtu_frame(unit, &pdu);
        if unit == 9 {
            let l = f.len();
            f[l - 1] ^= 0xFF;
        }
        (unit <= 3 || unit == 9).then_some(f)
    }

    impl Port for FakeRtu {
        fn send_from(&self, bytes: Vec<u8>, peer: String) -> Result<(), String> {
            self.sent.lock().unwrap().push((bytes.clone(), peer, Instant::now()));
            let echo = self.echo.load(Ordering::SeqCst);
            if echo && let Some(eng) = self.bus.lock().unwrap().clone() {
                eng.bus.feed(&bytes);
            }
            if let Some(resp) = (self.answer)(&bytes) {
                let eng = self.bus.lock().unwrap().clone();
                if let Some(eng) = eng {
                    std::thread::spawn(move || {
                        // 에코가 있으면 장비가 늦게 답하는 것처럼 — 버스가 조용해진 뒤에 응답
                        std::thread::sleep(Duration::from_millis(if echo { 40 } else { 5 }));
                        // 응답을 두 번에 나눠 — USB 어댑터처럼
                        let (a, b) = resp.split_at(resp.len() / 2);
                        eng.bus.feed(a);
                        std::thread::sleep(Duration::from_millis(1));
                        eng.bus.feed(b);
                    });
                }
            }
            Ok(())
        }
        fn config(&self) -> SerialConfig {
            SerialConfig {
                port: "COM9".into(),
                baud: self.baud,
                data_bits: 8,
                parity: "none".into(),
                stop_bits: 1.0,
                flow: "none".into(),
                dtr: false,
                rts: false,
                auto_reconnect: true,
                rs485: String::new(),
            }
        }
        fn reconfigure(&self, _cfg: SerialConfig) -> Result<(), String> {
            Ok(())
        }
        fn note(&self, text: String) {
            self.notes.lock().unwrap().push(text);
        }
    }

    #[derive(Default)]
    struct Replies {
        got: Mutex<Vec<(u64, Vec<u8>)>>,
        dead: Mutex<Vec<u64>>,
    }

    impl Clients for Replies {
        fn alive(&self, id: u64) -> bool {
            !self.dead.lock().unwrap().contains(&id)
        }
        fn reply(&self, id: u64, bytes: Vec<u8>) {
            self.got.lock().unwrap().push((id, bytes));
        }
    }

    fn setup(cfg: GatewayConfig) -> (Arc<Engine>, Arc<FakeRtu>) {
        let eng = Arc::new(Engine::new(cfg).unwrap());
        let fake = FakeRtu::new(115_200, device);
        *fake.bus.lock().unwrap() = Some(eng.clone());
        (eng, fake)
    }

    fn req(tid: u16, unit: u8, pdu: &[u8]) -> Mbap {
        Mbap { tid, unit, pdu: pdu.to_vec() }
    }

    #[test]
    fn transact_round_trip_through_fake_port() {
        let (eng, fake) = setup(GatewayConfig::default());
        let stop = AtomicBool::new(false);
        let mut free = Instant::now();
        let mut crc = 0;
        let out = transact(&*fake, &eng.bus, &eng.cfg, Route::Unit(2), &[0x03, 0x00, 0x10, 0x00, 0x02], "x".into(), &mut free, &stop, &mut crc);
        let Outcome::Reply(pdu, rtt) = out else { panic!("{out:?}") };
        assert_eq!(pdu, vec![0x03, 0x04, 0x00, 0x11, 0x00, 0x12]);
        assert!(rtt >= Duration::from_millis(5));
        assert_eq!(fake.sent.lock().unwrap()[0].0, rtu_frame(2, &[0x03, 0x00, 0x10, 0x00, 0x02]));
        assert_eq!(crc, 0);
    }

    #[test]
    fn transact_skips_two_wire_echo() {
        let (eng, fake) = setup(GatewayConfig::default());
        fake.echo.store(true, Ordering::SeqCst);
        let stop = AtomicBool::new(false);
        let mut free = Instant::now();
        let mut crc = 0;
        let out = transact(&*fake, &eng.bus, &eng.cfg, Route::Unit(2), &[0x03, 0x00, 0x10, 0x00, 0x02], "x".into(), &mut free, &stop, &mut crc);
        let Outcome::Reply(pdu, _) = out else { panic!("{out:?}") };
        // 에코(보낸 요청)가 아니라 장비 응답
        assert_eq!(pdu, vec![0x03, 0x04, 0x00, 0x11, 0x00, 0x12]);
        assert_eq!(crc, 0);
    }

    #[test]
    fn transact_timeout_and_crc_drop() {
        let cfg = GatewayConfig { timeout_ms: 60, ..Default::default() };
        let (eng, fake) = setup(cfg);
        let stop = AtomicBool::new(false);
        let mut free = Instant::now();
        let mut crc = 0;
        let t0 = Instant::now();
        // 국번 5 는 답하지 않음
        assert_eq!(transact(&*fake, &eng.bus, &eng.cfg, Route::Unit(5), &[0x03, 0, 0, 0, 1], "x".into(), &mut free, &stop, &mut crc), Outcome::Timeout);
        assert!(t0.elapsed() >= Duration::from_millis(60));
        // 국번 9 는 CRC 를 깨서 답함 → 버리고 타임아웃
        assert_eq!(transact(&*fake, &eng.bus, &eng.cfg, Route::Unit(9), &[0x03, 0, 0, 0, 1], "x".into(), &mut free, &stop, &mut crc), Outcome::Timeout);
        assert_eq!(crc, 1);
        // 방송은 기다리지 않고, 다음 요청까지 쉬는 시간을 둔다
        let t1 = Instant::now();
        assert_eq!(transact(&*fake, &eng.bus, &eng.cfg, Route::Broadcast, &[0x06, 0, 1, 0, 5], "x".into(), &mut free, &stop, &mut crc), Outcome::Broadcast);
        assert!(t1.elapsed() < Duration::from_millis(50));
        assert!(free >= t1 + Duration::from_millis(100));
        assert_eq!(fake.sent.lock().unwrap().last().unwrap().0[0], 0);
    }

    #[test]
    fn engine_queues_one_at_a_time_and_answers_each_client() {
        let (eng, fake) = setup(GatewayConfig { timeout_ms: 80, units: "1-5".into(), ..Default::default() });
        let replies = Arc::new(Replies::default());
        let stop = Arc::new(AtomicBool::new(false));
        let stats = Arc::new(Mutex::new(Vec::new()));
        let (e2, f2, r2, s2, st2) = (eng.clone(), fake.clone(), replies.clone(), stop.clone(), stats.clone());
        let worker = std::thread::spawn(move || e2.run(&*f2, &*r2, &s2, &|s| st2.lock().unwrap().push(s)));
        eng.submit(1, req(10, 1, &[0x03, 0, 0, 0, 1]), &*fake, &*replies);
        eng.submit(2, req(20, 2, &[0x03, 0, 4, 0, 1]), &*fake, &*replies);
        eng.submit(1, req(11, 4, &[0x03, 0, 0, 0, 1]), &*fake, &*replies); // 답 없음 → 0B
        eng.submit(2, req(21, 200, &[0x03, 0, 0, 0, 1]), &*fake, &*replies); // 허용 밖 → 0A(바로)
        eng.submit(1, req(12, 3, &[0x04, 0, 0, 0, 1]), &*fake, &*replies); // 장비 예외 01
        replies.dead.lock().unwrap().push(9); // 끊긴 클라이언트의 요청은 보내지 않음
        eng.submit(9, req(1, 1, &[0x03, 0, 0, 0, 1]), &*fake, &*replies);
        for _ in 0..300 {
            if replies.got.lock().unwrap().len() >= 5 {
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        std::thread::sleep(Duration::from_millis(50));
        stop.store(true, Ordering::SeqCst);
        worker.join().unwrap();
        let got = replies.got.lock().unwrap().clone();
        assert_eq!(got.len(), 5, "{got:?}");
        // 경로 없음은 줄을 기다리지 않고 먼저 나간다
        assert_eq!(got[0], (2, mbap_bytes(21, 200, &[0x83, 0x0A])));
        assert_eq!(got[1], (1, mbap_bytes(10, 1, &[0x03, 0x02, 0x00, 0x01])));
        assert_eq!(got[2], (2, mbap_bytes(20, 2, &[0x03, 0x02, 0x00, 0x05])));
        assert_eq!(got[3], (1, mbap_bytes(11, 4, &[0x83, 0x0B])));
        assert_eq!(got[4], (1, mbap_bytes(12, 3, &[0x84, 0x01])));
        // 버스에는 한 번에 하나 — 보낸 시각이 앞 요청의 응답 뒤
        let sent = fake.sent.lock().unwrap().clone();
        assert_eq!(sent.len(), 4);
        assert!(sent[1].2 >= sent[0].2 + Duration::from_millis(5));
        assert!(sent[0].1.contains("#1") && sent[0].1.contains("FC03"), "{}", sent[0].1);
        let s = eng.stats();
        assert_eq!((s.requests, s.responses, s.exceptions, s.timeouts, s.no_route), (6, 2, 1, 1, 1));
        assert!(s.avg_ms.is_some() && s.max_ms >= s.avg_ms);
        assert!(!stats.lock().unwrap().is_empty());
        assert!(fake.notes.lock().unwrap().iter().any(|n| n.contains("0B")));
    }
}
