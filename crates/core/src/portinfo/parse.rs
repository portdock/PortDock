//! 읽은 값 풀기 — 운영체제 호출과 떨어진 순수 함수(단위 시험).

use super::tables::{Text, text};

/// FILETIME(1601-01-01 부터 100ns) → 유닉스 밀리초. 0·1970 이전은 None
pub fn filetime_ms(ft: u64) -> Option<u64> {
    const EPOCH: u64 = 116_444_736_000_000_000;
    if ft <= EPOCH { None } else { Some((ft - EPOCH) / 10_000) }
}

/// COM Name Arbiter 의 ComDB(REG_BINARY) → 예약된 COM 번호들. 바이트 i 의 비트 b(낮은 비트부터)가 COM(i*8+b+1)
pub fn comdb_numbers(bytes: &[u8]) -> Vec<u16> {
    let mut out = Vec::new();
    for (i, b) in bytes.iter().enumerate() {
        for bit in 0..8 {
            if b & (1 << bit) != 0 {
                out.push((i * 8 + bit + 1) as u16);
            }
        }
    }
    out
}

/// «COM12» → 12
pub fn com_number(name: &str) -> Option<u16> {
    let n = name.trim();
    if n.len() > 3 && n[..3].eq_ignore_ascii_case("COM") { n[3..].parse().ok().filter(|v| *v > 0) } else { None }
}

/// XML 글자 되돌리기(&amp; &lt; &gt; &quot; &apos;)
pub fn xml_unescape(s: &str) -> String {
    s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&")
}

/// 이벤트 XML 에서 꺼낸 것
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawEvent {
    pub id: u32,
    pub provider: String,
    /// «2026-10-19T02:07:35.5535599Z»
    pub time: String,
    pub level: u8,
    /// EventData·UserData 안의 값(이름, 값) — XML 글자는 되돌린 것
    pub data: Vec<(String, String)>,
}

/// 속성 값 «Name='x'» 또는 «Name="x"»
fn attr<'a>(tag: &'a str, name: &str) -> Option<&'a str> {
    let key = format!("{name}=");
    let i = tag.find(&key)? + key.len();
    let q = tag[i..].chars().next()?;
    if q != '\'' && q != '"' {
        return None;
    }
    let rest = &tag[i + 1..];
    let j = rest.find(q)?;
    Some(&rest[..j])
}

/// <Tag ...>값</Tag> 의 값(처음 것)
fn element<'a>(xml: &'a str, tag: &str) -> Option<&'a str> {
    let open = format!("<{tag}");
    let mut from = 0;
    while let Some(i) = xml[from..].find(&open) {
        let s = from + i;
        let after = &xml[s + open.len()..];
        // <EventID> 와 <EventIDx> 를 가린다
        if after.starts_with('>') || after.starts_with(' ') {
            let gt = after.find('>')?;
            if after[..gt].ends_with('/') {
                return Some("");
            }
            let body = &after[gt + 1..];
            let end = body.find(&format!("</{tag}>"))?;
            return Some(&body[..end]);
        }
        from = s + open.len();
    }
    None
}

/// EvtRender(EvtRenderEventXml) 가 준 XML → RawEvent. 모양이 다르면 None
pub fn parse_event_xml(xml: &str) -> Option<RawEvent> {
    let id: u32 = element(xml, "EventID")?.trim().parse().ok()?;
    let prov_at = xml.find("<Provider ")?;
    let prov_tag = &xml[prov_at..prov_at + xml[prov_at..].find('>')?];
    let provider = attr(prov_tag, "Name").unwrap_or("").to_string();
    let tc_at = xml.find("<TimeCreated ")?;
    let tc_tag = &xml[tc_at..tc_at + xml[tc_at..].find('>')?];
    let time = attr(tc_tag, "SystemTime")?.to_string();
    let level = element(xml, "Level").and_then(|l| l.trim().parse().ok()).unwrap_or(0);
    let mut data = Vec::new();
    // EventData: <Data Name='x'>v</Data>
    let mut rest = xml;
    while let Some(i) = rest.find("<Data") {
        let r = &rest[i..];
        let Some(gt) = r.find('>') else { break };
        let tag = &r[..gt];
        if tag.ends_with('/') {
            rest = &r[gt..];
            continue;
        }
        let body = &r[gt + 1..];
        let Some(end) = body.find("</Data>") else { break };
        let name = attr(tag, "Name").unwrap_or("").to_string();
        data.push((name, xml_unescape(&body[..end])));
        rest = &body[end..];
    }
    // UserData: <UserData><X xmlns=..><Name>v</Name>…</X></UserData> — 안쪽 단순 원소만
    if let Some(u) = element(xml, "UserData") {
        let inner = u.find('>').map(|g| &u[g + 1..]).unwrap_or("");
        let mut r = inner;
        while let Some(i) = r.find('<') {
            let t = &r[i + 1..];
            if let Some(close) = t.strip_prefix('/') {
                r = close;
                continue;
            }
            let Some(gt) = t.find('>') else { break };
            let name = t[..gt].split_whitespace().next().unwrap_or("").trim_end_matches('/').to_string();
            let body = &t[gt + 1..];
            if let Some(end) = body.find(&format!("</{name}>"))
                && !body[..end].contains('<')
            {
                data.push((name.clone(), xml_unescape(&body[..end])));
                r = &body[end..];
            } else {
                r = body;
            }
        }
    }
    Some(RawEvent { id, provider, time, level, data })
}

