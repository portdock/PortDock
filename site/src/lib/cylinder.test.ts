// 공압 실린더 이론 출력 — SMC Best Pneumatics 기술 자료(Data 1·3, 선정 예제), CLQ 카탈로그
import { test } from "node:test";
import assert from "node:assert/strict";
import { force, pickBore, pistonArea, requiredArea, rodSideArea, smcTable, toKgf } from "./cylinder.ts";
import { G0 } from "./units.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("SMC Data 3 표 재현 — 면적(3자리) × 압력(3자리)", () => {
  // [보어, 로드, 압력 MPa, 미는 쪽 N, 당기는 쪽 N] — 표에서 옮김
  const rows: [number, number, number, number, number][] = [
    [6, 3, 0.2, 5.66, 4.24],
    [6, 3, 0.5, 14.2, 10.6],
    [10, 4, 0.3, 23.6, 19.8],
    [10, 4, 0.5, 39.3, 33.0],
    [16, 5, 0.4, 80.4, 72.4],
    [20, 8, 0.4, 126, 106],
    [25, 10, 0.3, 147, 124],
    [32, 12, 0.5, 402, 346],
    [40, 14, 0.3, 378, 330],
    [40, 16, 0.4, 504, 424],
    [50, 20, 0.5, 980, 825],
    [63, 20, 0.4, 1250, 1120],
    [80, 25, 0.3, 1510, 1360],
    [100, 30, 0.5, 3930, 3580],
    [125, 32, 0.3, 3690, 3450],
    [160, 38, 0.5, 10100, 9500],
    [300, 70, 0.7, 49500, 46800],
  ];
  for (const [d, r, p, o, i] of rows) {
    const t = smcTable(d, r, p);
    assert.equal(t.out, o, `ø${d} ${p} MPa 미는 쪽`);
    assert.equal(t.in, i, `ø${d} ${p} MPa 당기는 쪽`);
  }
  // 면적 칸
  assert.deepEqual([smcTable(32, 12, 1).aOut, smcTable(32, 12, 1).aIn], [804, 691]);
  assert.deepEqual([smcTable(100, 30, 1).aOut, smcTable(100, 30, 1).aIn], [7850, 7150]);
});

test("SMC CLQ 카탈로그 — 반올림 없는 면적 × 압력을 정수로", () => {
  // ø20(로드 10): 당김 71·118·165, 밂 94·157·220 / ø32(로드 16): 181·302·422, 241·402·563
  const r = (x: number) => Math.round(x);
  assert.deepEqual([0.3, 0.5, 0.7].map((p) => r(force(rodSideArea(20, 10), p))), [71, 118, 165]);
  assert.deepEqual([0.3, 0.5, 0.7].map((p) => r(force(pistonArea(20), p))), [94, 157, 220]);
  assert.deepEqual([0.3, 0.5, 0.7].map((p) => r(force(rodSideArea(32, 16), p))), [181, 302, 422]);
  assert.deepEqual([0.3, 0.5, 0.7].map((p) => r(force(pistonArea(32), p))), [241, 402, 563]);
});

test("SMC 선정 예제 1·2·3 → ø63·ø40·ø80", () => {
  // 1: 정적으로 1000 N 누름, 부하율 0.7, 0.5 MPa, 미는 쪽
  assert.equal(pickBore(1000, 0.5, 0.7, "out")?.bore, 63);
  near(requiredArea(1000, 0.5, 0.7), 2857.14, 0.01);
  // 2: 가이드 위 30 kg 수평 이동, 부하율 1, 0.4 MPa, 힘이 작은 당기는 쪽
  assert.equal(pickBore(30 * G0, 0.4, 1, "in")?.bore, 40);
  // 3: 100 kg 수직으로 끌어올림, 부하율 0.5, 0.5 MPa, 당기는 쪽
  assert.equal(pickBore(100 * G0, 0.5, 0.5, "in")?.bore, 80);
  // 표의 가장 큰 보어로도 모자라면 null
  assert.equal(pickBore(1e6, 0.5, 0.5, "out"), null);
});

test("kgf 환산 — 1 kgf = 9.806 65 N", () => {
  near(toKgf(980.665), 100, 1e-9);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·로드 ≥ 보어·부하율 > 1·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => pistonArea(bad), String(bad));
    assert.throws(() => force(100, bad), String(bad));
    assert.throws(() => force(bad, 0.5), String(bad));
    assert.throws(() => requiredArea(bad, 0.5, 0.5), String(bad));
    assert.throws(() => requiredArea(100, bad, 0.5), String(bad));
    assert.throws(() => pickBore(100, 0.5, bad, "out"), String(bad));
  }
  assert.throws(() => rodSideArea(32, 32));
  assert.throws(() => rodSideArea(32, -1));
  assert.throws(() => rodSideArea(32, NaN));
  assert.throws(() => force(100, 0.5, 1.2));
  assert.throws(() => pistonArea(1e300));
  assert.throws(() => requiredArea(1e308, 1e-308, 0.5)); // 넘침
});
