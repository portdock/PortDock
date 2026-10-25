// NTC 서미스터 — 웹 도구 «NTC 서미스터 계산기 (B 정수·Steinhart–Hart·분압·ADC)».
// 근거:
//   TDK(EPCOS) «NTC thermistors — General technical information»(2018-01) §3.1.1 식 1(R_T = R_R·e^{B(1/T − 1/T_R)}, T 는 K),
//     §3.1.2 식 2·3(두 온도의 저항으로 B 값, 데이터시트는 대개 B25/100), «정격 온도 근처의 좁은 범위에서만 충분히 정확»,
//     §3.2.3 식 13(발산 계수 δth = ΔP/ΔT, mW/K → 자기 발열 ΔT = P ÷ δth)
//   J. S. Steinhart, S. R. Hart, «Calibration curves for thermistors», Deep-Sea Research 15(4), 1968, 497–503 — 1/T = A + B·ln R + C·(ln R)³
//   ATmega328P 데이터시트(7810D, 2015-01) §23.7 — ADC = V_IN × 1024 ÷ V_REF (10비트, 0x3FF = V_REF − 1 LSB). n비트면 2^n 으로 일반화
// 온도는 °C 로 받고 안에서 K = °C + 273.15 로 바꾼다.

export const K0 = 273.15;
const k = (c: number) => c + K0;

/** B 정수 식: 온도(°C) → 저항 */
export function betaR(r0: number, b: number, t0C: number, tC: number): number {
  if (!(r0 > 0) || !(b > 0) || !(k(tC) > 0) || !(k(t0C) > 0)) throw new RangeError("beta");
  return r0 * Math.exp(b * (1 / k(tC) - 1 / k(t0C)));
}
/** B 정수 식: 저항 → 온도(°C) */
export function betaT(r0: number, b: number, t0C: number, r: number): number {
  if (!(r0 > 0) || !(b > 0) || !(r > 0)) throw new RangeError("beta");
  return 1 / (1 / k(t0C) + Math.log(r / r0) / b) - K0;
}
/** 두 온도(°C)의 저항으로 B 값(K) — TDK 식 3 */
export function betaFrom(r1: number, t1C: number, r2: number, t2C: number): number {
  if (!(r1 > 0) || !(r2 > 0) || t1C === t2C) throw new RangeError("beta");
  return Math.log(r1 / r2) / (1 / k(t1C) - 1 / k(t2C));
}

export interface SH {
  a: number;
  b: number;
  c: number;
}
/** Steinhart–Hart 계수 — 세 점(°C, Ω)을 지나게 푼다 */
export function shFit(p: [number, number][]): SH {
  if (p.length !== 3) throw new RangeError("3 points");
  const L = p.map(([, r]) => {
    if (!(r > 0)) throw new RangeError("R");
    return Math.log(r);
  });
  const Y = p.map(([t]) => 1 / k(t));
  if (new Set(L).size < 3) throw new RangeError("same R");
  const g2 = (Y[1] - Y[0]) / (L[1] - L[0]);
  const g3 = (Y[2] - Y[0]) / (L[2] - L[0]);
  const c = (g3 - g2) / (L[2] - L[1]) / (L[0] + L[1] + L[2]);
  const b = g2 - c * (L[0] ** 2 + L[0] * L[1] + L[1] ** 2);
  const a = Y[0] - (b + c * L[0] ** 2) * L[0];
  if (![a, b, c].every(Number.isFinite)) throw new RangeError("fit");
  return { a, b, c };
}
/** Steinhart–Hart: 저항 → 온도(°C) */
export function shT({ a, b, c }: SH, r: number): number {
  if (!(r > 0)) throw new RangeError("R");
  const L = Math.log(r);
  return 1 / (a + b * L + c * L ** 3) - K0;
}
/**
 * Steinhart–Hart: 온도(°C) → 저항 — c·x³ + b·x + (a − 1/T) = 0 (x = ln R) 을 푼다.
 * 판별식이 0 이상이면 카르다노 식, 음수(c < 0 일 때 생길 수 있음 — 실근 셋)면 B 식처럼 c 를 뺀 근 x₀ = (1/T − a) ÷ b 에서
 * 뉴턴법으로 shT 를 거꾸로 풀어 그 근 가까이의 실근을 고른다. 마지막에 뉴턴법으로 다듬고, 기울기(b + 3c·x²)가 0 이하인 곳
 * (온도가 저항에 대해 한쪽으로만 변하지 않는 구간)이거나 값이 유한하지 않으면 RangeError.
 */
export function shR({ a, b, c }: SH, tC: number): number {
  if (!(k(tC) > 0)) throw new RangeError("T");
  const Y = 1 / k(tC);
  const f = (x: number) => a + b * x + c * x ** 3 - Y;
  const df = (x: number) => b + 3 * c * x * x;
  let x: number;
  const y = (a - Y) / c;
  const d = (b / (3 * c)) ** 3 + (y / 2) ** 2;
  if (c !== 0 && d >= 0) {
    const q = Math.sqrt(d);
    x = Math.cbrt(q - y / 2) - Math.cbrt(q + y / 2);
  } else x = (Y - a) / b;
  for (let i = 0; i < 50 && Number.isFinite(x); i++) {
    const g = df(x);
    if (!(g > 0)) break;
    const dx = f(x) / g;
    x -= dx;
    if (Math.abs(dx) < 1e-14 * Math.max(1, Math.abs(x))) break;
  }
  const r = Math.exp(x);
  if (!Number.isFinite(x) || !(df(x) > 0) || !(Math.abs(f(x)) <= 1e-9 * Y) || !Number.isFinite(r) || !(r > 0)) throw new RangeError("sh");
  return r;
}

/** 분압: 전원 vs, 위쪽 저항 top, 아래쪽 저항 bottom → 가운데 전압 */
export const divider = (vs: number, top: number, bottom: number) => (vs * bottom) / (top + bottom);
/** 분압 전압으로 NTC 저항 되찾기 */
export function ntcFromV(vs: number, fixed: number, v: number, ntcOnTop: boolean): number {
  if (!(v > 0) || !(v < vs)) throw new RangeError("V");
  return ntcOnTop ? (fixed * (vs - v)) / v : (fixed * v) / (vs - v);
}

/** 이상적인 n비트 ADC 값(내림, 0 ~ 2^n − 1) */
export function adcCode(v: number, vref: number, bits: number): number {
  const full = 2 ** bits;
  return Math.min(full - 1, Math.max(0, Math.floor((v / vref) * full)));
}
/** ADC 값 → 전압(그 코드의 아래 끝) */
export const adcVolt = (code: number, vref: number, bits: number) => (code / 2 ** bits) * vref;
/** 1 LSB 전압 */
export const lsb = (vref: number, bits: number) => vref / 2 ** bits;

/** 자기 발열(K): NTC 에 걸린 전압 v, 저항 r, 발산 계수 δth(mW/K) */
export const selfHeat = (v: number, r: number, dthMwPerK: number) => (v * v) / r / (dthMwPerK / 1000);
