// 웹 도구 «산업 통신 pcap 해석기» 의 풀이 쪽 — 패킷(pcapRead.ts)을 연결별로 모아 TCP 를 다시 잇고,
// Modbus TCP·MC 프로토콜(3E·4E, 이진·ASCII) 프레임으로 자른 뒤 요청·응답 짝·응답 시간·무응답·예외/종료 코드를 센다.
// 산업 프로토콜이 아닌 통신은 풀지 않고 패킷 수만 센다(내용·주소를 결과에 넣지 않음).
// 순수 함수(브라우저 Worker·Node 시험 둘 다). 시험: pcapAnalyze.test.ts.
// 근거: Modbus Messaging on TCP/IP Implementation Guide V1.0b(MBAP·트랜잭션 ID), SLMP Reference Manual SH(NA)-080956ENG 4장
// (3E·4E 머리, 4E 일련번호, 종료 코드·오류 정보), pktmon etl2pcap 문서(같은 패킷이 여러 구성 요소에서 잡힘).
import { decodeLayers, readCapture, ACK, FIN, RST, SYN, type CaptureInfo, type RawPacket, type Tcp } from "./pcapRead.ts";
import { funcName, EXCEPTIONS } from "./modbusDecode.ts";
import { commandName, endText, MC_DEVICES, devByName, addrText } from "./mcDecode.ts";
import type { Lang } from "./checksum.ts";

export type Proto = "modbus" | "mc";
export type Status = "ok" | "exception" | "timeout" | "closed" | "cut" | "orphan";

export interface AnalyzeOpts {
  modbusPorts: number[];
  mcPorts: number[];
  /** 목록 밖 포트도 첫 바이트 모양(MBAP·MC 서브헤더)으로 찾기 */
  autoDetect: boolean;
  /** 이 시간 안에 응답이 없으면 무응답 */
  timeoutMs: number;
  /** pktmon 처럼 같은 패킷이 여러 번 든 파일에서 겹친 것 빼기 */
  dedupe: boolean;
  lang: Lang;
  /** 표에 남길 거래 수(완료 / 그 밖 각각) — 집계는 전부 */
  rowCap?: number;
  /** 그래프 점 수 */
  pointCap?: number;
}

export const DEFAULT_OPTS: AnalyzeOpts = { modbusPorts: [502], mcPorts: [], autoDetect: true, timeoutMs: 1000, dedupe: true, lang: "ko" };

/** «502, 1502, 5000-5010» → 포트 목록. 틀리면 null */
export function parsePorts(s: string): number[] | null {
  const out = new Set<number>();
  for (const part of s.split(/[\s,;]+/).filter(Boolean)) {
    const m = part.match(/^(\d{1,5})(?:-(\d{1,5}))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > 65535 || b < a || b - a > 1000) return null;
    for (let p = a; p <= b; p++) out.add(p);
  }
  return [...out];
}

export interface Txn {
  /** 연결 번호(C1 이면 1) */
  conv: number;
  proto: Proto;
  /** 요청(없으면 응답) 시각 — 첫 패킷부터 나노초 */
  t: number;
  reqNo: number | null;
  respNo: number | null;
  /** Modbus 유닛 ID · MC 국(네트워크-PC-I/O-국번) */
  unit: string;
  fn: number | null;
  sub: number | null;
  fnName: string;
  /** Modbus 0 기준 주소 · MC 디바이스(D100) */
  addr: string;
  qty: number | null;
  /** Modbus 트랜잭션 ID · MC 4E 일련번호 */
  tag: number | null;
  rtMs: number | null;
  status: Status;
  code: number | null;
  codeName: string;
  ascii: boolean;
  req?: Uint8Array;
  resp?: Uint8Array;
}

export interface RtStat {
  requests: number;
  ok: number;
  exception: number;
  timeout: number;
  closed: number;
  cut: number;
  orphan: number;
  /** ms — 응답이 하나도 없으면 null */
  min: number | null;
  median: number | null;
  p95: number | null;
  max: number | null;
}

export interface Conv extends RtStat {
  id: number;
  proto: Proto;
  transport: "tcp" | "udp";
  client: string;
  server: string;
  packets: number;
  frames: number;
  firstT: number;
  lastT: number;
  retrans: number;
  gaps: number;
  skippedBytes: number;
  closedT: number | null;
  /** 요청 간격 중앙값(ms) */
  interval: number | null;
  mcCode: "binary" | "ascii" | "mixed" | null;
}

export interface Group extends RtStat {
  key: string;
  proto: Proto;
  label: string;
  /** 장치 묶음이면 서버 주소(화면에만) */
  server?: string;
}

export interface CodeCount {
  proto: Proto;
  code: number;
  name: string;
  count: number;
}

export interface Analysis {
  capture: CaptureInfo;
  /** 첫 패킷 시각(유닉스 초·나노초) — 없으면 null */
  start: { sec: number; ns: number } | null;
  durationMs: number;
  counts: {
    packets: number;
    ipv4: number;
    ipv6: number;
    arp: number;
    otherEther: number;
    short: number;
    unsupportedLink: number;
    fragments: number;
    tcp: number;
    udp: number;
    otherIp: number;
    /** pktmon 식 겹침으로 뺀 것 */
    duplicates: number;
    /** 산업 프로토콜 연결의 패킷 */
    industrial: number;
    /** 그 밖의 TCP·UDP(풀지 않음) */
    otherTcpUdp: number;
    otherConvs: number;
    /** snaplen 으로 잘린 패킷 */
    truncated: number;
  };
  overall: RtStat;
  convs: Conv[];
  devices: Group[];
  funcs: Group[];
  codes: CodeCount[];
  rows: Txn[];
  /** 표에서 빠진 거래 수(집계에는 들어감) */
  rowsDropped: number;
  /** 그래프 점: [시각 ms, 응답 시간 ms(무응답은 -1), 상태 번호] */
  points: [number, number, number][];
  pointsSampled: boolean;
}

