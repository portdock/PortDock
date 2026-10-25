// 히터 용량 — Tempco Engineering Data 16-2·16-5·16-6·16-9·16-10 의 예·표를 SI 계산으로 재현
import { test } from "node:test";
import assert from "node:assert/strict";
import { btuLbFToKJ, dFtoK, flowFor, flowKw, galToL, heatKwh, heatUpHours, heatUpKw, heaterCurrent, lbPerGalToKgPerL, lbToKg, lpmToKgs, wattsAt } from "./heater.ts";

const rel = (a: number, b: number, r: number) => assert.ok(Math.abs(a - b) <= Math.abs(b) * r, `${a} ≠ ${b}`);

test("1 Btu/lb·°F = 4.1868 kJ/kg·K, 1 kWh = 3412.14 Btu", () => {
  rel(btuLbFToKJ(1), 4.1868, 1e-12);
  rel(lbToKg(1) * btuLbFToKJ(1) * dFtoK(1) * 1000, 1055.05585262, 1e-12); // 1 lb 를 1 °F 올리는 열 = 1 Btu
});

test("Tempco 16-6 예: 물 5 gal/min, 50 → 100 °F, 안전율 1.2 → 44 kW", () => {
  const rho = lbPerGalToKgPerL(8.34);
  const kw = flowKw(lpmToKgs(galToL(5), rho), btuLbFToKJ(1), dFtoK(50), 1.2);
  rel(kw, 44, 0.001);
  assert.equal(Math.round(kw), 44);
});

test("Tempco 16-6 순환 히터 표: 6 kW·20 °F → 123 gal/h, 24 kW·50 °F → 196, 60 kW·130 °F → 189 (안전율 없음)", () => {
  const rho = lbPerGalToKgPerL(8.34);
  const galPerH = (kw: number, df: number) => (flowFor(kw, btuLbFToKJ(1), dFtoK(df)) / rho) * 3600 / galToL(1);
  assert.equal(Math.round(galPerH(6, 20)), 123);
  assert.equal(Math.round(galPerH(24, 50)), 196);
  assert.equal(Math.round(galPerH(60, 130)), 189);
  assert.equal(Math.round(galPerH(9, 90)), 41);
});

test("Tempco 16-5 탱크 물 표(10 % 포함, 0.1 kW 자리): 100 gal·100 °F·1 h → 26.9 kW 등 — 표와 0.1 kW 안쪽", () => {
  const rho = lbPerGalToKgPerL(8.34);
  const kw = (gal: number, df: number, h: number) => heatUpKw(galToL(gal) * rho, btuLbFToKJ(1), dFtoK(df), h, 1.1);
  // [gal, °F, 표 kW] — 표의 몇 칸(64.6·86.1·107.6)은 계산(64.5·86.0·107.5)과 끝자리가 하나 다르다
  const rows: [number, number, number][] = [[5, 20, 0.3], [50, 60, 8.1], [100, 100, 26.9], [200, 120, 64.6], [300, 60, 48.4], [400, 80, 86.1], [400, 100, 107.6], [500, 140, 188.3]];
  for (const [g, f, t] of rows) assert.ok(Math.abs(kw(g, f, 1) - t) <= 0.1 + 1e-9, `${g} gal ${f} °F: ${kw(g, f, 1)} ≠ ${t}`);
  // 식 2: kW = gal × ΔT ÷ (372 × h)
  rel(kw(100, 100, 2), (100 * 100) / (372 * 2), 0.001);
});

test("SI: 물 200 kg 을 20 → 60 °C, 1시간 → 9.30 kWh·9.30 kW, 안전율 1.2 → 11.2 kW; 6 kW 면 1.55 h", () => {
  rel(heatKwh(200, 4.1868, 40), 9.304, 0.0001);
  rel(heatUpKw(200, 4.1868, 40, 1), 9.304, 0.0001);
  rel(heatUpKw(200, 4.1868, 40, 1, 1.2), 11.165, 0.0001);
  rel(heatUpHours(200, 4.1868, 40, 6), 1.5507, 0.0001);
});

test("Tempco 16-10 전류: 10 kW → 240 V 단상 41.7 A, 3상 24.1 A, 480 V 3상 12.0 A; 1 kW 120 V 8.3 A", () => {
  assert.equal(+heaterCurrent(10000, 240, 1).toFixed(1), 41.7);
  assert.equal(+heaterCurrent(10000, 240, 3).toFixed(1), 24.1);
  assert.equal(+heaterCurrent(10000, 480, 3).toFixed(1), 12.0);
  assert.equal(+heaterCurrent(1000, 120, 1).toFixed(1), 8.3);
  assert.equal(+heaterCurrent(2500, 480, 3).toFixed(1), 3.0);
});

test("Tempco 16-9 다른 전압: 240 V 히터에 230 V → 92 %, 220 V → 84 %, 208 V → 75 %; 480 V 히터에 440 V → 84 %", () => {
  const pct = (rv: number, av: number) => Math.round((wattsAt(1000, rv, av) / 1000) * 100);
  assert.equal(pct(240, 230), 92);
  assert.equal(pct(240, 220), 84);
  assert.equal(pct(240, 208), 75);
  assert.equal(pct(480, 440), 84);
  assert.equal(pct(120, 240), 400);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·안전율 < 1·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => heatUpKw(bad, 4.19, 10, 1), String(bad));
    assert.throws(() => heatUpKw(1, bad, 10, 1), String(bad));
    assert.throws(() => heatUpKw(1, 4.19, bad, 1), String(bad));
    assert.throws(() => heatUpKw(1, 4.19, 10, bad), String(bad));
    assert.throws(() => heatUpHours(1, 4.19, 10, bad), String(bad));
    assert.throws(() => flowKw(bad, 4.19, 10), String(bad));
    assert.throws(() => lpmToKgs(bad, 1), String(bad));
    assert.throws(() => heaterCurrent(bad, 230, 1), String(bad));
    assert.throws(() => heaterCurrent(1000, bad, 3), String(bad));
    assert.throws(() => wattsAt(1000, bad, 230), String(bad));
  }
  assert.throws(() => heatUpKw(1, 4.19, 10, 1, 0.9));
  assert.throws(() => heatUpKw(1, 4.19, 10, 1, NaN));
  assert.throws(() => heaterCurrent(1000, 230, 2 as 1));
  assert.throws(() => heatUpKw(1e308, 1e308, 10, 1)); // 넘침
  assert.throws(() => heatUpHours(1, 4.19, 10, 1e-320)); // 넘침
});
