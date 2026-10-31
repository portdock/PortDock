//! Modbus RTU 엿듣기(0.10.0) — RS-485 버스에 끼운 어댑터(또는 RS-232 Y 케이블의 두 포트)로 마스터·슬레이브 사이 통신을
//! 보내지 않고 듣기만 한다. 프레임을 자르고(CRC 가 먼저, 3.5 문자 간격은 보조), 요청/응답 짝·응답 시간·무응답·예외를 붙인다.
//!
//! 프레임 자르기: OS·USB 어댑터가 읽기를 묶거나 쪼개므로 간격만 믿을 수 없다. 그래서
//! 1) 함수 코드로 요청·응답 길이 후보를 내고 CRC 가 맞는 가장 짧은 것을 자른다(요청과 응답이 한 번에 읽혀도 나뉜다),
//! 2) 모르는 함수는 CRC 가 맞는 가장 짧은 길이로,
//! 3) 어디서도 CRC 가 맞지 않으면 그 뒤에서 CRC 가 맞는 프레임이 시작하는 곳을 찾아 앞을 «깨진 조각» 으로 떼어 낸다(다시 맞추기),
//! 4) 3.5 문자(최소 `SILENCE_MIN`) 동안 조용하면 남은 것을 모두 내보낸다.
//!
//! 응답 시간은 읽기가 돌아온 시각 기준이라 USB 지연(대개 1~16ms)만큼 오차가 있다.
//!
//! 화면 없이 값만 — 자르기 시험은 이 파일 아래. 세션(`SniffSession`)은 포트를 읽기만 한다(쓰기 핸들은 열자마자 닫는다).

use crate::checksum::{crc16_modbus, crc16_modbus_update};
use crate::event::{EventSink, Frame, LogWriter, SessionEvent};
use crate::framer::modbus_request_len;
use crate::reqpair::{PairMark, Pairer, miss_note};
use crate::serial::SerialConfig;
use std::io::{ErrorKind, Read};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

/// RTU 프레임(ADU) 최대 길이
pub const MAX_ADU: usize = 256;
/// «조용함» 의 최소 시간 — USB 어댑터가 한 프레임을 두 번에 나눠 줄 때(지연 16ms) 프레임 가운데서 자르지 않게
pub const SILENCE_MIN: Duration = Duration::from_millis(30);

/// 자른 프레임이 무엇처럼 생겼나
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shape {
    /// 요청 길이로만 CRC 가 맞음
    Request,
    /// 응답 길이로만(예외 응답 포함)
    Response,
    /// 요청·응답 길이가 같음(05·06·08 등)
    Either,
    /// 모르는 함수 — CRC 만 맞음
    Unknown,
}

/// 응답 길이(CRC 포함). 바이트 수 칸이 아직 안 왔거나 모르는 함수면 None
pub fn response_len(buf: &[u8]) -> Option<usize> {
    let fc = *buf.get(1)?;
    if fc & 0x80 != 0 {
        return Some(5);
    }
    match fc {
        0x01..=0x04 | 0x17 => Some(5 + *buf.get(2)? as usize),
        0x05 | 0x06 | 0x08 | 0x0F | 0x10 => Some(8),
        0x16 => Some(10),
        _ => None,
    }
}

/// 끝 2바이트(낮은 바이트 먼저)가 CRC16 Modbus 와 맞는지
pub fn crc_ok(b: &[u8]) -> bool {
    let n = b.len();
    n >= 4 && crc16_modbus(&b[..n - 2]).to_le_bytes() == [b[n - 2], b[n - 1]]
}

enum At {
    Frame(usize, Shape),
    /// 더 와야 안다
    Wait,
    /// 여기서 시작하는 프레임은 없다
    Bad,
}

