//! 필드 표 — 표시 필터의 필드 이름·형식·설명. 자동 완성과 필터 형식 검사가 쓴다.
//!
//! 이름은 Wireshark dfref(wireshark.org/docs/dfref)의 것이다. `custom = true` 인 것만 PortDock 이 정한 이름이다
//! (`mc.*`·`xgt.*` — Wireshark 에 해석기가 없다 — 와 `modbus.rtu.unit_id`).
//! 해석기가 내는 모든 필드가 이 표에 있다는 것은 시험(`tests/filter.rs`)이 확인한다.

use crate::dissect::Depth;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FType {
    Uint,
    Bool,
    Float,
    Mac,
    Ip4,
    Ip6,
    Str,
    Bytes,
    /// 값 없이 «있다/없다» 만(분석 표시 라벨)
    Label,
    /// 프로토콜 이름(`tcp`, `modbus` …)
    Proto,
}

impl FType {
    pub fn name(self) -> &'static str {
        match self {
            FType::Uint => "unsigned integer",
            FType::Bool => "boolean",
            FType::Float => "floating point",
            FType::Mac => "MAC address",
            FType::Ip4 => "IPv4 address",
            FType::Ip6 => "IPv6 address",
            FType::Str => "character string",
            FType::Bytes => "byte sequence",
            FType::Label => "label",
            FType::Proto => "protocol",
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct FieldDef {
    pub name: &'static str,
    pub ftype: FType,
    pub desc: &'static str,
    pub custom: bool,
}

use FType::*;

const fn f(name: &'static str, ftype: FType, desc: &'static str) -> FieldDef {
    FieldDef {
        name,
        ftype,
        desc,
        custom: false,
    }
}
const fn c(name: &'static str, ftype: FType, desc: &'static str) -> FieldDef {
    FieldDef {
        name,
        ftype,
        desc,
        custom: true,
    }
}

pub static FIELDS: &[FieldDef] = &[
    f("frame", Proto, "Frame"),
    f("frame.number", Uint, "Frame Number"),
    f("frame.len", Uint, "Frame Length"),
    f("frame.cap_len", Uint, "Capture Length"),
    f("frame.interface_id", Uint, "Interface id"),
    f("frame.time_epoch", Float, "Epoch Arrival Time (seconds)"),
    f(
        "frame.time_delta",
        Float,
        "Time delta from previous captured frame (seconds)",
    ),
    f(
        "frame.time_relative",
        Float,
        "Time since reference or first frame (seconds)",
    ),
    f("frame.protocols", Str, "Protocols in frame"),
    f("eth", Proto, "Ethernet"),
    f("eth.dst", Mac, "Destination"),
    f("eth.src", Mac, "Source"),
    f("eth.addr", Mac, "Source or Destination Address"),
    f("eth.type", Uint, "Type"),
    f("vlan", Proto, "802.1Q Virtual LAN"),
    f("vlan.priority", Uint, "Priority"),
    f("vlan.dei", Bool, "DEI"),
    f("vlan.id", Uint, "ID"),
    f("vlan.etype", Uint, "Type"),
    f("arp", Proto, "Address Resolution Protocol"),
    f("arp.hw.type", Uint, "Hardware type"),
    f("arp.proto.type", Uint, "Protocol type"),
    f("arp.hw.size", Uint, "Hardware size"),
    f("arp.proto.size", Uint, "Protocol size"),
    f("arp.opcode", Uint, "Opcode"),
    f("arp.src.hw_mac", Mac, "Sender MAC address"),
    f("arp.src.proto_ipv4", Ip4, "Sender IP address"),
    f("arp.dst.hw_mac", Mac, "Target MAC address"),
    f("arp.dst.proto_ipv4", Ip4, "Target IP address"),
    f("ip", Proto, "Internet Protocol Version 4"),
    f("ip.version", Uint, "Version"),
    f("ip.hdr_len", Uint, "Header Length"),
    f("ip.dsfield", Uint, "Differentiated Services Field"),
    f("ip.dsfield.dscp", Uint, "Differentiated Services Codepoint"),
    f("ip.dsfield.ecn", Uint, "Explicit Congestion Notification"),
    f("ip.len", Uint, "Total Length"),
    f("ip.id", Uint, "Identification"),
    f("ip.flags", Uint, "Flags"),
    f("ip.flags.rb", Bool, "Reserved bit"),
    f("ip.flags.df", Bool, "Don't fragment"),
    f("ip.flags.mf", Bool, "More fragments"),
    f("ip.frag_offset", Uint, "Fragment Offset"),
    f("ip.ttl", Uint, "Time to Live"),
    f("ip.proto", Uint, "Protocol"),
    f("ip.checksum", Uint, "Header Checksum"),
    f("ip.src", Ip4, "Source Address"),
    f("ip.dst", Ip4, "Destination Address"),
    f("ip.addr", Ip4, "Source or Destination Address"),
    f("ipv6", Proto, "Internet Protocol Version 6"),
    f("ipv6.version", Uint, "Version"),
    f("ipv6.tclass", Uint, "Traffic Class"),
    f("ipv6.flow", Uint, "Flow Label"),
    f("ipv6.plen", Uint, "Payload Length"),
    f("ipv6.nxt", Uint, "Next Header"),
    f("ipv6.hlim", Uint, "Hop Limit"),
    f("ipv6.src", Ip6, "Source Address"),
    f("ipv6.dst", Ip6, "Destination Address"),
    f("ipv6.addr", Ip6, "Source or Destination Address"),
    f("ipv6.hopopts", Proto, "Hop-by-Hop Options"),
    f("ipv6.hopopts.nxt", Uint, "Next Header"),
    f("ipv6.hopopts.length", Uint, "Length"),
    f("ipv6.routing", Proto, "Routing Header"),
    f("ipv6.routing.nxt", Uint, "Next Header"),
    f("ipv6.routing.length", Uint, "Length"),
    f("ipv6.routing.type", Uint, "Type"),
    f("ipv6.routing.segleft", Uint, "Segments Left"),
    f("ipv6.fraghdr", Proto, "Fragment Header"),
    f("ipv6.fraghdr.nxt", Uint, "Next header"),
    f("ipv6.fraghdr.offset", Uint, "Offset"),
    f("ipv6.fraghdr.more", Bool, "More Fragments"),
    f("ipv6.fraghdr.ident", Uint, "Identification"),
    f("ipv6.dstopts", Proto, "Destination Options"),
    f("ipv6.dstopts.nxt", Uint, "Next Header"),
    f("ipv6.dstopts.length", Uint, "Length"),
    f("icmp", Proto, "Internet Control Message Protocol"),
    f("icmp.type", Uint, "Type"),
    f("icmp.code", Uint, "Code"),
    f("icmp.checksum", Uint, "Checksum"),
    f("icmp.ident", Uint, "Identifier (BE)"),
    f("icmp.seq", Uint, "Sequence Number (BE)"),
    f("icmpv6", Proto, "Internet Control Message Protocol v6"),
    f("icmpv6.type", Uint, "Type"),
    f("icmpv6.code", Uint, "Code"),
    f("icmpv6.checksum", Uint, "Checksum"),
    f("icmpv6.echo.identifier", Uint, "Identifier"),
    f("icmpv6.echo.sequence_number", Uint, "Sequence"),
    f("icmpv6.nd.ns.target_address", Ip6, "Target Address"),
    f("icmpv6.nd.na.target_address", Ip6, "Target Address"),
    f("udp", Proto, "User Datagram Protocol"),
    f("udp.srcport", Uint, "Source Port"),
    f("udp.dstport", Uint, "Destination Port"),
    f("udp.port", Uint, "Source or Destination Port"),
    f("udp.length", Uint, "Length"),
    f("udp.checksum", Uint, "Checksum"),
    f("udp.payload", Bytes, "Payload"),
    f("tcp", Proto, "Transmission Control Protocol"),
    f("tcp.srcport", Uint, "Source Port"),
    f("tcp.dstport", Uint, "Destination Port"),
    f("tcp.port", Uint, "Source or Destination Port"),
    f("tcp.stream", Uint, "Stream index"),
    f("tcp.len", Uint, "TCP Segment Len"),
    f("tcp.seq_raw", Uint, "Sequence Number (raw)"),
    f("tcp.seq", Uint, "Sequence Number (relative)"),
    f("tcp.nxtseq", Uint, "Next Sequence Number (relative)"),
    f("tcp.ack", Uint, "Acknowledgment Number (relative)"),
    f("tcp.ack_raw", Uint, "Acknowledgment number (raw)"),
    f("tcp.hdr_len", Uint, "Header Length"),
    f("tcp.flags", Uint, "Flags"),
    f("tcp.flags.fin", Bool, "Fin"),
    f("tcp.flags.syn", Bool, "Syn"),
    f("tcp.flags.reset", Bool, "Reset"),
    f("tcp.flags.push", Bool, "Push"),
    f("tcp.flags.ack", Bool, "Acknowledgment"),
    f("tcp.flags.urg", Bool, "Urgent"),
    f("tcp.flags.ece", Bool, "ECN-Echo"),
    f("tcp.flags.cwr", Bool, "Congestion Window Reduced"),
    f("tcp.flags.ns", Bool, "Nonce"),
    f("tcp.window_size_value", Uint, "Window"),
    f("tcp.window_size", Uint, "Calculated window size"),
    f("tcp.checksum", Uint, "Checksum"),
    f("tcp.urgent_pointer", Uint, "Urgent Pointer"),
    f("tcp.options.mss_val", Uint, "MSS Value"),
    f("tcp.options.wscale.shift", Uint, "Shift count"),
    f("tcp.options.sack_perm", Bool, "TCP SACK Permitted Option"),
    f("tcp.options.sack_le", Uint, "TCP SACK Left Edge"),
    f("tcp.options.sack_re", Uint, "TCP SACK Right Edge"),
    f("tcp.options.timestamp.tsval", Uint, "Timestamp value"),
    f("tcp.options.timestamp.tsecr", Uint, "Timestamp echo reply"),
    f("tcp.payload", Bytes, "TCP payload"),
    f(
        "tcp.analysis.flags",
        Label,
        "TCP Analysis Flags (any of the analysis items below)",
    ),
    f(
        "tcp.analysis.retransmission",
        Label,
        "This frame is a (suspected) retransmission",
    ),
    f(
        "tcp.analysis.fast_retransmission",
        Label,
        "This frame is a (suspected) fast retransmission",
    ),
    f(
        "tcp.analysis.out_of_order",
        Label,
        "This frame is a (suspected) out-of-order segment",
    ),
    f("tcp.analysis.duplicate_ack", Label, "Duplicate ACK"),
    f("tcp.analysis.duplicate_ack_num", Uint, "Duplicate ACK #"),
    f("tcp.analysis.zero_window", Label, "TCP Zero Window segment"),
    f(
        "tcp.analysis.lost_segment",
        Label,
        "Previous segment(s) not captured (common at capture start)",
    ),
    f("tcp.analysis.keep_alive", Label, "TCP keep-alive segment"),
    f(
        "tcp.analysis.keep_alive_ack",
        Label,
        "ACK to a TCP keep-alive segment",
    ),
    f("tcp.analysis.window_update", Label, "TCP window update"),
    f(
        "tcp.analysis.ack_lost_segment",
        Label,
        "ACKed segment that wasn't captured (common at capture start)",
    ),
    f("dns", Proto, "Domain Name System"),
    f("dns.id", Uint, "Transaction ID"),
    f("dns.flags", Uint, "Flags"),
    f("dns.flags.response", Bool, "Response"),
    f("dns.flags.opcode", Uint, "Opcode"),
    f("dns.flags.authoritative", Bool, "Authoritative"),
    f("dns.flags.truncated", Bool, "Truncated"),
    f("dns.flags.recdesired", Bool, "Recursion desired"),
    f("dns.flags.recavail", Bool, "Recursion available"),
    f("dns.flags.rcode", Uint, "Reply code"),
    f("dns.count.queries", Uint, "Questions"),
    f("dns.count.answers", Uint, "Answer RRs"),
    f("dns.count.auth_rr", Uint, "Authority RRs"),
    f("dns.count.add_rr", Uint, "Additional RRs"),
    f("dns.qry.name", Str, "Name"),
    f("dns.qry.type", Uint, "Type"),
    f("dns.qry.class", Uint, "Class"),
    f("dns.resp.name", Str, "Name"),
    f("dns.resp.type", Uint, "Type"),
    f("dns.resp.class", Uint, "Class"),
    f("dns.resp.ttl", Uint, "Time to live"),
    f("dns.resp.len", Uint, "Data length"),
    f("dns.a", Ip4, "Address"),
    f("dns.aaaa", Ip6, "AAAA Address"),
    f("dns.cname", Str, "CNAME"),
    f("dns.ptr.domain_name", Str, "Domain Name"),
    f("dhcp", Proto, "Dynamic Host Configuration Protocol"),
    f("dhcp.type", Uint, "Message type (BOOTP op)"),
    f("dhcp.hw.type", Uint, "Hardware type"),
    f("dhcp.hw.len", Uint, "Hardware address length"),
    f("dhcp.hops", Uint, "Hops"),
    f("dhcp.id", Uint, "Transaction ID"),
    f("dhcp.secs", Uint, "Seconds elapsed"),
    f("dhcp.flags", Uint, "Bootp flags"),
    f("dhcp.ip.client", Ip4, "Client IP address"),
    f("dhcp.ip.your", Ip4, "Your (client) IP address"),
    f("dhcp.ip.server", Ip4, "Next server IP address"),
    f("dhcp.ip.relay", Ip4, "Relay agent IP address"),
    f("dhcp.hw.mac_addr", Mac, "Client MAC address"),
    f("dhcp.option.dhcp", Uint, "DHCP message type (option 53)"),
    f("dhcp.option.subnet_mask", Ip4, "Subnet Mask"),
    f("dhcp.option.router", Ip4, "Router"),
    f("dhcp.option.hostname", Str, "Host Name"),
    f("dhcp.option.domain_name", Str, "Domain Name"),
    f(
        "dhcp.option.requested_ip_address",
        Ip4,
        "Requested IP Address",
    ),
    f(
        "dhcp.option.ip_address_lease_time",
        Uint,
        "IP Address Lease Time",
    ),
    f("dhcp.option.dhcp_server_id", Ip4, "DHCP Server Identifier"),
    f("mbtcp", Proto, "Modbus/TCP"),
    f("mbtcp.trans_id", Uint, "Transaction Identifier"),
    f("mbtcp.prot_id", Uint, "Protocol Identifier"),
    f("mbtcp.len", Uint, "Length"),
    f("mbtcp.unit_id", Uint, "Unit Identifier"),
    f("modbus", Proto, "Modbus"),
    f("modbus.func_code", Uint, "Function Code"),
    f("modbus.exception", Bool, "Exception"),
    f("modbus.exception_code", Uint, "Exception Code"),
    f("modbus.reference_num", Uint, "Reference Number"),
    f("modbus.word_cnt", Uint, "Word Count"),
    f("modbus.bit_cnt", Uint, "Bit Count"),
    f("modbus.byte_cnt", Uint, "Byte Count"),
    f("modbus.bitval", Bool, "Bit Value"),
    f("modbus.regval_uint16", Uint, "Register Value (UINT16)"),
    f("modbus.data", Bytes, "Data"),
    f("modbus.read_reference_num", Uint, "Read Reference Number"),
    f("modbus.read_word_cnt", Uint, "Read Word Count"),
    f("modbus.write_reference_num", Uint, "Write Reference Number"),
    f("modbus.write_word_cnt", Uint, "Write Word Count"),
    f("modbus.request_frame", Uint, "Request Frame (frame number)"),
    f("modbus.response_time", Float, "Time from request (seconds)"),
    c(
        "modbus.rtu.unit_id",
        Uint,
        "Modbus RTU over TCP: slave address",
    ),
    c("mc", Proto, "MC (SLMP) 3E/4E"),
    c("mc.is_response", Bool, "The frame is a response"),
    c("mc.serial", Uint, "4E serial number"),
    c("mc.network", Uint, "Network No."),
    c("mc.station", Uint, "PC No. (station)"),
    c("mc.io", Uint, "Request destination module I/O No."),
    c("mc.drop", Uint, "Request destination module station No."),
    c("mc.length", Uint, "Request/response data length"),
    c("mc.timer", Uint, "Monitoring timer (0.25 s units)"),
    c("mc.command", Uint, "Command (e.g. 0x0401 batch read)"),
    c("mc.subcommand", Uint, "Subcommand"),
    c("mc.end_code", Uint, "End code (0 = completed)"),
    c("mc.device", Str, "Head device (e.g. D100)"),
    c("mc.points", Uint, "Number of device points"),
    c("mc.request_frame", Uint, "Request Frame (frame number)"),
    c("mc.response_in", Uint, "Response In (frame number)"),
    c("mc.response_time", Float, "Time from request (seconds)"),
    c("xgt", Proto, "LS XGT FEnet"),
    c("xgt.is_response", Bool, "The frame is a response"),
    c("xgt.invoke", Uint, "Invoke ID"),
    c("xgt.length", Uint, "Length"),
    c(
        "xgt.source",
        Uint,
        "Source of frame (0x33 request, 0x11 response)",
    ),
    c("xgt.command", Uint, "Instruction (0x54 read, 0x58 write)"),
    c("xgt.data_type", Uint, "Data type"),
    c("xgt.error_code", Uint, "Error code (0 = normal)"),
    c("xgt.variable", Str, "Variable (e.g. %MW100)"),
    c("xgt.request_frame", Uint, "Request Frame (frame number)"),
    c("xgt.response_in", Uint, "Response In (frame number)"),
    c("xgt.response_time", Float, "Time from request (seconds)"),
    // Expert 항목 — PortDock 이 정한 이름(Wireshark 의 expert.* 와 다르다)
    c("expert.key", Str, "Expert item key (e.g. pair.no_response, tcp.retransmission)"),
    c("expert.severity", Str, "Expert severity (chat, note, warn, error)"),
];

pub fn lookup(name: &str) -> Option<&'static FieldDef> {
    FIELDS.iter().find(|d| d.name == name)
}

/// 자동 완성 — 이름이 `prefix` 로 시작하는 필드, 없으면 `prefix` 를 포함하는 필드
pub fn complete(prefix: &str) -> Vec<&'static FieldDef> {
    let p = prefix.to_ascii_lowercase();
    let mut v: Vec<_> = FIELDS.iter().filter(|d| d.name.starts_with(&p)).collect();
    if v.is_empty() {
        v = FIELDS.iter().filter(|d| d.name.contains(&p)).collect();
    }
    v
}

