// CAN 비트 타이밍 — NXP AN1798 Rev. 4 예제 1·2와 구간 규칙(Microchip SAM9X60 §50.7.4.1)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSegments, oscTolerance, propMin, samplePoint, searchTimings } from "./canTiming.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("AN1798 예제 1: 8 TQ, PROP 4, PS1 1, PS2 2, SJW 1 → 식 10 0.00625, 식 11 0.0049", () => {
  const t = oscTolerance(8, 1, 2, 1);
  near(t.eq10, 0.00625, 1e-12);
  near(t.eq11, 0.0049, 1e-5);
  near(t.tol, 0.0049, 1e-5);
});

test("AN1798 예제 2: 16 TQ(PS 6·6, SJW 4) → 0.0125·0.01485, 8 TQ(PS 3·3, SJW 3) → 0.01875·0.01485", () => {
  const a = oscTolerance(16, 6, 6, 4);
  near(a.eq10, 0.0125, 1e-12);
  near(a.eq11, 0.01485, 1e-5);
  const b = oscTolerance(8, 3, 3, 3);
  near(b.eq10, 0.01875, 1e-12);
  near(b.eq11, 0.01485, 1e-5);
});

test("AN1798 PROP_SEG: 20 m·5 ns/m·150 ns, TQ 125 ns → 4 / 50 m, TQ 500 ns → 2, TQ 1000 ns → 1", () => {
  assert.equal(propMin(100, 150, 125), 4);
  assert.equal(propMin(250, 150, 500), 2);
  assert.equal(propMin(250, 150, 1000), 1);
});

test("구간 규칙", () => {
  assert.equal(checkSegments(4, 1, 2, 1), undefined); // AN1798 예제 1(PS2 = MAX(IPT, PS1))
  assert.ok(checkSegments(3, 2, 3, 1)); // PS2 > PS1
  assert.equal(checkSegments(1, 3, 3, 3), undefined);
  assert.equal(checkSegments(5, 8, 2, 4), undefined);
  assert.ok(checkSegments(1, 3, 3, 4));
  assert.ok(checkSegments(9, 4, 2, 1));
  assert.ok(checkSegments(1, 2, 2, 1)); // 6 TQ
});

test("샘플 포인트: 16 TQ, PS2 2 → 87.5 %, 8 TQ PS 3·3 → 62.5 %", () => {
  near(samplePoint(5, 8, 2), 0.875, 1e-12);
  near(samplePoint(1, 3, 3), 0.625, 1e-12);
});

test("찾기: 8 MHz·125 kbit/s·87.5 % → 16 TQ(프리스케일러 4), 7 TQ 미만·26 TQ 이상은 없음", () => {
  const r = searchTimings({ clockHz: 8e6, bitrate: 125000, sp: 0.875 });
  assert.ok(r.length > 0);
  const top = r[0];
  near(top.sp, 0.875, 1e-12);
  assert.equal(top.ntq, 16);
  assert.equal(top.brp, 4);
  assert.equal(top.ps2, 2);
  assert.equal(top.sjw, 4);
  for (const t of r) {
    assert.equal(checkSegments(t.prop, t.ps1, t.ps2, t.sjw), undefined);
    assert.equal(8e6 / (t.brp * t.ntq), 125000);
  }
});

test("찾기: AN1798 예제 1 — 8 MHz·1 Mbit/s, 20 m(100 ns)·150 ns → 프리스케일러 1, 8 TQ, PROP 4·PS1 1·PS2 2·SJW 1", () => {
  const r = searchTimings({ clockHz: 8e6, bitrate: 1e6, sp: 0.75, busNs: 100, xcvrNs: 150 });
  assert.equal(r.length, 1);
  const t = r[0];
  assert.deepEqual([t.brp, t.ntq, t.prop, t.ps1, t.ps2, t.sjw], [1, 8, 4, 1, 2, 1]);
  near(t.sp, 0.75, 1e-12);
  near(t.tol, 0.0049, 1e-5);
});

test("속도가 나눠떨어지지 않으면 허용 오차를 주어야 나온다", () => {
  assert.equal(searchTimings({ clockHz: 36e6, bitrate: 33333, sp: 0.875, brpMax: 64 }).length, 0);
  const r = searchTimings({ clockHz: 36e6, bitrate: 33333, sp: 0.875, brpMax: 64, maxErr: 0.001 });
  assert.ok(r.length > 0 && r.every((t) => Math.abs(t.err) <= 0.001));
});
