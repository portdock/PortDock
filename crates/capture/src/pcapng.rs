//! pcapng 쓰기 — 이 파일은 다른 곳에 의존하지 않는다(나중에 crates/packet 으로 그대로 옮길 수 있다).
//! 구역 머리(SHB) 하나, 인터페이스 설명(IDB, 나노초 시각), 패킷(EPB, 방향 표시)만 쓴다.
//! 인터페이스는 중간에 추가해도 된다 — pcapng 는 SHB 뒤 어디서나 IDB 를 허용한다.

use std::io::{self, Write};

pub const LINKTYPE_ETHERNET: u16 = 1;
pub const LINKTYPE_RAW: u16 = 101;
pub const LINKTYPE_IEEE802_11: u16 = 105;

/// EPB 의 epb_flags 방향 비트(0=모름, 1=받음, 2=보냄)
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PacketDir {
    Unknown,
    Inbound,
    Outbound,
}

pub struct PcapngWriter<W: Write> {
    w: W,
    interfaces: u32,
    packets: u64,
}

fn pad4(n: usize) -> usize {
    (4 - n % 4) % 4
}

/// 옵션 하나(코드·길이·값·4바이트 맞춤)
fn opt(buf: &mut Vec<u8>, code: u16, val: &[u8]) {
    buf.extend_from_slice(&code.to_le_bytes());
    buf.extend_from_slice(&(val.len() as u16).to_le_bytes());
    buf.extend_from_slice(val);
    buf.extend(std::iter::repeat_n(0u8, pad4(val.len())));
}

fn end_opts(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0, 0, 0, 0]);
}

impl<W: Write> PcapngWriter<W> {
    /// 구역 머리를 쓴다. app 은 shb_userappl 옵션에 들어간다
    pub fn new(mut w: W, app: &str) -> io::Result<Self> {
        let mut body = Vec::new();
        body.extend_from_slice(&0x1A2B_3C4Du32.to_le_bytes());
        body.extend_from_slice(&1u16.to_le_bytes());
        body.extend_from_slice(&0u16.to_le_bytes());
        body.extend_from_slice(&(-1i64).to_le_bytes());
        opt(&mut body, 4, app.as_bytes());
        end_opts(&mut body);
        write_block(&mut w, 0x0A0D_0D0A, &body)?;
        Ok(Self { w, interfaces: 0, packets: 0 })
    }

    /// 인터페이스를 더하고 번호를 돌려준다. 시각 해상도는 나노초
    pub fn add_interface(&mut self, name: &str, linktype: u16) -> io::Result<u32> {
        let mut body = Vec::new();
        body.extend_from_slice(&linktype.to_le_bytes());
        body.extend_from_slice(&0u16.to_le_bytes());
        body.extend_from_slice(&0u32.to_le_bytes()); // snaplen 0 = 제한 없음
        if !name.is_empty() {
            opt(&mut body, 2, name.as_bytes());
        }
        opt(&mut body, 9, &[9]); // if_tsresol = 10^-9
        end_opts(&mut body);
        write_block(&mut self.w, 1, &body)?;
        self.interfaces += 1;
        Ok(self.interfaces - 1)
    }

    /// 패킷 하나. ts_ns 는 유닉스 시각(나노초), orig_len 이 data 보다 크면 잘린 것
    pub fn write_packet(&mut self, iface: u32, ts_ns: u64, data: &[u8], orig_len: u32, dir: PacketDir) -> io::Result<()> {
        if iface >= self.interfaces {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "없는 인터페이스 번호"));
        }
        let mut body = Vec::with_capacity(data.len() + 48);
        body.extend_from_slice(&iface.to_le_bytes());
        body.extend_from_slice(&((ts_ns >> 32) as u32).to_le_bytes());
        body.extend_from_slice(&(ts_ns as u32).to_le_bytes());
        body.extend_from_slice(&(data.len() as u32).to_le_bytes());
        body.extend_from_slice(&orig_len.max(data.len() as u32).to_le_bytes());
        body.extend_from_slice(data);
        body.extend(std::iter::repeat_n(0u8, pad4(data.len())));
        let flags: u32 = match dir {
            PacketDir::Unknown => 0,
            PacketDir::Inbound => 1,
            PacketDir::Outbound => 2,
        };
        if flags != 0 {
            opt(&mut body, 2, &flags.to_le_bytes());
            end_opts(&mut body);
        }
        write_block(&mut self.w, 6, &body)?;
        self.packets += 1;
        Ok(())
    }

    pub fn packets(&self) -> u64 {
        self.packets
    }

    pub fn flush(&mut self) -> io::Result<()> {
        self.w.flush()
    }

    pub fn into_inner(self) -> W {
        self.w
    }
}

