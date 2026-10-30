//! 안전장치 — 쓰기 대상(루프백만), 속도 제한, 결과 크기 상한, 개인정보 가림, SCPI 질의 검사.
//! 모두 화면·통신과 무관한 순수 함수라 단위 시험으로 확인한다.

use std::collections::{HashMap, VecDeque};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, ToSocketAddrs};
use std::time::{Duration, Instant};

// ---------------------------------------------------------------- 대상 주소

/// «127.0.0.1» · «localhost» · «::1» 처럼 이 PC 자신인지 — 이름 풀이를 하지 않는다(«localhost» 만 글자로 인정)
pub fn loopback_addr(host: &str, port: u16) -> Result<SocketAddr, String> {
    let h = host.trim().trim_start_matches('[').trim_end_matches(']');
    if h.eq_ignore_ascii_case("localhost") {
        return Ok(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port));
    }
    match h.parse::<IpAddr>() {
        Ok(ip) if ip.is_loopback() => Ok(SocketAddr::new(ip, port)),
        _ => Err(format!(
            "Refused: simulator writes go only to this PC (127.0.0.1 / localhost), not «{host}». Write tools accept only this PC's address. / 거절: 시뮬레이터 쓰기는 이 PC(127.0.0.1·localhost) 주소만 받습니다."
        )),
    }
}

/// 읽기 대상 주소 — IP 또는 이름(첫 IPv4 우선)
pub fn resolve(host: &str, port: u16) -> Result<SocketAddr, String> {
    let h = host.trim().trim_start_matches('[').trim_end_matches(']');
    if h.is_empty() {
        return Err("host is empty / 주소가 비어 있습니다".into());
    }
    if let Ok(ip) = h.parse::<IpAddr>() {
        return Ok(SocketAddr::new(ip, port));
    }
    let addrs: Vec<SocketAddr> = (h, port).to_socket_addrs().map_err(|e| format!("{h}: {}", portdock_core::oserr::resolve(&e)))?.collect();
    addrs.iter().find(|a| a.is_ipv4()).or(addrs.first()).copied().ok_or_else(|| format!("{h}: {}", portdock_core::oserr::resolve_text()))
}

// ---------------------------------------------------------------- 속도 제한

/// 같은 대상에는 `gap` 안에 다시 보내지 않고, 전체 호출은 1분에 `per_minute` 번까지
pub struct RateLimiter {
    gap: Duration,
    per_minute: usize,
    last: HashMap<String, Instant>,
    window: VecDeque<Instant>,
}

/// 같은 대상 최소 간격 — 초당 10번
pub const TARGET_GAP: Duration = Duration::from_millis(100);
/// 1분에 받는 호출 수
pub const PER_MINUTE: usize = 120;

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new(TARGET_GAP, PER_MINUTE)
    }
}

impl RateLimiter {
    pub fn new(gap: Duration, per_minute: usize) -> Self {
        Self { gap, per_minute, last: HashMap::new(), window: VecDeque::new() }
    }

    /// 지금 불러도 되면 기록하고 Ok. `target` 이 None 이면(이 PC 읽기) 전체 수만 센다
    pub fn check(&mut self, target: Option<&str>, now: Instant) -> Result<(), String> {
        while self.window.front().is_some_and(|t| now.duration_since(*t) >= Duration::from_secs(60)) {
            self.window.pop_front();
        }
        if self.window.len() >= self.per_minute {
            return Err(format!("Rate limit: at most {} tool calls per minute. Wait and try again. / 속도 제한: 1분에 {}번까지입니다.", self.per_minute, self.per_minute));
        }
        if let Some(t) = target {
            let key = t.to_ascii_lowercase();
            if let Some(prev) = self.last.get(&key)
                && now.duration_since(*prev) < self.gap
            {
                return Err(format!("Rate limit: the same target «{t}» at most once per {} ms. / 속도 제한: 같은 대상은 {} ms 에 한 번까지입니다.", self.gap.as_millis(), self.gap.as_millis()));
            }
            self.last.insert(key, now);
        }
        self.window.push_back(now);
        Ok(())
    }
}

// ---------------------------------------------------------------- 결과 크기

/// 도구 결과 글자 상한(바이트)
pub const MAX_RESULT: usize = 64 * 1024;

/// 길면 글자 경계에서 자르고 알린다
pub fn cap(text: String, max: usize) -> String {
    if text.len() <= max {
        return text;
    }
    let mut end = max;
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}\n… [truncated: {} of {} bytes shown / 결과가 길어 잘랐습니다 — 범위를 줄여 다시 부르세요]", &text[..end], end, text.len())
}

