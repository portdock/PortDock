//! LS ELECTRIC XGT 전용 프로토콜(FEnet) 프레임 풀이 — `site/src/lib/xgtDecode.ts` 를 옮긴 것.
//! 머리 20바이트(회사 ID·PLC 정보·CPU 정보·프레임 방향·Invoke ID·길이·FEnet 위치·BCC), 읽기 h0054·쓰기 h0058 요청과 h0055·h0059 응답(개별·연속),
//! 직접 변수(«%MW100»), 오류 코드(1~6 · h75~h78). 근거(공개 사용설명서): XGT FEnet I/F Module User's Manual V2.30 8장·10.4,
//! XGB FEnet I/F Module XBL-EMTA V1.8 5.2.

use super::{CodeInfo, hex};

pub const HEADER_LEN: usize = 20;
pub const MAX_BLOCKS: u16 = 16;
pub const MAX_NAME: usize = 16;
pub const MAX_BYTES: u16 = 1400;
const COMPANY_XGT: [u8; 10] = [0x4c, 0x53, 0x49, 0x53, 0x2d, 0x58, 0x47, 0x54, 0x00, 0x00];
const COMPANY_GLOFA: [u8; 10] = [0x4c, 0x47, 0x49, 0x53, 0x2d, 0x47, 0x4c, 0x4f, 0x46, 0x41];
pub const CONTINUOUS: u16 = 0x14;

/// 오류 코드 표 — 사용설명서 10.4 의 설명을 원인·점검 순서로 풀었다. 표에 없는 코드는 «설명 없음» 으로 보인다.
pub const XGT_ERRORS: &[CodeInfo] = &[
    CodeInfo {
        code: 0x0001,
        name_en: "More than 16 blocks",
        name_ko: "블록 수 16 넘음",
        cause_en: "An individual read/write has 0 or more than 16 blocks, or a continuous request does not have exactly 1 block.",
        cause_ko: "개별 읽기·쓰기의 블록 수가 0 이거나 16 보다 크고, 연속 요청인데 블록 수가 1 이 아닙니다.",
        check_en: "Check the 'number of blocks' field; send at most 16 variables per request.",
        check_ko: "요청의 «블록 수» 칸을 본다. 한 요청에 변수는 16개까지 보낸다.",
    },
    CodeInfo {
        code: 0x0002,
        name_en: "Wrong data type",
        name_ko: "데이터 형 틀림",
        cause_en: "The data type field is not one of h00-h04/h14, the type letter of a variable (X·B·W·D·L) differs from the data type, or the write data size does not fit the type.",
        cause_ko: "데이터 형 칸이 h00~h04·h14 가 아니거나, 변수의 형 글자(X·B·W·D·L)가 데이터 형과 다르거나, 쓰기 데이터 크기가 형과 맞지 않습니다.",
        check_en: "1) Compare the data type field with the variable letters (all variables in one request must have the same letter). 2) For continuous access use a byte variable (%MB…).",
        check_ko: "1) 데이터 형 칸과 변수의 형 글자를 맞춘다(한 요청의 변수는 형 글자가 모두 같아야 한다). 2) 연속 접근은 바이트 변수(%MB…)를 쓴다.",
    },
    CodeInfo {
        code: 0x0003,
        name_en: "Device not serviced",
        name_ko: "서비스하지 않는 디바이스",
        cause_en: "The device letter is not one of P·M·K·F·T·C·D·L·N, or the variable name does not start with %, exceeds 16 characters, or its number is not decimal.",
        cause_ko: "디바이스 글자가 P·M·K·F·T·C·D·L·N 이 아니거나, 이름이 «%» 로 시작하지 않거나 16글자를 넘거나, 번호가 10진 숫자가 아닙니다.",
        check_en: "Check the variable text (e.g. %MW100) character by character.",
        check_ko: "변수 글(예: %MW100)을 한 글자씩 확인한다.",
    },
    CodeInfo {
        code: 0x0004,
        name_en: "Device area exceeded",
        name_ko: "디바이스 범위 밖",
        cause_en: "The device number is beyond the size of that device in the PLC.",
        cause_ko: "번호가 PLC 에 설정된 그 디바이스의 크기를 넘습니다.",
        check_en: "Compare the variable number with the PLC's device area settings.",
        check_ko: "변수 번호를 PLC 의 디바이스 영역 설정과 비교한다.",
    },
    CodeInfo {
        code: 0x0005,
        name_en: "Over 1,400 bytes (block)",
        name_ko: "1,400바이트 넘음(블록)",
        cause_en: "A continuous read/write asks for more than 1,400 bytes.",
        cause_ko: "연속 읽기·쓰기의 데이터 수가 1,400 바이트보다 큽니다.",
        check_en: "Split the continuous request into chunks of 1,400 bytes or less.",
        check_ko: "1,400 바이트 이하로 나눠 보낸다.",
    },
    CodeInfo {
        code: 0x0006,
        name_en: "Over 1,400 bytes (total)",
        name_ko: "1,400바이트 넘음(합)",
        cause_en: "The total of the individual blocks exceeds 1,400 bytes.",
        cause_ko: "개별 블록들의 합이 1,400 바이트를 넘습니다.",
        check_en: "Reduce the number of variables or the data sizes.",
        check_ko: "변수 수나 데이터 크기를 줄인다.",
    },
    CodeInfo {
        code: 0x0075,
        name_en: "Wrong company ID",
        name_ko: "머리 회사 ID 틀림",
        cause_en: "The first 10 bytes are neither «LSIS-XGT»+00 00 nor «LGIS-GLOFA».",
        cause_ko: "앞 10바이트가 «LSIS-XGT»+00 00 도 «LGIS-GLOFA» 도 아닙니다.",
        check_en: "Check how the client builds the header.",
        check_ko: "클라이언트가 만드는 머리의 앞 10바이트를 확인한다.",
    },
    CodeInfo {
        code: 0x0076,
        name_en: "Wrong header length",
        name_ko: "머리 길이 틀림",
        cause_en: "The header length field differs from the number of bytes that actually follow, or the body is shorter/longer than its block count and name lengths say.",
        cause_ko: "머리의 길이 칸이 실제 뒤따르는 바이트 수와 다르거나, 몸체가 블록 수·이름 길이와 맞지 않습니다.",
        check_en: "Recompute the length (bytes after the 20-byte header) and compare with the real frame.",
        check_ko: "길이(20바이트 머리 뒤의 바이트 수)를 다시 계산해 실제 프레임과 비교한다.",
    },
    CodeInfo {
        code: 0x0077,
        name_en: "Wrong header checksum",
        name_ko: "머리 BCC 틀림",
        cause_en: "The BCC (low 8 bits of the sum of the first 19 header bytes) differs.",
        cause_ko: "BCC(머리 앞 19바이트 합의 아래 8비트)가 다릅니다.",
        check_en: "Recompute the BCC over the first 19 bytes of the header.",
        check_ko: "머리 앞 19바이트 합의 아래 8비트로 BCC 를 다시 계산한다.",
    },
    CodeInfo {
        code: 0x0078,
        name_en: "Wrong instruction",
        name_ko: "명령 틀림",
        cause_en: "The instruction is not h0054 (read) or h0058 (write) (status read h00B0 included).",
        cause_ko: "명령이 h0054(읽기)·h0058(쓰기)이 아닙니다(상태 읽기 h00B0 포함).",
        check_en: "Use read h0054 / write h0058 only.",
        check_ko: "읽기 h0054·쓰기 h0058 만 쓴다.",
    },
];

