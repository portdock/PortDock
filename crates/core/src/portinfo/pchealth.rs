//! (0.10.0) 이 PC 점검의 «블루스크린·갑자기 꺼짐 · 저장장치 수명 · 깨운 원인» 과 USB 연결 기록에 쓰는 순수 함수(운영체제 호출 없음 — 단위 시험).
//! 읽는 곳은 pc.rs·disk.rs·usblive.rs. 여기서는 받은 바이트·이벤트를 풀기만 한다.

use super::parse::{RawEvent, file_name, iso_ms};
use super::{DiskHealth, PcCrash, PcWake};

/// 돌려줄 블루스크린·꺼짐 기록 최대 건수
pub const PC_CRASH_KEEP: usize = 50;
/// 돌려줄 깨어남 기록 최대 건수
pub const PC_WAKE_KEEP: usize = 20;

// ---------------------------------------------------------------- 블루스크린·갑자기 꺼짐

/// System 로그 XPath — 최근 `days` 일의 1001(WER-SystemErrorReporting, 버그체크)·Kernel-Power 41·EventLog 6008
pub fn crash_query(days: u32) -> String {
    let ms = u64::from(days) * 86_400_000;
    format!(
        "*[System[((Provider[@Name='Microsoft-Windows-WER-SystemErrorReporting'] and EventID=1001) or (Provider[@Name='Microsoft-Windows-Kernel-Power'] and EventID=41) or (Provider[@Name='EventLog'] and EventID=6008)) and TimeCreated[timediff(@SystemTime) <= {ms}]]]"
    )
}

/// «0x00000050 (0xffff…, 0x0, …)» → (정지 코드, 매개변수 글). 앞이 16진 수가 아니면 None
pub fn bugcheck_text(s: &str) -> Option<(u32, Option<String>)> {
    let s = s.trim();
    let (head, rest) = match s.find(' ') {
        Some(i) => (&s[..i], s[i..].trim()),
        None => (s, ""),
    };
    let code = u32::from_str_radix(head.trim_start_matches("0x").trim_start_matches("0X"), 16).ok()?;
    let params = rest.strip_prefix('(').and_then(|r| r.strip_suffix(')')).map(|p| p.trim().to_string()).filter(|p| !p.is_empty());
    Some((code, params))
}

fn data<'a>(ev: &'a RawEvent, name: &str) -> Option<&'a str> {
    ev.data.iter().find(|(k, _)| k == name).map(|(_, v)| v.trim())
}

/// 이벤트 하나 → 기록 한 건. 다른 이벤트면 None
pub fn crash_from_event(ev: &RawEvent) -> Option<PcCrash> {
    let time = iso_ms(&ev.time).unwrap_or(0);
    let base = PcCrash { time, kind: "", code: None, params: None, dump: None, power_button: false };
    match (ev.provider.as_str(), ev.id) {
        ("Microsoft-Windows-WER-SystemErrorReporting", 1001) => {
            // param1 = «0x… (…)», param2 = 덤프 경로(파일 이름만 남긴다)
            let p1 = data(ev, "param1").or_else(|| ev.data.first().map(|(_, v)| v.as_str()))?;
            let (code, params) = bugcheck_text(p1)?;
            let dump = data(ev, "param2").or_else(|| ev.data.get(1).map(|(_, v)| v.as_str())).map(file_name).filter(|s| !s.is_empty());
            Some(PcCrash { kind: "bugcheck", code: Some(code), params, dump, ..base })
        }
        ("Microsoft-Windows-Kernel-Power", 41) => {
            let code = data(ev, "BugcheckCode").and_then(|v| v.parse::<u32>().ok()).filter(|c| *c != 0);
            let pb = data(ev, "PowerButtonTimestamp").is_some_and(|v| v != "0" && !v.is_empty()) || data(ev, "LongPowerButtonPressDetected").is_some_and(|v| v.eq_ignore_ascii_case("true"));
            Some(PcCrash { kind: "kernelPower", code, power_button: pb, ..base })
        }
        ("EventLog", 6008) => Some(PcCrash { kind: "unexpected", ..base }),
        _ => None,
    }
}

