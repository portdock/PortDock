//! MC 프로토콜(SLMP) 3E/4E 이진·ASCII 프레임 풀이 — `site/src/lib/mcDecode.ts` 를 옮긴 것(같은 규칙·같은 종료 코드 판단).
//! 근거(공개 매뉴얼): SLMP Reference Manual SH(NA)-080956ENG 4장·5.2·5.9, MELSEC Communication Protocol Reference Manual SH-080008 5장,
//! 종료 코드 MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG 3.5. 0.6.0 명령(블록·모니터·원격·형명)은 SLMP 5.2·5.6.

use super::{CodeInfo, hex};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum McMode {
    Auto,
    Binary,
    Ascii,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum McFrame {
    E3,
    E4,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum McCode {
    Binary,
    Ascii,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Dir {
    Request,
    Response,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Field {
    pub name: String,
    /// 원래 바이트(이진은 HEX, ASCII 는 글자 그대로)
    pub raw: String,
    pub value: String,
    /// 프레임 안의 바이트 범위(앞 항목 끝 ~ 이 항목 끝 — 읽은 순서대로 이어 붙인 근사)
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemKind {
    Bit,
    Word,
    BitWord,
    DWord,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Item {
    pub addr: String,
    pub kind: ItemKind,
    pub value: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DevInfo {
    pub name: &'static str,
    pub code: u8,
    pub bits: bool,
    /// 번호를 16진으로 쓰는지
    pub hex: bool,
    pub en: &'static str,
    pub ko: &'static str,
}

/// 디바이스 코드 표 — 18종(SLMP 5.2)
pub const MC_DEVICES: [DevInfo; 18] = [
    DevInfo {
        name: "X",
        code: 0x9c,
        bits: true,
        hex: true,
        en: "Input",
        ko: "입력",
    },
    DevInfo {
        name: "Y",
        code: 0x9d,
        bits: true,
        hex: true,
        en: "Output",
        ko: "출력",
    },
    DevInfo {
        name: "M",
        code: 0x90,
        bits: true,
        hex: false,
        en: "Internal relay",
        ko: "내부 릴레이",
    },
    DevInfo {
        name: "L",
        code: 0x92,
        bits: true,
        hex: false,
        en: "Latch relay",
        ko: "래치 릴레이",
    },
    DevInfo {
        name: "F",
        code: 0x93,
        bits: true,
        hex: false,
        en: "Annunciator",
        ko: "어넌시에이터",
    },
    DevInfo {
        name: "B",
        code: 0xa0,
        bits: true,
        hex: true,
        en: "Link relay",
        ko: "링크 릴레이",
    },
    DevInfo {
        name: "SM",
        code: 0x91,
        bits: true,
        hex: false,
        en: "Special relay",
        ko: "특수 릴레이",
    },
    DevInfo {
        name: "D",
        code: 0xa8,
        bits: false,
        hex: false,
        en: "Data register",
        ko: "데이터 레지스터",
    },
    DevInfo {
        name: "W",
        code: 0xb4,
        bits: false,
        hex: true,
        en: "Link register",
        ko: "링크 레지스터",
    },
    DevInfo {
        name: "R",
        code: 0xaf,
        bits: false,
        hex: false,
        en: "File register",
        ko: "파일 레지스터",
    },
    DevInfo {
        name: "ZR",
        code: 0xb0,
        bits: false,
        hex: true,
        en: "File register (serial numbers)",
        ko: "파일 레지스터(연번)",
    },
    DevInfo {
        name: "SD",
        code: 0xa9,
        bits: false,
        hex: false,
        en: "Special register",
        ko: "특수 레지스터",
    },
    DevInfo {
        name: "TS",
        code: 0xc1,
        bits: true,
        hex: false,
        en: "Timer contact",
        ko: "타이머 접점",
    },
    DevInfo {
        name: "TC",
        code: 0xc0,
        bits: true,
        hex: false,
        en: "Timer coil",
        ko: "타이머 코일",
    },
    DevInfo {
        name: "TN",
        code: 0xc2,
        bits: false,
        hex: false,
        en: "Timer current value",
        ko: "타이머 현재값",
    },
    DevInfo {
        name: "CS",
        code: 0xc4,
        bits: true,
        hex: false,
        en: "Counter contact",
        ko: "카운터 접점",
    },
    DevInfo {
        name: "CC",
        code: 0xc3,
        bits: true,
        hex: false,
        en: "Counter coil",
        ko: "카운터 코일",
    },
    DevInfo {
        name: "CN",
        code: 0xc5,
        bits: false,
        hex: false,
        en: "Counter current value",
        ko: "카운터 현재값",
    },
];

pub fn dev_by_name(name: &str) -> Option<&'static DevInfo> {
    MC_DEVICES
        .iter()
        .find(|d| d.name.eq_ignore_ascii_case(name))
}

/// 종료 코드 표 — 원인과 점검 순서를 사람 말로. 이 표의 코드는 PortDock PLC Simulator 가 쓰는 것(SLMP·iQ-R 매뉴얼의 같은 코드)이다.
/// 표에 없는 코드는 «이 표에 설명이 없다 — 해당 기기 매뉴얼의 오류 코드 표를 보라» 로 보인다(짐작해서 적지 않는다).
pub const END_CODES: &[CodeInfo] = &[
    CodeInfo {
        code: 0xc050,
        name_en: "ASCII conversion error",
        name_ko: "ASCII 변환 불가",
        cause_en: "A non-hex character in an ASCII-code frame, or A-F in a decimal device number.",
        cause_ko: "ASCII 코드 프레임에 16진이 아닌 글자가 있거나, 10진 디바이스 번호에 A~F 가 들어 있습니다.",
        check_en: "1) Dump the request as text and look for non-hex characters. 2) Check that the number field matches the device (X·Y·B·W are hex, M·D·R are decimal). 3) Confirm the PLC's communication code is set to ASCII.",
        check_ko: "1) 보낸 요청을 글자로 찍어 16진이 아닌 글자를 찾는다. 2) 디바이스 번호 칸이 종류에 맞는지 본다(X·Y·B·W 는 16진, M·D·R 은 10진). 3) PLC 의 통신 데이터 코드 설정이 ASCII 인지 확인한다.",
    },
    CodeInfo {
        code: 0xc051,
        name_en: "points out of range (words)",
        name_ko: "점 수 범위 밖(워드)",
        cause_en: "The word point count of a batch read/write is 0 or above 960 (block commands: block or total point limits).",
        cause_ko: "일괄 읽기·쓰기의 워드 점 수가 0 이거나 960 을 넘습니다(블록 명령은 블록 수·합계 한도).",
        check_en: "1) Read the 'number of device points' field. 2) Split the request into chunks of 960 words or fewer.",
        check_ko: "1) 요청의 «디바이스 점 수» 칸을 본다. 2) 960 워드 이하로 나눠 보낸다.",
    },
    CodeInfo {
        code: 0xc052,
        name_en: "points out of range (bits)",
        name_ko: "점 수 범위 밖(비트)",
        cause_en: "The bit point count of a batch read/write is 0 or above the limit (7168 binary / 3584 ASCII).",
        cause_ko: "일괄 읽기·쓰기의 비트 점 수가 0 이거나 한도(이진 7168·ASCII 3584)를 넘습니다.",
        check_en: "1) Read the 'number of device points' field. 2) Split the request below the limit.",
        check_ko: "1) 요청의 «디바이스 점 수» 칸을 본다. 2) 한도 아래로 나눠 보낸다.",
    },
    CodeInfo {
        code: 0xc053,
        name_en: "random points out of range (bits)",
        name_ko: "랜덤 점 수 범위 밖(비트)",
        cause_en: "Random write bit points are 0 or above 188 (94 for subcommand 0003).",
        cause_ko: "랜덤 쓰기의 비트 점 수가 0 이거나 188(서브 0003 은 94)을 넘습니다.",
        check_en: "Reduce the number of bit points in the random write.",
        check_ko: "랜덤 쓰기의 비트 점 수를 줄인다.",
    },
    CodeInfo {
        code: 0xc054,
        name_en: "random points out of range (words)",
        name_ko: "랜덤 점 수 범위 밖(워드)",
        cause_en: "Random read/write word or double-word points are 0 or above the limit.",
        cause_ko: "랜덤 읽기·쓰기의 워드·더블워드 점 수가 0 이거나 한도를 넘습니다.",
        check_en: "Reduce the number of word/double-word points.",
        check_ko: "워드·더블워드 점 수를 줄인다.",
    },
    CodeInfo {
        code: 0xc056,
        name_en: "address out of range",
        name_ko: "주소 범위 밖",
        cause_en: "The device number is beyond the device size (points) configured in the PLC.",
        cause_ko: "디바이스 번호가 PLC 에 설정된 디바이스 크기(점 수)를 넘습니다.",
        check_en: "1) Check the head device number and count in the request. 2) Compare with the PLC's device point settings.",
        check_ko: "1) 요청의 시작 번호와 점 수를 본다. 2) PLC 의 디바이스 점 수 설정과 비교한다.",
    },
    CodeInfo {
        code: 0xc057,
        name_en: "request length mismatch",
        name_ko: "요청 길이 불일치",
        cause_en: "The request data length in the header differs from what actually follows.",
        cause_ko: "머리의 요청 데이터 길이가 실제로 뒤따르는 길이와 다릅니다.",
        check_en: "1) Compare the length field with the real frame length (a cut or joined frame?). 2) Recompute the length from the monitoring timer onward.",
        check_ko: "1) 길이 칸과 실제 프레임 길이를 비교한다(잘렸거나 두 프레임이 붙지 않았는지). 2) 길이를 감시 타이머부터 끝까지로 다시 계산한다.",
    },
    CodeInfo {
        code: 0xc059,
        name_en: "wrong command/subcommand",
        name_ko: "명령·서브 명령 틀림",
        cause_en: "A command or subcommand the target does not implement.",
        cause_ko: "상대가 구현하지 않은 명령 또는 서브 명령입니다.",
        check_en: "1) Check the command and subcommand fields in the request. 2) Check the target model's SLMP/MC command support (e.g. iQ-R vs Q/L subcommands 0002/0003).",
        check_ko: "1) 요청의 명령·서브명령 칸을 본다. 2) 상대 기종이 지원하는 SLMP/MC 명령인지 매뉴얼로 확인한다(iQ-R 과 Q/L 의 서브명령 0002·0003 차이 등).",
    },
    CodeInfo {
        code: 0xc05b,
        name_en: "device cannot be accessed",
        name_ko: "디바이스 지정 틀림",
        cause_en: "An unknown device code, or a word device accessed in bit units.",
        cause_ko: "모르는 디바이스 코드이거나, 워드 디바이스를 비트 단위로 접근했습니다.",
        check_en: "1) Check the device code field. 2) For bit units use a bit device (M·X·Y·B …), for words use D·W·R …",
        check_ko: "1) 디바이스 코드 칸을 본다. 2) 비트 단위는 비트 디바이스(M·X·Y·B …), 워드 단위는 D·W·R … 를 쓴다.",
    },
    CodeInfo {
        code: 0xc05c,
        name_en: "request data error",
        name_ko: "요청 데이터 틀림",
        cause_en: "Loopback data count outside 1-960, or a wrong mode value in a remote operation.",
        cause_ko: "루프백 데이터 수가 1~960 밖이거나, 원격 조작의 모드 값이 틀립니다.",
        check_en: "Check the data count / mode fields of the request.",
        check_ko: "요청의 데이터 수·모드 칸을 본다.",
    },
    CodeInfo {
        code: 0xc05d,
        name_en: "monitor not registered",
        name_ko: "모니터 등록 전 실행",
        cause_en: "Execute Monitor (0802) was sent before Entry Monitor Device (0801).",
        cause_ko: "모니터 등록(0801) 전에 모니터 실행(0802)을 보냈습니다.",
        check_en: "Send 0801 first, then 0802 on the same connection.",
        check_ko: "0801 을 먼저 보내고 같은 연결에서 0802 를 보낸다.",
    },
    CodeInfo {
        code: 0xc05f,
        name_en: "wrong access destination",
        name_ko: "접근 대상 틀림",
        cause_en: "A request for another station (only the own station is accepted).",
        cause_ko: "다른 국에 대한 요청입니다(자기 국 요청만 받는 설정).",
        check_en: "Check network No., PC No., I/O No. and station No. in the header (own station = 00 FF 03FF 00).",
        check_ko: "머리의 네트워크 번호·PC 번호·I/O 번호·국번을 본다(자기 국 = 00 FF 03FF 00).",
    },
    CodeInfo {
        code: 0xc060,
        name_en: "bit request error",
        name_ko: "비트 값 틀림",
        cause_en: "A bit write value other than 0 or 1.",
        cause_ko: "비트 쓰기 값이 0·1 이 아닙니다.",
        check_en: "Check the write data bytes (one point = 4 bits in binary, one character in ASCII).",
        check_ko: "쓰기 데이터를 본다(이진은 한 점 = 4비트, ASCII 는 한 글자).",
    },
    CodeInfo {
        code: 0xc061,
        name_en: "data length mismatch",
        name_ko: "데이터 길이 불일치",
        cause_en: "The command data is shorter or longer than the point count requires.",
        cause_ko: "명령 데이터가 점 수가 요구하는 길이보다 짧거나 깁니다.",
        check_en: "Compare the point count with the number of data bytes.",
        check_ko: "점 수와 데이터 바이트 수를 비교한다.",
    },
];

pub fn end_info(code: u32) -> Option<&'static CodeInfo> {
    END_CODES.iter().find(|c| c.code == code)
}

pub fn end_text(code: u32) -> String {
    if code == 0 {
        "completed".into()
    } else if let Some(i) = end_info(code) {
        i.name_en.into()
    } else {
        "not described here — look it up in the manual's error code table".into()
    }
}

#[derive(Clone, Debug)]
pub enum McRequest {
    Read {
        bit: bool,
        dev: DevInfo,
        start: u64,
        n: u64,
    },
    Write,
    RandomRead {
        words: Vec<(DevInfo, u64)>,
        dwords: Vec<(DevInfo, u64)>,
    },
    RandomWriteBits,
    RandomWriteWords,
    Loopback,
    ReadBlock {
        blocks: Vec<(DevInfo, u64, u64)>,
    },
    WriteBlock,
    MonitorEntry {
        words: Vec<(DevInfo, u64)>,
        dwords: Vec<(DevInfo, u64)>,
    },
    MonitorRun,
    Remote,
    TypeName,
}

#[derive(Clone, Debug)]
pub struct McDecoded {
    pub frame: McFrame,
    pub code: McCode,
    pub dir: Dir,
    pub why: String,
    pub serial: Option<u32>,
    pub network: u64,
    pub pc: u64,
    pub io: u64,
    pub drop: u64,
    pub header: Vec<Field>,
    /// 요청: 명령·서브명령, 응답: 오류 정보의 명령(있으면)
    pub command: Option<u32>,
    pub sub: Option<u32>,
    pub command_name: Option<String>,
    pub end_code: Option<u32>,
    pub body: Vec<Field>,
    pub items: Vec<Item>,
    pub items_caption: Option<String>,
    /// 요청을 끝까지 읽었을 때의 모양(응답 짝 맞추기용)
    pub req: Option<McRequest>,
    /// 요청이면 PortDock PLC Simulator 가 답할 종료 코드(0 = 완료). 디바이스 크기(C056)·자기 국 설정은 따지지 않는다
    pub sim_end: Option<u32>,
    pub notes: Vec<String>,
}

struct McErr {
    code: u32,
    detail: String,
}
fn err(code: u32, detail: &str) -> McErr {
    McErr {
        code,
        detail: detail.into(),
    }
}

fn h(n: u64, w: usize) -> String {
    format!("{n:0w$X}")
}
fn text(u: &[u8]) -> String {
    u.iter().map(|&c| c as char).collect()
}

pub fn addr_text(d: &DevInfo, n: u64) -> String {
    if d.hex {
        format!("{}{:X}", d.name, n)
    } else {
        format!("{}{}", d.name, n)
    }
}
fn range_text(d: &DevInfo, a: u64, b: u64) -> String {
    if a == b {
        addr_text(d, a)
    } else {
        format!("{}–{}", addr_text(d, a), addr_text(d, b))
    }
}

/// 명령 이름
pub fn command_name(cmd: u32, sub: u32) -> String {
    let unit = if sub == 1 || sub == 3 {
        "bits"
    } else {
        "words"
    };
    match cmd {
        0x0401 => format!("Read ({unit})"),
        0x1401 => format!("Write ({unit})"),
        0x0403 => "Read Random".into(),
        0x1402 => format!("Write Random ({unit})"),
        0x0619 => "Loopback".into(),
        0x0406 => "Read Block".into(),
        0x1406 => "Write Block".into(),
        0x0801 => "Entry Monitor Device".into(),
        0x0802 => "Execute Monitor".into(),
        0x1001 => "Remote Run".into(),
        0x1002 => "Remote Stop".into(),
        0x1003 => "Remote Pause".into(),
        0x1005 => "Remote Latch Clear".into(),
        0x1006 => "Remote Reset".into(),
        0x0101 => "Read Type Name".into(),
        _ => "unknown command".into(),
    }
}

fn sub_name(cmd: u32, sub: u32) -> String {
    let wide = " · 4-byte device number, 2-byte code (ASCII: 4-char code, 8-digit number)";
    if [
        0x0619, 0x0802, 0x1001, 0x1002, 0x1003, 0x1005, 0x1006, 0x0101,
    ]
    .contains(&cmd)
    {
        return if sub == 0 { "—".into() } else { "?".into() };
    }
    if [0x0403, 0x0801, 0x0406, 0x1406].contains(&cmd) {
        return match sub {
            0 => "standard".into(),
            2 => format!("wide{wide}"),
            _ => "?".into(),
        };
    }
    match sub {
        0 => "word units".into(),
        1 => "bit units (1 point each)".into(),
        2 => format!("word units{wide}"),
        3 => format!("bit units{wide}"),
        _ => "?".into(),
    }
}

// ---------------------------------------------------------------- 읽기(이진: 작은 자리 바이트 먼저 / ASCII: 16진 글자 큰 자리 먼저)

struct Rd<'a> {
    i: usize,
    u: &'a [u8],
    ascii: bool,
}

struct Num {
    v: u64,
    raw: String,
}

struct DevRead {
    dev: DevInfo,
    no: u64,
    raw: String,
}

impl<'a> Rd<'a> {
    fn left(&self) -> usize {
        self.u.len() - self.i
    }
    fn take(&mut self, n: usize) -> Result<&'a [u8], McErr> {
        if self.i + n > self.u.len() {
            return Err(err(0xc061, "short"));
        }
        let s = &self.u[self.i..self.i + n];
        self.i += n;
        Ok(s)
    }
    fn raw(&self, s: &[u8]) -> String {
        if self.ascii { text(s) } else { hex(s) }
    }
    /// 이진 n 바이트 또는 ASCII 2n 글자
    fn num(&mut self, n: usize) -> Result<Num, McErr> {
        if self.ascii {
            let s = self.take(n * 2)?;
            let t = text(s);
            if t.is_empty() || !t.chars().all(|c| c.is_ascii_hexdigit()) {
                return Err(err(0xc050, &t));
            }
            return Ok(Num {
                v: u64::from_str_radix(&t, 16).unwrap_or(0),
                raw: t,
            });
        }
        let s = self.take(n)?;
        Ok(Num {
            v: s.iter().rev().fold(0u64, |a, &b| a * 256 + b as u64),
            raw: hex(s),
        })
    }
    fn device(&mut self, wide: bool) -> Result<DevRead, McErr> {
        if self.ascii {
            let code = self.take(if wide { 4 } else { 2 })?;
            let c = text(code);
            if c.is_empty()
                || !c
                    .chars()
                    .all(|x| x.is_ascii_alphanumeric() || x == '*' || x == ' ')
            {
                return Err(err(0xc050, &c));
            }
            let end = c.find(['*', ' ']).unwrap_or(c.len());
            let name = &c[..end];
            let dev = if end > 0 && c[end..].chars().all(|x| x == '*' || x == ' ') {
                dev_by_name(name)
            } else {
                None
            };
            let Some(dev) = dev else {
                return Err(err(0xc05b, &c));
            };
            let digits = text(self.take(if wide { 8 } else { 6 })?);
            let t = digits.trim_start_matches(' ');
            let okdig = if dev.hex {
                t.chars().all(|x| x.is_ascii_hexdigit())
            } else {
                t.chars().all(|x| x.is_ascii_digit())
            };
            if !okdig {
                return Err(err(0xc050, &format!("{c}{digits}")));
            }
            let no = if t.is_empty() {
                0
            } else {
                u64::from_str_radix(t, if dev.hex { 16 } else { 10 }).unwrap_or(0)
            };
            return Ok(DevRead {
                dev: *dev,
                no,
                raw: format!("{c}{digits}"),
            });
        }
        let at = self.i;
        let no = self.num(if wide { 4 } else { 3 })?.v;
        let code = self.num(if wide { 2 } else { 1 })?.v;
        let raw = hex(&self.u[at..self.i]);
        match MC_DEVICES.iter().find(|d| d.code as u64 == code) {
            Some(d) => Ok(DevRead { dev: *d, no, raw }),
            None => Err(err(0xc05b, &raw)),
        }
    }
    fn end(&self) -> Result<(), McErr> {
        if self.left() != 0 {
            Err(err(0xc061, "long"))
        } else {
            Ok(())
        }
    }
}

fn dev_value(d: &DevInfo, no: u64) -> String {
    let base = format!(
        "{} — {} {} (code {:02X}",
        addr_text(d, no),
        d.name,
        d.en,
        d.code
    );
    if d.hex {
        format!("{base}, hex number = {no} decimal)")
    } else {
        format!("{base})")
    }
}

/// 서브 명령 → (비트 단위, 넓은 지정). 모르면 C059
fn sub_kind(sub: u32) -> Result<(bool, bool), McErr> {
    match sub {
        0 => Ok((false, false)),
        1 => Ok((true, false)),
        2 => Ok((false, true)),
        3 => Ok((true, true)),
        _ => Err(err(0xc059, "")),
    }
}

struct Out {
    d: McDecoded,
    cursor: usize,
    /// true 면 머리, false 면 몸체에 필드를 쌓는다
    in_header: bool,
}

impl Out {
    fn f(&mut self, r_i: usize, name: &str, raw: String, value: String) {
        let fl = Field {
            name: name.into(),
            raw,
            value,
            start: self.cursor,
            end: r_i,
        };
        self.cursor = r_i;
        if self.in_header {
            self.d.header.push(fl)
        } else {
            self.d.body.push(fl)
        }
    }
    fn body(&mut self, r_i: usize, name: &str, raw: String, value: String) {
        let fl = Field {
            name: name.into(),
            raw,
            value,
            start: self.cursor,
            end: r_i,
        };
        self.cursor = r_i;
        self.d.body.push(fl);
    }
}

fn push_word_item(out: &mut McDecoded, d: &DevInfo, no: u64, v: u64) {
    out.items.push(if d.bits {
        Item {
            addr: range_text(d, no, no + 15),
            kind: ItemKind::BitWord,
            value: v,
        }
    } else {
        Item {
            addr: addr_text(d, no),
            kind: ItemKind::Word,
            value: v,
        }
    });
}

/// 명령 데이터 — mc.rs parse 와 같은 순서로 읽고 같은 종료 코드를 낸다. 읽은 칸은 out 에 남는다
fn parse_request_body(cmd: u32, sub: u32, r: &mut Rd, o: &mut Out) -> Result<(), McErr> {
    if cmd == 0x0401 || cmd == 0x1401 {
        let (bit, wide) = sub_kind(sub)?;
        let d = r.device(wide)?;
        o.body(r.i, "Head device", d.raw.clone(), dev_value(&d.dev, d.no));
        let n = r.num(2)?;
        let unit = if bit {
            "points (bits)".to_string()
        } else if d.dev.bits {
            format!("words (= {} points)", n.v * 16)
        } else {
            "words".to_string()
        };
        o.body(
            r.i,
            "Number of device points",
            n.raw.clone(),
            format!("{} {unit}", n.v),
        );
        if bit && !d.dev.bits {
            return Err(err(0xc05b, "word-as-bit"));
        }
        let max = if !bit {
            960
        } else if r.ascii {
            3584
        } else {
            7168
        };
        if n.v == 0 || n.v > max {
            return Err(err(if bit { 0xc052 } else { 0xc051 }, ""));
        }
        let last =
            d.no + if bit {
                n.v
            } else if d.dev.bits {
                n.v * 16
            } else {
                n.v
            } - 1;
        o.d.req = Some(if cmd == 0x0401 {
            McRequest::Read {
                bit,
                dev: d.dev,
                start: d.no,
                n: n.v,
            }
        } else {
            McRequest::Write
        });
        if cmd == 0x0401 {
            o.body(
                r.i,
                "Range read",
                String::new(),
                range_text(&d.dev, d.no, last),
            );
            r.end()?;
            return Ok(());
        }
        o.d.items_caption = Some("Values to write".into());
        if bit {
            let mut vals = Vec::new();
            let raw: &[u8];
            if r.ascii {
                raw = r.take(n.v as usize)?;
                for &c in raw {
                    if c != b'0' && c != b'1' {
                        return Err(err(0xc060, ""));
                    }
                    vals.push((c - b'0') as u64);
                }
            } else {
                // 한 점 = 4비트, 앞 점이 위 4비트
                raw = r.take((n.v as usize).div_ceil(2))?;
                for i in 0..n.v as usize {
                    let nib = if i % 2 == 0 {
                        raw[i >> 1] >> 4
                    } else {
                        raw[i >> 1] & 0x0f
                    };
                    if nib > 1 {
                        return Err(err(0xc060, ""));
                    }
                    vals.push(nib as u64);
                }
            }
            let rw = r.raw(raw);
            o.body(
                r.i,
                "Write data",
                rw,
                if r.ascii {
                    "1 point = 1 character (0/1)".into()
                } else {
                    "1 point = 4 bits, earlier point in the upper 4 bits".into()
                },
            );
            for (i, v) in vals.into_iter().enumerate() {
                o.d.items.push(Item {
                    addr: addr_text(&d.dev, d.no + i as u64),
                    kind: ItemKind::Bit,
                    value: v,
                });
            }
        } else {
            let at = r.i;
            for k in 0..n.v {
                let w = r.num(2)?.v;
                if d.dev.bits {
                    o.d.items.push(Item {
                        addr: range_text(&d.dev, d.no + k * 16, d.no + k * 16 + 15),
                        kind: ItemKind::BitWord,
                        value: w,
                    });
                } else {
                    o.d.items.push(Item {
                        addr: addr_text(&d.dev, d.no + k),
                        kind: ItemKind::Word,
                        value: w,
                    });
                }
            }
            let rw = r.raw(&r.u[at..r.i]);
            o.body(r.i, "Write data", rw, format!("{} words", n.v));
        }
        r.end()?;
        return Ok(());
    }
    if cmd == 0x0403 || cmd == 0x0801 {
        if sub != 0 && sub != 2 {
            return Err(err(0xc059, ""));
        }
        let wide = sub == 2;
        let nw = r.num(1)?;
        o.body(r.i, "Word access points", nw.raw.clone(), nw.v.to_string());
        let nd = r.num(1)?;
        o.body(
            r.i,
            "Double-word access points",
            nd.raw.clone(),
            nd.v.to_string(),
        );
        if nw.v + nd.v == 0 || nw.v + nd.v > if wide { 96 } else { 192 } {
            return Err(err(0xc054, ""));
        }
        let mut words = Vec::new();
        let mut dwords = Vec::new();
        for k in 0..nw.v {
            let d = r.device(wide)?;
            words.push((d.dev, d.no));
            let extra = if d.dev.bits {
                format!(" · {}", range_text(&d.dev, d.no, d.no + 15))
            } else {
                String::new()
            };
            o.body(
                r.i,
                &format!("Word {}", k + 1),
                d.raw.clone(),
                dev_value(&d.dev, d.no) + &extra,
            );
        }
        for k in 0..nd.v {
            let d = r.device(wide)?;
            dwords.push((d.dev, d.no));
            let span = if d.dev.bits { 32 } else { 2 };
            o.body(
                r.i,
                &format!("Double word {}", k + 1),
                d.raw.clone(),
                format!(
                    "{} · {}",
                    dev_value(&d.dev, d.no),
                    range_text(&d.dev, d.no, d.no + span - 1)
                ),
            );
        }
        r.end()?;
        if cmd == 0x0801 {
            if words
                .iter()
                .chain(dwords.iter())
                .any(|(d, _)| ["TS", "TC", "CS", "CC"].contains(&d.name))
            {
                return Err(err(0xc05b, "monitor"));
            }
            o.d.req = Some(McRequest::MonitorEntry { words, dwords });
            o.d.notes.push("Registers only; no response data — the values come in the 0802 (Execute Monitor) reply in the shape of 0403".into());
            return Ok(());
        }
        o.d.req = Some(McRequest::RandomRead { words, dwords });
        return Ok(());
    }
    if cmd == 0x0802 {
        if sub != 0 {
            return Err(err(0xc059, ""));
        }
        r.end()?;
        o.d.req = Some(McRequest::MonitorRun);
        o.d.notes
            .push("Answered with C05D unless 0801 (Entry Monitor Device) was sent first".into());
        return Ok(());
    }
    if cmd == 0x0406 || cmd == 0x1406 {
        if sub != 0 && sub != 2 {
            return Err(err(0xc059, ""));
        }
        let wide = sub == 2;
        let write = cmd == 0x1406;
        let nw = r.num(1)?;
        o.body(r.i, "Word device blocks", nw.raw.clone(), nw.v.to_string());
        let nb = r.num(1)?;
        o.body(r.i, "Bit device blocks", nb.raw.clone(), nb.v.to_string());
        if nw.v + nb.v == 0 || nw.v + nb.v > if wide { 60 } else { 120 } {
            return Err(err(0xc051, ""));
        }
        let mut blocks = Vec::new();
        let mut total = 0u64;
        if write {
            o.d.items_caption = Some("Values to write".into());
        }
        for k in 0..nw.v + nb.v {
            let bit_block = k >= nw.v;
            let d = r.device(wide)?;
            let n = r.num(2)?;
            let label = format!(
                "{} {}",
                if bit_block { "Bit block" } else { "Word block" },
                (if bit_block { k - nw.v } else { k }) + 1
            );
            let span = if bit_block { n.v * 16 } else { n.v };
            let rng = if n.v > 0 {
                format!(" · {}", range_text(&d.dev, d.no, d.no + span - 1))
            } else {
                String::new()
            };
            o.body(
                r.i,
                &label,
                format!("{} {}", d.raw, n.raw),
                format!("{} · {} points{rng}", dev_value(&d.dev, d.no), n.v),
            );
            if d.dev.bits != bit_block {
                return Err(err(0xc05b, "block"));
            }
            if n.v == 0 {
                return Err(err(0xc051, ""));
            }
            total += n.v;
            blocks.push((d.dev, d.no, n.v));
            if write {
                let at = r.i;
                for i in 0..n.v {
                    let w = r.num(2)?.v;
                    if bit_block {
                        o.d.items.push(Item {
                            addr: range_text(&d.dev, d.no + i * 16, d.no + i * 16 + 15),
                            kind: ItemKind::BitWord,
                            value: w,
                        });
                    } else {
                        o.d.items.push(Item {
                            addr: addr_text(&d.dev, d.no + i),
                            kind: ItemKind::Word,
                            value: w,
                        });
                    }
                }
                let rw = r.raw(&r.u[at..r.i]);
                o.body(
                    r.i,
                    &format!("{label} — write data"),
                    rw,
                    format!("{} words", n.v),
                );
            }
        }
        // 점 수 상한(SLMP 5.2): 읽기는 합 ≤ 960, 쓰기는 블록 수 × 4(0002 는 × 9) + 합 ≤ 960
        if total
            + if write {
                (nw.v + nb.v) * if wide { 9 } else { 4 }
            } else {
                0
            }
            > 960
        {
            return Err(err(0xc051, ""));
        }
        r.end()?;
        o.d.req = Some(if write {
            McRequest::WriteBlock
        } else {
            McRequest::ReadBlock { blocks }
        });
        return Ok(());
    }
    if [0x1001, 0x1002, 0x1003, 0x1005, 0x1006].contains(&cmd) {
        if sub != 0 {
            return Err(err(0xc059, ""));
        }
        let mode_txt = |v: u64| match v {
            1 => "0001 forced execution not allowed",
            3 => "0003 forced execution allowed",
            _ => "?",
        };
        if cmd == 0x1001 {
            let mode = r.num(2)?;
            o.body(r.i, "Mode", mode.raw.clone(), mode_txt(mode.v).into());
            let clear = r.num(1)?;
            let ct = [
                "00 do not clear",
                "01 clear outside the latch range",
                "02 clear including the latch range",
            ];
            o.body(
                r.i,
                "Clear mode",
                clear.raw.clone(),
                ct.get(clear.v as usize).copied().unwrap_or("?").into(),
            );
            let fixed = r.num(1)?;
            o.body(
                r.i,
                "Fixed value",
                fixed.raw.clone(),
                if fixed.v == 0 {
                    "00".into()
                } else {
                    "?".into()
                },
            );
            if (mode.v != 1 && mode.v != 3) || clear.v > 2 || fixed.v != 0 {
                return Err(err(0xc05c, ""));
            }
        } else if cmd == 0x1003 {
            let mode = r.num(2)?;
            o.body(r.i, "Mode", mode.raw.clone(), mode_txt(mode.v).into());
            if mode.v != 1 && mode.v != 3 {
                return Err(err(0xc05c, ""));
            }
        } else {
            let v = r.num(2)?;
            o.body(
                r.i,
                "Fixed value",
                v.raw.clone(),
                if v.v == 1 { "0001".into() } else { "?".into() },
            );
            if v.v != 1 {
                return Err(err(0xc05c, ""));
            }
        }
        r.end()?;
        o.d.req = Some(McRequest::Remote);
        o.d.notes.push(if cmd == 0x1006 {
            "Remote Reset sends no reply (SLMP 5.6) — PLC Simulator returns its simulated state to RUN and clears the monitor entry".into()
        } else {
            "No response data — PLC Simulator only changes its simulated run state (RUN/STOP/PAUSE)".into()
        });
        return Ok(());
    }
    if cmd == 0x0101 {
        if sub != 0 {
            return Err(err(0xc059, ""));
        }
        r.end()?;
        o.d.req = Some(McRequest::TypeName);
        return Ok(());
    }
    if cmd == 0x1402 {
        let (bit, wide) = sub_kind(sub)?;
        o.d.items_caption = Some("Values to write".into());
        if bit {
            let n = r.num(1)?;
            o.body(
                r.i,
                "Bit access points",
                n.raw.clone(),
                format!("{} points", n.v),
            );
            if n.v == 0 || n.v > if wide { 94 } else { 188 } {
                return Err(err(0xc053, ""));
            }
            for k in 0..n.v {
                let d = r.device(wide)?;
                if !d.dev.bits {
                    return Err(err(0xc05b, "word-as-bit"));
                }
                let v = r.num(if wide { 2 } else { 1 })?;
                let vt = match v.v {
                    1 => "ON".to_string(),
                    0 => "OFF".to_string(),
                    x => x.to_string(),
                };
                o.body(
                    r.i,
                    &format!("Bit {}", k + 1),
                    format!("{} {}", d.raw, v.raw),
                    format!("{} ← {vt}", addr_text(&d.dev, d.no)),
                );
                if v.v > 1 {
                    return Err(err(0xc060, ""));
                }
                o.d.items.push(Item {
                    addr: addr_text(&d.dev, d.no),
                    kind: ItemKind::Bit,
                    value: v.v,
                });
            }
            o.d.req = Some(McRequest::RandomWriteBits);
            r.end()?;
            return Ok(());
        }
        let nw = r.num(1)?;
        o.body(r.i, "Word access points", nw.raw.clone(), nw.v.to_string());
        let nd = r.num(1)?;
        o.body(
            r.i,
            "Double-word access points",
            nd.raw.clone(),
            nd.v.to_string(),
        );
        if nw.v + nd.v == 0 || nw.v * 12 + nd.v * 14 > if wide { 960 } else { 1920 } {
            return Err(err(0xc054, ""));
        }
        for k in 0..nw.v {
            let d = r.device(wide)?;
            let v = r.num(2)?;
            o.body(
                r.i,
                &format!("Word {}", k + 1),
                format!("{} {}", d.raw, v.raw),
                format!("{} ← {}", addr_text(&d.dev, d.no), h(v.v, 4)),
            );
            if d.dev.bits {
                o.d.items.push(Item {
                    addr: range_text(&d.dev, d.no, d.no + 15),
                    kind: ItemKind::BitWord,
                    value: v.v,
                });
            } else {
                o.d.items.push(Item {
                    addr: addr_text(&d.dev, d.no),
                    kind: ItemKind::Word,
                    value: v.v,
                });
            }
        }
        for k in 0..nd.v {
            let d = r.device(wide)?;
            let v = r.num(4)?;
            o.body(
                r.i,
                &format!("Double word {}", k + 1),
                format!("{} {}", d.raw, v.raw),
                format!("{} ← {}", addr_text(&d.dev, d.no), h(v.v, 8)),
            );
            o.d.items.push(Item {
                addr: range_text(&d.dev, d.no, d.no + if d.dev.bits { 31 } else { 1 }),
                kind: ItemKind::DWord,
                value: v.v,
            });
        }
        o.d.req = Some(McRequest::RandomWriteWords);
        r.end()?;
        return Ok(());
    }
    if cmd == 0x0619 {
        if sub != 0 {
            return Err(err(0xc059, ""));
        }
        let n = r.num(2)?;
        o.body(
            r.i,
            "Number of loopback data",
            n.raw.clone(),
            format!("{} bytes", n.v),
        );
        if n.v < 1 || n.v > 960 {
            return Err(err(0xc05c, ""));
        }
        let data = r.take(n.v as usize)?;
        let rw = r.raw(data);
        o.body(r.i, "Loopback data", rw, format!("{:?}", text(data)));
        o.d.req = Some(McRequest::Loopback);
        r.end()?;
        return Ok(());
    }
    Err(err(0xc059, ""))
}

/// 완료 응답의 데이터 — 짝 요청이 있으면 그 요청대로 디바이스마다 풀고, 없으면 워드로만
fn parse_response_data(r: &mut Rd, req: Option<&McRequest>, o: &mut Out) {
    let at = r.i;
    let data_raw = |r: &Rd| r.raw(&r.u[at..]);
    let Some(req) = req else {
        if r.left() == 0 {
            o.body(
                r.i,
                "Response data",
                String::new(),
                "none — the shape of a completed write".into(),
            );
            return;
        }
        let unit = if r.ascii { 4 } else { 2 };
        let dr = data_raw(r);
        o.body(
            r.i,
            "Response data",
            dr,
            "add the matching request to decode it per device".into(),
        );
        if r.left().is_multiple_of(unit) {
            o.d.items_caption = Some("Read as 16-bit words (no matching request)".into());
            let mut k = 0;
            while r.left() > 0 {
                if let Ok(n) = r.num(2) {
                    o.d.items.push(Item {
                        addr: format!("#{k}"),
                        kind: ItemKind::Word,
                        value: n.v,
                    });
                }
                k += 1;
            }
        } else if !r.ascii {
            o.d.notes.push("Odd number of data bytes — possibly a bit-unit read (1 point = 4 bits) or a loopback".into());
        }
        return;
    };
    o.d.items_caption = Some("Values read (from the matching request)".into());
    let res: Result<(), McErr> = (|| {
        match req {
            McRequest::Read { bit, dev, start, n } => {
                if *bit {
                    let raw = r.take(if r.ascii {
                        *n as usize
                    } else {
                        (*n as usize).div_ceil(2)
                    })?;
                    for i in 0..*n as usize {
                        let v = if r.ascii {
                            raw[i].wrapping_sub(0x30)
                        } else if i % 2 == 0 {
                            raw[i >> 1] >> 4
                        } else {
                            raw[i >> 1] & 0x0f
                        };
                        o.d.items.push(Item {
                            addr: addr_text(dev, start + i as u64),
                            kind: ItemKind::Bit,
                            value: v as u64,
                        });
                    }
                } else {
                    for k in 0..*n {
                        let w = r.num(2)?.v;
                        if dev.bits {
                            o.d.items.push(Item {
                                addr: range_text(dev, start + k * 16, start + k * 16 + 15),
                                kind: ItemKind::BitWord,
                                value: w,
                            });
                        } else {
                            o.d.items.push(Item {
                                addr: addr_text(dev, start + k),
                                kind: ItemKind::Word,
                                value: w,
                            });
                        }
                    }
                }
            }
            McRequest::RandomRead { words, dwords } | McRequest::MonitorEntry { words, dwords } => {
                for (d, no) in words {
                    let v = r.num(2)?.v;
                    push_word_item(&mut o.d, d, *no, v);
                }
                for (d, no) in dwords {
                    let v = r.num(4)?.v;
                    o.d.items.push(Item {
                        addr: range_text(d, *no, no + if d.bits { 31 } else { 1 }),
                        kind: ItemKind::DWord,
                        value: v,
                    });
                }
            }
            McRequest::ReadBlock { blocks } => {
                for (d, no, n) in blocks {
                    for k in 0..*n {
                        let w = r.num(2)?.v;
                        if d.bits {
                            o.d.items.push(Item {
                                addr: range_text(d, no + k * 16, no + k * 16 + 15),
                                kind: ItemKind::BitWord,
                                value: w,
                            });
                        } else {
                            o.d.items.push(Item {
                                addr: addr_text(d, no + k),
                                kind: ItemKind::Word,
                                value: w,
                            });
                        }
                    }
                }
            }
            McRequest::TypeName => {
                let name = r.take(16)?;
                let rw = r.raw(name);
                o.body(
                    r.i,
                    "Model name",
                    rw,
                    format!("{:?}", text(name).trim_end_matches(' ')),
                );
                let code = r.num(2)?;
                o.body(r.i, "Model code", code.raw.clone(), h(code.v, 4));
            }
            McRequest::Loopback => {
                let n = r.num(2)?;
                o.body(
                    r.i,
                    "Number of loopback data",
                    n.raw.clone(),
                    format!("{} bytes", n.v),
                );
                let data = r.take(n.v as usize)?;
                let rw = r.raw(data);
                o.body(r.i, "Loopback data", rw, format!("{:?}", text(data)));
            }
            _ => {}
        }
        if r.left() != 0 {
            return Err(err(0xc061, "long"));
        }
        Ok(())
    })();
    match res {
        Ok(()) => {
            let none = r.u.len() == at;
            let dr = data_raw(r);
            o.body(r.i, "Response data", dr, if none { "none (write completed)".into() } else { "length matches the request".into() });
        }
        Err(_) => o.d.notes.push("The response data length does not match the request — it may answer a different request or the frame may be cut off".into()),
    }
}

// ---------------------------------------------------------------- 머리

fn kind_of(u: &[u8], ascii: bool) -> Option<(McFrame, Dir)> {
    let key: String = if ascii {
        text(&u[..u.len().min(4)]).to_uppercase()
    } else if u.len() >= 2 && u[1] == 0 {
        format!("{:02X}00", u[0])
    } else {
        String::new()
    };
    match key.as_str() {
        "5000" => Some((McFrame::E3, Dir::Request)),
        "D000" => Some((McFrame::E3, Dir::Response)),
        "5400" => Some((McFrame::E4, Dir::Request)),
        "D400" => Some((McFrame::E4, Dir::Response)),
        _ => None,
    }
}

/// 길이 칸이 실제와 맞는지(형식 고르기용)
fn length_fits(u: &[u8], ascii: bool) -> bool {
    let Some(k) = kind_of(u, ascii) else {
        return false;
    };
    let m = if ascii { 2 } else { 1 };
    let off = (if k.0 == McFrame::E3 { 2 } else { 6 }) * m + 5 * m;
    if u.len() < off {
        return false;
    }
    let mut r = Rd {
        i: 0,
        u: &u[off..],
        ascii,
    };
    match r.num(2) {
        Ok(n) => n.v as usize == r.left(),
        Err(_) => false,
    }
}

fn decode_units(
    u: &[u8],
    code: McCode,
    why: String,
    pair: Option<&McDecoded>,
) -> Result<McDecoded, String> {
    let ascii = code == McCode::Ascii;
    let (frame, dir) = kind_of(u, ascii).unwrap();
    let mut r = Rd { i: 0, u, ascii };
    let mut o = Out {
        d: McDecoded {
            frame,
            code,
            dir,
            why,
            serial: None,
            network: 0,
            pc: 0,
            io: 0,
            drop: 0,
            header: vec![],
            command: None,
            sub: None,
            command_name: None,
            end_code: None,
            body: vec![],
            items: vec![],
            items_caption: None,
            req: None,
            sim_end: None,
            notes: vec![],
        },
        cursor: 0,
        in_header: true,
    };
    let short = || "The header is too short — paste the whole frame".to_string();
    let res: Result<(), McErr> = (|| {
        let sh = r.take(if ascii { 4 } else { 2 })?;
        let rw = r.raw(sh);
        o.f(
            r.i,
            "Subheader",
            rw,
            format!(
                "{} {}",
                if frame == McFrame::E3 { "3E" } else { "4E" },
                if dir == Dir::Request {
                    "request"
                } else {
                    "response"
                }
            ),
        );
        if frame == McFrame::E4 {
            let s = r.num(2)?;
            o.d.serial = Some(s.v as u32);
            o.f(
                r.i,
                "Serial number",
                s.raw,
                format!("{} — the response carries the same value", h(s.v, 4)),
            );
            let z = r.num(2)?;
            o.f(
                r.i,
                "Fixed (0000)",
                z.raw,
                if z.v == 0 {
                    "0000".into()
                } else {
                    format!("{} — should be 0000", h(z.v, 4))
                },
            );
        }
        let net = r.num(1)?;
        let pc = r.num(1)?;
        let io = r.num(2)?;
        let drop = r.num(1)?;
        o.d.network = net.v;
        o.d.pc = pc.v;
        o.d.io = io.v;
        o.d.drop = drop.v;
        o.f(r.i, "Network No.", net.raw, h(net.v, 2));
        o.f(
            r.i,
            "PC No. (station)",
            pc.raw,
            format!("{} ({})", h(pc.v, 2), pc.v),
        );
        o.f(
            r.i,
            "Request destination module I/O No.",
            io.raw,
            h(io.v, 4),
        );
        o.f(
            r.i,
            "Request destination module station No. (multidrop)",
            drop.raw,
            h(drop.v, 2),
        );
        if net.v == 0 && pc.v == 0xff && io.v == 0x03ff && drop.v == 0 {
            o.d.notes.push(
                "Station fields 00·FF·03FF·00 address the connected station itself (own station)"
                    .into(),
            );
        }
        let len = r.num(2)?;
        let after = r.left();
        let unit = if ascii { "characters" } else { "bytes" };
        let fits = len.v as usize == after;
        let lname = if dir == Dir::Request {
            "Request data length"
        } else {
            "Response data length"
        };
        o.f(
            r.i,
            lname,
            len.raw,
            format!(
                "{} {unit} — {}",
                len.v,
                if fits {
                    "matches what follows".to_string()
                } else {
                    format!("but {after} {unit} follow (mismatch)")
                }
            ),
        );
        if !fits {
            o.d.notes.push(format!("The length field ({}) differs from the actual length ({after}) — the frame may be cut off or two frames joined", len.v));
        }
        if dir == Dir::Request {
            if after < 6 * if ascii { 2 } else { 1 } {
                return Err(err(0, "short"));
            }
            let t = r.num(2)?;
            let tv = if t.v == 0 {
                "0 — wait indefinitely".to_string()
            } else {
                let secs = t.v as f64 * 0.25;
                let s = format!("{secs:.2}");
                let s = s.trim_end_matches('0').trim_end_matches('.').to_string();
                format!("{} × 0.25 s = {s} s", t.v)
            };
            o.f(r.i, "Monitoring timer", t.raw, tv);
            let c = r.num(2)?;
            let s = r.num(2)?;
            o.d.command = Some(c.v as u32);
            o.d.sub = Some(s.v as u32);
            let cn = command_name(c.v as u32, s.v as u32);
            o.d.command_name = Some(cn.clone());
            o.f(r.i, "Command", c.raw, format!("{} {cn}", h(c.v, 4)));
            o.f(
                r.i,
                "Subcommand",
                s.raw,
                format!("{} {}", h(s.v, 4), sub_name(c.v as u32, s.v as u32)),
            );
            o.in_header = false;
            // 길이 칸이 틀리면 PLC Simulator 는 데이터를 보기 전에 C057 로 답한다(풀이는 있는 데이터로 계속)
            match parse_request_body(c.v as u32, s.v as u32, &mut r, &mut o) {
                Ok(()) => o.d.sim_end = Some(if fits { 0 } else { 0xc057 }),
                Err(e) => {
                    o.d.sim_end = Some(if fits { e.code } else { 0xc057 });
                    if fits && e.code == 0xc061 {
                        o.d.notes.push(if e.detail == "short" {
                            "The command data is shorter than the point count needs".into()
                        } else {
                            "Data is left over after the command data".into()
                        });
                    }
                }
            }
            if c.v == 0x0401 || c.v == 0x0403 {
                o.d.notes.push("To decode the reply's values, keep this request as the matching request and add the reply".into());
            }
        } else {
            if after < if ascii { 4 } else { 2 } {
                return Err(err(0, "short"));
            }
            let e = r.num(2)?;
            o.d.end_code = Some(e.v as u32);
            o.f(
                r.i,
                "End code",
                e.raw,
                format!("{} {}", h(e.v, 4), end_text(e.v as u32)),
            );
            o.in_header = false;
            if e.v != 0 {
                // 오류 정보: 요청의 국 정보 + 명령·서브명령(SLMP 4.2)
                let inner: Result<(), McErr> = (|| {
                    for (name, n, w) in [
                        ("Error info — network No.", 1usize, 2usize),
                        ("Error info — PC No.", 1, 2),
                        ("Error info — I/O No.", 2, 4),
                        ("Error info — station No.", 1, 2),
                    ] {
                        let v = r.num(n)?;
                        o.body(r.i, name, v.raw, h(v.v, w));
                    }
                    let c = r.num(2)?;
                    let s = r.num(2)?;
                    o.d.command = Some(c.v as u32);
                    o.d.sub = Some(s.v as u32);
                    let cn = command_name(c.v as u32, s.v as u32);
                    o.d.command_name = Some(cn.clone());
                    o.body(
                        r.i,
                        "Error info — command",
                        c.raw,
                        format!("{} {cn}", h(c.v, 4)),
                    );
                    o.body(r.i, "Error info — subcommand", s.raw, h(s.v, 4));
                    Ok(())
                })();
                if inner.is_err() {
                    o.d.notes.push(
                        "The error information (station fields, command, subcommand) is incomplete"
                            .into(),
                    );
                }
                if r.left() > 0 {
                    o.d.notes
                        .push("Data is left over after the error information".into());
                }
            } else {
                let mut req = pair.and_then(|p| p.req.as_ref());
                if pair.is_some_and(|p| p.dir != Dir::Request) {
                    req = None;
                }
                if let Some(p) = pair {
                    if p.dir == Dir::Request && (p.code != code || p.frame != frame) {
                        o.d.notes.push(format!("The matching request is {} {} — the format differs, so it was not used as the pair", if p.frame == McFrame::E3 { "3E" } else { "4E" }, if p.code == McCode::Ascii { "ASCII" } else { "binary" }));
                    } else if p.dir == Dir::Request
                        && let (Some(a), Some(b)) = (p.serial, o.d.serial)
                        && a != b
                    {
                        o.d.notes.push(format!(
                            "The serial number differs from the matching request ({})",
                            h(a as u64, 4)
                        ));
                    }
                }
                let usable = pair.is_some_and(|p| p.code == code && p.frame == frame);
                parse_response_data(&mut r, if usable { req } else { None }, &mut o);
            }
        }
        Ok(())
    })();
    match res {
        Ok(()) => Ok(o.d),
        Err(e) if e.code == 0xc050 => {
            Err(format!("Non-hex characters in the header: «{}»", e.detail))
        }
        Err(_) => Err(short()),
    }
}

pub fn parse_hex(s: &str) -> Option<Vec<u8>> {
    let t: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    if t.is_empty() || !t.len().is_multiple_of(2) || !t.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    Some(
        (0..t.len() / 2)
            .map(|i| u8::from_str_radix(&t[i * 2..i * 2 + 2], 16).unwrap())
            .collect(),
    )
}

struct Cand {
    code: McCode,
    u: Vec<u8>,
    src: &'static str,
}

fn candidates(input: &str, mode: McMode) -> Vec<Cand> {
    let mut out = Vec::new();
    let bytes = parse_hex(input);
    if mode != McMode::Ascii
        && let Some(b) = &bytes
        && kind_of(b, false).is_some()
    {
        out.push(Cand {
            code: McCode::Binary,
            u: b.clone(),
            src: "hex",
        });
    }
    if mode != McMode::Binary {
        let raw = input.trim_matches(|c| c == '\r' || c == '\n').trim();
        let codes = |s: &str| s.bytes().collect::<Vec<u8>>();
        let ok = |s: &str| {
            !s.is_empty()
                && s.bytes().all(|c| (0x20..=0x7e).contains(&c))
                && kind_of(&codes(s), true).is_some()
        };
        if ok(raw) {
            out.push(Cand {
                code: McCode::Ascii,
                u: codes(raw),
                src: "text",
            });
        }
        let tight: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
        if tight != raw && ok(&tight) {
            out.push(Cand {
                code: McCode::Ascii,
                u: codes(&tight),
                src: "text-tight",
            });
        }
        if let Some(b) = &bytes
            && b.iter().all(|&c| (0x20..0x7f).contains(&c))
            && kind_of(b, true).is_some()
        {
            out.push(Cand {
                code: McCode::Ascii,
                u: b.clone(),
                src: "hex-ascii",
            });
        }
    }
    out
}

/// 프레임 하나를 푼다(글 입력 — HEX 또는 ASCII 글자). `pair` = 응답을 풀 때 쓸 짝 요청(글). 풀 수 없으면 Err(까닭)
pub fn decode_mc_text(input: &str, mode: McMode, pair: Option<&str>) -> Result<McDecoded, String> {
    if input.trim().is_empty() {
        return Err("Paste a frame".into());
    }
    let cs = candidates(input, mode);
    if cs.is_empty() {
        return Err(match mode {
            McMode::Ascii => "An ASCII frame starts with 5000, D000, 5400 or D400".into(),
            McMode::Binary => "A binary frame starts with 50 00, D0 00, 54 00 or D4 00 (paste as HEX)".into(),
            McMode::Auto => "No subheader found — binary starts with 50 00, D0 00, 54 00 or D4 00; ASCII with 5000, D000, 5400 or D400 (subheader)".into(),
        });
    }
    let pick = cs
        .iter()
        .find(|c| length_fits(&c.u, c.code == McCode::Ascii))
        .unwrap_or(&cs[0]);
    let pair_dec = pair
        .filter(|p| !p.trim().is_empty())
        .and_then(|p| decode_mc_text(p, mode, None).ok());
    finish(
        pick,
        pair_dec.as_ref(),
        pair.is_some_and(|p| !p.trim().is_empty()),
    )
}

fn finish(pick: &Cand, pair: Option<&McDecoded>, pair_given: bool) -> Result<McDecoded, String> {
    let k = kind_of(&pick.u, pick.code == McCode::Ascii).unwrap();
    let what = format!(
        "{} {}",
        if k.0 == McFrame::E3 { "3E" } else { "4E" },
        if k.1 == Dir::Request {
            "request"
        } else {
            "response"
        }
    );
    let why = match pick.code {
        McCode::Binary => format!(
            "Binary — first two bytes {} are the {what} subheader",
            hex(&pick.u[..2])
        ),
        McCode::Ascii => {
            let head = text(&pick.u[..4]);
            match pick.src {
                "hex-ascii" => format!("ASCII — the HEX bytes spell «{head}» ({what})"),
                _ => format!(
                    "ASCII — starts with «{head}» ({what}){}",
                    if pick.src == "text-tight" {
                        ", whitespace removed"
                    } else {
                        ""
                    }
                ),
            }
        }
    };
    let mut d = decode_units(&pick.u, pick.code, why, pair)?;
    if pair_given && d.dir == Dir::Response && pair.is_none_or(|p| p.dir != Dir::Request) {
        d.notes.push(
            "The text in the «matching request» box did not decode as a request and was not used"
                .into(),
        );
    }
    Ok(d)
}

/// 프레임 바이트를 직접 푼다 — 이진이면 이진, 아니면 ASCII. 모양이 안 맞으면 Err
pub fn decode_mc_bytes(u: &[u8], pair: Option<&McDecoded>) -> Result<McDecoded, String> {
    let code = if kind_of(u, false).is_some()
        && (!u.iter().all(|&c| (0x20..0x7f).contains(&c)) || length_fits(u, false))
    {
        McCode::Binary
    } else if kind_of(u, true).is_some() {
        McCode::Ascii
    } else {
        return Err("No subheader found".into());
    };
    let pick = Cand {
        code,
        u: u.to_vec(),
        src: "text",
    };
    finish(&pick, pair, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn le2(n: usize) -> [u8; 2] {
        (n as u16).to_le_bytes()
    }
    /// mc.rs b3: 3E 이진 요청, 자기 국, 감시 타이머 0010
    fn b3(cmd: &[u8]) -> String {
        let mut v = vec![0x50, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00];
        v.extend(le2(2 + cmd.len()));
        v.extend([0x10, 0x00]);
        v.extend(cmd);
        hex(&v)
    }
    fn b3ok(data: &[u8]) -> String {
        let mut v = vec![0xd0, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00];
        v.extend(le2(2 + data.len()));
        v.extend([0x00, 0x00]);
        v.extend(data);
        hex(&v)
    }
    fn a3(cmd: &str) -> String {
        format!("500000FF03FF00{:04X}0010{cmd}", 4 + cmd.len())
    }
    fn a3ok(data: &str) -> String {
        format!("D00000FF03FF00{:04X}0000{data}", 4 + data.len())
    }
    fn dec(s: &str) -> McDecoded {
        decode_mc_text(s, McMode::Auto, None).unwrap()
    }
    fn decp(s: &str, pair: &str) -> McDecoded {
        decode_mc_text(s, McMode::Auto, Some(pair)).unwrap()
    }
    fn items(d: &McDecoded) -> Vec<(String, u64)> {
        d.items.iter().map(|i| (i.addr.clone(), i.value)).collect()
    }
    fn it(v: &[(&str, u64)]) -> Vec<(String, u64)> {
        v.iter().map(|(a, b)| (a.to_string(), *b)).collect()
    }
    fn field<'a>(d: &'a McDecoded, name: &str) -> Option<&'a str> {
        d.header
            .iter()
            .chain(d.body.iter())
            .find(|f| f.name == name)
            .map(|f| f.value.as_str())
    }
    fn end(s: &str) -> u32 {
        dec(s).sim_end.unwrap()
    }

    // mc.rs read_bits_m100_to_m107
    #[test]
    fn read_bits_m100_m107() {
        let req_b = b3(&[0x01, 0x04, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00]);
        let q = dec(&req_b);
        assert_eq!(
            (q.frame, q.code, q.dir, q.command, q.sub, q.sim_end),
            (
                McFrame::E3,
                McCode::Binary,
                Dir::Request,
                Some(0x0401),
                Some(1),
                Some(0)
            )
        );
        assert_eq!(q.command_name.as_deref(), Some("Read (bits)"));
        assert!(
            field(&q, "Head device")
                .unwrap()
                .starts_with("M100 — M Internal relay (code 90)")
        );
        assert_eq!(
            field(&q, "Number of device points"),
            Some("8 points (bits)")
        );
        assert_eq!(field(&q, "Monitoring timer"), Some("16 × 0.25 s = 4 s"));
        let want: Vec<(String, u64)> = [0u64, 0, 0, 1, 0, 0, 1, 1]
            .iter()
            .enumerate()
            .map(|(i, v)| (format!("M{}", 100 + i), *v))
            .collect();
        assert_eq!(items(&decp(&b3ok(&[0x00, 0x01, 0x00, 0x11]), &req_b)), want);
        let req_a = a3("04010001M*0001000008");
        let qa = dec(&req_a);
        assert_eq!(
            (qa.code, qa.command, qa.sub, qa.sim_end),
            (McCode::Ascii, Some(0x0401), Some(1), Some(0))
        );
        assert_eq!(items(&decp(&a3ok("00010011"), &req_a)), want);
    }

    // mc.rs read_words_*
    #[test]
    fn read_words_and_tn() {
        let req = b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00]);
        assert_eq!(
            items(&decp(&b3ok(&[0x34, 0x12, 0x02, 0x00]), &req)),
            it(&[("M100–M115", 0x1234), ("M116–M131", 0x0002)])
        );
        assert_eq!(
            items(&decp(&a3ok("12340002"), &a3("04010000M*0001000002"))),
            it(&[("M100–M115", 0x1234), ("M116–M131", 0x0002)])
        );
        let tn = b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xc2, 0x03, 0x00]);
        assert_eq!(
            items(&decp(&b3ok(&[0x34, 0x12, 0x02, 0x00, 0xef, 0x1d]), &tn)),
            it(&[("TN100", 0x1234), ("TN101", 0x0002), ("TN102", 0x1def)])
        );
        assert_eq!(
            items(&decp(&a3ok("123400021DEF"), &a3("04010000TN0001000003")))
                .iter()
                .map(|x| x.1)
                .collect::<Vec<_>>(),
            vec![0x1234, 0x0002, 0x1def]
        );
        assert_eq!(
            items(&dec(&b3ok(&[0x34, 0x12, 0x02, 0x00]))),
            it(&[("#0", 0x1234), ("#1", 0x0002)])
        );
    }

    // mc.rs write_bits_m100_to_m107, write_words_*
    #[test]
    fn batch_write() {
        let bits: Vec<(String, u64)> = [1u64, 1, 0, 0, 1, 1, 0, 0]
            .iter()
            .enumerate()
            .map(|(i, v)| (format!("M{}", 100 + i), *v))
            .collect();
        let b = dec(&b3(&[
            0x01, 0x14, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00, 0x11, 0x00, 0x11, 0x00,
        ]));
        assert_eq!((b.command, b.sim_end), (Some(0x1401), Some(0)));
        assert_eq!(items(&b), bits);
        assert_eq!(items(&dec(&a3("14010001M*000100000811001100"))), bits);
        let m = dec(&b3(&[
            0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00, 0x47, 0x23, 0x96, 0xab,
        ]));
        assert_eq!(
            items(&m),
            it(&[("M100–M115", 0x2347), ("M116–M131", 0xab96)])
        );
        let d = it(&[("D100", 0x1995), ("D101", 0x1202), ("D102", 0x1130)]);
        assert_eq!(
            items(&dec(&b3(&[
                0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00, 0x95, 0x19, 0x02, 0x12,
                0x30, 0x11
            ]))),
            d
        );
        assert_eq!(items(&dec(&a3("14010000D*0001000003199512021130"))), d);
        assert_eq!(
            items(&dec(&a3("14010000M*00010000022347AB96")))
                .iter()
                .map(|x| x.1)
                .collect::<Vec<_>>(),
            vec![0x2347, 0xab96]
        );
        let ok = dec(&b3ok(&[]));
        assert_eq!(
            (ok.dir, ok.end_code, ok.items.len()),
            (Dir::Response, Some(0), 0)
        );
    }

    // mc.rs random_read_manual_example
    #[test]
    fn random_read_manual() {
        let req = b3(&[
            0x03, 0x04, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x00, 0x00, 0xc2,
            0x64, 0x00, 0x00, 0x90, 0x20, 0x00, 0x00, 0x9c, 0xdc, 0x05, 0x00, 0xa8, 0x60, 0x01,
            0x00, 0x9d, 0x57, 0x04, 0x00, 0x90,
        ]);
        let q = dec(&req);
        assert_eq!((q.command, q.sim_end), (Some(0x0403), Some(0)));
        assert_eq!(field(&q, "Word access points"), Some("4"));
        assert!(
            field(&q, "Word 4")
                .unwrap()
                .starts_with("X20 — X Input (code 9C, hex number = 32 decimal)")
        );
        let want = it(&[
            ("D0", 0x1995),
            ("TN0", 0x1202),
            ("M100–M115", 0x2030),
            ("X20–X2F", 0x4849),
            ("D1500–D1501", 0x4c544f4e),
            ("Y160–Y17F", 0xc3deb9af),
            ("M1111–M1142", 0xbaddbcb7),
        ]);
        let resp = [
            0x95, 0x19, 0x02, 0x12, 0x30, 0x20, 0x49, 0x48, 0x4e, 0x4f, 0x54, 0x4c, 0xaf, 0xb9,
            0xde, 0xc3, 0xb7, 0xbc, 0xdd, 0xba,
        ];
        assert_eq!(items(&decp(&b3ok(&resp), &req)), want);
        let req_a = a3("040300000403D*000000TN000000M*000100X*000020D*001500Y*000160M*001111");
        assert_eq!(dec(&req_a).sim_end, Some(0));
        assert_eq!(
            items(&decp(
                &a3ok("19951202203048494C544F4EC3DEB9AFBADDBCB7"),
                &req_a
            )),
            want
        );
    }

    // mc.rs random_write_*
    #[test]
    fn random_write() {
        let bits = it(&[("M50", 0), ("Y2F", 1)]);
        assert_eq!(
            items(&dec(&b3(&[
                0x02, 0x14, 0x01, 0x00, 0x02, 0x32, 0x00, 0x00, 0x90, 0x00, 0x2f, 0x00, 0x00, 0x9d,
                0x01
            ]))),
            bits
        );
        assert_eq!(items(&dec(&a3("1402000102M*00005000Y*00002F01"))), bits);
        let words = it(&[
            ("D0", 0x0550),
            ("D1", 0x0575),
            ("M100–M115", 0x0540),
            ("X20–X2F", 0x0583),
            ("D1500–D1501", 0x04391202),
            ("Y160–Y17F", 0x23752607),
            ("M1111–M1142", 0x04250475),
        ]);
        let req = [
            0x02, 0x14, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x50, 0x05, 0x01, 0x00,
            0x00, 0xa8, 0x75, 0x05, 0x64, 0x00, 0x00, 0x90, 0x40, 0x05, 0x20, 0x00, 0x00, 0x9c,
            0x83, 0x05, 0xdc, 0x05, 0x00, 0xa8, 0x02, 0x12, 0x39, 0x04, 0x60, 0x01, 0x00, 0x9d,
            0x07, 0x26, 0x75, 0x23, 0x57, 0x04, 0x00, 0x90, 0x75, 0x04, 0x25, 0x04,
        ];
        assert_eq!(items(&dec(&b3(&req))), words);
        assert_eq!(
            items(&dec(&a3(
                "140200000403D*0000000550D*0000010575M*0001000540X*0000200583D*00150004391202Y*00016023752607M*00111104250475"
            ))),
            words
        );
    }

    // mc.rs loopback_manual_example, frame_4e_serial_echo
    #[test]
    fn loopback_and_4e() {
        let lb = b3(&[
            0x19, 0x06, 0x00, 0x00, 0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45,
        ]);
        assert_eq!(field(&dec(&lb), "Loopback data"), Some("\"ABCDE\""));
        assert_eq!(
            field(
                &decp(&b3ok(&[0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45]), &lb),
                "Loopback data"
            ),
            Some("\"ABCDE\"")
        );
        assert_eq!(
            field(
                &decp(&a3ok("0005ABCDE"), &a3("061900000005ABCDE")),
                "Loopback data"
            ),
            Some("\"ABCDE\"")
        );
        let r4 =
            dec("54 00 34 12 00 00 00 FF FF 03 00 0D 00 10 00 19 06 00 00 05 00 41 42 43 44 45");
        assert_eq!(
            (r4.frame, r4.dir, r4.serial, r4.command, r4.sim_end),
            (
                McFrame::E4,
                Dir::Request,
                Some(0x1234),
                Some(0x0619),
                Some(0)
            )
        );
        let s4 = dec("D4 00 34 12 00 00 00 FF FF 03 00 09 00 00 00 05 00 41 42 43 44 45");
        assert_eq!(
            (s4.frame, s4.dir, s4.serial, s4.end_code),
            (McFrame::E4, Dir::Response, Some(0x1234), Some(0))
        );
        let cmd = "061900000005ABCDE";
        let a4 = dec(&format!(
            "54001234000000FF03FF00{:04X}0010{cmd}",
            4 + cmd.len()
        ));
        assert_eq!(
            (a4.frame, a4.code, a4.serial, a4.sim_end),
            (McFrame::E4, McCode::Ascii, Some(0x1234), Some(0))
        );
        let a4r = dec(&format!("D4001234000000FF03FF00{:04X}00000005ABCDE", 13));
        assert_eq!((a4r.dir, a4r.serial), (Dir::Response, Some(0x1234)));
    }

    // mc.rs error_response_shape
    #[test]
    fn error_response() {
        let e = dec("D0 00 00 FF FF 03 00 0B 00 59 C0 00 FF FF 03 00 01 01 00 00");
        assert_eq!(
            (e.end_code, e.command, e.sub),
            (Some(0xc059), Some(0x0101), Some(0))
        );
        assert_eq!(field(&e, "End code"), Some("C059 wrong command/subcommand"));
        assert_eq!(field(&e, "Error info — I/O No."), Some("03FF"));
        let a = dec("D00000FF03FF000016C05100FF03FF0004010000");
        assert_eq!(
            (a.code, a.end_code, a.command, a.sub),
            (McCode::Ascii, Some(0xc051), Some(0x0401), Some(0))
        );
        assert_eq!(
            field(&a, "Response data length"),
            Some("22 characters — matches what follows")
        );
    }

    // mc.rs point_limits·length_and_data_errors·iq_r_subcommands
    #[test]
    fn simulator_end_codes() {
        let rd = |sub: u8, code: u8, start: u32, n: u16| {
            b3(&[
                0x01,
                0x04,
                sub,
                0x00,
                start as u8,
                (start >> 8) as u8,
                (start >> 16) as u8,
                code,
                n as u8,
                (n >> 8) as u8,
            ])
        };
        assert_eq!(end(&rd(0, 0xa8, 0, 960)), 0);
        assert_eq!(end(&rd(0, 0xa8, 0, 961)), 0xc051);
        assert_eq!(end(&rd(0, 0xa8, 0, 0)), 0xc051);
        assert_eq!(end(&rd(1, 0x90, 0, 7168)), 0);
        assert_eq!(end(&rd(1, 0x90, 0, 7169)), 0xc052);
        assert_eq!(end(&rd(1, 0xa8, 0, 1)), 0xc05b);
        assert_eq!(end(&rd(0, 0x77, 0, 1)), 0xc05b);
        assert_eq!(end(&rd(0x80, 0xa8, 0, 1)), 0xc059);
        // 길이 칸 +1 → C057
        let bad = dec("50 00 00 FF FF 03 00 0A 00 10 00 19 06 00 00 01 00 41");
        assert_eq!(bad.sim_end, Some(0xc057));
        assert!(bad.notes.iter().any(|n| n.contains("(10)")));
        assert_eq!(
            end(&b3(&[
                0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xa8, 0x02, 0x00, 0x01, 0x00
            ])),
            0xc061
        );
        assert_eq!(
            end(&b3(&[
                0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xa8, 0x01, 0x00, 0x01, 0x00, 0x09
            ])),
            0xc061
        );
        assert_eq!(
            end(&b3(&[
                0x01, 0x14, 0x01, 0x00, 0, 0, 0, 0x90, 0x02, 0x00, 0x12
            ])),
            0xc060
        );
        assert_eq!(end(&b3(&[0x03, 0x04, 0x00, 0x00, 0x00, 0x00])), 0xc054);
        assert_eq!(end(&b3(&[0x02, 0x14, 0x01, 0x00, 189])), 0xc053);
        assert_eq!(end(&b3(&[0x19, 0x06, 0x00, 0x00, 0x00, 0x00])), 0xc05c);
        assert_eq!(end(&a3("04010000D*00000G0001")), 0xc050);
        // 16진 디바이스 X 는 번호도 16진, 10진 디바이스 D 에 «1F» 는 C050
        let x = dec(&a3("04010001X*00001F0001"));
        assert_eq!(x.sim_end, Some(0));
        assert!(matches!(&x.req, Some(McRequest::Read { start: 0x1f, .. })));
        assert!(field(&x, "Head device").unwrap().starts_with("X1F — "));
        assert_eq!(end(&a3("04010000D*00001F0001")), 0xc050);
        // 앞자리 0 대신 공백
        assert!(matches!(
            dec(&a3("04010000D      70001")).req,
            Some(McRequest::Read { start: 7, .. })
        ));
        // 서브 0002·0003
        let w = dec(&b3(&[
            0x01, 0x04, 0x02, 0x00, 0x64, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x01, 0x00,
        ]));
        assert_eq!(w.sim_end, Some(0));
        assert!(matches!(&w.req, Some(McRequest::Read { dev, start: 100, .. }) if dev.name == "D"));
        assert_eq!(
            items(&decp(&a3ok("ABCD"), &a3("04010002ZR**000000100001"))),
            it(&[("ZR10", 0xabcd)])
        );
        assert_eq!(
            items(&dec(&b3(&[
                0x02, 0x14, 0x03, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00, 0x90, 0x00, 0x01, 0x00
            ]))),
            it(&[("M5", 1)])
        );
        assert_eq!(
            end(&b3(&[0x03, 0x04, 0x01, 0x00, 0x01, 0x00, 0, 0, 0, 0xa8])),
            0xc059
        );
    }

    #[test]
    fn auto_detection() {
        let plain = a3("04010000D*0001000003");
        assert_eq!(dec(&plain).code, McCode::Ascii);
        assert_eq!(dec(&a3ok("12340002")).code, McCode::Ascii);
        let as_hex = hex(&plain.bytes().collect::<Vec<_>>());
        let from_hex = dec(&as_hex);
        assert_eq!(
            (from_hex.code, from_hex.command, from_hex.sim_end),
            (McCode::Ascii, Some(0x0401), Some(0))
        );
        let spaced = dec("5000 00 FF 03FF 00 0012 0010 0619 0000 0002 AB");
        assert_eq!(
            (spaced.code, spaced.command, spaced.sim_end),
            (McCode::Ascii, Some(0x0619), Some(0))
        );
        let lower = b3(&[0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00])
            .replace(' ', "")
            .to_lowercase();
        assert_eq!(dec(&lower).code, McCode::Binary);
        let e = decode_mc_text("01 03 00 00 00 02 C4 0B", McMode::Auto, None).unwrap_err();
        assert!(e.contains("subheader"));
        assert!(decode_mc_text(&a3("0401"), McMode::Binary, None).is_err());
        let r = decp(&b3ok(&[0x34, 0x12]), &a3("04010000D*0001000001"));
        assert_eq!(r.items[0].addr, "#0");
    }

    // mc.rs read_block·write_block·monitor·remote·read_type_name
    #[test]
    fn commands_0_6_0() {
        let block_req = b3(&[
            0x06, 0x04, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x04, 0x00, 0x00, 0x01,
            0x00, 0xb4, 0x08, 0x00, 0x00, 0x00, 0x00, 0x90, 0x02, 0x00, 0x80, 0x00, 0x00, 0x90,
            0x02, 0x00, 0x00, 0x01, 0x00, 0xa0, 0x03, 0x00,
        ]);
        let q = dec(&block_req);
        assert_eq!(
            (q.command, q.command_name.as_deref(), q.sim_end),
            (Some(0x0406), Some("Read Block"), Some(0))
        );
        assert!(matches!(q.req, Some(McRequest::ReadBlock { .. })));
        assert_eq!(field(&q, "Word device blocks"), Some("2"));
        assert!(field(&q, "Bit block 3").unwrap().contains("B100–B12F"));
        let mut resp = vec![0x08, 0x00, 0x30, 0x20, 0x45, 0x15, 0x00, 0x28, 0x70, 0x09];
        resp.extend([0u8; 12]);
        resp.extend([
            0x31, 0x01, 0x30, 0x20, 0x49, 0x48, 0xde, 0xc3, 0x00, 0x28, 0x70, 0x09, 0xaf, 0xb9,
            0xaf, 0xb9,
        ]);
        let r = items(&decp(&b3ok(&resp), &block_req));
        assert_eq!(r.len(), 4 + 8 + 2 + 2 + 3);
        assert_eq!(
            r[..4].to_vec(),
            it(&[
                ("D0", 0x0008),
                ("D1", 0x2030),
                ("D2", 0x1545),
                ("D3", 0x2800)
            ])
        );
        assert_eq!(
            r[11..].to_vec(),
            it(&[
                ("W107", 0x0131),
                ("M0–M15", 0x2030),
                ("M16–M31", 0x4849),
                ("M128–M143", 0xc3de),
                ("M144–M159", 0x2800),
                ("B100–B10F", 0x0970),
                ("B110–B11F", 0xb9af),
                ("B120–B12F", 0xb9af)
            ])
        );
        let qa = dec(&a3(
            "040600000203D*0000000004W*0001000008M*0000000002M*0001280002B*0001000003",
        ));
        assert_eq!((qa.code, qa.sim_end), (McCode::Ascii, Some(0)));
        let wr = dec(&a3(&[
            "140600000203",
            "D*0000000004",
            "0008203015452800",
            "W*0001000008",
            "0970",
            &"0000".repeat(6),
            "0131",
            "M*0000000002",
            "20304849",
            "M*0001280002",
            "C3DE2800",
            "B*0001000003",
            "0970B9AFB9AF",
        ]
        .join("")));
        assert_eq!(
            (wr.command_name.as_deref(), wr.sim_end, wr.items.len()),
            (Some("Write Block"), Some(0), 19)
        );
        assert_eq!(end(&b3(&[0x06, 0x04, 0x00, 0x00, 0x00, 0x00])), 0xc051);
        assert_eq!(
            end(&b3(&[
                0x06, 0x04, 0x00, 0x00, 0x01, 0x00, 0, 0, 0, 0xa8, 0xc0, 0x03
            ])),
            0
        );
        assert_eq!(
            end(&b3(&[
                0x06, 0x04, 0x00, 0x00, 0x02, 0x00, 0, 0, 0, 0xa8, 0xc0, 0x03, 0, 0, 0, 0xa8, 0x01,
                0x00
            ])),
            0xc051
        );
        assert_eq!(
            end(&b3(&[
                0x06, 0x04, 0x00, 0x00, 0x01, 0x00, 0, 0, 0, 0x90, 1, 0
            ])),
            0xc05b
        );
        // 0801·0802
        let entry = dec(&b3(&[
            0x01, 0x08, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x00, 0x00, 0xc2,
            0x64, 0x00, 0x00, 0x90, 0x20, 0x00, 0x00, 0x9c, 0xdc, 0x05, 0x00, 0xa8, 0x60, 0x01,
            0x00, 0x9d, 0x57, 0x04, 0x00, 0x90,
        ]));
        assert_eq!(
            (entry.command_name.as_deref(), entry.sim_end),
            (Some("Entry Monitor Device"), Some(0))
        );
        assert!(matches!(entry.req, Some(McRequest::MonitorEntry { .. })));
        assert_eq!(end(&a3("080100000100TS000000")), 0xc05b);
        let run = dec(&a3("08020000"));
        assert_eq!(
            (run.command_name.as_deref(), run.sim_end),
            (Some("Execute Monitor"), Some(0))
        );
        assert!(run.notes.iter().any(|n| n.contains("C05D")));
        assert_eq!(
            dec("D0 00 00 FF FF 03 00 0B 00 5D C0 00 FF FF 03 00 02 08 00 00").end_code,
            Some(0xc05d)
        );
        // 원격 조작(5.6 예)
        let remote = |s: &str| {
            let d = dec(s);
            (d.command_name.unwrap(), d.sim_end.unwrap())
        };
        assert_eq!(
            remote(&b3(&[0x01, 0x10, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00])),
            ("Remote Run".to_string(), 0)
        );
        assert_eq!(
            remote(&a3("1001000000010200")),
            ("Remote Run".to_string(), 0)
        );
        assert_eq!(
            remote(&b3(&[0x02, 0x10, 0x00, 0x00, 0x01, 0x00])),
            ("Remote Stop".to_string(), 0)
        );
        assert_eq!(remote(&a3("100300000001")), ("Remote Pause".to_string(), 0));
        assert_eq!(
            remote(&b3(&[0x05, 0x10, 0x00, 0x00, 0x01, 0x00])),
            ("Remote Latch Clear".to_string(), 0)
        );
        assert_eq!(remote(&a3("100600000001")), ("Remote Reset".to_string(), 0));
        assert_eq!(
            end(&b3(&[0x01, 0x10, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00])),
            0xc05c
        );
        assert_eq!(end(&b3(&[0x02, 0x10, 0x01, 0x00, 0x01, 0x00])), 0xc059);
        assert_eq!(end(&b3(&[0x02, 0x10, 0x00, 0x00])), 0xc061);
        // 0101 형명 읽기 — 매뉴얼 예 Q02UCPU·0263
        let tn = b3(&[0x01, 0x01, 0x00, 0x00]);
        assert_eq!(
            (dec(&tn).command_name.as_deref(), dec(&tn).sim_end),
            (Some("Read Type Name"), Some(0))
        );
        let mut name = b"Q02UCPU         ".to_vec();
        name.extend([0x63, 0x02]);
        let tr = decp(&b3ok(&name), &tn);
        assert_eq!(field(&tr, "Model name"), Some("\"Q02UCPU\""));
        assert_eq!(field(&tr, "Model code"), Some("0263"));
        let tra = decp(&a3ok("Q02UCPU         0263"), &a3("01010000"));
        assert_eq!(field(&tra, "Model code"), Some("0263"));
    }
}
