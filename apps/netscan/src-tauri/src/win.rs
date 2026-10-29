//! 윈도우 API — 랜카드 목록(GetAdaptersAddresses), 핑(core ping.rs 의 IcmpSendEcho2), ARP(SendARP)·ARP 캐시(GetIpNetTable2), 이름 찾기(GetNameInfoW).
//! 모두 관리자 권한·드라이버 없이 된다. 윈도우가 아니면(개발용) 빈 결과.

use serde::Serialize;
use std::net::Ipv4Addr;

/// 랜카드의 IPv4 주소 하나(한 랜카드에 여러 개일 수 있다 — 임시로 더한 IP 등)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NicAddr {
    pub ip: String,
    pub prefix: u8,
    pub mask: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Nic {
    /// 어댑터 고유 이름(GUID)
    pub id: String,
    /// «이더넷 2» 같은 연결 이름
    pub name: String,
    /// 장치 설명(«Intel(R) Ethernet …»)
    pub desc: String,
    pub addrs: Vec<NicAddr>,
    pub gateway: Option<String>,
    pub mac: Option<String>,
    pub up: bool,
    pub wireless: bool,
    /// 랜카드 MAC 의 제조사
    pub vendor: Option<String>,
}

/// 주소 → u32(메모리 순서 그대로 — Win32 IPAddr 는 네트워크 바이트 순서)
#[cfg(windows)]
fn raw(ip: Ipv4Addr) -> u32 {
    u32::from_ne_bytes(ip.octets())
}

#[cfg(windows)]
mod imp {
    use super::*;
    use crate::oui;
    use crate::range;
    use std::sync::Once;
    use windows_sys::Win32::Foundation::{ERROR_BUFFER_OVERFLOW, NO_ERROR};
    use windows_sys::Win32::NetworkManagement::IpHelper::*;
    use windows_sys::Win32::NetworkManagement::Ndis::IfOperStatusUp;
    use windows_sys::Win32::Networking::WinSock::{AF_INET, GetNameInfoW, IN_ADDR, IN_ADDR_0, NI_MAXHOST, NI_NAMEREQD, SOCKADDR, SOCKADDR_IN, SOCKET_ADDRESS, WSADATA, WSAStartup};

