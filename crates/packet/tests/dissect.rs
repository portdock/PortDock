use portdock_packet::analysis::Analysis;
use portdock_packet::dissect::*;
use portdock_packet::fixture::*;

fn run(frame: &[u8], link: u16, o: Opts) -> Dissection {
    let p = Prefs::default();
    let ctx = Ctx {
        prefs: &p,
        analysis: None::<&Analysis>,
    };
    let meta = Meta {
        number: 3,
        ts_ns: 1_700_000_000_500_000_000,
        has_ts: true,
        prev_ts_ns: Some(1_700_000_000_250_000_000),
        first_ts_ns: Some(1_700_000_000_000_000_000),
        caplen: frame.len() as u32,
        origlen: frame.len() as u32,
        iface: 0,
    };
    dissect(frame, link, &meta, &ctx, o)
}

fn tcp_frame(flags: u8, payload: &[u8]) -> Vec<u8> {
    let ip = ipv4(&IpPkt {
        src: [192, 168, 0, 10],
        dst: [192, 168, 0, 20],
        sport: 50000,
        dport: 502,
        seq: 7,
        ack: 9,
        flags,
        payload: payload.to_vec(),
        ip_id: 5,
        ..Default::default()
    });
    wrap(1, &ip, None)
}

fn u(d: &Dissection, n: &str) -> Vec<u64> {
    d.fields
        .iter()
        .filter(|f| f.name == n)
        .map(|f| {
            if let Value::U(v) = f.value {
                v
            } else {
                panic!("{n} not uint: {:?}", f.value)
            }
        })
        .collect()
}