// ---------------------------------------------------------------- 개인정보 가림

fn is_sep(c: char) -> bool {
    c == '\\' || c == '/'
}

/// «C:\Users\홍길동\…» → «~\…» — shared/redact.ts `hideUserPaths` 와 같은 규칙(JSON 의 «\\»·«/» 도, 이름에 빈칸이 있어도).
/// 이름 뒤에 구분자가 있으면(64자 안) 그 앞까지, 없으면 빈칸·따옴표 앞까지
pub fn hide_user_paths(text: &str) -> String {
    let cs: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    while i < cs.len() {
        if let Some(end) = user_path_at(&cs, i) {
            out.push('~');
            i = end;
        } else {
            out.push(cs[i]);
            i += 1;
        }
    }
    out
}

/// i 에서 «X:\users\이름» 이 시작하면 끝 위치
fn user_path_at(cs: &[char], i: usize) -> Option<usize> {
    let word = |c: char| c.is_alphanumeric() || c == '_';
    if !cs[i].is_ascii_alphabetic() || (i > 0 && word(cs[i - 1])) || cs.get(i + 1) != Some(&':') {
        return None;
    }
    let mut j = i + 2;
    let s0 = j;
    while cs.get(j).is_some_and(|&c| is_sep(c)) {
        j += 1;
    }
    if j == s0 {
        return None;
    }
    let users: String = cs.get(j..j + 5)?.iter().collect();
    if !users.eq_ignore_ascii_case("users") {
        return None;
    }
    j += 5;
    let s1 = j;
    while cs.get(j).is_some_and(|&c| is_sep(c)) {
        j += 1;
    }
    if j == s1 {
        return None;
    }
    // 1) 64자 안에 구분자가 오는 이름(빈칸 허용)
    let bad1 = |c: char| is_sep(c) || matches!(c, '"' | '\'' | '`' | '<' | '>' | '|' | '\r' | '\n' | ':');
    let mut k = j;
    while k < cs.len() && k - j < 64 && !bad1(cs[k]) {
        k += 1;
    }
    if k > j && cs.get(k).is_some_and(|&c| is_sep(c)) {
        return Some(k);
    }
    // 2) 구분자가 없으면 빈칸·따옴표 앞까지
    let bad2 = |c: char| is_sep(c) || c.is_whitespace() || matches!(c, '"' | '\'' | '`' | '<' | '>' | '|');
    let mut k = j;
    while k < cs.len() && !bad2(cs[k]) {
        k += 1;
    }
    (k > j).then_some(k)
}

/// 하드웨어 주소(MAC «AA-BB-CC-DD-EE-FF»·«aa:bb:…») 를 가린다 — AI 쪽으로 PC 를 알아볼 값을 보내지 않게
pub fn hide_macs(text: &str) -> String {
    let b = text.as_bytes();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    let mut last = 0;
    while i + 17 <= b.len() {
        let s = &b[i..i + 17];
        let sep = s[2];
        let hit = (sep == b'-' || sep == b':')
            && (0..6).all(|k| s[k * 3].is_ascii_hexdigit() && s[k * 3 + 1].is_ascii_hexdigit() && (k == 5 || s[k * 3 + 2] == sep))
            && (i == 0 || !(b[i - 1].is_ascii_alphanumeric() || b[i - 1] == sep))
            && b.get(i + 17).is_none_or(|c| !c.is_ascii_alphanumeric() && *c != sep);
        if hit {
            out.push_str(&text[last..i]);
            out.push_str(if sep == b'-' { "xx-xx-xx-xx-xx-xx" } else { "xx:xx:xx:xx:xx:xx" });
            i += 17;
            last = i;
        } else {
            i += 1;
        }
    }
    out.push_str(&text[last..]);
    out
}

/// 도구 결과·기록에 쓰는 가림 전부
pub fn redact(text: &str) -> String {
    hide_macs(&hide_user_paths(text))
}

// ---------------------------------------------------------------- SCPI

/// 질의(«?» 끝)여도 계측기 상태를 바꾸거나 오래 걸리는 것 — 머리(대문자, 앞 «:» 뗌)가 이것으로 시작하면 거절
const SCPI_DENY: &[&str] = &[
    "*TST", // 자체 시험 — 끝나면 초기 상태로
    "*CAL", // 교정
    "CAL",  // CALibration 하위 전부
    "*RST", "*TRG", "*SAV", "*RCL", "*PSC", "*DDT", "*PUD", "*LRN", "*WAI",
    "SYST:PRES", "SYSTEM:PRES", "SYST:SEC", "SYSTEM:SEC", // 초기화·보안 지우기
    "MMEM", "MMEMORY",                                     // 파일
    "DIAG", "TEST",                                        // DIAGnostic·TEST 명령 실행
    "INIT", "ABOR", "TRIG",                                // 측정 시작·멈춤
];

