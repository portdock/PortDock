use portdock_packet::analysis::{Analysis, PairStatus};
use portdock_packet::capture::Capture;
use portdock_packet::devmap::DeviceMap;
use portdock_packet::dissect::*;
use portdock_packet::expert::{Lang, describe};
use portdock_packet::fixture::*;
use portdock_packet::industrial::App;

fn conv(port: u16) -> TcpConv {
    TcpConv::new([10, 0, 0, 1], 50000, [10, 0, 0, 2], port)
}

fn open(c: &TcpConv) -> Capture {
    Capture::from_bytes(pcap(&c.recs(1, None), 1, false, false)).unwrap()
}

fn full(
    cap: &Capture,
    a: &Analysis,
    prefs: &Prefs,
    no: usize,
    namer: Option<&dyn portdock_packet::devmap::RegisterNamer>,
) -> Dissection {
    let mut ctx = Ctx::basic(prefs).with_analysis(a, cap);
    if let Some(n) = namer {
        ctx = ctx.with_namer(n);
    }
    let p = &cap.packets[no - 1];
    let meta = Meta {
        number: no as u32,
        ts_ns: p.ts_ns,
        has_ts: p.has_ts(),
        caplen: p.caplen,
        origlen: p.origlen,
        ..Default::default()
    };
    dissect(cap.data(p), p.link, &meta, &ctx, Opts::FULL)
}

fn val<'a>(d: &'a Dissection, n: &str) -> Option<&'a Value> {
    d.fields.iter().find(|f| f.name == n).map(|f| &f.value)
}

fn find_text(nodes: &[Node], needle: &str) -> bool {
    nodes
        .iter()
        .any(|n| n.label.contains(needle) || find_text(&n.children, needle))
}

#[test]
fn modbus_pairs_response_time_exception_no_response_orphan() {
    let mut c = conv(502);
    c.handshake(1.0);
    c.c2s(2.0, &mbap(7, 1, &[3, 0, 0, 0, 2])); // 프레임 4
    c.s2c(2.0125, &mbap(7, 1, &[3, 4, 0x13, 0x88, 0, 5])); // 5 — 응답 시간 12.5 ms
    c.c2s(2.1, &mbap(8, 1, &[3, 0, 9, 0, 1])); // 6 — 끝내 응답 없음
    c.c2s(2.2, &mbap(9, 1, &[3, 0xff, 0xff, 0, 1])); // 7
    c.s2c(2.205, &mbap(9, 1, &[0x83, 2])); // 8 — 예외 02
    c.s2c(2.3, &mbap(99, 1, &[3, 2, 0, 1])); // 9 — 요청 없는 응답
    c.c2s(4.0, &mbap(10, 1, &[3, 0, 0, 0, 1])); // 10 — 캡처 끝에 가까움(응답 기다릴 시간 부족: 마지막 시각 4.0)
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.pdus.len(), 7);
    assert!(a.pdus.iter().all(|p| p.app == App::Modbus));
    // 요청 7 ↔ 응답 7
    let p0 = &a.pdus[0];
    let p1 = &a.pdus[1];
    assert_eq!((p0.pair, p1.pair), (1, 0));
    assert_eq!(p0.resp_ns, 12_500_000);
    assert_eq!((p0.status, p1.status), (PairStatus::Ok, PairStatus::Ok));
    // 응답 없음(제한 시간 1 s 가 지났다 — 뒤에 4.0 초 프레임이 있다)
    assert_eq!(a.pdus[2].status, PairStatus::Timeout);
    // 예외
    assert_eq!(
        (a.pdus[3].status, a.pdus[4].status),
        (PairStatus::Exception, PairStatus::Exception)
    );
    // 요청 없는 응답
    assert_eq!(a.pdus[5].status, PairStatus::Orphan);
    // 마지막 요청은 제한 시간이 되기 전에 캡처가 끝남
    assert_eq!(a.pdus[6].status, PairStatus::CaptureEnd);

    // 해석 — 응답 프레임
    let d = full(&cap, &a, &prefs, 5, None);
    assert_eq!(d.protocols(), "frame:eth:ip:tcp:mbtcp:modbus");
    assert_eq!(val(&d, "modbus.request_frame"), Some(&Value::U(4)));
    assert_eq!(val(&d, "modbus.response_time"), Some(&Value::F(0.0125)));
    assert_eq!(val(&d, "modbus.func_code"), Some(&Value::U(3)));
    assert_eq!(val(&d, "mbtcp.trans_id"), Some(&Value::U(7)));
    assert_eq!(
        d.fields
            .iter()
            .filter(|f| f.name == "modbus.regval_uint16")
            .map(|f| f.value.clone())
            .collect::<Vec<_>>(),
        vec![Value::U(0x1388), Value::U(5)]
    );
    assert!(
        d.cols
            .info
            .starts_with("Response: Trans: 7; Unit: 1, Func: 3: Read Holding Registers"),
        "{}",
        d.cols.info
    );
    // 요청 프레임
    let d = full(&cap, &a, &prefs, 4, None);
    assert_eq!(val(&d, "modbus.reference_num"), Some(&Value::U(0)));
    assert_eq!(val(&d, "modbus.word_cnt"), Some(&Value::U(2)));
    assert_eq!(
        d.cols.info,
        "Query: Trans: 7; Unit: 1, Func: 3: Read Holding Registers"
    );
    // 예외 프레임
    let d = full(&cap, &a, &prefs, 8, None);
    assert_eq!(val(&d, "modbus.exception_code"), Some(&Value::U(2)));
    assert_eq!(val(&d, "modbus.func_code"), Some(&Value::U(3)));
    let e = d
        .experts
        .iter()
        .find(|e| e.key == "modbus.exception")
        .unwrap();
    assert_eq!(e.code, 2);
    let ex = describe(e, Lang::Ko).unwrap();
    assert!(
        ex.code_name.as_deref().unwrap().contains("데이터 주소"),
        "{ex:?}"
    );
    assert!(ex.code_check.unwrap().contains("40001"));
    // 무응답 요청 프레임·요청 없는 응답에 Expert
    assert!(
        full(&cap, &a, &prefs, 6, None)
            .experts
            .iter()
            .any(|e| e.key == "pair.no_response")
    );
    assert!(
        full(&cap, &a, &prefs, 9, None)
            .experts
            .iter()
            .any(|e| e.key == "pair.orphan")
    );
    assert!(
        full(&cap, &a, &prefs, 10, None)
            .experts
            .iter()
            .any(|e| e.key == "pair.capture_end")
    );
}

