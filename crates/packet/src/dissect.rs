//! 패킷 하나를 계층별 필드 트리로 푼다 — 이더넷·VLAN·ARP·IPv4·IPv6·ICMP·ICMPv6·TCP·UDP·DNS·DHCP 와 산업 프로토콜.
//!
//! 필드 이름은 Wireshark 와 같다(`eth.src`·`ip.addr`·`tcp.flags.syn` …, 근거: wireshark.org/docs/dfref).
//! MC·XGT 는 Wireshark 에 없어 `mc.*`·`xgt.*` 는 PortDock 이 정한 이름이다.
//! 지연 해석: `Depth` 까지만 푼다(필터가 `ip.addr` 만 쓰면 TCP 이하는 풀지 않는다). 트리·열 글자는 요청할 때만 만든다.

use crate::analysis::Analysis;
use crate::capture::Capture;
use crate::devmap::RegisterNamer;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    U(u64),
    I(i64),
    F(f64),
    B(bool),
    Mac([u8; 6]),
    Ip4([u8; 4]),
    Ip6([u8; 16]),
    Str(String),
    /// 프레임 안의 바이트(시작·길이)
    Bytes(u32, u32),
    /// 라벨·프로토콜 이름처럼 값 없이 «있다» 만 뜻하는 것
    Present,
}

#[derive(Clone, Debug)]
pub struct FieldVal {
    pub name: &'static str,
    pub value: Value,
    pub start: u32,
    pub len: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Chat,
    Note,
    Warn,
    Error,
}

#[derive(Clone, Debug)]
pub struct ExpertInfo {
    pub severity: Severity,
    /// 평문 설명 표(`expert::explain`)의 열쇠
    pub key: &'static str,
    /// 예외·종료·오류 코드(없으면 0)
    pub code: u32,
    pub text: String,
    pub start: u32,
    pub len: u32,
}

#[derive(Clone, Debug, Default)]
pub struct Node {
    pub label: String,
    /// 필터 필드 이름(없으면 빈 글)
    pub name: &'static str,
    /// 프레임 안의 바이트 범위
    pub start: u32,
    pub len: u32,
    pub children: Vec<Node>,
    pub expert: Option<Severity>,
}

#[derive(Clone, Debug, Default)]
pub struct Columns {
    pub src: String,
    pub dst: String,
    pub protocol: String,
    pub info: String,
}

#[derive(Clone, Debug, Default)]
pub struct Dissection {
    pub fields: Vec<FieldVal>,
    pub tree: Vec<Node>,
    /// «eth:ethertype:ip:tcp:mbtcp:modbus» 의 조각들
    pub layers: Vec<&'static str>,
    pub cols: Columns,
    pub experts: Vec<ExpertInfo>,
    /// 마지막으로 풀린 깊이
    pub reached: u8,
}

impl Dissection {
    pub fn clear(&mut self) {
        self.fields.clear();
        self.tree.clear();
        self.layers.clear();
        self.cols = Columns::default();
        self.experts.clear();
        self.reached = 0;
    }
    pub fn protocols(&self) -> String {
        self.layers.join(":")
    }
    pub fn get(&self, name: &str) -> Option<&FieldVal> {
        self.fields.iter().find(|f| f.name == name)
    }
}

/// 어디까지 풀지 — 필터가 필요한 가장 깊은 계층
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Depth {
    Frame = 0,
    Link = 1,
    Network = 2,
    Transport = 3,
    App = 4,
}

#[derive(Clone, Copy, Debug)]
pub struct Opts {
    pub depth: Depth,
    pub tree: bool,
    pub columns: bool,
    /// 응용 계층 중 풀 것(`APP_*` 비트) — 필터가 DNS 필드만 쓰면 산업 프로토콜은 풀지 않는다
    pub apps: u8,
}

pub const APP_DNS: u8 = 1;
pub const APP_DHCP: u8 = 2;
pub const APP_INDUSTRIAL: u8 = 4;
pub const APP_ALL: u8 = 7;

