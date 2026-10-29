//! MC 프로토콜(SLMP) 서버 흉내 — PC 가 PLC 의 이더넷 포트처럼 3E·4E 프레임(이진·ASCII)에 답한다.
//!
//! 근거(공개 매뉴얼, 저장소에는 넣지 않고 링크만 — docs·도움말 참고):
//! - SLMP Reference Manual SH(NA)-080956ENG rev. L — 4장 메시지 형식(머리·길이·종료 코드·오류 정보),
//!   5.2 디바이스 코드 표와 0401·1401·0403·1402 명령, 5.9 루프백 0619
//! - MELSEC Communication Protocol Reference Manual SH-080008 rev. AB — 5장 이더넷 메시지(3E·4E 같은 모양)
//! - 종료 코드 값: MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG rev. AF, 3.5 List of Error Codes(C050~C061).
//!   어느 조건에 어느 코드를 쓸지는 그 표의 설명을 보고 이 흉내가 고른 것이다 — 실제 PLC 와 다를 수 있다.
//!
//! 구현한 명령: 0401 일괄 읽기·1401 일괄 쓰기(서브 0000·0001·0002·0003), 0403 랜덤 읽기(0000·0002),
//! 1402 랜덤 쓰기(0000·0001·0002·0003), 0619 루프백(0000). 그 밖의 명령·서브 명령(0080 등 확장 지정 포함)은 C059.
//! 디바이스: X·Y·M·L·F·B·SM(비트) · D·W·R·ZR·SD(워드) · TS·TC·CS·CC(비트)·TN·CN(워드). X·Y·B·W·ZR 는 16진 번호.
//! 디바이스마다 크기(점 수)를 정하고(최대 65536), 넘으면 C056.
//! 장애 주입(지연·무응답·종료 코드 강제)과 값 자동 변화(regmap)는 Modbus Slave 와 같은 부품을 쓴다.

use crate::framer::{FrameMode, LengthEncoding};
use crate::regmap::{Rng, SimRun, SimSpec, ValueType, decode, encode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{Duration, Instant};

// ---------------------------------------------------------------- 종료 코드(SH-081257ENG 3.5)

/// ASCII 코드로 바꿀 수 없는 글자를 받음
pub const E_ASCII: u16 = 0xC050;
/// 읽기·쓰기 점 수가 범위 밖(워드 단위)
pub const E_POINTS_WORD: u16 = 0xC051;
/// 읽기·쓰기 점 수가 범위 밖(비트 단위)
pub const E_POINTS_BIT: u16 = 0xC052;
/// 랜덤 읽기·쓰기 점 수가 범위 밖(비트 단위)
pub const E_RANDOM_BIT: u16 = 0xC053;
/// 랜덤 읽기·쓰기 점 수가 범위 밖(워드·더블워드)
pub const E_RANDOM_WORD: u16 = 0xC054;
/// 요청이 가장 큰 주소를 넘음
pub const E_ADDRESS: u16 = 0xC056;
/// 요청 데이터 길이가 실제 글자 수와 다름(머리의 길이 칸)
pub const E_LENGTH: u16 = 0xC057;
/// 명령·서브 명령이 틀림, 지원하지 않는 기능
pub const E_COMMAND: u16 = 0xC059;
/// 지정한 디바이스를 읽거나 쓸 수 없음
pub const E_DEVICE: u16 = 0xC05B;
/// 받은 요청 데이터가 틀림
pub const E_REQUEST: u16 = 0xC05C;
/// 지정한 접근 대상으로는 실행할 수 없음(자기 국 요청만 받을 때 다른 국 요청)
pub const E_TARGET: u16 = 0xC05F;
/// 비트 디바이스 요청 내용이 틀림(ON/OFF 가 0·1 이 아님)
pub const E_BIT_VALUE: u16 = 0xC060;
/// 명령 데이터 길이가 요청한 점 수와 맞지 않음
pub const E_DATA_LEN: u16 = 0xC061;

/// 화면·기록에 보일 종료 코드 설명(한·영)
pub fn end_code_text(code: u16) -> &'static str {
    match code {
        0 => crate::tr!("완료", "OK"),
        E_ASCII => crate::tr!("ASCII 변환 불가", "ASCII conversion error"),
        E_POINTS_WORD => crate::tr!("점 수 범위 밖(워드)", "points out of range (words)"),
        E_POINTS_BIT => crate::tr!("점 수 범위 밖(비트)", "points out of range (bits)"),
        E_RANDOM_BIT => crate::tr!("랜덤 점 수 범위 밖(비트)", "random points out of range (bits)"),
        E_RANDOM_WORD => crate::tr!("랜덤 점 수 범위 밖(워드)", "random points out of range (words)"),
        E_ADDRESS => crate::tr!("주소 범위 밖", "address out of range"),
        E_LENGTH => crate::tr!("요청 길이 불일치", "request length mismatch"),
        E_COMMAND => crate::tr!("명령·서브 명령 틀림", "wrong command/subcommand"),
        E_DEVICE => crate::tr!("디바이스 지정 틀림", "device cannot be accessed"),
        E_REQUEST => crate::tr!("요청 데이터 틀림", "request data error"),
        E_TARGET => crate::tr!("접근 대상 틀림", "wrong access destination"),
        E_BIT_VALUE => crate::tr!("비트 값 틀림", "bit request error"),
        E_DATA_LEN => crate::tr!("데이터 길이 불일치", "data length mismatch"),
        _ => crate::tr!("강제·기타", "forced/other"),
    }
}

// ---------------------------------------------------------------- 디바이스(SLMP 5.2 디바이스 코드 표)

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Dev {
    X,
    Y,
    M,
    L,
    F,
    B,
    Sm,
    D,
    W,
    R,
    Zr,
    Sd,
    Ts,
    Tc,
    Tn,
    Cs,
    Cc,
    Cn,
}

/// 디바이스 한 종류의 성질
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevInfo {
    pub dev: Dev,
    /// 화면·ASCII 코드에 쓰는 이름(«SM», «ZR»)
    pub name: &'static str,
    /// 이진 코드(서브 명령 0000·0001 은 1바이트, 0002·0003 은 2바이트로 같은 값)
    pub code: u8,
    pub bits: bool,
    /// 번호를 16진으로 쓰는지(X·Y·B·W·ZR)
    pub hex: bool,
    /// 기본 크기(점 수) — 실제 기종의 상한과 같다고 내세우지 않는 작은 값
    pub default_size: u32,
}

/// 디바이스 하나의 최대 크기(점 수)
pub const MAX_SIZE: u32 = 65_536;

pub const DEVICES: [DevInfo; 18] = [
    DevInfo { dev: Dev::X, name: "X", code: 0x9C, bits: true, hex: true, default_size: 8192 },
    DevInfo { dev: Dev::Y, name: "Y", code: 0x9D, bits: true, hex: true, default_size: 8192 },
    DevInfo { dev: Dev::M, name: "M", code: 0x90, bits: true, hex: false, default_size: 8192 },
    DevInfo { dev: Dev::L, name: "L", code: 0x92, bits: true, hex: false, default_size: 8192 },
    DevInfo { dev: Dev::F, name: "F", code: 0x93, bits: true, hex: false, default_size: 2048 },
    DevInfo { dev: Dev::B, name: "B", code: 0xA0, bits: true, hex: true, default_size: 8192 },
    DevInfo { dev: Dev::Sm, name: "SM", code: 0x91, bits: true, hex: false, default_size: 2048 },
    DevInfo { dev: Dev::D, name: "D", code: 0xA8, bits: false, hex: false, default_size: 12288 },
    DevInfo { dev: Dev::W, name: "W", code: 0xB4, bits: false, hex: true, default_size: 8192 },
    DevInfo { dev: Dev::R, name: "R", code: 0xAF, bits: false, hex: false, default_size: 32768 },
    DevInfo { dev: Dev::Zr, name: "ZR", code: 0xB0, bits: false, hex: true, default_size: 65536 },
    DevInfo { dev: Dev::Sd, name: "SD", code: 0xA9, bits: false, hex: false, default_size: 2048 },
    DevInfo { dev: Dev::Ts, name: "TS", code: 0xC1, bits: true, hex: false, default_size: 1024 },
    DevInfo { dev: Dev::Tc, name: "TC", code: 0xC0, bits: true, hex: false, default_size: 1024 },
    DevInfo { dev: Dev::Tn, name: "TN", code: 0xC2, bits: false, hex: false, default_size: 1024 },
    DevInfo { dev: Dev::Cs, name: "CS", code: 0xC4, bits: true, hex: false, default_size: 1024 },
    DevInfo { dev: Dev::Cc, name: "CC", code: 0xC3, bits: true, hex: false, default_size: 1024 },
    DevInfo { dev: Dev::Cn, name: "CN", code: 0xC5, bits: false, hex: false, default_size: 1024 },
];

impl Dev {
    pub fn info(self) -> &'static DevInfo {
        DEVICES.iter().find(|d| d.dev == self).expect("DEVICES 에 모든 Dev")
    }
    pub fn name(self) -> &'static str {
        self.info().name
    }
    pub fn bits(self) -> bool {
        self.info().bits
    }
    fn from_code(code: u32) -> Option<Self> {
        DEVICES.iter().find(|d| d.code as u32 == code).map(|d| d.dev)
    }
    /// ASCII 코드의 디바이스 글자(«M*», «SM», «ZR**», «M  »)
    fn from_ascii(s: &[u8]) -> Option<Self> {
        let end = s.iter().position(|&c| c == b'*' || c == b' ').unwrap_or(s.len());
        // 이름 뒤는 «*»·공백만
        if s[end..].iter().any(|&c| c != b'*' && c != b' ') || end == 0 {
            return None;
        }
        let name = std::str::from_utf8(&s[..end]).ok()?;
        DEVICES.iter().find(|d| d.name.eq_ignore_ascii_case(name)).map(|d| d.dev)
    }
    /// 번호 글(«X1F», «D100») — 16진 디바이스는 16진으로
    pub fn addr_text(self, n: u32) -> String {
        if self.info().hex { format!("{}{:X}", self.name(), n) } else { format!("{}{}", self.name(), n) }
    }
}

