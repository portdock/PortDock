//! pcapng 저장(0.8.0) — TCP 중계(모니터)가 넘긴 응용 데이터를 Wireshark·PortDock pcap 해석기가 여는 표준 .pcapng 로 남긴다.
//!
//! 중계는 패킷을 잡는 것이 아니라 두 TCP 연결 사이에서 바이트를 넘기므로, 실제 패킷 머리는 없다.
//! 그래서 쌍마다 «A(접속해 온 쪽) ⇄ B(장비)» 하나의 TCP 흐름으로 보고 이더넷·IP·TCP 머리를 만들어 붙인다:
//! 주소·포트는 양 끝의 실제 값, MAC 은 로컬 관리 주소(02:50:44:…), 순서번호는 방향마다 보낸 바이트만큼 늘리고,
//! 처음에 SYN·SYN/ACK·ACK, 끝에 FIN 을 만든다. 시각은 중계가 읽은 순간(µs). 파일 주석·인터페이스 이름에
//! «PortDock TCP relay (reconstructed)» 를 적어 만든 머리임을 밝힌다.
//!
//! 형식 근거: pcapng 명세(IETF draft-ietf-opsawg-pcapng) — SHB(0x0A0D0D0A)·IDB(1)·EPB(6), 블록 길이는 4 바이트 경계,
//! 옵션 opt_comment(1)·shb_userappl(4)·if_name(2)·if_tsresol(9). 링크 형식 1 = LINKTYPE_ETHERNET. 이 파일은 리틀 엔디언으로 쓴다.

use std::collections::HashMap;
use std::io::{BufWriter, Write};
use std::net::{IpAddr, SocketAddr};

/// 인터페이스 이름·파일 주석에 넣는 말 — 머리는 만든 값이라는 표시
pub const IF_NAME: &str = "PortDock TCP relay (reconstructed)";
const SHB_COMMENT: &str = "PortDock TCP relay (reconstructed): Ethernet/IP/TCP headers are synthesized by PortDock; payload bytes and timestamps are what the relay forwarded.";
/// 패킷 하나에 싣는 최대 바이트(이더넷 MSS 와 같게)
pub const MSS: usize = 1460;
/// 나누기 설정이 없을 때 파일 하나의 상한
pub const DEFAULT_LIMIT: u64 = 100 * 1_048_576;

const MAC_A: [u8; 6] = [0x02, 0x50, 0x44, 0x00, 0x00, 0x01];
const MAC_B: [u8; 6] = [0x02, 0x50, 0x44, 0x00, 0x00, 0x02];

const FIN: u8 = 0x01;
const SYN: u8 = 0x02;
const PSH: u8 = 0x08;
const ACK: u8 = 0x10;

fn pad4(n: usize) -> usize {
    (4 - n % 4) % 4
}

/// 옵션 하나(코드·길이·값·4바이트 맞춤)
fn opt(out: &mut Vec<u8>, code: u16, val: &[u8]) {
    out.extend(code.to_le_bytes());
    out.extend((val.len() as u16).to_le_bytes());
    out.extend(val);
    out.extend(std::iter::repeat_n(0, pad4(val.len())));
}

/// 블록 = 종류 + 전체 길이 + 몸 + 전체 길이
fn block(kind: u32, body: &[u8]) -> Vec<u8> {
    let total = (12 + body.len()) as u32;
    let mut out = Vec::with_capacity(total as usize);
    out.extend(kind.to_le_bytes());
    out.extend(total.to_le_bytes());
    out.extend(body);
    out.extend(total.to_le_bytes());
    out
}

/// 구역 머리 블록(SHB) — 바이트 순서 표식 0x1A2B3C4D, 판 1.0, 구역 길이 모름(-1)
pub fn shb(app: &str) -> Vec<u8> {
    let mut b = Vec::new();
    b.extend(0x1A2B_3C4Du32.to_le_bytes());
    b.extend(1u16.to_le_bytes());
    b.extend(0u16.to_le_bytes());
    b.extend((-1i64).to_le_bytes());
    opt(&mut b, 1, SHB_COMMENT.as_bytes());
    opt(&mut b, 4, app.as_bytes());
    opt(&mut b, 0, &[]);
    block(0x0A0D_0D0A, &b)
}

