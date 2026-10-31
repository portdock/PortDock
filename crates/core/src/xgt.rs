//! LS ELECTRIC XGT 전용 프로토콜(FEnet, 이더넷 TCP 2004 · UDP 2005) 서버 흉내 — PC 가 XGT PLC 의 FEnet 모듈처럼
//! 개별·연속 읽기/쓰기 요청에 답한다(0.10.0).
//!
//! 근거(공개 매뉴얼, 저장소에는 넣지 않는다 — 클린룸: 다른 구현의 코드를 보지 않고 아래 원문만으로 썼다):
//! - [A] LS ELECTRIC «XGT FEnet I/F Module User's Manual» V2.30(영문)
//!   - 8.1.1(8-1쪽): 전용 서비스 포트 TCP 2004 · UDP 2005
//!   - 8.1.2(8-2~8-4쪽): 응용 머리 20바이트 — 회사 ID 8 «LSIS-XGT» + 예약 2(00 00) · PLC 정보 2 · CPU 정보 1 ·
//!     프레임 방향 1(요청 h33·응답 h11) · Invoke ID 2 · 길이 2(머리 뒤 바이트 수) · FEnet 위치 1 · BCC 1(머리 바이트 합).
//!     ACK = 명령·데이터 형·예약 2·오류 상태 h0000·…, NAK = 명령·데이터 형·예약 2·오류 상태(0 아님)·오류 코드
//!   - 8.1.3(8-5쪽, 표 8.1.1): 읽기 요청 h0054·응답 h0055, 쓰기 요청 h0058·응답 h0059, 연속은 바이트만·1,400바이트까지
//!   - 8.1.4(8-5쪽, 표 8.1.2·8.1.3): 변수 «%PX0 %MB0 %PW0 %PD0 %PL0», 데이터 형 BIT h00 · BYTE h01 · WORD h02 ·
//!     DWORD h03 · LWORD h04 · 연속 h14
//!   - 8.2.1~8.2.4(8-6~8-14쪽): 개별 읽기(블록 16개까지, 변수 이름 16글자까지), 연속 읽기(블록 h0001 고정, 바이트 변수),
//!     개별 쓰기(이름 블록들 뒤에 [크기][데이터] 블록들), 연속 쓰기. 비트 데이터는 1바이트(가장 낮은 비트만 유효, 표 8.2.2),
//!     비트 주소는 비트 단위 «%MX2764» = 워드 172 × 16 + 12(8-12쪽 주의 3 — «%MX172C» 는 틀린 표기)
//!   - 10.4(10-12쪽): 오류 코드 1~6 · h75~h78, 오류 코드 칸 2바이트(아래 바이트가 코드), 바이트 순서 리틀 엔디언(h0054 → 54 00)
//! - [B] LS ELECTRIC «XGB FEnet I/F Module XBL-EMTA User's Manual» V1.8
//!   - 5.2.3~5.2.5(5-3~5-5쪽): 같은 머리, 회사 ID 2(«LGIS-GLOFA») 도 받음, 바이트 주소 = 워드 주소 × 2(%DW1234 = %DB2468)
//!   - 5.2.6(5-6~5-7쪽, 표 5-6~5-9): 요청·응답 프레임 예시 — 아래 시험 벡터. BCC 는 표 5-7·5-8·5-9 와 맞는다
//!     (표 5-6 의 0x4E 만 머리 합 0x3C 와 다름 — 원문 쪽 오타로 보고, BCC 검사는 끌 수 있게 했다)
//!
//! 이 흉내가 정한 것(원문에 없음 — 실제 PLC 와 다를 수 있다):
//! - 메모리: 디바이스마다 워드 배열 하나. 비트 %MXn = 워드 n/16 의 비트 n%16, 바이트 %MBn = 워드 n/2 의 아래(짝수)·위(홀수)
//!   바이트, 더블워드 %MDn = 워드 2n~2n+1, 롱워드 %MLn = 워드 4n~4n+3(낮은 워드 먼저). D·L 의 단위는 비트·바이트 규칙에서 미룬 것.
//!   T·C 의 접점과 현재값을 따로 두지 않는다. 기종·디바이스마다 받지 않는 형 조합(표 8.2.1)은 가리지 않고 모두 받는다.
//! - 오류 코드 고르기: 블록 수 0·17 이상 → 1, 형 글자·데이터 형이 서로 다르거나 쓰기 데이터 크기가 형과 다름 → 2,
//!   모르는 디바이스·잘못된 이름 → 3, 크기 밖 → 4, 연속 1,400바이트 넘음 → 5, 회사 ID → h75, 길이 칸·몸체 길이 → h76,
//!   BCC → h77, 모르는 명령(상태 읽기 h00B0 포함) → h78.
//! - 응답 머리: PLC 정보 = 아래 바이트 0(CPU 형 지정 안 함) + 위 바이트 시스템 상태(RUN 1 · STOP/PAUSE 2), CPU 정보 hA0(XGK),
//!   FEnet 위치 0. 회사 ID 는 요청 것을 그대로.

