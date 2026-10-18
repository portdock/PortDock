//! 송신 문자열 → 바이트. HEX 는 «01 03 0A», «01030A», «0x01,0x03» 모두 받는다.
//! ASCII 는 \r \n \t \0 \\ \xNN 이스케이프를 풀고, 나머지 글자는 고른 인코딩(UTF-8·CP949·Latin-1·ASCII)으로 바꾼다.
//! 받은 바이트를 글자로 보일 때(`text_view`)도 같은 인코딩 규칙을 쓴다 — 화면(shared/format.ts)과 같은 모양.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextMode {
    Hex,
    Ascii,
}

/// 글자 인코딩 — ASCII 송신과 글자 보기에 쓴다. HEX 송신에는 상관없다
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum Encoding {
    #[default]
    #[serde(rename = "utf-8")]
    Utf8,
    /// 한국어 윈도우 코드 페이지 949(EUC-KR 의 확장)
    #[serde(rename = "cp949")]
    Cp949,
    /// ISO-8859-1 — 한 바이트 = 한 글자(U+0000~U+00FF)
    #[serde(rename = "latin1")]
    Latin1,
    /// 7비트 ASCII 만
    #[serde(rename = "ascii")]
    Ascii,
}

impl Encoding {
    pub fn name(self) -> &'static str {
        match self {
            Self::Utf8 => "utf-8",
            Self::Cp949 => "cp949",
            Self::Latin1 => "latin1",
            Self::Ascii => "ascii",
        }
    }

    /// 글자 하나 → 바이트. 이 인코딩에 없는 글자면 오류
    fn encode_char(self, c: char, out: &mut Vec<u8>) -> Result<(), String> {
        let bad = || {
            crate::tr!(
                format!("«{c}» (U+{:04X}) 는 {} 로 보낼 수 없습니다 — 인코딩을 바꾸거나 \\xNN 으로 쓰세요", c as u32, self.label()),
                format!("«{c}» (U+{:04X}) cannot be sent as {} — change the encoding or write it as \\xNN", c as u32, self.label())
            )
        };
        match self {
            Self::Utf8 => {
                let mut buf = [0u8; 4];
                out.extend_from_slice(c.encode_utf8(&mut buf).as_bytes());
            }
            Self::Ascii if c.is_ascii() => out.push(c as u8),
            Self::Latin1 if (c as u32) < 0x100 => out.push(c as u32 as u8),
            Self::Ascii | Self::Latin1 => return Err(bad()),
            Self::Cp949 => {
                if c.is_ascii() {
                    out.push(c as u8);
                } else {
                    let mut buf = [0u8; 4];
                    let (b, _, had_errors) = encoding_rs::EUC_KR.encode(c.encode_utf8(&mut buf));
                    if had_errors {
                        return Err(bad());
                    }
                    out.extend_from_slice(&b);
                }
            }
        }
        Ok(())
    }

    fn label(self) -> &'static str {
        match self {
            Self::Utf8 => "UTF-8",
            Self::Cp949 => "CP949(EUC-KR)",
            Self::Latin1 => "Latin-1",
            Self::Ascii => "ASCII",
        }
    }
}

/// 보낼 것: 본문 + 체크섬 + 끝 문자
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendSpec {
    pub text: String,
    pub mode: TextMode,
    /// 자리 옵션(앞 n 빼기·끝 m 앞에 넣기·뒤집기)과 범용 CRC 는 `ChecksumKind::Spec`
    pub checksum: Option<crate::checksum::ChecksumKind>,
    /// 체크섬 뒤에 붙일 끝 문자(ASCII 이스케이프, 예: "\\r\\n")
    #[serde(default)]
    pub suffix: String,
}

/// 화면이 보내는 모양 — SendSpec 에 글자 인코딩을 더한 것(JSON 은 같은 층에 `encoding`).
/// `encoding` 이 없으면 UTF-8(예전과 같음)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendText {
    #[serde(flatten)]
    pub spec: SendSpec,
    #[serde(default)]
    pub encoding: Encoding,
}

impl SendText {
    pub fn build(&self) -> Result<Vec<u8>, String> {
        build_with(&self.spec, self.encoding)
    }
}

