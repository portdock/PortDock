//! MAC 주소 → 제조사. IEEE Registration Authority 공개 목록(MA-L, 2026-10-18 받음)을 줄여 넣은 표 — `data/make_oui.mjs` 로 만든다.
//!  - `oui_names.txt`: 짧은 제조사 이름, 한 줄에 하나
//!  - `oui_index.bin`: OUI 순으로 5바이트씩(OUI 3바이트 큰 쪽 먼저 + 이름 줄 번호 u16 작은 쪽 먼저)

use std::sync::OnceLock;

static NAMES_TXT: &str = include_str!("../data/oui_names.txt");
static INDEX: &[u8] = include_bytes!("../data/oui_index.bin");

fn names() -> &'static [&'static str] {
    static N: OnceLock<Vec<&'static str>> = OnceLock::new();
    N.get_or_init(|| NAMES_TXT.lines().collect())
}

fn entry(i: usize) -> (u32, u16) {
    let b = &INDEX[i * 5..i * 5 + 5];
    ((u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]), u16::from_le_bytes([b[3], b[4]]))
}

/// 표에 든 OUI 수
pub fn len() -> usize {
    INDEX.len() / 5
}

/// 앞 3바이트로 제조사 찾기. 임의(로컬 관리) MAC 이면 없음
pub fn vendor(mac: &[u8; 6]) -> Option<&'static str> {
    if is_local(mac) {
        return None;
    }
    let key = (u32::from(mac[0]) << 16) | (u32::from(mac[1]) << 8) | u32::from(mac[2]);
    let (mut lo, mut hi) = (0usize, len());
    while lo < hi {
        let mid = (lo + hi) / 2;
        let (k, n) = entry(mid);
        match k.cmp(&key) {
            std::cmp::Ordering::Less => lo = mid + 1,
            std::cmp::Ordering::Greater => hi = mid,
            std::cmp::Ordering::Equal => return names().get(usize::from(n)).copied(),
        }
    }
    None
}

/// 로컬 관리(임의) MAC — 휴대폰·가상 머신이 흔히 쓴다. 제조사를 알 수 없다
pub fn is_local(mac: &[u8; 6]) -> bool {
    mac[0] & 0x02 != 0
}

/// «00:1B:1B:12:34:56»
pub fn fmt_mac(mac: &[u8; 6]) -> String {
    mac.iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(":")
}

/// «00:1b:1b:12:34:56», «00-1B-1B-12-34-56», «001B.1B12.3456», «001B1B123456» 모두 받는다
pub fn parse_mac(text: &str) -> Option<[u8; 6]> {
    let hex: String = text.chars().filter(|c| !matches!(c, ':' | '-' | '.' | ' ')).collect();
    if hex.len() != 12 || !hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let mut out = [0u8; 6];
    for (i, o) in out.iter_mut().enumerate() {
        *o = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).ok()?;
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn table_is_sorted_and_names_resolve() {
        assert!(len() > 30_000, "OUI 표가 너무 작습니다: {}", len());
        let n = names().len();
        let mut prev = None;
        for i in 0..len() {
            let (k, name) = entry(i);
            assert!(prev.is_none_or(|p| p < k), "정렬되지 않음: {i}");
            assert!(usize::from(name) < n);
            prev = Some(k);
        }
    }

    #[test]
    fn known_vendors() {
        // 00:00:0C — Cisco(가장 오래된 OUI 가운데 하나)
        assert_eq!(vendor(&[0x00, 0x00, 0x0C, 1, 2, 3]), Some("Cisco Systems"));
        // 00:1B:1B — Siemens
        assert!(vendor(&[0x00, 0x1B, 0x1B, 0, 0, 0]).is_some_and(|v| v.to_lowercase().contains("siemens")));
        // 표에 없는 값
        assert_eq!(vendor(&[0xFC, 0xFF, 0xFF, 0, 0, 0]), None);
    }

    #[test]
    fn local_mac_has_no_vendor() {
        assert!(is_local(&[0x02, 0, 0x0C, 0, 0, 0]));
        assert!(is_local(&[0xDA, 0xA1, 0x19, 0, 0, 0]));
        assert_eq!(vendor(&[0x02, 0x00, 0x0C, 1, 2, 3]), None);
        assert!(!is_local(&[0x00, 0x00, 0x0C, 0, 0, 0]));
    }

    #[test]
    fn mac_format_and_parse() {
        let m = [0x00, 0x1b, 0x1b, 0x12, 0xab, 0x0f];
        assert_eq!(fmt_mac(&m), "00:1B:1B:12:AB:0F");
        for s in ["00:1b:1b:12:ab:0f", "00-1B-1B-12-AB-0F", "001B.1B12.AB0F", "001B1B12AB0F", " 00 1B 1B 12 AB 0F "] {
            assert_eq!(parse_mac(s), Some(m), "{s}");
        }
        for s in ["", "00:1B:1B:12:AB", "00:1B:1B:12:AB:0F:00", "GG:1B:1B:12:AB:0F", "001B1B12AB0"] {
            assert_eq!(parse_mac(s), None, "{s}");
        }
    }
}