use crate::framer::{FrameMode, LengthEncoding};
use crate::mc::{Dev, Memory, Outcome, RunMode, Server};
use crate::mc_rules::Fired;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// 응용 머리 길이
pub const HEADER_LEN: usize = 20;
/// 프레임 하나의 최대 길이 — 가장 긴 요청(연속 쓰기 1,400바이트 ≈ 1,450)보다 넉넉히
pub const MAX_FRAME: usize = 2048;
/// 회사 ID 1(XGT·XGB)
pub const COMPANY_XGT: [u8; 10] = *b"LSIS-XGT\0\0";
/// 회사 ID 2(GM·MK)
pub const COMPANY_GLOFA: [u8; 10] = *b"LGIS-GLOFA";
/// 프레임 방향 — 클라이언트 → PLC
pub const SRC_REQUEST: u8 = 0x33;
/// 프레임 방향 — PLC → 클라이언트
pub const SRC_RESPONSE: u8 = 0x11;
/// CPU 정보 — XGK
pub const CPU_XGK: u8 = 0xA0;
pub const CMD_READ: u16 = 0x0054;
pub const CMD_READ_RESP: u16 = 0x0055;
pub const CMD_WRITE: u16 = 0x0058;
pub const CMD_WRITE_RESP: u16 = 0x0059;
/// 데이터 형 «연속»
pub const TYPE_CONTINUOUS: u16 = 0x0014;
pub const MAX_BLOCKS: usize = 16;
pub const MAX_NAME: usize = 16;
pub const MAX_BYTES: usize = 1400;

// ---------------------------------------------------------------- 오류 코드([A] 10.4, 10-12쪽)

/// 개별 읽기·쓰기 블록 수가 16 보다 큼
pub const E_BLOCKS: u16 = 0x0001;
/// X·B·W·D·L 이 아닌 데이터 형
pub const E_TYPE: u16 = 0x0002;
/// 서비스하지 않는 디바이스
pub const E_DEVICE: u16 = 0x0003;
/// 디바이스 범위를 넘음
pub const E_RANGE: u16 = 0x0004;
/// 한 번에 1,400바이트를 넘음(블록 하나)
pub const E_SIZE: u16 = 0x0005;
/// 한 번에 1,400바이트를 넘음(블록 합)
pub const E_TOTAL: u16 = 0x0006;
/// 머리 앞부분(회사 ID)이 틀림
pub const E_COMPANY: u16 = 0x0075;
/// 머리의 길이가 틀림
pub const E_HEAD_LEN: u16 = 0x0076;
/// 머리 체크섬(BCC)이 틀림
pub const E_BCC: u16 = 0x0077;
/// 명령이 틀림
pub const E_COMMAND: u16 = 0x0078;

/// 오류 코드 설명(한·영)
pub fn error_text(code: u16) -> &'static str {
    match code {
        0 => crate::tr!("정상 응답", "ACK"),
        E_BLOCKS => crate::tr!("블록 수 16 넘음", "more than 16 blocks"),
        E_TYPE => crate::tr!("데이터 형 틀림", "wrong data type"),
        E_DEVICE => crate::tr!("서비스하지 않는 디바이스", "device not serviced"),
        E_RANGE => crate::tr!("디바이스 범위 밖", "device area exceeded"),
        E_SIZE => crate::tr!("1,400바이트 넘음(블록)", "over 1,400 bytes (block)"),
        E_TOTAL => crate::tr!("1,400바이트 넘음(합)", "over 1,400 bytes (total)"),
        E_COMPANY => crate::tr!("머리 회사 ID 틀림", "wrong company ID"),
        E_HEAD_LEN => crate::tr!("머리 길이 틀림", "wrong header length"),
        E_BCC => crate::tr!("머리 BCC 틀림", "wrong header checksum"),
        E_COMMAND => crate::tr!("명령 틀림", "wrong instruction"),
        _ => crate::tr!("강제·기타", "forced/other"),
    }
}

/// 데이터 형([A] 표 8.1.3)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Bit,
    Byte,
    Word,
    DWord,
    LWord,
}

impl Kind {
    pub fn from_code(c: u16) -> Option<Self> {
        Some(match c {
            0 => Self::Bit,
            1 => Self::Byte,
            2 => Self::Word,
            3 => Self::DWord,
            4 => Self::LWord,
            _ => return None,
        })
    }
    pub fn code(self) -> u16 {
        match self {
            Self::Bit => 0,
            Self::Byte => 1,
            Self::Word => 2,
            Self::DWord => 3,
            Self::LWord => 4,
        }
    }
    fn from_letter(c: u8) -> Option<Self> {
        Some(match c.to_ascii_uppercase() {
            b'X' => Self::Bit,
            b'B' => Self::Byte,
            b'W' => Self::Word,
            b'D' => Self::DWord,
            b'L' => Self::LWord,
            _ => return None,
        })
    }
    pub fn letter(self) -> char {
        match self {
            Self::Bit => 'X',
            Self::Byte => 'B',
            Self::Word => 'W',
            Self::DWord => 'D',
            Self::LWord => 'L',
        }
    }
    /// 데이터 바이트 수(비트도 1바이트, [A] 표 8.2.2)
    pub fn size(self) -> usize {
        match self {
            Self::Bit | Self::Byte => 1,
            Self::Word => 2,
            Self::DWord => 4,
            Self::LWord => 8,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Self::Bit => "BIT",
            Self::Byte => "BYTE",
            Self::Word => "WORD",
            Self::DWord => "DWORD",
            Self::LWord => "LWORD",
        }
    }
}

/// 데이터 형 칸 이름(«WORD», «연속»)
pub fn type_name(code: u16) -> String {
    match (code, Kind::from_code(code)) {
        (TYPE_CONTINUOUS, _) => crate::tr!("연속", "continuous").into(),
        (_, Some(k)) => k.name().into(),
        _ => format!("{code:04X}"),
    }
}

/// 디바이스 글자 → Dev
fn dev_of(c: u8) -> Option<Dev> {
    Some(match c.to_ascii_uppercase() {
        b'P' => Dev::XgP,
        b'M' => Dev::XgM,
        b'K' => Dev::XgK,
        b'F' => Dev::XgF,
        b'T' => Dev::XgT,
        b'C' => Dev::XgC,
        b'D' => Dev::XgD,
        b'L' => Dev::XgL,
        b'N' => Dev::XgN,
        _ => return None,
    })
}

