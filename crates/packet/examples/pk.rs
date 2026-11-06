//! `pk` — PortDock Packet 엔진 명령줄 도구(확인·측정용).
//!
//!   pk open <파일> [--filter 식] [--count] [--tree N] [--hex N] [--no-list]
//!                  [--stats conv|endpoints|hier|io|rt|expert] [--follow N]
//!                  [--modbus-port P] [--rtu-port P] [--mc-port P] [--xgt-port P] [--timeout-ms T] [--devmap 경로]
//!   pk check "<필터식>"            필터 문법 검사(오류 위치) · 쓰는 필드와 필요한 깊이
//!   pk fields [접두사]             필드 표
//!   pk export <입력> <출력.pcapng> [--filter 식]
//!   pk bench [패킷 수]             합성 파일(임시 폴더)을 만들어 색인·필터 시간을 재고 지운다
//!   pk gen <경로> <패킷 수>        합성 파일만 만든다(확인용 — 저장소에 넣지 않는다)

use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::time::Instant;

use portdock_packet::capture::{Capture, Format, Precision};
use portdock_packet::devmap::DeviceMap;
use portdock_packet::dissect::{Dissection, Node, Opts, Prefs, Value};
use portdock_packet::expert::{Lang, describe};
use portdock_packet::filter::Filter;
use portdock_packet::fixture::{IpPkt, ipv4, mbap, wrap};
use portdock_packet::session::Session;
use portdock_packet::stats::{self, ConvKind};

fn usage() -> ! {
    eprintln!(
        "{}",
        include_str!("pk.rs")
            .lines()
            .skip(2)
            .take(10)
            .map(|l| l.trim_start_matches("//!"))
            .collect::<Vec<_>>()
            .join("\n")
    );
    std::process::exit(2)
}

fn arg_val(a: &[String], name: &str) -> Option<String> {
    a.iter()
        .position(|x| x == name)
        .and_then(|i| a.get(i + 1).cloned())
}

fn fmt_ns(ns: Option<i64>) -> String {
    match ns {
        Some(n) => format!("{:.3} ms", n as f64 / 1e6),
        None => "-".into(),
    }
}

fn print_tree(nodes: &[Node], depth: usize) {
    for n in nodes {
        let range = if n.len > 0 {
            format!("  [{}..{}]", n.start, n.start + n.len)
        } else {
            String::new()
        };
        let name = if n.name.is_empty() {
            String::new()
        } else {
            format!("  <{}>", n.name)
        };
        println!("{}{}{}{}", "  ".repeat(depth), n.label, name, range);
        print_tree(&n.children, depth + 1);
    }
}

fn hexdump(b: &[u8]) {
    for (i, ch) in b.chunks(16).enumerate() {
        let hex: Vec<String> = ch.iter().map(|x| format!("{x:02x}")).collect();
        let asc: String = ch
            .iter()
            .map(|&c| {
                if (0x20..0x7f).contains(&c) {
                    c as char
                } else {
                    '.'
                }
            })
            .collect();
        println!("{:04x}  {:<47}  {asc}", i * 16, hex.join(" "));
    }
}

fn prefs_from(a: &[String]) -> Prefs {
    let mut p = Prefs::default();
    let port = |n: &str| -> Option<u16> { arg_val(a, n).and_then(|v| v.parse().ok()) };
    if let Some(v) = port("--modbus-port") {
        p.modbus_ports = vec![v];
    }
    if let Some(v) = port("--rtu-port") {
        p.modbus_rtu_ports = vec![v];
    }
    if let Some(v) = port("--mc-port") {
        p.mc_ports = vec![v];
    }
    if let Some(v) = port("--xgt-port") {
        p.xgt_ports = vec![v];
    }
    if let Some(v) = arg_val(a, "--timeout-ms").and_then(|v| v.parse().ok()) {
        p.timeout_ms = v;
    }
    p
}

