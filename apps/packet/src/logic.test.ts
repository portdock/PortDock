// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/packet/src/logic.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { allPaths, andFilter, applyCompletion, barFractions, bucketLabel, errorSegments, flattenTree, followAscii, followHex, gridTemplate, hexLines, missingChunks, moveSel, nodeFilters, pushHistory, rtText, sanitizeCols, scrollToShow, secText, slowTail, timeText, valueSuggestions, visibleCols, windowOf, wordBefore, appFilter, QUICK_FILTERS, fromB64 } from "./logic.ts";

test("시각·응답 시간 글자", () => {
  assert.equal(secText(1_234_567_890), "1.234567");
  assert.equal(secText(-500_000_000), "-0.500000");
  assert.equal(rtText(8_000_000), "8.00 ms");
  assert.equal(rtText(250_000), "250 µs");
  assert.equal(rtText(1_200_000_000), "1.20 s");
  assert.equal(rtText(-1), "—");
  const r = { hasTs: true, sec: 1700000000, nsec: 1000, relNs: 2_000_000_000, deltaNs: -1, deltaViewNs: 5_000_000 };
  assert.equal(timeText(r, "rel"), "2.000000");
  assert.equal(timeText(r, "delta"), "");
  assert.equal(timeText(r, "deltaView"), "0.005000");
  assert.equal(timeText({ ...r, hasTs: false }, "rel"), "");
});

test("가상 스크롤 — 100만 행에서도 보이는 행만", () => {
  const w = windowOf(0, 400, 22, 1_000_000, 0);
  assert.equal(w.first, 0);
  assert.ok(w.last <= 19);
  assert.equal(w.scale, 1);
  assert.equal(w.spacer, 22_000_000);
  const m = windowOf(11_000_000, 400, 22, 1_000_000, 0);
  assert.equal(m.first, 500_000);
  // 글자를 키워 높이 합이 상한을 넘으면 비율로
  const big = windowOf(0, 400, 40, 1_000_000, 0);
  assert.equal(big.spacer, 30_000_000);
  assert.ok(big.scale > 1);
  const end = windowOf(big.spacer - 400, 400, 40, 1_000_000, 0);
  assert.equal(end.last, 999_999);
  // 빈 목록
  assert.equal(windowOf(0, 400, 22, 0).last, -1);
});

test("고른 행 보이기·키 이동", () => {
  assert.equal(scrollToShow(5, 0, 400, 22, 100), null);
  assert.equal(scrollToShow(50, 0, 400, 22, 100), 50 * 22 + 22 - 400);
  assert.equal(scrollToShow(0, 500, 400, 22, 100), 0);
  assert.equal(moveSel(-1, "ArrowDown", 10, 100), 0);
  assert.equal(moveSel(5, "ArrowUp", 10, 100), 4);
  assert.equal(moveSel(5, "PageDown", 10, 100), 15);
  assert.equal(moveSel(95, "PageDown", 10, 100), 99);
  assert.equal(moveSel(5, "PageUp", 10, 100), 0);
  assert.equal(moveSel(5, "Home", 10, 100), 0);
  assert.equal(moveSel(5, "End", 10, 100), 99);
  assert.equal(moveSel(0, "ArrowDown", 10, 0), -1);
  assert.deepEqual(missingChunks(0, 450, 200, (c) => c === 1), [0, 2]);
});

test("열 — 너비·숨김·저장값 정리", () => {
  const c = sanitizeCols({ hidden: ["rt", "zzz"], widths: { info: 10, src: 200 } });
  assert.deepEqual(c.hidden, ["rt"]);
  assert.ok(!visibleCols(c).includes("rt"));
  assert.match(gridTemplate(c), /200px/);
  assert.match(gridTemplate(c), /minmax\(40px, 1fr\)$/);
  assert.deepEqual(visibleCols({ hidden: ["no", "time", "src", "dst", "proto", "len", "rt", "info"], widths: {} }), ["no"]);
  assert.deepEqual(sanitizeCols(null), { hidden: [], widths: {} });
});

