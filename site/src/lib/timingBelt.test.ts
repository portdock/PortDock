// 타이밍 벨트 길이·축간 거리 — Gates Mectrol «Timing Belt Theory» 식 (4)~(10), Gates PowerGrip GT3 매뉴얼(17195) p.3·4·12·188
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beltLength,
  beltLengthApprox,
  beltSpeed,
  centerApprox,
  centerDistance,
  gatesFpm,
  minLength,
  nearestBelts,
  pitchDiameter,
  teethInMesh,
  wrapSmall,
} from "./timingBelt.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const r2 = (x: number) => Math.round(x * 100) / 100;

test("GT3 매뉴얼 p.3 선정 예 — 축간 30.02 in·30.42 in", () => {
  // PD 는 매뉴얼 값(in), 벨트 길이도 매뉴얼의 in 값
  assert.equal(r2(centerDistance(94.49, 7.218, 14.437)), 30.02);
  assert.equal(r2(centerDistance(90.94, 6.316, 12.632)), 30.42);
  // PD 를 잇수 × 피치 ÷ π 로 내도 같은 값(3자리)
  near(pitchDiameter(72, 8) / 25.4, 7.218, 0.0005);
  near(pitchDiameter(144, 8) / 25.4, 14.437, 0.0005);
  near(pitchDiameter(36, 14) / 25.4, 6.316, 0.0005);
  near(pitchDiameter(28, 14) / 25.4, 4.912, 0.0005); // 본문의 «28홈 4.912 in»
  // mm 로 그대로: 2400 mm 벨트 → 762.5 mm(30.02 in)
  near(centerDistance(2400, pitchDiameter(72, 8), pitchDiameter(144, 8)) / 25.4, 30.02, 0.005);
});

test("GT3 매뉴얼 p.4 벨트 속도 — 2191.9·1917.9 ft/min", () => {
  near(gatesFpm(7.218, 1160), 2191.9, 0.05);
  near(gatesFpm(6.316, 1160), 1917.9, 0.05);
  // 3.82 ≈ 12/π: 정확한 식(m/s)을 ft/min 으로 바꾼 값과 0.01 % 안쪽
  const v = beltSpeed(7.218 * 25.4, 1160) / 0.3048 * 60;
  near(v / 2191.9, 1, 0.0005);
});

test("GT3 매뉴얼 p.12 5MGT 표 — 축간 거리(in) 끝자리 하나 안쪽(52칸 중 48칸은 같음)", () => {
  const Ls = [11.811, 13.976, 14.764, 15.748, 15.945, 16.732, 17.716, 19.685, 21.063, 22.244, 22.638, 22.835, 23.622];
  // [작은 PD, 큰 PD, 표의 값] — 300-5MGT … 600-5MGT 열
  const rows: [number, number, number[]][] = [
    [1.128, 1.128, [4.13, 5.22, 5.61, 6.1, 6.2, 6.59, 7.09, 8.07, 8.76, 9.35, 9.55, 9.64, 10.04]],
    [1.128, 1.191, [4.08, 5.17, 5.56, 6.05, 6.15, 6.54, 7.04, 8.02, 8.71, 9.3, 9.5, 9.59, 9.99]],
    [1.566, 1.629, [3.4, 4.48, 4.87, 5.37, 5.46, 5.86, 6.35, 7.33, 8.02, 8.61, 8.81, 8.91, 9.3]],
    [1.191, 1.316, [3.94, 5.02, 5.41, 5.91, 6.0, 6.4, 6.89, 7.87, 8.56, 9.15, 9.35, 9.45, 9.84]],
  ];
  let same = 0;
  for (const [d1, d2, cs] of rows)
    cs.forEach((c, i) => {
      const v = r2(centerDistance(Ls[i], d1, d2));
      near(v, c, 0.0100001);
      if (v === c) same++;
    });
  assert.equal(same, 48); // 다른 4칸은 계산값이 반올림 경계(9.6456·9.5961·5.3646·5.9047)라 0.01 차이
  // 같은 풀리는 식 (5): C = (L − πd) ÷ 2
  near(centerDistance(11.811, 1.128, 1.128), (11.811 - Math.PI * 1.128) / 2, 1e-9);
});

test("식 (9) ↔ 식 (10)·p.188 근사", () => {
  const c = 30.02;
  near(beltLength(c, 7.218, 14.437), 94.49, 0.005);
  near(beltLengthApprox(c, 7.218, 14.437), 94.47, 0.005); // 근사는 0.02 % 짧음
  near(centerApprox(94.49, 7.218, 14.437), 30.02, 0.005);
  // 풀리 순서를 바꿔도 같다
  near(beltLength(c, 14.437, 7.218), beltLength(c, 7.218, 14.437), 1e-12);
  // 감긴 각: 정확 2·acos(7.219/60.04) = 166.2°, 근사 180 − 7.219 × 60 ÷ 30.02 = 165.6°
  near((wrapSmall(c, 7.218, 14.437) * 180) / Math.PI, 166.19, 0.01);
  near(180 - ((14.437 - 7.218) * 60) / c, 165.57, 0.01);
});

test("벨트 잇수(식 (4))와 맞물린 이", () => {
  // 8MGT 72·144, 원하는 축간 762 mm → 299.9 이 → 299·300 이(2392·2400 mm)
  const r = nearestBelts(72, 144, 8, 762);
  assert.deepEqual(r.belts.map((b) => b.teeth), [299, 300]);
  near(r.belts[1].c / 25.4, 30.02, 0.005);
  // 감긴 각 166.2° × 72 이 ÷ 360 = 33.2 이
  const m = teethInMesh(72, wrapSmall(r.belts[1].c, r.d1, r.d2));
  near(m.v, 33.2, 0.05);
  assert.equal(m.whole, 33);
  // 같은 풀리면 정확히 반
  assert.equal(teethInMesh(18, Math.PI).v, 9);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·소수 잇수·풀리 겹침·너무 짧은 벨트·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => pitchDiameter(bad, 5), String(bad));
    assert.throws(() => pitchDiameter(20, bad), String(bad));
    assert.throws(() => beltLength(bad, 10, 20), String(bad));
    assert.throws(() => beltLength(100, bad, 20), String(bad));
    assert.throws(() => centerDistance(bad, 10, 20), String(bad));
    assert.throws(() => centerApprox(bad, 10, 20), String(bad));
    assert.throws(() => beltSpeed(bad, 100), String(bad));
    assert.throws(() => beltSpeed(10, bad), String(bad));
    assert.throws(() => nearestBelts(20, 40, 5, bad), String(bad));
  }
  assert.throws(() => pitchDiameter(20.5, 5));
  assert.throws(() => beltLength(15, 10, 20)); // 축간 거리 15 ≤ (10 + 20)/2 → 풀리가 겹침
  assert.throws(() => centerDistance(minLength(10, 20), 10, 20)); // 맞닿는 길이 이하
  assert.throws(() => centerDistance(50, 10, 20));
  assert.throws(() => centerApprox(10, 10, 20));
  assert.throws(() => teethInMesh(20, 0));
  assert.throws(() => teethInMesh(20, 7));
  assert.throws(() => beltSpeed(1e300, 1e300)); // 넘침
  assert.throws(() => beltLength(1e308, 1e308, 1e308)); // 넘침
});
