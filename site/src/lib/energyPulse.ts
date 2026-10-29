// 웹 도구 «전력량계 펄스 계산기» — 펄스 정수(imp/kWh)·펄스 간격·개수 → 순시 전력·전력량, CT·PT 배율, 최대 펄스 주파수.
// 근거: 정의식 — 1 kWh = 1 kW × 3600 s(SI 브로슈어의 시간 단위 h = 3600 s).
//   펄스 정수 C [imp/kWh] 는 «1 kWh 에 펄스 C 개». 펄스 하나 = 1/C kWh = 1000/C Wh.
//   펄스 간격 T [s] → 전력 P [kW] = 3600 ÷ (C × T)      (예: 2000 imp/kWh, 1 kW → 펄스 1.8 s 마다)
//   시간 t [s] 동안 N 개 → 전력량 E = N ÷ C [kWh], 평균 전력 P = 3600 × N ÷ (C × t) [kW]
//   P [kW] 일 때 펄스 주파수 f = P × C ÷ 3600 [Hz]
//   변성기(CT·PT)를 거친 계량기의 2차 쪽 값 → 1차 값 = 2차 값 × CT 비 × PT 비(배율). 펄스가 1차 기준인지 2차 기준인지는 계량기 설명서·명판을 본다.
const pos = (x: number) => Number.isFinite(x) && x > 0;
function need(...xs: number[]) {
  for (const x of xs) if (!pos(x)) throw new RangeError("pulse");
}

/** Wh/imp(펄스 하나의 전력량) ↔ imp/kWh */
export const whPerPulse = (c: number) => (need(c), 1000 / c);
export const impPerKwh = (wh: number) => (need(wh), 1000 / wh);

/** 펄스 간격 T 초 → kW */
export function powerFromInterval(c: number, t: number) {
  need(c, t);
  return 3600 / (c * t);
}

/** kW → 펄스 간격(초) */
export function intervalFromPower(c: number, kw: number) {
  need(c, kw);
  return 3600 / (c * kw);
}

/** t 초 동안 n 개 → 전력량 kWh 와 평균 kW */
export function fromCount(c: number, n: number, t: number) {
  need(c, t);
  if (!(Number.isInteger(n) && n >= 0)) throw new RangeError("pulse");
  return { kwh: n / c, kw: (3600 * n) / (c * t) };
}

/** kW 에서 펄스 주파수(Hz) */
export function pulseHz(c: number, kw: number) {
  need(c, kw);
  return (kw * c) / 3600;
}

/** 배율 = CT 비 × PT 비. CT 200/5 → 40, PT 6600/110 → 60 */
export function multiplier(ctPri: number, ctSec: number, ptPri = 1, ptSec = 1) {
  need(ctPri, ctSec, ptPri, ptSec);
  return (ctPri / ctSec) * (ptPri / ptSec);
}

/**
 * 펄스 입력 장치(PLC 고속 카운터 등)가 받을 수 있는지:
 * 최대 전력에서의 주파수와 펄스 주기, 그리고 펄스 폭(ms)이 주기의 절반을 넘는지(넘으면 다음 펄스와 붙음).
 */
export function pulseCheck(c: number, maxKw: number, widthMs: number) {
  need(c, maxKw, widthMs);
  const hz = pulseHz(c, maxKw);
  const periodMs = 1000 / hz;
  return { hz, periodMs, overlap: widthMs * 2 > periodMs };
}
