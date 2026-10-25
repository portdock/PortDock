//! 장기 핑 감시 — 정한 장비들을 정한 간격으로 핑하고, 결과를 화면에 보내며 CSV 로 남긴다.
//! CSV: time,host,ip,result,rtt_ms,event — result 는 ok/timeout, event 는 상태가 바뀐 줄에만 down/up.
//! 며칠씩 돌려도 한 파일이 끝없이 커지지 않게 `CSV_PART_BYTES` 를 넘으면 «이름-2.csv», «이름-3.csv» … 로 이어 쓴다.

use crate::win;
use portdock_core::tr;
use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write};
use std::net::{Ipv4Addr, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

pub const MAX_TARGETS: usize = 64;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorConfig {
    pub hosts: Vec<String>,
    pub interval_ms: u32,
    pub timeout_ms: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Target {
    pub host: String,
    pub ip: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub host: String,
    pub rtt: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MonitorEvent {
    /// 한 바퀴 — ts 는 유닉스 ms
    Tick { ts: i64, samples: Vec<Sample> },
    Error { message: String },
}

pub type Sink = Arc<dyn Fn(MonitorEvent) + Send + Sync>;

type Log = Arc<Mutex<Option<CsvLog>>>;

/// CSV 한 파일의 크기 상한 — 넘으면 다음 조각 파일로(엑셀이 한 번에 여는 정도)
pub const CSV_PART_BYTES: u64 = 100 * 1024 * 1024;

/// 크기로 나눠 쓰는 CSV 기록
pub struct CsvLog {
    base: String,
    part: u32,
    limit: u64,
    w: BufWriter<File>,
    bytes: u64,
}

/// 조각 파일 이름 — «m.csv» 의 2번째는 «m-2.csv»
pub fn part_path(base: &str, part: u32) -> String {
    // 구분자(\ 나 /)는 사용자가 준 그대로 둔다 — 파일 이름 안의 마지막 점 앞에 «-N»
    let name_at = base.rfind(['/', '\\']).map_or(0, |i| i + 1);
    match base[name_at..].rfind('.').filter(|&d| d > 0) {
        Some(d) => format!("{}-{part}{}", &base[..name_at + d], &base[name_at + d..]),
        None => format!("{base}-{part}"),
    }
}

impl CsvLog {
    pub fn open(path: &str, limit: u64) -> Result<Self, String> {
        let (w, bytes) = open_csv(path)?;
        Ok(Self { base: path.to_string(), part: 1, limit: limit.max(1), w, bytes })
    }

    /// 한 바퀴의 줄들 — 쓰기 전에 상한을 넘었으면 다음 조각으로(한 바퀴는 한 파일에)
    pub fn write_lines(&mut self, lines: &[String]) -> std::io::Result<()> {
        if self.bytes >= self.limit {
            let next = part_path(&self.base, self.part + 1);
            let _ = self.w.flush();
            let (w, bytes) = open_csv(&next).map_err(std::io::Error::other)?;
            self.w = w;
            self.bytes = bytes;
            self.part += 1;
        }
        for l in lines {
            writeln!(self.w, "{l}")?;
            self.bytes += l.len() as u64 + 1;
        }
        self.w.flush()
    }

    fn flush(&mut self) {
        let _ = self.w.flush();
    }
}

pub struct Monitor {
    stop: Arc<AtomicBool>,
    log: Log,
    thread: Option<JoinHandle<()>>,
}

impl Monitor {
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
        if let Some(mut f) = self.log.lock().unwrap_or_else(|e| e.into_inner()).take() {
            f.flush();
        }
    }

    /// CSV 기록 켜기(경로)·끄기(None)
    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        let mut g = self.log.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(mut f) = g.take() {
            f.flush();
        }
        if let Some(p) = path {
            *g = Some(CsvLog::open(&p, CSV_PART_BYTES)?);
        }
        Ok(())
    }
}

impl Drop for Monitor {
    fn drop(&mut self) {
        self.stop();
    }
}

pub const CSV_HEADER: &str = "time,host,ip,result,rtt_ms,event";

/// 이어 쓰기로 연다 — 새 파일이면 머리줄부터. (쓰개, 지금 크기)
fn open_csv(path: &str) -> Result<(BufWriter<File>, u64), String> {
    let f = OpenOptions::new().create(true).append(true).open(path).map_err(|e| format!("{path}: {e}"))?;
    let len = f.metadata().map(|m| m.len()).unwrap_or(0);
    let mut w = BufWriter::new(f);
    if len == 0 {
        // 엑셀이 UTF-8 로 읽게 BOM
        w.write_all(b"\xEF\xBB\xBF").and_then(|_| writeln!(w, "{CSV_HEADER}")).map_err(|e| format!("{path}: {e}"))?;
        return Ok((w, 3 + CSV_HEADER.len() as u64 + 1));
    }
    Ok((w, len))
}

/// CSV 한 줄 — 쉼표·따옴표가 든 이름은 따옴표로
pub fn csv_line(time: &str, t: &Target, rtt: Option<u32>, event: &str) -> String {
    let q = |s: &str| if s.contains([',', '"', '\n']) { format!("\"{}\"", s.replace('"', "\"\"")) } else { s.to_string() };
    let (res, ms) = match rtt {
        Some(ms) => ("ok", ms.to_string()),
        None => ("timeout", String::new()),
    };
    format!("{time},{},{},{res},{ms},{event}", q(&t.host), t.ip)
}

/// 이름·주소 → IPv4. 이름은 처음 한 번만 찾는다
pub fn resolve(host: &str) -> Result<Ipv4Addr, String> {
    let h = host.trim();
    if let Ok(ip) = h.parse::<Ipv4Addr>() {
        return Ok(ip);
    }
    (h, 0u16)
        .to_socket_addrs()
        .ok()
        .and_then(|mut it| it.find_map(|a| if let std::net::SocketAddr::V4(v) = a { Some(*v.ip()) } else { None }))
        .ok_or_else(|| format!("{}: «{h}»", tr!("주소를 찾지 못했습니다", "Address not found")))
}

pub fn start(cfg: MonitorConfig, sink: Sink) -> Result<(Monitor, Vec<Target>), String> {
    if cfg.hosts.is_empty() {
        return Err(tr!("감시할 장비를 추가하세요", "Add a host to monitor").into());
    }
    if cfg.hosts.len() > MAX_TARGETS {
        return Err(format!("{} ({MAX_TARGETS})", tr!("감시할 장비가 너무 많습니다", "Too many hosts to monitor")));
    }
    win::Pinger::new()?;
    let mut targets = Vec::new();
    let mut bad = Vec::new();
    for h in &cfg.hosts {
        match resolve(h) {
            Ok(ip) => targets.push(Target { host: h.trim().to_string(), ip: ip.to_string() }),
            Err(e) => bad.push(e),
        }
    }
    if !bad.is_empty() {
        return Err(bad.join(" · "));
    }
    let interval = Duration::from_millis(u64::from(cfg.interval_ms.clamp(500, 3_600_000)));
    let timeout = cfg.timeout_ms.clamp(100, 10_000).min(interval.as_millis() as u32);
    let stop = Arc::new(AtomicBool::new(false));
    let log: Log = Arc::new(Mutex::new(None));
    let (s2, l2, t2) = (stop.clone(), log.clone(), targets.clone());
    let thread = std::thread::Builder::new().name("netscan-monitor".into()).spawn(move || run(t2, interval, timeout, s2, l2, sink)).map_err(|e| e.to_string())?;
    Ok((Monitor { stop, log, thread: Some(thread) }, targets))
}

fn run(targets: Vec<Target>, interval: Duration, timeout: u32, stop: Arc<AtomicBool>, log: Log, sink: Sink) {
    let ips: Vec<Ipv4Addr> = targets.iter().map(|t| t.ip.parse().unwrap_or(Ipv4Addr::UNSPECIFIED)).collect();
    let mut last: Vec<Option<bool>> = vec![None; targets.len()];
    let mut next = Instant::now();
    while !stop.load(Ordering::Relaxed) {
        let now = chrono::Local::now();
        // 장비마다 동시에 — 하나가 안 답해도 다른 장비의 시각이 밀리지 않게
        let rtts: Vec<Option<u32>> = std::thread::scope(|s| {
            let hs: Vec<_> = ips.iter().map(|ip| s.spawn(move || win::Pinger::new().ok().and_then(|p| p.ping(*ip, timeout)))).collect();
            hs.into_iter().map(|h| h.join().unwrap_or(None)).collect()
        });
        if stop.load(Ordering::Relaxed) {
            break;
        }
        {
            let mut g = log.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(w) = g.as_mut() {
                let time = now.format("%Y-%m-%d %H:%M:%S%.3f").to_string();
                let lines: Vec<String> = targets
                    .iter()
                    .enumerate()
                    .map(|(i, t)| {
                        let up = rtts[i].is_some();
                        let event = match last[i] {
                            Some(true) if !up => "down",
                            Some(false) if up => "up",
                            _ => "",
                        };
                        csv_line(&time, t, rtts[i], event)
                    })
                    .collect();
                if let Err(e) = w.write_lines(&lines) {
                    *g = None;
                    sink(MonitorEvent::Error { message: format!("{}: {e}", tr!("CSV 기록을 멈췄습니다", "CSV logging stopped")) });
                }
            }
        }
        for (i, r) in rtts.iter().enumerate() {
            last[i] = Some(r.is_some());
        }
        sink(MonitorEvent::Tick { ts: now.timestamp_millis(), samples: targets.iter().zip(&rtts).map(|(t, r)| Sample { host: t.host.clone(), rtt: *r }).collect() });
        next += interval;
        // 밀렸으면(절전 등) 따라잡지 않고 지금부터 다시
        let now_i = Instant::now();
        if next < now_i {
            next = now_i;
        }
        while !stop.load(Ordering::Relaxed) && Instant::now() < next {
            std::thread::sleep((next - Instant::now()).min(Duration::from_millis(100)));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_lines() {
        let t = Target { host: "plc-1".into(), ip: "192.168.0.10".into() };
        assert_eq!(csv_line("2026-10-18 08:00:00.000", &t, Some(3), ""), "2026-10-18 08:00:00.000,plc-1,192.168.0.10,ok,3,");
        assert_eq!(csv_line("T", &t, None, "down"), "T,plc-1,192.168.0.10,timeout,,down");
        let q = Target { host: "a,\"b\"".into(), ip: "1.2.3.4".into() };
        assert_eq!(csv_line("T", &q, Some(1), "up"), "T,\"a,\"\"b\"\"\",1.2.3.4,ok,1,up");
    }

    #[test]
    fn resolve_ip_and_errors() {
        assert_eq!(resolve(" 10.1.2.3 ").unwrap(), Ipv4Addr::new(10, 1, 2, 3));
        assert_eq!(resolve("localhost").unwrap(), Ipv4Addr::LOCALHOST);
        assert!(resolve("no-such-host.invalid").is_err());
    }

    #[test]
    fn csv_file_gets_header_once() {
        let dir = std::env::temp_dir().join(format!("pd-netscan-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("m.csv");
        let _ = std::fs::remove_file(&p);
        let ps = p.to_string_lossy().to_string();
        drop(open_csv(&ps).unwrap());
        let (_, len) = open_csv(&ps).unwrap();
        assert_eq!(len, std::fs::metadata(&p).unwrap().len(), "size counted on reopen");
        let text = std::fs::read_to_string(&p).unwrap();
        assert_eq!(text.matches(CSV_HEADER).count(), 1);
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// 오래 돌려도 한 파일이 끝없이 커지지 않게 — 크기 상한을 넘으면 «이름-2.csv» 로 이어 쓴다(새 파일도 머리줄부터)
    #[test]
    fn csv_rolls_over_by_size() {
        let dir = std::env::temp_dir().join(format!("pd-netscan-roll-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("m.csv");
        let ps = p.to_string_lossy().to_string();
        let mut log = CsvLog::open(&ps, 200).unwrap();
        let t = Target { host: "plc-1".into(), ip: "192.168.0.10".into() };
        for _ in 0..10 {
            log.write_lines(&[csv_line("2026-10-18 08:00:00.000", &t, Some(3), "")]).unwrap();
        }
        drop(log);
        let first = std::fs::read_to_string(&p).unwrap();
        assert!(first.len() <= 200 + 80, "first part capped: {}", first.len());
        let second = std::fs::read_to_string(dir.join("m-2.csv")).unwrap();
        assert!(second.contains(CSV_HEADER));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn part_names() {
        assert_eq!(part_path("C:/x/m.csv", 2), "C:/x/m-2.csv");
        assert_eq!(part_path("m", 3), "m-3");
        assert_eq!(part_path("d.ir/m", 2), "d.ir/m-2");
        assert_eq!(part_path("C:\\logs\\ping.csv", 4), "C:\\logs\\ping-4.csv");
        assert_eq!(part_path(".csv", 2), ".csv-2");
    }
}
