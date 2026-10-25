// 분압·표준 저항 값 — Vishay 28372(IEC 60063 표), 분압 정의식
import { test } from "node:test";
import assert from "node:assert/strict";
import { E_BASE, bestPairs, bracketE, divOut, eValues, nearestE, solveR1, solveR2, tolRange } from "./divider.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("계열 개수: E12 12개, E24 24개, E96 96개, 오름차순", () => {
  assert.equal(E_BASE.E12.length, 12);
  assert.equal(E_BASE.E24.length, 24);
  assert.equal(E_BASE.E96.length, 96);
  for (const s of ["E12", "E24", "E96"] as const) for (let i = 1; i < E_BASE[s].length; i++) assert.ok(E_BASE[s][i] > E_BASE[s][i - 1]);
});

test("E12 는 E24 의 하나 건너 값", () => {
  assert.deepEqual(
    E_BASE.E24.filter((_, i) => i % 2 === 0),
    E_BASE.E12,
  );
});

test("E96 은 모두 10^(i/96) 를 세 자리로 반올림한 값과 같다", () => {
  E_BASE.E96.forEach((v, i) => assert.equal(v, Math.round(100 * 10 ** (i / 96))));
});

test("E24 는 계산값과 다른 곳이 있다 — 27·30·33·36·39·43·47·82 (표를 그대로 써야 함)", () => {
  const diff = E_BASE.E24.filter((v, i) => v !== Math.round(10 * 10 ** (i / 24)));
  assert.deepEqual(diff, [27, 30, 33, 36, 39, 43, 47, 82]);
});

test("값 펼치기와 가장 가까운 값", () => {
  const e12 = eValues("E12", 1000, 10000);
  assert.deepEqual(e12.slice(0, 3), [1000, 1200, 1500]);
  assert.ok(e12.includes(4700) && e12.includes(8200));
  assert.ok(eValues("E96", 1e3, 1e4).includes(4990));
  assert.equal(nearestE(4600, "E24"), 4700);
  assert.equal(nearestE(2000, "E12"), 2200);
  assert.equal(nearestE(4990, "E96"), 4990);
  assert.equal(nearestE(10.2e3, "E96"), 10.2e3);
  assert.deepEqual(bracketE(5000, "E24"), [4700, 5100]);
  assert.deepEqual(bracketE(4700, "E12"), [4700, 4700]);
});

test("분압: 24 V, 10 kΩ / 4.7 kΩ → 7.67 V, 출력 저항 3.2 kΩ, 부하가 걸리면 낮아짐", () => {
  const r = divOut(24, 10e3, 4.7e3);
  near(r.vout, 24 * 4.7 / 14.7, 1e-12);
  near(r.rout, 3197.28, 0.01);
  near(r.current, 24 / 14.7e3, 1e-12);
  assert.ok(divOut(24, 10e3, 4.7e3, 10e3).vout < r.vout);
  near(divOut(10, 10e3, 10e3, 10e3).vout, 10 * 5e3 / 15e3, 1e-12);
});

test("R 풀기: 10 V → 3.3 V, R1 = 6.8 kΩ 이면 R2 = 3.349 kΩ, 거꾸로도", () => {
  near(solveR2(10, 3.3, 6800), 3349.25, 0.01);
  near(solveR1(10, 3.3, solveR2(10, 3.3, 6800)), 6800, 1e-9);
  assert.throws(() => solveR2(5, 5, 1000));
});

test("표준 값 조합: 결과는 모두 그 계열 값이고 오차순, E96 이 E12 보다 가깝다", () => {
  const e12 = bestPairs(10, 3.3, "E12", 10e3);
  const e96 = bestPairs(10, 3.3, "E96", 10e3);
  assert.equal(e12.length, 5);
  const set12 = new Set(eValues("E12"));
  for (const p of e12) assert.ok(set12.has(p.r1) && set12.has(p.r2));
  for (let i = 1; i < e96.length; i++) assert.ok(Math.abs(e96[i].err) >= Math.abs(e96[i - 1].err));
  assert.ok(Math.abs(e96[0].err) < Math.abs(e12[0].err));
  assert.ok(Math.abs(e96[0].err) < 0.5);
  assert.deepEqual([e12[0].r1, e12[0].r2], [6800, 3300]);
  for (const p of e96) near(p.vout, (10 * p.r2) / (p.r1 + p.r2), 1e-12);
  const e24 = bestPairs(10, 3.3, "E24", 10e3);
  assert.equal(new Set(e24.map((p) => (p.r1 / p.r2).toFixed(6))).size, e24.length);
});

test("허용차: 1 % 저항 두 개면 같은 값 분압(1/2)이 약 ±1 % 흔들린다", () => {
  const [lo, hi] = tolRange(10, 10e3, 10e3, 1);
  near(lo, 4.95, 1e-9);
  near(hi, 5.05, 1e-9);
});

test("가장 가까운 값·위아래 값은 크기 제한 없이(10/23 — 옛 판은 0.1 Ω ~ 100 MΩ 밖이면 끝값)", () => {
  // RC 도구가 아주 낮은 차단 주파수에서 R 을 수백 MΩ·수 TΩ 로 풀 때
  assert.equal(nearestE(1.6e14, "E24"), 1.6e14);
  assert.equal(nearestE(4.6e11, "E12"), 4.7e11);
  assert.equal(nearestE(0.0047, "E12"), 0.0047);
  assert.equal(nearestE(3.4e-3, "E96"), 3.4e-3);
  assert.deepEqual(bracketE(5e9, "E24"), [4.7e9, 5.1e9]);
  assert.deepEqual(bracketE(0.05, "E12"), [0.047, 0.056]);
  // 경계: decade 끝(1, 10, 100 …)과 계열 마지막 값(82·91·976) 근처
  assert.equal(nearestE(9.6, "E24"), 10);
  assert.equal(nearestE(990, "E96"), 1000);
  assert.deepEqual(bracketE(95, "E24"), [91, 100]);
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => nearestE(bad, "E12"));
    assert.throws(() => bracketE(bad, "E12"));
  }
});

test("경계값: 빈칸(NaN)·아주 큰 수·음수·허용차 100 % 는 NaN·Infinity 를 내지 않고 거절", () => {
  assert.throws(() => divOut(NaN, 10e3, 10e3));
  assert.throws(() => divOut(Infinity, 10e3, 10e3));
  assert.throws(() => divOut(10, Infinity, 10e3));
  assert.throws(() => divOut(10, 10e3, 0));
  assert.throws(() => divOut(10, -1, 10e3));
  near(divOut(10, 10e3, 10e3, Infinity).vout, 5, 1e-12);
  near(divOut(-10, 10e3, 10e3).vout, -5, 1e-12);
  near(divOut(0, 10e3, 10e3).vout, 0, 0);
  assert.throws(() => solveR2(Infinity, 3, 1e3));
  assert.throws(() => solveR2(10, -1, 1e3));
  assert.throws(() => bestPairs(10, 3.3, "E12", Infinity));
  assert.throws(() => bestPairs(NaN, 3.3, "E12"));
  assert.throws(() => tolRange(10, 10e3, 10e3, 100));
  assert.throws(() => tolRange(10, 10e3, 10e3, -1));
  assert.deepEqual(tolRange(10, 10e3, 10e3, 0), [5, 5]);
  // 비가 아주 작으면 합계 범위 안 조합이 없다 — 빈 목록(화면은 따로 안내)
  assert.deepEqual(bestPairs(1000, 0.001, "E12", 10e3), []);
  for (const p of bestPairs(1e6, 5e5, "E96", 1e9)) assert.ok(Number.isFinite(p.vout));
});
