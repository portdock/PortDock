//! 이 PC 의 네트워크 정보 — 랜카드별 IPv4 주소 목록(서버 주소·멀티캐스트 랜카드 고르기)과
//! «이 포트를 어느 프로그램이 쥐고 있나»(바인드가 «사용 중» 으로 실패했을 때 안내). 관리자 권한은 필요 없다.

use serde::Serialize;
use std::net::Ipv4Addr;

/// 랜카드의 IPv4 주소 하나(주소가 여럿인 랜카드는 여러 줄)
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Interface {
    /// 윈도우가 보여 주는 이름(예: «이더넷 2», «Wi-Fi»)
    pub name: String,
    /// 장치 설명(예: «Intel(R) Ethernet Connection»)
    pub description: String,
    pub ipv4: String,
    /// 접두사 길이(예: 24)
    pub prefix: u8,
    /// 넷마스크(예: 255.255.255.0)
    pub mask: String,
    /// 기본 게이트웨이(IPv4, 있으면)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway: Option<String>,
    /// 연결돼 있는지(케이블 꽂힘·무선 연결)
    pub up: bool,
    pub loopback: bool,
}

/// 접두사 길이 → 넷마스크
pub fn mask_of(prefix: u8) -> Ipv4Addr {
    let p = prefix.min(32) as u32;
    Ipv4Addr::from(if p == 0 { 0 } else { u32::MAX << (32 - p) })
}

/// 이 주소와 같은 서브넷의 브로드캐스트 주소(예: 192.168.0.10/24 → 192.168.0.255)
pub fn broadcast_of(ip: Ipv4Addr, prefix: u8) -> Ipv4Addr {
    let m = u32::from(mask_of(prefix));
    Ipv4Addr::from(u32::from(ip) | !m)
}

/// 랜카드 IPv4 주소들 — 연결된 것·실제 랜카드가 먼저, 루프백은 맨 뒤. 읽지 못하면 빈 목록
pub fn interfaces() -> Vec<Interface> {
    let mut v = imp::interfaces();
    v.sort_by_key(|i| (!i.up, i.loopback));
    v
}

/// 이 PC 의 주소인지(0.0.0.0·127.x 포함). 목록을 읽지 못하면 true(막지 않는다)
pub fn is_local_address(host: &str) -> bool {
    let Ok(ip) = host.trim().parse::<Ipv4Addr>() else { return true };
    if ip.is_unspecified() || ip.is_loopback() {
        return true;
    }
    let list = interfaces();
    list.is_empty() || list.iter().any(|i| i.ipv4 == ip.to_string())
}

/// «이 PC 주소: 192.168.0.10(이더넷), 10.0.0.5(Wi-Fi)» — 바인드 실패 안내용. 목록이 비면 빈 글
pub fn address_hint() -> String {
    let list: Vec<String> = interfaces().into_iter().filter(|i| i.up && !i.loopback).map(|i| format!("{} ({})", i.ipv4, i.name)).collect();
    if list.is_empty() {
        return String::new();
    }
    crate::tr!(format!("이 PC 주소: {} · 0.0.0.0 = 모든 랜카드", list.join(", ")), format!("This PC: {} · 0.0.0.0 = all adapters", list.join(", ")))
}

