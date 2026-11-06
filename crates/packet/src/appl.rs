//! DNS·DHCP 해석 (UDP). 필드 이름은 Wireshark dfref 의 `dns.*`·`dhcp.*`.

use crate::dissect::*;

fn dns_type(t: u16) -> &'static str {
    match t {
        1 => "A",
        2 => "NS",
        5 => "CNAME",
        6 => "SOA",
        12 => "PTR",
        15 => "MX",
        16 => "TXT",
        28 => "AAAA",
        33 => "SRV",
        65 => "HTTPS",
        255 => "ANY",
        _ => "?",
    }
}

fn rcode_name(r: u16) -> &'static str {
    match r {
        0 => "No error",
        1 => "Format error",
        2 => "Server failure",
        3 => "No such name",
        4 => "Not implemented",
        5 => "Refused",
        _ => "Other",
    }
}

/// 이름 읽기(압축 포인터 따라감). (이름, 다음 위치)
fn name_at(f: &[u8], base: usize, mut i: usize) -> Option<(String, usize)> {
    let mut out = String::new();
    let mut next = None;
    let mut hops = 0;
    loop {
        let l = *f.get(i)? as usize;
        if l == 0 {
            i += 1;
            break;
        }
        if l & 0xc0 == 0xc0 {
            let p = ((l & 0x3f) << 8) | *f.get(i + 1)? as usize;
            if next.is_none() {
                next = Some(i + 2);
            }
            i = base + p;
            hops += 1;
            if hops > 16 {
                return None;
            }
            continue;
        }
        if l > 63 {
            return None;
        }
        let lab = f.get(i + 1..i + 1 + l)?;
        if !out.is_empty() {
            out.push('.');
        }
        out.push_str(&String::from_utf8_lossy(lab));
        i += 1 + l;
    }
    if out.is_empty() {
        out.push_str("<Root>");
    }
    Some((out, next.unwrap_or(i)))
}

