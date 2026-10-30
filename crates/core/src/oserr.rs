//! 자주 나오는 OS 오류를 화면 언어로 + 다음에 할 일. 윈도우 원문(PC 언어로 나옴)은 괄호 안에 남긴다.

use std::io::{self, ErrorKind};

/// 네트워크(바인드·접속·송수신) 오류
pub fn net(e: &io::Error) -> String {
    match net_text(e) {
        Some(text) => format!("{text} ({e})"),
        None => e.to_string(),
    }
}

/// `net` 의 설명만(원문 없이) — 모르는 오류면 None. 원문 앞에 다른 안내를 끼울 때(net::bind_error) 쓴다
pub fn net_text(e: &io::Error) -> Option<String> {
    let code = e.raw_os_error();
    let text = match (code, e.kind()) {
        (Some(10048), _) | (_, ErrorKind::AddrInUse) => {
            crate::tr!("포트가 이미 사용 중입니다(다른 프로그램이 쓰는 중)", "Port already in use (another program has it)")
        }
        (Some(10049), _) | (_, ErrorKind::AddrNotAvailable) => {
            crate::tr!("이 PC 에 없는 주소입니다(랜카드 주소 확인)", "Address not available on this PC (check the network adapter address)")
        }
        (Some(10061), _) | (_, ErrorKind::ConnectionRefused) => {
            crate::tr!("연결 거부 — 상대가 그 포트에서 듣고 있지 않습니다", "Connection refused — nothing is listening on that port")
        }
        (Some(10060), _) | (_, ErrorKind::TimedOut) => {
            crate::tr!("응답 없음(시간 초과) — 주소·방화벽·케이블 확인", "No answer (timed out) — check address, firewall, cable")
        }
        (Some(10013), _) | (_, ErrorKind::PermissionDenied) => crate::tr!(
            "접근 거부 — 브로드캐스트 주소면 «브로드캐스트» 를 켜고, 아니면 방화벽·예약된 포트 확인",
            "Access denied — for a broadcast address enable «Broadcast»; otherwise check firewall / reserved ports"
        ),
        (Some(10051), _) | (Some(10065), _) => {
            crate::tr!("그 주소로 가는 길이 없습니다(네트워크 설정 확인)", "No route to that address (check network settings)")
        }
        // WSAHOST_NOT_FOUND·WSATRY_AGAIN·WSANO_DATA — 이름을 IP 로 바꾸지 못함
        (Some(11001 | 11002 | 11004), _) => return Some(resolve_text()),
        _ => return None,
    };
    Some(text.to_string())
}

/// 주소(이름)를 찾지 못함 — 철자·DNS 안내
pub fn resolve_text() -> String {
    crate::tr!(
        "주소를 찾지 못했습니다 — 이름 철자를 확인하거나 IP 주소(예: 192.168.0.10)를 직접 넣으세요(이름이면 DNS·hosts 확인)",
        "Address not found — check the spelling or enter the IP address directly (e.g. 192.168.0.10); for a name, check DNS / hosts"
    )
    .to_string()
}

/// 이름 풀기(to_socket_addrs) 오류 — 무엇이든 «찾지 못함» 안내 + 원문
pub fn resolve(e: &io::Error) -> String {
    format!("{} ({e})", resolve_text())
}

/// 열려 있던 시리얼 포트의 읽기 오류
pub fn serial_io(e: &io::Error) -> String {
    let text = match (e.raw_os_error(), e.kind()) {
        // ERROR_BAD_COMMAND · ERROR_GEN_FAILURE · ERROR_OPERATION_ABORTED · ERROR_DEVICE_NOT_CONNECTED
        (Some(22 | 31 | 995 | 1167), _) | (_, ErrorKind::NotFound | ErrorKind::BrokenPipe) => {
            crate::tr!("장치가 분리됐거나 응답하지 않습니다", "The device was removed or stopped responding")
        }
        (_, ErrorKind::PermissionDenied) => crate::tr!("접근 거부", "Access denied"),
        _ => return e.to_string(),
    };
    format!("{text} ({e})")
}

/// 시리얼 포트 열기 오류. 윈도우 serialport 는 «없음» 과 «사용 중(접근 거부)» 을
/// 둘 다 NoDevice 로 돌려주므로, 포트 목록에 있는지(`listed`)로 가린다.
pub fn serial_open(e: &serialport::Error, listed: bool) -> String {
    use serialport::ErrorKind as K;
    let text = match e.kind() {
        K::NoDevice if listed => crate::tr!(
            "포트가 사용 중입니다 — 다른 프로그램(또는 다른 PortDock 창)이 열고 있는지 확인",
            "Port is busy — check whether another program (or another PortDock window) has it open"
        ),
        K::NoDevice => crate::tr!("포트를 찾을 수 없습니다 — 케이블·드라이버·포트 이름 확인", "Port not found — check cable, driver and port name"),
        K::Io(ErrorKind::TimedOut) => crate::tr!("포트가 응답하지 않습니다(시간 초과)", "The port did not respond (timed out)"),
        K::Io(ErrorKind::PermissionDenied) => crate::tr!("접근 거부 — 포트가 사용 중일 수 있습니다", "Access denied — the port may be in use"),
        K::InvalidInput => crate::tr!("지원하지 않는 설정입니다(속도·데이터 비트 등)", "Unsupported setting (baud, data bits, …)"),
        _ => return e.to_string(),
    };
    format!("{text} ({e})")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_common_codes_and_keeps_raw() {
        let e = io::Error::from_raw_os_error(10061);
        let s = net(&e);
        assert!(s.contains("연결 거부"));
        assert!(s.contains(&e.to_string()));
        assert!(net(&io::Error::from(ErrorKind::AddrInUse)).contains("사용 중"));
        // 모르는 오류는 원문 그대로
        let other = io::Error::other("boom");
        assert_eq!(net(&other), "boom");
        assert!(net_text(&other).is_none());
    }

    #[test]
    fn host_not_found_says_what_to_do() {
        let e = io::Error::from_raw_os_error(11001);
        let s = net(&e);
        assert!(s.contains("찾지 못했습니다") && s.contains("IP 주소"), "{s}");
        assert!(s.ends_with(&format!("({e})")));
        assert!(resolve(&io::Error::other("raw")).ends_with("(raw)"));
    }

    #[test]
    fn serial_open_busy_vs_missing() {
        let e = serialport::Error::new(serialport::ErrorKind::NoDevice, "raw text");
        assert!(serial_open(&e, true).contains("사용 중"));
        assert!(serial_open(&e, false).contains("찾을 수 없"));
        assert!(serial_open(&e, false).ends_with("(raw text)"));
    }
}
