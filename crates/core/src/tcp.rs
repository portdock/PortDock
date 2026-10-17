//! TCP 세션 — 클라이언트(자동 재접속) 또는 서버(여러 접속). 연결마다 읽기 스레드와
//! 프레임 구분기를 따로 두고, 50ms 마다 한 번에 화면·로그로 내보낸다.

use crate::checksum::ChecksumKind;
use crate::event::{EventSink, Frame, LogWriter, Peer, SessionEvent, closed_reason, waiting_reason};
use crate::framer::{FrameMode, Framer};
use crate::serial::Responder;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{Shutdown, SocketAddr, TcpListener, TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TcpMode {
    Client,
    Server,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpConfig {
    pub mode: TcpMode,
    /// 클라이언트: 접속할 주소. 서버: 묶을 주소(0.0.0.0 = 모든 랜카드)
    pub host: String,
    pub port: u16,
    #[serde(default = "yes")]
    pub no_delay: bool,
    #[serde(default = "yes")]
    pub auto_reconnect: bool,
    #[serde(default = "default_reconnect")]
    pub reconnect_ms: u64,
    /// 서버: 받은 것을 그대로 돌려보냄
    #[serde(default)]
    pub echo: bool,
}

fn yes() -> bool {
    true
}
fn default_reconnect() -> u64 {
    2_000
}

struct Conn {
    addr: String,
    writer: Mutex<TcpStream>,
    framer: Mutex<Framer>,
}

struct Shared {
    events: EventSink,
    conns: Mutex<BTreeMap<u64, Arc<Conn>>>,
    next_id: AtomicU64,
    mode: Mutex<FrameMode>,
    rx_check: Mutex<Option<ChecksumKind>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<LogWriter>>,
    responder: Mutex<Option<Responder>>,
    echo: AtomicBool,
    /// 에코는 서버에서만 — 클라이언트가 에코하면 상대 서버와 핑퐁이 되기 쉽다
    server: bool,
    /// 에코 횟수(1초 창) — 상대도 에코하면 끝없이 주고받으므로 상한을 넘으면 끈다
    echo_rate: Mutex<(Instant, u32)>,
    /// 응답기가 마지막으로 보낸 것과 시각 — 그대로 되돌아오면 다시 답하지 않는다
    last_reply: Mutex<Option<(Vec<u8>, Instant)>>,
    /// 서버의 연결별 읽기 스레드 — 멈출 때 끝까지 기다려 마지막 기록을 남긴다
    conn_threads: Mutex<Vec<JoinHandle<()>>>,
    stop: AtomicBool,
}

/// 서버가 받는 최대 접속 수 — 넘으면 거절하고 기록
pub const MAX_CONNS: usize = 64;
/// 초당 에코 상한
const ECHO_LIMIT: u32 = 200;

pub struct TcpSession {
    shared: Arc<Shared>,
    threads: Vec<JoinHandle<()>>,
    local: Option<SocketAddr>,
}

const BATCH: Duration = Duration::from_millis(50);

/// 이름 → 주소들. IPv4 를 앞에 둔다 — 윈도우에서 localhost 는 ::1 이 먼저 나오는데
/// 장비·서버는 대개 IPv4 에만 묶여 있다
pub(crate) fn resolve_all(host: &str, port: u16) -> Result<Vec<SocketAddr>, String> {
    let mut v: Vec<SocketAddr> = (host, port).to_socket_addrs().map_err(|e| format!("{host}:{port}: {e}"))?.collect();
    v.sort_by_key(|a| a.is_ipv6()); // 안정 정렬 — 같은 종류 안의 순서는 그대로
    if v.is_empty() {
        return Err(crate::tr!(format!("{host}:{port}: 주소를 찾지 못했습니다"), format!("{host}:{port}: address not found")));
    }
    Ok(v)
}

pub(crate) fn resolve(host: &str, port: u16) -> Result<SocketAddr, String> {
    Ok(resolve_all(host, port)?[0])
}

/// 죽은 상대(케이블 뽑힘·전원 꺼짐)를 몇 초 안에 알아채도록 keepalive 를 짧게
const KEEPALIVE_TIME: Duration = Duration::from_secs(5);
const KEEPALIVE_INTERVAL: Duration = Duration::from_secs(1);

fn keepalive(stream: &TcpStream) -> std::io::Result<()> {
    let ka = socket2::TcpKeepalive::new().with_time(KEEPALIVE_TIME).with_interval(KEEPALIVE_INTERVAL);
    socket2::SockRef::from(stream).set_tcp_keepalive(&ka)
}

/// 주소를 차례로 시도해 처음 붙는 것. 모두 실패하면 마지막 오류
fn connect_any(addrs: &[SocketAddr], target: &str) -> Result<TcpStream, String> {
    let mut last = String::new();
    for a in addrs {
        match TcpStream::connect_timeout(a, Duration::from_secs(3)) {
            Ok(s) => return Ok(s),
            Err(e) => last = format!("{target}: {}", crate::oserr::net(&e)),
        }
    }
    Err(last)
}

impl Shared {
    fn note(&self, text: String) {
        self.pending.lock().unwrap().push(Frame::event(text));
    }

    fn status(&self, state: &'static str, port: &str, message: Option<String>) {
        self.events.send(SessionEvent::Status { state, port: port.to_string(), message });
    }

    fn peers(&self) {
        let peers = self.conns.lock().unwrap().iter().map(|(id, c)| Peer { id: *id, addr: c.addr.clone() }).collect();
        self.events.send(SessionEvent::Peers { peers });
    }

    fn flush(&self) {
        let frames = std::mem::take(&mut *self.pending.lock().unwrap());
        crate::event::flush_frames(frames, &self.log, &self.events);
    }

    fn add(&self, stream: TcpStream, no_delay: bool) -> Option<(u64, Arc<Conn>, TcpStream)> {
        let addr = stream.peer_addr().map(|a| a.to_string()).unwrap_or_else(|_| "?".into());
        let _ = stream.set_nodelay(no_delay);
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
        if let Err(e) = keepalive(&stream) {
            self.note(format!("KEEPALIVE {e}"));
        }
        let reader = stream.try_clone().ok()?;
        let _ = reader.set_read_timeout(Some(Duration::from_millis(20)));
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let conn = Arc::new(Conn {
            addr,
            writer: Mutex::new(stream),
            framer: Mutex::new(Framer::new(self.mode.lock().unwrap().clone())),
        });
        self.conns.lock().unwrap().insert(id, conn.clone());
        self.peers();
        Some((id, conn, reader))
    }

    fn push_rx(self: &Arc<Self>, conn: &Arc<Conn>, frames: Vec<crate::framer::Cut>) {
        if frames.is_empty() {
            return;
        }
        let check = *self.rx_check.lock().unwrap();
        let term = conn.framer.lock().unwrap().terminator().to_vec();
        for (_, bytes) in frames {
            let c = check.and_then(|k| k.verify_before(&bytes, &term));
            // 방금 우리가 보낸 응답이 그대로 돌아온 것이면(상대가 에코) 다시 답하지 않는다
            let looped = {
                let mut lr = self.last_reply.lock().unwrap();
                let hit = lr.as_ref().is_some_and(|(b, t)| *b == bytes && t.elapsed() < Duration::from_millis(500));
                if hit {
                    *lr = None;
                }
                hit
            };
            let mut reply: Option<(Vec<u8>, u64, Option<String>)> = None;
            if !looped && let Some(r) = self.responder.lock().unwrap().as_mut() {
                let out = r(&bytes);
                reply = Some((out.bytes.unwrap_or_default(), out.delay_ms, out.note));
            }
            self.pending.lock().unwrap().push(Frame::data("rx", bytes.clone(), c, Some(conn.addr.clone())));
            if self.server && self.echo.load(Ordering::SeqCst) && self.echo_allowed() {
                self.write_to(conn, &bytes);
            }
            if let Some((b, delay, note)) = reply {
                if let Some(n) = note {
                    self.note(n);
                }
                if !b.is_empty() {
                    *self.last_reply.lock().unwrap() = Some((b.clone(), Instant::now() + Duration::from_millis(delay)));
                    if delay == 0 {
                        self.write_to(conn, &b);
                    } else {
                        // 지연 응답은 따로 — 읽기 스레드는 바로 다음 수신으로 돌아간다
                        let (s, c) = (self.clone(), conn.clone());
                        std::thread::spawn(move || {
                            std::thread::sleep(Duration::from_millis(delay));
                            if !s.stop.load(Ordering::SeqCst) {
                                s.write_to(&c, &b);
                            }
                        });
                    }
                }
            }
        }
    }

    /// 1초에 ECHO_LIMIT 번을 넘으면 에코를 끈다(상대도 에코하는 핑퐁 방지)
    fn echo_allowed(&self) -> bool {
        let mut r = self.echo_rate.lock().unwrap();
        if r.0.elapsed() >= Duration::from_secs(1) {
            *r = (Instant::now(), 0);
        }
        r.1 += 1;
        if r.1 > ECHO_LIMIT {
            drop(r);
            self.echo.store(false, Ordering::SeqCst);
            self.note(crate::tr!(format!("ECHO OFF — 1초에 {ECHO_LIMIT}번을 넘었습니다(상대도 에코 중인지 확인)"), format!("ECHO OFF — more than {ECHO_LIMIT} per second (is the peer echoing too?)")));
            self.events.send(SessionEvent::Error { message: crate::tr!(format!("에코를 껐습니다: 1초에 {ECHO_LIMIT}번 초과"), format!("Echo turned off: over {ECHO_LIMIT} per second")) });
            return false;
        }
        true
    }

    /// 쓰기에 실패하면(2초 시간 초과 포함) 그 연결은 상태를 믿을 수 없으므로 닫는다
    fn write_to(&self, conn: &Conn, bytes: &[u8]) -> bool {
        let res = conn.writer.lock().unwrap().write_all(bytes);
        match res {
            Ok(()) => {
                self.pending.lock().unwrap().push(Frame::data("tx", bytes.to_vec(), None, Some(conn.addr.clone())));
                true
            }
            Err(e) => {
                self.note(crate::tr!(format!("SEND FAIL {} ({e}) — 연결을 닫습니다", conn.addr), format!("SEND FAIL {} ({e}) — closing the connection", conn.addr)));
                let _ = conn.writer.lock().unwrap().shutdown(Shutdown::Both);
                false
            }
        }
    }

    /// 연결 하나를 끝까지 읽는다. 끝난 이유를 돌려준다.
    fn read_conn(self: &Arc<Self>, id: u64, conn: Arc<Conn>, mut reader: TcpStream) -> String {
        let mut buf = [0u8; 8192];
        let reason = loop {
            if self.stop.load(Ordering::SeqCst) {
                break crate::tr!("닫음", "closed").to_string();
            }
            let user_closed = || !self.conns.lock().unwrap().contains_key(&id);
            match reader.read(&mut buf) {
                // 사용자가 «끊기» 를 눌러 우리가 닫은 것인지 먼저 본다
                Ok(0) if user_closed() => break crate::tr!("사용자가 끊음", "disconnected by user").to_string(),
                Ok(0) => break crate::tr!("상대가 끊음", "closed by peer").to_string(),
                Err(_) if user_closed() => break crate::tr!("사용자가 끊음", "disconnected by user").to_string(),
                Ok(n) => {
                    let frames = conn.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                    self.push_rx(&conn, frames);
                }
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                Err(e) => break crate::oserr::net(&e),
            }
            let tail = conn.framer.lock().unwrap().poll(Instant::now());
            if let Some(f) = tail {
                self.push_rx(&conn, vec![f]);
            }
            // 이 연결이 목록에서 빠졌으면(사용자가 끊음) 그만
            if !self.conns.lock().unwrap().contains_key(&id) {
                break crate::tr!("사용자가 끊음", "disconnected by user").to_string();
            }
        };
        if let Some(f) = conn.framer.lock().unwrap().poll(Instant::now() + Duration::from_secs(3600)) {
            self.push_rx(&conn, vec![f]);
        }
        self.conns.lock().unwrap().remove(&id);
        let _ = reader.shutdown(Shutdown::Both);
        self.note(format!("CLOSE {} ({reason})", conn.addr));
        self.peers();
        reason
    }
}

/// 버려지기만 해도 스레드가 멈추게(보관함에서 지워진 세션 등). `stop` 은 끝까지 기다린다.
impl Drop for TcpSession {
    fn drop(&mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
    }
}

impl TcpSession {
    pub fn start(
        cfg: TcpConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        responder: Option<Responder>,
        events: EventSink,
    ) -> Result<Self, String> {
        if cfg.mode == TcpMode::Client && (cfg.host.trim().is_empty() || cfg.port == 0) {
            return Err(crate::tr!("접속할 주소와 포트(1~65535)를 넣어 주세요", "Enter the host and port (1–65535) to connect to").into());
        }
        let shared = Arc::new(Shared {
            events,
            conns: Mutex::new(BTreeMap::new()),
            next_id: AtomicU64::new(1),
            mode: Mutex::new(mode),
            rx_check: Mutex::new(rx_check),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            responder: Mutex::new(responder),
            echo: AtomicBool::new(cfg.echo && cfg.mode == TcpMode::Server),
            server: cfg.mode == TcpMode::Server,
            echo_rate: Mutex::new((Instant::now(), 0)),
            last_reply: Mutex::new(None),
            conn_threads: Mutex::new(Vec::new()),
            stop: AtomicBool::new(false),
        });
        let mut threads = Vec::new();

        // 묶음 전송
        let s = shared.clone();
        threads.push(std::thread::spawn(move || {
            while !s.stop.load(Ordering::SeqCst) {
                std::thread::sleep(BATCH);
                s.flush();
            }
            s.flush();
        }));

        let mut local = None;
        match cfg.mode {
            TcpMode::Server => {
                let addr = resolve(&cfg.host, cfg.port)?;
                let listener = TcpListener::bind(addr).map_err(|e| format!("{addr}: {}", crate::oserr::net(&e)))?;
                listener.set_nonblocking(true).map_err(|e| e.to_string())?;
                let bound = listener.local_addr().map_err(|e| e.to_string())?;
                local = Some(bound);
                shared.note(format!("LISTEN {bound}"));
                shared.status("listening", &bound.to_string(), None);
                let s = shared.clone();
                let no_delay = cfg.no_delay;
                threads.push(std::thread::spawn(move || {
                    while !s.stop.load(Ordering::SeqCst) {
                        match listener.accept() {
                            Ok((stream, from)) => {
                                if s.conns.lock().unwrap().len() >= MAX_CONNS {
                                    s.note(crate::tr!(format!("REJECT {from} — 최대 접속 수 {MAX_CONNS}"), format!("REJECT {from} — max {MAX_CONNS} connections")));
                                    let _ = stream.shutdown(Shutdown::Both);
                                    continue;
                                }
                                let _ = stream.set_nonblocking(false);
                                if let Some((id, conn, reader)) = s.add(stream, no_delay) {
                                    s.note(format!("ACCEPT {}", conn.addr));
                                    let s2 = s.clone();
                                    let h = std::thread::spawn(move || {
                                        s2.read_conn(id, conn, reader);
                                    });
                                    let mut ts = s.conn_threads.lock().unwrap();
                                    ts.retain(|h| !h.is_finished());
                                    ts.push(h);
                                }
                            }
                            Err(e) if e.kind() == ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(20)),
                            Err(e) => {
                                s.note(format!("ACCEPT ERROR {e}"));
                                std::thread::sleep(Duration::from_millis(200));
                            }
                        }
                    }
                    s.note("STOP LISTEN".into());
                    s.status("closed", "", None);
                }));
            }
            TcpMode::Client => {
                let target = format!("{}:{}", cfg.host, cfg.port);
                let s = shared.clone();
                let c = cfg.clone();
                threads.push(std::thread::spawn(move || client_loop(s, c, target)));
            }
        }
        Ok(Self { shared, threads, local })
    }

    /// 서버가 실제로 묶인 주소(포트 0 으로 열었을 때 확인용)
    pub fn local_addr(&self) -> Option<SocketAddr> {
        self.local
    }

    pub fn set_framing(&self, mode: FrameMode, rx_check: Option<ChecksumKind>) {
        *self.shared.mode.lock().unwrap() = mode.clone();
        for c in self.shared.conns.lock().unwrap().values() {
            c.framer.lock().unwrap().set_mode(mode.clone());
        }
        *self.shared.rx_check.lock().unwrap() = rx_check;
    }

    pub fn set_echo(&self, on: bool) {
        let on = on && self.shared.server;
        if self.shared.echo.swap(on, Ordering::SeqCst) != on {
            self.shared.note(format!("ECHO {}", if on { "ON" } else { "OFF" }));
        }
    }

    pub fn set_responder(&self, r: Option<Responder>) {
        *self.shared.responder.lock().unwrap() = r;
    }

    /// target 이 None 이면 붙어 있는 모두에게. (보낸 연결 수, 대상 연결 수) — 실패한 연결은
    /// `write_to` 가 «SEND FAIL» 을 한 번 남기고 닫는다
    pub fn send(&self, target: Option<u64>, bytes: &[u8]) -> Result<(usize, usize), String> {
        let conns: Vec<Arc<Conn>> = {
            let map = self.shared.conns.lock().unwrap();
            match target {
                Some(id) => map.get(&id).cloned().into_iter().collect(),
                None => map.values().cloned().collect(),
            }
        };
        if conns.is_empty() {
            return Err(crate::tr!("연결된 상대가 없습니다", "No peer is connected").into());
        }
        let total = conns.len();
        let sent = conns.iter().filter(|c| self.shared.write_to(c, bytes)).count();
        Ok((sent, total))
    }

    /// 서버: 특정 상대 끊기
    pub fn kick(&self, id: u64) {
        let c = self.shared.conns.lock().unwrap().remove(&id);
        if let Some(c) = c {
            let _ = c.writer.lock().unwrap().shutdown(Shutdown::Both);
        }
    }

    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        *self.shared.log.lock().unwrap() = path.as_deref().map(LogWriter::open).transpose()?;
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        let ids: Vec<u64> = self.shared.conns.lock().unwrap().keys().copied().collect();
        for id in ids {
            self.kick(id);
        }
        for t in self.threads.drain(..) {
            let _ = t.join();
        }
        let conn_threads = std::mem::take(&mut *self.shared.conn_threads.lock().unwrap());
        for t in conn_threads {
            let _ = t.join();
        }
        self.shared.flush();
    }
}

