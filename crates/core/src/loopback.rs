//! 연결 시험 — 포트에 바이트를 보내 그대로 돌아오는지 잰다(장비 없이).
//! - 루프백: TX 와 RX 를 이어 둔 포트(DB9 2–3번, TTL 변환기 TX–RX). 속도마다 바이트 왕복 일치·잃음·바뀜과
//!   1바이트 왕복 시간(ms)을 재고, 끝에 드라이버의 오류 표시(ClearCommError — 프레임·패리티·넘침)를 읽는다.
//! - 에코: 2선 RS-485 변환기가 보낸 바이트를 스스로 되받는지. 버스에서 장비를 뗀 채로 한다(장비가 답하면 결과가 섞인다).
//!
//! 잰 시간은 «USB 지연 + 드라이버 + 이 프로그램 스레드» 를 모두 더한 값이다. 오류 표시는 드라이버가 올려 줄 때만 보인다
//! (USB 변환기 드라이버가 올리는지는 칩마다 다르다 — 0 이 «오류 없음» 을 보증하지 않는다).
//! 시험 순서·비교는 `Link` 위에서 돌아 가짜 포트로 단위 시험한다.

use serde::{Deserialize, Serialize};
use std::io::ErrorKind;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

/// 시험 방식
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    Loopback,
    Echo,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoopConfig {
    pub port: String,
    pub mode: Mode,
    /// 시험할 속도(에코는 첫 번째만)
    pub bauds: Vec<u32>,
    /// 속도마다 보낼 바이트 수(루프백)
    #[serde(default = "d_bytes")]
    pub bytes: usize,
    /// 속도마다 1바이트 왕복 시간을 잴 횟수
    #[serde(default = "d_pings")]
    pub pings: usize,
}

fn d_bytes() -> usize {
    256
}
fn d_pings() -> usize {
    20
}

/// 드라이버가 올린 오류 표시(ClearCommError). `read` 가 false 면 읽지 못함(윈도우 밖·시험용 포트)
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommFlags {
    pub read: bool,
    pub frame: bool,
    pub parity: bool,
    /// 하드웨어 넘침(CE_OVERRUN)
    pub overrun: bool,
    /// 받기 버퍼 넘침(CE_RXOVER)
    pub rx_over: bool,
    #[serde(rename = "break")]
    pub brk: bool,
}

impl CommFlags {
    fn merge(&mut self, o: CommFlags) {
        self.read |= o.read;
        self.frame |= o.frame;
        self.parity |= o.parity;
        self.overrun |= o.overrun;
        self.rx_over |= o.rx_over;
        self.brk |= o.brk;
    }
    pub fn any(&self) -> bool {
        self.frame || self.parity || self.overrun || self.rx_over || self.brk
    }
}

/// 왕복 시간(ms)
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Rtt {
    pub samples: usize,
    /// 돌아오지 않은 횟수
    pub lost: usize,
    pub min: f64,
    pub median: f64,
    pub max: f64,
}

/// 속도 하나의 결과
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BaudResult {
    pub baud: u32,
    pub sent: usize,
    pub received: usize,
    /// 같은 자리에 같은 바이트
    pub same: usize,
    /// 자리는 왔지만 값이 다른 바이트
    pub changed: usize,
    /// 오지 않은 바이트
    pub lost: usize,
    /// 보낸 것보다 더 온 바이트
    pub extra: usize,
    pub rtt: Option<Rtt>,
    pub flags: CommFlags,
    /// 첫 묶음에서 아무것도 돌아오지 않아 이 속도를 일찍 끝냈는지
    pub nothing_back: bool,
}

/// 에코 결과
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoResult {
    pub baud: u32,
    pub sent: usize,
    pub received: usize,
    /// 보낸 것이 그대로(앞에서부터) 돌아왔는지
    pub echoed: bool,
    /// 일부만 같게 돌아왔는지
    pub partial: bool,
    /// 보낸 뒤 첫 바이트가 올 때까지(ms)
    pub first_ms: Option<f64>,
    pub flags: CommFlags,
}

