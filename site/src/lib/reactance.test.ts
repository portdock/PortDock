// 리액턴스·LC 공진 — 정의식
import { test } from "node:test";
import assert from "node:assert/strict";
import { capLoad, cForF0, cForXc, f0, lForF0, lForXl, xc, xl, z0 } from "./reactance.ts";
import { capUf } from "./power.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("Xc: 100 µF 는 50 Hz 에서 31.83 Ω, 60 Hz 에서 26.53 Ω, 1 µF·1 kHz 는 159.15 Ω", () => {
  near(xc(50, 100e-6), 31.831, 1e-3);
  near(xc(60, 100e-6), 26.526, 1e-3);
  near(xc(1000, 1e-6), 159.155, 1e-3);
  near(cForXc(50, xc(50, 47e-6)), 47e-6, 1e-15);
});

test("XL: 10 mH 는 50 Hz 에서 3.1416 Ω, 1 mH·10 kHz 는 62.83 Ω", () => {
  near(xl(50, 10e-3), Math.PI, 1e-12);
  near(xl(10e3, 1e-3), 62.832, 1e-3);
  near(lForXl(50, Math.PI), 10e-3, 1e-15);
});

test("LC 공진: 10 µH·100 nF → 159.15 kHz, 이 주파수에서 Xc = XL, Z0 = 10 Ω", () => {
  const f = f0(10e-6, 100e-9);
  near(f, 159154.9, 0.1);
  near(xc(f, 100e-9), xl(f, 10e-6), 1e-9);
  near(z0(10e-6, 100e-9), 10, 1e-12);
  near(f0(lForF0(1e3, 1e-6), 1e-6), 1e3, 1e-9);
  near(f0(1e-3, cForF0(50, 1e-3)), 50, 1e-9);
});

test("콘덴서 전류·무효 전력은 역률 콘덴서 계산(lib/power)과 같다: 400 V 50 Hz, 18.43 kvar", () => {
  // 역률 개선 가이드 예(55.3 kvar 를 Δ 3개로 → 하나 18.43 kvar, 400 V, 50 Hz)
  const uf = capUf(55.3 / 3, 400, 50);
  near(uf, 366.7, 0.1);
  const r = capLoad(400, 50, uf * 1e-6);
  near(r.vars / 1000, 55.3 / 3, 1e-9);
  near(r.amps, 400 / xc(50, uf * 1e-6), 1e-9);
});

test("경계값: 0·음수·빈칸(NaN)·아주 큰 수는 거절, Infinity 가 화면에 찍히지 않게", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => xc(bad, 1e-6), String(bad));
    assert.throws(() => xc(50, bad), String(bad));
    assert.throws(() => xl(50, bad), String(bad));
    assert.throws(() => f0(bad, 1e-6), String(bad));
    assert.throws(() => capLoad(bad, 50, 1e-6), String(bad));
  }
  assert.throws(() => xc(1e-300, 1e-300)); // 넘침
  assert.throws(() => xl(1e300, 1e300));
  assert.throws(() => f0(1e-300, 1e-300));
  assert.throws(() => cForF0(1e-200, 1e-200));
});
