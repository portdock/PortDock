// 변류기(CT) 비·부담 — ABB Instrument Transformers Application Guide(1VAP420003-TG) 예·표와 정의식
import { test } from "node:test";
import assert from "node:assert/strict";
import { burden, leadOhm, loadPct, ohmForRating, ratio, ratioError, rcf, toPrimary, toSecondary, va, vaToOhm } from "./ct.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("CT 비: 200/5 = 40, 1차 150 A → 2차 3.75 A, 2차 4 A → 1차 160 A", () => {
  near(ratio(200, 5), 40, 0);
  near(toSecondary(150, 200, 5), 3.75, 1e-12);
  near(toPrimary(4, 200, 5), 160, 1e-12);
  // ABB p.6 다중 비 예: 600:5 의 탭 200:5 에서 1차 200 A → 2차 5 A
  near(toSecondary(200, 200, 5), 5, 0);
  near(toSecondary(600, 600, 5), 5, 0);
  near(toSecondary(100, 100, 1), 1, 0);
});

test("ABB p.10: 실제 비 20.2 : 1, 표시 비 20 : 1 → RCF 1.01, 비 오차 1 %", () => {
  near(rcf(20.2, 20), 1.01, 1e-12);
  const e = ratioError(202, 10, 20, 1);
  near(e.rcf, 1.01, 1e-12);
  near(e.pct, 1, 1e-9);
});

test("ABB p.13 표준 부담(5 A): B-0.1 0.1 Ω 2.5 VA, B-0.2 5.0, B-0.5 12.5, B-0.9 22.5, B-1.8 45 VA", () => {
  for (const [ohm, vaAt5] of [[0.1, 2.5], [0.2, 5], [0.5, 12.5], [0.9, 22.5], [1.8, 45]]) {
    near(va(5, ohm), vaAt5, 1e-12);
    near(vaToOhm(vaAt5, 5), ohm, 1e-12);
    // 각주: 1 A CT 는 옴 값 × (5/1)² — 정격 전류에서 VA 는 같다
    near(va(1, ohmForRating(ohm, 1)), vaAt5, 1e-9);
  }
});

test("선 저항: 구리 2.5 mm² 편도 10 m(20 °C) → 왕복 0.1379 Ω, 5 A 에서 3.45 VA, 1 A 에서 0.138 VA", () => {
  const r = leadOhm(10, 2.5);
  near(r, 20 / 58 / 2.5, 1e-12);
  near(va(5, r), 3.448, 1e-3);
  near(va(1, r), 0.1379, 1e-4);
});

test("전체 부담: 선 + 계기(VA → Ω) + 그 밖, 정격 부담 대비 %", () => {
  const b = burden(5, 10, 2.5, 1, 0.02, 5);
  near(b.meterOhm, 0.04, 1e-12);
  near(b.totalOhm, 20 / 58 / 2.5 + 0.04 + 0.02, 1e-12);
  near(b.totalVa, 25 * b.totalOhm, 1e-9);
  near(b.leadVa + b.meterVa + 25 * 0.02, b.totalVa, 1e-9);
  near(b.pctOfRated!, (b.totalVa / 5) * 100, 1e-9);
  near(b.volts, 5 * b.totalOhm, 1e-12);
  assert.equal(burden(1, 0, 1.5, 0).totalVa, 0);
});

test("경계값: 0·음수·빈칸(NaN)·아주 큰 수는 거절, Infinity 가 화면에 찍히지 않게", () => {
  for (const bad of [0, -5, NaN, Infinity]) {
    assert.throws(() => ratio(bad, 5), String(bad));
    assert.throws(() => ratio(200, bad), String(bad));
    assert.throws(() => burden(bad, 10, 2.5, 1), String(bad));
    assert.throws(() => leadOhm(10, bad), String(bad));
  }
  assert.throws(() => toSecondary(-1, 200, 5));
  assert.throws(() => toSecondary(NaN, 200, 5));
  assert.throws(() => toPrimary(Infinity, 200, 5));
  assert.throws(() => toPrimary(1e300, 1e300, 1e-300)); // 넘침
  assert.throws(() => leadOhm(-1, 2.5));
  assert.throws(() => burden(5, 10, 2.5, -1));
  assert.throws(() => burden(5, 10, 2.5, 1, NaN));
  assert.throws(() => burden(5, 10, 2.5, 1, 0, 0));
  assert.throws(() => ratioError(0, 5, 200, 5));
  near(toSecondary(0, 200, 5), 0, 0);
});

test("가이드·그림 예: 200/5, 2.5 mm², 계기 1 VA, 정격 5 VA — 편도 10 m 4.45 VA(89 %), 30 m 11.34 VA(227 %), 1 A CT 30 m 1.41 VA(28 %)", () => {
  const a = burden(5, 10, 2.5, 1, 0, 5);
  near(a.totalOhm, 0.1779, 1e-4);
  near(a.totalVa, 4.448, 1e-3);
  near(a.pctOfRated!, 88.97, 1e-2);
  const b = burden(5, 30, 2.5, 1, 0, 5);
  near(b.totalVa, 11.345, 1e-3);
  near(b.pctOfRated!, 226.9, 0.1);
  const c = burden(1, 30, 2.5, 1, 0, 5);
  near(c.totalVa, 1.414, 1e-3);
  near(c.pctOfRated!, 28.28, 1e-2);
});

test("정격 1차 대비 %: 200/5 에 150 A → 75 %, 넘치면(1e307 A ÷ 1 A) RangeError(«Infinity %» 막음)", () => {
  near(loadPct(150, 200), 75, 1e-12);
  near(loadPct(0, 200), 0, 0);
  assert.throws(() => loadPct(1e307, 1), RangeError);
  for (const [ip, ipn] of [[-1, 200], [NaN, 200], [150, 0], [150, NaN], [Infinity, 200]]) assert.throws(() => loadPct(ip, ipn), RangeError, `${ip}/${ipn}`);
});
