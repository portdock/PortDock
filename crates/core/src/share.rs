//! 포트 나눔(0.10.0) — 연 COM 포트를 TCP 서버로 내보낸다. 다른 프로그램·WSL2·Docker·다른 PC 가 TCP 로 붙어 같은 포트를 쓴다.
//! - 포트에서 받은 바이트는 붙은 모든 클라이언트에게 그대로 보낸다(클라이언트마다 보내기 스레드 — 느린 클라이언트가 포트 읽기를 막지 않게,
//!   밀린 몫이 넘치면 그 클라이언트만 끊는다).
//! - 클라이언트가 보낸 바이트는 누구든 포트로 보낸다(여럿이 동시에 보내면 섞일 수 있다 — 화면이 알린다).
//! - 방식: raw(그대로, 기본) 또는 RFC 2217(Telnet COM-PORT-OPTION — 원격에서 보율·패리티 등 바꾸기, `rfc2217`),
//!   또는 Modbus TCP ↔ RTU 게이트웨이(`gateway` — MBAP 를 RTU 로 바꿔 한 번에 하나씩, `mb_gateway`).
//! - 기본 묶을 주소는 127.0.0.1(이 PC 안). 0.0.0.0 은 화면에서 «다른 PC 에서 연결 허용» 을 켤 때만.
//!
//! 포트 쪽은 `Port` 로 받는다(실제는 `serial::Handle`, 시험은 가짜).

use crate::mb_gateway::{self, Engine, GatewayConfig, GwStats, Parsed};
use crate::rfc2217;
use crate::serial::SerialConfig;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{Shutdown, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, SyncSender, TrySendError};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

/// 붙을 수 있는 클라이언트 수의 상한(설정값은 1~이 값)
pub const MAX_CLIENTS: usize = 16;
/// 클라이언트 하나에 밀어 둘 수 있는 받은 덩어리 수 — 넘치면(그 클라이언트가 읽지 않음) 그 클라이언트를 끊는다
const QUEUE: usize = 1024;
/// RFC 2217 FLOWCONTROL-SUSPEND 동안 클라이언트 하나에 모아 둘 바이트 상한 — 넘치면 그 클라이언트를 끊는다
const HOLD_MAX: usize = 1 << 20;

