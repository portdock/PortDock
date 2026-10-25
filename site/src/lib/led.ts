// LED 직렬 저항 — 웹 도구 «LED 저항 계산기».
// 근거: 옴의 법칙(정의식)
//   R = (Vs − n × Vf) ÷ If,  저항 전력 P = If² × R,  LED 하나의 전력 = Vf × If
//   Vf·If 는 LED 데이터시트 값을 사용자가 넣는다(색·제품마다 다름 — 기본값은 예시).
//   표준 값은 lib/divider 의 E12·E24 표(Vishay 28372, IEC 60063 표).
import { bracketE, nearestE, type ESeries } from "./divider.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x) || x < 0) throw new RangeError("LED");
  return x;
}

export interface LedOut {
  /** 저항에 걸리는 전압 V */
  vr: number;
  /** 계산한 저항 Ω */
  r: number;
  /** 그 저항의 전력 W */
  pr: number;
  /** LED 하나의 전력 W */
  pLed: number;
}

/** 전원 vs, LED 순방향 전압 vf(하나), 전류 i(A), 직렬 개수 n */
export function ledResistor(vs: number, vf: number, i: number, n = 1): LedOut {
  if (!pos(vs) || !pos(vf) || !pos(i) || !(Number.isInteger(n) && n >= 1 && n <= 100)) throw new RangeError("LED");
  const vr = vs - n * vf;
  if (!(vr > 0)) throw new RangeError("Vs");
  const r = vr / i;
  if (!pos(r)) throw new RangeError("LED");
  return { vr, r, pr: fin(i * i * r), pLed: fin(vf * i) };
}

/** 정한 저항 R 로 흐르는 전류와 전력 */
export function withResistor(vs: number, vf: number, r: number, n = 1) {
  if (!pos(vs) || !pos(vf) || !pos(r) || !(Number.isInteger(n) && n >= 1 && n <= 100)) throw new RangeError("LED");
  const vr = vs - n * vf;
  if (!(vr > 0)) throw new RangeError("Vs");
  const i = vr / r;
  return { i: fin(i), pr: fin(i * i * r), pLed: fin(vf * i) };
}

/** 표준 값 고르기 — 가까운 값과, 전류가 목표를 넘지 않는 바로 위 값 */
export function ledStandard(r: number, s: ESeries) {
  if (!pos(r)) throw new RangeError("R");
  // 24 V − 2 V = 22 V ÷ 10 mA 가 2200.0000000000005 Ω 처럼 나와 «바로 위» 가 2.7k 로 밀리지 않게 12자리로 자른다
  const x = Number(r.toPrecision(12));
  return { nearest: nearestE(x, s), above: bracketE(x, s)[1] };
}
