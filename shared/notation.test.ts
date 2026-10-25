// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/notation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertNotation, parseAsciiText, parseHexText, toAsciiText, toHexText } from "./notation.ts";

test("HEX → ASCII — 같은 바이트", () => {
  assert.equal(convertNotation("41 54 0D 0A", "hex", "ascii").text, "AT\\r\\n");
  assert.equal(convertNotation("01 03 5C 00 31 FF", "hex", "ascii").text, "\\x01\\x03\\\\\\x001\\xFF");
  assert.equal(convertNotation("0x41,0x42", "hex", "ascii").text, "AB");
});

test("ASCII → HEX — 같은 바이트", () => {
  assert.equal(convertNotation("AT\\r\\n", "ascii", "hex").text, "41 54 0D 0A");
  assert.equal(convertNotation("가", "ascii", "hex").text, "EA B0 80");
  assert.equal(convertNotation("\\0\\t", "ascii", "hex").text, "00 09");
});

test("왕복해도 바이트가 같다", () => {
  const all = Array.from({ length: 256 }, (_, i) => i);
  assert.deepEqual(parseAsciiText(toAsciiText(all)), all);
  assert.deepEqual(parseHexText(toHexText(all)), all);
});

test("못 읽으면 글자는 그대로", () => {
  const r = convertNotation("01 0G", "hex", "ascii");
  assert.equal(r.text, "01 0G");
  assert.ok(r.error);
  const r2 = convertNotation("\\q", "ascii", "hex");
  assert.equal(r2.text, "\\q");
  assert.ok(r2.error);
  assert.equal(convertNotation("", "hex", "ascii").text, "");
});
