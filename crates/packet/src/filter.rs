//! 표시 필터 언어 — Wireshark 문법.
//!
//! 필드 비교(`==` `!=` `>` `>=` `<` `<=`, 글자 `eq ne gt ge lt le`), 논리(`&&` `||` `!` `and` `or` `not` `xor`), `contains`·`matches`(`~`)·`in {…}`
//! (범위 `1..5` 포함), 비트(`tcp.flags & 0x02`), IP 대역(`ip.addr == 10.0.0.0/8`), 프로토콜 이름만(`modbus`), 존재 검사(`tcp.analysis.retransmission`).
//!
//! 파서는 오류 위치(바이트 위치·길이)를 돌려준다 — 화면이 빨갛게 칠할 수 있다.
//! 의미: 같은 이름 필드가 여러 개이면(`ip.addr` 는 출발·도착) `==` 는 하나라도 같으면 참, `!=` 는 `!(==)` 와 같다(Wireshark 3.6 이후 규칙).
//! `matches` 는 대소문자를 구분한다(`(?i)` 로 무시) — 정규식은 Rust `regex` 문법이다.

use regex::bytes::Regex;

use crate::dissect::{Depth, Dissection, FieldVal, Value};
use crate::fields::{self, FType, FieldDef};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FilterError {
    /// 오류가 시작하는 바이트 위치(입력 글 안)
    pub pos: usize,
    pub len: usize,
    pub message: String,
    /// 알 수 없는 필드일 때 비슷한 이름들
    pub suggestions: Vec<&'static str>,
}

impl std::fmt::Display for FilterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} (at {})", self.message, self.pos)
    }
}

impl std::error::Error for FilterError {}

#[derive(Clone, Debug)]
enum Lit {
    Int(i128),
    Float(f64),
    Bool(bool),
    Mac([u8; 6]),
    Net4(u32, u32),
    Net6([u8; 16], u8),
    Str(String),
    Bytes(Vec<u8>),
}

