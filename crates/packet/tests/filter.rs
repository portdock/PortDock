use portdock_packet::capture::Capture;
use portdock_packet::dissect::*;
use portdock_packet::fields::{self, FIELDS};
use portdock_packet::filter::Filter;
use portdock_packet::fixture::*;
use portdock_packet::session::Session;

fn udp_rec(t: f64, sport: u16, dport: u16, payload: &[u8]) -> Rec {
    Rec::t(
        t,
        wrap(
            1,
            &ipv4(&IpPkt {
                src: [10, 0, 0, 1],
                dst: [10, 0, 0, 2],
                sport,
                dport,
                udp: true,
                payload: payload.to_vec(),
                ..Default::default()
            }),
            None,
        ),
    )
}

/// 여러 종류가 섞인 캡처: 번호(1부터) — 1~3 핸드셰이크, 4 Modbus 요청 tid7, 5 응답(12.5 ms), 6 요청 tid8, 7 재전송, 8 DNS 질의, 9 ARP, 10 SYN(옵션 달림), 11 IPv6 ICMPv6
fn mixed() -> Vec<Rec> {
    let mut c = TcpConv::new([10, 0, 0, 1], 50000, [10, 0, 0, 2], 502);
    c.handshake(1.0);
    c.c2s(2.0, &mbap(7, 1, &[3, 0, 0, 0, 2]));
    c.s2c(2.0125, &mbap(7, 1, &[3, 4, 0x13, 0x88, 0, 5]));
    c.c2s(2.6, &mbap(8, 1, &[3, 0, 9, 0, 1]));
    c.c2s_at(2.7, -12, &mbap(8, 1, &[3, 0, 9, 0, 1]));
    let mut recs = c.recs(1, None);
    let mut q = vec![0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0];
    q.extend([
        7, b'e', b'x', b'a', b'm', b'p', b'l', b'e', 3, b'c', b'o', b'm', 0, 0, 1, 0, 1,
    ]);
    recs.push(udp_rec(3.0, 40000, 53, &q));
    let mut arp = vec![0xff; 6];
    arp.extend([
        2, 0, 0, 0, 0, 9, 0x08, 0x06, 0, 1, 8, 0, 6, 4, 0, 1, 2, 0, 0, 0, 0, 9, 192, 168, 1, 9,
    ]);
    arp.extend([0; 6]);
    arp.extend([192, 168, 1, 1]);
    recs.push(Rec::t(3.1, arp));
    // SYN + 옵션(MSS·NOP·창 배율·SACK 허용·타임스탬프)
    let mut ip = vec![
        0x45, 0, 0, 60, 0, 1, 0x40, 0, 64, 6, 0, 0, 172, 16, 0, 1, 172, 16, 0, 2,
    ];
    ip.extend([
        0xc3, 0x50, 0x1f, 0x90, 0, 0, 0, 1, 0, 0, 0, 0, 0xa0, 0x02, 0xff, 0xff, 0, 0, 0, 0,
    ]);
    ip.extend([
        2, 4, 5, 0xb4, 1, 3, 3, 7, 4, 2, 8, 10, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1,
    ]);
    ip[3] = ip.len() as u8;
    recs.push(Rec::t(3.2, wrap(1, &ip, None)));
    // IPv6 홉별 옵션 + ICMPv6 echo
    let mut f = vec![0u8; 12];
    f.extend([0x86, 0xdd, 0x60, 0, 0, 0, 0, 16, 0, 64]);
    f.extend([0xfe, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    f.extend([0xfe, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]);
    f.extend([58, 0, 1, 4, 0, 0, 0, 0, 128, 0, 0, 0, 0x12, 0x34, 0, 7]);
    recs.push(Rec::t(3.3, f));
    recs
}

fn session() -> Session {
    let cap = Capture::from_bytes(pcap(&mixed(), 1, false, false)).unwrap();
    Session::new(cap, Prefs::default())
}

fn hits(s: &Session, f: &str) -> Vec<u32> {
    s.apply_text(f)
        .unwrap_or_else(|e| panic!("{f}: {e}"))
        .iter()
        .map(|x| x + 1)
        .collect()
}

#[test]
fn expressions() {
    let s = session();
    assert_eq!(s.cap.len(), 11);
    assert_eq!(hits(&s, ""), (1..=11).collect::<Vec<u32>>());
    // 같은 이름 필드가 둘이면 ==, 하나라도
    assert_eq!(
        hits(&s, "ip.addr == 10.0.0.2 && tcp.port == 50000"),
        vec![1, 2, 3, 4, 5, 6, 7]
    );
    assert_eq!(hits(&s, "ip.src == 10.0.0.2"), vec![2, 5]);
    // `!=` 는 `!(==)` — 필드가 없는 프레임(ARP·IPv6)도 참
    assert_eq!(hits(&s, "ip.src != 10.0.0.1"), vec![2, 5, 9, 10, 11]);
    assert_eq!(hits(&s, "tcp.flags.syn == 1"), vec![1, 2, 10]);
    assert_eq!(hits(&s, "tcp.flags & 0x02"), vec![1, 2, 10]);
    assert_eq!(hits(&s, "tcp.flags & 0x12 == 0x12"), vec![2]);
    assert_eq!(
        hits(&s, "ip.addr == 10.0.0.0/8"),
        vec![1, 2, 3, 4, 5, 6, 7, 8]
    );
    assert_eq!(hits(&s, "ip.addr == 172.16.0.0/12 and tcp"), vec![10]);
    assert_eq!(hits(&s, "!(ip.addr == 10.0.0.1) and ip"), vec![10]);
    assert_eq!(
        hits(&s, "tcp.port in {80 500..600}"),
        vec![1, 2, 3, 4, 5, 6, 7]
    );
    assert_eq!(hits(&s, "tcp.dstport in {8080}"), vec![10]);
    assert_eq!(
        hits(&s, "eth.addr == 02:00:00:00:00:01"),
        vec![1, 2, 3, 4, 5, 6, 7, 8, 10]
    );
    assert_eq!(hits(&s, "arp"), vec![9]);
    assert_eq!(hits(&s, "not arp and ipv6"), vec![11]);
    assert_eq!(
        hits(&s, "icmpv6.type == 128 && ipv6.addr == fe80::2"),
        vec![11]
    );
    assert_eq!(hits(&s, "udp or arp"), vec![8, 9]);
    assert_eq!(hits(&s, "ip.src == 10.0.0.1 xor tcp"), vec![2, 5, 8, 10]);
    assert_eq!(
        hits(&s, "frame.len >= 60 and frame.number lt 3"),
        vec![1, 2]
    );
    assert_eq!(hits(&s, "frame.time_delta > 0.5"), vec![4, 6]);
    assert_eq!(hits(&s, "frame.protocols contains \"dns\""), vec![8]);
    assert_eq!(hits(&s, "dns.qry.name contains \"example\""), vec![8]);
    assert_eq!(hits(&s, "dns.qry.name matches \"^ex.*com$\""), vec![8]);
    assert_eq!(
        hits(
            &s,
            "dns.qry.name == \"example.com\" && dns.flags.response == false"
        ),
        vec![8]
    );
    assert_eq!(
        hits(
            &s,
            "tcp.options.mss_val == 1460 && tcp.options.wscale.shift == 7 && tcp.options.sack_perm"
        ),
        vec![10]
    );
    assert_eq!(hits(&s, "tcp.options.timestamp.tsval == 1"), vec![10]);
    assert_eq!(
        hits(&s, "arp.opcode == 1 and arp.dst.proto_ipv4 == 192.168.1.1"),
        vec![9]
    );
}

#[test]
fn analysis_dependent_filters() {
    let s = session();
    assert!(!s.analysis_built());
    assert_eq!(hits(&s, "tcp.port == 502"), vec![1, 2, 3, 4, 5, 6, 7]);
    assert!(
        !s.analysis_built(),
        "분석이 필요 없는 필터는 분석을 만들지 않는다"
    );
    // 재전송 프레임(7)의 바이트는 PDU 로 다시 세지 않는다
    assert_eq!(hits(&s, "modbus"), vec![4, 5, 6]);
    assert!(s.analysis_built());
    assert_eq!(hits(&s, "modbus.func_code == 3"), vec![4, 5, 6]);
    assert_eq!(hits(&s, "mbtcp.trans_id in {7 8}"), vec![4, 5, 6]);
    assert_eq!(hits(&s, "modbus.response_time > 0.01"), vec![5]);
    assert_eq!(hits(&s, "modbus.response_time < 0.001"), Vec::<u32>::new());
    assert_eq!(hits(&s, "modbus.request_frame == 4"), vec![5]);
    assert_eq!(hits(&s, "tcp.analysis.retransmission"), vec![7]);
    assert_eq!(hits(&s, "tcp.analysis.flags and tcp.stream == 0"), vec![7]);
    assert_eq!(hits(&s, "tcp.seq == 1 && tcp.len > 0"), vec![4, 5]);
    assert_eq!(
        hits(&s, "modbus.reference_num == 9 and mbtcp.unit_id == 1"),
        vec![6]
    );
}

#[test]
fn parse_errors_have_positions() {
    let e = |src: &str| Filter::parse(src).unwrap_err();
    let x = e("ip.addr == ");
    assert_eq!(
        (x.pos, x.message.as_str()),
        (11, "Expected a value after the operator")
    );
    let x = e("ip.adr == 1");
    assert_eq!((x.pos, x.len), (0, 6));
    assert!(x.suggestions.contains(&"ip.addr"), "{:?}", x.suggestions);
    let x = e("tcp.port == abc");
    assert_eq!((x.pos, x.len), (12, 3));
    assert!(x.message.contains("integer"));
    let x = e("tcp.port == 1 && ip.addr == 10.0.0.256");
    assert_eq!(x.pos, 28);
    let x = e("(tcp.port == 1");
    assert_eq!(x.message, "Missing ')'");
    let x = e("tcp.port == 1 &&");
    assert_eq!(x.pos, 16);
    let x = e("dns.qry.name == example");
    assert!(x.message.contains("double quotes"));
    let x = e("modbus == 1");
    assert!(x.message.contains("no value"));
    let x = e("tcp.flags.syn > 1");
    assert!(x.message.contains("boolean"));
    let x = e("dns.qry.name == \"abc");
    assert!(x.message.contains("Unterminated"));
    let x = e("dns.qry.name matches \"(\"");
    assert!(
        x.message.starts_with("Invalid regular expression"),
        "{}",
        x.message
    );
    let x = e("tcp.port == 1 tcp.port == 2");
    assert_eq!(x.pos, 14);
    let x = e("ip.addr == 10.0.0.0/33");
    assert!(x.message.contains("0 to 32"));
    let x = e("ip.addr contains 1");
    assert!(x.message.contains("strings"));
    let x = e("tcp.port == 1 )");
    assert_eq!(x.message, "Unexpected ')'");
    let x = e("tcp.port == 1 @");
    assert_eq!(x.pos, 14);
    let x = e("tcp.flags & zz");
    assert!(x.message.contains("bit mask"));
    let x = e("eth.src & 1");
    assert!(x.message.contains("integer fields"));
    assert!(Filter::parse("tcp.port in {}").is_err());
    assert!(Filter::parse("tcp.port in {1").is_err());
}

#[test]
fn depth_and_analysis_requirements() {
    let p = |s: &str| Filter::parse(s).unwrap();
    assert_eq!(p("frame.len > 10").depth(), Depth::Frame);
    assert_eq!(p("eth.addr == 02:00:00:00:00:01").depth(), Depth::Link);
    assert_eq!(p("ip.addr == 1.2.3.4").depth(), Depth::Network);
    assert_eq!(
        p("ip.addr == 1.2.3.4 && tcp.port == 80").depth(),
        Depth::Transport
    );
    assert_eq!(p("dns.qry.name contains \"a\"").depth(), Depth::App);
    assert_eq!(p("frame.protocols contains \"tcp\"").depth(), Depth::App);
    assert!(!p("tcp.flags.syn").needs_analysis());
    assert!(p("tcp.analysis.retransmission").needs_analysis());
    assert!(p("modbus.func_code == 3").needs_analysis());
    assert!(!p("dns.qry.name == \"a\"").needs_analysis());
    assert!(Filter::parse("").unwrap().is_all());
    let names: Vec<&str> = fields::complete("tcp.flags.s")
        .iter()
        .map(|d| d.name)
        .collect();
    assert_eq!(names, vec!["tcp.flags.syn"]);
    assert!(
        fields::complete("response")
            .iter()
            .any(|d| d.name == "modbus.response_time")
    );
}

/// 해석기가 내는 모든 필드 이름이 필드 표에 있다 — 표에 없는 이름은 만들어 내지 않았다는 확인
#[test]
fn every_emitted_field_is_in_the_field_table() {
    let s = session();
    let mut seen = std::collections::BTreeSet::new();
    for i in 0..s.cap.len() {
        let d = s.dissect(i, Opts::FULL, true);
        for f in &d.fields {
            seen.insert(f.name);
        }
        for l in &d.layers {
            seen.insert(l);
        }
    }
    // 산업 프로토콜·DHCP·VLAN·ICMP·MC·XGT 도
    let extra = [
        mc3e_req(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x02, 0x00]),
        mc3e_resp(0xc059, &[0, 0xff, 0xff, 0x03, 0x00, 0x01, 0x04, 0x00, 0x00]),
        xgt_req(
            1,
            &[&[0x54u8, 0, 2, 0, 0, 0, 1, 0, 6, 0][..], b"%MW100"].concat(),
        ),
    ];
    let mut c = TcpConv::new([10, 0, 0, 1], 50000, [10, 0, 0, 2], 2004);
    c.handshake(1.0);
    c.c2s(2.0, &extra[2]);
    let mut c2 = TcpConv::new([10, 0, 0, 1], 50001, [10, 0, 0, 2], 5007);
    c2.handshake(1.0);
    c2.c2s(2.0, &extra[0]);
    c2.s2c(2.01, &extra[1]);
    let mut recs = c.recs(1, Some(5));
    recs.extend(c2.recs(1, None));
    let s2 = Session::new(
        Capture::from_bytes(pcap(&recs, 1, false, false)).unwrap(),
        Prefs::default(),
    );
    for i in 0..s2.cap.len() {
        let d = s2.dissect(i, Opts::FULL, true);
        for f in &d.fields {
            seen.insert(f.name);
        }
        for l in &d.layers {
            seen.insert(l);
        }
    }
    let mut dhcp = vec![1, 1, 6, 0, 0xde, 0xad, 0xbe, 0xef, 0, 0, 0x80, 0];
    dhcp.extend([0u8; 16]);
    dhcp.extend([2, 0, 0, 0, 0, 1]);
    dhcp.extend([0u8; 10 + 64 + 128]);
    dhcp.extend([
        0x63, 0x82, 0x53, 0x63, 53, 1, 1, 1, 4, 255, 0, 0, 0, 3, 4, 10, 0, 0, 1, 12, 2, b'h', b'1',
        15, 2, b'a', b'b', 50, 4, 1, 2, 3, 4, 51, 4, 0, 0, 0, 60, 54, 4, 9, 9, 9, 9, 255,
    ]);
    let mut ping = vec![
        0x45, 0, 0, 32, 0, 1, 0, 0, 64, 1, 0, 0, 10, 0, 0, 1, 10, 0, 0, 2,
    ];
    ping.extend([8, 0, 0, 0, 0x12, 0x34, 0, 9, 0, 0, 0, 0]);
    let recs3 = vec![
        udp_rec(1.0, 68, 67, &dhcp),
        Rec::t(1.1, wrap(1, &ping, None)),
        Rec::t(
            1.2,
            wrap(
                1,
                &ipv4(&IpPkt {
                    src: [10, 0, 0, 1],
                    dst: [10, 0, 0, 2],
                    sport: 1,
                    dport: 2,
                    flags: 0x10,
                    ..Default::default()
                }),
                Some(10),
            ),
        ),
    ];
    let s3 = Session::new(
        Capture::from_bytes(pcap(&recs3, 1, false, false)).unwrap(),
        Prefs::default(),
    );
    for i in 0..s3.cap.len() {
        let d = s3.dissect(i, Opts::FULL, true);
        for f in &d.fields {
            seen.insert(f.name);
        }
        for l in &d.layers {
            seen.insert(l);
        }
    }
    let known: std::collections::BTreeSet<&str> = FIELDS.iter().map(|d| d.name).collect();
    let missing: Vec<_> = seen.iter().filter(|n| !known.contains(**n)).collect();
    assert!(missing.is_empty(), "필드 표에 없는 이름: {missing:?}");
    assert!(seen.len() > 120, "{}", seen.len());
    for must in [
        "mc.end_code",
        "xgt.variable",
        "dhcp.option.dhcp",
        "vlan.id",
        "icmp.seq",
        "tcp.options.sack_perm",
        "modbus.response_time",
    ] {
        assert!(seen.contains(must), "{must} 가 해석 결과에 나오지 않았다");
    }
}
