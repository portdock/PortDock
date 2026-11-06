//! 시험·측정용 캡처 바이트 만들기 — `site/src/lib/pcapFixture.ts` 와 같은 모양(공개 샘플 파일을 받지 않는다).
//! 엔진 본체는 이 모듈을 쓰지 않는다.

#[derive(Clone, Default)]
pub struct IpPkt {
    pub src: [u8; 4],
    pub dst: [u8; 4],
    pub sport: u16,
    pub dport: u16,
    pub udp: bool,
    pub seq: u32,
    pub ack: u32,
    /// FIN 1 · SYN 2 · RST 4 · PSH 8 · ACK 16
    pub flags: u8,
    pub payload: Vec<u8>,
    pub ip_id: u16,
    /// TCP 창 크기(기본 65535)
    pub window: Option<u16>,
}

#[derive(Clone)]
pub struct Rec {
    /// 유닉스 초(소수 — 마이크로초까지)
    pub t: f64,
    /// 그 초 안의 나노초를 직접(있으면 t 의 소수는 무시)
    pub ns: Option<u32>,
    pub data: Vec<u8>,
    pub iface: u32,
    pub spb: bool,
}

impl Rec {
    pub fn t(t: f64, data: Vec<u8>) -> Rec {
        Rec {
            t,
            ns: None,
            data,
            iface: 0,
            spb: false,
        }
    }
    pub fn ns(sec: u64, ns: u32, data: Vec<u8>) -> Rec {
        Rec {
            t: sec as f64,
            ns: Some(ns),
            data,
            iface: 0,
            spb: false,
        }
    }
    pub fn on(mut self, iface: u32) -> Rec {
        self.iface = iface;
        self
    }
}

fn be16(n: u16) -> [u8; 2] {
    n.to_be_bytes()
}
fn be32(n: u32) -> [u8; 4] {
    n.to_be_bytes()
}

fn csum(b: &[u8]) -> u16 {
    let mut s: u32 = 0;
    for c in b.chunks(2) {
        s += ((c[0] as u32) << 8) | *c.get(1).unwrap_or(&0) as u32;
    }
    while s > 0xffff {
        s = (s & 0xffff) + (s >> 16);
    }
    !(s as u16)
}

/// IPv4 + TCP/UDP 바이트
pub fn ipv4(p: &IpPkt) -> Vec<u8> {
    let mut l4 = Vec::new();
    if p.udp {
        l4.extend(be16(p.sport));
        l4.extend(be16(p.dport));
        l4.extend(be16(8 + p.payload.len() as u16));
        l4.extend([0, 0]);
    } else {
        l4.extend(be16(p.sport));
        l4.extend(be16(p.dport));
        l4.extend(be32(p.seq));
        l4.extend(be32(p.ack));
        l4.extend([0x50, p.flags]);
        l4.extend(be16(p.window.unwrap_or(65535)));
        l4.extend([0, 0, 0, 0]);
    }
    l4.extend(&p.payload);
    let total = 20 + l4.len() as u16;
    let mut h = vec![0x45, 0];
    h.extend(be16(total));
    h.extend(be16(p.ip_id));
    h.extend([0x40, 0, 64, if p.udp { 17 } else { 6 }, 0, 0]);
    h.extend(p.src);
    h.extend(p.dst);
    let c = csum(&h);
    h[10] = (c >> 8) as u8;
    h[11] = c as u8;
    h.extend(l4);
    h
}

