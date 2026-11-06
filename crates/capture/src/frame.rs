//! PktMon 실시간 스트림 레코드 해석 + 프레임 요약. 윈도우 API 를 부르지 않으니 어디서나 시험된다.
//!
//! 레코드 배치의 근거:
//! - `PACKETMONITOR_STREAM_DATA_DESCRIPTOR`(Data·DataSize·MetadataOffset·PacketOffset·PacketLength·Missed…) — Microsoft Learn
//!   PacketMonitorCreateRealtimeStream, 필드 순서는 PSPktmon 0.6.2 의 P/Invoke 선언으로 확인
//! - 메타데이터 40바이트(PktGroupId u64, PktCount u16, Appearance u16, DirTag u16, PacketType u16, ComponentId u16,
//!   EdgeId u16, Reserved u16, DropReason u32, DropLocation u32, Processor u16, TimeStamp i64 FILETIME) — 같은 모듈의
//!   PktmonMetaData 해석. 이 PC 의 `Get-WinEvent -ListProvider Microsoft-Windows-PktMon` 이벤트 160 의 필드 순서와도 같다
//!   (PktGroupId·PktNumber·AppearanceCount·DirTag·PacketType·ComponentId·EdgeId·FilterId·DropReason·DropLocation).
//!
//! 확인 못 한 것: 위 배치는 문서·래퍼 소스로 맞춘 것이고, 실제 스트림 바이트로 대조하려면 관리자 실행이 필요하다
//! (tools/capture-probe-test.ps1 이 저장한 pcapng 가 Wireshark 에서 정상 해석되는지로 확인한다).

use std::net::IpAddr;

pub const METADATA_LEN: usize = 40;
/// 1601-01-01 → 1970-01-01 (100ns 단위)
const FILETIME_UNIX_EPOCH: u64 = 116_444_736_000_000_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Unknown,
    In,
    Out,
}

/// 프레임 바이트의 시작 계층
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LinkType {
    Ethernet,
    Wifi,
    /// 이더넷 머리 없이 IP 부터(루프백 등)
    Ip,
    /// 그 밖(TCP·UDP·페이로드 단독 등) — 파일로 쓸 수 없다
    Other(u16),
}

