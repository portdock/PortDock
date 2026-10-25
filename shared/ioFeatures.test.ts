// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/ioFeatures.test.ts
// 글자 인코딩 보기·체크섬 JSON·입력 이력·간격 열·처리량·트리거·터미널 보기(화면 없는 부분)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ascii, checksumLen, checksumToRust, crcProblem } from "./format.ts";
import { pushHistory, stepHistory } from "./history.ts";
import { fmtAgo, fmtDelta, fmtRate, Meter, newDeltaState, stampDelta } from "./liveStats.ts";
import { compilePattern, containsPattern, matchTriggers, compileAll, newTrigger, sanitizeTriggers } from "./triggers.ts";
import { TermBuffer } from "./terminal.ts";

const enc = (s) => [...new TextEncoder().encode(s)];

test("글자 보기 — 백엔드 codec::text_view 와 같은 규칙", () => {
  assert.equal(ascii(enc("OK\r\n"), "utf-8"), "OK<CR><LF>");
  assert.equal(ascii(enc("한"), "utf-8"), "한");
  assert.equal(ascii([0xc7, 0xd1], "utf-8"), "<C7><D1>");
  assert.equal(ascii([0xc7, 0xd1, 0x41], "cp949"), "한A");
  // CP949 확장 글자(UHC) — WebView2(Chromium)의 WHATWG euc-kr 는 풀지만 Node 의 ICU euc-kr 는 못 푼다. 못 풀면 <8C>c 로 안전하게
  const uhc = (() => {
    try {
      return new TextDecoder("euc-kr", { fatal: true }).decode(new Uint8Array([0x8c, 0x63])) === "똠";
    } catch {
      return false;
    }
  })();
  assert.equal(ascii([0x8c, 0x63], "cp949"), uhc ? "똠" : "<8C>c");
  assert.equal(ascii([0xff, 0x41], "cp949"), "<FF>A");
  assert.equal(ascii([0xe9, 0x85, 0x1b], "latin1"), "é<85><1B>");
  assert.equal(ascii([0xe9], "ascii"), "<E9>");
  assert.equal(ascii([0xed, 0x95], "utf-8"), "<ED><95>");
  // 대리 쌍(ED A0 80)·넘치는 표현(E0 80 80)은 글자가 아니다
  assert.equal(ascii([0xed, 0xa0, 0x80], "utf-8"), "<ED><A0><80>");
  assert.equal(ascii([0xe0, 0x80, 0x80], "utf-8"), "<E0><80><80>");
  assert.equal(ascii(enc("😀"), "utf-8"), "😀");
});

test("체크섬 JSON — 옵션 없으면 예전 문자열, 옵션·범용 CRC 는 spec", () => {
  assert.equal(checksumToRust(null), null);
  assert.equal(checksumToRust("crc16-modbus", {}), "crc16-modbus");
  assert.equal(checksumToRust("crc32"), "crc32");
  assert.deepEqual(checksumToRust("bcc", { skipHead: 1, beforeEnd: 1 }), { spec: { algo: "bcc", skipHead: 1, beforeEnd: 1, swap: false } });
  const c = checksumToRust("crc", { crc: { width: 16, poly: 0x1021, init: 0, refin: true, refout: true, xorout: 0 } });
  assert.deepEqual(c, { spec: { algo: { crc: { width: 16, poly: 0x1021, init: 0, refin: true, refout: true, xorout: 0 } }, skipHead: 0, beforeEnd: 0, swap: false } });
  assert.equal(checksumLen("crc32"), 4);
  assert.equal(checksumLen("crc", { crc: { width: 8, poly: 7, init: 0, refin: false, refout: false, xorout: 0 } }), 1);
  assert.equal(checksumLen("sum16"), 2);
  assert.match(crcProblem({ width: 8, poly: 0x1021, init: 0, refin: false, refout: false, xorout: 0 }, "en"), /poly/);
  assert.equal(crcProblem({ width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff }), null);
});

test("입력 이력 — 같은 것은 맨 뒤로, 50개, ↑↓ 와 고치던 글", () => {
  let h = [];
  for (const t of ["a", "b", "a", " ", "c"]) h = pushHistory(h, { text: t, mode: "ascii" });
  assert.deepEqual(h.map((x) => x.text), ["b", "a", "c"]);
  // 같은 글이라도 모드가 다르면 따로
  h = pushHistory(h, { text: "c", mode: "hex" });
  assert.equal(h.length, 4);
  let many = [];
  for (let i = 0; i < 60; i++) many = pushHistory(many, { text: String(i), mode: "hex" });
  assert.equal(many.length, 50);
  assert.equal(many[0].text, "10");
  const list = [{ text: "1", mode: "hex" }, { text: "2", mode: "hex" }];
  let r = stepHistory(list, null, -1);
  assert.deepEqual(r, { pos: 1, entry: list[1] });
  r = stepHistory(list, 1, -1);
  assert.deepEqual(r, { pos: 0, entry: list[0] });
  assert.equal(stepHistory(list, 0, -1).entry, null, "oldest — stays");
  assert.deepEqual(stepHistory(list, 0, 1), { pos: 1, entry: list[1] });
  assert.deepEqual(stepHistory(list, 1, 1), { pos: null, entry: "draft" });
  assert.equal(stepHistory(list, null, 1).entry, null, "↓ without walking does nothing");
  assert.equal(stepHistory([], null, -1).entry, null);
});

