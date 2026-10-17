//! 자동응답 — 받은 프레임이 규칙에 맞으면 정해 둔 응답을 보낸다(장비 흉내).
//!
//! 패턴 문법
//! - HEX: «01 03 ?? ?? 00 0A». `??` = 아무 바이트 1개, `**` = 0개 이상 아무 바이트
//! - ASCII: «READ?\r». `?` = 아무 글자 1개, `*` = 0개 이상. 글자 그대로의 ? * 는 \x3F \x2A

use crate::codec::{self, SendSpec, TextMode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

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
    /// 포함(contains) 규칙은 앞뒤에 «0개 이상» 이 붙어 있다
    toks: Vec<Tok>,
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
        return Err(crate::tr!("패턴이 비어 있습니다", "The pattern is empty").into());
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
        Self::compile_unnamed(spec).map_err(|e| format!("«{}» {e}", spec.name))
    }

    /// 오류 문구에 규칙 이름을 붙이지 않는다(규칙별 오류 목록용)
    fn compile_unnamed(spec: &RuleSpec) -> Result<Self, String> {
        let mut toks = parse_pattern(&spec.pattern, spec.pattern_mode).map_err(|e| crate::tr!(format!("패턴: {e}"), format!("pattern: {e}")))?;
        // 포함 = 앞뒤에 «0개 이상» 을 붙인 정확히 — 모든 시작 위치를 다시 훑지 않는다
        if spec.kind == MatchKind::Contains {
            toks.insert(0, Tok::Many);
            toks.push(Tok::Many);
        }
        let reply = codec::build(&spec.reply).map_err(|e| crate::tr!(format!("응답: {e}"), format!("reply: {e}")))?;
        Ok(Self { name: spec.name.clone(), toks, reply, delay_ms: spec.delay_ms })
    }

    pub fn is_match(&self, frame: &[u8]) -> bool {
        matches_at(&self.toks, frame, true)
    }

    /// 앞에서부터 몇 바이트가 패턴과 맞는지(«가장 가까운 규칙» 안내용). 와일드카드 `*` 에서 멈춘다
    fn prefix_score(&self, frame: &[u8]) -> usize {
        let mut n = 0;
        for (t, b) in self.toks.iter().zip(frame) {
            match t {
                Tok::Byte(x) if x == b => n += 1,
                Tok::Any => n += 1,
                _ => break,
            }
        }
        n
    }
}

pub fn compile_all(specs: &[RuleSpec]) -> Result<Vec<Rule>, String> {
    specs.iter().filter(|s| s.enabled).map(Rule::compile).collect()
}

/// 규칙 하나의 컴파일 오류. `index` 는 넘겨받은 목록(꺼진 규칙 포함)에서의 순서(0부터)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleError {
    pub index: usize,
    pub name: String,
    pub message: String,
}

/// 규칙을 하나씩 컴파일한다 — 잘못된 규칙은 빼고 나머지는 쓴다. 꺼진 규칙은 검사하지 않는다
pub fn compile_each(specs: &[RuleSpec]) -> (Vec<Rule>, Vec<RuleError>) {
    let (mut ok, mut errors) = (Vec::new(), Vec::new());
    for (index, spec) in specs.iter().enumerate().filter(|(_, s)| s.enabled) {
        match Rule::compile_unnamed(spec) {
            Ok(r) => ok.push(r),
            Err(message) => errors.push(RuleError { index, name: spec.name.clone(), message }),
        }
    }
    (ok, errors)
}

/// 맞춰 보기 옵션(Simulator)
#[derive(Debug, Clone)]
pub struct MatchOptions {
    /// 맞춰 보기 전에 프레임 끝의 끝 문자(설정된 것)와 남은 CR·LF 를 뗀다
    pub strip_terminator: bool,
    /// 어느 규칙에도 맞지 않으면 사건 줄 «NO MATCH» 를 남긴다
    pub log_no_match: bool,
    /// 지금 프레임 구분에 쓰는 끝 문자(없으면 빈 것)
    pub terminator: Vec<u8>,
}

impl Default for MatchOptions {
    fn default() -> Self {
        Self { strip_terminator: true, log_no_match: true, terminator: Vec::new() }
    }
}

/// 프레임 끝의 끝 문자(있으면)를 떼고, 남은 끝 CR·LF 도 뗀다
pub fn strip_terminator<'a>(frame: &'a [u8], term: &[u8]) -> &'a [u8] {
    let mut f = frame;
    if !term.is_empty() && f.ends_with(term) {
        f = &f[..f.len() - term.len()];
    }
    while let [rest @ .., b'\r' | b'\n'] = f {
        f = rest;
    }
    f
}

/// 규칙 목록을 세션(시리얼·TCP·UDP)에 꽂을 응답기로. 규칙은 밖에서 바꿀 수 있다.
/// 위에서부터 처음 맞는 규칙 하나만 답하고, `hits` 에 규칙별 응답 횟수를 센다.
/// 응답이 요청과 같아도 답한다(Modbus 05·06 정상 응답, PING→PING) — 되돌아온 자기 응답에
/// 다시 답하는 루프는 세션의 «마지막 응답» 확인이 막는다.
pub fn responder(rules: Arc<Mutex<Vec<Rule>>>, hits: Arc<Mutex<BTreeMap<String, u64>>>) -> crate::serial::Responder {
    let opts = MatchOptions { strip_terminator: false, log_no_match: false, terminator: Vec::new() };
    responder_with(rules, hits, Arc::new(Mutex::new(opts)))
}