/// `buf` 맨 앞에서 시작하는 프레임. `silent` = 뒤에 더 오지 않음, `generic` = 모르는 길이도 CRC 로 찾기
fn at(buf: &[u8], silent: bool, generic: bool) -> At {
    let Some(&unit) = buf.first() else { return At::Wait };
    // 국번 248~255 는 예약 — 프레임 시작이 아니다
    if unit > 247 {
        return At::Bad;
    }
    let Some(&fc) = buf.get(1) else { return if silent { At::Bad } else { At::Wait } };
    if fc & 0x7F == 0 {
        return At::Bad;
    }
    let exc = fc & 0x80 != 0;
    let req = if exc { None } else { modbus_request_len(buf) };
    let rsp = response_len(buf);
    // 길이 칸이 아직 안 온 함수(0F·10 요청의 바이트 수는 7번째, 17 은 11번째, 01~04·17 응답은 3번째)
    let undecided = !exc && ((matches!(fc, 0x0F | 0x10) && buf.len() < 7) || (fc == 0x17 && buf.len() < 11) || (matches!(fc, 0x01..=0x04 | 0x17) && buf.len() < 3));
    let mut best: Option<(usize, Shape)> = None;
    let mut longer = false;
    for (n, shape) in [(req, Shape::Request), (rsp, Shape::Response)] {
        let Some(n) = n else { continue };
        if !(4..=MAX_ADU).contains(&n) {
            continue;
        }
        if n > buf.len() {
            longer = true;
            continue;
        }
        if crc_ok(&buf[..n]) {
            best = match best {
                Some((m, _)) if m == n => Some((n, Shape::Either)),
                Some((m, s)) if m < n => Some((m, s)),
                _ => Some((n, shape)),
            };
        }
    }
    if let Some((n, s)) = best {
        return At::Frame(n, s);
    }
    if !silent && (longer || undecided) {
        return At::Wait;
    }
    if generic {
        // CRC 를 이어 가며 — 길이마다 처음부터 다시 셈하지 않는다(잡음이 계속 들어올 때 CPU)
        let end = buf.len().min(MAX_ADU);
        let mut crc = crc16_modbus_update(0xFFFF, &buf[..2]);
        for n in 4..=end {
            if crc.to_le_bytes() == [buf[n - 2], buf[n - 1]] {
                return At::Frame(n, Shape::Unknown);
            }
            crc = crc16_modbus_update(crc, &buf[n - 2..n - 1]);
        }
    }
    let known = req.is_some() || rsp.is_some();
    if !silent && !known && buf.len() < MAX_ADU {
        return At::Wait;
    }
    At::Bad
}

/// 다음에 떼어 낼 길이와 모양(None = CRC 가 맞는 프레임이 아닌 깨진 조각). 더 기다려야 하면 None.
/// `bad[k]` = 자리 k 에서 시작하는 프레임은 없다고 이미 판정(바이트가 더 와도 바뀌지 않는다 — 길이 칸이 다 와서 CRC 가 틀림 등).
/// 다시 맞추기가 읽기마다 같은 자리의 CRC 를 되풀이하지 않게 기억한다
fn next(buf: &[u8], silent: bool, bad: &mut Vec<bool>) -> Option<(usize, Option<Shape>)> {
    if buf.is_empty() {
        return None;
    }
    bad.resize(buf.len(), false);
    match at(buf, silent, true) {
        At::Frame(n, s) => Some((n, Some(s))),
        At::Wait => None,
        At::Bad => {
            // 다시 맞추기 — 뒤에서 CRC 가 맞는(길이를 아는) 프레임이 시작하는 첫 자리
            for k in 1..buf.len() {
                if bad[k] {
                    continue;
                }
                match at(&buf[k..], false, false) {
                    At::Frame(..) => return Some((k, None)),
                    At::Bad => bad[k] = true,
                    At::Wait => {}
                }
            }
            if silent {
                Some((buf.len().min(MAX_ADU), None))
            } else if buf.len() >= MAX_ADU {
                // 끊김 없이 깨진 바이트만 이어짐 — 끝의 몇 바이트(다음 프레임의 시작일 수 있음)만 남긴다
                Some((buf.len() - 8, None))
            } else {
                None
            }
        }
    }
}

