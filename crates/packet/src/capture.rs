//! pcap·pcapng 읽기(색인)와 pcapng 쓰기.
//!
//! 읽기는 `site/src/lib/pcapRead.ts` 의 `readCapture` 와 같은 규칙이다(같은 파일에서 같은 패킷 수·시각·바이트).
//! 패킷 바이트는 복사하지 않는다 — 파일은 메모리 지도(mmap)로 두고, 패킷마다 (오프셋·길이·시각·인터페이스·링크) 색인만 만든다.
//! 형식 근거: pcap — tcpdump.org pcap-savefile(5), pcapng — draft-ietf-opsawg-pcapng(SHB·IDB·EPB·SPB·if_tsresol·if_tsoffset),
//! 링크 종류 — tcpdump.org/linktypes.html.

use std::fmt;
use std::fs::File;
use std::io::{self, Write};
use std::path::Path;

use memmap2::Mmap;

/// 시각이 없는 패킷(pcapng Simple Packet Block)의 표시
pub const NO_TS: i64 = i64::MIN;

#[derive(Debug)]
pub enum CaptureError {
    Empty,
    Gzip,
    Unknown,
    Corrupt(&'static str),
    Io(io::Error),
}

impl fmt::Display for CaptureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CaptureError::Empty => write!(f, "empty file"),
            CaptureError::Gzip => write!(f, "gzip-compressed capture (decompress first)"),
            CaptureError::Unknown => write!(f, "unknown capture format"),
            CaptureError::Corrupt(w) => write!(f, "corrupt capture ({w})"),
            CaptureError::Io(e) => write!(f, "{e}"),
        }
    }
}

impl std::error::Error for CaptureError {}