/// 디바이스 글자(«M»)
pub fn dev_letter(d: Dev) -> char {
    d.name().chars().nth(1).unwrap_or('?')
}

/// 직접 변수 하나(«%MW100»)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Var {
    pub dev: Dev,
    pub kind: Kind,
    /// 형 단위 번호(비트면 비트 번호, 바이트면 바이트 번호 …)
    pub index: u32,
}

impl Var {
    pub fn text(&self) -> String {
        format!("%{}{}{}", dev_letter(self.dev), self.kind.letter(), self.index)
    }

    /// 걸치는 워드 [시작, 끝)
    fn words(&self) -> (u64, u64) {
        let i = self.index as u64;
        match self.kind {
            Kind::Bit => (i / 16, i / 16 + 1),
            Kind::Byte => (i / 2, i / 2 + 1),
            Kind::Word => (i, i + 1),
            Kind::DWord => (i * 2, i * 2 + 2),
            Kind::LWord => (i * 4, i * 4 + 4),
        }
    }
}

/// «%MW100» 읽기. 글자는 숫자·영문·«%»·«.» 만([A] 8.2.1 (3)). «.» 꼴은 뜻이 원문에 없어 받지 않는다
pub fn parse_var(name: &[u8]) -> Result<Var, u16> {
    if name.is_empty() || name.len() > MAX_NAME || name[0] != b'%' || name.len() < 4 {
        return Err(E_DEVICE);
    }
    if !name.iter().all(|c| c.is_ascii_alphanumeric() || *c == b'%' || *c == b'.') {
        return Err(E_DEVICE);
    }
    let dev = dev_of(name[1]).ok_or(E_DEVICE)?;
    let kind = Kind::from_letter(name[2]).ok_or(E_TYPE)?;
    let digits = &name[3..];
    if !digits.iter().all(u8::is_ascii_digit) {
        return Err(E_DEVICE);
    }
    let mut n = 0u32;
    for &c in digits {
        n = n.checked_mul(10).and_then(|x| x.checked_add((c - b'0') as u32)).ok_or(E_RANGE)?;
    }
    Ok(Var { dev, kind, index: n })
}

// ---------------------------------------------------------------- 메모리 읽기·쓰기(워드 배열, 리틀 엔디언)

fn fits(m: &Memory, v: &Var) -> bool {
    v.words().1 <= m.size(v.dev) as u64
}

fn read_var(m: &Memory, v: &Var) -> Vec<u8> {
    let t = &m.data[&v.dev];
    let i = v.index as usize;
    match v.kind {
        Kind::Bit => vec![((t[i / 16] >> (i % 16)) & 1) as u8],
        Kind::Byte => vec![t[i / 2].to_le_bytes()[i % 2]],
        _ => {
            let (a, b) = v.words();
            t[a as usize..b as usize].iter().flat_map(|w| w.to_le_bytes()).collect()
        }
    }
}

fn write_var(m: &mut Memory, v: &Var, data: &[u8]) {
    let t = m.data.get_mut(&v.dev).expect("XGT 디바이스");
    let i = v.index as usize;
    match v.kind {
        Kind::Bit => {
            // 가장 낮은 비트만 유효([A] 표 8.2.2)
            if data[0] & 1 != 0 {
                t[i / 16] |= 1 << (i % 16);
            } else {
                t[i / 16] &= !(1 << (i % 16));
            }
        }
        Kind::Byte => {
            let mut b = t[i / 2].to_le_bytes();
            b[i % 2] = data[0];
            t[i / 2] = u16::from_le_bytes(b);
        }
        _ => {
            let a = v.words().0 as usize;
            for (k, c) in data.chunks(2).enumerate() {
                t[a + k] = u16::from_le_bytes([c[0], c[1]]);
            }
        }
    }
}

/// 연속 — 바이트 번호 start 부터 n 바이트가 들어가는지
fn fits_bytes(m: &Memory, d: Dev, start: u32, n: usize) -> bool {
    (start as u64 + n as u64).div_ceil(2) <= m.size(d) as u64
}

fn read_bytes(m: &Memory, d: Dev, start: u32, n: usize) -> Vec<u8> {
    let t = &m.data[&d];
    (0..n).map(|k| start as usize + k).map(|b| t[b / 2].to_le_bytes()[b % 2]).collect()
}

fn write_bytes(m: &mut Memory, d: Dev, start: u32, data: &[u8]) {
    let t = m.data.get_mut(&d).expect("XGT 디바이스");
    for (k, &x) in data.iter().enumerate() {
        let b = start as usize + k;
        let mut w = t[b / 2].to_le_bytes();
        w[b % 2] = x;
        t[b / 2] = u16::from_le_bytes(w);
    }
}

// ---------------------------------------------------------------- 머리

/// 머리 BCC — 앞 19바이트의 합(아래 8비트)
pub fn bcc(h: &[u8]) -> u8 {
    h.iter().take(HEADER_LEN - 1).fold(0u8, |a, &b| a.wrapping_add(b))
}

/// 응용 머리(20바이트)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Header {
    pub company: [u8; 10],
    pub plc_info: u16,
    pub cpu_info: u8,
    pub source: u8,
    pub invoke: u16,
    pub length: u16,
    pub position: u8,
    pub bcc: u8,
}

impl Header {
    pub fn parse(f: &[u8]) -> Option<Self> {
        let h = f.get(..HEADER_LEN)?;
        Some(Self {
            company: h[..10].try_into().ok()?,
            plc_info: u16::from_le_bytes([h[10], h[11]]),
            cpu_info: h[12],
            source: h[13],
            invoke: u16::from_le_bytes([h[14], h[15]]),
            length: u16::from_le_bytes([h[16], h[17]]),
            position: h[18],
            bcc: h[19],
        })
    }

