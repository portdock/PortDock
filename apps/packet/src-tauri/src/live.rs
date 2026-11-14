//! 실시간 캡처(M3) — Windows 내장 Packet Monitor 로 받은 프레임을 임시 pcapng 에 쓰고, 화면은 그 파일을 주기적으로 다시 열어 갱신한다.
//! 읽기·듣기만 한다 — 패킷을 만들어 보내지 않는다. 캡처 엔진은 crates/capture.

use portdock_capture::pcapng::{PacketDir, PcapngWriter};
use portdock_capture::{CaptureFilter, CaptureSession, Direction, Frame, SourceScope, StartOptions};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::BufWriter;
use std::net::IpAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;

struct W {
    w: PcapngWriter<BufWriter<File>>,
    ifaces: HashMap<(u16, u16), u32>,
    frames: u64,
    written: u64,
    skipped: u64,
    err: Option<String>,
}

pub struct Live {
    session: Option<CaptureSession>,
    w: Arc<Mutex<W>>,
    pub path: PathBuf,
    started: Instant,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct StartDto {
    /// "nic"(네트워크 어댑터만, 중복 적음) · "all"(스택 전체 — 중복은 줄여서)
    pub scope: String,
    /// 어댑터 이름에 들어 있는 글자(비면 전부)
    pub adapter: String,
    pub ip: String,
    pub port: Option<u16>,
    /// "tcp" · "udp" · "icmp" · ""(전부)
    pub proto: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdapterDto {
    pub name: String,
    pub description: String,
    pub mac: String,
    pub ips: Vec<String>,
    pub up: bool,
    pub wireless: bool,
    pub loopback: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapEnv {
    pub elevated: bool,
    pub adapters: Vec<AdapterDto>,
    pub error: Option<String>,
}

#[derive(Serialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveStats {
    pub running: bool,
    pub frames: u64,
    pub written: u64,
    pub secs: u64,
    pub error: Option<String>,
    pub path: String,
}

pub fn env() -> CapEnv {
    let elevated = portdock_capture::is_elevated();
    match portdock_capture::list_adapters() {
        Ok(v) => CapEnv {
            elevated,
            adapters: v
                .into_iter()
                .map(|a| AdapterDto {
                    mac: a.mac.as_ref().map(portdock_capture::adapters::fmt_mac).unwrap_or_default(),
                    ips: a.ips.iter().map(|i| i.to_string()).collect(),
                    name: a.name,
                    description: a.description,
                    up: a.up,
                    wireless: a.wireless,
                    loopback: a.loopback,
                })
                .collect(),
            error: None,
        },
        Err(e) => CapEnv { elevated, adapters: Vec::new(), error: Some(e) },
    }
}

fn on_frame(st: &Mutex<W>, f: Frame) {
    let Ok(mut s) = st.lock() else { return };
    s.frames += 1;
    let Some(lt) = f.link.pcap_linktype() else {
        s.skipped += 1;
        return;
    };
    let name = if f.interface.is_empty() { format!("#{}", f.component_id) } else { f.interface.clone() };
    let id = match s.ifaces.get(&(lt, f.component_id)) {
        Some(&i) => i,
        None => match s.w.add_interface(&name, lt) {
            Ok(i) => {
                s.ifaces.insert((lt, f.component_id), i);
                i
            }
            Err(e) => {
                s.err = Some(e.to_string());
                return;
            }
        },
    };
    let dir = match f.direction {
        Direction::Unknown => PacketDir::Unknown,
        Direction::In => PacketDir::Inbound,
        Direction::Out => PacketDir::Outbound,
    };
    match s.w.write_packet(id, f.timestamp_ns, &f.data, f.data.len() as u32, dir) {
        Ok(()) => s.written += 1,
        Err(e) => s.err = Some(e.to_string()),
    }
}

fn filter_of(o: &StartDto) -> Result<Vec<CaptureFilter>, String> {
    let ip = o.ip.trim();
    let ip1 = if ip.is_empty() { None } else { Some(ip.parse::<IpAddr>().map_err(|_| portdock_core::tr!("IP 주소 모양이 아닙니다", "Not a valid IP address").to_string())?) };
    let protocol = match o.proto.as_str() {
        "tcp" => Some(6),
        "udp" => Some(17),
        "icmp" => Some(1),
        _ => None,
    };
    let f = CaptureFilter { ip1, port1: o.port, protocol, ..Default::default() };
    Ok(if f.is_empty() { Vec::new() } else { vec![f] })
}

pub fn start(o: &StartDto) -> Result<Live, String> {
    let dir = std::env::temp_dir().join("portdock-packet");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let path = dir.join(format!("capture-{stamp}.pcapng"));
    let file = File::create(&path).map_err(|e| e.to_string())?;
    let w = PcapngWriter::new(BufWriter::new(file), "PortDock Packet").map_err(|e| e.to_string())?;
    let st = Arc::new(Mutex::new(W { w, ifaces: HashMap::new(), frames: 0, written: 0, skipped: 0, err: None }));
    let all = o.scope == "all";
    let opts = StartOptions {
        scope: if all { SourceScope::All } else { SourceScope::NetworkInterfaces },
        name_contains: if o.adapter.trim().is_empty() { Vec::new() } else { vec![o.adapter.trim().to_string()] },
        filters: filter_of(o)?,
        dedup_appearances: all,
        ..Default::default()
    };
    let st2 = st.clone();
    let session = portdock_capture::start(&opts, move |f| on_frame(&st2, f)).map_err(|e| e.to_string())?;
    Ok(Live { session: Some(session), w: st, path, started: Instant::now() })
}

impl Live {
    /// 디스크에 내려 쓴다 — 다시 열기 전에 부른다
    pub fn flush(&self) {
        if let Ok(mut s) = self.w.lock() {
            let _ = s.w.flush();
        }
    }

    pub fn stats(&self) -> LiveStats {
        let s = self.w.lock().unwrap_or_else(|e| e.into_inner());
        LiveStats { running: self.session.is_some(), frames: s.frames, written: s.written, secs: self.started.elapsed().as_secs(), error: s.err.clone(), path: self.path.to_string_lossy().into_owned() }
    }

    pub fn stop(&mut self) -> LiveStats {
        if let Some(mut s) = self.session.take() {
            s.stop();
        }
        self.flush();
        let mut st = self.stats();
        st.running = false;
        st
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filter_text_checks() {
        assert!(filter_of(&StartDto::default()).unwrap().is_empty());
        let f = filter_of(&StartDto { ip: "192.168.0.10".into(), port: Some(502), proto: "tcp".into(), ..Default::default() }).unwrap();
        assert_eq!(f.len(), 1);
        assert_eq!(f[0].port1, Some(502));
        assert_eq!(f[0].protocol, Some(6));
        assert!(filter_of(&StartDto { ip: "abc".into(), ..Default::default() }).is_err());
    }

    /// 관리자 권한이 필요한 실제 캡처 — `cargo test -p portdock-packet-app -- --ignored live_roundtrip` (관리자 터미널에서)
    #[test]
    #[ignore]
    fn live_roundtrip() {
        let mut l = start(&StartDto::default()).expect("start");
        for _ in 0..3 {
            let _ = std::process::Command::new("ping").args(["-n", "2", "1.1.1.1"]).output();
        }
        std::thread::sleep(std::time::Duration::from_secs(2));
        l.flush();
        let mid = l.stats();
        let st = l.stop();
        assert!(st.written > 0, "받은 패킷이 없다: {st:?}");
        assert!(st.written >= mid.written);
        let sess = portdock_packet::session::Session::open(&st.path, portdock_packet::dissect::Prefs::default()).expect("open");
        assert_eq!(sess.cap.len() as u64, st.written);
    }
}
