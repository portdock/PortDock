//! 장비 찾기 — ① 범위의 주소마다 ARP(같은 대역)·핑으로 살아 있는지 ② 찾은 장비마다 산업 포트·Modbus 식별·이름.
//! 정해 둔 포트만 짧게 두드린다(범용 포트 스캔은 하지 않는다 — 백신 오탐·장비 부담).
//! 일꾼 스레드 수는 정해 두고(기본 64), 멈춤을 누르면 하던 주소까지만 하고 끝낸다.

use crate::modbus_id::{self, Ident};
use crate::{oui, range, win};
use portdock_core::tr;
use serde::{Deserialize, Serialize};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanConfig {
    /// 찾을 범위 — range.rs 형식
    pub range: String,
    /// 쓸 랜카드 주소(ARP 를 이 랜카드로). 없으면 ARP 없이 핑만
    pub nic_ip: Option<String>,
    pub ping: bool,
    pub arp: bool,
    /// 핑 기다릴 시간(ms)
    pub timeout_ms: u32,
    /// 확인할 TCP 포트(산업 포트 목록) — 비우면 포트 확인 안 함
    pub ports: Vec<u16>,
    pub port_timeout_ms: u32,
    /// 거꾸로 이름 찾기
    pub names: bool,
    /// 502 가 열려 있으면 Modbus 장비 정보(FC 2B/0E) 묻기
    pub modbus_id: bool,
    /// 동시에 일할 스레드 수
    pub threads: u32,
}

