//! 자동응답 — 받은 프레임이 규칙에 맞으면 정해 둔 응답을 보낸다(장비 흉내).
//!
//! 패턴 문법
//! - HEX: «01 03 ?? ?? 00 0A». `??` = 아무 바이트 1개, `**` = 0개 이상 아무 바이트
//! - ASCII: «READ?\r». `?` = 아무 글자 1개, `*` = 0개 이상. 글자 그대로의 ? * 는 \x3F \x2A
//!
//! 응답 템플릿 — 응답 글(HEX·ASCII 어느 쪽이든) 안의 `{…}` 자리
//! - `{req}` 요청 전체, `{req 0..1}` 요청의 0~1번 바이트(끝 포함), `{req 6}` 한 바이트, `{req -2..-1}` 끝에서 2바이트,
//!   `{req 2..}` 2번부터 끝까지. 음수는 끝에서부터(-1 = 마지막)
//! - `{counter}` 규칙별 응답 횟수(0부터) 1바이트, `{counter 2}`·`{counter 2 le}` 2바이트(기본 빅 엔디언), `{counter dec}` 10진 글자
//! - `{rand 0..100}` 그 사이(끝 포함) 무작위 값, `{rand 0..1000 2 le}` 2바이트 리틀 엔디언, `{rand 10..99 dec}` 10진 글자
//! - `{time}` 시각 «HH:MM:SS» 글자, `{time %Y-%m-%d}` 형식 지정, `{unix}` 유닉스 초, `{unix ms}` 밀리초(10진 글자)
//! - `{crc crc16-modbus}` 이 자리 앞의 모든 바이트로 계산한 체크섬을 여기에, `{crc bcc 1..-1}` 범위 지정, 끝에 `swap` 이면 바이트 순서 뒤집기.
//!   범위는 체크섬 자리를 뺀 응답 바이트 기준(음수는 끝에서부터). 종류: crc16-modbus·crc16-ccitt·crc16-xmodem·crc8·lrc·bcc·sum8·sum16·crc32
//! - 알려진 이름(req·counter·rand·time·unix·crc)으로 시작하지 않는 `{` 는 글자 그대로(예전 응답 `{"ok":1}` 도 그대로 나간다)
//!
//! 장애 흉내(규칙별): 지연 범위(최소~최대 사이 무작위), N번째마다 버리기, 확률(%)로 버리기, 응답 여러 개를 차례·무작위로 돌리기.

use crate::checksum::{Algo, ChecksumKind};
use crate::codec::{self, SendSpec, TextMode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, Ordering};
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

/// 응답이 여러 개일 때 고르는 법
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReplyOrder {
    /// 차례로(1 → 2 → … → 1)
    #[default]
    Sequence,
    /// 무작위로
    Random,
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
    /// 지연 범위의 끝(ms). `delay_ms` 보다 크면 그 사이에서 매번 무작위로 고른다(흔들림)
    #[serde(default)]
    pub delay_max_ms: u64,
    /// N번째 맞을 때마다 답하지 않는다(0 = 끔). 예: 3 → 3·6·9번째 요청은 무응답
    #[serde(default)]
    pub drop_every: u32,
    /// 이 확률(%, 0~100)로 답하지 않는다
    #[serde(default)]
    pub drop_pct: f64,
    /// 다른 응답들 — `reply` 다음으로 돌아가며 쓴다
    #[serde(default)]
    pub more_replies: Vec<SendSpec>,
    #[serde(default)]
    pub reply_order: ReplyOrder,
}

// ---------------------------------------------------------------- 응답 템플릿

/// 바이트 범위(끝 포함). `to` 가 None 이면 끝까지. 음수는 끝에서부터(-1 = 마지막)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Span {
    from: i64,
    to: Option<i64>,
}

impl Span {
    const ALL: Span = Span { from: 0, to: None };

    /// 길이 `len` 에서 실제 범위. 벗어나면 Err
    fn resolve(self, len: usize, what: &str) -> Result<std::ops::Range<usize>, String> {
        let n = len as i64;
        let at = |i: i64| if i < 0 { n + i } else { i };
        let (a, b) = (at(self.from), self.to.map_or(n - 1, at));
        if a < 0 || b >= n || a > b {
            return Err(crate::tr!(
                format!("{what} 범위 {} 가 길이 {len} 바이트를 벗어납니다", self.text()),
                format!("{what} range {} is outside the {len}-byte length", self.text())
            ));
        }
        Ok(a as usize..b as usize + 1)
    }

