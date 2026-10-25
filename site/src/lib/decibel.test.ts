// 데시벨 — ITU-R V.574-5 정의(dBm = 1 mW, dBW = 1 W, dBu = 600 Ω 에서 1 mW 인 전압), 잘 알려진 대응값
import { test } from "node:test";
import assert from "node:assert/strict";
import { DBU_REF, NP_DB, ampDb, chain, dbToAmp, dbToPower, dbmToDbuvOffset, infText, levels, powerDb, toWatts } from "./decibel.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("비 ↔ dB: 2배 전력 ≈ 3.01 dB, 2배 전압 ≈ 6.02 dB, 10배 = 10·20 dB", () => {
  near(powerDb(2), 3.0103, 1e-4);
  near(ampDb(2), 6.0206, 1e-4);
  near(powerDb(10), 10);
  near(ampDb(10), 20);
  near(dbToPower(-3), 0.501187, 1e-6);
  near(dbToAmp(-6), 0.501187, 1e-6);
  assert.throws(() => powerDb(0));
});

test("1 Np ≈ 8.686 dB (ITU-R V.574 §3)", () => {
  near(NP_DB, 8.686, 1e-3);
});

test("dBm·dBW·W: 0 dBm = 1 mW, 30 dBm = 1 W = 0 dBW, −30 dBm = 1 µW", () => {
  near(toWatts(0, "dBm", 50), 1e-3);
  near(toWatts(30, "dBm", 50), 1, 1e-12);
  near(levels(1, 50).dBW, 0);
  near(levels(1, 50).dBm, 30);
  near(levels(1e-6, 50).dBm, -30);
  near(levels(toWatts(20, "dBm", 50), 50).mW, 100, 1e-9);
});

test("50 Ω: 0 dBm = 약 223.6 mV = 약 107 dBµV", () => {
  const l = levels(1e-3, 50);
  near(l.V, Math.sqrt(0.05));
  near(l.mV, 223.607, 1e-3);
  near(l.dBuV, 106.9897, 1e-4);
  near(dbmToDbuvOffset(50), 106.9897, 1e-4);
  near(dbmToDbuvOffset(75), 108.7506, 1e-4);
});

test("600 Ω: 0 dBm = 0 dBu (V.574 §6.5), dBu 기준 ≈ 0.775 V", () => {
  near(DBU_REF, 0.7746, 1e-4);
  near(levels(1e-3, 600).dBu, 0, 1e-12);
  // 600 Ω 이 아니면 Lu = Lp + 10 lg(R/600)
  near(levels(1e-3, 50).dBu, 10 * Math.log10(50 / 600), 1e-12);
  // dBV 와 dBu 차이 ≈ 2.218 dB
  near(levels(1, 600).dBu - levels(1, 600).dBV, 2.2185, 1e-4);
});

test("전압 입력 → 전력: 1 V rms 를 50 Ω 에 → 20 mW ≈ 13.01 dBm, 0 dBV = 120 dBµV", () => {
  near(toWatts(1, "V", 50), 0.02);
  near(levels(toWatts(1, "V", 50), 50).dBm, 13.0103, 1e-4);
  near(levels(toWatts(0, "dBV", 50), 50).dBuV, 120, 1e-9);
  near(toWatts(1000, "mV", 50), 0.02);
  assert.throws(() => toWatts(-1, "V", 50));
  assert.throws(() => toWatts(1, "V", 0));
});

test("직렬 합: +20 dB 증폭, −6 dB 케이블, −3 dB 분배 = +11 dB", () => {
  near(chain([20, -6, -3]), 11);
});

test("무한대 표시: 0 W 는 «−∞», 넘친 값은 «+∞»(−∞ 로 잘못 나오지 않게), 너무 큰 레벨 입력은 거부", () => {
  assert.equal(infText(levels(0, 50).dBm), "−∞");
  assert.equal(infText(Infinity), "+∞");
  assert.equal(infText(12.5), undefined);
  assert.equal(infText(dbToPower(4000)), "+∞");
  assert.throws(() => toWatts(4000, "dBm", 50), RangeError);
  assert.equal(infText(levels(1e300, 1e300).dBuV), "+∞");
});
