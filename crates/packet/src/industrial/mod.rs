//! 산업 프로토콜 — Modbus TCP·RTU over TCP, MC(SLMP) 3E/4E, LS XGT FEnet.
//!
//! 이 모듈은 PDU 를 «자르고(frame_len) · 엿보고(peek) · 짝 맞추는(matches)» 부분이다. 칸마다 풀이는 modbus·mc·xgt 모듈.

use crate::dissect::{Dz, Prefs, be16};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum App {
    Modbus,
    ModbusRtu,
    Mc,
    Xgt,
}

impl App {
    pub fn name(self) -> &'static str {
        match self {
            App::Modbus => "Modbus/TCP",
            App::ModbusRtu => "Modbus RTU over TCP",
            App::Mc => "MC (SLMP)",
            App::Xgt => "LS XGT FEnet",
        }
    }
    /// 필터 프로토콜 이름
    pub fn proto(self) -> &'static str {
        match self {
            App::Modbus => "mbtcp",
            App::ModbusRtu => "modbus",
            App::Mc => "mc",
            App::Xgt => "xgt",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FrameLen {
    /// 더 받아야 함
    Need,
    /// 이 프로토콜 모양이 아님
    Bad,
    Len(usize),
}

/// 짝 맞추기·집계에 필요한 머리 정보
#[derive(Clone, Copy, Debug, Default)]
pub struct Peek {
    pub is_req: bool,
    /// Modbus 트랜잭션 ID · MC 4E 일련번호 · XGT Invoke ID
    pub key: u32,
    /// Modbus 유닉스 ID(국번) · MC 요청 대상 국번
    pub unit: u8,
    /// Modbus 함수 코드(예외면 0x80 포함) · MC 명령 · XGT 명령
    pub func: u16,
    /// Modbus 예외 코드 · MC 종료 코드 · XGT 오류 코드 — 0 이면 정상
    pub code: u32,
    pub mc4e: bool,
}

pub(crate) fn hexval(c: u8) -> Option<u32> {
    (c as char).to_digit(16)
}

pub(crate) fn hex_n(d: &[u8], n: usize) -> Option<u32> {
    let mut v = 0u32;
    for k in 0..n {
        v = v * 16 + hexval(*d.get(k)?)?;
    }
    Some(v)
}

fn le16(d: &[u8], i: usize) -> u16 {
    u16::from_le_bytes([d[i], d[i + 1]])
}

/// 포트 목록으로 프로토콜 정하기 (서버 포트·클라이언트 포트 어느 쪽이든)
pub fn classify_ports(prefs: &Prefs, a: u16, b: u16) -> Option<App> {
    let hit = |l: &[u16]| l.contains(&a) || l.contains(&b);
    if hit(&prefs.mc_ports) {
        Some(App::Mc)
    } else if hit(&prefs.xgt_ports) {
        Some(App::Xgt)
    } else if hit(&prefs.modbus_rtu_ports) {
        Some(App::ModbusRtu)
    } else if hit(&prefs.modbus_ports) {
        Some(App::Modbus)
    } else {
        None
    }
}

fn fc_valid(fc: u8) -> bool {
    let f = fc & 0x7f;
    (1..=0x2b).contains(&f)
}

/// 목록 밖 포트에서 첫 데이터로 찾기 — 첫 프레임이 다 들어 있어야 한다(오탐을 줄이려고)
pub fn sniff(d: &[u8], udp: bool) -> Option<App> {
    if let FrameLen::Len(n) = frame_len(App::Mc, d)
        && n <= d.len()
    {
        return Some(App::Mc);
    }
    if let FrameLen::Len(n) = frame_len(App::Xgt, d)
        && n <= d.len()
    {
        return Some(App::Xgt);
    }
    if !udp
        && let FrameLen::Len(n) = frame_len(App::Modbus, d)
        && n <= d.len()
        && d.len() >= 8
        && fc_valid(d[7])
    {
        return Some(App::Modbus);
    }
    None
}

struct McKind {
    ascii: bool,
    e4: bool,
    req: bool,
}

fn mc_kind(d: &[u8]) -> Option<McKind> {
    if d.len() >= 2 && d[1] == 0 && matches!(d[0], 0x50 | 0xd0 | 0x54 | 0xd4) {
        return Some(McKind {
            ascii: false,
            e4: matches!(d[0], 0x54 | 0xd4),
            req: matches!(d[0], 0x50 | 0x54),
        });
    }
    if d.len() >= 4 {
        let s: Vec<u8> = d[..4].iter().map(|c| c.to_ascii_uppercase()).collect();
        return match &s[..] {
            b"5000" => Some(McKind {
                ascii: true,
                e4: false,
                req: true,
            }),
            b"D000" => Some(McKind {
                ascii: true,
                e4: false,
                req: false,
            }),
            b"5400" => Some(McKind {
                ascii: true,
                e4: true,
                req: true,
            }),
            b"D400" => Some(McKind {
                ascii: true,
                e4: true,
                req: false,
            }),
            _ => None,
        };
    }
    None
}

/// PDU 하나의 길이(머리의 길이 칸으로) — 더 받아야 하면 `Need`, 이 프로토콜 모양이 아니면 `Bad`
pub fn frame_len(app: App, d: &[u8]) -> FrameLen {
    match app {
        App::Modbus => {
            if d.len() < 6 {
                return FrameLen::Need;
            }
            let l = be16(d, 4) as usize;
            if d[2] != 0 || d[3] != 0 || !(2..=254).contains(&l) {
                return FrameLen::Bad;
            }
            FrameLen::Len(6 + l)
        }
        App::ModbusRtu => {
            if d.len() < 4 {
                return FrameLen::Need;
            }
            // 세그먼트 하나가 RTU 프레임 하나라고 본다 — CRC 가 맞아야 한다
            if crate::industrial::modbus::crc_ok(d) {
                FrameLen::Len(d.len())
            } else {
                FrameLen::Bad
            }
        }
        App::Mc => {
            if d.len() < 2 {
                return FrameLen::Need;
            }
            let Some(k) = mc_kind(d) else {
                // 첫 바이트가 ASCII 머리의 앞부분일 수 있다
                return if d.len() < 4
                    && b"5000D0005400D400"
                        .windows(d.len())
                        .any(|w| w.eq_ignore_ascii_case(d))
                {
                    FrameLen::Need
                } else {
                    FrameLen::Bad
                };
            };
            if !k.ascii {
                let head = if k.e4 { 13 } else { 9 };
                if d.len() < head {
                    return FrameLen::Need;
                }
                let l = le16(d, head - 2) as usize;
                if !(2..=8192).contains(&l) {
                    return FrameLen::Bad;
                }
                FrameLen::Len(head + l)
            } else {
                let head = if k.e4 { 26 } else { 18 };
                if d.len() < head {
                    return FrameLen::Need;
                }
                match hex_n(&d[head - 4..], 4) {
                    Some(l) if (4..=16384).contains(&l) => FrameLen::Len(head + l as usize),
                    _ => FrameLen::Bad,
                }
            }
        }
        App::Xgt => {
            if d.len() < 20 {
                return FrameLen::Need;
            }
            if !(d.starts_with(b"LSIS-XGT") || d.starts_with(b"LGIS-GLOFA")) {
                return FrameLen::Bad;
            }
            FrameLen::Len(20 + le16(d, 16) as usize)
        }
    }
}

/// 머리만 엿본다. `req_side` 는 클라이언트 → 서버 방향인지(Modbus 는 내용만으로 방향을 알 수 없다)
pub fn peek(app: App, d: &[u8], req_side: bool) -> Peek {
    let mut p = Peek {
        is_req: req_side,
        ..Default::default()
    };
    match app {
        App::Modbus => {
            if d.len() >= 8 {
                p.key = be16(d, 0) as u32;
                p.unit = d[6];
                p.func = d[7] as u16;
                if d[7] & 0x80 != 0 && d.len() >= 9 {
                    p.code = d[8] as u32;
                }
            }
        }
        App::ModbusRtu => {
            if d.len() >= 4 {
                p.unit = d[0];
                p.func = d[1] as u16;
                if d[1] & 0x80 != 0 && d.len() >= 5 {
                    p.code = d[2] as u32;
                }
            }
        }
        App::Mc => {
            if let Some(k) = mc_kind(d) {
                p.is_req = k.req;
                p.mc4e = k.e4;
                if !k.ascii {
                    let o = if k.e4 { 6 } else { 2 };
                    if k.e4 && d.len() >= 4 {
                        p.key = le16(d, 2) as u32;
                    }
                    let body = o + 7;
                    if d.len() > o + 4 {
                        p.unit = d[o + 4];
                    }
                    if k.req {
                        if d.len() >= body + 6 {
                            p.func = le16(d, body + 2);
                        }
                    } else if d.len() >= body + 2 {
                        p.code = le16(d, body) as u32;
                        if p.code != 0 && d.len() >= body + 2 + 9 {
                            p.func = le16(d, body + 2 + 5);
                        }
                    }
                } else {
                    let o = if k.e4 { 12 } else { 4 };
                    if k.e4 {
                        p.key = hex_n(&d[4..], 4).unwrap_or(0);
                    }
                    p.unit = hex_n(&d[o + 8..], 2).unwrap_or(0) as u8;
                    let body = o + 14;
                    if k.req {
                        p.func = hex_n(d.get(body + 4..).unwrap_or(&[]), 4).unwrap_or(0) as u16;
                    } else {
                        p.code = hex_n(d.get(body..).unwrap_or(&[]), 4).unwrap_or(0);
                        if p.code != 0 {
                            p.func =
                                hex_n(d.get(body + 4 + 10..).unwrap_or(&[]), 4).unwrap_or(0) as u16;
                        }
                    }
                }
            }
        }
        App::Xgt => {
            if d.len() >= 22 {
                p.is_req = d[13] != 0x11;
                p.key = le16(d, 14) as u32;
                p.func = le16(d, 20);
                if !p.is_req && d.len() >= 30 && le16(d, 26) != 0 {
                    p.code = le16(d, 28) as u32;
                    if p.code == 0 {
                        p.code = 0xffff;
                    }
                }
            }
        }
    }
    p
}

/// 응답이 이 요청의 짝인가
pub fn matches(req: &Peek, resp: &Peek, app: App) -> bool {
    match app {
        App::Modbus => req.key == resp.key && req.unit == resp.unit,
        App::ModbusRtu => req.unit == resp.unit && (req.func & 0x7f) == (resp.func & 0x7f),
        App::Mc => !req.mc4e || !resp.mc4e || req.key == resp.key,
        App::Xgt => req.key == resp.key,
    }
}

/// 같은 번호가 여러 개 기다릴 때 가장 최근 요청과 짝지을지(Modbus·XGT) 가장 오래된 것과 짝지을지(MC 3E·RTU)
pub fn match_newest_first(app: App) -> bool {
    matches!(app, App::Modbus | App::Xgt)
}

/// 응용 계층 해석 — 해석 결과 PDU 가 있으면 그것을, 없으면 이 데이터를 직접 잘라 푼다
pub(crate) fn dissect_payload(
    _z: &mut Dz,
    _from: usize,
    _end: usize,
    _sp: u16,
    _dp: u16,
    _tcp: bool,
) {
}

pub mod modbus {
    /// Modbus CRC-16(다항식 0xA001)
    pub fn crc16(d: &[u8]) -> u16 {
        let mut c: u16 = 0xffff;
        for &b in d {
            c ^= b as u16;
            for _ in 0..8 {
                c = if c & 1 != 0 {
                    (c >> 1) ^ 0xa001
                } else {
                    c >> 1
                };
            }
        }
        c
    }

    /// 끝 2바이트가 앞 바이트들의 CRC(작은 자리 먼저)인가
    pub fn crc_ok(d: &[u8]) -> bool {
        if d.len() < 4 {
            return false;
        }
        let c = crc16(&d[..d.len() - 2]);
        d[d.len() - 2] == (c & 0xff) as u8 && d[d.len() - 1] == (c >> 8) as u8
    }
}