pub(crate) fn dns(z: &mut Dz, from: usize, end: usize) {
    let f = z.f;
    if end < from + 12 {
        return;
    }
    let id = be16(f, from);
    let fl = be16(f, from + 2);
    let qd = be16(f, from + 4);
    let an = be16(f, from + 6);
    let ns = be16(f, from + 8);
    let ar = be16(f, from + 10);
    let resp = fl & 0x8000 != 0;
    let rcode = fl & 0xf;
    z.layer("dns");
    z.proto("dns", from, end - from);
    z.open("dns", from, end - from, || {
        format!(
            "Domain Name System ({})",
            if resp { "response" } else { "query" }
        )
    });
    z.fld("dns.id", Value::U(id as u64), from, 2, || {
        format!("Transaction ID: 0x{id:04x}")
    });
    z.open("dns.flags", from + 2, 2, || format!("Flags: 0x{fl:04x}"));
    z.hid("dns.flags", Value::U(fl as u64), from + 2, 2);
    z.fld("dns.flags.response", Value::B(resp), from + 2, 2, || {
        format!(
            "{} .... .... .... = Response: Message is a {}",
            u8::from(resp),
            if resp { "response" } else { "query" }
        )
    });
    z.fld(
        "dns.flags.opcode",
        Value::U(((fl >> 11) & 0xf) as u64),
        from + 2,
        2,
        || format!("Opcode: {}", (fl >> 11) & 0xf),
    );
    z.fld(
        "dns.flags.authoritative",
        Value::B(fl & 0x400 != 0),
        from + 2,
        2,
        || format!("Authoritative: {}", fl & 0x400 != 0),
    );
    z.fld(
        "dns.flags.truncated",
        Value::B(fl & 0x200 != 0),
        from + 2,
        2,
        || format!("Truncated: {}", fl & 0x200 != 0),
    );
    z.fld(
        "dns.flags.recdesired",
        Value::B(fl & 0x100 != 0),
        from + 2,
        2,
        || format!("Recursion desired: {}", fl & 0x100 != 0),
    );
    z.fld(
        "dns.flags.recavail",
        Value::B(fl & 0x80 != 0),
        from + 2,
        2,
        || format!("Recursion available: {}", fl & 0x80 != 0),
    );
    z.fld(
        "dns.flags.rcode",
        Value::U(rcode as u64),
        from + 2,
        2,
        || format!("Reply code: {} ({rcode})", rcode_name(rcode)),
    );
    z.close();
    z.fld(
        "dns.count.queries",
        Value::U(qd as u64),
        from + 4,
        2,
        || format!("Questions: {qd}"),
    );
    z.fld(
        "dns.count.answers",
        Value::U(an as u64),
        from + 6,
        2,
        || format!("Answer RRs: {an}"),
    );
    z.fld(
        "dns.count.auth_rr",
        Value::U(ns as u64),
        from + 8,
        2,
        || format!("Authority RRs: {ns}"),
    );
    z.fld(
        "dns.count.add_rr",
        Value::U(ar as u64),
        from + 10,
        2,
        || format!("Additional RRs: {ar}"),
    );
    let mut p = from + 12;
    let mut first_q = String::new();
    let mut first_t = 0u16;
    'parse: {
        for _ in 0..qd {
            let Some((name, nx)) = name_at(f, from, p) else {
                break 'parse;
            };
            if nx + 4 > end {
                break 'parse;
            }
            let t = be16(f, nx);
            let c = be16(f, nx + 2);
            if first_q.is_empty() {
                first_q = name.clone();
                first_t = t;
            }
            z.open("", p, nx + 4 - p, || {
                format!("{name}: type {}, class IN", dns_type(t))
            });
            z.fld("dns.qry.name", Value::Str(name.clone()), p, nx - p, || {
                format!("Name: {name}")
            });
            z.fld("dns.qry.type", Value::U(t as u64), nx, 2, || {
                format!("Type: {} ({t})", dns_type(t))
            });
            z.fld("dns.qry.class", Value::U(c as u64), nx + 2, 2, || {
                format!("Class: 0x{c:04x}")
            });
            z.close();
            p = nx + 4;
        }
        for _ in 0..(an as u32 + ns as u32 + ar as u32) {
            let Some((name, nx)) = name_at(f, from, p) else {
                break 'parse;
            };
            if nx + 10 > end {
                break 'parse;
            }
            let t = be16(f, nx);
            let c = be16(f, nx + 2);
            let ttl = be32(f, nx + 4);
            let rl = be16(f, nx + 8) as usize;
            let d = nx + 10;
            if d + rl > end {
                break 'parse;
            }
            z.open("", p, d + rl - p, || {
                format!("{name}: type {}, class IN", dns_type(t))
            });
            z.fld("dns.resp.name", Value::Str(name.clone()), p, nx - p, || {
                format!("Name: {name}")
            });
            z.fld("dns.resp.type", Value::U(t as u64), nx, 2, || {
                format!("Type: {} ({t})", dns_type(t))
            });
            z.fld("dns.resp.class", Value::U(c as u64), nx + 2, 2, || {
                format!("Class: 0x{c:04x}")
            });
            z.fld("dns.resp.ttl", Value::U(ttl as u64), nx + 4, 4, || {
                format!("Time to live: {ttl}")
            });
            z.fld("dns.resp.len", Value::U(rl as u64), nx + 8, 2, || {
                format!("Data length: {rl}")
            });
            match t {
                1 if rl == 4 => {
                    let a = [f[d], f[d + 1], f[d + 2], f[d + 3]];
                    z.fld("dns.a", Value::Ip4(a), d, 4, || {
                        format!("Address: {}", ip4_str(&a))
                    });
                }
                28 if rl == 16 => {
                    let mut a = [0u8; 16];
                    a.copy_from_slice(&f[d..d + 16]);
                    z.fld("dns.aaaa", Value::Ip6(a), d, 16, || {
                        format!("AAAA Address: {}", ip6_str(&a))
                    });
                }
                5 => {
                    if let Some((cn, _)) = name_at(f, from, d) {
                        z.fld("dns.cname", Value::Str(cn.clone()), d, rl, || {
                            format!("CNAME: {cn}")
                        });
                    }
                }
                12 => {
                    if let Some((pn, _)) = name_at(f, from, d) {
                        z.fld("dns.ptr.domain_name", Value::Str(pn.clone()), d, rl, || {
                            format!("Domain Name: {pn}")
                        });
                    }
                }
                _ => {}
            }
            z.close();
            p = d + rl;
        }
    }
    z.close();
    z.col("DNS", || {
        let kind = if resp { "response" } else { "query" };
        if resp {
            format!(
                "Standard query {kind} 0x{id:04x} {} {first_q}{}",
                dns_type(first_t),
                if rcode != 0 {
                    format!(" {}", rcode_name(rcode))
                } else {
                    String::new()
                }
            )
        } else {
            format!("Standard query 0x{id:04x} {} {first_q}", dns_type(first_t))
        }
    });
}

fn dhcp_msg(t: u8) -> &'static str {
    match t {
        1 => "Discover",
        2 => "Offer",
        3 => "Request",
        4 => "Decline",
        5 => "ACK",
        6 => "NAK",
        7 => "Release",
        8 => "Inform",
        _ => "Unknown",
    }
}

