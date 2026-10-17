//! UDP 세션 — 데이터그램 하나가 곧 프레임 하나. 보낸 쪽 주소를 함께 기록한다.
//! 브로드캐스트·멀티캐스트(가입·재가입)·에코(보낸 쪽으로 되돌리기).

use crate::checksum::ChecksumKind;
use crate::event::{EventSink, Frame, Peer, SessionEvent, log_line};
use crate::serial::Responder;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufWriter, ErrorKind, Write};
use std::net::{Ipv4Addr, SocketAddr, ToSocketAddrs, UdpSocket};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UdpConfig {
    /// 받을 주소(0.0.0.0 = 모든 랜카드)와 포트(0 = 아무 포트)
    pub bind_host: String,
    pub bind_port: u16,
    /// 기본으로 보낼 곳
    pub remote_host: String,
    pub remote_port: u16,
    #[serde(default)]
    pub broadcast: bool,
    /// 가입할 멀티캐스트 그룹(예: 239.0.0.1). 비우면 안 함
    #[serde(default)]
    pub multicast_group: String,
    /// 멀티캐스트에 쓸 랜카드 주소(0.0.0.0 = 기본)
    #[serde(default = "any")]
    pub multicast_if: String,
    #[serde(default)]
    pub echo: bool,
}

fn any() -> String {
    "0.0.0.0".into()
}

struct Shared {
    events: EventSink,
    socket: UdpSocket,
    remote: Mutex<Option<SocketAddr>>,
    rx_check: Mutex<Option<ChecksumKind>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<BufWriter<File>>>,
    responder: Mutex<Option<Responder>>,
    /// 보내온 상대들 (주소 → 처음 본 순서 번호, 마지막 시각). 번호는 바뀌지 않는다
    seen: Mutex<BTreeMap<String, (u64, Instant)>>,
    next_peer: AtomicU64,
    last_sender: Mutex<Option<SocketAddr>>,
    echo: AtomicBool,
    echo_rate: Mutex<(Instant, u32)>,
    /// 응답기가 마지막으로 보낸 것 — 그대로 되돌아오면 다시 답하지 않는다
    last_reply: Mutex<Option<(Vec<u8>, Instant)>>,
    local: SocketAddr,
    stop: AtomicBool,
}

/// 보내온 상대 목록 상한 — 넘으면 가장 오래 조용한 상대부터 지운다
const MAX_PEERS: usize = 256;
/// 초당 에코 상한(상대도 에코하는 핑퐁 방지)
const ECHO_LIMIT: u32 = 200;

