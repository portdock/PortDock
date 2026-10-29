//! Wi-Fi·인터넷 끊김·지연 기록기 — 사용자가 «기록 시작» 을 누른 동안만, 정한 두 곳에 핑을 나란히 보낸다.
//! - 게이트웨이: 인터넷 대상으로 가는 길의 다음 홉(GetBestRoute — 보통 공유기). 연결이 끊겨 길이 없어지면 마지막 게이트웨이에 계속 보낸다(손실로 보이게)
//! - 인터넷 대상: 사용자가 정한 주소 하나(기본 1.1.1.1). 이름이면 시작할 때 한 번만 푼다
//! - DNS: 사용자가 정한 이름 하나를 DNS_INTERVAL 마다 묻는다(캐시를 건너뛴다). 빈 이름이면 묻지 않는다
//! - Wi-Fi 연결·끊김: WLAN-AutoConfig 로그(8001·8003)를 WIFI_POLL 마다 읽는다 — 이유 코드·문구만
//!
//! 상한: 핑은 대상마다 1초에 한 번 이하(MIN_INTERVAL_MS), 한 번 기록은 MAX_DURATION 뒤 저절로 멈춘다(핑 횟수 상한).
//! 대상을 훑거나 늘리지 않는다 — 보내는 곳은 위 둘(과 DNS 서버)뿐이다.

