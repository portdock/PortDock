// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/autoReply.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { blankRule, exampleRule, faultSummary, normalizeRule, ruleFromRequest, ruleToWire, validRule, wildChars } from "./autoReply.ts";
import { duplicatePatterns, matchesEverything, shadowedRules } from "./interlocks.ts";

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

test("ASCII 와일드카드 — 새 규칙은 끔, 예전 규칙(칸 없음)은 켜짐으로 읽고 백엔드에도 그대로", () => {
  assert.equal(blankRule(1).wild, false);
  assert.equal(ruleToWire(blankRule(1)).wild, false);
  const old = { name: "a", enabled: true, pattern: "*IDN?", patternMode: "ascii", kind: "exact", reply: { text: "X", mode: "ascii" }, delayMs: 0 };
  assert.equal(normalizeRule(old).wild, true);
  assert.equal(ruleToWire(old).wild, true);
  assert.ok(validRule({ ...old, wild: false }));
  assert.ok(!validRule({ ...old, wild: "no" }));
  // 알림줄: ASCII·와일드카드 켜짐·?·* 가 있을 때만
  assert.ok(wildChars(old));
  assert.ok(!wildChars({ ...old, wild: false }));
  assert.ok(!wildChars({ ...old, pattern: "IDN" }));
  assert.ok(!wildChars({ ...old, patternMode: "hex", pattern: "01 ??" }));
});

test("새 규칙은 직전 규칙의 방식을 물려받는다(와일드카드는 늘 끔)", () => {
  const prev = { ...blankRule(1), patternMode: "ascii", kind: "contains", wild: true, pattern: "X", reply: { text: "Y", mode: "ascii", checksum: "bcc", suffix: "\\r\\n" }, dropPct: 5 };
  const n = blankRule(2, prev);
  assert.deepEqual([n.name, n.patternMode, n.kind, n.wild, n.pattern], ["rule 2", "ascii", "contains", false, ""]);
  assert.deepEqual(n.reply, { text: "", mode: "ascii", checksum: "bcc", suffix: "\\r\\n" });
  assert.equal(n.dropPct, undefined);
  assert.deepEqual([blankRule(1).patternMode, blankRule(1).reply.mode], ["hex", "hex"]);
});

test("빈 화면 예제 규칙", () => {
  const m = exampleRule("modbus");
  assert.deepEqual([m.patternMode, m.pattern, m.reply.checksum], ["hex", "01 03 ?? ?? 00 01 **", "crc16-modbus"]);
  const s = exampleRule("scpi");
  assert.deepEqual([s.patternMode, s.pattern, s.wild, s.reply.text, s.reply.suffix], ["ascii", "*IDN?", false, "PORTDOCK,SIM,1", "\\r\\n"]);
  assert.ok(!wildChars(s));
  const e = exampleRule("echo");
  assert.deepEqual([e.pattern, e.reply.text], ["**", "{req}"]);
  assert.ok(matchesEverything(e));
  for (const k of ["modbus", "scpi", "echo"]) assert.ok(validRule(exampleRule(k)));
});

test("받은 요청으로 규칙 만들기 — 글자·Modbus RTU·Modbus TCP·그 밖", () => {
  // 글자 + CR LF → ASCII·글자 그대로, 응답 줄 끝 CR LF
  const a = ruleFromRequest([0x2a, 0x49, 0x44, 0x4e, 0x3f, 0x0d, 0x0a], 3);
  assert.deepEqual([a.name, a.patternMode, a.pattern, a.wild, a.kind, a.reply.mode, a.reply.suffix], ["rule 3", "ascii", "*IDN?", false, "exact", "ascii", "\\r\\n"]);
  assert.equal(ruleFromRequest([0x41, 0x5c, 0x42], 1).pattern, "A\\\\B");
  // Modbus RTU 01 03 00 00 00 01 + CRC 84 0A → CRC 자리는 **
  const r = ruleFromRequest([1, 3, 0, 0, 0, 1, 0x84, 0x0a], 1);
  assert.deepEqual([r.patternMode, r.pattern, r.reply.checksum, r.sample], ["hex", "01 03 00 00 00 01 **", "crc16-modbus", "01 03 00 00 00 01 84 0A"]);
  // Modbus TCP — 트랜잭션 ID 는 ?? ??
  const t = ruleFromRequest([0, 7, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2], 1);
  assert.equal(t.pattern, "?? ?? 00 00 00 06 01 03 00 00 00 02");
  // 그 밖(CRC 틀림)
  assert.equal(ruleFromRequest([1, 3, 0, 0, 0, 1, 0, 0], 1).pattern, "01 03 00 00 00 01 00 00");
  for (const x of [a, r, t]) assert.ok(validRule(x));
});

test("인터락 — 와일드카드를 끈 ASCII 규칙의 *·? 는 무엇이든 맞는 규칙이 아니다", () => {
  const star = { name: "s", enabled: true, pattern: "*", kind: "exact", patternMode: "ascii" };
  assert.ok(matchesEverything(star));
  assert.ok(!matchesEverything({ ...star, wild: false }));
  assert.equal(shadowedRules([{ ...star, wild: false }, { ...star, name: "b" }]).by, "b");
  // 같은 글자라도 와일드카드 켬/끔이면 다른 패턴
  assert.deepEqual(duplicatePatterns([{ ...star, pattern: "*IDN?" }, { ...star, name: "b", pattern: "*IDN?", wild: false }]), []);
  assert.deepEqual(duplicatePatterns([{ ...star, pattern: "A" }, { ...star, name: "b", pattern: "A" }]), ["b"]);
});

test("카드 표시 요약 — 지연 범위는 끝이 클 때만", () => {
  const r = { ...blankRule(1), delayMs: 10, delayMaxMs: 50, dropEvery: 3, dropPct: 5, moreReplies: [{}, {}], replyOrder: "random" };
  assert.deepEqual(faultSummary(r), { delay: [10, 50], every: 3, pct: 5, replies: 3, random: true });
  assert.equal(faultSummary({ ...r, delayMaxMs: 10 }).delay, null);
  assert.deepEqual(faultSummary(blankRule(2)), { delay: null, every: 0, pct: 0, replies: 1, random: false });
});