fn default_max() -> usize {
    4
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareConfig {
    /// 묶을 주소 — 기본 127.0.0.1. 0.0.0.0 = 모든 랜카드(다른 PC 에서 붙음)
    pub host: String,
    pub port: u16,
    /// RFC 2217(Telnet COM-PORT-OPTION). 끄면 raw(그대로)
    #[serde(default)]
    pub rfc2217: bool,
    #[serde(default = "default_max")]
    pub max_clients: usize,
    /// (0.10.0) Modbus TCP ↔ RTU 게이트웨이. 켜면 `rfc2217` 은 쓰지 않는다
    #[serde(default)]
    pub gateway: bool,
    #[serde(default)]
    pub gw: GatewayConfig,
}

/// 포트 쪽 — 보내기·설정 읽기/바꾸기·사건 줄
pub trait Port: Send + Sync {
    fn send_from(&self, bytes: Vec<u8>, peer: String) -> Result<(), String>;
    fn config(&self) -> SerialConfig;
    fn reconfigure(&self, cfg: SerialConfig) -> Result<(), String>;
    fn note(&self, text: String);
    /// 세션이 끝났는지(포트 사라짐·오류·재연결 실패·닫기) — 그러면 나눔이 스스로 멈춘다
    fn closed(&self) -> bool {
        false
    }
    /// 입력 신호선 CTS·DSR·RI·CD(모르면 None)
    fn lines(&self) -> Option<[bool; 4]> {
        None
    }
}

impl Port for crate::serial::Handle {
    fn send_from(&self, bytes: Vec<u8>, peer: String) -> Result<(), String> {
        crate::serial::Handle::send_from(self, bytes, peer)
    }
    fn config(&self) -> SerialConfig {
        crate::serial::Handle::config(self)
    }
    fn reconfigure(&self, cfg: SerialConfig) -> Result<(), String> {
        crate::serial::Handle::reconfigure(self, cfg)
    }
    fn note(&self, text: String) {
        crate::serial::Handle::note(self, text)
    }
    fn closed(&self) -> bool {
        crate::serial::Handle::closed(self)
    }
    fn lines(&self) -> Option<[bool; 4]> {
        crate::serial::Handle::lines(self)
    }
}

/// 화면에 보일 클라이언트 하나
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ClientInfo {
    pub id: u64,
    pub addr: String,
    /// 보낸 바이트(클라이언트 → 포트)
    pub sent: u64,
}

/// 화면으로 가는 사건
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ShareEvent {
    /// 붙은 클라이언트 목록이 바뀜
    Clients { clients: Vec<ClientInfo> },
    /// RFC 2217 로 포트 설정이 바뀜 — 화면의 설정 칸도 따라 바꾼다
    Config { config: SerialConfig },
    /// 게이트웨이 통계(바뀌면, 많아도 0.25초에 한 번)
    Gateway { stats: GwStats },
    /// 서버가 멈춤(오류 포함). 포트 세션이 스스로 닫혀 멈췄으면 그 까닭
    Stopped { message: Option<String> },
}

struct Client {
    addr: String,
    stream: TcpStream,
    tx: SyncSender<Vec<u8>>,
    rfc: Option<Arc<Mutex<rfc2217::Server>>>,
    sent: Arc<AtomicU64>,
    /// RFC 2217 FLOWCONTROL-SUSPEND 동안 모아 둔 것(RESUME 때 보낸다, 상한 HOLD_MAX)
    held: Vec<u8>,
}

struct Inner {
    cfg: ShareConfig,
    port: Arc<dyn Port>,
    clients: Mutex<BTreeMap<u64, Client>>,
    next: AtomicU64,
    stop: AtomicBool,
    on_event: Box<dyn Fn(ShareEvent) + Send + Sync>,
    threads: Mutex<Vec<JoinHandle<()>>>,
    gw: Option<Engine>,
}

pub struct Share {
    inner: Arc<Inner>,
    accept: Option<JoinHandle<()>>,
    local: SocketAddr,
}

/// 기록 줄 상대 칸 «TCP 클라이언트 1 (127.0.0.1:50211)»
pub fn peer_label(id: u64, addr: &str) -> String {
    crate::tr!(format!("TCP 클라이언트 {id} ({addr})"), format!("TCP client {id} ({addr})"))
}

impl Share {
    pub fn start(cfg: ShareConfig, port: Arc<dyn Port>, on_event: impl Fn(ShareEvent) + Send + Sync + 'static) -> Result<Self, String> {
        let host = cfg.host.trim().to_string();
        if host.is_empty() || cfg.port == 0 {
            return Err(crate::tr!("묶을 주소와 포트(1~65535)를 넣어 주세요", "Enter the bind address and port (1–65535)").into());
        }
        let cfg = ShareConfig { host, max_clients: cfg.max_clients.clamp(1, MAX_CLIENTS), rfc2217: cfg.rfc2217 && !cfg.gateway, ..cfg };
        let gw = if cfg.gateway { Some(Engine::new(cfg.gw.clone())?) } else { None };
        let addr = crate::tcp::resolve(&cfg.host, cfg.port)?;
        let listener = TcpListener::bind(addr).map_err(|e| crate::net::bind_error(&e, addr, false))?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        let local = listener.local_addr().map_err(|e| e.to_string())?;
        let mode = if cfg.gateway { "Modbus TCP → RTU" } else if cfg.rfc2217 { "RFC2217" } else { "raw" };
        port.note(crate::tr!(format!("SHARE LISTEN {local} ({mode}, 최대 {})", cfg.max_clients), format!("SHARE LISTEN {local} ({mode}, max {})", cfg.max_clients)));
        let inner = Arc::new(Inner {
            cfg,
            port,
            clients: Mutex::new(BTreeMap::new()),
            next: AtomicU64::new(1),
            stop: AtomicBool::new(false),
            on_event: Box::new(on_event),
            threads: Mutex::new(Vec::new()),
            gw,
        });
        if inner.gw.is_some() {
            let i = inner.clone();
            let t = std::thread::spawn(move || {
                let Some(gw) = i.gw.as_ref() else { return };
                gw.run(&*i.port, &*i, &i.stop, &|stats| (i.on_event)(ShareEvent::Gateway { stats }));
                (i.on_event)(ShareEvent::Gateway { stats: gw.stats() });
            });
            inner.threads.lock().unwrap().push(t);
        }
        let i = inner.clone();
        let accept = std::thread::spawn(move || i.accept_loop(listener));
        Ok(Self { inner, accept: Some(accept), local })
    }

    /// 실제로 묶인 주소(포트 0 으로 열었을 때 확인용)
    pub fn local_addr(&self) -> SocketAddr {
        self.local
    }

    /// 포트에서 받은 바이트를 모든 클라이언트에게 — 세션의 읽기 스레드에 꽂는다(`Session::set_tap`)
    pub fn tap(&self) -> crate::serial::Tap {
        let i = self.inner.clone();
        Box::new(move |b: &[u8]| i.broadcast(b))
    }

    pub fn clients(&self) -> Vec<ClientInfo> {
        self.inner.list()
    }

    /// 게이트웨이 통계(게이트웨이 방식이 아니면 None)
    pub fn gateway_stats(&self) -> Option<GwStats> {
        self.inner.gw.as_ref().map(|g| g.stats())
    }

    /// 클라이언트 하나 끊기
    pub fn kick(&self, id: u64) {
        self.inner.drop_client(id, crate::tr!("사용자가 끊음", "disconnected by user").into());
    }

    pub fn stop(mut self) {
        self.shutdown();
    }

    fn shutdown(&mut self) {
        self.inner.stop.store(true, Ordering::SeqCst);
        if let Some(t) = self.accept.take() {
            let _ = t.join();
        }
        let ids: Vec<u64> = self.inner.clients.lock().unwrap().keys().copied().collect();
        for id in ids {
            self.inner.drop_client(id, crate::tr!("나눔 멈춤", "sharing stopped").into());
        }
        let threads = std::mem::take(&mut *self.inner.threads.lock().unwrap());
        for t in threads {
            let _ = t.join();
        }
    }
}

impl Drop for Share {
    fn drop(&mut self) {
        if self.accept.is_some() {
            self.shutdown();
        }
    }
}

impl Inner {
    fn list(&self) -> Vec<ClientInfo> {
        self.clients.lock().unwrap().iter().map(|(&id, c)| ClientInfo { id, addr: c.addr.clone(), sent: c.sent.load(Ordering::Relaxed) }).collect()
    }

    fn announce(&self) {
        (self.on_event)(ShareEvent::Clients { clients: self.list() });
    }

    fn accept_loop(self: Arc<Self>, listener: TcpListener) {
        let mut message = None;
        while !self.stop.load(Ordering::SeqCst) {
            // 포트 세션이 스스로 닫힘(포트 사라짐·오류·재연결 실패) — 서버를 닫고 클라이언트를 끊는다
            if self.port.closed() {
                let why: String = crate::tr!("포트 세션이 닫혀 나눔을 멈췄습니다", "The port session closed — sharing stopped").into();
                self.stop.store(true, Ordering::SeqCst);
                let ids: Vec<u64> = self.clients.lock().unwrap().keys().copied().collect();
                for id in ids {
                    self.drop_client(id, why.clone());
                }
                message = Some(why);
                break;
            }
            match listener.accept() {
                Ok((stream, from)) => self.add(stream, from),
                Err(e) if e.kind() == ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(20)),
                Err(e) => {
                    self.port.note(format!("SHARE ACCEPT ERROR {e}"));
                    std::thread::sleep(Duration::from_millis(200));
                }
            }
        }
        drop(listener);
        self.port.note("SHARE STOP".into());
        (self.on_event)(ShareEvent::Stopped { message });
    }

    fn add(self: &Arc<Self>, stream: TcpStream, from: SocketAddr) {
        let max = self.cfg.max_clients;
        if self.clients.lock().unwrap().len() >= max {
            self.port.note(crate::tr!(format!("SHARE REJECT {from} — 최대 클라이언트 수 {max}"), format!("SHARE REJECT {from} — max {max} clients")));
            let _ = stream.shutdown(Shutdown::Both);
            return;
        }
        let _ = stream.set_nonblocking(false);
        let _ = stream.set_nodelay(true);
        let _ = stream.set_read_timeout(Some(Duration::from_millis(200)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));
        let (Ok(reader), Ok(writer)) = (stream.try_clone(), stream.try_clone()) else {
            let _ = stream.shutdown(Shutdown::Both);
            return;
        };
        let id = self.next.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(QUEUE);
        let rfc = self.cfg.rfc2217.then(|| {
            let mut s = rfc2217::Server::default();
            let hello = s.hello();
            let _ = tx.try_send(hello);
            Arc::new(Mutex::new(s))
        });
        let sent = Arc::new(AtomicU64::new(0));
        let addr = from.to_string();
        self.clients.lock().unwrap().insert(id, Client { addr: addr.clone(), stream, tx, rfc: rfc.clone(), sent: sent.clone(), held: Vec::new() });
        self.port.note(format!("SHARE ACCEPT {}", peer_label(id, &addr)));
        self.announce();
        let me = self.clone();
        let w = std::thread::spawn(move || write_loop(writer, rx));
        let me2 = self.clone();
        let r = std::thread::spawn(move || {
            let why = me2.read_loop(id, &addr, reader, rfc, &sent);
            me2.drop_client(id, why);
        });
        let mut ts = me.threads.lock().unwrap();
        ts.retain(|h| !h.is_finished());
        ts.push(w);
        ts.push(r);
    }

    /// 클라이언트 → 포트. 끝난 이유를 돌려준다
    fn read_loop(&self, id: u64, addr: &str, mut s: TcpStream, rfc: Option<Arc<Mutex<rfc2217::Server>>>, sent: &AtomicU64) -> String {
        let peer = peer_label(id, addr);
        let mut parser = rfc2217::Parser::default();
        let mut mbap: Vec<u8> = Vec::new();
        let mut buf = [0u8; 4096];
        let mut failing = false;
        loop {
            if self.stop.load(Ordering::SeqCst) {
                return crate::tr!("나눔 멈춤", "sharing stopped").into();
            }
            if !self.clients.lock().unwrap().contains_key(&id) {
                return String::new();
            }
            let n = match s.read(&mut buf) {
                Ok(0) => return crate::tr!("클라이언트가 끊음", "client closed").into(),
                Ok(n) => n,
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => continue,
                Err(e) => return crate::oserr::net(&e),
            };
            if let Some(gw) = &self.gw {
                sent.fetch_add(n as u64, Ordering::Relaxed);
                mbap.extend_from_slice(&buf[..n]);
                loop {
                    match mb_gateway::parse_mbap(&mbap) {
                        Parsed::Need => break,
                        Parsed::Frame(m, used) => {
                            mbap.drain(..used);
                            gw.submit(id, m, &*self.port, self);
                        }
                        Parsed::Bad(why) => return why,
                    }
                }
                continue;
            }
            let data = match &rfc {
                None => buf[..n].to_vec(),
                Some(server) => {
                    let (mut data, mut items) = (Vec::new(), Vec::new());
                    parser.feed(&buf[..n], &mut data, &mut items);
                    for item in &items {
                        self.rfc_item(id, server, item);
                    }
                    data
                }
            };
            if data.is_empty() {
                continue;
            }
            sent.fetch_add(data.len() as u64, Ordering::Relaxed);
            // 포트가 끊긴 동안 등 — 처음 한 번만 사건 줄로(넘치게 쌓이지 않게)
            match self.port.send_from(data, peer.clone()) {
                Ok(()) => failing = false,
                Err(e) if !failing => {
                    failing = true;
                    self.port.note(crate::tr!(format!("SHARE {peer} 보내기 실패: {e}"), format!("SHARE {peer} send failed: {e}")));
                }
                Err(_) => {}
            }
        }
    }

    fn rfc_item(&self, id: u64, server: &Mutex<rfc2217::Server>, item: &rfc2217::Item) {
        let cur = self.port.config();
        let mut out = {
            let mut s = server.lock().unwrap();
            if let Some([cts, dsr, ri, cd]) = self.port.lines() {
                s.modem = rfc2217::modem_byte(cts, dsr, ri, cd);
            }
            s.handle(item, &cur)
        };
        if let Some(next) = out.config.take() {
            match self.port.reconfigure(next) {
                Ok(()) => {
                    for n in std::mem::take(&mut out.notes) {
                        self.port.note(format!("{n} ← {}", peer_label(id, &self.addr_of(id))));
                    }
                    (self.on_event)(ShareEvent::Config { config: self.port.config() });
                }
                Err(e) => {
                    self.port.note(format!("RFC2217 {e}"));
                    // 규격대로 «실제 값» 으로 답한다 — 요청 값으로 답하면 클라이언트가 바뀐 줄 안다
                    out.reply = server.lock().unwrap().actual_reply(item, &self.port.config());
                }
            }
        }
        let mut clients = self.clients.lock().unwrap();
        let Some(c) = clients.get_mut(&id) else { return };
        let suspended = server.lock().unwrap().suspended;
        if suspended {
            // 멈춤 동안은 답도 모아 둔다(순서 유지)
            c.held.extend_from_slice(&out.reply);
            return;
        }
        // RESUME — 모아 둔 것부터
        if !c.held.is_empty() {
            let _ = c.tx.try_send(std::mem::take(&mut c.held));
        }
        if !out.reply.is_empty() {
            let _ = c.tx.try_send(out.reply);
        }
    }

    fn addr_of(&self, id: u64) -> String {
        self.clients.lock().unwrap().get(&id).map(|c| c.addr.clone()).unwrap_or_default()
    }

    /// 포트 → 모든 클라이언트. 밀린 몫이 넘친 클라이언트는 끊는다(읽기 스레드를 막지 않게)
    fn broadcast(&self, bytes: &[u8]) {
        if bytes.is_empty() {
            return;
        }
        // 게이트웨이: 받은 바이트는 기다리는 요청의 응답 후보 — 클라이언트에게는 MBAP 로만 간다
        if let Some(gw) = &self.gw {
            gw.bus.feed(bytes);
            return;
        }
        let mut slow = Vec::new();
        {
            let mut clients = self.clients.lock().unwrap();
            for (&id, c) in clients.iter_mut() {
                let payload = match &c.rfc {
                    Some(s) => {
                        let escaped = rfc2217::escape(bytes);
                        // FLOWCONTROL-SUSPEND: 버리지 않고 모았다가 RESUME 때 보낸다. 넘치면 끊는다
                        if s.lock().unwrap().suspended {
                            if c.held.len() + escaped.len() > HOLD_MAX {
                                slow.push(id);
                            } else {
                                c.held.extend_from_slice(&escaped);
                            }
                            continue;
                        }
                        escaped
                    }
                    None => bytes.to_vec(),
                };
                if let Err(TrySendError::Full(_)) = c.tx.try_send(payload) {
                    slow.push(id);
                }
            }
        }
        for id in slow {
            self.drop_client(id, crate::tr!("받아 가지 않아 밀린 데이터가 넘침", "not reading — backlog overflowed").into());
        }
    }

    fn drop_client(&self, id: u64, why: String) {
        let Some(c) = self.clients.lock().unwrap().remove(&id) else { return };
        let _ = c.stream.shutdown(Shutdown::Both);
        let label = peer_label(id, &c.addr);
        self.port.note(if why.is_empty() { format!("SHARE CLOSE {label}") } else { format!("SHARE CLOSE {label} — {why}") });
        self.announce();
    }
}

