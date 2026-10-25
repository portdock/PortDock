// ADC 분해능·스케일링 — 웹 도구 «ADC 분해능 계산기 (LSB·4–20mA·0–10V → 공학값)».
// 근거:
//   Microchip AN693 «Understanding A/D Converter Performance Specifications»(DS00693A, 2000):
//     1 LSb = VREF ÷ 2^N(예: 4.096 V, 12비트 → 1 mV), 이상적인 변환기의 양자화 오차 최대 ±½ LSb,
//     식 2 양자화 오차 실효값 = 1 LSb ÷ √12, 식 3 최대 SNR = 6.02·N + 1.76 dB(풀스케일 사인파, 0 ~ fs/2),
//     식 5 ENOB = (SINAD − 1.76 dB) ÷ 6.02
//   ATmega328P 데이터시트(7810D) §23.7 — ADC = V_IN × 1024 ÷ V_REF(10비트, 0x3FF = V_REF − 1 LSB). n비트로 일반화하고 소수점은 버린다.
//   전류 신호 → 전압은 옴의 법칙(V = I × R_shunt), 전압 신호를 줄이는 분압은 lib/divider.
// 신호 ↔ 코드 ↔ 공학값은 모두 일차식이다.

/** 화면에서 고르는 입력 신호 — cur 이면 mA(션트 저항으로 전압), 아니면 V(분압비) */
export const SIGS = [
  { id: "4-20mA", lo: 4, hi: 20, cur: true },
  { id: "0-20mA", lo: 0, hi: 20, cur: true },
  { id: "0-10V", lo: 0, hi: 10, cur: false },
  { id: "1-5V", lo: 1, hi: 5, cur: false },
  { id: "0-5V", lo: 0, hi: 5, cur: false },
] as const;

/** 1 LSB(V) */
export function lsb(vref: number, bits: number): number {
  if (!(vref > 0) || !Number.isFinite(vref) || !Number.isInteger(bits) || bits < 1 || bits > 32) throw new RangeError("adc");
  return vref / 2 ** bits;
}
/** 코드 개수 2^N */
export const codes = (bits: number) => 2 ** bits;

/** 전압 → 코드(내림, 0 ~ 2^N − 1 로 자름) */
export function toCode(v: number, vref: number, bits: number): number {
  if (!Number.isFinite(v)) throw new RangeError("v");
  const full = 2 ** bits;
  return Math.min(full - 1, Math.max(0, Math.floor((v / lsb(vref, bits)) + 1e-9)));
}
/** 코드 → 전압(그 코드 구간의 아래 끝) */
export const toVolt = (code: number, vref: number, bits: number) => code * lsb(vref, bits);

/** 양자화 오차 실효값(V) — AN693 식 2 */
export const qRms = (vref: number, bits: number) => lsb(vref, bits) / Math.sqrt(12);
/** 이상적인 N비트 변환기의 최대 SNR(dB) — AN693 식 3 */
export const snrIdeal = (bits: number) => 6.02 * bits + 1.76;
/** 유효 비트 수 — AN693 식 5 */
export const enob = (sinadDb: number) => (sinadDb - 1.76) / 6.02;

export interface ScaleIn {
  /** 신호 하한·상한(mA 또는 V) */
  sigLo: number;
  sigHi: number;
  /** 신호 → ADC 입력 전압 배율: 전류면 션트 저항 Ω(mA × Ω ÷ 1000 = V), 전압이면 분압 비(Vadc ÷ Vin) */
  k: number;
  current: boolean;
  /** 공학값 하한·상한 */
  engLo: number;
  engHi: number;
  vref: number;
  bits: number;
}

/** 신호 값 → ADC 입력 전압 */
export const sigToV = (x: ScaleIn, s: number) => (x.current ? (s * x.k) / 1000 : s * x.k);

export interface ScaleOut {
  /** 신호 하한·상한에서의 ADC 입력 전압 */
  vLo: number;
  vHi: number;
  /** 하한·상한의 코드(소수 그대로, 이상적인 위치) */
  cLo: number;
  cHi: number;
  /** 하한~상한 사이 코드 수 */
  span: number;
  /** 1카운트의 공학값 */
  engPerCount: number;
  /** 1카운트의 신호값(mA 또는 V) */
  sigPerCount: number;
  /** 상한 전압이 맨 위 코드 구간(Vref − 1 LSB 이상)에 들어감 → 그보다 큰 신호(넘침)와 구별되지 않음 — 상한 근처가 잘림 */
  clipped: boolean;
  /** 상한에서 쓰지 않고 남는 범위 %(풀스케일 대비) */
  headroom: number;
}

export function scale(x: ScaleIn): ScaleOut {
  if (!(x.k > 0) || !Number.isFinite(x.k)) throw new RangeError("k");
  if (!(x.sigHi > x.sigLo) || !Number.isFinite(x.sigLo) || !Number.isFinite(x.sigHi)) throw new RangeError("sig");
  // 빈칸(NaN)·아주 큰 수(Infinity)는 NaN 끼리 «다름» 으로 통과해 화면에 NaN 이 찍혔다(10/23)
  if (!Number.isFinite(x.engLo) || !Number.isFinite(x.engHi) || x.engHi === x.engLo) throw new RangeError("eng");
  const q = lsb(x.vref, x.bits);
  const vLo = sigToV(x, x.sigLo);
  const vHi = sigToV(x, x.sigHi);
  const cLo = vLo / q;
  const cHi = vHi / q;
  const span = cHi - cLo;
  return {
    vLo,
    vHi,
    cLo,
    cHi,
    span,
    engPerCount: (x.engHi - x.engLo) / span,
    sigPerCount: (x.sigHi - x.sigLo) / span,
    clipped: vHi > x.vref - q,
    headroom: ((x.vref - vHi) / x.vref) * 100,
  };
}

/** 원시 코드 → 공학값(직선으로 늘림 — 범위 밖도 계산) */
export function codeToEng(x: ScaleIn, code: number): number {
  const s = scale(x);
  return x.engLo + ((code - s.cLo) / s.span) * (x.engHi - x.engLo);
}
/** 공학값 → 이상적인 코드(내림 전 소수) */
export function engToCode(x: ScaleIn, eng: number): number {
  const s = scale(x);
  return s.cLo + ((eng - x.engLo) / (x.engHi - x.engLo)) * s.span;
}
/** 원시 코드 → 신호(mA 또는 V) */
export function codeToSig(x: ScaleIn, code: number): number {
  const s = scale(x);
  return x.sigLo + ((code - s.cLo) / s.span) * (x.sigHi - x.sigLo);
}
