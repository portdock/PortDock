//! 핑·기본 경로·DNS 응답 시간 — 관리자 권한·드라이버 없이(IcmpSendEcho2 · GetBestRoute · DnsQuery_W).
//! Net Scan(장비 찾기·장기 핑 감시)과 Hardware Tester(끊김·지연 기록기)가 함께 쓴다. 윈도우가 아니면(개발용) 빈 결과.
//! 보내는 곳은 부르는 쪽이 정한 주소 하나뿐이다 — 이 모듈은 스스로 대상을 고르거나 훑지 않는다.

use std::net::Ipv4Addr;

/// 주소 → u32(메모리 순서 그대로 — Win32 IPAddr 는 네트워크 바이트 순서)
#[cfg(windows)]
fn raw(ip: Ipv4Addr) -> u32 {
    u32::from_ne_bytes(ip.octets())
}

#[cfg(windows)]
mod imp {
    use super::*;
    use windows_sys::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE, NO_ERROR};
    use windows_sys::Win32::NetworkManagement::Dns::{DNS_QUERY_BYPASS_CACHE, DNS_QUERY_NO_HOSTS_FILE, DNS_RECORDA, DNS_TYPE_A, DnsFree, DnsFreeRecordList, DnsQuery_W};
    use windows_sys::Win32::NetworkManagement::IpHelper::{GetBestRoute, ICMP_ECHO_REPLY, IP_SUCCESS, IcmpCloseHandle, IcmpCreateFile, IcmpSendEcho2, MIB_IPFORWARDROW};

    /// 핑 손잡이 — 일꾼 스레드마다 하나
    pub struct Pinger(HANDLE);
    // SAFETY: ICMP 손잡이는 스레드 사이에 옮겨도 된다(같은 순간에 한 스레드만 쓴다)
    unsafe impl Send for Pinger {}

    impl Pinger {
        pub fn new() -> Result<Self, String> {
            // SAFETY: 인자 없음. 실패하면 INVALID_HANDLE_VALUE
            let h = unsafe { IcmpCreateFile() };
            if h == INVALID_HANDLE_VALUE || h.is_null() {
                return Err(format!("IcmpCreateFile: {}", std::io::Error::last_os_error()));
            }
            Ok(Self(h))
        }

        /// 응답하면 왕복 시간(ms)
        pub fn ping(&self, ip: Ipv4Addr, timeout_ms: u32) -> Option<u32> {
            let data = *b"PortDock ping 0123456789abcdefghij";
            // 답(ICMP_ECHO_REPLY + 보낸 데이터 + ICMP 오류 8바이트) 넉넉히, 8바이트 정렬
            let mut reply = [0u64; 64];
            // SAFETY: 동기 호출(이벤트·APC 없음). reply 는 512바이트
            let n = unsafe {
                IcmpSendEcho2(
                    self.0,
                    std::ptr::null_mut(),
                    None,
                    std::ptr::null(),
                    raw(ip),
                    data.as_ptr() as *const _,
                    data.len() as u16,
                    std::ptr::null(),
                    reply.as_mut_ptr() as *mut _,
                    std::mem::size_of_val(&reply) as u32,
                    timeout_ms.max(1),
                )
            };
            if n == 0 {
                return None;
            }
            // SAFETY: 답이 하나 이상이면 앞부분이 ICMP_ECHO_REPLY
            let r = unsafe { &*(reply.as_ptr() as *const ICMP_ECHO_REPLY) };
            (r.Status == IP_SUCCESS && r.Address == raw(ip)).then_some(r.RoundTripTime)
        }
    }

    impl Drop for Pinger {
        fn drop(&mut self) {
            // SAFETY: new 에서 받은 손잡이
            unsafe { IcmpCloseHandle(self.0) };
        }
    }

    /// `dest` 로 가는 길의 다음 홉(기본 경로면 기본 게이트웨이). 같은 대역(바로 닿음)이거나 길이 없으면 None
    pub fn next_hop(dest: Ipv4Addr) -> Option<Ipv4Addr> {
        // SAFETY: MIB_IPFORWARDROW 는 C 구조체 — 0 으로 채워 받는다
        let mut row: MIB_IPFORWARDROW = unsafe { std::mem::zeroed() };
        // SAFETY: row 는 쓰기 가능한 구조체 하나. 경로표를 읽기만 한다
        if unsafe { GetBestRoute(raw(dest), 0, &mut row) } != NO_ERROR {
            return None;
        }
        let hop = Ipv4Addr::from(row.dwForwardNextHop.to_ne_bytes());
        (!hop.is_unspecified() && hop != dest).then_some(hop)
    }

    /// 이름 하나(A 레코드)를 DNS 서버에 물어 걸린 시간(ms) — Windows DNS 캐시·hosts 파일을 건너뛴다. 실패하면 Err(이유)
    pub fn dns_time(name: &str) -> Result<u32, String> {
        let w: Vec<u16> = name.encode_utf16().chain(Some(0)).collect();
        let mut rec: *mut DNS_RECORDA = std::ptr::null_mut();
        let t = std::time::Instant::now();
        // SAFETY: w 는 널로 끝나는 글, 결과 목록은 DnsFree 로 돌려준다
        let r = unsafe { DnsQuery_W(w.as_ptr(), DNS_TYPE_A, DNS_QUERY_BYPASS_CACHE | DNS_QUERY_NO_HOSTS_FILE, std::ptr::null_mut(), &mut rec, std::ptr::null_mut()) };
        let ms = t.elapsed().as_millis().min(u128::from(u32::MAX)) as u32;
        if !rec.is_null() {
            // SAFETY: DnsQuery_W 가 준 목록
            unsafe { DnsFree(rec as *const _, DnsFreeRecordList) };
        }
        if r == 0 { Ok(ms) } else { Err(std::io::Error::from_raw_os_error(r as i32).to_string()) }
    }
}