    pub fn company_ok(&self) -> bool {
        self.company == COMPANY_XGT || self.company == COMPANY_GLOFA
    }

    /// 회사 ID 글(«LSIS-XGT»)
    pub fn company_text(&self) -> String {
        self.company.iter().filter(|&&c| c != 0).map(|&c| if c.is_ascii_graphic() { c as char } else { '.' }).collect()
    }
}

/// 프레임 구분 — 길이 칸(17·18번째 바이트, 리틀 엔디언) + 머리 20
pub fn frame_mode() -> FrameMode {
    FrameMode::LengthField { offset: 16, size: 2, adjust: HEADER_LEN as i64, max: MAX_FRAME, gap_ms: 1_000, encoding: LengthEncoding::LittleEndian }
}

fn build_header(company: [u8; 10], plc_info: u16, invoke: u16, len: usize) -> Vec<u8> {
    let mut h = Vec::with_capacity(HEADER_LEN + len);
    h.extend(company);
    h.extend(plc_info.to_le_bytes());
    h.push(CPU_XGK);
    h.push(SRC_RESPONSE);
    h.extend(invoke.to_le_bytes());
    h.extend((len as u16).to_le_bytes());
    h.push(0);
    h.push(bcc(&h));
    h
}

// ---------------------------------------------------------------- 요청 해석

/// 해석한 요청. 범위는 실행 때 본다(4)
#[derive(Debug, Clone, PartialEq)]
pub enum Req {
    Read { kind: Kind, vars: Vec<Var> },
    Write { kind: Kind, items: Vec<(Var, Vec<u8>)> },
    ReadCont { start: Var, n: usize },
    WriteCont { start: Var, data: Vec<u8> },
}

impl Req {
    fn devices(&self) -> Vec<Dev> {
        match self {
            Req::Read { vars, .. } => vars.iter().map(|v| v.dev).collect(),
            Req::Write { items, .. } => items.iter().map(|(v, _)| v.dev).collect(),
            Req::ReadCont { start, .. } | Req::WriteCont { start, .. } => vec![start.dev],
        }
    }
    fn writes(&self) -> bool {
        matches!(self, Req::Write { .. } | Req::WriteCont { .. })
    }
}

struct Rd<'a> {
    b: &'a [u8],
    i: usize,
}

impl<'a> Rd<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], u16> {
        let s = self.b.get(self.i..self.i + n).ok_or(E_HEAD_LEN)?;
        self.i += n;
        Ok(s)
    }
    fn u16(&mut self) -> Result<u16, u16> {
        let s = self.take(2)?;
        Ok(u16::from_le_bytes([s[0], s[1]]))
    }
    fn var(&mut self) -> Result<Var, u16> {
        let n = self.u16()? as usize;
        if n == 0 || n > MAX_NAME {
            return Err(E_DEVICE);
        }
        parse_var(self.take(n)?)
    }
}

/// 몸체(명령부터)를 읽는다
pub fn parse(body: &[u8]) -> Result<Req, u16> {
    let mut r = Rd { b: body, i: 0 };
    let cmd = r.u16()?;
    let dtype = r.u16()?;
    let _reserved = r.u16()?;
    if cmd != CMD_READ && cmd != CMD_WRITE {
        return Err(E_COMMAND);
    }
    let write = cmd == CMD_WRITE;
    let blocks = r.u16()? as usize;
    let req = if dtype == TYPE_CONTINUOUS {
        if blocks != 1 {
            return Err(E_BLOCKS);
        }
        let start = r.var()?;
        if start.kind != Kind::Byte {
            return Err(E_TYPE);
        }
        let n = r.u16()? as usize;
        if n > MAX_BYTES {
            return Err(E_SIZE);
        }
        if write { Req::WriteCont { start, data: r.take(n)?.to_vec() } } else { Req::ReadCont { start, n } }
    } else {
        let kind = Kind::from_code(dtype).ok_or(E_TYPE)?;
        if blocks == 0 || blocks > MAX_BLOCKS {
            return Err(E_BLOCKS);
        }
        let mut vars = Vec::with_capacity(blocks);
        for _ in 0..blocks {
            let v = r.var()?;
            if v.kind != kind {
                return Err(E_TYPE);
            }
            vars.push(v);
        }
        if write {
            let mut items = Vec::with_capacity(blocks);
            for v in vars {
                let n = r.u16()? as usize;
                if n != kind.size() {
                    return Err(E_TYPE);
                }
                items.push((v, r.take(n)?.to_vec()));
            }
            Req::Write { kind, items }
        } else {
            Req::Read { kind, vars }
        }
    };
    if r.i != body.len() {
        return Err(E_HEAD_LEN);
    }
    Ok(req)
}