/// 링크 머리 씌우기 — 1 Ethernet(vlan 이면 802.1Q), 113 SLL, 276 SLL2, 101 Raw, 0 NULL
pub fn wrap(link: u32, ip: &[u8], vlan: Option<u16>) -> Vec<u8> {
    let mac = [0x02u8, 0, 0, 0, 0, 1, 0x02, 0, 0, 0, 0, 2];
    let mut out: Vec<u8> = match link {
        1 => match vlan {
            Some(v) => [&mac[..], &[0x81, 0x00], &be16(v)[..], &[0x08, 0x00]].concat(),
            None => [&mac[..], &[0x08, 0x00]].concat(),
        },
        113 => vec![0, 0, 0, 1, 0, 6, 2, 0, 0, 0, 0, 2, 0, 0, 0x08, 0x00],
        276 => vec![
            0x08, 0x00, 0, 0, 0, 0, 0, 2, 0, 1, 0, 6, 2, 0, 0, 0, 0, 2, 0, 0,
        ],
        0 => vec![2, 0, 0, 0],
        _ => vec![],
    };
    out.extend(ip);
    if link == 1 {
        while out.len() < 60 {
            out.push(0);
        }
    }
    out
}

fn w32(le: bool, n: u32) -> [u8; 4] {
    if le { n.to_le_bytes() } else { n.to_be_bytes() }
}
fn w16(le: bool, n: u16) -> [u8; 2] {
    if le { n.to_le_bytes() } else { n.to_be_bytes() }
}

/// 고전 pcap — nano 면 나노초 매직, big 이면 큰 자리 먼저
pub fn pcap(recs: &[Rec], link: u32, nano: bool, big: bool) -> Vec<u8> {
    let le = !big;
    let mut out = Vec::new();
    out.extend(w32(le, if nano { 0xa1b23c4d } else { 0xa1b2c3d4 }));
    out.extend(w16(le, 2));
    out.extend(w16(le, 4));
    out.extend(w32(le, 0));
    out.extend(w32(le, 0));
    out.extend(w32(le, 65535));
    out.extend(w32(le, link));
    for r in recs {
        let sec = r.t.floor() as u32;
        let frac = match r.ns {
            Some(ns) => {
                if nano {
                    ns
                } else {
                    ns / 1000
                }
            }
            None => ((r.t - sec as f64) * 1e6).round() as u32 * if nano { 1000 } else { 1 },
        };
        out.extend(w32(le, sec));
        out.extend(w32(le, frac));
        out.extend(w32(le, r.data.len() as u32));
        out.extend(w32(le, r.data.len() as u32));
        out.extend(&r.data);
    }
    out
}

fn block(le: bool, ty: u32, mut body: Vec<u8>) -> Vec<u8> {
    while !body.len().is_multiple_of(4) {
        body.push(0);
    }
    let len = 12 + body.len() as u32;
    let mut o = Vec::new();
    o.extend(w32(le, ty));
    o.extend(w32(le, len));
    o.extend(body);
    o.extend(w32(le, len));
    o
}

#[derive(Clone)]
pub struct NgIface {
    pub link: u16,
    /// if_tsresol 값(9 = 나노초). 없으면 마이크로초
    pub tsresol: Option<u8>,
    pub snap: u32,
}

/// pcapng 한 구역 — recs 의 iface 로 EPB, spb 가 참이면 SPB(시각 없음, 인터페이스 0)
pub fn pcapng(ifaces: &[NgIface], recs: &[Rec], big: bool) -> Vec<u8> {
    let le = !big;
    let mut out = Vec::new();
    let mut shb = Vec::new();
    shb.extend(w32(le, 0x1a2b3c4d));
    shb.extend(w16(le, 1));
    shb.extend(w16(le, 0));
    shb.extend([0xffu8; 8]);
    out.extend(block(le, 0x0a0d0d0a, shb));
    for f in ifaces {
        let mut b = Vec::new();
        b.extend(w16(le, f.link));
        b.extend([0, 0]);
        b.extend(w32(le, f.snap));
        if let Some(r) = f.tsresol {
            b.extend(w16(le, 9));
            b.extend(w16(le, 1));
            b.extend([r, 0, 0, 0]);
            b.extend([0, 0, 0, 0]);
        }
        out.extend(block(le, 1, b));
    }
    for r in recs {
        if r.spb {
            let mut b = Vec::new();
            b.extend(w32(le, r.data.len() as u32));
            b.extend(&r.data);
            out.extend(block(le, 3, b));
            continue;
        }
        let f = &ifaces[r.iface as usize];
        let res = f.tsresol.unwrap_or(6) as u32;
        let per = 10u128.pow(res);
        let sec = r.t.floor() as u128;
        let frac = match r.ns {
            Some(ns) => ns as u128 * per / 1_000_000_000,
            None => ((r.t - r.t.floor()) * 1e6).round() as u128 * per / 1_000_000,
        };
        let units = sec * per + frac;
        let mut b = Vec::new();
        b.extend(w32(le, r.iface));
        b.extend(w32(le, (units >> 32) as u32));
        b.extend(w32(le, units as u32));
        b.extend(w32(le, r.data.len() as u32));
        b.extend(w32(le, r.data.len() as u32));
        b.extend(&r.data);
        out.extend(block(le, 6, b));
    }
    out
}

