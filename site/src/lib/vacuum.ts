// 진공 패드 흡착력·배관 용적·흡착 응답 시간 — 웹 도구 «진공 패드 흡착력 계산기».
// 근거(SMC 공식 자료, smcworld.com «Vacuum Equipment Model Selection» PDF):
//   4-P0878-883_en  p.878  이론 흡착력 = 압력 × 면적 — 예: ø20 3.14 cm² → −40 kPa 12 N, −80 kPa 25 N / ø40 12.56 cm² → 50·100 N
//                   p.880  W = P × S × 0.1 × 1/t  (W 흡착력 N, P 진공압 kPa, S 패드 면적 cm², t 안전율 — 수평 4 이상, 수직 8 이상)
//                          이론 흡착력 표(P × S × 0.1, 안전율 없음). 이젝터를 쓸 때 진공압은 대략 −60 kPa.
//   6-4-p0033-vacuum_en (A33)  §3  Q = V × 60 ÷ T1 + QL,  T2 = 3 × T1,  Qmax = (2~3) × Q
//                              §4  누설량 QL = 55.5 × CL   (L/min(ANR), CL 컨덕턴스 dm³/(s·bar))
//   6-4-p0034-vacuum_en (A34)  §5  T1 = V × 60 ÷ Q (최종 진공압의 63 %), T2 = 3 × T1 (95 %),
//                                  V = π/4 × D² × L × 1/1000 (L), Q1 = (1/2~1/3) × 이젝터 최대 흡입 유량,
//                                  Q2 = C × 55.5, Q = Q1·Q2 중 작은 값
//   4-P0891_en  p.891  선정 예(반도체 칩 1 g, ø4 패드 1개, 안전율 4 → −3.0 kPa 이상 / 튜브 내경 2 mm·1 m → 0.0031 L /
//                      300 ms → Q 0.62, Qmax 1.24~1.86 L/min / ZX105 최대 5 L/min → Q1 1.7, C 0.22 → Q2 12.2, T 0.109 s)
//   4-P0892_en  p.892  그래프 (2) 예: 튜브 내경 ø5·1 m → 약 0.02 L
// 진공압은 크기(양수, «−60 kPa» 면 60)로 받는다. 대기압(101.325 kPa)보다 클 수 없다.

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("vacuum");
  return x;
}
/** 진공압 크기 kPa: 0 < P < 101.325 (표준 대기압) */
function vacOk(p: number) {
  if (!(pos(p) && p < 101.325)) throw new RangeError("P");
}

/** 패드 지름 mm → 면적 cm² = π/4 × (d/10)² */
export function padArea(dMm: number) {
  if (!pos(dMm) || dMm > 1e5) throw new RangeError("d");
  return (Math.PI / 4) * (dMm / 10) ** 2;
}

/** 흡착력 N = P(kPa) × S(cm²) × 0.1 × 패드 수 ÷ 안전율 t (t = 1 이면 이론 흡착력) */
export function liftForce(pKPa: number, areaCm2: number, t = 1, pads = 1) {
  vacOk(pKPa);
  if (!pos(areaCm2) || !pos(t) || !Number.isInteger(pads) || pads < 1) throw new RangeError("lift");
  return fin((pKPa * areaCm2 * 0.1 * pads) / t);
}

/** 들어야 할 힘 W(N)에 필요한 진공압 kPa = W × t ÷ (S × 0.1 × 패드 수) — 대기압 이상이면 그 패드로는 못 듦(Infinity 대신 오류) */
export function requiredVacuum(wN: number, areaCm2: number, t: number, pads = 1) {
  if (!pos(wN) || !pos(areaCm2) || !pos(t) || !Number.isInteger(pads) || pads < 1) throw new RangeError("need");
  return fin((wN * t) / (areaCm2 * 0.1 * pads));
}

/** 들어야 할 힘에 필요한 패드 하나의 면적 cm²와 지름 mm */
export function requiredPad(wN: number, pKPa: number, t: number, pads = 1) {
  vacOk(pKPa);
  if (!pos(wN) || !pos(t) || !Number.isInteger(pads) || pads < 1) throw new RangeError("need");
  const s = fin((wN * t) / (pKPa * 0.1 * pads));
  return { area: s, d: fin(Math.sqrt((4 * s) / Math.PI) * 10) };
}

/** SMC 표에 있는 둥근 패드 지름(mm) — p.880 */
export const SMC_PADS = [1.5, 2, 3.5, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 200, 250, 300, 340] as const;

/** 필요한 지름 이상인 SMC 표 패드 중 가장 작은 것(없으면 null) */
export function pickPad(needD: number) {
  if (!pos(needD)) throw new RangeError("d");
  return SMC_PADS.find((d) => d >= needD) ?? null;
}

/** 배관 용적 L = π/4 × D(mm)² × 길이(m) ÷ 1000 */
export function pipeVolume(idMm: number, lenM: number) {
  if (!pos(idMm) || !pos(lenM) || idMm > 1e4 || lenM > 1e6) throw new RangeError("pipe");
  return fin(((Math.PI / 4) * idMm * idMm * lenM) / 1000);
}

/** 정한 응답 시간 T1(s, 63 %)에 필요한 평균 흡입 유량 L/min(ANR) = V × 60 ÷ T1 + QL, 이젝터 최대 흡입 유량은 그 2~3배 */
export function flowForTime(vL: number, t1: number, leak = 0) {
  if (!pos(vL) || !pos(t1) || !(Number.isFinite(leak) && leak >= 0)) throw new RangeError("flow");
  const q = fin((vL * 60) / t1 + leak);
  return { q, qmaxLo: 2 * q, qmaxHi: 3 * q };
}

/** 배관 컨덕턴스 C(dm³/(s·bar)) → 흐를 수 있는 최대 유량 L/min(ANR) = C × 55.5 (누설량 QL 도 같은 식) */
export function conductanceFlow(c: number) {
  if (!pos(c)) throw new RangeError("C");
  return fin(c * 55.5);
}

/**
 * 응답 시간 — Q1(평균 흡입 유량, 이젝터 최대 유량의 1/2~1/3)과 Q2(배관 최대 유량) 중 작은 값으로
 * T1 = V × 60 ÷ Q (최종 진공압의 63 %), T2 = 3 × T1 (95 %). q2 를 모르면 생략.
 */
export function responseTime(vL: number, q1: number, q2?: number) {
  if (!pos(vL) || !pos(q1) || (q2 !== undefined && !pos(q2))) throw new RangeError("resp");
  const q = q2 === undefined ? q1 : Math.min(q1, q2);
  const t1 = fin((vL * 60) / q);
  return { q, t1, t2: 3 * t1 };
}

/** 무게 kg → N (표준 중력 9.806 65) */
export const kgToN = (kg: number) => {
  if (!pos(kg)) throw new RangeError("kg");
  return fin(kg * 9.80665);
};
