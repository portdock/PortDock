import { test } from "node:test";
import assert from "node:assert/strict";
import { ROWS, circuitFor, judge, parseMohm, verdictText } from "./insulation.ts";

test("기준 표 — 제52조·IEC 60364-6 표 6.1: 250 V·0.5 / 500 V·1.0 / 1000 V·1.0", () => {
  assert.deepEqual(
    ROWS.map((r) => [r.id, r.testV, r.minMohm]),
    [
      ["selv", 250, 0.5],
      ["le500", 500, 1.0],
      ["gt500", 1000, 1.0],
    ],
  );
});

test("회로 고르기 — 공칭 전압·SELV/PELV", () => {
  assert.equal(circuitFor(24, true), "selv");
  assert.equal(circuitFor(24, false), "le500");
  assert.equal(circuitFor(380, false), "le500");
  assert.equal(circuitFor(500, false), "le500");
  assert.equal(circuitFor(690, false), "gt500");
  assert.equal(circuitFor(230, true), null);
  // 특별저압 한계: 교류 50 V, 직류 120 V
  assert.equal(circuitFor(100, true), null);
  assert.equal(circuitFor(100, true, true), "selv");
  assert.equal(circuitFor(48, true), "selv");
  assert.equal(circuitFor(1500, false), null);
});

test("판정 — 최소값 경계·시험 전압 다름", () => {
  assert.equal(judge("le500", 500, 1.0).level, "ok");
  assert.equal(judge("le500", 500, 0.99).level, "fault");
  assert.equal(judge("selv", 250, 0.5).level, "ok");
  assert.equal(judge("selv", 250, 0.4).level, "fault");
  assert.equal(judge("gt500", 1000, 200).level, "ok");
  // 시험 전압이 낮거나 높으면 볼 것
  assert.equal(judge("le500", 250, 50).level, "warn");
  assert.equal(judge("selv", 500, 50).level, "warn");
  // 최소값 미달은 시험 전압과 무관하게 문제 있음
  assert.equal(judge("le500", 250, 0.2).level, "fault");
  assert.equal(judge("le500", 500, Infinity).level, "ok");
  assert.equal(judge("le500", 500, NaN).level, "warn");
});

test("측정값 읽기 — >2000·OL·kΩ·GΩ·쉼표", () => {
  assert.equal(parseMohm(">2000"), 2000);
  assert.equal(parseMohm("OL"), Infinity);
  assert.equal(parseMohm("550k"), 0.55);
  assert.equal(parseMohm("1.2GΩ"), 1200);
  assert.equal(parseMohm("0,8"), 0.8);
  assert.equal(parseMohm("12 MΩ"), 12);
  assert.ok(Number.isNaN(parseMohm("abc")));
  assert.ok(Number.isNaN(parseMohm("")));
});

test("복사 글", () => {
  const v = judge("le500", 500, 0.3);
  const s = verdictText("le500", 500, 0.3, v, "ko");
  assert.match(s, /문제 있음/);
  assert.match(s, /DC 500 V, 0\.3 MΩ/);
  assert.match(verdictText("selv", 250, Infinity, judge("selv", 250, Infinity), "en"), /∞ MΩ/);
});
