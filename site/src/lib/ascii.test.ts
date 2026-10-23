// ASCII — RFC 20 §2 코드표·§4.1 제어 문자
import { test } from "node:test";
import assert from "node:assert/strict";
import { ASCII, filterAscii, hex2, isControl } from "./ascii.ts";

test("128칸, 제어 문자 33개(0x00~0x1F, 0x7F)", () => {
  assert.equal(ASCII.length, 128);
  assert.equal(ASCII.filter((r) => isControl(r.code)).length, 33);
});

test("RFC 20 코드표 칸: STX 0x02, ETX 0x03, ACK 0x06, LF 0x0A, CR 0x0D, NAK 0x15, ESC 0x1B, DEL 0x7F", () => {
  const at = (s: string) => ASCII.find((r) => r.sym === s)!.code;
  assert.equal(at("STX"), 0x02);
  assert.equal(at("ETX"), 0x03);
  assert.equal(at("ENQ"), 0x05);
  assert.equal(at("ACK"), 0x06);
  assert.equal(at("LF"), 0x0a);
  assert.equal(at("CR"), 0x0d);
  assert.equal(at("DC1"), 0x11);
  assert.equal(at("DC3"), 0x13);
  assert.equal(at("NAK"), 0x15);
  assert.equal(at("ESC"), 0x1b);
  assert.equal(at("US"), 0x1f);
  assert.equal(at("DEL"), 0x7f);
  assert.equal(at("SP"), 0x20);
});

test("글자 칸: '0' = 0x30, 'A' = 0x41, 'a' = 0x61, '~' = 0x7E", () => {
  assert.equal(ASCII[0x30].sym, "0");
  assert.equal(ASCII[0x41].sym, "A");
  assert.equal(ASCII[0x61].sym, "a");
  assert.equal(ASCII[0x7e].sym, "~");
  assert.equal(hex2(10), "0A");
});

test("캐럿 표기: ^@ = NUL, ^M = CR, ^[ = ESC, ^? = DEL", () => {
  assert.equal(ASCII[0].caret, "^@");
  assert.equal(ASCII[13].caret, "^M");
  assert.equal(ASCII[27].caret, "^[");
  assert.equal(ASCII[127].caret, "^?");
});

test("찾기: 글자·10진·HEX·약어·이름", () => {
  assert.deepEqual(filterAscii("A").map((r) => r.code), [65]);
  assert.deepEqual(filterAscii("7").map((r) => r.code), [7, 0x37]);
  assert.deepEqual(filterAscii("0x0D").map((r) => r.code), [13]);
  assert.deepEqual(filterAscii("0Dh").map((r) => r.code), [13]);
  assert.deepEqual(filterAscii("stx").map((r) => r.code), [2]);
  assert.ok(filterAscii("65").some((r) => r.code === 65));
  assert.ok(filterAscii("65").some((r) => r.code === 0x65));
  assert.ok(filterAscii("acknowledge").some((r) => r.code === 6));
  assert.ok(filterAscii("\\n").some((r) => r.code === 10));
  assert.equal(filterAscii("").length, 128);
});