    fn text(self) -> String {
        match self.to {
            None if self.from == 0 => "..".into(),
            None => format!("{}..", self.from),
            Some(t) if t == self.from => self.from.to_string(),
            Some(t) => format!("{}..{t}", self.from),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
enum Part {
    Lit(Vec<u8>),
    Req(Span),
    Counter { size: u8, le: bool, dec: bool },
    Rand { min: u64, max: u64, size: u8, le: bool, dec: bool },
    Time(String),
    Unix { ms: bool },
    Crc { algo: Algo, swap: bool, span: Option<Span> },
}

/// 응답 하나 — 자리(Part)들 + 전체 체크섬 + 줄 끝
#[derive(Debug, Clone)]
pub struct Template {
    parts: Vec<Part>,
    checksum: Option<ChecksumKind>,
    suffix: Vec<u8>,
}

/// 템플릿을 채울 때 쓰는 값들
pub struct Fill<'a> {
    pub request: &'a [u8],
    /// 이 규칙이 지금까지 응답한 횟수
    pub counter: u64,
    pub rng: &'a mut Rng,
}

const KEYWORDS: [&str; 6] = ["req", "counter", "rand", "time", "unix", "crc"];

fn num(s: &str) -> Option<i64> {
    let (neg, body) = s.strip_prefix('-').map_or((false, s), |r| (true, r));
    let v = if let Some(h) = body.strip_prefix("0x").or_else(|| body.strip_prefix("0X")) { i64::from_str_radix(h, 16).ok()? } else { body.parse::<i64>().ok()? };
    Some(if neg { -v } else { v })
}

fn parse_span(s: &str) -> Option<Span> {
    match s.split_once("..") {
        None => num(s).map(|v| Span { from: v, to: Some(v) }),
        Some((a, b)) => Some(Span { from: if a.is_empty() { 0 } else { num(a)? }, to: if b.is_empty() { None } else { Some(num(b)?) } }),
    }
}

fn algo_of(name: &str) -> Option<Algo> {
    Some(match name.to_ascii_lowercase().as_str() {
        "crc16-modbus" | "modbus" => Algo::Crc16Modbus,
        "crc16-ccitt" => Algo::Crc16Ccitt,
        "crc16-xmodem" => Algo::Crc16Xmodem,
        "crc8" => Algo::Crc8,
        "lrc" => Algo::Lrc,
        "bcc" | "xor" => Algo::Bcc,
        "sum8" => Algo::Sum8,
        "sum16" => Algo::Sum16,
        "crc32" | "crc-32" => Algo::Crc32,
        _ => return None,
    })
}

/// 크기·바이트 순서·10진 글자 옵션(«2», «le», «be», «dec»)
fn width_opts(words: &[&str], default_size: u8, whole: &str) -> Result<(u8, bool, bool), String> {
    let (mut size, mut le, mut dec) = (default_size, false, false);
    for w in words {
        match w.to_ascii_lowercase().as_str() {
            "le" => le = true,
            "be" => le = false,
            "dec" => dec = true,
            "1" => size = 1,
            "2" => size = 2,
            "4" => size = 4,
            "8" => size = 8,
            _ => return Err(bad_place(whole)),
        }
    }
    Ok((size, le, dec))
}

fn bad_place(whole: &str) -> String {
    crate::tr!(
        format!("템플릿 «{whole}» 을 읽을 수 없습니다 (예: {{req 0..1}} {{counter 2 be}} {{rand 0..9}} {{time}} {{unix}} {{crc crc16-modbus}})"),
        format!("Cannot read template «{whole}» (e.g. {{req 0..1}} {{counter 2 be}} {{rand 0..9}} {{time}} {{unix}} {{crc crc16-modbus}})")
    )
}

/// `{` 뒤의 «이름 …}» 하나를 읽는다
fn parse_place(inner: &str) -> Result<Part, String> {
    let whole = format!("{{{inner}}}");
    let (kw, rest) = inner.split_once(' ').map_or((inner, ""), |(a, b)| (a, b.trim()));
    let words: Vec<&str> = rest.split_whitespace().collect();
    let bad = || bad_place(&whole);
    Ok(match kw {
        "req" => match words.as_slice() {
            [] => Part::Req(Span::ALL),
            [s] => Part::Req(parse_span(s).ok_or_else(bad)?),
            _ => return Err(bad()),
        },
        "counter" => {
            let (size, le, dec) = width_opts(&words, 1, &whole)?;
            Part::Counter { size, le, dec }
        }
        "rand" => {
            let (first, opts) = words.split_first().ok_or_else(bad)?;
            let span = parse_span(first).ok_or_else(bad)?;
            let (min, max) = (span.from, span.to.ok_or_else(bad)?);
            if min < 0 || max < min {
                return Err(bad());
            }
            let need = if max < 0x100 { 1 } else if max < 0x1_0000 { 2 } else if max < 0x1_0000_0000 { 4 } else { 8 };
            let (size, le, dec) = width_opts(opts, need, &whole)?;
            if !dec && size < 8 && (max as u64) >= 1u64 << (size as u32 * 8) {
                return Err(crate::tr!(format!("«{whole}»: 최댓값 {max} 이 {size}바이트에 들어가지 않습니다"), format!("«{whole}»: max {max} does not fit in {size} byte(s)")));
            }
            Part::Rand { min: min as u64, max: max as u64, size, le, dec }
        }
        "time" => {
            let f = if rest.is_empty() { "%H:%M:%S" } else { rest };
            let broken = chrono::format::StrftimeItems::new(f).any(|i| matches!(i, chrono::format::Item::Error));
            if broken {
                return Err(crate::tr!(format!("«{whole}»: 시각 형식을 읽을 수 없습니다(예: %Y-%m-%d %H:%M:%S)"), format!("«{whole}»: bad time format (e.g. %Y-%m-%d %H:%M:%S)")));
            }
            Part::Time(f.to_string())
        }
        "unix" => match words.as_slice() {
            [] => Part::Unix { ms: false },
            ["ms"] => Part::Unix { ms: true },
            _ => return Err(bad()),
        },
        "crc" => {
            let (name, opts) = words.split_first().ok_or_else(bad)?;
            let algo = algo_of(name).ok_or_else(|| {
                crate::tr!(
                    format!("«{whole}»: 모르는 체크섬 «{name}» (crc16-modbus·crc16-ccitt·crc16-xmodem·crc8·lrc·bcc·sum8·sum16·crc32)"),
                    format!("«{whole}»: unknown checksum «{name}» (crc16-modbus, crc16-ccitt, crc16-xmodem, crc8, lrc, bcc, sum8, sum16, crc32)")
                )
            })?;
            let (mut swap, mut span) = (false, None);
            for o in opts {
                if o.eq_ignore_ascii_case("swap") {
                    swap = true;
                } else if span.is_none() {
                    span = Some(parse_span(o).ok_or_else(bad)?);
                } else {
                    return Err(bad());
                }
            }
            Part::Crc { algo, swap, span }
        }
        _ => return Err(bad()),
    })
}

impl Template {
    /// 응답 글 → 템플릿. 알려진 이름의 `{…}` 만 자리로 읽고, 그 밖의 글은 HEX·ASCII 로 읽는다
    pub fn parse(spec: &SendSpec) -> Result<Self, String> {
        let text = &spec.text;
        let mut parts = Vec::new();
        let mut lit = String::new();
        let flush = |lit: &mut String, parts: &mut Vec<Part>| -> Result<(), String> {
            if !lit.is_empty() {
                let b = codec::parse(lit, spec.mode)?;
                if !b.is_empty() {
                    parts.push(Part::Lit(b));
                }
                lit.clear();
            }
            Ok(())
        };
        let mut rest = text.as_str();
        while let Some(i) = rest.find('{') {
            let after = &rest[i + 1..];
            let kw_len = after.find(|c: char| !c.is_ascii_alphabetic()).unwrap_or(after.len());
            let kw = &after[..kw_len];
            let next = after[kw_len..].chars().next();
            if KEYWORDS.contains(&kw) && matches!(next, Some(' ' | '}')) {
                let Some(close) = after.find('}') else {
                    return Err(crate::tr!(format!("«{{{kw}» 를 닫는 }} 가 없습니다"), format!("«{{{kw}» has no closing }}")));
                };
                lit.push_str(&rest[..i]);
                flush(&mut lit, &mut parts)?;
                parts.push(parse_place(after[..close].trim())?);
                rest = &after[close + 1..];
            } else {
                lit.push_str(&rest[..=i]);
                rest = after;
            }
        }
        lit.push_str(rest);
        flush(&mut lit, &mut parts)?;
        Ok(Self { parts, checksum: spec.checksum, suffix: codec::parse_ascii(&spec.suffix)? })
    }

    /// 요청·횟수에 따라 달라지는 자리가 있는지
    pub fn is_dynamic(&self) -> bool {
        self.parts.iter().any(|p| !matches!(p, Part::Lit(_) | Part::Crc { .. }))
    }

    /// 응답 바이트 만들기: 자리 채우기 → 자리 체크섬 → 전체 체크섬 → 줄 끝
    pub fn render(&self, f: &mut Fill) -> Result<Vec<u8>, String> {
        let mut body = Vec::new();
        // (끼울 자리, 종류, 뒤집기, 범위)
        let mut crcs: Vec<(usize, Algo, bool, Option<Span>)> = Vec::new();
        for p in &self.parts {
            match p {
                Part::Lit(b) => body.extend_from_slice(b),
                Part::Req(span) => {
                    let r = span.resolve(f.request.len(), crate::tr!("요청", "request"))?;
                    body.extend_from_slice(&f.request[r]);
                }
                Part::Counter { size, le, dec } => put_num(&mut body, f.counter, *size, *le, *dec),
                Part::Rand { min, max, size, le, dec } => {
                    let v = f.rng.range(*min, *max);
                    put_num(&mut body, v, *size, *le, *dec);
                }
                Part::Time(fmt) => body.extend_from_slice(chrono::Local::now().format(fmt).to_string().as_bytes()),
                Part::Unix { ms } => {
                    let now = crate::event::now_ms();
                    body.extend_from_slice((if *ms { now } else { now / 1000 }).to_string().as_bytes());
                }
                Part::Crc { algo, swap, span } => crcs.push((body.len(), *algo, *swap, *span)),
            }
        }
        // 체크섬 자리는 나머지 바이트로 계산하고, 뒤에서부터 끼운다(앞 자리의 위치가 밀리지 않게)
        let mut sums = Vec::with_capacity(crcs.len());
        for (at, algo, swap, span) in &crcs {
            let range = match span {
                Some(s) => s.resolve(body.len(), crate::tr!("체크섬", "checksum"))?,
                None if *at == 0 => {
                    return Err(crate::tr!("{crc} 앞에 계산할 바이트가 없습니다 — 범위를 적으세요(예: {crc bcc 0..-1})", "{crc} has no bytes before it — give a range (e.g. {crc bcc 0..-1})").into());
                }
                None => 0..*at,
            };
            let mut c = algo.raw(&body[range]);
            if *swap {
                c.reverse();
            }
            sums.push((*at, c));
        }
        for (at, c) in sums.into_iter().rev() {
            body.splice(at..at, c);
        }
        if let Some(k) = self.checksum {
            body = k.apply(&body)?;
        }
        body.extend_from_slice(&self.suffix);
        Ok(body)
    }
}

/// 수를 `size` 바이트(빅·리틀 엔디언)로, 또는 10진 글자로
fn put_num(out: &mut Vec<u8>, v: u64, size: u8, le: bool, dec: bool) {
    if dec {
        out.extend_from_slice(v.to_string().as_bytes());
        return;
    }
    let be = v.to_be_bytes();
    let mut b = be[8 - size as usize..].to_vec();
    if le {
        b.reverse();
    }
    out.extend(b);
}

/// 작고 빠른 의사 난수(splitmix64) — 시험에선 씨앗을 정해 같은 순서를 낸다
#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Self(seed)
    }

