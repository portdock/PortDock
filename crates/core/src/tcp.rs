//! TCP 세션 — 클라이언트(자동 재접속) 또는 서버(여러 접속). 연결마다 읽기 스레드와
//! 프레임 구분기를 따로 두고, 50ms 마다 한 번에 화면·로그로 내보낸다.

use crate::checksum::ChecksumKind;
use crate::event::{EventSink, Frame, Peer, SessionEvent, log_line};
use crate::framer::{FrameMode, Framer};
use crate::serial::Responder;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufWriter, ErrorKind, Read, Write};
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
    log: Mutex<Option<BufWriter<File>>>,
    responder: Mutex<Option<Responder>>,
    echo: AtomicBool,
    stop: AtomicBool,
}

pub struct TcpSession {
    shared: Arc<Shared>,
    threads: Vec<JoinHandle<()>>,
    local: Option<SocketAddr>,
}

const BATCH: Duration = Duration::from_millis(50);

fn resolve(host: &str, port: u16) -> Result<SocketAddr, String> {
    (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("{host}:{port}: {e}"))?
        .next()
        .ok_or_else(|| format!("{host}:{port}: 주소를 찾지 못했습니다"))
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
        if frames.is_empty() {
            return;
        }
        if let Some(log) = self.log.lock().unwrap().as_mut() {
            for f in &frames {
                let _ = writeln!(log, "{}", log_line(f));
            }
            let _ = log.flush();
        }
        self.events.send(SessionEvent::Frames { frames });
    }

    fn add(&self, stream: TcpStream, no_delay: bool) -> Option<(u64, Arc<Conn>, TcpStream)> {
        let addr = stream.peer_addr().map(|a| a.to_string()).unwrap_or_else(|_| "?".into());
        let _ = stream.set_nodelay(no_delay);
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
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

    fn push_rx(&self, conn: &Conn, frames: Vec<crate::framer::Cut>) {
        if frames.is_empty() {
            return;
        }
        let check = *self.rx_check.lock().unwrap();
        let echo = self.echo.load(Ordering::SeqCst);
        for (_, bytes) in frames {
            let c = check.and_then(|k| k.verify(&bytes));
            let mut reply: Option<(Vec<u8>, u64, Option<String>)> = None;
            if let Some(r) = self.responder.lock().unwrap().as_mut() {
                let out = r(&bytes);
                reply = Some((out.bytes.unwrap_or_default(), out.delay_ms, out.note));
            }
            self.pending.lock().unwrap().push(Frame::data("rx", bytes.clone(), c, Some(conn.addr.clone())));
            if echo {
                self.write_to(conn, &bytes);
            }
            if let Some((b, delay, note)) = reply {
                if let Some(n) = note {
                    self.note(n);
                }
                if !b.is_empty() {
                    if delay > 0 {
                        std::thread::sleep(Duration::from_millis(delay));
                    }
                    self.write_to(conn, &b);
                }
            }
        }
    }

    fn write_to(&self, conn: &Conn, bytes: &[u8]) -> bool {
        let ok = conn.writer.lock().unwrap().write_all(bytes).is_ok();
        if ok {
            self.pending.lock().unwrap().push(Frame::data("tx", bytes.to_vec(), None, Some(conn.addr.clone())));
        }
        ok
    }

    /// 연결 하나를 끝까지 읽는다. 끝난 이유를 돌려준다.
    fn read_conn(&self, id: u64, conn: Arc<Conn>, mut reader: TcpStream) -> String {
        let mut buf = [0u8; 8192];
        let reason = loop {
            if self.stop.load(Ordering::SeqCst) {
                break "closed".to_string();
            }
            match reader.read(&mut buf) {
                Ok(0) => break "closed by peer".to_string(),
                Ok(n) => {
                    let frames = conn.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                    self.push_rx(&conn, frames);
                }
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                Err(e) => break e.to_string(),
            }
            let tail = conn.framer.lock().unwrap().poll(Instant::now());
            if let Some(f) = tail {
                self.push_rx(&conn, vec![f]);
            }
            // 이 연결이 목록에서 빠졌으면(사용자가 끊음) 그만
            if !self.conns.lock().unwrap().contains_key(&id) {
                break "disconnected by user".to_string();
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

impl TcpSession {
    pub fn start(cfg: TcpConfig, mode: FrameMode, rx_check: Option<ChecksumKind>, events: EventSink) -> Result<Self, String> {
        let shared = Arc::new(Shared {
            events,
            conns: Mutex::new(BTreeMap::new()),
            next_id: AtomicU64::new(1),
            mode: Mutex::new(mode),
            rx_check: Mutex::new(rx_check),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            responder: Mutex::new(None),
            echo: AtomicBool::new(cfg.echo),
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
                let listener = TcpListener::bind(addr).map_err(|e| format!("{addr}: {e}"))?;
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
                            Ok((stream, _)) => {
                                let _ = stream.set_nonblocking(false);
                                if let Some((id, conn, reader)) = s.add(stream, no_delay) {
                                    s.note(format!("ACCEPT {}", conn.addr));
                                    let s2 = s.clone();
                                    std::thread::spawn(move || {
                                        s2.read_conn(id, conn, reader);
                                    });
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
        if self.shared.echo.swap(on, Ordering::SeqCst) != on {
            self.shared.note(format!("ECHO {}", if on { "ON" } else { "OFF" }));
        }
    }

    pub fn set_responder(&self, r: Option<Responder>) {
        *self.shared.responder.lock().unwrap() = r;
    }

    /// target 이 None 이면 붙어 있는 모두에게. 보낸 연결 수를 돌려준다.
    pub fn send(&self, target: Option<u64>, bytes: &[u8]) -> Result<usize, String> {
        let conns: Vec<Arc<Conn>> = {
            let map = self.shared.conns.lock().unwrap();
            match target {
                Some(id) => map.get(&id).cloned().into_iter().collect(),
                None => map.values().cloned().collect(),
            }
        };
        if conns.is_empty() {
            return Err("연결된 상대가 없습니다".into());
        }
        let mut n = 0;
        for c in conns {
            if self.shared.write_to(&c, bytes) {
                n += 1;
            } else {
                self.shared.note(format!("SEND FAIL {}", c.addr));
            }
        }
        Ok(n)
    }

    /// 서버: 특정 상대 끊기
    pub fn kick(&self, id: u64) {
        if let Some(c) = self.shared.conns.lock().unwrap().remove(&id) {
            let _ = c.writer.lock().unwrap().shutdown(Shutdown::Both);
        }
    }

    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        let file = match path {
            Some(p) => Some(BufWriter::new(
                std::fs::OpenOptions::new().create(true).append(true).open(&p).map_err(|e| format!("{p}: {e}"))?,
            )),
            None => None,
        };
        *self.shared.log.lock().unwrap() = file;
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
        self.shared.flush();
    }
}

fn client_loop(s: Arc<Shared>, cfg: TcpConfig, target: String) {
    loop {
        if s.stop.load(Ordering::SeqCst) {
            break;
        }
        let attempt = resolve(&cfg.host, cfg.port).and_then(|a| {
            TcpStream::connect_timeout(&a, Duration::from_secs(3)).map_err(|e| format!("{target}: {e}"))
        });
        match attempt {
            Ok(stream) => {
                if let Some((id, conn, reader)) = s.add(stream, cfg.no_delay) {
                    s.note(format!("CONNECT {}", conn.addr));
                    s.status("connected", &conn.addr, None);
                    let reason = s.read_conn(id, conn, reader);
                    s.status("disconnected", &target, Some(reason));
                }
            }
            Err(e) => {
                s.note(format!("CONNECT FAIL {e}"));
                s.status("disconnected", &target, Some(e));
            }
        }
        if !cfg.auto_reconnect || s.stop.load(Ordering::SeqCst) {
            break;
        }
        s.status("reconnecting", &target, None);
        let until = Instant::now() + Duration::from_millis(cfg.reconnect_ms.max(200));
        while Instant::now() < until && !s.stop.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(50));
        }
    }
    s.status("closed", &target, None);
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
        let server = TcpSession::start(cfg(TcpMode::Server, 0), term.clone(), None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();

        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, port), term, None, csink).unwrap();
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
        assert_eq!(server.send(None, b"OK\r\n").unwrap(), 1);
        let back = wait_frames(&crx, "rx", 1);
        assert_eq!(back[0].bytes, b"OK\r\n".to_vec());
        client.stop();
        server.stop();
    }

    #[test]
    fn server_echo() {
        let (ssink, _srx) = sink();
        let gap = FrameMode::Gap { gap_ms: 20 };
        let server = TcpSession::start(TcpConfig { echo: true, ..cfg(TcpMode::Server, 0) }, gap.clone(), None, ssink).unwrap();
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
    fn client_reports_refused() {
        // 아무도 듣지 않는 포트
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, free), FrameMode::default(), None, csink).unwrap();
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
}