/// 포트를 쥔 프로그램
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortOwner {
    pub pid: u32,
    /// 실행 파일 이름(권한이 없어 못 읽으면 None)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// TCP(듣는 중) 또는 UDP 포트를 쥔 프로그램. 찾지 못하면 None
pub fn port_owner(port: u16, udp: bool) -> Option<PortOwner> {
    if port == 0 {
        return None;
    }
    imp::port_owner(port, udp)
}

/// 윈도우 자신(System, PID 4)이 쥐는 포트 — 445 파일 공유·135/139 등. 끌 수 없으니 다른 포트를 고르라고 한다
const SYSTEM_PID: u32 = 4;

/// «사용 중» 바인드 실패에 덧붙일 말 «— 쥔 프로그램: node.exe (PID 1234)»
pub fn owner_hint(port: u16, udp: bool) -> String {
    owner_text(port_owner(port, udp))
}

fn owner_text(owner: Option<PortOwner>) -> String {
    match owner {
        Some(PortOwner { pid: SYSTEM_PID, .. }) => crate::tr!(format!(" — 쥔 쪽: 윈도우 자신(System, PID {SYSTEM_PID})"), format!(" — held by Windows itself (System, PID {SYSTEM_PID})")),
        Some(PortOwner { pid, name: Some(n) }) => crate::tr!(format!(" — 쥔 프로그램: {n} (PID {pid})"), format!(" — held by {n} (PID {pid})")),
        Some(PortOwner { pid, name: None }) => crate::tr!(format!(" — 쥔 프로그램: PID {pid}"), format!(" — held by PID {pid}")),
        None => String::new(),
    }
}

/// «사용 중» 일 때 할 일 — 윈도우가 쓰는 포트(1024 밑·System)면 다른 포트, 아니면 다른 포트 또는 그 프로그램 끄기
fn in_use_action(port: u16, owner: Option<&PortOwner>) -> String {
    let alt = if port < 5000 { 5001 } else { port.saturating_add(1) };
    if owner.is_some_and(|o| o.pid == SYSTEM_PID) || (port != 0 && port < 1024) {
        crate::tr!(
            format!("윈도우·다른 서비스가 쓰는 포트입니다 — 포트를 {alt} 처럼 1024 위의 빈 번호로 바꾸세요(상대 쪽 포트도 같이)"),
            format!("Windows or another service uses this port — change the port to a free number above 1024 such as {alt} (and on the other side too)")
        )
    } else {
        crate::tr!(
            format!("포트를 {alt} 처럼 다른 번호로 바꾸거나, 그 포트를 쓰는 프로그램(다른 PortDock 창 포함)을 끄세요"),
            format!("Change the port (e.g. {alt}) or close the program using it (another PortDock window included)")
        )
    }
}

/// 바인드 오류에 안내를 덧붙인다 — «사용 중» 이면 쥔 프로그램과 할 일, «없는 주소» 면 이 PC 주소 목록. 윈도우 원문은 맨 끝 괄호
pub fn bind_error(e: &std::io::Error, addr: std::net::SocketAddr, udp: bool) -> String {
    let base = format!("{addr}: {}", crate::oserr::net(e));
    match (e.raw_os_error(), e.kind()) {
        (Some(10048), _) | (_, std::io::ErrorKind::AddrInUse) => {
            let owner = port_owner(addr.port(), udp);
            in_use_message(e, addr, owner)
        }
        (Some(10049), _) | (_, std::io::ErrorKind::AddrNotAvailable) => {
            let h = address_hint();
            if h.is_empty() { base } else { format!("{base} — {h}") }
        }
        _ => base,
    }
}

fn in_use_message(e: &std::io::Error, addr: std::net::SocketAddr, owner: Option<PortOwner>) -> String {
    let text = crate::oserr::net_text(e).unwrap_or_else(|| e.to_string());
    let action = in_use_action(addr.port(), owner.as_ref());
    format!("{addr}: {text}{} — {action} ({e})", owner_text(owner))
}

#[cfg(windows)]
mod imp {
    use super::{Interface, PortOwner, mask_of};
    use std::net::Ipv4Addr;
    use windows_sys::Win32::Foundation::{CloseHandle, ERROR_BUFFER_OVERFLOW, ERROR_INSUFFICIENT_BUFFER, NO_ERROR};
    use windows_sys::Win32::NetworkManagement::IpHelper::{
        GAA_FLAG_INCLUDE_GATEWAYS, GAA_FLAG_SKIP_ANYCAST, GAA_FLAG_SKIP_DNS_SERVER, GAA_FLAG_SKIP_MULTICAST, GetAdaptersAddresses, GetExtendedTcpTable,
        GetExtendedUdpTable, IP_ADAPTER_ADDRESSES_LH, MIB_TCP_STATE_LISTEN, MIB_TCPROW_OWNER_PID, MIB_UDPROW_OWNER_PID, TCP_TABLE_OWNER_PID_ALL, UDP_TABLE_OWNER_PID,
    };
    use windows_sys::Win32::NetworkManagement::Ndis::IfOperStatusUp;
    use windows_sys::Win32::Networking::WinSock::{AF_INET, SOCKADDR, SOCKADDR_IN};
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW};

    const IF_TYPE_SOFTWARE_LOOPBACK: u32 = 24;

    /// 넓은 글자(널 끝) → String
    unsafe fn wide(p: *const u16) -> String {
        if p.is_null() {
            return String::new();
        }
        let mut n = 0;
        // SAFETY: 윈도우가 준 널로 끝나는 문자열
        while unsafe { *p.add(n) } != 0 {
            n += 1;
        }
        String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(p, n) })
    }

    /// SOCKADDR 가 IPv4 면 그 주소
    unsafe fn v4(sa: *const SOCKADDR) -> Option<Ipv4Addr> {
        if sa.is_null() || unsafe { (*sa).sa_family } != AF_INET {
            return None;
        }
        // SAFETY: AF_INET 이면 SOCKADDR_IN 모양
        let sin = unsafe { &*(sa as *const SOCKADDR_IN) };
        Some(Ipv4Addr::from(unsafe { sin.sin_addr.S_un.S_addr }.to_ne_bytes()))
    }

    pub fn interfaces() -> Vec<Interface> {
        let flags = GAA_FLAG_INCLUDE_GATEWAYS | GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER;
        // 크기를 모르면 넉넉히(15KB 권장) 잡고, 모자라면 알려 준 크기로 다시
        let mut size: u32 = 16 * 1024;
        let mut buf: Vec<u64> = Vec::new();
        for _ in 0..4 {
            buf = vec![0u64; (size as usize).div_ceil(8)];
            // SAFETY: buf 는 size 바이트 이상, 8바이트 정렬
            let r = unsafe { GetAdaptersAddresses(AF_INET as u32, flags, std::ptr::null(), buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH, &mut size) };
            if r == NO_ERROR {
                break;
            }
            if r != ERROR_BUFFER_OVERFLOW {
                return Vec::new();
            }
        }
        let mut out = Vec::new();
        let mut p = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
        while !p.is_null() {
            // SAFETY: GetAdaptersAddresses 가 채운 연결 목록 — buf 가 살아 있는 동안 유효
            let a = unsafe { &*p };
            let name = unsafe { wide(a.FriendlyName) };
            let description = unsafe { wide(a.Description) };
            let up = a.OperStatus == IfOperStatusUp;
            let loopback = a.IfType == IF_TYPE_SOFTWARE_LOOPBACK;
            let mut gateway = None;
            let mut g = a.FirstGatewayAddress;
            while !g.is_null() && gateway.is_none() {
                let ga = unsafe { &*g };
                gateway = unsafe { v4(ga.Address.lpSockaddr) }.filter(|ip| !ip.is_unspecified()).map(|ip| ip.to_string());
                g = ga.Next;
            }
            let mut u = a.FirstUnicastAddress;
            while !u.is_null() {
                let ua = unsafe { &*u };
                if let Some(ip) = unsafe { v4(ua.Address.lpSockaddr) } {
                    let prefix = ua.OnLinkPrefixLength.min(32);
                    out.push(Interface {
                        name: name.clone(),
                        description: description.clone(),
                        ipv4: ip.to_string(),
                        prefix,
                        mask: mask_of(prefix).to_string(),
                        gateway: gateway.clone(),
                        up,
                        loopback: loopback || ip.is_loopback(),
                    });
                }
                u = ua.Next;
            }
            p = a.Next;
        }
        out
    }

    /// 표 하나 읽기 — 크기를 물어 받은 만큼 잡는다
    fn table(get: impl Fn(*mut core::ffi::c_void, &mut u32) -> u32) -> Option<Vec<u64>> {
        let mut size = 0u32;
        let r = get(std::ptr::null_mut(), &mut size);
        if r != ERROR_INSUFFICIENT_BUFFER && r != NO_ERROR {
            return None;
        }
        for _ in 0..4 {
            size += 4096; // 그 사이 늘어나도 되게
            let mut buf = vec![0u64; (size as usize).div_ceil(8)];
            match get(buf.as_mut_ptr() as *mut _, &mut size) {
                NO_ERROR => return Some(buf),
                ERROR_INSUFFICIENT_BUFFER => continue,
                _ => return None,
            }
        }
        None
    }

    fn port_of(dw: u32) -> u16 {
        u16::from_be((dw & 0xFFFF) as u16)
    }

    pub fn port_owner(port: u16, udp: bool) -> Option<PortOwner> {
        let pid = if udp {
            let buf = table(|p, s| unsafe { GetExtendedUdpTable(p, s, 0, AF_INET as u32, UDP_TABLE_OWNER_PID, 0) })?;
            // SAFETY: 머리(항목 수 u32) 다음에 MIB_UDPROW_OWNER_PID 배열
            let n = unsafe { *(buf.as_ptr() as *const u32) } as usize;
            let rows = unsafe { std::slice::from_raw_parts((buf.as_ptr() as *const u8).add(4) as *const MIB_UDPROW_OWNER_PID, n) };
            rows.iter().find(|r| port_of(r.dwLocalPort) == port).map(|r| r.dwOwningPid)?
        } else {
            let buf = table(|p, s| unsafe { GetExtendedTcpTable(p, s, 0, AF_INET as u32, TCP_TABLE_OWNER_PID_ALL, 0) })?;
            let n = unsafe { *(buf.as_ptr() as *const u32) } as usize;
            let rows = unsafe { std::slice::from_raw_parts((buf.as_ptr() as *const u8).add(4) as *const MIB_TCPROW_OWNER_PID, n) };
            // 듣는 중인 것이 먼저, 없으면 그 포트를 쓰는 아무 연결
            rows.iter()
                .find(|r| port_of(r.dwLocalPort) == port && r.dwState == MIB_TCP_STATE_LISTEN as u32)
                .or_else(|| rows.iter().find(|r| port_of(r.dwLocalPort) == port))
                .map(|r| r.dwOwningPid)?
        };
        Some(PortOwner { pid, name: process_name(pid) })
    }

    fn process_name(pid: u32) -> Option<String> {
        if pid == 0 {
            return None;
        }
        if pid == 4 {
            return Some("System".into());
        }
        // SAFETY: 열지 못하면 null — 그때는 이름 없이
        let h = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
        if h.is_null() {
            return None;
        }
        let mut buf = [0u16; 1024];
        let mut len = buf.len() as u32;
        let ok = unsafe { QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, buf.as_mut_ptr(), &mut len) } != 0;
        unsafe { CloseHandle(h) };
        if !ok {
            return None;
        }
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        Some(path.rsplit(['\\', '/']).next().unwrap_or(&path).to_string())
    }
}

