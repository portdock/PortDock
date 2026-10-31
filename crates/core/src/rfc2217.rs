//! RFC 2217(Telnet COM-PORT-OPTION) 서버 쪽 — 포트 나눔(0.10.0)에서 원격 프로그램이 보율·데이터 비트·패리티·
//! 정지 비트·흐름 제어·DTR·RTS 를 바꾸게 한다. 바이트 풀이·답 만들기만 하고 포트는 건드리지 않는다(바꿀 설정을 돌려준다).
//! 화면 없이 값만 — 시험은 이 파일 아래.
//!
//! 다루는 것: Telnet 협상(WILL·WONT·DO·DONT — BINARY·SGA·COM-PORT-OPTION 만 받고 나머지는 거절),
//! 하위 협상 SIGNATURE·SET-BAUDRATE·SET-DATASIZE·SET-PARITY·SET-STOPSIZE·SET-CONTROL·FLOWCONTROL-SUSPEND/RESUME·
//! SET-LINESTATE-MASK·SET-MODEMSTATE-MASK·PURGE-DATA, 데이터 안의 0xFF 두 번 쓰기(IAC IAC).
//! 하지 않는 것: 선 상태·모뎀 상태 알림(NOTIFY-LINESTATE·MODEMSTATE) 보내기, Break 실제 출력, 버퍼 비우기 실제 동작.

use crate::serial::SerialConfig;

pub const IAC: u8 = 255;
pub const DONT: u8 = 254;
pub const DO: u8 = 253;
pub const WONT: u8 = 252;
pub const WILL: u8 = 251;
pub const SB: u8 = 250;
pub const SE: u8 = 240;
pub const BINARY: u8 = 0;
pub const SGA: u8 = 3;
pub const COM_PORT: u8 = 44;

/// 서버가 답할 때 하위 명령 번호에 더하는 값(RFC 2217: 서버 → 클라이언트 = 클라이언트 번호 + 100)
const SERVER: u8 = 100;
/// 하위 협상 한 덩어리의 최대 길이 — 끝(IAC SE)이 오지 않는 이상한 입력에 버퍼가 끝없이 크지 않게
const SUB_MAX: usize = 512;

/// 데이터를 Telnet 줄로 보낼 때 0xFF 를 두 번(IAC IAC)으로
pub fn escape(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(data.len() + data.len() / 16);
    for &b in data {
        out.push(b);
        if b == IAC {
            out.push(IAC);
        }
    }
    out
}