// ---------------------------------------------------------------- 깨운 원인

/// System 로그 XPath — 최근 `days` 일의 Power-Troubleshooter 1(절전에서 돌아옴)
pub fn wake_query(days: u32) -> String {
    let ms = u64::from(days) * 86_400_000;
    format!("*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1 and TimeCreated[timediff(@SystemTime) <= {ms}]]]")
}

/// Windows 문구(PC 언어)의 마지막 «이름: 값» 줄의 값 — Power-Troubleshooter 1 은 «Wake Source: Power Button» 이 끝 줄이다.
/// 시각 앞뒤의 방향 표시 글자(U+200E·U+200F)는 지운다
pub fn message_last_value(msg: &str) -> Option<String> {
    let clean: String = msg.chars().filter(|c| !matches!(c, '\u{200e}' | '\u{200f}')).collect();
    let line = clean.lines().map(str::trim).rfind(|l| l.contains(':') || l.contains('：'))?;
    let i = line.find([':', '：'])?;
    let sep = line[i..].chars().next()?.len_utf8();
    Some(line[i + sep..].trim().to_string()).filter(|s| !s.is_empty())
}

/// Power-Troubleshooter 1 → 깨어남 한 건. `message` = Windows 문구(못 만들면 None)
pub fn wake_from_event(ev: &RawEvent, message: Option<&str>) -> PcWake {
    let nonempty = |v: Option<&str>| v.map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);
    PcWake {
        time: data(ev, "WakeTime").and_then(iso_ms).or_else(|| iso_ms(&ev.time)).unwrap_or(0),
        sleep_time: data(ev, "SleepTime").and_then(iso_ms),
        source: message.and_then(message_last_value),
        source_type: data(ev, "WakeSourceType").and_then(|v| v.parse().ok()),
        device: nonempty(data(ev, "WakeSourceText")),
        // 타이머 주인은 실행 파일 경로일 수 있다 — 사용자 폴더가 남지 않게 파일 이름만
        timer_owner: nonempty(data(ev, "WakeTimerOwner")).map(|p| file_name(&p)).filter(|s| !s.is_empty()),
    }
}

// ---------------------------------------------------------------- 저장장치

/// STORAGE_BUS_TYPE → «nvme» · «sata» · «usb» · «other»
pub fn bus_kind(n: u32) -> &'static str {
    match n {
        17 => "nvme",
        3 | 11 => "sata",
        7 => "usb",
        _ => "other",
    }
}

/// STORAGE_PROPERTY_QUERY(StorageDeviceProtocolSpecificProperty = 50, PropertyStandardQuery) + STORAGE_PROTOCOL_SPECIFIC_DATA 를 바이트로.
/// `protocol` 2 = ATA · 3 = NVMe, `data_type` 2 = 로그 페이지, `value` = 로그 번호, `sub` = 페이지(ATA) — 뒤에 `len` 바이트 받을 자리
pub fn protocol_query(protocol: u32, data_type: u32, value: u32, sub: u32, len: u32) -> Vec<u8> {
    let mut b = Vec::with_capacity(48 + len as usize);
    for v in [50u32, 0, protocol, data_type, value, sub, 40, len, 0, 0, 0, 0] {
        b.extend_from_slice(&v.to_le_bytes());
    }
    b.resize(48 + len as usize, 0);
    b
}

fn u32_at(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(at..at + 4)?.try_into().ok()?))
}

fn u64_at(b: &[u8], at: usize) -> Option<u64> {
    Some(u64::from_le_bytes(b.get(at..at + 8)?.try_into().ok()?))
}

/// NVMe 의 128비트 카운터 — 아래 64비트만(위가 0 이 아니면 u64::MAX)
fn u128_low(b: &[u8], at: usize) -> Option<u64> {
    let lo = u64_at(b, at)?;
    let hi = u64_at(b, at + 8)?;
    Some(if hi != 0 { u64::MAX } else { lo })
}

