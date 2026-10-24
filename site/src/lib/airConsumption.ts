// 공압 실린더 공기 소비량·필요 공기량 — 웹 도구 «공압 실린더 공기 소비량 계산기».
// 근거(SMC 공식 자료): SMC «Best Pneumatics» 기술 자료
//   (ca01.smcworld.com/catalog/BEST-technical-data-en/pdf/6-2-1-m21-43-tech_en.pdf)
//   p.1574 «Technical Data 2: Air Consumption and Required Air Volume»
//     식 (8)(9)   qc = A × L × (P + 0.1) ÷ 0.1 × 10⁻⁶       실린더 공기 소비량 dm³(ANR) — A 받는 면적 mm², L 행정 mm, P MPa
//     식 (10)(11) qp = a × l × P ÷ 0.1 × 10⁻⁶              배관(튜브) 공기 소비량 — a 배관 안 단면적 mm², l 길이 mm
//     식 (12) 복동 q = qc1 + qp1 + qc2 + qp2, (13) 단동 스프링 복귀 q = qc1 + qp1, (14) 스프링 전진 q = qc2 + qp2
//     식 (15)(16) 필요 공기량 Q = (qc + qp) × 60 ÷ t   dm³/min(ANR), t 전체 행정 시간 s — 미는 쪽·당기는 쪽 중 큰 값
//     튜브·강관 안 단면적 표(T0425 ø2.5 → 4.9 mm² … 1B ø27.6 → 598 mm²)
//   p.1573 «Model Selection» 4: 예 — ø50·행정 600·0.5 MPa → 13 L(ANR), 튜브 ø6·2 m → 0.56 L,
//     10대·분당 5회 → (13 + 0.56) × 10 × 5 = 678 L/min(ANR). 컴프레서는 이 합보다 넉넉하게(참고: 적어도 1.4배).
// 1 dm³ = 1 L. ANR = 표준 대기 상태로 환산한 부피.
import { pistonArea, rodSideArea } from "./cylinder.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("air");
  return x;
}
function pOk(p: number) {
  if (!pos(p) || p > 100) throw new RangeError("P");
}

/** 실린더 한 번 행정의 공기 소비량 L(ANR) = A × L × (P + 0.1) ÷ 0.1 × 10⁻⁶ */
export function cylAir(areaMm2: number, strokeMm: number, mpa: number) {
  pOk(mpa);
  if (!pos(areaMm2) || !pos(strokeMm)) throw new RangeError("air");
  return fin(((areaMm2 * strokeMm * (mpa + 0.1)) / 0.1) * 1e-6);
}

/** 배관 한 번 채우는 공기 소비량 L(ANR) = a × l × P ÷ 0.1 × 10⁻⁶ (길이 0 이면 0) */
export function pipeAir(idMm: number, lenMm: number, mpa: number) {
  pOk(mpa);
  if (!(Number.isFinite(lenMm) && lenMm >= 0)) throw new RangeError("pipe");
  if (lenMm === 0) return 0;
  return fin(((tubeArea(idMm) * lenMm * mpa) / 0.1) * 1e-6);
}

/** 배관 안 단면적 mm² = π/4 × 내경² */
export function tubeArea(idMm: number) {
  if (!pos(idMm) || idMm > 1e4) throw new RangeError("id");
  return (Math.PI / 4) * idMm * idMm;
}

/** SMC 표의 튜브·강관 [호칭, 바깥지름 mm(강관은 null), 내경 mm, 표의 단면적 mm²] */
export const SMC_TUBES: readonly (readonly [string, number | null, number, number])[] = [
  ["T0425", 4, 2.5, 4.9],
  ["T0604", 6, 4, 12.6],
  ["TU0805", 8, 5, 19.6],
  ["T0806", 8, 6, 28.3],
  ["1/8B", null, 6.5, 33.2],
  ["T1075", 10, 7.5, 44.2],
  ["TU1208", 12, 8, 50.3],
  ["T1209", 12, 9, 63.6],
  ["1/4B", null, 9.2, 66.5],
  ["TS1612", 16, 12, 113],
  ["3/8B", null, 12.7, 127],
  ["T1613", 16, 13, 133],
  ["1/2B", null, 16.1, 204],
  ["3/4B", null, 21.6, 366],
  ["1B", null, 27.6, 598],
];

export type Acting = "double" | "springReturn" | "springExtend";

export interface AirIn {
  bore: number;
  rod: number;
  stroke: number;
  mpa: number;
  /** 밸브 ~ 실린더 배관 내경 mm, 길이 m — 미는 쪽·당기는 쪽 같은 배관으로 본다 */
  pipeId: number;
  pipeM: number;
  acting: Acting;
}

/** 한 사이클(왕복)의 공기 소비량 — 쪽별 값과 합(L(ANR)) */
export function cycleAir(i: AirIn) {
  const c1 = cylAir(pistonArea(i.bore), i.stroke, i.mpa);
  const c2 = cylAir(rodSideArea(i.bore, i.rod), i.stroke, i.mpa);
  const l = i.pipeM * 1000;
  if (!(Number.isFinite(l) && l >= 0)) throw new RangeError("pipe");
  const p = l === 0 ? 0 : pipeAir(i.pipeId, l, i.mpa);
  const q = i.acting === "double" ? c1 + p + c2 + p : i.acting === "springReturn" ? c1 + p : c2 + p;
  return { qc1: c1, qc2: c2, qp: p, q: fin(q) };
}

/** 분당 소비량 L/min(ANR) = 사이클 소비량 × 분당 사이클 × 실린더 수 */
export function perMinute(qCycle: number, cyclesPerMin: number, count = 1) {
  if (!pos(qCycle) || !pos(cyclesPerMin) || !Number.isInteger(count) || count < 1) throw new RangeError("rate");
  return fin(qCycle * cyclesPerMin * count);
}

/** 필요 공기량 L/min(ANR) = (qc + qp) × 60 ÷ 행정 시간 t(s) — 식 (15)(16) */
export function requiredFlow(qcL: number, qpL: number, strokeTimeS: number) {
  if (!pos(qcL) || !(Number.isFinite(qpL) && qpL >= 0) || !pos(strokeTimeS)) throw new RangeError("flow");
  return fin(((qcL + qpL) * 60) / strokeTimeS);
}

/** SMC 가 적은 컴프레서 여유(참고값, 최소 1.4배) */
export const COMPRESSOR_FACTOR = 1.4;
