//! (0.11.0) 방송으로 산업 장비 찾기 — 사용자가 «방송으로 찾기» 를 누를 때만, 고른 랜카드의 방송 주소로 요청을 보내고 답을 모은다.
//! - EtherNet/IP «ListIdentity»(UDP 44818, 캡슐화 명령 0x0063) — 장비가 CIP Identity 항목(벤더 ID·장비 종류·제품 코드·버전·제품 이름)으로 답한다.
//!   근거: ODVA «The CIP Networks Library Vol. 2 (EtherNet/IP)» 2-3 캡슐화 머리(24바이트, 리틀 엔디언)·2-4.2.3 ListIdentity 응답 항목(형식 코드 0x0C).
//! - BACnet/IP «Who-Is»(UDP 47808) — 장치가 «I-Am»(장치 인스턴스·최대 APDU·분할·벤더 ID)으로 답한다.
//!   근거: ASHRAE 135 부록 J(BVLC 머리 0x81)·6장(NPDU)·16.10(Who-Is/I-Am)·20.2(응용 태그 부호화).
//!
//! 읽기 요청만 보낸다(장비 설정을 바꾸지 않는다). 관리자 권한 없이. 일련번호는 풀기만 하고 화면·내보내기로 넘기지 않는다.

use portdock_core::tr;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4, UdpSocket};
use std::time::{Duration, Instant};

pub const ENIP_PORT: u16 = 44818;
pub const BACNET_PORT: u16 = 47808;

// ---------------------------------------------------------------- EtherNet/IP

/// ListIdentity 요청 — 캡슐화 머리 24바이트만(명령 0x0063, 길이 0, 세션 0, 상태 0, 보낸 쪽 문맥 «PortDock», 옵션 0)
pub fn enip_request() -> [u8; 24] {
    let mut r = [0u8; 24];
    r[0..2].copy_from_slice(&0x0063u16.to_le_bytes());
    r[12..20].copy_from_slice(b"PortDock");
    r
}

/// ListIdentity 응답의 CIP Identity 항목을 푼 것
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnipIdentity {
    pub version: u16,
    /// 장비가 알린 자기 주소(소켓 주소 칸, 빅 엔디언)
    pub addr: Ipv4Addr,
    pub vendor_id: u16,
    pub device_type: u16,
    pub product_code: u16,
    pub rev_major: u8,
    pub rev_minor: u8,
    pub status: u16,
    /// 풀기만 한다 — 화면·CSV·AI 복사로 넘기지 않는다
    pub serial: u32,
    pub product_name: String,
    pub state: Option<u8>,
}

fn le16(b: &[u8], i: usize) -> u16 {
    u16::from_le_bytes([b[i], b[i + 1]])
}

/// 응답 프레임 → Identity. 명령·상태·길이·항목이 맞지 않으면 이유
pub fn parse_enip(b: &[u8]) -> Result<EnipIdentity, &'static str> {
    if b.len() < 24 {
        return Err("short");
    }
    if le16(b, 0) != 0x0063 {
        return Err("command");
    }
    let len = usize::from(le16(b, 2));
    if u32::from_le_bytes([b[8], b[9], b[10], b[11]]) != 0 {
        return Err("status");
    }
    if b.len() < 24 + len || len < 2 {
        return Err("length");
    }
    let d = &b[24..24 + len];
    let count = usize::from(le16(d, 0));
    let mut i = 2;
    for _ in 0..count {
        if i + 4 > d.len() {
            return Err("item");
        }
        let (ty, n) = (le16(d, i), usize::from(le16(d, i + 2)));
        let body = d.get(i + 4..i + 4 + n).ok_or("item")?;
        if ty == 0x000C {
            return identity_item(body);
        }
        i += 4 + n;
    }
    Err("no identity")
}

fn identity_item(x: &[u8]) -> Result<EnipIdentity, &'static str> {
    // 버전 2 + 소켓 주소 16 + 벤더 2 + 종류 2 + 제품 코드 2 + 버전 2 + 상태 2 + 일련번호 4 + 이름 길이 1
    if x.len() < 33 {
        return Err("identity");
    }
    let name_len = usize::from(x[32]);
    let name = x.get(33..33 + name_len).ok_or("name")?;
    Ok(EnipIdentity {
        version: le16(x, 0),
        addr: Ipv4Addr::new(x[6], x[7], x[8], x[9]),
        vendor_id: le16(x, 18),
        device_type: le16(x, 20),
        product_code: le16(x, 22),
        rev_major: x[24],
        rev_minor: x[25],
        status: le16(x, 26),
        serial: u32::from_le_bytes([x[28], x[29], x[30], x[31]]),
        product_name: String::from_utf8_lossy(name).trim_matches(|c: char| c == '\0' || c.is_whitespace()).to_string(),
        state: x.get(33 + name_len).copied(),
    })
}