fn cmd_open(a: &[String]) {
    let Some(path) = a.first() else { usage() };
    let t0 = Instant::now();
    let s = match Session::open(path, prefs_from(a)) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{path}: {e}");
            std::process::exit(1)
        }
    };
    let ti = t0.elapsed();
    let i = &s.cap.info;
    eprintln!(
        "{} {} · {} · {} packets · {} interfaces · link types {:?}{}  (indexed in {:.1} ms)",
        if i.format == Format::Pcap {
            "pcap"
        } else {
            "pcapng"
        },
        if i.big_endian {
            "big-endian"
        } else {
            "little-endian"
        },
        match i.precision {
            Precision::Micro => "microseconds",
            Precision::Nano => "nanoseconds",
            Precision::Mixed => "mixed resolution",
        },
        i.packets,
        i.interfaces,
        i.link_types,
        if i.truncated_file {
            " · FILE IS TRUNCATED"
        } else {
            ""
        },
        ti.as_secs_f64() * 1e3
    );
    let filter = match arg_val(a, "--filter") {
        Some(f) => match Filter::parse(&f) {
            Ok(x) => x,
            Err(e) => {
                eprintln!(
                    "filter error: {}\n  {f}\n  {}{}",
                    e.message,
                    " ".repeat(e.pos),
                    "^".repeat(e.len)
                );
                if !e.suggestions.is_empty() {
                    eprintln!("  did you mean: {}", e.suggestions.join(", "));
                }
                std::process::exit(1)
            }
        },
        None => Filter::all(),
    };
    let t1 = Instant::now();
    let hits = s.apply(&filter);
    let tf = t1.elapsed();
    if !filter.is_all() {
        eprintln!(
            "filter: {} of {} packets match  ({:.1} ms{})",
            hits.len(),
            s.cap.len(),
            tf.as_secs_f64() * 1e3,
            if filter.needs_analysis() {
                ", flow analysis included"
            } else {
                ""
            }
        );
    }
    if a.iter().any(|x| x == "--count") {
        println!("{}", hits.len());
        return;
    }
    let namer = arg_val(a, "--devmap")
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|t| DeviceMap::from_json(&t).ok());
    if let Some(n) = arg_val(a, "--tree").and_then(|v| v.parse::<usize>().ok()) {
        let mut d = Dissection::default();
        let nm: Option<&dyn portdock_packet::devmap::RegisterNamer> =
            namer.as_ref().map(|x| x as _);
        s.dissect_into(&mut d, n - 1, Opts::FULL, true, nm);
        print_tree(&d.tree, 0);
        for e in &d.experts {
            if let Some(x) = describe(e, Lang::En) {
                println!(
                    "\n[{:?}] {} — {}\n  {}\n  next: {}",
                    e.severity, x.title, e.text, x.meaning, x.next
                );
                if let (Some(n), Some(c)) = (x.code_name, x.code_check) {
                    println!("  code: {n}\n  check: {c}");
                }
            }
        }
        return;
    }
    if let Some(n) = arg_val(a, "--hex").and_then(|v| v.parse::<usize>().ok()) {
        hexdump(s.cap.data(&s.cap.packets[n - 1]));
        return;
    }
    if let Some(n) = arg_val(a, "--follow").and_then(|v| v.parse::<u32>().ok()) {
        for c in s.analysis().follow(&s.cap, n) {
            println!(
                "--- {} frames {}..{} ({} bytes)",
                if c.from_client {
                    "client → server"
                } else {
                    "server → client"
                },
                c.first_frame,
                c.last_frame,
                c.data.len()
            );
            hexdump(&c.data);
        }
        return;
    }
    if let Some(k) = arg_val(a, "--stats") {
        let w = Some(&hits[..]);
        match k.as_str() {
            "conv" => {
                for kind in [
                    ConvKind::Ethernet,
                    ConvKind::Ipv4,
                    ConvKind::Ipv6,
                    ConvKind::Tcp,
                    ConvKind::Udp,
                ] {
                    let rows = stats::conversations(&s.cap, w, kind);
                    if rows.is_empty() {
                        continue;
                    }
                    println!("== {kind:?} conversations");
                    for r in rows {
                        println!(
                            "{}:{} <-> {}:{}  {} pkts {} B  (A→B {} / B→A {})  start {:.6}  {:.6} s",
                            r.a,
                            r.port_a.map(|p| p.to_string()).unwrap_or_default(),
                            r.b,
                            r.port_b.map(|p| p.to_string()).unwrap_or_default(),
                            r.packets,
                            r.bytes,
                            r.a_to_b_packets,
                            r.b_to_a_packets,
                            r.start_ns as f64 / 1e9,
                            r.duration_s()
                        );
                    }
                }
            }
            "endpoints" => {
                for kind in [
                    ConvKind::Ethernet,
                    ConvKind::Ipv4,
                    ConvKind::Ipv6,
                    ConvKind::Tcp,
                    ConvKind::Udp,
                ] {
                    let rows = stats::endpoints(&s.cap, w, kind);
                    if rows.is_empty() {
                        continue;
                    }
                    println!("== {kind:?} endpoints");
                    for r in rows {
                        println!(
                            "{}{}  {} pkts {} B  (tx {} / rx {})",
                            r.addr,
                            r.port.map(|p| format!(":{p}")).unwrap_or_default(),
                            r.packets,
                            r.bytes,
                            r.tx_packets,
                            r.rx_packets
                        );
                    }
                }
            }
            "hier" => {
                fn p(n: &stats::HierNode, d: usize) {
                    println!(
                        "{}{}  {} pkts {} B  (end {} pkts)",
                        "  ".repeat(d),
                        n.name,
                        n.packets,
                        n.bytes,
                        n.end_packets
                    );
                    for c in &n.children {
                        p(c, d + 1);
                    }
                }
                for n in stats::protocol_hierarchy(&s, w) {
                    p(&n, 0);
                }
            }
            "io" => {
                for b in stats::io_series(&s.cap, w, 1_000_000_000) {
                    println!(
                        "{:>8.1} s  {:>8} pkts {:>10} B",
                        b.start_ns as f64 / 1e9,
                        b.packets,
                        b.bytes
                    );
                }
            }
            "rt" => {
                let an = s.analysis();
                let r = stats::response_summary(an, None);
                println!(
                    "pairs {}  min {}  median {}  p95 {}  max {}  | no response {}  pending {}  exceptions {}  orphans {}",
                    r.pairs,
                    fmt_ns(r.min_ns),
                    fmt_ns(r.median_ns),
                    fmt_ns(r.p95_ns),
                    fmt_ns(r.max_ns),
                    r.no_response,
                    r.pending,
                    r.exceptions,
                    r.orphans
                );
                for g in stats::response_groups(an) {
                    println!(
                        "  stream {} unit {} func {:#06x} {:?}: pairs {} median {} max {} no-response {} exceptions {}",
                        g.flow,
                        g.unit,
                        g.func,
                        g.app,
                        g.summary.pairs,
                        fmt_ns(g.summary.median_ns),
                        fmt_ns(g.summary.max_ns),
                        g.summary.no_response,
                        g.summary.exceptions
                    );
                }
            }
            "expert" => {
                for (k, n) in stats::expert_counts(&s, w) {
                    println!("{n:>8}  {k}");
                }
            }
            _ => usage(),
        }
        return;
    }
    if a.iter().any(|x| x == "--no-list") {
        return;
    }
    let with = filter.needs_analysis() || s.cap.len() < 200_000;
    let o = Opts::COLUMNS;
    let mut d = Dissection::default();
    let out = std::io::stdout();
    let mut out = BufWriter::new(out.lock());
    for &i in hits.iter().take(
        arg_val(a, "--limit")
            .and_then(|v| v.parse().ok())
            .unwrap_or(usize::MAX),
    ) {
        s.dissect_into(&mut d, i as usize, o, with, None);
        let m = s.meta(i as usize);
        let rel = (m.ts_ns - m.first_ts_ns.unwrap_or(m.ts_ns)) as f64 / 1e9;
        let rt = match d
            .fields
            .iter()
            .find(|f| f.name.ends_with(".response_time"))
            .map(|f| &f.value)
        {
            Some(Value::F(t)) => format!("  [rt {:.3} ms]", t * 1e3),
            _ => String::new(),
        };
        let _ = writeln!(
            out,
            "{:>7} {:>11.6} {:<22} {:<22} {:<11} {:>5} {}{}",
            i + 1,
            rel,
            d.cols.src,
            d.cols.dst,
            d.cols.protocol,
            m.origlen,
            d.cols.info,
            rt
        );
    }
}

