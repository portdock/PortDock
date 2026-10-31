import { test } from "node:test";
import assert from "node:assert/strict";
import { THREADS, byHexKey, bySpanner, parseThread, tapDrill } from "./threads.ts";

test("보통 나사 피치 — ISO 262 (M2 0.4 … M20 2.5)", () => {
  assert.equal(THREADS.map((r) => `M${r.d}:${r.coarse}`).join(" "), "M2:0.4 M2.5:0.45 M3:0.5 M4:0.7 M5:0.8 M6:1 M8:1.25 M10:1.5 M12:1.75 M14:2 M16:2 M18:2.5 M20:2.5");
});

test("탭 드릴 d − P — M3 2.5·M4 3.3·M5 4.2·M6 5·M8 6.75·M10 8.5·M12 10.25·M8×1 7", () => {
  const got = THREADS.map((r) => tapDrill(r.d, r.coarse));
  assert.deepEqual(got, [1.6, 2.05, 2.5, 3.3, 4.2, 5, 6.75, 8.5, 10.25, 12, 14, 15.5, 17.5]);
  assert.equal(tapDrill(8, 1), 7);
  assert.equal(tapDrill(10, 1.25), 8.75);
});

test("렌치·스패너 — ISO 4762·ISO 4032, DIN 934 차이는 M10·M12·M14", () => {
  assert.equal(THREADS.map((r) => r.hexKey).join(), "1.5,2,2.5,3,4,5,6,8,10,12,14,14,17");
  assert.equal(THREADS.map((r) => r.spanner).join(), "4,5,5.5,7,8,10,13,16,18,21,24,27,30");
  assert.deepEqual(THREADS.filter((r) => r.spannerDin).map((r) => [r.d, r.spannerDin]), [
    [10, 17],
    [12, 19],
    [14, 22],
  ]);
  // 가는 나사는 보통 나사보다 피치가 작다
  for (const r of THREADS) for (const f of r.fine) assert.ok(f < r.coarse, `M${r.d}`);
});

test("나사 표기 읽기", () => {
  const a = parseThread("M8");
  assert.ok(a.ok && a.p === 1.25 && !a.fine);
  const b = parseThread("m10 × 1,25");
  assert.ok(b.ok && b.p === 1.25 && b.fine);
  const c = parseThread("12-1.5");
  assert.ok(c.ok && c.d === 12 && c.fine);
  assert.equal(parseThread("M8x1.5").ok, false);
  assert.equal(parseThread("M7").ok, false);
  assert.equal(parseThread("abc").ok, false);
});

test("스패너·렌치 → 나사", () => {
  assert.deepEqual(bySpanner(13).map((r) => r.d), [8]);
  assert.deepEqual(bySpanner(17).map((r) => r.d), [10]);
  assert.deepEqual(byHexKey(14).map((r) => r.d), [16, 18]);
});
