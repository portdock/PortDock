// op amp 이득 — TI «Handbook of Operational Amplifier Applications»(SBOA092B) 식과 예
import { test } from "node:test";
import assert from "node:assert/strict";
import { bandwidth, db, delta, diffPinVoltage, idealGain, noiseGain, realGain, rfFor, summing, vout } from "./opamp.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("이상 이득: 비반전 1 + Rf/Rg, 반전 −Rf/Rin, 차동 Rf/Rin × (E2 − E1)", () => {
  assert.equal(idealGain("noninv", 9e3, 1e3), 10);
  assert.equal(idealGain("inv", 100e3, 10e3), -10);
  assert.equal(idealGain("diff", 100e3, 10e3), 10);
  assert.equal(noiseGain(100e3, 10e3), 11);
  near(vout("diff", 100e3, 10e3, 2.05, 2.0), 0.5, 1e-12);
  near(vout("inv", 100e3, 10e3, 0.25), -2.5, 1e-12);
  // 차동: 입력 핀은 E2 × RO/(RI + RO) 에 있다
  near(diffPinVoltage(100e3, 10e3, 11), 10, 1e-12);
});

test("가산: −Rf × (E1/R1 + E2/R2) — Rf = Ri 면 −(E1 + E2)", () => {
  near(summing(10e3, [10e3, 10e3, 10e3], [1, 2, -0.5]), -2.5, 1e-12);
  near(summing(20e3, [10e3, 40e3], [1, 2]), -3, 1e-12);
});

test("dB: 10배 = 20 dB, 100배 = 40 dB (p.31)", () => {
  near(db(10), 20, 1e-12);
  near(db(-100), 40, 1e-12);
});

test("TI 그림 30 예: A 10 000·Zin 50 k·Zout 100 Ω·ZI 10 k·ZO 100 k·Zload 10 k → δ 0.0013, 이득 −9.987 (0.13 %)", () => {
  const d = delta(10000, 10e3, 100e3, 50e3, 100, 10e3);
  near(d, 0.0013, 0.00005);
  const g = -10 / (1 + d);
  assert.equal(+g.toFixed(3), -9.987);
  assert.ok(Math.abs(g / -10 - 1) < 0.0013 + 0.00002);
  // 보정 뒤 A 가 10 % 줄어도 이득 변화는 0.02 % 보다 작다
  const d2 = delta(9000, 10e3, 100e3, 50e3, 100, 10e3);
  assert.ok(Math.abs((1 + d) / (1 + d2) - 1) < 0.0002);
});

test("Zin ∞·Zout 0 이면 δ = 잡음 이득 ÷ A, realGain 과 같다", () => {
  near(delta(1e4, 10e3, 100e3), 11 / 1e4, 1e-15);
  near(realGain("inv", 100e3, 10e3, 1e4), -10 / (1 + 11 / 1e4), 1e-12);
  near(realGain("noninv", 9e3, 1e3, 1e5), 10 / (1 + 10 / 1e5), 1e-12);
});

test("대역폭 ≈ GBW ÷ 잡음 이득 — 팔로어는 GBW, 단위 이득 반전은 절반(p.37)", () => {
  near(bandwidth(1e6, 1e-9 /* Rf ≈ 0 */ , 1e9), 1e6, 1e-3);
  near(bandwidth(1e6, 10e3, 10e3), 0.5e6, 1e-9);
  near(bandwidth(10e6, 99e3, 1e3), 100e3, 1e-9);
});

test("목표 이득 → Rf 표준 값: 비반전 ×11, Rg 10 k → Rf 100 k (E12 그대로)", () => {
  const o = rfFor("noninv", 11, 10e3, "E12");
  near(o.rf, 100e3, 1e-6);
  assert.equal(o.e, 100e3);
  assert.equal(o.gain, 11);
  const p = rfFor("inv", 4.7, 2.2e3, "E24"); // 10.34 k → 10 k
  assert.equal(p.e, 10e3);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => idealGain("noninv", bad, 1e3), String(bad));
    assert.throws(() => idealGain("inv", 1e3, bad), String(bad));
    assert.throws(() => realGain("inv", 1e3, 1e3, bad), String(bad));
    assert.throws(() => bandwidth(bad, 1e3, 1e3), String(bad));
    assert.throws(() => delta(bad, 1e3, 1e3), String(bad));
    assert.throws(() => rfFor("inv", bad, 1e3, "E12"), String(bad));
  }
  assert.throws(() => db(0));
  assert.throws(() => db(NaN));
  assert.throws(() => vout("inv", 1e3, 1e3, NaN));
  assert.throws(() => summing(1e3, [], []));
  assert.throws(() => summing(1e3, [1e3], [1, 2]));
  assert.throws(() => idealGain("noninv", 1e308, 1e-308)); // 넘침
  assert.throws(() => vout("noninv", 1e300, 1, 1e300)); // 넘침
  assert.throws(() => rfFor("noninv", 1, 1e3, "E12")); // 비반전 이득 1 → Rf 0
});
