// 웹 도구 «Modbus 읽기 요청 묶기» — 읽을 주소 목록을 함수 코드별로 모아, 개수 한도·허용 빈칸 안에서 요청 몇 개로 묶는다.
// 근거: MODBUS Application Protocol Specification V1.1b3 (Modbus Organization, 2012-04-26)
//   §4.4 (p.7–8)  데이터 모델의 번호 X 는 PDU 주소 X−1, PDU 주소는 0~65535
//   §6.1 (p.11)   01 Read Coils 1~2000      §6.2 (p.12) 02 Read Discrete Inputs 1~2000
//   §6.3 (p.15)   03 Read Holding Registers 1~125   §6.4 (p.16) 04 Read Input Registers 1~125
//   한 요청은 «연속한» 칸만 읽는다 — 떨어진 주소를 한 번에 읽으려면 그 사이 칸까지 함께 읽어야 한다.
// 장비마다 한 번에 읽을 수 있는 수가 규격보다 작을 수 있고(장비 맵의 maxRegisters), 사이 빈 칸을 읽으면
// 예외 02(Illegal Data Address)를 내는 장비도 있다 — 그래서 한도·허용 빈칸은 사용자가 정한다.
import { frameBytes, poll, type CharFormat, type Fc } from "./serialTiming.ts";

export type Space = "co" | "di" | "hr" | "ir";

export const SPACE_FC: Record<Space, 1 | 2 | 3 | 4> = { co: 1, di: 2, hr: 3, ir: 4 };
/** 규격의 읽기 개수 한도 */
export const SPEC_MAX: Record<Space, number> = { co: 2000, di: 2000, hr: 125, ir: 125 };
/** PLC 표기 앞자리 */
const PREFIX: Record<string, Space> = { "0": "co", "1": "di", "3": "ir", "4": "hr" };
export const SPACE_PREFIX: Record<Space, string> = { co: "0", di: "1", ir: "3", hr: "4" };

export interface Item {
  space: Space;
  /** 0 기준 통신 주소 */
  address: number;
  /** 칸 수(범위면 그 길이) */
  count: number;
  /** 쪼갤 수 없는 값 하나의 칸 수 — 범위·단일 칸은 1, «*2» 처럼 적은 32비트 값은 2 */
  size: number;
  /** 입력에 적힌 그대로 */
  text: string;
}

export class ParseError extends Error {
  token: string;
  constructor(token: string) {
    super(token);
    this.token = token;
  }
}

const NUM = String.raw`(?:0x[0-9a-f]+|[0-9a-f]+h|\d+)`;
const toInt = (s: string) => {
  const t = s.toLowerCase();
  if (t.startsWith("0x")) return parseInt(t.slice(2), 16);
  if (t.endsWith("h")) return parseInt(t.slice(0, -1), 16);
  return parseInt(t, 10);
};

/** PLC 표기(40001·400001) → 표와 0 기준 주소. 5자리는 x0001~x9999, 6자리는 x00001~x65536 */
export function fromPlc(s: string): { space: Space; address: number } | null {
  if (!/^\d{5,6}$/.test(s)) return null;
  const space = PREFIX[s[0]];
  if (!space) return null;
  const n = parseInt(s.slice(1), 10);
  if (n < 1 || n > 65536) return null;
  return { space, address: n - 1 };
}

/**
 * 한 줄(또는 쉼표로 나눈 조각) 읽기:
 *  «40001» · «40001-40010»(범위) · «40021*2»(2칸짜리 값) · «hr 100» · «ir 0x10*2» · «co 5-12» (표 이름 + 0 기준 주소)
 */
export function parseItem(raw: string): Item {
  const text = raw.trim();
  const s = text.toLowerCase().replace(/\s+/g, " ");
  let m = /^(\d{5,6})(?:\s*[-~]\s*(\d{5,6}))?(?:\s*[*x×]\s*(\d+))?$/.exec(s);
  if (m) {
    const a = fromPlc(m[1]);
    if (!a) throw new ParseError(text);
    let count = m[3] ? parseInt(m[3], 10) : 1;
    if (m[2]) {
      const b = fromPlc(m[2]);
      if (!b || b.space !== a.space || b.address < a.address || m[3]) throw new ParseError(text);
      count = b.address - a.address + 1;
    }
    return check({ space: a.space, address: a.address, count, size: m[3] ? count : 1, text });
  }
  m = new RegExp(String.raw`^(co|di|hr|ir)\s*[: ]?\s*(${NUM})(?:\s*[-~]\s*(${NUM}))?(?:\s*[*x×]\s*(\d+))?$`).exec(s);
  if (m) {
    const space = m[1] as Space;
    const address = toInt(m[2]);
    let count = m[4] ? parseInt(m[4], 10) : 1;
    if (m[3]) {
      const end = toInt(m[3]);
      if (end < address || m[4]) throw new ParseError(text);
      count = end - address + 1;
    }
    return check({ space, address, count, size: m[4] ? count : 1, text });
  }
  throw new ParseError(text);
}

function check(it: Item): Item {
  if (!Number.isInteger(it.address) || it.address < 0 || !Number.isInteger(it.count) || it.count < 1 || it.address + it.count > 65536) throw new ParseError(it.text);
  return it;
}

