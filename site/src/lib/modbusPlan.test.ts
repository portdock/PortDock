// Modbus 읽기 요청 묶기 — Application Protocol V1.1b3 §4.4·§6.1~6.4
import { test } from "node:test";
import assert from "node:assert/strict";
import { cost, fromPlc, onePerItem, parseItem, parseList, plan, plcText, ParseError, SPEC_MAX } from "./modbusPlan.ts";

const RTU = { dataBits: 8, parity: "even", stopBits: 1 } as const;

test("PLC 표기: 40001 → 보유 0, 30001 → 입력 0, 00001 → 코일 0, 410000 → 보유 9999, 465536 → 65535", () => {
  assert.deepEqual(fromPlc("40001"), { space: "hr", address: 0 });
  assert.deepEqual(fromPlc("30001"), { space: "ir", address: 0 });
  assert.deepEqual(fromPlc("00001"), { space: "co", address: 0 });
  assert.deepEqual(fromPlc("10017"), { space: "di", address: 16 });
  assert.deepEqual(fromPlc("410000"), { space: "hr", address: 9999 });
  assert.deepEqual(fromPlc("465536"), { space: "hr", address: 65535 });
  assert.equal(fromPlc("40000"), null); // 번호는 1 부터(§4.4)
  assert.equal(fromPlc("20001"), null); // 2 는 표가 아님
  assert.equal(fromPlc("465537"), null);
});

test("한 줄 읽기: 범위·2칸 값·표 이름 + 0 기준 주소(10진·0x·h)", () => {
  assert.deepEqual(parseItem("40001-40010"), { space: "hr", address: 0, count: 10, size: 1, text: "40001-40010" });
  assert.deepEqual(parseItem("30021*2"), { space: "ir", address: 20, count: 2, size: 2, text: "30021*2" });
  assert.deepEqual(parseItem("hr 100"), { space: "hr", address: 100, count: 1, size: 1, text: "hr 100" });
  assert.deepEqual(parseItem("IR 0x10*2"), { space: "ir", address: 16, count: 2, size: 2, text: "IR 0x10*2" });
  assert.deepEqual(parseItem("hr:2000h"), { space: "hr", address: 0x2000, count: 1, size: 1, text: "hr:2000h" });
  assert.deepEqual(parseItem("co 5-12"), { space: "co", address: 5, count: 8, size: 1, text: "co 5-12" });
  for (const bad of ["100", "40010-40001", "40001-30005", "hr 65535*2", "xx 1", "40001-40005*2"]) assert.throws(() => parseItem(bad), ParseError, bad);
  assert.equal(parseList("40001, 40003\n# 설명\n\n30001*2 # 전력").length, 3);
});

test("붙어 있는 것만 묶기(빈칸 0): 40001·40002·40003 → 하나, 40010 → 따로", () => {
  const r = plan(parseList("40001\n40002\n40003\n40010"), { maxQty: {}, maxGap: 0 });
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].start, r[0].qty, r[0].unused], [0, 3, 0]);
  assert.deepEqual([r[1].start, r[1].qty, r[1].unused], [9, 1, 0]);
});

test("빈칸 허용 10 이면 40001~40010 을 한 요청(10칸, 그중 6칸은 안 쓰는 칸)", () => {
  const r = plan(parseList("40001\n40002\n40003\n40010"), { maxQty: {}, maxGap: 10 });
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].fc, r[0].start, r[0].qty, r[0].unused], [3, 0, 10, 6]);
  assert.deepEqual(r[0].items, [0, 1, 2, 3]);
});

test("개수 한도: 보유 레지스터는 규격 125(§6.3), 장비 한도 50 이면 50씩", () => {
  assert.equal(SPEC_MAX.hr, 125);
  assert.equal(SPEC_MAX.co, 2000);
  const all = parseList("40001-40300");
  assert.deepEqual(plan(all, { maxQty: {}, maxGap: 0 }).map((r) => r.qty), [125, 125, 50]);
  assert.deepEqual(plan(all, { maxQty: { hr: 50 }, maxGap: 0 }).map((r) => r.qty), [50, 50, 50, 50, 50, 50]);
  // 규격보다 큰 한도는 규격 한도로
  assert.deepEqual(plan(all, { maxQty: { hr: 500 }, maxGap: 0 }).map((r) => r.qty), [125, 125, 50]);
});

test("2칸짜리 값은 쪼개지 않는다 — 한도 끝에 걸리면 다음 요청으로", () => {
  // 40001~40124(124칸) 다음 40125*2 → 126칸이 되므로 둘로
  const r = plan(parseList("40001-40124\n40125*2"), { maxQty: {}, maxGap: 0 });
  assert.deepEqual(r.map((x) => [x.start, x.qty]), [[0, 124], [124, 2]]);
  assert.throws(() => plan(parseList("40001*4"), { maxQty: { hr: 3 }, maxGap: 0 }), RangeError);
});

test("표마다 따로: 보유·입력·코일이 섞여도 함수 코드별 요청", () => {
  const r = plan(parseList("30001*2\n40001\n00001-00016\n30003*2\n40002"), { maxQty: {}, maxGap: 0 });
  assert.deepEqual(r.map((x) => [x.fc, x.start, x.qty]), [[1, 0, 16], [3, 0, 2], [4, 0, 4]]);
});

test("겹치는 항목(같은 주소 두 번)은 안 쓰는 칸 계산에서 한 번만", () => {
  const r = plan(parseList("40001*2\n40002\n40005"), { maxQty: {}, maxGap: 5 });
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].qty, r[0].unused], [5, 2]);
});

test("바이트·시간: 규격 §6.3 예(보유 3개 읽기)는 RTU 요청 8 + 응답 11 바이트, TCP 12 + 15", () => {
  const one = plan(parseList("40108-40110"), { maxQty: {}, maxGap: 0 });
  assert.deepEqual([one[0].start, one[0].qty], [107, 3]); // 규격 예: 시작 주소 0x006B, 개수 3
  const c = cost(one, 9600, RTU, 0);
  assert.equal(c.rtuBytes, 19);
  assert.equal(c.tcpBytes, 27);
  // 9600 bps·11비트: (19 바이트 × 11 비트) ÷ 9600 + t3.5(3.5 × 11 ÷ 9600)
  assert.ok(Math.abs(c.rtuCycle - (19 * 11 + 3.5 * 11) / 9600) < 1e-12);
});

test("묶으면 요청 수·시간이 준다: 보유 10개 따로(10요청) ↔ 하나", () => {
  const items = parseList("40001-40010");
  const sep = cost(onePerItem(items), 9600, RTU, 0.01);
  const tog = cost(plan(items, { maxQty: {}, maxGap: 0 }), 9600, RTU, 0.01);
  assert.equal(sep.requests, 10);
  assert.equal(tog.requests, 1);
  assert.equal(sep.rtuBytes, 10 * (8 + 7));
  assert.equal(tog.rtuBytes, 8 + 25);
  assert.ok(tog.rtuCycle < sep.rtuCycle / 5);
});

test("PLC 표기로 되돌리기", () => {
  assert.equal(plcText("hr", 0), "40001");
  assert.equal(plcText("ir", 9998), "39999");
  assert.equal(plcText("hr", 9999), "410000");
  assert.equal(plcText("co", 15), "00016");
});