pub struct UdpSession {
    shared: Arc<Shared>,
    threads: Vec<JoinHandle<()>>,
    local: SocketAddr,
    group: Option<(Ipv4Addr, Ipv4Addr)>,
}

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

    fn send_to(&self, bytes: &[u8], to: SocketAddr) -> Result<(), String> {
        self.socket.send_to(bytes, to).map_err(|e| format!("{to}: {e}"))?;
        self.pending.lock().unwrap().push(Frame::data("tx", bytes.to_vec(), None, Some(to.to_string())));
        Ok(())
    }

    /// 우리가 보낸 것이 브로드캐스트·멀티캐스트 루프백으로 우리에게 돌아온 것인지
    fn is_own(&self, from: SocketAddr) -> bool {
        from.port() == self.local.port() && (from.ip().is_loopback() || self.local.ip().is_unspecified() || from.ip() == self.local.ip())
    }

    fn remember(&self, from: SocketAddr) {
        let mut seen = self.seen.lock().unwrap();
        let key = from.to_string();
        let fresh = !seen.contains_key(&key);
        let id = seen.get(&key).map(|v| v.0).unwrap_or_else(|| self.next_peer.fetch_add(1, Ordering::SeqCst));
        seen.insert(key, (id, Instant::now()));
        if seen.len() > MAX_PEERS {
            let oldest = seen.iter().min_by_key(|(_, v)| v.1).map(|(k, _)| k.clone());
            if let Some(k) = oldest {
                seen.remove(&k);
            }
        }
        if fresh {
            let mut peers: Vec<Peer> = seen.iter().map(|(a, v)| Peer { id: v.0, addr: a.clone() }).collect();
            peers.sort_by_key(|p| p.id);
            drop(seen);
            self.events.send(SessionEvent::Peers { peers });
        }
    }

    fn echo_allowed(&self) -> bool {
        let mut r = self.echo_rate.lock().unwrap();
        if r.0.elapsed() >= Duration::from_secs(1) {
            *r = (Instant::now(), 0);
        }
        r.1 += 1;
        if r.1 > ECHO_LIMIT {
            drop(r);
            self.echo.store(false, Ordering::SeqCst);
            self.note(format!("ECHO OFF — 1초에 {ECHO_LIMIT}번을 넘었습니다(상대도 에코 중인지 확인)"));
            self.events.send(SessionEvent::Error { message: format!("에코를 껐습니다: 1초에 {ECHO_LIMIT}번 초과") });
            return false;
        }
        true
    }

    fn on_datagram(self: &Arc<Self>, bytes: Vec<u8>, from: SocketAddr) {
        let check = (*self.rx_check.lock().unwrap()).and_then(|k| k.verify(&bytes));
        let own = self.is_own(from);
        if !own {
            *self.last_sender.lock().unwrap() = Some(from);
            self.remember(from);
        }
        let looped = {
            let mut lr = self.last_reply.lock().unwrap();
            let hit = lr.as_ref().is_some_and(|(b, t)| *b == bytes && t.elapsed() < Duration::from_millis(500));
            if hit {
                *lr = None;
            }
            hit
        };
        // 우리 자신이 보낸 것에는 에코·응답하지 않는다(자기 루프 폭주 방지)
        let reply = if own || looped { None } else { self.responder.lock().unwrap().as_mut().map(|r| r(&bytes)) };
        self.pending.lock().unwrap().push(Frame::data("rx", bytes.clone(), check, Some(from.to_string())));
        if !own && self.echo.load(Ordering::SeqCst) && self.echo_allowed() {
            let _ = self.send_to(&bytes, from);
        }
        if let Some(r) = reply {
            if let Some(n) = r.note {
                self.note(n);
            }
            if let Some(b) = r.bytes.filter(|b| !b.is_empty()) {
                *self.last_reply.lock().unwrap() = Some((b.clone(), Instant::now() + Duration::from_millis(r.delay_ms)));
                if r.delay_ms == 0 {
                    let _ = self.send_to(&b, from);
                } else {
                    // 지연 응답은 따로 — 소켓 하나로 모든 상대를 받으므로 수신을 막지 않는다
                    let (s, delay) = (self.clone(), r.delay_ms);
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_millis(delay));
                        if !s.stop.load(Ordering::SeqCst) {
                            let _ = s.send_to(&b, from);
                        }
                    });
                }
            }
        }
    }
}

/// 버려지기만 해도 스레드가 멈추게(보관함에서 지워진 세션 등). `stop` 은 끝까지 기다린다.
impl Drop for UdpSession {
    fn drop(&mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
    }
}