/// 실행 — 응답 몸체 중 오류 상태 뒤(블록 수부터). 범위를 먼저 모두 본 뒤 쓴다
fn execute(m: &mut Memory, req: &Req, t: Duration, rng: &mut crate::regmap::Rng) -> Result<Vec<u8>, u16> {
    let mut out = Vec::new();
    match req {
        Req::Read { vars, .. } => {
            if !vars.iter().all(|v| fits(m, v)) {
                return Err(E_RANGE);
            }
            out.extend((vars.len() as u16).to_le_bytes());
            for v in vars {
                let (a, b) = v.words();
                m.sims_on_read(v.dev, a as u32, b as u32, t, rng);
                let d = read_var(m, v);
                out.extend((d.len() as u16).to_le_bytes());
                out.extend(d);
            }
        }
        Req::Write { items, .. } => {
            if !items.iter().all(|(v, _)| fits(m, v)) {
                return Err(E_RANGE);
            }
            for (v, d) in items {
                write_var(m, v, d);
            }
            out.extend((items.len() as u16).to_le_bytes());
        }
        Req::ReadCont { start, n } => {
            if !fits_bytes(m, start.dev, start.index, *n) {
                return Err(E_RANGE);
            }
            let a = start.index / 2;
            m.sims_on_read(start.dev, a, (start.index + *n as u32).div_ceil(2), t, rng);
            out.extend(1u16.to_le_bytes());
            out.extend((*n as u16).to_le_bytes());
            out.extend(read_bytes(m, start.dev, start.index, *n));
        }
        Req::WriteCont { start, data } => {
            if !fits_bytes(m, start.dev, start.index, data.len()) {
                return Err(E_RANGE);
            }
            write_bytes(m, start.dev, start.index, data);
            out.extend(1u16.to_le_bytes());
        }
    }
    Ok(out)
}

// ---------------------------------------------------------------- 서버

/// XGT 선택
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XgtOptions {
    /// 머리 BCC 가 틀리면 h77 로 답한다. 끄면 BCC 를 보지 않는다(원문 예시 하나가 맞지 않아 끌 수 있게 둠)
    #[serde(default = "yes")]
    pub check_bcc: bool,
}

fn yes() -> bool {
    true
}

impl Default for XgtOptions {
    fn default() -> Self {
        Self { check_bcc: true }
    }
}

fn plc_info(m: RunMode) -> u16 {
    let state: u16 = if m == RunMode::Run { 1 } else { 2 };
    state << 8
}

/// 응답 몸체 — ACK(오류 상태 0 + rest) 또는 NAK(오류 상태 FFFF + 오류 코드 2바이트)
fn body(cmd: u16, dtype: u16, err: Option<u16>, rest: &[u8]) -> Vec<u8> {
    let mut b = Vec::with_capacity(10 + rest.len());
    b.extend(cmd.wrapping_add(1).to_le_bytes());
    b.extend(dtype.to_le_bytes());
    b.extend([0, 0]);
    match err {
        None => {
            b.extend([0, 0]);
            b.extend(rest);
        }
        Some(code) => {
            b.extend(0xFFFFu16.to_le_bytes());
            b.extend(code.to_le_bytes());
        }
    }
    b
}

fn frame(company: [u8; 10], info: u16, invoke: u16, body: Vec<u8>) -> Vec<u8> {
    let mut f = build_header(company, info, invoke, body.len());
    f.extend(body);
    f
}

/// 요청 프레임 하나(머리 포함)를 처리한다 — mc::Server::handle 이 프로토콜이 Xgt 일 때 부른다
pub fn handle(sv: &mut Server, f: &[u8]) -> (Option<Vec<u8>>, Outcome) {
    let Some(h) = Header::parse(f) else { return (None, Outcome::new("ignored")) };
    // 응답 프레임·다른 방향은 요청이 아니다
    if h.source != SRC_REQUEST {
        return (None, Outcome::new("ignored"));
    }
    let b = &f[HEADER_LEN..];
    let cmd = b.get(..2).map_or(0, |x| u16::from_le_bytes([x[0], x[1]]));
    let dtype = b.get(2..4).map_or(0, |x| u16::from_le_bytes([x[0], x[1]]));
    let mut o = Outcome::new("ok");
    (o.command, o.sub) = (cmd, dtype);
    let company = if h.company_ok() { h.company } else { COMPANY_XGT };
    let info = plc_info(sv.run_mode);
    let nak = |o: &mut Outcome, code: u16| {
        o.result = "error";
        o.end_code = Some(code);
        frame(company, info, h.invoke, body(cmd, dtype, Some(code), &[]))
    };
    let head_err = if !h.company_ok() {
        Some(E_COMPANY)
    } else if h.length as usize != b.len() {
        Some(E_HEAD_LEN)
    } else if sv.xgt.check_bcc && bcc(f) != h.bcc {
        Some(E_BCC)
    } else {
        None
    };
    if let Some(code) = head_err {
        return (Some(nak(&mut o, code)), o);
    }
    let req = parse(b);
    let faulted = sv.fault_applies(cmd, req.as_ref().map(Req::devices).unwrap_or_default());
    o.faulted = faulted;
    if faulted {
        o.delay_ms = sv.pick_delay();
    }
    let res = match req {
        _ if faulted && sv.faults.force_end_code != 0 => Err(sv.faults.force_end_code),
        Ok(req) => {
            let t = sv.t0.elapsed();
            let r = execute(&mut sv.mem, &req, t, &mut sv.rng);
            o.written = r.is_ok() && req.writes();
            r
        }
        Err(code) => Err(code),
    };
    if o.written {
        o.events.extend(sv.eval_rules(Instant::now()).iter().map(Fired::line));
    }
    let resp = match res {
        Ok(rest) => frame(company, info, h.invoke, body(cmd, dtype, None, &rest)),
        Err(code) => nak(&mut o, code),
    };
    if faulted && sv.faults.no_response {
        o.result = "no-response";
        o.delay_ms = 0;
        return (None, o);
    }
    (Some(resp), o)
}

// ---------------------------------------------------------------- 통신 기록 한 줄 풀이