#[cfg(not(windows))]
mod imp {
    use super::{Interface, PortOwner};
    pub fn interfaces() -> Vec<Interface> {
        Vec::new()
    }
    pub fn port_owner(_port: u16, _udp: bool) -> Option<PortOwner> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_and_broadcast() {
        assert_eq!(mask_of(24), Ipv4Addr::new(255, 255, 255, 0));
        assert_eq!(mask_of(0), Ipv4Addr::new(0, 0, 0, 0));
        assert_eq!(mask_of(32), Ipv4Addr::new(255, 255, 255, 255));
        assert_eq!(mask_of(20), Ipv4Addr::new(255, 255, 240, 0));
        assert_eq!(broadcast_of(Ipv4Addr::new(192, 168, 0, 10), 24), Ipv4Addr::new(192, 168, 0, 255));
        assert_eq!(broadcast_of(Ipv4Addr::new(10, 1, 2, 3), 8), Ipv4Addr::new(10, 255, 255, 255));
    }

    /// CI·가상 PC 마다 랜카드가 다르다 — 터지지 않고, 읽은 줄은 모양이 맞는지만 본다
    #[test]
    fn interfaces_smoke() {
        let list = interfaces();
        for i in &list {
            let ip: Ipv4Addr = i.ipv4.parse().expect("ipv4");
            assert!(i.prefix <= 32);
            assert_eq!(i.mask, mask_of(i.prefix).to_string());
            if ip.is_loopback() {
                assert!(i.loopback);
            }
        }
        // 정렬: 연결된 것이 먼저
        let first_down = list.iter().position(|i| !i.up).unwrap_or(list.len());
        assert!(list[first_down..].iter().all(|i| !i.up));
        assert!(is_local_address("0.0.0.0") && is_local_address("127.0.0.1") && is_local_address("not-an-ip"));
        if list.iter().any(|i| !i.loopback) {
            assert!(!is_local_address("203.0.113.77"));
        }
    }

