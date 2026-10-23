// 엔코더 — rpm × PPR ÷ 60 정의와 체배
import { test } from "node:test";
import assert from "node:assert/strict";
import { absPositions, countRate, degPerCount, distPerCount, maxRpm, pulseHz, rpmFromCounts, rpmFromHz } from "./encoder.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("1000 PPR, 1800 rpm → A 상 30 kHz, 4체배 120 000 카운트/s", () => {
  near(pulseHz(1800, 1000), 30000);
  near(countRate(1800, 1000, 4), 120000);
  near(rpmFromHz(30000, 1000), 1800);
});

test("100 ms 동안 2000 카운트, 500 PPR 4체배 → 600 rpm", () => {
  near(rpmFromCounts(2000, 500, 4, 0.1), 600);
  near(rpmFromCounts(0, 500, 4, 0.1), 0);
});

test("최대 응답 주파수: 100 kHz 입력에 1024 PPR → 약 5859 rpm", () => {
  near(maxRpm(100000, 1024), 5859.375);
});

test("분해능: 1000 PPR 4체배 → 0.09°, 리드 10 mm → 0.0025 mm", () => {
  near(degPerCount(1000, 4), 0.09);
  near(distPerCount(10, 1000, 4), 0.0025);
  assert.equal(absPositions(17), 131072);
  assert.throws(() => pulseHz(100, 0));
});