fn cmd_check(a: &[String]) {
    let Some(src) = a.first() else { usage() };
    match Filter::parse(src) {
        Ok(f) => println!(
            "ok — depth {:?}, flow analysis {}, fields {:?}",
            f.depth(),
            if f.needs_analysis() {
                "needed"
            } else {
                "not needed"
            },
            f.fields()
        ),
        Err(e) => {
            println!("error at {}..{}: {}", e.pos, e.pos + e.len, e.message);
            println!("  {src}\n  {}{}", " ".repeat(e.pos), "^".repeat(e.len));
            if !e.suggestions.is_empty() {
                println!("  did you mean: {}", e.suggestions.join(", "));
            }
            std::process::exit(1)
        }
    }
}

fn cmd_fields(a: &[String]) {
    let list = match a.first() {
        Some(p) => portdock_packet::fields::complete(p),
        None => portdock_packet::fields::FIELDS.iter().collect(),
    };
    for d in list {
        println!(
            "{:<38} {:<18} {}{}",
            d.name,
            d.ftype.name(),
            d.desc,
            if d.custom { "  (PortDock)" } else { "" }
        );
    }
}

fn cmd_export(a: &[String]) {
    let (Some(inp), Some(outp)) = (a.first(), a.get(1)) else {
        usage()
    };
    let s = Session::open(inp, prefs_from(a)).expect("open");
    let f = Filter::parse(&arg_val(a, "--filter").unwrap_or_default()).expect("filter");
    let hits: Vec<usize> = s.apply(&f).into_iter().map(|x| x as usize).collect();
    let file = std::fs::File::create(outp).expect("create");
    s.cap
        .write_pcapng(BufWriter::new(file), &hits)
        .expect("write");
    println!("wrote {} packets to {outp}", hits.len());
}