/// 이 필드를 보려면 풀어야 하는 가장 깊은 계층
pub fn depth_of(name: &str) -> Depth {
    let head = name.split('.').next().unwrap_or("");
    match head {
        "frame" => {
            if name == "frame.protocols" {
                Depth::App
            } else {
                Depth::Frame
            }
        }
        "eth" | "vlan" => Depth::Link,
        "ip" | "ipv6" | "arp" => Depth::Network,
        "icmp" | "icmpv6" | "tcp" | "udp" => Depth::Transport,
        _ => Depth::App,
    }
}

/// 흐름 분석(상대 번호·재조립·짝)이 있어야 값이 나오는 필드인가
pub fn needs_analysis(name: &str) -> bool {
    let head = name.split('.').next().unwrap_or("");
    matches!(head, "mbtcp" | "modbus" | "mc" | "xgt" | "expert")
        || matches!(
            name,
            "tcp.stream" | "tcp.seq" | "tcp.nxtseq" | "tcp.ack" | "tcp.window_size"
        )
        || name.starts_with("tcp.analysis.")
}

/// 이 필드를 보려면 풀어야 하는 응용 계층 비트(`dissect::APP_*`)
pub fn apps_of(name: &str) -> u8 {
    use crate::dissect::{APP_ALL, APP_DHCP, APP_DNS, APP_INDUSTRIAL};
    match name.split('.').next().unwrap_or("") {
        "dns" => APP_DNS,
        "dhcp" => APP_DHCP,
        "mbtcp" | "modbus" | "mc" | "xgt" => APP_INDUSTRIAL,
        "expert" => APP_ALL,
        "frame" if name == "frame.protocols" => APP_ALL,
        _ => 0,
    }
}