/// 천천히 보내기 — 문자 사이·줄(조각) 사이 지연. 파일 보내기와 «문자 간 지연» 송신에 쓴다
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Pace {
    /// 바이트 사이 지연(ms). 0 이면 한꺼번에
    pub char_delay_ms: u32,
    /// 줄(또는 조각) 사이 지연(ms)
    pub line_delay_ms: u32,
    /// 줄 단위(LF·CR LF·홀로 CR 뒤에서 끊음). 아니면 `chunk` 바이트씩
    pub by_line: bool,
    /// 조각 크기(바이트). 0 이면 나누지 않음
    pub chunk: u32,
}

impl Pace {
    /// 화면 값이 지나치면 막는다(실수로 넣은 큰 지연이 몇 시간 동안 송신을 붙잡지 않게)
    pub fn validate(&self) -> Result<(), String> {
        if self.char_delay_ms > 10_000 || self.line_delay_ms > 600_000 {
            return Err(crate::tr!("지연이 너무 깁니다(문자 간 최대 10초, 줄 간 최대 10분)", "Delay too long (max 10 s between characters, 10 min between lines)").into());
        }
        Ok(())
    }

    /// 보낼 조각들(바이트 범위). 줄 단위면 줄 끝(LF, 또는 LF 가 뒤따르지 않는 CR)을 그 줄에 넣는다
    pub fn pieces(&self, bytes: &[u8]) -> Vec<std::ops::Range<usize>> {
        let mut out = Vec::new();
        if bytes.is_empty() {
            return out;
        }
        if self.by_line {
            let mut start = 0;
            for i in 0..bytes.len() {
                let end_of_line = bytes[i] == b'\n' || (bytes[i] == b'\r' && bytes.get(i + 1) != Some(&b'\n'));
                if end_of_line {
                    out.push(start..i + 1);
                    start = i + 1;
                }
            }
            if start < bytes.len() {
                out.push(start..bytes.len());
            }
            return out;
        }
        let n = if self.chunk == 0 { bytes.len() } else { self.chunk as usize };
        (0..bytes.len()).step_by(n).map(|i| i..(i + n).min(bytes.len())).collect()
    }
}

pub fn build(spec: &SendSpec) -> Result<Vec<u8>, String> {
    build_with(spec, Encoding::Utf8)
}

/// 본문(ASCII 는 `enc` 로) → 체크섬 넣기(자리 옵션 반영) → 끝 문자
pub fn build_with(spec: &SendSpec, enc: Encoding) -> Result<Vec<u8>, String> {
    let mut bytes = match spec.mode {
        TextMode::Hex => parse_hex(&spec.text)?,
        TextMode::Ascii => parse_ascii_with(&spec.text, enc)?,
    };
    if let Some(k) = spec.checksum {
        bytes = k.apply(&bytes)?;
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
        // 한글 등 비ASCII 를 바이트 단위로 자르면 글자 경계에서 터진다 — 먼저 거른다
        if let Some(c) = t.chars().find(|c| !c.is_ascii_hexdigit()) {
            return Err(crate::tr!(format!("HEX 가 아닌 글자: «{c}»"), format!("Not a HEX digit: «{c}»")));
        }
        if t.len() % 2 != 0 {
            return Err(crate::tr!(format!("HEX 자릿수가 홀수입니다: «{token}»"), format!("Odd number of HEX digits: «{token}»")));
        }
        for i in (0..t.len()).step_by(2) {
            let pair = &t[i..i + 2];
            let b = u8::from_str_radix(pair, 16).map_err(|_| crate::tr!(format!("HEX 가 아닌 글자: «{pair}»"), format!("Not a HEX digit: «{pair}»")))?;
            out.push(b);
        }
    }
    Ok(out)
}

pub fn parse_ascii(text: &str) -> Result<Vec<u8>, String> {
    parse_ascii_with(text, Encoding::Utf8)
}

pub fn parse_ascii_with(text: &str, enc: Encoding) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '\\' {
            enc.encode_char(c, &mut out)?;
            continue;
        }
        match chars.next() {
            Some('r') => out.push(b'\r'),
            Some('n') => out.push(b'\n'),
            Some('t') => out.push(b'\t'),
            Some('0') => out.push(0),
            Some('\\') => out.push(b'\\'),
            Some('x') => {
                // 정확히 HEX 두 글자 — «\x+1»·«\xA» 같은 것은 오류
                let s: String = [chars.next(), chars.next()].iter().flatten().collect();
                if s.len() != 2 || !s.chars().all(|c| c.is_ascii_hexdigit()) {
                    return Err(crate::tr!(format!("잘못된 \\x 이스케이프: «\\x{s}» (HEX 두 자리)"), format!("Bad \\x escape: «\\x{s}» (two HEX digits)")));
                }
                out.push(u8::from_str_radix(&s, 16).unwrap());
            }
            Some(other) => return Err(crate::tr!(format!("모르는 이스케이프: «\\{other}»"), format!("Unknown escape: «\\{other}»"))),
            None => out.push(b'\\'),
        }
    }
    Ok(out)
}

