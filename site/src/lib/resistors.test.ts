// 합성 저항(직렬·병렬) — 정의식과 표준 값 조합
import { test } from "node:test";
import assert from "node:assert/strict";
import { bestCombos, parallel, parallelPartner, parallelShares, parseOhm, parseOhms, series, seriesPartner } from "./resistors.ts";
import { E_BASE } from "./divider.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("정의식: 직렬은 합, 병렬은 역수의 합의 역수", () => {
  near(series([1e3, 2.2e3]), 3200, 1e-9);
  near(parallel([10e3, 10e3]), 5000, 1e-9);
  near(parallel([1e3, 2e3, 4e3]), 4000 / 7, 1e-9);
  // 두 개면 R1 × R2 ÷ (R1 + R2)
  near(parallel([4.7e3, 2.2e3]), (4.7e3 * 2.2e3) / 6.9e3, 1e-9);
  // 병렬 합성은 가장 작은 저항보다 작다
  assert.ok(parallel([100, 1e6]) < 100);
});

test("병렬 전류 몫은 저항에 반비례, 합은 1", () => {
  const s = parallelShares([1e3, 2e3, 4e3]);
  near(s[0], 4 / 7, 1e-12);
  near(s[1], 2 / 7, 1e-12);
  near(s.reduce((a, b) => a + b, 0), 1, 1e-12);
});

test("짝 찾기: 10 kΩ 에 병렬로 6 kΩ → 15 kΩ, 1 kΩ 에 직렬로 3.3 kΩ → 2.3 kΩ", () => {
  near(parallelPartner(10e3, 6e3), 15e3, 1e-9);
  near(parallel([10e3, parallelPartner(10e3, 6e3)]), 6e3, 1e-9);
  near(seriesPartner(1e3, 3.3e3), 2.3e3, 1e-9);
  assert.throws(() => parallelPartner(5e3, 6e3)); // 병렬로는 더 커지지 않는다
  assert.throws(() => parallelPartner(6e3, 6e3));
  assert.throws(() => seriesPartner(4e3, 3e3)); // 직렬로는 더 작아지지 않는다
});

test("표준 값 조합: E12 로 5 kΩ = 10k ∥ 10k, 3.3 kΩ = 1.8k + 1.5k (오차 0)", () => {
  const p = bestCombos(5000, "E12", "parallel");
  assert.deepEqual([p[0].a, p[0].b, p[0].err], [10e3, 10e3, 0]);
  const s = bestCombos(3300, "E12", "series");
  assert.equal(s[0].err, 0);
  assert.equal(s[0].value, 3300);
  assert.deepEqual([s[0].a, s[0].b], [1800, 1500]);
});

test("조합: 오차순, 값은 정의식 그대로, 쓰인 값은 모두 표 안", () => {
  const all = new Set(E_BASE.E24.map((v) => v / 10));
  const decadeOk = (v: number) => all.has(Number((v / 10 ** Math.floor(Math.log10(v))).toPrecision(3)));
  for (const t of [6040, 137, 1.234e6, 0.47, 3.3e7]) {
    const cs = bestCombos(t, "E24");
    assert.ok(cs.length > 0, String(t));
    for (let i = 1; i < cs.length; i++) assert.ok(Math.abs(cs[i].err) >= Math.abs(cs[i - 1].err));
    for (const c of cs) {
      near(c.value, c.mode === "series" ? c.a + c.b : (c.a * c.b) / (c.a + c.b), Math.abs(c.value) * 1e-9);
      near(c.err, ((c.value - t) / t) * 100, 1e-6);
      assert.ok(decadeOk(c.a) && decadeOk(c.b), `${c.a}·${c.b}`);
    }
  }
  // E24 두 개 조합은 E24 가까운 값 하나(최대 약 ±5 %)보다 낫다 — 6.04 kΩ 은 1 % 안
  assert.ok(Math.abs(bestCombos(6040, "E24")[0].err) < 1);
});

test("경계값: 0·음수·빈칸(NaN)·아주 큰 수는 거절, Infinity 가 화면에 찍히지 않게", () => {
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.throws(() => series([bad]), String(bad));
    assert.throws(() => parallel([1e3, bad]), String(bad));
    assert.throws(() => bestCombos(bad, "E12"), String(bad));
  }
  assert.throws(() => series([]));
  assert.throws(() => series([1e308, 1e308])); // 합이 넘침
  assert.throws(() => parallelPartner(NaN, 1));
  assert.throws(() => parallelPartner(1e308 * 10, 1));
  near(parallel([1e-3, 1e-3]), 5e-4, 1e-15);
});

test("값 읽기: 4.7k·4k7·2M2·0R47·470·10 kΩ, m(밀리)은 거절", () => {
  near(parseOhm("4.7k"), 4700, 1e-9);
  near(parseOhm("4k7"), 4700, 1e-9);
  near(parseOhm("2M2"), 2.2e6, 1e-6);
  near(parseOhm("0R47"), 0.47, 1e-12);
  near(parseOhm("470"), 470, 0);
  near(parseOhm("10 kΩ"), 10e3, 0);
  near(parseOhm("1,5k"), 1500, 1e-9);
  near(parseOhm("100R"), 100, 0);
  near(parseOhm("k1"), 100, 1e-9);
  for (const bad of ["", "abc", "1m", "4.7k7", "1e999", "-1k"]) assert.ok(Number.isNaN(parseOhm(bad)), bad);
  assert.deepEqual(parseOhms("10k, 4k7  2.2k;100"), [10e3, 4700, 2200, 100]);
});
