// 웹 도구 «Modbus 실수 변환기» — 16비트 레지스터 2개(32비트)·4개(64비트) ↔ IEEE 754 binary32·binary64, 정수.
// 레지스터 하나 안의 바이트는 Modbus 규격대로 높은 바이트 먼저(Modbus Application Protocol V1.1b3 4.2 «big-Endian»).
// 32·64비트 값을 레지스터에 어떤 순서로 싣는지는 규격에 없어서 장비마다 다르다 — 그래서 네 순서를 한꺼번에 보여 준다.

export type Lang = "ko" | "en";

/** 값 바이트를 A(가장 높은 바이트)…D 라 할 때 선 위(레지스터 순서대로) 바이트 배치 */
export type ByteOrder = "ABCD" | "DCBA" | "BADC" | "CDAB";

export const ORDERS: { order: ByteOrder; ko: string; en: string }[] = [
  { order: "ABCD", ko: "빅 엔디언 (높은 워드 먼저)", en: "Big-endian (high word first)" },
  { order: "CDAB", ko: "워드 스왑 (낮은 워드 먼저)", en: "Word swap (low word first)" },
  { order: "BADC", ko: "바이트 스왑 (레지스터 안 바이트 뒤집음)", en: "Byte swap (bytes swapped in each register)" },
  { order: "DCBA", ko: "리틀 엔디언 (워드·바이트 모두 뒤집음)", en: "Little-endian (words and bytes swapped)" },
];

export type ValueType = "float32" | "int32" | "uint32" | "float64" | "int64" | "uint64";

const msg = {
  ko: {
    empty: "레지스터 값을 넣으세요.",
    hexTok: (t: string) => `«${t}» 는 HEX 레지스터 값이 아닙니다 (0~FFFF, 레지스터마다 4자리).`,
    decTok: (t: string) => `«${t}» 는 레지스터 값이 아닙니다 (0~65535, 또는 -32768~-1).`,
    count: (n: number) => `레지스터 ${n}개 — 2개(32비트) 또는 4개(64비트)를 넣으세요.`,
    num: "숫자를 넣으세요.",
    range: (t: ValueType) => `${t} 범위를 벗어났습니다.`,
    intOnly: "정수만 넣을 수 있습니다.",
  },
  en: {
    empty: "Enter register values.",
    hexTok: (t: string) => `"${t}" is not a HEX register value (0–FFFF, 4 digits per register).`,
    decTok: (t: string) => `"${t}" is not a register value (0–65535, or -32768 to -1).`,
    count: (n: number) => `${n} registers — enter 2 (32-bit) or 4 (64-bit).`,
    num: "Enter a number.",
    range: (t: ValueType) => `Out of range for ${t}.`,
    intOnly: "Integers only.",
  },
};

const tokens = (text: string) => text.split(/[\s,;]+/).filter(Boolean);

/** 레지스터 값 읽기 — HEX(«41C8 0000», «41C80000», «0x41C8,0x0000») 또는 10진(«16840 0», 음수는 2의 보수) */
export function parseRegisters(text: string, mode: "hex" | "dec", lang: Lang = "ko"): number[] {
  const m = msg[lang];
  const out: number[] = [];
  for (const raw of tokens(text)) {
    if (mode === "hex") {
      const t = raw.replace(/^0x/i, "");
      if (!/^[0-9a-f]+$/i.test(t)) throw new Error(m.hexTok(raw));
      if (t.length <= 4) out.push(parseInt(t, 16));
      else if (t.length % 4 === 0) for (let i = 0; i < t.length; i += 4) out.push(parseInt(t.slice(i, i + 4), 16));
      else throw new Error(m.hexTok(raw));
    } else {
      if (!/^-?\d+$/.test(raw)) throw new Error(m.decTok(raw));
      const v = Number(raw);
      if (v < -32768 || v > 65535) throw new Error(m.decTok(raw));
      out.push(v < 0 ? v + 0x10000 : v);
    }
  }
  if (!out.length) throw new Error(m.empty);
  if (out.length !== 2 && out.length !== 4) throw new Error(m.count(out.length));
  return out;
}

/** 레지스터 → 선 위 바이트(레지스터마다 높은 바이트 먼저) */
export const regsToBytes = (regs: number[]) => regs.flatMap((r) => [(r >> 8) & 0xff, r & 0xff]);
export const bytesToRegs = (bytes: number[]) => {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) out.push((bytes[i] << 8) | bytes[i + 1]);
  return out;
};

