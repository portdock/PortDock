//! UDP 세션 — 데이터그램 하나가 곧 프레임 하나. 보낸 쪽 주소를 함께 기록한다.
//! 브로드캐스트·멀티캐스트(가입·재가입)·에코(보낸 쪽으로 되돌리기).

use crate::checksum::ChecksumKind;
use crate::event::{EventSink, Frame, LogWriter, Peer, SessionEvent};
use crate::delay::Delayer;
use crate::replyguard::{ECHO_MARGIN, ReplyGuard, Verdict, flood_note};
use crate::serial::Responder;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
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
    /// 멀티캐스트에 쓸 랜카드 주소(0.0.0.0 = 기본) — 가입과 보내기(IP_MULTICAST_IF) 둘 다
    #[serde(default = "any")]
    pub multicast_if: String,
    /// 멀티캐스트로 보낼 때 TTL(지나갈 수 있는 라우터 수, 1 = 같은 망만)
    #[serde(default = "one")]
    pub multicast_ttl: u32,
    /// 멀티캐스트로 보낸 것을 이 PC(같은 그룹에 가입한 프로그램)도 받는지
    #[serde(default = "yes")]
    pub multicast_loop: bool,
    #[serde(default)]
    pub echo: bool,
}

fn any() -> String {
    "0.0.0.0".into()
}
fn one() -> u32 {
    1
}
fn yes() -> bool {
    true
}

struct Shared {
    events: EventSink,
    socket: UdpSocket,
    remote: Mutex<Option<SocketAddr>>,
    rx_check: Mutex<Option<ChecksumKind>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<LogWriter>>,
    responder: Mutex<Option<Responder>>,
    /// 보내온 상대들 (주소 → 처음 본 순서 번호, 마지막 시각). 번호는 바뀌지 않는다
    seen: Mutex<BTreeMap<String, (u64, Instant)>>,
    next_peer: AtomicU64,
    last_sender: Mutex<Option<SocketAddr>>,
    echo: AtomicBool,
    echo_rate: Mutex<(Instant, u32)>,
    /// 응답기가 마지막으로 보낸 것(상대 주소별 하나) — 응답 직후 50ms 안에 그대로 되돌아오면 다시 답하지 않는다.
    /// 상대가 늘 수 있어 `MAX_PEERS` 를 넘으면 비운다
    last_reply: Mutex<HashMap<SocketAddr, ReplyGuard>>,
    /// 지연 응답 예약 — 응답마다 스레드를 만들지 않고 하나가 시간 순으로(상한 `delay::MAX_PENDING`)
    delayed: Delayer,
    /// 우리에게 되돌아올 수 있는 곳(브로드캐스트·멀티캐스트·루프백, 우리 포트)으로 최근 보낸 것
    sent_back: Mutex<VecDeque<(Vec<u8>, Instant)>>,
    local: SocketAddr,
    stop: AtomicBool,
}

/// 보내온 상대 목록 상한 — 넘으면 가장 오래 조용한 상대부터 지운다
const MAX_PEERS: usize = 256;
/// 초당 에코 상한(상대도 에코하는 핑퐁 방지)
const ECHO_LIMIT: u32 = 200;
/// 보낸 것이 루프백으로 돌아왔다고 볼 시간과 기억할 개수
const OWN_WINDOW: Duration = Duration::from_millis(500);
const OWN_KEEP: usize = 32;

pub struct UdpSession {
    shared: Arc<Shared>,
    threads: Vec<JoinHandle<()>>,
    local: SocketAddr,
    group: Option<(Ipv4Addr, Ipv4Addr)>,
}

use crate::tcp::resolve;

/// 이 주소로 보낸 것이 우리 소켓으로 되돌아올 수 있는지(브로드캐스트·멀티캐스트·루프백).
/// 서브넷 브로드캐스트(192.168.0.255 등)는 넷마스크를 모르므로 끝자리 255 로 본다
fn loops_back(to: &SocketAddr) -> bool {
    match to.ip() {
        IpAddr::V4(ip) => ip.is_broadcast() || ip.is_multicast() || ip.is_loopback() || ip.is_unspecified() || ip.octets()[3] == 255,
        IpAddr::V6(ip) => ip.is_multicast() || ip.is_loopback(),
    }
}

