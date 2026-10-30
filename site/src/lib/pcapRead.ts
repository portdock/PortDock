// 웹 도구 «산업 통신 pcap 해석기» 의 읽기 쪽 — .pcap·.pcapng 파일에서 패킷을 꺼내고, 링크·IPv4·TCP·UDP 머리를 푼다.
// 순수 함수만(브라우저·Node 둘 다). 시험: pcapRead.test.ts(직접 만든 바이트 — pcapFixture.ts).
// 근거(형식 문서, 링크만): pcap — https://www.tcpdump.org/manpages/pcap-savefile.5.txt · draft-ietf-opsawg-pcap,
// pcapng — draft-ietf-opsawg-pcapng(SHB·IDB·EPB·SPB·if_tsresol·if_tsoffset), 링크 종류 — https://www.tcpdump.org/linktypes.html
// (0 NULL·1 ETHERNET·101 RAW·108 LOOP·113 LINUX_SLL·228 IPV4·229 IPV6·276 LINUX_SLL2).

export type CaptureFormat = "pcap" | "pcapng";

/** 패킷 하나 — data 는 원래 버퍼의 일부(복사 아님) */
export interface RawPacket {
  /** 1부터 — Wireshark 의 «No.» 와 같은 순서 */
  no: number;
  sec: number;
  /** 그 초 안의 나노초 */
  ns: number;
  iface: number;
  link: number;
  data: Uint8Array;
  origLen: number;
}

export interface CaptureInfo {
  format: CaptureFormat;
  /** pcap: 마이크로초·나노초, pcapng: 인터페이스마다 다를 수 있음 */
  precision: "us" | "ns" | "mixed";
  bigEndian: boolean;
  interfaces: number;
  linkTypes: number[];
  packets: number;
  /** 파일 끝이 잘려 다 읽지 못함 */
  truncatedFile: boolean;
}

