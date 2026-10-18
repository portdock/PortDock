//! PortDock Plot — 들어오는 바이트에서 숫자 값을 꺼낸다(화면·통신과 무관한 순수 해석).
//!
//! 해석을 Rust 에 둔 이유: 초당 수천 줄이 와도 화면(WebView)으로는 숫자 묶음만 넘기면 되고(바이트·줄 글을 통째로
//! 넘기지 않는다), 받는 동안의 CSV 기록도 같은 자리에서 바로 쓴다 — 화면이 바쁘거나 창이 내려가도 기록은 밀리지 않는다.
//!
//! 글자 줄
//! - 줄 끝은 LF·CR LF·CR 어느 것이든. 빈 줄은 건너뛴다.
//! - 구분자: 자동(탭 > 세미콜론 > 쉼표 > 빈칸 순으로 줄에 있는 것) 또는 지정. 세미콜론·탭·빈칸으로 나눌 때는 «1,5» 를 1.5 로 읽는다.
//! - «이름:값» 쌍(Arduino 시리얼 플로터 식 `temp:23.1,hum:40`, `=` 도 됨) — 이름마다 채널을 정해 둔다(처음 나온 순서).
//! - 머리글: 숫자가 하나도 없는 줄에 칸이 둘 이상이면 채널 이름으로 읽는다(끄면 실패 줄).
//! - 빈 칸(`1,,3`)은 빈 값(NaN), 숫자가 아닌 칸은 빈 값 + 실패 이유. 0x1F 같은 16진수도 읽는다.
//!
//! 바이너리 프레임: [시작 바이트…][값 × 채널 수][체크섬] 고정 길이. 시작 바이트로 맞춰 잡고, 체크섬이 틀리면
//! 한 바이트 밀어 다시 찾는다.

