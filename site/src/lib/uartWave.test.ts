// node --test — UART 파형(lib/uartWave.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateBaud, frame, frameBits, parityBit, timing, toBytes } from "./uartWave.ts";

const v = (b: ReturnType<typeof frame>) => b.map((x) => x.v).join("");

test("'A'(0x41) 8N1: 시작 0, 데이터 LSB 먼저 1000 0010, 정지 1", () => {
  const f = frame(0x41, { dataBits: 8, parity: "none", stop: 1 });
  assert.equal(v(f), "0" + "10000010" + "1");
  assert.equal(f[1].n, 0);
  assert.equal(f.length, 10);
});

test("패리티: 0x41 은 1 이 두 개 → 짝수 0, 홀수 1; 0x07 7비트 → 짝수 1", () => {
  assert.equal(parityBit(0x41, 8, "even"), 0);
  assert.equal(parityBit(0x41, 8, "odd"), 1);
  assert.equal(parityBit(0x07, 7, "even"), 1);
  assert.equal(parityBit(0x00, 8, "mark"), 1);
  assert.equal(parityBit(0xff, 8, "space"), 0);
  // 8E1: 11 비트, 0x55 → 0 10101010 0 1
  assert.equal(v(frame(0x55, { dataBits: 8, parity: "even", stop: 1 })), "0101010100" + "1");
  // 7O2: 0x7F(1 일곱 개) → 홀수 패리티 0
  assert.equal(v(frame(0x7f, { dataBits: 7, parity: "odd", stop: 2 })), "0" + "1111111" + "0" + "11");
});

test("정지 1.5 비트: 프레임 9.5 비트(5N1.5)", () => {
  const f = frame(0x00, { dataBits: 5, parity: "none", stop: 1.5 });
  assert.equal(f[f.length - 1].w, 1.5);
  assert.equal(frameBits({ dataBits: 5, parity: "none", stop: 1.5 }), 7.5);
});

test("시간: 9600 8N1 → 비트 104.17 µs, 프레임 1.0417 ms, 960 글자/초", () => {
  const t = timing(9600, { dataBits: 8, parity: "none", stop: 1 });
  assert.ok(Math.abs(t.bit * 1e6 - 104.1667) < 1e-3);
  assert.ok(Math.abs(t.frame * 1e3 - 1.04167) < 1e-4);
  assert.ok(Math.abs(t.cps - 960) < 1e-9);
  // 115200 8E1: 11 비트 = 95.49 µs
  assert.ok(Math.abs(timing(115200, { dataBits: 8, parity: "even", stop: 1 }).frame * 1e6 - 95.486) < 1e-3);
});

test("펄스 폭 → 보율: 104 µs → 9600, 8.68 µs → 115200, 17.4 µs → 57600", () => {
  assert.equal(estimateBaud(104).std, 9600);
  assert.equal(estimateBaud(8.68).std, 115200);
  assert.equal(estimateBaud(17.4).std, 57600);
  assert.equal(estimateBaud(1).std, 1000000);
  const e = estimateBaud(104);
  assert.ok(Math.abs(e.errPct - 0.16) < 0.01);
  assert.throws(() => estimateBaud(0));
});

test("입력 → 바이트: 글자·이스케이프·HEX·UTF-8", () => {
  assert.deepEqual(toBytes("AB\\r\\n", false), [0x41, 0x42, 13, 10]);
  assert.deepEqual(toBytes("\\x02OK\\x03", false), [2, 0x4f, 0x4b, 3]);
  assert.deepEqual(toBytes("é", false), [0xc3, 0xa9]);
  assert.deepEqual(toBytes("41 0x42,0D", true), [0x41, 0x42, 0x0d]);
  assert.throws(() => toBytes("4", true));
});