impl Shared {
    fn note(&self, text: String) {
        self.pending.lock().unwrap().push(Frame::event(text));
    }

    fn flush(&self) {
        let frames = std::mem::take(&mut *self.pending.lock().unwrap());
        crate::event::flush_frames(frames, &self.log, &self.events);
    }

    fn send_to(&self, bytes: &[u8], to: SocketAddr) -> Result<(), String> {
        // 보내기 전에 적는다 — 루프백은 send_to 가 돌아오기 전에 수신 스레드에 닿을 수 있다
        if to.port() == self.local.port() && loops_back(&to) {
            let mut q = self.sent_back.lock().unwrap();
            q.push_back((bytes.to_vec(), Instant::now()));
            if q.len() > OWN_KEEP {
                q.pop_front();
            }
        }
        // 루프백·브로드캐스트는 send_to 안에서 수신 스레드가 깨어 RX 를 먼저 쌓을 수 있다 —
        // 쌓는 자리를 쥔 채로 보내 TX 줄이 그 RX 보다 앞에 오게 한다(UDP 송신은 막히지 않는다)
        let mut pending = self.pending.lock().unwrap();
        self.socket.send_to(bytes, to).map_err(|e| format!("{to}: {}", crate::oserr::net(&e)))?;
        pending.push(Frame::data("tx", bytes.to_vec(), None, Some(to.to_string())));
        Ok(())
    }