#[derive(Clone, Debug)]
enum SetItem {
    One(Lit),
    Range(Lit, Lit),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Op {
    Eq,
    Ne,
    Gt,
    Ge,
    Lt,
    Le,
    Contains,
    Matches,
    In,
}

#[derive(Clone, Debug)]
enum Rhs {
    Lit(Lit),
    Set(Vec<SetItem>),
    Re(Regex),
}

#[derive(Clone, Debug)]
enum Expr {
    Or(Box<Expr>, Box<Expr>),
    And(Box<Expr>, Box<Expr>),
    Xor(Box<Expr>, Box<Expr>),
    Not(Box<Expr>),
    Exists(&'static str),
    Test {
        field: &'static str,
        mask: u64,
    },
    Cmp {
        field: &'static str,
        mask: Option<u64>,
        op: Op,
        rhs: Rhs,
    },
}

/// 컴파일된 표시 필터
#[derive(Clone, Debug)]
pub struct Filter {
    expr: Option<Expr>,
    depth: Depth,
    needs_analysis: bool,
    apps: u8,
    fields: Vec<&'static str>,
}

// ---------------------------------------------------------------- 낱말

#[derive(Clone, Debug, PartialEq)]
enum Tok {
    Word(String),
    Str(String),
    Sym(&'static str),
}

#[derive(Clone, Debug)]
struct Token {
    t: Tok,
    pos: usize,
    len: usize,
}

fn err(pos: usize, len: usize, m: impl Into<String>) -> FilterError {
    FilterError {
        pos,
        len: len.max(1),
        message: m.into(),
        suggestions: vec![],
    }
}

fn is_word_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '/' | '-')
}

fn lex(s: &str) -> Result<Vec<Token>, FilterError> {
    let mut out = Vec::new();
    let b: Vec<(usize, char)> = s.char_indices().collect();
    let mut i = 0;
    while i < b.len() {
        let (p, c) = b[i];
        if c.is_whitespace() {
            i += 1;
            continue;
        }
        let two: String = b[i..].iter().take(2).map(|x| x.1).collect();
        let sym2 = ["==", "!=", ">=", "<=", "&&", "||"]
            .iter()
            .find(|x| **x == two);
        if let Some(sy) = sym2 {
            out.push(Token {
                t: Tok::Sym(sy),
                pos: p,
                len: 2,
            });
            i += 2;
            continue;
        }
        let sym1 = match c {
            '>' => Some(">"),
            '<' => Some("<"),
            '!' => Some("!"),
            '(' => Some("("),
            ')' => Some(")"),
            '{' => Some("{"),
            '}' => Some("}"),
            '&' => Some("&"),
            '~' => Some("~"),
            ',' => Some(","),
            _ => None,
        };
        if let Some(sy) = sym1 {
            out.push(Token {
                t: Tok::Sym(sy),
                pos: p,
                len: 1,
            });
            i += 1;
            continue;
        }
        if c == '"' {
            let mut v = String::new();
            let mut j = i + 1;
            let mut closed = false;
            while j < b.len() {
                let (_, d) = b[j];
                if d == '\\' && j + 1 < b.len() {
                    let (_, e) = b[j + 1];
                    match e {
                        'n' => v.push('\n'),
                        'r' => v.push('\r'),
                        't' => v.push('\t'),
                        'x' if j + 3 < b.len() => {
                            let h: String = b[j + 2..j + 4].iter().map(|x| x.1).collect();
                            match u8::from_str_radix(&h, 16) {
                                Ok(n) => v.push(n as char),
                                Err(_) => {
                                    return Err(err(b[j].0, 4, "Invalid \\x escape in string"));
                                }
                            }
                            j += 2;
                        }
                        other => v.push(other),
                    }
                    j += 2;
                    continue;
                }
                if d == '"' {
                    closed = true;
                    break;
                }
                v.push(d);
                j += 1;
            }
            if !closed {
                return Err(err(
                    p,
                    s.len() - p,
                    "Unterminated string — missing closing quote",
                ));
            }
            let end = b[j].0 + 1;
            out.push(Token {
                t: Tok::Str(v),
                pos: p,
                len: end - p,
            });
            i = j + 1;
            continue;
        }
        if is_word_char(c) {
            let mut j = i;
            while j < b.len() && is_word_char(b[j].1) {
                j += 1;
            }
            let end = if j < b.len() { b[j].0 } else { s.len() };
            out.push(Token {
                t: Tok::Word(s[p..end].to_string()),
                pos: p,
                len: end - p,
            });
            i = j;
            continue;
        }
        return Err(err(p, c.len_utf8(), format!("Unexpected character '{c}'")));
    }
    Ok(out)
}

// ---------------------------------------------------------------- 리터럴

fn parse_int(w: &str) -> Option<i128> {
    let (neg, t) = match w.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, w),
    };
    let v = if let Some(h) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        i128::from_str_radix(h, 16).ok()?
    } else if let Some(bn) = t.strip_prefix("0b").or_else(|| t.strip_prefix("0B")) {
        i128::from_str_radix(bn, 2).ok()?
    } else if t.len() > 1 && t.starts_with('0') && t.bytes().all(|c| (b'0'..=b'7').contains(&c)) {
        i128::from_str_radix(&t[1..], 8).ok()?
    } else if !t.is_empty() && t.bytes().all(|c| c.is_ascii_digit()) {
        t.parse().ok()?
    } else {
        return None;
    };
    Some(if neg { -v } else { v })
}

fn parse_ip4(w: &str) -> Option<[u8; 4]> {
    let mut a = [0u8; 4];
    let mut n = 0;
    for part in w.split('.') {
        if n >= 4 || part.is_empty() || part.len() > 3 || !part.bytes().all(|c| c.is_ascii_digit())
        {
            return None;
        }
        a[n] = part.parse().ok()?;
        n += 1;
    }
    (n == 4).then_some(a)
}

