// 전력량계 펄스 — 정의식(1 kWh = 1 kW × 3600 s)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromCount, impPerKwh, intervalFromPower, multiplier, powerFromInterval, pulseCheck, pulseHz, whPerPulse } from "./energyPulse.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("2000 imp/kWh, 1 kW → 펄스 1.8 s 마다, 거꾸로 1.8 s → 1 kW", () => {
  near(intervalFromPower(2000, 1), 1.8, 1e-12);
  near(powerFromInterval(2000, 1.8), 1, 1e-12);
});

test("1000 imp/kWh = 펄스 하나 1 Wh, 1 Wh/imp 에서 간격 3.6 s → 1 kW", () => {
  near(whPerPulse(1000), 1, 1e-12);
  near(impPerKwh(0.5), 2000, 1e-9);
  near(powerFromInterval(1000, 3.6), 1, 1e-12);
});

test("10초 동안 2개(1000 imp/kWh) → 0.002 kWh, 평균 0.72 kW", () => {
  const o = fromCount(1000, 2, 10);
  near(o.kwh, 0.002, 1e-15);
  near(o.kw, 0.72, 1e-12);
  assert.throws(() => fromCount(1000, 1.5, 10), RangeError);
});

test("배율: CT 200/5 = 40, CT 200/5 · PT 6600/110 = 2400", () => {
  near(multiplier(200, 5), 40, 1e-12);
  near(multiplier(200, 5, 6600, 110), 2400, 1e-9);
});

test("펄스 주파수: 100 kW × 1000 imp/kWh = 27.78 Hz(주기 36 ms) — 폭 30 ms 면 붙음, 10 ms 면 괜찮음", () => {
  near(pulseHz(1000, 100), 100000 / 3600, 1e-9);
  const a = pulseCheck(1000, 100, 30);
  near(a.periodMs, 36, 1e-9);
  assert.equal(a.overlap, true);
  assert.equal(pulseCheck(1000, 100, 10).overlap, false);
});

test("0·음수는 RangeError", () => {
  assert.throws(() => powerFromInterval(0, 1), RangeError);
  assert.throws(() => multiplier(200, 0), RangeError);
});