/// 이 이벤트가 이 장치(들) 것인지 — 인스턴스 ID 를 대소문자 무시하고 비교(값 전체가 같거나, 값 안에 «\ID» 경로로 들어 있으면)
pub fn event_matches(ev: &RawEvent, ids: &[String]) -> bool {
    ev.data.iter().any(|(_, v)| {
        let v = v.trim();
        ids.iter().any(|id| !id.is_empty() && v.eq_ignore_ascii_case(id))
    })
}

/// ISO 시각(«2026-10-19T02:07:35.5535599Z») → 유닉스 밀리초
pub fn iso_ms(s: &str) -> Option<u64> {
    let t = chrono::DateTime::parse_from_rfc3339(s.trim()).ok()?;
    u64::try_from(t.timestamp_millis()).ok()
}

/// 이벤트 ID → 어떤 일인지(화면 아이콘·거르기용). Kernel-PnP/Configuration 과 UserPnp 의 자주 보이는 번호만
pub fn event_kind(provider: &str, id: u32) -> &'static str {
    let p = provider.to_ascii_lowercase();
    if p.contains("userpnp") {
        return match id {
            20001 | 20003 => "install",
            _ => "other",
        };
    }
    match id {
        400 | 430 => "install",
        410 => "start",
        411 | 401 => "problem",
        420 => "delete",
        _ => "other",
    }
}

/// Device Parameters 값 풀이 — 공개 문서로 확인된 이름만(나머지는 원문 그대로 보인다)
pub fn param_note(name: &str, value: Option<u32>) -> Option<Text> {
    match name {
        // FTDI 지식베이스·AN232B-04: 지연 타이머 1~255ms, 기본 16ms
        "LatencyTimer" => Some(match value {
            Some(16) => text(
                "FTDI 지연 타이머(ms). 기본값 16 — 버퍼가 차지 않으면 최대 16ms 모았다가 PC 로 보냅니다. 짧은 응답을 빨리 주고받아야 하면 줄이는 것을 검토합니다.",
                "FTDI latency timer (ms). Default 16 — unless the buffer fills, data waits up to 16 ms before going to the PC. Consider lowering it for fast short request/response traffic.",
            ),
            Some(v) => text(&format!("FTDI 지연 타이머(ms) — 지금 {v}. 기본값은 16, 범위 1~255."), &format!("FTDI latency timer (ms) — now {v}. Default 16, range 1–255.")),
            None => text("FTDI 지연 타이머(ms). 기본값 16, 범위 1~255.", "FTDI latency timer (ms). Default 16, range 1–255."),
        }),
        "PortName" => Some(text("이 장치에 붙은 COM 이름", "The COM name assigned to this device")),
        _ => None,
    }
}