/// 제어 문자 이름 — 화면 ascii() 와 같다
fn control_name(b: u8) -> Option<&'static str> {
    Some(match b {
        0x0D => "<CR>",
        0x0A => "<LF>",
        0x09 => "<TAB>",
        0x02 => "<STX>",
        0x03 => "<ETX>",
        0x06 => "<ACK>",
        0x15 => "<NAK>",
        _ => return None,
    })
}

fn push_byte_view(out: &mut String, b: u8) {
    match control_name(b) {
        Some(n) => out.push_str(n),
        None if (0x20..0x7F).contains(&b) => out.push(b as char),
        None => out.push_str(&format!("<{b:02X}>")),
    }
}

/// 받은 바이트를 글자로 — 제어 문자는 <CR>·<LF>·<02>, 그 인코딩으로 읽을 수 없는 바이트는 <XX>.
/// shared/format.ts 의 ascii() 와 같은 결과
pub fn text_view(bytes: &[u8], enc: Encoding) -> String {
    let mut out = String::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if b < 0x80 {
            push_byte_view(&mut out, b);
            i += 1;
            continue;
        }
        match enc {
            Encoding::Ascii => out.push_str(&format!("<{b:02X}>")),
            // 0x80~0x9F 는 C1 제어 문자 — 보이는 글자가 아니다
            Encoding::Latin1 if b >= 0xA0 => out.push(b as char),
            Encoding::Latin1 => out.push_str(&format!("<{b:02X}>")),
            Encoding::Utf8 => {
                let n = match b {
                    0xC2..=0xDF => 2,
                    0xE0..=0xEF => 3,
                    0xF0..=0xF4 => 4,
                    _ => 0,
                };
                if n > 0
                    && i + n <= bytes.len()
                    && let Ok(s) = std::str::from_utf8(&bytes[i..i + n])
                {
                    out.push_str(s);
                    i += n;
                    continue;
                }
                out.push_str(&format!("<{b:02X}>"));
            }
            Encoding::Cp949 => {
                if (0x81..=0xFE).contains(&b)
                    && i + 1 < bytes.len()
                    && let Some(s) = encoding_rs::EUC_KR.decode_without_bom_handling_and_without_replacement(&bytes[i..i + 2])
                    && s.chars().count() == 1
                    && !s.starts_with(|c: char| c.is_ascii())
                {
                    out.push_str(&s);
                    i += 2;
                    continue;
                }
                out.push_str(&format!("<{b:02X}>"));
            }
        }
        i += 1;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::checksum::{Algo, ChecksumKind, ChecksumSpec};

    #[test]
    fn hex_formats() {
        let want = vec![0x01, 0x03, 0x0A];
        assert_eq!(parse_hex("01 03 0A").unwrap(), want);
        assert_eq!(parse_hex("01030a").unwrap(), want);
        assert_eq!(parse_hex("0x01,0x03,0x0A").unwrap(), want);
        assert!(parse_hex("013").is_err());
        assert!(parse_hex("0G").is_err());
        // 한글이 섞여도 터지지 않고 오류
        assert!(parse_hex("가나").is_err());
        assert!(parse_hex("1가").is_err());
        assert!(parse_hex("01 é").is_err());
        assert_eq!(parse_hex("  ").unwrap(), Vec::<u8>::new());
    }

    #[test]
    fn ascii_escapes() {
        assert_eq!(parse_ascii("AT\\r\\n").unwrap(), b"AT\r\n".to_vec());
        assert_eq!(parse_ascii("\\x02DATA\\x03").unwrap(), b"\x02DATA\x03".to_vec());
        assert_eq!(parse_ascii("a\\\\b").unwrap(), b"a\\b".to_vec());
        assert!(parse_ascii("\\q").is_err());
        assert!(parse_ascii("\\x+1").is_err());
        assert!(parse_ascii("\\xA").is_err());
        assert_eq!(parse_ascii("한").unwrap(), "한".as_bytes().to_vec());
    }

    #[test]
    fn ascii_encodings() {
        assert_eq!(parse_ascii_with("한A", Encoding::Cp949).unwrap(), vec![0xC7, 0xD1, 0x41]);
        // CP949 확장 글자(EUC-KR 2350자 밖) — «똠»
        assert_eq!(parse_ascii_with("똠", Encoding::Cp949).unwrap(), vec![0x8C, 0x63]);
        assert_eq!(parse_ascii_with("é\\r", Encoding::Latin1).unwrap(), vec![0xE9, 0x0D]);
        assert!(parse_ascii_with("한", Encoding::Latin1).is_err());
        assert!(parse_ascii_with("é", Encoding::Ascii).is_err());
        assert_eq!(parse_ascii_with("é", Encoding::Utf8).unwrap(), vec![0xC3, 0xA9]);
        // 이스케이프는 인코딩과 상관없이 그 바이트
        assert_eq!(parse_ascii_with("\\xC7", Encoding::Ascii).unwrap(), vec![0xC7]);
        let e = parse_ascii_with("가€", Encoding::Latin1).unwrap_err();
        assert!(e.contains("U+AC00"), "{e}");
    }

    #[test]
    fn send_text_json_default_is_utf8_and_flattened() {
        let t: SendText = serde_json::from_str(r#"{"text":"한","mode":"ascii","checksum":null,"suffix":""}"#).unwrap();
        assert_eq!(t.encoding, Encoding::Utf8);
        assert_eq!(t.build().unwrap(), "한".as_bytes().to_vec());
        let t: SendText = serde_json::from_str(r#"{"text":"한","mode":"ascii","checksum":"sum8","suffix":"\\r","encoding":"cp949"}"#).unwrap();
        assert_eq!(t.build().unwrap(), vec![0xC7, 0xD1, 0x98, 0x0D]);
    }

    #[test]
    fn build_inserts_checksum_before_end() {
        let spec = SendSpec {
            text: "\\x02AB\\x03".into(),
            mode: TextMode::Ascii,
            checksum: Some(ChecksumKind::Spec(ChecksumSpec { algo: Algo::Bcc, skip_head: 1, before_end: 1, swap: false })),
            suffix: "\\r".into(),
        };
        assert_eq!(build(&spec).unwrap(), vec![0x02, 0x41, 0x42, 0x03, 0x03, 0x0D]);
    }

    #[test]
    fn pace_pieces_by_line_and_chunk() {
        let lines = Pace { by_line: true, ..Pace::default() };
        let b = b"A\r\nBB\nC\rD";
        let got: Vec<&[u8]> = lines.pieces(b).into_iter().map(|r| &b[r]).collect();
        assert_eq!(got, vec![&b"A\r\n"[..], b"BB\n", b"C\r", b"D"]);
        let chunks = Pace { chunk: 4, ..Pace::default() };
        assert_eq!(chunks.pieces(&[0; 10]), vec![0..4, 4..8, 8..10]);
        assert_eq!(Pace::default().pieces(&[0; 10]), vec![0..10]);
        assert!(Pace::default().pieces(&[]).is_empty());
        assert!(Pace { char_delay_ms: 20_000, ..Pace::default() }.validate().is_err());
    }

    #[test]
    fn text_view_matches_screen_rules() {
        assert_eq!(text_view(b"OK\r\n", Encoding::Utf8), "OK<CR><LF>");
        assert_eq!(text_view("한".as_bytes(), Encoding::Utf8), "한");
        assert_eq!(text_view(&[0xC7, 0xD1], Encoding::Utf8), "<C7><D1>");
        assert_eq!(text_view(&[0xC7, 0xD1, 0x41], Encoding::Cp949), "한A");
        assert_eq!(text_view(&[0x8C, 0x63], Encoding::Cp949), "똠");
        assert_eq!(text_view(&[0xFF, 0x41], Encoding::Cp949), "<FF>A");
        assert_eq!(text_view(&[0xE9, 0x85, 0x1B], Encoding::Latin1), "é<85><1B>");
        assert_eq!(text_view(&[0xE9], Encoding::Ascii), "<E9>");
        // 잘린 UTF-8
        assert_eq!(text_view(&[0xED, 0x95], Encoding::Utf8), "<ED><95>");
    }
}