/// STORAGE_PROTOCOL_DATA_DESCRIPTOR(Version·Size + STORAGE_PROTOCOL_SPECIFIC_DATA) → 그 뒤의 로그 바이트
pub fn protocol_reply(out: &[u8]) -> Option<&[u8]> {
    let off = u32_at(out, 8 + 16)? as usize;
    let len = u32_at(out, 8 + 20)? as usize;
    out.get(8 + off..8 + off + len).filter(|d| !d.is_empty())
}

/// NVMe SMART / Health Information 로그(0x02, 512 바이트) → 상태. 짧으면 None
pub fn nvme_health(log: &[u8]) -> Option<DiskHealth> {
    if log.len() < 192 {
        return None;
    }
    let kelvin = u16::from_le_bytes([log[1], log[2]]);
    Some(DiskHealth {
        critical_warning: Some(log[0]),
        temperature_c: (kelvin > 0).then(|| i32::from(kelvin) - 273),
        available_spare: Some(u32::from(log[3])),
        spare_threshold: Some(u32::from(log[4])),
        percentage_used: Some(u32::from(log[5])),
        // 데이터 단위 = 512 바이트 × 1000
        written_gb: u128_low(log, 48).map(|u| u.saturating_mul(512_000) / 1_000_000_000),
        power_cycles: u128_low(log, 112),
        power_on_hours: u128_low(log, 128),
        unsafe_shutdowns: u128_low(log, 144),
        media_errors: u128_low(log, 160),
    })
}

/// ATA 장치 통계(로그 0x04) 페이지의 값 하나 — 비트 63 «지원» · 62 «유효» 가 켜졌을 때 아래 48비트
pub fn ata_stat(page: &[u8], offset: usize) -> Option<u64> {
    let q = u64_at(page, offset)?;
    (q >> 63 == 1 && (q >> 62) & 1 == 1).then_some(q & 0xFFFF_FFFF_FFFF)
}

/// ATA 장치 통계 페이지들 → 상태. 1 = 일반(전원 켠 횟수 8 · 시간 16 · 쓴 섹터 24), 4 = 오류(정정 못 한 오류 8),
/// 5 = 온도(지금 온도 8, 부호 있는 바이트), 7 = SSD(사용률 8). 아무 값도 없으면 None
pub fn ata_health(general: Option<&[u8]>, errors: Option<&[u8]>, temp: Option<&[u8]>, ssd: Option<&[u8]>) -> Option<DiskHealth> {
    let h = DiskHealth {
        power_cycles: general.and_then(|p| ata_stat(p, 8)),
        power_on_hours: general.and_then(|p| ata_stat(p, 16)),
        written_gb: general.and_then(|p| ata_stat(p, 24)).map(|s| s.saturating_mul(512) / 1_000_000_000),
        media_errors: errors.and_then(|p| ata_stat(p, 8)),
        temperature_c: temp.and_then(|p| ata_stat(p, 8)).map(|v| i32::from(v as u8 as i8)),
        percentage_used: ssd.and_then(|p| ata_stat(p, 8)).map(|v| (v & 0xFF) as u32),
        ..Default::default()
    };
    (h != DiskHealth::default()).then_some(h)
}

// ---------------------------------------------------------------- USB