/** 여러 줄 입력 → 항목들(빈 줄·# 뒤 설명은 건너뜀) */
export function parseList(input: string): Item[] {
  const out: Item[] = [];
  for (const line of input.split(/\r?\n/)) {
    const body = line.replace(/#.*$/, "");
    for (const tok of body.split(/[,;]/)) if (tok.trim()) out.push(parseItem(tok));
  }
  return out;
}

export interface Req {
  space: Space;
  fc: 1 | 2 | 3 | 4;
  start: number;
  qty: number;
  /** 이 요청이 덮는 입력 항목(입력 순서 번호) */
  items: number[];
  /** 읽지만 목록에 없는 칸 수 */
  unused: number;
}

export interface PlanOptions {
  /** 한 요청의 최대 개수(표마다) — 규격 한도보다 크면 규격 한도 */
  maxQty: Partial<Record<Space, number>>;
  /** 사이에 끼워 읽어도 되는 빈 칸 수(0 이면 붙어 있는 것만 묶음) */
  maxGap: number;
}

/** 묶기. 한 항목(예 32비트 값 2칸)은 둘로 쪼개지 않는다 — 항목이 한도보다 크면 RangeError */
export function plan(items: Item[], opt: PlanOptions): Req[] {
  if (!Number.isInteger(opt.maxGap) || opt.maxGap < 0) throw new RangeError("gap");
  const out: Req[] = [];
  for (const space of ["co", "di", "hr", "ir"] as Space[]) {
    const lim = Math.min(SPEC_MAX[space], opt.maxQty[space] ?? SPEC_MAX[space]);
    if (!Number.isInteger(lim) || lim < 1) throw new RangeError("max");
    // 범위(크기 1 칸의 줄)는 값 하나씩으로 펴서 한도 경계에서 나눌 수 있게 한다
    const list = items
      .flatMap((it, i) => {
        if (it.space !== space) return [];
        const n = it.count / it.size;
        return Array.from({ length: n }, (_, k) => ({ address: it.address + k * it.size, count: it.size, i }));
      })
      .sort((a, b) => a.address - b.address || b.count - a.count);
    let cur: (Req & { covered: number }) | null = null;
    const close = () => {
      if (!cur) return;
      const { covered, ...r } = cur;
      out.push({ ...r, unused: r.qty - covered });
      cur = null;
    };
    // 칸이 겹치는 항목(같은 주소를 두 번 적음 등)을 세지 않으려고, 이 요청에서 «덮은 끝» 을 따로 센다
    let coveredEnd = -1;
    for (const it of list) {
      if (it.count > lim) throw new RangeError("item");
      const end = it.address + it.count; // 끝(포함하지 않음)
      if (cur) {
        const c: Req & { covered: number } = cur;
        const curEnd = c.start + c.qty;
        const gap = it.address - curEnd;
        const newQty = Math.max(curEnd, end) - c.start;
        if (gap <= opt.maxGap && newQty <= lim) {
          c.qty = newQty;
          if (!c.items.includes(it.i)) c.items.push(it.i);
          const from = Math.max(it.address, coveredEnd);
          if (end > from) c.covered += end - from;
          coveredEnd = Math.max(coveredEnd, end);
          continue;
        }
        close();
      }
      cur = { space, fc: SPACE_FC[space], start: it.address, qty: it.count, items: [it.i], unused: 0, covered: it.count };
      coveredEnd = end;
    }
    close();
  }
  return out;
}

export interface Cost {
  requests: number;
  /** RTU 요청 + 응답 바이트(국번·CRC 포함) */
  rtuBytes: number;
  /** TCP 요청 + 응답 바이트(MBAP 7 + PDU) */
  tcpBytes: number;
  /** RTU 한 바퀴 시간(초) — 요청 + 장비 처리 + 응답 + t3.5, 요청마다 */
  rtuCycle: number;
}

/** 요청 목록의 바이트·시간. slaveDelay 는 장비가 요청 끝에서 응답을 시작할 때까지(초) */
export function cost(reqs: Req[], baud: number, format: CharFormat, slaveDelay: number): Cost {
  let rtuBytes = 0;
  let tcpBytes = 0;
  let rtuCycle = 0;
  for (const r of reqs) {
    const fc = r.fc as Fc;
    const b = frameBytes(fc, r.qty);
    rtuBytes += b.req + b.res;
    // RTU 프레임 = 국번 1 + PDU + CRC 2 → PDU = RTU − 3, TCP = MBAP 7 + PDU
    tcpBytes += b.req - 3 + 7 + (b.res - 3 + 7);
    rtuCycle += poll({ baud, format, fc, qty: r.qty, slaveDelay, masterGap: 0, transactions: 1 }).transaction;
  }
  return { requests: reqs.length, rtuBytes, tcpBytes, rtuCycle };
}

/** 묶지 않고 값마다 따로 읽을 때(비교용 — 범위는 칸마다 하나) */
export function onePerItem(items: Item[]): Req[] {
  return items.flatMap((it, i) =>
    Array.from({ length: it.count / it.size }, (_, k) => ({ space: it.space, fc: SPACE_FC[it.space], start: it.address + k * it.size, qty: it.size, items: [i], unused: 0 })),
  );
}

/** 0 기준 주소 → PLC 표기(5자리로 되면 5자리, 아니면 6자리) */
export function plcText(space: Space, address: number) {
  const n = address + 1;
  return n <= 9999 ? `${SPACE_PREFIX[space]}${String(n).padStart(4, "0")}` : `${SPACE_PREFIX[space]}${String(n).padStart(5, "0")}`;
}
