// 시험용 캡처 파일 만들기 — pcapRead·pcapAnalyze 시험과 브라우저 시험이 쓰는 작은 .pcap·.pcapng 를 바이트로 직접 만든다.
// (공개 샘플 파일을 받지 않는다.) 페이지 코드는 이 파일을 쓰지 않는다.

export interface IpPkt {
  src: string;
  dst: string;
  sport: number;
  dport: number;
  udp?: boolean;
  seq?: number;
  ack?: number;
  /** FIN 1 · SYN 2 · RST 4 · PSH 8 · ACK 16 */
  flags?: number;
  payload?: ArrayLike<number>;
  ipId?: number;
}

export interface Rec {
  /** 유닉스 초(소수 — 마이크로초까지) */
  t: number;
  data: Uint8Array;
  iface?: number;
  /** 그 초 안의 나노초를 직접(소수 t 로는 나노초가 안 맞을 때) — 있으면 t 의 소수는 무시 */
  ns?: number;
}

const ip4 = (s: string) => s.split(".").map(Number);
const be16 = (n: number) => [(n >> 8) & 255, n & 255];
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function csum(b: number[]) {
  let s = 0;
  for (let i = 0; i < b.length; i += 2) s += (b[i] << 8) | (b[i + 1] ?? 0);
  while (s > 0xffff) s = (s & 0xffff) + (s >>> 16);
  return ~s & 0xffff;
}

/** IPv4 + TCP/UDP 바이트 */
export function ipv4(p: IpPkt): Uint8Array {
  const pl = Array.from(p.payload ?? []);
  const l4 = p.udp
    ? [...be16(p.sport), ...be16(p.dport), ...be16(8 + pl.length), 0, 0, ...pl]
    : [...be16(p.sport), ...be16(p.dport), ...be32(p.seq ?? 0), ...be32(p.ack ?? 0), 0x50, p.flags ?? 0x18, ...be16(65535), 0, 0, 0, 0, ...pl];
  const total = 20 + l4.length;
  const h = [0x45, 0, ...be16(total), ...be16(p.ipId ?? 0), 0x40, 0, 64, p.udp ? 17 : 6, 0, 0, ...ip4(p.src), ...ip4(p.dst)];
  const c = csum(h);
  h[10] = c >> 8;
  h[11] = c & 255;
  return Uint8Array.from([...h, ...l4]);
}

/** 링크 머리 씌우기 — 1 Ethernet(vlan 이면 802.1Q), 113 SLL, 276 SLL2, 101 Raw, 0 NULL */
export function wrap(link: number, ip: Uint8Array, vlan?: number): Uint8Array {
  const mac = [0x02, 0, 0, 0, 0, 1, 0x02, 0, 0, 0, 0, 2];
  let head: number[];
  if (link === 1) head = vlan !== undefined ? [...mac, 0x81, 0x00, ...be16(vlan), 0x08, 0x00] : [...mac, 0x08, 0x00];
  else if (link === 113) head = [0, 0, 0, 1, 0, 6, 2, 0, 0, 0, 0, 2, 0, 0, 0x08, 0x00];
  else if (link === 276) head = [0x08, 0x00, 0, 0, 0, 0, 0, 2, 0, 1, 0, 6, 2, 0, 0, 0, 0, 2, 0, 0];
  else if (link === 0) head = [2, 0, 0, 0];
  else head = [];
  const out = [...head, ...ip];
  // 이더넷 최소 길이 채우기(뒤 덧붙임은 IP 길이로 잘려야 한다)
  if (link === 1) while (out.length < 60) out.push(0);
  return Uint8Array.from(out);
}

const w32 = (le: boolean, n: number) => (le ? [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255] : be32(n));
const w16 = (le: boolean, n: number) => (le ? [n & 255, (n >> 8) & 255] : be16(n));

/** 고전 pcap — nano 면 나노초 매직, bigEndian 이면 큰 자리 먼저 */
export function pcap(recs: Rec[], o: { link: number; nano?: boolean; bigEndian?: boolean }): Uint8Array {
  const le = !o.bigEndian;
  const out: number[] = [...w32(le, o.nano ? 0xa1b23c4d : 0xa1b2c3d4), ...w16(le, 2), ...w16(le, 4), ...w32(le, 0), ...w32(le, 0), ...w32(le, 65535), ...w32(le, o.link)];
  for (const r of recs) {
    const sec = Math.floor(r.t);
    const frac = r.ns !== undefined ? (o.nano ? r.ns : Math.floor(r.ns / 1000)) : Math.round((r.t - sec) * 1e6) * (o.nano ? 1000 : 1);
    out.push(...w32(le, sec), ...w32(le, frac), ...w32(le, r.data.length), ...w32(le, r.data.length), ...r.data);
  }
  return Uint8Array.from(out);
}

function block(le: boolean, type: number, body: number[]) {
  while (body.length % 4) body.push(0);
  const len = 12 + body.length;
  return [...w32(le, type), ...w32(le, len), ...body, ...w32(le, len)];
}

export interface NgIface {
  link: number;
  /** if_tsresol 값(9 = 나노초). 없으면 마이크로초 */
  tsresol?: number;
  snap?: number;
}