fn parse_mac(w: &str) -> Option<[u8; 6]> {
    let sep = if w.contains(':') {
        ':'
    } else if w.contains('-') {
        '-'
    } else if w.contains('.') {
        '.'
    } else {
        return None;
    };
    let parts: Vec<&str> = w.split(sep).collect();
    if parts.len() != 6
        || parts
            .iter()
            .any(|p| p.len() != 2 || !p.bytes().all(|c| c.is_ascii_hexdigit()))
    {
        return None;
    }
    let mut m = [0u8; 6];
    for (i, p) in parts.iter().enumerate() {
        m[i] = u8::from_str_radix(p, 16).ok()?;
    }
    Some(m)
}

fn parse_bytes(w: &str) -> Option<Vec<u8>> {
    // 00:11:22 · 00-11-22 · 001122
    let t: String = w
        .chars()
        .filter(|c| !matches!(c, ':' | '-' | '.'))
        .collect();
    if t.is_empty() || !t.len().is_multiple_of(2) || !t.bytes().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    Some(
        (0..t.len() / 2)
            .map(|i| u8::from_str_radix(&t[i * 2..i * 2 + 2], 16).unwrap())
            .collect(),
    )
}

fn mask4(prefix: u32) -> u32 {
    if prefix == 0 {
        0
    } else {
        u32::MAX << (32 - prefix)
    }
}

/// 필드 형식에 맞춰 낱말을 리터럴로. 안 맞으면 그 형식을 알려 주는 오류
fn literal_for(
    ft: FType,
    w: &str,
    pos: usize,
    len: usize,
    in_set: bool,
) -> Result<Lit, FilterError> {
    let bad = |what: &str| err(pos, len, format!("'{w}' is not {what}"));
    match ft {
        FType::Uint => parse_int(w)
            .map(Lit::Int)
            .ok_or_else(|| bad("an integer (decimal, 0x hex, 0b binary)")),
        FType::Bool => match w {
            "true" | "TRUE" | "1" => Ok(Lit::Bool(true)),
            "false" | "FALSE" | "0" => Ok(Lit::Bool(false)),
            _ => Err(bad("a boolean (true, false, 1, 0)")),
        },
        FType::Float => {
            if let Some(i) = parse_int(w) {
                return Ok(Lit::Float(i as f64));
            }
            w.parse::<f64>()
                .ok()
                .filter(|x| x.is_finite())
                .map(Lit::Float)
                .ok_or_else(|| bad("a number"))
        }
        FType::Mac => parse_mac(w)
            .map(Lit::Mac)
            .ok_or_else(|| bad("a MAC address like 00:11:22:33:44:55")),
        FType::Ip4 => {
            let (addr, pre) = match w.split_once('/') {
                Some((a, p)) => (a, Some(p)),
                None => (w, None),
            };
            let a = parse_ip4(addr)
                .ok_or_else(|| bad("an IPv4 address like 192.168.0.10 or 10.0.0.0/8"))?;
            let p: u32 = match pre {
                Some(p) => p.parse().ok().filter(|p| *p <= 32).ok_or_else(|| {
                    err(
                        pos,
                        len,
                        format!("'{w}': the prefix length must be 0 to 32"),
                    )
                })?,
                None => 32,
            };
            Ok(Lit::Net4(u32::from_be_bytes(a), mask4(p)))
        }
        FType::Ip6 => {
            let (addr, pre) = match w.split_once('/') {
                Some((a, p)) => (a, Some(p)),
                None => (w, None),
            };
            let a: std::net::Ipv6Addr = addr
                .parse()
                .map_err(|_| bad("an IPv6 address like fe80::1 or 2001:db8::/32"))?;
            let p: u8 = match pre {
                Some(p) => p.parse().ok().filter(|p| *p <= 128).ok_or_else(|| {
                    err(
                        pos,
                        len,
                        format!("'{w}': the prefix length must be 0 to 128"),
                    )
                })?,
                None => 128,
            };
            Ok(Lit::Net6(a.octets(), p))
        }
        FType::Str => Err(err(
            pos,
            len,
            format!("'{w}': a string must be written in double quotes, e.g. \"{w}\""),
        )),
        FType::Bytes => parse_bytes(w)
            .map(Lit::Bytes)
            .ok_or_else(|| bad("a byte sequence like 00:11:22")),
        FType::Label | FType::Proto => {
            let _ = in_set;
            Err(err(
                pos,
                len,
                "This field has no value to compare — write only its name to test that it exists",
            ))
        }
    }
}

