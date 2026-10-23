// 시리얼 통신 시간 — 문자 비트 수, t1.5·t3.5(19200 bps 넘으면 고정값), 프레임 길이, 폴링 시간
import { test } from "node:test";
import assert from "node:assert/strict";
import { bitsPerChar, bytesTime, fmtTime, frameBytes, isRtuFormat, poll, timing, type CharFormat } from "./serialTiming.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const E1: CharFormat = { dataBits: 8, parity: "even", stopBits: 1 };
const N1: CharFormat = { dataBits: 8, parity: "none", stopBits: 1 };
const N2: CharFormat = { dataBits: 8, parity: "none", stopBits: 2 };

test("문자 비트 수: 8E1·8N2 = 11(RTU 규격), 8N1 = 10, 7E1 = 10", () => {
  assert.equal(bitsPerChar(E1), 11);
  assert.equal(bitsPerChar(N2), 11);
  assert.equal(bitsPerChar(N1), 10);
  assert.equal(bitsPerChar({ dataBits: 7, parity: "even", stopBits: 1 }), 10);
  assert.ok(isRtuFormat(E1) && isRtuFormat(N2) && !isRtuFormat(N1));
});

test("9600 bps 8E1: 문자 1.1458 ms, t3.5 ≈ 4.01 ms, t1.5 ≈ 1.72 ms", () => {
  const t = timing(9600, E1);
  near(t.char, 11 / 9600);
  near(t.t35, (3.5 * 11) / 9600);
  near(t.t15, (1.5 * 11) / 9600);
  assert.equal(t.fixed, false);
  assert.equal(fmtTime(t.t35), "4.01 ms");
});

test("19200 까지는 문자 시간, 넘으면 750 µs·1.75 ms 고정", () => {
  const a = timing(19200, E1);
  near(a.t35, (3.5 * 11) / 19200);
  assert.equal(a.fixed, false);
  const b = timing(38400, E1);
  assert.equal(b.fixed, true);
  near(b.t15, 0.00075);
  near(b.t35, 0.00175);
  near(timing(115200, N2).t35, 0.00175);
});

test("프레임 길이(RTU, CRC 포함)", () => {
  assert.deepEqual(frameBytes(3, 2), { req: 8, res: 9 });
  assert.deepEqual(frameBytes(3, 125), { req: 8, res: 255 });
  assert.deepEqual(frameBytes(1, 10), { req: 8, res: 7 });
  assert.deepEqual(frameBytes(6, 1), { req: 8, res: 8 });
  assert.deepEqual(frameBytes(16, 2), { req: 13, res: 8 });
  assert.deepEqual(frameBytes(15, 9), { req: 11, res: 8 });
  assert.throws(() => frameBytes(3, 126));
  assert.throws(() => frameBytes(16, 124));
  assert.throws(() => frameBytes(3, 0));
});

test("9600 bps 에서 17 바이트는 약 19.5 ms (USB 지연 가이드의 예와 같음)", () => {
  near(bytesTime(17, 9600, E1), (17 * 11) / 9600);
  assert.equal(fmtTime(bytesTime(17, 9600, E1)), "19.479 ms");
});

test("폴링: FC03 10 레지스터, 9600 8E1, 슬레이브 10 ms, 장비 5 대", () => {
  const r = poll({ baud: 9600, format: E1, fc: 3, qty: 10, slaveDelay: 0.01, masterGap: 0, transactions: 5 });
  assert.equal(r.req, 8);
  assert.equal(r.res, 25);
  const c = 11 / 9600;
  near(r.reqTime, 8 * c);
  near(r.resTime, 25 * c);
  near(r.transaction, 8 * c + 0.01 + 25 * c + 3.5 * c);
  near(r.cycle, 5 * r.transaction);
  near(r.minTimeout, 0.01 + 25 * c);
  assert.ok(r.busUse > 0 && r.busUse < 1);
});

test("잘못된 입력", () => {
  assert.throws(() => timing(0, E1));
  assert.throws(() => poll({ baud: 9600, format: E1, fc: 3, qty: 1, slaveDelay: -1, masterGap: 0, transactions: 1 }));
  assert.throws(() => poll({ baud: 9600, format: E1, fc: 3, qty: 1, slaveDelay: 0, masterGap: 0, transactions: 0 }));
});

test("시간 보기", () => {
  assert.equal(fmtTime(0.00075), "750 µs");
  assert.equal(fmtTime(0.00175), "1.75 ms");
  assert.equal(fmtTime(1.5), "1.5 s");
});