export class CaptureError extends Error {
  code: "empty" | "gzip" | "unknown" | "corrupt";
  constructor(code: CaptureError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const u32le = (d: Uint8Array, i: number) => (d[i] | (d[i + 1] << 8) | (d[i + 2] << 16) | (d[i + 3] << 24)) >>> 0;
const u32be = (d: Uint8Array, i: number) => ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
const u16le = (d: Uint8Array, i: number) => d[i] | (d[i + 1] << 8);
const u16be = (d: Uint8Array, i: number) => (d[i] << 8) | d[i + 1];

/**
 * 파일 전체를 돌며 패킷마다 onPacket 을 부른다. onProgress(0~1)는 대략 1MB 마다.
 * 알 수 없는 형식이면 CaptureError. 끝이 잘린 파일은 읽은 데까지만(truncatedFile).
 */
export function readCapture(buf: Uint8Array, onPacket: (p: RawPacket) => void, onProgress?: (f: number) => void): CaptureInfo {
  if (buf.length < 4) throw new CaptureError("empty", "empty");
  if (buf[0] === 0x1f && buf[1] === 0x8b) throw new CaptureError("gzip", "gzip");
  const m = u32le(buf, 0);
  if (m === 0x0a0d0d0a) return readPcapng(buf, onPacket, onProgress);
  if (m === 0xa1b2c3d4 || m === 0xd4c3b2a1 || m === 0xa1b23c4d || m === 0x4d3cb2a1) return readPcap(buf, onPacket, onProgress);
  throw new CaptureError("unknown", "unknown");
}

function readPcap(buf: Uint8Array, onPacket: (p: RawPacket) => void, onProgress?: (f: number) => void): CaptureInfo {
  const m = u32le(buf, 0);
  const bigEndian = m === 0xd4c3b2a1 || m === 0x4d3cb2a1;
  const nano = m === 0xa1b23c4d || m === 0x4d3cb2a1;
  const u32 = bigEndian ? u32be : u32le;
  if (buf.length < 24) throw new CaptureError("corrupt", "header");
  const link = u32(buf, 20) & 0x0fffffff;
  let i = 24;
  let no = 0;
  let nextTick = 1 << 20;
  let truncated = false;
  while (i < buf.length) {
    if (i + 16 > buf.length) {
      truncated = true;
      break;
    }
    const sec = u32(buf, i);
    const frac = u32(buf, i + 4);
    const incl = u32(buf, i + 8);
    const orig = u32(buf, i + 12);
    if (incl > 0x4000000) throw new CaptureError("corrupt", "record");
    if (i + 16 + incl > buf.length) {
      truncated = true;
      break;
    }
    onPacket({ no: ++no, sec, ns: nano ? frac : frac * 1000, iface: 0, link, data: buf.subarray(i + 16, i + 16 + incl), origLen: orig });
    i += 16 + incl;
    if (onProgress && i >= nextTick) {
      onProgress(i / buf.length);
      nextTick = i + (1 << 20);
    }
  }
  return { format: "pcap", precision: nano ? "ns" : "us", bigEndian, interfaces: 1, linkTypes: [link], packets: no, truncatedFile: truncated };
}

interface Iface {
  link: number;
  snap: number;
  /** 단위: 10^-k 초(pow10=true) 또는 2^-k 초 */
  k: number;
  pow10: boolean;
  offset: number;
}

/** 64비트 시각(단위 수) → 초·나노초 */
function tsOf(hi: number, lo: number, f: Iface): [number, number] {
  if (f.pow10 && f.k <= 9 && hi < 0x200000) {
    // 2^53 안 — Number 로 바로
    const units = hi * 4294967296 + lo;
    const per = 10 ** f.k;
    const sec = Math.floor(units / per);
    return [sec + f.offset, (units - sec * per) * 10 ** (9 - f.k)];
  }
  const units = (BigInt(hi) << 32n) | BigInt(lo);
  const per = f.pow10 ? 10n ** BigInt(f.k) : 1n << BigInt(f.k);
  const sec = units / per;
  const rem = units % per;
  return [Number(sec) + f.offset, Number((rem * 1000000000n) / per)];
}

function readPcapng(buf: Uint8Array, onPacket: (p: RawPacket) => void, onProgress?: (f: number) => void): CaptureInfo {
  let i = 0;
  let no = 0;
  let le = true;
  let ifaces: Iface[] = [];
  let ifaceBase = 0;
  let totalIfaces = 0;
  const links = new Set<number>();
  const precisions = new Set<string>();
  let anyBig = false;
  let truncated = false;
  let nextTick = 1 << 20;
  while (i < buf.length) {
    if (i + 12 > buf.length) {
      truncated = true;
      break;
    }
    const type = le ? u32le(buf, i) : u32be(buf, i);
    if (type === 0x0a0d0d0a) {
      // SHB — 바이트 순서 표시로 엔디언을 정한다. 새 구역이면 인터페이스 목록을 새로 시작
      if (i + 12 > buf.length) break;
      const bom = u32le(buf, i + 8);
      if (bom === 0x1a2b3c4d) le = true;
      else if (bom === 0x4d3c2b1a) le = false;
      else throw new CaptureError("corrupt", "bom");
      if (!le) anyBig = true;
      ifaceBase += ifaces.length;
      ifaces = [];
    }
    const u32 = le ? u32le : u32be;
    const u16 = le ? u16le : u16be;
    const len = u32(buf, i + 4);
    if (len < 12 || len % 4 !== 0) throw new CaptureError("corrupt", "block");
    if (i + len > buf.length) {
      truncated = true;
      break;
    }
    const body = i + 8;
    const end = i + len - 4;
    if (type === 1) {
      // IDB
      const f: Iface = { link: u16(buf, body), snap: u32(buf, body + 4), k: 6, pow10: true, offset: 0 };
      let o = body + 8;
      while (o + 4 <= end) {
        const code = u16(buf, o);
        const olen = u16(buf, o + 2);
        if (code === 0) break;
        if (code === 9 && olen >= 1) {
          const v = buf[o + 4];
          f.pow10 = (v & 0x80) === 0;
          f.k = v & 0x7f;
        } else if (code === 14 && olen === 8) {
          const hi = u32(buf, le ? o + 8 : o + 4);
          const lo = u32(buf, le ? o + 4 : o + 8);
          f.offset = hi * 4294967296 + lo;
        }
        o += 4 + ((olen + 3) & ~3);
      }
      ifaces.push(f);
      totalIfaces++;
      links.add(f.link);
      precisions.add(f.pow10 && f.k === 6 ? "us" : f.pow10 && f.k === 9 ? "ns" : "other");
    } else if (type === 6 || type === 2) {
      // EPB(6) · 옛 Packet Block(2)
      const id = type === 6 ? u32(buf, body) : u16(buf, body);
      const f = ifaces[id];
      if (f) {
        const hi = u32(buf, body + 4);
        const lo = u32(buf, body + 8);
        const cap = u32(buf, body + 12);
        const orig = u32(buf, body + 16);
        const d = body + 20;
        const c = Math.min(cap, end - d);
        const [sec, ns] = tsOf(hi, lo, f);
        onPacket({ no: ++no, sec, ns, iface: ifaceBase + id, link: f.link, data: buf.subarray(d, d + Math.max(0, c)), origLen: orig });
      }
    } else if (type === 3) {
      // SPB — 시각 없음, 인터페이스 0
      const f = ifaces[0];
      if (f) {
        const orig = u32(buf, body);
        const d = body + 4;
        let c = Math.min(orig, end - d);
        if (f.snap > 0) c = Math.min(c, f.snap);
        onPacket({ no: ++no, sec: NaN, ns: 0, iface: ifaceBase, link: f.link, data: buf.subarray(d, d + Math.max(0, c)), origLen: orig });
      }
    }
    i += len;
    if (onProgress && i >= nextTick) {
      onProgress(i / buf.length);
      nextTick = i + (1 << 20);
    }
  }
  const precision = precisions.size === 1 && !precisions.has("other") ? ([...precisions][0] as "us" | "ns") : precisions.size === 0 ? "us" : "mixed";
  return { format: "pcapng", precision, bigEndian: anyBig, interfaces: totalIfaces, linkTypes: [...links], packets: no, truncatedFile: truncated };
}

// ---------------------------------------------------------------- 링크 · IP · TCP/UDP

export type Layer =
  | { kind: "ipv4"; ip: Ipv4 }
  | { kind: "ipv6" }
  | { kind: "arp" }
  | { kind: "other-ether"; type: number }
  | { kind: "unsupported-link" }
  | { kind: "short" };

export interface Ipv4 {
  src: string;
  dst: string;
  id: number;
  proto: number;
  /** IP 머리 + 실은 데이터(머리의 전체 길이) */
  totalLen: number;
  fragment: boolean;
  /** TCP·UDP 이면 채워진다 */
  tcp?: Tcp;
  udp?: Udp;
}

export interface Tcp {
  sport: number;
  dport: number;
  seq: number;
  ack: number;
  /** FIN 1 · SYN 2 · RST 4 · PSH 8 · ACK 16 */
  flags: number;
  payload: Uint8Array;
  /** 머리가 말하는 데이터 길이 — 캡처 길이(snaplen)로 잘렸으면 payload 보다 길다 */
  fullLen: number;
}

export interface Udp {
  sport: number;
  dport: number;
  payload: Uint8Array;
  fullLen: number;
}

export const FIN = 1;
export const SYN = 2;
export const RST = 4;
export const ACK = 16;

const ipText = (d: Uint8Array, i: number) => `${d[i]}.${d[i + 1]}.${d[i + 2]}.${d[i + 3]}`;

/** 링크 머리를 벗겨 IP 가 시작하는 곳과 이더타입을 찾는다 */
function linkStrip(link: number, d: Uint8Array): { at: number; type: number } | "unsupported" | "short" {
  switch (link) {
    case 1: {
      // Ethernet II (+ 802.1Q·802.1ad VLAN 겹침)
      let at = 12;
      if (d.length < 14) return "short";
      let type = u16be(d, at);
      while (type === 0x8100 || type === 0x88a8 || type === 0x9100) {
        at += 4;
        if (d.length < at + 2) return "short";
        type = u16be(d, at);
      }
      return { at: at + 2, type };
    }
    case 0: {
      // BSD 루프백(Npcap Loopback 도) — 4바이트 주소 계열, 기록한 PC 의 바이트 순서
      if (d.length < 4) return "short";
      const fam = d[0] || d[3];
      return { at: 4, type: fam === 2 ? 0x0800 : fam === 24 || fam === 28 || fam === 30 ? 0x86dd : -1 };
    }
    case 108: {
      if (d.length < 4) return "short";
      const fam = u32be(d, 0);
      return { at: 4, type: fam === 2 ? 0x0800 : fam === 24 || fam === 28 || fam === 30 ? 0x86dd : -1 };
    }
    case 101:
    case 12:
    case 14:
    case 228:
    case 229: {
      if (d.length < 1) return "short";
      const v = d[0] >> 4;
      return { at: 0, type: v === 4 ? 0x0800 : v === 6 ? 0x86dd : -1 };
    }
    case 113:
      if (d.length < 16) return "short";
      return { at: 16, type: u16be(d, 14) };
    case 276:
      if (d.length < 20) return "short";
      return { at: 20, type: u16be(d, 0) };
    default:
      return "unsupported";
  }
}

/** 패킷 하나를 IPv4·TCP·UDP 까지 푼다 */
export function decodeLayers(link: number, d: Uint8Array): Layer {
  const s = linkStrip(link, d);
  if (s === "unsupported") return { kind: "unsupported-link" };
  if (s === "short") return { kind: "short" };
  if (s.type === 0x86dd) return { kind: "ipv6" };
  if (s.type === 0x0806) return { kind: "arp" };
  if (s.type !== 0x0800) return { kind: "other-ether", type: s.type };
  const a = s.at;
  if (d.length < a + 20 || d[a] >> 4 !== 4) return { kind: "short" };
  const ihl = (d[a] & 15) * 4;
  const totalLen = u16be(d, a + 2);
  if (ihl < 20 || totalLen < ihl) return { kind: "short" };
  const fragWord = u16be(d, a + 6);
  const ip: Ipv4 = {
    src: ipText(d, a + 12),
    dst: ipText(d, a + 16),
    id: u16be(d, a + 4),
    proto: d[a + 9],
    totalLen,
    fragment: (fragWord & 0x2000) !== 0 || (fragWord & 0x1fff) !== 0,
  };
  if (ip.fragment) return { kind: "ipv4", ip };
  // 이더넷 덧붙임(60바이트 채우기)은 IP 전체 길이로 잘라 낸다
  const ipEnd = Math.min(d.length, a + totalLen);
  const t = a + ihl;
  if (ip.proto === 6 && ipEnd >= t + 20) {
    const off = (d[t + 12] >> 4) * 4;
    if (off >= 20 && ipEnd >= t + off) {
      ip.tcp = {
        sport: u16be(d, t),
        dport: u16be(d, t + 2),
        seq: u32be(d, t + 4),
        ack: u32be(d, t + 8),
        flags: d[t + 13],
        payload: d.subarray(t + off, ipEnd),
        fullLen: Math.max(0, totalLen - ihl - off),
      };
    }
  } else if (ip.proto === 17 && ipEnd >= t + 8) {
    const ulen = u16be(d, t + 4);
    ip.udp = { sport: u16be(d, t), dport: u16be(d, t + 2), payload: d.subarray(t + 8, Math.min(ipEnd, t + Math.max(8, ulen))), fullLen: Math.max(0, ulen - 8) };
  }
  return { kind: "ipv4", ip };
}

export const LINK_NAMES: Record<number, string> = {
  0: "NULL/Loopback",
  1: "Ethernet",
  12: "Raw IP",
  14: "Raw IP",
  101: "Raw IP",
  108: "Loopback",
  113: "Linux cooked (SLL)",
  228: "Raw IPv4",
  229: "Raw IPv6",
  276: "Linux cooked v2 (SLL2)",
};
