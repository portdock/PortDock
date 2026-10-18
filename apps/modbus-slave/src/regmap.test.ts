// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-slave/src/regmap.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addrText,
  decodeValue,
  encodeValue,
  formatValue,
  layout,
  mergePoints,
  overlapOf,
  parseCsv,
  parseValue,
  rowPoint,
  simCheck,
  simSummary,
  simToSpec,
  defaultSim,
  tableRows,
  toCsv,
} from "./regmap.ts";

const h = (regs) => regs.map((r) => r.toString(16).toUpperCase().padStart(4, "0")).join(" ");

test("f32 123.456 — ABCD·CDAB·BADC·DCBA (백엔드 regmap.rs 와 같은 값)", () => {
  const want = { ABCD: "42F6 E979", CDAB: "E979 42F6", BADC: "F642 79E9", DCBA: "79E9 F642" };
  for (const [o, w] of Object.entries(want)) {
    const r = encodeValue(123.456, "f32", o);
    assert.equal(h(r), w, o);
    assert.equal(formatValue(decodeValue(r, "f32", o), "f32"), "123.456", o);
  }
});

test("정수·f64 왕복 — 모든 순서", () => {
  for (const o of ["ABCD", "CDAB", "BADC", "DCBA"]) {
    for (const [t, v] of [
      ["u16", 65000],
      ["s16", -1234],
      ["u32", 4000000000],
      ["s32", -70000],
      ["f64", -9876.54321],
    ]) {
      assert.equal(decodeValue(encodeValue(v, t, o), t, o), v, `${t} ${o}`);
    }
  }
  assert.equal(h(encodeValue(0x12345678, "u32", "ABCD")), "1234 5678");
  assert.equal(h(encodeValue(0x12345678, "u32", "CDAB")), "5678 1234");
  assert.equal(h(encodeValue(0x12345678, "u32", "BADC")), "3412 7856");
  assert.equal(h(encodeValue(0x12345678, "u32", "DCBA")), "7856 3412");
  // 64비트 워드 바꿈 = 레지스터 넷을 뒤집음
  assert.deepEqual(encodeValue(1, "f64", "CDAB"), encodeValue(1, "f64", "ABCD").reverse());
  // 범위 밖은 맞춘다
  assert.deepEqual(encodeValue(-5, "u16"), [0]);
  assert.deepEqual(encodeValue(70000, "s16"), [0x7fff]);
  assert.equal(decodeValue([1], "u32"), null);
});

test("문자열 — 바이트 바꿈, 0 에서 끝, 길이 제한", () => {
  assert.equal(h(encodeValue("ABC", "string", "ABCD", 4)), "4142 4300");
  assert.equal(h(encodeValue("ABC", "string", "BADC", 4)), "4241 0043");
  assert.equal(decodeValue([0x4142, 0x4300], "string", "ABCD", 4), "ABC");
  assert.equal(decodeValue([0x4241, 0x0043], "string", "BADC", 4), "ABC");
  assert.equal(parseValue("ABCDE", "string", 4), null);
  assert.equal(parseValue("한", "string", 4), "한");
  assert.equal(decodeValue(encodeValue("한글", "string", "ABCD", 6), "string", "ABCD", 6), "한글");
});

test("값 입력 해석과 표시", () => {
  assert.equal(parseValue("0x10", "u16"), 16);
  assert.equal(parseValue("-1", "u16"), null);
  assert.equal(parseValue("-32768", "s16"), -32768);
  assert.equal(parseValue("4294967295", "u32"), 4294967295);
  assert.equal(parseValue("1.5e3", "f32"), 1500);
  assert.equal(parseValue("abc", "f64"), null);
  assert.equal(parseValue("1e39", "f32"), null);
  assert.equal(formatValue(0.1 + 0.2, "f64"), "0.3");
  assert.equal(formatValue(decodeValue(encodeValue(0.1, "f32"), "f32"), "f32"), "0.1");
});

test("배치 — 점은 한 칸으로, 범위 밖으로 걸치면 하나씩", () => {
  const pts = [
    { addr: 2, type: "f32", order: "ABCD", name: "temp" },
    { addr: 9, type: "u32", order: "ABCD", name: "" },
  ];
  const it = layout(0, 10, pts);
  assert.deepEqual(
    it.map((x) => [x.addr, x.span]),
    [
      [0, 1],
      [1, 1],
      [2, 2],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [9, 1],
    ],
  );
  assert.equal(it[2].point.name, "temp");
  // 시작이 점 가운데면 그 레지스터는 따로
  assert.equal(layout(3, 2, pts)[0].point, undefined);
  assert.equal(overlapOf(pts, { addr: 3, type: "u16", order: "ABCD", name: "" }), 2);
  assert.equal(overlapOf(pts, { addr: 4, type: "u16", order: "ABCD", name: "" }), null);
  assert.deepEqual(
    mergePoints(pts, [{ addr: 3, type: "f32", order: "CDAB", name: "x" }]).map((p) => p.addr),
    [3, 9],
  );
});

test("주소 표기 — 0·1 기준, PLC", () => {
  assert.equal(addrText("holding-registers", 0, "zero"), "0");
  assert.equal(addrText("holding-registers", 0, "one"), "1");
  assert.equal(addrText("holding-registers", 0, "plc"), "40001");
  assert.equal(addrText("coils", 3, "plc"), "00004");
  assert.equal(addrText("input-registers", 9999, "plc"), "310000");
  assert.equal(addrText("discrete-inputs", 9998, "plc"), "19999");
});