export const STATUS_ORDER: Status[] = ["ok", "exception", "timeout", "closed", "cut", "orphan"];

// ---------------------------------------------------------------- 프레임 길이(머리의 길이 칸으로 자르기)

const u16be = (d: Uint8Array, i: number) => (d[i] << 8) | d[i + 1];
const u16le = (d: Uint8Array, i: number) => d[i] | (d[i + 1] << 8);
const isHex = (c: number) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
function hexNum(d: Uint8Array, i: number, n: number): number {
  let v = 0;
  for (let k = 0; k < n; k++) {
    const c = d[i + k];
    if (!isHex(c)) return -1;
    v = v * 16 + parseInt(String.fromCharCode(c), 16);
  }
  return v;
}
const asc = (d: Uint8Array, i: number, n: number) => String.fromCharCode(...d.subarray(i, i + n));

/** Modbus TCP: 0 = 더 받아야 함, -1 = 머리 모양이 아님, n = 프레임 길이 */
export function modbusFrameLen(d: Uint8Array, len = d.length): number {
  if (len < 6) return 0;
  const L = u16be(d, 4);
  if (d[2] !== 0 || d[3] !== 0 || L < 2 || L > 254) return -1;
  return 6 + L;
}

type McKind = { ascii: boolean; e4: boolean; req: boolean };
function mcKind(d: Uint8Array, len: number): McKind | null | 0 {
  if (len < 2) return 0;
  const b0 = d[0];
  const b1 = d[1];
  if (b1 === 0x00 && (b0 === 0x50 || b0 === 0xd0 || b0 === 0x54 || b0 === 0xd4)) return { ascii: false, e4: b0 === 0x54 || b0 === 0xd4, req: b0 === 0x50 || b0 === 0x54 };
  if (len < 4) {
    // ASCII 머리 앞부분일 수 있음
    const s = asc(d, 0, len).toUpperCase();
    return ["5000", "D000", "5400", "D400"].some((x) => x.startsWith(s)) ? 0 : null;
  }
  const s = asc(d, 0, 4).toUpperCase();
  if (s === "5000" || s === "D000" || s === "5400" || s === "D400") return { ascii: true, e4: s[1] === "4", req: s[0] === "5" };
  return null;
}

/** MC 3E·4E 이진·ASCII: 0 = 더 받아야 함, -1 = 아님, n = 프레임 길이 */
export function mcFrameLen(d: Uint8Array, len = d.length): number {
  const k = mcKind(d, len);
  if (k === 0) return 0;
  if (!k) return -1;
  if (!k.ascii) {
    const head = k.e4 ? 13 : 9;
    if (len < head) return 0;
    const L = u16le(d, head - 2);
    if (L < 2 || L > 8192) return -1;
    return head + L;
  }
  const head = k.e4 ? 26 : 18;
  if (len < head) return 0;
  const L = hexNum(d, head - 4, 4);
  if (L < 4 || L > 16384) return -1;
  return head + L;
}

const fcValid = (fc: number) => {
  const f = fc & 0x7f;
  return f >= 1 && f <= 0x2b;
};

/** 목록 밖 포트에서 첫 바이트로 찾기 — 첫 프레임이 다 들어 있어야 한다 */
function sniff(d: Uint8Array): Proto | null {
  const m = mcFrameLen(d);
  if (m > 0 && m <= d.length) return "mc";
  const n = modbusFrameLen(d);
  if (n > 0 && n <= d.length && d.length >= 8 && fcValid(d[7])) return "modbus";
  return null;
}

// ---------------------------------------------------------------- 프레임 풀이(짝 맞추기에 필요한 것만 — 칸마다 풀이는 기존 해석기)

interface Frame {
  bytes: Uint8Array;
  t: number;
  no: number;
  from: string;
}

interface McHead {
  req: boolean;
  ascii: boolean;
  e4: boolean;
  serial: number | null;
  station: string;
  cmd: number | null;
  sub: number | null;
  end: number | null;
  addr: string;
  qty: number | null;
}

const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const h4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

