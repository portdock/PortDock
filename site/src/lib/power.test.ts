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

test("ABB 표 4.7 전체(41줄·146칸)를 K = tan φ1 − tan φ2 가 ±0.0011 안에서 재현(표는 셋째 자리에서 끊음)", () => {
  // 보상 전 cos φ 0.50~0.90, [0.95, 0.90, 0.85, 0.80] — ABB Low voltage motors Motor guide(July 2019) p.53 표 4.7
  const T = `0.50 1.403 1.248 1.112 0.982|0.51 1.358 1.202 1.067 0.936|0.52 1.314 1.158 1.023 0.892|0.53 1.271 1.116 0.980 0.850|0.54 1.230 1.074 0.939 0.808|0.55 1.190 1.034 0.898 0.768|0.56 1.150 0.995 0.859 0.729|0.57 1.113 0.957 0.822 0.691|0.58 1.076 0.920 0.785 0.654|0.59 1.040 0.884 0.748 0.618|0.60 1.005 0.849 0.713 0.583|0.61 0.970 0.815 0.679 0.548|0.62 0.937 0.781 0.646 0.515|0.63 0.904 0.748 0.613 0.482|0.64 0.872 0.716 0.581 0.450|0.65 0.841 0.685 0.549 0.419|0.66 0.810 0.654 0.518 0.388|0.67 0.779 0.624 0.488 0.358|0.68 0.750 0.594 0.458 0.328|0.69 0.720 0.565 0.429 0.298|0.70 0.692 0.536 0.400 0.270|0.71 0.663 0.507 0.372 0.241|0.72 0.635 0.480 0.344 0.214|0.73 0.608 0.452 0.316 0.186|0.74 0.580 0.425 0.289 0.158|0.75 0.553 0.398 0.262 0.132|0.76 0.527 0.371 0.235 0.105|0.77 0.500 0.344 0.209 0.078|0.78 0.474 0.318 0.182 0.052|0.79 0.447 0.292 0.156 0.026|0.80 0.421 0.266 0.130|0.81 0.395 0.240 0.104|0.82 0.369 0.214 0.078|0.83 0.343 0.188 0.052|0.84 0.317 0.162 0.026|0.85 0.291 0.135|0.86 0.265 0.109|0.87 0.238 0.082|0.88 0.211 0.055|0.89 0.184 0.027|0.90 0.156`;
  const to = [0.95, 0.9, 0.85, 0.8];
  let n = 0;
  for (const row of T.split("|")) {
    const [pf1, ...ks] = row.split(" ").map(Number);
    ks.forEach((k, i) => (near(kFactor(pf1, to[i]), k, 0.0011), n++));
  }
  assert.equal(n, 146);
});

test("ABB TG7 예제 3.4: 37 kW 모터(380 V, 71 A, cos φ 0.85)의 효율 = 37 ÷ 39.72 ≈ 0.93", () => {
  near(37 / fromAmps("3", 380, 71, 0.85).kw, 0.9315, 1e-4);
});

test("콘덴서 µF 독립 계산: Δ 는 선간 전압·Qc/3, Y 는 상전압·Qc/3 → C_Y = 3·C_Δ, Y 하나 = Qc ÷ (ω U²)", () => {
  const w = 2 * Math.PI * 60;
  const d = capacitor({ phase: "3", kw: 50, pf1: 0.7, pf2: 0.9, volts: 440, hz: 60, conn: "delta" });
  const y = capacitor({ phase: "3", kw: 50, pf1: 0.7, pf2: 0.9, volts: 440, hz: 60, conn: "star" });
  const qc = 50 * (Math.tan(Math.acos(0.7)) - Math.tan(Math.acos(0.9)));
  near(d.qc, qc, 1e-12);
  near(d.uf, ((qc / 3) * 1e3) / (w * 440 ** 2) * 1e6, 1e-9);
  near(y.uf, ((qc / 3) * 1e3) / (w * (440 / Math.sqrt(3)) ** 2) * 1e6, 1e-9);
  near(y.uf, (qc * 1e3) / (w * 440 ** 2) * 1e6, 1e-9);
  near(y.uCap, 440 / Math.sqrt(3), 1e-12);
  // 같은 Qc 면 결선과 상관없이 콘덴서 뱅크 선 전류는 같다
  near(y.capAmps, d.capAmps, 1e-12);
});

test("경계값: 빈칸(NaN)·아주 큰 수·0·음수는 거절 — 화면에 Infinity·NaN 이 찍히지 않게(10/23)", () => {
  assert.throws(() => fromAmps("3", Infinity, 10, 0.8));
  assert.throws(() => fromAmps("3", 400, Infinity, 0.8));
  assert.throws(() => fromAmps("3", 400, -1, 0.8));
  assert.throws(() => fromAmps("3", 400, NaN, 0.8));
  assert.throws(() => fromKw("3", 400, Infinity, 0.8));
  assert.throws(() => fromKva("3", 0, 10, 0.8));
  assert.throws(() => fromKva("3", 400, 10, 1.01));
  assert.throws(() => fromKva("3", 400, 10, NaN));
  near(fromAmps("3", 400, 0, 0.8).kw, 0, 0);
  assert.throws(() => pfFromKwKva(10, Infinity));
  assert.throws(() => pfFromKwKvar(10, Infinity));
  assert.throws(() => pfFromKwKvar(0, 10));
  assert.throws(() => capUf(10, 400, Infinity));
  assert.throws(() => capUf(Infinity, 400, 50));
  assert.throws(() => capUf(-1, 400, 50));
  const base = { phase: "3" as const, kw: 100, pf1: 0.75, pf2: 0.95, volts: 400, hz: 50, conn: "delta" as const };
  assert.throws(() => capacitor({ ...base, kw: Infinity }));
  assert.throws(() => capacitor({ ...base, kw: 0 }));
  assert.throws(() => capacitor({ ...base, hz: 0 }));
  assert.throws(() => capacitor({ ...base, pf2: 0.7 }));
  near(capacitor({ ...base, pf2: 0.75 }).qc, 0, 1e-12);
  assert.throws(() => pfAfter(100, 0.75, Infinity));
  // 과보상: 남는 무효 전력이 음수여도 역률은 0~1
  const pf = pfAfter(100, 0.75, 200);
  assert.ok(pf > 0 && pf < 1);
});
