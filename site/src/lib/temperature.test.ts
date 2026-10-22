// 알려진 값 — 측온저항체는 IEC 60751 표 값, 열전대는 NIST ITS-90 표(its90.nist.gov/downloadFiles/type_?.tab.txt, 0.001 mV)에서 직접 옮긴 값
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixed, rtdResistance, rtdTemperature, steps, tcEmf, tcFromMeasured, tcMeasured, tcTemperature, type TcType } from "./temperature.ts";

const near = (got: number, want: number, tol: number, what = "") => assert.ok(Math.abs(got - want) <= tol, `${what} got ${got}, want ${want} ± ${tol}`);

test("Pt100 온도 → 저항 (IEC 60751)", () => {
  near(rtdResistance(0, 100), 100.0, 0.0005);
  near(rtdResistance(100, 100), 138.506, 0.00051); // 138.5055
  near(rtdResistance(-200, 100), 18.52, 0.005);
  near(rtdResistance(-100, 100), 60.26, 0.005);
  near(rtdResistance(200, 100), 175.86, 0.005);
  near(rtdResistance(850, 100), 390.48, 0.005);
  near(rtdResistance(100, 1000), 1385.055, 0.0005);
  near(rtdResistance(100, 500), 692.5275, 0.00005);
});

test("Pt100 저항 → 온도 (정·역 왕복)", () => {
  near(rtdTemperature(100, 100), 0, 1e-9);
  near(rtdTemperature(138.5055, 100), 100, 1e-6);
  for (const r0 of [100, 500, 1000])
    for (let t = -200; t <= 850; t += 7.5) near(rtdTemperature(rtdResistance(t, r0), r0), t, 1e-7, `Pt${r0} ${t}`);
});

test("측온저항체 범위 밖은 계산하지 않음", () => {
  assert.throws(() => rtdResistance(-200.1, 100));
  assert.throws(() => rtdResistance(851, 100));
  assert.throws(() => rtdTemperature(18.5, 100));
  assert.throws(() => rtdTemperature(400, 100));
  assert.throws(() => rtdResistance(NaN, 100));
});

// [형, °C, NIST 표 mV]
const NIST: [TcType, number, number][] = [
  ["K", -270, -6.458],
  ["K", -200, -5.891],
  ["K", 0, 0.0],
  ["K", 100, 4.096],
  ["K", 500, 20.644],
  ["K", 1372, 54.886],
  ["J", -210, -8.095],
  ["J", 100, 5.269],
  ["J", 760, 42.919],
  ["J", 1200, 69.553],
  ["T", -200, -5.603],
  ["T", 100, 4.279],
  ["T", 400, 20.872],
  ["E", -200, -8.825],
  ["E", 100, 6.319],
  ["E", 1000, 76.373],
  ["N", -200, -3.99],
  ["N", 100, 2.774],
  ["N", 1300, 47.513],
  ["R", -50, -0.226],
  ["R", 1000, 10.506],
  ["R", 1768, 21.101],
  ["S", -50, -0.236],
  ["S", 1000, 9.587],
  ["S", 1768, 18.693],
  ["B", 250, 0.291],
  ["B", 1000, 4.834],
  ["B", 1820, 13.82],
];

test("열전대 온도 → mV (NIST 표, 0.001 mV)", () => {
  for (const [ty, t, mv] of NIST) assert.equal(Math.round(tcEmf(ty, t) * 1000) / 1000, mv, `${ty} ${t}°C`);
});

test("열전대 mV → 온도 (NIST 표 값에서)", () => {
  near(tcTemperature("K", 4.096), 100, 0.03, "K 4.096");
  near(tcTemperature("J", 5.269), 100, 0.03, "J 5.269");
  near(tcTemperature("T", 4.279), 100, 0.03, "T 4.279");
  near(tcTemperature("S", 9.587), 1000, 0.2, "S 9.587");
  for (const [ty, t] of NIST) {
    if (ty === "K" && t === -270) continue; // 역함수 범위(-200 °C~) 밖
    near(tcTemperature(ty, tcEmf(ty, t)), t, 1e-6, `${ty} ${t}`);
  }
});

test("열전대 범위 밖은 계산하지 않음", () => {
  assert.throws(() => tcEmf("K", 1373));
  assert.throws(() => tcEmf("T", 401));
  assert.throws(() => tcEmf("B", -1));
  assert.throws(() => tcTemperature("K", -6)); // -200 °C 아래
  assert.throws(() => tcTemperature("K", 55));
  assert.throws(() => tcTemperature("B", 0.1)); // 250 °C 아래
});

test("냉접점 보정", () => {
  // K형, 측정단 100 °C, 냉접점 25 °C: 4.096 − 1.000 = 3.096 mV
  near(tcMeasured("K", 100, 25), 3.096, 0.001);
  near(tcFromMeasured("K", tcMeasured("K", 100, 25), 25), 100, 1e-6);
  near(tcFromMeasured("J", 0, 30), 30, 1e-6);
});

test("표 간격", () => {
  assert.deepEqual(steps(-200, 50, 100), [-200, -100, 0, 50]);
  assert.deepEqual(steps(-270, 0, 100), [-270, -200, -100, 0]);
  assert.deepEqual(steps(0, 1372, 500), [0, 500, 1000, 1372]);
});

test("표기 반올림", () => {
  assert.equal(fixed(rtdResistance(100, 100), 3), "138.506");
  assert.equal(fixed(-0.0001, 3), "0.000");
  assert.equal(fixed(-5.8914, 3), "-5.891");
  assert.equal(fixed(4.0962, 3), "4.096");
});