/// 화면으로 가는 사건
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum LoopEvent {
    /// 지금 시험 중인 속도와 진행(0~total)
    Progress { baud: u32, done: usize, total: usize },
    Baud { result: BaudResult },
    Echo { result: EchoResult },
    /// 끝 — 취소됐으면 cancelled
    Done { cancelled: bool, ms: u64 },
    /// 열기 실패 등. busy = 다른 프로그램이 쓰는 중으로 보임
    Error { message: String, busy: bool },
}

/// 시험할 포트 — 실제 시리얼 또는 시험용 가짜
pub trait Link {
    fn write_all(&mut self, b: &[u8]) -> std::io::Result<()>;
    /// 짧게 기다려 읽는다 — 아무것도 없으면 Ok(0)
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize>;
    fn set_baud(&mut self, baud: u32) -> Result<(), String>;
    /// 받기·보내기 버퍼 비우기
    fn clear(&mut self);
    /// 오류 표시 읽기(읽고 나면 지워진다)
    fn flags(&mut self) -> CommFlags;
}

/// 8N1 로 n 바이트를 보내는 데 걸리는 시간(ms)
pub fn tx_ms(baud: u32, n: usize) -> f64 {
    if baud == 0 { 0.0 } else { n as f64 * 10.0 * 1000.0 / baud as f64 }
}

/// (같음, 바뀜, 잃음, 더 옴)
pub fn compare(sent: &[u8], got: &[u8]) -> (usize, usize, usize, usize) {
    let n = sent.len().min(got.len());
    let same = sent.iter().zip(got).filter(|(a, b)| a == b).count();
    (same, n - same, sent.len().saturating_sub(got.len()), got.len().saturating_sub(sent.len()))
}

/// 왕복 시간 통계. 표본이 없으면 None
pub fn rtt_stats(samples: &[f64], lost: usize) -> Option<Rtt> {
    if samples.is_empty() {
        return None;
    }
    let mut s = samples.to_vec();
    s.sort_by(|a, b| a.total_cmp(b));
    let mid = s.len() / 2;
    let median = if s.len().is_multiple_of(2) { (s[mid - 1] + s[mid]) / 2.0 } else { s[mid] };
    Some(Rtt { samples: s.len(), lost, min: s[0], median, max: s[s.len() - 1] })
}

/// 속도마다 다른 의사 난수 바이트(같은 무늬가 되풀이되지 않게)
fn pattern(seed: u32, n: usize) -> Vec<u8> {
    let mut x = seed.wrapping_mul(2_654_435_761).max(1);
    (0..n)
        .map(|_| {
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            (x >> 8) as u8
        })
        .collect()
}

/// want 바이트가 올 때까지(또는 기한까지) 읽는다
fn read_until(link: &mut dyn Link, want: usize, deadline: Instant, out: &mut Vec<u8>) {
    let start = out.len();
    let mut buf = [0u8; 512];
    while out.len() - start < want && Instant::now() < deadline {
        match link.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => out.extend_from_slice(&buf[..n]),
            Err(e) if e.kind() == ErrorKind::TimedOut || e.kind() == ErrorKind::Interrupted => {}
            Err(_) => break,
        }
    }
}

/// 받을 때까지 기다릴 시간 — 보내는 시간의 두 배 + USB·드라이버 여유
fn wait_for(baud: u32, n: usize) -> Duration {
    Duration::from_millis((tx_ms(baud, n) * 2.0) as u64 + 300)
}

const CHUNK: usize = 32;

