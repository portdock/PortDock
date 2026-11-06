use portdock_packet::analysis::{Analysis, ann};
use portdock_packet::capture::Capture;
use portdock_packet::dissect::*;
use portdock_packet::fixture::*;

fn conv() -> TcpConv {
    TcpConv::new([10, 0, 0, 1], 50000, [10, 0, 0, 2], 5000)
}

fn open(c: &TcpConv) -> Capture {
    Capture::from_bytes(pcap(&c.recs(1, None), 1, false, false)).unwrap()
}

fn flags(a: &Analysis) -> Vec<u32> {
    a.ann.iter().map(|x| x.flags).collect()
}

#[test]
fn flow_and_relative_numbers() {
    let mut c = conv();
    c.handshake(1.0).c2s(1.1, b"hello").s2c(1.2, b"world!");
    let cap = open(&c);
    let a = Analysis::build(&cap, &Prefs::default());
    assert_eq!(a.flows.len(), 1);
    assert_eq!(a.flows[0].client.1, 50000);
    assert_eq!(a.flows[0].frames, vec![1, 2, 3, 4, 5]);
    // SYN: 상대 번호 0, SYN-ACK: 순서 0·확인 1, 데이터: 순서 1·확인 1
    assert_eq!(
        (a.ann[0].rel_seq, a.ann[1].rel_seq, a.ann[1].rel_ack),
        (0, 0, 1)
    );
    assert_eq!((a.ann[3].rel_seq, a.ann[3].rel_ack), (1, 1));
    assert_eq!((a.ann[4].rel_seq, a.ann[4].rel_ack), (1, 6));
    assert!(
        a.ann
            .iter()
            .all(|x| x.flow == 0 && x.flags & ann::ANY_ANALYSIS == 0),
        "{:?}",
        flags(&a)
    );
}

#[test]
fn retransmission_and_keepalive() {
    let mut c = conv();
    c.handshake(1.0)
        .c2s(1.1, b"abc")
        .c2s_at(1.2, -3, b"abc")
        .c2s_at(1.3, -1, &[0]);
    let a = Analysis::build(&open(&c), &Prefs::default());
    assert_eq!(a.ann[4].flags, ann::RETRANSMISSION);
    assert_eq!(a.ann[5].flags, ann::KEEP_ALIVE);
}

#[test]
fn lost_segment_then_out_of_order() {
    let mut c = conv();
    c.handshake(1.0);
    c.c2s_at(1.1, 3, b"def"); // abc 가 빠졌다
    c.c2s_at(1.2, 0, b"abc"); // 늦게 도착
    let a = Analysis::build(&open(&c), &Prefs::default());
    assert_eq!(a.ann[3].flags, ann::LOST_SEGMENT);
    assert_eq!(a.ann[4].flags, ann::OUT_OF_ORDER);
}

#[test]
fn dup_ack_zero_window_window_update() {
    let mut c = conv();
    c.handshake(1.0).s2c(1.1, b"12345");
    let (ack0, _) = (c.s.seq - 5, 0);
    c.c_ack(1.2, ack0).c_ack(1.3, ack0).c_ack(1.4, ack0);
    let a = Analysis::build(&open(&c), &Prefs::default());
    // 프레임 5·6·7: 같은 ACK 가 되풀이 — 중복 ACK #1~#3 (원래 ACK 는 3번 프레임)
    for (k, want) in [(4, 1), (5, 2), (6, 3)] {
        assert_eq!(
            a.ann[k].flags & ann::DUP_ACK,
            ann::DUP_ACK,
            "frame {}",
            k + 1
        );
        assert_eq!(a.ann[k].dup_ack_num, want);
        assert_eq!(a.ann[k].dup_ack_frame, 3);
    }
    let mut c = conv();
    c.handshake(1.0)
        .c2s(1.1, b"x")
        .s_ack(1.2, 0)
        .s_ack(1.3, 4000);
    let a = Analysis::build(&open(&c), &Prefs::default());
    assert_eq!(a.ann[4].flags, ann::ZERO_WINDOW);
    assert_eq!(a.ann[5].flags, ann::WINDOW_UPDATE);
}

#[test]
fn reset_and_close_marks() {
    let mut c = conv();
    c.handshake(1.0).c2s(1.1, b"q").rst(false, 1.2);
    let a = Analysis::build(&open(&c), &Prefs::default());
    assert_eq!(a.ann[4].flags & ann::RESET, ann::RESET);
    assert_eq!(a.flows[0].fin_rst_frame, Some(5));
}

#[test]
fn follow_stream_dedupes_retransmission_and_orders_directions() {
    let mut c = conv();
    c.handshake(1.0)
        .c2s(1.1, b"GET ")
        .c2s_at(1.15, -4, b"GET ")
        .c2s(1.2, b"/x")
        .s2c(1.3, b"OK")
        .s2c(1.4, b"!!")
        .c2s(1.5, b"bye");
    let cap = open(&c);
    let a = Analysis::build(&cap, &Prefs::default());
    let ch = a.follow(&cap, 0);
    let got: Vec<(bool, &[u8])> = ch.iter().map(|c| (c.from_client, &c.data[..])).collect();
    assert_eq!(
        got,
        vec![
            (true, &b"GET /x"[..]),
            (false, &b"OK!!"[..]),
            (true, &b"bye"[..])
        ]
    );
}

#[test]
fn dissection_uses_analysis_for_relative_seq_and_expert() {
    let mut c = conv();
    c.handshake(1.0).c2s(1.1, b"abc").c2s_at(1.2, -3, b"abc");
    let cap = open(&c);
    let prefs = Prefs::default();
    let a = Analysis::build(&cap, &prefs);
    let ctx = Ctx::basic(&prefs).with_analysis(&a, &cap);
    let i = 4;
    let p = &cap.packets[i];
    let meta = Meta {
        number: (i + 1) as u32,
        ts_ns: p.ts_ns,
        has_ts: true,
        caplen: p.caplen,
        origlen: p.origlen,
        ..Default::default()
    };
    let d = dissect(cap.data(p), p.link, &meta, &ctx, Opts::FULL);
    assert_eq!(d.get("tcp.seq").unwrap().value, Value::U(1));
    assert_eq!(d.get("tcp.seq_raw").unwrap().value, Value::U(1001));
    assert!(d.get("tcp.analysis.retransmission").is_some());
    assert_eq!(d.get("tcp.stream").unwrap().value, Value::U(0));
    assert!(
        d.cols.info.starts_with("[TCP Retransmission] 50000 → 5000"),
        "{}",
        d.cols.info
    );
    assert!(d.experts.iter().any(|e| e.key == "tcp.retransmission"));
    // 분석이 없으면 상대 번호 필드는 나오지 않는다
    let none = Ctx::basic(&prefs);
    let d = dissect(cap.data(p), p.link, &meta, &none, Opts::FULL);
    assert!(d.get("tcp.seq").is_none() && d.get("tcp.seq_raw").is_some());
}

#[test]
fn window_scale_from_syn_options() {
    // SYN·SYN-ACK 에 창 배율 옵션을 단 손수 만든 패킷은 fixture 에 없으므로 옵션 없는 경우(배율 0)만 확인
    let mut c = conv();
    c.handshake(1.0).c2s(1.1, b"a");
    let a = Analysis::build(&open(&c), &Prefs::default());
    assert_eq!(a.ann[3].win_scale, 0);
}