/// 합성 파일 — Modbus 요청/응답 64 흐름 + 20 패킷마다 DNS 질의. 임시 폴더에만 둔다
fn synth(path: &PathBuf, n: usize) {
    let f = std::fs::File::create(path).expect("create");
    let mut w = BufWriter::with_capacity(1 << 20, f);
    let mut hdr = Vec::new();
    hdr.extend(0xa1b2c3d4u32.to_le_bytes());
    hdr.extend(2u16.to_le_bytes());
    hdr.extend(4u16.to_le_bytes());
    hdr.extend([0u8; 8]);
    hdr.extend(65535u32.to_le_bytes());
    hdr.extend(1u32.to_le_bytes());
    w.write_all(&hdr).unwrap();
    const F: usize = 64;
    let mut seq = [[1000u32, 50000u32]; F];
    let mut tid = [0u16; F];
    let mut dns = vec![0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0];
    dns.extend([
        7, b'e', b'x', b'a', b'm', b'p', b'l', b'e', 3, b'c', b'o', b'm', 0, 0, 1, 0, 1,
    ]);
    let base = 1_700_000_000u64;
    let mut pair = 0usize;
    for i in 0..n {
        let t_us = i as u64 * 500;
        let (frame, _) = if i % 20 == 19 {
            (
                wrap(
                    1,
                    &ipv4(&IpPkt {
                        src: [10, 0, 5, 1],
                        dst: [10, 0, 5, 2],
                        sport: 40000,
                        dport: 53,
                        udp: true,
                        payload: dns.clone(),
                        ..Default::default()
                    }),
                    None,
                ),
                0,
            )
        } else {
            let fl = pair % F;
            let req = i % 2 == 0;
            let (src, dst, sp, dp, di) = if req {
                (
                    [10, 0, (fl / 200) as u8, (fl % 200 + 1) as u8],
                    [10, 1, 0, 1],
                    50000 + fl as u16,
                    502,
                    0,
                )
            } else {
                (
                    [10, 1, 0, 1],
                    [10, 0, (fl / 200) as u8, (fl % 200 + 1) as u8],
                    502,
                    50000 + fl as u16,
                    1,
                )
            };
            let pdu: Vec<u8> = if req {
                tid[fl] = tid[fl].wrapping_add(1);
                mbap(tid[fl], 1, &[3, 0, (pair & 0xff) as u8, 0, 10])
            } else {
                let mut p = vec![3, 20];
                p.extend((0..20).map(|k| (pair + k) as u8));
                mbap(tid[fl], 1, &p)
            };
            let sq = seq[fl][di];
            let ak = seq[fl][1 - di];
            seq[fl][di] = sq.wrapping_add(pdu.len() as u32);
            if !req {
                pair += 1;
            }
            (
                wrap(
                    1,
                    &ipv4(&IpPkt {
                        src,
                        dst,
                        sport: sp,
                        dport: dp,
                        seq: sq,
                        ack: ak,
                        flags: 0x18,
                        payload: pdu,
                        ip_id: i as u16,
                        ..Default::default()
                    }),
                    None,
                ),
                0,
            )
        };
        let mut rec = Vec::with_capacity(16 + frame.len());
        rec.extend(((base + t_us / 1_000_000) as u32).to_le_bytes());
        rec.extend(((t_us % 1_000_000) as u32).to_le_bytes());
        rec.extend((frame.len() as u32).to_le_bytes());
        rec.extend((frame.len() as u32).to_le_bytes());
        rec.extend(frame);
        w.write_all(&rec).unwrap();
    }
    w.flush().unwrap();
}

