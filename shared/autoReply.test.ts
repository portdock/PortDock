// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/autoReply.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { blankRule, faultSummary, normalizeRule, ruleToWire, validRule } from "./autoReply.ts";

test("백엔드 모양 — 빈 장애 칸은 기본값, 화면 전용 sample 은 빠지고 사용자 정의 CRC 는 없음으로", () => {
  const r = { ...blankRule(1), pattern: "01", sample: "01", reply: { text: "02", mode: "hex", checksum: "crc", suffix: "" } };
  const w = ruleToWire(r);
  assert.equal(w.sample, undefined);
  assert.equal(w.reply.checksum, null);
  assert.deepEqual([w.delayMaxMs, w.dropEvery, w.dropPct, w.replyOrder, w.moreReplies.length], [0, 0, 0, "sequence", 0]);
  const m = ruleToWire({ ...r, moreReplies: [{ text: "03", mode: "hex", checksum: "bcc" }], replyOrder: "random", dropPct: 12.5 });
  assert.deepEqual(m.moreReplies, [{ text: "03", mode: "hex", checksum: "bcc", suffix: "" }]);
  assert.equal(m.replyOrder, "random");
});

test("저장된 규칙 읽기 — 예전 모양도 받고, 틀린 모양은 거른다", () => {
  const old = { name: "a", enabled: true, pattern: "01", patternMode: "hex", kind: "exact", reply: { text: "02", mode: "hex" }, delayMs: 0 };
  assert.ok(validRule(old));
  const n = normalizeRule(old);
  assert.equal(n.reply.checksum, null);
  assert.equal(n.reply.suffix, "");
  assert.ok(!validRule({ ...old, delayMs: -1 }));
  assert.ok(!validRule({ ...old, moreReplies: [{ text: 1 }] }));
  assert.ok(!validRule(null));
  assert.ok(validRule({ ...old, moreReplies: [{ text: "03", mode: "ascii" }] }));
});

test("카드 표시 요약 — 지연 범위는 끝이 클 때만", () => {
  const r = { ...blankRule(1), delayMs: 10, delayMaxMs: 50, dropEvery: 3, dropPct: 5, moreReplies: [{}, {}], replyOrder: "random" };
  assert.deepEqual(faultSummary(r), { delay: [10, 50], every: 3, pct: 5, replies: 3, random: true });
  assert.equal(faultSummary({ ...r, delayMaxMs: 10 }).delay, null);
  assert.deepEqual(faultSummary(blankRule(2)), { delay: null, every: 0, pct: 0, replies: 1, random: false });
});
