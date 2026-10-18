//! SCPI 계측기와 묻고 답하기 — LAN «raw socket»(보통 TCP 5025)과 시리얼(RS-232).
//! VISA 없이 순수 Rust 로 되는 것만 한다. VXI-11(RPC)·HiSLIP·USBTMC·GPIB 는 하지 않는다(도움말 «범위 밖»).
//!
//! - 보낼 때 줄 끝(LF·CR LF·CR)을 붙인다.
//! - 받을 때 글 응답은 줄 끝까지 읽는다. IEEE 488.2 «정해진 길이 블록»(`#NXXXX…`)은 길이 머리로 끝을 안다 —
//!   바이너리 속에 LF(0x0A)가 있어도 거기서 끊지 않는다. `#0…` (길이 모름)는 줄 끝까지.
//! - 응답 기다림(타임아웃)과 멈춤(다른 스레드에서 `cancel`)을 지킨다. 기다림 중 20ms 마다 깬다.
//! - 오류 큐 비우기: `SYST:ERR?` 를 0(No error)이 나올 때까지 되풀이한다.

use serde::{Deserialize, Serialize};
use std::io::{self, ErrorKind, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

/// 받는 쪽 한 번 기다림(이만큼마다 깨서 타임아웃·멈춤을 본다)
const POLL: Duration = Duration::from_millis(20);
/// 응답 하나의 최대 크기 — 화면 캡처 블록(수 MB)은 되고, 끝없이 쌓이지는 않게
pub const MAX_REPLY: usize = 64 * 1024 * 1024;

/// 줄 끝. 보낼 때 붙이고, 받을 때 CR 이면 CR 에서, 아니면 LF 에서 끊는다(LF 앞 CR 은 떼어 낸다)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Term {
    #[default]
    Lf,
    Crlf,
    Cr,
}

impl Term {
    pub fn bytes(self) -> &'static [u8] {
        match self {
            Self::Lf => b"\n",
            Self::Crlf => b"\r\n",
            Self::Cr => b"\r",
        }
    }

    /// 받은 응답이 끝나는 바이트
    fn end(self) -> u8 {
        if self == Self::Cr { b'\r' } else { b'\n' }
    }
}

/// 응답 몸통
#[derive(Debug, Clone, PartialEq)]
pub enum Body {
    /// 글 — 줄 끝은 뗐다
    Text(String),
    /// IEEE 488.2 블록 — `header` 는 «#41000» 같은 머리, `indefinite` 는 «#0»(길이 모름)
    Block { header: String, data: Vec<u8>, indefinite: bool },
}

/// 한 번 읽은 응답 — `raw` 는 받은 바이트 그대로(줄 끝 포함)
#[derive(Debug, Clone, PartialEq)]
pub struct Reply {
    pub raw: Vec<u8>,
    pub body: Body,
}

impl Reply {
    /// 글 응답이면 그 글, 블록이면 None
    pub fn text(&self) -> Option<&str> {
        match &self.body {
            Body::Text(s) => Some(s),
            Body::Block { .. } => None,
        }
    }
}

/// 버퍼 앞에서 응답 하나가 끝났으면 (몸통, 쓴 바이트 수). 아직 덜 왔으면 None.
/// 앞에 남은 빈 줄(지난 응답의 늦은 줄 끝)은 건너뛴다(쓴 바이트에 넣는다).
pub fn parse_reply(buf: &[u8], term: Term) -> Option<(Body, usize)> {
    let skip = buf.iter().take_while(|&&b| b == b'\r' || b == b'\n').count();
    let b = &buf[skip..];
    if b.is_empty() {
        return None;
    }
    if b[0] == b'#' {
        match parse_block(b, term) {
            Block::Done(body, used) => return Some((body, skip + used)),
            Block::Need => return None,
            Block::Text => {}
        }
    }
    let end = term.end();
    let i = b.iter().position(|&x| x == end)?;
    let mut line = &b[..i];
    if term != Term::Cr && line.last() == Some(&b'\r') {
        line = &line[..line.len() - 1];
    }
    Some((Body::Text(String::from_utf8_lossy(line).into_owned()), skip + i + 1))
}

enum Block {
    Done(Body, usize),
    Need,
    /// «#» 뒤가 블록 머리 모양이 아니다 — 글로 읽는다
    Text,
}