use crate::checksum::ChecksumKind;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// 채널 상한 — 넘는 칸은 버리고 실패 이유를 남긴다
pub const MAX_CHANNELS: usize = 32;
/// 줄 끝 없이 이만큼 쌓이면 잘라서 실패 줄로
pub const MAX_LINE: usize = 4096;
/// 원시 보기 줄 글자 수 상한
const RAW_CHARS: usize = 160;
/// 바이너리 원시 보기에 보이는 바이트 수
const RAW_BYTES: usize = 48;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Sep {
    #[default]
    Auto,
    Comma,
    Space,
    Tab,
    Semicolon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Header {
    /// 숫자 없는 줄(칸 둘 이상)을 채널 이름으로
    #[default]
    Auto,
    Off,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NumKind {
    U8,
    I8,
    U16,
    I16,
    U32,
    I32,
    F32,
    F64,
}

impl NumKind {
    pub fn size(self) -> usize {
        match self {
            Self::U8 | Self::I8 => 1,
            Self::U16 | Self::I16 => 2,
            Self::U32 | Self::I32 | Self::F32 => 4,
            Self::F64 => 8,
        }
    }

    /// `b` 는 정확히 size() 바이트
    pub fn read(self, b: &[u8], little: bool) -> f64 {
        let mut a = [0u8; 8];
        let n = self.size();
        a[..n].copy_from_slice(&b[..n]);
        if !little {
            a[..n].reverse();
        }
        // 이제 a 는 리틀 엔디언
        let v = match self {
            Self::U8 => a[0] as f64,
            Self::I8 => a[0] as i8 as f64,
            Self::U16 => u16::from_le_bytes([a[0], a[1]]) as f64,
            Self::I16 => i16::from_le_bytes([a[0], a[1]]) as f64,
            Self::U32 => u32::from_le_bytes([a[0], a[1], a[2], a[3]]) as f64,
            Self::I32 => i32::from_le_bytes([a[0], a[1], a[2], a[3]]) as f64,
            Self::F32 => f32::from_le_bytes([a[0], a[1], a[2], a[3]]) as f64,
            Self::F64 => f64::from_le_bytes(a),
        };
        if v.is_finite() { v } else { f64::NAN }
    }
}

/// 해석 방식 (화면 JSON: {"kind":"text","sep":"auto","header":"auto"} · {"kind":"binary","sync":[170,85],"channels":3,"num":"i16","little":true,"checksum":"sum8","checkSync":false})
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Format {
    Text {
        #[serde(default)]
        sep: Sep,
        #[serde(default)]
        header: Header,
    },
    Binary {
        /// 시작 바이트(비우면 고정 길이로만 끊는다)
        #[serde(default)]
        sync: Vec<u8>,
        channels: usize,
        num: NumKind,
        /// 리틀 엔디언(아니면 빅)
        #[serde(default)]
        little: bool,
        /// 프레임 끝의 체크섬
        #[serde(default)]
        checksum: Option<ChecksumKind>,
        /// 체크섬 계산에 시작 바이트도 넣는지(기본: 시작 바이트 뒤부터)
        #[serde(default)]
        check_sync: bool,
    },
}

impl Default for Format {
    fn default() -> Self {
        Self::Text { sep: Sep::Auto, header: Header::Auto }
    }
}

impl Format {
    /// 바이너리 프레임 길이(글자 줄이면 None)
    pub fn frame_len(&self) -> Option<usize> {
        match self {
            Self::Text { .. } => None,
            Self::Binary { sync, channels, num, checksum, .. } => Some(sync.len() + channels * num.size() + checksum.map_or(0, |k| k.width())),
        }
    }

    /// 쓸 수 있는 설정인지
    pub fn validate(&self) -> Result<(), String> {
        if let Self::Binary { channels, sync, .. } = self {
            if *channels == 0 || *channels > MAX_CHANNELS {
                return Err(crate::tr!(format!("채널 수는 1~{MAX_CHANNELS} 입니다"), format!("Channels must be 1–{MAX_CHANNELS}")));
            }
            if sync.len() > 8 {
                return Err(crate::tr!("시작 바이트는 8개까지입니다", "Up to 8 start bytes").into());
            }
        }
        Ok(())
    }
}

/// 값 한 줄(한 프레임). NaN = 빈 값
#[derive(Debug, Clone, PartialEq)]
pub struct Row {
    pub ts: u64,
    pub values: Vec<f64>,
}

/// 원시 보기 한 줄
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Raw {
    pub ts: u64,
    pub text: String,
    /// 해석 성공(실패면 빨강)
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub why: Option<String>,
    /// 사건 줄(연결·끊김 등, 해석 대상 아님)
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub ev: bool,
}

/// 해석 결과를 쌓는 곳 — 원시 줄은 최근 `raw_keep` 개만
#[derive(Debug, Default)]
pub struct Out {
    pub rows: Vec<Row>,
    pub raw: VecDeque<Raw>,
    pub raw_keep: usize,
    /// 실패 줄(프레임) 수
    pub bad: u64,
}

impl Out {
    pub fn new(raw_keep: usize) -> Self {
        Self { raw_keep, ..Default::default() }
    }

    pub fn push_raw(&mut self, r: Raw) {
        if self.raw_keep == 0 {
            return;
        }
        if self.raw.len() >= self.raw_keep {
            self.raw.pop_front();
        }
        self.raw.push_back(r);
    }
}

/// 한 줄 해석 결과
#[derive(Debug, Clone, PartialEq)]
pub enum Line {
    Empty,
    /// 값들(채널 순서). why 가 있으면 일부 칸이 실패
    Values { values: Vec<f64>, why: Option<String> },
    /// 머리글 — 채널 이름
    Header(Vec<String>),
    Error(String),
}

/// 숫자 칸 — 앞뒤 빈칸 무시, 0x 16진수, decimal_comma 면 «1,5» = 1.5. NaN·무한대는 빈 값
pub fn parse_num(s: &str, decimal_comma: bool) -> Option<f64> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }
    let (neg, body) = match s.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, s.strip_prefix('+').unwrap_or(s)),
    };
    if let Some(h) = body.strip_prefix("0x").or_else(|| body.strip_prefix("0X")) {
        let v = u64::from_str_radix(h, 16).ok()? as f64;
        return Some(if neg { -v } else { v });
    }
    // Rust 는 «inf»·«nan»·«infinity» 도 읽는다 — 글자로 된 칸이 숫자로 오인되지 않게 숫자로 시작할 때만
    if !body.starts_with(|c: char| c.is_ascii_digit() || c == '.') {
        return None;
    }
    let v: f64 = if decimal_comma && s.contains(',') && !s.contains('.') { s.replacen(',', ".", 1).parse().ok()? } else { s.parse().ok()? };
    Some(if v.is_finite() { v } else { f64::NAN })
}

