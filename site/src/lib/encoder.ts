// 엔코더 펄스 ↔ 회전수 — 웹 도구 «엔코더 펄스 ↔ rpm 계산기 (PPR·체배·응답 주파수)».
// 모두 정의로 계산한다:
//   한 상(A)의 출력 주파수 f(Hz) = rpm × PPR ÷ 60,  rpm = f × 60 ÷ PPR
//   A·B 두 상(90° 차이)의 에지를 세는 방식에 따라 한 바퀴 카운트 = PPR × 체배(1·2·4)
//   일정 시간 t 동안 센 카운트 N → rpm = N ÷ (PPR × 체배) ÷ t × 60
//   최대 응답 주파수 f_max(엔코더 또는 카운터 입력) → 쓸 수 있는 최대 rpm = f_max × 60 ÷ PPR
//   절대형 n비트 = 한 바퀴 2^n 위치

export const MULTS = [1, 2, 4] as const;

const pos = (...xs: number[]) => {
  if (!xs.every((x) => x > 0 && Number.isFinite(x))) throw new RangeError("input");
};

/** 한 상의 출력 주파수(Hz) */
export const pulseHz = (rpm: number, ppr: number) => {
  pos(ppr);
  return (rpm * ppr) / 60;
};
/** 출력 주파수 → rpm */
export const rpmFromHz = (hz: number, ppr: number) => {
  pos(ppr);
  return (hz * 60) / ppr;
};
/** 카운트 속도(카운트/s) — 체배 반영 */
export const countRate = (rpm: number, ppr: number, mult: number) => pulseHz(rpm, ppr) * mult;
/** 게이트 시간 동안 센 카운트 → rpm */
export function rpmFromCounts(counts: number, ppr: number, mult: number, seconds: number): number {
  pos(ppr, mult, seconds);
  return (counts / (ppr * mult) / seconds) * 60;
}
/** 최대 응답 주파수로 본 최대 rpm */
export const maxRpm = (fmaxHz: number, ppr: number) => {
  pos(fmaxHz, ppr);
  return (fmaxHz * 60) / ppr;
};
/** 한 카운트의 각도(°) */
export const degPerCount = (ppr: number, mult: number) => {
  pos(ppr, mult);
  return 360 / (ppr * mult);
};
/** 한 카운트의 이동 거리 — 엔코더 축 한 바퀴에 lead 만큼 움직일 때 */
export const distPerCount = (lead: number, ppr: number, mult: number) => {
  pos(lead, ppr, mult);
  return lead / (ppr * mult);
};
/** 절대형 n비트 엔코더의 한 바퀴 위치 수 */
export const absPositions = (bits: number) => 2 ** bits;
