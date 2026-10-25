// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-master/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addrLabel,
  minUnit,
  encodeValue,
  errorCount,
  exportCsv,
  fmtMs,
  importCsv,
  newTable,
  parse16,
  parseAddr,
  plcGuess,
  parseInput,
  pushSample,
  sanitizeTables,
  scaleSeries,
  shapeOf,
  show16,
  showValue,
  numValue,
  toSpec,
  valueLogLines,
  VALUE_LOG_HEADER,
} from "./model.ts";

test("새 표·저장값 고치기·백엔드 모양", () => {
  const a = newTable([]);
  assert.equal(a.id, 1);
  assert.deepEqual(toSpec(a), { id: 1, unit: 1, fc: 3, start: 0, qty: 10, intervalMs: 1000, enabled: true });
  const b = newTable([a], { ...a, name: "copy" });
  assert.equal(b.id, 2);
  assert.equal(b.name, "copy");
  // 틀린 값은 기본값으로, 개수는 함수 한도·주소 끝까지
  const fixed = sanitizeTables([
    { id: 5, fc: 3, qty: 500, start: 65530, unit: -1, intervalMs: 3, format: "oct", view: "x", points: [{ addr: -1 }, { addr: 3, name: "T", type: "f32", order: "CDAB" }] },
    { id: 5, fc: 1, qty: 2000, intervalMs: 0 },
    "junk",
  ]);
  assert.equal(fixed.length, 2);
  assert.equal(fixed[0].qty, 6);
  assert.equal(fixed[0].unit, 1);
  assert.equal(fixed[0].intervalMs, 1000);
  assert.equal(fixed[0].format, "u16");
  assert.equal(fixed[0].points.length, 1);
  assert.notEqual(fixed[1].id, 5, "겹친 번호는 새로");
  assert.equal(fixed[1].qty, 2000);
  assert.equal(fixed[1].intervalMs, 0, "0 = 손으로만");
  assert.equal(sanitizeTables(null).length, 1, "비면 표 하나");
  // 백엔드에 넘길 때 개수를 한도 안으로
  assert.equal(toSpec({ ...a, fc: 3, qty: 2000 }).qty, 125);
});

test("주소 표기 — 0·1 기준과 40001(앞자리로 함수 코드 고르기)", () => {
  assert.equal(addrLabel(3, 0, "plc"), "40001");
  assert.equal(addrLabel(4, 9999, "plc"), "310000");
  assert.equal(addrLabel(1, 4, "plc"), "00005");
  assert.equal(addrLabel(3, 10, "one"), "11");
  assert.deepEqual(parseAddr("100", "zero", 3), { start: 100, fc: 3 });
  assert.equal(parseAddr("65536", "zero", 3), null);
  assert.deepEqual(parseAddr("1", "one", 3), { start: 0, fc: 3 });
  assert.equal(parseAddr("0", "one", 3), null);
  assert.deepEqual(parseAddr("40001", "plc", 3), { start: 0, fc: 3 });
  assert.deepEqual(parseAddr("30010", "plc", 3), { start: 9, fc: 4 }, "3xxxx → FC04");
  assert.deepEqual(parseAddr("00001", "plc", 3), { start: 0, fc: 1 });
  assert.deepEqual(parseAddr("10002", "plc", 4), { start: 1, fc: 2 });
  assert.deepEqual(parseAddr("410000", "plc", 3), { start: 9999, fc: 3 });
  assert.deepEqual(parseAddr("465536", "plc", 3), { start: 65535, fc: 3 });
  assert.equal(parseAddr("40000", "plc", 3), null);
  assert.equal(parseAddr("20001", "plc", 3), null, "2xxxx 는 없는 표");
  assert.deepEqual(parseAddr("15", "plc", 4), { start: 14, fc: 4 }, "짧은 수는 지금 표의 번호");
  assert.equal(parseAddr("abc", "plc", 3), null);
  // 0·1 기준 칸에 넣은 40001·30001 — 그대로 읽되 «PLC 표기로 바꾸기» 안내용 판정
  assert.deepEqual(plcGuess("40001", "zero", 3), { start: 0, fc: 3 });
  assert.deepEqual(plcGuess(" 30010 ", "one", 3), { start: 9, fc: 4 }, "3xxxx → FC04 로");
  assert.deepEqual(plcGuess("410000", "zero", 3), { start: 9999, fc: 3 }, "6자리도");
  assert.equal(plcGuess("40001", "plc", 3), null, "이미 PLC 표기");
  assert.equal(plcGuess("1000", "zero", 3), null, "4자리는 그냥 주소");
  assert.equal(plcGuess("20001", "zero", 3), null, "2xxxx 는 없는 표");
  assert.equal(plcGuess("40000", "zero", 3), null, "40000 은 PLC 로 못 읽음");
});