fn parse_block(b: &[u8], term: Term) -> Block {
    let Some(&nd) = b.get(1) else { return Block::Need };
    if !nd.is_ascii_digit() {
        return Block::Text;
    }
    let n = (nd - b'0') as usize;
    if n == 0 {
        // 길이 모름 — 줄 끝까지(IEEE 488.2 는 NL + EOI 인데 소켓·시리얼에는 EOI 가 없다)
        let end = term.end();
        let Some(i) = b[2..].iter().position(|&x| x == end) else { return Block::Need };
        let mut data = &b[2..2 + i];
        if term != Term::Cr && data.last() == Some(&b'\r') {
            data = &data[..data.len() - 1];
        }
        return Block::Done(Body::Block { header: "#0".into(), data: data.to_vec(), indefinite: true }, 2 + i + 1);
    }
    if b.len() < 2 + n {
        // 머리 숫자가 덜 왔다 — 온 만큼은 숫자여야 블록
        return if b[2..].iter().all(u8::is_ascii_digit) { Block::Need } else { Block::Text };
    }
    let digits = &b[2..2 + n];
    if !digits.iter().all(u8::is_ascii_digit) {
        return Block::Text;
    }
    let len: usize = std::str::from_utf8(digits).ok().and_then(|s| s.parse().ok()).unwrap_or(0);
    let start = 2 + n;
    if b.len() < start + len {
        return Block::Need;
    }
    let mut used = start + len;
    // 블록 뒤 줄 끝(있으면 함께 쓴다 — 아직 안 왔으면 Instrument 가 잠깐 더 기다려 삼킨다)
    let rest = &b[used..];
    if rest.starts_with(b"\r\n") {
        used += 2;
    } else if rest.first().is_some_and(|&x| x == b'\n' || x == b'\r') {
        used += 1;
    }
    let header = String::from_utf8_lossy(&b[..start]).into_owned();
    Block::Done(Body::Block { header, data: b[start..start + len].to_vec(), indefinite: false }, used)
}

/// 질의 명령인지 — `;` 로 이은 명령 가운데 하나라도 머리(빈칸 앞)가 `?` 로 끝나면.
/// 예: `*IDN?`, `MEAS:VOLT:DC? 10,0.001`, `*CLS;*OPC?`
pub fn is_query(cmd: &str) -> bool {
    cmd.split(';').any(|part| part.split_whitespace().next().is_some_and(|h| h.ends_with('?')))
}

/// `SYST:ERR?` 응답 풀이 — `-113,"Undefined header"` → (-113, «Undefined header»). 숫자가 아니면 None
pub fn parse_error(s: &str) -> Option<(i32, String)> {
    let s = s.trim();
    let (code, msg) = match s.split_once(',') {
        Some((c, m)) => (c, m.trim().trim_matches('"').to_string()),
        None => (s, String::new()),
    };
    let code = code.trim();
    code.strip_prefix('+').unwrap_or(code).parse().ok().map(|c| (c, msg))
}

