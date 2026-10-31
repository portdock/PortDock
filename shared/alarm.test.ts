// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/alarm.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { activeKeys, ALARM_CSV_HEADER, alarmCsvLine, applyEdges, closeAll, condText, emptyRule, fmtSpan, MAX_ENTRIES, newWatch, ruleProblem, ruleSummary, sanitizeRules, stepWatch, tickWatch, unacked } from "./alarm.ts";

const rule = (o) => ({ ...emptyRule("1:100"), ...o });
const kinds = (edges) => edges.map((e) => `${e.on ? "+" : "-"}${e.kind}`);

test("하한·상한 — 걸리고 풀리고, 히스테리시스", () => {
  const r = rule({ lo: 10, hi: 90, hyst: 2 });
  const w = newWatch(0);
  assert.deepEqual(kinds(stepWatch(r, w, 1000, 50)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 2000, 9)), ["+lo"]);
  // 10 은 lo + hyst(12) 아래 — 아직 걸린 채
  assert.deepEqual(kinds(stepWatch(r, w, 3000, 11)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 4000, 12)), ["-lo"]);
  assert.deepEqual(kinds(stepWatch(r, w, 5000, 91)), ["+hi"]);
  assert.deepEqual(kinds(stepWatch(r, w, 6000, 89)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 7000, 88)), ["-hi"]);
  // 경계값 자체는 걸리지 않는다(< · >)
  assert.deepEqual(kinds(stepWatch(r, w, 8000, 10)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 9000, 90)), []);
  // 히스테리시스 0 이면 경계로 돌아오자마자 풀림
  const r0 = rule({ hi: 90 });
  const w0 = newWatch(0);
  stepWatch(r0, w0, 1, 95);
  assert.deepEqual(kinds(stepWatch(r0, w0, 2, 90)), ["-hi"]);
});

test("멈춤 — 값이 그대로 N초면 걸리고, 바뀌면 풀림", () => {
  const r = rule({ stuckSec: 5 });
  const w = newWatch(0);
  assert.deepEqual(kinds(stepWatch(r, w, 0, 7)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 4000, 7)), []);
  const on = stepWatch(r, w, 5000, 7);
  assert.deepEqual(kinds(on), ["+stuck"]);
  assert.equal(on[0].value, 7);
  assert.deepEqual(kinds(stepWatch(r, w, 6000, 7)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 7000, 8)), ["-stuck"]);
  // 실패한 읽기는 멈춤을 걸지 않는다
  assert.deepEqual(kinds(stepWatch(r, w, 20000, null)), []);
});

test("통신 끊김 — 실패한 읽기·시간 흐름으로 걸리고, 값을 받으면 풀림", () => {
  const r = rule({ lostSec: 3 });
  const w = newWatch(0);
  stepWatch(r, w, 1000, 1);
  assert.deepEqual(kinds(stepWatch(r, w, 2000, null)), []);
  const on = stepWatch(r, w, 4000, null);
  assert.deepEqual(kinds(on), ["+lost"]);
  assert.equal(on[0].value, null);
  assert.deepEqual(kinds(stepWatch(r, w, 5000, null)), []);
  assert.deepEqual(kinds(stepWatch(r, w, 6000, 1)), ["-lost"]);
  // 연결이 끊겨 결과가 아예 없을 때 — tick
  assert.deepEqual(kinds(tickWatch(r, w, 8000)), []);
  assert.deepEqual(kinds(tickWatch(r, w, 9000)), ["+lost"]);
  // 처음부터 값을 못 받으면 감시 시작부터 센다
  const w2 = newWatch(100);
  assert.deepEqual(kinds(tickWatch(r, w2, 3100)), ["+lost"]);
});

test("조건을 지우면 걸린 알람이 풀린다", () => {
  const w = newWatch(0);
  stepWatch(rule({ hi: 5 }), w, 1, 10);
  assert.deepEqual(w.active, ["hi"]);
  assert.deepEqual(kinds(stepWatch(rule({ lo: 0 }), w, 2, 10)), ["-hi"]);
  assert.deepEqual(w.active, []);
});