/**
 * 선 위 바이트 ↔ 값 바이트(높은 바이트 먼저). 같은 연산을 두 번 하면 제자리라 인코딩·디코딩에 함께 쓴다.
 * CDAB = 레지스터 순서 뒤집기, BADC = 레지스터 안 두 바이트 바꾸기, DCBA = 둘 다. 64비트도 같은 규칙(GHEFCDAB 등).
 */
export function reorder(bytes: number[], order: ByteOrder): number[] {
  const wordSwap = order === "CDAB" || order === "DCBA";
  const byteSwap = order === "BADC" || order === "DCBA";
  let words: number[][] = [];
  for (let i = 0; i < bytes.length; i += 2) words.push([bytes[i], bytes[i + 1]]);
  if (wordSwap) words = words.reverse();
  if (byteSwap) words = words.map(([a, b]) => [b, a]);
  return words.flat();
}

export interface Decoded {
  float: number;
  int: bigint;
  uint: bigint;
}

/** 값 바이트(높은 바이트 먼저, 4 또는 8개) → 실수·부호 있는 정수·부호 없는 정수 */
export function decodeValue(be: number[]): Decoded {
  const dv = new DataView(new Uint8Array(be).buffer);
  if (be.length === 4) return { float: dv.getFloat32(0), int: BigInt(dv.getInt32(0)), uint: BigInt(dv.getUint32(0)) };
  return { float: dv.getFloat64(0), int: dv.getBigInt64(0), uint: dv.getBigUint64(0) };
}

/** 레지스터 + 순서 → 해석 */
export const decodeRegisters = (regs: number[], order: ByteOrder) => decodeValue(reorder(regsToBytes(regs), order));

export const typeBytes = (t: ValueType) => (t.endsWith("64") ? 8 : 4);

/** 값 → 값 바이트(높은 바이트 먼저) */
export function encodeValue(text: string, type: ValueType, lang: Lang = "ko"): number[] {
  const m = msg[lang];
  const s = text.trim();
  if (!s) throw new Error(m.num);
  const n = typeBytes(type);
  const dv = new DataView(new ArrayBuffer(n));
  if (type === "float32" || type === "float64") {
    const low = s.toLowerCase();
    const v = /^[+-]?(inf|infinity)$/.test(low) ? (low.startsWith("-") ? -Infinity : Infinity) : low === "nan" ? NaN : Number(s);
    if (Number.isNaN(v) && low !== "nan") throw new Error(m.num);
    if (type === "float32") dv.setFloat32(0, v);
    else dv.setFloat64(0, v);
  } else {
    let v: bigint;
    try {
      if (!/^[+-]?(\d+|0x[0-9a-f]+)$/i.test(s)) throw new Error();
      const neg = s.startsWith("-");
      v = BigInt(s.replace(/^[+-]/, ""));
      if (neg) v = -v;
    } catch {
      throw new Error(/^[+-]?\d*\.\d*(e[+-]?\d+)?$/i.test(s) ? m.intOnly : m.num);
    }
    const bits = BigInt(n * 8);
    const min = type.startsWith("int") ? -(1n << (bits - 1n)) : 0n;
    const max = type.startsWith("int") ? (1n << (bits - 1n)) - 1n : (1n << bits) - 1n;
    if (v < min || v > max) throw new Error(m.range(type));
    if (n === 4) dv.setUint32(0, Number(BigInt.asUintN(32, v)));
    else dv.setBigUint64(0, BigInt.asUintN(64, v));
  }
  return [...new Uint8Array(dv.buffer)];
}

/** 값 → 순서별 레지스터 */
export const encodeRegisters = (text: string, type: ValueType, order: ByteOrder, lang: Lang = "ko") =>
  bytesToRegs(reorder(encodeValue(text, type, lang), order));

/** float32 는 되돌렸을 때 같은 값이 되는 가장 짧은 10진 표기, float64 는 JS 기본 표기 */
export function formatFloat(v: number, bytes: 4 | 8): string {
  if (Number.isNaN(v)) return "NaN";
  if (!Number.isFinite(v)) return v > 0 ? "Infinity" : "-Infinity";
  if (Object.is(v, -0)) return "-0";
  if (bytes === 8) return String(v);
  for (let p = 1; p <= 9; p++) {
    const s = Number(v.toPrecision(p));
    if (Math.fround(s) === v) return String(s);
  }
  return String(v);
}

export const regHex = (regs: number[]) => regs.map((r) => r.toString(16).toUpperCase().padStart(4, "0")).join(" ");
export const regDec = (regs: number[]) => regs.join(" ");