/// 잘라 낸 한 조각
#[derive(Debug, Clone, PartialEq)]
pub struct Piece {
    /// 첫 바이트가 담긴 읽기가 돌아온 시각
    pub at: Instant,
    pub bytes: Vec<u8>,
    /// None = CRC 가 맞는 프레임이 아님(잡음·잘린 프레임)
    pub shape: Option<Shape>,
}

/// 3.5 문자 시간(1문자 = 11비트, 19200 초과는 1.75ms) 과 `SILENCE_MIN` 중 긴 쪽
pub fn silence_for(baud: u32) -> Duration {
    let micros = if baud > 19_200 { 1_750 } else { 38_500_000 / baud.max(1) as u64 };
    Duration::from_micros(micros).max(SILENCE_MIN)
}

/// 한 포트의 바이트 흐름을 프레임으로 자른다
pub struct Splitter {
    buf: Vec<u8>,
    /// 버퍼 안 자리 → 그 바이트가 담긴 읽기의 시각(읽기마다 하나)
    marks: Vec<(usize, Instant)>,
    last: Option<Instant>,
    silence: Duration,
    /// 버퍼 자리별 «여기서 시작하는 프레임 없음» 판정(`next`)
    bad: Vec<bool>,
}

impl Splitter {
    pub fn new(silence: Duration) -> Self {
        Self { buf: Vec::new(), marks: Vec::new(), last: None, silence, bad: Vec::new() }
    }

    pub fn feed(&mut self, data: &[u8], now: Instant) -> Vec<Piece> {
        let mut out = Vec::new();
        if let Some(t) = self.last
            && now.saturating_duration_since(t) >= self.silence
        {
            self.cut(true, &mut out);
        }
        if !data.is_empty() {
            self.marks.push((self.buf.len(), now));
            self.buf.extend_from_slice(data);
            self.last = Some(now);
        }
        self.cut(false, &mut out);
        out
    }

    /// 조용한 시간이 지났으면 남은 것을 모두
    pub fn poll(&mut self, now: Instant) -> Vec<Piece> {
        let mut out = Vec::new();
        if let Some(t) = self.last
            && !self.buf.is_empty()
            && now.saturating_duration_since(t) >= self.silence
        {
            self.cut(true, &mut out);
        }
        out
    }

    /// 닫기 직전 — 남은 것을 모두
    pub fn flush(&mut self) -> Vec<Piece> {
        let mut out = Vec::new();
        self.cut(true, &mut out);
        out
    }

    fn time_at(&self, off: usize) -> Instant {
        self.marks.iter().rev().find(|(o, _)| *o <= off).or(self.marks.first()).map(|m| m.1).unwrap_or_else(Instant::now)
    }

    fn cut(&mut self, silent: bool, out: &mut Vec<Piece>) {
        while let Some((n, shape)) = next(&self.buf, silent, &mut self.bad) {
            let at = self.time_at(0);
            let rest_at = self.time_at(n);
            let bytes: Vec<u8> = self.buf.drain(..n).collect();
            // 판정은 그 자리부터의 바이트에만 달렸다 — 앞을 떼어 내도 자리만 옮기면 그대로 맞다
            self.bad.drain(..n.min(self.bad.len()));
            let mut marks: Vec<(usize, Instant)> = self.marks.iter().filter(|(o, _)| *o > n).map(|&(o, t)| (o - n, t)).collect();
            if !self.buf.is_empty() && marks.first().is_none_or(|m| m.0 != 0) {
                marks.insert(0, (0, rest_at));
            }
            self.marks = marks;
            out.push(Piece { at, bytes, shape });
        }
        if self.buf.is_empty() {
            self.marks.clear();
            self.bad.clear();
        }
    }
}