impl Opts {
    pub const FULL: Opts = Opts {
        depth: Depth::App,
        tree: true,
        columns: true,
        apps: APP_ALL,
    };
    pub fn filter(depth: Depth) -> Opts {
        Opts {
            depth,
            tree: false,
            columns: false,
            apps: APP_ALL,
        }
    }
    /// 목록 한 줄(열)만 필요할 때
    pub const COLUMNS: Opts = Opts {
        depth: Depth::App,
        tree: false,
        columns: true,
        apps: APP_ALL,
    };
}

/// 프레임 바깥에서 오는 정보
#[derive(Clone, Copy, Debug, Default)]
pub struct Meta {
    /// 1부터
    pub number: u32,
    pub ts_ns: i64,
    pub has_ts: bool,
    pub prev_ts_ns: Option<i64>,
    pub first_ts_ns: Option<i64>,
    pub caplen: u32,
    pub origlen: u32,
    pub iface: u32,
}

/// 포트·자동 판별 설정
#[derive(Clone, Debug)]
pub struct Prefs {
    pub modbus_ports: Vec<u16>,
    /// Modbus RTU 프레임이 TCP 로 그대로 실려 오는 포트
    pub modbus_rtu_ports: Vec<u16>,
    pub mc_ports: Vec<u16>,
    pub xgt_ports: Vec<u16>,
    /// 목록 밖 포트에서 첫 바이트 모양으로 찾기
    pub auto_detect: bool,
    /// 이 시간 안에 응답이 없으면 «무응답»
    pub timeout_ms: u32,
}

impl Default for Prefs {
    fn default() -> Self {
        Prefs {
            modbus_ports: vec![502],
            modbus_rtu_ports: vec![],
            mc_ports: vec![],
            xgt_ports: vec![2004, 2005],
            auto_detect: true,
            timeout_ms: 1000,
        }
    }
}

// ---------------------------------------------------------------- 글자 도우미

pub fn mac_str(m: &[u8]) -> String {
    format!(
        "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
        m[0], m[1], m[2], m[3], m[4], m[5]
    )
}
pub fn ip4_str(a: &[u8]) -> String {
    format!("{}.{}.{}.{}", a[0], a[1], a[2], a[3])
}
pub fn ip6_str(a: &[u8; 16]) -> String {
    std::net::Ipv6Addr::from(*a).to_string()
}

fn civil(days: i64) -> (i64, u32, u32) {
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z.rem_euclid(146097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// «2026-11-06 12:00:00.123456789 UTC»
pub fn fmt_utc(ts_ns: i64) -> String {
    let sec = ts_ns.div_euclid(1_000_000_000);
    let ns = ts_ns.rem_euclid(1_000_000_000);
    let (y, m, d) = civil(sec.div_euclid(86400));
    let r = sec.rem_euclid(86400);
    format!(
        "{y:04}-{m:02}-{d:02} {:02}:{:02}:{:02}.{ns:09} UTC",
        r / 3600,
        (r % 3600) / 60,
        r % 60
    )
}

pub fn be16(f: &[u8], i: usize) -> u16 {
    u16::from_be_bytes([f[i], f[i + 1]])
}
pub fn be32(f: &[u8], i: usize) -> u32 {
    u32::from_be_bytes([f[i], f[i + 1], f[i + 2], f[i + 3]])
}

pub fn ether_type_name(t: u16) -> &'static str {
    match t {
        0x0800 => "IPv4",
        0x0806 => "ARP",
        0x86dd => "IPv6",
        0x8100 => "802.1Q Virtual LAN",
        0x88a8 => "802.1ad Provider Bridging",
        0x88cc => "LLDP",
        0x8892 => "PROFINET",
        0x88a4 => "EtherCAT",
        0x0842 => "Wake-on-LAN",
        _ => "Unknown",
    }
}

pub fn ip_proto_name(p: u8) -> &'static str {
    match p {
        1 => "ICMP",
        2 => "IGMP",
        6 => "TCP",
        17 => "UDP",
        41 => "IPv6",
        47 => "GRE",
        50 => "ESP",
        58 => "ICMPv6",
        89 => "OSPF",
        132 => "SCTP",
        _ => "Unknown",
    }
}

