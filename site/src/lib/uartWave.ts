// UART 파형 — 웹 도구 «UART 파형 그리기». 글자·HEX → 비트열(쉼 1, 시작 0, 데이터 LSB 먼저, 패리티, 정지 1/1.5/2), 비트·프레임 시간,
// 측정한 가장 짧은 펄스 폭 → 가까운 표준 보율. 그림(TTL·RS-232 전압)은 쪽(UartWaveformPage.astro).
// 근거:
//   Microchip ATmega328P 데이터시트 §19.4 «Frame Formats»: 쉼 = 1, 시작 비트 0, 데이터 5~9 비트 LSB 먼저, 패리티, 정지 비트 1·2(그림 19-4),
//     §19.4.1 패리티 = 데이터 비트의 XOR(짝수) / XOR 의 반대(홀수). 정지 1.5·mark·space 패리티는 PC UART(16550 계열)·Windows DCB 설정에 있는 값.
//   RS-232 전압: TIA/EIA-232-F — 1(mark) = 음, 0(space) = 양. 드라이버 ±5 ~ ±15 V, 수신 ±3 V(TI SLLA037A «Interface Circuits for TIA/EIA-232-F» 전기 규격 그림).
import { BAUDS } from "./uartBaud.ts";

export type Parity = "none" | "even" | "odd" | "mark" | "space";
export type Stop = 1 | 1.5 | 2;

export interface Format {
  dataBits: number;
  parity: Parity;
  stop: Stop;
}

export type BitKind = "start" | "data" | "parity" | "stop";

export interface Bit {
  kind: BitKind;
  v: number;
  /** 데이터 비트 번호(0 = LSB) */
  n?: number;
  /** 비트 길이(1, 정지 1.5 면 1.5) */
  w: number;
}

export function parityBit(byte: number, dataBits: number, p: Parity): number | undefined {
  if (p === "none") return undefined;
  if (p === "mark") return 1;
  if (p === "space") return 0;
  let ones = 0;
  for (let i = 0; i < dataBits; i++) ones += (byte >> i) & 1;
  return p === "even" ? ones & 1 : 1 - (ones & 1);
}

/** 한 글자의 프레임(시작 ~ 정지) */
export function frame(byte: number, f: Format): Bit[] {
  const bits: Bit[] = [{ kind: "start", v: 0, w: 1 }];
  for (let i = 0; i < f.dataBits; i++) bits.push({ kind: "data", v: (byte >> i) & 1, n: i, w: 1 });
  const p = parityBit(byte, f.dataBits, f.parity);
  if (p !== undefined) bits.push({ kind: "parity", v: p, w: 1 });
  if (f.stop === 1.5) bits.push({ kind: "stop", v: 1, w: 1.5 });
  else for (let i = 0; i < f.stop; i++) bits.push({ kind: "stop", v: 1, w: 1 });
  return bits;
}

/** 프레임 하나의 비트 수(정지 1.5 포함) */
export const frameBits = (f: Format) => 1 + f.dataBits + (f.parity === "none" ? 0 : 1) + f.stop;

export interface Timing {
  /** 초 */
  bit: number;
  frame: number;
  /** 글자/초 */
  cps: number;
}

export function timing(baud: number, f: Format): Timing {
  if (!(baud > 0)) throw new RangeError("baud");
  const bit = 1 / baud;
  const fr = frameBits(f) * bit;
  return { bit, frame: fr, cps: 1 / fr };
}

/** 표준 보율(작은 것부터) */
export const STD_BAUDS = [300, 600, ...BAUDS];

/** 가장 짧은 펄스 폭(µs) → 1 비트로 보고 보율과 가까운 표준 보율 */
export function estimateBaud(pulseUs: number) {
  if (!(pulseUs > 0)) throw new RangeError("pulse");
  const raw = 1e6 / pulseUs;
  let best = STD_BAUDS[0];
  for (const b of STD_BAUDS) if (Math.abs(Math.log(b / raw)) < Math.abs(Math.log(best / raw))) best = b;
  return { raw, std: best, errPct: (raw / best - 1) * 100 };
}

/** 입력 → 바이트. hex 면 «41 42 0D», 아니면 글자(UTF-8) — \r \n \t \xNN 이스케이프 받음 */
export function toBytes(s: string, hex: boolean): number[] {
  if (hex) {
    const h = s.replace(/0x/gi, "").replace(/[\s,;:.-]/g, "");
    if (!h) return [];
    if (!/^[0-9a-f]+$/i.test(h) || h.length % 2) throw new RangeError(s);
    return h.match(/../g)!.map((x) => parseInt(x, 16));
  }
  const out: number[] = [];
  const enc = new TextEncoder();
  // 이스케이프는 바이트 그대로, 나머지 글자는 UTF-8
  for (const part of s.split(/(\\(?:r|n|t|x[0-9a-fA-F]{2}|\\))/)) {
    if (!part) continue;
    if (/^\\(r|n|t|x[0-9a-fA-F]{2}|\\)$/.test(part)) {
      const e = part.slice(1);
      out.push(e === "r" ? 13 : e === "n" ? 10 : e === "t" ? 9 : e === "\\" ? 92 : parseInt(e.slice(1), 16));
    } else out.push(...enc.encode(part));
  }
  return out;
}