pub fn xgt_error(code: u32) -> Option<&'static CodeInfo> {
    XGT_ERRORS.iter().find(|c| c.code == code)
}

pub fn err_text(code: u32) -> &'static str {
    xgt_error(code)
        .map(|e| e.name_en)
        .unwrap_or("unknown error code")
}

pub const XGT_DEVICES: [(char, &str); 9] = [
    ('P', "I/O relay"),
    ('M', "Auxiliary relay"),
    ('K', "Keep relay"),
    ('F', "Special relay"),
    ('T', "Timer"),
    ('C', "Counter"),
    ('D', "Data register"),
    ('L', "Link relay"),
    ('N', "Communication data register"),
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    X,
    B,
    W,
    D,
    L,
}

impl Kind {
    pub fn size(self) -> usize {
        match self {
            Kind::X | Kind::B => 1,
            Kind::W => 2,
            Kind::D => 4,
            Kind::L => 8,
        }
    }
    fn code(self) -> u16 {
        match self {
            Kind::X => 0,
            Kind::B => 1,
            Kind::W => 2,
            Kind::D => 3,
            Kind::L => 4,
        }
    }
    fn name(self) -> &'static str {
        match self {
            Kind::X => "BIT",
            Kind::B => "BYTE",
            Kind::W => "WORD",
            Kind::D => "DWORD",
            Kind::L => "LWORD",
        }
    }
    fn letter(self) -> char {
        match self {
            Kind::X => 'X',
            Kind::B => 'B',
            Kind::W => 'W',
            Kind::D => 'D',
            Kind::L => 'L',
        }
    }
    fn of_code(c: u16) -> Option<Kind> {
        [Kind::X, Kind::B, Kind::W, Kind::D, Kind::L]
            .into_iter()
            .find(|k| k.code() == c)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Var {
    pub dev: char,
    pub kind: Kind,
    pub index: u64,
    pub text: String,
}

/// «%MW100» → 변수. 틀리면 오류 코드(3·2·4)
pub fn parse_var(name: &str) -> Result<Var, u32> {
    let b = name.as_bytes();
    if name.is_empty() || b.len() > MAX_NAME || b[0] != b'%' || b.len() < 4 {
        return Err(3);
    }
    if !b
        .iter()
        .all(|c| c.is_ascii_alphanumeric() || *c == b'%' || *c == b'.')
    {
        return Err(3);
    }
    let dev = (b[1] as char).to_ascii_uppercase();
    if !XGT_DEVICES.iter().any(|(l, _)| *l == dev) {
        return Err(3);
    }
    let kind = match (b[2] as char).to_ascii_uppercase() {
        'X' => Kind::X,
        'B' => Kind::B,
        'W' => Kind::W,
        'D' => Kind::D,
        'L' => Kind::L,
        _ => return Err(2),
    };
    let digits = &name[3..];
    if digits.is_empty() || !digits.bytes().all(|c| c.is_ascii_digit()) {
        return Err(3);
    }
    let index: u64 = digits.parse().map_err(|_| 4u32)?;
    if index > 0xffff_ffff {
        return Err(4);
    }
    Ok(Var {
        dev,
        kind,
        index,
        text: format!("%{dev}{}{index}", kind.letter()),
    })
}

/// 변수가 가리키는 워드(비트·바이트·더블·롱 단위 → 워드 번호, PortDock PLC Simulator 의 규칙)
pub fn var_words(v: &Var) -> String {
    let i = v.index;
    match v.kind {
        Kind::X => format!("%{}W{} bit {:X}", v.dev, i / 16, i % 16),
        Kind::B => format!(
            "%{}W{} {}",
            v.dev,
            i / 2,
            if !i.is_multiple_of(2) { "hi" } else { "lo" }
        ),
        Kind::W => format!("%{}W{}", v.dev, i),
        Kind::D => format!("%{}W{}–{}", v.dev, i * 2, i * 2 + 1),
        Kind::L => format!("%{}W{}–{}", v.dev, i * 4, i * 4 + 3),
    }
}

/// 머리 BCC — 앞 19바이트 합의 아래 8비트
pub fn bcc(b: &[u8]) -> u8 {
    b[..HEADER_LEN - 1]
        .iter()
        .fold(0u8, |a, &x| a.wrapping_add(x))
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Field {
    pub name: String,
    pub raw: String,
    pub value: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Item {
    pub addr: String,
    /// 바이트 수(1·2·4·8)
    pub size: usize,
    /// 리틀 엔디언으로 읽은 값(글)
    pub value: String,
    pub hex: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Dir {
    Request,
    Response,
}

#[derive(Clone, Debug)]
pub struct XgtDecoded {
    pub dir: Dir,
    pub header: Vec<Field>,
    pub body: Vec<Field>,
    pub items: Vec<Item>,
    pub notes: Vec<String>,
    /// 명령(h0054 …)
    pub command: u16,
    pub data_type: u16,
    pub invoke: u16,
    /// 응답의 오류 코드(정상이면 0)
    pub error: Option<u32>,
    /// 요청이면 PortDock PLC Simulator 가 답할 오류 코드(0 = 정상, 범위 밖 4 는 앱 크기에 따라 달라 따지지 않음)
    pub sim_error: Option<u32>,
    /// 요청의 변수들(응답 값 이름 붙이기용)
    pub vars: Vec<Var>,
}

fn le(b: &[u8], i: usize, n: usize) -> u64 {
    b.get(i..i + n)
        .map(|s| s.iter().rev().fold(0u64, |a, &x| (a << 8) | x as u64))
        .unwrap_or(0)
}
fn value_of(b: &[u8]) -> String {
    le(b, 0, b.len()).to_string()
}

struct Rd<'a> {
    i: usize,
    b: &'a [u8],
}
impl<'a> Rd<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8], u32> {
        if self.i + n > self.b.len() {
            return Err(0x0076);
        }
        let s = &self.b[self.i..self.i + n];
        self.i += n;
        Ok(s)
    }
    fn u16(&mut self) -> Result<u16, u32> {
        let s = self.take(2)?;
        Ok(s[0] as u16 | ((s[1] as u16) << 8))
    }
}

fn type_name(code: u16) -> String {
    if code == CONTINUOUS {
        "continuous (block)".into()
    } else {
        Kind::of_code(code)
            .map(|k| k.name().to_string())
            .unwrap_or_else(|| "unknown type".into())
    }
}

pub fn command_name(cmd: u16, dtype: u16) -> &'static str {
    let cont = dtype == CONTINUOUS;
    match cmd {
        0x54 => {
            if cont {
                "Read request (continuous)"
            } else {
                "Read request (individual)"
            }
        }
        0x55 => "Read response",
        0x58 => {
            if cont {
                "Write request (continuous)"
            } else {
                "Write request (individual)"
            }
        }
        0x59 => "Write response",
        0xb0 => "Status request",
        0xb1 => "Status response",
        _ => "unknown instruction",
    }
}