impl mb_gateway::Clients for Inner {
    fn alive(&self, id: u64) -> bool {
        self.clients.lock().unwrap().contains_key(&id)
    }
    fn reply(&self, id: u64, bytes: Vec<u8>) {
        if let Some(c) = self.clients.lock().unwrap().get(&id) {
            let _ = c.tx.try_send(bytes);
        }
    }
}

fn write_loop(mut s: TcpStream, rx: Receiver<Vec<u8>>) {
    while let Ok(b) = rx.recv() {
        if s.write_all(&b).is_err() {
            let _ = s.shutdown(Shutdown::Both);
            return;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rfc2217::{COM_PORT, DO, IAC, SB, SE, SGA, WILL};

    /// 가짜 포트 — 보낸 것·사건 줄·설정을 모은다
    struct Fake {
        sent: Mutex<Vec<(Vec<u8>, String)>>,
        notes: Mutex<Vec<String>>,
        cfg: Mutex<SerialConfig>,
        closed: AtomicBool,
    }

    impl Fake {
        fn new() -> Arc<Self> {
            Arc::new(Self {
                sent: Mutex::new(Vec::new()),
                notes: Mutex::new(Vec::new()),
                cfg: Mutex::new(SerialConfig {
                    port: "COM9".into(),
                    baud: 9600,
                    data_bits: 8,
                    parity: "none".into(),
                    stop_bits: 1.0,
                    flow: "none".into(),
                    dtr: false,
                    rts: false,
                    auto_reconnect: true,
                    rs485: String::new(),
                }),
                closed: AtomicBool::new(false),
            })
        }
    }

    impl Port for Fake {
        fn send_from(&self, bytes: Vec<u8>, peer: String) -> Result<(), String> {
            self.sent.lock().unwrap().push((bytes, peer));
            Ok(())
        }
        fn config(&self) -> SerialConfig {
            self.cfg.lock().unwrap().clone()
        }
        /// 보율 50 은 거절한다(드라이버가 받지 않는 값 흉내)
        fn reconfigure(&self, cfg: SerialConfig) -> Result<(), String> {
            if cfg.baud == 50 {
                return Err("baud refused".into());
            }
            *self.cfg.lock().unwrap() = cfg;
            Ok(())
        }
        fn note(&self, text: String) {
            self.notes.lock().unwrap().push(text);
        }
        fn closed(&self) -> bool {
            self.closed.load(Ordering::SeqCst)
        }
        fn lines(&self) -> Option<[bool; 4]> {
            Some([true, false, false, false])
        }
    }

    fn wait_for(mut f: impl FnMut() -> bool) {
        for _ in 0..300 {
            if f() {
                return;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        panic!("timed out");
    }

    fn start(fake: &Arc<Fake>, rfc2217: bool, max: usize) -> (Share, Arc<Mutex<Vec<ShareEvent>>>) {
        let ev = Arc::new(Mutex::new(Vec::new()));
        let e2 = ev.clone();
        let s = Share::start(ShareConfig { host: "127.0.0.1".into(), port: 0, rfc2217, max_clients: max, gateway: false, gw: GatewayConfig::default() }, fake.clone(), move |e| e2.lock().unwrap().push(e));
        // 포트 0 은 «넣어 주세요» — 시험은 빈 포트를 먼저 잡아 쓴다
        assert!(s.is_err());
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let e2 = ev.clone();
        let s = Share::start(ShareConfig { host: "127.0.0.1".into(), port: free, rfc2217, max_clients: max, gateway: false, gw: GatewayConfig::default() }, fake.clone(), move |e| e2.lock().unwrap().push(e)).unwrap();
        (s, ev)
    }

    fn read_some(c: &mut TcpStream, n: usize) -> Vec<u8> {
        c.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        let mut got = vec![0u8; n];
        c.read_exact(&mut got).unwrap();
        got
    }

    #[test]
    fn raw_broadcasts_to_all_and_forwards_writes_with_peer() {
        let fake = Fake::new();
        let (share, _ev) = start(&fake, false, 4);
        let addr = share.local_addr();
        let mut a = TcpStream::connect(addr).unwrap();
        let mut b = TcpStream::connect(addr).unwrap();
        wait_for(|| share.clients().len() == 2);
        let tap = share.tap();
        tap(&[0x01, 0xFF, 0x02]);
        assert_eq!(read_some(&mut a, 3), vec![0x01, 0xFF, 0x02]);
        assert_eq!(read_some(&mut b, 3), vec![0x01, 0xFF, 0x02]);
        a.write_all(b"AT\r").unwrap();
        wait_for(|| !fake.sent.lock().unwrap().is_empty());
        let (bytes, peer) = fake.sent.lock().unwrap()[0].clone();
        assert_eq!(bytes, b"AT\r");
        assert!(peer.contains("1") && peer.contains("127.0.0.1"), "{peer}");
        drop(a);
        wait_for(|| share.clients().len() == 1);
        share.stop();
        assert!(fake.notes.lock().unwrap().iter().any(|n| n.starts_with("SHARE CLOSE")));
    }

    #[test]
    fn rejects_over_max_clients() {
        let fake = Fake::new();
        let (share, _ev) = start(&fake, false, 1);
        let _a = TcpStream::connect(share.local_addr()).unwrap();
        wait_for(|| share.clients().len() == 1);
        let mut b = TcpStream::connect(share.local_addr()).unwrap();
        b.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        let mut x = [0u8; 1];
        // 서버가 바로 닫는다 — 0 바이트(또는 연결 재설정)
        assert!(matches!(b.read(&mut x), Ok(0) | Err(_)));
        wait_for(|| fake.notes.lock().unwrap().iter().any(|n| n.starts_with("SHARE REJECT")));
        assert_eq!(share.clients().len(), 1);
        share.stop();
    }

    #[test]
    fn rfc2217_negotiates_sets_baud_and_escapes_data() {
        let fake = Fake::new();
        let (share, ev) = start(&fake, true, 4);
        let mut c = TcpStream::connect(share.local_addr()).unwrap();
        // 서버 인사: WILL COM-PORT, WILL SGA
        assert_eq!(read_some(&mut c, 6), vec![IAC, WILL, COM_PORT, IAC, WILL, SGA]);
        // 클라이언트: WILL COM-PORT → DO COM-PORT. 보율 19200 → 답 101
        c.write_all(&[IAC, WILL, COM_PORT, IAC, SB, COM_PORT, 1, 0, 0, 0x4B, 0x00, IAC, SE]).unwrap();
        assert_eq!(read_some(&mut c, 3), vec![IAC, DO, COM_PORT]);
        assert_eq!(read_some(&mut c, 10), vec![IAC, SB, COM_PORT, 101, 0, 0, 0x4B, 0x00, IAC, SE]);
        wait_for(|| fake.cfg.lock().unwrap().baud == 19_200);
        assert!(ev.lock().unwrap().iter().any(|e| matches!(e, ShareEvent::Config { config } if config.baud == 19_200)));
        // 데이터 안의 0xFF: 클라이언트 → 포트는 하나로, 포트 → 클라이언트는 두 번
        c.write_all(&[0x10, IAC, IAC, 0x11]).unwrap();
        wait_for(|| !fake.sent.lock().unwrap().is_empty());
        assert_eq!(fake.sent.lock().unwrap()[0].0, vec![0x10, 0xFF, 0x11]);
        (share.tap())(&[0xFF, 0x01]);
        assert_eq!(read_some(&mut c, 3), vec![0xFF, 0xFF, 0x01]);
        share.stop();
    }

    /// 세션이 스스로 닫히면(포트 사라짐 등) 나눔도 멈추고 Stopped 에 까닭을 싣는다 — 클라이언트는 끊긴다
    #[test]
    fn stops_when_session_closes_itself() {
        let fake = Fake::new();
        let (share, ev) = start(&fake, false, 4);
        let addr = share.local_addr();
        let mut a = TcpStream::connect(addr).unwrap();
        wait_for(|| share.clients().len() == 1);
        fake.closed.store(true, Ordering::SeqCst);
        wait_for(|| ev.lock().unwrap().iter().any(|e| matches!(e, ShareEvent::Stopped { message: Some(_) })));
        a.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        let mut x = [0u8; 1];
        assert!(matches!(a.read(&mut x), Ok(0) | Err(_)));
        assert!(share.clients().is_empty());
        // 듣던 포트도 닫혔다
        wait_for(|| TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_err());
        share.stop();
        let stops = ev.lock().unwrap().iter().filter(|e| matches!(e, ShareEvent::Stopped { .. })).count();
        assert_eq!(stops, 1);
    }

    /// RFC 2217: 포트가 바꾸기를 거절하면 지금 값으로 답한다 · SUSPEND 동안 데이터를 모았다가 RESUME 때 보낸다 · 모뎀 상태 알림
    #[test]
    fn rfc2217_refused_baud_suspend_and_modem_state() {
        let fake = Fake::new();
        let (share, _ev) = start(&fake, true, 4);
        let mut c = TcpStream::connect(share.local_addr()).unwrap();
        assert_eq!(read_some(&mut c, 6), vec![IAC, WILL, COM_PORT, IAC, WILL, SGA]);
        // 보율 50 — 포트가 거절 → 답은 지금 값 9600(0x2580)
        c.write_all(&[IAC, SB, COM_PORT, 1, 0, 0, 0, 50, IAC, SE]).unwrap();
        assert_eq!(read_some(&mut c, 10), vec![IAC, SB, COM_PORT, 101, 0, 0, 0x25, 0x80, IAC, SE]);
        assert_eq!(fake.cfg.lock().unwrap().baud, 9600);
        // 모뎀 상태 묻기 — CTS 켜짐(0x10)
        c.write_all(&[IAC, SB, COM_PORT, 7, IAC, SE]).unwrap();
        assert_eq!(read_some(&mut c, 7), vec![IAC, SB, COM_PORT, 107, 0x10, IAC, SE]);
        // SUSPEND → 받은 데이터는 모아 둔다
        c.write_all(&[IAC, SB, COM_PORT, 8, IAC, SE]).unwrap();
        wait_for(|| share.inner.clients.lock().unwrap().values().any(|c| c.rfc.as_ref().is_some_and(|s| s.lock().unwrap().suspended)));
        (share.tap())(&[0x41, 0xFF]);
        (share.tap())(&[0x42]);
        c.set_read_timeout(Some(Duration::from_millis(150))).unwrap();
        let mut x = [0u8; 1];
        assert!(c.read(&mut x).is_err(), "nothing while suspended");
        // RESUME → 모은 것이 순서대로
        c.write_all(&[IAC, SB, COM_PORT, 9, IAC, SE]).unwrap();
        assert_eq!(read_some(&mut c, 4), vec![0x41, 0xFF, 0xFF, 0x42]);
        share.stop();
    }

    /// 가짜 직렬 포트 + RTU 장비 — 답을 세션의 읽기 스레드처럼 탭으로 넣는다
    struct TapDevice {
        tap: Arc<Mutex<Option<crate::serial::Tap>>>,
        sent: Mutex<Vec<(Vec<u8>, String)>>,
        inner: Arc<Fake>,
    }

    impl Port for TapDevice {
        fn send_from(&self, bytes: Vec<u8>, peer: String) -> Result<(), String> {
            self.sent.lock().unwrap().push((bytes.clone(), peer));
            if let Some(resp) = crate::mb_gateway::tests::device(&bytes) {
                let tap = self.tap.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(5));
                    if let Some(t) = tap.lock().unwrap().as_ref() {
                        t(&resp);
                    }
                });
            }
            Ok(())
        }
        fn config(&self) -> SerialConfig {
            SerialConfig { baud: 115_200, ..self.inner.config() }
        }
        fn reconfigure(&self, cfg: SerialConfig) -> Result<(), String> {
            self.inner.reconfigure(cfg)
        }
        fn note(&self, text: String) {
            self.inner.note(text)
        }
    }

    /// 게이트웨이: TCP 클라이언트 둘 → 가짜 RTU 장비 → MBAP 응답. Modbus TCP 가 아니면 끊는다
    #[test]
    fn gateway_round_trip_over_tcp() {
        use crate::mb_gateway::{mbap_bytes, rtu_frame};
        let dev = Arc::new(TapDevice { tap: Arc::new(Mutex::new(None)), sent: Mutex::new(Vec::new()), inner: Fake::new() });
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let ev = Arc::new(Mutex::new(Vec::new()));
        let e2 = ev.clone();
        let gw = GatewayConfig { timeout_ms: 100, ..Default::default() };
        let cfg = ShareConfig { host: "127.0.0.1".into(), port: free, rfc2217: true, max_clients: 4, gateway: true, gw };
        let share = Share::start(cfg, dev.clone(), move |e| e2.lock().unwrap().push(e)).unwrap();
        *dev.tap.lock().unwrap() = Some(share.tap());
        let mut a = TcpStream::connect(share.local_addr()).unwrap();
        let mut b = TcpStream::connect(share.local_addr()).unwrap();
        wait_for(|| share.clients().len() == 2);
        // 요청을 두 번에 나눠 보내도 하나로 모은다
        let ra = mbap_bytes(7, 1, &[0x03, 0x00, 0x00, 0x00, 0x01]);
        a.write_all(&ra[..4]).unwrap();
        std::thread::sleep(Duration::from_millis(20));
        a.write_all(&ra[4..]).unwrap();
        b.write_all(&mbap_bytes(8, 5, &[0x03, 0x00, 0x00, 0x00, 0x01])).unwrap();
        assert_eq!(read_some(&mut a, 11), mbap_bytes(7, 1, &[0x03, 0x02, 0x00, 0x01]));
        assert_eq!(read_some(&mut b, 9), mbap_bytes(8, 5, &[0x83, 0x0B]));
        let first = dev.sent.lock().unwrap()[0].clone();
        assert_eq!(first.0, rtu_frame(1, &[0x03, 0x00, 0x00, 0x00, 0x01]));
        assert!(first.1.contains("#1") && first.1.contains("FC03"), "{}", first.1);
        let st = share.gateway_stats().unwrap();
        assert_eq!((st.requests, st.responses, st.timeouts), (2, 1, 1));
        // Modbus TCP 가 아닌 것 → 끊음
        b.write_all(b"HELLO WORLD").unwrap();
        wait_for(|| share.clients().len() == 1);
        *dev.tap.lock().unwrap() = None;
        share.stop();
        assert!(ev.lock().unwrap().iter().any(|e| matches!(e, ShareEvent::Gateway { .. })));
        assert!(dev.inner.notes.lock().unwrap().iter().any(|n| n.contains("Modbus TCP → RTU")));
    }
}