pub(crate) fn dhcp(z: &mut Dz, from: usize, end: usize) {
    let f = z.f;
    if end < from + 240 || be32(f, from + 236) != 0x6382_5363 {
        return;
    }
    let op = f[from];
    let htype = f[from + 1];
    let hlen = f[from + 2];
    let hops = f[from + 3];
    let xid = be32(f, from + 4);
    let secs = be16(f, from + 8);
    let flags = be16(f, from + 10);
    let ip = |o: usize| {
        [
            f[from + o],
            f[from + o + 1],
            f[from + o + 2],
            f[from + o + 3],
        ]
    };
    let (ci, yi, si, gi) = (ip(12), ip(16), ip(20), ip(24));
    let mut mac = [0u8; 6];
    mac.copy_from_slice(&f[from + 28..from + 34]);
    z.layer("dhcp");
    z.proto("dhcp", from, end - from);
    z.open("dhcp", from, end - from, || {
        "Dynamic Host Configuration Protocol".to_string()
    });
    z.fld("dhcp.type", Value::U(op as u64), from, 1, || {
        format!(
            "Message type: {} ({op})",
            if op == 1 {
                "Boot Request"
            } else {
                "Boot Reply"
            }
        )
    });
    z.fld("dhcp.hw.type", Value::U(htype as u64), from + 1, 1, || {
        format!("Hardware type: 0x{htype:02x}")
    });
    z.fld("dhcp.hw.len", Value::U(hlen as u64), from + 2, 1, || {
        format!("Hardware address length: {hlen}")
    });
    z.fld("dhcp.hops", Value::U(hops as u64), from + 3, 1, || {
        format!("Hops: {hops}")
    });
    z.fld("dhcp.id", Value::U(xid as u64), from + 4, 4, || {
        format!("Transaction ID: 0x{xid:08x}")
    });
    z.fld("dhcp.secs", Value::U(secs as u64), from + 8, 2, || {
        format!("Seconds elapsed: {secs}")
    });
    z.fld("dhcp.flags", Value::U(flags as u64), from + 10, 2, || {
        format!("Bootp flags: 0x{flags:04x}")
    });
    z.fld("dhcp.ip.client", Value::Ip4(ci), from + 12, 4, || {
        format!("Client IP address: {}", ip4_str(&ci))
    });
    z.fld("dhcp.ip.your", Value::Ip4(yi), from + 16, 4, || {
        format!("Your (client) IP address: {}", ip4_str(&yi))
    });
    z.fld("dhcp.ip.server", Value::Ip4(si), from + 20, 4, || {
        format!("Next server IP address: {}", ip4_str(&si))
    });
    z.fld("dhcp.ip.relay", Value::Ip4(gi), from + 24, 4, || {
        format!("Relay agent IP address: {}", ip4_str(&gi))
    });
    z.fld("dhcp.hw.mac_addr", Value::Mac(mac), from + 28, 6, || {
        format!("Client MAC address: {}", mac_str(&mac))
    });
    let mut p = from + 240;
    let mut mt = 0u8;
    while p < end {
        let code = f[p];
        if code == 255 {
            break;
        }
        if code == 0 {
            p += 1;
            continue;
        }
        if p + 1 >= end {
            break;
        }
        let l = f[p + 1] as usize;
        if p + 2 + l > end {
            break;
        }
        let v = p + 2;
        match code {
            53 if l == 1 => {
                mt = f[v];
                z.fld("dhcp.option.dhcp", Value::U(mt as u64), p, 3, || {
                    format!("Option: (53) DHCP Message Type ({})", dhcp_msg(mt))
                });
            }
            1 if l == 4 => z.fld(
                "dhcp.option.subnet_mask",
                Value::Ip4([f[v], f[v + 1], f[v + 2], f[v + 3]]),
                p,
                6,
                || format!("Option: (1) Subnet Mask: {}", ip4_str(&f[v..v + 4])),
            ),
            3 if l >= 4 => z.fld(
                "dhcp.option.router",
                Value::Ip4([f[v], f[v + 1], f[v + 2], f[v + 3]]),
                p,
                2 + l,
                || format!("Option: (3) Router: {}", ip4_str(&f[v..v + 4])),
            ),
            12 => {
                let s = String::from_utf8_lossy(&f[v..v + l]).to_string();
                z.fld(
                    "dhcp.option.hostname",
                    Value::Str(s.clone()),
                    p,
                    2 + l,
                    || format!("Option: (12) Host Name: {s}"),
                );
            }
            15 => {
                let s = String::from_utf8_lossy(&f[v..v + l]).to_string();
                z.fld(
                    "dhcp.option.domain_name",
                    Value::Str(s.clone()),
                    p,
                    2 + l,
                    || format!("Option: (15) Domain Name: {s}"),
                );
            }
            50 if l == 4 => z.fld(
                "dhcp.option.requested_ip_address",
                Value::Ip4([f[v], f[v + 1], f[v + 2], f[v + 3]]),
                p,
                6,
                || {
                    format!(
                        "Option: (50) Requested IP Address: {}",
                        ip4_str(&f[v..v + 4])
                    )
                },
            ),
            51 if l == 4 => {
                let t = be32(f, v);
                z.fld(
                    "dhcp.option.ip_address_lease_time",
                    Value::U(t as u64),
                    p,
                    6,
                    || format!("Option: (51) IP Address Lease Time: {t} seconds"),
                );
            }
            54 if l == 4 => z.fld(
                "dhcp.option.dhcp_server_id",
                Value::Ip4([f[v], f[v + 1], f[v + 2], f[v + 3]]),
                p,
                6,
                || {
                    format!(
                        "Option: (54) DHCP Server Identifier: {}",
                        ip4_str(&f[v..v + 4])
                    )
                },
            ),
            _ => z.text(p, 2 + l, || format!("Option: ({code}) {l} bytes")),
        }
        p += 2 + l;
    }
    z.close();
    z.col("DHCP", || {
        format!("DHCP {:<8} - Transaction ID 0x{xid:x}", dhcp_msg(mt))
    });
}
