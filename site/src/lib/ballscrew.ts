// 볼스크류 축 하중·구동 토크·모터 회전수·실효 토크 — 웹 도구 «볼스크류 토크·모터 선정 계산기».
// 근거(THK 종합 카탈로그 «Ball Screw» 515-1E, tech.thk.com):
//   A15 «Calculating the Axial Load»(en_a15_046) 식 18~29
//     수평: Fa1 = μmg + f + mα, Fa2 = μmg + f, Fa3 = μmg + f − mα (뒤로 가면 부호 반대)
//     수직: 올라갈 때 Fa = mg + f (± mα), 내려갈 때 Fa = mg − f (∓ mα),  α = Vmax ÷ t1
//   A15 «Considering the Rotational Torque»(en_a15_061) 식 45~49
//     T1 = Fa × Ph ÷ (2π × η) × A   (η 볼스크류 효율 0.9~0.95)
//     Tk = Tt + T3(가속),  Tg = Tt − T3(감속),  T3 = J × ω′,  ω′ = 2π × Nm ÷ (60 × t)
//     J = m × (Ph ÷ 2π)² × A² × 10⁻⁶ + JS × A² + JA × A² + JB
//   A15 «Considering the Driving Motor»(en_a15_066) 식 52·53
//     NM = V × 1000 × 60 ÷ Ph × 1/A,  B = Ph × A ÷ S (분해능 p/rev)
//   B15 «Example Ball Screw Selections»(en_b15_069) — 수평 고속 이송(80 kg, 1 m/s, 리드 40 → Tk 4,730·Tt 120·Tg −4,490·
//     Trms 1,305 N·mm)과 수직 반송(50 kg, 0.3 m/s, 리드 10 → Tk1 1,100·Trms 743 N·mm) 예제를 시험으로 재현한다.
//     실효 토크 Trms = √(Σ T² × t ÷ Σ t). 모터 관성은 부하 관성의 1/10 이상이 보통(모터 제조사마다 다름 — 같은 예제).
// g = 9.806 65 m/s²(lib/units G0). 예제는 g 와 중간값을 반올림해 적어서 결과가 1 % 안쪽으로 다르다.
import { G0 } from "./units.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
const nonneg = (x: number) => x >= 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("ballscrew");
  return x;
}

export type Mount = "horizontal" | "vertical";

export interface ScrewIn {
  mount: Mount;
  /** 옮기는 질량 kg (테이블 + 공작물) */
  m: number;
  /** 안내면 마찰 계수 μ (수평에서만 씀) */
  mu: number;
  /** 안내면 저항(무부하) N */
  f: number;
  /** 최고 속도 m/s */
  v: number;
  /** 가속 시간 s(감속도 같다고 봄) */
  t1: number;
  /** 리드 mm */
  ph: number;
  /** 볼스크류 효율 (0~1] */
  eta: number;
  /** 감속비 A = 나사 회전 ÷ 모터 회전(직결 1) */
  a: number;
  /** 나사축 관성 JS kg·m² */
  js: number;
  /** 모터 관성 Jm kg·m² */
  jm: number;
  /** 예압 토크 T2 N·mm(없으면 0) */
  tp: number;
}

export interface ScrewOut {
  /** 가속도 m/s² */
  alpha: number;
  /** 축 하중 Fa1~Fa6 N(THK 식 순서: 앞으로/위로 가속·등속·감속, 뒤로/아래로 가속·등속·감속) */
  fa: [number, number, number, number, number, number];
  famax: number;
  /** 모터 최고 회전수 min⁻¹ */
  nm: number;
  /** 모터 축에서 본 관성(모터 제외) kg·m² */
  j: number;
  /** 각가속도 rad/s² */
  omega: number;
  /** 가속 토크 T3 N·mm (J + Jm) */
  t3: number;
  /** 등속 토크(앞·위 / 뒤·아래) N·mm */
  tt: [number, number];
  /** 가속 중 토크(앞·위 / 뒤·아래) N·mm */
  tk: [number, number];
  /** 감속 중 토크(앞·위 / 뒤·아래) N·mm */
  tg: [number, number];
}

