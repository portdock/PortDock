// LED 직렬 저항 — 옴의 법칙
import { test } from "node:test";
import assert from "node:assert/strict";
import { ledResistor, ledStandard, withResistor } from "./led.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("5 V, Vf 2 V, 20 mA → 150 Ω, 저항 60 mW, LED 40 mW", () => {
  const o = ledResistor(5, 2, 0.02);
  near(o.vr, 3, 1e-12);
  near(o.r, 150, 1e-9);
  near(o.pr, 0.06, 1e-12);
  near(o.pLed, 0.04, 1e-12);
});

test("24 V, Vf 2 V, 10 mA → 2.2 kΩ, 저항 0.22 W — 24 V 표시등은 저항 전력이 LED 보다 훨씬 크다", () => {
  const o = ledResistor(24, 2, 0.01);
  near(o.r, 2200, 1e-9);
  near(o.pr, 0.22, 1e-12);
  assert.ok(o.pr > 10 * o.pLed);
});

test("직렬 3개: 12 V, Vf 3 V, 20 mA → 150 Ω", () => {
  near(ledResistor(12, 3, 0.02, 3).r, 150, 1e-9);
  assert.throws(() => ledResistor(12, 3, 0.02, 4)); // 4 × 3 V = 12 V — 저항에 남는 전압 없음
});

test("표준 값: 계산 2.2 kΩ 은 E12 그대로, 1.73 kΩ → 가까운 1.8k, 바로 위 1.8k; 정한 R 로 전류", () => {
  assert.deepEqual(ledStandard(2200, "E12"), { nearest: 2200, above: 2200 });
  assert.deepEqual(ledStandard(ledResistor(24, 2, 0.01).r, "E12"), { nearest: 2200, above: 2200 });
  assert.deepEqual(ledStandard(ledResistor(5, 2, 0.02).r, "E12"), { nearest: 150, above: 150 });
  const s = ledStandard(1730, "E12");
  assert.equal(s.nearest, 1800);
  assert.equal(s.above, 1800);
  const w = withResistor(24, 2, 2200);
  near(w.i, 0.01, 1e-12);
  near(w.pr, 0.22, 1e-12);
  // 바로 위 값을 쓰면 전류는 목표 이하
  const r = ledResistor(5, 2.1, 0.015).r;
  assert.ok(withResistor(5, 2.1, ledStandard(r, "E24").above).i <= 0.015);
});

test("경계값: 0·음수·빈칸(NaN)·아주 큰 수·Vs ≤ n·Vf 는 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => ledResistor(bad, 2, 0.02), String(bad));
    assert.throws(() => ledResistor(5, bad, 0.02), String(bad));
    assert.throws(() => ledResistor(5, 2, bad), String(bad));
    assert.throws(() => withResistor(5, 2, bad), String(bad));
    assert.throws(() => ledStandard(bad, "E12"), String(bad));
  }
  assert.throws(() => ledResistor(2, 2, 0.02));
  assert.throws(() => ledResistor(5, 2, 0.02, 0));
  assert.throws(() => ledResistor(5, 2, 0.02, 1.5));
  assert.throws(() => ledResistor(1e308, 1, 1e-308)); // R 넘침
});
