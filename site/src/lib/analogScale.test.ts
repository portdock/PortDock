// 4–20mA 환산 계산기 — 선형 환산·표·상태(NE 43 경계)·프리셋 숫자가 문서와 같은지
import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, countStatus, fmt, num, presetOf, signalStatus, table, type Scale } from "./analogScale.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

const S: Scale = { signal: "4-20mA", engLo: 0, engHi: 10, countLo: 0, countHi: 27648 };

test("4–20 mA: 12 mA = 50 % = 공학값 중간 = 카운트 13824", () => {
  const v = convert(S, "sig", 12);
  near(v.pct, 50);
  near(v.eng, 5);
  near(v.count, 13824);
});

test("어느 칸에서 넣어도 같은 답", () => {
  for (const [f, x] of [
    ["eng", 2.5],
    ["pct", 25],
    ["count", 6912],
  ] as const) {
    const v = convert(S, f, x);
    near(v.sig, 8);
    near(v.eng, 2.5);
    near(v.pct, 25);
    near(v.count, 6912);
  }
});

test("음수·거꾸로 된 공학값 범위", () => {
  const v = convert({ ...S, engLo: -50, engHi: 150 }, "sig", 4);
  near(v.eng, -50);
  const r = convert({ ...S, engLo: 100, engHi: 0 }, "sig", 8);
  near(r.eng, 75);
});

test("다른 신호와 카운트 범위", () => {
  near(convert({ signal: "0-10V", engLo: 0, engHi: 100, countLo: 0, countHi: 10000 }, "sig", 2.5).count, 2500);
  near(convert({ signal: "1-5V", engLo: 0, engHi: 100, countLo: 1000, countHi: 5000 }, "count", 3000).sig, 3);
  near(convert({ signal: "0-20mA", engLo: 0, engHi: 1, countLo: 0, countHi: 32000 }, "sig", 5).count, 8000);
  near(convert({ signal: "4-20mA", engLo: 0, engHi: 1, countLo: 4000, countHi: 20000 }, "sig", 7.5).count, 7500);
});

test("범위 밖은 그대로 늘려 계산", () => {
  const v = convert(S, "sig", 3.8);
  near(v.pct, -1.25);
  near(v.count, -345.6);
});

test("폭 0·숫자 아님은 오류", () => {
  assert.throws(() => convert({ ...S, engHi: 0 }, "sig", 4));
  assert.throws(() => convert({ ...S, countHi: 0 }, "sig", 4));
  assert.throws(() => convert(S, "sig", NaN));
  assert.throws(() => convert({ ...S, engLo: NaN }, "sig", 4));
});

test("표는 0·25·50·75·100 % — 4–20 mA 면 4·8·12·16·20 mA", () => {
  assert.deepEqual(
    table(S).map((v) => v.sig),
    [4, 8, 12, 16, 20],
  );
  assert.deepEqual(
    table({ ...S, signal: "1-5V" }).map((v) => v.sig),
    [1, 2, 3, 4, 5],
  );
});

test("NE 43 경계: 측정 3.8~20.5 mA, 고장 ≤3.6·≥21 mA", () => {
  assert.equal(signalStatus("4-20mA", 12).level, "ok");
  assert.equal(signalStatus("4-20mA", 4).level, "ok");
  assert.equal(signalStatus("4-20mA", 20).level, "ok");
  assert.equal(signalStatus("4-20mA", 3.9).level, "warn");
  assert.equal(signalStatus("4-20mA", 20.3).level, "warn");
  assert.equal(signalStatus("4-20mA", 3.7).level, "warn");
  assert.equal(signalStatus("4-20mA", 20.8).level, "warn");
  assert.equal(signalStatus("4-20mA", 3.6).level, "fault");
  assert.equal(signalStatus("4-20mA", 0).level, "fault");
  assert.equal(signalStatus("4-20mA", 21).level, "fault");
  assert.equal(signalStatus("0-10V", 10.5).level, "warn");
  assert.equal(signalStatus("0-10V", 5).level, "ok");
});

test("프리셋 숫자(문서 표와 같은지)", () => {
  assert.deepEqual(presetOf("s7")!.ranges["4-20mA"], { lo: 0, hi: 27648, min: -4864, max: 32511 });
  assert.deepEqual(presetOf("iqr")!.ranges["4-20mA"], { lo: 0, hi: 32000 });
  assert.deepEqual(presetOf("cl-eng")!.ranges["4-20mA"], { lo: 4000, hi: 20000, min: 3200, max: 21000 });
  assert.equal(presetOf("cl-pid")!.ranges["1-5V"], undefined);
});

test("카운트 오버플로", () => {
  const r = presetOf("s7")!.ranges["4-20mA"];
  assert.equal(countStatus(r, 32511), null);
  assert.equal(countStatus(r, 32512)!.level, "fault");
  assert.equal(countStatus(r, -4865)!.level, "fault");
  assert.equal(countStatus(presetOf("iqr")!.ranges["4-20mA"], 99999), null);
});

test("표시·입력", () => {
  assert.equal(fmt(12), "12");
  assert.equal(fmt(13.82400001), "13.824");
  assert.equal(fmt(-0.00000001), "0");
  assert.equal(fmt(-1.25), "-1.25");
  assert.ok(Number.isNaN(num(" ")));
  assert.equal(num(" 4.5 "), 4.5);
});
