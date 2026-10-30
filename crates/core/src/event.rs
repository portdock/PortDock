//! 모든 PortDock 세션(시리얼·TCP·UDP)이 화면·로그로 내보내는 공통 모양.

use crate::codec::{Encoding, text_view};
use serde::{Deserialize, Serialize};
use std::io::{BufWriter, Write};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
pub struct Frame {
    /// 유닉스 시각(ms)
    pub ts: u64,
    /// "rx" | "tx" | "ev"(연결·설정 변경·신호선 등 사건)
    pub dir: &'static str,
    pub bytes: Vec<u8>,
    /// 수신 검증 체크섬이 설정돼 있을 때 결과
    pub check: Option<bool>,
    /// 사건 줄의 내용. 예: «SET baud 9600→115200»
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    /// TCP·UDP: 상대 주소(«192.168.0.10:502»). 시리얼은 None
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peer: Option<String>,
    /// (0.8.0) TCP 중계: 요청/응답 짝·응답 시간·무응답(reqpair). 그 밖은 None
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pair: Option<crate::reqpair::PairMark>,
}

impl Frame {
    pub fn data(dir: &'static str, bytes: Vec<u8>, check: Option<bool>, peer: Option<String>) -> Self {
        Self { ts: now_ms(), dir, bytes, check, note: None, peer, pair: None }
    }