// ---------------------------------------------------------------- 파서

struct P<'a> {
    toks: Vec<Token>,
    i: usize,
    src: &'a str,
    fields: Vec<&'static str>,
}

fn edit_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    for i in 1..=a.len() {
        let mut cur = vec![i];
        for j in 1..=b.len() {
            let c = usize::from(a[i - 1] != b[j - 1]);
            cur.push((prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + c));
        }
        prev = cur;
    }
    prev[b.len()]
}

/// 비슷한 필드 이름 — 이름이 그 글로 시작하거나 포함하는 것을 먼저, 아니면 편집 거리가 가까운 순
fn suggest(name: &str) -> Vec<&'static str> {
    let lower = name.to_ascii_lowercase();
    let mut v: Vec<&'static str> = fields::FIELDS
        .iter()
        .filter(|d| d.name.starts_with(&lower))
        .map(|d| d.name)
        .take(8)
        .collect();
    if v.is_empty() {
        v = fields::FIELDS
            .iter()
            .filter(|d| d.name.contains(&lower))
            .map(|d| d.name)
            .take(8)
            .collect();
    }
    if v.is_empty() {
        let mut all: Vec<(usize, &'static str)> = fields::FIELDS
            .iter()
            .map(|d| (edit_distance(&lower, d.name), d.name))
            .collect();
        all.sort();
        v = all
            .into_iter()
            .filter(|(d, _)| *d <= 3)
            .map(|x| x.1)
            .take(5)
            .collect();
    }
    v
}

fn kw(w: &str) -> Option<&'static str> {
    Some(match w.to_ascii_lowercase().as_str() {
        "and" => "and",
        "or" => "or",
        "not" => "not",
        "xor" => "xor",
        "contains" => "contains",
        "matches" => "matches",
        "in" => "in",
        "eq" => "eq",
        "ne" => "ne",
        "gt" => "gt",
        "ge" => "ge",
        "lt" => "lt",
        "le" => "le",
        _ => return None,
    })
}

impl<'a> P<'a> {
    fn peek(&self) -> Option<&Token> {
        self.toks.get(self.i)
    }
    fn end_pos(&self) -> usize {
        self.src.len()
    }
    fn is_sym(&self, s: &str) -> bool {
        matches!(self.peek(), Some(Token { t: Tok::Sym(x), .. }) if *x == s)
    }
    fn is_kw(&self, k: &str) -> bool {
        matches!(self.peek(), Some(Token { t: Tok::Word(w), .. }) if w.eq_ignore_ascii_case(k))
    }

    fn expr(&mut self) -> Result<Expr, FilterError> {
        let mut l = self.xor()?;
        while self.is_sym("||") || self.is_kw("or") {
            self.i += 1;
            let r = self.xor()?;
            l = Expr::Or(Box::new(l), Box::new(r));
        }
        Ok(l)
    }
    fn xor(&mut self) -> Result<Expr, FilterError> {
        let mut l = self.and()?;
        while self.is_kw("xor") {
            self.i += 1;
            let r = self.and()?;
            l = Expr::Xor(Box::new(l), Box::new(r));
        }
        Ok(l)
    }
    fn and(&mut self) -> Result<Expr, FilterError> {
        let mut l = self.not()?;
        while self.is_sym("&&") || self.is_kw("and") {
            self.i += 1;
            let r = self.not()?;
            l = Expr::And(Box::new(l), Box::new(r));
        }
        Ok(l)
    }
    fn not(&mut self) -> Result<Expr, FilterError> {
        if self.is_sym("!") || self.is_kw("not") {
            self.i += 1;
            let e = self.not()?;
            return Ok(Expr::Not(Box::new(e)));
        }
        self.primary()
    }