#[derive(Clone)]
pub struct End {
    pub ip: [u8; 4],
    pub port: u16,
    pub seq: u32,
    pub id: u16,
}

/// TCP 연결 하나 — 순서 번호를 알아서 센다. 보낸 패킷은 (시각, ip 바이트)로 쌓인다
pub struct TcpConv {
    pub c: End,
    pub s: End,
    pub out: Vec<(f64, Vec<u8>)>,
}

impl TcpConv {
    pub fn new(client: [u8; 4], cport: u16, server: [u8; 4], sport: u16) -> TcpConv {
        TcpConv {
            c: End {
                ip: client,
                port: cport,
                seq: 1000,
                id: 100,
            },
            s: End {
                ip: server,
                port: sport,
                seq: 50000,
                id: 900,
            },
            out: Vec::new(),
        }
    }

    fn send_full(
        &mut self,
        from_client: bool,
        t: f64,
        payload: &[u8],
        flags: u8,
        seq: Option<u32>,
        window: Option<u16>,
        ack: Option<u32>,
    ) {
        let (a, b) = if from_client {
            (&mut self.c, &self.s)
        } else {
            (&mut self.s, &self.c)
        };
        let pkt = ipv4(&IpPkt {
            src: a.ip,
            dst: b.ip,
            sport: a.port,
            dport: b.port,
            seq: seq.unwrap_or(a.seq),
            ack: ack.unwrap_or(b.seq),
            flags,
            payload: payload.to_vec(),
            ip_id: a.id,
            window,
            ..Default::default()
        });
        a.id = a.id.wrapping_add(1);
        if seq.is_none() {
            a.seq = a
                .seq
                .wrapping_add(payload.len() as u32 + u32::from(flags & 3 != 0));
        }
        self.out.push((t, pkt));
    }

    pub fn handshake(&mut self, t: f64) -> &mut Self {
        self.send_full(true, t, &[], 0x02, None, None, None);
        self.send_full(false, t + 0.0001, &[], 0x12, None, None, None);
        self.send_full(true, t + 0.0002, &[], 0x10, None, None, None);
        self
    }
    pub fn c2s(&mut self, t: f64, payload: &[u8]) -> &mut Self {
        self.send_full(true, t, payload, 0x18, None, None, None);
        self
    }
    pub fn s2c(&mut self, t: f64, payload: &[u8]) -> &mut Self {
        self.send_full(false, t, payload, 0x18, None, None, None);
        self
    }
    /// 지금 순서 번호를 바꾸지 않고(재전송처럼) 보낸다 — `seq_offset` 은 현재 번호에서 더하는 값(음수 가능)
    pub fn c2s_at(&mut self, t: f64, seq_offset: i64, payload: &[u8]) -> &mut Self {
        let seq = (self.c.seq as i64 + seq_offset) as u32;
        self.send_full(true, t, payload, 0x18, Some(seq), None, None);
        self
    }
    /// 순수 ACK(서버 → 클라이언트), 창 크기 지정 가능
    pub fn s_ack(&mut self, t: f64, window: u16) -> &mut Self {
        self.send_full(false, t, &[], 0x10, None, Some(window), None);
        self
    }
    /// 순수 ACK(클라이언트 → 서버) — 확인 번호를 직접(중복 ACK 만들기)
    pub fn c_ack(&mut self, t: f64, ack: u32) -> &mut Self {
        self.send_full(true, t, &[], 0x10, None, None, Some(ack));
        self
    }
    /// 순서 번호를 건너뛴다(캡처가 빠뜨린 바이트)
    pub fn skip_client(&mut self, n: u32) -> &mut Self {
        self.c.seq = self.c.seq.wrapping_add(n);
        self
    }
    pub fn fin(&mut self, from_client: bool, t: f64) -> &mut Self {
        self.send_full(from_client, t, &[], 0x11, None, None, None);
        self
    }
    pub fn rst(&mut self, from_client: bool, t: f64) -> &mut Self {
        self.send_full(from_client, t, &[], 0x04, None, None, None);
        self
    }
    pub fn recs(&self, link: u32, vlan: Option<u16>) -> Vec<Rec> {
        self.out
            .iter()
            .map(|(t, ip)| Rec::t(*t, wrap(link, ip, vlan)))
            .collect()
    }
}

