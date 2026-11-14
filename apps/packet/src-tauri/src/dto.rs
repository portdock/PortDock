//! 화면으로 보내는 모양 — 엔진 값(바이트 범위·시각)을 JSON 으로
use portdock_packet::analysis::{Analysis, PairStatus, PduRec};
use portdock_packet::dissect::{Node, Severity, Value};
use portdock_packet::stats::RtSummary;
use serde::Serialize;

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Pair {
    /// "req" | "resp"
    pub role: &'static str,
    pub peer: u32,
    pub status: &'static str,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Row {
    pub no: u32,
    pub has_ts: bool,
    pub sec: i64,
    pub nsec: u32,
    pub rel_ns: i64,
    /// 직전 캡처 패킷과의 차이. 없으면 -1
    pub delta_ns: i64,
    /// 직전 표시 패킷과의 차이. 없으면 -1
    pub delta_view_ns: i64,
    pub src: String,
    pub dst: String,
    pub proto: String,
    pub len: u32,
    pub info: String,
    pub color: &'static str,
    /// 응답 시간(ns). 없으면 -1
    pub rt_ns: i64,
    pub pair: Option<Pair>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RowsReply {
    pub total: usize,
    /// 분석이 아직 안 끝나 응답 시간·색이 비어 있다
    pub pending: bool,
    pub start: usize,
    pub rows: Vec<Row>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TNode {
    pub label: String,
    pub name: &'static str,
    pub start: u32,
    pub len: u32,
    pub expert: Option<&'static str>,
    pub children: Vec<TNode>,
}

pub fn sev_name(s: Severity) -> &'static str {
    match s {
        Severity::Chat => "chat",
        Severity::Note => "note",
        Severity::Warn => "warn",
        Severity::Error => "error",
    }
}

pub fn tnode(n: &Node) -> TNode {
    TNode {
        label: n.label.clone(),
        name: n.name,
        start: n.start,
        len: n.len,
        expert: n.expert.map(sev_name),
        children: n.children.iter().map(tnode).collect(),
    }
}

/// 이 값만 보기 — 필드 값을 필터 식으로
pub fn filter_of(name: &str, v: &Value) -> Option<String> {
    Some(match v {
        Value::U(x) => format!("{name} == {x}"),
        Value::I(x) => format!("{name} == {x}"),
        Value::F(x) => format!("{name} == {x}"),
        Value::B(true) => name.to_string(),
        Value::B(false) => format!("!{name}"),
        Value::Mac(m) => format!("{name} == {}", portdock_packet::dissect::mac_str(m)),
        Value::Ip4(a) => format!("{name} == {}", portdock_packet::dissect::ip4_str(a)),
        Value::Ip6(a) => format!("{name} == {}", portdock_packet::dissect::ip6_str(a)),
        Value::Str(s) => format!("{name} == \"{}\"", s.replace("\\", "\\\\").replace("\"", "\\\"")),
        Value::Present => name.to_string(),
        Value::Bytes(..) => return None,
    })
}

pub fn status_name(s: PairStatus) -> &'static str {
    match s {
        PairStatus::Unpaired => "pending",
        PairStatus::Ok => "ok",
        PairStatus::Exception => "exception",
        PairStatus::Timeout => "timeout",
        PairStatus::Closed => "closed",
        PairStatus::CaptureEnd => "capture_end",
        PairStatus::Orphan => "orphan",
    }
}

pub fn pair_of(a: &Analysis, frame: u32) -> Option<(Pair, i64, &PduRec)> {
    let p = a.pdus_of(frame).first()?;
    let peer = if p.pair == u32::MAX { 0 } else { a.pdus[p.pair as usize].frame };
    Some((
        Pair { role: if p.is_req { "req" } else { "resp" }, peer, status: status_name(p.status) },
        p.resp_ns,
        p,
    ))
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Rt {
    pub pairs: u64,
    pub min_ns: Option<i64>,
    pub median_ns: Option<i64>,
    pub p95_ns: Option<i64>,
    pub max_ns: Option<i64>,
    pub exceptions: u64,
    pub no_response: u64,
    pub pending: u64,
    pub orphans: u64,
}

impl From<RtSummary> for Rt {
    fn from(r: RtSummary) -> Rt {
        Rt {
            pairs: r.pairs,
            min_ns: r.min_ns,
            median_ns: r.median_ns,
            p95_ns: r.p95_ns,
            max_ns: r.max_ns,
            exceptions: r.exceptions,
            no_response: r.no_response,
            pending: r.pending,
            orphans: r.orphans,
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSum {
    pub key: &'static str,
    pub name: &'static str,
    pub filter: &'static str,
    pub rt: Rt,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub packets: usize,
    pub first_sec: i64,
    pub duration_ns: i64,
    pub flows: usize,
    pub overall: Rt,
    pub apps: Vec<AppSum>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExpertRaw {
    pub frame: u32,
    pub severity: &'static str,
    pub key: &'static str,
    pub code: u32,
    pub text: String,
}

pub fn b64(d: &[u8]) -> String {
    const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut o = String::with_capacity(d.len().div_ceil(3) * 4);
    for c in d.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        o.push(T[(n >> 18) as usize & 63] as char);
        o.push(T[(n >> 12) as usize & 63] as char);
        o.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        o.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    o
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn base64_matches_rfc() {
        assert_eq!(b64(b""), "");
        assert_eq!(b64(b"f"), "Zg==");
        assert_eq!(b64(b"fo"), "Zm8=");
        assert_eq!(b64(b"foo"), "Zm9v");
        assert_eq!(b64(b"foob"), "Zm9vYg==");
    }
    #[test]
    fn value_filters() {
        assert_eq!(filter_of("tcp.port", &Value::U(502)).unwrap(), "tcp.port == 502");
        assert_eq!(filter_of("tcp.flags.syn", &Value::B(false)).unwrap(), "!tcp.flags.syn");
        assert_eq!(filter_of("ip.src", &Value::Ip4([10, 0, 0, 1])).unwrap(), "ip.src == 10.0.0.1");
        assert_eq!(filter_of("x", &Value::Str("a\"b".into())).unwrap(), "x == \"a\\\"b\"");
        assert!(filter_of("x", &Value::Bytes(0, 1)).is_none());
    }
}