    fn primary(&mut self) -> Result<Expr, FilterError> {
        let Some(t) = self.peek().cloned() else {
            return Err(err(
                self.end_pos(),
                1,
                "The filter ends too early — expected a field name or '('",
            ));
        };
        if self.is_sym("(") {
            self.i += 1;
            let e = self.expr()?;
            if !self.is_sym(")") {
                let (pos, len) = self
                    .peek()
                    .map(|t| (t.pos, t.len))
                    .unwrap_or((self.end_pos(), 1));
                return Err(err(pos, len, "Missing ')'"));
            }
            self.i += 1;
            return Ok(e);
        }
        let Tok::Word(name) = &t.t else {
            return Err(err(t.pos, t.len, "Expected a field name here"));
        };
        if kw(name).is_some() {
            return Err(err(
                t.pos,
                t.len,
                format!("'{name}' cannot be used here — expected a field name"),
            ));
        }
        let def: &'static FieldDef = match fields::lookup(name) {
            Some(d) => d,
            None => {
                let mut e = err(
                    t.pos,
                    t.len,
                    format!("'{name}' is not a known field or protocol"),
                );
                e.suggestions = suggest(name);
                return Err(e);
            }
        };
        self.i += 1;
        self.fields.push(def.name);
        // 비트 연산자
        let mut mask: Option<u64> = None;
        if self.is_sym("&") {
            self.i += 1;
            let Some(mt) = self.peek().cloned() else {
                return Err(err(self.end_pos(), 1, "Expected a bit mask after '&'"));
            };
            let Tok::Word(w) = &mt.t else {
                return Err(err(mt.pos, mt.len, "Expected a bit mask after '&'"));
            };
            if def.ftype != FType::Uint {
                return Err(err(
                    t.pos,
                    mt.pos + mt.len - t.pos,
                    format!(
                        "'&' works on integer fields; {} is a {}",
                        def.name,
                        def.ftype.name()
                    ),
                ));
            }
            let m = parse_int(w).filter(|m| *m >= 0).ok_or_else(|| {
                err(
                    mt.pos,
                    mt.len,
                    format!("'{w}' is not a bit mask (use e.g. 0x02)"),
                )
            })?;
            mask = Some(m as u64);
            self.i += 1;
        }
        // 비교 연산자
        let op = match self.peek() {
            Some(Token { t: Tok::Sym(s), .. }) => match *s {
                "==" => Some(Op::Eq),
                "!=" => Some(Op::Ne),
                ">" => Some(Op::Gt),
                ">=" => Some(Op::Ge),
                "<" => Some(Op::Lt),
                "<=" => Some(Op::Le),
                "~" => Some(Op::Matches),
                _ => None,
            },
            Some(Token {
                t: Tok::Word(w), ..
            }) => match kw(w) {
                Some("eq") => Some(Op::Eq),
                Some("ne") => Some(Op::Ne),
                Some("gt") => Some(Op::Gt),
                Some("ge") => Some(Op::Ge),
                Some("lt") => Some(Op::Lt),
                Some("le") => Some(Op::Le),
                Some("contains") => Some(Op::Contains),
                Some("matches") => Some(Op::Matches),
                Some("in") => Some(Op::In),
                _ => None,
            },
            _ => None,
        };
        let Some(op) = op else {
            // 값 없이 — 존재 검사(또는 비트 검사)
            return Ok(match mask {
                Some(m) => Expr::Test {
                    field: def.name,
                    mask: m,
                },
                None => Expr::Exists(def.name),
            });
        };
        let optok = self.peek().cloned().unwrap();
        self.i += 1;
        if matches!(def.ftype, FType::Label | FType::Proto) {
            return Err(err(
                optok.pos,
                optok.len,
                format!(
                    "{} has no value — write only the name to test that it exists",
                    def.name
                ),
            ));
        }
        if def.ftype == FType::Bool && !matches!(op, Op::Eq | Op::Ne) {
            return Err(err(
                optok.pos,
                optok.len,
                "A boolean field can only be compared with == or !=",
            ));
        }
        if matches!(def.ftype, FType::Mac | FType::Ip6)
            && matches!(op, Op::Gt | Op::Ge | Op::Lt | Op::Le)
        {
            // 허용하지만 MAC·IPv6 는 보통 쓰지 않는다
        }
        if matches!(op, Op::Contains) && !matches!(def.ftype, FType::Str | FType::Bytes) {
            return Err(err(
                optok.pos,
                optok.len,
                format!(
                    "'contains' works on strings and byte sequences; {} is a {}",
                    def.name,
                    def.ftype.name()
                ),
            ));
        }
        if matches!(op, Op::Matches) && !matches!(def.ftype, FType::Str | FType::Bytes) {
            return Err(err(
                optok.pos,
                optok.len,
                format!(
                    "'matches' works on strings and byte sequences; {} is a {}",
                    def.name,
                    def.ftype.name()
                ),
            ));
        }
        let Some(vt) = self.peek().cloned() else {
            return Err(err(
                self.end_pos(),
                1,
                "Expected a value after the operator",
            ));
        };
        let rhs = match op {
            Op::Matches => {
                let Tok::Str(s) = &vt.t else {
                    return Err(err(
                        vt.pos,
                        vt.len,
                        "'matches' needs a regular expression in double quotes",
                    ));
                };
                self.i += 1;
                Rhs::Re(Regex::new(s).map_err(|e| {
                    err(
                        vt.pos,
                        vt.len,
                        format!(
                            "Invalid regular expression: {}",
                            e.to_string().lines().last().unwrap_or("")
                        ),
                    )
                })?)
            }
            Op::In => {
                if !self.is_sym("{") {
                    return Err(err(vt.pos, vt.len, "'in' needs a set like {1 2 3}"));
                }
                self.i += 1;
                let mut items = Vec::new();
                loop {
                    let Some(it) = self.peek().cloned() else {
                        return Err(err(self.end_pos(), 1, "Missing '}'"));
                    };
                    if self.is_sym("}") {
                        self.i += 1;
                        break;
                    }
                    if self.is_sym(",") {
                        self.i += 1;
                        continue;
                    }
                    match &it.t {
                        Tok::Str(s) if def.ftype == FType::Str => {
                            items.push(SetItem::One(Lit::Str(s.clone())));
                            self.i += 1;
                        }
                        Tok::Word(w) if def.ftype != FType::Str => {
                            if let Some((a, b)) = w.split_once("..") {
                                let la = literal_for(def.ftype, a, it.pos, it.len, true)?;
                                let lb = literal_for(def.ftype, b, it.pos, it.len, true)?;
                                items.push(SetItem::Range(la, lb));
                            } else {
                                items.push(SetItem::One(literal_for(
                                    def.ftype, w, it.pos, it.len, true,
                                )?));
                            }
                            self.i += 1;
                        }
                        _ => return Err(err(it.pos, it.len, "Unexpected item in the set")),
                    }
                }
                if items.is_empty() {
                    return Err(err(vt.pos, vt.len, "The set is empty"));
                }
                Rhs::Set(items)
            }
            _ => {
                self.i += 1;
                match &vt.t {
                    Tok::Str(s) => match def.ftype {
                        FType::Str => Rhs::Lit(Lit::Str(s.clone())),
                        FType::Bytes => Rhs::Lit(Lit::Str(s.clone())),
                        _ => {
                            return Err(err(
                                vt.pos,
                                vt.len,
                                format!(
                                    "{} is a {}; a quoted string does not fit",
                                    def.name,
                                    def.ftype.name()
                                ),
                            ));
                        }
                    },
                    Tok::Word(w) => {
                        if kw(w).is_some() && !matches!(w.as_str(), "true" | "false") {
                            return Err(err(
                                vt.pos,
                                vt.len,
                                format!("Expected a value, found '{w}'"),
                            ));
                        }
                        if def.ftype == FType::Bytes && matches!(op, Op::Contains) {
                            Rhs::Lit(Lit::Bytes(parse_bytes(w).ok_or_else(|| {
                                err(
                                    vt.pos,
                                    vt.len,
                                    format!("'{w}' is not a byte sequence like 00:11:22"),
                                )
                            })?))
                        } else {
                            Rhs::Lit(literal_for(def.ftype, w, vt.pos, vt.len, false)?)
                        }
                    }
                    Tok::Sym(s) => {
                        return Err(err(
                            vt.pos,
                            vt.len,
                            format!("Expected a value, found '{s}'"),
                        ));
                    }
                }
            }
        };
        Ok(Expr::Cmp {
            field: def.name,
            mask,
            op,
            rhs,
        })
    }
}