/// 장치 인터페이스 경로(«\\?\USB#VID_046D&PID_C52B#5&1a2b&0&3#{a5dcbf10-…}») → 장치 인스턴스 ID(«USB\VID_046D&PID_C52B\5&1a2b&0&3»).
/// 모양이 다르면 None
pub fn interface_instance_id(sym: &str) -> Option<String> {
    let s = sym.trim().trim_end_matches('\0');
    let s = s.strip_prefix(r"\\?\").or_else(|| s.strip_prefix(r"\??\")).or_else(|| s.strip_prefix(r"\\.\"))?;
    let (dev, guid) = s.rsplit_once('#')?;
    if !guid.starts_with('{') || dev.is_empty() {
        return None;
    }
    Some(dev.replace('#', "\\"))
}

/// «USB\VID_046D&PID_C52B\…» → (VID, PID)
pub fn usb_vid_pid(id: &str) -> (Option<u16>, Option<u16>) {
    let u = id.to_ascii_uppercase();
    let num = |key: &str| u.find(key).and_then(|i| u.get(i + key.len()..i + key.len() + 4)).and_then(|h| u16::from_str_radix(h, 16).ok());
    (num("VID_"), num("PID_"))
}

/// 장치 노드인지 — «USB\VID_…» 이고 복합 장치의 인터페이스(«&MI_»)가 아님
pub fn is_usb_device_node(id: &str) -> bool {
    let u = id.to_ascii_uppercase();
    u.starts_with(r"USB\VID_") && !u.split('\\').nth(1).is_some_and(|hw| hw.contains("&MI_"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::parse::parse_event_xml;

    fn ev(xml_data: &str, provider: &str, id: u32) -> RawEvent {
        let x = format!(
            "<Event><System><Provider Name='{provider}'/><EventID>{id}</EventID><Level>2</Level><TimeCreated SystemTime='2026-10-16T15:23:24.7622826Z'/><Computer>EXAMPLE-PC</Computer></System><EventData>{xml_data}</EventData></Event>"
        );
        parse_event_xml(&x).unwrap()
    }

    #[test]
    fn bugcheck_events() {
        assert_eq!(bugcheck_text("0x00000050 (0xffffa78bbcf8c000, 0x0000000000000000, 0xfffff8002c749259, 0x0000000000000002)").unwrap().0, 0x50);
        assert_eq!(bugcheck_text("0x00000124 (0x0, 0x1, 0x2, 0x3)").unwrap().1.as_deref(), Some("0x0, 0x1, 0x2, 0x3"));
        assert_eq!(bugcheck_text("0x0000009f"), Some((0x9f, None)));
        assert!(bugcheck_text("not a code").is_none());
        // 실제 1001 모양(예시 값) — 덤프는 파일 이름만, 컴퓨터 이름은 남지 않는다
        let e = ev(
            "<Data Name='param1'>0x00000050 (0xffffa78bbcf8c000, 0x0000000000000000, 0xfffff8002c749259, 0x0000000000000002)</Data><Data Name='param2'>C:\\WINDOWS\\MEMORY.DMP</Data><Data Name='param3'>00000000-0000-0000-0000-000000000001</Data>",
            "Microsoft-Windows-WER-SystemErrorReporting",
            1001,
        );
        let c = crash_from_event(&e).unwrap();
        assert_eq!((c.kind, c.code, c.dump.as_deref(), c.time), ("bugcheck", Some(0x50), Some("MEMORY.DMP"), 1_792_164_204_762));
        assert!(c.params.as_deref().unwrap().starts_with("0xffffa78bbcf8c000"));
        assert!(!format!("{c:?}").contains("EXAMPLE-PC"));
        // 41 — BugcheckCode 는 십진수, 0 이면 없음, 전원 버튼
        let k = ev("<Data Name='BugcheckCode'>80</Data><Data Name='PowerButtonTimestamp'>0</Data><Data Name='LongPowerButtonPressDetected'>false</Data>", "Microsoft-Windows-Kernel-Power", 41);
        let k = crash_from_event(&k).unwrap();
        assert_eq!((k.kind, k.code, k.power_button), ("kernelPower", Some(0x50), false));
        let k = ev("<Data Name='BugcheckCode'>0</Data><Data Name='PowerButtonTimestamp'>133000000000000000</Data>", "Microsoft-Windows-Kernel-Power", 41);
        let k = crash_from_event(&k).unwrap();
        assert_eq!((k.code, k.power_button), (None, true));
        let k = ev("<Data Name='BugcheckCode'>0</Data><Data Name='LongPowerButtonPressDetected'>true</Data>", "Microsoft-Windows-Kernel-Power", 41);
        assert!(crash_from_event(&k).unwrap().power_button);
        // 6008 — 이름 없는 Data
        let u = ev("<Data>오후 11:47:58</Data><Data>2026-10-16</Data>", "EventLog", 6008);
        assert_eq!(crash_from_event(&u).unwrap().kind, "unexpected");
        assert!(crash_from_event(&ev("", "EventLog", 6005)).is_none());
        let q = crash_query(7);
        assert!(q.contains("EventID=1001") && q.contains("EventID=41") && q.contains("EventID=6008") && q.contains("<= 604800000"));
    }

    #[test]
    fn wake_events() {
        assert_eq!(message_last_value("The system has returned from a low power state.\r\n\r\nSleep Time: \u{200e}2026\u{200e}-\u{200e}06-11T01:05:22Z\r\n\r\nWake Source: Power Button").as_deref(), Some("Power Button"));
        assert_eq!(message_last_value("시스템이 저전력 상태에서 다시 시작되었습니다.\n\n절전 모드 해제 원본: 장치 -USB 입력 장치").as_deref(), Some("장치 -USB 입력 장치"));
        assert_eq!(message_last_value("no colon here"), None);
        let e = ev(
            "<Data Name='SleepTime'>2026-06-11T01:05:22.0739833Z</Data><Data Name='WakeTime'>2026-06-11T01:20:31.1611153Z</Data><Data Name='WakeSourceType'>5</Data><Data Name='WakeSourceText'></Data><Data Name='WakeTimerOwner'>\\Device\\HarddiskVolume3\\Users\\Example\\AppData\\Local\\app.exe</Data>",
            "Microsoft-Windows-Power-Troubleshooter",
            1,
        );
        let w = wake_from_event(&e, Some("…\nWake Source: Timer - app.exe"));
        assert_eq!((w.source_type, w.device.as_deref(), w.timer_owner.as_deref(), w.source.as_deref()), (Some(5), None, Some("app.exe"), Some("Timer - app.exe")));
        assert!(w.time > w.sleep_time.unwrap());
        // 사용자 폴더가 남지 않는다
        assert!(!format!("{w:?}").contains("Users"));
        assert!(wake_query(30).contains("Power-Troubleshooter") && wake_query(30).contains("EventID=1 "));
    }

    #[test]
    fn nvme_log() {
        // 예시 값: 경고 0, 315 K(42 °C), 예비 100%/10%, 사용률 11%, 쓴 단위 2,000,000, 켠 횟수 900, 4,516 시간, 안전하지 않은 종료 37, 미디어 오류 0
        let mut log = vec![0u8; 512];
        log[1..3].copy_from_slice(&315u16.to_le_bytes());
        log[3] = 100;
        log[4] = 10;
        log[5] = 11;
        log[48..56].copy_from_slice(&2_000_000u64.to_le_bytes());
        log[112..120].copy_from_slice(&900u64.to_le_bytes());
        log[128..136].copy_from_slice(&4_516u64.to_le_bytes());
        log[144..152].copy_from_slice(&37u64.to_le_bytes());
        let h = nvme_health(&log).unwrap();
        assert_eq!(
            (h.critical_warning, h.temperature_c, h.available_spare, h.spare_threshold, h.percentage_used, h.written_gb, h.power_cycles, h.power_on_hours, h.unsafe_shutdowns, h.media_errors),
            (Some(0), Some(42), Some(100), Some(10), Some(11), Some(1024), Some(900), Some(4516), Some(37), Some(0))
        );
        // 128비트 위쪽이 차 있으면 최대값
        log[136] = 1;
        assert_eq!(nvme_health(&log).unwrap().power_on_hours, Some(u64::MAX));
        assert!(nvme_health(&log[..100]).is_none());
        // 질의 바이트와 답 풀기
        let q = protocol_query(3, 2, 2, 0, 512);
        assert_eq!(q.len(), 560);
        assert_eq!(u32_at(&q, 0), Some(50));
        assert_eq!((u32_at(&q, 8), u32_at(&q, 12), u32_at(&q, 16), u32_at(&q, 24), u32_at(&q, 28)), (Some(3), Some(2), Some(2), Some(40), Some(512)));
        let mut out = vec![0u8; 560];
        out[8 + 16..8 + 20].copy_from_slice(&40u32.to_le_bytes());
        out[8 + 20..8 + 24].copy_from_slice(&512u32.to_le_bytes());
        out[48] = 7;
        let d = protocol_reply(&out).unwrap();
        assert_eq!((d.len(), d[0]), (512, 7));
        out[8 + 20..8 + 24].copy_from_slice(&4096u32.to_le_bytes());
        assert!(protocol_reply(&out).is_none());
        assert_eq!((bus_kind(17), bus_kind(11), bus_kind(7), bus_kind(8)), ("nvme", "sata", "usb", "other"));
    }

    #[test]
    fn ata_stats() {
        let stat = |v: u64| (v | (1 << 63) | (1 << 62)).to_le_bytes();
        let mut general = vec![0u8; 512];
        general[8..16].copy_from_slice(&stat(120));
        general[16..24].copy_from_slice(&stat(3_000));
        general[24..32].copy_from_slice(&stat(4_000_000_000));
        let mut temp = vec![0u8; 512];
        temp[8..16].copy_from_slice(&stat(0xFB)); // -5 °C
        let mut ssd = vec![0u8; 512];
        ssd[8..16].copy_from_slice(&stat(7));
        let errors = vec![0u8; 512]; // 지원 비트 없음 → 값 없음
        let h = ata_health(Some(&general), Some(&errors), Some(&temp), Some(&ssd)).unwrap();
        assert_eq!((h.power_cycles, h.power_on_hours, h.written_gb, h.temperature_c, h.percentage_used, h.media_errors), (Some(120), Some(3000), Some(2048), Some(-5), Some(7), None));
        // 유효 비트가 꺼진 값은 버린다
        let mut bad = vec![0u8; 16];
        bad[8..16].copy_from_slice(&(5u64 | (1 << 63)).to_le_bytes());
        assert_eq!(ata_stat(&bad, 8), None);
        assert!(ata_health(None, None, None, None).is_none());
    }

    #[test]
    fn usb_ids() {
        assert_eq!(interface_instance_id(r"\\?\USB#VID_046D&PID_C52B#5&1a2b3c&0&3#{a5dcbf10-6530-11d2-901f-00c04fb951ed}").as_deref(), Some(r"USB\VID_046D&PID_C52B\5&1a2b3c&0&3"));
        assert_eq!(interface_instance_id(r"\\?\scsi#disk&ven_nvme&prod_example#5&1&0&000000#{53f56307-b6bf-11d0-94f2-00a0c91efb8b}").as_deref(), Some(r"scsi\disk&ven_nvme&prod_example\5&1&0&000000"));
        assert_eq!(interface_instance_id("USB#VID_1#x#{g}"), None);
        assert_eq!(interface_instance_id(r"\\?\USB#VID_1#x"), None);
        assert_eq!(usb_vid_pid(r"USB\VID_046D&PID_C52B\5&1"), (Some(0x046d), Some(0xc52b)));
        assert_eq!(usb_vid_pid(r"USB\ROOT_HUB30\4&1"), (None, None));
        assert!(is_usb_device_node(r"USB\VID_046D&PID_C52B\5&1"));
        assert!(!is_usb_device_node(r"USB\VID_046D&PID_C52B&MI_00\6&1"));
        assert!(!is_usb_device_node(r"USB\ROOT_HUB30\4&1"));
        assert!(!is_usb_device_node(r"HID\VID_046D&PID_C52B\7&1"));
    }
}