/// 인터페이스 설명 블록(IDB) — 이더넷, 길이 제한 없음, 시각 해상도 µs(if_tsresol = 6)
pub fn idb() -> Vec<u8> {
    let mut b = Vec::new();
    b.extend(1u16.to_le_bytes());
    b.extend(0u16.to_le_bytes());
    b.extend(0u32.to_le_bytes());
    opt(&mut b, 2, IF_NAME.as_bytes());
    opt(&mut b, 9, &[6]);
    opt(&mut b, 0, &[]);
    block(1, &b)
}

/// 패킷 블록(EPB) — 인터페이스 0, 시각(µs, 위·아래 32비트), 잡은 길이 = 원래 길이. comment 가 있으면 opt_comment
pub fn epb(ts_us: u64, frame: &[u8], comment: Option<&str>) -> Vec<u8> {
    let mut b = Vec::with_capacity(28 + frame.len());
    b.extend(0u32.to_le_bytes());
    b.extend(((ts_us >> 32) as u32).to_le_bytes());
    b.extend((ts_us as u32).to_le_bytes());
    b.extend((frame.len() as u32).to_le_bytes());
    b.extend((frame.len() as u32).to_le_bytes());
    b.extend(frame);
    b.extend(std::iter::repeat_n(0, pad4(frame.len())));
    if let Some(c) = comment {
        opt(&mut b, 1, c.as_bytes());
        opt(&mut b, 0, &[]);
    }
    block(6, &b)
}

/// 인터넷 체크섬(16비트 1의 보수 합)
fn csum(parts: &[&[u8]]) -> u16 {
    let mut sum: u32 = 0;
    let mut odd: Option<u8> = None;
    for p in parts {
        for &x in *p {
            match odd.take() {
                Some(hi) => sum += u16::from_be_bytes([hi, x]) as u32,
                None => odd = Some(x),
            }
        }
    }
    if let Some(hi) = odd {
        sum += u16::from_be_bytes([hi, 0]) as u32;
    }
    while sum >> 16 != 0 {
        sum = (sum & 0xFFFF) + (sum >> 16);
    }
    !(sum as u16)
}

/// 두 주소를 같은 종류로 — 한쪽이 IPv6 이면 IPv4 는 IPv4 매핑 IPv6 으로
fn same_family(a: IpAddr, b: IpAddr) -> (IpAddr, IpAddr) {
    match (a, b) {
        (IpAddr::V4(x), IpAddr::V6(_)) => (IpAddr::V6(x.to_ipv6_mapped()), b),
        (IpAddr::V6(_), IpAddr::V4(y)) => (a, IpAddr::V6(y.to_ipv6_mapped())),
        _ => (a, b),
    }
}

/// TCP 세그먼트 하나를 이더넷 프레임으로(IPv4 또는 IPv6, 체크섬 계산). `ip_id` 는 IPv4 식별 칸
#[allow(clippy::too_many_arguments)]
pub fn tcp_frame(src: SocketAddr, dst: SocketAddr, src_mac: [u8; 6], dst_mac: [u8; 6], seq: u32, ack: u32, flags: u8, payload: &[u8], ip_id: u16) -> Vec<u8> {
    let mut tcp = Vec::with_capacity(20 + payload.len());
    tcp.extend(src.port().to_be_bytes());
    tcp.extend(dst.port().to_be_bytes());
    tcp.extend(seq.to_be_bytes());
    tcp.extend(ack.to_be_bytes());
    tcp.push(5 << 4);
    tcp.push(flags);
    tcp.extend(65535u16.to_be_bytes());
    tcp.extend([0, 0, 0, 0]);
    tcp.extend(payload);
    let tlen = tcp.len();
    let (s, d) = same_family(src.ip(), dst.ip());
    let mut out = Vec::with_capacity(14 + 40 + tlen);
    out.extend(dst_mac);
    out.extend(src_mac);
    match (s, d) {
        (IpAddr::V4(s4), IpAddr::V4(d4)) => {
            let pseudo = [&s4.octets()[..], &d4.octets()[..], &[0, 6], &(tlen as u16).to_be_bytes()[..]].concat();
            let c = csum(&[&pseudo, &tcp]);
            tcp[16..18].copy_from_slice(&c.to_be_bytes());
            out.extend(0x0800u16.to_be_bytes());
            let mut ip = Vec::with_capacity(20);
            ip.extend([0x45, 0]);
            ip.extend(((20 + tlen) as u16).to_be_bytes());
            ip.extend(ip_id.to_be_bytes());
            ip.extend(0x4000u16.to_be_bytes()); // DF
            ip.extend([64, 6, 0, 0]);
            ip.extend(s4.octets());
            ip.extend(d4.octets());
            let c = csum(&[&ip]);
            ip[10..12].copy_from_slice(&c.to_be_bytes());
            out.extend(ip);
        }
        (IpAddr::V6(s6), IpAddr::V6(d6)) => {
            let pseudo = [&s6.octets()[..], &d6.octets()[..], &(tlen as u32).to_be_bytes()[..], &[0, 0, 0, 6]].concat();
            let c = csum(&[&pseudo, &tcp]);
            tcp[16..18].copy_from_slice(&c.to_be_bytes());
            out.extend(0x86DDu16.to_be_bytes());
            out.extend(0x6000_0000u32.to_be_bytes());
            out.extend((tlen as u16).to_be_bytes());
            out.extend([6, 64]);
            out.extend(s6.octets());
            out.extend(d6.octets());
        }
        _ => unreachable!("same_family"),
    }
    out.extend(tcp);
    out
}