#[test]
fn ethernet_ip_tcp_fields_and_ranges() {
    let f = tcp_frame(0x02, &[]);
    let d = run(&f, 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:ip:tcp");
    // wrap() 의 이더넷 머리: 앞 6바이트 = 목적지 02:..:01, 다음 6바이트 = 출발지 02:..:02
    assert_eq!(
        d.get("eth.dst").unwrap().value,
        Value::Mac([2, 0, 0, 0, 0, 1])
    );
    assert_eq!(
        d.get("eth.src").unwrap().value,
        Value::Mac([2, 0, 0, 0, 0, 2])
    );
    assert_eq!(d.fields.iter().filter(|x| x.name == "ip.addr").count(), 2);
    assert_eq!(u(&d, "tcp.port"), vec![50000, 502]);
    assert_eq!(d.get("tcp.flags.syn").unwrap().value, Value::B(true));
    assert_eq!(d.get("tcp.flags.ack").unwrap().value, Value::B(false));
    assert_eq!(u(&d, "frame.len"), vec![60]);
    assert_eq!(d.get("frame.time_delta").unwrap().value, Value::F(0.25));
    assert_eq!(d.get("frame.time_relative").unwrap().value, Value::F(0.5));
    let src = d.get("ip.src").unwrap();
    assert_eq!((src.start, src.len), (26, 4));
    let sp = d.get("tcp.srcport").unwrap();
    assert_eq!((sp.start, sp.len), (34, 2));
    assert_eq!(d.cols.protocol, "TCP");
    assert_eq!(d.cols.src, "192.168.0.10");
    assert!(
        d.cols
            .info
            .starts_with("50000 → 502 [SYN] Seq=7 Ack=9 Win=65535 Len=0"),
        "{}",
        d.cols.info
    );
    let labels: Vec<_> = d
        .tree
        .iter()
        .map(|n| n.label.split(',').next().unwrap().to_string())
        .collect();
    assert_eq!(
        labels,
        vec![
            "Frame 3: 60 bytes on wire (480 bits)",
            "Ethernet II",
            "Internet Protocol Version 4",
            "Transmission Control Protocol"
        ]
    );
    assert!(
        d.tree[0]
            .children
            .iter()
            .any(|c| c.label == "Protocols in frame: frame:eth:ip:tcp")
    );
    assert_eq!((d.tree[1].start, d.tree[1].len), (0, 14));
    assert_eq!((d.tree[2].start, d.tree[2].len), (14, 20));
}

#[test]
fn lazy_depth_stops_early() {
    let f = tcp_frame(0x18, &[1, 2, 3]);
    let d = run(&f, 1, Opts::filter(Depth::Network));
    assert!(d.get("ip.src").is_some());
    assert!(d.get("tcp.srcport").is_none());
    let d = run(&f, 1, Opts::filter(Depth::Link));
    assert!(d.get("ip.src").is_none() && d.get("eth.type").is_some());
    let d = run(&f, 1, Opts::filter(Depth::Frame));
    assert!(d.get("eth.type").is_none() && d.get("frame.len").is_some());
}

#[test]
fn vlan_and_link_types() {
    let ip = ipv4(&IpPkt {
        src: [10, 0, 0, 1],
        dst: [10, 0, 0, 2],
        sport: 1,
        dport: 2,
        flags: 0x10,
        ..Default::default()
    });
    let d = run(&wrap(1, &ip, Some(100)), 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:vlan:ip:tcp");
    assert_eq!(u(&d, "vlan.id"), vec![100]);
    assert_eq!(u(&d, "vlan.etype"), vec![0x0800]);
    for link in [113u16, 276, 101, 0] {
        let d = run(
            &wrap(link as u32, &ip, None),
            link,
            Opts::filter(Depth::Transport),
        );
        assert_eq!(u(&d, "tcp.dstport"), vec![2], "link {link}");
    }
    let d = run(&wrap(1, &ip, None), 147, Opts::FULL);
    assert_eq!(d.experts[0].key, "link.unsupported");
}

#[test]
fn arp_request() {
    let mut f = vec![0xff; 6];
    f.extend([2, 0, 0, 0, 0, 1, 0x08, 0x06]);
    f.extend([0, 1, 8, 0, 6, 4, 0, 1]);
    f.extend([2, 0, 0, 0, 0, 1, 10, 0, 0, 2]);
    f.extend([0; 6]);
    f.extend([10, 0, 0, 1]);
    let d = run(&f, 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:arp");
    assert_eq!(u(&d, "arp.opcode"), vec![1]);
    assert_eq!(
        d.get("arp.dst.proto_ipv4").unwrap().value,
        Value::Ip4([10, 0, 0, 1])
    );
    assert_eq!(d.cols.info, "Who has 10.0.0.1? Tell 10.0.0.2");
}

fn v6_frame(nxt_after_ext: u8, l4: &[u8]) -> Vec<u8> {
    let mut f = vec![0u8; 12];
    f.extend([0x86, 0xdd]);
    let mut ext = vec![nxt_after_ext, 0, 1, 4, 0, 0, 0, 0];
    ext.extend(l4);
    f.extend([0x60, 0, 0, 0]);
    f.extend((ext.len() as u16).to_be_bytes());
    f.extend([0, 64]);
    let mut a = [0u8; 16];
    a[0] = 0xfe;
    a[1] = 0x80;
    a[15] = 1;
    let mut b = a;
    b[15] = 2;
    f.extend(a);
    f.extend(b);
    f.extend(ext);
    f
}

#[test]
fn ipv6_extension_header_then_icmpv6_and_udp() {
    let d = run(
        &v6_frame(58, &[128, 0, 0, 0, 0x12, 0x34, 0, 7]),
        1,
        Opts::FULL,
    );
    assert_eq!(d.protocols(), "frame:eth:ipv6:ipv6.hopopts:icmpv6");
    assert_eq!(u(&d, "icmpv6.type"), vec![128]);
    assert_eq!(u(&d, "icmpv6.echo.sequence_number"), vec![7]);
    assert_eq!(u(&d, "ipv6.hopopts.nxt"), vec![58]);
    let d = run(&v6_frame(17, &[0, 5, 0, 6, 0, 9, 0, 0, 1]), 1, Opts::FULL);
    assert_eq!(u(&d, "udp.port"), vec![5, 6]);
    assert_eq!(u(&d, "udp.length"), vec![9]);
}

#[test]
fn icmp_echo() {
    let mut ip = vec![
        0x45, 0, 0, 32, 0, 1, 0, 0, 64, 1, 0, 0, 10, 0, 0, 1, 10, 0, 0, 2,
    ];
    ip.extend([8, 0, 0, 0, 0x12, 0x34, 0, 9, 0, 0, 0, 0]);
    let d = run(&wrap(1, &ip, None), 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:ip:icmp");
    assert_eq!((u(&d, "icmp.type"), u(&d, "icmp.seq")), (vec![8], vec![9]));
    assert_eq!(d.cols.protocol, "ICMP");
}

fn udp_frame(sport: u16, dport: u16, payload: &[u8]) -> Vec<u8> {
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
    )
}

#[test]
fn dns_query_and_response() {
    let mut q = vec![0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0];
    q.extend([
        7, b'e', b'x', b'a', b'm', b'p', b'l', b'e', 3, b'c', b'o', b'm', 0, 0, 1, 0, 1,
    ]);
    let d = run(&udp_frame(40000, 53, &q), 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:ip:udp:dns");
    assert_eq!(
        d.get("dns.qry.name").unwrap().value,
        Value::Str("example.com".into())
    );
    assert_eq!(d.get("dns.flags.response").unwrap().value, Value::B(false));
    assert_eq!(d.cols.info, "Standard query 0x1234 A example.com");
    let mut r = vec![0x12, 0x34, 0x81, 0x80, 0, 1, 0, 1, 0, 0, 0, 0];
    r.extend(&q[12..]);
    r.extend([0xc0, 12, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 93, 184, 216, 34]);
    let d = run(&udp_frame(53, 40000, &r), 1, Opts::FULL);
    assert_eq!(
        d.get("dns.a").unwrap().value,
        Value::Ip4([93, 184, 216, 34])
    );
    assert_eq!(
        d.get("dns.resp.name").unwrap().value,
        Value::Str("example.com".into())
    );
    assert_eq!(u(&d, "dns.resp.ttl"), vec![60]);
}

#[test]
fn dhcp_discover() {
    let mut p = vec![1, 1, 6, 0, 0xde, 0xad, 0xbe, 0xef, 0, 0, 0x80, 0];
    p.extend([0u8; 16]);
    p.extend([2, 0, 0, 0, 0, 1]);
    p.extend([0u8; 10 + 64 + 128]);
    p.extend([0x63, 0x82, 0x53, 0x63, 53, 1, 1, 50, 4, 10, 0, 0, 77, 255]);
    let d = run(&udp_frame(68, 67, &p), 1, Opts::FULL);
    assert_eq!(d.protocols(), "frame:eth:ip:udp:dhcp");
    assert_eq!(u(&d, "dhcp.option.dhcp"), vec![1]);
    assert_eq!(
        d.get("dhcp.option.requested_ip_address").unwrap().value,
        Value::Ip4([10, 0, 0, 77])
    );
    assert_eq!(u(&d, "dhcp.id"), vec![0xdeadbeef]);
    assert!(d.cols.info.starts_with("DHCP Discover"));
}

#[test]
fn truncated_frames_do_not_panic() {
    let f = tcp_frame(0x18, &[1, 2, 3, 4]);
    for n in 0..f.len() {
        let _ = run(&f[..n], 1, Opts::FULL);
    }
    let v6 = v6_frame(17, &[0, 5, 0, 6, 0, 9, 0, 0, 1]);
    for n in 0..v6.len() {
        let _ = run(&v6[..n], 1, Opts::FULL);
    }
}
