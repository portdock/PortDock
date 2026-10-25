// op amp 증폭률 — 웹 도구 «op amp 이득 계산기 (반전·비반전·차동)».
// 근거: Texas Instruments «Handbook of Operational Amplifier Applications»(SBOA092B, 2001 · 2016 개정)
//   p.15 그림 11, p.17 그림 14, p.18 그림 17  비반전 EO = (1 + RO/RI) × EI,  반전 EO = −(RO/RI) × EI (이상적 op amp)
//   p.23~24 그림 24·25 가산 EO = −RO × (E1/R1 + E2/R2 + …)
//   p.24~25 그림 26·27 차동 EO = (RO/RI) × (E2 − E1) — 위아래 RO·RI 가 같을 때. 입력 핀 전압 = E2 × RO/(RI + RO)
//   p.27~28 그림 30  유한 이득·입출력 임피던스를 넣은 반전 증폭기: EO/EI = −(ZO/ZI) × 1/(1 + δ),
//            δ = (1 + Zout/ZO + Zout/Zload)(1 + ZO/ZI + ZO/Zin) ÷ (A − Zout/ZO)
//            예: A 10 000, Zin 50 k, Zout 100 Ω, ZI 10 k, ZO 100 k, Zload 10 k → δ ≈ 0.0013, 이득 −9.987(이상값 −10 의 0.13 % 안)
//   p.31 dB = 20 log(EO/EI) (10배 = 20 dB, 100배 = 40 dB)
//   p.36~37 그림 40·41 전압 팔로어는 단위 이득 교차 주파수까지, 단위 이득 반전 증폭기는 그 절반(입력·되먹임 저항의 분압 때문)
//        → 폐루프 대역폭 ≈ 이득 대역폭 곱(GBW) ÷ 잡음 이득(1 + RO/RI)
//   δ 에서 Zin → ∞, Zout → 0 이면 δ = (1 + ZO/ZI) ÷ A — 비반전도 되먹임 비가 같아(β = RI/(RI + RO)) 같은 꼴로 줄어든다.
import { nearestE, type ESeries } from "./divider.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("opamp");
  return x;
}
function rr(rf: number, rg: number) {
  if (!pos(rf) || !pos(rg)) throw new RangeError("R");
  return fin(rf / rg);
}

export type Topology = "noninv" | "inv" | "diff";

/** 이상적 이득 — 비반전 1 + Rf/Rg, 반전 −Rf/Rin, 차동 Rf/Rin(E2 − E1 에 곱함) */
export function idealGain(t: Topology, rf: number, rg: number) {
  const k = rr(rf, rg);
  return t === "noninv" ? fin(1 + k) : t === "inv" ? -k : k;
}

/** 잡음 이득(되먹임 비의 역수) = 1 + Rf/Rg — 세 회로 모두 */
export const noiseGain = (rf: number, rg: number) => fin(1 + rr(rf, rg));

/** dB = 20·log10|G| */
export function db(g: number) {
  if (!Number.isFinite(g) || g === 0) throw new RangeError("dB");
  return 20 * Math.log10(Math.abs(g));
}

/** TI SBOA092B 의 δ — zin·zload 기본 ∞, zout 기본 0 */
export function delta(a: number, zi: number, zo: number, zin = Infinity, zout = 0, zload = Infinity) {
  if (!pos(a) || !pos(zi) || !pos(zo) || !(zin > 0) || !(zout >= 0 && Number.isFinite(zout)) || !(zload > 0)) throw new RangeError("delta");
  const den = a - zout / zo;
  if (!(den > 0)) throw new RangeError("delta");
  return fin(((1 + zout / zo + zout / zload) * (1 + zo / zi + zo / zin)) / den);
}

/** 유한 개루프 이득 A 에서 실제 이득 = 이상 이득 ÷ (1 + 잡음 이득/A) */
export function realGain(t: Topology, rf: number, rg: number, a: number) {
  if (!pos(a)) throw new RangeError("A");
  return fin(idealGain(t, rf, rg) / (1 + noiseGain(rf, rg) / a));
}

/** 폐루프 −3 dB 대역폭 ≈ GBW ÷ 잡음 이득 */
export function bandwidth(gbw: number, rf: number, rg: number) {
  if (!pos(gbw)) throw new RangeError("GBW");
  return fin(gbw / noiseGain(rf, rg));
}

/** 출력 V — 비반전·반전은 vin, 차동은 e2 − e1 */
export function vout(t: Topology, rf: number, rg: number, vin: number, e1 = 0) {
  if (!Number.isFinite(vin) || !Number.isFinite(e1)) throw new RangeError("V");
  const g = idealGain(t, rf, rg);
  return fin(t === "diff" ? g * (vin - e1) : g * vin);
}

/** 차동 증폭기 입력 핀의 전압 = E2 × Rf/(Rin + Rf) (공통 모드 범위 확인용) */
export function diffPinVoltage(rf: number, rin: number, e2: number) {
  if (!pos(rf) || !pos(rin) || !Number.isFinite(e2)) throw new RangeError("V");
  return fin((e2 * rf) / (rin + rf));
}

/** 가산 증폭기 EO = −Rf × Σ(Ei/Ri) */
export function summing(rf: number, rs: number[], es: number[]) {
  if (!pos(rf) || rs.length === 0 || rs.length !== es.length || !rs.every(pos) || !es.every(Number.isFinite)) throw new RangeError("sum");
  return fin(-rf * rs.reduce((s, r, i) => s + es[i] / r, 0));
}

/** 목표 이득 크기 |G| 와 Rg 로 Rf 와 가장 가까운 표준 값, 그때 이득 */
export function rfFor(t: Topology, target: number, rg: number, s: ESeries) {
  if (!pos(target) || !pos(rg)) throw new RangeError("target");
  const k = t === "noninv" ? target - 1 : target;
  if (!(k > 0)) throw new RangeError("target");
  const rf = fin(k * rg);
  const e = nearestE(Number(rf.toPrecision(12)), s);
  return { rf, e, gain: Math.abs(idealGain(t, e, rg)) };
}