/// «9600,n,8,1» 처럼 Ports 키의 포트 기본값 → 사람이 읽는 말(«9600 bps · 패리티 없음 · 8 비트 · 정지 1»)
pub fn port_default_note(v: &str) -> Option<Text> {
    let parts: Vec<&str> = v.split(',').map(str::trim).collect();
    if parts.len() < 4 {
        return None;
    }
    let (pk, pe) = match parts[1].to_ascii_lowercase().as_str() {
        "n" => ("패리티 없음", "no parity"),
        "e" => ("짝수 패리티", "even parity"),
        "o" => ("홀수 패리티", "odd parity"),
        "m" => ("마크 패리티", "mark parity"),
        "s" => ("스페이스 패리티", "space parity"),
        _ => return None,
    };
    Some(text(
        &format!("{} bps · {pk} · {} 비트 · 정지 {}", parts[0], parts[2], parts[3]),
        &format!("{} bps · {pe} · {} data bits · {} stop", parts[0], parts[2], parts[3]),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filetime_to_ms() {
        // 2026-10-17T00:00:00Z = 1792195200000 ms
        let ft = 116_444_736_000_000_000u64 + 1_792_195_200_000u64 * 10_000;
        assert_eq!(filetime_ms(ft), Some(1_792_195_200_000));
        assert_eq!(filetime_ms(0), None);
    }

    #[test]
    fn comdb_bits() {
        // COM1, COM3 예약 (0b0000_0101), COM9 (다음 바이트 첫 비트), COM256(마지막 비트)
        let mut b = vec![0u8; 32];
        b[0] = 0b0000_0101;
        b[1] = 0b0000_0001;
        b[31] = 0b1000_0000;
        assert_eq!(comdb_numbers(&b), vec![1, 3, 9, 256]);
        assert!(comdb_numbers(&[]).is_empty());
        assert_eq!(com_number("COM12"), Some(12));
        assert_eq!(com_number("com3"), Some(3));
        assert_eq!(com_number("COM"), None);
        assert_eq!(com_number("LPT1"), None);
        assert_eq!(com_number("COM0"), None);
    }

    #[test]
    fn event_xml_kernel_pnp() {
        let x = "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'><System><Provider Name='Microsoft-Windows-Kernel-PnP' Guid='{9c205a39-1250-487d-abd7-e831c6290539}'/><EventID>410</EventID><Version>0</Version><Level>4</Level><TimeCreated SystemTime='2026-10-19T02:07:35.5535599Z'/><EventRecordID>2828</EventRecordID></System><EventData><Data Name='DeviceInstanceId'>USB\\VID_0403&amp;PID_6001\\A12345</Data><Data Name='DriverName'>ftdiport.inf</Data><Data Name='Problem'>0x0</Data><Data Name='ServiceName'></Data></EventData></Event>";
        let e = parse_event_xml(x).unwrap();
        assert_eq!(e.id, 410);
        assert_eq!(e.provider, "Microsoft-Windows-Kernel-PnP");
        assert_eq!(e.time, "2026-10-19T02:07:35.5535599Z");
        assert_eq!(e.level, 4);
        assert_eq!(e.data[0], ("DeviceInstanceId".into(), r"USB\VID_0403&PID_6001\A12345".into()));
        assert_eq!(e.data[3], ("ServiceName".into(), String::new()));
        assert!(event_matches(&e, &[r"usb\vid_0403&pid_6001\a12345".into()]));
        assert!(!event_matches(&e, &[r"USB\VID_0403&PID_6001\OTHER".into()]));
        assert!(!event_matches(&e, &[String::new()]));
        assert_eq!(event_kind(&e.provider, e.id), "start");
        assert_eq!(iso_ms(&e.time), Some(1_792_375_655_553));
    }

    #[test]
    fn event_xml_userpnp() {
        let x = "<Event xmlns='x'><System><Provider Name='Microsoft-Windows-UserPnp' Guid='{9}'/><EventID>20003</EventID><Level>4</Level><TimeCreated SystemTime='2026-06-05T22:05:40.8522353Z'/></System><UserData><AddServiceID xmlns='http://manifests.microsoft.com/win/2004/08/windows/userpnp'><ServiceName>FTSER2K</ServiceName><DeviceInstanceID>FTDIBUS\\VID_0403+PID_6001+A1&amp;B\\0000</DeviceInstanceID><PrimaryService>true</PrimaryService></AddServiceID></UserData></Event>";
        let e = parse_event_xml(x).unwrap();
        assert_eq!(e.id, 20003);
        assert!(e.data.contains(&("ServiceName".into(), "FTSER2K".into())));
        assert!(event_matches(&e, &[r"FTDIBUS\VID_0403+PID_6001+A1&B\0000".into()]));
        assert_eq!(event_kind(&e.provider, e.id), "install");
        assert!(parse_event_xml("<Event/>").is_none());
    }

    #[test]
    fn notes() {
        assert!(param_note("LatencyTimer", Some(16)).unwrap().en.contains("Default 16"));
        assert!(param_note("LatencyTimer", Some(2)).unwrap().ko.contains("지금 2"));
        assert!(param_note("SomethingElse", Some(1)).is_none());
        assert_eq!(port_default_note("9600,n,8,1").unwrap().en, "9600 bps · no parity · 8 data bits · 1 stop");
        assert!(port_default_note("9600").is_none());
        assert!(port_default_note("9600,x,8,1").is_none());
        assert_eq!(xml_unescape("a&amp;b&lt;c"), "a&b<c");
    }
}
