//! 찾을 범위 해석 — «192.168.0.0/24», «192.168.0.1-254», «192.168.0.1-192.168.1.20», «192.168.0.10»,
//! 쉼표·공백으로 여러 개. 한 번에 [`MAX_HOSTS`] 대까지(넓은 대역을 통째로 두드리지 않게).

use portdock_core::tr;
use serde::Serialize;
use std::net::Ipv4Addr;

/// 한 번에 찾을 수 있는 주소 수 상한
pub const MAX_HOSTS: u64 = 4096;

/// 범위 하나 — 시작·끝(둘 다 포함)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Span {
    pub first: u32,
    pub last: u32,
}

impl Span {
    pub fn count(&self) -> u64 {
        u64::from(self.last - self.first) + 1
    }
}

/// 화면 미리보기용 요약
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RangeInfo {
    pub count: u64,
    pub first: String,
    pub last: String,
    /// 상한을 넘으면 true — 찾기는 거절한다
    pub too_many: bool,
}

fn ip(s: &str) -> Result<Ipv4Addr, String> {
    s.trim().parse::<Ipv4Addr>().map_err(|_| format!("{}: «{}»", tr!("IP 주소가 아닙니다", "Not an IP address"), s.trim()))
}

/// 접두사 길이(0~32) → 넷마스크
pub fn mask_of(prefix: u8) -> u32 {
    if prefix == 0 { 0 } else { u32::MAX << (32 - u32::from(prefix.min(32))) }
}

/// 대역 안의 장비 주소 범위. /31·/32 는 그대로, 나머지는 네트워크·브로드캐스트 주소를 뺀다
pub fn hosts_of(addr: Ipv4Addr, prefix: u8) -> Span {
    let m = mask_of(prefix);
    let net = u32::from(addr) & m;
    let bc = net | !m;
    if prefix >= 31 { Span { first: net, last: bc } } else { Span { first: net + 1, last: bc - 1 } }
}

/// «192.168.0.0/24» 처럼 대역 이름
pub fn cidr_label(addr: Ipv4Addr, prefix: u8) -> String {
    format!("{}/{}", Ipv4Addr::from(u32::from(addr) & mask_of(prefix)), prefix)
}

/// 랜카드 대역에서 기본으로 찾을 범위 — /24 보다 넓으면 그 랜카드 주소가 든 /24 만
pub fn default_range(addr: Ipv4Addr, prefix: u8) -> String {
    cidr_label(addr, prefix.max(24))
}

/// 브로드캐스트 주소(랜카드 대역의 끝)
pub fn broadcast_of(addr: Ipv4Addr, prefix: u8) -> Ipv4Addr {
    let m = mask_of(prefix);
    Ipv4Addr::from((u32::from(addr) & m) | !m)
}

/// 한 조각 해석
fn part(p: &str) -> Result<Span, String> {
    if let Some((a, b)) = p.split_once('/') {
        let addr = ip(a)?;
        let prefix: u8 = b.trim().parse().ok().filter(|n| *n <= 32).ok_or_else(|| format!("{}: «{p}»", tr!("접두사 길이는 0~32 입니다", "Prefix length must be 0–32")))?;
        return Ok(hosts_of(addr, prefix));
    }
    if let Some((a, b)) = p.split_once('-') {
        let first = ip(a)?;
        let b = b.trim();
        let last = if b.contains('.') {
            ip(b)?
        } else {
            // «192.168.0.1-254» — 끝 숫자만
            let n: u8 = b.parse().map_err(|_| format!("{}: «{p}»", tr!("범위 끝은 0~255 숫자나 IP 주소입니다", "The range end must be 0–255 or an IP address")))?;
            let o = first.octets();
            Ipv4Addr::new(o[0], o[1], o[2], n)
        };
        let (f, l) = (u32::from(first), u32::from(last));
        if l < f {
            return Err(format!("{}: «{p}»", tr!("범위의 끝이 시작보다 앞입니다", "The range ends before it starts")));
        }
        return Ok(Span { first: f, last: l });
    }
    let a = u32::from(ip(p)?);
    Ok(Span { first: a, last: a })
}

