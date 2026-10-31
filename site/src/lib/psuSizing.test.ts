// 24V DC 전원 용량 — 합계·동시 사용률·여유율·돌입 피크·정격 고르기·채널 나누기·저장 글
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_OPTS, EXAMPLE, KINDS, STD_RATINGS, parseSaved, pickRating, sizeSupply, splitChannels, type Load } from "./psuSizing.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const L = (kind: Load["kind"], qty: number, ma: number, inrushMa = 0, duty = 100): Load => ({ kind, name: kind, qty, ma, inrushMa, duty });

test("합계: 개수 × mA × 동시 사용률, 전력 = A × V", () => {
  const r = sizeSupply([L("plc", 1, 600), L("sensor", 16, 25), L("valve", 8, 100, 0, 50)], DEFAULT_OPTS);
  near(r.allOnA, 0.6 + 0.4 + 0.8);
  near(r.steadyA, 0.6 + 0.4 + 0.4);
  near(r.watts, 1.4 * 24);
  assert.equal(r.rows, 3);
});

test("여유율 25 % → 필요 정격 = 부하 ÷ 0.75, 흔한 정격에서 고름", () => {
  const r = sizeSupply([L("plc", 1, 3000)], DEFAULT_OPTS);
  near(r.needA, 4);
  assert.equal(r.ratingA, 5);
  near(r.loadPct!, 60);
  // 경계: 딱 맞으면 그 정격
  assert.equal(pickRating(2.5, 0, 100), 2.5);
  assert.equal(pickRating(2.51, 0, 100), 3.8);
  assert.equal(pickRating(41, 0, 100), undefined);
});

test("돌입 피크가 피크 정격을 넘으면 정격을 올린다 — 피크 정격 150 % 면 덜 올린다", () => {
  const loads = [L("hmi", 1, 1000, 6000)];
  const a = sizeSupply(loads, DEFAULT_OPTS);
  near(a.peakA, 6);
  assert.equal(a.ratingBySteadyA, 2.5);
  assert.equal(a.ratingA, 10);
  near(a.peakLimitA!, 10);
  const b = sizeSupply(loads, { ...DEFAULT_OPTS, peakPct: 150 });
  assert.equal(b.ratingA, 5);
  near(b.peakLimitA!, 7.5);
  // 돌입을 모르면(0) 정상 전류로 센다
  near(sizeSupply([L("plc", 2, 500)], DEFAULT_OPTS).peakA, 1);
});

test("빈칸·음수·0 개는 빼고, 동시 사용률은 0~100 으로 자른다", () => {
  const r = sizeSupply([L("plc", 0, 500), L("plc", 1, -5), L("plc", 1, NaN), L("valve", 2, 100, 0, 250)], DEFAULT_OPTS);
  near(r.steadyA, 0.2);
  assert.equal(r.rows, 1);
  const z = sizeSupply([], DEFAULT_OPTS);
  assert.equal(z.steadyA, 0);
  assert.equal(z.ratingA, STD_RATINGS[0]);
});

test("잘못된 설정", () => {
  assert.throws(() => sizeSupply([], { ...DEFAULT_OPTS, volts: 0 }));
  assert.throws(() => sizeSupply([], { ...DEFAULT_OPTS, margin: 95 }));
  assert.throws(() => sizeSupply([], { ...DEFAULT_OPTS, peakPct: 50 }));
  assert.throws(() => splitChannels([], { ...DEFAULT_OPTS, channelA: 0 }));
});

test("채널 나누기: 묶음을 섞지 않고, 한도(채널 × (1 − 여유))를 넘지 않게 개수로 쪼갠다", () => {
  const loads = [L("plc", 1, 600), L("hmi", 1, 500), L("sensor", 16, 25), L("valve", 40, 100, 300)];
  const s = splitChannels(loads, { ...DEFAULT_OPTS, channelA: 4 });
  near(s.usableA, 3);
  for (const c of s.channels) {
    assert.ok(c.amps <= s.usableA + 1e-9);
    const groups = new Set(c.parts.map((p) => KINDS.find((k) => k.id === loads[p.row].kind)!.group));
    assert.equal(groups.size, 1);
  }
  // 밸브 40 × 0.1 A = 4 A → 3 A 채널 둘(30 + 10)
  const valve = s.channels.filter((c) => c.group === "actuator");
  assert.deepEqual(valve.map((c) => c.parts[0].qty), [30, 10]);
  near(valve[0].peakA, 9);
  // 개수 합은 그대로
  const total = s.channels.flatMap((c) => c.parts).reduce((a, p) => a + p.qty, 0);
  assert.equal(total, 1 + 1 + 16 + 40);
  assert.deepEqual(s.tooBig, []);
  assert.deepEqual(s.channels.map((c) => c.group), ["control", "field", "actuator", "actuator"]);
});

test("한 개만으로 채널 한도를 넘으면 tooBig", () => {
  const s = splitChannels([L("hmi", 1, 5000)], { ...DEFAULT_OPTS, channelA: 4 });
  assert.deepEqual(s.tooBig, [0]);
  assert.equal(s.channels.length, 0);
});

test("예시는 두 언어, 저장 글 읽기는 모르는 값을 버린다", () => {
  assert.equal(EXAMPLE("ko").length, EXAMPLE("en").length);
  assert.ok(sizeSupply(EXAMPLE("en"), DEFAULT_OPTS).steadyA > 0);
  assert.equal(parseSaved(null), null);
  assert.equal(parseSaved("{"), null);
  assert.equal(parseSaved('{"v":2,"loads":[]}'), null);
  const s = parseSaved(JSON.stringify({ v: 1, loads: [{ kind: "zzz", name: 5, qty: 2, ma: "x" }], opts: { volts: -1 } }))!;
  assert.deepEqual(s.loads[0], { kind: "other", name: "", qty: 2, ma: 0, inrushMa: 0, duty: 100 });
  assert.deepEqual(s.opts, DEFAULT_OPTS);
});