    pub fn event(note: String) -> Self {
        Self { ts: now_ms(), dir: "ev", bytes: Vec::new(), check: None, note: Some(note), peer: None, pair: None }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionEvent {
    Frames { frames: Vec<Frame> },
    /// "connected" | "disconnected" | "reconnecting" | "closed"
    Status { state: &'static str, port: String, message: Option<String> },
    /// 송신 실패 등 연결은 유지되는 오류
    Error { message: String },
    /// 입력 신호선 상태
    Lines { cts: bool, dsr: bool, ri: bool, cd: bool },
    /// TCP 서버: 지금 붙어 있는 상대들
    Peers { peers: Vec<Peer> },
    /// 천천히 보내기(파일·문자 간 지연)의 진행 — 0.1초마다와 끝날 때
    Progress(Progress),
}

/// 천천히 보내기 진행. done 이면 끝(다 보냄·취소·오류 중 하나)
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub id: u64,
    pub sent: u64,
    pub total: u64,
    pub done: bool,
    pub cancelled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Peer {
    pub id: u64,
    pub addr: String,
}

/// 화면 쪽으로 사건을 넘기는 통로. 앱이 Tauri Channel 등을 감싸서 넘긴다.
#[derive(Clone)]
pub struct EventSink(Arc<dyn Fn(SessionEvent) + Send + Sync>);

impl EventSink {
    pub fn new(f: impl Fn(SessionEvent) + Send + Sync + 'static) -> Self {
        Self(Arc::new(f))
    }

    pub fn send(&self, e: SessionEvent) {
        (self.0)(e);
    }
}

/// 파일 로그 한 줄의 모양
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum LogFormat {
    /// «… RX 01 03 00 00 [OK]» (예전과 같음)
    #[default]
    Hex,
    /// «… RX OK<CR><LF> [OK]» — 글자로(고른 인코딩)
    Ascii,
    /// «… RX 4F 4B 0D 0A | OK<CR><LF> [OK]»
    HexAscii,
    /// 표 계산 프로그램용 — ts,dir,len,hex,ascii,check,note,peer
    Csv,
}

/// 파일 로그 설정 — 프로그램(창) 하나에 하나. 다음에 여는 로그 파일부터 적용된다
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct LogOptions {
    pub format: LogFormat,
    /// ASCII 칸을 읽을 글자 인코딩
    pub encoding: Encoding,
    /// 이 크기(MB)를 넘으면 다음 파일로(0 = 나누지 않음)
    pub split_mb: u32,
    /// 이 시간(시간)이 지나면 다음 파일로(0 = 나누지 않음)
    pub split_hours: u32,
    /// (0.6.0) 날짜가 바뀌면 다음 파일로 — 이름에 날짜(«이름-20261030.log», 같은 날 크기로 또 나누면 «-002»)
    pub split_daily: bool,
    /// (0.6.0) 같은 이름 갈래의 옛 로그 파일 중 이 날 수보다 오래된 것을 지운다(0 = 지우지 않음). 파일을 열 때·다음 파일로 넘어갈 때
    pub keep_days: u32,
}

static LOG_OPTIONS: Mutex<LogOptions> = Mutex::new(LogOptions { format: LogFormat::Hex, encoding: Encoding::Utf8, split_mb: 0, split_hours: 0, split_daily: false, keep_days: 0 });

/// 화면 설정(파일 로그 형식·나누기)을 받는다. 이미 쓰고 있는 파일은 그대로 — 다음에 여는 파일부터
pub fn set_log_options(o: LogOptions) {
    *LOG_OPTIONS.lock().unwrap_or_else(|e| e.into_inner()) = o;
}

pub fn log_options() -> LogOptions {
    *LOG_OPTIONS.lock().unwrap_or_else(|e| e.into_inner())
}

pub const CSV_HEADER: &str = "ts,dir,len,hex,ascii,check,note,peer";

/// 로그 파일을 이어 쓰기로 연다 → (쓰는 곳, 이미 있던 크기)
type Opener = fn(&str) -> Result<(Box<dyn Write + Send>, u64), String>;

/// 프레임 로그 파일. 쓰기·flush 가 한 번이라도 실패하면(디스크 가득·USB 메모리 뽑힘 등)
/// 그 파일 기록은 멈추고, 실패를 한 번만 알린다.
/// 크기·시간으로 나누면 «이름-002.log» 처럼 다음 파일로 이어 쓴다(앞뒤 파일에 서로 이름을 남긴다).
pub struct LogWriter {
    path: String,
    w: BufWriter<Box<dyn Write + Send>>,
    opts: LogOptions,
    /// 지금 파일에 쓴 바이트(이어 쓰기면 원래 크기부터)
    written: u64,
    opened: Instant,
    /// 나눈 파일 번호(첫 파일 1)
    part: u32,
    /// 첫 파일 경로 — 다음 파일 이름의 바탕
    base: String,
    /// 지금 파일을 연 날(YYYYMMDD)과 그날 안의 번호 — 날짜별 나누기
    day: String,
    day_part: u32,
    /// 다음 파일을 여는 방법·오늘 날짜(시험에서 바꾼다)
    opener: Opener,
    today: fn() -> String,
}

impl LogWriter {
    /// 이어 쓰기로 연다. 형식·나누기는 지금 설정(`set_log_options`)을 따른다
    pub fn open(path: &str) -> Result<Self, String> {
        Self::open_with(path, log_options())
    }

    pub fn open_with(path: &str, opts: LogOptions) -> Result<Self, String> {
        let (f, len) = open_append(path)?;
        let mut lw = Self::from_writer_with(path, f, opts);
        lw.written = len;
        lw.start_file().map_err(|e| format!("{path}: {e}"))?;
        lw.clean_old().map_err(|e| format!("{path}: {e}"))?;
        Ok(lw)
    }

    /// 오래된 같은 갈래 파일 지우기 — 지웠으면 사건 줄로 남긴다
    fn clean_old(&mut self) -> std::io::Result<()> {
        if self.opts.keep_days == 0 {
            return Ok(());
        }
        let gone = remove_old_logs(&self.base, &self.path, self.opts.keep_days, SystemTime::now());
        if !gone.is_empty() {
            self.write_line(&Frame::event(format!("LOG CLEAN {} (> {} d)", gone.len(), self.opts.keep_days)))?;
            self.w.flush()?;
        }
        Ok(())
    }

    pub fn from_writer(path: &str, w: Box<dyn Write + Send>) -> Self {
        Self::from_writer_with(path, w, LogOptions::default())
    }

    pub fn from_writer_with(path: &str, w: Box<dyn Write + Send>, opts: LogOptions) -> Self {
        Self {
            path: path.to_string(),
            w: BufWriter::new(w),
            opts,
            written: 0,
            opened: Instant::now(),
            part: 1,
            base: path.to_string(),
            day: local_day(),
            day_part: 1,
            opener: open_append,
            today: local_day,
        }
    }

    pub fn path(&self) -> &str {
        &self.path
    }

    /// 새(빈) CSV 파일이면 머리줄 — 엑셀이 한글을 읽도록 UTF-8 BOM 도
    fn start_file(&mut self) -> std::io::Result<()> {
        if self.opts.format == LogFormat::Csv && self.written == 0 {
            let head = format!("\u{FEFF}{CSV_HEADER}\r\n");
            self.w.write_all(head.as_bytes())?;
            self.written += head.len() as u64;
            self.w.flush()?;
        }
        Ok(())
    }

    fn due(&self) -> bool {
        (self.opts.split_mb > 0 && self.written >= self.opts.split_mb as u64 * 1_048_576)
            || (self.opts.split_hours > 0 && self.opened.elapsed() >= Duration::from_secs(self.opts.split_hours as u64 * 3600))
            || (self.opts.split_daily && (self.today)() != self.day)
    }

    /// 다음 파일로 — 옛 파일 끝과 새 파일 처음에 서로의 이름을 사건 줄로 남긴다
    fn rotate(&mut self) -> std::io::Result<()> {
        let next = if self.opts.split_daily {
            let today = (self.today)();
            self.day_part = if today == self.day { self.day_part + 1 } else { 1 };
            self.day = today;
            day_path(&self.base, &self.day, self.day_part)
        } else {
            part_path(&self.base, self.part + 1)
        };
        let (f, len) = (self.opener)(&next).map_err(std::io::Error::other)?;
        self.write_line(&Frame::event(format!("LOG NEXT {next}")))?;
        self.w.flush()?;
        let prev = std::mem::replace(&mut self.path, next);
        self.w = BufWriter::new(f);
        self.written = len;
        self.opened = Instant::now();
        self.part += 1;
        self.start_file()?;
        self.write_line(&Frame::event(format!("LOG PART {} (prev {prev})", self.part)))?;
        self.clean_old()
    }

    fn write_line(&mut self, f: &Frame) -> std::io::Result<()> {
        let line = log_line_with(f, &self.opts);
        self.w.write_all(line.as_bytes())?;
        self.w.write_all(b"\r\n")?;
        self.written += line.len() as u64 + 2;
        Ok(())
    }

    fn write(&mut self, frames: &[Frame]) -> std::io::Result<()> {
        for f in frames {
            if self.due() {
                self.rotate()?;
            }
            self.write_line(f)?;
        }
        self.w.flush()
    }
}

fn open_append(path: &str) -> Result<(Box<dyn Write + Send>, u64), String> {
    let f = std::fs::OpenOptions::new().create(true).append(true).open(path).map_err(|e| format!("{path}: {e}"))?;
    let len = f.metadata().map(|m| m.len()).unwrap_or(0);
    Ok((Box::new(f), len))
}

/// «C:\log\a.log» 의 n 번째 파일 → «C:\log\a-002.log»
pub fn part_path(base: &str, n: u32) -> String {
    let cut = base.rfind(['\\', '/']).map_or(0, |i| i + 1);
    let (dir, name) = base.split_at(cut);
    match name.rfind('.') {
        Some(dot) if dot > 0 => format!("{dir}{}-{n:03}{}", &name[..dot], &name[dot..]),
        _ => format!("{dir}{name}-{n:03}"),
    }
}

/// 오늘(이 PC 시각) «YYYYMMDD»
fn local_day() -> String {
    chrono::Local::now().format("%Y%m%d").to_string()
}

/// 날짜별 파일 이름 — «C:\log\a.log» 의 20261030 첫 파일 → «C:\log\a-20261030.log», 그날 두 번째 → «a-20261030-002.log»
pub fn day_path(base: &str, day: &str, n: u32) -> String {
    let cut = base.rfind(['\\', '/']).map_or(0, |i| i + 1);
    let (dir, name) = base.split_at(cut);
    let tail = if n > 1 { format!("-{day}-{n:03}") } else { format!("-{day}") };
    match name.rfind('.') {
        Some(dot) if dot > 0 => format!("{dir}{}{tail}{}", &name[..dot], &name[dot..]),
        _ => format!("{dir}{name}{tail}"),
    }
}

/// 이름 갈래 — 확장자를 뺀 이름에서 끝의 «-숫자» 묶음을 떼어 낸 것(«portdock-tcp-20261030-101500» → «portdock-tcp»)
fn log_family(stem: &str) -> &str {
    let mut s = stem;
    while let Some(i) = s.rfind('-') {
        let tail = &s[i + 1..];
        if i == 0 || tail.is_empty() || !tail.bytes().all(|c| c.is_ascii_digit()) {
            break;
        }
        s = &s[..i];
    }
    s
}

/// `name` 이 `base` 와 같은 갈래의 로그 파일인지 — 같은 확장자, 갈래 이름 뒤에 «-숫자» 묶음만 붙은 것
pub fn same_log_family(base_name: &str, name: &str) -> bool {
    let split = |n: &str| match n.rfind('.') {
        Some(d) if d > 0 => (n[..d].to_string(), n[d..].to_ascii_lowercase()),
        _ => (n.to_string(), String::new()),
    };
    let (bstem, bext) = split(base_name);
    let (stem, ext) = split(name);
    let fam = log_family(&bstem);
    if ext != bext || !stem.starts_with(fam) {
        return false;
    }
    let rest = &stem[fam.len()..];
    rest.is_empty() || (rest.starts_with('-') && rest[1..].split('-').all(|t| !t.is_empty() && t.bytes().all(|c| c.is_ascii_digit())))
}

/// 같은 폴더의 같은 갈래 로그 중 고친 지 `keep_days` 일이 넘은 것을 지운다(지금 파일은 빼고, 하위 폴더는 보지 않는다). 지운 경로들
pub fn remove_old_logs(base: &str, current: &str, keep_days: u32, now: SystemTime) -> Vec<String> {
    let p = std::path::Path::new(base);
    let (Some(dir), Some(base_name)) = (p.parent(), p.file_name().and_then(|n| n.to_str())) else { return Vec::new() };
    let dir = if dir.as_os_str().is_empty() { std::path::Path::new(".") } else { dir };
    let limit = Duration::from_secs(keep_days as u64 * 86_400);
    let cur = std::path::Path::new(current).file_name().map(|n| n.to_os_string());
    let mut gone = Vec::new();
    let Ok(rd) = std::fs::read_dir(dir) else { return gone };
    for e in rd.flatten() {
        let name = e.file_name();
        let Some(n) = name.to_str() else { continue };
        if Some(&name) == cur.as_ref() || !same_log_family(base_name, n) {
            continue;
        }
        let Ok(meta) = e.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        let old = meta.modified().ok().and_then(|m| now.duration_since(m).ok()).is_some_and(|age| age > limit);
        if old && std::fs::remove_file(e.path()).is_ok() {
            gone.push(e.path().to_string_lossy().into_owned());
        }
    }
    gone
}

/// 프레임들을 로그에 쓴다. 실패하면 기록을 멈추고(slot = None) 알릴 문구를 돌려준다.
pub fn write_log(slot: &mut Option<LogWriter>, frames: &[Frame]) -> Option<String> {
    let log = slot.as_mut()?;
    let err = log.write(frames).err()?;
    let path = log.path.clone();
    *slot = None;
    Some(crate::tr!(
        format!("로그 파일 쓰기 실패 — 기록을 멈췄습니다: {path} ({err})"),
        format!("Log file write failed — logging stopped: {path} ({err})")
    ))
}

/// 세션의 묶음 전송 — 로그에 쓰고 화면으로 보낸다. 로그 실패는 사건 줄과 오류로 한 번 알린다.
pub fn flush_frames(mut frames: Vec<Frame>, log: &std::sync::Mutex<Option<LogWriter>>, events: &EventSink) {
    if frames.is_empty() {
        return;
    }
    let failed = write_log(&mut log.lock().unwrap(), &frames);
    if let Some(msg) = &failed {
        frames.push(Frame::event(msg.clone()));
    }
    events.send(SessionEvent::Frames { frames });
    if let Some(message) = failed {
        events.send(SessionEvent::Error { message });
    }
}

/// 재연결을 기다리는 동안 상태 문구 — 직전 실패 이유를 덮어쓰지 않고 이어 보여 준다
pub fn waiting_reason(reason: &str) -> String {
    crate::tr!(format!("재연결 대기 · 마지막 실패: {reason}"), format!("Waiting to reconnect · last failure: {reason}"))
}

/// 끊긴 뒤 닫힐 때 상태 문구
pub fn closed_reason(reason: &str) -> String {
    crate::tr!(format!("마지막 실패: {reason}"), format!("Last failure: {reason}"))
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// 단조 시각(프레임 첫 바이트를 받은 순간) → 벽시계 ms. `(now_i, now_w)` 는 같은 순간에 잰 짝
pub fn wall_ms(at: std::time::Instant, now_i: std::time::Instant, now_w: u64) -> u64 {
    now_w.saturating_sub(now_i.saturating_duration_since(at).as_millis() as u64)
}

fn stamp(ts: u64) -> String {
    chrono::DateTime::from_timestamp_millis(ts as i64)
        .map(|d| d.with_timezone(&chrono::Local).format("%Y-%m-%d %H:%M:%S%.3f").to_string())
        .unwrap_or_default()
}

fn hex_of(bytes: &[u8]) -> String {
    let hex: Vec<String> = bytes.iter().map(|b| format!("{b:02X}")).collect();
    hex.join(" ")
}

/// «2026-10-17 21:05:03.123 RX 01 03 00 00 [OK]» (HEX 형식 — 예전과 같음)
pub fn log_line(f: &Frame) -> String {
    log_line_with(f, &LogOptions::default())
}

/// 형식에 맞춘 한 줄(줄바꿈 없음)
pub fn log_line_with(f: &Frame, o: &LogOptions) -> String {
    let t = stamp(f.ts);
    if o.format == LogFormat::Csv {
        let check = match f.check {
            Some(true) => "OK",
            Some(false) => "FAIL",
            None => "",
        };
        let ev = f.note.is_some();
        let cells = [
            t,
            f.dir.to_uppercase(),
            if ev { String::new() } else { f.bytes.len().to_string() },
            if ev { String::new() } else { hex_of(&f.bytes) },
            if ev { String::new() } else { csv_cell(&text_view(&f.bytes, o.encoding)) },
            check.to_string(),
            csv_cell(f.note.as_deref().unwrap_or("")),
            csv_cell(f.peer.as_deref().unwrap_or("")),
        ];
        return cells.join(",");
    }
    let check = match f.check {
        Some(true) => " [OK]",
        Some(false) => " [CHECK FAIL]",
        None => "",
    };
    let peer = f.peer.as_ref().map(|p| format!(" [{p}]")).unwrap_or_default();
    match &f.note {
        Some(n) => format!("{t} EV {n}"),
        None => {
            let data = match o.format {
                LogFormat::Ascii => text_view(&f.bytes, o.encoding),
                LogFormat::HexAscii => format!("{} | {}", hex_of(&f.bytes), text_view(&f.bytes, o.encoding)),
                _ => hex_of(&f.bytes),
            };
            format!("{t} {}{peer} {data}{check}", f.dir.to_uppercase())
        }
    }
}

/// CSV 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다. 엑셀이 수식으로 읽지 않게 = + - @ 로 시작하면 ' 를 앞에
fn csv_cell(s: &str) -> String {
    let s = if s.starts_with(['=', '+', '-', '@']) { format!("'{s}") } else { s.to_string() };
    if s.contains([',', '"', '\r', '\n']) { format!("\"{}\"", s.replace('"', "\"\"")) } else { s }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Broken;
    impl Write for Broken {
        fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
            Err(std::io::Error::other("disk full"))
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Err(std::io::Error::other("disk full"))
        }
    }

    #[test]
    fn log_failure_is_reported_once_and_stops_logging() {
        let log = Mutex::new(Some(LogWriter::from_writer("X:\\gone.log", Box::new(Broken))));
        let got = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let events = EventSink::new(move |e| g.lock().unwrap().push(e));
        flush_frames(vec![Frame::data("rx", vec![1], None, None)], &log, &events);
        flush_frames(vec![Frame::data("rx", vec![2], None, None)], &log, &events);
        assert!(log.lock().unwrap().is_none());
        let got = got.lock().unwrap();
        let errors: Vec<&String> = got.iter().filter_map(|e| if let SessionEvent::Error { message } = e { Some(message) } else { None }).collect();
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("X:\\gone.log") && errors[0].contains("disk full"));
        // 첫 묶음에는 사건 줄이 붙는다
        let SessionEvent::Frames { frames } = &got[0] else { panic!() };
        assert_eq!(frames.last().unwrap().dir, "ev");
    }

    fn opts(format: LogFormat) -> LogOptions {
        LogOptions { format, ..LogOptions::default() }
    }

    fn rx(bytes: &[u8]) -> Frame {
        Frame { ts: 0, dir: "rx", bytes: bytes.to_vec(), check: Some(true), note: None, peer: None, pair: None }
    }

    #[test]
    fn line_formats() {
        let f = rx(b"OK\r\n");
        assert!(log_line_with(&f, &opts(LogFormat::Hex)).ends_with(" RX 4F 4B 0D 0A [OK]"));
        assert!(log_line_with(&f, &opts(LogFormat::Ascii)).ends_with(" RX OK<CR><LF> [OK]"));
        assert!(log_line_with(&f, &opts(LogFormat::HexAscii)).ends_with(" RX 4F 4B 0D 0A | OK<CR><LF> [OK]"));
        let csv = log_line_with(&f, &opts(LogFormat::Csv));
        assert!(csv.ends_with(",RX,4,4F 4B 0D 0A,OK<CR><LF>,OK,,"), "{csv}");
        let ko = LogOptions { format: LogFormat::Ascii, encoding: Encoding::Cp949, ..LogOptions::default() };
        assert!(log_line_with(&rx(&[0xC7, 0xD1]), &ko).ends_with(" RX 한 [OK]"));
        // 사건 줄은 형식과 상관없이 «EV 내용»
        let ev = Frame { ts: 0, dir: "ev", bytes: vec![], check: None, note: Some("SET baud 9600→115200".into()), peer: None, pair: None };
        assert!(log_line_with(&ev, &opts(LogFormat::Ascii)).ends_with(" EV SET baud 9600→115200"));
        assert!(log_line_with(&ev, &opts(LogFormat::Csv)).ends_with(",EV,,,,,SET baud 9600→115200,"));
    }

    #[test]
    fn csv_escapes_and_defuses_formulas() {
        assert_eq!(csv_cell("a,b"), "\"a,b\"");
        assert_eq!(csv_cell("say \"hi\""), "\"say \"\"hi\"\"\"");
        assert_eq!(csv_cell("=1+2"), "'=1+2");
        assert_eq!(csv_cell("-5,3"), "\"'-5,3\"");
        let f = Frame { ts: 0, dir: "tx", bytes: b"A,B".to_vec(), check: None, note: None, peer: Some("10.0.0.1:502".into()), pair: None };
        assert!(log_line_with(&f, &opts(LogFormat::Csv)).ends_with(",TX,3,41 2C 42,\"A,B\",,,10.0.0.1:502"));
    }

    #[test]
    fn part_names() {
        assert_eq!(part_path("C:\\log\\a.log", 2), "C:\\log\\a-002.log");
        assert_eq!(part_path("C:\\log.d\\a", 3), "C:\\log.d\\a-003");
        assert_eq!(part_path("/tmp/x.y.csv", 12), "/tmp/x.y-012.csv");
        assert_eq!(part_path(".hidden", 2), ".hidden-002");
    }

    #[test]
    fn day_names_and_families() {
        assert_eq!(day_path("C:\\log\\a.log", "20261030", 1), "C:\\log\\a-20261030.log");
        assert_eq!(day_path("C:\\log\\a.log", "20261030", 2), "C:\\log\\a-20261030-002.log");
        assert_eq!(day_path("/t/x", "20261031", 1), "/t/x-20261031");
        let auto = "portdock-plc-simulator-20261030-101500.log";
        assert!(same_log_family(auto, "portdock-plc-simulator-20261001-090000.log"));
        assert!(same_log_family(auto, "portdock-plc-simulator-20261001-090000-002.log"));
        assert!(same_log_family(auto, "portdock-plc-simulator-20261001-090000-20261002.log"));
        assert!(!same_log_family(auto, "portdock-plc-simulator-20261001-090000.csv"), "다른 확장자");
        assert!(!same_log_family(auto, "portdock-plc-simulator-old.log"), "숫자가 아닌 꼬리");
        assert!(!same_log_family(auto, "portdock-tcp-20261001-090000.log"), "다른 앱");
        assert!(same_log_family("data.log", "data-002.log"));
        assert!(!same_log_family("data.log", "data-important.log"));
        assert!(!same_log_family("data.log", "database.log"));
        assert!(!same_log_family("data.log", "data-.log"));
    }

    /// 오래된 같은 갈래 파일만 지운다 — 지금 파일·다른 이름·하위 폴더는 남는다
    #[test]
    fn keep_days_removes_only_old_family_files() {
        let dir = std::env::temp_dir().join(format!("pd-logclean-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("sub")).unwrap();
        for n in ["run.log", "run-002.log", "run-20261001.log", "run-notes.log", "other.log", "run.txt", "sub/run-003.log"] {
            std::fs::write(dir.join(n), b"x").unwrap();
        }
        let base = dir.join("run.log").to_string_lossy().into_owned();
        let cur = dir.join("run-20261001.log").to_string_lossy().into_owned();
        // 지금으로 보면 아무것도 오래되지 않았다
        assert!(remove_old_logs(&base, &cur, 3, SystemTime::now()).is_empty());
        // 10일 뒤로 보면: run.log·run-002.log 만(지금 파일 run-20261001.log 는 남김)
        let later = SystemTime::now() + Duration::from_secs(10 * 86_400);
        let mut gone: Vec<String> = remove_old_logs(&base, &cur, 3, later).iter().map(|p| std::path::Path::new(p).file_name().unwrap().to_string_lossy().into_owned()).collect();
        gone.sort();
        assert_eq!(gone, ["run-002.log", "run.log"]);
        for n in ["run-20261001.log", "run-notes.log", "other.log", "run.txt", "sub/run-003.log"] {
            assert!(dir.join(n).exists(), "{n}");
        }
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// 날짜가 바뀌면 «이름-날짜» 파일로, 같은 날 크기로 또 나누면 «-002»
    #[test]
    fn split_daily_names_by_date() {
        type Files = Arc<Mutex<Vec<String>>>;
        static OPENED: std::sync::OnceLock<Files> = std::sync::OnceLock::new();
        static DAY: Mutex<&str> = Mutex::new("20261030");
        let opened = OPENED.get_or_init(Default::default).clone();
        fn sink_open(path: &str) -> Result<(Box<dyn Write + Send>, u64), String> {
            OPENED.get().unwrap().lock().unwrap().push(path.to_string());
            Ok((Box::new(std::io::sink()), 0))
        }
        fn today() -> String {
            DAY.lock().unwrap().to_string()
        }
        let o = LogOptions { split_daily: true, split_mb: 1, ..LogOptions::default() };
        let mut lw = LogWriter::from_writer_with("D:\\t\\run.log", Box::new(std::io::sink()), o);
        lw.opener = sink_open;
        lw.today = today;
        lw.day = today();
        lw.write(&[rx(&[1, 2, 3])]).unwrap();
        assert!(opened.lock().unwrap().is_empty());
        *DAY.lock().unwrap() = "20261031";
        lw.write(&[rx(&[1, 2, 3])]).unwrap();
        lw.write(&[rx(&[0x55; 1_100_000])]).unwrap();
        lw.write(&[rx(&[1])]).unwrap();
        assert_eq!(*opened.lock().unwrap(), ["D:\\t\\run-20261031.log", "D:\\t\\run-20261031-002.log"]);
        assert_eq!(lw.path(), "D:\\t\\run-20261031-002.log");
    }

    /// 크기로 나누기 — 옛 파일에 «LOG NEXT», 새 파일에 «LOG PART 2», CSV 는 파일마다 머리줄
    #[test]
    fn split_by_size_rotates_with_header() {
        type Files = Arc<Mutex<Vec<(String, Arc<Mutex<Vec<u8>>>)>>>;
        static FILES: std::sync::OnceLock<Files> = std::sync::OnceLock::new();
        let files = FILES.get_or_init(Default::default).clone();
        struct Mem(Arc<Mutex<Vec<u8>>>);
        impl Write for Mem {
            fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
                self.0.lock().unwrap().extend_from_slice(b);
                Ok(b.len())
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        fn mem_open(path: &str) -> Result<(Box<dyn Write + Send>, u64), String> {
            let buf = Arc::new(Mutex::new(Vec::new()));
            FILES.get().unwrap().lock().unwrap().push((path.to_string(), buf.clone()));
            Ok((Box::new(Mem(buf)), 0))
        }
        let (first, _) = mem_open("D:\\t\\run.csv").unwrap();
        let o = LogOptions { format: LogFormat::Csv, split_mb: 1, ..LogOptions::default() };
        let mut lw = LogWriter::from_writer_with("D:\\t\\run.csv", first, o);
        lw.opener = mem_open;
        lw.start_file().unwrap();
        let big = rx(&[0x55; 200_000]);
        lw.write(&[big.clone(), big.clone()]).unwrap(); // 약 1.2MB — 아직 첫 파일(검사는 쓰기 전)
        lw.write(&[big]).unwrap();
        let files = files.lock().unwrap();
        assert_eq!(files.len(), 2, "rotated once");
        assert_eq!(files[1].0, "D:\\t\\run-002.csv");
        assert_eq!(lw.path(), "D:\\t\\run-002.csv");
        let a = String::from_utf8(files[0].1.lock().unwrap().clone()).unwrap();
        let b = String::from_utf8(files[1].1.lock().unwrap().clone()).unwrap();
        assert!(a.starts_with("\u{FEFF}ts,dir,"));
        assert!(a.contains("LOG NEXT D:\\t\\run-002.csv"));
        assert!(b.starts_with("\u{FEFF}ts,dir,"));
        assert!(b.contains("LOG PART 2 (prev D:\\t\\run.csv)"));
        assert_eq!(b.matches(",RX,200000,").count(), 1);
    }
}
