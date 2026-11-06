//! 산업 프로토콜 PDU 를 해석 트리·필드로 — 요청/응답 짝·응답 시간·Expert 표시 포함.
//!
//! 필드 이름: Modbus 는 Wireshark dfref(`mbtcp.*`·`modbus.*`), MC·XGT 는 Wireshark 에 없어 PortDock 이 정한 `mc.*`·`xgt.*`.

use super::{App, classify_ports, frame_len, mc, modbus, peek, sniff, xgt};
use crate::analysis::{Analysis, PairStatus, PduLoc, PduRec, ann};
use crate::dissect::*;
use crate::industrial::FrameLen;

/// TCP·UDP 데이터를 산업 프로토콜로 푼다. 분석이 있으면 분석이 조립한 PDU 를, 없으면 이 프레임 데이터를 직접 잘라 푼다.
pub(crate) fn dissect_payload(z: &mut Dz, from: usize, end: usize, sp: u16, dp: u16, tcp: bool) {
    let f = z.f;
    let ctx = z.ctx;
    if let Some(an) = ctx.analysis {
        let no = z.meta.number;
        let pdus = an.pdus_of(no);
        if !pdus.is_empty() {
            let first = z.ann().map(|a| a.pdu_first as usize).unwrap_or(0);
            for (k, p) in pdus.iter().enumerate() {
                let (base, bytes): (usize, &[u8]) = match &p.loc {
                    PduLoc::InFrame(off, len) => {
                        (*off as usize, &f[*off as usize..(*off + *len) as usize])
                    }
                    PduLoc::Owned(b) => (from, &b[..]),
                };
                let clamp_owned = matches!(p.loc, PduLoc::Owned(_));
                pdu(
                    z,
                    p.app,
                    bytes,
                    base,
                    from,
                    end,
                    clamp_owned,
                    Some((p, first + k)),
                    Some(an),
                );
            }
            return;
        }
        if z.ann().is_some_and(|a| a.flags & ann::SEGMENT_OF_PDU != 0) {
            z.text(from, end - from, || {
                "[TCP segment of a reassembled PDU]".into()
            });
        }
        return;
    }
    // 분석 없이 — 포트 목록, 없으면 모양으로
    let payload = &f[from..end];
    let prefs = ctx.prefs;
    let (app, req_side) = match classify_ports(prefs, dp, 0) {
        Some(a) => (a, true),
        None => match classify_ports(prefs, sp, 0) {
            Some(a) => (a, false),
            None if prefs.auto_detect => match sniff(payload, !tcp) {
                Some(a) => (a, true),
                None => return,
            },
            None => return,
        },
    };
    let mut off = 0;
    while off < payload.len() {
        let rest = &payload[off..];
        match frame_len(app, rest) {
            FrameLen::Len(n) if n <= rest.len() => {
                let bytes = &rest[..n];
                let _ = peek(app, bytes, req_side);
                pdu(z, app, bytes, from + off, from, end, false, None, None);
                off += n;
            }
            _ => {
                if off == 0 {
                    z.text(from, end - from, || {
                        "[Incomplete PDU — decode with analysis for TCP reassembly]".into()
                    });
                }
                break;
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn pdu(
    z: &mut Dz,
    app: App,
    bytes: &[u8],
    base: usize,
    from: usize,
    end: usize,
    clamp_owned: bool,
    rec: Option<(&PduRec, usize)>,
    an: Option<&Analysis>,
) {
    let (old_shift, old_clamp) = (z.shift, z.clamp);
    z.shift = base as i64;
    z.clamp = if clamp_owned {
        (from as u32, end as u32)
    } else {
        (0, z.f.len() as u32)
    };
    let is_req = rec.map(|r| r.0.is_req).unwrap_or(true);
    match app {
        App::Modbus | App::ModbusRtu => modbus_view(z, app, bytes, is_req, rec, an),
        App::Mc => mc_view(z, bytes, rec, an),
        App::Xgt => xgt_view(z, bytes, rec, an),
    }
    z.shift = old_shift;
    z.clamp = old_clamp;
}

fn pair_bytes<'a>(
    z: &Dz<'a>,
    rec: Option<(&PduRec, usize)>,
    an: Option<&'a Analysis>,
) -> Option<&'a [u8]> {
    let (r, _) = rec?;
    if r.pair == u32::MAX {
        return None;
    }
    Some(an?.pdu_bytes(z.ctx.capture?, r.pair as usize))
}

/// 짝·응답 시간·무응답 표시 — `proto` 는 필드 이름 머리(modbus·mc·xgt)
fn pair_fields(
    z: &mut Dz,
    proto: &'static str,
    rec: Option<(&PduRec, usize)>,
    an: Option<&Analysis>,
    len: usize,
) {
    let Some((r, _)) = rec else { return };
    let Some(an) = an else { return };
    let (rf, rt, resp_in) = match proto {
        "modbus" => ("modbus.request_frame", "modbus.response_time", ""),
        "mc" => ("mc.request_frame", "mc.response_time", "mc.response_in"),
        _ => ("xgt.request_frame", "xgt.response_time", "xgt.response_in"),
    };
    if r.pair != u32::MAX {
        let other = &an.pdus[r.pair as usize];
        if !r.is_req {
            let fno = other.frame as u64;
            z.fld(rf, Value::U(fno), 0, 0, || format!("Request Frame: {fno}"));
            if r.resp_ns >= 0 {
                let t = r.resp_ns as f64 / 1e9;
                z.fld(rt, Value::F(t), 0, 0, || {
                    format!("Time from request: {t:.9} seconds")
                });
            }
        } else if !resp_in.is_empty() {
            let fno = other.frame as u64;
            let name: &'static str = resp_in;
            z.fld(name, Value::U(fno), 0, 0, || format!("Response In: {fno}"));
        }
        if r.unit_mismatch {
            z.expert(
                Severity::Warn,
                "modbus.unit_mismatch",
                "Unit ID differs between the request and its response",
                0,
                len,
            );
        }
    }
    match r.status {
        PairStatus::Timeout => z.expert(
            Severity::Warn,
            "pair.no_response",
            "No response to this request within the timeout",
            0,
            len,
        ),
        PairStatus::Closed => z.expert(
            Severity::Warn,
            "pair.closed",
            "The connection was closed before a response arrived",
            0,
            len,
        ),
        PairStatus::CaptureEnd => z.expert(
            Severity::Note,
            "pair.capture_end",
            "The capture ended before a response could be expected",
            0,
            len,
        ),
        PairStatus::Orphan => z.expert(
            Severity::Warn,
            "pair.orphan",
            "Response without a matching request in the capture",
            0,
            len,
        ),
        _ => {}
    }
}

// ---------------------------------------------------------------- Modbus

fn be(b: &[u8], i: usize) -> Option<u16> {
    Some(((*b.get(i)? as u16) << 8) | *b.get(i + 1)? as u16)
}

fn modbus_view(
    z: &mut Dz,
    app: App,
    b: &[u8],
    is_req: bool,
    rec: Option<(&PduRec, usize)>,
    an: Option<&Analysis>,
) {
    let n = b.len();
    let (pdu_at, pdu_end) = if app == App::Modbus {
        (7usize, n)
    } else {
        (1, n.saturating_sub(2))
    };
    if n < pdu_at + 1 || pdu_end <= pdu_at {
        return;
    }
    let pdu = &b[pdu_at..pdu_end];
    let fc = pdu[0];
    let exc = fc & 0x80 != 0;
    let f7 = fc & 0x7f;
    if app == App::Modbus {
        z.layer("mbtcp");
        z.proto("mbtcp", 0, 7);
        let tid = be(b, 0).unwrap_or(0);
        let unit = b[6];
        z.open("mbtcp", 0, 7, || {
            format!("Modbus/TCP: Trans: {tid}; Unit: {unit}")
        });
        z.fld("mbtcp.trans_id", Value::U(tid as u64), 0, 2, || {
            format!("Transaction Identifier: {tid}")
        });
        let pid = be(b, 2).unwrap_or(0);
        z.fld("mbtcp.prot_id", Value::U(pid as u64), 2, 2, || {
            format!("Protocol Identifier: {pid}")
        });
        let len = be(b, 4).unwrap_or(0);
        z.fld("mbtcp.len", Value::U(len as u64), 4, 2, || {
            format!("Length: {len}")
        });
        z.fld("mbtcp.unit_id", Value::U(unit as u64), 6, 1, || {
            format!("Unit Identifier: {unit}")
        });
        z.close();
    } else {
        z.layer("modbus");
        z.proto("modbus", 0, n);
        z.open("modbus", 0, n, || "Modbus RTU over TCP".to_string());
        let u = b[0];
        z.fld("modbus.rtu.unit_id", Value::U(u as u64), 0, 1, || {
            format!("Slave address: {u}")
        });
        if app == App::ModbusRtu {
            let ok = super::modbus_crc_ok(b);
            z.text(n - 2, 2, || {
                format!("CRC: {}", if ok { "correct" } else { "wrong" })
            });
        }
        z.close();
    }
    if app == App::Modbus {
        z.layer("modbus");
    }
    z.proto("modbus", pdu_at, pdu_end - pdu_at);
    let fname = modbus::func_name(fc);
    z.open("modbus", pdu_at, pdu_end - pdu_at, || {
        format!("Modbus: {}", if is_req { "Query" } else { "Response" })
    });
    z.fld("modbus.func_code", Value::U(f7 as u64), pdu_at, 1, || {
        format!("Function Code: {fname} ({f7})")
    });
    z.hid("modbus.exception", Value::B(exc), pdu_at, 1);
    let space = match f7 {
        1 | 5 | 15 => modbus::Space::Co,
        2 => modbus::Space::Di,
        4 => modbus::Space::Ir,
        _ => modbus::Space::Hr,
    };
    // 응답에서 시작 주소를 알려면 짝 요청이 필요하다
    let req_bytes = if !is_req {
        pair_bytes(z, rec, an)
    } else {
        None
    };
    let req_start: Option<(u16, u16)> = req_bytes.and_then(|rb| {
        let off = if app == App::Modbus { 7 } else { 1 };
        let p = rb.get(off..)?;
        if (p.first()? & 0x7f) == f7 {
            Some((be(p, 1)?, be(p, 3).unwrap_or(0)))
        } else {
            None
        }
    });
    let at = |i: usize| pdu_at + i;
    let mut start_for_names: Option<u16> = None;
    let mut reg_at = 0usize;
    let mut reg_n = 0usize;
    if exc {
        if let Some(&c) = pdu.get(1) {
            z.fld(
                "modbus.exception_code",
                Value::U(c as u64),
                at(1),
                1,
                || {
                    format!(
                        "Exception Code: {} ({c})",
                        modbus::exception_name(c).unwrap_or("?")
                    )
                },
            );
            z.expert_c(
                Severity::Warn,
                "modbus.exception",
                c as u32,
                format!(
                    "Modbus exception {c}: {}",
                    modbus::exception_name(c).unwrap_or("unknown")
                ),
                at(1),
                1,
            );
        }
    } else {
        match (f7, is_req) {
            (1..=4, true) => {
                if let (Some(a), Some(q)) = (be(pdu, 1), be(pdu, 3)) {
                    z.fld("modbus.reference_num", Value::U(a as u64), at(1), 2, || {
                        format!(
                            "Reference Number: {a} ({})",
                            modbus::plc_addr(space, a as u32)
                        )
                    });
                    if f7 <= 2 {
                        z.fld("modbus.bit_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Bit Count: {q}")
                        });
                    } else {
                        z.fld("modbus.word_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Word Count: {q}")
                        });
                    }
                }
            }
            (1..=4, false) => {
                if let Some(&bc) = pdu.get(1) {
                    z.fld("modbus.byte_cnt", Value::U(bc as u64), at(1), 1, || {
                        format!("Byte Count: {bc}")
                    });
                    let data = pdu.get(2..2 + bc as usize).unwrap_or(&[]);
                    if f7 <= 2 {
                        let count = req_start
                            .map(|(_, q)| q as usize)
                            .unwrap_or(data.len() * 8)
                            .min(data.len() * 8);
                        for i in 0..count {
                            let bit = (data[i >> 3] >> (i & 7)) & 1 != 0;
                            z.fld("modbus.bitval", Value::B(bit), at(2 + (i >> 3)), 1, || {
                                format!("Bit {}: {}", i + 1, u8::from(bit))
                            });
                        }
                    } else {
                        start_for_names = req_start.map(|(a, _)| a);
                        reg_at = 2;
                        reg_n = data.len() / 2;
                        regs(z, pdu, at(0), 2, reg_n);
                    }
                }
            }
            (5, _) | (6, _) => {
                if let (Some(a), Some(v)) = (be(pdu, 1), be(pdu, 3)) {
                    z.fld("modbus.reference_num", Value::U(a as u64), at(1), 2, || {
                        format!(
                            "Reference Number: {a} ({})",
                            modbus::plc_addr(space, a as u32)
                        )
                    });
                    if f7 == 5 {
                        z.fld("modbus.bitval", Value::B(v == 0xff00), at(3), 2, || {
                            format!(
                                "Data: {v:04X} ({})",
                                if v == 0xff00 {
                                    "ON"
                                } else if v == 0 {
                                    "OFF"
                                } else {
                                    "invalid"
                                }
                            )
                        });
                    } else {
                        z.fld("modbus.regval_uint16", Value::U(v as u64), at(3), 2, || {
                            format!("Register Number: {a} (UINT16): {v}")
                        });
                        start_for_names = Some(a);
                        reg_at = 3;
                        reg_n = 1;
                    }
                }
            }
            (15 | 16, true) => {
                if let (Some(a), Some(q), Some(&bc)) = (be(pdu, 1), be(pdu, 3), pdu.get(5)) {
                    z.fld("modbus.reference_num", Value::U(a as u64), at(1), 2, || {
                        format!(
                            "Reference Number: {a} ({})",
                            modbus::plc_addr(space, a as u32)
                        )
                    });
                    if f7 == 15 {
                        z.fld("modbus.bit_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Bit Count: {q}")
                        });
                    } else {
                        z.fld("modbus.word_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Word Count: {q}")
                        });
                    }
                    z.fld("modbus.byte_cnt", Value::U(bc as u64), at(5), 1, || {
                        format!("Byte Count: {bc}")
                    });
                    if f7 == 16 {
                        start_for_names = Some(a);
                        reg_at = 6;
                        reg_n = pdu.len().saturating_sub(6) / 2;
                        regs(z, pdu, at(0), 6, reg_n);
                    } else if pdu.len() > 6 {
                        let l = pdu.len() - 6;
                        z.fld(
                            "modbus.data",
                            Value::Bytes(at(6) as u32, l as u32),
                            at(6),
                            l,
                            || format!("Data ({l} bytes)"),
                        );
                    }
                }
            }
            (15 | 16, false) => {
                if let (Some(a), Some(q)) = (be(pdu, 1), be(pdu, 3)) {
                    z.fld("modbus.reference_num", Value::U(a as u64), at(1), 2, || {
                        format!(
                            "Reference Number: {a} ({})",
                            modbus::plc_addr(space, a as u32)
                        )
                    });
                    if f7 == 15 {
                        z.fld("modbus.bit_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Bit Count: {q}")
                        });
                    } else {
                        z.fld("modbus.word_cnt", Value::U(q as u64), at(3), 2, || {
                            format!("Word Count: {q}")
                        });
                    }
                }
            }
            (23, true) => {
                if let (Some(ra), Some(rq), Some(wa), Some(wq), Some(&bc)) =
                    (be(pdu, 1), be(pdu, 3), be(pdu, 5), be(pdu, 7), pdu.get(9))
                {
                    z.fld(
                        "modbus.read_reference_num",
                        Value::U(ra as u64),
                        at(1),
                        2,
                        || format!("Read Reference Number: {ra}"),
                    );
                    z.fld(
                        "modbus.read_word_cnt",
                        Value::U(rq as u64),
                        at(3),
                        2,
                        || format!("Read Word Count: {rq}"),
                    );
                    z.fld(
                        "modbus.write_reference_num",
                        Value::U(wa as u64),
                        at(5),
                        2,
                        || format!("Write Reference Number: {wa}"),
                    );
                    z.fld(
                        "modbus.write_word_cnt",
                        Value::U(wq as u64),
                        at(7),
                        2,
                        || format!("Write Word Count: {wq}"),
                    );
                    z.fld("modbus.byte_cnt", Value::U(bc as u64), at(9), 1, || {
                        format!("Byte Count: {bc}")
                    });
                    regs(z, pdu, at(0), 10, pdu.len().saturating_sub(10) / 2);
                }
            }
            (23, false) => {
                if let Some(&bc) = pdu.get(1) {
                    z.fld("modbus.byte_cnt", Value::U(bc as u64), at(1), 1, || {
                        format!("Byte Count: {bc}")
                    });
                    regs(z, pdu, at(0), 2, pdu.len().saturating_sub(2) / 2);
                }
            }
            _ => {
                if pdu.len() > 1 {
                    let l = pdu.len() - 1;
                    z.fld(
                        "modbus.data",
                        Value::Bytes(at(1) as u32, l as u32),
                        at(1),
                        l,
                        || format!("Data ({l} bytes)"),
                    );
                }
            }
        }
        // 규격과 다른 점은 Note 로
        let kind_ok = if z.o.tree {
            modbus::decode_pdu(pdu)
        } else {
            Vec::new()
        };
        for r in &kind_ok {
            for i in &r.issues {
                if r.role != modbus::Role::Response || f7 > 4 {
                    z.expert(Severity::Note, "modbus.issue", i.clone(), at(0), pdu.len());
                }
            }
        }
    }
    // 장비 맵 — 주소 → 이름
    if let (Some(namer), Some(start)) = (z.ctx.namer, start_for_names) {
        let rs: Vec<u16> = (0..reg_n).filter_map(|i| be(pdu, reg_at + i * 2)).collect();
        let mut i = 0usize;
        while i < reg_n {
            let addr = start as u32 + i as u32;
            if let Some(d) = namer.describe(space, addr) {
                let w = (d.words as usize).max(1);
                let val = crate::devmap::format_value(&d, &rs[i..])
                    .unwrap_or_else(|| format!("{}", rs[i]));
                let label = format!("{} {} = {}", modbus::plc_addr(space, addr), d.name_en, val);
                z.text(at(reg_at + i * 2), 2 * w.min(reg_n - i), move || label);
                i += w;
            } else {
                i += 1;
            }
        }
    }
    pair_fields(z, "modbus", rec, an, n);
    z.close();
    let tid = if app == App::Modbus {
        be(b, 0).unwrap_or(0)
    } else {
        0
    };
    let unit = if app == App::Modbus { b[6] } else { b[0] };
    let kind = if is_req { "Query" } else { "Response" };
    z.col(
        if app == App::Modbus {
            "Modbus/TCP"
        } else {
            "Modbus/RTU"
        },
        || {
            let mut s = format!(
                "{kind}: {}Unit: {unit}, Func: {fc}: {fname}",
                if app == App::Modbus {
                    format!("Trans: {tid}; ")
                } else {
                    String::new()
                }
            );
            if exc {
                s.push_str(". Exception returned");
            }
            s
        },
    );
}