/// «a - b»·«a / 24» 의 하이픈·빗금 둘레 빈칸을 없앤다(빈칸은 범위 구분자이기도 해서)
fn tighten(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut space = false;
    for c in text.chars() {
        if c == ' ' || c == '\t' {
            space = true;
            continue;
        }
        if space && c != '-' && c != '/' && !out.ends_with(['-', '/']) {
            out.push(' ');
        }
        space = false;
        out.push(c);
    }
    out
}

/// 겹치거나 맞닿은 범위를 합친다(작은 주소부터)
fn merge(mut list: Vec<Span>) -> Vec<Span> {
    list.sort_by_key(|s| s.first);
    let mut out: Vec<Span> = Vec::with_capacity(list.len());
    for s in list {
        match out.last_mut() {
            Some(l) if u64::from(s.first) <= u64::from(l.last) + 1 => l.last = l.last.max(s.last),
            _ => out.push(s),
        }
    }
    out
}

/// 글 전체 → 범위들. 겹치거나 맞닿은 것은 합쳐(한 번만 센다) 작은 주소부터
pub fn spans(text: &str) -> Result<Vec<Span>, String> {
    let list: Vec<Span> = tighten(text).split([',', ';', ' ', '\t', '\n', '\r']).filter(|s| !s.trim().is_empty()).map(part).collect::<Result<_, _>>()?;
    if list.is_empty() {
        return Err(tr!("찾을 범위가 비어 있습니다", "The range is empty").into());
    }
    Ok(merge(list))
}

/// 미리보기 — 몇 대인지(겹친 것은 한 번), 처음·끝
pub fn info(text: &str) -> Result<RangeInfo, String> {
    let list = spans(text)?;
    let count: u64 = list.iter().map(Span::count).sum();
    let first = list.iter().map(|s| s.first).min().unwrap_or(0);
    let last = list.iter().map(|s| s.last).max().unwrap_or(0);
    Ok(RangeInfo { count, first: Ipv4Addr::from(first).to_string(), last: Ipv4Addr::from(last).to_string(), too_many: count > MAX_HOSTS })
}

