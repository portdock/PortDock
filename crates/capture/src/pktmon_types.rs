//! pktmonapi.dll 의 C 구조체 배치 — 윈도우 API 를 부르지 않는 순수 데이터라 어디서나 시험된다.
//!
//! 근거(Microsoft Learn, Packet Monitor API):
//! - `PACKETMONITOR_PROTOCOL_CONSTRAINT`(PacketMonitorAddCaptureConstraint): 이름 WCHAR[64], IsPresent 비트 필드, Mac1·Mac2,
//!   VlanId, EtherType, DSCP, TransportProtocol, Ip1·Ip2(공용체 16바이트), PrefixLength1·2, Port1·2, TCPFlags, EncapType,
//!   VxLanPort, Packets, Bytes(둘 다 «Not Implemented»).
//! - `PACKETMONITOR_DATA_SOURCE_SPECIFICATION`·`…_LIST`(PacketMonitorEnumDataSources): 목록은 «개수 + 포인터 배열».
//!   항목 크기 424바이트, 이름 @4, 설명 @132, Id @388, SecondaryId @392, ParentId @396, IsPresent @400, Detail @408 은
//!   PSPktmon 0.6.2 가 읽는 오프셋과 문서의 C 선언(WCHAR[64]·WCHAR[128])이 같다.

use std::net::IpAddr;

pub const MAX_NAME_LENGTH: usize = 64;
pub const DATA_SOURCE_SIZE: usize = 424;

/// 선언 순서 그대로 x64 에서 8바이트 정렬이 들어간다(Ip1 의 u64 공용체 때문). 크기 216 은 시험으로 고정
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ProtocolConstraint {
    pub name: [u16; MAX_NAME_LENGTH],
    pub is_present: u32,
    pub mac1: [u8; 6],
    pub mac2: [u8; 6],
    pub vlan_id: u16,
    pub ether_type: u16,
    pub dscp: u16,
    pub transport_protocol: u8,
    pub ip1: [u64; 2],
    pub ip2: [u64; 2],
    pub prefix_length1: u8,
    pub prefix_length2: u8,
    pub port1: u16,
    pub port2: u16,
    pub tcp_flags: u8,
    pub encap_type: u32,
    pub vxlan_port: u16,
    pub packets: u64,
    pub bytes: u64,
}

// IsPresent 비트 번호(선언 순서)
const BIT_TRANSPORT: u32 = 1 << 5;
const BIT_IP1: u32 = 1 << 6;
const BIT_IP2: u32 = 1 << 7;
const BIT_IPV6: u32 = 1 << 8;
const BIT_PORT1: u32 = 1 << 11;
const BIT_PORT2: u32 = 1 << 12;

/// 캡처 필터 한 개 — 적힌 칸이 모두 맞아야 잡는다(AND). 여러 개를 넣으면 하나라도 맞으면 잡는다(OR).
/// PktMon 은 «출발·도착» 이 아니라 두 끝점(1·2) 으로 맞춘다 — 방향 구분 없이 양쪽 어느 쪽이든 해당하면 통과
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CaptureFilter {
    pub ip1: Option<IpAddr>,
    pub ip2: Option<IpAddr>,
    pub port1: Option<u16>,
    pub port2: Option<u16>,
    /// IP 프로토콜 번호(TCP 6, UDP 17, ICMP 1)
    pub protocol: Option<u8>,
}

impl CaptureFilter {
    pub fn is_empty(&self) -> bool {
        *self == Self::default()
    }
}

fn ip_bytes(ip: &IpAddr) -> [u64; 2] {
    let mut raw = [0u8; 16];
    match ip {
        IpAddr::V4(v) => raw[..4].copy_from_slice(&v.octets()),
        IpAddr::V6(v) => raw.copy_from_slice(&v.octets()),
    }
    [u64::from_ne_bytes(raw[..8].try_into().expect("8")), u64::from_ne_bytes(raw[8..].try_into().expect("8"))]
}

