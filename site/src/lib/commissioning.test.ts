// 시운전·설치 점검표 — 구성 → 항목, 저장 글 읽기, 글·CSV 내보내기, 링크
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPONENTS, ITEMS, STAGES, buildChecklist, byStage, csvCell, emptySaved, parseSaved, toCsv, toText, type Saved } from "./commissioning.ts";

test("항목 id 는 겹치지 않고, 모든 구성 요소에 항목이 있다", () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of COMPONENTS) assert.ok(ITEMS.some((i) => i.for !== "all" && i.for.includes(c.id)), c.id);
  for (const i of ITEMS) {
    assert.ok(i.text.ko.trim() && i.text.en.trim(), i.id);
    assert.ok(STAGES.some((s) => s.id === i.stage), i.id);
  }
});

test("아무것도 안 고르면 공통 항목만, 고르면 그 항목이 더해진다", () => {
  const base = buildChecklist([]);
  assert.ok(base.length > 0);
  assert.ok(base.every((i) => i.for === "all"));
  const vfd = buildChecklist(["vfd"]);
  assert.ok(vfd.some((i) => i.id === "vfd-discharge"));
  assert.ok(!vfd.some((i) => i.id === "rs485-term"));
  // 모두 고르면 모든 항목이 한 번씩
  const all = buildChecklist(COMPONENTS.map((c) => c.id));
  assert.equal(all.length, ITEMS.length);
  assert.equal(new Set(all.map((i) => i.id)).size, all.length);
});

test("단계 순서: 설치 전 → 전원 켜기 전 → 전원 켠 뒤 → 통신 → 기록", () => {
  const order = STAGES.map((s) => s.id);
  const items = buildChecklist(["pc", "plc", "rs485", "meter"]);
  const idx = items.map((i) => order.indexOf(i.stage));
  assert.deepEqual(
    idx,
    [...idx].sort((a, b) => a - b),
  );
  assert.deepEqual(
    byStage(items).map((g) => g.id),
    order,
  );
  assert.ok(byStage(buildChecklist([])).every((g) => g.items.length > 0));
});

test("안전 문구(자격자)는 늘 들어 있다", () => {
  assert.ok(buildChecklist([]).some((i) => i.id === "all-qualified" && i.text.ko.includes("자격")));
});

test("저장 글 읽기: 모르는 구성·항목·깨진 JSON 은 버림", () => {
  assert.deepEqual(parseSaved(null), emptySaved());
  assert.deepEqual(parseSaved("{"), emptySaved());
  assert.deepEqual(parseSaved('{"v":2}'), emptySaved());
  const s = parseSaved(
    JSON.stringify({ v: 1, title: "A 라인", comps: ["plc", "nope"], done: { "plc-ip": true, bogus: true, "pc-sw": "yes" }, memo: { "plc-ip": " 192.168.0.10 ", x: "y", "pc-sw": "" } }),
  );
  assert.deepEqual(s.comps, ["plc"]);
  assert.deepEqual(s.done, { "plc-ip": true });
  assert.deepEqual(s.memo, { "plc-ip": " 192.168.0.10 " });
  assert.equal(s.title, "A 라인");
});

test("글·CSV 내보내기", () => {
  const s: Saved = { v: 1, title: "", comps: ["rs485"], done: { "rs485-term": true }, memo: { "rs485-term": '끝 장비 "3번"\n종단 켬, 확인' } };
  const txt = toText(s, "ko");
  assert.ok(txt.startsWith("시운전·설치 점검표"));
  assert.ok(txt.includes("[x] 선로 양 끝"));
  assert.ok(txt.includes('메모: 끝 장비 "3번" / 종단 켬, 확인'));
  assert.ok(txt.includes("## 통신"));
  assert.ok(txt.includes(`완료 1/${buildChecklist(["rs485"]).length}`));
  const csv = toCsv(s, "en");
  assert.equal(csv.split("\r\n")[0], "Stage,Item,Done,Note");
  assert.ok(csv.includes('"끝 장비 ""3번""\n종단 켬, 확인"'));
  assert.ok(csv.includes(",yes,"));
});

test("CSV 칸: 수식 시작 글자 막기, 따옴표", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("plain"), "plain");
});

test("링크는 실제 가이드 slug·웹 도구 경로만", () => {
  const guides = new Set([...readFileSync(new URL("../data/guides.ts", import.meta.url), "utf8").matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => `guides/${m[1]}/`));
  const tools = new Set([...readFileSync(new URL("../data/webTools.ts", import.meta.url), "utf8").matchAll(/path: "(tools\/[^"]+)"/g)].map((m) => m[1]));
  assert.ok(guides.size > 30 && tools.size > 30);
  for (const i of ITEMS) for (const l of i.links ?? []) assert.ok(guides.has(l) || tools.has(l), `${i.id}: ${l}`);
});