#[cfg(not(windows))]
mod imp {
    use super::*;
    pub struct Pinger;
    impl Pinger {
        pub fn new() -> Result<Self, String> {
            Err("Windows only".into())
        }
        pub fn ping(&self, _ip: Ipv4Addr, _timeout_ms: u32) -> Option<u32> {
            None
        }
    }
    pub fn next_hop(_dest: Ipv4Addr) -> Option<Ipv4Addr> {
        None
    }
    pub fn dns_time(_name: &str) -> Result<u32, String> {
        Err("Windows only".into())
    }
}

pub use imp::*;

/// DNS 이름으로 쓸 수 있는 글인지(글자·숫자·하이픈·점, 253자 이하, 칸 63자 이하). 주소(1.2.3.4)도 받지 않는다 — 이름 풀이 시간을 재는 것이라
pub fn valid_dns_name(s: &str) -> bool {
    let s = s.trim().trim_end_matches('.');
    !s.is_empty()
        && s.len() <= 253
        && s.parse::<Ipv4Addr>().is_err()
        && s.split('.').all(|l| !l.is_empty() && l.len() <= 63 && !l.starts_with('-') && !l.ends_with('-') && l.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dns_names() {
        assert!(valid_dns_name("example.com"));
        assert!(valid_dns_name("a-b.example.co.kr."));
        assert!(!valid_dns_name(""));
        assert!(!valid_dns_name("1.1.1.1"));
        assert!(!valid_dns_name("bad name.com"));
        assert!(!valid_dns_name("-x.com"));
        assert!(!valid_dns_name("a..b"));
        assert!(!valid_dns_name(&"a".repeat(64)));
    }

    /// 127.0.0.1 만 — 바깥으로는 보내지 않는다. ICMP 가 막힌 러너가 있을 수 있어 손잡이를 못 만들면 건너뛴다
    #[cfg(windows)]
    #[test]
    fn loopback_ping() {
        let Ok(p) = Pinger::new() else { return };
        if let Some(ms) = p.ping(Ipv4Addr::LOCALHOST, 1000) {
            assert!(ms < 1000);
        } else {
            eprintln!("127.0.0.1 핑 응답 없음(ICMP 막힘?) — 건너뜀");
        }
        // 127.0.0.1 로 가는 길은 게이트웨이를 거치지 않는다
        assert_eq!(next_hop(Ipv4Addr::LOCALHOST), None);
    }
}
