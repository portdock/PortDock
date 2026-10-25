// IEEE 754 binary32·binary64 의 알려진 비트 패턴과 네 바이트 순서 — 웹 «Modbus 실수 변환기» 가 같은 답을 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeRegisters, encodeRegisters, encodeValue, formatFloat, parseRegisters, regHex, reorder } from "./modbusFloat.ts";

test("레지스터 입력 형식", () => {
  const want = [0x41c8, 0x0000];
  assert.deepEqual(parseRegisters("41C8 0000", "hex"), want);
  assert.deepEqual(parseRegisters("41c80000", "hex"), want);
  assert.deepEqual(parseRegisters("0x41C8, 0x0", "hex"), want);
  assert.deepEqual(parseRegisters("16840 0", "dec"), want);
  assert.deepEqual(parseRegisters("-1 -32768", "dec"), [0xffff, 0x8000]);
  assert.equal(parseRegisters("3FF0 0 0 0", "hex").length, 4);
  assert.throws(() => parseRegisters("41C8", "hex"));
  assert.throws(() => parseRegisters("41C80", "hex"));
  assert.throws(() => parseRegisters("41G8 0000", "hex"));
  assert.throws(() => parseRegisters("65536 0", "dec"));
  assert.throws(() => parseRegisters("1.5 0", "dec"));
  assert.throws(() => parseRegisters("", "hex"));
});

test("25.0 = 0x41C80000 — 네 순서", () => {
  assert.equal(decodeRegisters([0x41c8, 0x0000], "ABCD").float, 25);
  assert.equal(decodeRegisters([0x0000, 0x41c8], "CDAB").float, 25);
  assert.equal(decodeRegisters([0xc841, 0x0000], "BADC").float, 25);
  assert.equal(decodeRegisters([0x0000, 0xc841], "DCBA").float, 25);
});

test("순서 바꾸기는 두 번 하면 제자리", () => {
  const b = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(reorder(b.slice(0, 4), "DCBA"), [4, 3, 2, 1]);
  assert.deepEqual(reorder(b.slice(0, 4), "CDAB"), [3, 4, 1, 2]);
  assert.deepEqual(reorder(b.slice(0, 4), "BADC"), [2, 1, 4, 3]);
  assert.deepEqual(reorder(b, "CDAB"), [7, 8, 5, 6, 3, 4, 1, 2]);
  assert.deepEqual(reorder(b, "DCBA"), [8, 7, 6, 5, 4, 3, 2, 1]);
  for (const o of ["ABCD", "CDAB", "BADC", "DCBA"] as const) assert.deepEqual(reorder(reorder(b, o), o), b);
});

test("정수 해석", () => {
  const d = decodeRegisters([0xffff, 0xfffe], "ABCD");
  assert.equal(d.int, -2n);
  assert.equal(d.uint, 0xfffffffen);
  assert.equal(decodeRegisters([0x5678, 0x1234], "CDAB").uint, 0x12345678n);
  assert.equal(decodeRegisters([0xffff, 0xffff, 0xffff, 0xffff], "ABCD").int, -1n);
});

test("float64 1.0 = 0x3FF0000000000000", () => {
  assert.equal(decodeRegisters([0x3ff0, 0, 0, 0], "ABCD").float, 1);
  assert.equal(decodeRegisters([0, 0, 0, 0x3ff0], "CDAB").float, 1);
  assert.equal(regHex(encodeRegisters("1", "float64", "CDAB")), "0000 0000 0000 3FF0");
});

test("값 → 레지스터", () => {
  assert.equal(regHex(encodeRegisters("25", "float32", "ABCD")), "41C8 0000");
  assert.equal(regHex(encodeRegisters("25", "float32", "CDAB")), "0000 41C8");
  assert.equal(regHex(encodeRegisters("25", "float32", "BADC")), "C841 0000");
  assert.equal(regHex(encodeRegisters("25", "float32", "DCBA")), "0000 C841");
  assert.equal(regHex(encodeRegisters("0.1", "float32", "ABCD")), "3DCC CCCD");
  assert.equal(regHex(encodeRegisters("-1", "int32", "ABCD")), "FFFF FFFF");
  assert.equal(regHex(encodeRegisters("305419896", "uint32", "CDAB")), "5678 1234");
  assert.throws(() => encodeValue("4294967296", "uint32"));
  assert.throws(() => encodeValue("-1", "uint32"));
  assert.throws(() => encodeValue("1.5", "int32"));
  assert.throws(() => encodeValue("abc", "float32"));
});

test("float32 표기는 되돌렸을 때 같은 가장 짧은 수", () => {
  assert.equal(formatFloat(decodeRegisters([0x3dcc, 0xcccd], "ABCD").float, 4), "0.1");
  assert.equal(formatFloat(decodeRegisters([0x4049, 0x0fdb], "ABCD").float, 4), "3.1415927");
  assert.equal(formatFloat(decodeRegisters([0x7fc0, 0x0000], "ABCD").float, 4), "NaN");
  assert.equal(formatFloat(decodeRegisters([0xff80, 0x0000], "ABCD").float, 4), "-Infinity");
});