    /// 시각으로 씨앗을 정한다
    pub fn from_time() -> Self {
        let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(0x9E37);
        Self(t ^ 0xA076_1D64_78BD_642F)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    /// [min, max] (끝 포함)
    pub fn range(&mut self, min: u64, max: u64) -> u64 {
        if max <= min {
            return min;
        }
        let span = max - min;
        if span == u64::MAX {
            return self.next_u64();
        }
        min + self.next_u64() % (span + 1)
    }

    /// [0, 100) 의 실수
    pub fn percent(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64 * 100.0
    }
}

// ---------------------------------------------------------------- 규칙

#[derive(Debug, Clone)]
pub struct Rule {
    pub name: String,
    /// 포함(contains) 규칙은 앞뒤에 «0개 이상» 이 붙어 있다
    toks: Vec<Tok>,
    /// 첫 응답을 요청 없이 만든 것(체크섬·끝 문자 포함). 템플릿의 요청 자리를 채울 수 없으면 빈 것.
    /// 규칙 목록만 쓰는 예전 경로(시리얼 `set_auto_reply`)용 — 응답기(`responder`)는 매번 새로 만든다
    pub reply: Vec<u8>,
    /// 지연(범위면 최소)
    pub delay_ms: u64,
    delay_max_ms: u64,
    drop_every: u32,
    drop_pct: f64,
    replies: Vec<Template>,
    order: ReplyOrder,
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

/// 지연 최댓값(10분) — 화면 칸과 같다
const DELAY_MAX: u64 = 600_000;

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
        let mut replies = Vec::with_capacity(1 + spec.more_replies.len());
        for (i, r) in std::iter::once(&spec.reply).chain(&spec.more_replies).enumerate() {
            let t = Template::parse(r).map_err(|e| {
                if i == 0 { crate::tr!(format!("응답: {e}"), format!("reply: {e}")) } else { crate::tr!(format!("응답 {}: {e}", i + 1), format!("reply {}: {e}", i + 1)) }
            })?;
            replies.push(t);
        }
        if !(0.0..=100.0).contains(&spec.drop_pct) || spec.drop_pct.is_nan() {
            return Err(crate::tr!("버릴 확률은 0~100% 입니다", "Drop probability must be 0–100%").into());
        }
        if spec.delay_ms > DELAY_MAX || spec.delay_max_ms > DELAY_MAX {
            return Err(crate::tr!("지연은 600000ms(10분)까지입니다", "Delay is at most 600000 ms (10 min)").into());
        }
        // 첫 응답을 요청 없이 — 요청 자리가 있으면 빈 것
        let reply = replies[0].render(&mut Fill { request: &[], counter: 0, rng: &mut Rng::new(1) }).unwrap_or_default();
        Ok(Self {
            name: spec.name.clone(),
            toks,
            reply,
            delay_ms: spec.delay_ms,
            delay_max_ms: spec.delay_max_ms,
            drop_every: spec.drop_every,
            drop_pct: spec.drop_pct,
            replies,
            order: spec.reply_order,
        })
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

