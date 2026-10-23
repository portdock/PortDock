// NTC — B 정수 식(TDK 식 1·3), Steinhart–Hart(1968), 분압·ADC(ATmega328P §23.7)
import { test } from "node:test";
import assert from "node:assert/strict";
import { adcCode, adcVolt, betaFrom, betaR, betaT, divider, lsb, ntcFromV, selfHeat, shFit, shR, shT } from "./ntc.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("B 식: 정격 온도에서는 정격 저항, 10 kΩ B3950 → 0 °C 약 33.62 kΩ", () => {
  near(betaR(10000, 3950, 25, 25), 10000, 1e-9);
  near(betaR(10000, 3950, 25, 0), 33620, 5);
  assert.ok(betaR(10000, 3950, 25, 100) < 10000);
});

test("B 식 왕복: 온도 → 저항 → 온도", () => {
  for (const t of [-40, 0, 25, 60, 125]) near(betaT(10000, 3988, 25, betaR(10000, 3988, 25, t)), t, 1e-9);
});

test("B 값 되찾기(B25/100): 두 점의 저항으로 같은 B", () => {
  const r100 = betaR(10000, 3988, 25, 100);
  near(betaFrom(10000, 25, r100, 100), 3988, 1e-6);
});

test("Steinhart–Hart: 세 점을 그대로 지나고, 저항 ↔ 온도가 왕복", () => {
  const pts: [number, number][] = [
    [0, 32650],
    [25, 10000],
    [50, 3603],
  ];
  const sh = shFit(pts);
  for (const [t, r] of pts) near(shT(sh, r), t, 1e-9);
  for (const t of [-20, 10, 40, 80]) near(shT(sh, shR(sh, t)), t, 1e-6);
  assert.ok(sh.a > 0 && sh.b > 0);
});

test("Steinhart–Hart 는 B 식이 만든 점도 잘 따라간다(가운데 온도에서 0.1 K 안)", () => {
  const pts: [number, number][] = [0, 25, 50].map((t) => [t, betaR(10000, 3950, 25, t)]);
  const sh = shFit(pts);
  near(shT(sh, betaR(10000, 3950, 25, 37)), 37, 0.1);
  assert.throws(() => shFit([[0, 1], [1, 1], [2, 3]]));
});

test("분압과 되찾기: 3.3 V, 위 10 kΩ, 아래 NTC 10 kΩ → 1.65 V", () => {
  near(divider(3.3, 10000, 10000), 1.65, 1e-12);
  near(ntcFromV(3.3, 10000, 1.65, false), 10000, 1e-9);
  near(ntcFromV(3.3, 10000, divider(3.3, 4700, 10000), true), 4700, 1e-9);
  assert.throws(() => ntcFromV(3.3, 10000, 3.3, false));
});

test("ADC: 10비트 V_REF 5 V 에서 2.5 V → 512, 0x3FF 가 끝, 1 LSB ≈ 4.88 mV", () => {
  assert.equal(adcCode(2.5, 5, 10), 512);
  assert.equal(adcCode(5, 5, 10), 1023);
  assert.equal(adcCode(-0.1, 5, 10), 0);
  near(lsb(5, 10), 0.0048828125, 1e-15);
  near(adcVolt(512, 5, 10), 2.5, 1e-12);
  assert.equal(adcCode(1.65, 3.3, 12), 2048);
});

test("자기 발열: 1.65 V, 10 kΩ(0.272 mW), δth 1.5 mW/K → 약 0.18 K", () => {
  near(selfHeat(1.65, 10000, 1.5), 0.1815, 1e-4);
});
