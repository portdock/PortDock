// 컨베이어 속도 — 둘레 π·D(정의), 동기 속도 120f/p(ABB Motor guide §9.3)
import { test } from "node:test";
import assert from "node:assert/strict";
import { hzForSpeed, lineSpeed, perHz, rollerRpm, speedFromHz } from "./conveyor.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const D = { poles: 4, slipRpm: 0, ratio: 30, diaMm: 100 };

test("지름 100 mm 롤러 60 r/min → π × 0.1 × 60 = 18.85 m/min, 거꾸로도", () => {
  near(lineSpeed(60, 100), 6 * Math.PI, 1e-12);
  near(rollerRpm(6 * Math.PI, 100), 60, 1e-9);
});

test("60 Hz·4극(1800 r/min)·감속 1/30·100 mm → 롤러 60 r/min, 18.85 m/min", () => {
  const o = speedFromHz(60, D);
  near(o.motorRpm, 1800, 1e-9);
  near(o.rollerRpm, 60, 1e-9);
  near(o.m, 6 * Math.PI, 1e-9);
});

test("슬립 50 r/min(1750 r/min 명판): 60 Hz 에서 18.33 m/min, 동기 기준은 18.85", () => {
  const o = speedFromHz(60, { ...D, slipRpm: 50 });
  near(o.m, (Math.PI * 0.1 * 1750) / 30, 1e-9);
  near(o.mSync, 6 * Math.PI, 1e-9);
});

test("15 m/min 에 필요한 Hz: 슬립 없으면 47.75 Hz, 1 Hz 당 0.314 m/min", () => {
  near(hzForSpeed(15, D), (15 / (Math.PI * 0.1)) * 30 * 4 / 120, 1e-9);
  near(perHz(D), (Math.PI * 0.1 * 30) / 30, 1e-9);
});

test("슬립이 있으면 같은 속도에 Hz 가 더 필요 — 슬립 50 r/min 이면 +1.667 Hz", () => {
  near(hzForSpeed(15, { ...D, slipRpm: 50 }) - hzForSpeed(15, D), (50 * 4) / 120, 1e-9);
});

test("지름 0·음수 속도는 RangeError", () => {
  assert.throws(() => lineSpeed(60, 0), RangeError);
  assert.throws(() => rollerRpm(-1, 100), RangeError);
});
