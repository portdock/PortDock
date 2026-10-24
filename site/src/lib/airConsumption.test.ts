// 공압 실린더 공기 소비량 — SMC Best Pneumatics 기술 자료 p.1573(예)·p.1574(Data 2 식·튜브 표)
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPRESSOR_FACTOR, SMC_TUBES, cycleAir, cylAir, perMinute, pipeAir, requiredFlow, tubeArea } from "./airConsumption.ts";
import { pistonArea } from "./cylinder.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("p.1573 예 — ø50·행정 600·0.5 MPa 13 L, 튜브 ø6·2 m 0.56 L, 10대·분당 5회 678 L/min", () => {
  const c = cycleAir({ bore: 50, rod: 20, stroke: 600, mpa: 0.5, pipeId: 6, pipeM: 2, acting: "double" });
  near(c.qc1 + c.qc2, 13, 0.05); // 그래프 값 13 L(ANR)
  near(2 * c.qp, 0.56, 0.01); // 0.565
  // SMC 는 그래프에서 읽은 13 과 0.56 으로 계산
  near(perMinute(13 + 0.56, 5, 10), 678, 1e-9);
  near(perMinute(c.q, 5, 10), 678.6, 0.1); // 식 그대로 계산해도 678.6 L/min
  near(678 * COMPRESSOR_FACTOR, 949.2, 1e-9);
});

test("식 (8)~(14) — 쪽별 값과 단동", () => {
  // 미는 쪽: 1963.5 mm² × 600 × 6 × 10⁻⁶ = 7.069 L, 당기는 쪽(로드 20): 1649.3 × 600 × 6 × 10⁻⁶ = 5.938 L
  const c = cycleAir({ bore: 50, rod: 20, stroke: 600, mpa: 0.5, pipeId: 6, pipeM: 2, acting: "double" });
  near(c.qc1, 7.069, 0.001);
  near(c.qc2, 5.938, 0.001);
  near(c.qp, 0.2827, 0.0001);
  near(cylAir(pistonArea(50), 600, 0.5), c.qc1, 1e-12);
  const s1 = cycleAir({ bore: 50, rod: 20, stroke: 600, mpa: 0.5, pipeId: 6, pipeM: 2, acting: "springReturn" });
  near(s1.q, c.qc1 + c.qp, 1e-12);
  const s2 = cycleAir({ bore: 50, rod: 20, stroke: 600, mpa: 0.5, pipeId: 6, pipeM: 2, acting: "springExtend" });
  near(s2.q, c.qc2 + c.qp, 1e-12);
  // 배관 없음
  assert.equal(cycleAir({ bore: 50, rod: 20, stroke: 600, mpa: 0.5, pipeId: 6, pipeM: 0, acting: "double" }).qp, 0);
  assert.equal(pipeAir(6, 0, 0.5), 0);
});

test("p.1574 튜브·강관 안 단면적 표 재현(100 미만 소수 한 자리, 그 위 정수)", () => {
  for (const [name, , id, a] of SMC_TUBES) {
    const v = tubeArea(id);
    assert.equal(v < 100 ? Math.round(v * 10) / 10 : Math.round(v), a, name); // 100 미만은 소수 한 자리, 그 위는 정수
  }
});

test("식 (15) 필요 공기량 — (qc + qp) × 60 ÷ t", () => {
  // 미는 쪽 7.069 + 배관 0.283 L 을 1 s 에 → 441 L/min(ANR)
  near(requiredFlow(7.069, 0.2827, 1), 441.1, 0.1);
  near(requiredFlow(7.069, 0, 2), 212.07, 0.01);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·로드 ≥ 보어·대수 소수·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => cylAir(bad, 100, 0.5), String(bad));
    assert.throws(() => cylAir(100, bad, 0.5), String(bad));
    assert.throws(() => cylAir(100, 100, bad), String(bad));
    assert.throws(() => tubeArea(bad), String(bad));
    assert.throws(() => perMinute(bad, 5), String(bad));
    assert.throws(() => perMinute(1, bad), String(bad));
    assert.throws(() => requiredFlow(1, 0, bad), String(bad));
    assert.throws(() => cycleAir({ bore: bad, rod: 0, stroke: 100, mpa: 0.5, pipeId: 6, pipeM: 1, acting: "double" }), String(bad));
  }
  assert.throws(() => pipeAir(6, -1, 0.5));
  assert.throws(() => pipeAir(6, NaN, 0.5));
  assert.throws(() => cycleAir({ bore: 50, rod: 50, stroke: 100, mpa: 0.5, pipeId: 6, pipeM: 1, acting: "double" }));
  assert.throws(() => cycleAir({ bore: 50, rod: 20, stroke: 100, mpa: 0.5, pipeId: 6, pipeM: -1, acting: "double" }));
  assert.throws(() => cycleAir({ bore: 50, rod: 20, stroke: 100, mpa: 0.5, pipeId: 0, pipeM: 1, acting: "double" }));
  assert.throws(() => perMinute(1, 5, 2.5));
  assert.throws(() => perMinute(1, 5, 0));
  assert.throws(() => cylAir(1e300, 1e300, 0.5)); // 넘침
  assert.throws(() => perMinute(1e300, 1e300, 1)); // 넘침
  assert.throws(() => cylAir(100, 100, 200)); // 압력 비현실(100 MPa 넘음)
});
