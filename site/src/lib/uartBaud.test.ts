// UART 보율 오차 — ATmega328P 데이터시트 표 19-2·19-3·19-11·19-12 값과 맞춘다
import { test } from "node:test";
import assert from "node:assert/strict";
import { avrRange, avrUbrr, baudFor } from "./uartBaud.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const row = (f: number, b: number, os: number) => {
  const r = baudFor(f, b, os);
  return [avrUbrr(r), Math.round(r.errPct * 10) / 10];
};

test("표 19-12, 16 MHz U2X=0: 9600 → 103·0.2 %, 57.6k → 16·2.1 %, 115.2k → 8·−3.5 %, 250k → 3·0 %", () => {
  assert.deepEqual(row(16e6, 9600, 16), [103, 0.2]);
  assert.deepEqual(row(16e6, 57600, 16), [16, 2.1]);
  assert.deepEqual(row(16e6, 115200, 16), [8, -3.5]);
  assert.deepEqual(row(16e6, 250000, 16), [3, 0]);
  assert.deepEqual(row(16e6, 2400, 16), [416, -0.1]);
});

test("표 19-12, 16 MHz U2X=1: 115.2k → 16·2.1 %, 230.4k → 8·−3.5 %", () => {
  assert.deepEqual(row(16e6, 115200, 8), [16, 2.1]);
  assert.deepEqual(row(16e6, 230400, 8), [8, -3.5]);
});

test("표 19-11: 8 MHz 115.2k U2X=0 → 3·8.5 %, 11.0592 MHz 는 0 %", () => {
  assert.deepEqual(row(8e6, 115200, 16), [3, 8.5]);
  assert.deepEqual(row(11.0592e6, 115200, 16), [5, 0]);
  assert.deepEqual(row(14.7456e6, 230400, 16), [3, 0]);
});

test("표 19-2(U2X=0): D=8 → 95.36 %·104.58 %, D=5 → 93.20 %·106.67 %", () => {
  const a = avrRange(8);
  near(a.slow * 100, 95.36, 0.005);
  near(a.fast * 100, 104.58, 0.005);
  const b = avrRange(5);
  near(b.slow * 100, 93.2, 0.005);
  near(b.fast * 100, 106.67, 0.005);
});

test("표 19-3(U2X=1): D=8 → 96.00 %·103.90 %, D=10 → 96.70 %·103.23 %", () => {
  const a = avrRange(8, true);
  near(a.slow * 100, 96.0, 0.005);
  near(a.fast * 100, 103.9, 0.005);
  const b = avrRange(10, true);
  near(b.slow * 100, 96.7, 0.005);
  near(b.fast * 100, 103.23, 0.005);
});

test("분수 분주(소수 4비트): 72 MHz 115200 → 39.0625, 오차 0 %", () => {
  const r = baudFor(72e6, 115200, 16, 4);
  near(r.div, 39.0625, 1e-12);
  near(r.errPct, 0, 1e-9);
  const i = baudFor(72e6, 115200, 16, 0);
  assert.equal(i.div, 39);
  near(i.errPct, 0.16, 0.001);
});
