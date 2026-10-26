// @ts-nocheck — 실행: node --test shared/zoomRule.test.ts (Ctrl+휠·Ctrl+=/-/0 글자 크기)
import assert from "node:assert/strict";
import test from "node:test";
import { nextFontSize, zoomKey } from "./zoomRule.ts";
import { LIMITS } from "./settingsData.ts";

const k = (key, ctrl = true, alt = false) => ({ key, ctrlKey: ctrl, altKey: alt });

test("키", () => {
  assert.equal(zoomKey(k("=")), "in");
  assert.equal(zoomKey(k("+")), "in");
  assert.equal(zoomKey(k("-")), "out");
  assert.equal(zoomKey(k("0")), "reset");
  assert.equal(zoomKey(k("=", false)), null);
  assert.equal(zoomKey(k("=", true, true)), null);
  assert.equal(zoomKey(k("l")), null);
});

test("크기 — 설정 칸 범위 안, 처음대로는 13", () => {
  assert.equal(nextFontSize(13, "in"), 14);
  assert.equal(nextFontSize(13, "out"), 12);
  assert.equal(nextFontSize(LIMITS.fontSize[1], "in"), LIMITS.fontSize[1]);
  assert.equal(nextFontSize(LIMITS.fontSize[0], "out"), LIMITS.fontSize[0]);
  assert.equal(nextFontSize(17, "reset"), 13);
});