/// 레지스터 값들을 필드로 — `pdu_at` 은 PDU 시작(프레임 안), `first` 는 PDU 안 첫 레지스터 위치
fn regs(z: &mut Dz, pdu: &[u8], pdu_at: usize, first: usize, n: usize) {
    for i in 0..n {
        if let Some(v) = be(pdu, first + i * 2) {
            z.fld(
                "modbus.regval_uint16",
                Value::U(v as u64),
                pdu_at + first + i * 2,
                2,
                || format!("Register {}: {v} (0x{v:04X})", i + 1),
            );
        }
    }
}

// ---------------------------------------------------------------- MC

fn raw_num(raw: &str, ascii: bool) -> u64 {
    if ascii {
        u64::from_str_radix(raw.trim(), 16).unwrap_or(0)
    } else {
        raw.split(' ').rev().fold(0u64, |a, h| {
            a * 256 + u64::from_str_radix(h, 16).unwrap_or(0)
        })
    }
}

fn mc_name(n: &str) -> Option<&'static str> {
    Some(match n {
        "Serial number" => "mc.serial",
        "Network No." => "mc.network",
        "PC No. (station)" => "mc.station",
        "Request destination module I/O No." => "mc.io",
        "Request destination module station No. (multidrop)" => "mc.drop",
        "Request data length" | "Response data length" => "mc.length",
        "Monitoring timer" => "mc.timer",
        "Command" => "mc.command",
        "Subcommand" => "mc.subcommand",
        "End code" => "mc.end_code",
        _ => return None,
    })
}