/// `responder` + 맞춰 보기 옵션. 끝 문자를 떼더라도 원래 프레임과도 맞춰 본다
/// (패턴에 \r\n 까지 적어 둔 기존 규칙도 그대로 맞도록)
pub fn responder_with(
    rules: Arc<Mutex<Vec<Rule>>>,
    hits: Arc<Mutex<BTreeMap<String, u64>>>,
    opts: Arc<Mutex<MatchOptions>>,
) -> crate::serial::Responder {
    Box::new(move |frame: &[u8]| {
        let o = opts.lock().unwrap().clone();
        let core = if o.strip_terminator { strip_terminator(frame, &o.terminator) } else { frame };
        let rules = rules.lock().unwrap();
        let hit = rules.iter().find(|r| r.is_match(core) || (core.len() != frame.len() && r.is_match(frame))).cloned();
        match hit {
            Some(r) => {
                *hits.lock().unwrap().entry(r.name.clone()).or_default() += 1;
                crate::serial::Reply { bytes: Some(r.reply), delay_ms: r.delay_ms, note: Some(format!("AUTO {}", r.name)) }
            }
            None => {
                let note = (o.log_no_match && !rules.is_empty()).then(|| {
                    let closest = rules.iter().map(|r| (r.prefix_score(core), r)).filter(|(n, _)| *n > 0).max_by_key(|(n, _)| *n);
                    match closest {
                        Some((_, r)) => format!("NO MATCH — closest: {}", r.name),
                        None => "NO MATCH".to_string(),
                    }
                });
                crate::serial::Reply { bytes: None, delay_ms: 0, note }
            }
        }
    })
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

    fn spec(name: &str, enabled: bool, pattern: &str, mode: TextMode, reply: &str) -> RuleSpec {
        RuleSpec {
            name: name.into(),
            enabled,
            pattern: pattern.into(),
            pattern_mode: mode,
            kind: MatchKind::Exact,
            reply: SendSpec { text: reply.into(), mode, checksum: None, suffix: String::new() },
            delay_ms: 0,
        }
    }

    type Shared = (Arc<Mutex<Vec<Rule>>>, Arc<Mutex<BTreeMap<String, u64>>>);

    fn shared(specs: &[RuleSpec]) -> Shared {
        (Arc::new(Mutex::new(compile_all(specs).unwrap())), Arc::new(Mutex::new(BTreeMap::new())))
    }

    #[test]
    fn reply_equal_to_request_is_sent() {
        // Modbus 06 정상 응답 = 요청 그대로
        let req = "01 06 00 01 00 03 98 0B";
        let (rules, hits) = shared(&[spec("fc06", true, req, TextMode::Hex, req)]);
        let mut r = responder(rules, hits.clone());
        let frame = [0x01, 0x06, 0x00, 0x01, 0x00, 0x03, 0x98, 0x0B];
        assert_eq!(r(&frame).bytes, Some(frame.to_vec()));
        assert_eq!(hits.lock().unwrap()["fc06"], 1);
    }

    #[test]
    fn compile_each_keeps_good_rules() {
        let specs = [
            spec("ok1", true, "PING", TextMode::Ascii, "PONG"),
            spec("bad", true, "0G", TextMode::Hex, "00"),
            spec("off-and-bad", false, "0G", TextMode::Hex, "00"),
            spec("ok2", true, "01", TextMode::Hex, "02"),
        ];
        let (rules, errors) = compile_each(&specs);
        assert_eq!(rules.iter().map(|r| r.name.as_str()).collect::<Vec<_>>(), ["ok1", "ok2"]);
        assert_eq!(errors.len(), 1);
        assert_eq!((errors[0].index, errors[0].name.as_str()), (1, "bad"));
        assert!(errors[0].message.starts_with("패턴"));
    }

    #[test]
    fn strip_terminator_then_crlf() {
        assert_eq!(strip_terminator(b"PING\r\n", b"\r\n"), b"PING");
        assert_eq!(strip_terminator(b"PING\x03\r", b"\x03"), b"PING\x03");
        assert_eq!(strip_terminator(b"PING\r\n\x03", b"\x03"), b"PING");
        assert_eq!(strip_terminator(b"PING\n", b""), b"PING");
        assert_eq!(strip_terminator(b"\r\n", b""), b"");
    }

    #[test]
    fn options_strip_and_no_match_note() {
        let (rules, hits) = shared(&[spec("ping", true, "PING", TextMode::Ascii, "PONG"), spec("crlf", true, "STAT\\r\\n", TextMode::Ascii, "OK")]);
        let opts = Arc::new(Mutex::new(MatchOptions { terminator: b"\r\n".to_vec(), ..Default::default() }));
        let mut r = responder_with(rules.clone(), hits.clone(), opts.clone());
        assert_eq!(r(b"PING\r\n").bytes, Some(b"PONG".to_vec()));
        // 끝 문자까지 적은 규칙도 계속 맞는다
        assert_eq!(r(b"STAT\r\n").bytes, Some(b"OK".to_vec()));
        let miss = r(b"PINX\r\n");
        assert!(miss.bytes.is_none());
        assert_eq!(miss.note.as_deref(), Some("NO MATCH — closest: ping"));
        assert_eq!(r(b"zzz").note.as_deref(), Some("NO MATCH"));
        // 끄면 떼지 않고, 안 맞아도 조용히
        *opts.lock().unwrap() = MatchOptions { strip_terminator: false, log_no_match: false, terminator: b"\r\n".to_vec() };
        let mut r = responder_with(rules, hits, opts);
        let off = r(b"PING\r\n");
        assert!(off.bytes.is_none() && off.note.is_none());
    }
}