struct Body {
    fields: Vec<Field>,
    cursor: usize,
}
impl Body {
    fn push(&mut self, end: usize, name: String, raw: String, value: String) {
        self.fields.push(Field {
            name,
            raw,
            value,
            start: self.cursor,
            end,
        });
        self.cursor = end;
    }
}

/// 요청 몸체 풀이 — 오류면 그 코드를 돌려준다(xgt.rs parse 와 같은 순서). 필드 위치는 몸체 안 기준 + base
fn parse_request(body: &[u8], base: usize, out: &mut Body, vars: &mut Vec<Var>) -> Result<(), u32> {
    let mut r = Rd { i: 0, b: body };
    let cmd = r.u16()?;
    let dtype = r.u16()?;
    r.u16()?;
    if cmd != 0x54 && cmd != 0x58 {
        return Err(0x0078);
    }
    let write = cmd == 0x58;
    let blocks = r.u16()?;
    out.push(
        base + r.i,
        "Number of blocks".into(),
        hex(&body[r.i - 2..r.i]),
        blocks.to_string(),
    );
    let read_var =
        |r: &mut Rd, out: &mut Body, vars: &mut Vec<Var>, k: usize| -> Result<Var, u32> {
            let n = r.u16()? as usize;
            out.push(
                base + r.i,
                format!("Variable length {k}"),
                hex(&body[r.i - 2..r.i]),
                format!("{n} chars"),
            );
            if n == 0 || n > MAX_NAME {
                return Err(0x0003);
            }
            let bytes = r.take(n)?;
            let text: String = bytes.iter().map(|&c| c as char).collect();
            let v = parse_var(&text);
            let shown = match &v {
                Ok(v) => format!("{} → {}", v.text, var_words(v)),
                Err(_) => format!("«{text}»"),
            };
            out.push(base + r.i, format!("Variable {k}"), hex(bytes), shown);
            let v = v?;
            vars.push(v.clone());
            Ok(v)
        };
    if dtype == CONTINUOUS {
        if blocks != 1 {
            return Err(0x0001);
        }
        let v = read_var(&mut r, out, vars, 1)?;
        if v.kind != Kind::B {
            return Err(0x0002);
        }
        let n = r.u16()?;
        out.push(
            base + r.i,
            "Number of data".into(),
            hex(&body[r.i - 2..r.i]),
            format!(
                "{n} bytes (%{}B{}–%{}B{})",
                v.dev,
                v.index,
                v.dev,
                v.index + n.max(1) as u64 - 1
            ),
        );
        if n > MAX_BYTES {
            return Err(0x0005);
        }
        if write {
            let d = r.take(n as usize)?;
            out.push(
                base + r.i,
                "Data to write".into(),
                hex(d),
                format!("{n} bytes"),
            );
        }
    } else {
        let kind = Kind::of_code(dtype).ok_or(0x0002u32)?;
        if blocks == 0 || blocks > MAX_BLOCKS {
            return Err(0x0001);
        }
        for k in 1..=blocks as usize {
            let v = read_var(&mut r, out, vars, k)?;
            if v.kind != kind {
                return Err(0x0002);
            }
        }
        if write {
            for k in 1..=blocks as usize {
                let n = r.u16()? as usize;
                out.push(
                    base + r.i,
                    format!("Data size {k}"),
                    hex(&body[r.i - 2..r.i]),
                    format!("{n} bytes"),
                );
                if n != kind.size() {
                    return Err(0x0002);
                }
                let d = r.take(n)?;
                let shown = if kind == Kind::X {
                    if d[0] & 1 != 0 {
                        "ON (1)".to_string()
                    } else {
                        "OFF (0)".to_string()
                    }
                } else {
                    let v4 = le(d, 0, n.min(4));
                    format!("{} (0x{:0w$X})", value_of(d), v4, w = n.min(4) * 2)
                };
                out.push(
                    base + r.i,
                    format!("Value {k} ({})", vars[k - 1].text),
                    hex(d),
                    shown,
                );
            }
        }
    }
    if r.i != body.len() {
        Err(0x0076)
    } else {
        Ok(())
    }
}

