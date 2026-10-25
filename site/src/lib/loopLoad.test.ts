// 4–20mA 루프 부하 — 옴의 법칙으로 전송기 단자 전압·최대 부하·최대 길이
import { test } from "node:test";
import assert from "node:assert/strict";
import { loop, type LoopInput } from "./loopLoad.ts";
import { resistance } from "./wire.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const X: LoopInput = { supply: 24, txMin: 12, iMax: 0.02, rIn: 250, rOther: 0, vOther: 0, lengthM: 0, areaMm2: 0.75, material: "cu", tempC: 20 };

test("24 V · 최소 12 V · 20 mA → 최대 부하 600 Ω, 250 Ω 이면 7 V 남음", () => {
  const r = loop(X);
  near(r.rMax, 600);
  near(r.vTx, 24 - 0.02 * 250);
  near(r.margin, 7);
  assert.equal(r.ok, true);
  near(r.minSupply, 12 + 5);
  near(r.vIn4, 1);
  near(r.vIn20, 5);
});

test("선 저항은 왕복 — 편도 500 m 0.75 mm² 구리", () => {
  const r = loop({ ...X, lengthM: 500 });
  near(r.rWire, 2 * resistance("cu", 500, 0.75));
  near(r.rTotal, 250 + r.rWire);
  near(r.maxLength, 350 / (2 * resistance("cu", 1, 0.75)));
});

test("표시기·배리어가 더해지면 모자람", () => {
  const r = loop({ ...X, rOther: 250, vOther: 8 });
  near(r.vTx, 24 - 0.02 * 500 - 8);
  assert.equal(r.ok, false);
  near(r.rMax, (24 - 12 - 8) / 0.02);
  assert.equal(r.maxLength, 0);
});

test("잘못된 입력", () => {
  assert.throws(() => loop({ ...X, iMax: 0 }));
  assert.throws(() => loop({ ...X, rIn: -1 }));
  assert.throws(() => loop({ ...X, supply: NaN }));
});