impl Filter {
    /// 아무것도 거르지 않는 필터
    pub fn all() -> Filter {
        Filter {
            expr: None,
            depth: Depth::Frame,
            needs_analysis: false,
            apps: 0,
            fields: vec![],
        }
    }

    pub fn parse(src: &str) -> Result<Filter, FilterError> {
        let toks = lex(src)?;
        if toks.is_empty() {
            return Ok(Filter::all());
        }
        let mut p = P {
            toks,
            i: 0,
            src,
            fields: vec![],
        };
        let e = p.expr()?;
        if let Some(t) = p.peek() {
            let m = match &t.t {
                Tok::Sym(")") => "Unexpected ')'".to_string(),
                _ => "Unexpected text after the expression — join conditions with && or ||"
                    .to_string(),
            };
            return Err(err(t.pos, t.len, m));
        }
        let mut depth = Depth::Frame;
        let mut na = false;
        let mut apps = 0u8;
        for n in &p.fields {
            apps |= fields::apps_of(n);
            depth = depth.max(fields::depth_of(n));
            na |= fields::needs_analysis(n);
        }
        let mut fl = p.fields;
        fl.sort_unstable();
        fl.dedup();
        Ok(Filter {
            expr: Some(e),
            depth,
            needs_analysis: na,
            apps,
            fields: fl,
        })
    }

