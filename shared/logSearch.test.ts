// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/logSearch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_FILTER, LogIndex, looksHex, parseQuery, screenText } from "./logSearch.ts";

const fr = (seq, dir, bytes, check = null, note) => ({ ts: seq, dir, bytes, check, note, seq });
const b = (s) => [...s].map((c) => c.charCodeAt(0));

test("HEX 자동 판별", () => {
  assert.equal(looksHex("01 03"), true);
  assert.equal(looksHex("0x01,0x03"), true);
  assert.equal(looksHex("OK"), false);
  assert.equal(looksHex("0103"), false); // 붙여 쓴 것은 HEX 고르기로
  assert.deepEqual(parseQuery("0103", "hex").bytes, [1, 3]);
  assert.equal(parseQuery("013", "hex"), null);
  assert.equal(parseQuery("ready", "auto").kind, "text");
});

test("찾기·거르기·잘림·지우기", () => {
  const ix = new LogIndex();
  let frames = [fr(1, "tx", [1, 3, 0, 0]), fr(2, "rx", [1, 3, 2, 0, 5], false), fr(3, "ev", [], null, "OPEN COM5"), fr(4, "rx", b("READY\r\n"), true)];
  let r = ix.update(frames, { ...EMPTY_FILTER, query: "01 03" });
  assert.equal(r.view, null); // 찾기만이면 거르지 않는다
  assert.deepEqual(r.hits, [1, 2]);
  r = ix.update(frames, { ...EMPTY_FILTER, query: "ready", hitsOnly: true });
  assert.deepEqual(r.view, [4]);
  r = ix.update(frames, { ...EMPTY_FILTER, query: "open" });
  assert.deepEqual(r.hits, [3]); // 사건 줄은 설명 글에서
  r = ix.update(frames, { ...EMPTY_FILTER, failOnly: true });
  assert.deepEqual(r.view, [2]);
  const st = { ...EMPTY_FILTER, dir: "rx" };
  assert.deepEqual(ix.update(frames, st).view, [2, 4]);
  // 뒤에 붙고 앞이 잘림 — 증분
  frames.push(fr(5, "rx", [9]));
  frames.splice(0, 2);
  assert.deepEqual(ix.update(frames, st).view, [4, 5]);
  // 지우기 = 새 배열
  frames = [fr(6, "tx", [1])];
  assert.deepEqual(ix.update(frames, st).view, []);
});

test("10만 줄 — 처음 거르기와 증분", () => {
  const frames = [];
  for (let i = 1; i <= 100_000; i++) frames.push(fr(i, i % 2 ? "rx" : "tx", [1, 3, 20, ...Array(20).fill(i & 0xff)], i % 97 ? true : false));
  const ix = new LogIndex();
  const s = { ...EMPTY_FILTER, query: "01 03 14", failOnly: true };
  let t = performance.now();
  const r = ix.update(frames, s);
  const full = performance.now() - t;
  assert.equal(r.view.length, Math.floor(100_000 / 97));
  for (let i = 100_001; i <= 100_050; i++) frames.push(fr(i, "rx", [1, 3, 20, 0], false));
  t = performance.now();
  ix.update(frames, s);
  const inc = performance.now() - t;
  console.log(`full ${full.toFixed(1)} ms, incremental ${inc.toFixed(2)} ms`);
  assert.ok(full < 500, `full pass ${full} ms`);
  assert.ok(inc < 20, `incremental ${inc} ms`);
});

test("화면 저장 — 보기대로, 거른 줄만, 머리줄", () => {
  const frames = [fr(1, "tx", b("AT\r")), fr(2, "rx", b("OK"), false), fr(3, "ev", [], null, "OPEN")];
  const hex = (x) => x.map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  const ascii = (x) => String.fromCharCode(...x);
  const base = { app: "T", frames, fmt: (t) => `t${t}`, hex, ascii, lang: "en" };
  const all = screenText({ ...base, view: null, mode: "ascii", filterDesc: null }).split("\n");
  assert.equal(all[0], "# T · view ASCII · all 3 lines");
  assert.equal(all[2], "t2 RX OK [CHECK FAIL]");
  const f = screenText({ ...base, view: [2], mode: "both", filterDesc: "RX" }).split("\n");
  assert.equal(f.length, 2);
  assert.match(f[0], /filter RX — 1 of 3 lines/);
  assert.equal(f[1], "t2 RX 4F 4B | OK [CHECK FAIL]");
});
