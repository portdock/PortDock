//! 송신 문자열 → 바이트. HEX 는 «01 03 0A», «01030A», «0x01,0x03» 모두 받는다.
//! ASCII 는 \r \n \t \0 \\ \xNN 이스케이프를 푼다.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextMode {
    Hex,
    Ascii,
}

/// 보낼 것: 본문 + 체크섬 + 끝 문자
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendSpec {
    pub text: String,
    pub mode: TextMode,
    pub checksum: Option<crate::checksum::ChecksumKind>,
    /// 체크섬 뒤에 붙일 끝 문자(ASCII 이스케이프, 예: "\\r\\n")
    #[serde(default)]
    pub suffix: String,
}

pub fn build(spec: &SendSpec) -> Result<Vec<u8>, String> {
    let mut bytes = parse(&spec.text, spec.mode)?;
    if let Some(k) = spec.checksum {
        let c = k.compute(&bytes);
        bytes.extend(c);
    }
    bytes.extend(parse_ascii(&spec.suffix)?);
    Ok(bytes)
}

pub fn parse(text: &str, mode: TextMode) -> Result<Vec<u8>, String> {
    match mode {
        TextMode::Hex => parse_hex(text),
        TextMode::Ascii => parse_ascii(text),
    }
}

pub fn parse_hex(text: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    for token in text.split(|c: char| c.is_whitespace() || c == ',' || c == ';' || c == '-') {
        let t = token.trim_start_matches("0x").trim_start_matches("0X");
        if t.is_empty() {
            continue;
        }
        if t.len() % 2 != 0 {
            return Err(format!("HEX 자릿수가 홀수입니다: «{token}»"));
        }
        for i in (0..t.len()).step_by(2) {
            let pair = &t[i..i + 2];
            let b = u8::from_str_radix(pair, 16).map_err(|_| format!("HEX 가 아닌 글자: «{pair}»"))?;
            out.push(b);
        }
    }
    Ok(out)
}

pub fn parse_ascii(text: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '\\' {
            let mut buf = [0u8; 4];
            out.extend_from_slice(c.encode_utf8(&mut buf).as_bytes());
            continue;
        }
        match chars.next() {
            Some('r') => out.push(b'\r'),
            Some('n') => out.push(b'\n'),
            Some('t') => out.push(b'\t'),
            Some('0') => out.push(0),
            Some('\\') => out.push(b'\\'),
            Some('x') => {
                let hi = chars.next();
                let lo = chars.next();
                let s: String = [hi, lo].iter().flatten().collect();
                let b = u8::from_str_radix(&s, 16).map_err(|_| format!("잘못된 \\x 이스케이프: «\\x{s}»"))?;
                out.push(b);
            }
            Some(other) => return Err(format!("모르는 이스케이프: «\\{other}»")),
            None => out.push(b'\\'),
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_formats() {
        let want = vec![0x01, 0x03, 0x0A];
        assert_eq!(parse_hex("01 03 0A").unwrap(), want);
        assert_eq!(parse_hex("01030a").unwrap(), want);
        assert_eq!(parse_hex("0x01,0x03,0x0A").unwrap(), want);
        assert!(parse_hex("013").is_err());
        assert!(parse_hex("0G").is_err());
        assert_eq!(parse_hex("  ").unwrap(), Vec::<u8>::new());
    }

    #[test]
    fn ascii_escapes() {
        assert_eq!(parse_ascii("AT\\r\\n").unwrap(), b"AT\r\n".to_vec());
        assert_eq!(parse_ascii("\\x02DATA\\x03").unwrap(), b"\x02DATA\x03".to_vec());
        assert_eq!(parse_ascii("a\\\\b").unwrap(), b"a\\b".to_vec());
        assert!(parse_ascii("\\q").is_err());
        assert_eq!(parse_ascii("한").unwrap(), "한".as_bytes().to_vec());
    }
}
