//! 자동응답 — 받은 프레임이 규칙에 맞으면 정해 둔 응답을 보낸다(장비 흉내).
//!
//! 패턴 문법
//! - HEX: «01 03 ?? ?? 00 0A». `??` = 아무 바이트 1개, `**` = 0개 이상 아무 바이트
//! - ASCII: «READ?\r». `?` = 아무 글자 1개, `*` = 0개 이상. 글자 그대로의 ? * 는 \x3F \x2A

use crate::codec::{self, SendSpec, TextMode};
use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Eq)]
enum Tok {
    Byte(u8),
    Any,
    Many,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchKind {
    /// 프레임 전체가 패턴과 같아야 함
    Exact,
    /// 프레임 안 어딘가에 패턴이 있으면 됨
    Contains,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleSpec {
    pub name: String,
    pub enabled: bool,
    pub pattern: String,
    pub pattern_mode: TextMode,
    pub kind: MatchKind,
    pub reply: SendSpec,
    #[serde(default)]
    pub delay_ms: u64,
}

#[derive(Debug, Clone)]
pub struct Rule {
    pub name: String,
    toks: Vec<Tok>,
    kind: MatchKind,
    /// 체크섬·끝 문자까지 붙인 완성된 응답
    pub reply: Vec<u8>,
    pub delay_ms: u64,
}

fn parse_pattern(text: &str, mode: TextMode) -> Result<Vec<Tok>, String> {
    let mut toks = Vec::new();
    match mode {
        TextMode::Hex => {
            for token in text.split(|c: char| c.is_whitespace() || c == ',') {
                match token {
                    "" => {}
                    "??" => toks.push(Tok::Any),
                    "**" => toks.push(Tok::Many),
                    t => toks.extend(codec::parse_hex(t)?.into_iter().map(Tok::Byte)),
                }
            }
        }
        TextMode::Ascii => {
            // 와일드카드를 먼저 떼어 내고 나머지는 이스케이프를 푼다
            let mut lit = String::new();
            let flush = |lit: &mut String, toks: &mut Vec<Tok>| -> Result<(), String> {
                toks.extend(codec::parse_ascii(lit)?.into_iter().map(Tok::Byte));
                lit.clear();
                Ok(())
            };
            for c in text.chars() {
                match c {
                    '?' => {
                        flush(&mut lit, &mut toks)?;
                        toks.push(Tok::Any);
                    }
                    '*' => {
                        flush(&mut lit, &mut toks)?;
                        toks.push(Tok::Many);
                    }
                    _ => lit.push(c),
                }
            }
            flush(&mut lit, &mut toks)?;
        }
    }
    if toks.is_empty() {
        return Err("패턴이 비어 있습니다".into());
    }
    Ok(toks)
}

/// 와일드카드 일치 (재귀 없이 되돌아가기 한 번짜리 — `*` 하나 기준의 고전 알고리즘)
fn matches_at(toks: &[Tok], data: &[u8], anchored_end: bool) -> bool {
    let (mut t, mut d) = (0usize, 0usize);
    let mut star: Option<(usize, usize)> = None;
    loop {
        if t == toks.len() && (!anchored_end || d == data.len()) {
            return true;
        }
        if t < toks.len() {
            match toks[t] {
                Tok::Many => {
                    star = Some((t, d));
                    t += 1;
                    continue;
                }
                Tok::Any if d < data.len() => {
                    t += 1;
                    d += 1;
                    continue;
                }
                Tok::Byte(b) if d < data.len() && data[d] == b => {
                    t += 1;
                    d += 1;
                    continue;
                }
                _ => {}
            }
        }
        // 어긋남 — 마지막 `*` 가 한 바이트 더 먹게 하고 다시
        match star {
            Some((st, sd)) if sd < data.len() => {
                star = Some((st, sd + 1));
                t = st + 1;
                d = sd + 1;
            }
            _ => return false,
        }
    }
}

impl Rule {
    pub fn compile(spec: &RuleSpec) -> Result<Self, String> {
        let toks = parse_pattern(&spec.pattern, spec.pattern_mode).map_err(|e| format!("«{}» 패턴: {e}", spec.name))?;
        let reply = codec::build(&spec.reply).map_err(|e| format!("«{}» 응답: {e}", spec.name))?;
        Ok(Self { name: spec.name.clone(), toks, kind: spec.kind, reply, delay_ms: spec.delay_ms })
    }

    pub fn is_match(&self, frame: &[u8]) -> bool {
        match self.kind {
            MatchKind::Exact => matches_at(&self.toks, frame, true),
            MatchKind::Contains => (0..=frame.len()).any(|i| matches_at(&self.toks, &frame[i..], false)),
        }
    }
}

pub fn compile_all(specs: &[RuleSpec]) -> Result<Vec<Rule>, String> {
    specs.iter().filter(|s| s.enabled).map(Rule::compile).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::checksum::ChecksumKind;

    fn rule(pattern: &str, mode: TextMode, kind: MatchKind) -> Rule {
        Rule::compile(&RuleSpec {
            name: "t".into(),
            enabled: true,
            pattern: pattern.into(),
            pattern_mode: mode,
            kind,
            reply: SendSpec { text: "06".into(), mode: TextMode::Hex, checksum: None, suffix: String::new() },
            delay_ms: 0,
        })
        .unwrap()
    }

    #[test]
    fn hex_wildcards() {
        let r = rule("01 03 ?? ?? 00 0A **", TextMode::Hex, MatchKind::Exact);
        assert!(r.is_match(&[0x01, 0x03, 0x00, 0x6B, 0x00, 0x0A, 0xC5, 0xCD]));
        assert!(r.is_match(&[0x01, 0x03, 0xFF, 0xFF, 0x00, 0x0A]));
        assert!(!r.is_match(&[0x02, 0x03, 0x00, 0x00, 0x00, 0x0A]));
        assert!(!r.is_match(&[0x01, 0x03, 0x00, 0x00, 0x00]));
    }

    #[test]
    fn ascii_contains_and_exact() {
        let c = rule("TEMP?", TextMode::Ascii, MatchKind::Contains);
        assert!(c.is_match(b">>TEMP1\r\n"));
        assert!(!c.is_match(b"TEMP"));
        let e = rule("AT*\\r", TextMode::Ascii, MatchKind::Exact);
        assert!(e.is_match(b"AT+GMR\r"));
        assert!(e.is_match(b"AT\r"));
        assert!(!e.is_match(b"AT+GMR\r\n"));
        // 글자 그대로의 ? 는 \x3F
        let q = rule("READ\\x3F", TextMode::Ascii, MatchKind::Exact);
        assert!(q.is_match(b"READ?"));
        assert!(!q.is_match(b"READX"));
    }

    #[test]
    fn reply_gets_checksum() {
        let r = Rule::compile(&RuleSpec {
            name: "modbus".into(),
            enabled: true,
            pattern: "01 03 **".into(),
            pattern_mode: TextMode::Hex,
            kind: MatchKind::Exact,
            reply: SendSpec {
                text: "01 03 02 00 64".into(),
                mode: TextMode::Hex,
                checksum: Some(ChecksumKind::Crc16Modbus),
                suffix: String::new(),
            },
            delay_ms: 10,
        })
        .unwrap();
        assert_eq!(r.reply.len(), 7);
        assert_eq!(ChecksumKind::Crc16Modbus.verify(&r.reply), Some(true));
    }

    #[test]
    fn bad_pattern_reports_rule_name() {
        let err = Rule::compile(&RuleSpec {
            name: "깨진 규칙".into(),
            enabled: true,
            pattern: "0G".into(),
            pattern_mode: TextMode::Hex,
            kind: MatchKind::Exact,
            reply: SendSpec { text: "".into(), mode: TextMode::Hex, checksum: None, suffix: String::new() },
            delay_ms: 0,
        })
        .unwrap_err();
        assert!(err.contains("깨진 규칙"));
    }
}
