// 화면 키보드 배열 — 키 수·겹침·줄 폭
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultLayout, layoutKeys, layoutSize, LAYOUTS, MAIN_W, type Key } from "./keyboardLayout.ts";

const overlap = (a: Key, b: Key) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9;

test("키 수: ANSI 104·ISO 105·한국어 106", () => {
  assert.equal(layoutKeys("ansi104").length, 104);
  assert.equal(layoutKeys("iso105").length, 105);
  assert.equal(layoutKeys("ko106").length, 106);
});

for (const { id } of LAYOUTS) {
  test(`${id}: code 가 겹치지 않고, 키끼리 겹치지 않는다`, () => {
    const keys = layoutKeys(id);
    assert.equal(new Set(keys.map((k) => k.code)).size, keys.length);
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) assert.ok(!overlap(keys[i], keys[j]), `${keys[i].code} ↔ ${keys[j].code}`);
  });

  test(`${id}: 본 자판의 숫자 줄~아래 줄은 오른쪽 끝이 ${MAIN_W}u`, () => {
    const keys = layoutKeys(id).filter((k) => k.x < MAIN_W && k.y > 0);
    for (const y of [1.25, 2.25, 3.25, 4.25, 5.25]) {
      const right = Math.max(...keys.filter((k) => k.y <= y && k.y + k.h > y).map((k) => k.x + k.w));
      assert.ok(Math.abs(right - MAIN_W) < 1e-9, `y=${y} → ${right}`);
    }
  });
}

test("ISO: IntlBackslash 가 있고 Enter 는 두 줄 높이", () => {
  const keys = layoutKeys("iso105");
  assert.ok(keys.some((k) => k.code === "IntlBackslash"));
  assert.equal(keys.find((k) => k.code === "Enter")!.h, 2);
  assert.ok(!layoutKeys("ansi104").some((k) => k.code === "IntlBackslash"));
});

test("한국어: 한/영(Lang1)·한자(Lang2)가 스페이스 양옆, 자모 둘째 글자", () => {
  const keys = layoutKeys("ko106");
  const sp = keys.find((k) => k.code === "Space")!;
  const l1 = keys.find((k) => k.code === "Lang1")!;
  const l2 = keys.find((k) => k.code === "Lang2")!;
  assert.equal(l2.x + l2.w, sp.x);
  assert.equal(sp.x + sp.w, l1.x);
  assert.equal(keys.find((k) => k.code === "KeyR")!.sub, "ㄱ");
  assert.equal(layoutKeys("ansi104").find((k) => k.code === "KeyR")!.sub, undefined);
});

test("전체 크기 22.5u × 6.25u", () => {
  assert.deepEqual(layoutSize(layoutKeys("ansi104")), { w: 22.5, h: 6.25 });
});

test("처음 배열: 브라우저 언어로", () => {
  assert.equal(defaultLayout(["ko-KR", "en-US"]), "ko106");
  assert.equal(defaultLayout(["en-GB"]), "iso105");
  assert.equal(defaultLayout(["de-DE"]), "iso105");
  assert.equal(defaultLayout(["en-US"]), "ansi104");
  assert.equal(defaultLayout([]), "ansi104");
});