pub const FIN: u8 = 1;
pub const SYN: u8 = 2;
pub const RST: u8 = 4;
pub const PSH: u8 = 8;
pub const ACK: u8 = 16;

pub fn tcp_flag_names(fl: u16) -> String {
    let mut v = Vec::new();
    for (bit, n) in [
        (0x002, "SYN"),
        (0x001, "FIN"),
        (0x004, "RST"),
        (0x008, "PSH"),
        (0x010, "ACK"),
        (0x020, "URG"),
        (0x040, "ECE"),
        (0x080, "CWR"),
        (0x100, "AE"),
    ] {
        if fl & bit != 0 {
            v.push(n);
        }
    }
    v.join(", ")
}

// ---------------------------------------------------------------- 해석기

pub struct Ctx<'a> {
    pub prefs: &'a Prefs,
    pub analysis: Option<&'a Analysis>,
    /// 짝 요청의 바이트를 찾는 데 쓴다(응답 해석에 요청이 필요한 프로토콜)
    pub capture: Option<&'a Capture>,
    /// 장비 맵 — 레지스터 주소를 이름으로
    pub namer: Option<&'a dyn RegisterNamer>,
}

impl<'a> Ctx<'a> {
    pub fn basic(prefs: &'a Prefs) -> Ctx<'a> {
        Ctx {
            prefs,
            analysis: None,
            capture: None,
            namer: None,
        }
    }
    pub fn with_analysis(mut self, a: &'a Analysis, cap: &'a Capture) -> Ctx<'a> {
        self.analysis = Some(a);
        self.capture = Some(cap);
        self
    }
    pub fn with_namer(mut self, n: &'a dyn RegisterNamer) -> Ctx<'a> {
        self.namer = Some(n);
        self
    }
}

pub struct Dz<'a> {
    pub f: &'a [u8],
    pub d: &'a mut Dissection,
    pub o: Opts,
    pub meta: Meta,
    pub ctx: &'a Ctx<'a>,
    pub(crate) stack: Vec<Node>,
    /// 조립된 PDU 처럼 프레임 밖 바이트를 풀 때 범위를 프레임 안으로 옮기는 값
    pub(crate) shift: i64,
    pub(crate) clamp: (u32, u32),
}

impl<'a> Dz<'a> {
    fn rng(&self, s: usize, l: usize) -> (u32, u32) {
        let s2 = (s as i64 + self.shift).clamp(self.clamp.0 as i64, self.clamp.1 as i64) as u32;
        let e2 =
            ((s + l) as i64 + self.shift).clamp(self.clamp.0 as i64, self.clamp.1 as i64) as u32;
        (s2, e2 - s2)
    }

    /// 필드 하나 — 값은 항상 모으고, 트리 글자는 트리를 만들 때만
    pub(crate) fn fld(
        &mut self,
        name: &'static str,
        v: Value,
        s: usize,
        l: usize,
        label: impl FnOnce() -> String,
    ) {
        let (s, l) = self.rng(s, l);
        let v = match v {
            Value::Bytes(bs, bl) => {
                let (a, b) = self.rng(bs as usize, bl as usize);
                Value::Bytes(a, b)
            }
            o => o,
        };
        self.d.fields.push(FieldVal {
            name,
            value: v,
            start: s,
            len: l,
        });
        if self.o.tree {
            let node = Node {
                label: label(),
                name,
                start: s,
                len: l,
                ..Default::default()
            };
            self.stack.last_mut().unwrap().children.push(node);
        }
    }

    /// 트리에 나타나지 않는 필드(`ip.addr` 처럼 한 번 더 붙는 것)
    pub(crate) fn hid(&mut self, name: &'static str, v: Value, s: usize, l: usize) {
        let (s, l) = self.rng(s, l);
        self.d.fields.push(FieldVal {
            name,
            value: v,
            start: s,
            len: l,
        });
    }

