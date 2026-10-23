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

test("열전대 mV → ℃: NIST 표 끝값(소수 셋째 자리 반올림)도 받는다", () => {
  const ends: [TcType, number, number][] = [
    ["T", 20.872, 400],
    ["T", -5.603, -200],
    ["K", 54.886, 1372],
    ["K", -5.891, -200],
    ["J", 69.553, 1200],
    ["J", -8.095, -210],
    ["E", 76.373, 1000],
    ["E", -8.825, -200],
    ["N", 47.513, 1300],
    ["N", -3.99, -200],
    ["R", 21.103, 1768.1],
    ["R", -0.226, -50],
    ["S", 18.693, 1768.1],
    ["S", -0.235, -50],
    ["B", 13.82, 1820],
    ["B", 0.291, 250],
  ];
  for (const [ty, e, t] of ends) {
    const got = tcTemperature(ty, e);
    // 표 값이 반올림이라 R·S 의 −50 °C(약 5 µV/°C)처럼 감도가 낮은 끝에서는 0.1 °C 가까이 어긋날 수 있다
    near(got, t, 0.15, `${ty} ${e}`);
    near(tcEmf(ty, got), e, 0.0005, `${ty} ${e} 왕복`);
  }
  // 반올림 폭(±0.0005 mV)을 넘으면 여전히 범위 밖
  assert.throws(() => tcTemperature("T", 20.8735));
  assert.throws(() => tcTemperature("T", -5.6045));
});

test("측정 mV 의 범위 오류는 측정값 기준 범위로 알린다", () => {
  // T형, 냉접점 25 °C: E(25) ≈ 0.992 mV → 측정 범위 위끝 ≈ 20.872 − 0.992 = 19.880 mV
  assert.throws(() => tcFromMeasured("T", 20.5, 25, "ko"), /측정 mV.*19\.88\d~?/);
  assert.throws(() => tcFromMeasured("T", 20.5, 25, "en"), /measured mV.*19\.88\d/);
  near(tcFromMeasured("T", 20.872 - tcEmf("T", 25), 25), 400, 0.01);
});