/** pcapng 한 구역 — recs 의 iface 로 EPB, spb 가 참이면 SPB(시각 없음, 인터페이스 0) */
export function pcapng(ifaces: NgIface[], recs: (Rec & { spb?: boolean })[], o: { bigEndian?: boolean } = {}): Uint8Array {
  const le = !o.bigEndian;
  const out: number[] = [];
  out.push(...block(le, 0x0a0d0d0a, [...w32(le, 0x1a2b3c4d), ...w16(le, 1), ...w16(le, 0), 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
  for (const f of ifaces) {
    const opts: number[] = [];
    if (f.tsresol !== undefined) opts.push(...w16(le, 9), ...w16(le, 1), f.tsresol, 0, 0, 0);
    if (opts.length) opts.push(0, 0, 0, 0);
    out.push(...block(le, 1, [...w16(le, f.link), 0, 0, ...w32(le, f.snap ?? 0), ...opts]));
  }
  for (const r of recs) {
    if (r.spb) {
      out.push(...block(le, 3, [...w32(le, r.data.length), ...r.data]));
      continue;
    }
    const f = ifaces[r.iface ?? 0];
    const res = f.tsresol ?? 6;
    const per = 10n ** BigInt(res);
    const sec = BigInt(Math.floor(r.t));
    const frac = r.ns !== undefined ? (BigInt(r.ns) * per) / 1000000000n : (BigInt(Math.round((r.t - Math.floor(r.t)) * 1e6)) * per) / 1000000n;
    const units = sec * per + frac;
    const hi = Number(units >> 32n);
    const lo = Number(units & 0xffffffffn);
    out.push(...block(le, 6, [...w32(le, r.iface ?? 0), ...w32(le, hi), ...w32(le, lo), ...w32(le, r.data.length), ...w32(le, r.data.length), ...r.data]));
  }
  return Uint8Array.from(out);
}

/** 이어 붙이기 */
export const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
};

/** TCP 연결 하나 — 순서 번호를 알아서 센다. 보낸 패킷은 ip 바이트로 쌓인다 */
export class TcpConv {
  c: { ip: string; port: number; seq: number; id: number };
  s: { ip: string; port: number; seq: number; id: number };
  out: { t: number; ip: Uint8Array }[] = [];
  constructor(client: string, cport: number, server: string, sport: number) {
    this.c = { ip: client, port: cport, seq: 1000, id: 100 };
    this.s = { ip: server, port: sport, seq: 50000, id: 900 };
  }
  private send(fromClient: boolean, t: number, payload: ArrayLike<number>, flags = 0x18, seq?: number) {
    const a = fromClient ? this.c : this.s;
    const b = fromClient ? this.s : this.c;
    const pkt = ipv4({ src: a.ip, dst: b.ip, sport: a.port, dport: b.port, seq: seq ?? a.seq, ack: b.seq, flags, payload, ipId: a.id++ });
    this.out.push({ t, ip: pkt });
    if (seq === undefined) a.seq = (a.seq + payload.length + (flags & 3 ? 1 : 0)) >>> 0;
    return pkt;
  }
  handshake(t: number) {
    this.send(true, t, [], 0x02);
    this.send(false, t + 0.0001, [], 0x12);
    this.send(true, t + 0.0002, [], 0x10);
    return this;
  }
  c2s(t: number, payload: ArrayLike<number>) {
    return this.send(true, t, payload);
  }
  s2c(t: number, payload: ArrayLike<number>) {
    return this.send(false, t, payload);
  }
  /** 지금 순서 번호를 바꾸지 않고(재전송처럼) 보낸다 */
  c2sAt(t: number, seqOffset: number, payload: ArrayLike<number>) {
    return this.send(true, t, payload, 0x18, (this.c.seq + seqOffset) >>> 0);
  }
  /** 순서 번호를 건너뛴다(캡처가 빠뜨린 바이트) */
  skipClient(n: number) {
    this.c.seq = (this.c.seq + n) >>> 0;
  }
  fin(fromClient: boolean, t: number) {
    return this.send(fromClient, t, [], 0x11);
  }
  recs(link = 1, vlan?: number): Rec[] {
    return this.out.map((x) => ({ t: x.t, data: wrap(link, x.ip, vlan) }));
  }
}

// ---- 프로토콜 프레임

/** Modbus TCP 프레임 */
export const mbap = (tid: number, unit: number, pdu: number[]) => [...be16(tid), 0, 0, ...be16(pdu.length + 1), unit, ...pdu];
const le2 = (n: number) => [n & 0xff, n >> 8];
/** MC 3E 이진 요청(자기 국, 감시 타이머 0010) — mcDecode.test.ts 의 b3 와 같은 모양 */
export const mc3eReq = (cmd: number[]) => [0x50, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + cmd.length), 0x10, 0x00, ...cmd];
export const mc3eResp = (end: number, data: number[]) => [0xd0, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + data.length), ...le2(end), ...data];
export const mc4eReq = (serial: number, cmd: number[]) => [0x54, 0x00, ...le2(serial), 0, 0, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + cmd.length), 0x10, 0x00, ...cmd];
export const mc4eResp = (serial: number, end: number, data: number[]) => [0xd4, 0x00, ...le2(serial), 0, 0, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + data.length), ...le2(end), ...data];
const h4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");
export const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
/** MC 3E ASCII 요청·응답(글) — mcDecode.test.ts 의 a3·a3ok 와 같은 모양 */
export const mc3eAsciiReq = (cmd: string) => ascii(`500000FF03FF00${h4(4 + cmd.length)}0010${cmd}`);
export const mc3eAsciiResp = (data: string, end = 0) => ascii(`D00000FF03FF00${h4(4 + data.length)}${h4(end)}${data}`);