test("목록 — 걸림은 앞에 새 줄, 풀림은 열린 줄에 끝 시각, 확인·멈춤·넘침", () => {
  let id = 0;
  const nid = () => ++id;
  let r = applyEdges([], [{ key: "a", kind: "hi", on: true, ts: 10, value: 99 }], nid);
  assert.equal(r.raised.length, 1);
  assert.equal(r.list[0].end, null);
  assert.ok(unacked(r.list));
  assert.deepEqual([...activeKeys(r.list)], ["a"]);
  r = applyEdges(r.list, [{ key: "a", kind: "hi", on: false, ts: 70, value: 50 }], nid);
  assert.equal(r.list[0].end, 70);
  assert.equal(r.cleared.length, 1);
  assert.equal(activeKeys(r.list).size, 0);
  // 같은 열쇠가 다시 걸리면 새 줄
  r = applyEdges(r.list, [{ key: "a", kind: "hi", on: true, ts: 80, value: 98 }], nid);
  assert.equal(r.list.length, 2);
  const c = closeAll(r.list, 100);
  assert.equal(c.closed.length, 1);
  assert.ok(c.list.every((x) => x.end != null));
  // 넘치면 끝난 것부터 버리고, 열린 것은 남긴다
  let big = [{ id: nid(), key: "open", kind: "lost", start: 0, end: null, value: null, acked: false }];
  for (let i = 0; i < MAX_ENTRIES + 5; i++) big.push({ id: nid(), key: "k" + i, kind: "lo", start: i, end: i + 1, value: 1, acked: true });
  const t = applyEdges(big, [{ key: "b", kind: "lo", on: true, ts: 1, value: 0 }], nid);
  assert.equal(t.list.length, MAX_ENTRIES);
  assert.ok(t.list.some((x) => x.key === "open"));
});

test("조건 확인·저장값 고치기·글", () => {
  assert.equal(ruleProblem(rule({ lo: 5, hi: 5 })), "loHi");
  assert.equal(ruleProblem(rule({ stuckSec: 0 })), "secs");
  assert.equal(ruleProblem(rule({ hyst: -1 })), "hyst");
  assert.equal(ruleProblem(rule({ lo: 1, hi: 9, stuckSec: 30, lostSec: 5, hyst: 0.5 })), null);
  const s = sanitizeRules([
    { key: "1:1", lo: 1, hi: 9, stuckSec: 30.4, lostSec: 99999, hyst: -3 },
    { key: "1:1", hi: 3 },
    { key: "1:2" },
    { key: "", hi: 3 },
    { key: "1:3", lo: 9, hi: 1 },
    null,
    "x",
  ]);
  assert.deepEqual(s, [
    { key: "1:1", lo: 1, hi: 9, stuckSec: 30, lostSec: null, hyst: 0 },
    { key: "1:3", lo: 9, hi: null, stuckSec: null, lostSec: null, hyst: 0 },
  ]);
  assert.deepEqual(sanitizeRules("bad"), []);
  const r = rule({ lo: 1, hi: 9, stuckSec: 30, hyst: 0.5 });
  assert.equal(ruleSummary(r), "< 1 (±0.5) · > 9 (±0.5) · stuck 30 s");
  assert.equal(condText(rule({ lostSec: 5 }), "lost"), "lost 5 s");
  assert.equal(fmtSpan(12_400), "12 s");
  assert.equal(fmtSpan(185_000), "3:05");
  assert.equal(fmtSpan(3_723_000), "1:02:03");
});

test("CSV — 머리·걸림·풀림(지속 초)·쉼표 든 이름", () => {
  assert.equal(ALARM_CSV_HEADER, "time,event,name,condition,value,duration_s\r\n");
  const e = { id: 1, key: "1:100", kind: "hi", start: Date.UTC(2026, 9, 31, 1, 2, 3), end: null, value: 95.5, acked: false };
  const r = rule({ hi: 90 });
  const on = alarmCsvLine("raise", e, "표 1, 40101 온도", r, e.start);
  assert.match(on, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3},raise,"표 1, 40101 온도",> 90,95.5,\r\n$/);
  const off = alarmCsvLine("clear", e, "T", r, e.start + 12_345);
  assert.match(off, /,clear,T,> 90,95.5,12.3\r\n$/);
  const lost = alarmCsvLine("raise", { ...e, kind: "lost", value: null }, "T", rule({ lostSec: 5 }), e.start);
  assert.match(lost, /,raise,T,lost 5 s,,\r\n$/);
});
