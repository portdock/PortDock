//! Modbus 프레임 풀이 — `site/src/lib/modbusDecode.ts` 를 옮긴 것(같은 규칙: 길이로 요청·응답 가리기, 01·02 바이트 수 3 은 둘 다).
//! 근거: Modbus Application Protocol Specification V1.1b3, Modbus over Serial Line V1.02, Modbus Messaging on TCP/IP Implementation Guide V1.0b.

use super::hex;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WireMode {
    Auto,
    Rtu,
    Tcp,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Wire {
    Rtu,
    Tcp,
}

/// 데이터 표 — Co 코일 · Di 입력 접점 · Hr 보유 레지스터 · Ir 입력 레지스터
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Space {
    Co,
    Di,
    Hr,
    Ir,
}

impl Space {
    pub fn is_bit(self) -> bool {
        matches!(self, Space::Co | Space::Di)
    }
    fn prefix(self) -> u32 {
        match self {
            Space::Co => 0,
            Space::Di => 1,
            Space::Hr => 4,
            Space::Ir => 3,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Space::Co => "Coils",
            Space::Di => "Discrete inputs",
            Space::Hr => "Holding registers",
            Space::Ir => "Input registers",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Field {
    pub name: String,
    /// 그 항목의 원래 바이트(HEX)
    pub raw: String,
    pub value: String,
}

#[derive(Clone, Debug)]
pub struct Table {
    pub space: Space,
    /// 시작 주소(0 기준). 응답처럼 프레임에 없으면 None
    pub start: Option<u32>,
    pub values: Vec<u32>,
    pub caption: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Request,
    Response,
    Echo,
    Exception,
    Unknown,
}

#[derive(Clone, Debug)]
pub struct Reading {
    pub role: Role,
    pub title: String,
    pub fields: Vec<Field>,
    pub tables: Vec<Table>,
    /// 규격과 다른 점
    pub issues: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct Crc {
    pub ok: bool,
    pub got: [u8; 2],
    pub want: [u8; 2],
}

#[derive(Clone, Debug)]
pub struct Decoded {
    pub wire: Wire,
    pub auto: bool,
    pub why: String,
    pub header: Vec<Field>,
    pub crc: Option<Crc>,
    pub unit: u8,
    pub fc: u8,
    pub fname: String,
    pub readings: Vec<Reading>,
    pub notes: Vec<String>,
}

fn h2(n: u32) -> String {
    format!("{n:02X}")
}
fn h4(n: u32) -> String {
    format!("0x{n:04X}")
}
fn u16at(b: &[u8], i: usize) -> u32 {
    ((b[i] as u32) << 8) | b[i + 1] as u32
}

/// 공개 함수 코드 이름(Application Protocol V1.1b3 §5.1)
pub fn func_name(fc: u8) -> &'static str {
    match fc & 0x7f {
        0x01 => "Read Coils",
        0x02 => "Read Discrete Inputs",
        0x03 => "Read Holding Registers",
        0x04 => "Read Input Registers",
        0x05 => "Write Single Coil",
        0x06 => "Write Single Register",
        0x0f => "Write Multiple Coils",
        0x10 => "Write Multiple Registers",
        0x17 => "Read/Write Multiple Registers",
        0x07 => "Read Exception Status (serial line only)",
        0x08 => "Diagnostics (serial line only)",
        0x0b => "Get Comm Event Counter (serial line only)",
        0x0c => "Get Comm Event Log (serial line only)",
        0x11 => "Report Server ID (serial line only)",
        0x14 => "Read File Record",
        0x15 => "Write File Record",
        0x16 => "Mask Write Register",
        0x18 => "Read FIFO Queue",
        0x2b => "Encapsulated Interface Transport",
        _ => "Unknown function",
    }
}

pub const DECODED_FUNCS: [u8; 9] = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x0f, 0x10, 0x17];

/// 예외 코드 이름(Application Protocol V1.1b3 §7). 07·09 는 이 판에 정의가 없다
pub fn exception_name(code: u8) -> Option<&'static str> {
    Some(match code {
        0x01 => "Illegal Function",
        0x02 => "Illegal Data Address",
        0x03 => "Illegal Data Value",
        0x04 => "Server Device Failure",
        0x05 => "Acknowledge",
        0x06 => "Server Device Busy",
        0x08 => "Memory Parity Error",
        0x0a => "Gateway Path Unavailable",
        0x0b => "Gateway Target Device Failed to Respond",
        _ => return None,
    })
}

/// 40001 식 표기 — 9999 까지 5자리(40001), 넘으면 6자리(410000). core AddrStyle::addr 와 같다
pub fn plc_addr(space: Space, a: u32) -> String {
    let p = space.prefix();
    if a < 9999 {
        format!("{p}{:04}", a + 1)
    } else {
        format!("{p}{:05}", a + 1)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row {
    pub i: usize,
    pub zero: String,
    pub plc: String,
    pub dec: u32,
    pub signed: i32,
    pub hex: String,
}

/// 값 표의 줄 — 시작 주소를 모르면 주소 칸은 «+n»
pub fn table_rows(t: &Table, start: Option<u32>) -> Vec<Row> {
    t.values
        .iter()
        .enumerate()
        .map(|(i, &v)| {
            let a = start.map(|s| s + i as u32);
            let ok = a.is_some_and(|a| a <= 0xffff);
            Row {
                i,
                zero: if ok {
                    a.unwrap().to_string()
                } else {
                    format!("+{i}")
                },
                plc: if ok {
                    plc_addr(t.space, a.unwrap())
                } else {
                    String::new()
                },
                dec: v,
                signed: if v >= 0x8000 {
                    v as i32 - 0x10000
                } else {
                    v as i32
                },
                hex: if t.space.is_bit() {
                    (if v != 0 { "ON" } else { "OFF" }).to_string()
                } else {
                    h4(v)
                },
            }
        })
        .collect()
}

fn bits(bytes: &[u8], count: usize) -> Vec<u32> {
    (0..count)
        .map(|i| ((bytes.get(i >> 3).copied().unwrap_or(0) >> (i & 7)) & 1) as u32)
        .collect()
}
fn regs(bytes: &[u8]) -> Vec<u32> {
    (0..bytes.len() / 2).map(|i| u16at(bytes, i * 2)).collect()
}

fn space_of(fc: u8) -> Space {
    match fc {
        0x01 | 0x05 | 0x0f => Space::Co,
        0x02 => Space::Di,
        0x04 => Space::Ir,
        _ => Space::Hr,
    }
}

/// PDU(함수 코드부터) 하나를 풀 수 있는 해석들로
pub fn decode_pdu(pdu: &[u8]) -> Vec<Reading> {
    let fc = pdu[0];
    let n = pdu.len();
    let f = |name: &str, from: usize, len: usize, value: String| Field {
        name: name.into(),
        raw: hex(&pdu[from.min(n)..(from + len).min(n)]),
        value,
    };
    let fc_field = f(
        "Function",
        0,
        1,
        format!("{} {}", h2(fc as u32), func_name(fc)),
    );
    let space = space_of(fc & 0x7f);
    let mut out: Vec<Reading> = Vec::new();
    let range = |q: u32, lo: u32, hi: u32, what: &str, issues: &mut Vec<String>| {
        if q < lo || q > hi {
            issues.push(format!(
                "{what} {q} — the specification allows {lo} to {hi}"
            ));
        }
    };
    let addr_over = |a: u32, q: u32, issues: &mut Vec<String>| {
        if q > 0 && a + q > 0x10000 {
            issues.push("Start address plus quantity runs past 65535".into());
        }
    };

    // 예외 응답: 함수 | 0x80 + 예외 코드
    if fc & 0x80 != 0 {
        let code = pdu.get(1).copied();
        let mut issues = Vec::new();
        if n != 2 {
            issues.push(format!("An exception response PDU is 2 bytes (got {n})"));
        }
        if let Some(c) = code
            && exception_name(c).is_none()
        {
            issues.push(format!(
                "Exception code {} is not in the specification",
                h2(c as u32)
            ));
        }
        let mut fields = vec![f(
            "Function",
            0,
            1,
            format!(
                "{} = {} | 80 — {}",
                h2(fc as u32),
                h2((fc & 0x7f) as u32),
                func_name(fc)
            ),
        )];
        if let Some(c) = code {
            fields.push(f(
                "Exception code",
                1,
                1,
                format!("{} {}", h2(c as u32), exception_name(c).unwrap_or("?")),
            ));
        }
        out.push(Reading {
            role: Role::Exception,
            title: "Exception response".into(),
            fields,
            tables: vec![],
            issues,
        });
        return out;
    }

    let read_req = |lo: u32, hi: u32| -> Reading {
        let a = u16at(pdu, 1);
        let q = u16at(pdu, 3);
        let mut issues = Vec::new();
        range(q, lo, hi, "Quantity", &mut issues);
        addr_over(a, q, &mut issues);
        Reading {
            role: Role::Request,
            title: "As a request".into(),
            fields: vec![
                fc_field.clone(),
                f(
                    "Start address",
                    1,
                    2,
                    format!("{a} ({})", plc_addr(space, a)),
                ),
                f("Quantity", 3, 2, q.to_string()),
            ],
            tables: vec![],
            issues,
        }
    };
    let read_resp = |bit: bool| -> Reading {
        let data = &pdu[2..];
        let mut issues = Vec::new();
        if !bit && !data.len().is_multiple_of(2) {
            issues.push("Register response byte count is odd".into());
        }
        let values = if bit {
            bits(data, data.len() * 8)
        } else {
            regs(data)
        };
        if bit {
            issues.push("Unused bits in the last byte are padded with 0 — read only as many as were requested".into());
        }
        Reading {
            role: Role::Response,
            title: "As a response".into(),
            fields: vec![
                fc_field.clone(),
                f("Byte count", 1, 1, pdu[1].to_string()),
                f(
                    "Data",
                    2,
                    data.len(),
                    if bit {
                        format!("{} bits", values.len())
                    } else {
                        format!("{} registers", values.len())
                    },
                ),
            ],
            tables: vec![Table {
                space,
                start: None,
                values,
                caption: space.name().into(),
            }],
            issues,
        }
    };

    match fc {
        0x01..=0x04 => {
            let bit = fc <= 0x02;
            let as_req = n == 5;
            let as_resp = n >= 2 && pdu[1] as usize == n - 2 && (bit || (n - 2).is_multiple_of(2));
            if as_req {
                out.push(read_req(1, if bit { 2000 } else { 125 }));
            }
            if as_resp {
                out.push(read_resp(bit));
            }
        }
        0x05 | 0x06 if n == 5 => {
            let a = u16at(pdu, 1);
            let v = u16at(pdu, 3);
            let mut issues = Vec::new();
            let shown;
            if fc == 0x05 {
                shown = if v == 0xff00 {
                    "ON (FF 00)".to_string()
                } else if v == 0 {
                    "OFF (00 00)".to_string()
                } else {
                    format!("{} — only FF00 (ON) and 0000 (OFF) are valid", h4(v))
                };
                if v != 0xff00 && v != 0 {
                    issues.push("A coil value must be FF 00 or 00 00".into());
                }
            } else {
                shown = format!(
                    "{v} ({}{})",
                    h4(v),
                    if v >= 0x8000 {
                        format!(", signed {}", v as i32 - 0x10000)
                    } else {
                        String::new()
                    }
                );
            }
            out.push(Reading {
                role: Role::Echo,
                title: "Request or response — a normal response echoes the request".into(),
                fields: vec![
                    fc_field.clone(),
                    f("Address", 1, 2, format!("{a} ({})", plc_addr(space, a))),
                    f("Value", 3, 2, shown),
                ],
                tables: if fc == 0x06 {
                    vec![Table {
                        space,
                        start: Some(a),
                        values: vec![v],
                        caption: space.name().into(),
                    }]
                } else {
                    vec![]
                },
                issues,
            });
        }
        0x0f | 0x10 => {
            let bit = fc == 0x0f;
            if n == 5 {
                let a = u16at(pdu, 1);
                let q = u16at(pdu, 3);
                out.push(Reading {
                    role: Role::Response,
                    title: "As a response (confirms the written range)".into(),
                    fields: vec![
                        fc_field.clone(),
                        f(
                            "Start address",
                            1,
                            2,
                            format!("{a} ({})", plc_addr(space, a)),
                        ),
                        f("Quantity", 3, 2, q.to_string()),
                    ],
                    tables: vec![],
                    issues: vec![],
                });
            }
            if n >= 6 && pdu[5] as usize == n - 6 {
                let a = u16at(pdu, 1);
                let q = u16at(pdu, 3);
                let data = &pdu[6..];
                let mut issues = Vec::new();
                range(q, 1, if bit { 1968 } else { 123 }, "Quantity", &mut issues);
                addr_over(a, q, &mut issues);
                let want = if bit { q.div_ceil(8) } else { q * 2 };
                if pdu[5] as u32 != want {
                    issues.push(format!(
                        "Byte count {} does not match quantity {q} (should be {want})",
                        pdu[5]
                    ));
                }
                let values = if bit {
                    bits(data, (q as usize).min(data.len() * 8))
                } else {
                    regs(data)
                };
                out.push(Reading {
                    role: Role::Request,
                    title: "As a request".into(),
                    fields: vec![
                        fc_field.clone(),
                        f(
                            "Start address",
                            1,
                            2,
                            format!("{a} ({})", plc_addr(space, a)),
                        ),
                        f("Quantity", 3, 2, q.to_string()),
                        f("Byte count", 5, 1, pdu[5].to_string()),
                        f(
                            "Values",
                            6,
                            data.len(),
                            if bit {
                                format!("{} bits", values.len())
                            } else {
                                format!("{} registers", values.len())
                            },
                        ),
                    ],
                    tables: vec![Table {
                        space,
                        start: Some(a),
                        values,
                        caption: space.name().into(),
                    }],
                    issues,
                });
            }
        }
        0x17 => {
            if n >= 10 && pdu[9] as usize == n - 10 {
                let ra = u16at(pdu, 1);
                let rq = u16at(pdu, 3);
                let wa = u16at(pdu, 5);
                let wq = u16at(pdu, 7);
                let data = &pdu[10..];
                let mut issues = Vec::new();
                range(rq, 1, 125, "Read quantity", &mut issues);
                range(wq, 1, 121, "Write quantity", &mut issues);
                if pdu[9] as u32 != wq * 2 {
                    issues.push(format!(
                        "Byte count {} does not match write quantity {wq} (should be {})",
                        pdu[9],
                        wq * 2
                    ));
                }
                out.push(Reading {
                    role: Role::Request,
                    title: "As a request (the write happens before the read)".into(),
                    fields: vec![
                        fc_field.clone(),
                        f(
                            "Read start",
                            1,
                            2,
                            format!("{ra} ({})", plc_addr(space, ra)),
                        ),
                        f("Read quantity", 3, 2, rq.to_string()),
                        f(
                            "Write start",
                            5,
                            2,
                            format!("{wa} ({})", plc_addr(space, wa)),
                        ),
                        f("Write quantity", 7, 2, wq.to_string()),
                        f("Byte count", 9, 1, pdu[9].to_string()),
                        f(
                            "Values",
                            10,
                            data.len(),
                            format!("{} registers", data.len() >> 1),
                        ),
                    ],
                    tables: vec![Table {
                        space,
                        start: Some(wa),
                        values: regs(data),
                        caption: "Values to write".into(),
                    }],
                    issues,
                });
            }
            if n >= 2 && pdu[1] as usize == n - 2 && (n - 2).is_multiple_of(2) {
                out.push(read_resp(false));
            }
        }
        _ => {}
    }
    if out.is_empty() {
        let known = DECODED_FUNCS.contains(&fc);
        let mut fields = vec![fc_field.clone()];
        if n > 1 {
            fields.push(f("Data", 1, n - 1, format!("{} bytes", n - 1)));
        }
        out.push(Reading {
            role: Role::Unknown,
            title: if known { "Shape does not match".into() } else { "Function not decoded by this tool".into() },
            fields,
            tables: vec![],
            issues: if known { vec![format!("The length ({n} bytes) or byte count fits neither the request nor the response layout")] } else { vec![] },
        });
    }
    out
}

pub fn crc16(d: &[u8]) -> u16 {
    super::modbus_crc(d)
}

fn crc_bytes(b: &[u8]) -> [u8; 2] {
    let c = crc16(b);
    [(c & 0xff) as u8, (c >> 8) as u8]
}

fn crc_ok(b: &[u8]) -> bool {
    super::modbus_crc_ok(b)
}

fn mbap_ok(b: &[u8]) -> bool {
    b.len() >= 8 && b[2] == 0 && b[3] == 0 && u16at(b, 4) as usize == b.len() - 6
}

/// 바이트 한 묶음(프레임 하나)을 RTU 또는 TCP 로 풀이. 너무 짧으면 Err
pub fn decode_frame(bytes: &[u8], mode: WireMode) -> Result<Decoded, String> {
    let (wire, why) = match mode {
        WireMode::Auto => {
            let rtu = crc_ok(bytes);
            let tcp = mbap_ok(bytes);
            if rtu {
                (
                    Wire::Rtu,
                    if tcp {
                        "The CRC matches, so read as RTU (an MBAP header also fits — switch to TCP if that is wrong)".to_string()
                    } else {
                        "The trailing 2-byte CRC matches, so read as RTU".to_string()
                    },
                )
            } else if tcp {
                (Wire::Tcp, "Protocol ID is 0 and the length field equals the remaining byte count, so read as TCP".to_string())
            } else {
                (
                    Wire::Rtu,
                    "Neither the CRC nor an MBAP header fits — read as RTU with a bad CRC"
                        .to_string(),
                )
            }
        }
        WireMode::Rtu => (Wire::Rtu, "Format chosen by hand".to_string()),
        WireMode::Tcp => (Wire::Tcp, "Format chosen by hand".to_string()),
    };
    let mut notes = Vec::new();
    let (header, pdu, unit, crc): (Vec<Field>, &[u8], u8, Option<Crc>);
    if wire == Wire::Rtu {
        if bytes.len() < 4 {
            return Err(
                "An RTU frame is at least 4 bytes: address, function and a 2-byte CRC".into(),
            );
        }
        let u = bytes[0];
        let want = crc_bytes(&bytes[..bytes.len() - 2]);
        let got = [bytes[bytes.len() - 2], bytes[bytes.len() - 1]];
        let c = Crc {
            ok: got == want,
            got,
            want,
        };
        let value = if u == 0 {
            "0 — broadcast (writes only, no reply)".to_string()
        } else if u >= 248 {
            format!("{u} — reserved (device addresses are 1 to 247)")
        } else {
            u.to_string()
        };
        header = vec![Field {
            name: "Slave address".into(),
            raw: hex(&[u]),
            value,
        }];
        if !c.ok {
            notes.push(format!(
                "If you pasted the frame without its CRC, the CRC to append to all of it is {}",
                hex(&crc_bytes(bytes))
            ));
        }
        if bytes.len() > 256 {
            notes.push(format!(
                "An RTU frame is at most 256 bytes (got {})",
                bytes.len()
            ));
        }
        pdu = &bytes[1..bytes.len() - 2];
        unit = u;
        crc = Some(c);
    } else {
        if bytes.len() < 8 {
            return Err("A Modbus TCP frame is at least 8 bytes: the 7-byte MBAP header plus a function code".into());
        }
        let len = u16at(bytes, 4) as usize;
        let proto = u16at(bytes, 2);
        let u = bytes[6];
        header = vec![
            Field {
                name: "Transaction ID".into(),
                raw: hex(&bytes[0..2]),
                value: format!(
                    "{} — the response carries the same number as its request",
                    u16at(bytes, 0)
                ),
            },
            Field {
                name: "Protocol ID".into(),
                raw: hex(&bytes[2..4]),
                value: if proto == 0 {
                    "0 — Modbus".into()
                } else {
                    format!("{proto} — must be 0 for Modbus")
                },
            },
            Field {
                name: "Length".into(),
                raw: hex(&bytes[4..6]),
                value: if len == bytes.len() - 6 {
                    format!("{len} — bytes from Unit ID to the end (matches)")
                } else {
                    format!("{len} — but {} bytes follow (mismatch)", bytes.len() - 6)
                },
            },
            Field {
                name: "Unit ID".into(),
                raw: hex(&[u]),
                value: format!(
                    "{u} — slave address behind a gateway; a TCP device addressed directly usually ignores it (255 recommended)"
                ),
            },
        ];
        if proto != 0 {
            notes.push("Protocol ID is not 0".into());
        }
        if len != bytes.len() - 6 {
            notes.push(format!("The length field ({len}) differs from the bytes that follow ({}) — the frame may be cut off or two frames joined", bytes.len() - 6));
        }
        pdu = &bytes[7..];
        if pdu.len() > 253 {
            notes.push(format!("A PDU is at most 253 bytes (got {})", pdu.len()));
        }
        unit = u;
        crc = None;
    }
    if pdu.is_empty() {
        return Err("No function code".into());
    }
    let fc = pdu[0];
    Ok(Decoded {
        wire,
        auto: mode == WireMode::Auto,
        why,
        header,
        crc,
        unit,
        fc,
        fname: func_name(fc).to_string(),
        readings: decode_pdu(pdu),
        notes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_crc(b: &[u8]) -> Vec<u8> {
        let mut v = b.to_vec();
        v.extend(crc_bytes(b));
        v
    }
    fn val<'a>(r: &'a Reading, name: &str) -> Option<&'a str> {
        r.fields
            .iter()
            .find(|f| f.name == name)
            .map(|f| f.value.as_str())
    }
    fn dec(b: &[u8]) -> Decoded {
        decode_frame(b, WireMode::Auto).unwrap()
    }

    // core read_holding_request_and_response
    #[test]
    fn read_03_request_response() {
        let req = dec(&with_crc(&[0x01, 0x03, 0x00, 0x6b, 0x00, 0x03]));
        assert_eq!(req.wire, Wire::Rtu);
        assert!(req.crc.as_ref().unwrap().ok);
        assert_eq!(req.readings.len(), 1);
        assert_eq!(req.readings[0].role, Role::Request);
        assert_eq!(val(&req.readings[0], "Start address"), Some("107 (40108)"));
        let resp = dec(&with_crc(&[
            0x01, 0x03, 0x06, 0x02, 0x2b, 0x00, 0x00, 0x00, 0x64,
        ]));
        assert_eq!(resp.readings[0].role, Role::Response);
        assert_eq!(resp.readings[0].tables[0].values, vec![555, 0, 100]);
    }

    // core ambiguous_coil_response
    #[test]
    fn coil_byte_count_3_is_both() {
        let d = dec(&with_crc(&[0x01, 0x01, 0x03, 0xff, 0x00, 0x01]));
        assert_eq!(
            d.readings.iter().map(|r| r.role).collect::<Vec<_>>(),
            vec![Role::Request, Role::Response]
        );
        assert_eq!(d.readings[1].tables[0].values.len(), 24);
    }

    // core exception_and_bad_crc
    #[test]
    fn exception_and_bad_crc() {
        let ex = dec(&with_crc(&[0x01, 0x83, 0x02]));
        assert_eq!(ex.readings[0].role, Role::Exception);
        assert!(
            val(&ex.readings[0], "Exception code")
                .unwrap()
                .contains("Illegal Data Address")
        );
        assert_eq!(ex.fc, 0x83);
        let mut bad = with_crc(&[0x01, 0x06, 0x00, 0x01, 0x00, 0x03]);
        bad[5] = 0x04;
        let d = dec(&bad);
        assert!(!d.crc.as_ref().unwrap().ok);
        let want = with_crc(&[0x01, 0x06, 0x00, 0x01, 0x00, 0x04]);
        assert_eq!(
            d.crc.unwrap().want.to_vec(),
            want[want.len() - 2..].to_vec()
        );
    }

    // core write_multiple_registers_request
    #[test]
    fn write_10_request_and_response() {
        let req = dec(&with_crc(&[
            0x01, 0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0a, 0x01, 0x02,
        ]));
        assert_eq!(req.readings[0].role, Role::Request);
        assert_eq!(req.readings[0].tables[0].values, vec![10, 258]);
        assert!(req.readings[0].issues.is_empty());
        let resp = dec(&with_crc(&[1, 0x10, 0, 100, 0, 2]));
        assert_eq!(resp.readings[0].role, Role::Response);
    }

    #[test]
    fn write_0f_bits_and_05_echo() {
        let d = dec(&with_crc(&[1, 0x0f, 0, 0, 0, 3, 1, 0b101]));
        assert_eq!(d.readings[0].tables[0].values, vec![1, 0, 1]);
        let c = dec(&with_crc(&[2, 5, 0, 3, 0xff, 0]));
        assert_eq!(c.readings[0].role, Role::Echo);
        assert!(val(&c.readings[0], "Value").unwrap().starts_with("ON"));
        assert!(val(&c.readings[0], "Address").unwrap().contains("00004"));
        let wrong = dec(&with_crc(&[2, 5, 0, 3, 0x12, 0x34]));
        assert_eq!(wrong.readings[0].issues.len(), 1);
    }

    // core new_function_names_and_fields
    #[test]
    fn rw_17_request() {
        let rw = dec(&with_crc(&[
            0x01, 0x17, 0, 0, 0, 2, 0, 5, 0, 1, 2, 0x12, 0x34,
        ]));
        assert_eq!(rw.readings[0].role, Role::Request);
        assert_eq!(rw.readings[0].tables[0].values, vec![0x1234]);
        assert_eq!(rw.readings[0].tables[0].start, Some(5));
        assert!(rw.readings[0].issues.is_empty());
    }

    #[test]
    fn modbus_tcp_auto() {
        let req = dec(&[0, 7, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2]);
        assert_eq!(req.wire, Wire::Tcp);
        assert_eq!(req.unit, 1);
        assert_eq!(req.header[0].raw, "00 07");
        assert_eq!(req.readings[0].role, Role::Request);
        let resp = dec(&[0, 7, 0, 0, 0, 7, 1, 3, 4, 0, 5, 0, 6]);
        assert_eq!(resp.wire, Wire::Tcp);
        assert_eq!(resp.readings[0].tables[0].values, vec![5, 6]);
        let bad = [0, 1, 0, 1, 0, 6, 1, 3, 0, 0, 0, 1];
        assert_eq!(dec(&bad).wire, Wire::Rtu);
        assert!(!decode_frame(&bad, WireMode::Tcp).unwrap().notes.is_empty());
    }

    // core AddrStyle plc
    #[test]
    fn address_notation() {
        assert_eq!(plc_addr(Space::Hr, 0), "40001");
        assert_eq!(plc_addr(Space::Co, 3), "00004");
        assert_eq!(plc_addr(Space::Ir, 0x2710), "310001");
        let rows = table_rows(
            &Table {
                space: Space::Hr,
                start: Some(0),
                values: vec![1, 0xffff],
                caption: String::new(),
            },
            Some(0),
        );
        assert_eq!(
            rows[1],
            Row {
                i: 1,
                zero: "1".into(),
                plc: "40002".into(),
                dec: 65535,
                signed: -1,
                hex: "0xFFFF".into()
            }
        );
        assert_eq!(
            table_rows(
                &Table {
                    space: Space::Hr,
                    start: None,
                    values: vec![1],
                    caption: String::new()
                },
                None
            )[0]
            .zero,
            "+0"
        );
    }

    #[test]
    fn short_and_misshaped() {
        assert!(decode_frame(&[1, 3, 0], WireMode::Auto).is_err());
        assert!(decode_frame(&[0, 1, 0, 0, 0, 1, 1], WireMode::Tcp).is_err());
        assert_eq!(
            dec(&with_crc(&[1, 3, 0, 0])).readings[0].role,
            Role::Unknown
        );
        assert_eq!(
            dec(&with_crc(&[1, 3, 0, 0, 0, 200])).readings[0]
                .issues
                .len(),
            1
        );
    }
}