/// 화면으로 넘기는 것 — 일련번호는 넣지 않는다
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EnipDevice {
    /// 답이 온 주소
    pub ip: String,
    /// 장비가 알린 주소가 답이 온 주소와 다르면(0.0.0.0 빼고)
    pub addr: Option<String>,
    pub vendor_id: u16,
    pub device_type: u16,
    pub product_code: u16,
    pub revision: String,
    pub product_name: String,
    pub status: u16,
    pub state: Option<u8>,
}

impl EnipDevice {
    pub fn from_identity(from: Ipv4Addr, id: &EnipIdentity) -> Self {
        EnipDevice {
            ip: from.to_string(),
            addr: (id.addr != from && !id.addr.is_unspecified()).then(|| id.addr.to_string()),
            vendor_id: id.vendor_id,
            device_type: id.device_type,
            product_code: id.product_code,
            revision: format!("{}.{:03}", id.rev_major, id.rev_minor),
            product_name: id.product_name.clone(),
            status: id.status,
            state: id.state,
        }
    }
}

// ---------------------------------------------------------------- BACnet/IP

/// Who-Is(범위 없음 — 모든 장치) — BVLC Original-Broadcast-NPDU + NPDU(이 망만, 응답 기대 없음) + APDU(비확인 요청, 서비스 8)
pub fn bacnet_request() -> [u8; 8] {
    [0x81, 0x0B, 0x00, 0x08, 0x01, 0x00, 0x10, 0x08]
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IAm {
    /// Forwarded-NPDU 면 원래 보낸 장치의 B/IP 주소
    pub forwarded: Option<SocketAddrV4>,
    /// 라우터 뒤 장치면 원래 망 번호(SNET)·주소(SADR)
    pub snet: Option<u16>,
    pub sadr: Vec<u8>,
    pub instance: u32,
    pub max_apdu: u32,
    pub segmentation: u8,
    pub vendor_id: u32,
}

/// 응용 태그 하나 — (태그 번호, 값 바이트). 문맥 태그·확장 길이(5 이상)는 I-Am 에 없어 틀린 것으로 본다
fn app_tag(b: &[u8], i: &mut usize) -> Result<(u8, u32), &'static str> {
    let t = *b.get(*i).ok_or("tag")?;
    let (num, ctx, len) = (t >> 4, t & 0x08 != 0, usize::from(t & 0x07));
    if ctx || num == 0x0F || len == 0 || len > 4 {
        return Err("tag");
    }
    let v = b.get(*i + 1..*i + 1 + len).ok_or("tag")?;
    *i += 1 + len;
    Ok((num, v.iter().fold(0u32, |a, x| (a << 8) | u32::from(*x))))
}