    /// 이 필터를 평가하려면 풀어야 하는 가장 깊은 계층(지연 해석)
    pub fn depth(&self) -> Depth {
        self.depth
    }

    /// 풀어야 하는 응용 계층(`APP_*` 비트)
    pub fn apps(&self) -> u8 {
        self.apps
    }

    /// 흐름 분석(상대 번호·재조립·요청/응답 짝)이 필요한가
    pub fn needs_analysis(&self) -> bool {
        self.needs_analysis
    }

    /// 쓰인 필드 이름들
    pub fn fields(&self) -> &[&'static str] {
        &self.fields
    }

    pub fn is_all(&self) -> bool {
        self.expr.is_none()
    }

    /// 해석 결과 하나가 필터에 맞는가. `frame` 은 바이트 필드 비교에 쓰는 프레임 바이트
    pub fn matches(&self, d: &Dissection, frame: &[u8]) -> bool {
        match &self.expr {
            None => true,
            Some(e) => eval(e, d, frame),
        }
    }
}

// ---------------------------------------------------------------- 평가

fn eval(e: &Expr, d: &Dissection, frame: &[u8]) -> bool {
    match e {
        Expr::Or(a, b) => eval(a, d, frame) || eval(b, d, frame),
        Expr::And(a, b) => eval(a, d, frame) && eval(b, d, frame),
        Expr::Xor(a, b) => eval(a, d, frame) ^ eval(b, d, frame),
        Expr::Not(a) => !eval(a, d, frame),
        Expr::Exists(n) => d.fields.iter().any(|f| f.name == *n),
        Expr::Test { field, mask } => d
            .fields
            .iter()
            .any(|f| f.name == *field && matches!(f.value, Value::U(v) if v & mask != 0)),
        Expr::Cmp {
            field,
            mask,
            op,
            rhs,
        } => {
            let any_eq =
                |lit: &Lit| field_values(d, field).any(|v| cmp(&v, *mask, Op::Eq, lit, frame));
            match (op, rhs) {
                (Op::Ne, Rhs::Lit(l)) => !any_eq(l),
                (Op::Eq, Rhs::Lit(l)) => any_eq(l),
                (Op::In, Rhs::Set(items)) => field_values(d, field).any(|v| {
                    items.iter().any(|it| match it {
                        SetItem::One(l) => cmp(&v, *mask, Op::Eq, l, frame),
                        SetItem::Range(a, b) => {
                            cmp(&v, *mask, Op::Ge, a, frame) && cmp(&v, *mask, Op::Le, b, frame)
                        }
                    })
                }),
                (Op::Matches, Rhs::Re(re)) => field_values(d, field).any(|v| match &v {
                    Value::Str(s) => re.is_match(s.as_bytes()),
                    Value::Bytes(s, l) => frame
                        .get(*s as usize..(*s + *l) as usize)
                        .is_some_and(|b| re.is_match(b)),
                    _ => false,
                }),
                (op, Rhs::Lit(l)) => field_values(d, field).any(|v| cmp(&v, *mask, *op, l, frame)),
                _ => false,
            }
        }
    }
}