    unsafe fn wide(p: *const u16) -> String {
        if p.is_null() {
            return String::new();
        }
        let mut n = 0;
        // SAFETY: GetAdaptersAddresses 가 준 0 으로 끝나는 UTF-16 문자열
        while unsafe { *p.add(n) } != 0 {
            n += 1;
        }
        String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(p, n) })
    }

    unsafe fn ipv4_of(a: &SOCKET_ADDRESS) -> Option<Ipv4Addr> {
        if a.lpSockaddr.is_null() {
            return None;
        }
        // SAFETY: lpSockaddr 는 iSockaddrLength 바이트짜리 주소. AF_INET 일 때만 SOCKADDR_IN 으로 읽는다
        let sa = unsafe { &*a.lpSockaddr };
        if sa.sa_family != AF_INET || (a.iSockaddrLength as usize) < std::mem::size_of::<SOCKADDR_IN>() {
            return None;
        }
        let sin = unsafe { &*(a.lpSockaddr as *const SOCKADDR_IN) };
        Some(Ipv4Addr::from(unsafe { sin.sin_addr.S_un.S_addr }.to_ne_bytes()))
    }

    pub fn list_nics() -> Result<Vec<Nic>, String> {
        let flags = GAA_FLAG_INCLUDE_GATEWAYS | GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER;
        let mut size: u32 = 32 * 1024;
        let mut buf: Vec<u64>;
        let mut tries = 0;
        loop {
            buf = vec![0u64; (size as usize).div_ceil(8)];
            // SAFETY: buf 는 size 바이트 이상, 8바이트 정렬
            let r = unsafe { GetAdaptersAddresses(u32::from(AF_INET), flags, std::ptr::null(), buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH, &mut size) };
            if r == NO_ERROR {
                break;
            }
            tries += 1;
            if r != ERROR_BUFFER_OVERFLOW || tries > 3 {
                return Err(format!("GetAdaptersAddresses: {}", std::io::Error::from_raw_os_error(r as i32)));
            }
        }
        let mut out = Vec::new();
        let mut p = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
        while !p.is_null() {
            // SAFETY: 위에서 채운 연결 목록
            let a = unsafe { &*p };
            p = a.Next;
            if a.IfType == IF_TYPE_SOFTWARE_LOOPBACK {
                continue;
            }
            let mut addrs = Vec::new();
            let mut u = a.FirstUnicastAddress;
            while !u.is_null() {
                let ua = unsafe { &*u };
                if let Some(ip) = unsafe { ipv4_of(&ua.Address) } {
                    // 169.254(자동 사설 IP)도 보인다 — DHCP 가 없는 장비 직결에서 흔하다
                    let prefix = ua.OnLinkPrefixLength.min(32);
                    addrs.push(NicAddr { ip: ip.to_string(), prefix, mask: Ipv4Addr::from(range::mask_of(prefix)).to_string() });
                }
                u = ua.Next;
            }
            if addrs.is_empty() {
                continue;
            }
            let mut gateway = None;
            let mut g = a.FirstGatewayAddress;
            while !g.is_null() && gateway.is_none() {
                let ga = unsafe { &*g };
                gateway = unsafe { ipv4_of(&ga.Address) }.filter(|x| !x.is_unspecified()).map(|x| x.to_string());
                g = ga.Next;
            }
            let mac = (a.PhysicalAddressLength == 6).then(|| {
                let mut m = [0u8; 6];
                m.copy_from_slice(&a.PhysicalAddress[..6]);
                m
            });
            let id = if a.AdapterName.is_null() {
                String::new()
            } else {
                // SAFETY: 0 으로 끝나는 ANSI 문자열(GUID)
                unsafe { std::ffi::CStr::from_ptr(a.AdapterName as *const std::ffi::c_char) }.to_string_lossy().into_owned()
            };
            out.push(Nic {
                id,
                name: unsafe { wide(a.FriendlyName) },
                desc: unsafe { wide(a.Description) },
                addrs,
                gateway,
                mac: mac.map(|m| oui::fmt_mac(&m)),
                vendor: mac.and_then(|m| oui::vendor(&m)).map(String::from),
                up: a.OperStatus == IfOperStatusUp,
                wireless: a.IfType == IF_TYPE_IEEE80211,
            });
        }
        Ok(out)
    }

    /// ARP 로 MAC 묻기 — 같은 대역의 장비만 된다. 핑을 막아 둔 장비도 답한다
    pub fn arp(ip: Ipv4Addr, src: Option<Ipv4Addr>) -> Option<[u8; 6]> {
        let mut mac = [0u32; 2];
        let mut len: u32 = 6;
        // SAFETY: mac 은 8바이트, len 은 그 안
        let r = unsafe { SendARP(raw(ip), src.map(raw).unwrap_or(0), mac.as_mut_ptr() as *mut _, &mut len) };
        if r != NO_ERROR || len < 6 {
            return None;
        }
        let b: Vec<u8> = mac.iter().flat_map(|w| w.to_ne_bytes()).collect();
        let m = [b[0], b[1], b[2], b[3], b[4], b[5]];
        (m != [0; 6]).then_some(m)
    }

    /// 윈도우 ARP 캐시(GetIpNetTable2, 관리자 권한 없이) — IPv4 이고 MAC 이 있는 줄만(고정·브로드캐스트·멀티캐스트 빼고).
    /// 한 IP 에 장비 둘이 답하면 캐시의 MAC 이 바뀌어 보일 수 있다(IP 충돌 의심의 단서)
    pub fn arp_table() -> Vec<(Ipv4Addr, [u8; 6])> {
        use windows_sys::Win32::Networking::WinSock::{NlnsIncomplete, NlnsPermanent, NlnsUnreachable};
        let mut t: *mut MIB_IPNET_TABLE2 = std::ptr::null_mut();
        // SAFETY: 성공하면 t 에 표가 오고 FreeMibTable 로 푼다
        if unsafe { GetIpNetTable2(AF_INET, &mut t) } != NO_ERROR || t.is_null() {
            return Vec::new();
        }
        let mut out = Vec::new();
        // SAFETY: NumEntries 개의 줄이 Table 에서 이어진다
        let rows = unsafe { std::slice::from_raw_parts((*t).Table.as_ptr(), (*t).NumEntries as usize) };
        for r in rows {
            if r.PhysicalAddressLength != 6 || [NlnsUnreachable, NlnsIncomplete, NlnsPermanent].contains(&r.State) {
                continue;
            }
            // SAFETY: AF_INET 표라 Ipv4 로 읽는다
            let sin = unsafe { r.Address.Ipv4 };
            if sin.sin_family != AF_INET {
                continue;
            }
            let ip = Ipv4Addr::from(unsafe { sin.sin_addr.S_un.S_addr }.to_ne_bytes());
            let mut m = [0u8; 6];
            m.copy_from_slice(&r.PhysicalAddress[..6]);
            if m != [0; 6] && m[0] & 1 == 0 {
                out.push((ip, m));
            }
        }
        // SAFETY: GetIpNetTable2 가 준 표
        unsafe { FreeMibTable(t as *const _) };
        out
    }

    fn wsa() {
        static INIT: Once = Once::new();
        INIT.call_once(|| {
            let mut d: WSADATA = unsafe { std::mem::zeroed() };
            // SAFETY: 한 번만. 끝낼 때 정리하지 않는다(프로그램 끝까지 쓴다)
            unsafe { WSAStartup(0x0202, &mut d) };
        });
    }

    /// 거꾸로 이름 찾기(DNS·LLMNR·NetBIOS — 윈도우가 아는 대로). 못 찾으면 없음
    pub fn reverse_name(ip: Ipv4Addr) -> Option<String> {
        wsa();
        let sa = SOCKADDR_IN { sin_family: AF_INET, sin_port: 0, sin_addr: IN_ADDR { S_un: IN_ADDR_0 { S_addr: raw(ip) } }, sin_zero: [0; 8] };
        let mut host = vec![0u16; NI_MAXHOST as usize];
        // SAFETY: sa 는 SOCKADDR_IN 크기, host 는 NI_MAXHOST 글자
        let r = unsafe {
            GetNameInfoW(
                &sa as *const SOCKADDR_IN as *const SOCKADDR,
                std::mem::size_of::<SOCKADDR_IN>() as i32,
                host.as_mut_ptr(),
                NI_MAXHOST,
                std::ptr::null_mut(),
                0,
                NI_NAMEREQD as i32,
            )
        };
        if r != 0 {
            return None;
        }
        let n = host.iter().position(|c| *c == 0).unwrap_or(host.len());
        let s = String::from_utf16_lossy(&host[..n]);
        (!s.is_empty() && s != ip.to_string()).then_some(s)
    }
}