/// 짝 상태에 맞춰 조각 하나를 요청·응답으로 본다. 돌려주는 것: (이 줄의 짝 표시, 이 요청 때문에 무응답이 된 앞 요청들)
pub fn classify(p: &mut Pairer, b: &[u8], shape: Shape, at: Instant, seq: &mut u64) -> (Option<PairMark>, Vec<PairMark>) {
    let (unit, fc) = (b[0], b[1]);
    let exc = (fc & 0x80 != 0).then(|| b.get(2).copied().unwrap_or(0));
    let as_response = match shape {
        Shape::Response => true,
        Shape::Request => false,
        // 모양이 같으면 기다리는 요청이 있을 때 응답(05·06 은 응답 = 요청)
        Shape::Either | Shape::Unknown => exc.is_some() || p.rtu_waiting(unit, fc),
    };
    if as_response {
        (p.rtu_response(unit, fc, exc, at), Vec::new())
    } else {
        let (m, missed) = p.rtu_request(unit, fc, at, seq);
        (Some(m), missed)
    }
}

struct Shared {
    events: EventSink,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<LogWriter>>,
    pairer: Mutex<Pairer>,
    seq: Mutex<u64>,
    stop: AtomicBool,
    /// 끝난 읽기 스레드 수
    done: AtomicUsize,
    /// 포트가 끊겨 멈춘 이유
    lost: Mutex<Option<String>>,
    cfgs: Vec<SerialConfig>,
}

/// 엿듣기 세션 — 포트 1개(RS-485 버스) 또는 2개(RS-232 Y 케이블: 한 포트는 A→B, 다른 포트는 B→A)
pub struct SniffSession {
    shared: Arc<Shared>,
    readers: Vec<JoinHandle<()>>,
    flusher: Option<JoinHandle<()>>,
}

fn note(s: &Shared, text: String) {
    s.pending.lock().unwrap().push(Frame::event(text));
}

fn miss_frame(m: PairMark) -> Frame {
    let n = miss_note(&m, false);
    Frame { pair: Some(m), ..Frame::event(n) }
}

impl SniffSession {
    pub fn start(cfgs: Vec<SerialConfig>, events: EventSink) -> Result<Self, String> {
        if cfgs.is_empty() || cfgs.len() > 2 {
            return Err(crate::tr!("엿들을 포트는 1개 또는 2개입니다", "Listen on one or two ports").into());
        }
        if cfgs.len() == 2 && cfgs[0].port.eq_ignore_ascii_case(&cfgs[1].port) {
            return Err(crate::tr!("두 번째 포트는 첫 포트와 달라야 합니다", "The second port must differ from the first").into());
        }
        let mut ports = Vec::new();
        for c in &cfgs {
            ports.push(crate::serial::open_reader(c)?);
        }
        let two = cfgs.len() == 2;
        let shared = Arc::new(Shared {
            events,
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            pairer: Mutex::new(Pairer::default()),
            seq: Mutex::new(0),
            stop: AtomicBool::new(false),
            done: AtomicUsize::new(0),
            lost: Mutex::new(None),
            cfgs: cfgs.clone(),
        });
        shared.events.send(SessionEvent::Status { state: "connected", port: cfgs[0].port.clone(), message: None });
        for c in &cfgs {
            note(&shared, crate::tr!(format!("SNIFF OPEN {} (듣기만 — 보내지 않음)", crate::serial::describe(c)), format!("SNIFF OPEN {} (listen only — sends nothing)", crate::serial::describe(c))));
        }
        let mut readers = Vec::new();
        for (port, c) in ports.into_iter().zip(cfgs) {
            let s = shared.clone();
            let label = two.then(|| c.port.clone());
            readers.push(std::thread::spawn(move || read_loop(s, port, c, label)));
        }
        let s = shared.clone();
        let n = readers.len();
        let flusher = std::thread::spawn(move || flush_loop(s, n));
        Ok(Self { shared, readers, flusher: Some(flusher) })
    }

    /// 첫 포트 이름(화면의 세션 이름)
    pub fn id(&self) -> &str {
        &self.shared.cfgs[0].port
    }

    pub fn configs(&self) -> &[SerialConfig] {
        &self.shared.cfgs
    }

