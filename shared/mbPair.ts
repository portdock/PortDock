// Modbus 요청·응답 짝짓기 — 로그에서 응답 줄 바로 앞의 요청 줄을 찾아 «40001 = 1812 (0x0714)» 처럼 주소 붙은 값으로 푼다.
// Serial(RTU, CRC 검사)·TCP(Modbus TCP, 트랜잭션 ID)가 함께 쓴다. 화면 없이 값만 — node --test shared/mbPair.test.ts.
// 규칙: 응답 줄과 방향이 반대인 가장 가까운 Modbus 요청(같은 상대)을 찾고, 국번·함수·길이(바이트 수)가 맞고,
// 그 요청 뒤로 같은 요청에 맞는 응답이 먼저 오지 않았을 때만 짝이다(RTU 는 가장 가까운 요청이 아니면 짝 없음, TCP 는 트랜잭션 ID 로 찾는다).
import { mbFuncInfo, plcText } from "./modbusBuild.ts";

export type Wire = "rtu" | "tcp";

/** 요청 — 국번(유닛)·함수·시작 주소(0 기준)·개수. TCP 는 트랜잭션 ID 도 */
export interface MbReq {
  unit: number;
  fc: number;
  addr: number;
  qty: number;
  tid?: number;
}

export type MbPaired =
  | { req: MbReq; kind: "regs"; regs: number[] }
  | { req: MbReq; kind: "bits"; bits: number[] }
  | { req: MbReq; kind: "write" }
  | { req: MbReq; kind: "exception"; code: number };