export function mcHead(d: Uint8Array): McHead | null {
  const k = mcKind(d, d.length);
  if (!k) return null;
  const out: McHead = { req: k.req, ascii: k.ascii, e4: k.e4, serial: null, station: "", cmd: null, sub: null, end: null, addr: "", qty: null };
  if (!k.ascii) {
    const o = k.e4 ? 6 : 2;
    if (d.length < o + 9) return null;
    if (k.e4) out.serial = u16le(d, 2);
    out.station = `${h2(d[o])}-${h2(d[o + 1])}-${h4(u16le(d, o + 2))}-${h2(d[o + 4])}`;
    const body = o + 7;
    if (k.req) {
      if (d.length >= body + 6) {
        out.cmd = u16le(d, body + 2);
        out.sub = u16le(d, body + 4);
        if ((out.cmd === 0x0401 || out.cmd === 0x1401) && (out.sub & ~3) === 0) {
          const wide = (out.sub & 2) !== 0;
          const a = body + 6;
          const need = wide ? 8 : 6;
          if (d.length >= a + need) {
            const no = wide ? (d[a] | (d[a + 1] << 8) | (d[a + 2] << 16) | (d[a + 3] << 24)) >>> 0 : d[a] | (d[a + 1] << 8) | (d[a + 2] << 16);
            const code = wide ? u16le(d, a + 4) : d[a + 3];
            const dev = MC_DEVICES.find((x) => x.code === code);
            out.addr = dev ? addrText(dev, no) : `?${h2(code)}:${no}`;
            out.qty = u16le(d, a + need - 2);
          }
        }
      }
    } else {
      out.end = u16le(d, body);
      if (out.end !== 0 && d.length >= body + 2 + 9) {
        out.cmd = u16le(d, body + 2 + 5);
        out.sub = u16le(d, body + 2 + 7);
      }
    }
    return out;
  }
  const o = k.e4 ? 12 : 4;
  if (d.length < o + 14) return null;
  if (k.e4) out.serial = hexNum(d, 4, 4);
  out.station = asc(d, o, 2) + "-" + asc(d, o + 2, 2) + "-" + asc(d, o + 4, 4) + "-" + asc(d, o + 8, 2);
  out.station = out.station.toUpperCase();
  const body = o + 14;
  if (k.req) {
    if (d.length >= body + 12) {
      out.cmd = hexNum(d, body + 4, 4);
      out.sub = hexNum(d, body + 8, 4);
      if ((out.cmd === 0x0401 || out.cmd === 0x1401) && out.sub >= 0 && (out.sub & ~3) === 0) {
        const wide = (out.sub & 2) !== 0;
        const a = body + 12;
        const cl = wide ? 4 : 2;
        const nl = wide ? 8 : 6;
        if (d.length >= a + cl + nl + 4) {
          const name = asc(d, a, cl).replace(/[* ]+$/, "");
          const dev = devByName(name);
          const digits = asc(d, a + cl, nl).trim();
          const no = dev ? parseInt(digits || "0", dev.hex ? 16 : 10) : NaN;
          out.addr = dev && !Number.isNaN(no) ? addrText(dev, no) : name + digits;
          out.qty = hexNum(d, a + cl + nl, 4);
        }
      }
    }
  } else {
    out.end = hexNum(d, body, 4);
    if (out.end > 0 && d.length >= body + 4 + 18) {
      out.cmd = hexNum(d, body + 4 + 10, 4);
      out.sub = hexNum(d, body + 4 + 14, 4);
    }
  }
  return out;
}

// ---------------------------------------------------------------- 통계

