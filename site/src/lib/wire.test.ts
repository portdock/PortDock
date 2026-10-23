// 전선 저항·전압 강하 — IEC 60028 저항률, ASTM B258 AWG, 국내 식(35.6·30.8)과 같은지
import { test } from "node:test";
import assert from "node:assert/strict";
import { awg, awgName, maxLength, minArea, nextAwg, nextIec, resistance, rho, voltageDrop } from "./wire.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("구리 20 °C 1 mm² 1 km = 17.241 Ω, 온도 보정, 알루미늄", () => {
  near(resistance("cu", 1000, 1), 17.2414, 1e-3);
  near(rho("cu", 70), (1 / 58) * (1 + 0.00393 * 50));
  near(resistance("al", 1000, 1), 28.264, 1e-9);
});

test("AWG: 18 AWG ≈ 1.024 mm·0.823 mm², 10 AWG ≈ 5.26 mm², 36 AWG = 0.127 mm", () => {
  near(awg(18).d, 1.0237, 1e-3);
  near(awg(18).area, 0.8231, 1e-3);
  near(awg(10).area, 5.2612, 1e-3);
  near(awg(36).d, 0.127);
  assert.equal(awgName(-1), "00 AWG");
  assert.equal(awgName(0), "0 AWG");
  assert.equal(nextAwg(0.8), 18);
  assert.equal(nextAwg(0.83), 17);
});

test("직류 24 V·2 A·편도 50 m·1.5 mm² 구리 → 약 2.30 V", () => {
  const r = voltageDrop({ system: "dc", volts: 24, amps: 2, lengthM: 50, areaMm2: 1.5, material: "cu", tempC: 20 });
  near(r.drop, (2 * 2 * 50) / 58 / 1.5);
  near(r.drop, 2.2989, 1e-3);
  near(r.pct, (r.drop / 24) * 100);
  near(r.atLoad, 24 - r.drop);
  near(r.loss, 2 * 4 * r.r1);
});

test("국내 식 e = 35.6LI/1000A(단상·직류), 30.8LI/1000A(3상) 는 도전율 97 % 구리로 둔 같은 식", () => {
  const rho97 = 1 / 58 / 0.97;
  near(2 * rho97 * 1000, 35.55, 0.01);
  near(Math.sqrt(3) * rho97 * 1000, 30.79, 0.01);
});

test("3상은 √3", () => {
  const a = voltageDrop({ system: "3ph", volts: 380, amps: 10, lengthM: 100, areaMm2: 4, material: "cu", tempC: 20 });
  near(a.drop, Math.sqrt(3) * 10 * resistance("cu", 100, 4));
  near(a.loss, 3 * 100 * a.r1);
});

test("최소 단면적·최대 길이는 서로 거꾸로", () => {
  const base = { system: "dc" as const, volts: 24, amps: 2, material: "cu" as const, tempC: 20 };
  const a = minArea({ ...base, lengthM: 50 }, 5);
  const r = voltageDrop({ ...base, lengthM: 50, areaMm2: a });
  near(r.pct, 5);
  near(maxLength({ ...base, areaMm2: a }, 5), 50);
  assert.equal(nextIec(a), 4);
  assert.equal(nextIec(1.5), 1.5);
  assert.equal(nextIec(400), undefined);
});

test("잘못된 입력", () => {
  assert.throws(() => resistance("cu", 10, 0));
  assert.throws(() => voltageDrop({ system: "dc", volts: 0, amps: 1, lengthM: 1, areaMm2: 1, material: "cu", tempC: 20 }));
});

test("저항률이 0 이하가 되는 온도는 거부(구리 −234.5 °C 아래, 알루미늄 약 −228 °C 아래)", () => {
  assert.throws(() => rho("cu", -235), RangeError);
  assert.throws(() => resistance("cu", 100, 1.5, -300), RangeError);
  assert.throws(() => rho("al", -230), RangeError);
  assert.throws(() => rho("cu", NaN), RangeError);
  assert.ok(rho("cu", -234) > 0);
  assert.ok(rho("al", -200) > 0);
});