/// 줄 → 칸들(구분자 자동이면 줄을 보고 고른다). 돌려주는 bool = 소수점 쉼표를 받아도 되는지
fn split(line: &str, sep: Sep) -> (Vec<String>, bool) {
    let sep = match sep {
        Sep::Auto if line.contains('\t') => Sep::Tab,
        Sep::Auto if line.contains(';') => Sep::Semicolon,
        Sep::Auto if line.contains(',') => Sep::Comma,
        Sep::Auto => Sep::Space,
        s => s,
    };
    let mut parts: Vec<String> = match sep {
        Sep::Space | Sep::Auto => {
            // «temp: 23.1 hum: 40» — 이름 뒤 빈칸은 다음 칸과 잇는다
            let mut out: Vec<String> = Vec::new();
            let mut join = false;
            for tok in line.split_whitespace() {
                if join && let Some(last) = out.last_mut() {
                    last.push_str(tok);
                    join = false;
                    continue;
                }
                join = (tok.ends_with(':') || tok.ends_with('=')) && tok.len() > 1;
                out.push(tok.to_string());
            }
            out
        }
        Sep::Comma => line.split(',').map(|s| s.trim().to_string()).collect(),
        Sep::Tab => line.split('\t').map(|s| s.trim().to_string()).collect(),
        Sep::Semicolon => line.split(';').map(|s| s.trim().to_string()).collect(),
    };
    // 끝 구분자(«1,2,» — 흔한 Arduino 출력)는 빈 칸으로 치지 않는다
    if parts.len() > 1 && parts.last().is_some_and(|s| s.is_empty()) {
        parts.pop();
    }
    (parts, sep != Sep::Comma)
}

/// «이름:값»·«이름=값» 이면 (이름, 값)
fn labeled(tok: &str, dc: bool) -> Option<(String, Option<f64>)> {
    let p = tok.find([':', '='])?;
    let (name, rest) = (tok[..p].trim(), tok[p + 1..].trim());
    if name.is_empty() || parse_num(name, false).is_some() {
        return None;
    }
    let v = parse_num(rest, dc);
    if v.is_none() && !rest.is_empty() {
        return None;
    }
    Some((name.chars().take(32).collect(), v))
}

fn clip(s: &str, n: usize) -> String {
    let mut out: String = s.chars().take(n).collect();
    if s.chars().count() > n {
        out.push('…');
    }
    out
}

