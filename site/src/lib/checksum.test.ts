// crates/core/src/checksum.rs · codec.rs 시험과 같은 값 — 웹 계산기와 프로그램이 같은 답을 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { compute, crc16Modbus, parseAscii, parseHex, toEscaped } from "./checksum.ts";

const CHECK = [..."123456789"].map((c) => c.charCodeAt(0));

test("표준 check 값(reveng)", () => {
  assert.equal(crc16Modbus(CHECK), 0x4b37);
  assert.deepEqual(compute("crc16-ccitt", CHECK), [0x29, 0xb1]);
  assert.deepEqual(compute("crc16-xmodem", CHECK), [0x31, 0xc3]);
  assert.deepEqual(compute("crc8", CHECK), [0xf4]);
});

test("Modbus 요청 CRC 는 낮은 바이트 먼저", () => {
  assert.deepEqual(compute("crc16-modbus", [0x01, 0x03, 0x00, 0x00, 0x00, 0x0a]), [0xc5, 0xcd]);
});

test("단순 합", () => {
  assert.deepEqual(compute("lrc", [0x01, 0x03, 0x00, 0x00, 0x00, 0x0a]), [0xf2]);
  assert.deepEqual(compute("bcc", [0x02, 0x41, 0x03]), [0x40]);
  assert.deepEqual(compute("sum8", [0xff, 0x02]), [0x01]);
  assert.deepEqual(compute("sum16", [0xff, 0x02]), [0x01, 0x01]);
});

test("HEX 입력 형식", () => {
  const want = [0x01, 0x03, 0x0a];
  assert.deepEqual(parseHex("01 03 0A"), want);
  assert.deepEqual(parseHex("01030a"), want);
  assert.deepEqual(parseHex("0x01,0x03,0x0A"), want);
  assert.throws(() => parseHex("013"));
  assert.throws(() => parseHex("0G"));
  assert.throws(() => parseHex("가나"));
  assert.throws(() => parseHex("01 é"));
});

test("ASCII 이스케이프", () => {
  assert.deepEqual(parseAscii("AT\\r\\n"), [0x41, 0x54, 13, 10]);
  assert.deepEqual(parseAscii("\\x02A\\x03"), [2, 0x41, 3]);
  assert.deepEqual(parseAscii("a\\"), [0x61, 0x5c]);
  assert.throws(() => parseAscii("\\xA"));
  assert.throws(() => parseAscii("\\q"));
  assert.deepEqual(parseAscii("가"), [0xea, 0xb0, 0x80]);
});

test("바이트 → 이스케이프 글자 → 같은 바이트", () => {
  const bytes = [0x02, 0x41, 0x5c, 0x0d, 0x0a, 0x00, 0x09, 0xff, 0x7e];
  const s = toEscaped(bytes);
  assert.equal(s, String.raw`\x02A\\\r\n\0\t\xFF~`);
  assert.deepEqual(parseAscii(s), bytes);
});