/// 중계 쌍 하나의 만든 TCP 흐름 — 방향마다 다음 순서번호
#[derive(Debug, Clone)]
struct Flow {
    a: SocketAddr,
    b: SocketAddr,
    /// A→B 다음 순서번호
    seq_a: u32,
    /// B→A 다음 순서번호
    seq_b: u32,
}

/// 쌍 번호로 처음 순서번호를 정한다(파일마다 같은 값 — 시험이 고정되게)
pub fn isn(id: u64) -> (u32, u32) {
    let a = (id as u32).wrapping_mul(0x9E37_79B9) ^ 0x1000_0000;
    (a, a ^ 0x5A5A_5A5A)
}

/// 다음 파일을 연다 → 쓰는 곳
type Opener = fn(&str) -> Result<Box<dyn Write + Send>, String>;

fn create(path: &str) -> Result<Box<dyn Write + Send>, String> {
    let f = std::fs::File::create(path).map_err(|e| format!("{path}: {e}"))?;
    Ok(Box::new(f))
}

/// pcapng 파일 쓰기 — 크기 상한을 넘으면 «이름-002.pcapng» 로 이어 쓴다(새 파일마다 SHB·IDB 부터)
pub struct PcapWriter {
    base: String,
    path: String,
    app: String,
    w: BufWriter<Box<dyn Write + Send>>,
    written: u64,
    limit: u64,
    part: u32,
    flows: HashMap<u64, Flow>,
    ip_id: u16,
    packets: u64,
    opener: Opener,
    /// 다음 파일로 넘어갔을 때 기록에 남길 경로(꺼내 가면 비움)
    rotated: Vec<String>,
}

impl PcapWriter {
    /// 새 파일로 연다(있으면 덮어씀 — pcapng 는 이어 쓰면 구역이 갈리므로). limit 바이트를 넘으면 다음 파일로
    pub fn create(path: &str, app: &str, limit: u64) -> Result<Self, String> {
        let w = create(path)?;
        Self::with_writer(path, app, limit, w, create).map_err(|e| format!("{path}: {e}"))
    }

    /// 시험용 — 쓰는 곳·다음 파일 여는 법을 넘긴다
    fn with_writer(path: &str, app: &str, limit: u64, w: Box<dyn Write + Send>, opener: Opener) -> std::io::Result<Self> {
        let mut p = Self {
            base: path.to_string(),
            path: path.to_string(),
            app: app.to_string(),
            w: BufWriter::new(w),
            written: 0,
            limit: limit.max(4096),
            part: 1,
            flows: HashMap::new(),
            ip_id: 0,
            packets: 0,
            opener,
            rotated: Vec::new(),
        };
        p.start_file()?;
        Ok(p)
    }

    pub fn path(&self) -> &str {
        &self.path
    }

    /// 지금까지 쓴 패킷 수(모든 파일)
    pub fn packets(&self) -> u64 {
        self.packets
    }