/// 글자 줄 하나를 해석한다. `names` 는 채널 이름(«이름:값» 의 이름 → 채널 번호를 여기서 찾고, 없으면 덧붙인다)
pub fn parse_line(line: &str, sep: Sep, header: Header, names: &mut Vec<String>) -> Line {
    let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
    if line.is_empty() {
        return Line::Empty;
    }
    let (parts, dc) = split(line, sep);
    let pairs: Vec<Option<(String, Option<f64>)>> = parts.iter().map(|p| labeled(p, dc)).collect();
    let mut bad: Vec<String> = Vec::new();
    let mut over = false;
    if pairs.iter().any(|p| p.is_some()) {
        // 이름 붙은 줄 — 이름 없는 칸은 자리 번호(«3») 를 이름으로
        let mut values: Vec<f64> = Vec::new();
        for (i, (part, pair)) in parts.iter().zip(&pairs).enumerate() {
            let (name, v) = match pair {
                Some((n, v)) => (n.clone(), *v),
                None => {
                    let v = parse_num(part, dc);
                    if v.is_none() && !part.is_empty() {
                        bad.push(format!("«{}»", clip(part, 20)));
                    }
                    ((i + 1).to_string(), v)
                }
            };
            let ch = match names.iter().position(|n| *n == name) {
                Some(c) => c,
                None if names.len() < MAX_CHANNELS => {
                    names.push(name);
                    names.len() - 1
                }
                None => {
                    over = true;
                    continue;
                }
            };
            if values.len() <= ch {
                values.resize(ch + 1, f64::NAN);
            }
            values[ch] = v.unwrap_or(f64::NAN);
        }
        return finish(values, bad, over);
    }
    let nums: Vec<Option<f64>> = parts.iter().map(|p| parse_num(p, dc)).collect();
    if nums.iter().all(|v| v.is_none()) {
        let filled = parts.iter().filter(|p| !p.is_empty()).count();
        if header == Header::Auto && filled >= 2 && parts.len() <= MAX_CHANNELS {
            return Line::Header(parts.iter().map(|p| clip(p, 32)).collect());
        }
        return Line::Error(crate::tr!(format!("숫자가 없습니다: «{}»", clip(line, 40)), format!("No numbers: «{}»", clip(line, 40))));
    }
    let mut values = Vec::with_capacity(parts.len().min(MAX_CHANNELS));
    for (i, (p, v)) in parts.iter().zip(&nums).enumerate() {
        if i >= MAX_CHANNELS {
            over = true;
            break;
        }
        if v.is_none() && !p.is_empty() {
            bad.push(format!("{}: «{}»", i + 1, clip(p, 20)));
        }
        values.push(v.unwrap_or(f64::NAN));
    }
    finish(values, bad, over)
}

fn finish(values: Vec<f64>, bad: Vec<String>, over: bool) -> Line {
    let mut why = Vec::new();
    if !bad.is_empty() {
        why.push(crate::tr!(format!("숫자가 아닌 칸 {}", bad.join(", ")), format!("Not a number: {}", bad.join(", "))));
    }
    if over {
        why.push(crate::tr!(format!("채널은 {MAX_CHANNELS}개까지 — 나머지는 버림"), format!("Up to {MAX_CHANNELS} channels — the rest dropped")));
    }
    Line::Values { values, why: (!why.is_empty()).then(|| why.join(" · ")) }
}

/// 보이는 글자로(제어 문자는 <CR>·<0x01>)
fn show_text(b: &[u8]) -> String {
    let s = String::from_utf8_lossy(b);
    let mut out = String::new();
    for c in s.chars() {
        if out.chars().count() >= RAW_CHARS {
            out.push('…');
            break;
        }
        match c {
            '\r' => out.push_str("<CR>"),
            '\t' => out.push_str("<TAB>"),
            c if (c as u32) < 0x20 || c == '\x7f' => out.push_str(&format!("<0x{:02X}>", c as u32)),
            c => out.push(c),
        }
    }
    out
}

fn show_hex(b: &[u8]) -> String {
    let mut s: String = b.iter().take(RAW_BYTES).map(|x| format!("{x:02X}")).collect::<Vec<_>>().join(" ");
    if b.len() > RAW_BYTES {
        s.push_str(" …");
    }
    s
}

/// 받는 흐름 하나의 해석기 — 줄 조각·프레임 조각과 채널 이름을 기억한다
#[derive(Debug, Clone)]
pub struct Parser {
    format: Format,
    buf: Vec<u8>,
    names: Vec<String>,
    names_dirty: bool,
}