test("간격 열 — 직전 RX·TX 와의 간격, 마지막 TX → RX 응답 시간", () => {
  const st = newDeltaState();
  const fs = [
    { ts: 1000, dir: "tx" },
    { ts: 1003, dir: "ev" },
    { ts: 1012, dir: "rx" },
    { ts: 1030, dir: "rx" },
    { ts: 2000, dir: "tx" },
    { ts: 2005, dir: "rx" },
  ];
  for (const f of fs) stampDelta(st, f);
  assert.equal(fs[0].gap, null);
  assert.equal(fs[0].rsp, null);
  assert.equal(fs[1].gap, undefined, "EV untouched");
  assert.equal(fs[2].gap, 12);
  assert.equal(fs[2].rsp, 12);
  assert.equal(fs[3].gap, 18);
  assert.equal(fs[3].rsp, 30);
  assert.equal(fs[4].rsp, null);
  assert.equal(fs[5].rsp, 5);
  assert.equal(fmtDelta(12), "+12 ms");
  assert.equal(fmtDelta(12345), "+12.345 s");
  assert.equal(fmtDelta(125000), "+2:05.0");
  assert.equal(fmtDelta(null), "");
});

test("처리량 — 1초 창, 프레임 수, 마지막 수신", () => {
  const m = new Meter();
  m.add("rx", 100, 1000);
  m.add("rx", 50, 1500);
  m.add("tx", 10, 1600);
  assert.deepEqual(m.rate(1700), { rx: 150, tx: 10 });
  assert.deepEqual(m.rate(2200), { rx: 50, tx: 10 });
  assert.deepEqual(m.rate(5000), { rx: 0, tx: 0 });
  assert.deepEqual(m.frames, { rx: 2, tx: 1 });
  assert.equal(m.lastRx, 1500);
  assert.equal(fmtRate(999), "999 B/s");
  assert.equal(fmtRate(2048), "2.0 KB/s");
  assert.equal(fmtAgo(1500, 4600, "ko"), "3초 전");
  assert.equal(fmtAgo(null, 0, "en"), "—");
  assert.equal(fmtAgo(0, 125_000, "en"), "2 min ago");
});

test("트리거 패턴 — 자동응답과 같은 와일드카드, 포함 검사", () => {
  const h = compilePattern("01 03 ?? **", "hex");
  assert.deepEqual(h, [1, 3, null, "*"]);
  assert.ok(containsPattern(h, [0xff, 1, 3, 9]));
  assert.ok(!containsPattern(h, [1, 3]));
  const a = compilePattern("ERR?*!", "ascii");
  assert.ok(containsPattern(a, enc("xxERR7 overflow!\r\n")));
  assert.ok(!containsPattern(a, enc("ERR!")));
  // \x3F 는 글자 그대로의 ?
  const q = compilePattern("A\\x3F", "ascii");
  assert.deepEqual(q, [0x41, 0x3f]);
  assert.ok(!containsPattern(q, enc("AB")));
  assert.ok(containsPattern(compilePattern("\\r\\n", "ascii"), [0x41, 0x0d, 0x0a]));
  assert.throws(() => compilePattern("  ", "hex"), /비어/);
  assert.throws(() => compilePattern("**", "hex"), /\*/);
  assert.throws(() => compilePattern("0G", "hex"), /HEX/);
  const t1 = { ...newTrigger(1), pattern: "ALARM" };
  const t2 = { ...newTrigger(2, "hex"), pattern: "41 4C", on: false };
  const t3 = { ...newTrigger(3), pattern: "" };
  const c = compileAll([t1, t2, t3], "ko");
  assert.equal(c[2].toks, null);
  assert.deepEqual(matchTriggers(c, enc("ALARM 3")).map((t) => t.id), [1]);
  assert.deepEqual(sanitizeTriggers([{ id: 4, pattern: "x", color: "red" }, { nope: 1 }]).map((t) => [t.id, t.color, t.on]), [[4, null, true]]);
});

test("터미널 보기 — CR/LF 로 줄, ANSI 색, 긴 줄", () => {
  const t = new TermBuffer(100);
  t.feed(enc("boot\r\nok "));
  t.feed(enc("\x1b[31mERR\x1b[0m done\n"));
  t.feed(enc("half"));
  const lines = t.lines();
  assert.equal(lines.length, 3);
  assert.equal(lines[0].map((s) => s.text).join(""), "boot");
  assert.deepEqual(lines[1].map((s) => [s.text, s.fg ?? null]), [["ok ", null], ["ERR", 1], [" done", null]]);
  assert.equal(lines[2].map((s) => s.text).join(""), "half");
  // CR 만 와도 줄 바꿈, CR LF 는 한 번
  const u = new TermBuffer(100);
  u.feed(enc("a\rb\r\nc"));
  assert.deepEqual(u.lines().map((l) => l.map((s) => s.text).join("")), ["a", "b", "c"]);
  // 다른 ESC 시퀀스(커서 이동 등)는 버린다, 굵게·밝은 색
  const v = new TermBuffer(100);
  v.feed(enc("\x1b[2J\x1b[1;92mGO\x1b[m"));
  assert.deepEqual(v.lines()[0].map((s) => [s.text, s.fg, !!s.bold]), [["GO", 10, true]]);
  // 줄 수 한도
  const w = new TermBuffer(3);
  w.feed(enc("1\n2\n3\n4\n5"));
  assert.deepEqual(w.lines().map((l) => l.map((s) => s.text).join("")), ["3", "4", "5"]);
  // 시퀀스가 두 덩어리에 걸쳐 와도
  const x = new TermBuffer(10);
  x.feed(enc("\x1b[3"));
  x.feed(enc("2mG"));
  assert.deepEqual(x.lines()[0].map((s) => [s.text, s.fg]), [["G", 2]]);
});