/// 들어온 Telnet 줄에서 데이터가 아닌 것
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Item {
    /// WILL·WONT·DO·DONT + 옵션
    Neg { verb: u8, opt: u8 },
    /// IAC SB … IAC SE 사이(옵션 번호부터, IAC IAC 는 하나로 푼 것)
    Sub(Vec<u8>),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum St {
    Data,
    Iac,
    Neg(u8),
    Sub,
    SubIac,
}

/// Telnet 줄 풀이 — 조각나 들어와도(IAC 가 읽기 경계에 걸려도) 이어서 푼다
#[derive(Debug)]
pub struct Parser {
    st: St,
    sub: Vec<u8>,
}

impl Default for Parser {
    fn default() -> Self {
        Self { st: St::Data, sub: Vec::new() }
    }
}

impl Parser {
    /// `input` 을 풀어 데이터는 `data` 에, 협상은 `items` 에 덧붙인다
    pub fn feed(&mut self, input: &[u8], data: &mut Vec<u8>, items: &mut Vec<Item>) {
        for &b in input {
            self.st = match self.st {
                St::Data if b == IAC => St::Iac,
                St::Data => {
                    data.push(b);
                    St::Data
                }
                St::Iac => match b {
                    IAC => {
                        data.push(IAC);
                        St::Data
                    }
                    WILL | WONT | DO | DONT => St::Neg(b),
                    SB => {
                        self.sub.clear();
                        St::Sub
                    }
                    // NOP·GA 같은 한 바이트 명령은 버린다
                    _ => St::Data,
                },
                St::Neg(verb) => {
                    items.push(Item::Neg { verb, opt: b });
                    St::Data
                }
                St::Sub if b == IAC => St::SubIac,
                St::Sub => {
                    if self.sub.len() < SUB_MAX {
                        self.sub.push(b);
                    }
                    St::Sub
                }
                St::SubIac => match b {
                    IAC => {
                        if self.sub.len() < SUB_MAX {
                            self.sub.push(IAC);
                        }
                        St::Sub
                    }
                    SE => {
                        items.push(Item::Sub(std::mem::take(&mut self.sub)));
                        St::Data
                    }
                    // 규격 밖(IAC 뒤 다른 것) — 하위 협상을 버리고 데이터로 돌아간다
                    _ => {
                        self.sub.clear();
                        St::Data
                    }
                },
            };
        }
    }
}

/// 받는 옵션(BINARY·SGA·COM-PORT-OPTION)인지
fn accepted(opt: u8) -> bool {
    matches!(opt, BINARY | SGA | COM_PORT)
}

fn idx(opt: u8) -> usize {
    match opt {
        BINARY => 0,
        SGA => 1,
        _ => 2,
    }
}

/// 한 클라이언트의 협상 상태
#[derive(Debug, Default)]
pub struct Server {
    /// 우리가 켠 옵션(WILL 을 보냈고 거절되지 않음)
    us: [bool; 3],
    /// 상대가 켠 옵션
    them: [bool; 3],
    /// 상대가 «데이터를 잠시 보내지 말라»(FLOWCONTROL-SUSPEND)
    pub suspended: bool,
    /// 상대가 알려 온 이름(SIGNATURE)
    pub signature: Option<String>,
}

/// 한 항목을 처리한 결과
#[derive(Debug, Default, PartialEq)]
pub struct Outcome {
    /// 상대에게 보낼 답(이미 Telnet 모양)
    pub reply: Vec<u8>,
    /// 포트에 적용할 새 설정(바뀐 게 있을 때만)
    pub config: Option<SerialConfig>,
    /// 사건 줄 «RFC2217 baud 9600→115200»
    pub notes: Vec<String>,
}

fn neg(verb: u8, opt: u8) -> [u8; 3] {
    [IAC, verb, opt]
}

/// IAC SB COM-PORT (명령+100) 값(0xFF 는 두 번) IAC SE
fn sub_reply(cmd: u8, value: &[u8]) -> Vec<u8> {
    let mut v = vec![IAC, SB, COM_PORT, cmd + SERVER];
    for &b in value {
        v.push(b);
        if b == IAC {
            v.push(IAC);
        }
    }
    v.extend([IAC, SE]);
    v
}

fn parity_code(p: &str) -> u8 {
    match p {
        "odd" => 2,
        "even" => 3,
        "mark" => 4,
        "space" => 5,
        _ => 1,
    }
}

fn stop_code(s: f32) -> u8 {
    if (s - 1.5).abs() < 0.01 {
        3
    } else if s >= 2.0 {
        2
    } else {
        1
    }
}

fn flow_code(f: &str) -> u8 {
    match f {
        "software" => 2,
        "hardware" => 3,
        _ => 1,
    }
}

impl Server {
    /// 접속 직후 보낼 것 — «COM-PORT-OPTION·SGA 를 쓰겠다»
    pub fn hello(&mut self) -> Vec<u8> {
        self.us[idx(COM_PORT)] = true;
        self.us[idx(SGA)] = true;
        [neg(WILL, COM_PORT), neg(WILL, SGA)].concat()
    }

    /// 상대가 COM-PORT-OPTION 을 쓰는 중인지(어느 쪽으로든 켜짐)
    pub fn com_port(&self) -> bool {
        self.us[idx(COM_PORT)] || self.them[idx(COM_PORT)]
    }

    /// 항목 하나 처리. `cur` = 지금 포트 설정(바꿀 값을 만들 바탕)
    pub fn handle(&mut self, item: &Item, cur: &SerialConfig) -> Outcome {
        match item {
            Item::Neg { verb, opt } => Outcome { reply: self.negotiate(*verb, *opt), ..Default::default() },
            Item::Sub(sub) => self.sub(sub, cur),
        }
    }

    /// RFC 854 의 되풀이 막기: 이미 그 상태면 답하지 않는다
    fn negotiate(&mut self, verb: u8, opt: u8) -> Vec<u8> {
        let ok = accepted(opt);
        match verb {
            WILL if ok => {
                let i = idx(opt);
                if self.them[i] {
                    return Vec::new();
                }
                self.them[i] = true;
                neg(DO, opt).to_vec()
            }
            WILL => neg(DONT, opt).to_vec(),
            WONT if ok => {
                let i = idx(opt);
                if !self.them[i] {
                    return Vec::new();
                }
                self.them[i] = false;
                neg(DONT, opt).to_vec()
            }
            DO if ok => {
                let i = idx(opt);
                if self.us[i] {
                    return Vec::new();
                }
                self.us[i] = true;
                neg(WILL, opt).to_vec()
            }
            DO => neg(WONT, opt).to_vec(),
            DONT if ok => {
                let i = idx(opt);
                if !self.us[i] {
                    return Vec::new();
                }
                self.us[i] = false;
                neg(WONT, opt).to_vec()
            }
            _ => Vec::new(),
        }
    }

    fn sub(&mut self, sub: &[u8], cur: &SerialConfig) -> Outcome {
        let mut out = Outcome::default();
        let (Some(&COM_PORT), Some(&cmd)) = (sub.first(), sub.get(1)) else { return out };
        let val = &sub[2..];
        let mut next = cur.clone();
        match cmd {
            // SIGNATURE: 비었으면 «너는 누구냐» — 우리 이름을 답한다. 아니면 상대 이름
            0 => {
                if val.is_empty() {
                    out.reply = sub_reply(0, b"PortDock");
                } else {
                    self.signature = Some(String::from_utf8_lossy(val).into_owned());
                }
            }
            1 => {
                if let [a, b, c, d] = *val {
                    let want = u32::from_be_bytes([a, b, c, d]);
                    if (50..=20_000_000).contains(&want) {
                        next.baud = want;
                    }
                }
                out.reply = sub_reply(1, &next.baud.to_be_bytes());
            }
            2 => {
                if let Some(&n) = val.first()
                    && (5..=8).contains(&n)
                {
                    next.data_bits = n;
                }
                out.reply = sub_reply(2, &[next.data_bits]);
            }
            3 => {
                if let Some(p) = val.first().and_then(|v| match v {
                    1 => Some("none"),
                    2 => Some("odd"),
                    3 => Some("even"),
                    4 => Some("mark"),
                    5 => Some("space"),
                    _ => None,
                }) {
                    next.parity = p.into();
                }
                out.reply = sub_reply(3, &[parity_code(&next.parity)]);
            }
            4 => {
                if let Some(s) = val.first().and_then(|v| match v {
                    1 => Some(1.0),
                    2 => Some(2.0),
                    3 => Some(1.5),
                    _ => None,
                }) {
                    next.stop_bits = s;
                }
                out.reply = sub_reply(4, &[stop_code(next.stop_bits)]);
            }
            5 => {
                let v = val.first().copied().unwrap_or(0);
                let answer = match v {
                    0 => flow_code(&next.flow),
                    1..=3 => {
                        next.flow = match v {
                            2 => "software",
                            3 => "hardware",
                            _ => "none",
                        }
                        .into();
                        if next.flow == "hardware" {
                            next.rts = false;
                        }
                        v
                    }
                    // Break: 지금은 실제로 내보내지 않는다 — «꺼짐» 으로 답한다
                    4..=6 => 6,
                    7 => {
                        if next.dtr {
                            8
                        } else {
                            9
                        }
                    }
                    8 | 9 => {
                        next.dtr = v == 8;
                        v
                    }
                    10 => {
                        if next.rts {
                            11
                        } else {
                            12
                        }
                    }
                    11 | 12 => {
                        next.rts = v == 11;
                        v
                    }
                    // 받는 쪽 흐름 제어(13~19) 등 — 받은 값을 그대로 답한다(따로 두지 않음)
                    other => other,
                };
                out.reply = sub_reply(5, &[answer]);
            }
            8 => self.suspended = true,
            9 => self.suspended = false,
            10..=12 => out.reply = sub_reply(cmd, &val[..val.len().min(1)]),
            _ => {}
        }
        let changes = crate::serial::changes(cur, &next);
        if !changes.is_empty() {
            out.notes.push(format!("RFC2217 {}", changes.join(", ")));
            out.config = Some(next);
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> SerialConfig {
        SerialConfig {
            port: "COM3".into(),
            baud: 9600,
            data_bits: 8,
            parity: "none".into(),
            stop_bits: 1.0,
            flow: "none".into(),
            dtr: false,
            rts: false,
            auto_reconnect: true,
            rs485: String::new(),
        }
    }

    fn parse(chunks: &[&[u8]]) -> (Vec<u8>, Vec<Item>) {
        let mut p = Parser::default();
        let (mut d, mut it) = (Vec::new(), Vec::new());
        for c in chunks {
            p.feed(c, &mut d, &mut it);
        }
        (d, it)
    }

    #[test]
    fn escape_doubles_ff_and_parser_undoes_it() {
        let raw = [0x01, 0xFF, 0x02, 0xFF, 0xFF];
        let e = escape(&raw);
        assert_eq!(e, vec![0x01, 0xFF, 0xFF, 0x02, 0xFF, 0xFF, 0xFF, 0xFF]);
        // 읽기 경계가 IAC 사이에 걸려도
        let (d, it) = parse(&[&e[..2], &e[2..5], &e[5..]]);
        assert_eq!(d, raw);
        assert!(it.is_empty());
    }

    #[test]
    fn parser_splits_negotiation_and_subnegotiation() {
        let input = [b'A', IAC, WILL, COM_PORT, b'B', IAC, SB, COM_PORT, 1, 0, 0, 0x25, 0x80, IAC, SE, b'C', IAC, 241];
        let (d, it) = parse(&[&input[..3], &input[3..9], &input[9..]]);
        assert_eq!(d, b"ABC");
        assert_eq!(it, vec![Item::Neg { verb: WILL, opt: COM_PORT }, Item::Sub(vec![COM_PORT, 1, 0, 0, 0x25, 0x80])]);
        // 하위 협상 안의 IAC IAC 는 0xFF 하나
        let (_, it) = parse(&[&[IAC, SB, COM_PORT, 1, 0, 0, IAC, IAC, IAC, SE]]);
        assert_eq!(it, vec![Item::Sub(vec![COM_PORT, 1, 0, 0, 0xFF])]);
    }

    #[test]
    fn negotiation_accepts_known_refuses_others_without_loops() {
        let mut s = Server::default();
        assert_eq!(s.hello(), vec![IAC, WILL, COM_PORT, IAC, WILL, SGA]);
        let c = cfg();
        // 상대가 WILL COM-PORT → DO, 같은 것을 또 보내면 답 없음
        assert_eq!(s.handle(&Item::Neg { verb: WILL, opt: COM_PORT }, &c).reply, vec![IAC, DO, COM_PORT]);
        assert!(s.handle(&Item::Neg { verb: WILL, opt: COM_PORT }, &c).reply.is_empty());
        // 우리가 이미 WILL 을 보낸 옵션의 DO 는 확인일 뿐
        assert!(s.handle(&Item::Neg { verb: DO, opt: COM_PORT }, &c).reply.is_empty());
        assert_eq!(s.handle(&Item::Neg { verb: DO, opt: BINARY }, &c).reply, vec![IAC, WILL, BINARY]);
        // 모르는 옵션(ECHO 1)은 거절
        assert_eq!(s.handle(&Item::Neg { verb: DO, opt: 1 }, &c).reply, vec![IAC, WONT, 1]);
        assert_eq!(s.handle(&Item::Neg { verb: WILL, opt: 1 }, &c).reply, vec![IAC, DONT, 1]);
        assert!(s.com_port());
        assert_eq!(s.handle(&Item::Neg { verb: DONT, opt: COM_PORT }, &c).reply, vec![IAC, WONT, COM_PORT]);
    }

    #[test]
    fn set_baud_parity_data_stop_and_reply() {
        let mut s = Server::default();
        let c = cfg();
        let o = s.handle(&Item::Sub(vec![COM_PORT, 1, 0, 1, 0xC2, 0x00]), &c);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 101, 0, 1, 0xC2, 0x00, IAC, SE]);
        let n = o.config.unwrap();
        assert_eq!(n.baud, 115_200);
        assert_eq!(o.notes, vec!["RFC2217 baud 9600→115200".to_string()]);
        // 값 0 = 묻기 — 바꾸지 않고 지금 값으로 답
        let o = s.handle(&Item::Sub(vec![COM_PORT, 1, 0, 0, 0, 0]), &n);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 101, 0, 1, 0xC2, 0x00, IAC, SE]);
        assert!(o.config.is_none());
        let o = s.handle(&Item::Sub(vec![COM_PORT, 2, 7]), &n);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 102, 7, IAC, SE]);
        assert_eq!(o.config.as_ref().unwrap().data_bits, 7);
        let o = s.handle(&Item::Sub(vec![COM_PORT, 3, 3]), &n);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 103, 3, IAC, SE]);
        assert_eq!(o.config.as_ref().unwrap().parity, "even");
        let o = s.handle(&Item::Sub(vec![COM_PORT, 4, 2]), &n);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 104, 2, IAC, SE]);
        assert_eq!(o.config.as_ref().unwrap().stop_bits, 2.0);
        // 이상한 값은 받지 않고 지금 값으로 답
        let o = s.handle(&Item::Sub(vec![COM_PORT, 2, 9]), &n);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 102, 8, IAC, SE]);
        assert!(o.config.is_none());
    }

    #[test]
    fn baud_with_ff_byte_is_escaped_in_reply() {
        let mut s = Server::default();
        // 0x0000FF00 = 65280 — 값 안의 0xFF 는 두 번
        let o = s.handle(&Item::Sub(vec![COM_PORT, 1, 0, 0, 0xFF, 0]), &cfg());
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 101, 0, 0, IAC, IAC, 0, IAC, SE]);
    }

    #[test]
    fn control_flow_dtr_rts_and_misc() {
        let mut s = Server::default();
        let c = cfg();
        let o = s.handle(&Item::Sub(vec![COM_PORT, 5, 0]), &c);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 105, 1, IAC, SE]);
        let o = s.handle(&Item::Sub(vec![COM_PORT, 5, 8]), &c);
        assert!(o.config.as_ref().unwrap().dtr);
        let o = s.handle(&Item::Sub(vec![COM_PORT, 5, 11]), &c);
        assert!(o.config.as_ref().unwrap().rts);
        let o = s.handle(&Item::Sub(vec![COM_PORT, 5, 3]), &c);
        assert_eq!(o.config.as_ref().unwrap().flow, "hardware");
        let o = s.handle(&Item::Sub(vec![COM_PORT, 5, 5]), &c);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 105, 6, IAC, SE]);
        assert!(o.config.is_none());
        let o = s.handle(&Item::Sub(vec![COM_PORT, 11, 0xFF]), &c);
        assert_eq!(o.reply, vec![IAC, SB, COM_PORT, 111, IAC, IAC, IAC, SE]);
        let o = s.handle(&Item::Sub(vec![COM_PORT, 0]), &c);
        assert_eq!(o.reply, [&[IAC, SB, COM_PORT, 100][..], b"PortDock", &[IAC, SE]].concat());
        s.handle(&Item::Sub(vec![COM_PORT, 8]), &c);
        assert!(s.suspended);
        s.handle(&Item::Sub(vec![COM_PORT, 9]), &c);
        assert!(!s.suspended);
        // 다른 옵션의 하위 협상은 무시
        assert_eq!(s.handle(&Item::Sub(vec![1, 2, 3]), &c), Outcome::default());
    }
}