    /// 값 없이 계층 이름만(프로토콜 존재 검사용)
    pub(crate) fn proto(&mut self, name: &'static str, s: usize, l: usize) {
        self.hid(name, Value::Present, s, l);
    }

    pub(crate) fn open(
        &mut self,
        name: &'static str,
        s: usize,
        l: usize,
        label: impl FnOnce() -> String,
    ) {
        if self.o.tree {
            let (s, l) = self.rng(s, l);
            self.stack.push(Node {
                label: label(),
                name,
                start: s,
                len: l,
                ..Default::default()
            });
        }
    }

    pub(crate) fn close(&mut self) {
        if self.o.tree {
            let n = self.stack.pop().unwrap();
            self.stack.last_mut().unwrap().children.push(n);
        }
    }

    pub(crate) fn text(&mut self, s: usize, l: usize, label: impl FnOnce() -> String) {
        if self.o.tree {
            let (s, l) = self.rng(s, l);
            let node = Node {
                label: label(),
                start: s,
                len: l,
                ..Default::default()
            };
            self.stack.last_mut().unwrap().children.push(node);
        }
    }

    pub(crate) fn expert(
        &mut self,
        sev: Severity,
        key: &'static str,
        text: impl Into<String>,
        s: usize,
        l: usize,
    ) {
        self.expert_c(sev, key, 0, text, s, l);
    }

    pub(crate) fn expert_c(
        &mut self,
        sev: Severity,
        key: &'static str,
        code: u32,
        text: impl Into<String>,
        s: usize,
        l: usize,
    ) {
        let text = text.into();
        let (s, l) = self.rng(s, l);
        if self.o.tree {
            let node = Node {
                label: format!("[Expert Info ({sev:?}): {text}]"),
                start: s,
                len: l,
                expert: Some(sev),
                ..Default::default()
            };
            self.stack.last_mut().unwrap().children.push(node);
        }
        // 표시 필터가 `expert.key == "pair.no_response"` 처럼 걸 수 있게 필드로도 둔다
        self.d.fields.push(FieldVal {
            name: "expert.key",
            value: Value::Str(key.into()),
            start: s,
            len: l,
        });
        self.d.fields.push(FieldVal {
            name: "expert.severity",
            value: Value::Str(format!("{sev:?}").to_ascii_lowercase()),
            start: s,
            len: l,
        });
        self.d.experts.push(ExpertInfo {
            severity: sev,
            key,
            code,
            text,
            start: s,
            len: l,
        });
    }

    pub(crate) fn layer(&mut self, name: &'static str) {
        self.d.layers.push(name);
    }

    pub(crate) fn col(&mut self, protocol: &str, info: impl FnOnce() -> String) {
        if self.o.columns {
            self.d.cols.protocol.clear();
            self.d.cols.protocol.push_str(protocol);
            self.d.cols.info = info();
        }
    }

    pub(crate) fn set_addr(&mut self, src: impl FnOnce() -> String, dst: impl FnOnce() -> String) {
        if self.o.columns {
            self.d.cols.src = src();
            self.d.cols.dst = dst();
        }
    }
}

/// 프레임 하나를 푼다. `d` 는 재사용한다(할당을 줄이려고 먼저 `clear`).
pub fn dissect_into(d: &mut Dissection, frame: &[u8], link: u16, meta: &Meta, ctx: &Ctx, o: Opts) {
    d.clear();
    let mut z = Dz {
        f: frame,
        d,
        o,
        meta: *meta,
        ctx,
        stack: Vec::new(),
        shift: 0,
        clamp: (0, frame.len() as u32),
    };
    if o.tree {
        z.stack.push(Node::default());
    }
    z.frame_layer(link);
    if o.tree {
        let root = z.stack.pop().unwrap();
        z.d.tree = root.children;
    }
}

pub fn dissect(frame: &[u8], link: u16, meta: &Meta, ctx: &Ctx, o: Opts) -> Dissection {
    let mut d = Dissection::default();
    dissect_into(&mut d, frame, link, meta, ctx, o);
    d
}