    /// 응답 개수
    pub fn reply_count(&self) -> usize {
        self.replies.len()
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
    responder_seeded(rules, hits, opts, None, Rng::from_time())
}

/// 응답기의 바탕. `enabled` 가 꺼져 있으면 아무것도 하지 않는다. 난수 씨앗을 정하면(시험) 버리기·무작위 응답·흔들림이 늘 같다.
/// 템플릿의 `{counter}` 와 «차례로» 응답은 규칙별 응답 횟수(`hits`)를 쓴다 — «횟수 초기화» 로 처음부터, 규칙을 고쳐도 이어서
pub fn responder_seeded(
    rules: Arc<Mutex<Vec<Rule>>>,
    hits: Arc<Mutex<BTreeMap<String, u64>>>,
    opts: Arc<Mutex<MatchOptions>>,
    enabled: Option<Arc<AtomicBool>>,
    mut rng: Rng,
) -> crate::serial::Responder {
    // 규칙별 맞은 횟수(N번째마다 버리기용) — 버린 것도 센다
    let mut matched: BTreeMap<String, u64> = BTreeMap::new();
    Box::new(move |frame: &[u8]| {
        let none = crate::serial::Reply { bytes: None, delay_ms: 0, note: None };
        if enabled.as_ref().is_some_and(|e| !e.load(Ordering::SeqCst)) {
            return none;
        }
        let o = opts.lock().unwrap().clone();
        let core = if o.strip_terminator { strip_terminator(frame, &o.terminator) } else { frame };
        let rules = rules.lock().unwrap();
        let hit = rules.iter().find(|r| r.is_match(core) || (core.len() != frame.len() && r.is_match(frame)));
        let Some(r) = hit else {
            let note = (o.log_no_match && !rules.is_empty()).then(|| {
                let closest = rules.iter().map(|r| (r.prefix_score(core), r)).filter(|(n, _)| *n > 0).max_by_key(|(n, _)| *n);
                match closest {
                    Some((_, r)) => format!("NO MATCH — closest: {}", r.name),
                    None => "NO MATCH".to_string(),
                }
            });
            return crate::serial::Reply { bytes: None, delay_ms: 0, note };
        };
        let m = {
            let c = matched.entry(r.name.clone()).or_default();
            *c += 1;
            *c
        };
        if r.drop_every > 0 && m % r.drop_every as u64 == 0 {
            let n = r.drop_every;
            return crate::serial::Reply { bytes: None, delay_ms: 0, note: Some(crate::tr!(format!("DROP {} — {n}번째마다 무응답", r.name), format!("DROP {} — every {n}th request unanswered", r.name))) };
        }
        if r.drop_pct > 0.0 && rng.percent() < r.drop_pct {
            let p = r.drop_pct;
            return crate::serial::Reply { bytes: None, delay_ms: 0, note: Some(crate::tr!(format!("DROP {} — 확률 {p}%", r.name), format!("DROP {} — {p}% chance", r.name))) };
        }
        let count = hits.lock().unwrap().get(&r.name).copied().unwrap_or(0);
        let n = r.replies.len();
        let pick = if n <= 1 {
            0
        } else {
            match r.order {
                ReplyOrder::Sequence => (count % n as u64) as usize,
                ReplyOrder::Random => rng.range(0, n as u64 - 1) as usize,
            }
        };
        let delay = if r.delay_max_ms > r.delay_ms { rng.range(r.delay_ms, r.delay_max_ms) } else { r.delay_ms };
        match r.replies[pick].render(&mut Fill { request: frame, counter: count, rng: &mut rng }) {
            Ok(bytes) => {
                *hits.lock().unwrap().entry(r.name.clone()).or_default() += 1;
                let mut note = format!("AUTO {}", r.name);
                if n > 1 {
                    note.push_str(&format!(" [{}/{n}]", pick + 1));
                }
                if r.delay_max_ms > r.delay_ms {
                    note.push_str(&format!(" +{delay}ms"));
                }
                crate::serial::Reply { bytes: Some(bytes), delay_ms: delay, note: Some(note) }
            }
            Err(e) => crate::serial::Reply { bytes: None, delay_ms: 0, note: Some(format!("AUTO {} — {e}", r.name)) },
        }
    })
}

// ---------------------------------------------------------------- 앱에 꽂는 묶음

/// `set_rules` 결과
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RulesResult {
    /// 지금 쓰이는 규칙 수
    pub active: usize,
    /// 건너뛴 규칙들 — index 는 넘겨받은 목록(꺼진 규칙 포함)의 순서(0부터)
    pub errors: Vec<RuleError>,
}

/// 자동응답 한 벌(규칙·횟수·옵션·켜기) — 앱이 하나 들고 세션마다 응답기를 만든다.
/// Simulator 는 늘 켜짐, Serial·TCP·UDP 는 화면의 «켜기» 로
pub struct AutoReply {
    pub rules: Arc<Mutex<Vec<Rule>>>,
    pub hits: Arc<Mutex<BTreeMap<String, u64>>>,
    pub opts: Arc<Mutex<MatchOptions>>,
    pub enabled: Arc<AtomicBool>,
}

impl AutoReply {
    pub fn new(enabled: bool) -> Self {
        Self {
            rules: Arc::default(),
            hits: Arc::default(),
            opts: Arc::new(Mutex::new(MatchOptions::default())),
            enabled: Arc::new(AtomicBool::new(enabled)),
        }
    }

