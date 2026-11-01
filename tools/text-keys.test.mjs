// 실행: node --test tools/text-keys.test.mjs — 추가 언어 판정 글 사전(shared/ja/text.ts)이 소스와 맞는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { allKeys, extractObjPairs, extractPairs, holes } from "./text-keys.mjs";
import { JA_TEXT } from "../shared/ja/text.ts";
import { DE_TEXT } from "../shared/de/text.ts";
import { PL_TEXT } from "../shared/pl/text.ts";

test("열쇠 뽑기 — 글 상수·템플릿·객체 쌍", () => {
  const src = 't("가", "A") + t(`${n}개 ${x ? "y" : `z${w}`}`, `${n} items ${x ? "y" : `z${w}`}`) + t(a, b) + { ko: "다", en: `D ${k}` }';
  assert.deepEqual(extractPairs(src).map((p) => p.en), ["A", "{a} items {b}"]);
  assert.deepEqual(extractObjPairs(src).map((p) => p.en), ["D {a}"]);
});

test("ja 사전의 열쇠는 모두 소스(t(…) 영어)에 있고, 값의 자리표시는 열쇠의 것만 쓴다", () => {
  const all = allKeys();
  for (const [k, v] of Object.entries(JA_TEXT)) {
    assert.ok(all.has(k), `소스에 없는 열쇠(영어가 바뀌었나?): ${k}`);
    assert.ok(v.trim(), `빈 값: ${k}`);
    const kh = new Set(holes(k));
    for (const h of holes(v)) assert.ok(kh.has(h), `${k} → 값에 없는 자리 {${h}}`);
    // 한글이 섞이면 안 된다
    assert.ok(!/[가-힣]/.test(v), `한글 섞임: ${v}`);
  }
});

test("판정 글 대부분이 ja 사전에 있다(자리표시뿐인 열쇠 빼고)", () => {
  const missing = [...allKeys().keys()].filter((k) => !(k in JA_TEXT) && /[A-Za-z]{2}/.test(k.replace(/\{[a-z]\}/g, "")));
  assert.deepEqual(missing.filter((k) => !/^AUOptions | KB$/.test(k)), []);
});

// 추가 언어 사전 — ja 와 같은 검사(열쇠가 소스에 있음·자리표시·한글 없음·자리표시뿐 아닌 열쇠는 다 있음)
for (const [lang, dict] of Object.entries({ de: DE_TEXT, pl: PL_TEXT })) {
  test(`${lang} 사전 — 열쇠·자리표시가 소스와 맞고, 판정 글이 다 있다`, () => {
    const all = allKeys();
    for (const [k, v] of Object.entries(dict)) {
      assert.ok(all.has(k), `${lang}: 소스에 없는 열쇠: ${k}`);
      assert.ok(v.trim(), `${lang}: 빈 값: ${k}`);
      const kh = new Set(holes(k));
      for (const h of holes(v)) assert.ok(kh.has(h), `${lang}: ${k} → 값에 없는 자리 {${h}}`);
      assert.ok(!/[가-힣]/.test(v), `${lang}: 한글 섞임: ${v}`);
    }
    const missing = [...all.keys()].filter((k) => !(k in dict) && /[A-Za-z]{2}/.test(k.replace(/\{[a-z]\}/g, "")));
    assert.deepEqual(missing.filter((k) => !/^AUOptions | KB$/.test(k)), []);
  });
}