#[test]
fn modbus_pdu_split_across_segments_and_two_pdus_in_one_segment() {
    let mut c = conv(502);
    c.handshake(1.0);
    let req = mbap(1, 1, &[3, 0, 0, 0, 2]);
    c.c2s(2.0, &req[..5]); // 프레임 4: 앞 5바이트
    c.c2s(2.001, &req[5..]); // 프레임 5: 나머지 — 여기서 PDU 완성
    let two = [mbap(2, 1, &[3, 0, 0, 0, 1]), mbap(3, 1, &[3, 0, 1, 0, 1])].concat();
    c.c2s(2.1, &two); // 프레임 6: PDU 2개
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.pdus.len(), 3);
    assert_eq!((a.pdus[0].first_frame, a.pdus[0].frame), (4, 5));
    assert_eq!((a.pdus[1].frame, a.pdus[2].frame), (6, 6));
    assert_eq!(a.pdus_of(5).len(), 1);
    assert_eq!(a.pdus_of(4).len(), 0);
    let d4 = full(&cap, &a, &prefs, 4, None);
    assert!(find_text(&d4.tree, "TCP segment of a reassembled PDU"));
    let d5 = full(&cap, &a, &prefs, 5, None);
    assert_eq!(val(&d5, "modbus.reference_num"), Some(&Value::U(0)));
    let d6 = full(&cap, &a, &prefs, 6, None);
    assert_eq!(
        d6.fields
            .iter()
            .filter(|f| f.name == "mbtcp.trans_id")
            .count(),
        2
    );
    // 분석 없이도 한 세그먼트 안의 PDU 두 개는 풀린다
    let none = Ctx::basic(&prefs);
    let p = &cap.packets[5];
    let meta = Meta {
        number: 6,
        caplen: p.caplen,
        origlen: p.origlen,
        ..Default::default()
    };
    let d = dissect(cap.data(p), p.link, &meta, &none, Opts::FULL);
    assert_eq!(
        d.fields
            .iter()
            .filter(|f| f.name == "mbtcp.trans_id")
            .count(),
        2
    );
}