// ---------------------------------------------------------------- 프레임 형식

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub enum FrameKind {
    #[default]
    #[serde(rename = "3e")]
    E3,
    #[serde(rename = "4e")]
    E4,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DataCode {
    #[default]
    Binary,
    Ascii,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct Format {
    pub frame: FrameKind,
    pub code: DataCode,
}

/// 요청 하나의 최대 길이 — 가장 긴 요청(ASCII 워드 960점 쓰기 ≈ 3900글자)보다 넉넉히
pub const MAX_FRAME: usize = 8192;

impl Format {
    fn ascii(self) -> bool {
        self.code == DataCode::Ascii
    }

    /// 머리에서 길이 칸까지(부머리 + 네트워크·국·I/O·멀티드롭)의 길이
    fn len_offset(self) -> usize {
        let sub = match (self.frame, self.ascii()) {
            (FrameKind::E3, false) => 2,
            (FrameKind::E4, false) => 6,
            (FrameKind::E3, true) => 4,
            (FrameKind::E4, true) => 12,
        };
        sub + if self.ascii() { 10 } else { 5 }
    }

    fn len_size(self) -> usize {
        if self.ascii() { 4 } else { 2 }
    }

    /// 프레임 구분 — 길이 칸(이진 리틀 엔디언 2바이트, ASCII 16진 4글자)으로. 전체 = 길이 + 길이 칸 끝까지
    pub fn frame_mode(self) -> FrameMode {
        let (offset, size) = (self.len_offset(), self.len_size());
        FrameMode::LengthField {
            offset,
            size: size as u8,
            adjust: (offset + size) as i64,
            max: MAX_FRAME,
            gap_ms: 1_000,
            encoding: if self.ascii() { LengthEncoding::AsciiHex } else { LengthEncoding::LittleEndian },
        }
    }

    /// 화면·기록용 이름(«3E 이진»)
    pub fn label(self) -> String {
        let f = if self.frame == FrameKind::E3 { "3E" } else { "4E" };
        format!("{f} {}", if self.ascii() { "ASCII" } else { crate::tr!("이진", "binary") })
    }
}

// ---------------------------------------------------------------- 읽기·쓰기 도우미(이진 리틀 엔디언 / ASCII 16진 큰 자리 먼저)

struct Rd<'a> {
    b: &'a [u8],
    i: usize,
    ascii: bool,
}

fn hex_val(s: &[u8]) -> Result<u32, u16> {
    let mut v = 0u32;
    for &c in s {
        v = (v << 4) | (c as char).to_digit(16).ok_or(E_ASCII)?;
    }
    Ok(v)
}

impl<'a> Rd<'a> {
    fn new(b: &'a [u8], ascii: bool) -> Self {
        Self { b, i: 0, ascii }
    }
    fn take(&mut self, n: usize) -> Result<&'a [u8], u16> {
        let s = self.b.get(self.i..self.i + n).ok_or(E_DATA_LEN)?;
        self.i += n;
        Ok(s)
    }
    /// 이진 n 바이트(리틀 엔디언) 또는 ASCII 2n 글자(16진)
    fn num(&mut self, n: usize) -> Result<u32, u16> {
        if self.ascii {
            hex_val(self.take(n * 2)?)
        } else {
            Ok(self.take(n)?.iter().rev().fold(0u32, |a, &b| (a << 8) | b as u32))
        }
    }
    fn left(&self) -> usize {
        self.b.len() - self.i
    }
    fn end(&self) -> Result<(), u16> {
        if self.left() == 0 { Ok(()) } else { Err(E_DATA_LEN) }
    }
    /// 디바이스 하나(이진: 번호 3·4바이트 + 코드 1·2바이트, ASCII: 코드 2·4글자 + 번호 6·8글자)
    fn device(&mut self, wide: bool) -> Result<(Dev, u32), u16> {
        if self.ascii {
            let code = self.take(if wide { 4 } else { 2 })?;
            // 글자가 16진·디바이스 이름 글자가 아니면 변환 오류, 이름이 없으면 디바이스 오류
            if code.iter().any(|c| !(c.is_ascii_alphanumeric() || *c == b'*' || *c == b' ')) {
                return Err(E_ASCII);
            }
            let dev = Dev::from_ascii(code).ok_or(E_DEVICE)?;
            let digits = self.take(if wide { 8 } else { 6 })?;
            // 앞자리 0 대신 공백도 된다
            let start = digits.iter().position(|&c| c != b' ').unwrap_or(digits.len());
            let mut n = 0u32;
            for &c in &digits[start..] {
                let d = if dev.info().hex { (c as char).to_digit(16) } else { (c as char).to_digit(10) }.ok_or(E_ASCII)?;
                n = n.checked_mul(if dev.info().hex { 16 } else { 10 }).and_then(|x| x.checked_add(d)).ok_or(E_ADDRESS)?;
            }
            Ok((dev, n))
        } else {
            let n = self.num(if wide { 4 } else { 3 })?;
            let code = self.num(if wide { 2 } else { 1 })?;
            Ok((Dev::from_code(code).ok_or(E_DEVICE)?, n))
        }
    }
}

struct Wr {
    out: Vec<u8>,
    ascii: bool,
}

impl Wr {
    fn new(ascii: bool) -> Self {
        Self { out: Vec::new(), ascii }
    }
    fn num(&mut self, v: u32, n: usize) {
        if self.ascii {
            self.out.extend(format!("{:0w$X}", v, w = n * 2).into_bytes());
        } else {
            self.out.extend(&v.to_le_bytes()[..n]);
        }
    }
}

// ---------------------------------------------------------------- 디바이스 메모리

#[derive(Clone)]
pub struct Memory {
    /// 디바이스마다 값(비트 디바이스는 0/1)
    pub data: BTreeMap<Dev, Vec<u16>>,
    /// 값 자동 변화 — 디바이스마다
    pub sims: BTreeMap<Dev, Vec<SimRun>>,
}

impl Default for Memory {
    fn default() -> Self {
        Self { data: DEVICES.iter().map(|d| (d.dev, vec![0; d.default_size as usize])).collect(), sims: BTreeMap::new() }
    }
}

fn apply_sim(table: &mut [u16], spec: &SimSpec, t: Duration, rng: &mut Rng) {
    let (a, b) = spec.span();
    let (a, b) = (a as usize, b as usize);
    if b > table.len() {
        return;
    }
    let cur = decode(&table[a..b], spec.value_type, spec.order).unwrap_or(0.0);
    let v = spec.next(cur, t, rng);
    table[a..b].copy_from_slice(&encode(v, spec.value_type, spec.order));
}

impl Memory {
    pub fn size(&self, d: Dev) -> u32 {
        self.data.get(&d).map_or(0, |v| v.len() as u32)
    }

    /// 크기를 바꾼다(값은 남는 데까지 둔다). 1~65536
    pub fn resize(&mut self, d: Dev, size: u32) -> Result<(), String> {
        if !(1..=MAX_SIZE).contains(&size) {
            return Err(crate::tr!(format!("{} 크기는 1~{MAX_SIZE} 점입니다", d.name()), format!("{} size must be 1–{MAX_SIZE} points", d.name())));
        }
        self.data.entry(d).or_default().resize(size as usize, 0);
        Ok(())
    }

    pub fn get(&self, d: Dev, start: u32, count: u32) -> Result<Vec<u16>, String> {
        let v = self.data.get(&d).ok_or("device")?;
        let end = start as usize + count as usize;
        if end > v.len() {
            return Err(crate::tr!(format!("{} 범위 밖({}점)", d.name(), v.len()), format!("{} out of range ({} points)", d.name(), v.len())));
        }
        Ok(v[start as usize..end].to_vec())
    }

    pub fn set(&mut self, d: Dev, start: u32, values: &[u16]) -> Result<(), String> {
        let bits = d.bits();
        let v = self.data.get_mut(&d).ok_or("device")?;
        let end = start as usize + values.len();
        if end > v.len() {
            return Err(crate::tr!(format!("{} 범위 밖({}점)", d.name(), v.len()), format!("{} out of range ({} points)", d.name(), v.len())));
        }
        for (i, &x) in values.iter().enumerate() {
            v[start as usize + i] = if bits { (x != 0) as u16 } else { x };
        }
        Ok(())
    }

    fn fits(&self, d: Dev, start: u32, points: u64) -> bool {
        start as u64 + points <= self.size(d) as u64
    }

    /// 워드 하나 — 비트 디바이스면 16점(번호가 작은 점이 비트 0)
    fn word(&self, d: Dev, start: u32, k: u32) -> u16 {
        let v = &self.data[&d];
        if d.bits() {
            (0..16).fold(0u16, |w, j| w | ((v[(start + k * 16 + j) as usize] & 1) << j))
        } else {
            v[(start + k) as usize]
        }
    }

    fn set_word(&mut self, d: Dev, start: u32, k: u32, w: u16) {
        let bits = d.bits();
        let v = self.data.get_mut(&d).unwrap();
        if bits {
            for j in 0..16 {
                v[(start + k * 16 + j) as usize] = (w >> j) & 1;
            }
        } else {
            v[(start + k) as usize] = w;
        }
    }

