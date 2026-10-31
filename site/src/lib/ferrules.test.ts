import { test } from "node:test";
import assert from "node:assert/strict";
import { COLOR_HEX, COLOR_NAME, FERRULES, awgLabel, awgToMm2, ferruleByAwg, ferruleByMm2, lugClassesFor, ringName, sizesByColor } from "./ferrules.ts";

test("DIN 46228-4 색 — 0.5 흰·0.75 회·1 빨·1.5 검·2.5 파 … 50 파 (Wikipedia·Würth)", () => {
  const din = FERRULES.map((r) => `${r.mm2}:${r.din}`).join(" ");
  assert.equal(din, "0.5:white 0.75:grey 1:red 1.5:black 2.5:blue 4:grey 6:yellow 10:red 16:blue 25:yellow 35:red 50:blue");
});

test("프랑스 색 — 0.75 파랑·2.5 회색·4 주황·6 초록·10 갈색·16 상아 (Wikipedia·Schneider)", () => {
  const fr = FERRULES.map((r) => `${r.mm2}:${r.fr}`).join(" ");
  assert.equal(fr, "0.5:white 0.75:blue 1:red 1.5:black 2.5:grey 4:orange 6:green 10:brown 16:ivory 25:black 35:red 50:blue");
});

test("같은 색이 다른 굵기 — DIN 회색 0.75·4, 프랑스 파랑 0.75·50", () => {
  assert.deepEqual(sizesByColor("din", "grey"), [0.75, 4]);
  assert.deepEqual(sizesByColor("fr", "blue"), [0.75, 50]);
  assert.deepEqual(sizesByColor("din", "orange"), []);
});

test("단면적·AWG 로 찾기", () => {
  assert.equal(ferruleByMm2(2.5)?.din, "blue");
  assert.equal(ferruleByMm2(2), null);
  assert.equal(ferruleByAwg(18)?.mm2, 0.75);
  assert.equal(ferruleByAwg(0)?.mm2, 50);
  assert.equal(ferruleByAwg(15), null);
});

test("AWG 면적 — Weidmüller 표의 metric 값(0.205 … 53.5)과 같다", () => {
  const table: [number, number][] = [
    [24, 0.205],
    [22, 0.324],
    [20, 0.519],
    [18, 0.82],
    [17, 1.038],
    [16, 1.3],
    [14, 2.1],
    [12, 3.3],
    [10, 5.3],
    [8, 8.4],
    [6, 13.3],
    [4, 21.2],
    [2, 33.6],
    [0, 53.5],
  ];
  for (const [n, a] of table) assert.ok(Math.abs(awgToMm2(n) - a) / a < 0.012, `AWG ${n}: ${awgToMm2(n)} ≠ ${a}`);
  assert.equal(awgLabel(0), "1/0");
  assert.equal(awgLabel(-1), "2/0");
  assert.equal(awgLabel(12), "12");
});

test("링 단자 등급 — 1.25(0.25~1.65)·2(1.04~2.63)·5.5(2.6~6.6), 겹치면 둘 다", () => {
  assert.deepEqual(lugClassesFor(0.75).map((c) => c.cls), ["1.25"]);
  assert.deepEqual(lugClassesFor(1.5).map((c) => c.cls), ["1.25", "2"]);
  assert.deepEqual(lugClassesFor(2.5).map((c) => c.cls), ["2"]);
  assert.deepEqual(lugClassesFor(4).map((c) => c.cls), ["5.5"]);
  assert.deepEqual(lugClassesFor(10), []);
  assert.equal(ringName("1.25", 4), "R1.25-4");
});

test("색 이름·견본이 모두 있다", () => {
  for (const r of FERRULES) for (const c of [r.din, r.fr]) assert.ok(COLOR_NAME[c] && COLOR_HEX[c]);
});