/** 축 하중 → 모터 축 마찰 토크 T1 = Fa·Ph/(2πη)·A (N·mm) */
export const frictionTorque = (fa: number, ph: number, eta: number, a = 1) => (fa * ph) / (2 * Math.PI * eta) * a;

export function ballScrew(p: ScrewIn): ScrewOut {
  const { mount, m, mu, f, v, t1, ph, eta, a, js, jm, tp } = p;
  if (!pos(m) || !nonneg(mu) || mu > 1 || !nonneg(f) || !pos(v) || !pos(t1) || !pos(ph) || !pos(eta) || eta > 1 || !pos(a) || !nonneg(js) || !nonneg(jm) || !nonneg(tp)) throw new RangeError("ballscrew");
  if (mount !== "horizontal" && mount !== "vertical") throw new RangeError("mount");
  const alpha = fin(v / t1);
  const ma = m * alpha;
  let fa: ScrewOut["fa"];
  if (mount === "horizontal") {
    const r = mu * m * G0 + f;
    fa = [r + ma, r, r - ma, -r - ma, -r, -r + ma];
  } else {
    const up = m * G0 + f;
    const dn = m * G0 - f;
    fa = [up + ma, up, up - ma, dn - ma, dn, dn + ma];
  }
  fa.forEach(fin);
  const famax = Math.max(...fa.map(Math.abs));
  const nm = fin(((v * 1000 * 60) / ph) / a);
  const j = fin(m * (ph / (2 * Math.PI)) ** 2 * a * a * 1e-6 + js * a * a);
  const omega = fin((2 * Math.PI * nm) / (60 * t1));
  const t3 = fin((j + jm) * omega * 1e3);
  const tt1 = fin(frictionTorque(Math.abs(fa[1]), ph, eta, a) + tp);
  const tt2 = fin(frictionTorque(Math.abs(fa[4]), ph, eta, a) + tp);
  // 수평: 뒤로 갈 때도 크기는 같다. 수직: 내려갈 때 하중이 모터를 돌리려 하므로 가속에서 빼고 감속에서 더한다(THK 수직 예제).
  const tk: [number, number] = mount === "horizontal" ? [tt1 + t3, tt2 + t3] : [tt1 + t3, tt2 - t3];
  const tg: [number, number] = mount === "horizontal" ? [tt1 - t3, tt2 - t3] : [tt1 - t3, tt2 + t3];
  return { alpha, fa, famax, nm, j, omega, t3, tt: [tt1, tt2], tk, tg };
}

/** 수직 정지 중 버티는 토크(THK 수직 예제의 TS) = (mg − f)·Ph/(2πη)·A, 0 보다 작으면 0 */
export function holdTorque(m: number, f: number, ph: number, eta: number, a = 1) {
  if (!pos(m) || !nonneg(f) || !pos(ph) || !pos(eta) || eta > 1 || !pos(a)) throw new RangeError("hold");
  return fin(Math.max(0, frictionTorque(m * G0 - f, ph, eta, a)));
}

/** 실효 토크 √(Σ T²·t ÷ Σ t) — [토크, 시간] 쌍 */
export function rmsTorque(seg: [number, number][]) {
  let s = 0;
  let tt = 0;
  for (const [t, d] of seg) {
    if (!Number.isFinite(t) || !nonneg(d)) throw new RangeError("rms");
    s += t * t * d;
    tt += d;
  }
  if (!(tt > 0)) throw new RangeError("rms");
  return fin(Math.sqrt(s / tt));
}

/** 모터 정격 회전수로 낼 수 있는 최고 속도에 필요한 최소 리드 mm = V × 60 000 ÷ (N × A) */
export function minLead(v: number, nRated: number, a = 1) {
  if (!pos(v) || !pos(nRated) || !pos(a)) throw new RangeError("lead");
  return fin((v * 60000) / (nRated * a));
}

/** 최소 이송량 S(mm)에 필요한 분해능 p/rev = Ph × A ÷ S */
export function resolution(ph: number, s: number, a = 1) {
  if (!pos(ph) || !pos(s) || !pos(a)) throw new RangeError("res");
  return fin((ph * a) / s);
}

/** kg·cm² → kg·m² (카탈로그 치수표의 나사축 관성은 kg·cm²/mm 로 나온다) */
export const kgcm2 = (x: number) => x * 1e-4;