impl Parser {
    pub fn new(format: Format) -> Self {
        Self { format, buf: Vec::new(), names: Vec::new(), names_dirty: false }
    }

    pub fn format(&self) -> &Format {
        &self.format
    }

    /// 지금 채널 이름(빈 글자 = 이름 없음)
    pub fn names(&self) -> &[String] {
        &self.names
    }

    /// 이름이 바뀌었으면 한 번만 돌려준다
    pub fn take_names(&mut self) -> Option<Vec<String>> {
        std::mem::take(&mut self.names_dirty).then(|| self.names.clone())
    }

    /// 받은 바이트를 넣는다. `whole` 이면(UDP 데이터그램) 줄 끝이 없어도 끝에서 한 줄로 끝낸다
    pub fn feed(&mut self, ts: u64, data: &[u8], whole: bool, out: &mut Out) {
        match self.format.clone() {
            Format::Text { sep, header } => self.feed_text(ts, data, whole, sep, header, out),
            Format::Binary { sync, channels, num, little, checksum, check_sync } => self.feed_bin(ts, data, &sync, channels, num, little, checksum, check_sync, out),
        }
    }

    fn line(&mut self, ts: u64, bytes: &[u8], sep: Sep, header: Header, out: &mut Out) {
        let text = String::from_utf8_lossy(bytes);
        let before = self.names.len();
        match parse_line(&text, sep, header, &mut self.names) {
            Line::Empty => {}
            Line::Values { values, why } => {
                if self.names.len() != before {
                    self.names_dirty = true;
                }
                let ok = why.is_none();
                if !ok {
                    out.bad += 1;
                }
                out.push_raw(Raw { ts, text: show_text(bytes), ok, why, ev: false });
                out.rows.push(Row { ts, values });
            }
            Line::Header(names) => {
                if names != self.names {
                    self.names = names;
                    self.names_dirty = true;
                }
                out.push_raw(Raw { ts, text: show_text(bytes), ok: true, why: Some(crate::tr!("머리글 → 채널 이름", "Header → channel names").into()), ev: false });
            }
            Line::Error(why) => {
                out.bad += 1;
                out.push_raw(Raw { ts, text: show_text(bytes), ok: false, why: Some(why), ev: false });
            }
        }
    }