fn client_loop(s: Arc<Shared>, cfg: TcpConfig, target: String) {
    // 끊긴·실패한 이유 — 다음 상태(재접속 대기·닫힘) 문구에 이어 붙여 덮어쓰지 않는다
    let mut last: Option<String> = None;
    loop {
        if s.stop.load(Ordering::SeqCst) {
            break;
        }
        let attempt = resolve_all(&cfg.host, cfg.port).and_then(|a| connect_any(&a, &target));
        match attempt {
            Ok(stream) => {
                if let Some((id, conn, reader)) = s.add(stream, cfg.no_delay) {
                    s.note(format!("CONNECT {}", conn.addr));
                    s.status("connected", &conn.addr, None);
                    let reason = s.read_conn(id, conn, reader);
                    s.status("disconnected", &target, Some(reason.clone()));
                    last = Some(reason);
                }
            }
            Err(e) => {
                s.note(format!("CONNECT FAIL {e}"));
                s.status("disconnected", &target, Some(e.clone()));
                last = Some(e);
            }
        }
        if !cfg.auto_reconnect || s.stop.load(Ordering::SeqCst) {
            break;
        }
        s.status("reconnecting", &target, last.as_deref().map(waiting_reason));
        let until = Instant::now() + Duration::from_millis(cfg.reconnect_ms.max(200));
        while Instant::now() < until && !s.stop.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(50));
        }
    }
    // 사용자가 멈춘 것이면 이유를 붙이지 않는다
    let msg = if s.stop.load(Ordering::SeqCst) { None } else { last.as_deref().map(closed_reason) };
    s.status("closed", &target, msg);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    fn sink() -> (EventSink, mpsc::Receiver<SessionEvent>) {
        let (tx, rx) = mpsc::channel();
        let tx = Mutex::new(tx);
        (EventSink::new(move |e| drop(tx.lock().unwrap().send(e))), rx)
    }

    fn wait_frames(rx: &mpsc::Receiver<SessionEvent>, dir: &str, want: usize) -> Vec<Frame> {
        let mut got = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(5);
        while got.len() < want && Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = rx.recv_timeout(Duration::from_millis(100)) {
                got.extend(frames.into_iter().filter(|f| f.dir == dir));
            }
        }
        got
    }

    fn cfg(mode: TcpMode, port: u16) -> TcpConfig {
        TcpConfig { mode, host: "127.0.0.1".into(), port, no_delay: true, auto_reconnect: false, reconnect_ms: 200, echo: false }
    }

    #[test]
    fn client_and_server_talk_with_terminator_framing() {
        let (ssink, srx) = sink();
        let term = FrameMode::Terminator { bytes: b"\r\n".to_vec(), gap_ms: 500 };
        let server = TcpSession::start(cfg(TcpMode::Server, 0), term.clone(), None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();

        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, port), term, None, None, csink).unwrap();
        // 접속될 때까지
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"HELLO\r\nWOR").unwrap();
        client.send(None, b"LD\r\n").unwrap();
        let got = wait_frames(&srx, "rx", 2);
        assert_eq!(got.iter().map(|f| f.bytes.clone()).collect::<Vec<_>>(), vec![b"HELLO\r\n".to_vec(), b"WORLD\r\n".to_vec()]);
        assert!(got[0].peer.as_deref().unwrap().starts_with("127.0.0.1:"));

        // 서버 → 모든 클라이언트
        assert_eq!(server.send(None, b"OK\r\n").unwrap(), (1, 1));
        let back = wait_frames(&crx, "rx", 1);
        assert_eq!(back[0].bytes, b"OK\r\n".to_vec());
        client.stop();
        server.stop();
    }

    #[test]
    fn server_echo() {
        let (ssink, _srx) = sink();
        let gap = FrameMode::Gap { gap_ms: 20 };
        let server = TcpSession::start(TcpConfig { echo: true, ..cfg(TcpMode::Server, 0) }, gap.clone(), None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let mut raw = TcpStream::connect(("127.0.0.1", port)).unwrap();
        raw.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        raw.write_all(&[1, 2, 3]).unwrap();
        let mut buf = [0u8; 3];
        raw.read_exact(&mut buf).unwrap();
        assert_eq!(buf, [1, 2, 3]);
        server.stop();
    }

    #[test]
    fn client_requires_host_and_port() {
        let (s, _) = sink();
        assert!(TcpSession::start(cfg(TcpMode::Client, 0), FrameMode::default(), None, None, s).is_err());
    }

    #[test]
    fn client_reports_refused() {
        // 아무도 듣지 않는 포트
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, free), FrameMode::default(), None, None, csink).unwrap();
        let mut saw = false;
        let deadline = Instant::now() + Duration::from_secs(5);
        while !saw && Instant::now() < deadline {
            if let Ok(SessionEvent::Status { state, .. }) = crx.recv_timeout(Duration::from_millis(100)) {
                saw = state == "disconnected";
            }
        }
        assert!(saw);
        client.stop();
    }

    #[test]
    fn reconnecting_keeps_last_failure_reason() {
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (csink, crx) = sink();
        let c = TcpConfig { auto_reconnect: true, ..cfg(TcpMode::Client, free) };
        let client = TcpSession::start(c, FrameMode::default(), None, None, csink).unwrap();
        let mut msg = None;
        let deadline = Instant::now() + Duration::from_secs(8);
        while msg.is_none() && Instant::now() < deadline {
            if let Ok(SessionEvent::Status { state: "reconnecting", message, .. }) = crx.recv_timeout(Duration::from_millis(100)) {
                msg = Some(message);
            }
        }
        let m = msg.expect("reconnecting").expect("message");
        assert!(m.starts_with("재접속 대기 · 마지막 실패:"), "{m}");
        assert!(m.contains("연결 거부") || m.contains("응답 없음"), "{m}");
        client.stop();
    }

    #[test]
    fn localhost_prefers_ipv4() {
        let v = resolve_all("localhost", 80).unwrap();
        if v.iter().any(|a| a.is_ipv4()) {
            assert!(v[0].is_ipv4(), "{v:?}");
        }
    }

    #[test]
    fn client_reaches_ipv4_only_server_by_name() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 20 }, None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let (csink, _crx) = sink();
        let client = TcpSession::start(TcpConfig { host: "localhost".into(), ..cfg(TcpMode::Client, port) }, FrameMode::Gap { gap_ms: 20 }, None, None, csink).unwrap();
        let deadline = Instant::now() + Duration::from_secs(8);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"hi").unwrap();
        assert_eq!(wait_frames(&srx, "rx", 1)[0].bytes, b"hi".to_vec());
        client.stop();
        server.stop();
    }

    fn rule(pat: &str, reply: &str) -> crate::autoreply::Rule {
        use crate::codec::{SendSpec, TextMode};
        crate::autoreply::Rule::compile(&crate::autoreply::RuleSpec {
            name: pat.into(),
            enabled: true,
            pattern: pat.into(),
            pattern_mode: TextMode::Ascii,
            kind: crate::autoreply::MatchKind::Exact,
            reply: SendSpec { text: reply.into(), mode: TextMode::Ascii, checksum: None, suffix: String::new() },
            delay_ms: 0,
        })
        .unwrap()
    }

    fn ping_responder() -> Responder {
        let rules = Arc::new(Mutex::new(vec![rule("PING", "PING")]));
        crate::autoreply::responder(rules, Arc::new(Mutex::new(BTreeMap::new())))
    }

    /// 응답 = 요청(PING→PING) 규칙을 가진 둘이 마주 봐도 한 바퀴에서 멈춘다
    #[test]
    fn reply_equal_to_request_does_not_loop() {
        let gap = FrameMode::Gap { gap_ms: 20 };
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), gap.clone(), None, Some(ping_responder()), ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, port), gap, None, Some(ping_responder()), csink).unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"PING").unwrap();
        std::thread::sleep(Duration::from_millis(1_000));
        let count = |rx: &mpsc::Receiver<SessionEvent>| {
            rx.try_iter().filter_map(|e| if let SessionEvent::Frames { frames } = e { Some(frames) } else { None }).flatten().filter(|f| f.dir == "rx").count()
        };
        // 서버: PING(보냄) + PING(클라이언트의 답, 되돌아온 것이라 무시) · 클라이언트: 서버의 답 하나
        let (s, c) = (count(&srx), count(&crx));
        assert!(s >= 1 && c >= 1, "server {s} client {c}");
        assert!(s + c <= 3, "server {s} client {c}");
        client.stop();
        server.stop();
    }
}
