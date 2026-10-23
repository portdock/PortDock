// ADC — Microchip AN693(DS00693A) 식 2·3·5와 본문 예, ATmega328P §23.7
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeToEng, codeToSig, codes, engToCode, enob, lsb, qRms, scale, snrIdeal, toCode, toVolt, type ScaleIn } from "./adc.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("AN693 본문 예: 4.096 V 기준, 12비트 → 1 LSb = 1 mV", () => {
  near(lsb(4.096, 12), 0.001, 1e-15);
  assert.equal(codes(12), 4096);
  assert.throws(() => lsb(0, 12));
  assert.throws(() => lsb(5, 0));
});

test("ATmega328P §23.7: 10비트 5 V 에서 2.5 V → 512, 끝은 0x3FF", () => {
  assert.equal(toCode(2.5, 5, 10), 512);
  assert.equal(toCode(5, 5, 10), 0x3ff);
  assert.equal(toCode(-1, 5, 10), 0);
  near(toVolt(1023, 5, 10), 5 - lsb(5, 10), 1e-12);
});

test("AN693 식 2·3·5: 양자화 실효값 LSB/√12, 12비트 최대 SNR 74.0 dB, SINAD 74 dB → ENOB 약 12", () => {
  near(qRms(4.096, 12), 0.001 / Math.sqrt(12), 1e-15);
  near(snrIdeal(12), 74.0, 1e-9);
  near(snrIdeal(10), 61.96, 1e-9);
  near(enob(snrIdeal(16)), 16, 1e-12);
});

const loop: ScaleIn = { sigLo: 4, sigHi: 20, k: 150, current: true, engLo: 0, engHi: 10, vref: 3.3, bits: 12 };

test("4–20 mA, 150 Ω 션트, 3.3 V 12비트, 0–10 bar: 0.6–3.0 V, 약 2979 카운트, 1카운트 ≈ 0.00336 bar", () => {
  const s = scale(loop);
  near(s.vLo, 0.6, 1e-12);
  near(s.vHi, 3.0, 1e-12);
  near(s.cLo, 0.6 / (3.3 / 4096), 1e-9);
  near(s.span, 2.4 / (3.3 / 4096), 1e-9);
  near(s.engPerCount, 10 / s.span, 1e-15);
  near(s.engPerCount, 0.003357, 1e-6);
  assert.equal(s.clipped, false);
  near(s.headroom, (0.3 / 3.3) * 100, 1e-9);
});

test("코드 ↔ 공학값 ↔ 신호 왕복, 범위 밖은 직선으로 늘림", () => {
  const s = scale(loop);
  near(codeToEng(loop, s.cLo), 0, 1e-12);
  near(codeToEng(loop, s.cHi), 10, 1e-12);
  near(codeToEng(loop, engToCode(loop, 6.5)), 6.5, 1e-12);
  near(codeToSig(loop, engToCode(loop, 5)), 12, 1e-12);
  assert.ok(codeToEng(loop, 0) < 0);
});

test("250 Ω 로 5 V 기준이면 20 mA 가 정확히 풀스케일 — 상한이 잘린다", () => {
  const s = scale({ ...loop, k: 250, vref: 5 });
  near(s.vHi, 5, 1e-12);
  assert.equal(s.clipped, true);
});

test("0–10 V 를 분압 0.3 으로 받아 3.3 V 12비트: 0–3 V, 3723.6 카운트", () => {
  const s = scale({ sigLo: 0, sigHi: 10, k: 0.3, current: false, engLo: 0, engHi: 100, vref: 3.3, bits: 12 });
  near(s.vHi, 3, 1e-12);
  near(s.cHi, 3723.636, 1e-3);
  near(s.sigPerCount, 10 / s.cHi, 1e-15);
  assert.throws(() => scale({ ...loop, sigHi: 4 }));
});
