// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/tcp/src/pairStats.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtMs, pairCell, percentile, RtBag, rtStats, statsText } from "./pairStats.ts";

test("순위 백분위 — 1..20 의 중앙 10, 95% 19", () => {
  const v = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(percentile(v, 0.5), 10);
  assert.equal(percentile(v, 0.95), 19);
  assert.equal(percentile([7], 0.95), 7);
  assert.ok(Number.isNaN(percentile([], 0.5)));
});

test("rtStats — 정렬하지 않은 값, NaN 은 빼고", () => {
  assert.deepEqual(rtStats([5, 1, 3, NaN, 2, 4]), { n: 5, min: 1, med: 3, p95: 5, max: 5 });
  assert.equal(rtStats([]), null);
  const s = rtStats(Array.from({ length: 100 }, (_, i) => 100 - i));
  assert.deepEqual(s, { n: 100, min: 1, med: 50, p95: 95, max: 100 });
});

test("fmtMs — 크기에 따라 자릿수", () => {
  assert.equal(fmtMs(3.254), "3.25");
  assert.equal(fmtMs(12.44), "12.4");
  assert.equal(fmtMs(1250.4), "1250");
});

test("RtBag — 최근 cap 개만", () => {
  const b = new RtBag(3);
  for (const x of [1, 2, 3, 4, 5]) b.add(x);
  assert.deepEqual(b.values, [3, 4, 5]);
  b.misses = 2;
  b.reset();
  assert.deepEqual([b.values, b.misses, b.errors], [[], 0, 0]);
});

test("pairCell — 요청·응답·오류·무응답", () => {
  assert.deepEqual(pairCell({ id: 12, role: "req", proto: "modbus", what: "FC03" }, "ko"), { text: "#12 FC03 →", cls: "pair req" });
  assert.deepEqual(pairCell({ id: 12, role: "req", proto: "modbus", what: "FC03" }, "en", true), { text: "#12 FC03 no reply", cls: "pair miss" });
  assert.deepEqual(pairCell({ id: 12, role: "rsp", proto: "modbus", what: "FC03", rtMs: 3.254 }, "ko"), { text: "#12 3.25 ms", cls: "pair rsp" });
  assert.deepEqual(pairCell({ id: 3, role: "rsp", proto: "mc", what: "0401", rtMs: 40, error: "C056" }, "en"), { text: "#3 40 ms C056", cls: "pair err" });
  assert.deepEqual(pairCell({ id: 4, role: "miss", proto: "mc", what: "0401", rtMs: 3000 }, "ko"), { text: "#4 무응답", cls: "pair miss" });
});

test("statsText — 한·영, 값이 없으면 머리만", () => {
  assert.equal(statsText(rtStats([1.2, 3.4, 15]), 2, 0, "ko"), "짝 3 · 무응답 2 · 응답 ms 최소 1.2 · 중앙 3.4 · 95% 15 · 최대 15");
  assert.equal(statsText(null, 1, 1, "en"), "pairs 0 · no reply 1 · error replies 1");
});