/// BVLC 프레임 → I-Am. I-Am 이 아니면(우리가 보낸 Who-Is 가 되돌아온 것 등) 이유
pub fn parse_iam(b: &[u8]) -> Result<IAm, &'static str> {
    if b.len() < 4 || b[0] != 0x81 {
        return Err("bvlc");
    }
    let total = usize::from(u16::from_be_bytes([b[2], b[3]]));
    if total < 4 || total > b.len() {
        return Err("length");
    }
    let b = &b[..total];
    let (mut i, forwarded) = match b[1] {
        0x0A | 0x0B => (4, None),
        // Forwarded-NPDU — 원래 보낸 곳 IP 4 + 포트 2
        0x04 if b.len() >= 10 => (10, Some(SocketAddrV4::new(Ipv4Addr::new(b[4], b[5], b[6], b[7]), u16::from_be_bytes([b[8], b[9]])))),
        _ => return Err("function"),
    };
    // NPDU
    if b.get(i) != Some(&0x01) {
        return Err("npdu");
    }
    let ctl = *b.get(i + 1).ok_or("npdu")?;
    i += 2;
    if ctl & 0x80 != 0 {
        return Err("network message");
    }
    let need = |i: usize, n: usize| if i + n <= b.len() { Ok(()) } else { Err("npdu") };
    if ctl & 0x20 != 0 {
        need(i, 3)?;
        let dlen = usize::from(b[i + 2]);
        i += 3 + dlen;
    }
    let (mut snet, mut sadr) = (None, Vec::new());
    if ctl & 0x08 != 0 {
        need(i, 3)?;
        snet = Some(u16::from_be_bytes([b[i], b[i + 1]]));
        let slen = usize::from(b[i + 2]);
        need(i + 3, slen)?;
        sadr = b[i + 3..i + 3 + slen].to_vec();
        i += 3 + slen;
    }
    if ctl & 0x20 != 0 {
        i += 1; // 홉 수
    }
    // APDU: 비확인 요청(0x10) · I-Am(0)
    if b.get(i) != Some(&0x10) || b.get(i + 1) != Some(&0x00) {
        return Err("not i-am");
    }
    i += 2;
    let (t, oid) = app_tag(b, &mut i)?;
    if t != 12 || oid >> 22 != 8 {
        return Err("object id");
    }
    let (t, max_apdu) = app_tag(b, &mut i)?;
    if t != 2 {
        return Err("max apdu");
    }
    let (t, seg) = app_tag(b, &mut i)?;
    if t != 9 {
        return Err("segmentation");
    }
    let (t, vendor) = app_tag(b, &mut i)?;
    if t != 2 {
        return Err("vendor");
    }
    Ok(IAm { forwarded, snet, sadr, instance: oid & 0x3F_FFFF, max_apdu, segmentation: seg as u8, vendor_id: vendor })
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BacnetDevice {
    /// 장치의 B/IP 주소(Forwarded-NPDU 면 원래 주소, 아니면 답이 온 주소)
    pub ip: String,
    pub port: u16,
    pub instance: u32,
    pub vendor_id: u32,
    pub max_apdu: u32,
    /// 0 양방향 · 1 보내기만 · 2 받기만 · 3 없음
    pub segmentation: u8,
    /// 라우터 뒤 장치면 망 번호
    pub network: Option<u16>,
    /// 라우터 뒤 장치면 그 망의 주소(16진)
    pub mac: Option<String>,
}

impl BacnetDevice {
    pub fn from_iam(from: SocketAddrV4, a: &IAm) -> Self {
        let src = a.forwarded.unwrap_or(from);
        BacnetDevice {
            ip: src.ip().to_string(),
            port: src.port(),
            instance: a.instance,
            vendor_id: a.vendor_id,
            max_apdu: a.max_apdu,
            segmentation: a.segmentation,
            network: a.snet,
            mac: (!a.sadr.is_empty()).then(|| a.sadr.iter().map(|x| format!("{x:02X}")).collect::<Vec<_>>().join(":")),
        }
    }
}