test("값 보기 — u16 표시 방식, 타입·순서, HEX·BIN 정수", () => {
  assert.equal(show16(65535, "s16"), "-1");
  assert.equal(show16(0x1a, "hex"), "001A");
  assert.equal(show16(5, "bin"), "0000 0000 0000 0101");
  const f32 = { type: "f32", order: "CDAB" };
  assert.equal(showValue(encodeValue(123.456, "f32", "CDAB"), f32, "u16"), "123.456");
  assert.equal(showValue([0xe979], f32, "u16"), "—", "칸이 모자라면");
  assert.equal(showValue(encodeValue(-2, "s32", "ABCD"), { type: "s32", order: "ABCD" }, "hex"), "FFFFFFFE");
  assert.equal(showValue(encodeValue(-1, "s16", "ABCD"), { type: "s16", order: "ABCD" }, "u16"), "-1");
  assert.equal(showValue([1], { type: "bit", order: "ABCD" }, "hex"), "1");
  assert.equal(showValue(encodeValue("AB", "string", "ABCD", 4), { type: "string", order: "ABCD", len: 4 }, "u16"), "AB");
  assert.equal(numValue(encodeValue(1.5, "f64", "DCBA"), { type: "f64", order: "DCBA" }), 1.5);
  assert.equal(numValue([0x4142], { type: "string", order: "ABCD", len: 2 }), null);
  assert.deepEqual(shapeOf(1, { addr: 0, type: "f32", order: "CDAB", name: "" }), { type: "bit", order: "ABCD" }, "비트 표는 늘 bit");
});

test("쓰기 입력 — 여러 값·표시 방식·타입", () => {
  const u16 = { type: "u16", order: "ABCD" };
  assert.deepEqual(parseInput("10, 20 30", u16, "u16"), [10, 20, 30]);
  assert.deepEqual(parseInput("-1", u16, "s16"), [0xffff]);
  assert.deepEqual(parseInput("FF 0x10", u16, "hex"), [0xff, 0x10]);
  assert.deepEqual(parseInput("0000 0001", u16, "bin"), [1], "BIN 의 띄어쓰기는 한 값");
  assert.equal(parseInput("70000", u16, "u16"), null);
  assert.equal(parseInput("", u16, "u16"), null);
  assert.equal(parse16("12a", "u16"), null);
  assert.deepEqual(parseInput("on off 1", { type: "bit", order: "ABCD" }, "u16"), [1, 0, 1]);
  assert.equal(parseInput("2", { type: "bit", order: "ABCD" }, "u16"), null);
  assert.deepEqual(parseInput("123.456", { type: "f32", order: "CDAB" }, "u16"), [0xe979, 0x42f6]);
  assert.deepEqual(parseInput("0x12345678", { type: "u32", order: "BADC" }, "u16"), [0x3412, 0x7856]);
  assert.equal(parseInput("x", { type: "f32", order: "ABCD" }, "u16"), null);
});