fn mc_view(z: &mut Dz, b: &[u8], rec: Option<(&PduRec, usize)>, an: Option<&Analysis>) {
    let pair = pair_bytes(z, rec, an).and_then(|pb| mc::decode_mc_bytes(pb, None).ok());
    let d = match mc::decode_mc_bytes(b, pair.as_ref()) {
        Ok(d) => d,
        Err(e) => {
            z.layer("mc");
            z.proto("mc", 0, b.len());
            z.text(0, b.len(), || format!("MC (SLMP): {e}"));
            return;
        }
    };
    let ascii = d.code == mc::McCode::Ascii;
    let resp = d.dir == mc::Dir::Response;
    let fr = if d.frame == mc::McFrame::E3 {
        "3E"
    } else {
        "4E"
    };
    z.layer("mc");
    z.proto("mc", 0, b.len());
    z.open("mc", 0, b.len(), || {
        format!(
            "MC (SLMP) {fr} {} ({})",
            if resp { "response" } else { "request" },
            if ascii { "ASCII" } else { "binary" }
        )
    });
    z.hid("mc.is_response", Value::B(resp), 0, 0);
    for f in d.header.iter().chain(d.body.iter()) {
        let len = f.end.saturating_sub(f.start);
        let label = format!("{}: {}", f.name, f.value);
        match mc_name(&f.name) {
            Some(name) => {
                let v = raw_num(&f.raw, ascii);
                z.fld(name, Value::U(v), f.start, len, move || label);
            }
            None => {
                if f.name == "Head device" {
                    let dev = f.value.split(" — ").next().unwrap_or("").to_string();
                    z.fld("mc.device", Value::Str(dev), f.start, len, move || label);
                } else if f.name == "Number of device points" {
                    let n: u64 = f
                        .value
                        .split(' ')
                        .next()
                        .and_then(|x| x.parse().ok())
                        .unwrap_or(0);
                    z.fld("mc.points", Value::U(n), f.start, len, move || label);
                } else {
                    z.text(f.start, len, move || label);
                }
            }
        }
    }
    if let Some(c) = &d.items_caption {
        let caption = c.clone();
        z.open("", b.len(), 0, move || caption);
        for it in &d.items {
            let l = format!("{} = {} (0x{:X})", it.addr, it.value, it.value);
            z.text(b.len(), 0, move || l);
        }
        z.close();
    }
    for n in &d.notes {
        let t = n.clone();
        z.text(0, 0, move || t);
    }
    if let Some(sim) = d.sim_end.filter(|&c| c != 0) {
        z.text(0, 0, move || {
            format!("[A PLC like PortDock PLC Simulator would answer end code {sim:04X}]")
        });
    }
    if let Some(code) = d.end_code.filter(|&c| c != 0) {
        z.expert_c(
            Severity::Warn,
            "mc.end_code",
            code,
            format!("MC end code {code:04X}: {}", mc::end_text(code)),
            0,
            b.len(),
        );
    }
    pair_fields(z, "mc", rec, an, b.len());
    z.close();
    let mut info = String::new();
    if z.o.columns {
        // 응답에는 명령 이름이 없다 — 짝 요청의 것을 빌린다
        let src = if d.command_name.is_some() {
            Some(&d)
        } else {
            pair.as_ref()
        };
        let name = src.and_then(|x| x.command_name.clone()).unwrap_or_default();
        info = format!("{fr} {} {name}", if resp { "Response" } else { "Request" });
        let dev = src
            .and_then(|x| x.body.iter().find(|f| f.name == "Head device"))
            .map(|f| f.value.split(" — ").next().unwrap_or("").to_string());
        let n = src
            .and_then(|x| x.body.iter().find(|f| f.name == "Number of device points"))
            .and_then(|f| {
                f.value
                    .split(' ')
                    .next()
                    .and_then(|x| x.parse::<u64>().ok())
            });
        if let (Some(dev), Some(n)) = (dev, n) {
            info.push_str(&format!(" {dev} ×{n}"));
        }
        if let Some(e) = d.end_code {
            info.push_str(&format!(" end code {e:04X}"));
        }
    }
    z.col("MC", move || info);
}