/** CRC16 Modbus(다항식 0xA001 반사, 초기값 0xFFFF) */
export function crc16Modbus(b: number[]): number {
  let crc = 0xffff;
  for (const x of b) {
    crc ^= x & 0xff;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc & 0xffff;
}

/** RTU 프레임 끝 2바이트(낮은 바이트 먼저)가 CRC 와 맞는지 */
export function rtuCrcOk(b: number[]): boolean {
  if (b.length < 4) return false;
  const c = crc16Modbus(b.slice(0, -2));
  return b[b.length - 2] === (c & 0xff) && b[b.length - 1] === c >> 8;
}

const u16 = (b: number[], i: number) => ((b[i] << 8) | b[i + 1]) & 0xffff;

/** 국번 + PDU(CRC·MBAP 없이) → 요청. 지원 함수(01~06·0F·10)의 요청 모양이 아니면 null */
export function pduRequest(p: number[]): MbReq | null {
  if (p.length < 6) return null;
  const [unit, fc] = p;
  const f = mbFuncInfo(fc);
  if (!f) return null;
  const addr = u16(p, 2);
  if (fc <= 0x04) {
    const qty = u16(p, 4);
    return p.length === 6 && qty >= 1 && qty <= f.max ? { unit, fc, addr, qty } : null;
  }
  if (fc === 0x05 || fc === 0x06) return p.length === 6 ? { unit, fc, addr, qty: 1 } : null;
  // 0F·10: 개수(2) 바이트 수(1) 값
  if (p.length < 7) return null;
  const qty = u16(p, 4);
  const bc = p[6];
  const want = fc === 0x0f ? Math.ceil(qty / 8) : qty * 2;
  return qty >= 1 && bc === want && p.length === 7 + bc ? { unit, fc, addr, qty } : null;
}

/** 요청에 맞는 응답 PDU(국번 + PDU)인지 — 맞으면 풀이, 아니면 null */
export function pduReply(req: MbReq, p: number[]): MbPaired | null {
  if (p.length < 3 || p[0] !== req.unit) return null;
  const fc = p[1];
  if (fc === (req.fc | 0x80)) return p.length === 3 ? { req, kind: "exception", code: p[2] } : null;
  if (fc !== req.fc) return null;
  if (fc <= 0x04) {
    const bit = fc <= 0x02;
    const bc = p[2];
    const want = bit ? Math.ceil(req.qty / 8) : req.qty * 2;
    if (bc !== want || p.length !== 3 + bc) return null;
    const data = p.slice(3);
    if (bit) return { req, kind: "bits", bits: Array.from({ length: req.qty }, (_, i) => (data[i >> 3] >> (i & 7)) & 1) };
    return { req, kind: "regs", regs: Array.from({ length: req.qty }, (_, i) => u16(data, i * 2)) };
  }
  // 쓰기 응답: 05·06 은 요청을 그대로, 0F·10 은 주소·개수를 돌려준다
  if (p.length !== 6 || u16(p, 2) !== req.addr) return null;
  if ((fc === 0x0f || fc === 0x10) && u16(p, 4) !== req.qty) return null;
  return { req, kind: "write" };
}

/** RTU: CRC 가 맞는 요청만 */
export function rtuRequest(b: number[]): MbReq | null {
  return rtuCrcOk(b) ? pduRequest(b.slice(0, -2)) : null;
}
export function rtuReply(req: MbReq, b: number[]): MbPaired | null {
  return rtuCrcOk(b) ? pduReply(req, b.slice(0, -2)) : null;
}

/** Modbus TCP: MBAP(트랜잭션 2·프로토콜 0·길이 2) + 유닛 + PDU */
const mbapOk = (b: number[]) => b.length >= 8 && b[2] === 0 && b[3] === 0 && u16(b, 4) === b.length - 6;
export function tcpRequest(b: number[]): MbReq | null {
  if (!mbapOk(b)) return null;
  const r = pduRequest(b.slice(6));
  return r && { ...r, tid: u16(b, 0) };
}
export function tcpReply(req: MbReq, b: number[]): MbPaired | null {
  if (!mbapOk(b) || (req.tid != null && u16(b, 0) !== req.tid)) return null;
  return pduReply(req, b.slice(6));
}

export interface PairFrame {
  dir: string;
  bytes: number[];
  /** TCP 상대 주소 — 둘 다 있으면 같아야 짝 */
  peer?: string;
}

/**
 * frames[idx] 를 응답으로 보고 짝인 요청을 찾아 푼다. 요청은 반대 방향(RX 응답이면 TX 요청).
 * RTU: 가장 가까운 요청이 맞지 않으면 짝 없음. TCP: 트랜잭션 ID 가 같은 요청까지 거슬러 간다.
 * 요청과 이 응답 사이에 같은 요청에 맞는 응답이 이미 있으면(이 줄은 두 번째) 짝 없음. 최대 back 줄까지 본다.
 */
export function pairInLog(frames: PairFrame[], idx: number, wire: Wire, back = 200): MbPaired | null {
  const resp = frames[idx];
  if (!resp || (resp.dir !== "rx" && resp.dir !== "tx")) return null;
  const reqDir = resp.dir === "rx" ? "tx" : "rx";
  const parseReq = wire === "rtu" ? rtuRequest : tcpRequest;
  const reply = wire === "rtu" ? rtuReply : tcpReply;
  const tid = wire === "tcp" && mbapOk(resp.bytes) ? u16(resp.bytes, 0) : null;
  if (wire === "tcp" && tid == null) return null;
  const between: PairFrame[] = [];
  for (let j = idx - 1; j >= 0 && j >= idx - back; j--) {
    const f = frames[j];
    if (resp.peer != null && f.peer != null && f.peer !== resp.peer) continue;
    if (f.dir === resp.dir) {
      between.push(f);
      continue;
    }
    if (f.dir !== reqDir) continue;
    const req = parseReq(f.bytes);
    if (!req) continue;
    if (wire === "tcp" && req.tid !== tid) continue;
    const p = reply(req, resp.bytes);
    if (!p) return null;
    return between.some((g) => reply(req, g.bytes)) ? null : p;
  }
  return null;
}

// ---- 값 풀이
export type WordFmt = "u16" | "s16" | "hex" | "f32abcd" | "f32cdab";
export const WORD_FMTS: WordFmt[] = ["u16", "s16", "hex", "f32abcd", "f32cdab"];
/** 주소 표기 — 0 기준 또는 PLC 식(40001) */
export type AddrNotation = "zero" | "plc";

const h4 = (v: number) => "0x" + v.toString(16).toUpperCase().padStart(4, "0");
/** float32 — 7자리 유효숫자로 줄이고 뒤 0 은 뗀다 */
function f32(hi: number, lo: number) {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint16(0, hi);
  dv.setUint16(2, lo);
  const v = dv.getFloat32(0);
  return Number.isFinite(v) ? String(Number(v.toPrecision(7))) : String(v);
}

export interface ValueRow {
  addr: string;
  value: string;
}

/** 주소 붙은 값 줄 — 레지스터는 형식대로(F32 는 두 칸씩, 남는 칸은 U16), 비트는 1/0 */
export function valueRows(p: MbPaired, fmt: WordFmt, notation: AddrNotation): ValueRow[] {
  const at = (i: number) => (notation === "plc" ? plcText(p.req.fc, p.req.addr + i) : String(p.req.addr + i));
  if (p.kind === "bits") return p.bits.map((b, i) => ({ addr: at(i), value: b ? "1 (ON)" : "0 (OFF)" }));
  if (p.kind !== "regs") return [];
  const r = p.regs;
  const word = (v: number) => (fmt === "s16" ? `${v >= 0x8000 ? v - 0x10000 : v} (${h4(v)})` : fmt === "hex" ? h4(v) : `${v} (${h4(v)})`);
  if (fmt === "f32abcd" || fmt === "f32cdab") {
    const out: ValueRow[] = [];
    for (let i = 0; i < r.length; i += 2) {
      if (i + 1 >= r.length) {
        out.push({ addr: at(i), value: `${r[i]} (${h4(r[i])})` });
        break;
      }
      const v = fmt === "f32abcd" ? f32(r[i], r[i + 1]) : f32(r[i + 1], r[i]);
      out.push({ addr: `${at(i)}–${at(i + 1)}`, value: v });
    }
    return out;
  }
  return r.map((v, i) => ({ addr: at(i), value: word(v) }));
}

/** 예외 코드 → 이름(한국어는 뜻 + 영어 이름) */
const EXC: Record<number, [string, string]> = {
  1: ["지원하지 않는 함수", "Illegal Function"],
  2: ["없는 주소", "Illegal Data Address"],
  3: ["잘못된 값", "Illegal Data Value"],
  4: ["장비 고장", "Server Device Failure"],
  5: ["받음(처리 중)", "Acknowledge"],
  6: ["장비 바쁨", "Server Device Busy"],
  8: ["메모리 패리티 오류", "Memory Parity Error"],
  10: ["게이트웨이 경로 없음", "Gateway Path Unavailable"],
  11: ["게이트웨이 대상 응답 없음", "Gateway Target Device Failed to Respond"],
};
export function exceptionText(code: number, lang: "ko" | "en"): string {
  const c = code.toString(16).toUpperCase().padStart(2, "0");
  const e = EXC[code];
  if (!e) return lang === "ko" ? `${c} 알 수 없는 예외` : `${c} unknown exception`;
  return lang === "ko" ? `${c} ${e[0]} (${e[1]})` : `${c} ${e[1]}`;
}