#[test]
fn modbus_unit_mismatch_and_device_map_names() {
    let mut c = conv(502);
    c.handshake(1.0);
    c.c2s(2.0, &mbap(1, 1, &[3, 1, 0x30, 0, 1])); // 주소 304 한 칸
    c.s2c(2.01, &mbap(1, 9, &[3, 2, 0x13, 0x88])); // 국번이 다른 응답
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    assert!(a.pdus[0].unit_mismatch && a.pdus[1].unit_mismatch);
    let map = DeviceMap::from_json(r#"{"id":"t/t","model":"T","registers":[{"table":"holding-registers","address":304,"type":"u16","name":{"ko":"주파수","en":"Frequency"},"unit":"Hz","scale":0.01}]}"#).unwrap();
    let d = full(&cap, &a, &prefs, 5, Some(&map));
    assert!(d.experts.iter().any(|e| e.key == "modbus.unit_mismatch"));
    assert!(
        find_text(&d.tree, "40305 Frequency = 50.00 Hz"),
        "{:#?}",
        d.tree.last()
    );
}

#[test]
fn mc_binary_sniffed_pairs_by_order_and_end_code_explained() {
    let mut c = conv(5007); // 목록 밖 포트 — 모양으로 찾는다
    c.handshake(1.0);
    let rd = mc3e_req(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x02, 0x00]); // D100 ×2
    c.c2s(2.0, &rd);
    c.s2c(2.003, &mc3e_resp(0, &[0x34, 0x12, 0x02, 0x00]));
    c.c2s(2.1, &rd);
    c.s2c(
        2.102,
        &mc3e_resp(0xc059, &[0, 0xff, 0xff, 0x03, 0x00, 0x01, 0x04, 0x00, 0x00]),
    );
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.flows[0].app, Some(App::Mc));
    assert_eq!(a.pdus.len(), 4);
    assert_eq!(a.pdus[0].resp_ns, 3_000_000);
    assert_eq!(a.pdus[2].status, PairStatus::Exception);
    let d = full(&cap, &a, &prefs, 5, None);
    assert_eq!(val(&d, "mc.end_code"), Some(&Value::U(0)));
    assert_eq!(val(&d, "mc.response_time"), Some(&Value::F(0.003)));
    assert!(
        find_text(&d.tree, "D100 = 4660 (0x1234)"),
        "{:#?}",
        d.tree.last()
    );
    assert!(
        d.cols.info.starts_with("3E Response Read (words)"),
        "{}",
        d.cols.info
    );
    let d = full(&cap, &a, &prefs, 7, None);
    assert_eq!(val(&d, "mc.end_code"), Some(&Value::U(0xc059)));
    let e = d.experts.iter().find(|e| e.key == "mc.end_code").unwrap();
    let ex = describe(e, Lang::Ko).unwrap();
    assert!(ex.code_name.unwrap().contains("명령"));
    assert!(ex.code_check.unwrap().contains("서브명령"));
    let req = full(&cap, &a, &prefs, 4, None);
    assert_eq!(val(&req, "mc.command"), Some(&Value::U(0x0401)));
    assert_eq!(val(&req, "mc.device"), Some(&Value::Str("D100".into())));
    assert_eq!(val(&req, "mc.points"), Some(&Value::U(2)));
}

#[test]
fn mc_4e_pairs_by_serial_out_of_order() {
    let mut c = conv(5007);
    c.handshake(1.0);
    let r = |s: u16| mc4e_req(s, &[0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41]);
    c.c2s(2.0, &r(0x0001));
    c.c2s(2.001, &r(0x0002));
    c.s2c(2.002, &mc4e_resp(0x0002, 0, &[0x01, 0x00, 0x41]));
    c.s2c(2.004, &mc4e_resp(0x0001, 0, &[0x01, 0x00, 0x41]));
    let cap = open(&c);
    let a = Analysis::build(&cap, &Prefs::default());
    assert_eq!(a.pdus.len(), 4);
    assert_eq!((a.pdus[0].pair, a.pdus[1].pair), (3, 2));
    assert_eq!(
        (a.pdus[0].resp_ns, a.pdus[1].resp_ns),
        (4_000_000, 1_000_000)
    );
}

#[test]
fn mc_over_udp_with_port_list() {
    let prefs = Prefs {
        mc_ports: vec![5001],
        ..Prefs::default()
    };
    let mk = |sport: u16, dport: u16, p: Vec<u8>| IpPkt {
        src: [10, 0, 0, if sport == 5001 { 2 } else { 1 }],
        dst: [10, 0, 0, if sport == 5001 { 1 } else { 2 }],
        sport,
        dport,
        udp: true,
        payload: p,
        ..Default::default()
    };
    let req = mc3e_ascii_req("04010000D*0001000003");
    let resp = mc3e_ascii_resp("123400021DEF", 0);
    let recs = vec![
        Rec::t(1.0, wrap(1, &ipv4(&mk(40000, 5001, req)), None)),
        Rec::t(1.002, wrap(1, &ipv4(&mk(5001, 40000, resp)), None)),
    ];
    let cap = Capture::from_bytes(pcap(&recs, 1, false, false)).unwrap();
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.pdus.len(), 2);
    assert_eq!(a.pdus[0].resp_ns, 2_000_000);
    let d = full(&cap, &a, &prefs, 2, None);
    assert_eq!(d.protocols(), "frame:eth:ip:udp:mc");
    assert!(find_text(&d.tree, "D100 = 4660 (0x1234)"));
}