// ---- 프로토콜 프레임

/// Modbus TCP 프레임
pub fn mbap(tid: u16, unit: u8, pdu: &[u8]) -> Vec<u8> {
    let mut v = Vec::new();
    v.extend(be16(tid));
    v.extend([0, 0]);
    v.extend(be16(pdu.len() as u16 + 1));
    v.push(unit);
    v.extend(pdu);
    v
}

fn le2(n: usize) -> [u8; 2] {
    (n as u16).to_le_bytes()
}

/// MC 3E 이진 요청(자기 국, 감시 타이머 0010)
pub fn mc3e_req(cmd: &[u8]) -> Vec<u8> {
    let mut v = vec![0x50, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00];
    v.extend(le2(2 + cmd.len()));
    v.extend([0x10, 0x00]);
    v.extend(cmd);
    v
}
pub fn mc3e_resp(end: u16, data: &[u8]) -> Vec<u8> {
    let mut v = vec![0xd0, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00];
    v.extend(le2(2 + data.len()));
    v.extend(end.to_le_bytes());
    v.extend(data);
    v
}
pub fn mc4e_req(serial: u16, cmd: &[u8]) -> Vec<u8> {
    let mut v = vec![0x54, 0x00];
    v.extend(serial.to_le_bytes());
    v.extend([0, 0, 0x00, 0xff, 0xff, 0x03, 0x00]);
    v.extend(le2(2 + cmd.len()));
    v.extend([0x10, 0x00]);
    v.extend(cmd);
    v
}
pub fn mc4e_resp(serial: u16, end: u16, data: &[u8]) -> Vec<u8> {
    let mut v = vec![0xd4, 0x00];
    v.extend(serial.to_le_bytes());
    v.extend([0, 0, 0x00, 0xff, 0xff, 0x03, 0x00]);
    v.extend(le2(2 + data.len()));
    v.extend(end.to_le_bytes());
    v.extend(data);
    v
}
fn h4(n: usize) -> String {
    format!("{n:04X}")
}
/// MC 3E ASCII 요청·응답(글)
pub fn mc3e_ascii_req(cmd: &str) -> Vec<u8> {
    format!("500000FF03FF00{}0010{}", h4(4 + cmd.len()), cmd).into_bytes()
}
pub fn mc3e_ascii_resp(data: &str, end: u16) -> Vec<u8> {
    format!(
        "D00000FF03FF00{}{}{}",
        h4(4 + data.len()),
        h4(end as usize),
        data
    )
    .into_bytes()
}

/// XGT FEnet 요청 머리(BCC 맞게) + 몸체
pub fn xgt_req(invoke: u16, body: &[u8]) -> Vec<u8> {
    let mut h = b"LSIS-XGT".to_vec();
    h.extend([0, 0, 0, 0, 0xa0, 0x33]);
    h.extend(invoke.to_le_bytes());
    h.extend((body.len() as u16).to_le_bytes());
    h.push(0);
    let sum = h.iter().fold(0u8, |a, &x| a.wrapping_add(x));
    h.push(sum);
    h.extend(body);
    h
}