// ---------------------------------------------------------------- XGT

fn xgt_name(n: &str) -> Option<&'static str> {
    Some(match n {
        "Invoke ID" => "xgt.invoke",
        "Length" => "xgt.length",
        "Source of frame" => "xgt.source",
        "Instruction" => "xgt.command",
        "Data type" => "xgt.data_type",
        "Error code" => "xgt.error_code",
        _ => return None,
    })
}

fn xgt_view(z: &mut Dz, b: &[u8], rec: Option<(&PduRec, usize)>, an: Option<&Analysis>) {
    let pair = pair_bytes(z, rec, an);
    let d = match xgt::decode_xgt(b, pair) {
        Ok(d) => d,
        Err(e) => {
            z.layer("xgt");
            z.proto("xgt", 0, b.len());
            z.text(0, b.len(), || format!("LS XGT FEnet: {e}"));
            return;
        }
    };
    let resp = d.dir == xgt::Dir::Response;
    z.layer("xgt");
    z.proto("xgt", 0, b.len());
    z.open("xgt", 0, b.len(), || {
        format!("LS XGT FEnet {}", if resp { "response" } else { "request" })
    });
    z.hid("xgt.is_response", Value::B(resp), 0, 0);
    for f in d.header.iter().chain(d.body.iter()) {
        let len = f.end.saturating_sub(f.start);
        let label = format!("{}: {}", f.name, f.value);
        if let Some(name) = xgt_name(&f.name) {
            let v = match name {
                "xgt.invoke" => d.invoke as u64,
                "xgt.command" => d.command as u64,
                "xgt.data_type" => d.data_type as u64,
                "xgt.error_code" => d.error.unwrap_or(0) as u64,
                "xgt.length" => b.len().saturating_sub(20) as u64,
                _ => b.get(13).copied().unwrap_or(0) as u64,
            };
            z.fld(name, Value::U(v), f.start, len, move || label);
        } else if f.name.starts_with("Variable ") && !f.name.starts_with("Variable length") {
            let text: String = f
                .raw
                .split(' ')
                .filter_map(|h| u8::from_str_radix(h, 16).ok())
                .map(|c| c as char)
                .collect();
            z.fld("xgt.variable", Value::Str(text), f.start, len, move || {
                label
            });
        } else {
            z.text(f.start, len, move || label);
        }
    }
    if !d.items.is_empty() {
        z.open("", b.len(), 0, || "Values".to_string());
        for it in &d.items {
            let l = format!("{} = {} (0x{})", it.addr, it.value, it.hex);
            z.text(b.len(), 0, move || l);
        }
        z.close();
    }
    for n in &d.notes {
        let t = n.clone();
        z.text(0, 0, move || t);
    }
    if let Some(code) = d.error.filter(|&c| c != 0) {
        z.expert_c(
            Severity::Warn,
            "xgt.error",
            code,
            format!("XGT error h{code:04X}: {}", xgt::err_text(code & 0xff)),
            0,
            b.len(),
        );
    }
    pair_fields(z, "xgt", rec, an, b.len());
    z.close();
    let mut info = String::new();
    if z.o.columns {
        info = xgt::command_name(d.command, d.data_type).to_string();
        let vars: Vec<String> =
            z.d.fields
                .iter()
                .filter(|f| f.name == "xgt.variable")
                .filter_map(|f| {
                    if let Value::Str(s) = &f.value {
                        Some(s.clone())
                    } else {
                        None
                    }
                })
                .collect();
        if !vars.is_empty() {
            info.push(' ');
            info.push_str(&vars.join(", "));
        }
        if let Some(e) = d.error.filter(|&c| c != 0) {
            info.push_str(&format!(" — error h{e:04X}"));
        }
    }
    z.col("XGT", move || info);
}