test("CSV 왕복 — BOM·따옴표·쉼표 든 이름·타입 칸", () => {
  const pts = [
    { addr: 0, type: "f32", order: "CDAB", name: 'Temp, "A"' },
    { addr: 2, type: "string", order: "ABCD", name: "Model", len: 6 },
    { addr: 5, type: "u16", order: "ABCD", name: "Count" },
  ];
  const regs = new Array(8).fill(0);
  regs.splice(0, 2, ...encodeValue(-12.5, "f32", "CDAB"));
  regs.splice(2, 3, ...encodeValue("PD-01", "string", "ABCD", 6));
  regs[5] = 42;
  regs[7] = 0xffff;
  const csv = toCsv(tableRows("holding-registers", 0, regs, pts));
  assert.ok(csv.startsWith("﻿table,address,type,order,name,value\r\n"));
  assert.ok(csv.includes('holding-registers,0,f32,CDAB,"Temp, ""A""",-12.5\r\n'));
  assert.ok(csv.includes("holding-registers,2,string(6),ABCD,Model,PD-01\r\n"));
  const back = parseCsv(csv, "ko");
  assert.deepEqual(back.errors, []);
  assert.equal(back.rows.length, 5);
  assert.deepEqual(back.rows[0], { table: "holding-registers", address: 0, type: "f32", order: "CDAB", name: 'Temp, "A"', value: -12.5, len: undefined });
  assert.equal(back.rows[1].value, "PD-01");
  assert.equal(back.rows[4].value, 65535);
  // 점으로 되살릴 것만
  assert.deepEqual(
    back.rows.map(rowPoint).filter(Boolean).map((p) => p.addr),
    [0, 2, 5],
  );
  // 비트 표
  const bits = toCsv(tableRows("coils", 10, [1, 0], undefined));
  assert.ok(bits.includes("coils,10,bit,,,1\r\n"));
  assert.equal(parseCsv(bits).rows[1].value, 0);
});

test("CSV 읽기 — 별칭·세미콜론·빈 값, 틀리면 행 번호와 함께 모두 거절", () => {
  const ok = parseCsv("Table;Address;Type;Order;Name;Value\nHR;10;float;dcba;x;1,5\n4x;12;;;;\n", "en");
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.rows[0].type, "f32");
  assert.equal(ok.rows[0].order, "DCBA");
  assert.equal(ok.rows[0].value, 1.5);
  assert.equal(ok.rows[1].value, null);
  const bad = parseCsv(
    ["table,address,type,order,name,value", "XX,1,u16,,,1", "hr,70000,u16,,,1", "hr,1,f33,,,1", "co,1,u16,,,1", "hr,1,u16,ABDC,,1", "hr,65535,u32,,,1", "hr,2,s16,,,40000", "hr,3,u32,,,1", "hr,4,u16,,,1"].join("\n"),
    "en",
  );
  assert.equal(bad.rows.length, 0);
  assert.match(bad.errors[0], /^Row 2: unknown table «XX»/);
  assert.match(bad.errors[1], /^Row 3: address «70000»/);
  assert.match(bad.errors[2], /^Row 4: unknown type «f33»/);
  assert.match(bad.errors[3], /^Row 5: coils and discrete inputs must use type bit/);
  assert.match(bad.errors[4], /^Row 6: unknown order «ABDC»/);
  assert.match(bad.errors[5], /^Row 7: 2 registers from address 65535/);
  assert.match(bad.errors[6], /^…and \d+ more/);
  const over = parseCsv("table,address,type\nhr,3,u32\nhr,4,u16\nhr,3,u16\n", "ko");
  assert.ok(over.errors.some((e) => /^3행: 주소 4 가 2행의 칸과 겹칩니다/.test(e)));
  assert.ok(over.errors.some((e) => /^4행: 같은 표·주소\(3\)가 2행에도 있습니다/.test(e)));
  assert.match(parseCsv("a,b\n1,2").errors[0], /머리줄/);
  assert.match(parseCsv("﻿\r\n").errors[0], /줄이 없습니다/);
});

test("자동 변화 — 백엔드 모양·검사·설명", () => {
  const s = { ...defaultSim(10, false), kind: "sine", amp: 5, offset: 20, waveMs: 2000, periodMs: 200 };
  assert.deepEqual(simToSpec(s, { addr: 10, type: "f32", order: "CDAB", name: "" }, false), {
    addr: 10,
    valueType: "f32",
    order: "CDAB",
    periodMs: 200,
    sim: { kind: "sine", amp: 5, offset: 20, waveMs: 2000 },
  });
  assert.equal(simToSpec(s, { addr: 10, type: "string", order: "ABCD", name: "", len: 4 }, false), null);
  assert.equal(simToSpec(defaultSim(3, true), undefined, true).valueType, "bit");
  assert.equal(simCheck(s, "ko"), null);
  assert.match(simCheck({ ...s, periodMs: 10 }, "ko"), /50ms/);
  assert.match(simCheck({ ...s, kind: "increment", step: 0 }, "en"), /Step/);
  assert.match(simCheck({ ...s, kind: "random", min: 5, max: 1 }, "en"), /Min/);
  assert.equal(simCheck({ ...s, periodMs: 0 }, "en"), null);
  assert.equal(simSummary({ ...defaultSim(0, false), periodMs: 0 }, "en"), "Increment +1 (0~100, wraps) · on every read");
  assert.equal(simSummary(s, "ko"), "사인 20 ± 5 / 2000ms · 200ms 마다");
});