use portdock_core::ping::{self, Pinger};
use portdock_core::portinfo;
use portdock_core::tr;
use serde::{Deserialize, Serialize};
use std::net::{Ipv4Addr, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// 핑 간격 하한 — 대상마다 1초에 한 번
pub const MIN_INTERVAL_MS: u32 = 1000;
pub const MAX_INTERVAL_MS: u32 = 60_000;
/// 한 번 기록의 길이 상한 — 24시간(1초 간격이면 대상마다 86,400번)
pub const MAX_DURATION: Duration = Duration::from_secs(24 * 3600);
const DNS_INTERVAL: Duration = Duration::from_secs(5);
const WIFI_POLL: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecConfig {
    /// 인터넷 대상 — IPv4 주소 또는 이름
    pub target: String,
    /// DNS 응답 시간을 잴 이름. 빈 글이면 재지 않는다
    #[serde(default)]
    pub dns_name: String,
    #[serde(default = "default_interval")]
    pub interval_ms: u32,
}

fn default_interval() -> u32 {
    MIN_INTERVAL_MS
}

/// 화면으로 가는 사건. 시간(ms)은 응답 시간, -1 = 응답 없음(손실), null = 이번에 재지 않음
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum RecEvent {
    #[serde(rename_all = "camelCase")]
    Started { ts: u64, gateway: Option<String>, target: String, dns_name: String, interval_ms: u32 },
    Tick { ts: u64, gw: Option<i32>, net: Option<i32>, dns: Option<i32> },
    /// 게이트웨이가 바뀜(다른 공유기·다시 연결)
    Gateway { ts: u64, ip: String },
    /// Windows 가 남긴 Wi-Fi 연결·끊김(이유 코드·문구만)
    Wifi { ts: u64, connected: bool, code: Option<u32>, reason: Option<String> },
    Note { message: String },
    /// «user» 사용자가 멈춤 · «limit» 길이 상한
    Stopped { ts: u64, reason: &'static str },
}

pub type Sink = Arc<dyn Fn(RecEvent) + Send + Sync>;

/// 인터넷 대상 글 → 주소. 이름이면 한 번 풀어 첫 IPv4. 0.0.0.0·브로드캐스트·멀티캐스트는 받지 않는다
pub fn resolve_target(s: &str) -> Result<Ipv4Addr, String> {
    let s = s.trim();
    let ip = match s.parse::<Ipv4Addr>() {
        Ok(ip) => ip,
        Err(_) if ping::valid_dns_name(s) => (s, 0)
            .to_socket_addrs()
            .map_err(|e| format!("{s}: {e}"))?
            .find_map(|a| match a.ip() {
                std::net::IpAddr::V4(v) => Some(v),
                _ => None,
            })
            .ok_or_else(|| format!("{s}: {}", tr!("IPv4 주소를 찾지 못했습니다", "no IPv4 address found")))?,
        Err(_) => return Err(format!("{s}: {}", tr!("IPv4 주소나 이름이 아닙니다", "not an IPv4 address or host name"))),
    };
    if ip.is_unspecified() || ip.is_broadcast() || ip.is_multicast() {
        return Err(format!("{ip}: {}", tr!("핑을 보낼 수 없는 주소입니다", "cannot ping this address")));
    }
    Ok(ip)
}

/// 간격 — 1초~60초로 맞춘다
pub fn clamp_interval(ms: u32) -> u32 {
    ms.clamp(MIN_INTERVAL_MS, MAX_INTERVAL_MS)
}

/// 응답(ms) 또는 손실(-1)
fn rtt(r: Option<u32>) -> i32 {
    r.map_or(-1, |v| v.min(i32::MAX as u32) as i32)
}

fn now_ms() -> u64 {
    portdock_core::event::now_ms()
}

/// 돌고 있는 기록 — stop 하거나 버리면 멈춘다
pub struct Recorder {
    stop: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl Recorder {
    pub fn running(&self) -> bool {
        self.thread.as_ref().is_some_and(|t| !t.is_finished())
    }

    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

impl Drop for Recorder {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn start(cfg: RecConfig, sink: Sink) -> Result<Recorder, String> {
    let target = resolve_target(&cfg.target)?;
    let dns_name = cfg.dns_name.trim().trim_end_matches('.').to_string();
    if !dns_name.is_empty() && !ping::valid_dns_name(&dns_name) {
        return Err(format!("{dns_name}: {}", tr!("DNS 이름이 아닙니다", "not a DNS name")));
    }
    let interval = clamp_interval(cfg.interval_ms);
    // 손잡이를 먼저 만들어 본다 — 못 만들면 시작하지 않는다
    let pg = Pinger::new()?;
    let pn = Pinger::new()?;
    let stop = Arc::new(AtomicBool::new(false));
    let st = stop.clone();
    let thread = std::thread::Builder::new()
        .name("hw-rec".into())
        .spawn(move || run(target, dns_name, interval, pg, pn, &st, &*sink))
        .map_err(|e| e.to_string())?;
    Ok(Recorder { stop, thread: Some(thread) })
}

/// 멈춤 표시를 보며 잔다(짧게 나눠)
fn nap(stop: &AtomicBool, until: Instant) {
    while !stop.load(Ordering::SeqCst) {
        let left = until.saturating_duration_since(Instant::now());
        if left.is_zero() {
            return;
        }
        std::thread::sleep(left.min(Duration::from_millis(50)));
    }
}

fn run(target: Ipv4Addr, dns_name: String, interval: u32, pg: Pinger, pn: Pinger, stop: &AtomicBool, sink: &(dyn Fn(RecEvent) + Send + Sync)) {
    let started = Instant::now();
    let start_ms = now_ms();
    let mut gateway = ping::next_hop(target);
    sink(RecEvent::Started { ts: start_ms, gateway: gateway.map(|g| g.to_string()), target: target.to_string(), dns_name: dns_name.clone(), interval_ms: interval });
    if gateway.is_none() {
        sink(RecEvent::Note { message: tr!("게이트웨이를 찾지 못했습니다(연결 없음 또는 같은 대역) — 인터넷 대상만 잽니다", "No gateway found (not connected or same subnet) — measuring the internet target only").into() });
    }
    // 핑 손잡이는 스레드로 넘겼다가 돌려받는다(손잡이는 한 번에 한 스레드만 쓴다)
    let (mut pg, mut pn) = (Some(pg), Some(pn));
    let timeout = (interval - 100).min(2000);
    // DNS 는 따로 — 응답이 몇 초 걸려도 핑 박자를 늦추지 않는다. 이전 질의가 끝나지 않았으면 이번 차례는 건너뛴다
    let dns_busy = Arc::new(AtomicBool::new(false));
    let dns_result: Arc<Mutex<Option<i32>>> = Arc::new(Mutex::new(None));
    let mut next_dns = Instant::now();
    let mut next_wifi = Instant::now() + WIFI_POLL;
    let mut wifi_seen: Vec<(u64, bool)> = Vec::new();
    let mut wifi_note = false;
    let mut next = Instant::now();
    let mut reason = "user";
    while !stop.load(Ordering::SeqCst) {
        if started.elapsed() >= MAX_DURATION {
            reason = "limit";
            break;
        }
        let tick_at = Instant::now();
        if !dns_name.is_empty() && tick_at >= next_dns && !dns_busy.swap(true, Ordering::SeqCst) {
            next_dns = tick_at + DNS_INTERVAL;
            let (name, busy, out) = (dns_name.clone(), dns_busy.clone(), dns_result.clone());
            std::thread::spawn(move || {
                let r = ping::dns_time(&name).map_or(-1, |ms| ms.min(i32::MAX as u32) as i32);
                *out.lock().unwrap_or_else(|e| e.into_inner()) = Some(r);
                busy.store(false, Ordering::SeqCst);
            });
        }
        // 다시 연결되며 게이트웨이가 바뀌었는지(길이 없으면 마지막 게이트웨이 그대로)
        if let Some(g) = ping::next_hop(target)
            && Some(g) != gateway
        {
            gateway = Some(g);
            sink(RecEvent::Gateway { ts: now_ms(), ip: g.to_string() });
        }
        let ts = now_ms();
        let (gw, net) = std::thread::scope(|s| {
            let a = gateway.and_then(|g| {
                let p = pg.take()?;
                Some(s.spawn(move || {
                    let r = p.ping(g, timeout);
                    (p, r)
                }))
            });
            let b = pn.take().map(|p| {
                s.spawn(move || {
                    let r = p.ping(target, timeout);
                    (p, r)
                })
            });
            let mut out = (None, None);
            if let Some(h) = a
                && let Ok((p, r)) = h.join()
            {
                pg = Some(p);
                out.0 = Some(rtt(r));
            }
            if let Some(h) = b
                && let Ok((p, r)) = h.join()
            {
                pn = Some(p);
                out.1 = Some(rtt(r));
            }
            out
        });
        let dns = dns_result.lock().unwrap_or_else(|e| e.into_inner()).take();
        sink(RecEvent::Tick { ts, gw, net, dns });
        if Instant::now() >= next_wifi {
            next_wifi = Instant::now() + WIFI_POLL;
            // 시작 1분 전부터 — 시작 직전의 끊김도 보이게
            let within = now_ms().saturating_sub(start_ms) + 60_000;
            match portinfo::wlan_events(within) {
                Ok(list) => {
                    for e in list {
                        if e.time + 60_000 < start_ms || wifi_seen.contains(&(e.time, e.connected)) {
                            continue;
                        }
                        wifi_seen.push((e.time, e.connected));
                        sink(RecEvent::Wifi { ts: e.time, connected: e.connected, code: e.code, reason: e.reason });
                    }
                }
                Err(e) if !wifi_note => {
                    wifi_note = true;
                    sink(RecEvent::Note { message: format!("{}: {e}", tr!("Wi-Fi 연결 기록(WLAN-AutoConfig)을 읽지 못함", "Could not read the Wi-Fi log (WLAN-AutoConfig)")) });
                }
                Err(_) => {}
            }
        }
        next += Duration::from_millis(u64::from(interval));
        // 늦어졌으면(절전에서 깨어남 등) 박자를 지금으로 맞춘다 — 밀린 핑을 몰아 보내지 않는다
        if next < Instant::now() {
            next = Instant::now() + Duration::from_millis(u64::from(interval));
        }
        nap(stop, next);
    }
    sink(RecEvent::Stopped { ts: now_ms(), reason });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn targets() {
        assert_eq!(resolve_target(" 1.1.1.1 ").unwrap(), Ipv4Addr::new(1, 1, 1, 1));
        assert_eq!(resolve_target("127.0.0.1").unwrap(), Ipv4Addr::LOCALHOST);
        assert!(resolve_target("0.0.0.0").is_err());
        assert!(resolve_target("255.255.255.255").is_err());
        assert!(resolve_target("224.0.0.1").is_err());
        assert!(resolve_target("not a host").is_err());
        assert!(resolve_target("").is_err());
        assert_eq!((clamp_interval(10), clamp_interval(5000), clamp_interval(u32::MAX)), (1000, 5000, 60_000));
        assert_eq!((rtt(Some(12)), rtt(None)), (12, -1));
    }

    #[test]
    fn bad_dns_name_does_not_start() {
        let sink: Sink = Arc::new(|_| {});
        let r = start(RecConfig { target: "127.0.0.1".into(), dns_name: "bad name".into(), interval_ms: 1000 }, sink);
        assert!(r.is_err());
    }

    /// 127.0.0.1 만 — 게이트웨이를 거치지 않으니 게이트웨이 핑도 없다. DNS 도 묻지 않는다(빈 이름).
    /// ICMP 가 막힌 러너가 있을 수 있어 응답(-1/ms)은 단정하지 않고 사건 모양·박자·멈춤만 본다
    #[test]
    fn loopback_record() {
        let got: Arc<Mutex<Vec<RecEvent>>> = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let sink: Sink = Arc::new(move |e| g.lock().unwrap().push(e));
        let Ok(mut r) = start(RecConfig { target: "127.0.0.1".into(), dns_name: String::new(), interval_ms: 200 }, sink) else {
            eprintln!("ICMP 손잡이를 만들지 못함 — 건너뜀");
            return;
        };
        std::thread::sleep(Duration::from_millis(1600));
        assert!(r.running());
        r.stop();
        assert!(!r.running());
        let ev = got.lock().unwrap().clone();
        match &ev[0] {
            RecEvent::Started { gateway, target, interval_ms, .. } => {
                assert_eq!((gateway.as_deref(), target.as_str(), *interval_ms), (None, "127.0.0.1", 1000), "간격은 1초 아래로 내려가지 않는다");
            }
            e => panic!("{e:?}"),
        }
        let ticks: Vec<_> = ev.iter().filter_map(|e| if let RecEvent::Tick { gw, net, dns, .. } = e { Some((*gw, *net, *dns)) } else { None }).collect();
        // 1.6초 / 1초 간격 → 2번(첫 박자는 바로)
        assert!((1..=3).contains(&ticks.len()), "{ticks:?}");
        assert!(ticks.iter().all(|(gw, net, dns)| gw.is_none() && dns.is_none() && net.is_some_and(|v| v >= -1)));
        assert!(matches!(ev.last(), Some(RecEvent::Stopped { reason: "user", .. })));
        // 화면이 받는 모양
        let v = serde_json::to_value(&ev[0]).unwrap();
        assert_eq!(v["type"], "started");
        assert!(v.get("dnsName").is_some() && v.get("intervalMs").is_some());
    }
}