    /// 우리가 보낸 것이 브로드캐스트·멀티캐스트·루프백으로 우리에게 돌아온 것인지.
    /// 같은 포트라는 것만으로는 모른다 — 장비는 흔히 5001→5001 처럼 같은 포트를 쓴다.
    /// 그래서 «우리 포트로 되돌아올 곳에 최근(500ms) 보낸 것과 바이트가 같을 때» 만 우리 것으로 본다
    /// (특정 주소에 묶였으면 같은 주소·포트는 곧 이 소켓). 맞춘 기록은 지운다 — 돌아오는 건 한 번
    fn is_own(&self, from: SocketAddr, bytes: &[u8]) -> bool {
        if from.port() != self.local.port() {
            return false;
        }
        if !self.local.ip().is_unspecified() && from.ip() == self.local.ip() {
            return true;
        }
        let mut q = self.sent_back.lock().unwrap();
        q.retain(|(_, t)| t.elapsed() < OWN_WINDOW);
        match q.iter().position(|(b, _)| b == bytes) {
            Some(i) => {
                q.remove(i);
                true
            }
            None => false,
        }
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
            self.note(crate::tr!(format!("ECHO OFF — 1초에 {ECHO_LIMIT}번을 넘었습니다(상대도 에코 중인지 확인)"), format!("ECHO OFF — more than {ECHO_LIMIT} per second (is the peer echoing too?)")));
            self.events.send(SessionEvent::Error { message: crate::tr!(format!("에코를 껐습니다: 1초에 {ECHO_LIMIT}번 초과"), format!("Echo turned off: over {ECHO_LIMIT} per second")) });
            return false;
        }
        true
    }

    fn on_datagram(self: &Arc<Self>, bytes: Vec<u8>, from: SocketAddr) {
        let check = (*self.rx_check.lock().unwrap()).and_then(|k| k.verify(&bytes));
        let own = self.is_own(from, &bytes);
        if !own {
            *self.last_sender.lock().unwrap() = Some(from);
            self.remember(from);
        }
        let looped = match self.last_reply.lock().unwrap().get_mut(&from).map(|g| g.check(&bytes, Instant::now(), Some(ECHO_MARGIN))) {
            None | Some(Verdict::Answer) => false,
            Some(Verdict::Echo) => true,
            Some(Verdict::Flood { first }) => {
                if first {
                    self.note(format!("{} ({from})", flood_note()));
                }
                true
            }
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
                {
                    let mut lr = self.last_reply.lock().unwrap();
                    if lr.len() >= MAX_PEERS && !lr.contains_key(&from) {
                        lr.clear();
                    }
                    lr.entry(from).or_default().sent(&b, Instant::now() + Duration::from_millis(r.delay_ms), Duration::ZERO);
                }
                if r.delay_ms == 0 {
                    let _ = self.send_to(&b, from);
                } else {
                    // 지연 응답은 예약 스레드로 — 소켓 하나로 모든 상대를 받으므로 수신을 막지 않는다
                    let s = self.clone();
                    if let Err(e) = self.delayed.schedule(Duration::from_millis(r.delay_ms), move || {
                        if !s.stop.load(Ordering::SeqCst) {
                            let _ = s.send_to(&b, from);
                        }
                    }) {
                        self.note(e.note());
                    }
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
        let socket = UdpSocket::bind(bind).map_err(|e| crate::net::bind_error(&e, bind, true))?;
        let local = socket.local_addr().map_err(|e| e.to_string())?;
        socket.set_read_timeout(Some(Duration::from_millis(50))).map_err(|e| e.to_string())?;
        socket.set_broadcast(cfg.broadcast).map_err(|e| format!("broadcast: {e}"))?;

        // 멀티캐스트 랜카드(가입·보내기)·TTL·되돌려 받기 — 그룹에 가입하지 않고 보내기만 할 때도 쓴다
        let if_text = cfg.multicast_if.trim();
        let iface: Ipv4Addr = if if_text.is_empty() {
            Ipv4Addr::UNSPECIFIED
        } else {
            if_text.parse().map_err(|_| crate::tr!(format!("랜카드 주소가 아닙니다: {if_text}"), format!("Not a network interface address: {if_text}")))?
        };
        if !iface.is_unspecified() && !crate::net::is_local_address(&iface.to_string()) {
            let h = crate::net::address_hint();
            return Err(crate::tr!(format!("{iface} 는 이 PC 의 랜카드 주소가 아닙니다. {h}"), format!("{iface} is not an address of this PC. {h}")).trim_end().to_string());
        }
        if cfg.multicast_ttl == 0 || cfg.multicast_ttl > 255 {
            return Err(crate::tr!("멀티캐스트 TTL 은 1~255 입니다", "Multicast TTL must be 1–255").into());
        }
        {
            let sr = socket2::SockRef::from(&socket);
            if !iface.is_unspecified() {
                sr.set_multicast_if_v4(&iface).map_err(|e| crate::tr!(format!("멀티캐스트 랜카드 {iface}: {e}"), format!("Multicast interface {iface}: {e}")))?;
            }
            sr.set_multicast_ttl_v4(cfg.multicast_ttl).map_err(|e| format!("multicast TTL: {e}"))?;
            sr.set_multicast_loop_v4(cfg.multicast_loop).map_err(|e| format!("multicast loop: {e}"))?;
        }
        let mut group = None;
        if !cfg.multicast_group.trim().is_empty() {
            let g: Ipv4Addr = cfg.multicast_group.trim().parse().map_err(|_| crate::tr!(format!("멀티캐스트 주소가 아닙니다: {}", cfg.multicast_group), format!("Not a multicast address: {}", cfg.multicast_group)))?;
            if !g.is_multicast() {
                return Err(crate::tr!(format!("{g} 는 멀티캐스트 주소(224.0.0.0~239.255.255.255)가 아닙니다"), format!("{g} is not a multicast address (224.0.0.0–239.255.255.255)")));
            }
            socket.join_multicast_v4(&g, &iface).map_err(|e| crate::tr!(format!("멀티캐스트 가입 {g}: {e}"), format!("Multicast join {g}: {e}")))?;
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
            last_reply: Mutex::new(HashMap::new()),
            delayed: Delayer::new(),
            sent_back: Mutex::new(VecDeque::new()),
            local,
            last_sender: Mutex::new(None),
            echo: AtomicBool::new(cfg.echo),
            stop: AtomicBool::new(false),
        });
        shared.note(format!(
            "BIND {local}{}{}{}{}{}{}",
            remote.map(|r| format!(" → {r}")).unwrap_or_default(),
            if cfg.broadcast { " broadcast" } else { "" },
            group.map(|(g, _)| format!(" multicast {g}")).unwrap_or_default(),
            if iface.is_unspecified() { String::new() } else { format!(" if {iface}") },
            if cfg.multicast_ttl != 1 { format!(" ttl {}", cfg.multicast_ttl) } else { String::new() },
            if cfg.multicast_loop { "" } else { " noloop" },
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
                    Err(e) if e.kind() == ErrorKind::ConnectionReset => s.note(crate::tr!("ICMP port unreachable (상대가 듣고 있지 않음)", "ICMP port unreachable (nobody is listening)").into()),
                    Err(e) => {
                        s.note(format!("RECV ERROR {}", crate::oserr::net(&e)));
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
            None => (*self.shared.remote.lock().unwrap()).ok_or(crate::tr!("보낼 곳이 정해지지 않았습니다", "No destination is set"))?,
            Some("last") => (*self.shared.last_sender.lock().unwrap()).ok_or(crate::tr!("아직 받은 데이터가 없습니다", "Nothing has been received yet"))?,
            Some(addr) => addr.parse().map_err(|_| crate::tr!(format!("주소 형식이 틀립니다: {addr} (예: 192.168.0.10:5000)"), format!("Bad address: {addr} (e.g. 192.168.0.10:5000)")))?,
        };
        self.shared.send_to(bytes, dest)?;
        Ok(dest)
    }

    /// 무선 랜 등에서 끊긴 멀티캐스트 가입을 다시 한다
    pub fn rejoin(&self) -> Result<(), String> {
        let (g, iface) = self.group.ok_or(crate::tr!("멀티캐스트 그룹이 없습니다", "No multicast group"))?;
        let _ = self.shared.socket.leave_multicast_v4(&g, &iface);
        self.shared.socket.join_multicast_v4(&g, &iface).map_err(|e| crate::tr!(format!("멀티캐스트 가입 {g}: {e}"), format!("Multicast join {g}: {e}")))?;
        self.shared.note(format!("REJOIN {g}"));
        Ok(())
    }

    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        *self.shared.log.lock().unwrap() = path.as_deref().map(LogWriter::open).transpose()?;
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        self.shared.delayed.close();
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
            multicast_ttl: 1,
            multicast_loop: true,
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

    /// 장비가 같은 포트끼리(5001→5001) 보내도 보낸 쪽으로 기록되고 에코가 간다.
    /// 127.0.0.2 도 루프백이라 예전엔 «우리 자신» 으로 잘못 봤다
    #[test]
    fn same_port_device_is_a_peer() {
        let (bs, brx) = sink();
        let b = UdpSession::start(cfg(0, true), None, None, bs).unwrap();
        let port = b.local_addr().port();
        let dev = match UdpSocket::bind(("127.0.0.2", port)) {
            Ok(s) => s,
            Err(_) => return, // 127.0.0.2 를 못 쓰는 환경
        };
        dev.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        dev.send_to(b"HELLO", b.local_addr()).unwrap();
        let got = wait_rx(&brx, 1);
        assert_eq!(got[0].peer.as_deref(), Some(dev.local_addr().unwrap().to_string().as_str()));
        // 에코가 장비로 돌아간다
        let mut buf = [0u8; 16];
        let (n, _) = dev.recv_from(&mut buf).unwrap();
        assert_eq!(&buf[..n], b"HELLO");
        assert_eq!(b.send(Some("last"), b"X").unwrap(), dev.local_addr().unwrap());
        b.stop();
    }

    /// 자기 포트로 보낸 것(루프백)은 우리 것 — 보낸 쪽으로 기록하지 않고 에코하지 않는다
    #[test]
    fn own_loopback_is_not_a_peer() {
        let (s, rx) = sink();
        let mut c = cfg(0, true);
        c.bind_host = "0.0.0.0".into();
        let u = UdpSession::start(c, None, None, s).unwrap();
        let me: SocketAddr = format!("127.0.0.1:{}", u.local_addr().port()).parse().unwrap();
        u.send(Some(&me.to_string()), b"SELF").unwrap();
        let got = wait_rx(&rx, 1);
        assert_eq!(got.len(), 1);
        assert!(u.send(Some("last"), b"x").is_err(), "own datagram must not become the last sender");
        // 에코도 하지 않는다 — 더 오는 것이 없다
        assert!(wait_rx_for(&rx, Duration::from_millis(300)).is_empty());
        u.stop();
    }

    fn wait_rx_for(rx: &mpsc::Receiver<SessionEvent>, d: Duration) -> Vec<Frame> {
        let mut got = Vec::new();
        let deadline = Instant::now() + d;
        while Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = rx.recv_timeout(Duration::from_millis(50)) {
                got.extend(frames.into_iter().filter(|f| f.dir == "rx"));
            }
        }
        got
    }

    /// 자기 포트로 보낸 것이 루프백으로 돌아와도 기록 순서는 TX → RX
    #[test]
    fn own_loopback_tx_logged_before_rx() {
        let (s, rx) = sink();
        let mut c = cfg(0, false);
        c.bind_host = "0.0.0.0".into();
        let u = UdpSession::start(c, None, None, s).unwrap();
        let me = format!("127.0.0.1:{}", u.local_addr().port());
        for i in 0..200u16 {
            u.send(Some(&me), &i.to_be_bytes()).unwrap();
        }
        let mut seen_tx = std::collections::HashSet::new();
        let mut rx_count = 0;
        let deadline = Instant::now() + Duration::from_secs(5);
        while rx_count < 200 && Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = rx.recv_timeout(Duration::from_millis(100)) {
                for f in frames {
                    match f.dir {
                        "tx" => {
                            seen_tx.insert(f.bytes);
                        }
                        "rx" => {
                            assert!(seen_tx.contains(&f.bytes), "RX {:?} logged before its TX", f.bytes);
                            rx_count += 1;
                        }
                        _ => {}
                    }
                }
            }
        }
        assert_eq!(rx_count, 200);
        u.stop();
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

    #[test]
    fn multicast_options_apply_and_validate() {
        let (s, _) = sink();
        let mut c = cfg(0, false);
        c.multicast_ttl = 4;
        c.multicast_loop = false;
        c.multicast_if = "127.0.0.1".into();
        let u = UdpSession::start(c.clone(), None, None, s).unwrap();
        let sr = socket2::SockRef::from(&u.shared.socket);
        assert_eq!(sr.multicast_ttl_v4().unwrap(), 4);
        assert!(!sr.multicast_loop_v4().unwrap());
        assert_eq!(sr.multicast_if_v4().unwrap(), Ipv4Addr::LOCALHOST);
        u.stop();
        for (ttl, iface) in [(0, "0.0.0.0"), (256, "0.0.0.0"), (1, "not-ip"), (1, "203.0.113.77")] {
            let (s, _) = sink();
            let mut bad = c.clone();
            bad.multicast_ttl = ttl;
            bad.multicast_if = iface.into();
            if iface == "203.0.113.77" && crate::net::interfaces().is_empty() {
                continue; // 랜카드 목록을 못 읽는 환경에선 막지 않는다
            }
            assert!(UdpSession::start(bad, None, None, s).is_err(), "ttl {ttl} if {iface}");
        }
    }

    /// 예전 설정(JSON)에 새 칸이 없어도 읽고 기본값(TTL 1, 되돌려 받기)
    #[test]
    fn old_config_json_defaults() {
        let c: UdpConfig = serde_json_lite();
        assert_eq!((c.multicast_ttl, c.multicast_loop, c.multicast_if.as_str()), (1, true, "0.0.0.0"));
    }

    fn serde_json_lite() -> UdpConfig {
        serde_json::from_str(r#"{"bindHost":"0.0.0.0","bindPort":0,"remoteHost":"","remotePort":0}"#).unwrap()
    }

    #[test]
    fn bind_in_use_names_owner() {
        let held = UdpSocket::bind("127.0.0.1:0").unwrap();
        let mut c = cfg(0, false);
        c.bind_port = held.local_addr().unwrap().port();
        let (s, _) = sink();
        let err = UdpSession::start(c, None, None, s).err().unwrap();
        if cfg!(windows) && crate::net::port_owner(held.local_addr().unwrap().port(), true).is_some() {
            assert!(err.contains(&std::process::id().to_string()), "{err}");
        }
    }
}