/// 오류 종류 — 화면이 이것으로 «끊김» 을 가린다
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ErrKind {
    /// 응답 기다림 시간 초과(연결은 그대로)
    Timeout,
    /// 상대가 연결을 닫았거나 장치가 빠졌다(연결을 버린다)
    Closed,
    /// 그 밖의 입출력 오류(연결을 버린다)
    Io,
    /// 사용자가 멈췄다
    Cancelled,
    /// 연결돼 있지 않다
    NotConnected,
    /// 보낼 수 없는 입력(빈 명령 등)
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScpiError {
    pub kind: ErrKind,
    pub message: String,
    /// 시간 초과·멈춤 때 그때까지 받은 것(줄 끝이 오지 않은 응답) — 줄 끝 설정이 틀렸는지 보는 데 쓴다
    #[serde(skip_serializing_if = "Option::is_none")]
    pub partial: Option<String>,
}

impl ScpiError {
    pub fn new(kind: ErrKind, message: impl Into<String>) -> Self {
        Self { kind, message: message.into(), partial: None }
    }

    pub fn not_connected() -> Self {
        Self::new(ErrKind::NotConnected, crate::tr!("연결돼 있지 않습니다", "Not connected"))
    }

    /// 연결을 버려야 하는 오류인지
    pub fn fatal(&self) -> bool {
        matches!(self.kind, ErrKind::Closed | ErrKind::Io)
    }
}

impl std::fmt::Display for ScpiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

fn io_error(e: &io::Error) -> ScpiError {
    let closed = matches!(
        e.kind(),
        ErrorKind::BrokenPipe | ErrorKind::ConnectionReset | ErrorKind::ConnectionAborted | ErrorKind::NotConnected | ErrorKind::UnexpectedEof
    );
    if closed {
        ScpiError::new(ErrKind::Closed, format!("{} ({e})", crate::tr!("장비가 연결을 끊었습니다", "The instrument closed the connection")))
    } else {
        ScpiError::new(ErrKind::Io, crate::oserr::net(e))
    }
}

/// 주고받는 길 — TCP 소켓, 시리얼, 시험용 가짜
pub trait Port: Send {
    fn send(&mut self, bytes: &[u8]) -> io::Result<()>;
    /// 잠깐(수십 ms) 기다려 받은 것. Ok(None) = 아직 없음, Ok(Some(0)) = 상대가 닫음
    fn recv(&mut self, buf: &mut [u8]) -> io::Result<Option<usize>>;
}

fn quiet(e: &io::Error) -> bool {
    matches!(e.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut | ErrorKind::Interrupted)
}

struct TcpPort(TcpStream);

impl Port for TcpPort {
    fn send(&mut self, bytes: &[u8]) -> io::Result<()> {
        self.0.write_all(bytes)?;
        self.0.flush()
    }

    fn recv(&mut self, buf: &mut [u8]) -> io::Result<Option<usize>> {
        match self.0.read(buf) {
            Ok(n) => Ok(Some(n)),
            Err(e) if quiet(&e) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

struct SerialPortW(Box<dyn serialport::SerialPort>);

impl Port for SerialPortW {
    fn send(&mut self, bytes: &[u8]) -> io::Result<()> {
        // 윈도우 serialport 는 읽기·쓰기가 같은 짧은 timeout 을 쓴다 — 못 다 보낸 것은 이어 쓴다(느린 속도·흐름 제어)
        let deadline = Instant::now() + Duration::from_secs(10);
        let mut off = 0;
        while off < bytes.len() {
            match self.0.write(&bytes[off..]) {
                Ok(0) => return Err(io::Error::new(ErrorKind::WriteZero, "write returned 0")),
                Ok(n) => off += n,
                Err(e) if quiet(&e) && Instant::now() < deadline => {}
                Err(e) => return Err(e),
            }
        }
        self.0.flush()
    }

    fn recv(&mut self, buf: &mut [u8]) -> io::Result<Option<usize>> {
        match self.0.read(buf) {
            // 시리얼에는 «닫힘» 이 없다 — 0 은 아직 없음
            Ok(0) => Ok(None),
            Ok(n) => Ok(Some(n)),
            Err(e) if quiet(&e) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

/// 시리얼 설정(RS-232 계측기)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialOpts {
    pub port: String,
    pub baud: u32,
    #[serde(default = "eight")]
    pub data_bits: u8,
    /// "none" | "odd" | "even"
    #[serde(default)]
    pub parity: String,
    /// 1 | 2
    #[serde(default = "one")]
    pub stop_bits: u8,
    /// "none" | "hardware"(RTS/CTS) | "software"(XON/XOFF)
    #[serde(default)]
    pub flow: String,
}

fn eight() -> u8 {
    8
}

fn one() -> u8 {
    1
}

/// 열린 계측기 하나 — 한 번에 한 질의(호출하는 쪽이 Mutex 로 감싼다). 멈춤 깃발은 따로 꺼내 다른 스레드에서 세운다
pub struct Instrument {
    port: Box<dyn Port>,
    term: Term,
    cancel: Arc<AtomicBool>,
    /// 받았지만 아직 응답으로 쓰지 않은 바이트
    pending: Vec<u8>,
}

impl Instrument {
    pub fn new(port: Box<dyn Port>, term: Term) -> Self {
        Self { port, term, cancel: Arc::new(AtomicBool::new(false)), pending: Vec::new() }
    }

    /// LAN raw socket(보통 5025)으로 붙는다
    pub fn connect_tcp(host: &str, port: u16, timeout: Duration, term: Term) -> Result<Self, String> {
        let host = host.trim();
        if host.is_empty() {
            return Err(crate::tr!("장비 주소(IP)를 넣으세요", "Enter the instrument address (IP)").into());
        }
        let addrs: Vec<_> = (host, port)
            .to_socket_addrs()
            .map_err(|e| format!("{host}:{port}: {} ({e})", crate::tr!("주소를 찾지 못했습니다", "Could not resolve the address")))?
            .collect();
        let mut last = None;
        for a in &addrs {
            match TcpStream::connect_timeout(a, timeout) {
                Ok(s) => {
                    let _ = s.set_nodelay(true);
                    s.set_read_timeout(Some(POLL)).map_err(|e| e.to_string())?;
                    s.set_write_timeout(Some(Duration::from_secs(10))).map_err(|e| e.to_string())?;
                    return Ok(Self::new(Box::new(TcpPort(s)), term));
                }
                Err(e) => last = Some(e),
            }
        }
        Err(match last {
            Some(e) => format!("{host}:{port}: {}", crate::oserr::net(&e)),
            None => format!("{host}:{port}: {}", crate::tr!("주소를 찾지 못했습니다", "Could not resolve the address")),
        })
    }

    /// 시리얼(RS-232)로 연다. DTR 은 켠다(많은 계측기가 DTR 이 켜져야 보낸다)
    pub fn open_serial(o: &SerialOpts, term: Term) -> Result<Self, String> {
        use serialport::{DataBits, FlowControl, Parity, StopBits};
        let b = serialport::new(&o.port, o.baud)
            .data_bits(match o.data_bits {
                7 => DataBits::Seven,
                _ => DataBits::Eight,
            })
            .parity(match o.parity.as_str() {
                "odd" => Parity::Odd,
                "even" => Parity::Even,
                _ => Parity::None,
            })
            .stop_bits(if o.stop_bits >= 2 { StopBits::Two } else { StopBits::One })
            .flow_control(match o.flow.as_str() {
                "hardware" => FlowControl::Hardware,
                "software" => FlowControl::Software,
                _ => FlowControl::None,
            })
            .timeout(POLL);
        let mut p = b.open().map_err(|e| {
            let listed = crate::ports::list().iter().any(|x| x.name.eq_ignore_ascii_case(&o.port));
            format!("{}: {}", o.port, crate::oserr::serial_open(&e, listed))
        })?;
        let _ = p.write_data_terminal_ready(true);
        if o.flow != "hardware" {
            let _ = p.write_request_to_send(true);
        }
        Ok(Self::new(Box::new(SerialPortW(p)), term))
    }

    /// 다른 스레드에서 세우면 기다리던 읽기가 «멈춤» 으로 끝난다
    pub fn cancel_flag(&self) -> Arc<AtomicBool> {
        self.cancel.clone()
    }

    pub fn term(&self) -> Term {
        self.term
    }

    pub fn set_term(&mut self, term: Term) {
        self.term = term;
    }

    /// 명령 하나 보내기(줄 끝을 붙인다). 보낸 바이트를 돌려준다
    pub fn write(&mut self, cmd: &str) -> Result<Vec<u8>, ScpiError> {
        self.cancel.store(false, Ordering::SeqCst);
        let cmd = cmd.trim_end_matches(['\r', '\n']);
        if cmd.trim().is_empty() {
            return Err(ScpiError::new(ErrKind::Invalid, crate::tr!("보낼 명령이 비어 있습니다", "The command is empty")));
        }
        let mut out = cmd.as_bytes().to_vec();
        out.extend_from_slice(self.term.bytes());
        self.port.send(&out).map_err(|e| io_error(&e))?;
        Ok(out)
    }

    /// 응답 하나 읽기 — 글은 줄 끝까지, 블록은 길이만큼
    pub fn read(&mut self, timeout: Duration) -> Result<Reply, ScpiError> {
        self.cancel.store(false, Ordering::SeqCst);
        let start = Instant::now();
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            if let Some((body, used)) = parse_reply(&self.pending, self.term) {
                let mut raw: Vec<u8> = self.pending.drain(..used).collect();
                if matches!(body, Body::Block { indefinite: false, .. }) && !raw.ends_with(b"\n") && !raw.ends_with(b"\r") {
                    self.swallow_term(&mut raw, &mut buf);
                }
                return Ok(Reply { raw, body });
            }
            if self.cancel.swap(false, Ordering::SeqCst) {
                return Err(self.give_up(ErrKind::Cancelled, crate::tr!("멈췄습니다", "Stopped").into()));
            }
            if start.elapsed() >= timeout {
                let ms = timeout.as_millis();
                let msg = if self.pending.is_empty() {
                    format!("{} ({ms} ms)", crate::tr!("응답 없음 — 응답 기다림 시간을 넘었습니다", "No reply — the response timeout passed"))
                } else {
                    format!(
                        "{} ({ms} ms)",
                        crate::tr!("응답이 끝나지 않았습니다 — 줄 끝(LF·CR)이 오지 않음", "The reply did not end — no line ending (LF/CR) arrived")
                    )
                };
                return Err(self.give_up(ErrKind::Timeout, msg));
            }
            match self.port.recv(&mut buf) {
                Ok(Some(0)) => {
                    let msg = crate::tr!("장비가 연결을 끊었습니다", "The instrument closed the connection").to_string();
                    return Err(self.give_up(ErrKind::Closed, msg));
                }
                Ok(Some(n)) => {
                    self.pending.extend_from_slice(&buf[..n]);
                    if self.pending.len() > MAX_REPLY {
                        let msg = format!("{} (> {} MB)", crate::tr!("응답이 너무 큽니다", "The reply is too large"), MAX_REPLY / 1024 / 1024);
                        return Err(self.give_up(ErrKind::Io, msg));
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    self.pending.clear();
                    return Err(io_error(&e));
                }
            }
        }
    }

    /// 보내고 응답 하나 읽기 — 지난 응답의 남은 바이트는 먼저 버린다(돌려준다: 기록에 남기게).
    /// 걸린 시간은 다 보낸 때부터 응답이 끝난 때까지
    pub fn query(&mut self, cmd: &str, timeout: Duration) -> Result<Exchange, ScpiError> {
        let stale = self.drop_stale();
        let sent = self.write(cmd)?;
        let t0 = Instant::now();
        let reply = self.read(timeout)?;
        Ok(Exchange { stale, sent, reply, elapsed: t0.elapsed() })
    }

    /// 오류 큐 비우기 — `cmd`(보통 `SYST:ERR?`)를 0 이 나올 때까지(최대 `max` 번)
    pub fn drain_errors(&mut self, cmd: &str, timeout: Duration, max: usize) -> Result<Drain, ScpiError> {
        let mut out = Drain::default();
        for _ in 0..max.max(1) {
            let x = self.query(cmd, timeout)?;
            let parsed = x.reply.text().and_then(parse_error);
            let text = x.reply.text().unwrap_or("").to_string();
            out.exchanges.push(x);
            match parsed {
                Some((0, _)) => {
                    out.complete = true;
                    return Ok(out);
                }
                Some((code, message)) => out.errors.push(ErrEntry { code: Some(code), message, raw: text }),
                None => {
                    // 숫자로 시작하지 않는 답 — 오류 큐 명령이 아니다. 더 묻지 않는다
                    out.errors.push(ErrEntry { code: None, message: String::new(), raw: text });
                    return Ok(out);
                }
            }
        }
        Ok(out)
    }

    /// 쌓여 있던(늦게 온) 바이트를 버린다 — 한 번만 잠깐 본다
    fn drop_stale(&mut self) -> Vec<u8> {
        let mut out = std::mem::take(&mut self.pending);
        let mut buf = [0u8; 4096];
        if let Ok(Some(n)) = self.port.recv(&mut buf)
            && n > 0
        {
            out.extend_from_slice(&buf[..n]);
        }
        out
    }

    /// 정해진 길이 블록 뒤 줄 끝이 늦게 오면 잠깐(최대 60ms) 기다려 삼킨다. 다른 것이 오면 남겨 둔다
    fn swallow_term(&mut self, raw: &mut Vec<u8>, buf: &mut [u8]) {
        let until = Instant::now() + Duration::from_millis(60);
        while self.pending.is_empty() && Instant::now() < until {
            match self.port.recv(buf) {
                Ok(Some(n)) if n > 0 => self.pending.extend_from_slice(&buf[..n]),
                Ok(Some(_)) | Err(_) => break,
                Ok(None) => {}
            }
        }
        let k = if self.pending.starts_with(b"\r\n") {
            2
        } else if self.pending.first().is_some_and(|&x| x == b'\n' || x == b'\r') {
            1
        } else {
            0
        };
        raw.extend(self.pending.drain(..k));
    }

    /// 기다림을 그만둔다 — 그때까지 받은 것은 오류에 붙이고 버린다(다음 응답과 섞이지 않게)
    fn give_up(&mut self, kind: ErrKind, message: String) -> ScpiError {
        let got = std::mem::take(&mut self.pending);
        let partial = (!got.is_empty()).then(|| {
            let s = String::from_utf8_lossy(&got[..got.len().min(400)]).into_owned();
            if got.len() > 400 { format!("{s}…") } else { s }
        });
        ScpiError { kind, message, partial }
    }
}

/// 질의 한 번 — 버린 묵은 바이트, 보낸 바이트, 응답, 걸린 시간
#[derive(Debug, Clone)]
pub struct Exchange {
    pub stale: Vec<u8>,
    pub sent: Vec<u8>,
    pub reply: Reply,
    pub elapsed: Duration,
}

/// 오류 큐 한 줄
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrEntry {
    /// 숫자로 시작하지 않으면 None
    pub code: Option<i32>,
    pub message: String,
    pub raw: String,
}

/// 오류 큐 비우기 결과
#[derive(Debug, Clone, Default)]
pub struct Drain {
    pub errors: Vec<ErrEntry>,
    pub exchanges: Vec<Exchange>,
    /// 0(No error)까지 읽었는지 — false 면 최대 횟수에서 멈췄거나 모르는 답
    pub complete: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::BufRead;
    use std::net::TcpListener;
    use std::sync::Mutex;
    use std::sync::mpsc;
    use std::thread;

    fn text(b: &[u8], t: Term) -> Option<(String, usize)> {
        match parse_reply(b, t)? {
            (Body::Text(s), n) => Some((s, n)),
            (Body::Block { .. }, _) => panic!("block"),
        }
    }

    fn block(b: &[u8]) -> Option<(String, Vec<u8>, bool, usize)> {
        match parse_reply(b, Term::Lf)? {
            (Body::Block { header, data, indefinite }, n) => Some((header, data, indefinite, n)),
            (Body::Text(s), _) => panic!("text {s}"),
        }
    }

    #[test]
    fn text_line_endings() {
        assert_eq!(text(b"ACME,X1,123,1.0\n", Term::Lf), Some(("ACME,X1,123,1.0".into(), 16)));
        // CR LF 응답을 LF 로 받아도 CR 은 뗀다
        assert_eq!(text(b"+1.234E+00\r\nnext", Term::Lf), Some(("+1.234E+00".into(), 12)));
        assert_eq!(text(b"1.5\r", Term::Cr), Some(("1.5".into(), 4)));
        // CR 끝 모드에서 LF 는 끝이 아니다
        assert_eq!(text(b"1.5\n", Term::Cr), None);
        assert_eq!(text(b"1.5", Term::Lf), None);
        // 앞에 남은 늦은 줄 끝은 건너뛴다
        assert_eq!(text(b"\r\n\n0,\"No error\"\n", Term::Crlf), Some(("0,\"No error\"".into(), 16)));
        assert_eq!(parse_reply(b"\r\n", Term::Lf), None);
    }

    #[test]
    fn definite_block() {
        assert_eq!(block(b"#15hello\n"), Some(("#15".into(), b"hello".to_vec(), false, 9)));
        // 데이터 속 LF 에서 끊지 않는다
        assert_eq!(block(b"#14a\nbc\r\n"), Some(("#14".into(), b"a\nbc".to_vec(), false, 9)));
        // 줄 끝이 아직 안 왔어도 데이터가 다 오면 끝
        assert_eq!(block(b"#210ABCDEFGHIJ"), Some(("#210".into(), b"ABCDEFGHIJ".to_vec(), false, 14)));
        // 덜 옴
        assert_eq!(parse_reply(b"#", Term::Lf), None);
        assert_eq!(parse_reply(b"#2", Term::Lf), None);
        assert_eq!(parse_reply(b"#21", Term::Lf), None);
        assert_eq!(parse_reply(b"#210ABC", Term::Lf), None);
        // 길이 0
        assert_eq!(block(b"#10\n"), Some(("#10".into(), vec![], false, 4)));
    }

    #[test]
    fn indefinite_and_not_block() {
        assert_eq!(block(b"#0abc\r\n"), Some(("#0".into(), b"abc".to_vec(), true, 7)));
        assert_eq!(parse_reply(b"#0abc", Term::Lf), None);
        // 블록 머리가 아니면 글
        assert_eq!(text(b"#A1\n", Term::Lf), Some(("#A1".into(), 4)));
        assert_eq!(text(b"#2x5 \n", Term::Lf), Some(("#2x5 ".into(), 6)));
    }

    #[test]
    fn query_detection_and_errors() {
        assert!(is_query("*IDN?"));
        assert!(is_query("MEAS:VOLT:DC? 10,0.001"));
        assert!(is_query("*CLS;*OPC?"));
        assert!(!is_query("*RST"));
        assert!(!is_query("CONF:VOLT:DC 10"));
        assert!(!is_query("DISP:TEXT \"OK?\""));
        assert_eq!(parse_error("-113,\"Undefined header\""), Some((-113, "Undefined header".into())));
        assert_eq!(parse_error("+0,\"No error\""), Some((0, "No error".into())));
        assert_eq!(parse_error(" 0 "), Some((0, String::new())));
        assert_eq!(parse_error("ACME,X1"), None);
        assert_eq!(Term::Crlf.bytes(), b"\r\n");
    }

    /// 가짜 계측기 — 줄 하나 받으면 답한다. 받은 줄(줄 끝 포함)은 `seen` 에 남는다
    fn fake_instrument(seen: Arc<Mutex<Vec<Vec<u8>>>>) -> u16 {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        thread::spawn(move || {
            let (s, _) = l.accept().unwrap();
            let mut w = s.try_clone().unwrap();
            let mut r = std::io::BufReader::new(s);
            let mut errs = vec!["-113,\"Undefined header\"", "-222,\"Data out of range\""];
            loop {
                let mut line = Vec::new();
                if r.read_until(b'\n', &mut line).unwrap_or(0) == 0 {
                    return;
                }
                seen.lock().unwrap().push(line.clone());
                let cmd = String::from_utf8_lossy(&line).trim().to_string();
                match cmd.as_str() {
                    "*IDN?" => w.write_all(b"ACME,X1,123,1.0\n").unwrap(),
                    "DATA?" => {
                        // 바이너리 속 LF 와 두 번에 나눠 보내기
                        w.write_all(b"#210\x00\x01\n\x03").unwrap();
                        thread::sleep(Duration::from_millis(40));
                        w.write_all(b"\x04\x05\x06\x07\x08\x09").unwrap();
                        thread::sleep(Duration::from_millis(20));
                        w.write_all(b"\n").unwrap();
                    }
                    "SYST:ERR?" => {
                        let e = if errs.is_empty() { "+0,\"No error\"" } else { errs.remove(0) };
                        w.write_all(format!("{e}\n").as_bytes()).unwrap();
                    }
                    "NOEND?" => w.write_all(b"1.23").unwrap(),
                    "BYE" => return,
                    _ => {}
                }
            }
        });
        port
    }

    #[test]
    fn talks_to_fake_instrument() {
        let seen = Arc::new(Mutex::new(Vec::new()));
        let port = fake_instrument(seen.clone());
        let mut inst = Instrument::connect_tcp("127.0.0.1", port, Duration::from_secs(2), Term::Lf).unwrap();
        let x = inst.query("*IDN?", Duration::from_secs(2)).unwrap();
        assert_eq!(x.sent, b"*IDN?\n");
        assert_eq!(x.reply.text(), Some("ACME,X1,123,1.0"));
        assert_eq!(x.reply.raw, b"ACME,X1,123,1.0\n");

        // 블록 — 길이 머리로 끝을 알고, 늦게 온 줄 끝까지 삼킨다
        let x = inst.query("DATA?", Duration::from_secs(2)).unwrap();
        assert_eq!(x.reply.body, Body::Block { header: "#210".into(), data: vec![0, 1, 10, 3, 4, 5, 6, 7, 8, 9], indefinite: false });
        assert_eq!(x.reply.raw.last(), Some(&b'\n'));

        // 답 없는 명령은 쓰기만
        inst.write("*RST").unwrap();
        // 질의인데 답이 없으면 시간 초과(연결은 그대로)
        let e = inst.query("SLOW?", Duration::from_millis(120)).unwrap_err();
        assert_eq!((e.kind, e.partial.clone()), (ErrKind::Timeout, None));
        assert!(!e.fatal());
        // 줄 끝이 오지 않은 답 — 받은 것을 보여 준다
        let e = inst.query("NOEND?", Duration::from_millis(150)).unwrap_err();
        assert_eq!((e.kind, e.partial.as_deref()), (ErrKind::Timeout, Some("1.23")));

        // 오류 큐 — 0 이 나올 때까지
        let d = inst.drain_errors("SYST:ERR?", Duration::from_secs(2), 20).unwrap();
        assert!(d.complete);
        assert_eq!(d.errors.iter().map(|e| e.code).collect::<Vec<_>>(), vec![Some(-113), Some(-222)]);
        assert_eq!(d.errors[0].message, "Undefined header");
        assert_eq!(d.exchanges.len(), 3);

        // 빈 명령은 보내지 않는다
        assert_eq!(inst.write("  ").unwrap_err().kind, ErrKind::Invalid);
        // 상대가 닫으면 Closed
        inst.write("BYE").unwrap();
        let e = inst.query("*IDN?", Duration::from_secs(2)).unwrap_err();
        assert!(e.fatal(), "{e:?}");
        let got = seen.lock().unwrap().clone();
        assert!(got.contains(&b"*RST\n".to_vec()));
    }

    #[test]
    fn crlf_terminator_is_sent() {
        let seen = Arc::new(Mutex::new(Vec::new()));
        let port = fake_instrument(seen.clone());
        let mut inst = Instrument::connect_tcp("127.0.0.1", port, Duration::from_secs(2), Term::Crlf).unwrap();
        let x = inst.query("*IDN?", Duration::from_secs(2)).unwrap();
        assert_eq!(x.sent, b"*IDN?\r\n");
        assert_eq!(x.reply.text(), Some("ACME,X1,123,1.0"));
        assert_eq!(seen.lock().unwrap()[0], b"*IDN?\r\n");
    }

    #[test]
    fn refused_connection_is_reported() {
        // 비어 있는 포트 — 바로 거부된다
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        drop(l);
        assert!(Instrument::connect_tcp("127.0.0.1", port, Duration::from_millis(500), Term::Lf).is_err());
        assert!(Instrument::connect_tcp("  ", 5025, Duration::from_millis(500), Term::Lf).is_err());
    }

    /// 시험용 길 — 넣어 준 조각을 하나씩 내준다
    struct Script {
        chunks: mpsc::Receiver<Vec<u8>>,
    }

    impl Port for Script {
        fn send(&mut self, _: &[u8]) -> io::Result<()> {
            Ok(())
        }
        fn recv(&mut self, buf: &mut [u8]) -> io::Result<Option<usize>> {
            match self.chunks.recv_timeout(Duration::from_millis(10)) {
                Ok(c) => {
                    buf[..c.len()].copy_from_slice(&c);
                    Ok(Some(c.len()))
                }
                Err(_) => Ok(None),
            }
        }
    }

    #[test]
    fn cancel_and_stale_bytes() {
        let (tx, rx) = mpsc::channel();
        let mut inst = Instrument::new(Box::new(Script { chunks: rx }), Term::Lf);
        let flag = inst.cancel_flag();
        let h = thread::spawn(move || {
            thread::sleep(Duration::from_millis(80));
            flag.store(true, Ordering::SeqCst);
        });
        let t0 = Instant::now();
        let e = inst.read(Duration::from_secs(5)).unwrap_err();
        h.join().unwrap();
        assert_eq!(e.kind, ErrKind::Cancelled);
        assert!(t0.elapsed() < Duration::from_secs(2));
        // 지난 질의의 늦은 답은 다음 질의 전에 버린다
        tx.send(b"late\n".to_vec()).unwrap();
        tx.send(b"fresh".to_vec()).unwrap();
        let x = inst.query("X?", Duration::from_millis(50)).unwrap_err();
        // «late» 는 버렸고 «fresh» 는 줄 끝이 없어 시간 초과
        assert_eq!(x.partial.as_deref(), Some("fresh"));
        // 새 답은 보낸 뒤에 온다
        let late = thread::spawn(move || {
            thread::sleep(Duration::from_millis(60));
            tx.send(b"ok\n".to_vec()).unwrap();
        });
        let x = inst.query("Y?", Duration::from_millis(500)).unwrap();
        late.join().unwrap();
        assert_eq!(x.reply.text(), Some("ok"));
    }
}
