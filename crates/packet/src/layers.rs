//! 링크·네트워크·전송 계층 해석(이더넷·VLAN·ARP·IPv4·IPv6·ICMP·ICMPv6·UDP·TCP).

use crate::analysis::PacketAnn;
use crate::dissect::*;
use crate::industrial;

impl<'a> Dz<'a> {
    pub(crate) fn ann(&self) -> Option<&'a PacketAnn> {
        self.ctx
            .analysis
            .and_then(|a| a.ann.get(self.meta.number as usize - 1))
    }

    /// 범위 없는 필드(프레임 전체에 대한 값)
    fn fld_nb(&mut self, name: &'static str, v: Value, label: impl FnOnce() -> String) {
        self.fld(name, v, 0, 0, label);
    }

    pub(crate) fn frame_layer(&mut self, link: u16) {
        let m = self.meta;
        let n = self.f.len();
        let frame_idx = self.stack.first().map(|r| r.children.len());
        self.layer("frame");
        self.proto("frame", 0, n);
        self.open("frame", 0, n, || {
            format!(
                "Frame {}: {} bytes on wire ({} bits), {} bytes captured ({} bits)",
                m.number,
                m.origlen,
                m.origlen * 8,
                m.caplen,
                m.caplen * 8
            )
        });
        self.fld_nb("frame.interface_id", Value::U(m.iface as u64), || {
            format!("Interface id: {}", m.iface)
        });
        if m.has_ts {
            self.fld_nb("frame.time_epoch", Value::F(m.ts_ns as f64 / 1e9), || {
                format!(
                    "Epoch Arrival Time: {}.{:09}",
                    m.ts_ns.div_euclid(1_000_000_000),
                    m.ts_ns.rem_euclid(1_000_000_000)
                )
            });
            self.text(0, 0, || format!("Arrival Time: {}", fmt_utc(m.ts_ns)));
            let prev = m.prev_ts_ns.unwrap_or(m.ts_ns);
            let dt = (m.ts_ns - prev) as f64 / 1e9;
            self.fld_nb("frame.time_delta", Value::F(dt), || {
                format!("Time delta from previous captured frame: {dt:.9} seconds")
            });
            let rel = (m.ts_ns - m.first_ts_ns.unwrap_or(m.ts_ns)) as f64 / 1e9;
            self.fld_nb("frame.time_relative", Value::F(rel), || {
                format!("Time since reference or first frame: {rel:.9} seconds")
            });
        }
        self.fld_nb("frame.number", Value::U(m.number as u64), || {
            format!("Frame Number: {}", m.number)
        });
        self.fld_nb("frame.len", Value::U(m.origlen as u64), || {
            format!("Frame Length: {} bytes ({} bits)", m.origlen, m.origlen * 8)
        });
        self.fld_nb("frame.cap_len", Value::U(m.caplen as u64), || {
            format!("Capture Length: {} bytes ({} bits)", m.caplen, m.caplen * 8)
        });
        let slot = self.stack.last().map(|t| t.children.len());
        self.text(0, 0, String::new); // «Protocols in frame» 자리 — 아래 계층을 푼 뒤 채운다
        self.close();
        self.d.reached = Depth::Frame as u8;
        if self.o.depth >= Depth::Link {
            self.link_layer(link);
        }
        let protos = self.d.protocols();
        if let (Some(fi), Some(si)) = (frame_idx, slot)
            && let Some(node) = self.stack[0]
                .children
                .get_mut(fi)
                .and_then(|fr| fr.children.get_mut(si))
        {
            node.label = format!("Protocols in frame: {protos}");
            node.name = "frame.protocols";
        }
        self.d.fields.push(FieldVal {
            name: "frame.protocols",
            value: Value::Str(protos),
            start: 0,
            len: 0,
        });
        if self.o.columns && self.d.cols.protocol.is_empty() {
            self.d.cols.protocol.push_str("Frame");
        }
    }

    fn link_layer(&mut self, link: u16) {
        let f = self.f;
        self.d.reached = Depth::Link as u8;
        match link {
            1 => self.ethernet(),
            113 => {
                if f.len() < 16 {
                    return self.truncated("Linux cooked capture", 0);
                }
                self.layer("sll");
                self.open("", 0, 16, || "Linux cooked capture v1".to_string());
                let t = be16(f, 14);
                let pt = be16(f, 0);
                self.text(0, 2, || format!("Packet type: {pt}"));
                self.text(14, 2, || {
                    format!("Protocol: {} (0x{t:04x})", ether_type_name(t))
                });
                self.close();
                self.network(16, t);
            }
            276 => {
                if f.len() < 20 {
                    return self.truncated("Linux cooked capture v2", 0);
                }
                self.layer("sll");
                self.open("", 0, 20, || "Linux cooked capture v2".to_string());
                let t = be16(f, 0);
                self.text(0, 2, || {
                    format!("Protocol: {} (0x{t:04x})", ether_type_name(t))
                });
                self.close();
                self.network(20, t);
            }
            0 | 108 => {
                if f.len() < 4 {
                    return self.truncated("Null/Loopback", 0);
                }
                let fam = if link == 108 {
                    be32(f, 0)
                } else if f[0] != 0 {
                    f[0] as u32
                } else {
                    f[3] as u32
                };
                self.layer("null");
                self.open("", 0, 4, || format!("Null/Loopback, family {fam}"));
                self.close();
                let t = match fam {
                    2 => 0x0800,
                    24 | 28 | 30 => 0x86dd,
                    _ => 0,
                };
                self.network(4, t);
            }
            101 | 12 | 14 | 228 | 229 => {
                if f.is_empty() {
                    return self.truncated("Raw IP", 0);
                }
                let t = match f[0] >> 4 {
                    4 => 0x0800,
                    6 => 0x86dd,
                    _ => 0,
                };
                self.network(0, t);
            }
            _ => {
                self.expert(
                    Severity::Warn,
                    "link.unsupported",
                    format!("Unsupported link type {link}"),
                    0,
                    0,
                );
                self.col("Frame", || format!("Unsupported link type {link}"));
            }
        }
    }

    fn truncated(&mut self, what: &str, at: usize) {
        let n = self.f.len().saturating_sub(at);
        self.expert(
            Severity::Error,
            "frame.malformed",
            format!("{what}: packet too short"),
            at,
            n,
        );
        self.col("Short", || format!("{what}: packet too short"));
    }

    fn ethernet(&mut self) {
        let f = self.f;
        if f.len() < 14 {
            return self.truncated("Ethernet", 0);
        }
        let dst: [u8; 6] = f[0..6].try_into().unwrap();
        let src: [u8; 6] = f[6..12].try_into().unwrap();
        let mut ty = be16(f, 12);
        self.layer("eth");
        self.proto("eth", 0, 14);
        self.open("eth", 0, 14, || {
            format!(
                "Ethernet II, Src: {}, Dst: {}",
                mac_str(&src),
                mac_str(&dst)
            )
        });
        self.fld("eth.dst", Value::Mac(dst), 0, 6, || {
            format!("Destination: {}", mac_str(&dst))
        });
        self.fld("eth.src", Value::Mac(src), 6, 6, || {
            format!("Source: {}", mac_str(&src))
        });
        self.hid("eth.addr", Value::Mac(dst), 0, 6);
        self.hid("eth.addr", Value::Mac(src), 6, 6);
        self.fld("eth.type", Value::U(ty as u64), 12, 2, || {
            format!("Type: {} (0x{ty:04x})", ether_type_name(ty))
        });
        self.set_addr(|| mac_str(&src), || mac_str(&dst));
        self.col("Ethernet", || format!("Ethernet II type 0x{ty:04x}"));
        self.close();
        let mut at = 14;
        while ty == 0x8100 || ty == 0x88a8 || ty == 0x9100 {
            if f.len() < at + 4 {
                return self.truncated("802.1Q", at);
            }
            let tci = be16(f, at);
            let inner = be16(f, at + 2);
            self.layer("vlan");
            self.proto("vlan", at, 4);
            self.open("vlan", at, 4, || {
                format!(
                    "802.1Q Virtual LAN, PRI: {}, DEI: {}, ID: {}",
                    tci >> 13,
                    (tci >> 12) & 1,
                    tci & 0xfff
                )
            });
            self.fld("vlan.priority", Value::U((tci >> 13) as u64), at, 2, || {
                format!(
                    "{:03b}. .... .... .... = Priority: {}",
                    tci >> 13,
                    tci >> 13
                )
            });
            self.fld("vlan.dei", Value::B(tci & 0x1000 != 0), at, 2, || {
                format!(
                    "...{} .... .... .... = DEI: {}",
                    (tci >> 12) & 1,
                    if tci & 0x1000 != 0 {
                        "Ineligible"
                    } else {
                        "Eligible"
                    }
                )
            });
            self.fld("vlan.id", Value::U((tci & 0xfff) as u64), at, 2, || {
                format!(".... {:012b} = ID: {}", tci & 0xfff, tci & 0xfff)
            });
            self.fld("vlan.etype", Value::U(inner as u64), at + 2, 2, || {
                format!("Type: {} (0x{inner:04x})", ether_type_name(inner))
            });
            self.close();
            ty = inner;
            at += 4;
        }
        self.network(at, ty);
    }

    /// 이더타입(또는 같은 뜻의 값)으로 네트워크 계층 고르기
    fn network(&mut self, at: usize, ty: u16) {
        if self.o.depth < Depth::Network {
            return;
        }
        self.d.reached = Depth::Network as u8;
        match ty {
            0x0800 => self.ipv4(at),
            0x86dd => self.ipv6(at),
            0x0806 => self.arp(at),
            _ => {}
        }
    }

    fn arp(&mut self, at: usize) {
        let f = self.f;
        if f.len() < at + 28 {
            return self.truncated("ARP", at);
        }
        let hw = be16(f, at);
        let pr = be16(f, at + 2);
        let op = be16(f, at + 6);
        let ok = hw == 1 && pr == 0x0800 && f[at + 4] == 6 && f[at + 5] == 4;
        self.layer("arp");
        self.proto("arp", at, 28);
        let opname = match op {
            1 => "request",
            2 => "reply",
            _ => "unknown",
        };
        self.open("arp", at, 28, || {
            format!("Address Resolution Protocol ({opname})")
        });
        self.fld("arp.hw.type", Value::U(hw as u64), at, 2, || {
            format!(
                "Hardware type: {} ({hw})",
                if hw == 1 { "Ethernet" } else { "other" }
            )
        });
        self.fld("arp.proto.type", Value::U(pr as u64), at + 2, 2, || {
            format!("Protocol type: {} (0x{pr:04x})", ether_type_name(pr))
        });
        self.fld("arp.hw.size", Value::U(f[at + 4] as u64), at + 4, 1, || {
            format!("Hardware size: {}", f[at + 4])
        });
        self.fld(
            "arp.proto.size",
            Value::U(f[at + 5] as u64),
            at + 5,
            1,
            || format!("Protocol size: {}", f[at + 5]),
        );
        self.fld("arp.opcode", Value::U(op as u64), at + 6, 2, || {
            format!("Opcode: {opname} ({op})")
        });
        if ok {
            let sm: [u8; 6] = f[at + 8..at + 14].try_into().unwrap();
            let si: [u8; 4] = f[at + 14..at + 18].try_into().unwrap();
            let tm: [u8; 6] = f[at + 18..at + 24].try_into().unwrap();
            let ti: [u8; 4] = f[at + 24..at + 28].try_into().unwrap();
            self.fld("arp.src.hw_mac", Value::Mac(sm), at + 8, 6, || {
                format!("Sender MAC address: {}", mac_str(&sm))
            });
            self.fld("arp.src.proto_ipv4", Value::Ip4(si), at + 14, 4, || {
                format!("Sender IP address: {}", ip4_str(&si))
            });
            self.fld("arp.dst.hw_mac", Value::Mac(tm), at + 18, 6, || {
                format!("Target MAC address: {}", mac_str(&tm))
            });
            self.fld("arp.dst.proto_ipv4", Value::Ip4(ti), at + 24, 4, || {
                format!("Target IP address: {}", ip4_str(&ti))
            });
            self.col("ARP", || match op {
                1 => format!("Who has {}? Tell {}", ip4_str(&ti), ip4_str(&si)),
                2 => format!("{} is at {}", ip4_str(&si), mac_str(&sm)),
                _ => format!("ARP opcode {op}"),
            });
        } else {
            self.col("ARP", || format!("ARP opcode {op} (non Ethernet/IPv4)"));
        }
        self.close();
    }

    fn ipv4(&mut self, at: usize) {
        let f = self.f;
        if f.len() < at + 20 || f[at] >> 4 != 4 {
            return self.truncated("IPv4", at);
        }
        let ihl = (f[at] & 15) as usize * 4;
        let total = be16(f, at + 2) as usize;
        if ihl < 20 || total < ihl || f.len() < at + ihl {
            return self.truncated("IPv4 header", at);
        }
        let proto = f[at + 9];
        let src: [u8; 4] = f[at + 12..at + 16].try_into().unwrap();
        let dst: [u8; 4] = f[at + 16..at + 20].try_into().unwrap();
        let frag = be16(f, at + 6);
        let flags = (frag >> 13) as u8;
        let off = (frag & 0x1fff) as usize * 8;
        let id = be16(f, at + 4);
        let ttl = f[at + 8];
        self.layer("ip");
        self.proto("ip", at, ihl);
        self.open("ip", at, ihl, || {
            format!(
                "Internet Protocol Version 4, Src: {}, Dst: {}",
                ip4_str(&src),
                ip4_str(&dst)
            )
        });
        self.fld("ip.version", Value::U(4), at, 1, || {
            "0100 .... = Version: 4".into()
        });
        self.fld("ip.hdr_len", Value::U(ihl as u64), at, 1, || {
            format!(
                ".... {:04b} = Header Length: {ihl} bytes ({})",
                ihl / 4,
                ihl / 4
            )
        });
        let ds = f[at + 1];
        self.fld("ip.dsfield", Value::U(ds as u64), at + 1, 1, || {
            format!(
                "Differentiated Services Field: 0x{ds:02x} (DSCP: {}, ECN: {})",
                ds >> 2,
                ds & 3
            )
        });
        self.hid("ip.dsfield.dscp", Value::U((ds >> 2) as u64), at + 1, 1);
        self.hid("ip.dsfield.ecn", Value::U((ds & 3) as u64), at + 1, 1);
        self.fld("ip.len", Value::U(total as u64), at + 2, 2, || {
            format!("Total Length: {total}")
        });
        self.fld("ip.id", Value::U(id as u64), at + 4, 2, || {
            format!("Identification: 0x{id:04x} ({id})")
        });
        self.fld("ip.flags", Value::U(flags as u64), at + 6, 1, || {
            format!(
                "{:03b}. .... = Flags: 0x{flags:x}{}{}",
                flags,
                if flags & 2 != 0 {
                    ", Don't fragment"
                } else {
                    ""
                },
                if flags & 1 != 0 {
                    ", More fragments"
                } else {
                    ""
                }
            )
        });
        self.hid("ip.flags.rb", Value::B(flags & 4 != 0), at + 6, 1);
        self.hid("ip.flags.df", Value::B(flags & 2 != 0), at + 6, 1);
        self.hid("ip.flags.mf", Value::B(flags & 1 != 0), at + 6, 1);
        self.fld(
            "ip.frag_offset",
            Value::U(off as u64 / 8),
            at + 6,
            2,
            || format!("Fragment Offset: {off}"),
        );
        self.fld("ip.ttl", Value::U(ttl as u64), at + 8, 1, || {
            format!("Time to Live: {ttl}")
        });
        self.fld("ip.proto", Value::U(proto as u64), at + 9, 1, || {
            format!("Protocol: {} ({proto})", ip_proto_name(proto))
        });
        let ck = be16(f, at + 10);
        self.fld("ip.checksum", Value::U(ck as u64), at + 10, 2, || {
            format!("Header Checksum: 0x{ck:04x}")
        });
        self.fld("ip.src", Value::Ip4(src), at + 12, 4, || {
            format!("Source Address: {}", ip4_str(&src))
        });
        self.fld("ip.dst", Value::Ip4(dst), at + 16, 4, || {
            format!("Destination Address: {}", ip4_str(&dst))
        });
        self.hid("ip.addr", Value::Ip4(src), at + 12, 4);
        self.hid("ip.addr", Value::Ip4(dst), at + 16, 4);
        self.set_addr(|| ip4_str(&src), || ip4_str(&dst));
        self.col(ip_proto_name(proto), || format!("IPv4 protocol {proto}"));
        self.close();
        let end = f.len().min(at + total);
        let l4 = at + ihl;
        if (flags & 1 != 0) || off != 0 {
            self.expert(
                Severity::Note,
                "ip.fragment",
                "Fragmented IP datagram — upper layers are not reassembled",
                l4,
                end.saturating_sub(l4),
            );
            self.col(ip_proto_name(proto), || {
                format!("Fragmented IP protocol (proto={proto}, off={off}, ID={id:04x})")
            });
            return;
        }
        self.transport(proto, l4, end, false);
    }

    fn ipv6(&mut self, at: usize) {
        let f = self.f;
        if f.len() < at + 40 || f[at] >> 4 != 6 {
            return self.truncated("IPv6", at);
        }
        let tc = ((be32(f, at) >> 20) & 0xff) as u64;
        let flow = (be32(f, at) & 0xfffff) as u64;
        let plen = be16(f, at + 4) as usize;
        let mut nxt = f[at + 6];
        let hlim = f[at + 7];
        let mut src = [0u8; 16];
        src.copy_from_slice(&f[at + 8..at + 24]);
        let mut dst = [0u8; 16];
        dst.copy_from_slice(&f[at + 24..at + 40]);
        self.layer("ipv6");
        self.proto("ipv6", at, 40);
        self.open("ipv6", at, 40, || {
            format!(
                "Internet Protocol Version 6, Src: {}, Dst: {}",
                ip6_str(&src),
                ip6_str(&dst)
            )
        });
        self.fld("ipv6.version", Value::U(6), at, 1, || {
            "0110 .... = Version: 6".into()
        });
        self.fld("ipv6.tclass", Value::U(tc), at, 2, || {
            format!("Traffic Class: 0x{tc:02x}")
        });
        self.fld("ipv6.flow", Value::U(flow), at + 1, 3, || {
            format!("Flow Label: 0x{flow:05x}")
        });
        self.fld("ipv6.plen", Value::U(plen as u64), at + 4, 2, || {
            format!("Payload Length: {plen}")
        });
        self.fld("ipv6.nxt", Value::U(nxt as u64), at + 6, 1, || {
            format!("Next Header: {} ({nxt})", ip_proto_name(nxt))
        });
        self.fld("ipv6.hlim", Value::U(hlim as u64), at + 7, 1, || {
            format!("Hop Limit: {hlim}")
        });
        self.fld("ipv6.src", Value::Ip6(src), at + 8, 16, || {
            format!("Source Address: {}", ip6_str(&src))
        });
        self.fld("ipv6.dst", Value::Ip6(dst), at + 24, 16, || {
            format!("Destination Address: {}", ip6_str(&dst))
        });
        self.hid("ipv6.addr", Value::Ip6(src), at + 8, 16);
        self.hid("ipv6.addr", Value::Ip6(dst), at + 24, 16);
        self.set_addr(|| ip6_str(&src), || ip6_str(&dst));
        self.col("IPv6", || format!("IPv6 next header {nxt}"));
        self.close();
        let mut p = at + 40;
        let end = if plen == 0 {
            f.len()
        } else {
            f.len().min(at + 40 + plen)
        };
        // 확장 머리(기본) — 홉별·경로·조각·목적지 옵션
        let mut fragmented = false;
        while matches!(nxt, 0 | 43 | 44 | 60) {
            if p + 8 > end {
                return self.truncated("IPv6 extension header", p);
            }
            let next = f[p];
            let (name, hl, title): (&'static str, usize, &str) = match nxt {
                0 => (
                    "ipv6.hopopts",
                    8 + f[p + 1] as usize * 8,
                    "IPv6 Hop-by-Hop Option",
                ),
                43 => (
                    "ipv6.routing",
                    8 + f[p + 1] as usize * 8,
                    "IPv6 Routing Header",
                ),
                44 => ("ipv6.fraghdr", 8, "IPv6 Fragment Header"),
                _ => (
                    "ipv6.dstopts",
                    8 + f[p + 1] as usize * 8,
                    "IPv6 Destination Option",
                ),
            };
            self.layer(name);
            self.open(name, p, hl.min(end - p), || title.to_string());
            self.proto(name, p, hl.min(end - p));
            match nxt {
                0 => {
                    self.fld("ipv6.hopopts.nxt", Value::U(next as u64), p, 1, || {
                        format!("Next Header: {} ({next})", ip_proto_name(next))
                    });
                    self.fld(
                        "ipv6.hopopts.length",
                        Value::U(f[p + 1] as u64),
                        p + 1,
                        1,
                        || format!("Length: {}", f[p + 1]),
                    );
                }
                43 => {
                    self.fld("ipv6.routing.nxt", Value::U(next as u64), p, 1, || {
                        format!("Next Header: {} ({next})", ip_proto_name(next))
                    });
                    self.fld(
                        "ipv6.routing.length",
                        Value::U(f[p + 1] as u64),
                        p + 1,
                        1,
                        || format!("Length: {}", f[p + 1]),
                    );
                    self.fld(
                        "ipv6.routing.type",
                        Value::U(f[p + 2] as u64),
                        p + 2,
                        1,
                        || format!("Type: {}", f[p + 2]),
                    );
                    self.fld(
                        "ipv6.routing.segleft",
                        Value::U(f[p + 3] as u64),
                        p + 3,
                        1,
                        || format!("Segments Left: {}", f[p + 3]),
                    );
                }
                44 => {
                    let w = be16(f, p + 2);
                    let ident = be32(f, p + 4);
                    self.fld("ipv6.fraghdr.nxt", Value::U(next as u64), p, 1, || {
                        format!("Next header: {} ({next})", ip_proto_name(next))
                    });
                    self.fld(
                        "ipv6.fraghdr.offset",
                        Value::U((w >> 3) as u64),
                        p + 2,
                        2,
                        || format!("Offset: {}", (w >> 3) as u32 * 8),
                    );
                    self.fld("ipv6.fraghdr.more", Value::B(w & 1 != 0), p + 2, 2, || {
                        format!("More Fragments: {}", w & 1 != 0)
                    });
                    self.fld(
                        "ipv6.fraghdr.ident",
                        Value::U(ident as u64),
                        p + 4,
                        4,
                        || format!("Identification: 0x{ident:08x}"),
                    );
                    if (w >> 3) != 0 || w & 1 != 0 {
                        fragmented = true;
                    }
                }
                _ => {
                    self.fld("ipv6.dstopts.nxt", Value::U(next as u64), p, 1, || {
                        format!("Next Header: {} ({next})", ip_proto_name(next))
                    });
                    self.fld(
                        "ipv6.dstopts.length",
                        Value::U(f[p + 1] as u64),
                        p + 1,
                        1,
                        || format!("Length: {}", f[p + 1]),
                    );
                }
            }
            self.close();
            nxt = next;
            p += hl;
        }
        if fragmented {
            self.expert(
                Severity::Note,
                "ip.fragment",
                "Fragmented IPv6 datagram — upper layers are not reassembled",
                p.min(f.len()),
                0,
            );
            return;
        }
        self.col(ip_proto_name(nxt), || format!("IPv6 next header {nxt}"));
        self.transport(nxt, p.min(end), end, true);
    }

    fn transport(&mut self, proto: u8, at: usize, end: usize, v6: bool) {
        if self.o.depth < Depth::Transport {
            return;
        }
        self.d.reached = Depth::Transport as u8;
        match proto {
            6 => self.tcp(at, end),
            17 => self.udp(at, end),
            1 if !v6 => self.icmp(at, end),
            58 if v6 => self.icmpv6(at, end),
            _ => {}
        }
    }

    fn icmp(&mut self, at: usize, end: usize) {
        let f = self.f;
        if end < at + 4 {
            return self.truncated("ICMP", at);
        }
        let ty = f[at];
        let code = f[at + 1];
        let name = match ty {
            0 => "Echo (ping) reply",
            3 => "Destination unreachable",
            4 => "Source quench",
            5 => "Redirect",
            8 => "Echo (ping) request",
            11 => "Time-to-live exceeded",
            _ => "ICMP",
        };
        self.layer("icmp");
        self.proto("icmp", at, end - at);
        self.open("icmp", at, end - at, || {
            "Internet Control Message Protocol".to_string()
        });
        self.fld("icmp.type", Value::U(ty as u64), at, 1, || {
            format!("Type: {ty} ({name})")
        });
        self.fld("icmp.code", Value::U(code as u64), at + 1, 1, || {
            format!("Code: {code}")
        });
        let ck = be16(f, at + 2);
        self.fld("icmp.checksum", Value::U(ck as u64), at + 2, 2, || {
            format!("Checksum: 0x{ck:04x}")
        });
        let mut info = name.to_string();
        if (ty == 0 || ty == 8) && end >= at + 8 {
            let id = be16(f, at + 4);
            let sq = be16(f, at + 6);
            self.fld("icmp.ident", Value::U(id as u64), at + 4, 2, || {
                format!("Identifier (BE): {id} (0x{id:04x})")
            });
            self.fld("icmp.seq", Value::U(sq as u64), at + 6, 2, || {
                format!("Sequence Number (BE): {sq} (0x{sq:04x})")
            });
            if self.o.columns {
                info = format!("{name}  id=0x{id:04x}, seq={sq}");
            }
        }
        self.close();
        self.col("ICMP", || info);
    }

    fn icmpv6(&mut self, at: usize, end: usize) {
        let f = self.f;
        if end < at + 4 {
            return self.truncated("ICMPv6", at);
        }
        let ty = f[at];
        let code = f[at + 1];
        let name = match ty {
            1 => "Destination Unreachable",
            2 => "Packet Too Big",
            3 => "Time Exceeded",
            128 => "Echo (ping) request",
            129 => "Echo (ping) reply",
            133 => "Router Solicitation",
            134 => "Router Advertisement",
            135 => "Neighbor Solicitation",
            136 => "Neighbor Advertisement",
            _ => "ICMPv6",
        };
        self.layer("icmpv6");
        self.proto("icmpv6", at, end - at);
        self.open("icmpv6", at, end - at, || {
            "Internet Control Message Protocol v6".to_string()
        });
        self.fld("icmpv6.type", Value::U(ty as u64), at, 1, || {
            format!("Type: {name} ({ty})")
        });
        self.fld("icmpv6.code", Value::U(code as u64), at + 1, 1, || {
            format!("Code: {code}")
        });
        let ck = be16(f, at + 2);
        self.fld("icmpv6.checksum", Value::U(ck as u64), at + 2, 2, || {
            format!("Checksum: 0x{ck:04x}")
        });
        if (ty == 128 || ty == 129) && end >= at + 8 {
            let id = be16(f, at + 4);
            let sq = be16(f, at + 6);
            self.fld(
                "icmpv6.echo.identifier",
                Value::U(id as u64),
                at + 4,
                2,
                || format!("Identifier: 0x{id:04x}"),
            );
            self.fld(
                "icmpv6.echo.sequence_number",
                Value::U(sq as u64),
                at + 6,
                2,
                || format!("Sequence: {sq}"),
            );
        }
        if (ty == 135 || ty == 136) && end >= at + 24 {
            let mut t = [0u8; 16];
            t.copy_from_slice(&f[at + 8..at + 24]);
            let nm = if ty == 135 {
                "icmpv6.nd.ns.target_address"
            } else {
                "icmpv6.nd.na.target_address"
            };
            self.fld(nm, Value::Ip6(t), at + 8, 16, || {
                format!("Target Address: {}", ip6_str(&t))
            });
        }
        self.close();
        self.col("ICMPv6", || name.to_string());
    }

    fn udp(&mut self, at: usize, end: usize) {
        let f = self.f;
        if end < at + 8 {
            return self.truncated("UDP", at);
        }
        let sp = be16(f, at);
        let dp = be16(f, at + 2);
        let len = be16(f, at + 4) as usize;
        let ck = be16(f, at + 6);
        self.layer("udp");
        self.proto("udp", at, 8);
        self.open("udp", at, 8, || {
            format!("User Datagram Protocol, Src Port: {sp}, Dst Port: {dp}")
        });
        self.fld("udp.srcport", Value::U(sp as u64), at, 2, || {
            format!("Source Port: {sp}")
        });
        self.fld("udp.dstport", Value::U(dp as u64), at + 2, 2, || {
            format!("Destination Port: {dp}")
        });
        self.hid("udp.port", Value::U(sp as u64), at, 2);
        self.hid("udp.port", Value::U(dp as u64), at + 2, 2);
        self.fld("udp.length", Value::U(len as u64), at + 4, 2, || {
            format!("Length: {len}")
        });
        self.fld("udp.checksum", Value::U(ck as u64), at + 6, 2, || {
            format!("Checksum: 0x{ck:04x}")
        });
        self.close();
        let pend = end.min(at + len.max(8));
        let plen = pend - (at + 8);
        self.col("UDP", || format!("{sp} → {dp} Len={plen}"));
        if plen > 0 {
            self.fld(
                "udp.payload",
                Value::Bytes((at + 8) as u32, plen as u32),
                at + 8,
                plen,
                || format!("UDP payload ({plen} bytes)"),
            );
            if self.o.depth >= Depth::App {
                self.application(at + 8, pend, sp, dp, false);
            }
        }
    }

    fn tcp(&mut self, at: usize, end: usize) {
        use crate::analysis::ann as k;
        let f = self.f;
        if end < at + 20 {
            return self.truncated("TCP", at);
        }
        let hl = (f[at + 12] >> 4) as usize * 4;
        if hl < 20 || end < at + hl {
            return self.truncated("TCP header", at);
        }
        let sp = be16(f, at);
        let dp = be16(f, at + 2);
        let seq = be32(f, at + 4);
        let ack = be32(f, at + 8);
        let fl = (((f[at + 12] & 0x0f) as u16) << 8) | f[at + 13] as u16;
        let win = be16(f, at + 14);
        let plen = end - at - hl;
        let ann = self.ann().copied();
        let (rseq, rack) = match &ann {
            Some(a) => (a.rel_seq, a.rel_ack),
            None => (seq, ack),
        };
        self.layer("tcp");
        self.proto("tcp", at, hl);
        self.open("tcp", at, hl, || format!("Transmission Control Protocol, Src Port: {sp}, Dst Port: {dp}, Seq: {rseq}, Ack: {rack}, Len: {plen}"));
        self.fld("tcp.srcport", Value::U(sp as u64), at, 2, || {
            format!("Source Port: {sp}")
        });
        self.fld("tcp.dstport", Value::U(dp as u64), at + 2, 2, || {
            format!("Destination Port: {dp}")
        });
        self.hid("tcp.port", Value::U(sp as u64), at, 2);
        self.hid("tcp.port", Value::U(dp as u64), at + 2, 2);
        if let Some(a) = &ann
            && a.flow != u32::MAX
        {
            let s = a.flow as u64;
            self.fld_nb("tcp.stream", Value::U(s), || format!("[Stream index: {s}]"));
        }
        self.fld("tcp.len", Value::U(plen as u64), at + 12, 1, || {
            format!("[TCP Segment Len: {plen}]")
        });
        self.fld("tcp.seq_raw", Value::U(seq as u64), at + 4, 4, || {
            format!("Sequence Number (raw): {seq}")
        });
        if ann.is_some() {
            self.fld("tcp.seq", Value::U(rseq as u64), at + 4, 4, || {
                format!("Sequence Number: {rseq}    (relative sequence number)")
            });
            let nxt = rseq
                .wrapping_add(plen as u32)
                .wrapping_add(u32::from(fl & 3 != 0));
            self.fld("tcp.nxtseq", Value::U(nxt as u64), at + 4, 4, || {
                format!("[Next Sequence Number: {nxt}    (relative sequence number)]")
            });
            self.fld("tcp.ack", Value::U(rack as u64), at + 8, 4, || {
                format!("Acknowledgment Number: {rack}    (relative ack number)")
            });
        }
        self.fld("tcp.ack_raw", Value::U(ack as u64), at + 8, 4, || {
            format!("Acknowledgment number (raw): {ack}")
        });
        self.fld("tcp.hdr_len", Value::U(hl as u64), at + 12, 1, || {
            format!(
                "{:04b} .... = Header Length: {hl} bytes ({})",
                hl / 4,
                hl / 4
            )
        });
        self.open("tcp.flags", at + 12, 2, || {
            format!("Flags: 0x{fl:03x} ({})", tcp_flag_names(fl))
        });
        self.hid("tcp.flags", Value::U(fl as u64), at + 12, 2);
        for (name, bit) in [
            ("tcp.flags.fin", 0x001u16),
            ("tcp.flags.syn", 0x002),
            ("tcp.flags.reset", 0x004),
            ("tcp.flags.push", 0x008),
            ("tcp.flags.ack", 0x010),
            ("tcp.flags.urg", 0x020),
            ("tcp.flags.ece", 0x040),
            ("tcp.flags.cwr", 0x080),
            ("tcp.flags.ns", 0x100),
        ] {
            let on = fl & bit != 0;
            self.fld(name, Value::B(on), at + 12, 2, || {
                format!("{name}: {}", if on { "Set" } else { "Not set" })
            });
        }
        self.close();
        let scale = ann.as_ref().map(|a| a.win_scale).unwrap_or(255);
        self.fld(
            "tcp.window_size_value",
            Value::U(win as u64),
            at + 14,
            2,
            || format!("Window: {win}"),
        );
        if scale != 255 {
            let calc = (win as u64) << scale.min(14);
            self.fld_nb("tcp.window_size", Value::U(calc), || {
                format!("[Calculated window size: {calc}]")
            });
        }
        let ck = be16(f, at + 16);
        self.fld("tcp.checksum", Value::U(ck as u64), at + 16, 2, || {
            format!("Checksum: 0x{ck:04x} [unverified]")
        });
        let up = be16(f, at + 18);
        self.fld(
            "tcp.urgent_pointer",
            Value::U(up as u64),
            at + 18,
            2,
            || format!("Urgent Pointer: {up}"),
        );
        if hl > 20 {
            self.tcp_options(at + 20, at + hl);
        }
        if let Some(a) = &ann {
            self.tcp_analysis(a, at);
        }
        self.close();
        if self.o.columns {
            let mut pre = String::new();
            if let Some(a) = &ann {
                for (bit, text) in [
                    (k::RETRANSMISSION, "[TCP Retransmission] "),
                    (k::FAST_RETRANSMISSION, "[TCP Fast Retransmission] "),
                    (k::OUT_OF_ORDER, "[TCP Out-Of-Order] "),
                    (k::ZERO_WINDOW, "[TCP ZeroWindow] "),
                    (k::LOST_SEGMENT, "[TCP Previous segment not captured] "),
                    (k::KEEP_ALIVE, "[TCP Keep-Alive] "),
                    (k::KEEP_ALIVE_ACK, "[TCP Keep-Alive ACK] "),
                    (k::WINDOW_UPDATE, "[TCP Window Update] "),
                ] {
                    if a.flags & bit != 0 {
                        pre.push_str(text);
                    }
                }
                if a.flags & k::DUP_ACK != 0 {
                    pre.push_str(&format!(
                        "[TCP Dup ACK {}#{}] ",
                        a.dup_ack_frame, a.dup_ack_num
                    ));
                }
            }
            let info = format!(
                "{pre}{sp} → {dp} [{}] Seq={rseq} Ack={rack} Win={win} Len={plen}",
                tcp_flag_names(fl)
            );
            self.col("TCP", || info);
        }
        if plen > 0 {
            let ps = at + hl;
            self.fld(
                "tcp.payload",
                Value::Bytes(ps as u32, plen as u32),
                ps,
                plen,
                || format!("TCP payload ({plen} bytes)"),
            );
            if self.o.depth >= Depth::App {
                self.application(ps, end, sp, dp, true);
            }
        }
    }

    fn tcp_options(&mut self, from: usize, to: usize) {
        let f = self.f;
        self.open("tcp.options", from, to - from, || {
            format!("Options: ({} bytes)", to - from)
        });
        let mut i = from;
        while i < to {
            let kind = f[i];
            if kind == 0 {
                self.text(i, 1, || "TCP Option - End of Option List (EOL)".into());
                break;
            }
            if kind == 1 {
                self.text(i, 1, || "TCP Option - No-Operation (NOP)".into());
                i += 1;
                continue;
            }
            if i + 1 >= to {
                break;
            }
            let l = f[i + 1] as usize;
            if l < 2 || i + l > to {
                self.text(i, to - i, || "TCP Option - malformed".into());
                break;
            }
            match kind {
                2 if l == 4 => {
                    let v = be16(f, i + 2);
                    self.fld("tcp.options.mss_val", Value::U(v as u64), i + 2, 2, || {
                        format!("TCP Option - Maximum segment size: {v} bytes")
                    });
                }
                3 if l == 3 => {
                    let v = f[i + 2];
                    self.fld(
                        "tcp.options.wscale.shift",
                        Value::U(v as u64),
                        i + 2,
                        1,
                        || {
                            format!(
                                "TCP Option - Window scale: {v} (multiply by {})",
                                1u64 << v.min(14)
                            )
                        },
                    );
                }
                4 => self.fld("tcp.options.sack_perm", Value::B(true), i, l, || {
                    "TCP Option - SACK permitted".into()
                }),
                5 => {
                    let mut k = i + 2;
                    while k + 8 <= i + l {
                        let le = be32(f, k);
                        let re = be32(f, k + 4);
                        self.fld("tcp.options.sack_le", Value::U(le as u64), k, 4, || {
                            format!("left edge = {le}")
                        });
                        self.fld("tcp.options.sack_re", Value::U(re as u64), k + 4, 4, || {
                            format!("right edge = {re}")
                        });
                        k += 8;
                    }
                }
                8 if l == 10 => {
                    let v = be32(f, i + 2);
                    let e = be32(f, i + 6);
                    self.fld(
                        "tcp.options.timestamp.tsval",
                        Value::U(v as u64),
                        i + 2,
                        4,
                        || format!("TCP Option - Timestamps: TSval {v}"),
                    );
                    self.fld(
                        "tcp.options.timestamp.tsecr",
                        Value::U(e as u64),
                        i + 6,
                        4,
                        || format!("Timestamp echo reply: TSecr {e}"),
                    );
                }
                _ => self.text(i, l, || format!("TCP Option - kind {kind} ({l} bytes)")),
            }
            i += l;
        }
        self.close();
    }

    fn tcp_analysis(&mut self, a: &PacketAnn, at: usize) {
        use crate::analysis::ann as k;
        if a.flags & k::ANY_ANALYSIS == 0 {
            return;
        }
        self.open("tcp.analysis.flags", at, 0, || "[SEQ/ACK analysis]".into());
        self.hid("tcp.analysis.flags", Value::Present, at, 0);
        let rows: [(u32, &'static str, &'static str, &'static str, Severity); 9] = [
            (
                k::RETRANSMISSION,
                "tcp.analysis.retransmission",
                "tcp.retransmission",
                "This frame is a (suspected) retransmission",
                Severity::Note,
            ),
            (
                k::FAST_RETRANSMISSION,
                "tcp.analysis.fast_retransmission",
                "tcp.retransmission",
                "This frame is a (suspected) fast retransmission",
                Severity::Note,
            ),
            (
                k::OUT_OF_ORDER,
                "tcp.analysis.out_of_order",
                "tcp.out_of_order",
                "This frame is a (suspected) out-of-order segment",
                Severity::Warn,
            ),
            (
                k::DUP_ACK,
                "tcp.analysis.duplicate_ack",
                "tcp.dup_ack",
                "Duplicate ACK",
                Severity::Note,
            ),
            (
                k::ZERO_WINDOW,
                "tcp.analysis.zero_window",
                "tcp.zero_window",
                "TCP Zero Window segment — the receiver cannot accept more data",
                Severity::Warn,
            ),
            (
                k::LOST_SEGMENT,
                "tcp.analysis.lost_segment",
                "tcp.lost_segment",
                "Previous segment(s) not captured (common at capture start)",
                Severity::Warn,
            ),
            (
                k::KEEP_ALIVE,
                "tcp.analysis.keep_alive",
                "tcp.keep_alive",
                "TCP keep-alive segment",
                Severity::Note,
            ),
            (
                k::WINDOW_UPDATE,
                "tcp.analysis.window_update",
                "tcp.window_update",
                "TCP window update",
                Severity::Chat,
            ),
            (
                k::ACK_LOST_SEGMENT,
                "tcp.analysis.ack_lost_segment",
                "tcp.ack_lost_segment",
                "ACKed segment that wasn't captured (common at capture start)",
                Severity::Warn,
            ),
        ];
        for (bit, name, key, text, sev) in rows {
            if a.flags & bit != 0 {
                self.fld(name, Value::Present, at, 0, || format!("[{text}]"));
                self.expert(sev, key, text, at, 0);
            }
        }
        if a.flags & k::DUP_ACK != 0 {
            let n = a.dup_ack_num as u64;
            self.fld("tcp.analysis.duplicate_ack_num", Value::U(n), at, 0, || {
                format!("[Duplicate ACK #: {n}]")
            });
        }
        if a.flags & k::KEEP_ALIVE_ACK != 0 {
            self.fld("tcp.analysis.keep_alive_ack", Value::Present, at, 0, || {
                "[ACK to a TCP keep-alive segment]".into()
            });
        }
        self.close();
    }

    /// TCP·UDP 데이터 위의 응용 계층
    fn application(&mut self, from: usize, end: usize, sp: u16, dp: u16, tcp: bool) {
        self.d.reached = Depth::App as u8;
        if !tcp {
            if sp == 53 || dp == 53 {
                return crate::appl::dns(self, from, end);
            }
            if (sp == 67 || sp == 68) && (dp == 67 || dp == 68) {
                return crate::appl::dhcp(self, from, end);
            }
        }
        industrial::dissect_payload(self, from, end, sp, dp, tcp);
    }
}