/// 명령 이름(한·영)
pub fn command_name(cmd: u16, dtype: u16) -> String {
    let cont = dtype == TYPE_CONTINUOUS;
    match (cmd, cont) {
        (CMD_READ, false) => crate::tr!("개별 읽기", "Read (individual)").into(),
        (CMD_READ, true) => crate::tr!("연속 읽기", "Read (continuous)").into(),
        (CMD_WRITE, false) => crate::tr!("개별 쓰기", "Write (individual)").into(),
        (CMD_WRITE, true) => crate::tr!("연속 쓰기", "Write (continuous)").into(),
        (CMD_READ_RESP, _) => crate::tr!("읽기 응답", "Read response").into(),
        (CMD_WRITE_RESP, _) => crate::tr!("쓰기 응답", "Write response").into(),
        _ => crate::tr!("모르는 명령", "unknown instruction").into(),
    }
}

/// 받은 요청 한 줄(«0054 개별 읽기 WORD %MW100 · #0001»). XGT 머리가 아니면 None
pub fn describe_request(f: &[u8]) -> Option<String> {
    let h = Header::parse(f)?;
    if !h.company_ok() || h.source != SRC_REQUEST {
        return None;
    }
    let b = &f[HEADER_LEN..];
    let cmd = u16::from_le_bytes([*b.first()?, *b.get(1)?]);
    let dtype = b.get(2..4).map_or(0, |x| u16::from_le_bytes([x[0], x[1]]));
    let mut s = format!("{cmd:04X} {} {}", command_name(cmd, dtype), type_name(dtype));
    match parse(b) {
        Ok(Req::Read { vars, .. }) => s += &format!(" {}", vars.iter().map(Var::text).collect::<Vec<_>>().join(",")),
        Ok(Req::Write { items, .. }) => s += &format!(" {}", items.iter().map(|(v, _)| v.text()).collect::<Vec<_>>().join(",")),
        Ok(Req::ReadCont { start, n }) => s += &format!(" {} ×{n}", start.text()),
        Ok(Req::WriteCont { start, data }) => s += &format!(" {} ×{}", start.text(), data.len()),
        Err(code) => s += &format!(" — {code:04X} {}", error_text(code)),
    }
    if h.length as usize != b.len() {
        s += &format!(" — {E_HEAD_LEN:04X} {}", error_text(E_HEAD_LEN));
    } else if bcc(f) != h.bcc {
        s += &format!(" · BCC {:02X}≠{:02X}", h.bcc, bcc(f));
    }
    s += &format!(" · #{:04X}", h.invoke);
    Some(s)
}

