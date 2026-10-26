// @ts-nocheck — 실행: node --test shared/logNav.test.ts (로그 키보드 이동)
import assert from "node:assert/strict";
import test from "node:test";
import { navTarget } from "./logNav.ts";

test("↑↓·PageUp/Down·Home/End", () => {
  assert.equal(navTarget("ArrowDown", 3, 10, 5), 4);
  assert.equal(navTarget("ArrowUp", 3, 10, 5), 2);
  assert.equal(navTarget("ArrowUp", 0, 10, 5), 0);
  assert.equal(navTarget("ArrowDown", 9, 10, 5), 9);
  assert.equal(navTarget("PageDown", 3, 10, 5), 8);
  assert.equal(navTarget("PageDown", 8, 10, 5), 9);
  assert.equal(navTarget("PageUp", 3, 10, 5), 0);
  assert.equal(navTarget("Home", 5, 10, 5), 0);
  assert.equal(navTarget("End", 5, 10, 5), 9);
});

test("고른 줄이 없거나 거르기로 사라졌으면 맨 아래(최근)부터", () => {
  assert.equal(navTarget("ArrowUp", -1, 10, 5), 9);
  assert.equal(navTarget("ArrowDown", -1, 10, 5), 9);
  assert.equal(navTarget("PageUp", 20, 10, 5), 9);
  assert.equal(navTarget("Home", -1, 10, 5), 0);
  assert.equal(navTarget("ArrowDown", 0, 1, 0), 0);
  assert.equal(navTarget("End", -1, 0, 5), 0);
});
