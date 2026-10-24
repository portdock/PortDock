// 볼스크류 토크 — THK 종합 카탈로그 515-1E B15 «Example Ball Screw Selections» 두 예제를 재현
import { test } from "node:test";
import assert from "node:assert/strict";
import { ballScrew, holdTorque, kgcm2, minLead, resolution, rmsTorque, type ScrewIn } from "./ballscrew.ts";

const rel = (a: number, b: number, r: number) => assert.ok(Math.abs(a - b) <= Math.abs(b) * r, `${a} ≠ ${b} (±${r * 100} %)`);

// 수평 고속 이송: 테이블 60 + 공작물 20 kg, μ 0.003, f 15 N, 1 m/s, 가속 0.15 s, 리드 40 mm(WTF2040), 직결,
// 나사축 1.23×10⁻³ kg·cm²/mm × 1,200 mm, 모터 1×10⁻³ kg·m²
const H: ScrewIn = { mount: "horizontal", m: 80, mu: 0.003, f: 15, v: 1, t1: 0.15, ph: 40, eta: 0.9, a: 1, js: kgcm2(1.23e-3 * 1200), jm: 1e-3, tp: 0 };

test("THK 수평 예제 — α 6.67, Fa 550·17·−516, 1,500 min⁻¹, J 3.39×10⁻³, Tk 4,730·Tt 120·Tg −4,490 N·mm", () => {
  const o = ballScrew(H);
  rel(o.alpha, 6.67, 0.001);
  rel(o.fa[0], 550, 0.01);
  rel(o.fa[1], 17, 0.03); // 예제는 17 N 으로 적음(17.35)
  rel(o.fa[2], -516, 0.01);
  rel(o.fa[3], -550, 0.01);
  rel(o.fa[5], 516, 0.01);
  rel(o.famax, 550, 0.01);
  rel(o.nm, 1500, 1e-12);
  rel(o.j, 3.39e-3, 0.002);
  rel(o.omega, 1050, 0.003); // 예제 1,050(1,047.2 를 반올림)
  rel(o.tt[0], 120, 0.03);
  rel(o.tk[0], 4730, 0.01);
  rel(o.tg[0], -4490, 0.01);
  // 실효 토크: 가속 0.15 s, 등속 0.85 s, 감속 0.15 s, 정지 2.6 s → 1,305 N·mm (예제 값으로도, 이 계산값으로도)
  rel(rmsTorque([[4730, 0.15], [120, 0.85], [-4490, 0.15], [0, 2.6]]), 1305, 0.001);
  rel(rmsTorque([[o.tk[0], 0.15], [o.tt[0], 0.85], [o.tg[0], 0.15], [0, 2.6]]), 1305, 0.01);
  // 리드 고르기: 1 m/s, 정격 3,000 min⁻¹ → 20 mm 이상 / 최소 이송 0.02 mm 에 리드 20 → 1,000 p/rev
  assert.equal(minLead(1, 3000), 20);
  assert.equal(resolution(20, 0.02), 1000);
});

// 수직 반송: 테이블 40 + 공작물 10 kg, f 20 N, 0.3 m/s, 가속 0.2 s, 리드 10 mm, 직결,
// 나사축 3.9×10⁻⁴ kg·cm²/mm × 800 mm, 모터 5×10⁻⁵ kg·m²
const V: ScrewIn = { mount: "vertical", m: 50, mu: 0.003, f: 20, v: 0.3, t1: 0.2, ph: 10, eta: 0.9, a: 1, js: kgcm2(3.9e-4 * 800), jm: 5e-5, tp: 0 };

test("THK 수직 예제 — Fa 585·510·435·395·470·545, 1,800 min⁻¹, T3 200, Tk1 1,100 … Tg2 1,030, TS 658, Trms 743 N·mm", () => {
  const o = ballScrew(V);
  rel(o.alpha, 1.5, 1e-12);
  const want = [585, 510, 435, 395, 470, 545];
  o.fa.forEach((x, i) => rel(x, want[i], 0.005));
  rel(o.nm, 1800, 1e-12);
  rel(o.j, 1.58e-4, 0.005);
  rel(o.omega, 942, 0.001);
  rel(o.t3, 200, 0.03); // 예제는 0.196 N·m 를 0.2 로 적음
  rel(o.tt[0], 900, 0.005);
  rel(o.tt[1], 830, 0.005);
  rel(o.tk[0], 1100, 0.005);
  rel(o.tg[0], 700, 0.015);
  rel(o.tk[1], 630, 0.015);
  rel(o.tg[1], 1030, 0.005);
  const ts = holdTorque(40, 20, 10, 0.9); // 정지 중에는 공작물을 뺀 40 kg
  rel(ts, 658, 0.002);
  const seg: [number, number][] = [[o.tk[0], 0.2], [o.tt[0], 1.8], [o.tg[0], 0.2], [o.tk[1], 0.2], [o.tt[1], 1.8], [o.tg[1], 0.2], [ts, 7.6]];
  rel(rmsTorque(seg), 743, 0.005);
  rel(rmsTorque([[1100, 0.2], [900, 1.8], [700, 0.2], [630, 0.2], [830, 1.8], [1030, 0.2], [658, 7.6]]), 743, 0.001);
});

test("감속비: A = 1/2 이면 모터 회전수 2배, 마찰 토크 ½, 부하 관성 ¼", () => {
  const d = ballScrew(H);
  const g = ballScrew({ ...H, a: 0.5 });
  rel(g.nm, 2 * d.nm, 1e-12);
  rel(g.tt[0], d.tt[0] / 2, 1e-12);
  rel(g.j, d.j / 4, 1e-12);
});

test("예압 토크는 등속 토크에 더한다", () => {
  const o = ballScrew({ ...H, tp: 50 });
  rel(o.tt[0], ballScrew(H).tt[0] + 50, 1e-12);
});

test("경계값: 빈칸(NaN)·0·음수·Infinity·효율 > 1·넘침은 거절", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    for (const k of ["m", "v", "t1", "ph", "eta", "a"] as const) assert.throws(() => ballScrew({ ...H, [k]: bad }), `${k}=${bad}`);
    assert.throws(() => minLead(bad, 3000));
    assert.throws(() => resolution(20, bad));
    assert.throws(() => holdTorque(bad, 20, 10, 0.9));
  }
  for (const bad of [-1, NaN, Infinity]) for (const k of ["mu", "f", "js", "jm", "tp"] as const) assert.throws(() => ballScrew({ ...H, [k]: bad }), `${k}=${bad}`);
  assert.throws(() => ballScrew({ ...H, eta: 1.1 }));
  assert.throws(() => ballScrew({ ...H, m: 1e308, v: 1e308 })); // 넘침
  assert.throws(() => rmsTorque([]));
  assert.throws(() => rmsTorque([[1, 0]]));
  assert.throws(() => rmsTorque([[NaN, 1]]));
  assert.equal(holdTorque(1, 100, 10, 0.9), 0); // 저항이 무게보다 크면 0
});