/// 보낸 응답 한 줄(«0055 ACK · 블록 1 · #0001», «0055 NAK 0004 디바이스 범위 밖»)
pub fn describe_response(f: &[u8]) -> Option<String> {
    let h = Header::parse(f)?;
    if h.source != SRC_RESPONSE {
        return None;
    }
    let b = &f[HEADER_LEN..];
    let cmd = u16::from_le_bytes([*b.first()?, *b.get(1)?]);
    let status = u16::from_le_bytes([*b.get(6)?, *b.get(7)?]);
    let next = b.get(8..10).map(|x| u16::from_le_bytes([x[0], x[1]]));
    let mut s = if status == 0 {
        format!("{cmd:04X} ACK · {} {}", crate::tr!("블록", "blocks"), next.unwrap_or(0))
    } else {
        let code = next.unwrap_or(0);
        format!("{cmd:04X} NAK {code:04X} {}", error_text(code))
    };
    s += &format!(" · #{:04X}", h.invoke);
    Some(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 머리 20바이트(요청) + 몸체 — BCC 를 맞게 채운다
    fn req(invoke: u16, body: &[u8]) -> Vec<u8> {
        let mut h = Vec::new();
        h.extend(COMPANY_XGT);
        h.extend([0, 0, CPU_XGK, SRC_REQUEST]);
        h.extend(invoke.to_le_bytes());
        h.extend((body.len() as u16).to_le_bytes());
        h.push(0);
        h.push(bcc(&h));
        h.extend(body);
        h
    }

    fn xgt_server() -> Server {
        let mut s = Server::with_seed(1);
        s.protocol = crate::mc::Protocol::Xgt;
        s
    }

    /// 응답 몸체(머리 뒤)
    fn body_of(r: &[u8]) -> &[u8] {
        &r[HEADER_LEN..]
    }

    #[test]
    fn bcc_matches_manual_examples() {
        // [B] 표 5-8(요청, Invoke 00 01, 길이 0x10) → 0x3F
        let mut h = COMPANY_XGT.to_vec();
        h.extend([0x00, 0x00, 0xA0, 0x33, 0x00, 0x01, 0x10, 0x00, 0x00]);
        assert_eq!(bcc(&h), 0x3F);
        // 표 5-7(응답, PLC 정보 11 01, 위치 03) → 0x2F
        let mut h = COMPANY_XGT.to_vec();
        h.extend([0x11, 0x01, 0xA0, 0x11, 0x00, 0x00, 0x0E, 0x00, 0x03]);
        assert_eq!(bcc(&h), 0x2F);
        // 표 5-9(응답, PLC 정보 02 08, 위치 01) → 0x26
        let mut h = COMPANY_XGT.to_vec();
        h.extend([0x02, 0x08, 0xA0, 0x11, 0x00, 0x01, 0x0E, 0x00, 0x01]);
        assert_eq!(bcc(&h), 0x26);
        // 표 5-6 은 원문에 0x4E 로 적혀 있지만 머리 합은 0x3C
        let mut h = COMPANY_XGT.to_vec();
        h.extend([0x00, 0x00, 0xA0, 0x33, 0x00, 0x00, 0x0E, 0x00, 0x00]);
        assert_eq!(bcc(&h), 0x3C);
    }

    #[test]
    fn manual_table_5_6_individual_read() {
        // [B] 표 5-6 요청 그대로(BCC 0x4E) — BCC 검사를 끄면 표 5-7 몸체(예약 칸 빼고)로 답한다
        let mut f = COMPANY_XGT.to_vec();
        f.extend([0x00, 0x00, 0xA0, 0x33, 0x00, 0x00, 0x0E, 0x00, 0x00, 0x4E]);
        f.extend([0x54, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4D, 0x57, 0x30]);
        let mut s = xgt_server();
        let (r, o) = s.handle(&f);
        assert_eq!(o.end_code, Some(E_BCC));
        assert_eq!(body_of(&r.unwrap()), [0x55, 0x00, 0x02, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x77, 0x00]);
        s.xgt.check_bcc = false;
        let (r, o) = s.handle(&f);
        assert_eq!(o.result, "ok");
        let r = r.unwrap();
        assert_eq!(body_of(&r), [0x55, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00]);
        // 응답 머리: 회사 ID · 방향 h11 · 길이 · BCC
        assert_eq!(&r[..10], &COMPANY_XGT);
        assert_eq!(r[13], SRC_RESPONSE);
        assert_eq!(u16::from_le_bytes([r[16], r[17]]), 14);
        assert_eq!(r[19], bcc(&r));
    }

    #[test]
    fn manual_table_5_8_continuous_read() {
        // [B] 표 5-8 요청 그대로(BCC 0x3F 맞음) → 표 5-9 몸체
        let mut f = COMPANY_XGT.to_vec();
        f.extend([0x00, 0x00, 0xA0, 0x33, 0x00, 0x01, 0x10, 0x00, 0x00, 0x3F]);
        f.extend([0x54, 0x00, 0x14, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4D, 0x42, 0x30, 0x02, 0x00]);
        let (r, o) = xgt_server().handle(&f);
        assert_eq!(o.result, "ok");
        let r = r.unwrap();
        assert_eq!(body_of(&r), [0x55, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00]);
        assert_eq!([r[14], r[15]], [0x00, 0x01]);
    }

    #[test]
    fn manual_v230_examples() {
        let mut s = xgt_server();
        // [A] 8.2.3 개별 쓰기 %MW100 ← h1234 → 59 00 02 00 00 00 00 00 01 00
        let (r, _) = s.handle(&req(1, &[0x58, 0, 2, 0, 0, 0, 1, 0, 6, 0, b'%', b'M', b'W', b'1', b'0', b'0', 2, 0, 0x34, 0x12]));
        assert_eq!(body_of(&r.unwrap()), [0x59, 0, 2, 0, 0, 0, 0, 0, 1, 0]);
        assert_eq!(s.mem.get(Dev::XgM, 100, 1).unwrap(), [0x1234]);
        // [A] 8.2.1 개별 읽기 %MW100 → h0055 h0002 h0000 h0000 h0001 h0002 h1234
        let (r, o) = s.handle(&req(2, &[0x54, 0, 2, 0, 0, 0, 1, 0, 6, 0, b'%', b'M', b'W', b'1', b'0', b'0']));
        assert!(!o.written);
        assert_eq!(body_of(&r.unwrap()), [0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]);
        // [A] 8.2.4 연속 쓰기 %MB100 ← 2바이트 h1234(바이트 34 12) → 워드 50
        let (r, o) = s.handle(&req(3, &[0x58, 0, 0x14, 0, 0, 0, 1, 0, 6, 0, b'%', b'M', b'B', b'1', b'0', b'0', 2, 0, 0x34, 0x12]));
        assert!(o.written);
        assert_eq!(body_of(&r.unwrap()), [0x59, 0, 0x14, 0, 0, 0, 0, 0, 1, 0]);
        assert_eq!(s.mem.get(Dev::XgM, 50, 1).unwrap(), [0x1234]);
    }

    #[test]
    fn bit_byte_dword_lword_units() {
        let mut s = xgt_server();
        s.mem.set(Dev::XgD, 1234, &[0xABCD]).unwrap();
        // [B] 5.2.4 주의 3: %DW1234 = %DB2468(아래 바이트)
        // 블록 2개를 적고 1개만 넣으면 몸체 길이 틀림
        let (r, _) = s.handle(&req(1, &[0x54, 0, 1, 0, 0, 0, 2, 0, 7, 0, b'%', b'D', b'B', b'2', b'4', b'6', b'8']));
        assert_eq!(&body_of(&r.unwrap())[6..], [0xFF, 0xFF, 0x76, 0x00]);
        let (r, _) = s.handle(&req(1, &[0x54, 0, 1, 0, 0, 0, 2, 0, 7, 0, b'%', b'D', b'B', b'2', b'4', b'6', b'8', 7, 0, b'%', b'D', b'B', b'2', b'4', b'6', b'9']));
        assert_eq!(&body_of(&r.unwrap())[8..], [2, 0, 1, 0, 0xCD, 1, 0, 0xAB]);
        // %MX2764 = %MW172 의 비트 C([A] 8-12쪽)
        let (_, o) = s.handle(&req(1, &[0x58, 0, 0, 0, 0, 0, 1, 0, 7, 0, b'%', b'M', b'X', b'2', b'7', b'6', b'4', 1, 0, 0x01]));
        assert!(o.written);
        assert_eq!(s.mem.get(Dev::XgM, 172, 1).unwrap(), [1 << 12]);
        // 비트 읽기는 1바이트 0/1
        let (r, _) = s.handle(&req(1, &[0x54, 0, 0, 0, 0, 0, 1, 0, 7, 0, b'%', b'M', b'X', b'2', b'7', b'6', b'4']));
        assert_eq!(&body_of(&r.unwrap())[8..], [1, 0, 1, 0, 1]);
        // 더블워드 %PD1 = 워드 2·3, 롱워드 %PL1 = 워드 4~7(낮은 워드 먼저)
        s.handle(&req(1, &[0x58, 0, 3, 0, 0, 0, 1, 0, 4, 0, b'%', b'P', b'D', b'1', 4, 0, 0x78, 0x56, 0x34, 0x12]));
        assert_eq!(s.mem.get(Dev::XgP, 2, 2).unwrap(), [0x5678, 0x1234]);
        s.handle(&req(1, &[0x58, 0, 4, 0, 0, 0, 1, 0, 4, 0, b'%', b'P', b'L', b'1', 8, 0, 1, 0, 2, 0, 3, 0, 4, 0]));
        assert_eq!(s.mem.get(Dev::XgP, 4, 4).unwrap(), [1, 2, 3, 4]);
    }

    #[test]
    fn error_codes() {
        let mut s = xgt_server();
        let code = |s: &mut Server, f: Vec<u8>| s.handle(&f).1.end_code;
        // 블록 17개
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 2, 0, 0, 0, 17, 0])), Some(E_BLOCKS));
        // 데이터 형 h05
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 5, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0'])), Some(E_TYPE));
        // 형 글자(B)와 데이터 형(WORD)이 다름
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'B', b'0'])), Some(E_TYPE));
        // 모르는 디바이스 %ZW0
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'Z', b'W', b'0'])), Some(E_DEVICE));
        // 범위 밖 %MW9999(기본 2048)
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 7, 0, b'%', b'M', b'W', b'9', b'9', b'9', b'9'])), Some(E_RANGE));
        // 연속 1,401바이트
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 0x14, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'B', b'0', 0x79, 0x05])), Some(E_SIZE));
        // 연속인데 워드 변수
        assert_eq!(code(&mut s, req(1, &[0x54, 0, 0x14, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0', 2, 0])), Some(E_TYPE));
        // 모르는 명령(상태 읽기 h00B0)
        assert_eq!(code(&mut s, req(1, &[0xB0, 0, 0, 0, 0, 0])), Some(E_COMMAND));
        // 회사 ID
        let mut f = req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0']);
        f[0] = b'X';
        let (r, o) = s.handle(&f);
        assert_eq!(o.end_code, Some(E_COMPANY));
        assert_eq!(&r.unwrap()[..10], &COMPANY_XGT);
        // 길이 칸이 실제와 다름
        let mut f = req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0']);
        f[16] = 3;
        f[19] = bcc(&f);
        assert_eq!(code(&mut s, f), Some(E_HEAD_LEN));
        // 응답 방향(h11) 프레임은 답하지 않음
        let mut f = req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0']);
        f[13] = SRC_RESPONSE;
        assert_eq!(s.handle(&f).0, None);
        // 범위 밖이 섞인 쓰기는 하나도 쓰지 않는다
        let f = req(1, &[0x58, 0, 2, 0, 0, 0, 2, 0, 4, 0, b'%', b'M', b'W', b'0', 7, 0, b'%', b'M', b'W', b'9', b'9', b'9', b'9', 2, 0, 1, 0, 2, 0, 2, 0]);
        assert_eq!(code(&mut s, f), Some(E_RANGE));
        assert_eq!(s.mem.get(Dev::XgM, 0, 1).unwrap(), [0]);
    }

    #[test]
    fn glofa_id_and_run_state() {
        let mut s = xgt_server();
        let mut f = req(7, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'D', b'W', b'0']);
        f[..10].copy_from_slice(&COMPANY_GLOFA);
        f[19] = bcc(&f);
        let r = s.handle(&f).0.unwrap();
        assert_eq!(&r[..10], &COMPANY_GLOFA);
        assert_eq!([r[10], r[11]], [0x00, 0x01]);
        s.set_run_mode(RunMode::Stop);
        let r = s.handle(&f).0.unwrap();
        assert_eq!([r[10], r[11]], [0x00, 0x02]);
    }

    #[test]
    fn faults_and_names() {
        let mut s = xgt_server();
        s.set_faults(crate::mc::Faults { force_end_code: 0x0004, ..Default::default() });
        let (r, o) = s.handle(&req(1, &[0x58, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0', 2, 0, 1, 0]));
        assert_eq!(o.end_code, Some(4));
        assert!(!o.written);
        assert_eq!(&body_of(&r.unwrap())[6..], [0xFF, 0xFF, 4, 0]);
        let f = req(9, &[0x54, 0, 2, 0, 0, 0, 1, 0, 6, 0, b'%', b'M', b'W', b'1', b'0', b'0']);
        let d = describe_request(&f).unwrap();
        assert!(d.starts_with("0054 ") && d.contains("%MW100") && d.ends_with("#0009"), "{d}");
        let resp = frame(COMPANY_XGT, 0x0100, 9, body(CMD_READ, 2, Some(E_RANGE), &[]));
        assert!(describe_response(&resp).unwrap().starts_with("0055 NAK 0004"));
        assert_eq!(parse_var(b"%mw10").unwrap(), Var { dev: Dev::XgM, kind: Kind::Word, index: 10 });
        assert_eq!(parse_var(b"%MW10.1"), Err(E_DEVICE));
        assert_eq!(parse_var(b"MW10"), Err(E_DEVICE));
    }

    #[test]
    fn frame_mode_splits_by_length() {
        let f = req(1, &[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, b'%', b'M', b'W', b'0']);
        let FrameMode::LengthField { offset, adjust, .. } = frame_mode() else { panic!() };
        assert_eq!(u16::from_le_bytes([f[offset], f[offset + 1]]) as i64 + adjust, f.len() as i64);
    }
}
