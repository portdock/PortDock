// 상사 법칙 — DOE «Improving Fan System Performance»(DOE/GO-102003-1294) p.4·p.18
import { test } from "node:test";
import assert from "node:assert/strict";
import { at, ratioForFlow, ratioFromHz, ratios, yearly } from "./affinity.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("DOE p.18: 회전수 20 % 줄이면 동력 약 50 % 감소 — 0.8³ = 0.512(48.8 % 감소)", () => {
  const k = ratios(0.8);
  near(k.flow, 0.8, 1e-12);
  near(k.pressure, 0.64, 1e-12);
  near(k.power, 0.512, 1e-12);
  near(1 - k.power, 0.5, 0.015); // DOE 의 «50 percent» 는 어림
});

test("절반 회전수 → 유량 1/2, 압력 1/4, 동력 1/8", () => {
  const o = at({ flow: 100, pressure: 40, power: 16 }, 0.5);
  near(o.flow, 50, 1e-12);
  near(o.pressure, 10, 1e-12);
  near(o.power, 2, 1e-12);
});

test("60 Hz → 45 Hz 는 회전수비 0.75(슬립 무시), 동력 42.2 %", () => {
  const r = ratioFromHz(60, 45);
  near(r, 0.75, 1e-12);
  near(ratios(r).power, 0.421875, 1e-12);
});

test("유량 120 → 90 m³/h 에 필요한 회전수비 0.75", () => {
  near(ratioForFlow(120, 90), 0.75, 1e-12);
});

test("한 해 전력량: 22 kW, 80 %, 4000 h → 88000 → 45056 kWh, 42944 kWh(48.8 %) 절감", () => {
  const y = yearly(22, 0.8, 4000);
  near(y.kwh1, 88000, 1e-9);
  near(y.kwh2, 45056, 1e-9);
  near(y.saved, 42944, 1e-9);
  near(y.savedPct, 48.8, 1e-9);
});

test("0·음수는 RangeError", () => {
  assert.throws(() => ratios(0), RangeError);
  assert.throws(() => ratioFromHz(60, -1), RangeError);
  assert.throws(() => yearly(0, 0.8, 1000), RangeError);
});