fn loop_baud(link: &mut dyn Link, cfg: &LoopConfig, baud: u32, cancel: &AtomicBool, emit: &mut dyn FnMut(LoopEvent)) -> Result<Option<BaudResult>, String> {
    link.set_baud(baud)?;
    link.clear();
    let _ = link.flags();
    let bytes = cfg.bytes.clamp(CHUNK, 65_536);
    let data = pattern(baud, bytes);
    let total = bytes + cfg.pings;
    let mut got = Vec::with_capacity(bytes);
    let mut nothing_back = false;
    let mut sent = 0;
    let mut flags = CommFlags::default();
    for (i, chunk) in data.chunks(CHUNK).enumerate() {
        if cancel.load(Ordering::SeqCst) {
            return Ok(None);
        }
        link.write_all(chunk).map_err(|e| crate::oserr::serial_io(&e))?;
        sent += chunk.len();
        read_until(link, chunk.len(), Instant::now() + wait_for(baud, chunk.len()), &mut got);
        if i == 0 && got.is_empty() {
            nothing_back = true;
            break;
        }
        emit(LoopEvent::Progress { baud, done: sent, total });
    }
    // 늦게 온 바이트까지
    if !nothing_back && got.len() < sent {
        read_until(link, sent - got.len(), Instant::now() + Duration::from_millis(200), &mut got);
    }
    flags.merge(link.flags());
    let (same, changed, lost, extra) = compare(&data[..sent], &got);
    let mut samples = Vec::new();
    let mut ping_lost = 0;
    if !nothing_back {
        link.clear();
        for i in 0..cfg.pings {
            if cancel.load(Ordering::SeqCst) {
                return Ok(None);
            }
            let b = [0x30u8.wrapping_add(i as u8)];
            let t0 = Instant::now();
            link.write_all(&b).map_err(|e| crate::oserr::serial_io(&e))?;
            let mut one = Vec::new();
            read_until(link, 1, t0 + wait_for(baud, 1), &mut one);
            if one.first() == Some(&b[0]) {
                samples.push(t0.elapsed().as_secs_f64() * 1000.0);
            } else {
                ping_lost += 1;
                link.clear();
            }
            emit(LoopEvent::Progress { baud, done: bytes + i + 1, total });
        }
        flags.merge(link.flags());
    }
    // 시험용 포트처럼 오류 표시를 못 읽는 포트는 read=false 로 남는다
    Ok(Some(BaudResult { baud, sent, received: got.len(), same, changed, lost, extra, rtt: rtt_stats(&samples, ping_lost), flags, nothing_back }))
}

fn echo(link: &mut dyn Link, baud: u32) -> Result<EchoResult, String> {
    link.set_baud(baud)?;
    link.clear();
    let _ = link.flags();
    // 장비가 명령으로 알아듣기 어려운 글자(«PortDock echo»)
    let data = b"PortDock echo\r\n".to_vec();
    let t0 = Instant::now();
    link.write_all(&data).map_err(|e| crate::oserr::serial_io(&e))?;
    let mut got = Vec::new();
    let deadline = t0 + wait_for(baud, data.len());
    let mut first_ms = None;
    let mut buf = [0u8; 256];
    while Instant::now() < deadline {
        match link.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => {
                if first_ms.is_none() {
                    first_ms = Some(t0.elapsed().as_secs_f64() * 1000.0);
                }
                got.extend_from_slice(&buf[..n]);
                if got.len() >= data.len() + 64 {
                    break;
                }
            }
            Err(e) if e.kind() == ErrorKind::TimedOut || e.kind() == ErrorKind::Interrupted => {}
            Err(_) => break,
        }
    }
    let flags = link.flags();
    let echoed = got.len() >= data.len() && got[..data.len()] == data[..];
    let lead = data.iter().zip(&got).take_while(|(a, b)| a == b).count();
    Ok(EchoResult { baud, sent: data.len(), received: got.len(), echoed, partial: !echoed && lead >= 3, first_ms, flags })
}

/// 시험을 돌린다(연 포트 위에서). 결과는 emit 으로, 끝에 Done
pub fn run_on(link: &mut dyn Link, cfg: &LoopConfig, cancel: &AtomicBool, emit: &mut dyn FnMut(LoopEvent)) {
    let t0 = Instant::now();
    let bauds: Vec<u32> = cfg.bauds.iter().copied().filter(|b| *b > 0).collect();
    if bauds.is_empty() {
        emit(LoopEvent::Error { message: crate::tr!("시험할 속도가 없습니다", "No baud rate to test").into(), busy: false });
        return;
    }
    match cfg.mode {
        Mode::Echo => match echo(link, bauds[0]) {
            Ok(r) => emit(LoopEvent::Echo { result: r }),
            Err(e) => emit(LoopEvent::Error { message: e, busy: false }),
        },
        Mode::Loopback => {
            for &b in &bauds {
                match loop_baud(link, cfg, b, cancel, emit) {
                    Ok(Some(r)) => emit(LoopEvent::Baud { result: r }),
                    Ok(None) => break,
                    Err(e) => {
                        emit(LoopEvent::Error { message: format!("{b} bps: {e}"), busy: false });
                        break;
                    }
                }
            }
        }
    }
    emit(LoopEvent::Done { cancelled: cancel.load(Ordering::SeqCst), ms: t0.elapsed().as_millis() as u64 });
}