impl LinkType {
    pub fn from_packet_type(t: u16) -> Self {
        match t {
            1 => Self::Ethernet,
            2 => Self::Wifi,
            3 => Self::Ip,
            other => Self::Other(other),
        }
    }
    /// pcap LINKTYPE 번호. 쓸 수 없는 종류는 None
    pub fn pcap_linktype(self) -> Option<u16> {
        match self {
            Self::Ethernet => Some(crate::pcapng::LINKTYPE_ETHERNET),
            Self::Wifi => Some(crate::pcapng::LINKTYPE_IEEE802_11),
            Self::Ip => Some(crate::pcapng::LINKTYPE_RAW),
            Self::Other(_) => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Frame {
    pub data: Vec<u8>,
    /// 유닉스 시각(나노초)
    pub timestamp_ns: u64,
    pub link: LinkType,
    pub direction: Direction,
    /// PktMon 구성 요소 번호(= 데이터 원본 Id 또는 SecondaryId) — 이름은 `Frame::interface`
    pub component_id: u16,
    pub edge_id: u16,
    /// 구성 요소 이름(알면) — 없으면 빈 문자열
    pub interface: String,
    pub pkt_group_id: u64,
    pub pkt_number: u16,
    /// 같은 패킷이 스택 계층을 지나며 나타난 횟수
    pub appearance: u16,
    /// 0 이 아니면 PktMon 이 «버린 패킷» 으로 보고한 것
    pub drop_reason: u32,
    pub drop_location: u32,
}

#[derive(Debug, PartialEq, Eq)]
pub enum RecordError {
    TooShort,
}

/// 스트림 콜백이 준 한 덩어리 → 프레임. 이름 풀이는 호출한 쪽이 한다
pub fn parse_record(data: &[u8], metadata_offset: u32, packet_offset: u32, packet_length: u32) -> Result<Frame, RecordError> {
    let mo = metadata_offset as usize;
    let po = packet_offset as usize;
    if data.len() < mo.saturating_add(METADATA_LEN) || data.len() < po {
        return Err(RecordError::TooShort);
    }
    let m = &data[mo..mo + METADATA_LEN];
    let u16at = |o: usize| u16::from_le_bytes([m[o], m[o + 1]]);
    let u32at = |o: usize| u32::from_le_bytes([m[o], m[o + 1], m[o + 2], m[o + 3]]);
    let ft = u64::from_le_bytes(m[32..40].try_into().expect("8바이트"));
    // 길이가 남은 바이트보다 크게 적혀 있으면 남은 만큼만(범위 밖 읽기 방지)
    let plen = (packet_length as usize).min(data.len() - po);
    let direction = match u16at(12) {
        1 | 3 | 5 => Direction::In,  // In · Rx · Ingress
        2 | 4 | 6 => Direction::Out, // Out · Tx · Egress
        _ => Direction::Unknown,
    };
    Ok(Frame {
        data: data[po..po + plen].to_vec(),
        timestamp_ns: filetime_to_unix_ns(ft),
        link: LinkType::from_packet_type(u16at(14)),
        direction,
        component_id: u16at(16),
        edge_id: u16at(18),
        interface: String::new(),
        pkt_group_id: u64::from_le_bytes(m[0..8].try_into().expect("8바이트")),
        pkt_number: u16at(8),
        appearance: u16at(10),
        drop_reason: u32at(22),
        drop_location: u32at(26),
    })
}

pub fn filetime_to_unix_ns(ft: u64) -> u64 {
    ft.saturating_sub(FILETIME_UNIX_EPOCH).saturating_mul(100)
}

/// 프레임 요약 — 통계·시험용(자세한 해석은 crates/packet 의 몫)
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Summary {
    /// "ARP" "TCP" "UDP" "ICMP" "ICMPv6" "IPv6-other" "IPv4-other" "Ethernet-other" "Wi-Fi" "Other"
    pub proto: &'static str,
    pub src: Option<IpAddr>,
    pub dst: Option<IpAddr>,
    pub src_port: Option<u16>,
    pub dst_port: Option<u16>,
}

impl Summary {
    fn bare(proto: &'static str) -> Self {
        Self { proto, src: None, dst: None, src_port: None, dst_port: None }
    }
}

fn l3_summary(p: &[u8]) -> Summary {
    let mut s = Summary::bare("Other");
    let ports = |s: &mut Summary, off: usize| {
        if p.len() >= off + 4 {
            s.src_port = Some(u16::from_be_bytes([p[off], p[off + 1]]));
            s.dst_port = Some(u16::from_be_bytes([p[off + 2], p[off + 3]]));
        }
    };
    match p.first().map(|b| b >> 4) {
        Some(4) if p.len() >= 20 => {
            let ihl = usize::from(p[0] & 15) * 4;
            let ip4 = |o: usize| IpAddr::from([p[o], p[o + 1], p[o + 2], p[o + 3]]);
            s.src = Some(ip4(12));
            s.dst = Some(ip4(16));
            s.proto = match p[9] {
                6 => "TCP",
                17 => "UDP",
                1 => "ICMP",
                _ => "IPv4-other",
            };
            if matches!(p[9], 6 | 17) && ihl >= 20 {
                ports(&mut s, ihl);
            }
        }
        Some(6) if p.len() >= 40 => {
            let ip6 = |o: usize| IpAddr::from(<[u8; 16]>::try_from(&p[o..o + 16]).expect("16바이트"));
            s.src = Some(ip6(8));
            s.dst = Some(ip6(24));
            s.proto = match p[6] {
                6 => "TCP",
                17 => "UDP",
                58 => "ICMPv6",
                _ => "IPv6-other",
            };
            if matches!(p[6], 6 | 17) {
                ports(&mut s, 40);
            }
        }
        _ => {}
    }
    s
}

pub fn summarize(f: &Frame) -> Summary {
    match f.link {
        LinkType::Ip => l3_summary(&f.data),
        LinkType::Ethernet => {
            let d = &f.data;
            if d.len() < 14 {
                return Summary::bare("Ethernet-other");
            }
            let mut et = u16::from_be_bytes([d[12], d[13]]);
            let mut off = 14;
            while matches!(et, 0x8100 | 0x88A8) && d.len() >= off + 4 {
                et = u16::from_be_bytes([d[off + 2], d[off + 3]]);
                off += 4;
            }
            match et {
                0x0800 | 0x86DD => l3_summary(&d[off..]),
                0x0806 => Summary::bare("ARP"),
                _ => Summary::bare("Ethernet-other"),
            }
        }
        LinkType::Wifi => Summary::bare("Wi-Fi"),
        LinkType::Other(_) => Summary::bare("Other"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 합성 레코드: 앞 8바이트 여백 + 메타데이터 40 + 패킷
    fn record(dirtag: u16, ptype: u16, comp: u16, ft: u64, pkt: &[u8]) -> (Vec<u8>, u32, u32, u32) {
        let mut d = vec![0xEEu8; 8];
        let mo = d.len() as u32;
        d.extend_from_slice(&0x1122_3344_5566_7788u64.to_le_bytes()); // PktGroupId
        d.extend_from_slice(&7u16.to_le_bytes()); // PktCount
        d.extend_from_slice(&2u16.to_le_bytes()); // Appearance
        d.extend_from_slice(&dirtag.to_le_bytes());
        d.extend_from_slice(&ptype.to_le_bytes());
        d.extend_from_slice(&comp.to_le_bytes());
        d.extend_from_slice(&9u16.to_le_bytes()); // Edge
        d.extend_from_slice(&0u16.to_le_bytes()); // Reserved/Filter
        d.extend_from_slice(&0u32.to_le_bytes()); // DropReason
        d.extend_from_slice(&0u32.to_le_bytes()); // DropLocation
        d.extend_from_slice(&3u16.to_le_bytes()); // Processor
        d.extend_from_slice(&ft.to_le_bytes());
        assert_eq!(d.len() as u32, mo + 40);
        let po = d.len() as u32;
        d.extend_from_slice(pkt);
        (d, mo, po, pkt.len() as u32)
    }

    /// IPv4 TCP 127.0.0.1:50000 → 127.0.0.1:502
    fn tcp_loopback() -> Vec<u8> {
        let mut p = vec![0x45, 0, 0, 40, 0, 1, 0, 0, 128, 6, 0, 0, 127, 0, 0, 1, 127, 0, 0, 1];
        p.extend_from_slice(&50000u16.to_be_bytes());
        p.extend_from_slice(&502u16.to_be_bytes());
        p.extend_from_slice(&[0; 16]);
        p
    }

    fn blank(link: LinkType, data: Vec<u8>) -> Frame {
        Frame { data, timestamp_ns: 0, link, direction: Direction::Out, component_id: 0, edge_id: 0, interface: String::new(), pkt_group_id: 0, pkt_number: 0, appearance: 0, drop_reason: 0, drop_location: 0 }
    }

    #[test]
    fn parse_synthetic_record() {
        // 2026-11-06 00:00:00 UTC = 1_793_923_200 초
        let ft = 1_793_923_200u64 * 10_000_000 + FILETIME_UNIX_EPOCH + 5; // +500ns
        let (d, mo, po, pl) = record(3, 3, 12, ft, &tcp_loopback());
        let f = parse_record(&d, mo, po, pl).unwrap();
        assert_eq!(f.direction, Direction::In);
        assert_eq!(f.link, LinkType::Ip);
        assert_eq!(f.component_id, 12);
        assert_eq!(f.edge_id, 9);
        assert_eq!(f.pkt_group_id, 0x1122_3344_5566_7788);
        assert_eq!((f.pkt_number, f.appearance), (7, 2));
        assert_eq!(f.timestamp_ns, 1_793_923_200_000_000_500);
        assert_eq!(f.data.len(), 40);
        let s = summarize(&f);
        assert_eq!(s.proto, "TCP");
        assert_eq!(s.src, Some("127.0.0.1".parse().unwrap()));
        assert_eq!((s.src_port, s.dst_port), (Some(50000), Some(502)));
    }

    #[test]
    fn direction_and_types() {
        for (tag, want) in [(0, Direction::Unknown), (1, Direction::In), (2, Direction::Out), (3, Direction::In), (4, Direction::Out), (5, Direction::In), (6, Direction::Out)] {
            let (d, mo, po, pl) = record(tag, 1, 1, FILETIME_UNIX_EPOCH, &[0; 14]);
            assert_eq!(parse_record(&d, mo, po, pl).unwrap().direction, want);
        }
        assert_eq!(LinkType::from_packet_type(1).pcap_linktype(), Some(1));
        assert_eq!(LinkType::from_packet_type(3).pcap_linktype(), Some(101));
        assert_eq!(LinkType::from_packet_type(5).pcap_linktype(), None);
    }

    #[test]
    fn truncated_and_oversized_lengths_are_safe() {
        let (d, mo, po, _) = record(1, 1, 1, FILETIME_UNIX_EPOCH, &[1, 2, 3]);
        // 길이가 실제보다 크게 적혀 있어도 남은 바이트까지만
        assert_eq!(parse_record(&d, mo, po, 9999).unwrap().data, vec![1, 2, 3]);
        // 메타데이터가 모자라면 오류
        assert_eq!(parse_record(&d[..20], mo, po, 3).unwrap_err(), RecordError::TooShort);
        // 오프셋이 범위 밖이면 오류(패닉 아님)
        assert!(parse_record(&d, u32::MAX, po, 3).is_err());
        assert!(parse_record(&d, mo, u32::MAX, 3).is_err());
    }

    #[test]
    fn summarize_ethernet_vlan_arp_and_ipv6() {
        let mut eth = vec![0u8; 12];
        eth.extend_from_slice(&[0x81, 0x00, 0x00, 0x64, 0x08, 0x00]); // VLAN 100 → IPv4
        eth.extend_from_slice(&tcp_loopback());
        let mut f = blank(LinkType::Ethernet, eth);
        assert_eq!(summarize(&f).proto, "TCP");
        f.data = [vec![0u8; 12], vec![0x08, 0x06], vec![0u8; 28]].concat();
        assert_eq!(summarize(&f).proto, "ARP");
        let mut v6 = vec![0x60, 0, 0, 0, 0, 8, 17, 64];
        v6.extend_from_slice(&[0; 15]);
        v6.push(1); // ::1
        v6.extend_from_slice(&[0; 15]);
        v6.push(1);
        v6.extend_from_slice(&[0x13, 0x88, 0x13, 0x89, 0, 8, 0, 0]);
        f.link = LinkType::Ip;
        f.data = v6;
        let s = summarize(&f);
        assert_eq!((s.proto, s.src_port, s.dst_port), ("UDP", Some(5000), Some(5001)));
        assert_eq!(s.src, Some("::1".parse().unwrap()));
        f.data = vec![];
        assert_eq!(summarize(&f).proto, "Other");
    }
}