impl UdpSession {
    pub fn start(cfg: UdpConfig, rx_check: Option<ChecksumKind>, responder: Option<Responder>, events: EventSink) -> Result<Self, String> {
        let bind = resolve(&cfg.bind_host, cfg.bind_port)?;
        let socket = UdpSocket::bind(bind).map_err(|e| format!("{bind}: {e}"))?;
        let local = socket.local_addr().map_err(|e| e.to_string())?;
        socket.set_read_timeout(Some(Duration::from_millis(50))).map_err(|e| e.to_string())?;
        socket.set_broadcast(cfg.broadcast).map_err(|e| format!("broadcast: {e}"))?;

        let mut group = None;
        if !cfg.multicast_group.trim().is_empty() {
            let g: Ipv4Addr = cfg.multicast_group.trim().parse().map_err(|_| format!("멀티캐스트 주소가 아닙니다: {}", cfg.multicast_group))?;
            if !g.is_multicast() {
                return Err(format!("{g} 는 멀티캐스트 주소(224.0.0.0~239.255.255.255)가 아닙니다"));
            }
            let iface: Ipv4Addr = cfg.multicast_if.trim().parse().map_err(|_| format!("랜카드 주소가 아닙니다: {}", cfg.multicast_if))?;
            socket.join_multicast_v4(&g, &iface).map_err(|e| format!("멀티캐스트 가입 {g}: {e}"))?;
            group = Some((g, iface));
        }

        let remote = if cfg.remote_host.trim().is_empty() || cfg.remote_port == 0 {
            None
        } else {
            Some(resolve(cfg.remote_host.trim(), cfg.remote_port)?)
        };

        let shared = Arc::new(Shared {
            events,
            socket,
            remote: Mutex::new(remote),
            rx_check: Mutex::new(rx_check),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            responder: Mutex::new(responder),
            seen: Mutex::new(BTreeMap::new()),
            next_peer: AtomicU64::new(1),
            echo_rate: Mutex::new((Instant::now(), 0)),
            last_reply: Mutex::new(None),
            local,
            last_sender: Mutex::new(None),
            echo: AtomicBool::new(cfg.echo),
            stop: AtomicBool::new(false),
        });
        shared.note(format!(
            "BIND {local}{}{}{}",
            remote.map(|r| format!(" → {r}")).unwrap_or_default(),
            if cfg.broadcast { " broadcast" } else { "" },
            group.map(|(g, _)| format!(" multicast {g}")).unwrap_or_default()
        ));
        shared.events.send(SessionEvent::Status { state: "listening", port: local.to_string(), message: None });

        let mut threads = Vec::new();
        let s = shared.clone();
        threads.push(std::thread::spawn(move || {
            let mut buf = vec![0u8; 65_536];
            while !s.stop.load(Ordering::SeqCst) {
                match s.socket.recv_from(&mut buf) {
                    Ok((n, from)) => s.on_datagram(buf[..n].to_vec(), from),
                    Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                    // 윈도우: 보낸 곳에 아무도 없으면 다음 recv 가 ConnectionReset(ICMP port unreachable)
                    Err(e) if e.kind() == ErrorKind::ConnectionReset => s.note("ICMP port unreachable (상대가 듣고 있지 않음)".into()),
                    Err(e) => {
                        s.note(format!("RECV ERROR {e}"));
                        std::thread::sleep(Duration::from_millis(200));
                    }
                }
            }
        }));
        let s = shared.clone();
        threads.push(std::thread::spawn(move || {
            while !s.stop.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(50));
                s.flush();
            }
            s.flush();
        }));
        Ok(Self { shared, threads, local, group })
    }

    pub fn local_addr(&self) -> SocketAddr {
        self.local
    }

    pub fn set_remote(&self, host: &str, port: u16) -> Result<(), String> {
        let r = resolve(host, port)?;
        *self.shared.remote.lock().unwrap() = Some(r);
        self.shared.note(format!("REMOTE {r}"));
        Ok(())
    }

    pub fn set_rx_check(&self, k: Option<ChecksumKind>) {
        *self.shared.rx_check.lock().unwrap() = k;
    }

    pub fn set_echo(&self, on: bool) {
        if self.shared.echo.swap(on, Ordering::SeqCst) != on {
            self.shared.note(format!("ECHO {}", if on { "ON" } else { "OFF" }));
        }
    }

    pub fn set_responder(&self, r: Option<Responder>) {
        *self.shared.responder.lock().unwrap() = r;
    }

    /// to: None = 기본 대상, Some("last") = 마지막으로 보내온 쪽, 그 밖엔 «ip:port»
    pub fn send(&self, to: Option<&str>, bytes: &[u8]) -> Result<SocketAddr, String> {
        let dest = match to {
            None => (*self.shared.remote.lock().unwrap()).ok_or("보낼 곳이 정해지지 않았습니다")?,
            Some("last") => (*self.shared.last_sender.lock().unwrap()).ok_or("아직 받은 데이터가 없습니다")?,
            Some(addr) => addr.parse().map_err(|_| format!("주소 형식이 틀립니다: {addr} (예: 192.168.0.10:5000)"))?,
        };
        self.shared.send_to(bytes, dest)?;
        Ok(dest)
    }

    /// 무선 랜 등에서 끊긴 멀티캐스트 가입을 다시 한다
    pub fn rejoin(&self) -> Result<(), String> {
        let (g, iface) = self.group.ok_or("멀티캐스트 그룹이 없습니다")?;
        let _ = self.shared.socket.leave_multicast_v4(&g, &iface);
        self.shared.socket.join_multicast_v4(&g, &iface).map_err(|e| format!("멀티캐스트 가입 {g}: {e}"))?;
        self.shared.note(format!("REJOIN {g}"));
        Ok(())
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
        for t in self.threads.drain(..) {
            let _ = t.join();
        }
        if let Some((g, iface)) = self.group {
            let _ = self.shared.socket.leave_multicast_v4(&g, &iface);
        }
        self.shared.note("CLOSE".into());
        self.shared.flush();
        self.shared.events.send(SessionEvent::Status { state: "closed", port: self.local.to_string(), message: None });
    }
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

    fn wait_rx(rx: &mpsc::Receiver<SessionEvent>, want: usize) -> Vec<Frame> {
        let mut got = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(5);
        while got.len() < want && Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = rx.recv_timeout(Duration::from_millis(100)) {
                got.extend(frames.into_iter().filter(|f| f.dir == "rx"));
            }
        }
        got
    }

    fn cfg(remote_port: u16, echo: bool) -> UdpConfig {
        UdpConfig {
            bind_host: "127.0.0.1".into(),
            bind_port: 0,
            remote_host: "127.0.0.1".into(),
            remote_port,
            broadcast: false,
            multicast_group: String::new(),
            multicast_if: any(),
            echo,
        }
    }

    #[test]
    fn datagrams_are_frames_and_echo_returns() {
        let (bs, brx) = sink();
        let b = UdpSession::start(cfg(0, true), None, None, bs).unwrap();
        let (as_, arx) = sink();
        let a = UdpSession::start(cfg(b.local_addr().port(), false), None, None, as_).unwrap();

        a.send(None, &[1, 2, 3]).unwrap();
        a.send(None, &[4]).unwrap();
        let got = wait_rx(&brx, 2);
        assert_eq!(got.iter().map(|f| f.bytes.clone()).collect::<Vec<_>>(), vec![vec![1, 2, 3], vec![4]]);
        assert_eq!(got[0].peer.as_deref(), Some(a.local_addr().to_string().as_str()));

        // B 의 에코가 A 로 돌아온다
        let back = wait_rx(&arx, 2);
        assert_eq!(back[0].bytes, vec![1, 2, 3]);

        // B → 마지막으로 보내온 쪽(A)
        assert_eq!(b.send(Some("last"), &[9]).unwrap(), a.local_addr());
        a.stop();
        b.stop();
    }

    #[test]
    fn rejects_non_multicast_group() {
        let (s, _) = sink();
        let mut c = cfg(0, false);
        c.multicast_group = "192.168.0.1".into();
        let err = UdpSession::start(c, None, None, s).err().unwrap();
        assert!(err.contains("멀티캐스트"));
    }

    #[test]
    fn send_without_target_errors() {
        let (s, _) = sink();
        let u = UdpSession::start(cfg(0, false), None, None, s).unwrap();
        assert!(u.send(None, &[1]).is_err());
        assert!(u.send(Some("last"), &[1]).is_err());
        assert!(u.send(Some("nonsense"), &[1]).is_err());
        u.stop();
    }
}