    /// 다음 파일로 넘어간 경로들을 꺼낸다
    pub fn take_rotated(&mut self) -> Vec<String> {
        std::mem::take(&mut self.rotated)
    }

    fn start_file(&mut self) -> std::io::Result<()> {
        let head = [shb(&self.app), idb()].concat();
        self.w.write_all(&head)?;
        self.written = head.len() as u64;
        Ok(())
    }

    fn put(&mut self, ts_us: u64, frame: &[u8], comment: Option<&str>) -> std::io::Result<()> {
        let b = epb(ts_us, frame, comment);
        if self.written + b.len() as u64 > self.limit && self.written > (shb(&self.app).len() + idb().len()) as u64 {
            self.w.flush()?;
            self.part += 1;
            let next = crate::event::part_path(&self.base, self.part);
            let w = (self.opener)(&next).map_err(std::io::Error::other)?;
            self.w = BufWriter::new(w);
            self.path = next.clone();
            self.rotated.push(next);
            self.start_file()?;
        }
        self.w.write_all(&b)?;
        self.written += b.len() as u64;
        self.packets += 1;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn seg(&mut self, from_b: bool, f: &Flow, seq: u32, ack: u32, flags: u8, payload: &[u8], ts_us: u64, comment: Option<&str>) -> std::io::Result<()> {
        self.ip_id = self.ip_id.wrapping_add(1);
        let frame = if from_b { tcp_frame(f.b, f.a, MAC_B, MAC_A, seq, ack, flags, payload, self.ip_id) } else { tcp_frame(f.a, f.b, MAC_A, MAC_B, seq, ack, flags, payload, self.ip_id) };
        self.put(ts_us, &frame, comment)
    }

    /// 처음 보는 쌍이면 SYN·SYN/ACK·ACK 를 만들어 넣는다
    fn flow(&mut self, id: u64, a: SocketAddr, b: SocketAddr, ts_us: u64) -> std::io::Result<Flow> {
        if let Some(f) = self.flows.get(&id) {
            return Ok(f.clone());
        }
        let (ia, ib) = isn(id);
        let f = Flow { a, b, seq_a: ia.wrapping_add(1), seq_b: ib.wrapping_add(1) };
        self.seg(false, &f, ia, 0, SYN, &[], ts_us, None)?;
        self.seg(true, &f, ib, ia.wrapping_add(1), SYN | ACK, &[], ts_us, None)?;
        self.seg(false, &f, ia.wrapping_add(1), ib.wrapping_add(1), ACK, &[], ts_us, None)?;
        self.flows.insert(id, f.clone());
        Ok(f)
    }

    /// 쌍 `id`(A 주소 a, B 주소 b)의 한 방향 데이터. from_b = B→A. MSS 로 나눠 여러 패킷으로
    #[allow(clippy::too_many_arguments)]
    pub fn data(&mut self, id: u64, a: SocketAddr, b: SocketAddr, from_b: bool, bytes: &[u8], ts_us: u64, comment: Option<&str>) -> std::io::Result<()> {
        if bytes.is_empty() {
            return Ok(());
        }
        let mut f = self.flow(id, a, b, ts_us)?;
        for chunk in bytes.chunks(MSS) {
            let (seq, ack) = if from_b { (f.seq_b, f.seq_a) } else { (f.seq_a, f.seq_b) };
            self.seg(from_b, &f, seq, ack, PSH | ACK, chunk, ts_us, comment)?;
            if from_b {
                f.seq_b = f.seq_b.wrapping_add(chunk.len() as u32);
            } else {
                f.seq_a = f.seq_a.wrapping_add(chunk.len() as u32);
            }
        }
        self.flows.insert(id, f);
        Ok(())
    }

    /// 쌍이 닫힘 — FIN/ACK 둘과 마지막 ACK. 본 적 없는 쌍이면 아무것도 안 쓴다
    pub fn close(&mut self, id: u64, ts_us: u64) -> std::io::Result<()> {
        let Some(f) = self.flows.remove(&id) else { return Ok(()) };
        self.seg(false, &f, f.seq_a, f.seq_b, FIN | ACK, &[], ts_us, None)?;
        self.seg(true, &f, f.seq_b, f.seq_a.wrapping_add(1), FIN | ACK, &[], ts_us, None)?;
        self.seg(false, &f, f.seq_a.wrapping_add(1), f.seq_b.wrapping_add(1), ACK, &[], ts_us, None)
    }

    pub fn flush(&mut self) -> std::io::Result<()> {
        self.w.flush()
    }
}

/// 지금 시각(유닉스 µs)
pub fn now_us() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_micros() as u64).unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    fn le32(b: &[u8], i: usize) -> u32 {
        u32::from_le_bytes(b[i..i + 4].try_into().unwrap())
    }
    fn be32(b: &[u8], i: usize) -> u32 {
        u32::from_be_bytes(b[i..i + 4].try_into().unwrap())
    }

    /// 블록들을 (종류, 몸) 으로 — 앞뒤 길이가 같고 4의 배수인지도 본다
    fn blocks(b: &[u8]) -> Vec<(u32, Vec<u8>)> {
        let mut out = Vec::new();
        let mut i = 0;
        while i < b.len() {
            let (kind, len) = (le32(b, i), le32(b, i + 4) as usize);
            assert_eq!(len % 4, 0, "block length must be a multiple of 4");
            assert_eq!(le32(b, i + len - 4), len as u32, "trailing block length");
            out.push((kind, b[i + 8..i + len - 4].to_vec()));
            i += len;
        }
        assert_eq!(i, b.len());
        out
    }

    #[test]
    fn shb_idb_bytes_are_fixed() {
        let s = shb("PortDock TCP");
        assert_eq!(&s[..4], &[0x0A, 0x0D, 0x0D, 0x0A]);
        assert_eq!(&s[8..12], &[0x4D, 0x3C, 0x2B, 0x1A], "byte-order magic, little endian");
        assert_eq!(&s[12..16], &[1, 0, 0, 0], "version 1.0");
        assert_eq!(&s[16..24], &[0xFF; 8], "section length unknown");
        // 첫 옵션 = opt_comment(1), 길이 = 주석 길이
        assert_eq!(u16::from_le_bytes([s[24], s[25]]), 1);
        assert_eq!(u16::from_le_bytes([s[26], s[27]]) as usize, SHB_COMMENT.len());
        assert!(String::from_utf8_lossy(&s).contains("PortDock TCP relay (reconstructed)"));
        assert_eq!(s.len() % 4, 0);
        assert_eq!(le32(&s, 4) as usize, s.len());

        let d = idb();
        let want_head: [u8; 16] = [1, 0, 0, 0, d.len() as u8, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
        assert_eq!(&d[..16], &want_head, "IDB, linktype 1 (Ethernet), snaplen 0");
        // if_name(2) = IF_NAME(34바이트 → 2바이트 채움), if_tsresol(9) = 6, 끝
        let mut want = vec![2, 0, IF_NAME.len() as u8, 0];
        want.extend(IF_NAME.as_bytes());
        want.extend([0, 0]);
        want.extend([9, 0, 1, 0, 6, 0, 0, 0]);
        want.extend([0, 0, 0, 0]);
        assert_eq!(&d[16..d.len() - 4], &want[..]);
        assert_eq!(d.len(), 16 + want.len() + 4);
    }

    #[test]
    fn epb_bytes_are_fixed() {
        // 시각 0x0000_0001_0000_0002 µs, 5바이트 → 3바이트 채움
        let e = epb(0x0000_0001_0000_0002, &[1, 2, 3, 4, 5], None);
        let want: Vec<u8> = [
            &6u32.to_le_bytes()[..],
            &40u32.to_le_bytes(),
            &0u32.to_le_bytes(),
            &1u32.to_le_bytes(),
            &2u32.to_le_bytes(),
            &5u32.to_le_bytes(),
            &5u32.to_le_bytes(),
            &[1, 2, 3, 4, 5, 0, 0, 0],
            &40u32.to_le_bytes(),
        ]
        .concat();
        assert_eq!(e, want);
        // 주석이 붙으면 opt_comment + opt_endofopt
        let c = epb(7, &[9; 4], Some("INJECT"));
        assert_eq!(le32(&c, 4) as usize, c.len());
        assert_eq!(&c[32..36], &[1, 0, 6, 0]);
        assert_eq!(&c[36..44], b"INJECT\0\0");
        assert_eq!(&c[44..48], &[0, 0, 0, 0]);
    }

    #[test]
    fn checksums_match_known_values() {
        // RFC 1071 예: 00 01 F2 03 F4 F5 F6 F7 → 합 0xDDF2, 체크섬 0x220D
        assert_eq!(csum(&[&[0x00, 0x01, 0xF2, 0x03, 0xF4, 0xF5, 0xF6, 0xF7]]), 0x220D);
        let a: SocketAddr = "192.168.0.20:51234".parse().unwrap();
        let b: SocketAddr = "192.168.0.10:502".parse().unwrap();
        let f = tcp_frame(a, b, MAC_A, MAC_B, 1000, 2000, PSH | ACK, b"\x00\x01\x00\x00\x00\x06\x01\x03\x00\x00\x00\x02", 7);
        assert_eq!(&f[..6], &MAC_B);
        assert_eq!(&f[12..14], &[0x08, 0x00]);
        let ip = &f[14..34];
        assert_eq!(ip[0], 0x45);
        assert_eq!(u16::from_be_bytes([ip[2], ip[3]]), 20 + 20 + 12);
        assert_eq!(csum(&[ip]), 0, "IPv4 header checksum");
        let tcp = &f[34..];
        assert_eq!(u16::from_be_bytes([tcp[0], tcp[1]]), 51234);
        assert_eq!(u16::from_be_bytes([tcp[2], tcp[3]]), 502);
        assert_eq!((be32(tcp, 4), be32(tcp, 8), tcp[13]), (1000, 2000, PSH | ACK));
        let pseudo = [&[192, 168, 0, 20, 192, 168, 0, 10, 0, 6][..], &(tcp.len() as u16).to_be_bytes()].concat();
        assert_eq!(csum(&[&pseudo, tcp]), 0, "TCP checksum");
        // IPv6 와 IPv4 가 섞이면 IPv4 매핑 IPv6
        let v6: SocketAddr = "[fe80::1]:49152".parse().unwrap();
        let g = tcp_frame(v6, b, MAC_A, MAC_B, 1, 2, ACK, &[], 1);
        assert_eq!(&g[12..14], &[0x86, 0xDD]);
        assert_eq!(&g[14 + 24..14 + 40], &std::net::Ipv4Addr::new(192, 168, 0, 10).to_ipv6_mapped().octets());
        let tcp6 = &g[54..];
        let pseudo6 = [&g[22..54], &(tcp6.len() as u32).to_be_bytes()[..], &[0, 0, 0, 6]].concat();
        assert_eq!(csum(&[&pseudo6, tcp6]), 0, "TCP checksum over IPv6");
    }

    #[derive(Clone, Default)]
    struct Mem(Arc<Mutex<Vec<u8>>>);
    impl Write for Mem {
        fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(b);
            Ok(b.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    /// TCP 세그먼트 풀이: (출발 포트, 순서, 확인, 깃발, 데이터)
    fn seg_of(frame: &[u8]) -> (u16, u32, u32, u8, Vec<u8>) {
        let t = &frame[34..];
        (u16::from_be_bytes([t[0], t[1]]), be32(t, 4), be32(t, 8), t[13], t[20..].to_vec())
    }

    #[test]
    fn synthetic_sequence_numbers_follow_the_bytes() {
        let mem = Mem::default();
        let mut w = PcapWriter::with_writer("x.pcapng", "PortDock TCP", DEFAULT_LIMIT, Box::new(mem.clone()), |_| Err("no".into())).unwrap();
        let a: SocketAddr = "10.0.0.2:50000".parse().unwrap();
        let b: SocketAddr = "10.0.0.1:502".parse().unwrap();
        w.data(3, a, b, false, &[1; 12], 1_000_000, None).unwrap();
        w.data(3, a, b, true, &[2; 13], 1_002_500, None).unwrap();
        w.data(3, a, b, false, &vec![3; MSS + 10], 1_004_000, Some("INJECT")).unwrap();
        w.close(3, 1_005_000).unwrap();
        w.flush().unwrap();
        assert_eq!(w.packets(), 3 + 1 + 1 + 2 + 3);
        let bytes = mem.0.lock().unwrap().clone();
        let bl = blocks(&bytes);
        assert_eq!(bl.iter().map(|b| b.0).collect::<Vec<_>>(), [vec![0x0A0D_0D0A, 1], vec![6; 10]].concat());
        let pk: Vec<_> = bl[2..].iter().map(|(_, body)| {
            let ts = ((le32(body, 4) as u64) << 32) | le32(body, 8) as u64;
            let cap = le32(body, 12) as usize;
            (ts, seg_of(&body[20..20 + cap]))
        }).collect();
        let (ia, ib) = isn(3);
        // 손잡기
        assert_eq!(pk[0].1, (50000, ia, 0, SYN, vec![]));
        assert_eq!(pk[1].1, (502, ib, ia + 1, SYN | ACK, vec![]));
        assert_eq!(pk[2].1, (50000, ia + 1, ib + 1, ACK, vec![]));
        // A→B 12바이트, B→A 13바이트 — 순서번호는 보낸 바이트만큼
        assert_eq!(pk[3].1, (50000, ia + 1, ib + 1, PSH | ACK, vec![1; 12]));
        assert_eq!(pk[4].1, (502, ib + 1, ia + 13, PSH | ACK, vec![2; 13]));
        // MSS 를 넘으면 둘로
        assert_eq!((pk[5].1 .1, pk[5].1 .4.len()), (ia + 13, MSS));
        assert_eq!((pk[6].1 .1, pk[6].1 .4.len()), (ia + 13 + MSS as u32, 10));
        // 끝: FIN 둘 + ACK
        let end_a = ia + 13 + MSS as u32 + 10;
        assert_eq!(pk[7].1, (50000, end_a, ib + 14, FIN | ACK, vec![]));
        assert_eq!(pk[8].1, (502, ib + 14, end_a + 1, FIN | ACK, vec![]));
        assert_eq!(pk[9].1, (50000, end_a + 1, ib + 15, ACK, vec![]));
        // 시각(µs)은 그대로
        assert_eq!(pk.iter().map(|p| p.0).collect::<Vec<_>>(), vec![1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_002_500, 1_004_000, 1_004_000, 1_005_000, 1_005_000, 1_005_000]);
        // 끼워 넣은 패킷엔 주석
        assert!(bl[7].1.windows(6).any(|x| x == b"INJECT"));
        assert!(!bl[5].1.windows(6).any(|x| x == b"INJECT"));
    }

    static PARTS: Mutex<Vec<(String, Mem)>> = Mutex::new(Vec::new());
    fn part_opener(path: &str) -> Result<Box<dyn Write + Send>, String> {
        let m = Mem::default();
        PARTS.lock().unwrap().push((path.to_string(), m.clone()));
        Ok(Box::new(m))
    }

    #[test]
    fn splits_into_parts_with_their_own_headers() {
        let first = Mem::default();
        let mut w = PcapWriter::with_writer("C:\\cap\\relay.pcapng", "PortDock TCP", 4096, Box::new(first.clone()), part_opener).unwrap();
        let a: SocketAddr = "10.0.0.2:50000".parse().unwrap();
        let b: SocketAddr = "10.0.0.1:502".parse().unwrap();
        for i in 0..20 {
            w.data(1, a, b, i % 2 == 1, &[i as u8; 400], 1_000 + i, None).unwrap();
        }
        w.flush().unwrap();
        let rotated = w.take_rotated();
        assert!(!rotated.is_empty());
        assert_eq!(rotated[0], "C:\\cap\\relay-002.pcapng");
        assert_eq!(w.path(), rotated.last().unwrap());
        let first = first.0.lock().unwrap().clone();
        assert!(first.len() <= 4096);
        let parts = PARTS.lock().unwrap();
        let mut total = blocks(&first).iter().filter(|b| b.0 == 6).count();
        for (_, m) in parts.iter() {
            let b = m.0.lock().unwrap().clone();
            let bl = blocks(&b);
            assert_eq!((bl[0].0, bl[1].0), (0x0A0D_0D0A, 1), "each part starts with SHB + IDB");
            assert!(b.len() <= 4096);
            total += bl.iter().filter(|b| b.0 == 6).count();
        }
        assert_eq!(total as u64, w.packets());
    }
}