    /// 규칙 교체(꺼진 규칙은 빠짐). 규칙마다 따로 검사해 잘못된 것만 빼고 나머지는 바로 적용한다(실행 중에도)
    pub fn set_rules(&self, specs: &[RuleSpec]) -> RulesResult {
        let (compiled, errors) = compile_each(specs);
        let active = compiled.len();
        *self.rules.lock().unwrap() = compiled;
        RulesResult { active, errors }
    }

    pub fn set_match_options(&self, strip_terminator: bool, log_no_match: bool) {
        let mut o = self.opts.lock().unwrap();
        o.strip_terminator = strip_terminator;
        o.log_no_match = log_no_match;
    }

    /// 지금 프레임 구분의 끝 문자(떼고 비교할 때 쓴다)
    pub fn set_terminator(&self, term: &[u8]) {
        self.opts.lock().unwrap().terminator = term.to_vec();
    }

    pub fn set_enabled(&self, on: bool) {
        self.enabled.store(on, Ordering::SeqCst);
    }

    pub fn hits(&self) -> BTreeMap<String, u64> {
        self.hits.lock().unwrap().clone()
    }

    pub fn reset_hits(&self) {
        self.hits.lock().unwrap().clear();
    }

    /// 세션에 꽂을 응답기(꺼져 있으면 조용히 지나간다)
    pub fn responder(&self) -> crate::serial::Responder {
        responder_seeded(self.rules.clone(), self.hits.clone(), self.opts.clone(), Some(self.enabled.clone()), Rng::from_time())
    }
}

impl Default for AutoReply {
    fn default() -> Self {
        Self::new(true)
    }
}

// ---------------------------------------------------------------- 미리보기

/// 응답 하나의 미리보기 — 바이트 또는 오류
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplyPreview {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 규칙 하나를 예시 요청으로 미리 본다
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RulePreview {
    /// 예시 요청 바이트(패턴 방식으로 읽음). 비었으면 요청 없이 만든 응답
    pub request: Vec<u8>,
    /// 예시 요청이 패턴에 맞는지(비었으면 None)
    pub matches: Option<bool>,
    /// 응답마다(첫 응답 + 다른 응답들). 횟수는 0, 무작위는 정한 씨앗
    pub replies: Vec<ReplyPreview>,
    /// 템플릿 자리가 있는지(요청·횟수·시각에 따라 바뀜)
    pub dynamic: bool,
}

/// 규칙 + 예시 요청(규칙의 패턴 방식으로 적은 것) → 맞는지와 응답 바이트들. 규칙 자체가 틀리면 Err
pub fn preview(spec: &RuleSpec, sample: &str, opts: &MatchOptions) -> Result<RulePreview, String> {
    let rule = Rule::compile_unnamed(spec)?;
    let request = codec::parse(sample, spec.pattern_mode).map_err(|e| crate::tr!(format!("예시 요청: {e}"), format!("sample request: {e}")))?;
    let matches = (!request.is_empty()).then(|| {
        let core = if opts.strip_terminator { strip_terminator(&request, &opts.terminator) } else { &request };
        rule.is_match(core) || rule.is_match(&request)
    });
    let mut rng = Rng::new(7);
    let replies = rule
        .replies
        .iter()
        .map(|t| match t.render(&mut Fill { request: &request, counter: 0, rng: &mut rng }) {
            Ok(b) => ReplyPreview { bytes: Some(b), error: None },
            Err(e) => ReplyPreview { bytes: None, error: Some(e) },
        })
        .collect();
    Ok(RulePreview { request, matches, replies, dynamic: rule.replies.iter().any(Template::is_dynamic) })
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
            delay_max_ms: 0,
            drop_every: 0,
            drop_pct: 0.0,
            more_replies: vec![],
            reply_order: ReplyOrder::Sequence,
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
            delay_max_ms: 0,
            drop_every: 0,
            drop_pct: 0.0,
            more_replies: vec![],
            reply_order: ReplyOrder::Sequence,
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
            delay_max_ms: 0,
            drop_every: 0,
            drop_pct: 0.0,
            more_replies: vec![],
            reply_order: ReplyOrder::Sequence,
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
            delay_max_ms: 0,
            drop_every: 0,
            drop_pct: 0.0,
            more_replies: vec![],
            reply_order: ReplyOrder::Sequence,
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

    // ------------------------------------------------ 템플릿

    fn tpl(text: &str, mode: TextMode) -> Template {
        Template::parse(&SendSpec { text: text.into(), mode, checksum: None, suffix: String::new() }).unwrap()
    }

    fn render(t: &Template, req: &[u8], counter: u64) -> Result<Vec<u8>, String> {
        t.render(&mut Fill { request: req, counter, rng: &mut Rng::new(42) })
    }

    #[test]
    fn template_req_ranges_and_negative() {
        let req = [0x12, 0x34, 0x00, 0x00, 0x00, 0x06, 0x01, 0x03, 0x00, 0x00, 0x00, 0x02];
        // Modbus TCP: 트랜잭션 ID 를 되돌려 주고 유닛 ID 도 그대로
        let t = tpl("{req 0..1} 00 00 00 07 {req 6} 03 04 00 64 00 C8", TextMode::Hex);
        assert_eq!(render(&t, &req, 0).unwrap(), vec![0x12, 0x34, 0, 0, 0, 7, 0x01, 0x03, 0x04, 0, 0x64, 0, 0xC8]);
        assert_eq!(render(&tpl("{req -2..-1}", TextMode::Hex), &req, 0).unwrap(), vec![0x00, 0x02]);
        assert_eq!(render(&tpl("{req 10..}", TextMode::Hex), &req, 0).unwrap(), vec![0x00, 0x02]);
        assert_eq!(render(&tpl("{req}", TextMode::Hex), &req, 0).unwrap(), req.to_vec());
        assert_eq!(render(&tpl("{req -1}", TextMode::Hex), &req, 0).unwrap(), vec![0x02]);
        // 벗어나면 오류
        assert!(render(&tpl("{req 0..20}", TextMode::Hex), &req, 0).is_err());
        assert!(render(&tpl("{req 3..1}", TextMode::Hex), &req, 0).is_err());
        assert!(render(&tpl("{req -20}", TextMode::Hex), &req, 0).is_err());
    }

    #[test]
    fn template_counter_rand_time_unix() {
        assert_eq!(render(&tpl("AA {counter}", TextMode::Hex), &[], 5).unwrap(), vec![0xAA, 5]);
        assert_eq!(render(&tpl("{counter 2}", TextMode::Hex), &[], 0x1234).unwrap(), vec![0x12, 0x34]);
        assert_eq!(render(&tpl("{counter 2 le}", TextMode::Hex), &[], 0x1234).unwrap(), vec![0x34, 0x12]);
        assert_eq!(render(&tpl("{counter 4 be}", TextMode::Hex), &[], 1).unwrap(), vec![0, 0, 0, 1]);
        // 1바이트는 256 에서 돌아간다
        assert_eq!(render(&tpl("{counter}", TextMode::Hex), &[], 257).unwrap(), vec![1]);
        assert_eq!(render(&tpl("N={counter dec}\\r", TextMode::Ascii), &[], 42).unwrap(), b"N=42\r".to_vec());
        for seed in 0..50 {
            let mut rng = Rng::new(seed);
            let v = tpl("{rand 10..20}", TextMode::Hex).render(&mut Fill { request: &[], counter: 0, rng: &mut rng }).unwrap();
            assert!((10..=20).contains(&v[0]), "{v:?}");
        }
        let two = render(&tpl("{rand 0..1000}", TextMode::Hex), &[], 0).unwrap();
        assert_eq!(two.len(), 2);
        assert!(u16::from_be_bytes([two[0], two[1]]) <= 1000);
        let dec = render(&tpl("T={rand 100..199 dec}", TextMode::Ascii), &[], 0).unwrap();
        assert_eq!(dec.len(), 5);
        let time = render(&tpl("{time}", TextMode::Ascii), &[], 0).unwrap();
        assert_eq!(time.len(), 8);
        assert_eq!((time[2], time[5]), (b':', b':'));
        let unix = String::from_utf8(render(&tpl("{unix}", TextMode::Ascii), &[], 0).unwrap()).unwrap();
        assert!(unix.parse::<u64>().unwrap() > 1_700_000_000);
        let ms = String::from_utf8(render(&tpl("{unix ms}", TextMode::Ascii), &[], 0).unwrap()).unwrap();
        assert_eq!(ms.len(), unix.len() + 3);
        // 같은 씨앗이면 같은 값
        assert_eq!(render(&tpl("{rand 0..255} {rand 0..255}", TextMode::Hex), &[], 0), render(&tpl("{rand 0..255} {rand 0..255}", TextMode::Hex), &[], 0));
    }

    #[test]
    fn template_crc_placement() {
        // 앞의 모든 바이트로 — 끝에 붙인 CRC16 Modbus 는 전체 프레임 검사에 맞는다
        let r = render(&tpl("01 03 02 {req 4..5} {crc crc16-modbus}", TextMode::Hex), &[0x01, 0x03, 0x00, 0x00, 0x00, 0x64], 0).unwrap();
        assert_eq!(r[..5], [0x01, 0x03, 0x02, 0x00, 0x64]);
        assert_eq!(ChecksumKind::Crc16Modbus.verify(&r), Some(true));
        // STX … ETX 사이(1..-1 → ETX 포함) BCC 를 ETX 뒤에
        let r = render(&tpl("02 41 42 03 {crc bcc 1..-1}", TextMode::Hex), &[], 0).unwrap();
        assert_eq!(r, vec![0x02, 0x41, 0x42, 0x03, 0x41 ^ 0x42 ^ 0x03]);
        // 가운데 자리 — 범위는 체크섬 자리를 뺀 바이트 기준, 뒤 바이트는 그대로 밀린다
        let r = render(&tpl("02 {crc sum16 1..2} 10 20 03", TextMode::Hex), &[], 0).unwrap();
        assert_eq!(r, vec![0x02, 0x00, 0x30, 0x10, 0x20, 0x03]);
        // swap · 두 개
        let r = render(&tpl("10 20 {crc sum16 swap} {crc sum8 0..1}", TextMode::Hex), &[], 0).unwrap();
        assert_eq!(r, vec![0x10, 0x20, 0x30, 0x00, 0x30]);
        // CRC-32 낮은 바이트 먼저 «123456789» → CBF43926
        let r = render(&tpl("123456789{crc crc32}", TextMode::Ascii), &[], 0).unwrap();
        assert_eq!(&r[9..], &[0x26, 0x39, 0xF4, 0xCB]);
        // 맨 앞인데 범위가 없으면 오류
        assert!(render(&tpl("{crc bcc} 01", TextMode::Hex), &[], 0).is_err());
        // 규칙 전체 체크섬은 템플릿 다음에, 줄 끝은 맨 끝에
        let t = Template::parse(&SendSpec { text: "{req 0} 03 02 00 01".into(), mode: TextMode::Hex, checksum: Some(ChecksumKind::Crc16Modbus), suffix: "\\r".into() }).unwrap();
        let r = render(&t, &[7], 0).unwrap();
        assert_eq!(r[0], 7);
        assert_eq!(*r.last().unwrap(), b'\r');
        assert_eq!(ChecksumKind::Crc16Modbus.verify(&r[..r.len() - 1]), Some(true));
    }

    #[test]
    fn template_keeps_old_replies_and_rejects_bad() {
        // 알려진 이름이 아닌 { 는 글자 그대로(JSON 응답)
        assert_eq!(render(&tpl("{\"ok\":1}\\r\\n", TextMode::Ascii), &[], 0).unwrap(), b"{\"ok\":1}\r\n".to_vec());
        assert_eq!(render(&tpl("{request}", TextMode::Ascii), &[], 0).unwrap(), b"{request}".to_vec());
        assert!(!tpl("01 02", TextMode::Hex).is_dynamic());
        assert!(tpl("{counter}", TextMode::Hex).is_dynamic());
        let bad = |s: &str| Template::parse(&SendSpec { text: s.into(), mode: TextMode::Hex, checksum: None, suffix: String::new() }).is_err();
        assert!(bad("{req 0..1"));
        assert!(bad("{req x}"));
        assert!(bad("{crc nope}"));
        assert!(bad("{rand 5..1}"));
        assert!(bad("{rand 0..300 1}"));
        assert!(bad("{counter 3}"));
        assert!(bad("{unix s}"));
        // 예전 JSON(새 칸 없음)도 읽는다
        let spec: RuleSpec = serde_json::from_str(r#"{"name":"a","enabled":true,"pattern":"01","patternMode":"hex","kind":"exact","reply":{"text":"02","mode":"hex","checksum":null,"suffix":""},"delayMs":0}"#).unwrap();
        assert_eq!(Rule::compile(&spec).unwrap().reply, vec![2]);
        // 새 칸
        let spec: RuleSpec = serde_json::from_str(r#"{"name":"a","enabled":true,"pattern":"01","patternMode":"hex","kind":"exact","reply":{"text":"02","mode":"hex","checksum":null,"suffix":""},"delayMs":5,"delayMaxMs":9,"dropEvery":2,"dropPct":12.5,"moreReplies":[{"text":"03","mode":"hex","checksum":null,"suffix":""}],"replyOrder":"random"}"#).unwrap();
        let r = Rule::compile(&spec).unwrap();
        assert_eq!((r.reply_count(), r.delay_max_ms, r.drop_every, r.order), (2, 9, 2, ReplyOrder::Random));
        let mut s = spec.clone();
        s.drop_pct = 120.0;
        assert!(Rule::compile(&s).is_err());
    }

    // ------------------------------------------------ 장애 흉내

    fn fault_spec(name: &str) -> RuleSpec {
        let mut s = spec(name, true, "**", TextMode::Hex, "AA");
        s.more_replies = vec![
            SendSpec { text: "BB".into(), mode: TextMode::Hex, checksum: None, suffix: String::new() },
            SendSpec { text: "CC".into(), mode: TextMode::Hex, checksum: None, suffix: String::new() },
        ];
        s
    }

    type Out = (Option<Vec<u8>>, u64, Option<String>);

    fn run(spec: RuleSpec, seed: u64, n: usize) -> Vec<Out> {
        let (rules, hits) = shared(&[spec]);
        let opts = Arc::new(Mutex::new(MatchOptions { strip_terminator: false, log_no_match: true, terminator: vec![] }));
        let mut r = responder_seeded(rules, hits, opts, None, Rng::new(seed));
        (0..n)
            .map(|_| {
                let x = r(&[1]);
                (x.bytes, x.delay_ms, x.note)
            })
            .collect()
    }

    #[test]
    fn faults_sequence_drop_every_and_jitter_are_deterministic() {
        let mut s = fault_spec("f");
        s.drop_every = 3;
        s.delay_ms = 10;
        s.delay_max_ms = 50;
        let out = run(s.clone(), 1, 6);
        let bytes: Vec<Option<Vec<u8>>> = out.iter().map(|x| x.0.clone()).collect();
        // 3·6번째는 버림, 응답은 차례로(버린 것은 차례를 쓰지 않음)
        assert_eq!(bytes, vec![Some(vec![0xAA]), Some(vec![0xBB]), None, Some(vec![0xCC]), Some(vec![0xAA]), None]);
        assert!(out[2].2.as_deref().unwrap().starts_with("DROP f"));
        assert!(out.iter().filter(|x| x.0.is_some()).all(|x| (10..=50).contains(&x.1)), "{out:?}");
        assert!(out[0].2.as_deref().unwrap().starts_with("AUTO f [1/3] +"));
        // 같은 씨앗 = 같은 결과
        assert_eq!(run(s, 1, 6).iter().map(|x| x.1).collect::<Vec<_>>(), out.iter().map(|x| x.1).collect::<Vec<_>>());
    }

    #[test]
    fn faults_random_and_drop_percent_are_seeded() {
        let mut s = fault_spec("r");
        s.reply_order = ReplyOrder::Random;
        s.drop_pct = 30.0;
        let a = run(s.clone(), 99, 200);
        let b = run(s.clone(), 99, 200);
        assert_eq!(a.iter().map(|x| x.0.clone()).collect::<Vec<_>>(), b.iter().map(|x| x.0.clone()).collect::<Vec<_>>());
        let dropped = a.iter().filter(|x| x.0.is_none()).count();
        assert!((30..=90).contains(&dropped), "dropped {dropped}/200");
        for want in [0xAA, 0xBB, 0xCC] {
            assert!(a.iter().any(|x| x.0 == Some(vec![want])), "never chose {want:02X}");
        }
        // 100% 면 언제나 버림, 0% 면 늘 응답
        s.drop_pct = 100.0;
        assert!(run(s.clone(), 3, 20).iter().all(|x| x.0.is_none()));
        s.drop_pct = 0.0;
        assert!(run(s, 3, 20).iter().all(|x| x.0.is_some()));
    }

    #[test]
    fn counter_follows_hits_and_reset() {
        let s = spec("c", true, "**", TextMode::Hex, "{counter 2}");
        let (rules, hits) = shared(&[s]);
        let opts = Arc::new(Mutex::new(MatchOptions::default()));
        let mut r = responder_seeded(rules, hits.clone(), opts, None, Rng::new(1));
        assert_eq!(r(&[1]).bytes, Some(vec![0, 0]));
        assert_eq!(r(&[1]).bytes, Some(vec![0, 1]));
        hits.lock().unwrap().clear();
        assert_eq!(r(&[1]).bytes, Some(vec![0, 0]));
    }

    #[test]
    fn template_error_is_noted_not_sent() {
        let s = spec("t", true, "**", TextMode::Hex, "{req 5}");
        let (rules, hits) = shared(&[s]);
        let mut r = responder(rules, hits.clone());
        let out = r(&[1, 2]);
        assert!(out.bytes.is_none());
        assert!(out.note.unwrap().starts_with("AUTO t — "));
        assert!(hits.lock().unwrap().is_empty());
    }

    #[test]
    fn engine_enable_switch_and_preview() {
        let ar = AutoReply::new(false);
        let res = ar.set_rules(&[spec("p", true, "PING", TextMode::Ascii, "PONG"), spec("bad", true, "", TextMode::Ascii, "x")]);
        assert_eq!((res.active, res.errors.len()), (1, 1));
        let mut r = ar.responder();
        let off = r(b"PING");
        assert!(off.bytes.is_none() && off.note.is_none());
        ar.set_enabled(true);
        assert_eq!(r(b"PING").bytes, Some(b"PONG".to_vec()));
        assert_eq!(ar.hits()["p"], 1);
        ar.reset_hits();
        assert!(ar.hits().is_empty());

        let mut s = spec("mb", true, "?? ?? 00 00 **", TextMode::Hex, "{req 0..1} 00 00 00 05 {req 6} 03 02 00 64");
        s.more_replies = vec![SendSpec { text: "{req 9}".into(), mode: TextMode::Hex, checksum: None, suffix: String::new() }];
        let p = preview(&s, "00 07 00 00 00 06 01 03 00 00 00 01", &MatchOptions::default()).unwrap();
        assert_eq!(p.matches, Some(true));
        assert_eq!(p.replies[0].bytes.as_deref(), Some(&[0x00, 0x07, 0, 0, 0, 5, 1, 3, 2, 0, 0x64][..]));
        assert_eq!(p.replies[1].bytes.as_deref(), Some(&[0x00][..]));
        assert!(p.dynamic);
        let p = preview(&s, "01 02", &MatchOptions::default()).unwrap();
        assert_eq!(p.matches, Some(false));
        assert!(p.replies[0].error.is_some());
        assert!(preview(&s, "zz", &MatchOptions::default()).is_err());
    }
}
