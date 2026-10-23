// 교류 전력·역률 개선 — ABB Technical guide No. 7 식 3.15·예제 3.4, ABB Motor guide(2019) §4.10·표 4.7
import { test } from "node:test";
import assert from "node:assert/strict";
import { capKvar, capUf, capacitor, fromAmps, fromKva, fromKw, kFactor, pfAfter, pfFromKwKva, pfFromKwKvar } from "./power.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("ABB TG7 예제 3.4 의 명판(380 V, 71 A, cos φ 0.85): 피상 46.73 kVA, 유효 39.72 kW", () => {
  const r = fromAmps("3", 380, 71, 0.85);
  near(r.kva, (Math.sqrt(3) * 380 * 71) / 1000, 1e-12);
  near(r.kva, 46.731, 1e-3);
  near(r.kw, 39.72, 1e-2);
  near(r.kvar, Math.sqrt(r.kva ** 2 - r.kw ** 2), 1e-9);
  near(r.deg, 31.788, 1e-3);
});

test("kW·kVA → 전류 왕복, 단상은 √3 없이", () => {
  const a = fromKw("3", 400, 100, 0.8);
  near(a.kva, 125, 1e-12);
  near(a.kvar, 75, 1e-9);
  near(fromKva("3", 400, 125, 0.8).amps, a.amps, 1e-12);
  near(a.amps, 125000 / (Math.sqrt(3) * 400), 1e-9);
  near(fromKva("1", 220, 2.2, 1).amps, 10, 1e-12);
  near(pfFromKwKva(80, 100), 0.8, 1e-15);
  near(pfFromKwKvar(80, 60), 0.8, 1e-15);
  assert.throws(() => fromKw("3", 400, 10, 0));
  assert.throws(() => pfFromKwKva(120, 100));
});

// ABB Motor guide 표 4.7 — [보상 전 cos φ, 0.95, 0.90, 0.85, 0.80]. 표는 소수 셋째 자리까지라 ±0.0012 안에서 맞춘다
const TABLE_4_7: [number, ...number[]][] = [
  [0.5, 1.403, 1.248, 1.112, 0.982],
  [0.51, 1.358, 1.202, 1.067, 0.936],
  [0.56, 1.15, 0.995, 0.859, 0.729],
  [0.6, 1.005, 0.849, 0.713, 0.583],
  [0.65, 0.841, 0.685, 0.549, 0.419],
  [0.7, 0.692, 0.536, 0.4, 0.27],
  [0.75, 0.553, 0.398, 0.262, 0.132],
  [0.79, 0.447, 0.292, 0.156, 0.026],
  [0.8, 0.421, 0.266, 0.13],
  [0.85, 0.291, 0.135],
  [0.89, 0.184, 0.027],
  [0.9, 0.156],
];

test("K = tan φ1 − tan φ2 가 ABB 표 4.7 을 재현", () => {
  const to = [0.95, 0.9, 0.85, 0.8];
  for (const [pf1, ...ks] of TABLE_4_7) ks.forEach((k, i) => near(kFactor(pf1, to[i]), k, 0.0012));
  assert.throws(() => kFactor(0.9, 0.8));
});

test("ABB 식 C = 3.2 × 10^6 × Q ÷ U²(50 Hz)와 C = Q ÷ (2π f U²) 는 0.6 % 안에서 같다", () => {
  for (const [q, u] of [[5, 400], [10, 690], [2, 230]]) {
    const abb = (3.2e6 * q) / (u * u);
    const ours = capUf(q, u, 50);
    assert.ok(Math.abs(ours / abb - 1) < 0.006, `${ours} vs ${abb}`);
  }
  near(capKvar(capUf(7, 400, 60), 400, 60), 7, 1e-12);
});

test("100 kW, cos φ 0.75 → 0.95, 400 V 50 Hz: Qc ≈ 55.3 kvar, Δ 하나 ≈ 366.8 µF, Y 는 3배", () => {
  const base = { phase: "3" as const, kw: 100, pf1: 0.75, pf2: 0.95, volts: 400, hz: 50 };
  const d = capacitor({ ...base, conn: "delta" });
  near(d.k, 0.553, 0.0012);
  near(d.qc, 100 * d.k, 1e-12);
  near(d.qEach, d.qc / 3, 1e-12);
  near(d.uf, (d.qEach * 1000) / (2 * Math.PI * 50 * 400 * 400) * 1e6, 1e-9);
  near(d.uf, 366.8, 0.5);
  const y = capacitor({ ...base, conn: "star" });
  near(y.uf, 3 * d.uf, 1e-9);
  near(d.capAmps, (d.qc * 1000) / (Math.sqrt(3) * 400), 1e-9);
  near(d.after.amps / d.before.amps, 0.75 / 0.95, 1e-12);
  near(pfAfter(100, 0.75, d.qc), 0.95, 1e-12);
});

test("단상: 콘덴서 하나가 전체 kvar 를 맡는다", () => {
  const s = capacitor({ phase: "1", kw: 1.5, pf1: 0.7, pf2: 0.95, volts: 220, hz: 60, conn: "delta" });
  near(s.qEach, s.qc, 1e-15);
  near(s.uCap, 220, 0);
});
