// RC 시정수·1차 저역 필터 — 정의식
import { test } from "node:test";
import assert from "node:assert/strict";
import { cFor, charge, discharge, fAtGain, fc, gain, gainDb, phaseDeg, rFor, riseTime, tau, timeTo } from "./rc.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("10 kΩ × 100 nF → τ 1 ms, fc ≈ 159.15 Hz", () => {
  near(tau(10e3, 100e-9), 1e-3, 1e-15);
  near(fc(10e3, 100e-9), 159.1549, 1e-4);
  assert.throws(() => tau(0, 1e-6));
});

test("충전: 1τ 63.2 %, 3τ 95.0 %, 5τ 99.3 %, 방전은 그 나머지", () => {
  near(charge(1, 1), 0.632121, 1e-6);
  near(charge(3, 1), 0.950213, 1e-6);
  near(charge(5, 1), 0.993262, 1e-6);
  near(discharge(1, 1) + charge(1, 1), 1, 1e-15);
});

test("걸리는 시간: 63.2 % 는 1τ, 99 % 는 4.6τ, 10→90 % 상승 2.197τ", () => {
  near(timeTo(1 - Math.exp(-1), 2e-3), 2e-3, 1e-15);
  near(timeTo(0.99, 1), 4.60517, 1e-5);
  near(riseTime(1), 2.197225, 1e-6);
  assert.throws(() => timeTo(1, 1));
});

test("차단 주파수에서 −3.01 dB, 위상 −45°, 10배 주파수에서 약 −20 dB", () => {
  near(gainDb(100, 100), -3.0103, 1e-4);
  near(gain(100, 100), Math.SQRT1_2, 1e-15);
  near(phaseDeg(100, 100), -45, 1e-12);
  near(gainDb(1000, 100), -20.043, 1e-3);
  near(fAtGain(0.1, 100), 100 * Math.sqrt(99), 1e-9);
});

test("R·C 풀기는 fc 식의 거꾸로", () => {
  near(fc(10e3, cFor(50, 10e3)), 50, 1e-9);
  near(fc(rFor(1000, 1e-6), 1e-6), 1000, 1e-9);
});
