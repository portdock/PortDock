// 히터 용량(kW)·전류 — 웹 도구 «히터 용량 계산기».
// 근거(Tempco Electric Heater Corporation «Engineering Data», tempco.com 카탈로그 쪽 16-2·16-5·16-6·16-9·16-10):
//   16-2  가열에 드는 전력 W = 무게(lb) × 비열(Btu/lb·°F) × 온도 상승(°F) ÷ (3.412 Btu/W·h × 가열 시간 h)
//         안전율: 꼼꼼히 계산한 작은 장치 10 %, 보통 20 %, 모르는 조건이 많은 큰 장치 25~35 %
//   16-6  흐르는 액체 kW = 유량(gal/min) × 60 × 밀도(lb/gal) × 비열 × ΔT ÷ 3412 × 안전율(20 % 권장)
//         예: 물 5 gal/min, 50 → 100 °F, ×1.2 → 44 kW / 순환 히터 표: gal/h = kW × 3412 ÷ (8.34 × ΔT)
//   16-5  탱크의 물 kW = gal × ΔT ÷ (372 × h) — 10 % 안전율 포함(8.34 × 1.1 ÷ 3412), 표: 100 gal·100 °F·1 h → 26.9 kW
//   16-9  다른 전압에서의 출력 = 정격 W × (인가 전압 ÷ 정격 전압)² (표: 240 V 히터에 230 V → 92 %), 옴의 법칙
//   16-10 전류 환산표: 단상 A = W ÷ V, 3상 평형 A = W ÷ (√3 × V)  (10 kW: 240 V 단상 41.7 A, 3상 24.1 A, 480 V 3상 12.0 A)
// SI 로 계산한다: kW = 질량(kg) × 비열(kJ/kg·K) × ΔT(K) ÷ (3600 × 시간 h). 1 Btu/lb·°F = 4.1868 kJ/kg·K,
// 1 kWh = 3412.14 Btu(Btu_IT, NIST SP 811 — lib/units). Tempco 는 3412 로 반올림해 결과가 0.01 % 다르다.
import { BTU_IT, GAL_US, LB } from "./units.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("heater");
  return x;
}
function sfOk(sf: number) {
  if (!(Number.isFinite(sf) && sf >= 1 && sf <= 10)) throw new RangeError("sf");
}

/** 정해진 시간에 데우는 데 드는 kW = m·c·ΔT ÷ (3600·h) × 안전율 */
export function heatUpKw(kg: number, cpKJ: number, dT: number, hours: number, sf = 1) {
  if (!pos(kg) || !pos(cpKJ) || !pos(dT) || !pos(hours)) throw new RangeError("heater");
  sfOk(sf);
  return fin(((kg * cpKJ * dT) / (3600 * hours)) * sf);
}

/** 필요한 열량 kWh(안전율 없이) */
export function heatKwh(kg: number, cpKJ: number, dT: number) {
  if (!pos(kg) || !pos(cpKJ) || !pos(dT)) throw new RangeError("heater");
  return fin((kg * cpKJ * dT) / 3600);
}

/** 정한 출력으로 걸리는 시간 h = m·c·ΔT ÷ (3600 × kW) */
export function heatUpHours(kg: number, cpKJ: number, dT: number, kw: number) {
  if (!pos(kw)) throw new RangeError("kw");
  return fin(heatKwh(kg, cpKJ, dT) / kw);
}

/** 흐르는 유체를 ΔT 만큼 올리는 kW = ṁ(kg/s)·c·ΔT × 안전율 */
export function flowKw(kgPerS: number, cpKJ: number, dT: number, sf = 1) {
  if (!pos(kgPerS) || !pos(cpKJ) || !pos(dT)) throw new RangeError("heater");
  sfOk(sf);
  return fin(kgPerS * cpKJ * dT * sf);
}

/** L/min·밀도(kg/L) → kg/s */
export function lpmToKgs(lpm: number, rho: number) {
  if (!pos(lpm) || !pos(rho)) throw new RangeError("flow");
  return fin((lpm * rho) / 60);
}

/** 정한 kW 로 데울 수 있는 유량 kg/s (안전율 없이) */
export function flowFor(kw: number, cpKJ: number, dT: number) {
  if (!pos(kw) || !pos(cpKJ) || !pos(dT)) throw new RangeError("heater");
  return fin(kw / (cpKJ * dT));
}

export type Phase = 1 | 3;

/** 히터 전류 A — 단상 W/V, 3상 평형 W/(√3·V)(선간 전압) */
export function heaterCurrent(watts: number, volts: number, phase: Phase) {
  if (!pos(watts) || !pos(volts) || (phase !== 1 && phase !== 3)) throw new RangeError("current");
  return fin(phase === 1 ? watts / volts : watts / (Math.sqrt(3) * volts));
}

/** 정격 전압이 아닌 전압에서의 출력 W = 정격 W × (V ÷ 정격 V)² */
export function wattsAt(ratedW: number, ratedV: number, appliedV: number) {
  if (!pos(ratedW) || !pos(ratedV) || !pos(appliedV)) throw new RangeError("volt");
  return fin(ratedW * (appliedV / ratedV) ** 2);
}

// ── 미국 단위(Tempco 식 그대로 넣을 때)
export const lbToKg = (lb: number) => lb * LB;
/** Btu/lb·°F → kJ/kg·K (= 4.1868 배) */
export const btuLbFToKJ = (c: number) => (c * BTU_IT) / (LB * (5 / 9)) / 1000;
/** °F 차이 → K 차이 */
export const dFtoK = (f: number) => (f * 5) / 9;
/** 미국 갤런 → L */
export const galToL = (g: number) => g * GAL_US * 1000;
/** lb/gal → kg/L */
export const lbPerGalToKgPerL = (d: number) => lbToKg(d) / galToL(1);