fn cmd_bench(a: &[String]) {
    let n: usize = a.first().and_then(|v| v.parse().ok()).unwrap_or(1_000_000);
    let dir = std::env::temp_dir().join(format!("pk-bench-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("synthetic.pcap");
    let t = Instant::now();
    synth(&path, n);
    let size = std::fs::metadata(&path).unwrap().len();
    println!(
        "synthetic file: {n} packets, {:.1} MB (generated in {:.1} s) — in {}",
        size as f64 / 1e6,
        t.elapsed().as_secs_f64(),
        dir.display()
    );
    let t = Instant::now();
    let cap = Capture::open(&path).unwrap();
    let ti = t.elapsed();
    println!(
        "index (mmap):        {:>9.1} ms   {} packets, index memory {:.1} MB ({} B/packet, no packet bytes copied)",
        ti.as_secs_f64() * 1e3,
        cap.len(),
        cap.len() as f64 * std::mem::size_of::<portdock_packet::capture::PacketRef>() as f64 / 1e6,
        std::mem::size_of::<portdock_packet::capture::PacketRef>()
    );
    let s = Session::new(cap, Prefs::default());
    for f in [
        "frame.len > 100",
        "ip.addr == 10.0.0.0/8 && tcp.port == 502",
        "tcp.flags & 0x08",
        "dns.qry.name contains \"example\"",
        "frame.time_delta > 0.0004",
        "frame.protocols contains \"modbus\"",
        "modbus.func_code == 3 && modbus.response_time > 0.0004",
        "tcp.analysis.retransmission",
    ] {
        let filt = Filter::parse(f).unwrap();
        let t = Instant::now();
        let hits = s.apply(&filt);
        println!(
            "filter {:<58} {:>9.1} ms   {:>8} hits   depth {:?}{}",
            f,
            t.elapsed().as_secs_f64() * 1e3,
            hits.len(),
            filt.depth(),
            if filt.needs_analysis() {
                "  (analysis built once, shared)"
            } else {
                ""
            }
        );
    }
    let t = Instant::now();
    let an = s.analysis();
    println!(
        "flow analysis (TCP + {} PDUs paired): already built above, rebuild measured separately:",
        an.pdus.len()
    );
    let t2 = Instant::now();
    let _again = portdock_packet::analysis::Analysis::build(&s.cap, &s.prefs);
    println!(
        "  Analysis::build:   {:>9.1} ms",
        t2.elapsed().as_secs_f64() * 1e3
    );
    let _ = t;
    let t = Instant::now();
    let r = stats::response_summary(an, None);
    println!(
        "response summary:    {:>9.1} ms   pairs {} median {} p95 {}",
        t.elapsed().as_secs_f64() * 1e3,
        r.pairs,
        fmt_ns(r.median_ns),
        fmt_ns(r.p95_ns)
    );
    let t = Instant::now();
    let c = stats::conversations(&s.cap, None, ConvKind::Tcp);
    println!(
        "TCP conversations:   {:>9.1} ms   {} rows",
        t.elapsed().as_secs_f64() * 1e3,
        c.len()
    );
    let t = Instant::now();
    let io = stats::io_series(&s.cap, None, 1_000_000_000);
    println!(
        "I/O series (1 s):    {:>9.1} ms   {} buckets",
        t.elapsed().as_secs_f64() * 1e3,
        io.len()
    );
    drop(s);
    std::fs::remove_dir_all(&dir).unwrap();
    println!("temporary directory removed");
}

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    match a.first().map(|x| x.as_str()) {
        Some("open") => cmd_open(&a[1..]),
        Some("check") => cmd_check(&a[1..]),
        Some("fields") => cmd_fields(&a[1..]),
        Some("export") => cmd_export(&a[1..]),
        Some("bench") => cmd_bench(&a[1..]),
        Some("gen") => match (a.get(1), a.get(2).and_then(|v| v.parse().ok())) {
            (Some(p), Some(n)) => synth(&PathBuf::from(p), n),
            _ => usage(),
        },
        _ => usage(),
    }
}