/// 필드 값들 — `frame.protocols` 는 해석한 계층 목록에서 만든다(필드로도 들어 있지만 깊이가 모자랄 때를 위해)
fn field_values<'a>(d: &'a Dissection, name: &'static str) -> impl Iterator<Item = Value> + 'a {
    d.fields
        .iter()
        .filter(move |f: &&FieldVal| f.name == name)
        .map(|f| f.value.clone())
}

fn ord_ok(o: std::cmp::Ordering, op: Op) -> bool {
    use std::cmp::Ordering::*;
    match op {
        Op::Eq => o == Equal,
        Op::Ne => o != Equal,
        Op::Gt => o == Greater,
        Op::Ge => o != Less,
        Op::Lt => o == Less,
        Op::Le => o != Greater,
        _ => false,
    }
}

fn cmp(v: &Value, mask: Option<u64>, op: Op, lit: &Lit, frame: &[u8]) -> bool {
    match (v, lit) {
        (Value::U(a), Lit::Int(b)) => {
            let a = match mask {
                Some(m) => (*a & m) as i128,
                None => *a as i128,
            };
            ord_ok(a.cmp(b), op)
        }
        (Value::I(a), Lit::Int(b)) => ord_ok((*a as i128).cmp(b), op),
        (Value::U(a), Lit::Float(b)) => (*a as f64).partial_cmp(b).is_some_and(|o| ord_ok(o, op)),
        (Value::F(a), Lit::Float(b)) => a.partial_cmp(b).is_some_and(|o| ord_ok(o, op)),
        (Value::F(a), Lit::Int(b)) => a.partial_cmp(&(*b as f64)).is_some_and(|o| ord_ok(o, op)),
        (Value::B(a), Lit::Bool(b)) => ord_ok(a.cmp(b), op),
        (Value::Mac(a), Lit::Mac(b)) => ord_ok(a.cmp(b), op),
        (Value::Ip4(a), Lit::Net4(addr, mask)) => {
            let x = u32::from_be_bytes(*a);
            match op {
                Op::Eq => x & mask == addr & mask,
                Op::Ne => x & mask != addr & mask,
                o => ord_ok(x.cmp(addr), o),
            }
        }
        (Value::Ip6(a), Lit::Net6(addr, prefix)) => {
            let n = *prefix as usize;
            let same = {
                let full = n / 8;
                a[..full] == addr[..full]
                    && (n.is_multiple_of(8) || (a[full] ^ addr[full]) >> (8 - n % 8) == 0)
            };
            match op {
                Op::Eq => same,
                Op::Ne => !same,
                o => ord_ok(a.cmp(addr), o),
            }
        }
        (Value::Str(a), Lit::Str(b)) => match op {
            Op::Contains => a.contains(b.as_str()),
            o => ord_ok(a.as_str().cmp(b.as_str()), o),
        },
        (Value::Bytes(s, l), Lit::Bytes(b)) => {
            let Some(data) = frame.get(*s as usize..(*s + *l) as usize) else {
                return false;
            };
            match op {
                Op::Contains => !b.is_empty() && data.windows(b.len()).any(|w| w == &b[..]),
                o => ord_ok(data.cmp(&b[..]), o),
            }
        }
        (Value::Bytes(s, l), Lit::Str(b)) => {
            let Some(data) = frame.get(*s as usize..(*s + *l) as usize) else {
                return false;
            };
            match op {
                Op::Contains => !b.is_empty() && data.windows(b.len()).any(|w| w == b.as_bytes()),
                o => ord_ok(data.cmp(b.as_bytes()), o),
            }
        }
        _ => false,
    }
}
