//! 통계 — 대화(Conversations)·끝점(Endpoints)·프로토콜 계층·I/O 그래프 시계열·응답 시간 요약·Expert 집계.
//!
//! 모든 함수는 `which` 로 패킷 번호(0 기준) 부분 집합을 받는다 — 표시 필터를 적용한 결과만 집계하려면 `Session::apply` 결과를 넘기면 된다.

use std::collections::HashMap;

use crate::analysis::{Analysis, PairStatus, locate};
use crate::capture::Capture;
use crate::dissect::{Dissection, Opts, ip4_str, ip6_str, mac_str};
use crate::industrial::App;
use crate::session::Session;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConvKind {
    Ethernet,
    Ipv4,
    Ipv6,
    Tcp,
    Udp,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ConvRow {
    pub a: String,
    pub b: String,
    pub port_a: Option<u16>,
    pub port_b: Option<u16>,
    pub packets: u64,
    pub bytes: u64,
    pub a_to_b_packets: u64,
    pub a_to_b_bytes: u64,
    pub b_to_a_packets: u64,
    pub b_to_a_bytes: u64,
    pub start_ns: i64,
    pub end_ns: i64,
}

impl ConvRow {
    pub fn duration_s(&self) -> f64 {
        (self.end_ns - self.start_ns) as f64 / 1e9
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct EndpointRow {
    pub addr: String,
    pub port: Option<u16>,
    pub packets: u64,
    pub bytes: u64,
    pub tx_packets: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub rx_bytes: u64,
}

/// 패킷 하나의 주소 쌍(해당 계층이 없으면 None)
fn addrs(
    cap: &Capture,
    i: usize,
    kind: ConvKind,
) -> Option<(Vec<u8>, Option<u16>, Vec<u8>, Option<u16>)> {
    let p = &cap.packets[i];
    let f = cap.data(p);
    match kind {
        ConvKind::Ethernet => {
            if p.link == 1 && f.len() >= 12 {
                Some((f[6..12].to_vec(), None, f[0..6].to_vec(), None))
            } else {
                None
            }
        }
        _ => {
            let l3 = locate(p.link, f)?;
            let n = if l3.v6 { 16 } else { 4 };
            match kind {
                ConvKind::Ipv4 if !l3.v6 => {
                    Some((l3.src[..4].to_vec(), None, l3.dst[..4].to_vec(), None))
                }
                ConvKind::Ipv6 if l3.v6 => Some((l3.src.to_vec(), None, l3.dst.to_vec(), None)),
                ConvKind::Tcp | ConvKind::Udp => {
                    let want = if kind == ConvKind::Tcp { 6 } else { 17 };
                    if l3.proto != want || l3.end < l3.l4 + 4 {
                        return None;
                    }
                    let sp = u16::from_be_bytes([f[l3.l4], f[l3.l4 + 1]]);
                    let dp = u16::from_be_bytes([f[l3.l4 + 2], f[l3.l4 + 3]]);
                    Some((
                        l3.src[..n].to_vec(),
                        Some(sp),
                        l3.dst[..n].to_vec(),
                        Some(dp),
                    ))
                }
                _ => None,
            }
        }
    }
}

fn addr_text(kind: ConvKind, a: &[u8]) -> String {
    match kind {
        ConvKind::Ethernet => mac_str(a),
        _ => {
            if a.len() == 4 {
                ip4_str(a)
            } else {
                let mut x = [0u8; 16];
                x.copy_from_slice(a);
                ip6_str(&x)
            }
        }
    }
}

fn each<'a>(cap: &'a Capture, which: Option<&'a [u32]>) -> Box<dyn Iterator<Item = usize> + 'a> {
    match which {
        Some(w) => Box::new(w.iter().map(|&x| x as usize)),
        None => Box::new(0..cap.len()),
    }
}

/// 대화 표 — A 는 그 대화에서 처음 보낸 쪽
pub fn conversations(cap: &Capture, which: Option<&[u32]>, kind: ConvKind) -> Vec<ConvRow> {
    type Key = (Vec<u8>, Option<u16>, Vec<u8>, Option<u16>);
    let mut map: HashMap<Key, usize> = HashMap::new();
    let mut rows: Vec<ConvRow> = Vec::new();
    for i in each(cap, which) {
        let Some((sa, sp, da, dp)) = addrs(cap, i, kind) else {
            continue;
        };
        let p = &cap.packets[i];
        let fwd = (&sa, sp) <= (&da, dp);
        let key: Key = if fwd {
            (sa.clone(), sp, da.clone(), dp)
        } else {
            (da.clone(), dp, sa.clone(), sp)
        };
        let len = p.origlen as u64;
        let ts = if p.has_ts() { p.ts_ns } else { 0 };
        let k = *map.entry(key).or_insert_with(|| {
            rows.push(ConvRow {
                a: addr_text(kind, &sa),
                b: addr_text(kind, &da),
                port_a: sp,
                port_b: dp,
                packets: 0,
                bytes: 0,
                a_to_b_packets: 0,
                a_to_b_bytes: 0,
                b_to_a_packets: 0,
                b_to_a_bytes: 0,
                start_ns: ts,
                end_ns: ts,
            });
            rows.len() - 1
        });
        let r = &mut rows[k];
        r.packets += 1;
        r.bytes += len;
        // A 는 처음 본 출발지
        let from_a = addr_text(kind, &sa) == r.a && sp == r.port_a;
        if from_a {
            r.a_to_b_packets += 1;
            r.a_to_b_bytes += len;
        } else {
            r.b_to_a_packets += 1;
            r.b_to_a_bytes += len;
        }
        r.start_ns = r.start_ns.min(ts);
        r.end_ns = r.end_ns.max(ts);
    }
    rows
}

/// 끝점 표
pub fn endpoints(cap: &Capture, which: Option<&[u32]>, kind: ConvKind) -> Vec<EndpointRow> {
    type Key = (Vec<u8>, Option<u16>);
    let mut map: HashMap<Key, usize> = HashMap::new();
    let mut rows: Vec<EndpointRow> = Vec::new();
    for i in each(cap, which) {
        let Some((sa, sp, da, dp)) = addrs(cap, i, kind) else {
            continue;
        };
        let len = cap.packets[i].origlen as u64;
        for (a, port, tx) in [(sa, sp, true), (da, dp, false)] {
            let k = *map.entry((a.clone(), port)).or_insert_with(|| {
                rows.push(EndpointRow {
                    addr: addr_text(kind, &a),
                    port,
                    packets: 0,
                    bytes: 0,
                    tx_packets: 0,
                    tx_bytes: 0,
                    rx_packets: 0,
                    rx_bytes: 0,
                });
                rows.len() - 1
            });
            let r = &mut rows[k];
            r.packets += 1;
            r.bytes += len;
            if tx {
                r.tx_packets += 1;
                r.tx_bytes += len;
            } else {
                r.rx_packets += 1;
                r.rx_bytes += len;
            }
        }
    }
    rows
}

/// 프로토콜 계층 한 줄
#[derive(Clone, Debug, PartialEq)]
pub struct HierNode {
    pub name: String,
    /// 이 프로토콜이 들어 있는 패킷 수·프레임 바이트
    pub packets: u64,
    pub bytes: u64,
    /// 이 프로토콜이 가장 안쪽인 패킷 수·바이트
    pub end_packets: u64,
    pub end_bytes: u64,
    pub children: Vec<HierNode>,
}

fn add_path(nodes: &mut Vec<HierNode>, path: &[&'static str], len: u64) {
    let Some((first, rest)) = path.split_first() else {
        return;
    };
    let idx = match nodes.iter().position(|n| n.name == *first) {
        Some(i) => i,
        None => {
            nodes.push(HierNode {
                name: (*first).into(),
                packets: 0,
                bytes: 0,
                end_packets: 0,
                end_bytes: 0,
                children: vec![],
            });
            nodes.len() - 1
        }
    };
    let n = &mut nodes[idx];
    n.packets += 1;
    n.bytes += len;
    if rest.is_empty() {
        n.end_packets += 1;
        n.end_bytes += len;
    } else {
        add_path(&mut n.children, rest, len);
    }
}

/// 프로토콜 계층(Protocol Hierarchy) — `frame` 이 뿌리. 분석이 이미 만들어져 있으면 산업 프로토콜까지 센다
pub fn protocol_hierarchy(s: &Session, which: Option<&[u32]>) -> Vec<HierNode> {
    let mut roots: Vec<HierNode> = Vec::new();
    let with = s.analysis_built();
    let o = Opts {
        depth: crate::dissect::Depth::App,
        tree: false,
        columns: false,
    };
    let mut d = Dissection::default();
    for i in each(&s.cap, which) {
        s.dissect_into(&mut d, i, o, with, None);
        add_path(&mut roots, &d.layers, s.cap.packets[i].origlen as u64);
    }
    roots
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct IoBucket {
    /// 이 구간이 시작하는 시각(첫 패킷 기준 ns)
    pub start_ns: i64,
    pub packets: u64,
    pub bytes: u64,
}

/// I/O 그래프용 시계열 — `interval_ns` 마다 패킷 수·바이트. 시각 없는 패킷은 뺀다. 빈 구간도 0 으로 채운다
pub fn io_series(cap: &Capture, which: Option<&[u32]>, interval_ns: i64) -> Vec<IoBucket> {
    let interval = interval_ns.max(1);
    let first = cap.packets.iter().find(|p| p.has_ts()).map(|p| p.ts_ns);
    let Some(first) = first else { return vec![] };
    let mut v: Vec<IoBucket> = Vec::new();
    for i in each(cap, which) {
        let p = &cap.packets[i];
        if !p.has_ts() {
            continue;
        }
        let k = ((p.ts_ns - first).max(0) / interval) as usize;
        while v.len() <= k {
            v.push(IoBucket {
                start_ns: v.len() as i64 * interval,
                packets: 0,
                bytes: 0,
            });
        }
        v[k].packets += 1;
        v[k].bytes += p.origlen as u64;
    }
    v
}

/// 가장 가까운 순위(nearest-rank) 백분위 — 정렬된 배열
pub fn percentile(sorted: &[i64], p: f64) -> Option<i64> {
    if sorted.is_empty() {
        return None;
    }
    let rank = ((p / 100.0) * sorted.len() as f64).ceil().max(1.0) as usize;
    Some(sorted[rank.min(sorted.len()) - 1])
}

/// 응답 시간 요약 — «이 화면의 맨 위 한 줄». 시간은 ns
#[derive(Clone, Debug, Default, PartialEq)]
pub struct RtSummary {
    /// 짝이 맞은 요청 수(정상 + 예외)
    pub pairs: u64,
    pub min_ns: Option<i64>,
    pub median_ns: Option<i64>,
    pub p95_ns: Option<i64>,
    pub max_ns: Option<i64>,
    pub exceptions: u64,
    /// 응답이 없는 요청(제한 시간 지남 + 연결 닫힘). 캡처가 끝나 기다리는 중인 것은 `pending`
    pub no_response: u64,
    pub pending: u64,
    pub orphans: u64,
}

fn summarize<'a>(pdus: impl Iterator<Item = &'a crate::analysis::PduRec>) -> RtSummary {
    let mut t: Vec<i64> = Vec::new();
    let mut r = RtSummary::default();
    for p in pdus {
        if p.is_req {
            match p.status {
                PairStatus::Ok | PairStatus::Exception => {
                    r.pairs += 1;
                    if p.resp_ns >= 0 {
                        t.push(p.resp_ns);
                    }
                    if p.status == PairStatus::Exception {
                        r.exceptions += 1;
                    }
                }
                PairStatus::Timeout | PairStatus::Closed => r.no_response += 1,
                PairStatus::CaptureEnd | PairStatus::Unpaired => r.pending += 1,
                PairStatus::Orphan => {}
            }
        } else if p.status == PairStatus::Orphan {
            r.orphans += 1;
        }
    }
    t.sort_unstable();
    r.min_ns = t.first().copied();
    r.max_ns = t.last().copied();
    r.median_ns = percentile(&t, 50.0);
    r.p95_ns = percentile(&t, 95.0);
    r
}

/// 전체 요약. `app` 이 있으면 그 프로토콜만
pub fn response_summary(a: &Analysis, app: Option<App>) -> RtSummary {
    summarize(a.pdus.iter().filter(|p| app.is_none_or(|x| p.app == x)))
}

#[derive(Clone, Debug, PartialEq)]
pub struct RtGroup {
    pub app: App,
    /// 흐름 번호(`tcp.stream`)
    pub flow: u32,
    /// Modbus 국번 · MC 요청 대상 국번 · XGT 는 0
    pub unit: u8,
    /// Modbus 함수 코드 · MC 명령 · XGT 명령
    pub func: u16,
    pub summary: RtSummary,
}

/// 흐름 · 국번 · 함수(명령) 별 응답 시간 요약. 요청과 짝 응답은 같은 그룹으로 센다
pub fn response_groups(a: &Analysis) -> Vec<RtGroup> {
    let mut map: HashMap<(u32, u8, u16, u8), Vec<usize>> = HashMap::new();
    for (i, p) in a.pdus.iter().enumerate() {
        // 응답은 짝 요청의 그룹으로(짝이 없는 응답은 함수 0 그룹)
        let kp = if !p.is_req && p.pair != u32::MAX {
            &a.pdus[p.pair as usize]
        } else {
            p
        };
        let func = if !kp.is_req {
            0
        } else if matches!(kp.app, App::Modbus | App::ModbusRtu) {
            kp.peek.func & 0x7f
        } else {
            kp.peek.func
        };
        map.entry((kp.flow, kp.peek.unit, func, app_id(kp.app)))
            .or_default()
            .push(i);
    }
    let mut out: Vec<RtGroup> = map
        .into_iter()
        .map(|((flow, unit, func, _), idx)| RtGroup {
            app: a.pdus[idx[0]].app,
            flow,
            unit,
            func,
            summary: summarize(idx.iter().map(|&i| &a.pdus[i])),
        })
        .collect();
    out.sort_by_key(|x| (x.flow, x.unit, x.func));
    out
}

fn app_id(a: App) -> u8 {
    match a {
        App::Modbus => 0,
        App::ModbusRtu => 1,
        App::Mc => 2,
        App::Xgt => 3,
    }
}

/// Expert 항목 집계 — 열쇠별 프레임 수. 분석이 필요하면 `s.analysis()` 를 만들어 쓴다
pub fn expert_counts(s: &Session, which: Option<&[u32]>) -> Vec<(&'static str, u64)> {
    let mut m: HashMap<&'static str, u64> = HashMap::new();
    let o = Opts {
        depth: crate::dissect::Depth::App,
        tree: false,
        columns: false,
    };
    let mut d = Dissection::default();
    for i in each(&s.cap, which) {
        s.dissect_into(&mut d, i, o, true, None);
        let mut seen: Vec<&'static str> = Vec::new();
        for e in &d.experts {
            if !seen.contains(&e.key) {
                seen.push(e.key);
                *m.entry(e.key).or_default() += 1;
            }
        }
    }
    let mut v: Vec<_> = m.into_iter().collect();
    v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    v
}