/// 실제 시리얼 포트
struct SerialLink {
    port: Box<dyn serialport::SerialPort>,
    raw: isize,
}

impl Link for SerialLink {
    fn write_all(&mut self, b: &[u8]) -> std::io::Result<()> {
        let mut off = 0;
        let t0 = Instant::now();
        while off < b.len() {
            match self.port.write(&b[off..]) {
                Ok(n) => off += n,
                Err(e) if e.kind() == ErrorKind::TimedOut || e.kind() == ErrorKind::Interrupted => {
                    // 흐름 제어 없이 연다 — 그래도 오래 막히면 멈춘다
                    if t0.elapsed() > Duration::from_secs(5) {
                        return Err(e);
                    }
                }
                Err(e) => return Err(e),
            }
        }
        self.port.flush()
    }
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match self.port.read(buf) {
            Err(e) if e.kind() == ErrorKind::TimedOut => Ok(0),
            r => r,
        }
    }
    fn set_baud(&mut self, baud: u32) -> Result<(), String> {
        self.port.set_baud_rate(baud).map_err(|e| crate::tr!(format!("{baud} bps 를 받지 않습니다: {e}"), format!("{baud} bps refused: {e}")))
    }
    fn clear(&mut self) {
        let _ = self.port.clear(serialport::ClearBuffer::All);
    }
    fn flags(&mut self) -> CommFlags {
        comm_flags(self.raw)
    }
}

#[cfg(windows)]
fn comm_flags(raw: isize) -> CommFlags {
    use windows_sys::Win32::Devices::Communication::{CE_BREAK, CE_FRAME, CE_OVERRUN, CE_RXOVER, CE_RXPARITY, COMSTAT, ClearCommError};
    if raw == 0 {
        return CommFlags::default();
    }
    let mut e = 0u32;
    // SAFETY: COMSTAT 은 C 구조체, raw 는 열려 있는 COM 핸들
    let mut st: COMSTAT = unsafe { std::mem::zeroed() };
    if unsafe { ClearCommError(raw as windows_sys::Win32::Foundation::HANDLE, &mut e, &mut st) } == 0 {
        return CommFlags::default();
    }
    CommFlags { read: true, frame: e & CE_FRAME != 0, parity: e & CE_RXPARITY != 0, overrun: e & CE_OVERRUN != 0, rx_over: e & CE_RXOVER != 0, brk: e & CE_BREAK != 0 }
}

#[cfg(not(windows))]
fn comm_flags(_raw: isize) -> CommFlags {
    CommFlags::default()
}

fn open(port: &str, baud: u32) -> Result<SerialLink, (String, bool)> {
    let b = serialport::new(port, baud).timeout(Duration::from_millis(5)).flow_control(serialport::FlowControl::None);
    #[cfg(windows)]
    let r = b.open_native().map(|p| {
        use std::os::windows::io::AsRawHandle;
        let raw = p.as_raw_handle() as isize;
        SerialLink { port: Box::new(p), raw }
    });
    #[cfg(not(windows))]
    let r = b.open().map(|p| SerialLink { port: p, raw: 0 });
    r.map_err(|e| {
        let listed = crate::ports::list().iter().any(|p| p.name.eq_ignore_ascii_case(port));
        let busy = (listed && matches!(e.kind(), serialport::ErrorKind::NoDevice)) || matches!(e.kind(), serialport::ErrorKind::Io(ErrorKind::PermissionDenied));
        (crate::oserr::serial_open(&e, listed), busy)
    })
}