    /// «읽을 때마다» 자동 변화 — [lo, hi) 에 걸친 것만
    fn sims_on_read(&mut self, d: Dev, lo: u32, hi: u32, t: Duration, rng: &mut Rng) {
        let Some(list) = self.sims.get(&d) else { return };
        let due: Vec<SimSpec> = list.iter().filter(|r| r.spec.on_read() && r.spec.span().0 < hi && r.spec.span().1 > lo).map(|r| r.spec.clone()).collect();
        if let Some(v) = self.data.get_mut(&d) {
            for s in due {
                apply_sim(v, &s, t, rng);
            }
        }
    }

    fn tick(&mut self, now: Instant, t: Duration, rng: &mut Rng) {
        let devs: Vec<Dev> = self.sims.keys().copied().collect();
        for d in devs {
            let mut list = std::mem::take(self.sims.get_mut(&d).unwrap());
            if let Some(v) = self.data.get_mut(&d) {
                for run in list.iter_mut().filter(|r| !r.spec.on_read()) {
                    if run.last.is_some_and(|l| now.duration_since(l) < Duration::from_millis(run.spec.period_ms)) {
                        continue;
                    }
                    run.last = Some(now);
                    apply_sim(v, &run.spec, t, rng);
                }
            }
            *self.sims.get_mut(&d).unwrap() = list;
        }
    }
}

// ---------------------------------------------------------------- 요청(명령 데이터) 해석 → 실행

/// 해석한 요청. 번호·점 수는 아직 범위를 보지 않았다(실행 때 C056)
#[derive(Debug, Clone, PartialEq)]
enum Req {
    /// 0401 — bit: 1점 단위(서브 0001·0003), 아니면 워드 단위
    Read { bit: bool, dev: Dev, start: u32, n: u32 },
    /// 1401 — 값은 비트(0/1) 또는 워드
    Write { bit: bool, dev: Dev, start: u32, values: Vec<u16> },
    /// 0403
    RandomRead { words: Vec<(Dev, u32)>, dwords: Vec<(Dev, u32)> },
    /// 1402 비트 단위
    RandomWriteBits { items: Vec<(Dev, u32, bool)> },
    /// 1402 워드 단위
    RandomWriteWords { words: Vec<(Dev, u32, u16)>, dwords: Vec<(Dev, u32, u32)> },
    /// 0619
    Loopback { data: Vec<u8> },
}

impl Req {
    /// 건드리는 디바이스(장애 대상 고르기·기록)
    fn devices(&self) -> Vec<Dev> {
        let mut v: Vec<Dev> = match self {
            Req::Read { dev, .. } | Req::Write { dev, .. } => vec![*dev],
            Req::RandomRead { words, dwords } => words.iter().chain(dwords).map(|x| x.0).collect(),
            Req::RandomWriteBits { items } => items.iter().map(|x| x.0).collect(),
            Req::RandomWriteWords { words, dwords } => words.iter().map(|x| x.0).chain(dwords.iter().map(|x| x.0)).collect(),
            Req::Loopback { .. } => Vec::new(),
        };
        v.sort();
        v.dedup();
        v
    }

    fn writes(&self) -> bool {
        matches!(self, Req::Write { .. } | Req::RandomWriteBits { .. } | Req::RandomWriteWords { .. })
    }
}

/// 서브 명령 → (비트 단위, 넓은 디바이스 지정(iQ-R 0002·0003)). 모르면 C059
fn sub_kind(sub: u16) -> Result<(bool, bool), u16> {
    match sub {
        0x0000 => Ok((false, false)),
        0x0001 => Ok((true, false)),
        0x0002 => Ok((false, true)),
        0x0003 => Ok((true, true)),
        _ => Err(E_COMMAND),
    }
}

/// 명령·서브 명령 뒤 데이터 해석
fn parse(cmd: u16, sub: u16, body: &[u8], ascii: bool) -> Result<Req, u16> {
    let mut r = Rd::new(body, ascii);
    match cmd {
        0x0401 | 0x1401 => {
            let (bit, wide) = sub_kind(sub)?;
            let (dev, start) = r.device(wide)?;
            let n = r.num(2)?;
            if bit && !dev.bits() {
                return Err(E_DEVICE);
            }
            let max = if !bit { 960 } else if ascii { 3584 } else { 7168 };
            if n == 0 || n > max {
                return Err(if bit { E_POINTS_BIT } else { E_POINTS_WORD });
            }
            if cmd == 0x0401 {
                r.end()?;
                return Ok(Req::Read { bit, dev, start, n });
            }
            let values = if bit {
                let mut v = Vec::with_capacity(n as usize);
                if ascii {
                    for &c in r.take(n as usize)? {
                        v.push(match c {
                            b'0' => 0,
                            b'1' => 1,
                            _ => return Err(E_BIT_VALUE),
                        });
                    }
                } else {
                    // 한 점 = 4비트, 앞 점이 위 4비트. 홀수면 마지막 아래 4비트는 0
                    let raw = r.take(n.div_ceil(2) as usize)?;
                    for i in 0..n as usize {
                        let nib = if i % 2 == 0 { raw[i / 2] >> 4 } else { raw[i / 2] & 0x0F };
                        if nib > 1 {
                            return Err(E_BIT_VALUE);
                        }
                        v.push(nib as u16);
                    }
                }
                v
            } else {
                (0..n).map(|_| r.num(2).map(|x| x as u16)).collect::<Result<Vec<_>, _>>()?
            };
            r.end()?;
            Ok(Req::Write { bit, dev, start, values })
        }
        0x0403 => {
            let wide = match sub {
                0x0000 => false,
                0x0002 => true,
                _ => return Err(E_COMMAND),
            };
            let (nw, nd) = (r.num(1)?, r.num(1)?);
            let max = if wide { 96 } else { 192 };
            if nw + nd == 0 || nw + nd > max {
                return Err(E_RANDOM_WORD);
            }
            let words = (0..nw).map(|_| r.device(wide)).collect::<Result<Vec<_>, _>>()?;
            let dwords = (0..nd).map(|_| r.device(wide)).collect::<Result<Vec<_>, _>>()?;
            r.end()?;
            Ok(Req::RandomRead { words, dwords })
        }
        0x1402 => {
            let (bit, wide) = sub_kind(sub)?;
            if bit {
                let n = r.num(1)?;
                let max = if wide { 94 } else { 188 };
                if n == 0 || n > max {
                    return Err(E_RANDOM_BIT);
                }
                let mut items = Vec::with_capacity(n as usize);
                for _ in 0..n {
                    let (dev, no) = r.device(wide)?;
                    if !dev.bits() {
                        return Err(E_DEVICE);
                    }
                    // ON/OFF — 서브 0001: 1바이트(ASCII 2글자), 0003: 2바이트(ASCII 4글자). 이진 0003 은 ON = 01 00
                    let v = r.num(if wide { 2 } else { 1 })?;
                    let on = match v {
                        0 => false,
                        1 => true,
                        _ => return Err(E_BIT_VALUE),
                    };
                    items.push((dev, no, on));
                }
                r.end()?;
                Ok(Req::RandomWriteBits { items })
            } else {
                let (nw, nd) = (r.num(1)?, r.num(1)?);
                let load = nw * 12 + nd * 14;
                let max = if wide { 960 } else { 1920 };
                if nw + nd == 0 || load > max {
                    return Err(E_RANDOM_WORD);
                }
                let mut words = Vec::with_capacity(nw as usize);
                for _ in 0..nw {
                    let (dev, no) = r.device(wide)?;
                    words.push((dev, no, r.num(2)? as u16));
                }
                let mut dwords = Vec::with_capacity(nd as usize);
                for _ in 0..nd {
                    let (dev, no) = r.device(wide)?;
                    dwords.push((dev, no, r.num(4)?));
                }
                r.end()?;
                Ok(Req::RandomWriteWords { words, dwords })
            }
        }
        0x0619 => {
            if sub != 0 {
                return Err(E_COMMAND);
            }
            let n = r.num(2)? as usize;
            if !(1..=960).contains(&n) {
                return Err(E_REQUEST);
            }
            let data = r.take(n)?.to_vec();
            r.end()?;
            Ok(Req::Loopback { data })
        }
        _ => Err(E_COMMAND),
    }
}

