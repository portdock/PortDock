// 정수 변환 — 웹 도구 «정수·진수 변환기 (HEX·DEC·BIN·2의 보수·BCD·바이트 순서)».
// 모두 정의로 계산한다: 2의 보수(부호 있는 n비트 = 값 − 2^n, 맨 위 비트가 1일 때), BCD(10진 한 자리 = 4비트),
// 그레이 코드(g = b XOR (b >> 1)). Modbus 레지스터 하나 안의 바이트는 높은 바이트 먼저(Modbus Application Protocol V1.1b3 §4.2),
// 32비트 값을 레지스터 두 개에 싣는 순서는 장비마다 달라 네 순서를 모두 보여 준다(실수(float)는 «Modbus 실수 변환기» 몫).

export type Width = 8 | 16 | 32;
export type Lang = "ko" | "en";
export type InMode = "dec" | "hex" | "bin" | "bcd";

const M = {
  ko: {
    empty: "값을 넣으세요.",
    bad: (m: InMode) => ({ dec: "10진 정수가 아닙니다.", hex: "HEX 가 아닙니다(0~9, A~F).", bin: "2진수가 아닙니다(0·1).", bcd: "BCD 로 넣을 10진 정수(0 이상)가 아닙니다." })[m],
    range: (w: Width) => `${w}비트 범위를 벗어났습니다.`,
  },
  en: {
    empty: "Enter a value.",
    bad: (m: InMode) => ({ dec: "Not a decimal integer.", hex: "Not hexadecimal (0–9, A–F).", bin: "Not binary (0/1).", bcd: "Not a non-negative decimal integer to encode as BCD." })[m],
    range: (w: Width) => `Out of range for ${w} bits.`,
  },
};

const mask = (w: Width) => (w === 32 ? 0xffffffff : (1 << w) - 1);

/** 입력 → n비트 패턴(부호 없는 수). 10진은 −2^(n−1) ~ 2^n − 1 을 받고 음수는 2의 보수로 */
export function parseBits(text: string, mode: InMode, w: Width, lang: Lang = "ko"): number {
  const m = M[lang];
  const s = text.trim().replace(/[\s_]/g, "");
  if (!s) throw new Error(m.empty);
  let v: number;
  if (mode === "dec") {
    if (!/^[-+]?\d+$/.test(s)) throw new Error(m.bad(mode));
    v = Number(s);
    if (v < -(2 ** (w - 1)) || v > 2 ** w - 1) throw new Error(m.range(w));
    if (v < 0) v += 2 ** w;
  } else if (mode === "hex") {
    const t = s.replace(/^0x/i, "").replace(/h$/i, "");
    if (!/^[0-9a-f]+$/i.test(t)) throw new Error(m.bad(mode));
    v = parseInt(t, 16);
    if (v > 2 ** w - 1) throw new Error(m.range(w));
  } else if (mode === "bin") {
    const t = s.replace(/^0b/i, "");
    if (!/^[01]+$/.test(t)) throw new Error(m.bad(mode));
    v = parseInt(t, 2);
    if (v > 2 ** w - 1) throw new Error(m.range(w));
  } else {
    if (!/^\d+$/.test(s)) throw new Error(m.bad(mode));
    const b = bcdEncode(Number(s));
    if (b === undefined || b > 2 ** w - 1) throw new Error(m.range(w));
    v = b;
  }
  return v;
}

/** 부호 있는 값(2의 보수) */
export const signed = (bits: number, w: Width) => (bits >= 2 ** (w - 1) ? bits - 2 ** w : bits);

export const toHex = (bits: number, w: Width) => bits.toString(16).toUpperCase().padStart(w / 4, "0");
/** 2진 — 4비트마다 띄움 */
export const toBin = (bits: number, w: Width) =>
  bits
    .toString(2)
    .padStart(w, "0")
    .replace(/(.{4})(?=.)/g, "$1 ");

/** 10진 정수 → BCD 패턴(한 자리 = 4비트). 32비트를 넘으면 undefined */
export function bcdEncode(n: number): number | undefined {
  if (!Number.isInteger(n) || n < 0 || n > 99999999) return undefined;
  return parseInt(String(n), 16);
}
/** BCD 패턴 → 10진. 어느 4비트라도 9 를 넘으면 BCD 가 아니므로 undefined */
export function bcdDecode(bits: number, w: Width): number | undefined {
  const h = toHex(bits, w);
  return /^[0-9]+$/.test(h) ? Number(h) : undefined;
}

/** 2진 → 그레이 코드 */
export const toGray = (b: number) => (b ^ (b >>> 1)) >>> 0;
/** 그레이 코드 → 2진 */
export function fromGray(g: number): number {
  let b = g >>> 0;
  for (let s = 1; s < 32; s <<= 1) b = (b ^ (b >>> s)) >>> 0;
  return b;
}

/** 값의 바이트(높은 것부터 A, B, C, D) */
export const bytesOf = (bits: number, w: Width) => Array.from({ length: w / 8 }, (_, i) => (bits >>> (8 * (w / 8 - 1 - i))) & 0xff);

export type Order = "AB" | "BA" | "ABCD" | "CDAB" | "BADC" | "DCBA";
export const ORDERS: Record<16 | 32, Order[]> = { 16: ["AB", "BA"], 32: ["ABCD", "CDAB", "BADC", "DCBA"] };

/**
 * 선 위(받은 순서) 바이트를 이 순서라고 보고 값으로 — 예: CDAB 로 받은 «00 00 41 C8» → 0x41C80000.
 * order 의 i 번째 글자는 받은 i 번째 바이트가 값의 어느 바이트(A = 가장 높은)인지.
 */
export function fromWire(wire: number[], order: Order): number {
  let v = 0;
  for (let i = 0; i < order.length; i++) {
    const k = order.charCodeAt(i) - 65;
    v += wire[i] * 2 ** (8 * (order.length - 1 - k));
  }
  return v;
}
/** 값 → 이 순서로 보낼 때의 바이트 */
export function toWire(bits: number, w: Width, order: Order): number[] {
  const b = bytesOf(bits, w);
  return [...order].map((c) => b[c.charCodeAt(0) - 65]);
}

export interface IntView {
  bits: number;
  unsigned: number;
  signed: number;
  hex: string;
  bin: string;
  bcd?: number;
  gray: number;
  grayDecoded: number;
}

export function view(bits: number, w: Width): IntView {
  return {
    bits,
    unsigned: bits,
    signed: signed(bits, w),
    hex: toHex(bits, w),
    bin: toBin(bits, w),
    bcd: bcdDecode(bits, w),
    gray: toGray(bits) & mask(w),
    grayDecoded: fromGray(bits) & mask(w),
  };
}