/// 필터 → C 구조체. IPv4 와 IPv6 를 섞은 필터는 만들 수 없다(IsPresent.IPv6 비트가 하나뿐)
pub fn build_constraint(name: &str, f: &CaptureFilter) -> Result<ProtocolConstraint, String> {
    // SAFETY 불필요: 모든 칸이 0 으로 유효한 정수·배열
    let mut c: ProtocolConstraint = ProtocolConstraint {
        name: [0; MAX_NAME_LENGTH],
        is_present: 0,
        mac1: [0; 6],
        mac2: [0; 6],
        vlan_id: 0,
        ether_type: 0,
        dscp: 0,
        transport_protocol: 0,
        ip1: [0; 2],
        ip2: [0; 2],
        prefix_length1: 0,
        prefix_length2: 0,
        port1: 0,
        port2: 0,
        tcp_flags: 0,
        encap_type: 0,
        vxlan_port: 0,
        packets: 0,
        bytes: 0,
    };
    for (i, u) in name.encode_utf16().take(MAX_NAME_LENGTH - 1).enumerate() {
        c.name[i] = u;
    }
    if let (Some(a), Some(b)) = (&f.ip1, &f.ip2)
        && a.is_ipv4() != b.is_ipv4()
    {
        return Err("필터의 IP 두 개는 둘 다 IPv4 이거나 둘 다 IPv6 여야 합니다".into());
    }
    if let Some(ip) = &f.ip1 {
        c.is_present |= BIT_IP1;
        c.ip1 = ip_bytes(ip);
        if ip.is_ipv6() {
            c.is_present |= BIT_IPV6;
        }
    }
    if let Some(ip) = &f.ip2 {
        c.is_present |= BIT_IP2;
        c.ip2 = ip_bytes(ip);
        if ip.is_ipv6() {
            c.is_present |= BIT_IPV6;
        }
    }
    if let Some(p) = f.port1 {
        c.is_present |= BIT_PORT1;
        c.port1 = p;
    }
    if let Some(p) = f.port2 {
        c.is_present |= BIT_PORT2;
        c.port2 = p;
    }
    if let Some(p) = f.protocol {
        c.is_present |= BIT_TRANSPORT;
        c.transport_protocol = p;
    }
    Ok(c)
}

/// 데이터 원본(구성 요소) 한 개 — `pktmon list` 의 한 줄에 해당
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DataSource {
    /// 0 = 모두, 1 = 네트워크 인터페이스
    pub kind: u32,
    pub name: String,
    pub description: String,
    pub id: u32,
    pub secondary_id: u32,
    pub parent_id: u32,
    pub mac: Option<[u8; 6]>,
}

fn wstr(b: &[u8]) -> String {
    let u: Vec<u16> = b.as_chunks::<2>().0.iter().map(|c| u16::from_le_bytes(*c)).take_while(|&x| x != 0).collect();
    String::from_utf16_lossy(&u)
}

/// 항목 한 개(424바이트)를 읽는다
pub fn parse_data_source(b: &[u8]) -> Option<DataSource> {
    if b.len() < DATA_SOURCE_SIZE {
        return None;
    }
    let u32at = |o: usize| u32::from_le_bytes([b[o], b[o + 1], b[o + 2], b[o + 3]]);
    let present = u32at(400);
    let mac = (present & (1 << 3) != 0).then(|| <[u8; 6]>::try_from(&b[408..414]).expect("6"));
    Some(DataSource { kind: u32at(0), name: wstr(&b[4..132]), description: wstr(&b[132..388]), id: u32at(388), secondary_id: u32at(392), parent_id: u32at(396), mac })
}