    fn feed_text(&mut self, ts: u64, data: &[u8], whole: bool, sep: Sep, header: Header, out: &mut Out) {
        for &b in data {
            if b == b'\n' || b == b'\r' {
                let line = std::mem::take(&mut self.buf);
                self.line(ts, &line, sep, header, out);
                continue;
            }
            self.buf.push(b);
            if self.buf.len() >= MAX_LINE {
                let line = std::mem::take(&mut self.buf);
                out.bad += 1;
                out.push_raw(Raw { ts, text: show_text(&line), ok: false, why: Some(crate::tr!(format!("줄 끝 없이 {MAX_LINE}바이트 — 잘랐습니다"), format!("{MAX_LINE} bytes without a line ending — cut")).to_string()), ev: false });
            }
        }
        if whole && !self.buf.is_empty() {
            let line = std::mem::take(&mut self.buf);
            self.line(ts, &line, sep, header, out);
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn feed_bin(&mut self, ts: u64, data: &[u8], sync: &[u8], channels: usize, num: NumKind, little: bool, checksum: Option<ChecksumKind>, check_sync: bool, out: &mut Out) {
        self.buf.extend_from_slice(data);
        let size = num.size();
        let len = sync.len() + channels * size + checksum.map_or(0, |k| k.width());
        let mut skipped = 0usize;
        loop {
            if !sync.is_empty() {
                match self.buf.windows(sync.len()).position(|w| w == sync) {
                    Some(p) => {
                        skipped += p;
                        self.buf.drain(..p);
                    }
                    None => {
                        let keep = (sync.len() - 1).min(self.buf.len());
                        let cut = self.buf.len() - keep;
                        skipped += cut;
                        self.buf.drain(..cut);
                        break;
                    }
                }
            }
            if self.buf.len() < len || len == 0 {
                break;
            }
            let frame = &self.buf[..len];
            if let Some(k) = checksum {
                let part = if check_sync { frame } else { &frame[sync.len()..] };
                if k.verify(part) == Some(false) {
                    out.bad += 1;
                    out.push_raw(Raw { ts, text: show_hex(frame), ok: false, why: Some(crate::tr!("체크섬 틀림 — 한 바이트 밀어 다시 찾음", "Checksum mismatch — resyncing one byte later").into()), ev: false });
                    self.buf.drain(..1);
                    continue;
                }
            }
            let body = &frame[sync.len()..sync.len() + channels * size];
            let values = body.chunks_exact(size).map(|c| num.read(c, little)).collect();
            out.push_raw(Raw { ts, text: show_hex(frame), ok: true, why: None, ev: false });
            out.rows.push(Row { ts, values });
            self.buf.drain(..len);
        }
        if skipped > 0 {
            out.bad += 1;
            out.push_raw(Raw {
                ts,
                text: String::new(),
                ok: false,
                why: Some(crate::tr!(format!("시작 바이트를 찾느라 {skipped}바이트 버림"), format!("Skipped {skipped} bytes looking for the start bytes"))),
                ev: false,
            });
        }
        // 시작 바이트 없이 끝없이 쌓이지 않게
        if self.buf.len() > 64 * 1024 {
            self.buf.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vals(l: &Line) -> Vec<f64> {
        match l {
            Line::Values { values, .. } => values.clone(),
            other => panic!("값 줄이 아님: {other:?}"),
        }
    }
    fn same(a: &[f64], b: &[f64]) -> bool {
        a.len() == b.len() && a.iter().zip(b).all(|(x, y)| (x.is_nan() && y.is_nan()) || x == y)
    }
    fn p(line: &str) -> (Line, Vec<String>) {
        let mut names = Vec::new();
        (parse_line(line, Sep::Auto, Header::Auto, &mut names), names)
    }

    #[test]
    fn numbers() {
        assert_eq!(parse_num(" 23.5 ", false), Some(23.5));
        assert_eq!(parse_num("+1.0E+00", false), Some(1.0));
        assert_eq!(parse_num("-0x10", false), Some(-16.0));
        assert_eq!(parse_num("1,5", true), Some(1.5));
        assert_eq!(parse_num("1,5", false), None);
        assert_eq!(parse_num("abc", false), None);
        assert_eq!(parse_num("inf", false), None);
        assert_eq!(parse_num("", false), None);
        assert!(parse_num("1e999", false).unwrap().is_nan());
    }

    #[test]
    fn separators_auto() {
        assert!(same(&vals(&p("1.5,2,-3").0), &[1.5, 2.0, -3.0]));
        assert!(same(&vals(&p("1 2   3").0), &[1.0, 2.0, 3.0]));
        assert!(same(&vals(&p("1\t2\t3").0), &[1.0, 2.0, 3.0]));
        // 세미콜론이면 소수점 쉼표
        assert!(same(&vals(&p("1,5;2,25").0), &[1.5, 2.25]));
        // 끝 쉼표는 빈 칸이 아님, 가운데 빈 칸은 빈 값
        assert!(same(&vals(&p("1,2,").0), &[1.0, 2.0]));
        assert!(same(&vals(&p("1,,3").0), &[1.0, f64::NAN, 3.0]));
        let mut n = Vec::new();
        assert!(same(&vals(&parse_line("1 2,3", Sep::Space, Header::Auto, &mut n)), &[1.0, 2.3]));
        assert_eq!(p("  ").0, Line::Empty);
    }

    #[test]
    fn labels_like_arduino() {
        let (l, names) = p("temp:23.1,hum:40");
        assert!(same(&vals(&l), &[23.1, 40.0]));
        assert_eq!(names, ["temp", "hum"]);
        // 같은 이름은 같은 채널 — 순서가 바뀌어도
        let mut names = vec!["temp".to_string(), "hum".to_string()];
        let l = parse_line("hum=41 temp=22", Sep::Auto, Header::Auto, &mut names);
        assert!(same(&vals(&l), &[22.0, 41.0]));
        // 이름 뒤 빈칸
        let mut names = Vec::new();
        let l = parse_line("a: 1 b: 2", Sep::Auto, Header::Auto, &mut names);
        assert!(same(&vals(&l), &[1.0, 2.0]));
        assert_eq!(names, ["a", "b"]);
        // 새 이름이 생기면 뒤에 붙는다, 이름 없는 칸은 자리 번호
        let l = parse_line("c:5,7", Sep::Auto, Header::Auto, &mut names);
        assert!(same(&vals(&l), &[f64::NAN, f64::NAN, 5.0, 7.0]));
        assert_eq!(names, ["a", "b", "c", "2"]);
        // 시각 «12:30» 은 이름:값 이 아님
        assert!(matches!(p("12:30").0, Line::Error(_)));
    }

    #[test]
    fn header_and_errors() {
        assert_eq!(p("time,volt,amp").0, Line::Header(vec!["time".into(), "volt".into(), "amp".into()]));
        assert!(matches!(p("Ready").0, Line::Error(_)));
        let mut n = Vec::new();
        assert!(matches!(parse_line("a,b", Sep::Auto, Header::Off, &mut n), Line::Error(_)));
        match p("1,x,3").0 {
            Line::Values { values, why } => {
                assert!(same(&values, &[1.0, f64::NAN, 3.0]));
                assert!(why.unwrap().contains("«x»"));
            }
            other => panic!("{other:?}"),
        }
        let many = (0..40).map(|i| i.to_string()).collect::<Vec<_>>().join(",");
        match p(&many).0 {
            Line::Values { values, why } => {
                assert_eq!(values.len(), MAX_CHANNELS);
                assert!(why.is_some());
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn text_stream_line_endings_and_pieces() {
        let mut ps = Parser::new(Format::default());
        let mut out = Out::new(10);
        ps.feed(1, b"x,y\r\n1,2\r", false, &mut out);
        ps.feed(2, b"\n3,", false, &mut out);
        ps.feed(3, b"4\n5,6\rbad\n", false, &mut out);
        let rows: Vec<_> = out.rows.iter().map(|r| (r.ts, r.values.clone())).collect();
        assert_eq!(rows, vec![(1, vec![1.0, 2.0]), (3, vec![3.0, 4.0]), (3, vec![5.0, 6.0])]);
        assert_eq!(ps.take_names(), Some(vec!["x".into(), "y".into()]));
        assert_eq!(ps.take_names(), None);
        assert_eq!(out.bad, 1);
        assert!(!out.raw.back().unwrap().ok);
        // UDP — 줄 끝 없는 데이터그램도 한 줄
        let mut ps = Parser::new(Format::default());
        let mut out = Out::new(10);
        ps.feed(5, b"7 8", true, &mut out);
        assert_eq!(out.rows[0].values, vec![7.0, 8.0]);
        // 원시 보기는 최근 것만
        let mut out = Out::new(2);
        ps.feed(6, b"1\n2\n3\n", false, &mut out);
        assert_eq!(out.raw.iter().map(|r| r.text.as_str()).collect::<Vec<_>>(), ["2", "3"]);
    }

    #[test]
    fn long_line_is_cut() {
        let mut ps = Parser::new(Format::default());
        let mut out = Out::new(4);
        ps.feed(1, &vec![b'1'; MAX_LINE + 10], false, &mut out);
        assert_eq!(out.bad, 1);
        assert!(out.raw[0].text.ends_with('…'));
    }

    fn bin(sync: &[u8], ch: usize, num: NumKind, little: bool, ck: Option<ChecksumKind>) -> Format {
        Format::Binary { sync: sync.to_vec(), channels: ch, num, little, checksum: ck, check_sync: false }
    }

    #[test]
    fn number_kinds() {
        assert_eq!(NumKind::I16.read(&[0xFF, 0xFE], false), -2.0);
        assert_eq!(NumKind::I16.read(&[0xFE, 0xFF], true), -2.0);
        assert_eq!(NumKind::U16.read(&[0x12, 0x34], false), 4660.0);
        assert_eq!(NumKind::I8.read(&[0x80], false), -128.0);
        assert_eq!(NumKind::U32.read(&[0, 0, 1, 0], false), 256.0);
        assert_eq!(NumKind::I32.read(&[0xFF, 0xFF, 0xFF, 0xFF], true), -1.0);
        assert_eq!(NumKind::F32.read(&1.5f32.to_be_bytes(), false), 1.5);
        assert_eq!(NumKind::F64.read(&(-2.25f64).to_le_bytes(), true), -2.25);
        assert!(NumKind::F32.read(&f32::NAN.to_le_bytes(), true).is_nan());
    }

    #[test]
    fn binary_sync_checksum_resync() {
        let f = bin(&[0xAA, 0x55], 2, NumKind::I16, true, Some(ChecksumKind::Sum8));
        assert_eq!(f.frame_len(), Some(7));
        let frame = |a: i16, b: i16| {
            let mut v = vec![0xAA, 0x55];
            let body: Vec<u8> = [a.to_le_bytes(), b.to_le_bytes()].concat();
            let s = body.iter().fold(0u8, |x, y| x.wrapping_add(*y));
            v.extend(body);
            v.push(s);
            v
        };
        let mut ps = Parser::new(f);
        let mut out = Out::new(20);
        // 쓰레기 3바이트 + 프레임 + 반 조각
        let mut data = vec![1, 2, 3];
        data.extend(frame(100, -5));
        let second = frame(7, 8);
        data.extend(&second[..4]);
        ps.feed(1, &data, false, &mut out);
        ps.feed(2, &second[4..], false, &mut out);
        assert_eq!(out.rows.iter().map(|r| r.values.clone()).collect::<Vec<_>>(), vec![vec![100.0, -5.0], vec![7.0, 8.0]]);
        assert!(out.raw.iter().any(|r| !r.ok && r.why.as_deref().unwrap_or("").contains('3')));
        // 체크섬 틀린 프레임은 버리고 다음 프레임을 찾는다
        let mut out = Out::new(20);
        let mut broken = frame(1, 1);
        broken[6] ^= 0xFF;
        broken.extend(frame(2, 3));
        ps.feed(3, &broken, false, &mut out);
        assert_eq!(out.rows.len(), 1);
        assert_eq!(out.rows[0].values, vec![2.0, 3.0]);
        assert!(out.bad >= 1);
    }

    #[test]
    fn binary_without_sync_and_formats_json() {
        let mut ps = Parser::new(bin(&[], 1, NumKind::U16, false, None));
        let mut out = Out::new(4);
        ps.feed(1, &[0, 1, 0, 2, 0], false, &mut out);
        ps.feed(2, &[3], false, &mut out);
        assert_eq!(out.rows.iter().map(|r| r.values[0]).collect::<Vec<_>>(), vec![1.0, 2.0, 3.0]);
        let f: Format = serde_json::from_str(r#"{"kind":"binary","sync":[170,85],"channels":3,"num":"f32","little":true,"checksum":"crc16-modbus","checkSync":true}"#).unwrap();
        assert_eq!(f.frame_len(), Some(2 + 12 + 2));
        let t: Format = serde_json::from_str(r#"{"kind":"text"}"#).unwrap();
        assert_eq!(t, Format::default());
        assert!(bin(&[], 0, NumKind::U8, false, None).validate().is_err());
        assert!(bin(&[], 33, NumKind::U8, false, None).validate().is_err());
    }
}