// ---------------------------------------------------------------- 보내고 모으기

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverConfig {
    pub nic_ip: String,
    pub prefix: u8,
    pub enip: bool,
    pub bacnet: bool,
    pub wait_ms: u32,
    pub tries: u8,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverResult {
    pub enip: Vec<EnipDevice>,
    pub bacnet: Vec<BacnetDevice>,
    /// 보낸 곳(«192.168.0.255:44818»)
    pub sent: Vec<String>,
    /// 한쪽만 실패했을 때 등 알릴 것
    pub notes: Vec<String>,
}

pub const WAIT_MIN: u32 = 300;
pub const WAIT_MAX: u32 = 10_000;

/// 처음에 보내고, 기다리는 동안 tries 번까지 고르게 다시 보내며 답을 받는다(답 하나마다 on)
fn collect(sock: &UdpSocket, to: SocketAddrV4, req: &[u8], wait: Duration, tries: u8, mut on: impl FnMut(&[u8], SocketAddr)) -> Result<(), String> {
    let start = Instant::now();
    let tries = u32::from(tries.clamp(1, 3));
    let gap = (wait / tries).min(Duration::from_millis(500));
    let mut sent = 0u32;
    let mut sent_ok = 0u32;
    let mut buf = [0u8; 1500];
    let mut last_err = None;
    loop {
        let el = start.elapsed();
        if el >= wait {
            break;
        }
        if sent < tries && el >= gap * sent {
            match sock.send_to(req, to) {
                Ok(_) => sent_ok += 1,
                Err(e) => last_err = Some(portdock_core::oserr::net(&e)),
            }
            sent += 1;
        }
        let next_send = if sent < tries { gap * sent } else { wait };
        let until = next_send.min(wait).saturating_sub(start.elapsed()).max(Duration::from_millis(5));
        sock.set_read_timeout(Some(until)).ok();
        match sock.recv_from(&mut buf) {
            Ok((n, from)) => on(&buf[..n], from),
            Err(e) if matches!(e.kind(), std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut) => {}
            // 윈도우: 앞서 보낸 것에 «포트 닿지 않음» 이 오면 recv 가 WSAECONNRESET — 무시하고 계속 받는다
            Err(e) if e.kind() == std::io::ErrorKind::ConnectionReset => {}
            Err(e) => return Err(portdock_core::oserr::net(&e)),
        }
    }
    // 한 번도 보내지 못했으면 오류(방화벽·랜카드 꺼짐 등)
    match last_err {
        Some(e) if sent_ok == 0 => Err(e),
        _ => Ok(()),
    }
}

fn bind(src: Ipv4Addr, port: u16) -> std::io::Result<UdpSocket> {
    let s = UdpSocket::bind(SocketAddrV4::new(src, port))?;
    s.set_broadcast(true)?;
    Ok(s)
}

fn ipv4(a: SocketAddr) -> Option<SocketAddrV4> {
    match a {
        SocketAddr::V4(v) => Some(v),
        SocketAddr::V6(_) => None,
    }
}

fn enip_run(src: Ipv4Addr, bcast: Ipv4Addr, wait: Duration, tries: u8) -> Result<Vec<EnipDevice>, String> {
    let sock = bind(src, 0).map_err(|e| portdock_core::oserr::net(&e))?;
    let mut found = BTreeMap::new();
    collect(&sock, SocketAddrV4::new(bcast, ENIP_PORT), &enip_request(), wait, tries, |b, from| {
        if let (Some(f), Ok(id)) = (ipv4(from), parse_enip(b)) {
            found.entry(u32::from(*f.ip())).or_insert_with(|| EnipDevice::from_identity(*f.ip(), &id));
        }
    })?;
    Ok(found.into_values().collect())
}

/// BACnet 은 I-Am 을 47808 로 방송하는 장치가 많아 47808 에 묶는다. 다른 프로그램이 쓰고 있으면 임시 포트로(직접 답만 받음)
fn bacnet_run(src: Ipv4Addr, bcast: Ipv4Addr, wait: Duration, tries: u8, notes: &mut Vec<String>) -> Result<Vec<BacnetDevice>, String> {
    let sock = match bind(src, BACNET_PORT) {
        Ok(s) => s,
        Err(_) => {
            notes.push(
                tr!(
                    "BACnet: 이 PC 의 47808 을 다른 프로그램이 쓰고 있어 임시 포트로 보냈습니다 — 방송으로 답하는 장치(I-Am 방송)는 보이지 않을 수 있습니다",
                    "BACnet: port 47808 on this PC is in use by another program, so a temporary port was used — devices that answer by broadcast (I-Am broadcast) may not appear"
                )
                .to_string(),
            );
            bind(src, 0).map_err(|e| portdock_core::oserr::net(&e))?
        }
    };
    let mut found = BTreeMap::new();
    collect(&sock, SocketAddrV4::new(bcast, BACNET_PORT), &bacnet_request(), wait, tries, |b, from| {
        if let (Some(f), Ok(a)) = (ipv4(from), parse_iam(b)) {
            let d = BacnetDevice::from_iam(f, &a);
            found.entry((u32::from(d.ip.parse::<Ipv4Addr>().unwrap_or(Ipv4Addr::UNSPECIFIED)), d.instance)).or_insert(d);
        }
    })?;
    Ok(found.into_values().collect())
}

pub fn discover(cfg: &DiscoverConfig) -> Result<DiscoverResult, String> {
    let src: Ipv4Addr = cfg.nic_ip.trim().parse().map_err(|_| format!("{}: «{}»", tr!("IP 주소가 아닙니다", "Not an IP address"), cfg.nic_ip.trim()))?;
    if !cfg.enip && !cfg.bacnet {
        return Err(tr!("EtherNet/IP 와 BACnet 가운데 하나는 켜야 합니다", "Turn on EtherNet/IP or BACnet (at least one)").into());
    }
    if cfg.prefix > 30 || src.is_unspecified() || src.is_loopback() {
        return Err(tr!("이 랜카드 대역에는 방송 주소가 없습니다 — 다른 랜카드를 고르세요", "This adapter's subnet has no broadcast address — choose another adapter").into());
    }
    let bcast = crate::range::broadcast_of(src, cfg.prefix);
    let wait = Duration::from_millis(u64::from(cfg.wait_ms.clamp(WAIT_MIN, WAIT_MAX)));
    let tries = cfg.tries.clamp(1, 3);
    let mut out = DiscoverResult::default();
    let mut errs = Vec::new();
    std::thread::scope(|s| {
        let e = cfg.enip.then(|| s.spawn(move || enip_run(src, bcast, wait, tries)));
        let b = cfg.bacnet.then(|| {
            s.spawn(move || {
                let mut notes = Vec::new();
                let r = bacnet_run(src, bcast, wait, tries, &mut notes);
                (r, notes)
            })
        });
        if let Some(h) = e {
            out.sent.push(format!("{bcast}:{ENIP_PORT}"));
            match h.join() {
                Ok(Ok(v)) => out.enip = v,
                Ok(Err(m)) => errs.push(format!("EtherNet/IP: {m}")),
                Err(_) => errs.push("EtherNet/IP: ?".into()),
            }
        }
        if let Some(h) = b {
            out.sent.push(format!("{bcast}:{BACNET_PORT}"));
            match h.join() {
                Ok((r, notes)) => {
                    out.notes.extend(notes);
                    match r {
                        Ok(v) => out.bacnet = v,
                        Err(m) => errs.push(format!("BACnet: {m}")),
                    }
                }
                Err(_) => errs.push("BACnet: ?".into()),
            }
        }
    });
    let asked = usize::from(cfg.enip) + usize::from(cfg.bacnet);
    if errs.len() == asked {
        return Err(errs.join(" · "));
    }
    out.notes.extend(errs);
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enip_request_bytes() {
        let r = enip_request();
        assert_eq!(&r[..4], &[0x63, 0x00, 0x00, 0x00]);
        assert_eq!(&r[4..12], &[0; 8]);
        assert_eq!(&r[12..20], b"PortDock");
        assert_eq!(&r[20..], &[0; 4]);
    }

    /// 규격대로 만든 ListIdentity 응답 — 항목 하나(0x0C)
    fn enip_reply(name: &str, state: Option<u8>, extra_items: &[(u16, &[u8])]) -> Vec<u8> {
        let mut item = Vec::new();
        item.extend_from_slice(&1u16.to_le_bytes()); // 캡슐화 버전 1
        item.extend_from_slice(&2u16.to_be_bytes()); // sin_family AF_INET
        item.extend_from_slice(&44818u16.to_be_bytes());
        item.extend_from_slice(&[192, 168, 0, 20]);
        item.extend_from_slice(&[0; 8]);
        item.extend_from_slice(&1u16.to_le_bytes()); // 벤더 1
        item.extend_from_slice(&0x0Eu16.to_le_bytes()); // 종류 14
        item.extend_from_slice(&0x0037u16.to_le_bytes()); // 제품 코드 55
        item.extend_from_slice(&[20, 11]); // 버전 20.011
        item.extend_from_slice(&0x0030u16.to_le_bytes()); // 상태
        item.extend_from_slice(&0x12345678u32.to_le_bytes()); // 일련번호
        item.push(name.len() as u8);
        item.extend_from_slice(name.as_bytes());
        if let Some(s) = state {
            item.push(s);
        }
        let mut data = Vec::new();
        data.extend_from_slice(&((1 + extra_items.len()) as u16).to_le_bytes());
        for (ty, body) in extra_items {
            data.extend_from_slice(&ty.to_le_bytes());
            data.extend_from_slice(&(body.len() as u16).to_le_bytes());
            data.extend_from_slice(body);
        }
        data.extend_from_slice(&0x000Cu16.to_le_bytes());
        data.extend_from_slice(&(item.len() as u16).to_le_bytes());
        data.extend(item);
        let mut out = vec![0x63, 0x00];
        out.extend_from_slice(&(data.len() as u16).to_le_bytes());
        out.extend_from_slice(&[0; 8]); // 세션·상태
        out.extend_from_slice(b"PortDock");
        out.extend_from_slice(&[0; 4]);
        out.extend(data);
        out
    }

    #[test]
    fn parse_enip_identity() {
        let id = parse_enip(&enip_reply("1756-EN2T/D", Some(3), &[])).unwrap();
        assert_eq!(id.version, 1);
        assert_eq!(id.addr, Ipv4Addr::new(192, 168, 0, 20));
        assert_eq!((id.vendor_id, id.device_type, id.product_code), (1, 14, 55));
        assert_eq!((id.rev_major, id.rev_minor, id.status), (20, 11, 0x30));
        assert_eq!(id.serial, 0x12345678);
        assert_eq!(id.product_name, "1756-EN2T/D");
        assert_eq!(id.state, Some(3));
        // 상태 바이트가 없어도, 앞에 다른 항목이 있어도 푼다
        let id = parse_enip(&enip_reply("X\0", None, &[(0x0086, &[1, 2, 3])])).unwrap();
        assert_eq!((id.product_name.as_str(), id.state), ("X", None));
    }

    #[test]
    fn enip_device_hides_serial() {
        let id = parse_enip(&enip_reply("ABC", Some(3), &[])).unwrap();
        let d = EnipDevice::from_identity(Ipv4Addr::new(192, 168, 0, 20), &id);
        assert_eq!(d.addr, None);
        assert_eq!(d.revision, "20.011");
        let json = serde_json::to_string(&d).unwrap();
        assert!(!json.contains("serial") && !json.contains(&0x12345678u32.to_string()), "{json}");
        // 장비가 알린 주소가 다르면 따로 보인다
        let d = EnipDevice::from_identity(Ipv4Addr::new(10, 0, 0, 5), &id);
        assert_eq!(d.addr.as_deref(), Some("192.168.0.20"));
    }

    #[test]
    fn parse_enip_errors() {
        let ok = enip_reply("ABC", Some(3), &[]);
        assert_eq!(parse_enip(&ok[..20]), Err("short"));
        let mut r = ok.clone();
        r[0] = 0x64;
        assert_eq!(parse_enip(&r), Err("command"));
        let mut r = ok.clone();
        r[8] = 1;
        assert_eq!(parse_enip(&r), Err("status"));
        assert_eq!(parse_enip(&ok[..ok.len() - 1]), Err("length"));
        // 이름 길이가 항목 밖
        let mut r = ok.clone();
        let at = 24 + 2 + 4 + 32;
        r[at] = 200;
        assert_eq!(parse_enip(&r), Err("name"));
        // 우리가 보낸 요청(길이 0)이 되돌아온 것
        assert_eq!(parse_enip(&enip_request()), Err("length"));
    }

    #[test]
    fn bacnet_who_is_bytes() {
        let r = bacnet_request();
        assert_eq!(usize::from(u16::from_be_bytes([r[2], r[3]])), r.len());
        assert_eq!(r, [0x81, 0x0B, 0x00, 0x08, 0x01, 0x00, 0x10, 0x08]);
        // 우리 Who-Is 가 되돌아와도 I-Am 이 아니다
        assert_eq!(parse_iam(&r), Err("not i-am"));
    }

    /// I-Am APDU — 장치 1234, 최대 APDU 1476, 분할 없음(3), 벤더 260
    const IAM_APDU: [u8; 15] = [0x10, 0x00, 0xC4, 0x02, 0x00, 0x04, 0xD2, 0x22, 0x05, 0xC4, 0x91, 0x03, 0x22, 0x01, 0x04];

    fn bvlc(func: u8, extra: &[u8], npdu: &[u8]) -> Vec<u8> {
        let mut out = vec![0x81, func, 0, 0];
        out.extend_from_slice(extra);
        out.extend_from_slice(npdu);
        out.extend_from_slice(&IAM_APDU);
        let n = out.len() as u16;
        out[2..4].copy_from_slice(&n.to_be_bytes());
        out
    }

    #[test]
    fn parse_iam_plain() {
        let a = parse_iam(&bvlc(0x0B, &[], &[0x01, 0x00])).unwrap();
        assert_eq!((a.instance, a.max_apdu, a.segmentation, a.vendor_id), (1234, 1476, 3, 260));
        assert_eq!((a.forwarded, a.snet), (None, None));
        let d = BacnetDevice::from_iam(SocketAddrV4::new(Ipv4Addr::new(192, 168, 0, 30), 47808), &a);
        assert_eq!((d.ip.as_str(), d.port, d.network, d.mac), ("192.168.0.30", 47808, None, None));
        // 1바이트 벤더·큰 인스턴스(최대 4194303)
        let mut f = bvlc(0x0A, &[], &[0x01, 0x00]);
        let n = f.len();
        f[n - 3] = 0x21;
        f[n - 2] = 0x07;
        f.truncate(n - 1);
        let len = f.len() as u16;
        f[2..4].copy_from_slice(&len.to_be_bytes());
        f[9..13].copy_from_slice(&((8u32 << 22) | 0x3F_FFFF).to_be_bytes());
        let a = parse_iam(&f).unwrap();
        assert_eq!((a.instance, a.vendor_id), (0x3F_FFFF, 7));
    }

    #[test]
    fn parse_iam_routed_and_forwarded() {
        // 라우터 뒤 MS/TP 장치: SNET 5, SLEN 1, SADR 0x17 + DNET 0xFFFF 방송(홉 수)
        let npdu = [0x01, 0x28, 0xFF, 0xFF, 0x00, 0x00, 0x05, 0x01, 0x17, 0xFF];
        let a = parse_iam(&bvlc(0x0B, &[], &npdu)).unwrap();
        assert_eq!((a.snet, a.sadr.as_slice(), a.instance), (Some(5), &[0x17u8][..], 1234));
        let d = BacnetDevice::from_iam(SocketAddrV4::new(Ipv4Addr::new(192, 168, 0, 1), 47808), &a);
        assert_eq!((d.network, d.mac.as_deref()), (Some(5), Some("17")));
        // Forwarded-NPDU(BBMD) — 원래 주소 10.0.0.9:47808
        let a = parse_iam(&bvlc(0x04, &[10, 0, 0, 9, 0xBA, 0xC0], &[0x01, 0x00])).unwrap();
        let d = BacnetDevice::from_iam(SocketAddrV4::new(Ipv4Addr::new(192, 168, 0, 1), 47808), &a);
        assert_eq!((d.ip.as_str(), d.port), ("10.0.0.9", 47808));
    }

    #[test]
    fn parse_iam_errors() {
        let ok = bvlc(0x0B, &[], &[0x01, 0x00]);
        let mut r = ok.clone();
        r[0] = 0x82;
        assert_eq!(parse_iam(&r), Err("bvlc"));
        assert_eq!(parse_iam(&ok[..ok.len() - 1]), Err("length"));
        let mut r = ok.clone();
        r[1] = 0x05;
        assert_eq!(parse_iam(&r), Err("function"));
        // 망 계층 메시지
        let mut r = ok.clone();
        r[5] = 0x80;
        assert_eq!(parse_iam(&r), Err("network message"));
        // 장치가 아닌 객체 식별자(아날로그 입력 0)
        let mut r = ok.clone();
        r[9..13].copy_from_slice(&0u32.to_be_bytes());
        assert_eq!(parse_iam(&r), Err("object id"));
        // 다른 서비스(Who-Has 7)
        let mut r = ok.clone();
        r[7] = 0x07;
        assert_eq!(parse_iam(&r), Err("not i-am"));
    }

    #[test]
    fn discover_rejects_bad_config() {
        let c = |nic: &str, prefix, enip, bacnet| DiscoverConfig { nic_ip: nic.into(), prefix, enip, bacnet, wait_ms: 300, tries: 1 };
        assert!(discover(&c("x", 24, true, true)).is_err());
        assert!(discover(&c("192.168.0.5", 24, false, false)).is_err());
        assert!(discover(&c("192.168.0.5", 31, true, false)).is_err());
        assert!(discover(&c("127.0.0.1", 8, true, false)).is_err());
    }

    /// 이 PC 안에서 실제로 주고받기 — 127.0.0.1 에 묶은 가짜 장비에 보내는 collect(방송 대신 루프백)
    #[test]
    fn collect_receives_reply() {
        let dev = UdpSocket::bind("127.0.0.1:0").unwrap();
        let to = ipv4(dev.local_addr().unwrap()).unwrap();
        let t = std::thread::spawn(move || {
            let mut b = [0u8; 64];
            let (n, from) = dev.recv_from(&mut b).unwrap();
            assert_eq!(&b[..n], &enip_request());
            dev.send_to(&enip_reply("SIM", Some(3), &[]), from).unwrap();
        });
        let sock = UdpSocket::bind("127.0.0.1:0").unwrap();
        let mut got = Vec::new();
        collect(&sock, to, &enip_request(), Duration::from_millis(400), 1, |b, _| got.push(parse_enip(b).unwrap().product_name)).unwrap();
        t.join().unwrap();
        assert_eq!(got, ["SIM"]);
    }
}
