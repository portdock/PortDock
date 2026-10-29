// 웹 도구 «펌프·팬 회전수와 동력 계산기» — 상사 법칙(affinity laws / fan laws).
// 근거: U.S. DOE «Improving Fan System Performance: A Sourcebook for Industry»(DOE/GO-102003-1294, 2003-04) p.4 fan laws
//   유량_2 = 유량_1 × (n2/n1), 압력_2 = 압력_1 × (n2/n1)², 동력_2 = 동력_1 × (n2/n1)³,
//   p.18 «회전수를 20 % 줄이면 팬 동력이 50 % 준다»(0.8³ = 0.512 의 어림).
//   펌프도 같은 꼴 — DOE «Improving Pumping System Performance»(2판, 2006) p.49 (임펠러 지름 기준 식).
// 인버터 주파수비 = 회전수비로 보는 것은 슬립을 무시한 근사(유도 전동기 회전수는 주파수에 거의 비례).
// 이 식은 마찰 손실만 있는 계통의 이론값이다 — 정수두(높이차)·정압이 큰 계통은 회전수를 줄여도 압력이 그만큼 내려가지 않는다(DOE 펌프 소스북 p.17).

const pos = (x: number) => Number.isFinite(x) && x > 0;
function need(...xs: number[]) {
  for (const x of xs) if (!pos(x)) throw new RangeError("affinity");
}

/** 회전수비(또는 주파수비) r → 유량·압력·동력 배수 */
export function ratios(r: number) {
  need(r);
  return { flow: r, pressure: r * r, power: r * r * r };
}

/** 정격점(유량·압력·동력)과 회전수비 → 새 운전점 */
export function at(x: { flow: number; pressure: number; power: number }, r: number) {
  const k = ratios(r);
  return { flow: x.flow * k.flow, pressure: x.pressure * k.pressure, power: x.power * k.power };
}

/** 원하는 유량 → 필요한 회전수비(= 주파수비). 유량은 회전수에 비례 */
export function ratioForFlow(flow1: number, flow2: number) {
  need(flow1, flow2);
  return flow2 / flow1;
}

/** 주파수 f1 → f2 의 회전수비(슬립 무시) */
export function ratioFromHz(f1: number, f2: number) {
  need(f1, f2);
  return f2 / f1;
}

/**
 * 한 해 전력량 비교 — 정격 동력 P1 [kW] 으로 h 시간 돌릴 때와 회전수비 r 로 돌릴 때(이론값, 모터·인버터 효율 변화 무시).
 * 부하가 작아지면 모터 효율·역률이 떨어진다(DOE 팬 소스북 p.18) — 결과는 상한에 가까운 어림.
 */
export function yearly(p1Kw: number, r: number, hours: number) {
  need(p1Kw, hours);
  const p2 = p1Kw * ratios(r).power;
  return { kwh1: p1Kw * hours, kwh2: p2 * hours, saved: (p1Kw - p2) * hours, savedPct: (1 - p2 / p1Kw) * 100 };
}