/// 찾은 장비 하나. 처음 찾았을 때 한 번, 포트·이름 확인이 끝나면(done) 한 번 더 보낸다
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Host {
    pub ip: String,
    pub mac: Option<String>,
    pub vendor: Option<String>,
    /// 임의(로컬 관리) MAC — 제조사를 알 수 없다
    pub random_mac: bool,
    /// 핑 왕복 시간(ms). 핑에 답하지 않았으면 없음
    pub rtt: Option<u32>,
    /// ARP 로 찾음(핑을 막은 장비도)
    pub arp: bool,
    pub name: Option<String>,
    /// 열린 포트(확인한 것 가운데)
    pub ports: Vec<u16>,
    pub modbus: Option<Ident>,
    /// 이 PC
    pub me: bool,
    /// 포트·이름 확인까지 끝났는지
    pub done: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ScanEvent {
    Host { host: Host },
    /// phase: "find"(살아 있는지) | "check"(포트·이름)
    Progress { phase: &'static str, done: u32, total: u32, found: u32 },
    Done { found: u32, total: u32, ms: u64, cancelled: bool },
    Error { message: String },
}

pub type Sink = Arc<dyn Fn(ScanEvent) + Send + Sync>;

/// 한 장비에서 확인할 포트 수 상한(산업 포트 목록용 — 범용 포트 스캔이 되지 않게)
pub const MAX_PORTS: usize = 32;

pub struct Scan {
    cancel: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl Scan {
    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::Relaxed);
    }
    pub fn running(&self) -> bool {
        self.thread.as_ref().is_some_and(|t| !t.is_finished())
    }
}

impl Drop for Scan {
    fn drop(&mut self) {
        self.cancel();
    }
}

/// 랜카드 정보 — 같은 대역인지 가리고, 이 PC 의 MAC 을 채운다
struct Local {
    ip: Ipv4Addr,
    mask: u32,
    mac: Option<String>,
}

fn local_of(ip: Ipv4Addr) -> Local {
    let nics = win::list_nics().unwrap_or_default();
    for n in &nics {
        for a in &n.addrs {
            if a.ip == ip.to_string() {
                return Local { ip, mask: range::mask_of(a.prefix), mac: n.mac.clone() };
            }
        }
    }
    // 목록에 없으면(방금 바뀜) /24 로 본다
    Local { ip, mask: range::mask_of(24), mac: None }
}

/// 찾기 시작 — 주소 수를 돌려준다. 결과는 sink 로
pub fn start(cfg: ScanConfig, sink: Sink) -> Result<(Scan, u32), String> {
    let hosts = range::expand(&cfg.range)?;
    if !cfg.ping && !cfg.arp {
        return Err(tr!("핑과 ARP 가운데 하나는 켜야 합니다", "Turn on ping or ARP (at least one)").into());
    }
    let local = match cfg.nic_ip.as_deref().filter(|s| !s.trim().is_empty()) {
        Some(s) => Some(local_of(s.trim().parse::<Ipv4Addr>().map_err(|_| format!("{}: «{s}»", tr!("랜카드 주소가 IP 가 아닙니다", "The adapter address is not an IP")))?)),
        None => None,
    };
    if cfg.ping {
        // ICMP 를 쓸 수 없는 PC(정책으로 막힘)면 바로 알린다
        win::Pinger::new()?;
    }
    let total = hosts.len() as u32;
    let cancel = Arc::new(AtomicBool::new(false));
    let c2 = cancel.clone();
    let thread = std::thread::Builder::new()
        .name("netscan".into())
        .spawn(move || run(cfg, hosts, local, c2, sink))
        .map_err(|e| e.to_string())?;
    Ok((Scan { cancel, thread: Some(thread) }, total))
}

/// 일꾼 n 개로 0..len 을 나눠 처리하고, 그동안 0.15초마다 진행을 보낸다
fn pool(n: usize, len: usize, cancel: &AtomicBool, work: impl Fn(usize) + Sync, tick: impl Fn(u32)) {
    let next = AtomicUsize::new(0);
    let done = AtomicU32::new(0);
    std::thread::scope(|s| {
        let workers: Vec<_> = (0..n.min(len).max(1))
            .map(|_| {
                s.spawn(|| {
                    loop {
                        if cancel.load(Ordering::Relaxed) {
                            break;
                        }
                        let i = next.fetch_add(1, Ordering::Relaxed);
                        if i >= len {
                            break;
                        }
                        work(i);
                        done.fetch_add(1, Ordering::Relaxed);
                    }
                })
            })
            .collect();
        while !workers.iter().all(|w| w.is_finished()) {
            std::thread::sleep(Duration::from_millis(150));
            tick(done.load(Ordering::Relaxed));
        }
    });
    tick(done.load(Ordering::Relaxed));
}

fn discover(ip: Ipv4Addr, cfg: &ScanConfig, local: Option<&Local>, pinger: Option<&win::Pinger>) -> Option<Host> {
    let me = local.is_some_and(|l| l.ip == ip);
    let same = local.is_some_and(|l| u32::from(ip) & l.mask == u32::from(l.ip) & l.mask);
    let mac = if me {
        local.and_then(|l| l.mac.as_deref()).and_then(oui::parse_mac)
    } else if cfg.arp && same {
        win::arp(ip, local.map(|l| l.ip))
    } else {
        None
    };
    // 같은 대역에서 ARP 가 실패했으면 핑도 나갈 수 없다(시간만 든다)
    let skip_ping = cfg.arp && same && !me && mac.is_none();
    let rtt = match pinger {
        Some(p) if !skip_ping => p.ping(ip, ping_timeout(cfg.timeout_ms)),
        _ => None,
    };
    if !me && mac.is_none() && rtt.is_none() {
        return None;
    }
    Some(Host {
        ip: ip.to_string(),
        mac: mac.map(|m| oui::fmt_mac(&m)),
        vendor: mac.and_then(|m| oui::vendor(&m)).map(String::from),
        random_mac: mac.is_some_and(|m| oui::is_local(&m)),
        rtt,
        arp: mac.is_some() && !me,
        me,
        ..Default::default()
    })
}

/// 핑 기다림(ms) — 50ms~10초. 아주 큰 값이면 장비 하나마다 몇 시간씩 걸리고 취소도 그만큼 늦는다
fn ping_timeout(ms: u32) -> u32 {
    ms.clamp(50, 10_000)
}

/// 포트 확인·이름 찾기에 쓰는 작은 스레드(스택 작게 — 한꺼번에 수백 개가 뜰 수 있다)
fn small<'s, 'e, T: Send + 's>(s: &'s std::thread::Scope<'s, 'e>, f: impl FnOnce() -> T + Send + 's) -> Option<std::thread::ScopedJoinHandle<'s, T>> {
    std::thread::Builder::new().stack_size(128 * 1024).spawn_scoped(s, f).ok()
}

fn check(h: &mut Host, cfg: &ScanConfig, cancel: &AtomicBool) {
    let Ok(ip) = h.ip.parse::<Ipv4Addr>() else { return };
    let t = Duration::from_millis(u64::from(cfg.port_timeout_ms.clamp(50, 10_000)));
    // 포트들과 이름 찾기를 동시에 — 막힌 포트의 시간 초과가 줄줄이 쌓이지 않게
    let (open, name) = std::thread::scope(|s| {
        let name = if cfg.names && !cancel.load(Ordering::Relaxed) { small(s, move || win::reverse_name(ip)) } else { None };
        let probes: Vec<_> = cfg
            .ports
            .iter()
            .take(MAX_PORTS)
            .filter_map(|&p| small(s, move || (!cancel.load(Ordering::Relaxed) && TcpStream::connect_timeout(&SocketAddr::from((ip, p)), t).is_ok()).then_some(p)))
            .collect();
        let open: Vec<u16> = probes.into_iter().filter_map(|j| j.join().ok().flatten()).collect();
        (open, name.and_then(|j| j.join().ok().flatten()))
    });
    h.ports = open;
    h.name = name;
    if cfg.modbus_id && h.ports.contains(&502) && !cancel.load(Ordering::Relaxed) {
        h.modbus = modbus_id::ident(SocketAddr::from((ip, 502)), t.max(Duration::from_millis(800))).ok();
    }
}

fn run(cfg: ScanConfig, hosts: Vec<Ipv4Addr>, local: Option<Local>, cancel: Arc<AtomicBool>, sink: Sink) {
    let t0 = Instant::now();
    let total = hosts.len() as u32;
    let threads = cfg.threads.clamp(1, 128) as usize;
    let found: Mutex<Vec<Host>> = Mutex::new(Vec::new());
    let nfound = AtomicU32::new(0);

    // ① 살아 있는지 — 핑 손잡이는 일꾼마다 하나(스레드 지역)
    thread_local! {
        static PINGER: std::cell::OnceCell<Option<win::Pinger>> = const { std::cell::OnceCell::new() };
    }
    pool(
        threads,
        hosts.len(),
        &cancel,
        |i| {
            let host = PINGER.with(|p| {
                let p = if cfg.ping { p.get_or_init(|| win::Pinger::new().ok()).as_ref() } else { None };
                discover(hosts[i], &cfg, local.as_ref(), p)
            });
            if let Some(h) = host {
                nfound.fetch_add(1, Ordering::Relaxed);
                sink(ScanEvent::Host { host: h.clone() });
                found.lock().unwrap_or_else(|e| e.into_inner()).push(h);
            }
        },
        |done| sink(ScanEvent::Progress { phase: "find", done, total, found: nfound.load(Ordering::Relaxed) }),
    );

    // ② 포트·Modbus·이름
    let mut list = found.into_inner().unwrap_or_else(|e| e.into_inner());
    let need = !cfg.ports.is_empty() || cfg.names || cfg.modbus_id;
    if need && !cancel.load(Ordering::Relaxed) && !list.is_empty() {
        let n = list.len() as u32;
        let slots: Vec<Mutex<Host>> = list.drain(..).map(Mutex::new).collect();
        pool(
            threads.min(32),
            slots.len(),
            &cancel,
            |i| {
                let mut h = slots[i].lock().unwrap_or_else(|e| e.into_inner());
                check(&mut h, &cfg, &cancel);
                h.done = true;
                sink(ScanEvent::Host { host: h.clone() });
            },
            |done| sink(ScanEvent::Progress { phase: "check", done, total: n, found: n }),
        );
        // 멈춤으로 확인하지 못한 장비도 «끝» 으로(화면에 «확인 중» 이 남지 않게)
        for s in slots {
            let mut h = s.into_inner().unwrap_or_else(|e| e.into_inner());
            if !h.done {
                h.done = true;
                sink(ScanEvent::Host { host: h });
            }
        }
    } else {
        for mut h in list {
            h.done = true;
            sink(ScanEvent::Host { host: h });
        }
    }
    sink(ScanEvent::Done { found: nfound.load(Ordering::Relaxed), total, ms: t0.elapsed().as_millis() as u64, cancelled: cancel.load(Ordering::Relaxed) });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 이 PC(127.0.0.1)만 찾기 — 핑 없이도 «이 PC» 로 잡히고, 연 포트가 보인다
    #[test]
    fn finds_self_and_open_port() {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        let events = Arc::new(Mutex::new(Vec::new()));
        let ev2 = events.clone();
        let cfg = ScanConfig {
            range: "127.0.0.1".into(),
            nic_ip: Some("127.0.0.1".into()),
            ping: false,
            arp: true,
            timeout_ms: 300,
            ports: vec![port],
            port_timeout_ms: 500,
            names: false,
            modbus_id: false,
            threads: 4,
        };
        let (mut scan, total) = start(cfg, Arc::new(move |e| ev2.lock().unwrap().push(e))).unwrap();
        assert_eq!(total, 1);
        scan.thread.take().unwrap().join().unwrap();
        let ev = events.lock().unwrap();
        let last_host = ev.iter().rev().find_map(|e| if let ScanEvent::Host { host } = e { Some(host.clone()) } else { None }).unwrap();
        assert!(last_host.me && last_host.done);
        assert_eq!(last_host.ports, vec![port]);
        assert!(matches!(ev.last(), Some(ScanEvent::Done { found: 1, total: 1, cancelled: false, .. })));
    }

    /// 핑 기다림은 50ms~10초 — 아주 큰 값이면 장비 하나마다 몇 시간씩 걸려 취소도 늦었다
    #[test]
    fn ping_timeout_is_capped() {
        assert_eq!(ping_timeout(u32::MAX), 10_000);
        assert_eq!(ping_timeout(0), 50);
        assert_eq!(ping_timeout(300), 300);
    }

    #[test]
    fn rejects_bad_config() {
        let base = ScanConfig { range: "10.0.0.0/16".into(), nic_ip: None, ping: true, arp: false, timeout_ms: 100, ports: vec![], port_timeout_ms: 100, names: false, modbus_id: false, threads: 1 };
        assert!(start(base.clone(), Arc::new(|_| {})).is_err()); // 4096 넘음
        assert!(start(ScanConfig { range: "10.0.0.1".into(), ping: false, ..base.clone() }, Arc::new(|_| {})).is_err());
        assert!(start(ScanConfig { range: "10.0.0.1".into(), nic_ip: Some("x".into()), ..base }, Arc::new(|_| {})).is_err());
    }

    /// 실제 네트워크에서 찾기(기본으로는 돌리지 않는다). 범위·랜카드는 환경 변수로:
    /// PD_RANGE=192.168.0.1-20 PD_NIC=192.168.0.5 cargo test -p portdock-netscan live_scan -- --ignored --nocapture
    #[test]
    #[ignore]
    fn live_scan() {
        let range = std::env::var("PD_RANGE").expect("PD_RANGE");
        let nic = std::env::var("PD_NIC").ok();
        let cfg = ScanConfig { range, nic_ip: nic, ping: true, arp: true, timeout_ms: 800, ports: vec![21, 23, 80, 102, 443, 502, 1883, 2004, 4840, 5000, 5025, 44818], port_timeout_ms: 400, names: true, modbus_id: true, threads: 64 };
        let (mut scan, total) = start(cfg, Arc::new(|e| if !matches!(e, ScanEvent::Progress { .. }) { println!("{e:?}") })).unwrap();
        println!("total {total}");
        scan.thread.take().unwrap().join().unwrap();
    }
}