test("CSV — Modbus Slave 레지스터 맵과 같은 모양으로 주고받기", () => {
  const t = { ...newTable([]), fc: 3, start: 10, qty: 4, points: [{ addr: 10, type: "f32", order: "CDAB", name: "온도" }] };
  const vals = [...encodeValue(21.5, "f32", "CDAB"), 7, 8];
  const csv = exportCsv(t, vals);
  assert.ok(csv.startsWith("﻿table,address,type,order,name,value\r\n"));
  assert.ok(csv.includes("holding-registers,10,f32,CDAB,온도,21.5\r\n"));
  assert.ok(csv.includes("holding-registers,12,u16,ABCD,,7\r\n"));
  // 값 없이(읽기 전)
  assert.ok(exportCsv(t, null).includes("holding-registers,13,u16,ABCD,,\r\n"));
  // 가져오기: 이 표(HR) 줄만 점으로, 다른 표 줄은 센다, 범위 밖도 센다
  const text = "table,address,type,order,name,value\r\nHR,12,s32,DCBA,압력,\r\nIR,0,u16,,x,1\r\nholding-registers,100,u16,,멀리,\r\n";
  const r = importCsv(text, t, "ko");
  assert.deepEqual(r.errors, []);
  assert.equal(r.used, 2);
  assert.equal(r.skipped, 1);
  assert.equal(r.outside, 1);
  assert.deepEqual(r.points.map((p) => [p.addr, p.type, p.order, p.name]), [
    [10, "f32", "CDAB", "온도"],
    [12, "s32", "DCBA", "압력"],
    [100, "u16", "ABCD", "멀리"],
  ]);
  const bad = importCsv("table,address\r\nHR,abc\r\n", t, "en");
  assert.equal(bad.errors.length, 1);
  assert.match(bad.errors[0], /Row 2/);
});

test("값 기록 줄 — 폴링마다·바뀔 때만", () => {
  const t = { ...newTable([]), fc: 3, start: 0, qty: 3, points: [{ addr: 1, type: "u32", order: "ABCD", name: "카운트, 1" }] };
  const prev = new Map();
  const ts = new Date(2026, 9, 18, 13, 5, 9, 7).getTime();
  const a = valueLogLines(ts, t, "표 1", [5, 0, 9], "plc", true, prev);
  assert.equal(a, '2026-10-18 13:05:09.007,표 1,40001,,5\r\n2026-10-18 13:05:09.007,표 1,40002,"카운트, 1",9\r\n');
  assert.equal(valueLogLines(ts, t, "표 1", [5, 0, 9], "plc", true, prev), "", "안 바뀌면 없음");
  assert.equal(valueLogLines(ts, t, "표 1", [6, 0, 9], "zero", true, prev).split("\r\n").length, 2);
  assert.equal(valueLogLines(ts, t, "표 1", [6, 0, 9], "zero", false, prev).split("\r\n").filter(Boolean).length, 2, "폴링마다는 늘");
  assert.equal(VALUE_LOG_HEADER, "time,table,address,name,value\r\n");
});

test("추세 — 표본 한도와 그림 좌표", () => {
  const s = { ts: [], v: [] };
  for (let i = 0; i < 10; i++) pushSample(s, 1000 + i * 100, i % 2 ? 10 : 0, 5);
  assert.equal(s.v.length, 5);
  assert.equal(s.ts[0], 1500);
  const g = scaleSeries(s, 102, 22, 1);
  assert.equal(g.min, 0);
  assert.equal(g.max, 10);
  assert.deepEqual(g.pts[0], [1, 1], "첫 표본(10) — 왼쪽 위");
  assert.deepEqual(g.pts[4], [101, 1]);
  assert.deepEqual(g.pts[1], [26, 21]);
  // 값이 하나뿐·모두 같으면 가운데
  assert.deepEqual(scaleSeries({ ts: [1], v: [3] }, 50, 20).pts, [[48, 10]]);
  assert.deepEqual(scaleSeries({ ts: [], v: [] }, 50, 20).pts, []);
});

test("통계 보조", () => {
  assert.equal(errorCount({ requests: 9, ok: 3, exceptions: 1, timeouts: 2, crc: 1, bad: 1, sendErrors: 1, avgMs: 0, maxMs: 0, lastMs: 0 }), 6);
  assert.equal(errorCount(undefined), 0);
  assert.equal(fmtMs(0), "—");
  assert.equal(fmtMs(0.4), "<1");
  assert.equal(fmtMs(12.34), "12.3");
  assert.equal(fmtMs(250.6), "251");
});

test("국번 0 — Modbus TCP 는 허용(유닛 0 도 보통 주소), RTU 는 브로드캐스트라 읽기·찾기에서 금지", () => {
  assert.equal(minUnit("tcp"), 0);
  assert.equal(minUnit("rtu"), 1);
  // 저장값은 0 도 그대로 둔다(TCP 표) — RTU 로 바꾸면 백엔드가 그 표를 거절해 알린다
  assert.equal(sanitizeTables([{ unit: 0, fc: 3 }])[0].unit, 0);
  assert.equal(sanitizeTables([{ unit: 256, fc: 3 }])[0].unit, 1);
});
