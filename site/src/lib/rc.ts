// RC 시정수·1차 저역 필터 — 웹 도구 «RC 시정수·차단 주파수 계산기».
// 근거: 정의식(회로 이론)
//   τ = R × C, 계단 입력의 충전 Vc(t) = V × (1 − e^(−t/τ)), 방전 Vc(t) = V × e^(−t/τ)
//   RC 1차 저역 필터: 차단 주파수 fc = 1 ÷ (2π × R × C), 이득 |H| = 1 ÷ √(1 + (f/fc)²), 위상 = −atan(f/fc)
//   10 % → 90 % 상승 시간 = τ × ln 9

/** 시정수(s) */
export function tau(r: number, c: number): number {
  if (!(r > 0) || !(c > 0)) throw new RangeError("RC");
  const t = r * c;
  // 아주 큰 값(1e999 = Infinity)·넘침은 «Infinity s» 로 찍히지 않게 거절(10/23)
  if (!Number.isFinite(t) || !(t > 0)) throw new RangeError("RC");
  return t;
}
/** 차단 주파수(Hz) */
export const fc = (r: number, c: number) => 1 / (2 * Math.PI * tau(r, c));
/** fc·R → C */
export function cFor(f: number, r: number): number {
  if (!(f > 0) || !(r > 0) || !Number.isFinite(f * r)) throw new RangeError("f");
  return 1 / (2 * Math.PI * f * r);
}
/** fc·C → R */
export function rFor(f: number, c: number): number {
  if (!(f > 0) || !(c > 0) || !Number.isFinite(f * c)) throw new RangeError("f");
  return 1 / (2 * Math.PI * f * c);
}
/** 충전 비율(0~1) — t 초 뒤 */
export const charge = (t: number, tauS: number) => 1 - Math.exp(-t / tauS);
/** 방전 비율(0~1) — t 초 뒤 남은 몫 */
export const discharge = (t: number, tauS: number) => Math.exp(-t / tauS);
/** 충전 비율 frac(0~1) 까지 걸리는 시간 */
export function timeTo(frac: number, tauS: number): number {
  if (!(frac >= 0 && frac < 1)) throw new RangeError("frac");
  return -tauS * Math.log(1 - frac);
}
/** 10 % → 90 % 상승 시간 */
export const riseTime = (tauS: number) => tauS * Math.log(9);
/** 주파수 f 에서 이득(dB) */
export const gainDb = (f: number, fcHz: number) => -10 * Math.log10(1 + (f / fcHz) ** 2);
/** 주파수 f 에서 이득(배) */
export const gain = (f: number, fcHz: number) => 1 / Math.sqrt(1 + (f / fcHz) ** 2);
/** 주파수 f 에서 위상(도) */
export const phaseDeg = (f: number, fcHz: number) => (-Math.atan(f / fcHz) * 180) / Math.PI;
/** 원하는 감쇠(배, 0~1)가 되는 주파수 */
export function fAtGain(g: number, fcHz: number): number {
  if (!(g > 0 && g < 1)) throw new RangeError("g");
  return fcHz * Math.sqrt(1 / (g * g) - 1);
}
