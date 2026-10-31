import { test } from "node:test";
import assert from "node:assert/strict";
import { ALTITUDE_F, INSTALL_TYPES, K_STEEL, effectiveArea, fanFactor, heatBalance, heaterPower, parseLoads } from "./panelHeat.ts";

const near = (a: number, b: number, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);
const inst = (id: number) => INSTALL_TYPES.find((x) => x.id === id)!.i;

test("유효 표면적 — Rittal 백서(IEC 60890) 식 1·4·5·6·7 과 같다", () => {
  for (const [W, H, D] of [
    [0.6, 2, 0.5],
    [0.8, 1.8, 0.4],
    [1.2, 2.2, 0.6],
  ]) {
    near(effectiveArea(W, H, D, inst(1)), 1.8 * H * (W + D) + 1.4 * W * D);
    near(effectiveArea(W, H, D, inst(4)), 1.4 * H * (W + D) + 1.4 * W * D);
    near(effectiveArea(W, H, D, inst(5)), 1.8 * W * H + 1.4 * W * D + D * H);
    near(effectiveArea(W, H, D, inst(6)), 1.4 * W * (H + D) + D * H);
    near(effectiveArea(W, H, D, inst(7)), 1.4 * W * H + 0.7 * W * D + D * H);
  }
});

test("유효 표면적 — 식 2·3 은 IEC TR 60890 표 3 계수로 면마다 더한 값", () => {
  const [W, H, D] = [0.6, 2, 0.5];
  // 2: 윗면 1.4, 앞 0.9, 뒤(벽) 0.5, 양옆 0.9 → 1.4·W·(H+D) + 1.8·D·H
  near(effectiveArea(W, H, D, inst(2)), 1.4 * W * (H + D) + 1.8 * D * H);
  // 3: 윗면 1.4, 앞뒤 0.9, 한 옆 0.9·다른 옆 0.5 → 1.8·W·H + 1.4·W·D + 1.4·D·H
  near(effectiveArea(W, H, D, inst(3)), 1.8 * W * H + 1.4 * W * D + 1.4 * D * H);
  // 사방 트임 600×2000×500: 1.8·2·1.1 + 1.4·0.3 = 4.38 m²
  near(effectiveArea(0.6, 2, 0.5, inst(1)), 4.38, 1e-12);
});

test("팬 계수 f — 해발 0 m 3.1 … 3500 m 5.2, 사이는 높은 쪽", () => {
  assert.deepEqual(ALTITUDE_F.map(([, f]) => f), [3.1, 3.3, 3.5, 3.8, 4.1, 4.4, 4.8, 5.2]);
  assert.equal(fanFactor(0), 3.1);
  assert.equal(fanFactor(-10), 3.1);
  assert.equal(fanFactor(1), 3.3);
  assert.equal(fanFactor(1000), 3.5);
  assert.equal(fanFactor(1200), 3.8);
  assert.equal(fanFactor(3500), 5.2);
  assert.ok(Number.isNaN(fanFactor(3600)));
});

test("열 균형 — Pc = k·A·ΔT, Pa = Pt − Pc, V = f·Pa/ΔT", () => {
  // 600 W, A 4.38 m², 외기 35 °C, 내부 45 °C → Pc = 5.5·4.38·10 = 240.9 W, Pa = 359.1 W, V = 3.1·359.1/10 = 111.32 m³/h
  const r = heatBalance({ pt: 600, area: 4.38, k: K_STEEL, tAmb: 35, tIn: 45, altitude: 0 });
  near(r.pc, 240.9, 1e-9);
  near(r.pa, 359.1, 1e-9);
  near(r.airflow!, 111.321, 1e-9);
  near(r.qw!, 35.91, 1e-9);
  assert.equal(r.advice, "fan");
  // 고도 1000 m → f 3.5
  near(heatBalance({ pt: 600, area: 4.38, k: K_STEEL, tAmb: 35, tIn: 45, altitude: 1000 }).airflow!, 125.685, 1e-9);
});

test("판정 — 자연 방열 충분·5 K 미만·외기가 더 뜨거움", () => {
  assert.equal(heatBalance({ pt: 100, area: 4.38, k: K_STEEL, tAmb: 30, tIn: 45, altitude: 0 }).advice, "natural");
  assert.equal(heatBalance({ pt: 600, area: 2, k: K_STEEL, tAmb: 42, tIn: 45, altitude: 0 }).advice, "fan-tight");
  const hot = heatBalance({ pt: 600, area: 4, k: K_STEEL, tAmb: 50, tIn: 45, altitude: 0 });
  assert.equal(hot.advice, "cooler");
  assert.equal(hot.airflow, null);
  // 외기 50 °C 에서 내부 45 °C: 밖에서 들어오는 열 5.5·4·5 = 110 W 를 더해 쿨러 710 W
  near(hot.pn, 710, 1e-9);
});

test("히터 — Pv = k·A·ΔT, 장비 발열 뺀 값", () => {
  const h = heaterPower(4, K_STEEL, -10, 10, 200);
  near(h.pv, 440, 1e-9);
  near(h.pvMinusLoad, 240, 1e-9);
  assert.equal(heaterPower(4, K_STEEL, 15, 10, 0).pv, 0);
});

test("장비 발열 목록 읽기 — 마지막 숫자·kW·×개수·주석", () => {
  const r = parseLoads("PLC 12\nSMPS 24V 10A 손실 35 W\n# 주석\n릴레이 0.5 x8\n인버터 손실 0.15 kW\n2 × 서보 앰프 40\n그냥 글");
  assert.deepEqual(
    r.items.map((x) => [x.w, x.n]),
    [
      [12, 1],
      [35, 1],
      [0.5, 8],
      [150, 1],
      [40, 2],
    ],
  );
  near(r.total, 12 + 35 + 4 + 150 + 80, 1e-9);
  assert.deepEqual(r.bad, [7]);
  assert.equal(parseLoads("MX 5").items[0].w, 5);
});
