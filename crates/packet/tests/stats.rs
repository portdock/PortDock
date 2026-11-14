use portdock_packet::capture::Capture;
use portdock_packet::dissect::Prefs;
use portdock_packet::fixture::*;
use portdock_packet::industrial::App;
use portdock_packet::session::Session;
use portdock_packet::stats::*;

fn build() -> Session {
    // 연결 1: 클라이언트 10.0.0.1 — 응답 시간 1·2·3·4·100 ms 다섯 번, 예외 한 번, 무응답 한 번
    let mut c1 = TcpConv::new([10, 0, 0, 1], 50000, [10, 0, 0, 2], 502);
    c1.handshake(1.0);
    let rt = [0.001, 0.002, 0.003, 0.004, 0.100];
    let mut t = 2.0;
    for (k, r) in rt.iter().enumerate() {
        c1.c2s(t, &mbap(k as u16 + 1, 1, &[3, 0, 0, 0, 1]));
        c1.s2c(t + r, &mbap(k as u16 + 1, 1, &[3, 2, 0, 5]));
        t += 0.5;
    }
    c1.c2s(t, &mbap(50, 1, &[3, 0xff, 0xff, 0, 1]));
    c1.s2c(t + 0.005, &mbap(50, 1, &[0x83, 2]));
    t += 0.5;
    c1.c2s(t, &mbap(51, 1, &[6, 0, 1, 0, 9])); // 함수 6 — 응답 없음
    // 연결 2: 클라이언트 10.0.0.3 — 짝 한 번
    let mut c2 = TcpConv::new([10, 0, 0, 3], 50001, [10, 0, 0, 2], 502);
    c2.handshake(1.2);
    c2.c2s(2.1, &mbap(1, 2, &[4, 0, 0, 0, 1]));
    c2.s2c(2.102, &mbap(1, 2, &[4, 2, 0, 7]));
    let mut recs = c1.recs(1, None);
    recs.extend(c2.recs(1, None));
    // 마지막 시각을 요청보다 1초 넘게 뒤로 — 무응답이 «제한 시간 지남» 이 되게
    recs.push(Rec::t(
        t + 3.0,
        wrap(
            1,
            &ipv4(&IpPkt {
                src: [10, 0, 0, 3],
                dst: [10, 0, 0, 2],
                sport: 50001,
                dport: 502,
                flags: 0x10,
                seq: 1,
                ack: 1,
                ..Default::default()
            }),
            None,
        ),
    ));
    recs.sort_by(|a, b| a.t.partial_cmp(&b.t).unwrap());
    Session::new(
        Capture::from_bytes(pcap(&recs, 1, false, false)).unwrap(),
        Prefs::default(),
    )
}

#[test]
fn conversations_and_endpoints() {
    let s = build();
    let rows = conversations(&s.cap, None, ConvKind::Tcp);
    assert_eq!(rows.len(), 2);
    let r = rows.iter().find(|r| r.port_a == Some(50000)).unwrap();
    assert_eq!(
        (r.a.as_str(), r.b.as_str(), r.port_b),
        ("10.0.0.1", "10.0.0.2", Some(502))
    );
    assert_eq!(r.packets, r.a_to_b_packets + r.b_to_a_packets);
    assert_eq!(r.bytes, r.a_to_b_bytes + r.b_to_a_bytes);
    // 클라이언트 → 서버: SYN·ACK·요청 7개, 서버 → 클라이언트: SYN-ACK·응답 6개
    assert_eq!((r.a_to_b_packets, r.b_to_a_packets), (2 + 7, 1 + 6));
    assert!((r.duration_s() - 4.0).abs() < 1e-6, "{}", r.duration_s());
    assert_eq!(conversations(&s.cap, None, ConvKind::Ipv4).len(), 2);
    assert_eq!(conversations(&s.cap, None, ConvKind::Ethernet).len(), 1);
    assert!(conversations(&s.cap, None, ConvKind::Udp).is_empty());
    let ep = endpoints(&s.cap, None, ConvKind::Ipv4);
    assert_eq!(ep.len(), 3);
    let srv = ep.iter().find(|e| e.addr == "10.0.0.2").unwrap();
    assert_eq!(srv.packets, srv.tx_packets + srv.rx_packets);
    assert_eq!(srv.tx_packets, 7 + 2);
    let tcp_ep = endpoints(&s.cap, None, ConvKind::Tcp);
    assert!(
        tcp_ep.iter().any(|e| e.addr == "10.0.0.2"
            && e.port == Some(502)
            && e.packets as usize == s.cap.len())
    );
    // 필터 결과만
    let only = s
        .apply_text("tcp.srcport == 50001 or tcp.dstport == 50001")
        .unwrap();
    let rows = conversations(&s.cap, Some(&only), ConvKind::Tcp);
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].port_a, Some(50001));
}