fn write_block<W: Write>(w: &mut W, kind: u32, body: &[u8]) -> io::Result<()> {
    debug_assert!(body.len().is_multiple_of(4));
    let total = (body.len() + 12) as u32;
    w.write_all(&kind.to_le_bytes())?;
    w.write_all(&total.to_le_bytes())?;
    w.write_all(body)?;
    w.write_all(&total.to_le_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn u32at(b: &[u8], o: usize) -> u32 {
        u32::from_le_bytes(b[o..o + 4].try_into().unwrap())
    }

    /// 블록 목록(종류, 전체 길이)을 읽으며 앞뒤 길이가 같고 4의 배수인지 본다
    fn blocks(b: &[u8]) -> Vec<(u32, usize, usize)> {
        let mut v = Vec::new();
        let mut o = 0;
        while o < b.len() {
            let kind = u32at(b, o);
            let len = u32at(b, o + 4) as usize;
            assert_eq!(len % 4, 0);
            assert_eq!(u32at(b, o + len - 4) as usize, len, "앞뒤 길이");
            v.push((kind, o, len));
            o += len;
        }
        assert_eq!(o, b.len());
        v
    }

    #[test]
    fn shb_idb_epb_layout() {
        let mut w = PcapngWriter::new(Vec::new(), "PortDock Packet").unwrap();
        let eth = w.add_interface("Ethernet", LINKTYPE_ETHERNET).unwrap();
        let ip = w.add_interface("", LINKTYPE_RAW).unwrap();
        assert_eq!((eth, ip), (0, 1));
        let ts = 1_762_400_000_123_456_789u64;
        w.write_packet(eth, ts, &[1, 2, 3, 4, 5], 1500, PacketDir::Inbound).unwrap();
        w.write_packet(ip, ts + 1, &[9; 8], 8, PacketDir::Unknown).unwrap();
        assert_eq!(w.packets(), 2);
        let b = w.into_inner();
        let bl = blocks(&b);
        assert_eq!(bl.iter().map(|x| x.0).collect::<Vec<_>>(), vec![0x0A0D0D0A, 1, 1, 6, 6]);
        // SHB 매직·버전
        assert_eq!(u32at(&b, 8), 0x1A2B3C4D);
        assert_eq!(u16::from_le_bytes([b[12], b[13]]), 1);
        // 첫 EPB: 시각을 다시 합치면 원래 값, caplen 5, origlen 1500, 데이터 뒤 3바이트 맞춤
        let (_, o, _) = bl[3];
        let hi = u32at(&b, o + 12) as u64;
        let lo = u32at(&b, o + 16) as u64;
        assert_eq!((hi << 32) | lo, ts);
        assert_eq!(u32at(&b, o + 20), 5);
        assert_eq!(u32at(&b, o + 24), 1500);
        assert_eq!(&b[o + 28..o + 33], &[1, 2, 3, 4, 5]);
        assert_eq!(&b[o + 33..o + 36], &[0, 0, 0]);
        // 방향 옵션 epb_flags=1
        assert_eq!(u16::from_le_bytes([b[o + 36], b[o + 37]]), 2);
        assert_eq!(u32at(&b, o + 40), 1);
        // 둘째 EPB 는 옵션 없음: 12 + 20 + 8
        assert_eq!(bl[4].2, 12 + 20 + 8);
    }

    #[test]
    fn rejects_unknown_interface() {
        let mut w = PcapngWriter::new(Vec::new(), "x").unwrap();
        assert!(w.write_packet(0, 0, &[1], 1, PacketDir::Unknown).is_err());
    }
}
