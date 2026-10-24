// 진공 패드 흡착력·응답 시간 — SMC «Vacuum Equipment Model Selection»(p.878·880·891·892, A33·A34)
import { test } from "node:test";
import assert from "node:assert/strict";
import { conductanceFlow, flowForTime, kgToN, liftForce, padArea, pickPad, pipeVolume, requiredPad, requiredVacuum, responseTime } from "./vacuum.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("p.878 예 — 압력 두 배면 힘 두 배, 지름 두 배면 네 배", () => {
  // ø20 3.14 cm²: −40 kPa 12 N, −80 kPa 25 N / ø40 12.56 cm²: 50 N, 100 N (표는 끝자리를 버려 적음)
  assert.equal(Math.floor(liftForce(40, 3.14)), 12);
  assert.equal(Math.floor(liftForce(80, 3.14)), 25);
  assert.equal(Math.floor(liftForce(40, 12.56)), 50);
  assert.equal(Math.floor(liftForce(80, 12.56)), 100);
  near(liftForce(80, padArea(40)) / liftForce(40, padArea(20)), 8, 1e-12);
});

test("p.880 이론 흡착력 표 — 계산값과 끝자리 하나 안쪽(표는 끝자리를 버리거나 반올림)", () => {
  const D = [1.5, 2, 3.5, 4, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80];
  // [진공압 kPa, 지름 순서대로 N] — 표에서 옮김
  const T: [number, number[]][] = [
    [85, [0.15, 0.27, 0.82, 1.07, 2.4, 4.2, 6.6, 11, 17, 26, 41, 68, 106, 166, 265, 427]],
    [80, [0.14, 0.25, 0.77, 1.0, 2.26, 4.0, 6.2, 10, 16, 25, 39, 64, 100, 157, 250, 402]],
    [70, [0.12, 0.22, 0.67, 0.88, 1.98, 3.5, 5.5, 9.3, 14, 22, 34, 56, 87, 137, 218, 351]],
    [60, [0.11, 0.19, 0.58, 0.75, 1.7, 3.0, 4.7, 8.0, 12, 18, 29, 48, 75, 117, 187, 301]],
    [50, [0.09, 0.16, 0.48, 0.63, 1.41, 2.5, 3.9, 6.7, 10, 15, 24, 40, 62, 98, 156, 251]],
    [40, [0.07, 0.13, 0.38, 0.5, 1.13, 2.0, 3.1, 5.3, 8.0, 12, 19, 32, 50, 78, 125, 201]],
  ];
  // 표의 자리수: 1 미만·지름 6 까지는 0.01, 10 미만은 0.1, 그 위는 1
  const unit = (d: number, v: number) => (v < 1 || d <= 6 ? 0.01 : v < 10 ? 0.1 : 1);
  for (const [p, row] of T) {
    row.forEach((v, i) => {
      const c = liftForce(p, padArea(D[i]));
      assert.ok(Math.abs(c - v) < unit(D[i], v) + 1e-9, `ø${D[i]} −${p} kPa: ${c} vs ${v}`);
    });
  }
  // 큰 패드: ø100 −85·−80 = 667·628, ø125 −85 = 1043
  assert.equal(Math.floor(liftForce(85, padArea(100))), 667); // 667.6 → 표 667(버림)
  assert.equal(Math.floor(liftForce(80, padArea(100))), 628);
  assert.equal(Math.floor(liftForce(85, padArea(125))), 1043);
});

test("p.880 식 — 안전율·패드 수", () => {
  // 이론 흡착력 ÷ t: ø40 −60 kPa 75.4 N, 수평 4 → 18.8 N, 수직 8 → 9.4 N, 패드 4개면 4배
  near(liftForce(60, padArea(40), 4), 18.85, 0.01);
  near(liftForce(60, padArea(40), 8), 9.42, 0.01);
  near(liftForce(60, padArea(40), 4, 4), 75.4, 0.01);
});

test("p.891 선정 예 — 칩 1 g, ø4, 안전율 4 → −3.0 kPa 이상", () => {
  // SMC 는 W = 1 g = 0.0098 N, S = 0.13 cm² 로 반올림해 P = 3.0 kPa
  near(requiredVacuum(0.0098, 0.13, 4), 3.0, 0.02);
  near(padArea(4), 0.126, 0.001);
  near(kgToN(0.001), 0.0098, 0.0001);
  // 반대로: −3 kPa·안전율 4 로 0.0098 N 을 드는 지름 ≈ 4 mm → 표의 ø4
  const r = requiredPad(0.0098, 3.0, 4);
  near(r.d, 4.08, 0.01);
  assert.equal(pickPad(r.d), 6);
  assert.equal(pickPad(4), 4);
  assert.equal(pickPad(400), null);
});

test("p.891·892 — 배관 용적, 흡입 유량, 응답 시간", () => {
  near(pipeVolume(2, 1), 0.0031, 0.0001); // 내경 2 mm·1 m → 0.0031 L
  near(pipeVolume(5, 1), 0.02, 0.001); // 그래프 (2) 예: ø5·1 m → 약 0.02 L
  const f = flowForTime(0.0031, 0.3); // 300 ms
  near(f.q, 0.62, 1e-9);
  near(f.qmaxLo, 1.24, 1e-9);
  near(f.qmaxHi, 1.86, 1e-9);
  near(flowForTime(0.0031, 0.3, 5).q, 5.62, 1e-9); // 누설 5 L/min 을 더함
  near(conductanceFlow(0.22), 12.2, 0.05); // Q2 = C × 55.5
  const r = responseTime(0.0031, 1.7, conductanceFlow(0.22)); // Q1 = 5 × 1/3 ≈ 1.7
  assert.equal(r.q, 1.7);
  near(r.t1, 0.109, 0.0005);
  near(r.t2, 3 * r.t1, 1e-12);
  assert.equal(responseTime(0.0031, 20, 12.21).q, 12.21); // 배관이 더 좁으면 Q2
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·대기압 이상·패드 수 소수·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => padArea(bad), String(bad));
    assert.throws(() => liftForce(bad, 1), String(bad));
    assert.throws(() => liftForce(60, bad), String(bad));
    assert.throws(() => liftForce(60, 1, bad), String(bad));
    assert.throws(() => requiredVacuum(bad, 1, 4), String(bad));
    assert.throws(() => requiredVacuum(1, bad, 4), String(bad));
    assert.throws(() => requiredPad(1, bad, 4), String(bad));
    assert.throws(() => pipeVolume(bad, 1), String(bad));
    assert.throws(() => pipeVolume(2, bad), String(bad));
    assert.throws(() => flowForTime(0.01, bad), String(bad));
    assert.throws(() => responseTime(0.01, bad), String(bad));
    assert.throws(() => conductanceFlow(bad), String(bad));
    assert.throws(() => kgToN(bad), String(bad));
  }
  assert.throws(() => liftForce(101.325, 1)); // 대기압보다 깊은 진공은 없다
  assert.throws(() => liftForce(120, 1));
  assert.throws(() => liftForce(60, 1, 4, 1.5));
  assert.throws(() => liftForce(60, 1, 4, 0));
  assert.throws(() => flowForTime(0.01, 0.3, -1));
  assert.throws(() => responseTime(0.01, 1, 0));
  assert.throws(() => requiredVacuum(1e308, 1e-300, 8)); // 넘침
  assert.throws(() => liftForce(60, 1e308, 1e-300)); // 넘침
});