#[test]
fn protocol_hierarchy_counts() {
    let s = build();
    let _ = s.analysis();
    let h = protocol_hierarchy(&s, None);
    assert_eq!(h.len(), 1);
    let frame = &h[0];
    assert_eq!(
        (frame.name.as_str(), frame.packets as usize),
        ("frame", s.cap.len())
    );
    let tcp = &frame.children[0].children[0].children[0];
    assert_eq!(tcp.name, "tcp");
    assert_eq!(tcp.packets as usize, s.cap.len());
    let mb = tcp.children.iter().find(|c| c.name == "mbtcp").unwrap();
    assert_eq!(mb.packets, 7 + 6 + 2); // 연결 1: 요청 7·응답 6, 연결 2: 요청·응답 2
    assert_eq!(mb.children[0].name, "modbus");
    assert_eq!(mb.children[0].end_packets, mb.packets);
    // 비어 있는 ACK 는 tcp 가 가장 안쪽
    assert!(tcp.end_packets > 0);
}

#[test]
fn io_series_buckets() {
    let s = build();
    let v = io_series(&s.cap, None, 1_000_000_000);
    assert_eq!(
        v.iter().map(|b| b.packets).sum::<u64>() as usize,
        s.cap.len()
    );
    assert_eq!(
        v.iter().map(|b| b.bytes).sum::<u64>(),
        s.cap.packets.iter().map(|p| p.origlen as u64).sum::<u64>()
    );
    assert_eq!(v[0].start_ns, 0);
    assert!(
        v.windows(2)
            .all(|w| w[1].start_ns - w[0].start_ns == 1_000_000_000)
    );
    // 필터별 — 응답만
    let resp = s.apply_text("modbus.response_time").unwrap();
    let r = io_series(&s.cap, Some(&resp), 1_000_000_000);
    assert_eq!(r.iter().map(|b| b.packets).sum::<u64>(), 7); // 짝이 맞은 응답: 정상 5 + 예외 1 + 연결 2 의 1
    // 0.5 초 구간은 더 잘게
    assert!(io_series(&s.cap, None, 500_000_000).len() > v.len());
}

#[test]
fn response_time_summary_and_groups() {
    let s = build();
    let a = s.analysis();
    let r = response_summary(a, Some(App::Modbus));
    assert_eq!(
        (r.pairs, r.exceptions, r.no_response, r.pending, r.orphans),
        (7, 1, 1, 0, 0)
    );
    // 정상 7 + 예외 1 의 응답 시간: 1·2·2(연결 2)·3·4·5(예외)·100 ms … 정렬해 최소·중앙·95%·최대
    assert_eq!(r.min_ns, Some(1_000_000));
    assert_eq!(r.max_ns, Some(100_000_000));
    let mut all = [1, 2, 3, 4, 100, 5, 2];
    all.sort();
    assert_eq!(r.median_ns, Some(all[3] * 1_000_000)); // nearest-rank: ceil(0.5*7)=4 번째
    assert_eq!(r.p95_ns, Some(100_000_000));
    assert_eq!(response_summary(a, Some(App::Mc)), RtSummary::default());
    let g = response_groups(a);
    // 연결 1: 국번 1 · 함수 3, 함수 6 / 연결 2: 국번 2 · 함수 4
    assert_eq!(g.len(), 3);
    let g3 = g.iter().find(|x| x.func == 3).unwrap();
    assert_eq!(
        (g3.unit, g3.summary.pairs, g3.summary.exceptions),
        (1, 6, 1)
    );
    let g6 = g.iter().find(|x| x.func == 6).unwrap();
    assert_eq!((g6.summary.pairs, g6.summary.no_response), (0, 1));
    let g4 = g.iter().find(|x| x.func == 4).unwrap();
    assert_eq!(
        (g4.unit, g4.summary.pairs, g4.summary.median_ns),
        (2, 1, Some(2_000_000))
    );
}

#[test]
fn nearest_rank_percentile() {
    let v: Vec<i64> = (1..=10).collect();
    assert_eq!(percentile(&v, 50.0), Some(5));
    assert_eq!(percentile(&v, 95.0), Some(10));
    assert_eq!(percentile(&v, 10.0), Some(1));
    assert_eq!(percentile(&[], 50.0), None);
}

#[test]
fn expert_counts_include_no_response() {
    let s = build();
    let c = expert_counts(&s, None);
    let get = |k: &str| c.iter().find(|x| x.0 == k).map(|x| x.1).unwrap_or(0);
    assert_eq!(get("pair.no_response"), 1);
    assert_eq!(get("modbus.exception"), 1);
}
