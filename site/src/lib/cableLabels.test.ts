import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_LABELS, SHEET_PRESETS, layoutSheet, listLabels, paginate, pairLabels, parseLines, repeatEach, seqLabels, toCsv, toText } from "./cableLabels.ts";

const ok = <T>(r: { ok: true; value: T } | { ok: false }) => {
  assert.ok(r.ok, JSON.stringify(r));
  return (r as { ok: true; value: T }).value;
};

test("연번: W001~W120, X1:1~X1:40, 거꾸로·간격", () => {
  const w = ok(seqLabels({ prefix: "W", start: 1, end: 120, digits: 3 }));
  assert.equal(w.length, 120);
  assert.equal(w[0], "W001");
  assert.equal(w[119], "W120");
  const x = ok(seqLabels({ prefix: "X1:", start: 1, end: 40, digits: 0 }));
  assert.equal(x.length, 40);
  assert.equal(x[39], "X1:40");
  assert.deepEqual(ok(seqLabels({ prefix: "-", start: 10, end: 4, digits: 2, step: 3, suffix: "A" })), ["-10A", "-07A", "-04A"]);
  // 자릿수보다 큰 수는 그대로
  assert.deepEqual(ok(seqLabels({ prefix: "W", start: 999, end: 1000, digits: 3 })), ["W999", "W1000"]);
});

test("연번 오류: 소수·음수·간격 0·너무 많음", () => {
  assert.equal(seqLabels({ prefix: "W", start: 1.5, end: 3, digits: 0 }).ok, false);
  assert.equal(seqLabels({ prefix: "W", start: -1, end: 3, digits: 0 }).ok, false);
  assert.equal(seqLabels({ prefix: "W", start: 1, end: 3, digits: 0, step: 0 }).ok, false);
  assert.equal(seqLabels({ prefix: "W", start: 1, end: MAX_LABELS + 1, digits: 0 }).ok, false);
  assert.equal(seqLabels({ prefix: "W", start: 1, end: MAX_LABELS, digits: 0 }).ok, true);
});

test("붙여넣기: 탭(엑셀)·세미콜론·쉼표, 빈 줄 무시", () => {
  assert.deepEqual(parseLines("A\tB\n\n C ; D \nE,F\nG"), [["A", "B"], ["C", "D"], ["E", "F"], ["G"]]);
  assert.deepEqual(ok(listLabels("%IX0.0\tStart PB\n%IX0.1\tStop PB\n")), ["%IX0.0 Start PB", "%IX0.1 Stop PB"]);
  assert.deepEqual(ok(listLabels("%IX0.0\tStart PB", false)), ["%IX0.0"]);
});

test("양끝 라벨: A→B 쌍, B 끝 뒤집기, 끝이 하나면 오류", () => {
  const p = ok(pairLabels("W001, X1:1, K1:A1\nX2:5;M1:U"));
  assert.deepEqual(
    p.map((x) => [x.label, x.end]),
    [
      ["W001 X1:1→K1:A1", "A"],
      ["W001 X1:1→K1:A1", "B"],
      ["X2:5→M1:U", "A"],
      ["X2:5→M1:U", "B"],
    ],
  );
  const r = ok(pairLabels("W001, X1:1, K1:A1", { reverseAtB: true, arrow: " > " }));
  assert.deepEqual(r.map((x) => x.label), ["W001 X1:1 > K1:A1", "W001 K1:A1 > X1:1"]);
  assert.equal(pairLabels("W001\n").ok, false);
});

test("장 수: 같은 라벨 n 장", () => {
  assert.deepEqual(repeatEach(["a", "b"], 2), ["a", "a", "b", "b"]);
  assert.deepEqual(repeatEach(["a"], 0), ["a"]);
});

test("용지 배치: 나눠 계산·고정 크기·넘침 오류", () => {
  const l = ok(layoutSheet({ pageW: 210, pageH: 297, rows: 10, cols: 4, marginTop: 10, marginLeft: 8, gapX: 2, gapY: 0, labelW: 0, labelH: 0 }));
  assert.equal(l.perPage, 40);
  assert.equal(l.labelW, 47);
  assert.equal(l.labelH, 27.7);
  assert.deepEqual(l.cells[0], { x: 8, y: 10 });
  assert.deepEqual(l.cells[5], { x: 57, y: 37.7 });
  // 마지막 칸 오른쪽 끝 = 210 − 8
  assert.equal(l.cells[39].x + l.labelW, 202);
  const f = ok(layoutSheet(SHEET_PRESETS[0].s));
  assert.equal(f.perPage, 24);
  assert.equal(f.cells[23].y + f.labelH, 296.5);
  assert.equal(layoutSheet({ ...SHEET_PRESETS[0].s, labelW: 71 }).ok, false);
  assert.equal(layoutSheet({ ...SHEET_PRESETS[0].s, rows: 0 }).ok, false);
  assert.equal(layoutSheet({ ...SHEET_PRESETS[1].s, marginLeft: 110 }).ok, false);
  for (const p of SHEET_PRESETS) assert.ok(layoutSheet(p.s).ok, p.id);
});

test("장 나누기: 쓰다 남은 용지(앞 칸 건너뛰기)", () => {
  const pages = paginate(["a", "b", "c", "d", "e"], 4, 2);
  assert.deepEqual(pages, [[null, null, "a", "b"], ["c", "d", "e"]]);
  assert.deepEqual(paginate(["a"], 4, 99), [[null, null, null, "a"]]);
  assert.deepEqual(paginate([], 4), []);
});

test("내보내기: CSV 따옴표·끝 열, 텍스트", () => {
  assert.equal(toCsv([{ label: "W001" }, { label: 'A,"B"' }]), 'No,Label\r\n1,W001\r\n2,"A,""B"""\r\n');
  assert.equal(toCsv([{ label: "X→Y", end: "A" }, { label: "X→Y", end: "B" }]), "No,Label,End\r\n1,X→Y,A\r\n2,X→Y,B\r\n");
  assert.equal(toText(["a", "b"]), "a\r\nb\r\n");
});