/// 프레임 하나 풀기. `pair` = 응답일 때 그 응답을 부른 요청(값에 변수 이름을 붙임)
pub fn decode_xgt(b: &[u8], pair: Option<&[u8]>) -> Result<XgtDecoded, String> {
    if b.len() < HEADER_LEN + 2 {
        return Err(format!(
            "Shorter than the 20-byte header + 2-byte instruction ({} bytes)",
            b.len()
        ));
    }
    let company = &b[..10];
    let company_ok = company == COMPANY_XGT || company == COMPANY_GLOFA;
    let company_text: String = company
        .iter()
        .filter(|&&c| (0x20..0x7f).contains(&c))
        .map(|&c| c as char)
        .collect();
    let plc_info = le(b, 10, 2) as u32;
    let cpu = b[12];
    let src = b[13];
    let invoke = le(b, 14, 2) as u16;
    let length = le(b, 16, 2) as usize;
    let pos = b[18];
    let sum = bcc(b);
    let body = &b[HEADER_LEN..];
    let dir = if src == 0x11 {
        Dir::Response
    } else {
        Dir::Request
    };
    let mut notes = Vec::new();
    let cpu_name = match cpu {
        0xa0 => "XGK",
        0xa4 => "XGI",
        0xa8 => "XGR",
        0xb0 => "XGB (MK)",
        0xb4 => "XGB (IEC)",
        _ => "",
    };
    let state = match (plc_info >> 8) & 0x1f {
        1 => "RUN",
        2 => "STOP",
        4 => "ERROR",
        8 => "DEBUG",
        _ => "",
    };
    let hf = |name: &str, s: usize, e: usize, raw: String, value: String| Field {
        name: name.into(),
        raw,
        value,
        start: s,
        end: e,
    };
    let mut header = vec![
        hf(
            "Company ID",
            0,
            10,
            hex(company),
            if company_ok {
                format!("«{company_text}»")
            } else {
                format!("«{company_text}» — not LSIS-XGT/LGIS-GLOFA (error h75)")
            },
        ),
        hf(
            "PLC info",
            10,
            12,
            hex(&b[10..12]),
            if dir == Dir::Request {
                "not used in requests (h00)".to_string()
            } else {
                format!(
                    "CPU TYPE {} · {} · {}",
                    plc_info & 0x3f,
                    if plc_info & 0x40 != 0 {
                        "redundant slave"
                    } else {
                        "standalone or redundant master"
                    },
                    if state.is_empty() {
                        format!("state {:X}", (plc_info >> 8) & 0x1f)
                    } else {
                        state.to_string()
                    }
                )
            },
        ),
        hf(
            "CPU info",
            12,
            13,
            format!("{cpu:02X}"),
            if cpu_name.is_empty() {
                "unknown".into()
            } else {
                cpu_name.into()
            },
        ),
        hf(
            "Source of frame",
            13,
            14,
            format!("{src:02X}"),
            match src {
                0x33 => "client → PLC (request)".to_string(),
                0x11 => "PLC → client (response)".to_string(),
                _ => format!("{src:02X} — expected h33 (request) or h11 (response)"),
            },
        ),
        hf(
            "Invoke ID",
            14,
            16,
            hex(&b[14..16]),
            format!("{invoke} (0x{invoke:04X})"),
        ),
        hf(
            "Length",
            16,
            18,
            hex(&b[16..18]),
            if length == body.len() {
                format!("{length} bytes (matches)")
            } else {
                format!("{length} — actual {} bytes (error h76)", body.len())
            },
        ),
        hf(
            "FEnet position",
            18,
            19,
            format!("{pos:02X}"),
            format!("base {} · slot {}", pos >> 4, pos & 0x0f),
        ),
    ];
    header.push(hf(
        "BCC",
        19,
        20,
        format!("{:02X}", b[19]),
        if b[19] == sum {
            "correct (sum of the first 19 bytes)".to_string()
        } else {
            format!(
                "differs — computed {sum:02X}{}",
                if dir == Dir::Request {
                    " (error h77 unless the PLC does not check it)"
                } else {
                    ""
                }
            )
        },
    ));
    let cmd = le(body, 0, 2) as u16;
    let dtype = if body.len() >= 4 {
        le(body, 2, 2) as u16
    } else {
        0
    };
    let mut bf = Body {
        fields: Vec::new(),
        cursor: HEADER_LEN,
    };
    bf.push(
        HEADER_LEN + 2,
        "Instruction".into(),
        hex(&body[..2]),
        format!("h{cmd:04X} {}", command_name(cmd, dtype)),
    );
    bf.push(
        HEADER_LEN + 4,
        "Data type".into(),
        hex(&body[2..4]),
        format!("h{dtype:04X} {}", type_name(dtype)),
    );
    bf.push(
        HEADER_LEN + 6.min(body.len()),
        "Reserved".into(),
        hex(&body[4.min(body.len())..6.min(body.len())]),
        "don't care".into(),
    );
    let mut vars: Vec<Var> = Vec::new();
    let mut items: Vec<Item> = Vec::new();
    let mut out = XgtDecoded {
        dir,
        header,
        body: vec![],
        items: vec![],
        notes: vec![],
        command: cmd,
        data_type: dtype,
        invoke,
        error: None,
        sim_error: None,
        vars: vec![],
    };
    if dir == Dir::Request {
        let mut sim = 0u32;
        if !company_ok {
            sim = 0x0075;
        } else if length != body.len() {
            sim = 0x0076;
        } else if b[19] != sum {
            sim = 0x0077;
        }
        // 몸체 풀이는 6바이트 뒤부터 이어 붙이므로 처음부터 다시 읽는다(앞 3칸은 위에서 넣었다)
        if let Err(e) = parse_request(body, HEADER_LEN, &mut bf, &mut vars)
            && sim == 0
        {
            sim = e;
        }
        out.sim_error = Some(sim);
        if src != 0x33 {
            notes.push(
                "Source of frame is not h33, so PortDock PLC Simulator does not answer it.".into(),
            );
        }
        if sim == 0x0077 {
            notes.push("If only the BCC is wrong you can test with «Check header BCC» off in the app (the manual example XBL-EMTA table 5-6 also has a BCC that differs from the header sum).".into());
        }
        notes.push("Out of range (error 4) depends on the device sizes set in the app and is not checked here.".into());
        out.body = bf.fields;
        out.notes = notes;
        out.vars = vars;
        return Ok(out);
    }
    // 응답
    let mut r = Rd { i: 0, b: body };
    let res: Result<(), u32> = (|| {
        r.take(6)?;
        let status = r.u16()?;
        bf.push(
            HEADER_LEN + r.i,
            "Error status".into(),
            hex(&body[6..8]),
            if status == 0 {
                "h0000 normal (ACK)".into()
            } else {
                format!("h{status:04X} error (NAK)")
            },
        );
        if status != 0 {
            let code = r.u16()? as u32;
            out.error = Some(code);
            bf.push(
                HEADER_LEN + r.i,
                "Error code".into(),
                hex(&body[8..10]),
                format!("h{code:04X} {}", err_text(code & 0xff)),
            );
            return Ok(());
        }
        out.error = Some(0);
        let blocks = r.u16()?;
        bf.push(
            HEADER_LEN + r.i,
            "Number of blocks".into(),
            hex(&body[8..10]),
            blocks.to_string(),
        );
        if cmd == 0x59 {
            return Ok(());
        }
        let mut pv: Vec<Var> = Vec::new();
        if let Some(p) = pair {
            match decode_xgt(p, None) {
                Ok(pd) if pd.dir == Dir::Request => pv.extend(pd.vars),
                _ => notes.push("Could not decode the matching request.".into()),
            }
        }
        if dtype == CONTINUOUS {
            let n = r.u16()? as usize;
            bf.push(
                HEADER_LEN + r.i,
                "Number of data".into(),
                hex(&body[10..12]),
                format!("{n} bytes"),
            );
            let d = r.take(n)?;
            let v = pv.first();
            for (k, x) in d.iter().enumerate() {
                items.push(Item {
                    addr: v
                        .map(|v| format!("%{}B{}", v.dev, v.index + k as u64))
                        .unwrap_or_else(|| format!("+{k}")),
                    size: 1,
                    value: x.to_string(),
                    hex: format!("{x:02X}"),
                });
            }
            if v.is_none() {
                notes.push("Add the matching request to label each byte with its variable.".into());
            }
        } else {
            for k in 0..blocks as usize {
                let n = r.u16()? as usize;
                let d = r.take(n)?;
                let v = pv.get(k);
                items.push(Item {
                    addr: v
                        .map(|v| v.text.clone())
                        .unwrap_or_else(|| format!("block {}", k + 1)),
                    size: n,
                    value: value_of(d),
                    hex: d.iter().rev().map(|x| format!("{x:02X}")).collect(),
                });
            }
            if pv.is_empty() && blocks > 0 {
                notes.push("A reply carries no variable names — add the matching request to label each block.".into());
            }
        }
        if r.i != body.len() {
            notes.push(format!("{} bytes left over at the end.", body.len() - r.i));
        }
        Ok(())
    })();
    if res.is_err() {
        notes.push("The reply body is shorter than its blocks and data sizes.".into());
    }
    out.body = bf.fields;
    out.items = items;
    out.notes = notes;
    Ok(out)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BuildOp {
    Read,
    Write,
    ReadCont,
    WriteCont,
}

/// 요청 만들기 — 머리(LSIS-XGT·방향 h33·BCC 계산) + 몸체
pub fn build_xgt_request(
    op: BuildOp,
    vars: &[&str],
    values: &[u64],
    count: usize,
    invoke: u16,
) -> Result<Vec<u8>, String> {
    let cont = matches!(op, BuildOp::ReadCont | BuildOp::WriteCont);
    let write = matches!(op, BuildOp::Write | BuildOp::WriteCont);
    let vs: Vec<&str> = vars
        .iter()
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .collect();
    if vs.is_empty() {
        return Err("Enter a variable (e.g. %MW100)".into());
    }
    if vs.len() > if cont { 1 } else { MAX_BLOCKS as usize } {
        return Err(if cont {
            "Continuous takes one variable (%MB0 style)".into()
        } else {
            "Up to 16 variables".into()
        });
    }
    let mut parsed = Vec::new();
    for t in &vs {
        parsed.push(parse_var(t).map_err(|c| format!("«{t}»: {}", err_text(c)))?);
    }
    let kind = parsed[0].kind;
    if parsed.iter().any(|v| v.kind != kind) {
        return Err("All variables must have the same type letter (X/B/W/D/L)".into());
    }
    if cont && kind != Kind::B {
        return Err("Continuous takes a byte variable (%MB0 style) only".into());
    }
    let u16b = |n: usize| [(n & 0xff) as u8, ((n >> 8) & 0xff) as u8];
    let mut body: Vec<u8> = Vec::new();
    body.extend(u16b(if write { 0x58 } else { 0x54 }));
    body.extend(u16b(if cont {
        CONTINUOUS as usize
    } else {
        kind.code() as usize
    }));
    body.extend([0, 0]);
    body.extend(u16b(parsed.len()));
    for v in &parsed {
        body.extend(u16b(v.text.len()));
        body.extend(v.text.bytes());
    }
    if cont {
        let n = if write { values.len() } else { count };
        if !(1..=MAX_BYTES as usize).contains(&n) {
            return Err("Number of data must be 1–1400 bytes".into());
        }
        body.extend(u16b(n));
        if write {
            if values.iter().any(|&x| x > 0xff) {
                return Err("Continuous write values are bytes (0–255)".into());
            }
            body.extend(values.iter().map(|&x| x as u8));
        }
    } else if write {
        if values.len() != parsed.len() {
            return Err(format!("Enter one value per variable ({})", parsed.len()));
        }
        let size = kind.size();
        for &x in values {
            if (size < 8 && x >= 1u64 << (8 * size)) || (kind == Kind::X && x > 1) {
                return Err(format!("Value {x} is out of range for {}", kind.name()));
            }
            body.extend(u16b(size));
            for k in 0..size {
                body.push(((x >> (8 * k)) & 0xff) as u8);
            }
        }
    }
    let mut head: Vec<u8> = COMPANY_XGT.to_vec();
    head.extend([0, 0, 0xa0, 0x33]);
    head.extend(invoke.to_le_bytes());
    head.extend(u16b(body.len()));
    head.push(0);
    let c = bcc(&{
        let mut t = head.clone();
        t.push(0);
        t
    });
    head.push(c);
    head.extend(body);
    Ok(head)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(invoke: u16, body: &[u8]) -> Vec<u8> {
        crate::fixture::xgt_req(invoke, body)
    }
    fn s(t: &str) -> Vec<u8> {
        t.bytes().collect()
    }
    fn cat(parts: &[&[u8]]) -> Vec<u8> {
        parts.concat()
    }
    const XGT: [u8; 10] = [0x4c, 0x53, 0x49, 0x53, 0x2d, 0x58, 0x47, 0x54, 0x00, 0x00];

    // XBL-EMTA 표 5-8·5-9 — BCC 와 연속 읽기
    #[test]
    fn xbl_emta_continuous_read() {
        let f = cat(&[
            &XGT,
            &[
                0x00, 0x00, 0xa0, 0x33, 0x00, 0x01, 0x10, 0x00, 0x00, 0x3f, 0x54, 0x00, 0x14, 0x00,
                0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4d, 0x42, 0x30, 0x02, 0x00,
            ],
        ]);
        assert_eq!(bcc(&f), 0x3f);
        let q = decode_xgt(&f, None).unwrap();
        assert_eq!(
            (q.dir, q.command, q.data_type, q.sim_error),
            (Dir::Request, 0x54, 0x14, Some(0))
        );
        assert_eq!(q.vars[0].text, "%MB0");
        let resp = cat(&[
            &XGT,
            &[
                0x02, 0x08, 0xa0, 0x11, 0x00, 0x01, 0x0e, 0x00, 0x01, 0x26, 0x55, 0x00, 0x14, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x12,
            ],
        ]);
        assert_eq!(bcc(&resp), 0x26);
        let r = decode_xgt(&resp, Some(&f)).unwrap();
        assert_eq!(r.error, Some(0));
        assert_eq!(
            r.items
                .iter()
                .map(|i| (i.addr.clone(), i.value.clone()))
                .collect::<Vec<_>>(),
            vec![
                ("%MB0".to_string(), "52".to_string()),
                ("%MB1".to_string(), "18".to_string())
            ]
        );
    }

    // XBL-EMTA 표 5-6 — 원문 BCC 0x4E 는 머리 합 0x3C 와 다름 → h77
    #[test]
    fn xbl_emta_bcc_mismatch() {
        let f = cat(&[
            &XGT,
            &[
                0x00, 0x00, 0xa0, 0x33, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x4e, 0x54, 0x00, 0x02, 0x00,
                0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4d, 0x57, 0x30,
            ],
        ]);
        assert_eq!(bcc(&f), 0x3c);
        assert_eq!(decode_xgt(&f, None).unwrap().sim_error, Some(0x77));
    }

    // V2.30 8.2.1·8.2.3 — 개별 읽기·쓰기 %MW100 h1234
    #[test]
    fn individual_read_write() {
        let w = req(
            1,
            &cat(&[
                &[0x58, 0, 2, 0, 0, 0, 1, 0, 6, 0],
                &s("%MW100"),
                &[2, 0, 0x34, 0x12],
            ]),
        );
        assert_eq!(decode_xgt(&w, None).unwrap().sim_error, Some(0));
        assert_eq!(
            build_xgt_request(BuildOp::Write, &["%MW100"], &[0x1234], 0, 1).unwrap(),
            w
        );
        let rq = req(2, &cat(&[&[0x54, 0, 2, 0, 0, 0, 1, 0, 6, 0], &s("%MW100")]));
        assert_eq!(
            build_xgt_request(BuildOp::Read, &["%MW100"], &[], 0, 2).unwrap(),
            rq
        );
        let mut head = cat(&[&XGT, &[0, 1, 0xa0, 0x11, 2, 0, 14, 0, 0]]);
        head.push(bcc(&{
            let mut t = head.clone();
            t.push(0);
            t
        }));
        let resp = cat(&[&head, &[0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]]);
        let r = decode_xgt(&resp, Some(&rq)).unwrap();
        assert_eq!(
            r.items
                .iter()
                .map(|i| (i.addr.clone(), i.value.clone(), i.hex.clone()))
                .collect::<Vec<_>>(),
            vec![("%MW100".to_string(), "4660".to_string(), "1234".to_string())]
        );
        // 연속 쓰기 %MB100 ← 34 12
        assert_eq!(
            build_xgt_request(BuildOp::WriteCont, &["%MB100"], &[0x34, 0x12], 0, 3).unwrap(),
            req(
                3,
                &cat(&[
                    &[0x58, 0, 0x14, 0, 0, 0, 1, 0, 6, 0],
                    &s("%MB100"),
                    &[2, 0, 0x34, 0x12]
                ])
            )
        );
    }

    #[test]
    fn error_codes() {
        let code = |body: &[u8]| decode_xgt(&req(1, body), None).unwrap().sim_error.unwrap();
        assert_eq!(code(&[0x54, 0, 2, 0, 0, 0, 17, 0]), 0x01);
        assert_eq!(
            code(&cat(&[&[0x54, 0, 5, 0, 0, 0, 1, 0, 4, 0], &s("%MW0")])),
            0x02
        );
        assert_eq!(
            code(&cat(&[&[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0], &s("%MB0")])),
            0x02
        );
        assert_eq!(
            code(&cat(&[&[0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0], &s("%ZW0")])),
            0x03
        );
        assert_eq!(
            code(&cat(&[
                &[0x54, 0, 0x14, 0, 0, 0, 1, 0, 4, 0],
                &s("%MB0"),
                &[0x79, 0x05]
            ])),
            0x05
        );
        assert_eq!(code(&[0xb0, 0, 0, 0, 0, 0]), 0x78);
        assert_eq!(
            code(&cat(&[&[0x54, 0, 1, 0, 0, 0, 2, 0, 7, 0], &s("%DB2468")])),
            0x76
        );
        let mut head = cat(&[&XGT, &[0, 1, 0xa0, 0x11, 1, 0, 10, 0, 0]]);
        head.push(bcc(&{
            let mut t = head.clone();
            t.push(0);
            t
        }));
        let nak = decode_xgt(
            &cat(&[&head, &[0x55, 0, 2, 0, 0, 0, 0xff, 0xff, 4, 0]]),
            None,
        )
        .unwrap();
        assert_eq!(nak.error, Some(4));
        assert!(
            nak.body
                .last()
                .unwrap()
                .value
                .contains("Device area exceeded")
        );
    }

    // 변수 이름 — 비트는 워드×16+비트(%MX2764 = %MW172 bit C)
    #[test]
    fn variable_names() {
        let v = parse_var("%MX2764").unwrap();
        assert_eq!(v.index, 2764);
        assert_eq!(var_words(&v), "%MW172 bit C");
        assert_eq!(parse_var("%MW10.1"), Err(3));
        assert_eq!(parse_var("MW10"), Err(3));
        assert_eq!(parse_var("%MQ10"), Err(2));
        assert!(build_xgt_request(BuildOp::Read, &["%MW0", "%MB0"], &[], 0, 0).is_err());
        assert!(build_xgt_request(BuildOp::ReadCont, &["%MW0"], &[], 2, 0).is_err());
    }
}
