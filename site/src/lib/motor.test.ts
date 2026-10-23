// 모터 전류·회전수 — ABB Technical guide No. 7 예제 3.3·3.4, ABB Motor guide 표 9.2(동기 속도), YASKAWA A1000 E2-02 식
import { test } from "node:test";
import assert from "node:assert/strict";
import { efficiencyFrom, guessPoles, hzFor, motorCurrent, motorOutputKw, ratedSlip, rpmToHz, speedAt, syncRpm, torqueNm } from "./motor.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("ABB 예제 3.4: 37 kW·380 V·71 A·cos φ 0.85 → 효율 ≈ 0.931", () => {
  near(efficiencyFrom({ phase: "3", kw: 37, volts: 380, amps: 71, pf: 0.85 }), 0.931, 5e-4);
  // 거꾸로: 같은 효율이면 71 A
  const eff = efficiencyFrom({ phase: "3", kw: 37, volts: 380, amps: 71, pf: 0.85 });
  near(motorCurrent({ phase: "3", kw: 37, volts: 380, eff, pf: 0.85 }).amps, 71, 1e-9);
});

test("ABB 예제 3.3: 15 kW·1480 r/min → 96.8 N·m", () => {
  near(torqueNm(15, 1480), 96.8, 0.05);
  near(torqueNm(15, 1480), (9549.2966 * 15) / 1480, 1e-3);
});

test("3상 7.5 kW·380 V·효율 0.9·역률 0.85 → 약 14.9 A, 입력·피상·무효 전력", () => {
  const r = motorCurrent({ phase: "3", kw: 7.5, volts: 380, eff: 0.9, pf: 0.85 });
  near(r.amps, 7500 / (Math.sqrt(3) * 380 * 0.9 * 0.85));
  near(r.amps, 14.895, 1e-3);
  near(r.inputKw, 7.5 / 0.9);
  near(r.kva, 7.5 / 0.9 / 0.85);
  near(r.kvar, Math.sqrt(r.kva ** 2 - r.inputKw ** 2));
  near(r.lossKw, 7.5 / 0.9 - 7.5);
  near(motorOutputKw({ phase: "3", volts: 380, amps: r.amps, eff: 0.9, pf: 0.85 }), 7.5, 1e-9);
});

test("단상은 √3 없음, 직류는 역률 없음", () => {
  near(motorCurrent({ phase: "1", kw: 0.75, volts: 220, eff: 0.75, pf: 0.8 }).amps, 750 / (220 * 0.75 * 0.8));
  const d = motorCurrent({ phase: "dc", kw: 0.1, volts: 24, eff: 0.8, pf: 0.1 });
  near(d.amps, 100 / (24 * 0.8));
  near(d.kvar, 0);
});

test("잘못된 입력", () => {
  assert.throws(() => motorCurrent({ phase: "3", kw: 1, volts: 0, eff: 0.9, pf: 0.8 }));
  assert.throws(() => motorCurrent({ phase: "3", kw: 1, volts: 380, eff: 1.2, pf: 0.8 }));
  assert.throws(() => motorCurrent({ phase: "3", kw: 1, volts: 380, eff: 0.9, pf: 0 }));
  assert.throws(() => syncRpm(60, 3));
  assert.throws(() => ratedSlip(60, 1900, 4));
});

test("동기 속도: ABB Motor guide 표 9.2 (50·60 Hz, 2~12극)", () => {
  const t: [number, number, number][] = [
    [2, 3000, 3600],
    [4, 1500, 1800],
    [6, 1000, 1200],
    [8, 750, 900],
    [10, 600, 720],
    [12, 500, 600],
  ];
  for (const [p, a, b] of t) {
    near(syncRpm(50, p), a);
    near(syncRpm(60, p), b);
  }
  near(rpmToHz(1800, 4), 60);
});

test("정격 슬립: 60 Hz·4극·1750 r/min → 50 r/min, 2.78 %, 1.667 Hz (YASKAWA E2-02 식)", () => {
  const s = ratedSlip(60, 1750, 4);
  near(s.ns, 1800);
  near(s.rpm, 50);
  near(s.s, 50 / 1800);
  near(s.hz, 60 - (1750 * 4) / 120);
  near(s.hz, 1.6667, 1e-4);
  assert.equal(guessPoles(60, 1750), 4);
  assert.equal(guessPoles(50, 2900), 2);
  assert.equal(guessPoles(50, 965), 6);
});

test("주파수별 회전수(슬립 회전수 그대로 근사)·감속비·필요 주파수", () => {
  const a = speedAt(30, 4, 50, 10);
  near(a.ns, 900);
  near(a.n, 850);
  near(a.out, 85);
  near(a.outSync, 90);
  near(speedAt(1, 4, 50).n, 0); // 슬립보다 낮으면 0
  near(hzFor(85, 4, 50, 10), 30);
  near(hzFor(1800, 4), 60);
});
