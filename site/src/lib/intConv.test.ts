// 정수 변환 — 2의 보수·BCD·그레이 코드 정의, Modbus 레지스터 바이트 순서
import { test } from "node:test";
import assert from "node:assert/strict";
import { bcdDecode, bcdEncode, fromGray, fromWire, parseBits, signed, toBin, toGray, toHex, toWire, view } from "./intConv.ts";

test("2의 보수: 16비트 FFFF = −1, 8000 = −32768, 7FFF = 32767, 8비트 80 = −128", () => {
  assert.equal(signed(0xffff, 16), -1);
  assert.equal(signed(0x8000, 16), -32768);
  assert.equal(signed(0x7fff, 16), 32767);
  assert.equal(signed(0x80, 8), -128);
  assert.equal(signed(0xfffffffe, 32), -2);
});

test("10진 음수 입력은 2의 보수 패턴으로, 범위 밖은 오류", () => {
  assert.equal(parseBits("-1", "dec", 16), 0xffff);
  assert.equal(parseBits("-32768", "dec", 16), 0x8000);
  assert.equal(parseBits("65535", "dec", 16), 0xffff);
  assert.throws(() => parseBits("65536", "dec", 16));
  assert.throws(() => parseBits("-32769", "dec", 16));
  assert.equal(parseBits("-1", "dec", 32), 0xffffffff);
  assert.equal(parseBits("4294967295", "dec", 32), 0xffffffff);
});

test("HEX·2진 입력: 0x, h 접미사, 띄어쓰기·밑줄", () => {
  assert.equal(parseBits("0x01F4", "hex", 16), 500);
  assert.equal(parseBits("1F4h", "hex", 16), 500);
  assert.equal(parseBits("0000 0001 1111 0100", "bin", 16), 500);
  assert.equal(parseBits("0b1111_0100", "bin", 8), 0xf4);
  assert.throws(() => parseBits("1G", "hex", 16));
  assert.throws(() => parseBits("1FF", "hex", 8));
});

test("표기: HEX 자리 채움, 2진 4비트 띄움", () => {
  assert.equal(toHex(0x1f4, 16), "01F4");
  assert.equal(toBin(0x1f4, 16), "0000 0001 1111 0100");
  assert.equal(toHex(0xff, 32), "000000FF");
});

test("BCD: 1234 ↔ 0x1234, 9 를 넘는 자리가 있으면 BCD 아님", () => {
  assert.equal(bcdEncode(1234), 0x1234);
  assert.equal(bcdDecode(0x1234, 16), 1234);
  assert.equal(bcdDecode(0x12a4, 16), undefined);
  assert.equal(bcdEncode(99999999), 0x99999999);
  assert.equal(bcdEncode(100000000), undefined);
  assert.equal(parseBits("9999", "bcd", 16), 0x9999);
  assert.throws(() => parseBits("10000", "bcd", 16));
});

test("그레이 코드: 0~7 → 0,1,3,2,6,7,5,4, 되돌리면 같은 값", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(toGray), [0, 1, 3, 2, 6, 7, 5, 4]);
  for (const b of [0, 1, 5, 255, 0x1234, 0xffff, 0xdeadbeef]) assert.equal(fromGray(toGray(b)), b >>> 0);
});

test("바이트 순서: 0x41C80000 을 CDAB 로 보내면 00 00 41 C8, 되돌리면 같은 값", () => {
  assert.deepEqual(toWire(0x41c80000, 32, "ABCD"), [0x41, 0xc8, 0x00, 0x00]);
  assert.deepEqual(toWire(0x41c80000, 32, "CDAB"), [0x00, 0x00, 0x41, 0xc8]);
  assert.deepEqual(toWire(0x41c80000, 32, "BADC"), [0xc8, 0x41, 0x00, 0x00]);
  assert.deepEqual(toWire(0x41c80000, 32, "DCBA"), [0x00, 0x00, 0xc8, 0x41]);
  for (const o of ["ABCD", "CDAB", "BADC", "DCBA"] as const) assert.equal(fromWire(toWire(0x12345678, 32, o), o), 0x12345678);
  assert.equal(fromWire([0x01, 0xf4], "AB"), 500);
  assert.equal(fromWire([0x01, 0xf4], "BA"), 0xf401);
});

test("한 번에 보기", () => {
  const v = view(0xfe0c, 16);
  assert.equal(v.signed, -500);
  assert.equal(v.unsigned, 65036);
  assert.equal(v.bcd, undefined);
  assert.equal(view(0x0500, 16).bcd, 500);
});