impl From<io::Error> for CaptureError {
    fn from(e: io::Error) -> Self {
        CaptureError::Io(e)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Format {
    Pcap,
    Pcapng,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Precision {
    Micro,
    Nano,
    Mixed,
}

/// 패킷 하나의 색인 — 바이트는 파일 안에 있다
#[derive(Clone, Copy, Debug)]
pub struct PacketRef {
    /// 파일 안의 패킷 바이트 시작
    pub off: u64,
    pub caplen: u32,
    pub origlen: u32,
    /// 유닉스 시각(나노초). 없으면 [`NO_TS`]
    pub ts_ns: i64,
    /// 파일 전체에서 센 인터페이스 번호(구역이 이어 붙으면 계속 늘어남)
    pub iface: u32,
    pub link: u16,
}

impl PacketRef {
    pub fn has_ts(&self) -> bool {
        self.ts_ns != NO_TS
    }
    pub fn sec(&self) -> i64 {
        self.ts_ns.div_euclid(1_000_000_000)
    }
    pub fn nsec(&self) -> u32 {
        if self.has_ts() {
            self.ts_ns.rem_euclid(1_000_000_000) as u32
        } else {
            0
        }
    }
}

#[derive(Clone, Debug)]
pub struct IfaceInfo {
    pub link: u16,
    pub snaplen: u32,
    /// 시각 단위가 10^-k 초(`pow10`)인지 2^-k 초인지
    pub tsresol: u8,
    pub pow10: bool,
    pub tsoffset: i64,
}

#[derive(Clone, Debug)]
pub struct CaptureInfo {
    pub format: Format,
    pub precision: Precision,
    pub big_endian: bool,
    pub interfaces: u32,
    pub link_types: Vec<u16>,
    pub packets: usize,
    /// 파일 끝이 잘려 다 읽지 못함
    pub truncated_file: bool,
}

enum Storage {
    Map(Mmap),
    Mem(Vec<u8>),
}

impl Storage {
    fn bytes(&self) -> &[u8] {
        match self {
            Storage::Map(m) => m,
            Storage::Mem(v) => v,
        }
    }
}

/// 열린 캡처 — 파일 + 색인
pub struct Capture {
    storage: Storage,
    pub info: CaptureInfo,
    pub packets: Vec<PacketRef>,
    pub ifaces: Vec<IfaceInfo>,
}

impl Capture {
    /// 파일을 메모리 지도로 열어 색인을 만든다
    pub fn open(path: impl AsRef<Path>) -> Result<Capture, CaptureError> {
        let f = File::open(path)?;
        // SAFETY: 읽기 전용 지도. 다른 프로그램이 파일을 줄이면 접근 오류가 날 수 있는 것은 mmap 의 일반적 한계다
        let m = unsafe { Mmap::map(&f)? };
        Capture::from_storage(Storage::Map(m))
    }

    pub fn from_bytes(v: Vec<u8>) -> Result<Capture, CaptureError> {
        Capture::from_storage(Storage::Mem(v))
    }

    fn from_storage(storage: Storage) -> Result<Capture, CaptureError> {
        let mut packets = Vec::new();
        let mut ifaces = Vec::new();
        let info = index(storage.bytes(), &mut packets, &mut ifaces)?;
        Ok(Capture {
            storage,
            info,
            packets,
            ifaces,
        })
    }

    pub fn raw(&self) -> &[u8] {
        self.storage.bytes()
    }

    /// 패킷 바이트(복사 없음)
    pub fn data(&self, p: &PacketRef) -> &[u8] {
        let b = self.storage.bytes();
        let s = p.off as usize;
        &b[s..s + p.caplen as usize]
    }

    pub fn len(&self) -> usize {
        self.packets.len()
    }

    pub fn is_empty(&self) -> bool {
        self.packets.is_empty()
    }

    /// 고른 패킷(0 기준 번호)만 pcapng 로 쓴다. 인터페이스는 쓰인 것만, 시각은 나노초 단위
    pub fn write_pcapng<W: Write>(&self, w: W, which: &[usize]) -> io::Result<W> {
        let mut map: Vec<u32> = Vec::new(); // 원래 인터페이스 번호 → 새 번호
        let mut specs: Vec<IfaceSpec> = Vec::new();
        let mut new_of = std::collections::HashMap::new();
        for &i in which {
            let p = &self.packets[i];
            let id = *new_of.entry(p.iface).or_insert_with(|| {
                let snap = self
                    .ifaces
                    .get(p.iface as usize)
                    .map(|f| f.snaplen)
                    .unwrap_or(0);
                specs.push(IfaceSpec {
                    link: p.link,
                    snaplen: snap,
                });
                (specs.len() - 1) as u32
            });
            map.push(id);
        }
        let mut out = PcapngWriter::new(w, &specs)?;
        for (k, &i) in which.iter().enumerate() {
            let p = &self.packets[i];
            out.packet(
                map[k],
                if p.has_ts() { p.ts_ns } else { 0 },
                self.data(p),
                p.origlen,
            )?;
        }
        out.finish()
    }
}

// ---------------------------------------------------------------- 읽기

fn u32le(d: &[u8], i: usize) -> u32 {
    u32::from_le_bytes([d[i], d[i + 1], d[i + 2], d[i + 3]])
}
fn u32be(d: &[u8], i: usize) -> u32 {
    u32::from_be_bytes([d[i], d[i + 1], d[i + 2], d[i + 3]])
}
fn u16le(d: &[u8], i: usize) -> u16 {
    u16::from_le_bytes([d[i], d[i + 1]])
}
fn u16be(d: &[u8], i: usize) -> u16 {
    u16::from_be_bytes([d[i], d[i + 1]])
}

fn index(
    buf: &[u8],
    out: &mut Vec<PacketRef>,
    ifaces: &mut Vec<IfaceInfo>,
) -> Result<CaptureInfo, CaptureError> {
    if buf.len() < 4 {
        return Err(CaptureError::Empty);
    }
    if buf[0] == 0x1f && buf[1] == 0x8b {
        return Err(CaptureError::Gzip);
    }
    match u32le(buf, 0) {
        0x0a0d0d0a => index_pcapng(buf, out, ifaces),
        0xa1b2c3d4 | 0xd4c3b2a1 | 0xa1b23c4d | 0x4d3cb2a1 => index_pcap(buf, out, ifaces),
        _ => Err(CaptureError::Unknown),
    }
}

fn index_pcap(
    buf: &[u8],
    out: &mut Vec<PacketRef>,
    ifaces: &mut Vec<IfaceInfo>,
) -> Result<CaptureInfo, CaptureError> {
    let m = u32le(buf, 0);
    let big = m == 0xd4c3b2a1 || m == 0x4d3cb2a1;
    let nano = m == 0xa1b23c4d || m == 0x4d3cb2a1;
    let rd = |i: usize| if big { u32be(buf, i) } else { u32le(buf, i) };
    if buf.len() < 24 {
        return Err(CaptureError::Corrupt("header"));
    }
    let link = (rd(20) & 0x0fff_ffff) as u16;
    let snap = rd(16);
    ifaces.push(IfaceInfo {
        link,
        snaplen: snap,
        tsresol: if nano { 9 } else { 6 },
        pow10: true,
        tsoffset: 0,
    });
    let mut i = 24usize;
    let mut truncated = false;
    out.reserve(buf.len() / 100);
    while i < buf.len() {
        if i + 16 > buf.len() {
            truncated = true;
            break;
        }
        let sec = rd(i) as i64;
        let frac = rd(i + 4) as i64;
        let incl = rd(i + 8);
        let orig = rd(i + 12);
        if incl > 0x400_0000 {
            return Err(CaptureError::Corrupt("record"));
        }
        if i + 16 + incl as usize > buf.len() {
            truncated = true;
            break;
        }
        let ns = if nano { frac } else { frac * 1000 };
        out.push(PacketRef {
            off: (i + 16) as u64,
            caplen: incl,
            origlen: orig,
            ts_ns: sec * 1_000_000_000 + ns,
            iface: 0,
            link,
        });
        i += 16 + incl as usize;
    }
    Ok(CaptureInfo {
        format: Format::Pcap,
        precision: if nano {
            Precision::Nano
        } else {
            Precision::Micro
        },
        big_endian: big,
        interfaces: 1,
        link_types: vec![link],
        packets: out.len(),
        truncated_file: truncated,
    })
}

/// 64비트 시각(단위 수) → 나노초(오프셋 포함)
fn ts_ns_of(hi: u32, lo: u32, f: &IfaceInfo) -> i64 {
    let units = ((hi as u128) << 32) | lo as u128;
    let ns: u128 = if f.pow10 {
        let k = f.tsresol as u32;
        if k <= 9 {
            units * 10u128.pow(9 - k)
        } else {
            units / 10u128.pow((k - 9).min(30))
        }
    } else {
        let k = (f.tsresol as u32).min(63);
        (units * 1_000_000_000u128) >> k
    };
    (ns.min(i64::MAX as u128 / 2) as i64).saturating_add(f.tsoffset.saturating_mul(1_000_000_000))
}

fn index_pcapng(
    buf: &[u8],
    out: &mut Vec<PacketRef>,
    all_ifaces: &mut Vec<IfaceInfo>,
) -> Result<CaptureInfo, CaptureError> {
    let mut i = 0usize;
    let mut le = true;
    let mut base = 0u32; // 앞 구역들의 인터페이스 수
    let mut sect_start = 0usize; // all_ifaces 안 현재 구역의 첫 칸
    let mut links: Vec<u16> = Vec::new();
    let mut precisions: Vec<&'static str> = Vec::new();
    let mut any_big = false;
    let mut truncated = false;
    out.reserve(buf.len() / 100);
    while i < buf.len() {
        if i + 12 > buf.len() {
            truncated = true;
            break;
        }
        let ty = if le { u32le(buf, i) } else { u32be(buf, i) };
        if ty == 0x0a0d0d0a {
            let bom = u32le(buf, i + 8);
            if bom == 0x1a2b3c4d {
                le = true;
            } else if bom == 0x4d3c2b1a {
                le = false;
                any_big = true;
            } else {
                return Err(CaptureError::Corrupt("bom"));
            }
            base += (all_ifaces.len() - sect_start) as u32;
            sect_start = all_ifaces.len();
        }
        let u32r = |d: &[u8], k: usize| if le { u32le(d, k) } else { u32be(d, k) };
        let u16r = |d: &[u8], k: usize| if le { u16le(d, k) } else { u16be(d, k) };
        let len = u32r(buf, i + 4) as usize;
        if len < 12 || !len.is_multiple_of(4) {
            return Err(CaptureError::Corrupt("block"));
        }
        if i + len > buf.len() {
            truncated = true;
            break;
        }
        let body = i + 8;
        let end = i + len - 4;
        match ty {
            1 => {
                // IDB
                if body + 8 > end {
                    return Err(CaptureError::Corrupt("idb"));
                }
                let mut f = IfaceInfo {
                    link: u16r(buf, body),
                    snaplen: u32r(buf, body + 4),
                    tsresol: 6,
                    pow10: true,
                    tsoffset: 0,
                };
                let mut o = body + 8;
                while o + 4 <= end {
                    let code = u16r(buf, o);
                    let olen = u16r(buf, o + 2) as usize;
                    if code == 0 {
                        break;
                    }
                    if code == 9 && olen >= 1 && o + 5 <= end {
                        let v = buf[o + 4];
                        f.pow10 = v & 0x80 == 0;
                        f.tsresol = v & 0x7f;
                    } else if code == 14 && olen == 8 && o + 12 <= end {
                        let (hi, lo) = if le {
                            (u32r(buf, o + 8), u32r(buf, o + 4))
                        } else {
                            (u32r(buf, o + 4), u32r(buf, o + 8))
                        };
                        f.tsoffset = ((hi as i64) << 32) | lo as i64;
                    }
                    o += 4 + ((olen + 3) & !3);
                }
                if !links.contains(&f.link) {
                    links.push(f.link);
                }
                let p = if f.pow10 && f.tsresol == 6 {
                    "us"
                } else if f.pow10 && f.tsresol == 9 {
                    "ns"
                } else {
                    "other"
                };
                if !precisions.contains(&p) {
                    precisions.push(p);
                }
                all_ifaces.push(f);
            }
            6 | 2 => {
                // EPB(6) · 옛 Packet Block(2)
                if body + 20 > end {
                    return Err(CaptureError::Corrupt("epb"));
                }
                let id = if ty == 6 {
                    u32r(buf, body) as usize
                } else {
                    u16r(buf, body) as usize
                };
                if let Some(f) = all_ifaces.get(sect_start + id) {
                    let hi = u32r(buf, body + 4);
                    let lo = u32r(buf, body + 8);
                    let cap = u32r(buf, body + 12) as usize;
                    let orig = u32r(buf, body + 16);
                    let d = body + 20;
                    let c = cap.min(end - d);
                    out.push(PacketRef {
                        off: d as u64,
                        caplen: c as u32,
                        origlen: orig,
                        ts_ns: ts_ns_of(hi, lo, f),
                        iface: base + id as u32,
                        link: f.link,
                    });
                }
            }
            3 => {
                // SPB — 시각 없음, 인터페이스 0
                if let Some(f) = all_ifaces.get(sect_start)
                    && body + 4 <= end
                {
                    let orig = u32r(buf, body);
                    let d = body + 4;
                    let mut c = (orig as usize).min(end - d);
                    if f.snaplen > 0 {
                        c = c.min(f.snaplen as usize);
                    }
                    out.push(PacketRef {
                        off: d as u64,
                        caplen: c as u32,
                        origlen: orig,
                        ts_ns: NO_TS,
                        iface: base,
                        link: f.link,
                    });
                }
            }
            _ => {} // NRB(4)·ISB(5)·SHB·그 밖의 블록은 건너뛴다
        }
        i += len;
    }
    let precision = if precisions.len() == 1 && precisions[0] != "other" {
        if precisions[0] == "us" {
            Precision::Micro
        } else {
            Precision::Nano
        }
    } else if precisions.is_empty() {
        Precision::Micro
    } else {
        Precision::Mixed
    };
    Ok(CaptureInfo {
        format: Format::Pcapng,
        precision,
        big_endian: any_big,
        interfaces: all_ifaces.len() as u32,
        link_types: links,
        packets: out.len(),
        truncated_file: truncated,
    })
}

// ---------------------------------------------------------------- pcapng 쓰기

#[derive(Clone, Debug)]
pub struct IfaceSpec {
    pub link: u16,
    pub snaplen: u32,
}

/// pcapng(리틀 엔디언, 한 구역) 쓰기 — SHB·IDB(if_tsresol = 9, 나노초)·EPB. Wireshark 가 여는 표준 모양
pub struct PcapngWriter<W: Write> {
    w: W,
    n_ifaces: u32,
}

fn pad4(v: &mut Vec<u8>) {
    while !v.len().is_multiple_of(4) {
        v.push(0);
    }
}

fn block(w: &mut impl Write, ty: u32, body: &[u8]) -> io::Result<()> {
    let mut b = body.to_vec();
    pad4(&mut b);
    let len = (12 + b.len()) as u32;
    w.write_all(&ty.to_le_bytes())?;
    w.write_all(&len.to_le_bytes())?;
    w.write_all(&b)?;
    w.write_all(&len.to_le_bytes())
}

fn option(v: &mut Vec<u8>, code: u16, val: &[u8]) {
    v.extend_from_slice(&code.to_le_bytes());
    v.extend_from_slice(&(val.len() as u16).to_le_bytes());
    v.extend_from_slice(val);
    pad4(v);
}

impl<W: Write> PcapngWriter<W> {
    pub fn new(mut w: W, ifaces: &[IfaceSpec]) -> io::Result<Self> {
        let mut shb = Vec::new();
        shb.extend_from_slice(&0x1a2b3c4du32.to_le_bytes());
        shb.extend_from_slice(&1u16.to_le_bytes());
        shb.extend_from_slice(&0u16.to_le_bytes());
        shb.extend_from_slice(&(-1i64).to_le_bytes());
        option(&mut shb, 4, b"PortDock Packet"); // shb_userappl
        option(&mut shb, 0, &[]);
        block(&mut w, 0x0a0d0d0a, &shb)?;
        for f in ifaces {
            let mut idb = Vec::new();
            idb.extend_from_slice(&f.link.to_le_bytes());
            idb.extend_from_slice(&0u16.to_le_bytes());
            idb.extend_from_slice(&f.snaplen.to_le_bytes());
            option(&mut idb, 9, &[9]); // if_tsresol = 10^-9
            option(&mut idb, 0, &[]);
            block(&mut w, 1, &idb)?;
        }
        Ok(PcapngWriter {
            w,
            n_ifaces: ifaces.len() as u32,
        })
    }

    pub fn packet(&mut self, iface: u32, ts_ns: i64, data: &[u8], orig_len: u32) -> io::Result<()> {
        if iface >= self.n_ifaces {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "interface index",
            ));
        }
        let ts = ts_ns.max(0) as u64;
        let mut b = Vec::with_capacity(20 + data.len() + 3);
        b.extend_from_slice(&iface.to_le_bytes());
        b.extend_from_slice(&((ts >> 32) as u32).to_le_bytes());
        b.extend_from_slice(&(ts as u32).to_le_bytes());
        b.extend_from_slice(&(data.len() as u32).to_le_bytes());
        b.extend_from_slice(&orig_len.to_le_bytes());
        b.extend_from_slice(data);
        block(&mut self.w, 6, &b)
    }

    pub fn finish(mut self) -> io::Result<W> {
        self.w.flush()?;
        Ok(self.w)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::*;

    fn ip() -> Vec<u8> {
        ipv4(&IpPkt {
            src: [192, 168, 0, 10],
            dst: [192, 168, 0, 20],
            sport: 50000,
            dport: 502,
            seq: 7,
            ack: 9,
            flags: 0x18,
            payload: vec![1, 2, 3],
            ip_id: 5,
            ..Default::default()
        })
    }

    fn all(b: Vec<u8>) -> (CaptureInfo, Vec<(u32, i64, u32, u16, Vec<u8>)>) {
        let c = Capture::from_bytes(b).unwrap();
        let v = c
            .packets
            .iter()
            .map(|p| {
                (
                    p.iface,
                    if p.has_ts() { p.sec() } else { i64::MIN },
                    p.nsec(),
                    p.link,
                    c.data(p).to_vec(),
                )
            })
            .collect();
        (c.info.clone(), v)
    }

    #[test]
    fn pcap_micro_little_endian() {
        let (info, out) = all(pcap(
            &[
                Rec::t(1700000000.25, wrap(1, &ip(), None)),
                Rec::t(1700000001.000001, wrap(1, &ip(), None)),
            ],
            1,
            false,
            false,
        ));
        assert_eq!(
            (info.format, info.precision, info.big_endian, info.packets),
            (Format::Pcap, Precision::Micro, false, 2)
        );
        assert_eq!((out[0].1, out[0].2), (1700000000, 250000000));
        assert_eq!((out[1].1, out[1].2), (1700000001, 1000));
    }

    #[test]
    fn pcap_nano_big_endian() {
        let (info, out) = all(pcap(
            &[Rec::ns(1700000000, 123456789, wrap(101, &ip(), None))],
            101,
            true,
            true,
        ));
        assert_eq!(
            (info.precision, info.big_endian, info.link_types.clone()),
            (Precision::Nano, true, vec![101])
        );
        assert_eq!((out[0].1, out[0].2), (1700000000, 123456789));
        assert_eq!(out[0].4, ip());
    }

    #[test]
    fn pcapng_two_interfaces_spb_big_endian_section() {
        let a = pcapng(
            &[
                NgIface {
                    link: 1,
                    tsresol: None,
                    snap: 0,
                },
                NgIface {
                    link: 113,
                    tsresol: Some(9),
                    snap: 0,
                },
            ],
            &[
                Rec::t(1700000000.5, wrap(1, &ip(), None)).on(0),
                Rec::ns(1700000000, 987654321, wrap(113, &ip(), None)).on(1),
                Rec {
                    spb: true,
                    ..Rec::t(0.0, wrap(1, &ip(), None))
                },
            ],
            false,
        );
        let b = pcapng(
            &[NgIface {
                link: 276,
                tsresol: None,
                snap: 0,
            }],
            &[Rec::t(1700000002.000002, wrap(276, &ip(), None))],
            true,
        );
        let mut ab = a;
        ab.extend(b);
        let (info, out) = all(ab);
        assert_eq!(info.format, Format::Pcapng);
        assert_eq!(info.interfaces, 3);
        assert_eq!(info.precision, Precision::Mixed);
        let got: Vec<_> = out.iter().map(|p| (p.0, p.3, p.1, p.2)).collect();
        assert_eq!(
            got,
            vec![
                (0, 1, 1700000000, 500000000),
                (1, 113, 1700000000, 987654321),
                (0, 1, i64::MIN, 0),
                (2, 276, 1700000002, 2000)
            ]
        );
    }

    #[test]
    fn truncated_unknown_gzip() {
        let b = pcap(
            &[
                Rec::t(1.0, wrap(1, &ip(), None)),
                Rec::t(2.0, wrap(1, &ip(), None)),
            ],
            1,
            false,
            false,
        );
        let (info, out) = all(b[..b.len() - 5].to_vec());
        assert_eq!((info.truncated_file, out.len()), (true, 1));
        assert!(matches!(
            Capture::from_bytes(vec![1, 2, 3, 4, 5]),
            Err(CaptureError::Unknown)
        ));
        assert!(matches!(
            Capture::from_bytes(vec![0x1f, 0x8b, 8, 0]),
            Err(CaptureError::Gzip)
        ));
        assert!(matches!(
            Capture::from_bytes(vec![1, 2]),
            Err(CaptureError::Empty)
        ));
    }

    #[test]
    fn if_tsoffset_and_binary_resolution() {
        // if_tsresol 0x80|10 (2^-10 초)·if_tsoffset 100
        let mut v = Vec::new();
        let sh = {
            let mut b = Vec::new();
            b.extend_from_slice(&0x1a2b3c4du32.to_le_bytes());
            b.extend_from_slice(&[1, 0, 0, 0]);
            b.extend_from_slice(&(-1i64).to_le_bytes());
            b
        };
        block(&mut v, 0x0a0d0d0a, &sh).unwrap();
        let mut idb = vec![1, 0, 0, 0, 0, 0, 0, 0];
        option(&mut idb, 9, &[0x80 | 10]);
        option(&mut idb, 14, &100u64.to_le_bytes());
        option(&mut idb, 0, &[]);
        block(&mut v, 1, &idb).unwrap();
        let mut epb = Vec::new();
        for x in [0u32, 0, 2048, 0, 0] {
            epb.extend_from_slice(&x.to_le_bytes());
        }
        block(&mut v, 6, &epb).unwrap(); // 2048 / 1024 = 2 초
        let (_, out) = all(v);
        assert_eq!((out[0].1, out[0].2), (102, 0));
    }

    #[test]
    fn write_then_read_roundtrip_and_structure() {
        let src = pcapng(
            &[
                NgIface {
                    link: 1,
                    tsresol: None,
                    snap: 0,
                },
                NgIface {
                    link: 113,
                    tsresol: Some(9),
                    snap: 0,
                },
            ],
            &[
                Rec::t(1700000000.5, wrap(1, &ip(), None)).on(0),
                Rec::ns(1700000001, 5, wrap(113, &ip(), None)).on(1),
                Rec::t(1700000002.0, wrap(1, &ip(), None)).on(0),
            ],
            false,
        );
        let c = Capture::from_bytes(src).unwrap();
        let out = c.write_pcapng(Vec::new(), &[0, 1, 2]).unwrap();
        // 블록 구조: 앞뒤 길이가 같고 4의 배수, SHB 로 시작
        let mut i = 0;
        let mut n = 0;
        while i < out.len() {
            let len = u32le(&out, i + 4) as usize;
            assert_eq!(len % 4, 0);
            assert_eq!(u32le(&out, i + len - 4) as usize, len);
            i += len;
            n += 1;
        }
        assert_eq!((i, n), (out.len(), 1 + 2 + 3));
        assert_eq!(u32le(&out, 0), 0x0a0d0d0a);
        let d = Capture::from_bytes(out).unwrap();
        assert_eq!(d.info.interfaces, 2);
        assert_eq!(d.info.precision, Precision::Nano);
        for (a, b) in c.packets.iter().zip(&d.packets) {
            assert_eq!(c.data(a), d.data(b));
            assert_eq!((a.ts_ns, a.link, a.origlen), (b.ts_ns, b.link, b.origlen));
        }
        // 일부만 내보내기
        let part = c.write_pcapng(Vec::new(), &[1]).unwrap();
        let p = Capture::from_bytes(part).unwrap();
        assert_eq!((p.len(), p.info.interfaces, p.packets[0].link), (1, 1, 113));
    }
}