test("필터 막대 — 오류 표시·자동 완성·값 제안·이력", () => {
  assert.deepEqual(errorSegments("ip.addr == ", 8, 2), [
    { text: "ip.addr ", bad: false },
    { text: "==", bad: true },
    { text: " ", bad: false },
  ]);
  assert.deepEqual(errorSegments("abc", 10, 1), [{ text: "abc", bad: false }]);
  assert.deepEqual(wordBefore("ip.addr == 1 && modb", 20), { word: "modb", start: 16 });
  assert.equal(wordBefore("ip.addr == ", 11), null);
  assert.deepEqual(applyCompletion("tcp.port == 1 && modb", 21, "modbus.func_code"), { text: "tcp.port == 1 && modbus.func_code", caret: 33 });
  const v = valueSuggestions("modbus.func_code == ", 20);
  assert.ok(v && v.values.includes("3"));
  assert.equal(valueSuggestions("modbus.func_code == 3", 21), null);
  assert.equal(valueSuggestions("ip.addr == ", 11), null);
  assert.deepEqual(pushHistory(["a", "b"], " b "), ["b", "a"]);
  assert.deepEqual(pushHistory(["a"], "  "), ["a"]);
  assert.equal(andFilter("", "mc"), "mc");
  assert.equal(andFilter("tcp", "mc"), "(tcp) && (mc)");
  assert.equal(andFilter("mc", "mc"), "mc");
  assert.ok(QUICK_FILTERS.length >= 5);
  assert.equal(appFilter("mc", "all"), "mc");
  assert.match(appFilter("mbtcp", "noresp"), /pair\.no_response/);
  assert.match(appFilter("xgt", "exception"), /xgt\.error/);
});

test("해석 트리 — 펼치기·접기·필터", () => {
  const leaf = (label, name = "", start = 0, len = 0) => ({ label, name, start, len, expert: null, children: [] });
  const tree = [{ ...leaf("Frame"), children: [leaf("a")] }, { ...leaf("Ethernet"), children: [{ ...leaf("Src", "eth.src", 6, 6), children: [leaf("x")] }] }];
  let f = flattenTree(tree, new Set(), new Set());
  assert.deepEqual(f.map((x) => x.node.label), ["Frame", "a", "Ethernet", "Src", "x"]);
  assert.equal(f[3].open, true); // 둘째 단계까지 기본 펼침
  f = flattenTree(tree, new Set(["0", "1.0"]), new Set());
  assert.deepEqual(f.map((x) => x.node.label), ["Frame", "Ethernet", "Src"]);
  assert.deepEqual(allPaths(tree), new Set(["0", "1", "1.0"]));
  const fields = [{ name: "eth.src", start: 6, len: 6, filter: "eth.src == aa:bb:cc:dd:ee:ff" }];
  assert.deepEqual(nodeFilters(tree[1].children[0], fields), { apply: "eth.src", only: "eth.src == aa:bb:cc:dd:ee:ff" });
  assert.deepEqual(nodeFilters(tree[0], fields), { apply: null, only: null });
});

test("바이트 칸·흐름 따라가기", () => {
  const d = new Uint8Array(20).map((_, i) => 0x30 + i);
  const l = hexLines(d);
  assert.equal(l.length, 2);
  assert.equal(l[1].offset, 16);
  assert.equal(l[1].bytes.length, 4);
  assert.deepEqual(Array.from(fromB64("Zm9v")), [102, 111, 111]);
  assert.equal(followAscii(new Uint8Array([72, 105, 13, 10, 0, 65])), "Hi\n.A");
  assert.match(followHex(new Uint8Array([0x41, 0x42])), /^0000 {2}41 42 +AB$/);
});

test("응답 시간 분포·요약", () => {
  const b = [
    { loNs: 0, hiNs: 100_000, count: 2 },
    { loNs: 100_000, hiNs: 200_000, count: 8 },
    { loNs: 1_000_000_000, hiNs: Number.MAX_SAFE_INTEGER * 1000, count: 0 },
  ];
  assert.deepEqual(barFractions(b), [0.25, 1, 0]);
  assert.equal(bucketLabel(b[1]), "100 µs – 200 µs");
  assert.equal(bucketLabel(b[2]), "≥ 1.00 s");
  assert.equal(slowTail({ pairs: 10, minNs: 1, medianNs: 5e6, p95Ns: 550e6, maxNs: 550e6, exceptions: 0, noResponse: 0, pending: 0, orphans: 0 }), true);
  assert.equal(slowTail({ pairs: 10, minNs: 1, medianNs: 5e6, p95Ns: 9e6, maxNs: 9e6, exceptions: 0, noResponse: 0, pending: 0, orphans: 0 }), false);
});
