//! M0 확인용 — 어댑터 나열 → N 초 캡처 → pcapng 저장 → 프레임 수·프로토콜 통계.
//!
//! 사용: cargo run -p portdock-capture --example capture_probe -- [--seconds 10] [--out a.pcapng]
//!       [--all] [--dedup] [--ip 127.0.0.1] [--port 502] [--proto tcp|udp|icmp] [--name 글자]...
//!       [--list-sources [--hidden]] [--no-admin-check]
//! 관리자 권한으로 실행해야 캡처된다. 마지막 «RESULT» 줄은 스크립트가 읽는 한 줄 요약.

use portdock_capture::adapters::fmt_mac;
use portdock_capture::pcapng::{PacketDir, PcapngWriter};
use portdock_capture::{CaptureError, CaptureFilter, Direction, Frame, SourceScope, StartOptions, list_adapters, list_data_sources, start, summarize};
use std::collections::{BTreeMap, HashMap};
use std::fs::File;
use std::io::BufWriter;
use std::sync::{Arc, Mutex};
use std::time::Duration;

struct State {
    w: PcapngWriter<BufWriter<File>>,
    ifaces: HashMap<(u16, u16), u32>,
    frames: u64,
    written: u64,
    skipped_non_frame: u64,
    by_proto: BTreeMap<&'static str, u64>,
    by_dir: [u64; 3],
    by_iface: BTreeMap<String, u64>,
    loopback: u64,
    unparsable: u64,
    write_err: Option<String>,
}