class Grow {
  a = new Float64Array(64);
  n = 0;
  push(v: number) {
    if (this.n === this.a.length) {
      const b = new Float64Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    this.a[this.n++] = v;
  }
  sorted() {
    return this.a.slice(0, this.n).sort();
  }
}

/** 가장 가까운 순위(nearest-rank) 백분위 — 정렬된 배열 */
export function percentile(sorted: ArrayLike<number>, p: number): number | null {
  if (!sorted.length) return null;
  const i = Math.max(1, Math.ceil(p * sorted.length)) - 1;
  return sorted[Math.min(sorted.length - 1, i)];
}

interface Acc {
  st: Record<Status, number>;
  rt: Grow;
}
const newAcc = (): Acc => ({ st: { ok: 0, exception: 0, timeout: 0, closed: 0, cut: 0, orphan: 0 }, rt: new Grow() });
/** ms 를 나노초 자리까지 */
const round3 = (v: number | null) => (v === null ? null : Math.round(v * 1e6) / 1e6);
function rtStat(a: Acc): RtStat {
  const s = a.rt.sorted();
  const requests = a.st.ok + a.st.exception + a.st.timeout + a.st.closed + a.st.cut;
  return {
    requests,
    ...a.st,
    min: round3(s.length ? s[0] : null),
    median: round3(percentile(s, 0.5)),
    p95: round3(percentile(s, 0.95)),
    max: round3(s.length ? s[s.length - 1] : null),
  };
}

// ---------------------------------------------------------------- TCP 다시 잇기

const sdiff = (a: number, b: number) => (a - b) | 0;

interface Seg {
  seq: number;
  data: Uint8Array;
  full: number;
  t: number;
  no: number;
}

class Dir {
  from: string;
  next: number | null = null;
  ooo: Seg[] = [];
  buf = new Uint8Array(512);
  len = 0;
  startNo = 0;
  constructor(from: string) {
    this.from = from;
  }
  append(d: Uint8Array) {
    if (this.len + d.length > this.buf.length) {
      let n = this.buf.length * 2;
      while (n < this.len + d.length) n *= 2;
      const b = new Uint8Array(n);
      b.set(this.buf.subarray(0, this.len));
      this.buf = b;
    }
    this.buf.set(d, this.len);
    this.len += d.length;
  }
  drop(n: number) {
    this.buf.copyWithin(0, n, this.len);
    this.len -= n;
  }
}

interface Pending {
  t: number;
  no: number;
  bytes: Uint8Array;
  unit: string;
  fn: number | null;
  sub: number | null;
  fnName: string;
  addr: string;
  qty: number | null;
  tag: number | null;
  ascii: boolean;
  devKey: string;
  fnKey: string;
}

interface ConvState {
  idx: number;
  transport: "tcp" | "udp";
  ends: [string, string];
  ports: [number, number];
  proto: Proto | "other" | null;
  client: string | null;
  dirs: Map<string, Dir>;
  packets: number;
  frames: number;
  firstT: number;
  lastT: number;
  retrans: number;
  gaps: number;
  skipped: number;
  closedT: number | null;
  rst: boolean;
  pending: Pending[];
  reqT: Grow;
  acc: Acc;
  codes: { bin: number; asc: number };
}

/** 파일 바이트 → 분석 결과. onProgress(0~1) */
export function analyzeCapture(buf: Uint8Array, opts: Partial<AnalyzeOpts> = {}, onProgress?: (f: number) => void): Analysis {
  const o: AnalyzeOpts = { ...DEFAULT_OPTS, ...opts };
  const lang = o.lang;
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const timeoutNs = o.timeoutMs * 1e6;
  const rowCap = o.rowCap ?? 20000;
  const pointCap = o.pointCap ?? 4000;
  const mbPorts = new Set(o.modbusPorts);
  const mcPorts = new Set(o.mcPorts);

  const counts: Analysis["counts"] = { packets: 0, ipv4: 0, ipv6: 0, arp: 0, otherEther: 0, short: 0, unsupportedLink: 0, fragments: 0, tcp: 0, udp: 0, otherIp: 0, duplicates: 0, industrial: 0, otherTcpUdp: 0, otherConvs: 0, truncated: 0 };
  const convMap = new Map<string, ConvState>();
  const allConvs: ConvState[] = [];
  const overall = newAcc();
  const devices = new Map<string, { acc: Acc; proto: Proto; label: string; server: string }>();
  const funcs = new Map<string, { acc: Acc; proto: Proto; label: string }>();
  const codes = new Map<string, CodeCount>();
  const rowsOk: Txn[] = [];
  const rowsBad: Txn[] = [];
  let dropped = 0;
  const pts: [number, number, number][] = [];
  let ptsSeen = 0;

  let sec0 = NaN;
  let ns0 = 0;
  let lastT = 0;
  const dupSeen = new Map<string, number>();
  const dupQ: [string, number][] = [];
  let dupHead = 0;
  const DUP_WINDOW = 50e6; // 50 ms

  // ---- 거래 하나 마치기
  function finish(c: ConvState, p: Pending | null, r: Frame | null, status: Status, code: number | null, info: { unit: string; fn: number | null; sub: number | null; fnName: string; devKey: string; fnKey: string; ascii: boolean; tag: number | null }) {
    const proto = c.proto as Proto;
    const rtMs = p && r ? (r.t - p.t) / 1e6 : null;
    const accs = [c.acc, overall];
    const dk = proto + "|" + info.devKey;
    let dv = devices.get(dk);
    if (!dv) {
      const server = c.client === c.ends[0] ? c.ends[1] : c.ends[0];
      dv = { acc: newAcc(), proto, label: info.unit, server: server.replace(/:\d+$/, "") };
      devices.set(dk, dv);
    }
    accs.push(dv.acc);
    const fk = proto + "|" + info.fnKey;
    let fv = funcs.get(fk);
    if (!fv) {
      fv = { acc: newAcc(), proto, label: info.fnName };
      funcs.set(fk, fv);
    }
    accs.push(fv.acc);
    for (const a of accs) {
      a.st[status]++;
      if (rtMs !== null) a.rt.push(rtMs);
    }
    let codeName = "";
    if (code !== null && code !== 0) {
      codeName = proto === "modbus" ? `${h2(code)} ${EXCEPTIONS[code]?.name ?? t("규격에 없는 코드", "not in the specification")}` : `${h4(code)} ${endText(code, lang)}`;
      const ck = proto + "|" + code;
      const cc = codes.get(ck);
      if (cc) cc.count++;
      else codes.set(ck, { proto, code, name: codeName, count: 1 });
    }
    const tx = p ? p.t : r!.t;
    const st = STATUS_ORDER.indexOf(status);
    ptsSeen++;
    if (status !== "orphan") pts.push([tx / 1e6, rtMs ?? -1, st]);
    const row: Txn = {
      conv: c.idx,
      proto,
      t: tx,
      reqNo: p ? p.no : null,
      respNo: r ? r.no : null,
      unit: info.unit,
      fn: info.fn,
      sub: info.sub,
      fnName: info.fnName,
      addr: p ? p.addr : "",
      qty: p ? p.qty : null,
      tag: info.tag,
      rtMs: round3(rtMs),
      status,
      code,
      codeName,
      ascii: info.ascii,
      req: p ? p.bytes : undefined,
      resp: r ? r.bytes.slice() : undefined,
    };
    const list = status === "ok" ? rowsOk : rowsBad;
    if (list.length < rowCap) list.push(row);
    else dropped++;
  }

  const pinfo = (p: Pending) => ({ unit: p.unit, fn: p.fn, sub: p.sub, fnName: p.fnName, devKey: p.devKey, fnKey: p.fnKey, ascii: p.ascii, tag: p.tag });

  /** 시간이 지난 요청을 무응답(또는 연결 끊김)으로 */
  function expire(c: ConvState, now: number, final: boolean) {
    const keep: Pending[] = [];
    for (const p of c.pending) {
      const late = now - p.t > timeoutNs;
      if (!late && !final) {
        keep.push(p);
        continue;
      }
      const closed = c.closedT !== null && c.closedT >= p.t && c.closedT - p.t <= timeoutNs;
      const status: Status = closed ? "closed" : late ? "timeout" : "cut";
      finish(c, p, null, status, null, pinfo(p));
    }
    c.pending = keep;
  }

  // ---- 프레임 하나
  function onFrame(c: ConvState, f: Frame) {
    c.frames++;
    const d = f.bytes;
    if (c.proto === "modbus") {
      if (!c.client) {
        // SYN 을 못 봤으면 Modbus 포트 쪽이 서버, 그것도 모르면 먼저 보낸 쪽이 클라이언트
        const [a, b] = c.ends;
        c.client = mbPorts.has(c.ports[0]) && !mbPorts.has(c.ports[1]) ? b : mbPorts.has(c.ports[1]) && !mbPorts.has(c.ports[0]) ? a : f.from;
      }
      const tid = u16be(d, 0);
      const unit = d[6];
      const fc = d.length > 7 ? d[7] : 0;
      const server = c.client === c.ends[0] ? c.ends[1] : c.ends[0];
      const devKey = server.replace(/:\d+$/, "") + "#" + unit;
      const fnName = `FC${h2(fc & 0x7f)} ${funcName(fc & 0x7f, lang)}`;
      if (f.from === c.client) {
        expire(c, f.t, false);
        // 같은 트랜잭션 ID 를 다시 쓰면 앞 요청은 응답을 못 받은 것
        const same = c.pending.findIndex((p) => p.tag === tid);
        if (same >= 0) {
          const [p] = c.pending.splice(same, 1);
          finish(c, p, null, c.closedT !== null && c.closedT >= p.t ? "closed" : "timeout", null, pinfo(p));
        }
        let addr = "";
        let qty: number | null = null;
        if (d.length >= 10 && [1, 2, 3, 4, 5, 6, 15, 16, 23].includes(fc)) {
          addr = String(u16be(d, 8));
          qty = fc === 5 || fc === 6 ? 1 : d.length >= 12 ? u16be(d, 10) : null;
        }
        c.reqT.push(f.t);
        c.pending.push({ t: f.t, no: f.no, bytes: d.slice(), unit: String(unit), fn: fc, sub: null, fnName, addr, qty, tag: tid, ascii: false, devKey, fnKey: String(fc & 0x7f) });
      } else {
        expire(c, f.t, false);
        const i = c.pending.findIndex((p) => p.tag === tid);
        const exc = (fc & 0x80) !== 0;
        const code = exc && d.length > 8 ? d[8] : null;
        if (i >= 0) {
          const [p] = c.pending.splice(i, 1);
          finish(c, p, f, exc ? "exception" : "ok", code, pinfo(p));
        } else {
          finish(c, null, f, "orphan", code, { unit: String(unit), fn: fc & 0x7f, sub: null, fnName, devKey, fnKey: String(fc & 0x7f), ascii: false, tag: tid });
        }
      }
      return;
    }
    // MC
    const m = mcHead(d);
    if (!m) return;
    if (m.ascii) c.codes.asc++;
    else c.codes.bin++;
    if (!c.client) c.client = m.req ? f.from : c.ends[0] === f.from ? c.ends[1] : c.ends[0];
    const server = c.client === c.ends[0] ? c.ends[1] : c.ends[0];
    const devKey = server.replace(/:\d+$/, "") + "#" + m.station;
    if (m.req) {
      expire(c, f.t, false);
      const cmd = m.cmd ?? 0;
      const sub = m.sub ?? 0;
      const fnName = `${h4(cmd)}/${h4(sub)} ${commandName(cmd, sub, lang)}`;
      c.reqT.push(f.t);
      c.pending.push({ t: f.t, no: f.no, bytes: d.slice(), unit: m.station, fn: cmd, sub, fnName, addr: m.addr, qty: m.qty, tag: m.serial, ascii: m.ascii, devKey, fnKey: h4(cmd) + "/" + h4(sub) });
    } else {
      expire(c, f.t, false);
      // 4E 는 일련번호로, 3E 는 먼저 온 요청부터
      const i = m.e4 ? c.pending.findIndex((p) => p.tag === m.serial) : c.pending.length ? 0 : -1;
      const status: Status = m.end ? "exception" : "ok";
      if (i >= 0) {
        const [p] = c.pending.splice(i, 1);
        finish(c, p, f, status, m.end, pinfo(p));
      } else {
        const cmd = m.cmd;
        const fnName = cmd !== null ? `${h4(cmd)}/${h4(m.sub ?? 0)} ${commandName(cmd, m.sub ?? 0, lang)}` : t("(요청 없음)", "(no request)");
        finish(c, null, f, "orphan", m.end, { unit: m.station, fn: cmd, sub: m.sub, fnName, devKey, fnKey: cmd !== null ? h4(cmd) + "/" + h4(m.sub ?? 0) : "?", ascii: m.ascii, tag: m.serial });
      }
    }
  }

  const frameLen = (c: ConvState, d: Uint8Array, len: number) => (c.proto === "modbus" ? modbusFrameLen(d, len) : mcFrameLen(d, len));

  /** 머리 모양이 틀리면 다음 그럴듯한 머리까지 건너뛴다 */
  function resync(c: ConvState, dir: Dir) {
    let i = 1;
    for (; i < dir.len; i++) {
      const v = frameLen(c, dir.buf.subarray(i, dir.len), dir.len - i);
      if (v >= 0) break;
    }
    c.skipped += i;
    dir.drop(i);
  }

  /** 이어 붙인 바이트를 프레임으로 자른다 */
  function feed(c: ConvState, dir: Dir, data: Uint8Array, tt: number, no: number) {
    if (c.proto === null) {
      const [pa, pb] = c.ports;
      if (mbPorts.has(pa) || mbPorts.has(pb)) c.proto = "modbus";
      else if (mcPorts.has(pa) || mcPorts.has(pb)) c.proto = "mc";
      else c.proto = (o.autoDetect && sniff(data)) || "other";
    }
    if (c.proto === "other") return;
    if (dir.len === 0) dir.startNo = no;
    dir.append(data);
    for (;;) {
      const n = frameLen(c, dir.buf, dir.len);
      if (n === 0) break;
      if (n < 0) {
        resync(c, dir);
        if (dir.len === 0) break;
        continue;
      }
      if (dir.len < n) break;
      onFrame(c, { bytes: dir.buf.slice(0, n), t: tt, no: dir.startNo || no, from: dir.from });
      dir.drop(n);
      dir.startNo = no;
    }
  }

  /** 빠진 바이트(캡처 누락) — 자르던 프레임은 버리고 다음 머리부터 */
  function gap(c: ConvState, dir: Dir) {
    c.gaps++;
    c.skipped += dir.len;
    dir.len = 0;
  }

  function deliver(c: ConvState, dir: Dir, s: Seg, from: number) {
    const avail = s.data.subarray(Math.min(from, s.data.length));
    if (avail.length) feed(c, dir, avail, s.t, s.no);
    if (s.data.length < s.full) {
      counts.truncated++;
      gap(c, dir);
    }
    dir.next = (s.seq + s.full) >>> 0;
  }

  function drain(c: ConvState, dir: Dir) {
    for (let again = true; again && dir.ooo.length; ) {
      again = false;
      for (let i = 0; i < dir.ooo.length; i++) {
        const s = dir.ooo[i];
        const d = sdiff(s.seq, dir.next!);
        if (d <= 0) {
          dir.ooo.splice(i, 1);
          if (d + s.full > 0) deliver(c, dir, s, -d);
          again = true;
          break;
        }
      }
    }
  }

  function skipGap(c: ConvState, dir: Dir) {
    let best = 0;
    for (let i = 1; i < dir.ooo.length; i++) if (sdiff(dir.ooo[i].seq, dir.ooo[best].seq) < 0) best = i;
    gap(c, dir);
    dir.next = dir.ooo[best].seq;
    drain(c, dir);
  }

  function tcpSeg(c: ConvState, dir: Dir, tcp: Tcp, tt: number, no: number) {
    // 상대가 이미 받았다고 답한(ACK) 바이트를 이 캡처가 못 봤으면, 기다리지 않고 그 자리를 건너뛴다
    if (tcp.flags & ACK) {
      for (const peer of c.dirs.values()) {
        if (peer === dir || peer.next === null || !peer.ooo.length) continue;
        if (sdiff(tcp.ack, peer.next) > 0) skipGap(c, peer);
      }
    }
    if (tcp.flags & SYN) {
      dir.next = (tcp.seq + 1) >>> 0;
      if (!(tcp.flags & ACK) && !c.client) c.client = dir.from;
      return;
    }
    if (tcp.fullLen > 0 && c.proto !== "other") {
      const s: Seg = { seq: tcp.seq, data: tcp.payload, full: tcp.fullLen, t: tt, no };
      if (dir.next === null) dir.next = tcp.seq;
      const d = sdiff(tcp.seq, dir.next);
      if (d === 0) {
        deliver(c, dir, s, 0);
        drain(c, dir);
      } else if (d < 0) {
        if (d + s.full <= 0) c.retrans++;
        else {
          deliver(c, dir, s, -d);
          drain(c, dir);
        }
      } else {
        if (!dir.ooo.some((x) => x.seq === s.seq)) dir.ooo.push(s);
        else c.retrans++;
        if (dir.ooo.length > 64 || tt - dir.ooo[0].t > 2e9) skipGap(c, dir);
      }
    }
    if (tcp.flags & (FIN | RST)) {
      if (c.closedT === null) c.closedT = tt;
      if (tcp.flags & RST) c.rst = true;
    }
  }

  function newConv(key: string, transport: "tcp" | "udp", src: string, dst: string, sp: number, dp: number, tt: number): ConvState {
    const c: ConvState = {
      idx: allConvs.length,
      transport,
      ends: [src, dst],
      ports: [sp, dp],
      proto: null,
      client: null,
      dirs: new Map(),
      packets: 0,
      frames: 0,
      firstT: tt,
      lastT: tt,
      retrans: 0,
      gaps: 0,
      skipped: 0,
      closedT: null,
      rst: false,
      pending: [],
      reqT: new Grow(),
      acc: newAcc(),
      codes: { bin: 0, asc: 0 },
    };
    if (mbPorts.has(sp) || mbPorts.has(dp)) c.proto = "modbus";
    else if (mcPorts.has(sp) || mcPorts.has(dp)) c.proto = "mc";
    convMap.set(key, c);
    allConvs.push(c);
    return c;
  }

  function onPacket(p: RawPacket) {
    counts.packets++;
    if (!Number.isNaN(p.sec)) {
      if (Number.isNaN(sec0)) {
        sec0 = p.sec;
        ns0 = p.ns;
      }
      lastT = (p.sec - sec0) * 1e9 + (p.ns - ns0);
    }
    const tt = lastT;
    const L = decodeLayers(p.link, p.data);
    switch (L.kind) {
      case "ipv6":
        counts.ipv6++;
        return;
      case "arp":
        counts.arp++;
        return;
      case "other-ether":
        counts.otherEther++;
        return;
      case "unsupported-link":
        counts.unsupportedLink++;
        return;
      case "short":
        counts.short++;
        return;
    }
    counts.ipv4++;
    const ip = L.ip;
    if (ip.fragment) {
      counts.fragments++;
      return;
    }
    const tcp = ip.tcp;
    const udp = ip.udp;
    if (!tcp && !udp) {
      counts.otherIp++;
      return;
    }
    if (tcp) counts.tcp++;
    else counts.udp++;
    const sp = (tcp ?? udp)!.sport;
    const dp = (tcp ?? udp)!.dport;
    if (o.dedupe) {
      // 같은 패킷이 여러 지점에서 잡힌 것(pktmon) — IP ID·길이·순서 번호까지 같고 50ms 안이면 하나로
      const k = `${ip.src}>${ip.dst}|${ip.id}|${ip.totalLen}|${sp}|${dp}|${tcp ? `${tcp.seq}|${tcp.ack}|${tcp.flags}` : "u"}`;
      while (dupHead < dupQ.length && tt - dupQ[dupHead][1] > DUP_WINDOW) {
        const [ok, ot] = dupQ[dupHead++];
        if (dupSeen.get(ok) === ot) dupSeen.delete(ok);
      }
      if (dupHead > 4096 && dupHead * 2 > dupQ.length) {
        dupQ.splice(0, dupHead);
        dupHead = 0;
      }
      const prev = dupSeen.get(k);
      if (prev !== undefined && Math.abs(tt - prev) <= DUP_WINDOW) {
        counts.duplicates++;
        return;
      }
      dupSeen.set(k, tt);
      dupQ.push([k, tt]);
    }
    const src = `${ip.src}:${sp}`;
    const dst = `${ip.dst}:${dp}`;
    const transport = tcp ? "tcp" : "udp";
    const key = transport + "|" + (src < dst ? src + "|" + dst : dst + "|" + src);
    let c = convMap.get(key);
    // 닫힌 연결에 새 SYN — 같은 포트를 다시 쓴 새 연결
    if (c && tcp && tcp.flags & SYN && !(tcp.flags & ACK) && c.closedT !== null) {
      expire(c, tt, true);
      c = undefined;
    }
    if (!c) c = newConv(key, transport, src, dst, sp, dp, tt);
    c.packets++;
    c.lastT = tt;
    if (c.proto === "other") return;
    let dir = c.dirs.get(src);
    if (!dir) {
      dir = new Dir(src);
      c.dirs.set(src, dir);
    }
    if (tcp) tcpSeg(c, dir, tcp, tt, p.no);
    else if (udp && udp.payload.length) {
      // UDP 는 MC 만(목록의 MC 포트이거나 모양이 MC 일 때)
      if (c.proto === null) {
        const [pa, pb] = c.ports;
        c.proto = mcPorts.has(pa) || mcPorts.has(pb) || (o.autoDetect && sniff(udp.payload) === "mc") ? "mc" : "other";
      }
      if (c.proto === "modbus") c.proto = "other";
      if (c.proto !== "mc") return;
      dir.len = 0;
      feed(c, dir, udp.payload, tt, p.no);
      dir.len = 0;
    }
  }

  const capture = readCapture(buf, onPacket, onProgress);
  const endT = lastT;
  for (const c of allConvs) {
    for (const dir of c.dirs.values()) while (dir.ooo.length) skipGap(c, dir);
    expire(c, endT, true);
  }

  // ---- 결과 정리
  const ind = allConvs.filter((c) => c.proto === "modbus" || c.proto === "mc").sort((a, b) => a.firstT - b.firstT);
  const idOf = new Map<number, number>();
  ind.forEach((c, i) => idOf.set(c.idx, i + 1));
  for (const c of allConvs) {
    if (idOf.has(c.idx)) counts.industrial += c.packets;
    else {
      counts.otherTcpUdp += c.packets;
      counts.otherConvs++;
    }
  }
  const convs: Conv[] = ind.map((c) => {
    const client = c.client ?? c.ends[0];
    const server = client === c.ends[0] ? c.ends[1] : c.ends[0];
    const rq = c.reqT.a.slice(0, c.reqT.n);
    const gaps = new Float64Array(Math.max(0, rq.length - 1));
    for (let i = 1; i < rq.length; i++) gaps[i - 1] = (rq[i] - rq[i - 1]) / 1e6;
    gaps.sort();
    return {
      id: idOf.get(c.idx)!,
      proto: c.proto as Proto,
      transport: c.transport,
      client,
      server,
      packets: c.packets,
      frames: c.frames,
      firstT: c.firstT / 1e6,
      lastT: c.lastT / 1e6,
      retrans: c.retrans,
      gaps: c.gaps,
      skippedBytes: c.skipped,
      closedT: c.closedT === null ? null : c.closedT / 1e6,
      interval: round3(percentile(gaps, 0.5)),
      mcCode: c.proto !== "mc" ? null : c.codes.bin && c.codes.asc ? "mixed" : c.codes.asc ? "ascii" : c.codes.bin ? "binary" : null,
      ...rtStat(c.acc),
    };
  });
  const rows = [...rowsOk, ...rowsBad].map((r) => ({ ...r, conv: idOf.get(r.conv) ?? 0 })).sort((a, b) => a.t - b.t || a.conv - b.conv || (a.tag ?? 0) - (b.tag ?? 0));
  let points = pts;
  let sampled = false;
  if (pts.length > pointCap) {
    // 무응답은 다 남기고, 응답 있는 점은 고르게 솎는다
    const bad = pts.filter((x) => x[1] < 0 || x[2] !== 0);
    const good = pts.filter((x) => !(x[1] < 0 || x[2] !== 0));
    const room = Math.max(pointCap - Math.min(bad.length, pointCap / 2), 0);
    const step = good.length / Math.max(room, 1);
    const g: typeof pts = [];
    for (let i = 0; i < room && Math.floor(i * step) < good.length; i++) g.push(good[Math.floor(i * step)]);
    points = [...bad.slice(0, pointCap / 2), ...g].sort((a, b) => a[0] - b[0]);
    sampled = true;
  }
  void ptsSeen;
  const grp = (m: Map<string, { acc: Acc; proto: Proto; label: string; server?: string }>): Group[] =>
    [...m.entries()].map(([key, v]) => ({ key, proto: v.proto, label: v.label, server: v.server, ...rtStat(v.acc) })).sort((a, b) => b.requests + b.orphan - (a.requests + a.orphan));
  return {
    capture,
    start: Number.isNaN(sec0) ? null : { sec: sec0, ns: ns0 },
    durationMs: endT / 1e6,
    counts,
    overall: rtStat(overall),
    convs,
    devices: grp(devices),
    funcs: grp(funcs),
    codes: [...codes.values()].sort((a, b) => b.count - a.count),
    rows,
    rowsDropped: dropped,
    points,
    pointsSampled: sampled,
  };
}

// ---------------------------------------------------------------- CSV

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const hexOf = (u?: Uint8Array) => (u ? Array.from(u, (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ") : "");

/** 거래 표 → CSV(첫 줄 머리). withAddr = 연결의 IP:포트 칸 넣기 */
export function toCsv(a: Analysis, opts: { withAddr: boolean; withBytes: boolean; lang: Lang }): string {
  const ko = opts.lang === "ko";
  const convOf = new Map(a.convs.map((c) => [c.id, c]));
  const head = [
    ko ? "연결" : "conv",
    ...(opts.withAddr ? [ko ? "클라이언트" : "client", ko ? "서버" : "server"] : []),
    ko ? "프로토콜" : "protocol",
    ko ? "시각(s)" : "time_s",
    ko ? "요청 패킷" : "req_no",
    ko ? "응답 패킷" : "resp_no",
    ko ? "국번" : "unit",
    ko ? "함수·명령" : "function",
    ko ? "주소" : "address",
    ko ? "개수" : "quantity",
    ko ? "트랜잭션·일련번호" : "tid_serial",
    ko ? "응답 시간(ms)" : "response_ms",
    ko ? "결과" : "status",
    ko ? "코드" : "code",
    ...(opts.withBytes ? [ko ? "요청 바이트" : "request_hex", ko ? "응답 바이트" : "response_hex"] : []),
  ];
  const lines = [head.map(csvCell).join(",")];
  for (const r of a.rows) {
    const c = convOf.get(r.conv);
    lines.push(
      [
        "C" + r.conv,
        ...(opts.withAddr ? [c?.client ?? "", c?.server ?? ""] : []),
        r.proto === "modbus" ? "Modbus TCP" : `MC ${r.ascii ? "ASCII" : "binary"}`,
        (r.t / 1e9).toFixed(6),
        r.reqNo,
        r.respNo,
        r.unit,
        r.fnName,
        r.addr,
        r.qty,
        r.tag,
        r.rtMs,
        r.status,
        r.codeName,
        ...(opts.withBytes ? [r.ascii && r.req ? String.fromCharCode(...r.req) : hexOf(r.req), r.ascii && r.resp ? String.fromCharCode(...r.resp) : hexOf(r.resp)] : []),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/** 기존 해석기로 넘길 주소 조각(#…) — 프레임은 주소의 # 뒤라 서버로 가지 않는다 */
export function decoderLink(r: Txn, which: "req" | "resp"): { path: string; hash: string } | null {
  const u = which === "req" ? r.req : r.resp;
  if (!u) return null;
  const q = new URLSearchParams();
  if (r.proto === "modbus") {
    q.set("frame", hexOf(u));
    q.set("mode", "tcp");
    if (which === "resp" && r.addr) q.set("start", r.addr);
    return { path: "tools/modbus-decoder/", hash: "#" + q.toString() };
  }
  q.set("frame", r.ascii ? String.fromCharCode(...u) : hexOf(u));
  if (which === "resp" && r.req) q.set("pair", r.ascii ? String.fromCharCode(...r.req) : hexOf(r.req));
  return { path: "tools/mc-decoder/", hash: "#" + q.toString() };
}