/// 주소 목록으로 펼친다(겹친 것은 한 번만, 작은 주소부터). 상한을 넘으면 오류
pub fn expand(text: &str) -> Result<Vec<Ipv4Addr>, String> {
    let list = spans(text)?;
    let count: u64 = list.iter().map(Span::count).sum();
    if count > MAX_HOSTS {
        return Err(format!(
            "{} ({count} > {MAX_HOSTS})",
            tr!("한 번에 찾을 수 있는 주소 수를 넘었습니다 — 범위를 좁히세요", "Too many addresses for one scan — narrow the range")
        ));
    }
    // 합친 범위라 이미 작은 주소부터, 겹침 없음
    Ok(list.iter().flat_map(|s| s.first..=s.last).map(Ipv4Addr::from).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ips(v: &[Ipv4Addr]) -> Vec<String> {
        v.iter().map(|a| a.to_string()).collect()
    }

    #[test]
    fn cidr_24_drops_network_and_broadcast() {
        let v = expand("192.168.0.0/24").unwrap();
        assert_eq!(v.len(), 254);
        assert_eq!(v[0], Ipv4Addr::new(192, 168, 0, 1));
        assert_eq!(v[253], Ipv4Addr::new(192, 168, 0, 254));
        // 대역 안 아무 주소로 써도 같은 대역
        assert_eq!(expand("192.168.0.77/24").unwrap(), v);
    }

    #[test]
    fn cidr_small_prefixes() {
        assert_eq!(ips(&expand("10.0.0.5/32").unwrap()), ["10.0.0.5"]);
        assert_eq!(ips(&expand("10.0.0.4/31").unwrap()), ["10.0.0.4", "10.0.0.5"]);
        assert_eq!(ips(&expand("10.0.0.0/30").unwrap()), ["10.0.0.1", "10.0.0.2"]);
        assert_eq!(expand("172.16.0.0/20").unwrap().len(), 4094);
    }

    #[test]
    fn short_and_full_ranges() {
        assert_eq!(expand("192.168.0.1-254").unwrap().len(), 254);
        assert_eq!(ips(&expand("192.168.0.250-192.168.1.2").unwrap()), ["192.168.0.250", "192.168.0.251", "192.168.0.252", "192.168.0.253", "192.168.0.254", "192.168.0.255", "192.168.1.0", "192.168.1.1", "192.168.1.2"]);
        assert_eq!(ips(&expand(" 192.168.0.10 ").unwrap()), ["192.168.0.10"]);
    }

    #[test]
    fn lists_merge_and_dedup() {
        let v = expand("192.168.0.3-5, 192.168.0.1-4; 192.168.0.10").unwrap();
        assert_eq!(ips(&v), ["192.168.0.1", "192.168.0.2", "192.168.0.3", "192.168.0.4", "192.168.0.5", "192.168.0.10"]);
    }

    #[test]
    fn errors() {
        assert!(expand("").is_err());
        assert!(expand("192.168.0").is_err());
        assert!(expand("192.168.0.0/33").is_err());
        assert!(expand("192.168.0.20-10").is_err());
        assert!(expand("192.168.0.1-300").is_err());
        assert!(expand("abc").is_err());
    }

    #[test]
    fn cap() {
        assert!(expand("10.0.0.0/20").is_ok()); // 4094
        assert!(expand("10.0.0.0/19").is_err()); // 8190
        let i = info("10.0.0.0/8").unwrap();
        assert!(i.too_many);
        assert_eq!(i.count, 16_777_214);
        assert_eq!(i.first, "10.0.0.1");
        assert_eq!(i.last, "10.255.255.254");
        assert!(!info("192.168.0.0/24").unwrap().too_many);
    }

    #[test]
    fn nic_defaults() {
        let a = Ipv4Addr::new(192, 168, 10, 37);
        assert_eq!(default_range(a, 24), "192.168.10.0/24");
        assert_eq!(default_range(a, 16), "192.168.10.0/24");
        assert_eq!(default_range(a, 28), "192.168.10.32/28");
        assert_eq!(broadcast_of(a, 24), Ipv4Addr::new(192, 168, 10, 255));
        assert_eq!(broadcast_of(a, 16), Ipv4Addr::new(192, 168, 255, 255));
        assert_eq!(mask_of(24), 0xFFFF_FF00);
        assert_eq!(mask_of(0), 0);
        assert_eq!(mask_of(32), u32::MAX);
    }

    /// «192.168.0.1 - 254» 처럼 하이픈·빗금 둘레의 빈칸도 받는다
    #[test]
    fn spaces_around_dash_and_slash() {
        assert_eq!(expand("192.168.0.1 - 254").unwrap().len(), 254);
        assert_eq!(expand("192.168.0.1 -254, 10.0.0.1- 10.0.0.3").unwrap().len(), 257);
        assert_eq!(expand("192.168.0.0 / 24").unwrap().len(), 254);
    }

    /// 겹친 범위는 한 번만 센다 — 같은 /20 을 두 번 적어도 상한(4096)을 넘었다고 거절하지 않는다
    #[test]
    fn overlap_counts_once() {
        assert_eq!(expand("10.0.0.0/20, 10.0.0.0/20").unwrap().len(), 4094);
        let i = info("192.168.0.0/24 192.168.0.1-254 192.168.0.10").unwrap();
        assert_eq!(i.count, 254);
        assert!(!i.too_many);
        assert_eq!(info("10.0.0.1-5, 10.0.0.10-12").unwrap().count, 8);
    }
}
