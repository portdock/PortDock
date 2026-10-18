//! Wake-on-LAN — 매직 패킷(FF×6 + MAC×16, 102바이트)을 고른 랜카드에서 UDP 브로드캐스트로.

use portdock_core::tr;
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};

pub fn magic_packet(mac: &[u8; 6]) -> [u8; 102] {
    let mut p = [0xFFu8; 102];
    for c in p[6..].chunks_mut(6) {
        c.copy_from_slice(mac);
    }
    p
}

/// 보낸 곳들(«192.168.0.255:9» 등)을 돌려준다. src 가 있으면 그 랜카드 주소에 묶어 그 랜카드로만 나간다
pub fn send(mac: &[u8; 6], src: Option<Ipv4Addr>, directed: Option<Ipv4Addr>) -> Result<Vec<String>, String> {
    let bind = SocketAddrV4::new(src.unwrap_or(Ipv4Addr::UNSPECIFIED), 0);
    let sock = UdpSocket::bind(bind).map_err(|e| portdock_core::oserr::net(&e))?;
    sock.set_broadcast(true).map_err(|e| portdock_core::oserr::net(&e))?;
    let pkt = magic_packet(mac);
    let mut targets: Vec<Ipv4Addr> = directed.into_iter().collect();
    targets.push(Ipv4Addr::BROADCAST);
    let mut sent = Vec::new();
    let mut last_err = None;
    for t in targets {
        // 9(discard)가 흔하고, 7(echo)만 듣는 장비도 있다
        for port in [9u16, 7] {
            let to = SocketAddrV4::new(t, port);
            match sock.send_to(&pkt, to) {
                Ok(_) => sent.push(to.to_string()),
                Err(e) => last_err = Some(portdock_core::oserr::net(&e)),
            }
        }
    }
    if sent.is_empty() {
        return Err(last_err.unwrap_or_else(|| tr!("보내지 못했습니다", "Could not send").into()));
    }
    Ok(sent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn magic_packet_layout() {
        let mac = [0x00, 0x1B, 0x1B, 0x12, 0x34, 0x56];
        let p = magic_packet(&mac);
        assert_eq!(p.len(), 102);
        assert_eq!(&p[..6], &[0xFF; 6]);
        for i in 0..16 {
            assert_eq!(&p[6 + i * 6..12 + i * 6], &mac, "반복 {i}");
        }
        assert_eq!(&p[96..], &mac);
    }
}