    /// 들은 프레임을 파일에(형식은 설정 «로그 형식» — CSV 포함). None 이면 멈춘다
    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        let file = path.as_deref().map(LogWriter::open).transpose()?;
        let started = file.is_some();
        *self.shared.log.lock().unwrap() = file;
        if started {
            let d: Vec<String> = self.shared.cfgs.iter().map(crate::serial::describe).collect();
            note(&self.shared, format!("LOG START SNIFF {}", d.join(" + ")));
        }
        Ok(())
    }

    pub fn is_done(&self) -> bool {
        self.flusher.as_ref().is_none_or(|h| h.is_finished())
    }

    pub fn stop(mut self) {
        self.shutdown();
    }

    fn shutdown(&mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        for t in self.readers.drain(..) {
            let _ = t.join();
        }
        if let Some(t) = self.flusher.take() {
            let _ = t.join();
        }
    }
}

impl Drop for SniffSession {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn push(s: &Shared, label: Option<&str>, pieces: Vec<Piece>) {
    if pieces.is_empty() {
        return;
    }
    let (now_i, now_w) = (Instant::now(), crate::event::now_ms());
    let mut out = Vec::with_capacity(pieces.len());
    {
        let mut p = s.pairer.lock().unwrap();
        let mut seq = s.seq.lock().unwrap();
        for piece in pieces {
            let ts = crate::event::wall_ms(piece.at, now_i, now_w);
            let mut f = Frame { ts, ..Frame::data("rx", piece.bytes, Some(piece.shape.is_some()), label.map(str::to_string)) };
            if let Some(shape) = piece.shape {
                let (mark, missed) = classify(&mut p, &f.bytes, shape, piece.at, &mut seq);
                out.extend(missed.into_iter().map(miss_frame));
                f.pair = mark;
            }
            out.push(f);
        }
    }
    s.pending.lock().unwrap().extend(out);
}

fn read_loop(s: Arc<Shared>, mut port: Box<dyn serialport::SerialPort>, cfg: SerialConfig, label: Option<String>) {
    let mut sp = Splitter::new(silence_for(cfg.baud));
    let mut buf = [0u8; 4096];
    while !s.stop.load(Ordering::SeqCst) {
        match port.read(&mut buf) {
            Ok(0) => {}
            Ok(n) => {
                let pieces = sp.feed(&buf[..n], Instant::now());
                push(&s, label.as_deref(), pieces);
            }
            Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
            Err(e) => {
                let msg = format!("{}: {}", cfg.port, crate::oserr::serial_io(&e));
                note(&s, format!("LOST {msg}"));
                s.lost.lock().unwrap().get_or_insert(msg);
                s.stop.store(true, Ordering::SeqCst);
                break;
            }
        }
        let pieces = sp.poll(Instant::now());
        push(&s, label.as_deref(), pieces);
    }
    let pieces = sp.flush();
    push(&s, label.as_deref(), pieces);
    drop(port);
    s.done.fetch_add(1, Ordering::SeqCst);
}

fn flush(s: &Shared) {
    let mut frames = std::mem::take(&mut *s.pending.lock().unwrap());
    // 두 포트의 줄을 한 시간축으로
    frames.sort_by_key(|f| f.ts);
    crate::event::flush_frames(frames, &s.log, &s.events);
}

fn flush_loop(s: Arc<Shared>, readers: usize) {
    while !s.stop.load(Ordering::SeqCst) {
        std::thread::sleep(Duration::from_millis(50));
        let missed = s.pairer.lock().unwrap().expire(Instant::now());
        if !missed.is_empty() {
            s.pending.lock().unwrap().extend(missed.into_iter().map(miss_frame));
        }
        flush(&s);
    }
    // 읽기 스레드가 남은 조각을 넣을 때까지(최대 1초)
    let t0 = Instant::now();
    while s.done.load(Ordering::SeqCst) < readers && t0.elapsed() < Duration::from_secs(1) {
        std::thread::sleep(Duration::from_millis(10));
    }
    note(&s, "CLOSE".into());
    flush(&s);
    let lost = s.lost.lock().unwrap().clone();
    s.events.send(SessionEvent::Status { state: "closed", port: s.cfgs[0].port.clone(), message: lost });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rtu(body: &[u8]) -> Vec<u8> {
        let mut v = body.to_vec();
        v.extend(crc16_modbus(body).to_le_bytes());
        v
    }

    fn cut_all(chunks: &[Vec<u8>]) -> Vec<(Vec<u8>, Option<Shape>)> {
        // 읽기 사이 간격 1ms(조용함보다 짧음) — 간격으로는 못 자르는 상황
        let t0 = Instant::now();
        let mut sp = Splitter::new(SILENCE_MIN);
        let mut out = Vec::new();
        for (i, c) in chunks.iter().enumerate() {
            out.extend(sp.feed(c, t0 + Duration::from_millis(i as u64)));
        }
        out.extend(sp.poll(t0 + Duration::from_secs(1)));
        out.into_iter().map(|p| (p.bytes, p.shape)).collect()
    }

    #[test]
    fn request_and_response_in_one_read_are_split_by_crc() {
        let req = rtu(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x02]);
        let rsp = rtu(&[0x01, 0x03, 0x04, 0x00, 0x0A, 0x01, 0x02]);
        let both = [req.clone(), rsp.clone()].concat();
        let got = cut_all(&[both]);
        assert_eq!(got, vec![(req, Some(Shape::Request)), (rsp, Some(Shape::Response))]);
    }