/// 실행 — 응답 데이터(종료 코드 뒤)를 돌려준다. 범위는 다 본 뒤에 쓴다(일부만 쓰이지 않게)
fn execute(m: &mut Memory, req: &Req, ascii: bool, t: Duration, rng: &mut Rng) -> Result<Vec<u8>, u16> {
    let mut w = Wr::new(ascii);
    // 점 수(워드 단위 비트 디바이스는 16점, 더블워드는 32점/2워드)
    let span = |d: Dev, words: u32| if d.bits() { words as u64 * 16 } else { words as u64 };
    match req {
        Req::Read { bit, dev, start, n } => {
            let pts = if *bit { *n as u64 } else { span(*dev, *n) };
            if !m.fits(*dev, *start, pts) {
                return Err(E_ADDRESS);
            }
            m.sims_on_read(*dev, *start, (*start as u64 + pts) as u32, t, rng);
            if *bit {
                let v = &m.data[dev][*start as usize..*start as usize + *n as usize];
                if ascii {
                    w.out.extend(v.iter().map(|&b| if b != 0 { b'1' } else { b'0' }));
                } else {
                    for pair in v.chunks(2) {
                        w.out.push(((pair[0] & 1) as u8) << 4 | pair.get(1).map_or(0, |&b| (b & 1) as u8));
                    }
                }
            } else {
                for k in 0..*n {
                    w.num(m.word(*dev, *start, k) as u32, 2);
                }
            }
        }
        Req::Write { bit, dev, start, values } => {
            let pts = if *bit { values.len() as u64 } else { span(*dev, values.len() as u32) };
            if !m.fits(*dev, *start, pts) {
                return Err(E_ADDRESS);
            }
            if *bit {
                m.data.get_mut(dev).unwrap()[*start as usize..*start as usize + values.len()].copy_from_slice(values);
            } else {
                for (k, &x) in values.iter().enumerate() {
                    m.set_word(*dev, *start, k as u32, x);
                }
            }
        }
        Req::RandomRead { words, dwords } => {
            if words.iter().any(|&(d, n)| !m.fits(d, n, span(d, 1))) || dwords.iter().any(|&(d, n)| !m.fits(d, n, span(d, 2))) {
                return Err(E_ADDRESS);
            }
            for &(d, n) in words {
                m.sims_on_read(d, n, n + span(d, 1) as u32, t, rng);
                w.num(m.word(d, n, 0) as u32, 2);
            }
            for &(d, n) in dwords {
                m.sims_on_read(d, n, n + span(d, 2) as u32, t, rng);
                // 아래 워드가 먼저(번호가 작은 쪽) — 이진은 4바이트 리틀 엔디언, ASCII 는 32비트 16진 8글자
                let v = m.word(d, n, 0) as u32 | (m.word(d, n, 1) as u32) << 16;
                w.num(v, 4);
            }
        }
        Req::RandomWriteBits { items } => {
            if items.iter().any(|&(d, n, _)| !m.fits(d, n, 1)) {
                return Err(E_ADDRESS);
            }
            for &(d, n, on) in items {
                m.data.get_mut(&d).unwrap()[n as usize] = on as u16;
            }
        }
        Req::RandomWriteWords { words, dwords } => {
            if words.iter().any(|&(d, n, _)| !m.fits(d, n, span(d, 1))) || dwords.iter().any(|&(d, n, _)| !m.fits(d, n, span(d, 2))) {
                return Err(E_ADDRESS);
            }
            for &(d, n, v) in words {
                m.set_word(d, n, 0, v);
            }
            for &(d, n, v) in dwords {
                m.set_word(d, n, 0, v as u16);
                m.set_word(d, n, 1, (v >> 16) as u16);
            }
        }
        Req::Loopback { data } => {
            w.num(data.len() as u32, 2);
            w.out.extend(data);
        }
    }
    Ok(w.out)
}

// ---------------------------------------------------------------- 머리

/// 요청 머리(부머리 ~ 감시 타이머)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    /// 4E 의 일련번호
    pub serial: Option<u16>,
    pub network: u8,
    pub station: u8,
    pub module_io: u16,
    pub multidrop: u8,
    pub length: u16,
    pub timer: u16,
    pub command: u16,
    pub sub: u16,
}

impl Header {
    /// 자기 국(연결된 국) 요청인지 — 네트워크 00·국 FF·I/O 03FF·멀티드롭 00
    pub fn own_station(&self) -> bool {
        self.network == 0 && self.station == 0xFF && self.module_io == 0x03FF && self.multidrop == 0
    }
}

/// 머리를 못 읽은 까닭 — (읽은 머리, 답할 종료 코드). 종료 코드가 없으면 답하지 않는다
type HeadErr = (Option<Header>, Option<u16>);

/// 머리를 읽는다. Err((_, None)) = 이 형식의 요청이 아님(답하지 않음), Err((Some(h), Some(code))) = 머리는 읽었지만 오류로 답함
fn parse_header(fmt: Format, f: &[u8]) -> Result<(Header, &[u8]), HeadErr> {
    let ascii = fmt.ascii();
    let sub_len = fmt.len_offset() - if ascii { 10 } else { 5 };
    let sub = f.get(..sub_len).ok_or((None, None))?;
    let mut h = Header::default();
    // 부머리: 3E 5000(이진 50 00), 4E 5400 + 일련번호 + 0000(이진 54 00 일련번호 00 00)
    match (fmt.frame, ascii) {
        (FrameKind::E3, false) => (sub == [0x50, 0x00]).then_some(()).ok_or((None, None))?,
        (FrameKind::E3, true) => (sub == b"5000").then_some(()).ok_or((None, None))?,
        (FrameKind::E4, false) => {
            if sub[..2] != [0x54, 0x00] {
                return Err((None, None));
            }
            h.serial = Some(u16::from_le_bytes([sub[2], sub[3]]));
        }
        (FrameKind::E4, true) => {
            if &sub[..4] != b"5400" {
                return Err((None, None));
            }
            h.serial = Some(hex_val(&sub[4..8]).map_err(|_| (None, None))? as u16);
        }
    }
    let mut r = Rd::new(&f[sub_len..], ascii);
    let bad = |_| (None, None);
    h.network = r.num(1).map_err(bad)? as u8;
    h.station = r.num(1).map_err(bad)? as u8;
    h.module_io = r.num(2).map_err(bad)? as u16;
    h.multidrop = r.num(1).map_err(bad)? as u8;
    h.length = r.num(2).map_err(bad)? as u16;
    // 길이 칸 뒤 실제 글자 수와 다르면 C057(감시 타이머·명령도 못 읽을 만큼 짧으면 답하지 않는다)
    let after = r.left();
    let unit = if ascii { 2 } else { 1 };
    if after < 6 * unit {
        return Err((Some(h), None));
    }
    h.timer = r.num(2).map_err(|c| (Some(h), Some(c)))? as u16;
    h.command = r.num(2).map_err(|c| (Some(h), Some(c)))? as u16;
    h.sub = r.num(2).map_err(|c| (Some(h), Some(c)))? as u16;
    if h.length as usize != after {
        return Err((Some(h), Some(E_LENGTH)));
    }
    Ok((h, &r.b[r.i..]))
}

/// 응답 프레임(머리 + 종료 코드 + 데이터). 오류면 데이터 = 오류 정보(요청 국 정보 + 명령·서브 명령)
fn build_response(fmt: Format, h: &Header, end: u16, data: &[u8]) -> Vec<u8> {
    let ascii = fmt.ascii();
    let mut w = Wr::new(ascii);
    match (fmt.frame, ascii) {
        (FrameKind::E3, false) => w.out.extend([0xD0, 0x00]),
        (FrameKind::E3, true) => w.out.extend(b"D000"),
        (FrameKind::E4, false) => {
            w.out.extend([0xD4, 0x00]);
            w.out.extend(h.serial.unwrap_or(0).to_le_bytes());
            w.out.extend([0x00, 0x00]);
        }
        (FrameKind::E4, true) => w.out.extend(format!("D400{:04X}0000", h.serial.unwrap_or(0)).into_bytes()),
    }
    w.num(h.network as u32, 1);
    w.num(h.station as u32, 1);
    w.num(h.module_io as u32, 2);
    w.num(h.multidrop as u32, 1);
    let mut body = Wr::new(ascii);
    body.num(end as u32, 2);
    if end == 0 {
        body.out.extend(data);
    } else {
        body.num(h.network as u32, 1);
        body.num(h.station as u32, 1);
        body.num(h.module_io as u32, 2);
        body.num(h.multidrop as u32, 1);
        body.num(h.command as u32, 2);
        body.num(h.sub as u32, 2);
    }
    w.num(body.out.len() as u32, 2);
    w.out.extend(body.out);
    w.out
}

// ---------------------------------------------------------------- 서버

/// 장애를 걸 요청 고르기. 비어 있으면 모두
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaultTarget {
    /// 이 명령만(0x0401 …)
    #[serde(default)]
    pub commands: Vec<u16>,
    /// 이 디바이스를 건드리는 요청만
    #[serde(default)]
    pub devices: Vec<Dev>,
    /// 조건에 맞는 요청 N번째마다(0·1 = 매번)
    #[serde(default)]
    pub every_nth: u32,
    /// 확률(%) — 100 이면 늘
    #[serde(default = "full")]
    pub probability: u8,
}

fn full() -> u8 {
    100
}

impl Default for FaultTarget {
    fn default() -> Self {
        Self { commands: Vec::new(), devices: Vec::new(), every_nth: 0, probability: 100 }
    }
}

/// 장애 주입 설정
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faults {
    /// 응답 지연(ms). `delay_max_ms` 가 더 크면 그 사이 아무 값
    pub delay_ms: u64,
    #[serde(default)]
    pub delay_max_ms: u64,
    /// 응답하지 않음. 요청은 평소대로 처리한다(쓰기는 반영되고 응답만 나가지 않음)
    pub no_response: bool,
    /// 이 종료 코드로 답함(0 이면 끔). 이때 쓰기는 반영하지 않는다
    #[serde(default)]
    pub force_end_code: u16,
    #[serde(default)]
    pub target: FaultTarget,
}

impl Faults {
    pub fn active(&self) -> bool {
        self.delay_ms > 0 || self.delay_max_ms > 0 || self.no_response || self.force_end_code != 0
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Options {
    /// 자기 국(네트워크 00·국 FF·I/O 03FF·멀티드롭 00) 요청만 받고, 다른 국 요청은 C05F 로 답한다. 끄면(기본) 모두 받는다
    #[serde(default)]
    pub own_station_only: bool,
}

/// 요청 하나를 처리한 결과 — 화면 기록·통계용
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub command: u16,
    pub sub: u16,
    /// "ok" | "error" | "ignored" | "no-response"
    pub result: &'static str,
    pub end_code: Option<u16>,
    /// 디바이스 값이 바뀌었으면 true
    pub written: bool,
    pub delay_ms: u64,
    pub faulted: bool,
}

impl Outcome {
    fn new(result: &'static str) -> Self {
        Self { command: 0, sub: 0, result, end_code: None, written: false, delay_ms: 0, faulted: false }
    }
}

pub struct Server {
    pub mem: Memory,
    pub format: Format,
    pub faults: Faults,
    pub options: Options,
    rng: Rng,
    fault_count: u64,
    t0: Instant,
}

impl Default for Server {
    fn default() -> Self {
        Self::with_rng(Rng::from_time())
    }
}

impl Server {
    /// 씨앗을 정해 만든다(시험에서 확률 장애·랜덤 값을 재현)
    pub fn with_seed(seed: u64) -> Self {
        Self::with_rng(Rng::new(seed))
    }

