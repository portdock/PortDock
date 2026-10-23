// RS-485 바이어스·종단 — 유휴 차동 전압(분압), 200 mV 문턱, 길이 한계
import { test } from "node:test";
import assert from "node:assert/strict";
import { bias, maxBiasR, maxStub, roughMaxLength, termPowerDriven } from "./rs485.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("5 V · 560 Ω · 양 끝 150 Ω → 75 Ω, 약 0.314 V", () => {
  const r = bias({ vcc: 5, rUp: 560, rDown: 560, ends: ["r", "r"], rTerm: 150 });
  near(r.rLine, 75);
  near(r.vIdle, (5 * 75) / (560 + 75 + 560));
  assert.equal(r.ok, true);
  near(r.iBias, 5 / 1195);
  near(r.pUp, r.iBias ** 2 * 560);
});

test("3.3 V · 560 Ω · 양 끝 120 Ω → 0.168 V 로 문턱 미달", () => {
  const r = bias({ vcc: 3.3, rUp: 560, rDown: 560, ends: ["r", "r"], rTerm: 120 });
  near(r.vIdle, (3.3 * 60) / 1180);
  assert.equal(r.ok, false);
});

test("한쪽 끝만 종단·RC 종단·종단 없음", () => {
  near(bias({ vcc: 5, rUp: 650, rDown: 650, ends: ["r", "none"], rTerm: 120 }).rLine, 120);
  const rc = bias({ vcc: 5, rUp: 650, rDown: 650, ends: ["rc", "rc"], rTerm: 120 });
  assert.equal(rc.rLine, Infinity);
  assert.equal(rc.vIdle, 5);
  assert.equal(rc.iBias, 0);
  near(bias({ vcc: 5, rUp: 650, rDown: 650, ends: ["r", "rc"], rTerm: 120 }).rLine, 120);
});

test("200 mV 를 만드는 최대 바이어스 저항", () => {
  const R = maxBiasR(5, 60);
  near(R, (5 * 60 / 0.2 - 60) / 2);
  near(bias({ vcc: 5, rUp: R, rDown: R, ends: ["r", "r"], rTerm: 120 }).vIdle, 0.2);
  assert.equal(maxBiasR(5, Infinity), Infinity);
});

test("길이: 9600 bps → 1200 m, 115200 bps → 약 868 m, 가지선 20 m·40/n", () => {
  assert.equal(roughMaxLength(9600), 1200);
  near(roughMaxLength(115200), 1e8 / 115200);
  near(roughMaxLength(1e6), 100);
  assert.equal(maxStub(1), 20);
  assert.equal(maxStub(4), 10);
  near(termPowerDriven(2, 120), 4 / 120);
});