/// 질의지만 측정을 새로 시작하는 것 — SCPI-99 기준 READ? = ABORt + INITiate + FETCh?(트리거·측정 시작),
/// MEASure:…? = ABORt + CONFigure(기능·범위 다시 설정) + READ?. 기본은 거절하고, 사용자가 `allow_measure` 를 켠 호출만 보낸다.
/// FETCh? 는 마지막 측정값을 읽기만 해서 그대로 허용. SYST:ERR?·*ESR? 는 오류 큐·이벤트 레지스터를 비우지만(읽으면 지워짐) 진단에 필요해 허용 — docs/mcp.md
const SCPI_MEASURE: &[&str] = &["MEAS", "READ"];

/// 머리가 측정을 시작하는 질의(MEAS…?·READ?)인지
pub fn scpi_starts_measurement(cmd: &str) -> bool {
    let head = cmd.split_whitespace().next().unwrap_or("").trim_start_matches(':').to_ascii_uppercase();
    SCPI_MEASURE.iter().any(|m| head.starts_with(m))
}

/// SCPI 질의 하나만 허용 — 머리가 «?» 로 끝나고, «;» 로 잇지 않고, 거부 목록에 없을 때.
/// 측정을 시작하는 질의(MEAS…?·READ?)는 `allow_measure` 가 true 일 때만
pub fn scpi_check(cmd: &str, allow_measure: bool) -> Result<String, String> {
    let c = cmd.trim();
    if c.is_empty() || c.len() > 256 {
        return Err("SCPI command must be 1–256 characters / SCPI 명령은 1~256자입니다".into());
    }
    if c.chars().any(|ch| !(ch.is_ascii_graphic() || ch == ' ')) {
        return Err("SCPI command must be printable ASCII on one line / SCPI 명령은 한 줄의 ASCII 글자만 됩니다".into());
    }
    if c.contains(';') {
        return Err("Only one query per call — «;» chaining is refused / 한 번에 질의 하나만(«;» 로 잇기 거절)".into());
    }
    let head = c.split_whitespace().next().unwrap_or("");
    if !head.ends_with('?') {
        return Err(format!("Refused: «{head}» is not a query (must end with «?»). This server only reads. / 거절: 질의(«?» 끝)만 보냅니다."));
    }
    let up = head.trim_start_matches(':').to_ascii_uppercase();
    if let Some(d) = SCPI_DENY.iter().find(|d| up.starts_with(**d)) {
        return Err(format!("Refused: «{head}» is on the deny list ({d}… may change instrument state). / 거절: 계측기 상태를 바꿀 수 있는 질의입니다."));
    }
    if !allow_measure && scpi_starts_measurement(c) {
        return Err(format!(
            "Refused: «{head}» starts a new measurement (READ? triggers one; MEAS…? also reconfigures function and range). Use FETC? to read the last result, or call again with allow_measure=true if the user agrees. / 거절: 측정을 새로 시작하는 질의입니다(MEAS…? 는 기능·범위도 다시 설정). 마지막 값은 FETC? 로 읽거나, 사용자가 동의하면 allow_measure=true 로 다시 부르세요."
        ));
    }
    Ok(c.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loopback_only_for_writes() {
        assert_eq!(loopback_addr("127.0.0.1", 502).unwrap().to_string(), "127.0.0.1:502");
        assert_eq!(loopback_addr("LOCALHOST", 5000).unwrap().to_string(), "127.0.0.1:5000");
        assert_eq!(loopback_addr("127.5.6.7", 1).unwrap().ip().to_string(), "127.5.6.7");
        assert!(loopback_addr("::1", 502).is_ok());
        assert!(loopback_addr("[::1]", 502).is_ok());
        for h in ["192.168.0.10", "10.0.0.1", "0.0.0.0", "plc.local", "localhost.example.com", "", "127.0.0.1.example", "::ffff:192.168.0.1"] {
            let e = loopback_addr(h, 502).unwrap_err();
            assert!(e.contains("Refused"), "{h}: {e}");
        }
    }

    #[test]
    fn rate_limit_per_target_and_per_minute() {
        let t0 = Instant::now();
        let mut r = RateLimiter::new(Duration::from_millis(100), 3);
        r.check(Some("COM3"), t0).unwrap();
        assert!(r.check(Some("com3"), t0 + Duration::from_millis(50)).is_err());
        r.check(Some("COM4"), t0 + Duration::from_millis(50)).unwrap();
        r.check(Some("COM3"), t0 + Duration::from_millis(150)).unwrap();
        // 1분에 3번 — 넷째는 거절, 1분 지나면 다시
        assert!(r.check(None, t0 + Duration::from_millis(200)).is_err());
        r.check(None, t0 + Duration::from_secs(61)).unwrap();
    }

    #[test]
    fn cap_on_char_boundary() {
        assert_eq!(cap("abc".into(), 10), "abc");
        let s = cap("가나다라".into(), 4);
        assert!(s.starts_with("가\n…"), "{s}");
        assert!(s.contains("truncated"));
    }

    #[test]
    fn user_paths_same_as_shared_redact() {
        // shared/redact.test.ts 와 같은 예
        assert_eq!(hide_user_paths("C:\\Users\\홍길동\\a.log"), "~\\a.log");
        assert_eq!(hide_user_paths("at C:\\Users\\park"), "at ~");
        assert_eq!(hide_user_paths("C:\\Users\\John Smith\\Desktop\\log.txt: denied"), "~\\Desktop\\log.txt: denied");
        assert_eq!(hide_user_paths("\"C:\\\\Users\\\\John Smith\\\\a\""), "\"~\\\\a\"");
        assert_eq!(hide_user_paths("home C:\\Users\\bob and D:\\x"), "home ~ and D:\\x");
        assert_eq!(hide_user_paths("c:/users/kim/x"), "~/x");
        assert_eq!(hide_user_paths("D:\\Program Files\\x"), "D:\\Program Files\\x");
        assert_eq!(hide_user_paths("XC:\\Users\\kim\\a"), "XC:\\Users\\kim\\a");
    }

    #[test]
    fn macs_masked() {
        assert_eq!(hide_macs("mac 0A-1B-2C-3D-4E-5F end"), "mac xx-xx-xx-xx-xx-xx end");
        assert_eq!(hide_macs("{\"m\":\"0a:1b:2c:3d:4e:5f\"}"), "{\"m\":\"xx:xx:xx:xx:xx:xx\"}");
        // 더 긴 16진 줄·IPv6 일부는 그대로
        assert_eq!(hide_macs("0A-1B-2C-3D-4E-5F-60"), "0A-1B-2C-3D-4E-5F-60");
        assert_eq!(hide_macs("fe80::1"), "fe80::1");
        assert_eq!(hide_macs("mac:0A-1B-2C-3D-4E-5F"), "mac:xx-xx-xx-xx-xx-xx");
        assert_eq!(redact("C:\\Users\\kim\\x 0A-1B-2C-3D-4E-5F"), "~\\x xx-xx-xx-xx-xx-xx");
    }

    #[test]
    fn scpi_only_safe_queries() {
        for ok in ["*IDN?", "SYST:ERR?", "  *OPC?  ", "FETC?", "FETCH:VOLT?", "*ESR?", "OUTP?", "SOUR:VOLT?", "CONF?", "SENS:FUNC?"] {
            assert!(scpi_check(ok, false).is_ok(), "{ok}");
            assert!(!scpi_starts_measurement(ok), "{ok}");
        }
        for bad in ["*RST", "VOLT 5", "*CLS", "*IDN?;*RST", "*TST?", "*CAL?", "CAL:ALL?", ":CAL?", "SYST:PRES", "MMEM:CAT?", "INIT?", "", "*IDN?\n*RST", "x".repeat(300).as_str()] {
            assert!(scpi_check(bad, false).is_err(), "{bad}");
            assert!(scpi_check(bad, true).is_err(), "{bad} — allow_measure 는 거부 목록을 풀지 않는다");
        }
    }

    #[test]
    fn scpi_measurement_queries_need_allow_measure() {
        for m in ["READ?", ":MEAS:VOLT:DC? 10,0.001", "MEAS?", "measure:current:ac?", ":read?"] {
            let e = scpi_check(m, false).unwrap_err();
            assert!(e.starts_with("Refused") && e.contains("allow_measure"), "{m}: {e}");
            assert!(scpi_starts_measurement(m), "{m}");
            assert!(scpi_check(m, true).is_ok(), "{m}");
        }
    }
}