/// 포트를 열어 시험한다(이 함수가 끝나면 포트를 닫는다). 다른 프로그램이 쓰는 중이면 Error{busy:true}
pub fn run(cfg: &LoopConfig, cancel: &AtomicBool, emit: &mut dyn FnMut(LoopEvent)) {
    let first = cfg.bauds.first().copied().unwrap_or(9600);
    match open(cfg.port.trim(), first) {
        Ok(mut link) => run_on(&mut link, cfg, cancel, emit),
        Err((message, busy)) => {
            emit(LoopEvent::Error { message, busy });
            emit(LoopEvent::Done { cancelled: false, ms: 0 });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;

    /// 가짜 포트 — 보낸 것을 돌려준다(망가뜨리기·잃기·에코 끄기 선택)
    #[derive(Default)]
    struct Fake {
        q: VecDeque<u8>,
        /// 이 자리(보낸 순서)의 바이트를 바꾼다
        flip_at: Option<usize>,
        /// 보낸 순서 n 번째 이후는 버린다
        drop_after: Option<usize>,
        off: bool,
        n: usize,
        baud: u32,
    }

    impl Link for Fake {
        fn write_all(&mut self, b: &[u8]) -> std::io::Result<()> {
            for &x in b {
                let i = self.n;
                self.n += 1;
                if self.off || self.drop_after.is_some_and(|d| i >= d) {
                    continue;
                }
                self.q.push_back(if self.flip_at == Some(i) { !x } else { x });
            }
            Ok(())
        }
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            let n = buf.len().min(self.q.len());
            if n == 0 {
                std::thread::sleep(Duration::from_millis(1));
            }
            for (i, b) in self.q.drain(..n).enumerate() {
                buf[i] = b;
            }
            Ok(n)
        }
        fn set_baud(&mut self, baud: u32) -> Result<(), String> {
            if baud == 1 { Err("refused".into()) } else {
                self.baud = baud;
                Ok(())
            }
        }
        fn clear(&mut self) {
            self.q.clear();
        }
        fn flags(&mut self) -> CommFlags {
            CommFlags::default()
        }
    }

    fn cfg(mode: Mode, bauds: &[u32]) -> LoopConfig {
        LoopConfig { port: "X".into(), mode, bauds: bauds.to_vec(), bytes: 64, pings: 3 }
    }

    fn collect(link: &mut Fake, c: &LoopConfig) -> Vec<LoopEvent> {
        let mut ev = Vec::new();
        run_on(link, c, &AtomicBool::new(false), &mut |e| ev.push(e));
        ev
    }

    #[test]
    fn pure_parts() {
        assert_eq!(compare(b"abcd", b"abXd"), (3, 1, 0, 0));
        assert_eq!(compare(b"abcd", b"ab"), (2, 0, 2, 0));
        assert_eq!(compare(b"ab", b"abcd"), (2, 0, 0, 2));
        let r = rtt_stats(&[3.0, 1.0, 2.0, 10.0], 1).unwrap();
        assert_eq!((r.samples, r.lost, r.min, r.median, r.max), (4, 1, 1.0, 2.5, 10.0));
        assert!(rtt_stats(&[], 3).is_none());
        assert!((tx_ms(9600, 96) - 100.0).abs() < 1e-9);
        assert_ne!(pattern(9600, 64), pattern(19200, 64));
        assert_eq!(pattern(9600, 64), pattern(9600, 64));
    }

    #[test]
    fn loopback_all_back() {
        let mut f = Fake::default();
        let ev = collect(&mut f, &cfg(Mode::Loopback, &[9600, 115200]));
        let results: Vec<&BaudResult> = ev.iter().filter_map(|e| if let LoopEvent::Baud { result } = e { Some(result) } else { None }).collect();
        assert_eq!(results.len(), 2);
        for r in results {
            assert_eq!((r.sent, r.received, r.same, r.changed, r.lost, r.extra), (64, 64, 64, 0, 0, 0));
            let rtt = r.rtt.unwrap();
            assert_eq!((rtt.samples, rtt.lost), (3, 0));
            assert!(!r.nothing_back);
        }
        assert!(matches!(ev.last(), Some(LoopEvent::Done { cancelled: false, .. })));
        assert!(ev.iter().any(|e| matches!(e, LoopEvent::Progress { .. })));
    }

    #[test]
    fn loopback_changed_and_lost() {
        let mut f = Fake { flip_at: Some(5), drop_after: Some(40), ..Default::default() };
        let ev = collect(&mut f, &cfg(Mode::Loopback, &[9600]));
        let LoopEvent::Baud { result: r } = &ev[ev.len() - 2] else { panic!("{ev:?}") };
        assert_eq!((r.same, r.changed, r.lost), (39, 1, 24));
        // 왕복도 버려진다
        assert_eq!(r.rtt, None);
    }

    #[test]
    fn nothing_back_stops_early() {
        let mut f = Fake { off: true, ..Default::default() };
        let ev = collect(&mut f, &cfg(Mode::Loopback, &[115200]));
        let LoopEvent::Baud { result: r } = &ev[0] else { panic!("{ev:?}") };
        assert!(r.nothing_back);
        assert_eq!((r.sent, r.received), (CHUNK, 0));
    }

    #[test]
    fn echo_detects() {
        let mut f = Fake::default();
        let ev = collect(&mut f, &cfg(Mode::Echo, &[9600]));
        let LoopEvent::Echo { result: r } = &ev[0] else { panic!("{ev:?}") };
        assert!(r.echoed && !r.partial && r.first_ms.is_some());
        let mut f = Fake { off: true, ..Default::default() };
        let ev = collect(&mut f, &cfg(Mode::Echo, &[9600]));
        let LoopEvent::Echo { result: r } = &ev[0] else { panic!("{ev:?}") };
        assert!(!r.echoed && !r.partial && r.received == 0);
        let mut f = Fake { drop_after: Some(6), ..Default::default() };
        let ev = collect(&mut f, &cfg(Mode::Echo, &[9600]));
        let LoopEvent::Echo { result: r } = &ev[0] else { panic!("{ev:?}") };
        assert!(!r.echoed && r.partial);
    }

    #[test]
    fn errors_and_cancel() {
        let mut f = Fake::default();
        let ev = collect(&mut f, &cfg(Mode::Loopback, &[1, 9600]));
        assert!(matches!(&ev[0], LoopEvent::Error { message, .. } if message.contains("refused")));
        let ev = collect(&mut f, &cfg(Mode::Loopback, &[]));
        assert!(matches!(&ev[0], LoopEvent::Error { .. }));
        let mut ev = Vec::new();
        run_on(&mut f, &cfg(Mode::Loopback, &[9600, 19200]), &AtomicBool::new(true), &mut |e| ev.push(e));
        assert!(matches!(ev.last(), Some(LoopEvent::Done { cancelled: true, .. })));
        assert!(!ev.iter().any(|e| matches!(e, LoopEvent::Baud { .. })));
    }

    #[test]
    fn missing_port_is_an_error() {
        let mut ev = Vec::new();
        run(&LoopConfig { port: "COM250".into(), mode: Mode::Loopback, bauds: vec![9600], bytes: 64, pings: 1 }, &AtomicBool::new(false), &mut |e| ev.push(e));
        assert!(matches!(&ev[0], LoopEvent::Error { busy: false, .. }), "{ev:?}");
        assert!(matches!(ev.last(), Some(LoopEvent::Done { .. })));
    }

    #[test]
    fn event_shapes() {
        let v = serde_json::to_value(LoopEvent::Error { message: "x".into(), busy: true }).unwrap();
        assert_eq!(v, serde_json::json!({ "type": "error", "message": "x", "busy": true }));
        let c: LoopConfig = serde_json::from_str(r#"{"port":"COM3","mode":"echo","bauds":[9600]}"#).unwrap();
        assert_eq!((c.mode, c.bytes, c.pings), (Mode::Echo, 256, 20));
        let f = serde_json::to_value(CommFlags { read: true, brk: true, ..Default::default() }).unwrap();
        assert_eq!(f["break"], true);
        assert_eq!(f["rxOver"], false);
    }
}
