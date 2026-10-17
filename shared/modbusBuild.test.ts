// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/modbusBuild.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRequest, convertAddrText, packBits, parseAddr, parseValues } from "./modbusBuild.ts";

const hex = (b) => b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");
const req = (o) => buildRequest({ slave: 1, fc: 3, addrText: "0", addrMode: "zero", qty: 1, valuesText: "", ...o }, "en");

test("FC03 40001 × 10 → 01 03 00 00 00 0A", () => {
  const r = req({ fc: 3, addrText: "40001", addrMode: "plc", qty: 10 });
  assert.equal(r.error, null);
  assert.equal(hex(r.bytes), "01 03 00 00 00 0A");
  assert.match(r.note, /40001 → 0-based 0/);
});

test("PLC 표기 — 함수별 앞자리", () => {
  assert.equal(parseAddr("30001", 4, "plc").addr, 0);
  assert.equal(parseAddr("10001", 2, "plc").addr, 0);
  assert.equal(parseAddr("00001", 1, "plc").addr, 0);
  assert.equal(parseAddr("1", 5, "plc").addr, 0);
  assert.equal(parseAddr("400001", 3, "plc").addr, 0);
  assert.equal(parseAddr("465536", 16, "plc").addr, 65535);
  assert.equal(parseAddr("40100", 6, "plc").addr, 99);
  // 다른 표의 앞자리
  assert.match(parseAddr("30001", 3, "plc", "en").error, /3xxxx/);
  assert.match(parseAddr("40001", 4, "plc", "en").error, /4xxxx/);
  assert.notEqual(parseAddr("1", 3, "plc").error, null);
  assert.notEqual(parseAddr("20001", 3, "plc").error, null);
  assert.notEqual(parseAddr("40000", 3, "plc").error, null);
  assert.notEqual(parseAddr("1234567", 3, "plc").error, null);
});

test("0 기준 주소 — 10진수·0x", () => {
  assert.equal(parseAddr("0x10", 3, "zero").addr, 16);
  assert.equal(parseAddr("65535", 3, "zero").addr, 65535);
  assert.notEqual(parseAddr("65536", 3, "zero").error, null);
  assert.notEqual(parseAddr("abc", 3, "zero").error, null);
  assert.notEqual(parseAddr("", 3, "zero").error, null);
});

test("FC06 레지스터 하나 쓰기", () => {
  assert.equal(hex(req({ fc: 6, addrText: "1", valuesText: "0x1234" }).bytes), "01 06 00 01 12 34");
  // 음수는 2의 보수
  assert.equal(hex(req({ fc: 6, addrText: "1", valuesText: "-1" }).bytes), "01 06 00 01 FF FF");
  assert.notEqual(req({ fc: 6, valuesText: "1 2" }).error, null);
  assert.notEqual(req({ fc: 6, valuesText: "70000" }).error, null);
});

test("FC10 바이트 수 = 값 × 2", () => {
  const r = req({ fc: 16, slave: 17, addrText: "1", valuesText: "0x000A, 0x0102" });
  assert.equal(hex(r.bytes), "11 10 00 01 00 02 04 00 0A 01 02");
  assert.equal(r.qty, 2);
  assert.notEqual(req({ fc: 16, valuesText: Array(124).fill(1).join(" ") }).error, null);
  assert.equal(req({ fc: 16, valuesText: Array(123).fill(1).join(" ") }).error, null);
});

test("FC0F 비트 묶기 LSB first (규격 예: 코일 20~29 = CD 01)", () => {
  assert.deepEqual(packBits([1, 0, 1, 1, 0, 0, 1, 1, 1, 0]), [0xcd, 0x01]);
  const r = req({ fc: 15, slave: 17, addrText: "19", valuesText: "1 0 1 1 0 0 1 1 1 0" });
  assert.equal(hex(r.bytes), "11 0F 00 13 00 0A 02 CD 01");
  assert.notEqual(req({ fc: 15, valuesText: "1 2" }).error, null);
  assert.notEqual(req({ fc: 15, valuesText: Array(1969).fill(1).join(",") }).error, null);
});

test("FC05 ON = FF00, OFF = 0000", () => {
  assert.equal(hex(req({ fc: 5, slave: 17, addrText: "172", valuesText: "1" }).bytes), "11 05 00 AC FF 00");
  assert.equal(hex(req({ fc: 5, addrText: "0", valuesText: "OFF" }).bytes), "01 05 00 00 00 00");
  assert.equal(hex(req({ fc: 5, addrText: "0", valuesText: "on" }).bytes), "01 05 00 00 FF 00");
});

test("범위 오류 — 국번·개수·끝 주소", () => {
  assert.notEqual(req({ slave: 248 }).error, null);
  assert.notEqual(req({ slave: 0, fc: 3 }).error, null); // 읽기는 브로드캐스트 불가
  assert.equal(req({ slave: 0, fc: 6, valuesText: "1" }).error, null); // 쓰기는 브로드캐스트 허용
  assert.notEqual(req({ fc: 3, qty: 126 }).error, null);
  assert.equal(req({ fc: 3, qty: 125 }).error, null);
  assert.equal(req({ fc: 1, qty: 2000 }).error, null);
  assert.notEqual(req({ fc: 2, qty: 2001 }).error, null);
  assert.notEqual(req({ fc: 3, qty: 0 }).error, null);
  assert.match(req({ fc: 3, addrText: "65530", qty: 10 }).error, /65535/);
});

test("표기·함수를 바꿔도 같은 주소", () => {
  assert.equal(convertAddrText("0", { fc: 3, mode: "zero" }, { fc: 3, mode: "plc" }), "40001");
  assert.equal(convertAddrText("40010", { fc: 3, mode: "plc" }, { fc: 4, mode: "plc" }), "30010");
  assert.equal(convertAddrText("40010", { fc: 3, mode: "plc" }, { fc: 1, mode: "plc" }), "00010");
  assert.equal(convertAddrText("12000", { fc: 3, mode: "zero" }, { fc: 3, mode: "plc" }), "412001");
  assert.equal(convertAddrText("400100", { fc: 3, mode: "plc" }, { fc: 3, mode: "zero" }), "99");
  assert.equal(convertAddrText("x", { fc: 3, mode: "zero" }, { fc: 3, mode: "plc" }), "x");
});

test("값 칸 해석", () => {
  assert.deepEqual(parseValues("1, 0x10 ; 300", 16).values, [1, 16, 300]);
  assert.notEqual(parseValues("1 x", 16).error, null);
  assert.notEqual(parseValues("", 16).error, null);
});