/// `PACKETMONITOR_DATA_SOURCE_LIST` 버퍼 → 항목들. 포인터는 버퍼 안을 가리킨다고 보고 범위를 확인해 따라가고,
/// 포인터가 버퍼 밖이면(= 우리가 모르는 배치) 항목이 배열 뒤에 이어 붙었다고 보고 읽는다(PSPktmon 의 방식).
/// 반환: (항목, 각 항목이 버퍼 안에서 시작하는 위치)
pub fn parse_data_source_list(buf: &[u8], base_addr: usize) -> Vec<(DataSource, usize)> {
    if buf.len() < 8 {
        return Vec::new();
    }
    let n = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;
    let ptr_at = |i: usize| {
        let o = 8 + i * 8;
        buf.get(o..o + 8).map(|s| u64::from_le_bytes(s.try_into().expect("8")) as usize)
    };
    let mut out = Vec::new();
    for i in 0..n.min(4096) {
        let Some(p) = ptr_at(i) else { break };
        let mut off = p.checked_sub(base_addr).filter(|o| o.checked_add(DATA_SOURCE_SIZE).is_some_and(|e| e <= buf.len()));
        if off.is_none() {
            let o = 16 + n * 8 + i * DATA_SOURCE_SIZE;
            if o + DATA_SOURCE_SIZE <= buf.len() {
                off = Some(o);
            }
        }
        if let Some(o) = off
            && let Some(ds) = parse_data_source(&buf[o..o + DATA_SOURCE_SIZE])
        {
            out.push((ds, o));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::mem::{offset_of, size_of};

    #[test]
    fn constraint_layout_matches_c_header() {
        assert_eq!(offset_of!(ProtocolConstraint, is_present), 128);
        assert_eq!(offset_of!(ProtocolConstraint, mac1), 132);
        assert_eq!(offset_of!(ProtocolConstraint, ether_type), 146);
        assert_eq!(offset_of!(ProtocolConstraint, transport_protocol), 150);
        assert_eq!(offset_of!(ProtocolConstraint, ip1), 152);
        assert_eq!(offset_of!(ProtocolConstraint, ip2), 168);
        assert_eq!(offset_of!(ProtocolConstraint, prefix_length1), 184);
        assert_eq!(offset_of!(ProtocolConstraint, port1), 186);
        assert_eq!(offset_of!(ProtocolConstraint, tcp_flags), 190);
        assert_eq!(offset_of!(ProtocolConstraint, encap_type), 192);
        assert_eq!(offset_of!(ProtocolConstraint, vxlan_port), 196);
        assert_eq!(offset_of!(ProtocolConstraint, packets), 200);
        assert_eq!(size_of::<ProtocolConstraint>(), 216);
    }

    #[test]
    fn build_constraint_bits_and_name() {
        let f = CaptureFilter { ip1: Some("127.0.0.1".parse().unwrap()), port2: Some(502), protocol: Some(6), ..Default::default() };
        let c = build_constraint("modbus", &f).unwrap();
        assert_eq!(c.is_present, BIT_IP1 | BIT_PORT2 | BIT_TRANSPORT);
        assert_eq!(c.port2, 502);
        assert_eq!(c.transport_protocol, 6);
        assert_eq!(c.ip1[0].to_ne_bytes()[..4], [127, 0, 0, 1]);
        assert_eq!(String::from_utf16_lossy(&c.name[..6]), "modbus");
        assert_eq!(c.name[6], 0);
        let v6 = CaptureFilter { ip1: Some("::1".parse().unwrap()), ..Default::default() };
        assert_eq!(build_constraint("x", &v6).unwrap().is_present & BIT_IPV6, BIT_IPV6);
        let mixed = CaptureFilter { ip1: Some("::1".parse().unwrap()), ip2: Some("1.2.3.4".parse().unwrap()), ..Default::default() };
        assert!(build_constraint("x", &mixed).is_err());
        assert!(CaptureFilter::default().is_empty());
    }

    fn fake_source(name: &str, id: u32, mac: Option<[u8; 6]>) -> Vec<u8> {
        let mut b = vec![0u8; DATA_SOURCE_SIZE];
        b[0..4].copy_from_slice(&1u32.to_le_bytes());
        for (i, u) in name.encode_utf16().enumerate() {
            b[4 + i * 2..6 + i * 2].copy_from_slice(&u.to_le_bytes());
        }
        b[388..392].copy_from_slice(&id.to_le_bytes());
        b[392..396].copy_from_slice(&(id + 100).to_le_bytes());
        if let Some(m) = mac {
            b[400..404].copy_from_slice(&(1u32 << 3).to_le_bytes());
            b[408..414].copy_from_slice(&m);
        }
        b
    }

    #[test]
    fn parse_list_with_pointers_inside_buffer() {
        let base = 0x1000usize;
        let header = 16 + 2 * 8;
        let mut buf = vec![0u8; header];
        buf[0..4].copy_from_slice(&2u32.to_le_bytes());
        buf[8..16].copy_from_slice(&((base + header) as u64).to_le_bytes());
        buf[16..24].copy_from_slice(&((base + header + DATA_SOURCE_SIZE) as u64).to_le_bytes());
        buf.extend(fake_source("이더넷", 5, Some([1, 2, 3, 4, 5, 6])));
        buf.extend(fake_source("Loopback", 6, None));
        let l = parse_data_source_list(&buf, base);
        assert_eq!(l.len(), 2);
        assert_eq!(l[0].0.name, "이더넷");
        assert_eq!((l[0].0.id, l[0].0.secondary_id), (5, 105));
        assert_eq!(l[0].0.mac, Some([1, 2, 3, 4, 5, 6]));
        assert_eq!(l[1].0.mac, None);
        assert_eq!(l[1].1, header + DATA_SOURCE_SIZE);
    }

    #[test]
    fn parse_list_falls_back_to_contiguous_and_survives_garbage() {
        let header = 16 + 8;
        let mut buf = vec![0u8; header];
        buf[0..4].copy_from_slice(&1u32.to_le_bytes());
        buf[8..16].copy_from_slice(&0xDEAD_BEEFu64.to_le_bytes()); // 버퍼 밖 포인터
        buf.extend(fake_source("A", 1, None));
        assert_eq!(parse_data_source_list(&buf, 0x1000).len(), 1);
        // 개수만 크고 내용이 없는 버퍼 — 패닉 없이 빈 목록
        let mut bad = vec![0u8; 12];
        bad[0..4].copy_from_slice(&u32::MAX.to_le_bytes());
        assert!(parse_data_source_list(&bad, 0).is_empty());
        assert!(parse_data_source_list(&[], 0).is_empty());
    }
}