#[cfg(not(windows))]
mod imp {
    use super::*;
    pub fn list_nics() -> Result<Vec<Nic>, String> {
        Ok(Vec::new())
    }
    pub fn arp(_ip: Ipv4Addr, _src: Option<Ipv4Addr>) -> Option<[u8; 6]> {
        None
    }
    pub fn arp_table() -> Vec<(Ipv4Addr, [u8; 6])> {
        Vec::new()
    }
    pub fn reverse_name(_ip: Ipv4Addr) -> Option<String> {
        None
    }
}

pub use imp::*;
/// 핑은 공용 부품(portdock_core::ping — Hardware Tester 와 함께 쓴다)
pub use portdock_core::ping::Pinger;

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    /// 이 PC 에서 실제로 불러 보기(네트워크에 따라 결과가 달라 기본으로는 돌리지 않는다):
    /// cargo test -p portdock-netscan live_apis -- --ignored --nocapture
    #[test]
    #[ignore]
    fn live_apis() {
        let nics = list_nics().unwrap();
        for n in &nics {
            println!("{n:?}");
        }
        let p = Pinger::new().unwrap();
        println!("ping 127.0.0.1 → {:?}", p.ping(Ipv4Addr::LOCALHOST, 500));
        if let Some(n) = nics.iter().find(|n| n.up && n.gateway.is_some()) {
            let gw: Ipv4Addr = n.gateway.as_ref().unwrap().parse().unwrap();
            let src: Ipv4Addr = n.addrs[0].ip.parse().unwrap();
            println!("ping {gw} → {:?}", p.ping(gw, 1000));
            println!("arp {gw} → {:?}", arp(gw, Some(src)).map(|m| crate::oui::fmt_mac(&m)));
            println!("name {gw} → {:?}", reverse_name(gw));
        }
    }

    /// ARP 캐시 읽기 — 줄 수는 PC 마다 다르다(Server 러너는 0 일 수도). 읽은 줄은 유니캐스트 MAC 만
    #[test]
    fn arp_table_reads() {
        for (_, m) in arp_table() {
            assert!(m != [0; 6] && m[0] & 1 == 0);
        }
    }
}