#[test]
fn xgt_pairs_and_error_explained() {
    let mut c = conv(2004);
    c.handshake(1.0);
    let rq = xgt_req(
        1,
        &[&[0x54u8, 0, 2, 0, 0, 0, 1, 0, 6, 0][..], b"%MW100"].concat(),
    );
    c.c2s(2.0, &rq);
    let hdr = |inv: u16, body: &[u8]| {
        let mut h = b"LSIS-XGT".to_vec();
        h.extend([0, 0, 0, 1, 0xa0, 0x11]);
        h.extend(inv.to_le_bytes());
        h.extend((body.len() as u16).to_le_bytes());
        h.push(0);
        let s = h.iter().fold(0u8, |a, &x| a.wrapping_add(x));
        h.push(s);
        h.extend(body);
        h
    };
    c.s2c(
        2.004,
        &hdr(1, &[0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]),
    );
    let rq2 = xgt_req(
        2,
        &[&[0x54u8, 0, 2, 0, 0, 0, 1, 0, 6, 0][..], b"%MW999"].concat(),
    );
    c.c2s(2.1, &rq2);
    c.s2c(2.103, &hdr(2, &[0x55, 0, 2, 0, 0, 0, 0xff, 0xff, 4, 0]));
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.flows[0].app, Some(App::Xgt));
    assert_eq!(a.pdus.len(), 4);
    assert_eq!(a.pdus[0].resp_ns, 4_000_000);
    assert_eq!(a.pdus[2].status, PairStatus::Exception);
    let d = full(&cap, &a, &prefs, 5, None);
    assert_eq!(val(&d, "xgt.response_time"), Some(&Value::F(0.004)));
    assert!(
        find_text(&d.tree, "%MW100 = 4660 (0x1234)"),
        "{:#?}",
        d.tree.last()
    );
    let d = full(&cap, &a, &prefs, 7, None);
    let e = d.experts.iter().find(|e| e.key == "xgt.error").unwrap();
    let ex = describe(e, Lang::En).unwrap();
    assert_eq!(ex.code_name.as_deref(), Some("Device area exceeded"));
    let rq = full(&cap, &a, &prefs, 4, None);
    assert_eq!(val(&rq, "xgt.variable"), Some(&Value::Str("%MW100".into())));
}

#[test]
fn rtu_over_tcp_pairs_by_unit_and_function() {
    let with_crc = |b: &[u8]| {
        let mut v = b.to_vec();
        let c = portdock_packet::industrial::modbus_crc(b);
        v.extend([(c & 0xff) as u8, (c >> 8) as u8]);
        v
    };
    let prefs = Prefs {
        modbus_rtu_ports: vec![8502],
        ..Prefs::default()
    };
    let mut c = conv(8502);
    c.handshake(1.0);
    c.c2s(2.0, &with_crc(&[1, 3, 0, 0x6b, 0, 3]));
    c.s2c(2.02, &with_crc(&[1, 3, 6, 2, 0x2b, 0, 0, 0, 0x64]));
    let cap = open(&c);
    let a = Analysis::build(&cap, &prefs);
    assert_eq!(a.pdus.len(), 2);
    assert_eq!(
        (a.pdus[0].app, a.pdus[0].resp_ns),
        (App::ModbusRtu, 20_000_000)
    );
    let d = full(&cap, &a, &prefs, 5, None);
    assert_eq!(val(&d, "modbus.func_code"), Some(&Value::U(3)));
    assert_eq!(val(&d, "modbus.byte_cnt"), Some(&Value::U(6)));
}

#[test]
fn connection_closed_without_response() {
    let mut c = conv(502);
    c.handshake(1.0);
    c.c2s(2.0, &mbap(1, 1, &[3, 0, 0, 0, 1]));
    c.rst(false, 2.01);
    let cap = open(&c);
    let a = Analysis::build(&cap, &Prefs::default());
    assert_eq!(a.pdus[0].status, PairStatus::Closed);
    assert!(
        describe(
            &portdock_packet::dissect::ExpertInfo {
                severity: Severity::Warn,
                key: "tcp.rst",
                code: 0,
                text: String::new(),
                start: 0,
                len: 0
            },
            Lang::Ko
        )
        .is_some()
    );
}