    #[test]
    fn frame_split_across_reads_is_joined() {
        let rsp = rtu(&[0x11, 0x03, 0x06, 0xAE, 0x41, 0x56, 0x52, 0x43, 0x40]);
        let got = cut_all(&[rsp[..3].to_vec(), rsp[3..7].to_vec(), rsp[7..].to_vec()]);
        assert_eq!(got, vec![(rsp, Some(Shape::Response))]);
    }

    #[test]
    fn noise_before_frame_is_cut_off_and_resynced() {
        let req = rtu(&[0x01, 0x06, 0x00, 0x01, 0x00, 0x03]);
        let exc = rtu(&[0x01, 0x83, 0x02]);
        let noise = vec![0x00, 0xFF, 0x13];
        let got = cut_all(&[[noise.clone(), req.clone(), exc.clone()].concat()]);
        assert_eq!(got, vec![(noise, None), (req, Some(Shape::Either)), (exc, Some(Shape::Response))]);
    }

    #[test]
    fn corrupted_frame_then_good_ones() {
        let mut bad = rtu(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x02]);
        bad[3] ^= 0x40; // 한 비트 깨짐 → CRC 틀림
        let req = rtu(&[0x02, 0x04, 0x00, 0x10, 0x00, 0x01]);
        let rsp = rtu(&[0x02, 0x04, 0x02, 0x12, 0x34]);
        let got = cut_all(&[[bad.clone(), req.clone()].concat(), rsp.clone()]);
        assert_eq!(got, vec![(bad, None), (req, Some(Shape::Request)), (rsp, Some(Shape::Response))]);
    }

    #[test]
    fn unknown_function_is_cut_by_crc_and_silence() {
        let a = rtu(&[0x05, 0x41, 0x10, 0x20, 0x30]);
        let b = rtu(&[0x05, 0x41, 0x99]);
        let got = cut_all(&[[a.clone(), b.clone()].concat()]);
        assert_eq!(got, vec![(a, Some(Shape::Unknown)), (b, Some(Shape::Unknown))]);
    }

    /// 속도가 틀려 잡음만 계속 들어와도 — 판정이 같고(기억한 판정 = 매번 새로 한 판정), 잡음 뒤 프레임을 찾는다
    #[test]
    fn long_noise_is_cut_and_resyncs_like_fresh() {
        let mut x: u32 = 12345;
        let mut noise: Vec<u8> = (0..6000)
            .map(|_| {
                x = x.wrapping_mul(1_103_515_245).wrapping_add(12_345);
                (x >> 16) as u8
            })
            .collect();
        let req = rtu(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x02]);
        noise.extend_from_slice(&req);
        let chunks: Vec<Vec<u8>> = noise.chunks(7).map(|c| c.to_vec()).collect();
        let t0 = std::time::Instant::now();
        let got = cut_all(&chunks);
        assert!(t0.elapsed() < Duration::from_secs(5));
        // 기억 없이 한 번에 자른 것과 같다
        let mut fresh = Vec::new();
        let mut buf = noise.clone();
        while let Some((n, s)) = next(&buf, false, &mut Vec::new()) {
            fresh.push((buf[..n].to_vec(), s));
            buf.drain(..n);
        }
        let joined: Vec<u8> = got.iter().flat_map(|(b, _)| b.clone()).collect();
        assert_eq!(joined, noise);
        assert!(got.iter().any(|(b, s)| *b == req && s.is_some()), "frame after noise");
        assert!(fresh.iter().any(|(b, s)| *b == req && s.is_some()));
    }

    #[test]
    fn partial_frame_waits_then_silence_flushes_as_broken() {
        let t0 = Instant::now();
        let mut sp = Splitter::new(SILENCE_MIN);
        assert!(sp.feed(&[0x01, 0x03, 0x00], t0).is_empty());
        assert!(sp.poll(t0 + Duration::from_millis(5)).is_empty());
        let got = sp.poll(t0 + SILENCE_MIN);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].shape, None);
        assert_eq!(got[0].at, t0);
    }

    #[test]
    fn piece_time_is_its_read_time() {
        let t0 = Instant::now();
        let mut sp = Splitter::new(SILENCE_MIN);
        let req = rtu(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x01]);
        let rsp = rtu(&[0x01, 0x03, 0x02, 0x00, 0x07]);
        // 요청 + 응답 앞 2바이트가 한 번에, 응답 나머지가 12ms 뒤에
        let mut got = sp.feed(&[req.clone(), rsp[..2].to_vec()].concat(), t0);
        got.extend(sp.feed(&rsp[2..], t0 + Duration::from_millis(12)));
        assert_eq!(got.len(), 2);
        assert_eq!(got[0].at, t0);
        assert_eq!(got[1].at, t0); // 첫 바이트가 담긴 읽기의 시각
        assert_eq!(got[1].bytes, rsp);
    }

    #[test]
    fn classify_pairs_request_response_and_write_echo() {
        let t0 = Instant::now();
        let mut p = Pairer::default();
        let mut seq = 0;
        let w = rtu(&[0x01, 0x06, 0x00, 0x01, 0x00, 0x03]);
        let (m, _) = classify(&mut p, &w, Shape::Either, t0, &mut seq);
        assert_eq!(m.unwrap().role, "req");
        let (m, _) = classify(&mut p, &w, Shape::Either, t0 + Duration::from_millis(8), &mut seq);
        let m = m.unwrap();
        assert_eq!((m.role, m.rt_ms), ("rsp", Some(8.0)));
        // 예외 응답
        let r = rtu(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x02]);
        classify(&mut p, &r, Shape::Request, t0, &mut seq);
        let e = rtu(&[0x01, 0x83, 0x02]);
        let (m, _) = classify(&mut p, &e, Shape::Response, t0 + Duration::from_millis(3), &mut seq);
        assert_eq!(m.unwrap().error.as_deref(), Some("EXC 02"));
        // 답 없는 요청 다음 요청 → 무응답
        classify(&mut p, &r, Shape::Request, t0, &mut seq);
        let (_, missed) = classify(&mut p, &r, Shape::Request, t0 + Duration::from_millis(500), &mut seq);
        assert_eq!(missed.len(), 1);
    }

    #[test]
    fn silence_floor() {
        assert_eq!(silence_for(115_200), SILENCE_MIN);
        assert!(silence_for(300) > SILENCE_MIN);
    }
}