    fn with_rng(rng: Rng) -> Self {
        Self { mem: Memory::default(), format: Format::default(), faults: Faults::default(), options: Options::default(), rng, fault_count: 0, t0: Instant::now() }
    }

    pub fn set_faults(&mut self, f: Faults) {
        self.faults = f;
        self.fault_count = 0;
    }

    /// 디바이스 하나의 자동 변화를 바꾼다. 비트 디바이스는 0/1 만
    pub fn set_sims(&mut self, d: Dev, specs: Vec<SimSpec>) -> Result<(), String> {
        let mut runs = Vec::with_capacity(specs.len());
        for mut s in specs {
            if d.bits() {
                s.value_type = ValueType::Bit;
            } else if s.value_type == ValueType::Bit {
                s.value_type = ValueType::U16;
            }
            s.check()?;
            runs.push(SimRun::from(s));
        }
        if runs.is_empty() {
            self.mem.sims.remove(&d);
        } else {
            self.mem.sims.insert(d, runs);
        }
        Ok(())
    }

    pub fn has_sims(&self) -> bool {
        !self.mem.sims.is_empty()
    }

    /// 주기 자동 변화 — 앱이 100ms 쯤마다 부른다
    pub fn tick(&mut self, now: Instant) {
        let t = now.saturating_duration_since(self.t0);
        self.mem.tick(now, t, &mut self.rng);
    }

    /// 요청 프레임 하나(머리 포함)를 처리한다. 돌려주는 응답이 None 이면 아무것도 보내지 않는다
    pub fn handle(&mut self, frame: &[u8]) -> (Option<Vec<u8>>, Outcome) {
        let fmt = self.format;
        let (h, body) = match parse_header(fmt, frame) {
            Ok(x) => x,
            Err((Some(h), Some(code))) => {
                let mut o = Outcome::new("error");
                (o.command, o.sub, o.end_code) = (h.command, h.sub, Some(code));
                return (Some(build_response(fmt, &h, code, &[])), o);
            }
            Err(_) => return (None, Outcome::new("ignored")),
        };
        let mut o = Outcome::new("ok");
        (o.command, o.sub) = (h.command, h.sub);
        let req = if self.options.own_station_only && !h.own_station() { Err(E_TARGET) } else { parse(h.command, h.sub, body, fmt.ascii()) };
        let faulted = self.fault_applies(h.command, req.as_ref().map(Req::devices).unwrap_or_default());
        o.faulted = faulted;
        if faulted {
            o.delay_ms = self.pick_delay();
        }
        let res = match req {
            _ if faulted && self.faults.force_end_code != 0 => Err(self.faults.force_end_code),
            Ok(req) => {
                let t = self.t0.elapsed();
                let r = execute(&mut self.mem, &req, fmt.ascii(), t, &mut self.rng);
                o.written = r.is_ok() && req.writes();
                r
            }
            Err(code) => Err(code),
        };
        let resp = match res {
            Ok(data) => build_response(fmt, &h, 0, &data),
            Err(code) => {
                o.result = "error";
                o.end_code = Some(code);
                build_response(fmt, &h, code, &[])
            }
        };
        if faulted && self.faults.no_response {
            o.result = "no-response";
            o.delay_ms = 0;
            return (None, o);
        }
        (Some(resp), o)
    }

    fn fault_applies(&mut self, cmd: u16, devs: Vec<Dev>) -> bool {
        if !self.faults.active() {
            return false;
        }
        let t = &self.faults.target;
        if !t.commands.is_empty() && !t.commands.contains(&cmd) {
            return false;
        }
        if !t.devices.is_empty() && !devs.iter().any(|d| t.devices.contains(d)) {
            return false;
        }
        self.fault_count += 1;
        if !self.fault_count.is_multiple_of(t.every_nth.max(1) as u64) {
            return false;
        }
        let p = t.probability.min(100);
        p >= 100 || self.rng.unit() * 100.0 < p as f64
    }