    /// 우리가 연 포트는 우리 프로그램(이 시험 실행 파일)이 쥐고 있다고 나온다
    #[test]
    fn port_owner_finds_this_process() {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        if let Some(o) = port_owner(port, false) {
            assert_eq!(o.pid, std::process::id());
            if let Some(n) = &o.name {
                assert!(n.to_lowercase().ends_with(".exe") || !cfg!(windows), "{n}");
            }
            assert!(owner_hint(port, false).contains(&o.pid.to_string()));
        }
        let u = std::net::UdpSocket::bind("127.0.0.1:0").unwrap();
        let up = u.local_addr().unwrap().port();
        if let Some(o) = port_owner(up, true) {
            assert_eq!(o.pid, std::process::id());
        }
        assert!(port_owner(0, false).is_none());
        // 사용 중 오류 문구에 쥔 쪽이 붙는다
        let e = std::net::TcpListener::bind(("127.0.0.1", port)).err();
        if let Some(e) = e {
            let msg = bind_error(&e, format!("127.0.0.1:{port}").parse().unwrap(), false);
            assert!(msg.starts_with(&format!("127.0.0.1:{port}")), "{msg}");
        }
    }

    #[test]
    fn in_use_says_what_to_do_and_keeps_raw_last() {
        let e = std::io::Error::from(std::io::ErrorKind::AddrInUse);
        let raw = format!("({e})");
        // 윈도우가 쥔 445 — 끄라고 하지 않고 1024 위 포트로
        let m = in_use_message(&e, "0.0.0.0:445".parse().unwrap(), Some(PortOwner { pid: 4, name: Some("System".into()) }));
        assert!(m.contains("윈도우 자신") && m.contains("5001") && m.contains("1024 위"), "{m}");
        assert!(m.ends_with(&raw), "{m}");
        // 보통 프로그램 — 다른 포트 또는 그 프로그램 끄기
        let m = in_use_message(&e, "0.0.0.0:5020".parse().unwrap(), Some(PortOwner { pid: 1234, name: Some("app.exe".into()) }));
        assert!(m.contains("app.exe (PID 1234)") && m.contains("5021") && m.contains("끄세요"), "{m}");
        // 쥔 쪽을 모를 때도 할 일은 나온다
        let m = in_use_message(&e, "0.0.0.0:502".parse().unwrap(), None);
        assert!(m.contains("1024 위") && !m.contains("쥔"), "{m}");
    }
}
