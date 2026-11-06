//! 어댑터 목록(이름·IP·MAC·인터페이스 번호) — GetAdaptersAddresses, 관리자 권한 없이 된다.
//! 루프백(Software Loopback)도 목록에 넣는다 — `loopback` 칸으로 구분.

use std::net::IpAddr;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Adapter {
    /// 윈도우 인터페이스 번호(IfIndex)
    pub if_index: u32,
    /// «이더넷», «Wi-Fi» 같은 이름
    pub name: String,
    pub description: String,
    pub mac: Option<[u8; 6]>,
    pub ips: Vec<IpAddr>,
    pub up: bool,
    pub loopback: bool,
    pub wireless: bool,
}

pub fn fmt_mac(m: &[u8; 6]) -> String {
    format!("{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}", m[0], m[1], m[2], m[3], m[4], m[5])
}

#[cfg(windows)]
pub fn list_adapters() -> Result<Vec<Adapter>, String> {
    use windows_sys::Win32::Foundation::{ERROR_BUFFER_OVERFLOW, NO_ERROR};
    use windows_sys::Win32::NetworkManagement::IpHelper::*;
    use windows_sys::Win32::NetworkManagement::Ndis::IfOperStatusUp;
    use windows_sys::Win32::Networking::WinSock::{AF_INET, AF_INET6, AF_UNSPEC, SOCKADDR_IN, SOCKADDR_IN6};

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

    let flags = GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER;
    let mut size: u32 = 32 * 1024;
    let mut buf: Vec<u64>;
    let mut tries = 0;
    loop {
        buf = vec![0u64; (size as usize).div_ceil(8)];
        // SAFETY: buf 는 size 바이트 이상, 8바이트 정렬
        let r = unsafe { GetAdaptersAddresses(u32::from(AF_UNSPEC), flags, std::ptr::null(), buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH, &mut size) };
        if r == NO_ERROR {
            break;
        }
        tries += 1;
        if r != ERROR_BUFFER_OVERFLOW || tries > 3 {
            return Err(format!("어댑터 목록을 읽지 못했습니다(GetAdaptersAddresses: {})", std::io::Error::from_raw_os_error(r as i32)));
        }
    }
    let mut out = Vec::new();
    let mut p = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
    while !p.is_null() {
        // SAFETY: 위에서 채운 연결 목록
        let a = unsafe { &*p };
        p = a.Next;
        let mut ips = Vec::new();
        let mut u = a.FirstUnicastAddress;
        while !u.is_null() {
            let ua = unsafe { &*u };
            u = ua.Next;
            let sa = ua.Address.lpSockaddr;
            if sa.is_null() {
                continue;
            }
            // SAFETY: lpSockaddr 는 iSockaddrLength 바이트. 가족을 보고 맞는 크기일 때만 읽는다
            let fam = unsafe { (*sa).sa_family };
            let len = ua.Address.iSockaddrLength as usize;
            if fam == AF_INET && len >= std::mem::size_of::<SOCKADDR_IN>() {
                let sin = unsafe { &*(sa as *const SOCKADDR_IN) };
                ips.push(IpAddr::from(unsafe { sin.sin_addr.S_un.S_addr }.to_ne_bytes()));
            } else if fam == AF_INET6 && len >= std::mem::size_of::<SOCKADDR_IN6>() {
                let sin6 = unsafe { &*(sa as *const SOCKADDR_IN6) };
                ips.push(IpAddr::from(unsafe { sin6.sin6_addr.u.Byte }));
            }
        }
        let mac = (a.PhysicalAddressLength == 6).then(|| {
            let mut m = [0u8; 6];
            m.copy_from_slice(&a.PhysicalAddress[..6]);
            m
        });
        // SAFETY: 공용체 — IfIndex 는 Anonymous1.Anonymous 안
        let if_index = unsafe { a.Anonymous1.Anonymous.IfIndex };
        out.push(Adapter {
            if_index,
            name: unsafe { wide(a.FriendlyName) },
            description: unsafe { wide(a.Description) },
            mac,
            ips,
            up: a.OperStatus == IfOperStatusUp,
            loopback: a.IfType == IF_TYPE_SOFTWARE_LOOPBACK,
            wireless: a.IfType == IF_TYPE_IEEE80211,
        });
    }
    Ok(out)
}

#[cfg(not(windows))]
pub fn list_adapters() -> Result<Vec<Adapter>, String> {
    Err("Windows 에서만 어댑터 목록을 읽습니다".into())
}