    fn pick_delay(&mut self) -> u64 {
        let (lo, hi) = (self.faults.delay_ms, self.faults.delay_max_ms);
        if hi > lo { self.rng.range(lo, hi) } else { lo }
    }
}

// ---------------------------------------------------------------- 통신 기록 한 줄 풀이

/// 명령 이름(한·영)
pub fn command_name(cmd: u16, sub: u16) -> String {
    let unit = match sub {
        0x0001 | 0x0003 => crate::tr!("비트", "bits"),
        _ => crate::tr!("워드", "words"),
    };
    match cmd {
        0x0401 => format!("{} ({unit})", crate::tr!("일괄 읽기", "Read")),
        0x1401 => format!("{} ({unit})", crate::tr!("일괄 쓰기", "Write")),
        0x0403 => crate::tr!("랜덤 읽기", "Read Random").to_string(),
        0x1402 => format!("{} ({unit})", crate::tr!("랜덤 쓰기", "Write Random")),
        0x0619 => crate::tr!("루프백", "Loopback").to_string(),
        _ => crate::tr!("모르는 명령", "unknown command").to_string(),
    }
}

/// 받은 요청 한 줄(«0401 일괄 읽기 (워드) D100 ×3 · #1234»). 이 형식이 아니면 None
pub fn describe_request(fmt: Format, f: &[u8]) -> Option<String> {
    let (h, body) = match parse_header(fmt, f) {
        Ok(x) => x,
        Err((Some(h), Some(code))) => return Some(format!("{:04X} {} — {:04X} {}", h.command, command_name(h.command, h.sub), code, end_code_text(code))),
        Err(_) => return None,
    };
    let mut s = format!("{:04X} {}", h.command, command_name(h.command, h.sub));
    match parse(h.command, h.sub, body, fmt.ascii()) {
        Ok(Req::Read { dev, start, n, .. }) => s += &format!(" {} ×{n}", dev.addr_text(start)),
        Ok(Req::Write { dev, start, values, .. }) => s += &format!(" {} ×{}", dev.addr_text(start), values.len()),
        Ok(Req::RandomRead { words, dwords }) => {
            let first = words.first().or(dwords.first()).map(|&(d, n)| d.addr_text(n)).unwrap_or_default();
            s += &format!(" {first}… W{} D{}", words.len(), dwords.len());
        }
        Ok(Req::RandomWriteBits { items }) => s += &format!(" {}… ×{}", items.first().map(|&(d, n, _)| d.addr_text(n)).unwrap_or_default(), items.len()),
        Ok(Req::RandomWriteWords { words, dwords }) => {
            let first = words.first().map(|&(d, n, _)| d.addr_text(n)).or(dwords.first().map(|&(d, n, _)| d.addr_text(n))).unwrap_or_default();
            s += &format!(" {first}… W{} D{}", words.len(), dwords.len());
        }
        Ok(Req::Loopback { data }) => s += &format!(" ×{}", data.len()),
        Err(code) => s += &format!(" — {:04X} {}", code, end_code_text(code)),
    }
    if !h.own_station() {
        s += &format!(" · NW{:02X} ST{:02X} IO{:04X} MD{:02X}", h.network, h.station, h.module_io, h.multidrop);
    }
    if let Some(n) = h.serial {
        s += &format!(" · #{n:04X}");
    }
    Some(s)
}

/// 보낸 응답 한 줄(«종료 0000 완료 · 6바이트», «종료 C056 주소 범위 밖»)
pub fn describe_response(fmt: Format, f: &[u8]) -> Option<String> {
    let ascii = fmt.ascii();
    let off = fmt.len_offset();
    let mut r = Rd::new(f.get(off..)?, ascii);
    let len = r.num(2).ok()? as usize;
    let end = r.num(2).ok()? as u16;
    let data = len.saturating_sub(if ascii { 4 } else { 2 });
    let unit = if ascii { crate::tr!("글자", "chars") } else { crate::tr!("바이트", "bytes") };
    let mut s = format!("{} {end:04X} {}", crate::tr!("종료", "End"), end_code_text(end));
    if end == 0 && data > 0 {
        s += &format!(" · {data} {unit}");
    }
    let serial = match (fmt.frame, ascii) {
        (FrameKind::E4, false) => f.get(2..4).map(|b| u16::from_le_bytes([b[0], b[1]])),
        (FrameKind::E4, true) => f.get(4..8).and_then(|b| hex_val(b).ok()).map(|v| v as u16),
        _ => None,
    };
    if let Some(n) = serial {
        s += &format!(" · #{n:04X}");
    }
    Some(s)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::regmap::{SimKind, WordOrder};

    const B3: Format = Format { frame: FrameKind::E3, code: DataCode::Binary };
    const A3: Format = Format { frame: FrameKind::E3, code: DataCode::Ascii };
    const B4: Format = Format { frame: FrameKind::E4, code: DataCode::Binary };
    const A4: Format = Format { frame: FrameKind::E4, code: DataCode::Ascii };

    /// 3E 이진 요청: 자기 국(00 FF 03FF 00), 감시 타이머 0010 + 명령 데이터(매뉴얼 예시의 «Request data»)
    fn b3(cmd: &[u8]) -> Vec<u8> {
        let len = (2 + cmd.len()) as u16;
        let mut v = vec![0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00];
        v.extend(len.to_le_bytes());
        v.extend([0x10, 0x00]);
        v.extend(cmd);
        v
    }
    /// 3E 이진 완료 응답 = D0 00 + 같은 국 정보 + 길이 + 종료 0000 + 응답 데이터
    fn b3_ok(data: &[u8]) -> Vec<u8> {
        let len = (2 + data.len()) as u16;
        let mut v = vec![0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00];
        v.extend(len.to_le_bytes());
        v.extend([0x00, 0x00]);
        v.extend(data);
        v
    }
    fn a3(cmd: &str) -> Vec<u8> {
        format!("500000FF03FF00{:04X}0010{cmd}", 4 + cmd.len()).into_bytes()
    }
    fn a3_ok(data: &str) -> Vec<u8> {
        format!("D00000FF03FF00{:04X}0000{data}", 4 + data.len()).into_bytes()
    }

    fn srv(fmt: Format) -> Server {
        let mut s = Server::with_seed(1);
        s.format = fmt;
        s
    }
    fn run(s: &mut Server, f: &[u8]) -> Vec<u8> {
        s.handle(f).0.expect("응답")
    }
    fn set(s: &mut Server, d: Dev, start: u32, v: &[u16]) {
        s.mem.set(d, start, v).unwrap();
    }
    fn get(s: &Server, d: Dev, start: u32, n: u32) -> Vec<u16> {
        s.mem.get(d, start, n).unwrap()
    }
    fn word_bits(w: u16) -> Vec<u16> {
        (0..16).map(|j| (w >> j) & 1).collect()
    }

    // ---- 매뉴얼 예시(SLMP SH-080956ENG 5.2·5.9) — 명령 데이터·응답 데이터는 예시 바이트 그대로

    #[test]
    fn read_bits_m100_to_m107() {
        // M100~M107 = 0 0 0 1 0 0 1 1 → 응답 00 01 00 11 / «00010011»
        for fmt in [B3, A3] {
            let mut s = srv(fmt);
            set(&mut s, Dev::M, 100, &[0, 0, 0, 1, 0, 0, 1, 1]);
            if fmt == B3 {
                assert_eq!(run(&mut s, &b3(&[0x01, 0x04, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00])), b3_ok(&[0x00, 0x01, 0x00, 0x11]));
            } else {
                assert_eq!(run(&mut s, &a3("04010001M*0001000008")), a3_ok("00010011"));
            }
        }
    }

    #[test]
    fn read_words_of_bit_device_m100_to_m131() {
        for fmt in [B3, A3] {
            let mut s = srv(fmt);
            set(&mut s, Dev::M, 100, &[word_bits(0x1234), word_bits(0x0002)].concat());
            if fmt == B3 {
                assert_eq!(run(&mut s, &b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00])), b3_ok(&[0x34, 0x12, 0x02, 0x00]));
            } else {
                assert_eq!(run(&mut s, &a3("04010000M*0001000002")), a3_ok("12340002"));
            }
        }
    }

    #[test]
    fn read_words_tn100_to_tn102() {
        for fmt in [B3, A3] {
            let mut s = srv(fmt);
            set(&mut s, Dev::Tn, 100, &[0x1234, 0x0002, 0x1DEF]);
            if fmt == B3 {
                assert_eq!(run(&mut s, &b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xC2, 0x03, 0x00])), b3_ok(&[0x34, 0x12, 0x02, 0x00, 0xEF, 0x1D]));
            } else {
                assert_eq!(run(&mut s, &a3("04010000TN0001000003")), a3_ok("123400021DEF"));
            }
        }
    }

    #[test]
    fn write_bits_m100_to_m107() {
        let want = [1, 1, 0, 0, 1, 1, 0, 0];
        let mut s = srv(B3);
        assert_eq!(run(&mut s, &b3(&[0x01, 0x14, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00, 0x11, 0x00, 0x11, 0x00])), b3_ok(&[]));
        assert_eq!(get(&s, Dev::M, 100, 8), want);
        let mut s = srv(A3);
        assert_eq!(run(&mut s, &a3("14010001M*000100000811001100")), a3_ok(""));
        assert_eq!(get(&s, Dev::M, 100, 8), want);
    }

    #[test]
    fn write_words_of_bit_device_and_word_device() {
        // M100~M131 = 2347 AB96, D100~D102 = 1995 1202 1130
        let mut s = srv(B3);
        run(&mut s, &b3(&[0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00, 0x47, 0x23, 0x96, 0xAB]));
        run(&mut s, &b3(&[0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0xA8, 0x03, 0x00, 0x95, 0x19, 0x02, 0x12, 0x30, 0x11]));
        assert_eq!(get(&s, Dev::M, 100, 32), [word_bits(0x2347), word_bits(0xAB96)].concat());
        assert_eq!(get(&s, Dev::D, 100, 3), [0x1995, 0x1202, 0x1130]);
        let mut a = srv(A3);
        assert_eq!(run(&mut a, &a3("14010000M*00010000022347AB96")), a3_ok(""));
        assert_eq!(run(&mut a, &a3("14010000D*0001000003199512021130")), a3_ok(""));
        assert_eq!(a.mem.data, s.mem.data);
    }

    /// 0403: D0·T0(TN0)·M100~M115·X20~X2F 워드, D1500~D1501·Y160~Y17F·M1111~M1142 더블워드
    fn random_read_setup(s: &mut Server) {
        set(s, Dev::D, 0, &[0x1995]);
        set(s, Dev::Tn, 0, &[0x1202]);
        set(s, Dev::M, 100, &word_bits(0x2030));
        set(s, Dev::X, 0x20, &word_bits(0x4849));
        set(s, Dev::D, 1500, &[0x4F4E, 0x4C54]);
        set(s, Dev::Y, 0x160, &[word_bits(0xB9AF), word_bits(0xC3DE)].concat());
        set(s, Dev::M, 1111, &[word_bits(0xBCB7), word_bits(0xBADD)].concat());
    }

    #[test]
    fn random_read_manual_example() {
        let mut s = srv(B3);
        random_read_setup(&mut s);
        let req = [
            0x03, 0x04, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xA8, 0x00, 0x00, 0x00, 0xC2, 0x64, 0x00, 0x00, 0x90, 0x20, 0x00, 0x00, 0x9C, 0xDC, 0x05, 0x00, 0xA8, 0x60, 0x01, 0x00, 0x9D, 0x57, 0x04, 0x00, 0x90,
        ];
        let resp = [0x95, 0x19, 0x02, 0x12, 0x30, 0x20, 0x49, 0x48, 0x4E, 0x4F, 0x54, 0x4C, 0xAF, 0xB9, 0xDE, 0xC3, 0xB7, 0xBC, 0xDD, 0xBA];
        assert_eq!(run(&mut s, &b3(&req)), b3_ok(&resp));
        let mut a = srv(A3);
        random_read_setup(&mut a);
        assert_eq!(run(&mut a, &a3("040300000403D*000000TN000000M*000100X*000020D*001500Y*000160M*001111")), a3_ok("19951202203048494C544F4EC3DEB9AFBADDBCB7"));
    }

    #[test]
    fn random_write_bits_manual_example() {
        // M50 끄고 Y2F 켜기
        let mut s = srv(B3);
        set(&mut s, Dev::M, 50, &[1]);
        assert_eq!(run(&mut s, &b3(&[0x02, 0x14, 0x01, 0x00, 0x02, 0x32, 0x00, 0x00, 0x90, 0x00, 0x2F, 0x00, 0x00, 0x9D, 0x01])), b3_ok(&[]));
        assert_eq!((get(&s, Dev::M, 50, 1)[0], get(&s, Dev::Y, 0x2F, 1)[0]), (0, 1));
        let mut a = srv(A3);
        set(&mut a, Dev::M, 50, &[1]);
        assert_eq!(run(&mut a, &a3("1402000102M*00005000Y*00002F01")), a3_ok(""));
        assert_eq!((get(&a, Dev::M, 50, 1)[0], get(&a, Dev::Y, 0x2F, 1)[0]), (0, 1));
    }

    #[test]
    fn random_write_words_manual_example() {
        let req = [
            0x02, 0x14, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xA8, 0x50, 0x05, 0x01, 0x00, 0x00, 0xA8, 0x75, 0x05, 0x64, 0x00, 0x00, 0x90, 0x40, 0x05, 0x20, 0x00, 0x00, 0x9C, 0x83, 0x05, 0xDC, 0x05, 0x00, 0xA8, 0x02, 0x12,
            0x39, 0x04, 0x60, 0x01, 0x00, 0x9D, 0x07, 0x26, 0x75, 0x23, 0x57, 0x04, 0x00, 0x90, 0x75, 0x04, 0x25, 0x04,
        ];
        let check = |s: &Server| {
            assert_eq!(get(s, Dev::D, 0, 2), [0x0550, 0x0575]);
            assert_eq!(get(s, Dev::M, 100, 16), word_bits(0x0540));
            assert_eq!(get(s, Dev::X, 0x20, 16), word_bits(0x0583));
            assert_eq!(get(s, Dev::D, 1500, 2), [0x1202, 0x0439]);
            assert_eq!(get(s, Dev::Y, 0x160, 32), [word_bits(0x2607), word_bits(0x2375)].concat());
            assert_eq!(get(s, Dev::M, 1111, 32), [word_bits(0x0475), word_bits(0x0425)].concat());
        };
        let mut s = srv(B3);
        assert_eq!(run(&mut s, &b3(&req)), b3_ok(&[]));
        check(&s);
        let mut a = srv(A3);
        let cmd = "140200000403D*0000000550D*0000010575M*0001000540X*0000200583D*00150004391202Y*00016023752607M*00111104250475";
        assert_eq!(run(&mut a, &a3(cmd)), a3_ok(""));
        check(&a);
    }

    #[test]
    fn loopback_manual_example() {
        let mut s = srv(B3);
        assert_eq!(run(&mut s, &b3(&[0x19, 0x06, 0x00, 0x00, 0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45])), b3_ok(&[0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45]));
        let mut a = srv(A3);
        assert_eq!(run(&mut a, &a3("061900000005ABCDE")), a3_ok("0005ABCDE"));
    }

    // ---- 머리(SLMP 4장): 4E 일련번호, 국 정보 되돌려 주기, 오류 응답 모양

    #[test]
    fn frame_4e_serial_echo_binary_and_ascii() {
        // 4E 일련번호 1234 — 이진 54 00 34 12 00 00 → D4 00 34 12 00 00
        let mut s = srv(B4);
        let req4 = [0x54, 0x00, 0x34, 0x12, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0D, 0x00, 0x10, 0x00, 0x19, 0x06, 0x00, 0x00, 0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45];
        let resp = [0xD4, 0x00, 0x34, 0x12, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x09, 0x00, 0x00, 0x00, 0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45];
        assert_eq!(run(&mut s, &req4), resp);
        // ASCII «5400 1234 0000» → «D400 1234 0000»
        let mut a = srv(A4);
        let cmd = "061900000005ABCDE";
        let req = format!("54001234000000FF03FF00{:04X}0010{cmd}", 4 + cmd.len());
        let want = format!("D4001234000000FF03FF00{:04X}00000005ABCDE", 4 + 9);
        assert_eq!(run(&mut a, req.as_bytes()), want.as_bytes());
        // 3E 로 받는 서버에 4E 가 오면(또는 그 반대) 답하지 않는다
        let (r, o) = srv(B3).handle(&req4);
        assert!(r.is_none());
        assert_eq!(o.result, "ignored");
        assert!(srv(B4).handle(&b3(&[0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41])).0.is_none());
        assert!(srv(A3).handle(&req4).0.is_none());
    }

    #[test]
    fn error_response_shape_binary_and_ascii() {
        // 모르는 명령 0101 → 종료 C059 + 오류 정보(국 정보·명령·서브 명령). 이진 데이터 길이 = 2 + 9 = 0B
        let mut s = srv(B3);
        let (r, o) = s.handle(&b3(&[0x01, 0x01, 0x00, 0x00]));
        assert_eq!(r.unwrap(), [0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0B, 0x00, 0x59, 0xC0, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x01, 0x01, 0x00, 0x00]);
        assert_eq!((o.result, o.end_code), ("error", Some(E_COMMAND)));
        // ASCII 데이터 길이 = 4 + 18 = 22(0016) — 매뉴얼 «응답 데이터 길이 22바이트» 예와 같은 모양, C051 은 «C051»
        let mut a = srv(A3);
        let r = run(&mut a, &a3("04010000D*0000000000"));
        assert_eq!(r, b"D00000FF03FF000016C05100FF03FF0004010000".to_vec());
        // 다른 국 정보도 그대로 돌려준다(네트워크 1A·국 1A)
        let mut req = b3(&[0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41]);
        (req[2], req[3]) = (0x1A, 0x1A);
        let r = run(&mut s, &req);
        assert_eq!(&r[2..4], &[0x1A, 0x1A]);
        assert_eq!(&r[9..11], &[0x00, 0x00], "기본은 모든 국에 답한다");
        s.options.own_station_only = true;
        let r = run(&mut s, &req);
        assert_eq!(&r[9..11], &[0x5F, 0xC0]);
    }

    // ---- 경계·오류

    #[test]
    fn point_limits_and_address_range() {
        let mut s = srv(B3);
        let rd = |sub: u8, code: u8, start: u32, n: u16| {
            let st = start.to_le_bytes();
            let nn = n.to_le_bytes();
            b3(&[0x01, 0x04, sub, 0x00, st[0], st[1], st[2], code, nn[0], nn[1]])
        };
        let end = |r: Vec<u8>| u16::from_le_bytes([r[9], r[10]]);
        // 워드 1~960, 비트(이진) 1~7168
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 0, 960))), 0);
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 0, 961))), E_POINTS_WORD);
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 0, 0))), E_POINTS_WORD);
        assert_eq!(end(run(&mut s, &rd(1, 0x90, 0, 7168))), 0);
        assert_eq!(end(run(&mut s, &rd(1, 0x90, 0, 7169))), E_POINTS_BIT);
        // 범위: D 기본 12288 — D12287 1점은 되고 2점은 C056
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 12287, 1))), 0);
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 12287, 2))), E_ADDRESS);
        // 비트 디바이스 워드 단위 — 1워드 = 16점. M 8192 → M8176 1워드는 되고 M8177 은 넘는다
        assert_eq!(end(run(&mut s, &rd(0, 0x90, 8176, 1))), 0);
        assert_eq!(end(run(&mut s, &rd(0, 0x90, 8177, 1))), E_ADDRESS);
        // 크기를 줄이면 그만큼만
        s.mem.resize(Dev::D, 100).unwrap();
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 99, 1))), 0);
        assert_eq!(end(run(&mut s, &rd(0, 0xA8, 100, 1))), E_ADDRESS);
        // 워드 디바이스를 비트 단위로·모르는 디바이스 코드·모르는 서브 명령
        assert_eq!(end(run(&mut s, &rd(1, 0xA8, 0, 1))), E_DEVICE);
        assert_eq!(end(run(&mut s, &rd(0, 0x77, 0, 1))), E_DEVICE);
        assert_eq!(end(run(&mut s, &rd(0x80, 0xA8, 0, 1))), E_COMMAND);
        // 범위 밖 쓰기는 하나도 쓰지 않는다
        s.mem.resize(Dev::D, 12288).unwrap();
        let w = b3(&[0x01, 0x14, 0x00, 0x00, 0xFF, 0x2F, 0x00, 0xA8, 0x02, 0x00, 0x01, 0x00, 0x02, 0x00]);
        assert_eq!(end(run(&mut s, &w)), E_ADDRESS);
        assert_eq!(get(&s, Dev::D, 12287, 1), [0]);
    }

    #[test]
    fn length_and_data_errors() {
        let mut s = srv(B3);
        let end = |r: Vec<u8>| u16::from_le_bytes([r[9], r[10]]);
        // 머리 길이 칸이 실제와 다르면 C057(UDP 처럼 프레임이 통째로 올 때)
        let mut f = b3(&[0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41]);
        f[7] += 1;
        assert_eq!(end(run(&mut s, &f)), E_LENGTH);
        // 쓰기 데이터가 점 수보다 짧거나 길면 C061
        assert_eq!(end(run(&mut s, &b3(&[0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xA8, 0x02, 0x00, 0x01, 0x00]))), E_DATA_LEN);
        assert_eq!(end(run(&mut s, &b3(&[0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xA8, 0x01, 0x00, 0x01, 0x00, 0x09]))), E_DATA_LEN);
        // 비트 쓰기 값이 0·1 이 아니면 C060
        assert_eq!(end(run(&mut s, &b3(&[0x01, 0x14, 0x01, 0x00, 0, 0, 0, 0x90, 0x02, 0x00, 0x12]))), E_BIT_VALUE);
        // 랜덤: 점 수 0·초과
        assert_eq!(end(run(&mut s, &b3(&[0x03, 0x04, 0x00, 0x00, 0x00, 0x00]))), E_RANDOM_WORD);
        assert_eq!(end(run(&mut s, &b3(&[0x02, 0x14, 0x01, 0x00, 189]))), E_RANDOM_BIT);
        // 루프백 0바이트·961바이트
        assert_eq!(end(run(&mut s, &b3(&[0x19, 0x06, 0x00, 0x00, 0x00, 0x00]))), E_REQUEST);
        // 머리가 너무 짧으면 답하지 않음
        assert!(s.handle(&[0x50, 0x00, 0x00]).0.is_none());
        // ASCII 에 16진이 아닌 글자 → C050
        let mut a = srv(A3);
        let r = run(&mut a, &a3("04010000D*00000G0001"));
        assert_eq!(&r[18..22], b"C050");
        // 16진 디바이스(X)는 번호도 16진 — X1F, 10진 디바이스(D)에 «1F» 는 C050
        set(&mut a, Dev::X, 0x1F, &[1]);
        assert_eq!(run(&mut a, &a3("04010001X*00001F0001")), a3_ok("1"));
        let r = run(&mut a, &a3("04010000D*00001F0001"));
        assert_eq!(&r[18..22], b"C050");
        // 앞자리 0 대신 공백, 디바이스 이름 뒤 공백
        set(&mut a, Dev::D, 7, &[0xBEEF]);
        assert_eq!(run(&mut a, &a3("04010000D      70001")), a3_ok("BEEF"));
    }

    #[test]
    fn iq_r_subcommands_0002_0003() {
        // 디바이스 번호 4바이트·코드 2바이트(이진), 코드 4글자·번호 8글자(ASCII)
        let mut s = srv(B3);
        set(&mut s, Dev::D, 100, &[0x1234]);
        assert_eq!(run(&mut s, &b3(&[0x01, 0x04, 0x02, 0x00, 0x64, 0x00, 0x00, 0x00, 0xA8, 0x00, 0x01, 0x00])), b3_ok(&[0x34, 0x12]));
        let mut a = srv(A3);
        set(&mut a, Dev::Zr, 0x10, &[0xABCD]);
        assert_eq!(run(&mut a, &a3("04010002ZR**000000100001")), a3_ok("ABCD"));
        // 1402 비트 서브 0003 — ON 은 2바이트(01 00)
        assert_eq!(run(&mut s, &b3(&[0x02, 0x14, 0x03, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00, 0x90, 0x00, 0x01, 0x00])), b3_ok(&[]));
        assert_eq!(get(&s, Dev::M, 5, 1), [1]);
        // 0403 은 0000·0002 만
        let r = run(&mut s, &b3(&[0x03, 0x04, 0x01, 0x00, 0x01, 0x00, 0, 0, 0, 0xA8]));
        assert_eq!(u16::from_le_bytes([r[9], r[10]]), E_COMMAND);
    }

    #[test]
    fn all_device_codes_round_trip() {
        // 모든 디바이스를 이진·ASCII 로 1점씩 쓰고 읽는다(코드·이름·진법 표가 맞물리는지)
        for d in DEVICES {
            for fmt in [B3, A3] {
                let mut s = srv(fmt);
                let n = 0x1A;
                let (sub_w, sub_r) = if d.bits { ("0001", "0001") } else { ("0000", "0000") };
                let val = if d.bits { "1" } else { "00A5" };
                if fmt == A3 {
                    let no = if d.hex { format!("{n:06X}") } else { format!("{n:06}") };
                    let code = format!("{:*<2}", d.name);
                    assert_eq!(run(&mut s, &a3(&format!("1401{sub_w}{code}{no}0001{val}"))), a3_ok(""), "{}", d.name);
                    assert_eq!(run(&mut s, &a3(&format!("0401{sub_r}{code}{no}0001"))), a3_ok(val), "{}", d.name);
                } else {
                    let sub = if d.bits { 1 } else { 0 };
                    let data: &[u8] = if d.bits { &[0x10] } else { &[0xA5, 0x00] };
                    let mut w = vec![0x01, 0x14, sub, 0x00, n as u8, 0x00, 0x00, d.code, 0x01, 0x00];
                    w.extend(data);
                    assert_eq!(run(&mut s, &b3(&w)), b3_ok(&[]), "{}", d.name);
                    assert_eq!(run(&mut s, &b3(&[0x01, 0x04, sub, 0x00, n as u8, 0x00, 0x00, d.code, 0x01, 0x00])), b3_ok(data), "{}", d.name);
                }
                assert_eq!(get(&s, d.dev, n, 1), [if d.bits { 1 } else { 0xA5 }], "{}", d.name);
            }
        }
    }

    #[test]
    fn frame_modes_cut_requests() {
        use crate::framer::Framer;
        let now = Instant::now();
        for fmt in [B3, A3, B4, A4] {
            let req = match fmt {
                B3 => b3(&[0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41]),
                A3 => a3("061900000001A"),
                B4 => vec![0x54, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x09, 0x00, 0x10, 0x00, 0x19, 0x06, 0x00, 0x00, 0x01, 0x00, 0x41],
                _ => format!("54000001000000FF03FF00{:04X}0010061900000001A", 4 + 13).into_bytes(),
            };
            let mut f = Framer::new(fmt.frame_mode());
            let two = [req.clone(), req.clone()].concat();
            let cuts = f.feed(&two, now);
            assert_eq!(cuts.len(), 2, "{fmt:?}");
            assert_eq!(cuts[0].1, req, "{fmt:?}");
            let mut s = srv(fmt);
            assert!(s.handle(&req).0.is_some(), "{fmt:?}");
        }
    }

    #[test]
    fn faults_force_end_code_delay_no_response_and_target() {
        let mut s = srv(B3);
        let rd = b3(&[0x01, 0x04, 0x00, 0x00, 0, 0, 0, 0xA8, 0x01, 0x00]);
        let wr = b3(&[0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xA8, 0x01, 0x00, 0x07, 0x00]);
        // 종료 코드 강제 — 쓰기는 반영하지 않는다
        s.set_faults(Faults { force_end_code: 0x4031, ..Default::default() });
        let (r, o) = s.handle(&wr);
        assert_eq!(&r.unwrap()[9..11], &[0x31, 0x40]);
        assert!(o.faulted && !o.written);
        assert_eq!(get(&s, Dev::D, 0, 1), [0]);
        // 무응답 — 쓰기는 반영되고 응답만 없다
        s.set_faults(Faults { no_response: true, ..Default::default() });
        let (r, o) = s.handle(&wr);
        assert!(r.is_none());
        assert_eq!(o.result, "no-response");
        assert_eq!(get(&s, Dev::D, 0, 1), [7]);
        // 지연 범위
        s.set_faults(Faults { delay_ms: 10, delay_max_ms: 20, ..Default::default() });
        for _ in 0..20 {
            let d = s.handle(&rd).1.delay_ms;
            assert!((10..=20).contains(&d));
        }
        // 대상: 명령 1401 만, 디바이스 M 만, 2번째마다
        s.set_faults(Faults { force_end_code: 0xC051, target: FaultTarget { commands: vec![0x1401], ..Default::default() }, ..Default::default() });
        assert!(!s.handle(&rd).1.faulted);
        assert!(s.handle(&wr).1.faulted);
        s.set_faults(Faults { force_end_code: 0xC051, target: FaultTarget { devices: vec![Dev::M], ..Default::default() }, ..Default::default() });
        assert!(!s.handle(&rd).1.faulted);
        s.set_faults(Faults { delay_ms: 5, target: FaultTarget { every_nth: 2, ..Default::default() }, ..Default::default() });
        let hits: Vec<bool> = (0..4).map(|_| s.handle(&rd).1.faulted).collect();
        assert_eq!(hits, [false, true, false, true]);
        // 확률 0% 면 걸리지 않는다
        s.set_faults(Faults { delay_ms: 5, target: FaultTarget { probability: 0, ..Default::default() }, ..Default::default() });
        assert!(!(0..20).any(|_| s.handle(&rd).1.faulted));
    }

    #[test]
    fn sims_on_read_and_periodic() {
        let mut s = srv(B3);
        let inc = SimSpec { addr: 10, value_type: ValueType::U16, order: WordOrder::Cdab, period_ms: 0, sim: SimKind::Increment { step: 1.0, min: 0.0, max: 100.0, wrap: true } };
        s.set_sims(Dev::D, vec![inc]).unwrap();
        let rd = b3(&[0x01, 0x04, 0x00, 0x00, 10, 0, 0, 0xA8, 0x01, 0x00]);
        assert_eq!(&run(&mut s, &rd)[11..], &[1, 0]);
        assert_eq!(&run(&mut s, &rd)[11..], &[2, 0]);
        // 비트 디바이스는 0/1 로 — 주기(100ms)
        let tg = SimSpec { addr: 3, value_type: ValueType::U16, order: WordOrder::Abcd, period_ms: 100, sim: SimKind::Toggle };
        s.set_sims(Dev::Y, vec![tg]).unwrap();
        let now = Instant::now();
        s.tick(now);
        assert_eq!(get(&s, Dev::Y, 3, 1), [1]);
        s.tick(now + Duration::from_millis(50));
        assert_eq!(get(&s, Dev::Y, 3, 1), [1]);
        s.tick(now + Duration::from_millis(150));
        assert_eq!(get(&s, Dev::Y, 3, 1), [0]);
        assert!(s.has_sims());
        s.set_sims(Dev::Y, vec![]).unwrap();
        s.set_sims(Dev::D, vec![]).unwrap();
        assert!(!s.has_sims());
    }

    #[test]
    fn describe_lines() {
        // 언어 설정은 전역이라(다른 시험과 함께 돈다) 번역되지 않는 부분만 본다
        let req = b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xA8, 0x03, 0x00]);
        let l = describe_request(B3, &req).unwrap();
        assert!(l.starts_with("0401 ") && l.ends_with(" D100 ×3"), "{l}");
        let l = describe_request(A3, &a3("04010001X*00001F0010")).unwrap();
        assert!(l.ends_with(" X1F ×16"), "{l}");
        let l = describe_request(B4, &[0x54, 0x00, 0x34, 0x12, 0x00, 0x00, 0x01, 0x02, 0xFF, 0x03, 0x00, 0x0C, 0x00, 0x10, 0x00, 0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xA8, 0x03, 0x00]).unwrap();
        assert!(l.ends_with(" D100 ×3 · NW01 ST02 IO03FF MD00 · #1234"), "{l}");
        let l = describe_response(B3, &b3_ok(&[1, 2, 3, 4])).unwrap();
        assert!(l.contains(" 0000 ") && l.contains("· 4 "), "{l}");
        let mut s = srv(B3);
        let err = run(&mut s, &b3(&[0x01, 0x04, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0xA8, 0x01, 0x00]));
        let l = describe_response(B3, &err).unwrap();
        assert!(l.contains(" C056 ") && l.contains(end_code_text(E_ADDRESS)), "{l}");
        assert!(describe_request(B3, &[0x01, 0x02]).is_none());
        let l = describe_request(B3, &b3(&[0x01, 0x01, 0x00, 0x00])).unwrap();
        assert!(l.starts_with("0101 ") && l.contains("C059"), "{l}");
    }

    #[test]
    fn json_shapes() {
        let f: Format = serde_json::from_str(r#"{"frame":"4e","code":"ascii"}"#).unwrap();
        assert_eq!(f, A4);
        let d: Dev = serde_json::from_str(r#""ZR""#).unwrap();
        assert_eq!(d, Dev::Zr);
        assert_eq!(serde_json::to_string(&Dev::Sm).unwrap(), r#""SM""#);
        let fl: Faults = serde_json::from_str(r#"{"delayMs":0,"noResponse":false,"forceEndCode":49233,"target":{"commands":[1025],"devices":["D","M"],"everyNth":1,"probability":100}}"#).unwrap();
        assert_eq!(fl.force_end_code, 0xC051);
        assert_eq!(fl.target.devices, [Dev::D, Dev::M]);
        // 디바이스 이름·코드가 겹치지 않는다
        for (i, a) in DEVICES.iter().enumerate() {
            for b in &DEVICES[i + 1..] {
                assert!(a.name != b.name && a.code != b.code && a.dev != b.dev);
            }
            assert_eq!(a.dev.info().name, a.name);
        }
    }
}
