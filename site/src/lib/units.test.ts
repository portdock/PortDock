// 단위 변환 — 정의값에서 만든 계수가 NIST SP 811 부록 B 표의 값(표에 적힌 자리까지)과 같은지
import { test } from "node:test";
import assert from "node:assert/strict";
import { ATM, absToGauge, convert, convertAll, fmt, gaugeToAbs, unit } from "./units.ts";

/** 유효 숫자 n 자리까지 같은지 */
const sig = (a: number, b: number, n: number) => assert.equal(Number(a.toPrecision(n)), Number(b.toPrecision(n)), `${a} ≠ ${b} (${n} 자리)`);
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test("압력: NIST SP 811 B.8 값(Pa)", () => {
  near(unit("pressure", "bar").f, 1e5);
  near(unit("pressure", "atm").f, 101325);
  near(unit("pressure", "kgfcm2").f, 98066.5);
  near(unit("pressure", "mmH2O").f, 9.80665);
  sig(unit("pressure", "psi").f, 6894.757, 7);
  sig(unit("pressure", "inH2O").f, 249.0889, 7);
  sig(unit("pressure", "mmHg").f, 133.3224, 7);
  sig(unit("pressure", "inHg").f, 3386.389, 7);
  sig(unit("pressure", "torr").f, 133.3224, 7);
});

test("압력: 자주 쓰는 환산", () => {
  sig(convert("pressure", 1, "psi", "bar"), 0.0689475729, 9);
  sig(convert("pressure", 1, "bar", "psi"), 14.5037738, 9);
  sig(convert("pressure", 1, "kgfcm2", "bar"), 0.980665, 6);
  near(convert("pressure", 1, "mH2O", "kPa"), 9.80665);
  near(convert("pressure", 1000, "mmH2O", "mH2O"), 1);
  near(convert("pressure", 1, "atm", "kPa"), 101.325);
  near(convert("pressure", 760, "torr", "atm"), 1);
});

test("게이지·절대 압력", () => {
  near(gaugeToAbs(5e5), 5e5 + ATM);
  near(absToGauge(ATM), 0);
  near(gaugeToAbs(-50e3, 95e3), 45e3);
});

test("유량: NIST SP 811 B.8 값(m³/s)", () => {
  sig(unit("flow", "gpmUS").f, 6.30902e-5, 7);
  sig(unit("flow", "cfm").f, 4.719474e-4, 7);
  sig(convert("flow", 1, "gpmUK", "Lmin"), 4.54609, 6);
  near(convert("flow", 1, "m3h", "Lmin"), 1000 / 60);
  sig(convert("flow", 1, "gpmUS", "Lmin"), 3.785411784, 10);
});

test("토크: NIST SP 811 B.8 값(N·m)", () => {
  near(unit("torque", "kgfm").f, 9.80665);
  sig(unit("torque", "lbfft").f, 1.355818, 7);
  sig(unit("torque", "lbfin").f, 0.1129848, 7);
  sig(unit("torque", "ozfin").f, 7.061552e-3, 7);
  near(convert("torque", 100, "kgfcm", "kgfm"), 1);
});

test("전력: NIST SP 811 B.8 값(W)", () => {
  sig(unit("power", "hp").f, 745.6999, 7);
  near(unit("power", "PS").f, 735.49875); // NIST 표 735.4988 = 75 × 9.806 65 를 반올림
  near(unit("power", "hpE").f, 746);
  sig(unit("power", "btuh").f, 0.2930711, 7);
  sig(unit("power", "RT").f, 3516.853, 7);
  near(unit("power", "kcalh").f, 1.163);
  sig(convert("power", 1, "kW", "hp"), 1.34102209, 9);
});

test("온도: 눈금 값과 차이", () => {
  near(convert("temperature", 100, "C", "F"), 212);
  near(convert("temperature", -40, "F", "C"), -40);
  near(convert("temperature", 0, "C", "K"), 273.15);
  near(convert("temperature", 0, "K", "R"), 0);
  near(convert("temperature", 32, "F", "R"), 491.67);
  near(convert("temperature", 10, "C", "F", true), 18);
  assert.throws(() => convert("temperature", -300, "C", "K"));
});

test("convertAll·fmt", () => {
  const all = convertAll("pressure", 1, "bar");
  near(all.find((x) => x.u.id === "kPa")!.v, 100);
  assert.equal(fmt(14.503773773), "14.5038");
  assert.equal(fmt(100000), "100000");
  assert.equal(fmt(0.0000001), "1e-7");
  assert.equal(fmt(0), "0");
  assert.throws(() => convert("pressure", NaN, "bar", "psi"));
  assert.throws(() => unit("pressure", "nope"));
});