fn on_frame(st: &Mutex<State>, f: Frame) {
    let Ok(mut s) = st.lock() else { return };
    s.frames += 1;
    let sum = summarize(&f);
    *s.by_proto.entry(sum.proto).or_default() += 1;
    s.by_dir[match f.direction {
        Direction::Unknown => 0,
        Direction::In => 1,
        Direction::Out => 2,
    }] += 1;
    let name = if f.interface.is_empty() { format!("#{}", f.component_id) } else { f.interface.clone() };
    *s.by_iface.entry(name.clone()).or_default() += 1;
    if matches!(sum.proto, "Other" | "Ethernet-other" | "Wi-Fi") && sum.src.is_none() {
        s.unparsable += 1;
    }
    if sum.src.is_some_and(|a| a.is_loopback()) || sum.dst.is_some_and(|a| a.is_loopback()) {
        s.loopback += 1;
    }
    let Some(lt) = f.link.pcap_linktype() else {
        s.skipped_non_frame += 1;
        return;
    };
    let id = match s.ifaces.get(&(lt, f.component_id)) {
        Some(&i) => i,
        None => match s.w.add_interface(&name, lt) {
            Ok(i) => {
                s.ifaces.insert((lt, f.component_id), i);
                i
            }
            Err(e) => {
                s.write_err = Some(e.to_string());
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
        Err(e) => s.write_err = Some(e.to_string()),
    }
}

fn main() {
    let mut seconds = 10u64;
    let mut out = String::from("capture_probe.pcapng");
    let mut opts = StartOptions::default();
    let mut flt = CaptureFilter::default();
    let mut list_sources = false;
    let mut hidden = false;
    let mut a = std::env::args().skip(1);
    while let Some(arg) = a.next() {
        let mut val = |what: &str| a.next().unwrap_or_else(|| die(&format!("{what} 값이 없습니다")));
        match arg.as_str() {
            "--seconds" => seconds = val("--seconds").parse().unwrap_or_else(|_| die("--seconds 는 숫자")),
            "--out" => out = val("--out"),
            "--all" => opts.scope = SourceScope::All,
            "--dedup" => opts.dedup_appearances = true,
            "--ip" => flt.ip1 = Some(val("--ip").parse().unwrap_or_else(|_| die("--ip 형식 오류"))),
            "--port" => flt.port1 = Some(val("--port").parse().unwrap_or_else(|_| die("--port 는 숫자"))),
            "--proto" => {
                flt.protocol = Some(match val("--proto").as_str() {
                    "tcp" => 6,
                    "udp" => 17,
                    "icmp" => 1,
                    _ => die("--proto 는 tcp|udp|icmp"),
                })
            }
            "--name" => opts.name_contains.push(val("--name")),
            "--list-sources" => list_sources = true,
            "--hidden" => hidden = true,
            "--no-admin-check" => opts.skip_admin_check = true,
            other => die(&format!("모르는 옵션 {other}")),
        }
    }
    if !flt.is_empty() {
        opts.filters.push(flt);
    }

    println!("== 어댑터 (GetAdaptersAddresses, 관리자 불필요)");
    match list_adapters() {
        Ok(v) => {
            for ad in v {
                let ips: Vec<String> = ad.ips.iter().map(|i| i.to_string()).collect();
                println!(
                    "  #{:<3} {:<28} {} {}{} {}",
                    ad.if_index,
                    ad.name,
                    ad.mac.map(|m| fmt_mac(&m)).unwrap_or_else(|| "-".into()),
                    if ad.up { "up  " } else { "down" },
                    if ad.loopback { " loopback" } else { "" },
                    ips.join(", ")
                );
            }
        }
        Err(e) => println!("  {e}"),
    }
    println!("관리자 권한: {}", if portdock_capture::is_elevated() { "예" } else { "아니오" });

    if list_sources {
        match list_data_sources(hidden) {
            Ok(v) => {
                println!("== PktMon 구성 요소 {}개", v.len());
                for d in v {
                    println!("  id={:<4} sec={:<4} parent={:<4} kind={} {} | {}", d.id, d.secondary_id, d.parent_id, d.kind, d.name, d.description);
                }
            }
            Err(e) => fail(&e),
        }
        return;
    }

    let file = File::create(&out).unwrap_or_else(|e| die(&format!("{out} 를 만들 수 없습니다: {e}")));
    let w = PcapngWriter::new(BufWriter::new(file), "PortDock Packet capture_probe").unwrap_or_else(|e| die(&e.to_string()));
    let st = Arc::new(Mutex::new(State {
        w,
        ifaces: HashMap::new(),
        frames: 0,
        written: 0,
        skipped_non_frame: 0,
        by_proto: BTreeMap::new(),
        by_dir: [0; 3],
        by_iface: BTreeMap::new(),
        loopback: 0,
        unparsable: 0,
        write_err: None,
    }));
    let st2 = Arc::clone(&st);
    println!("== 캡처 시작: {seconds}초, 범위 {:?}, 필터 {:?}", opts.scope, opts.filters);
    let mut session = match start(&opts, move |f| on_frame(&st2, f)) {
        Ok(s) => s,
        Err(e) => fail(&e),
    };
    println!("붙인 구성 요소 {}개", session.data_sources().len());
    for d in session.data_sources().iter().take(12) {
        println!("  id={} {}", d.id, d.name);
    }
    std::thread::sleep(Duration::from_secs(seconds));
    let stats = session.stop();
    let mut s = st.lock().unwrap_or_else(|e| e.into_inner());
    if let Err(e) = s.w.flush() {
        println!("저장 마무리 오류: {e}");
    }
    println!("== 결과");
    println!("레코드 {} (해석 실패 {}, 중복 제외 {}, PktMon 누락 쓰기 {}·읽기 {})", stats.records, stats.parse_errors, stats.dedup_skipped, stats.missed_write, stats.missed_read);
    println!("프레임 {} — pcapng 에 쓴 것 {}, 파일로 못 쓰는 종류 {}", s.frames, s.written, s.skipped_non_frame);
    println!("방향: 받음 {} · 보냄 {} · 모름 {}", s.by_dir[1], s.by_dir[2], s.by_dir[0]);
    println!("프로토콜:");
    for (k, v) in &s.by_proto {
        println!("  {k:<16} {v}");
    }
    println!("구성 요소별:");
    for (k, v) in &s.by_iface {
        println!("  {k:<40} {v}");
    }
    println!("루프백(127.0.0.1·::1) 프레임: {}", s.loopback);
    if let Some(e) = &s.write_err {
        println!("파일 쓰기 오류: {e}");
    }
    let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
    println!("저장: {out} ({size} 바이트) — Wireshark 로 열어 보세요");
    println!("RESULT frames={} written={} loopback={} unparsable={} parse_errors={} missed={} file={out}", s.frames, s.written, s.loopback, s.unparsable, stats.parse_errors, stats.missed_write);
}

fn fail(e: &CaptureError) -> ! {
    eprintln!("오류: {e}");
    std::process::exit(match e {
        CaptureError::NeedAdmin => 2,
        _ => 3,
    });
}

fn die(msg: &str) -> ! {
    eprintln!("{msg}");
    std::process::exit(1);
}
