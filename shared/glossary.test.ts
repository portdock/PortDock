// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/glossary.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { TERMS, termsSection, type TermId } from "./glossary.ts";

test("용어: 두 언어 모두 이름·설명이 있고, 쓰지 않기로 한 낱말이 없다", () => {
  const ban = /진단|검증|최적|정상|diagnos|verif|optimi/i;
  for (const [id, t] of Object.entries(TERMS)) {
    for (const lang of ["ko", "en"] as const) {
      const [name, desc] = t[lang];
      assert.ok(name.trim() && desc.trim(), `${id} ${lang}`);
      assert.ok(!ban.test(name + desc), `${id} ${lang}: ${name} ${desc}`);
    }
  }
});

test("용어 절: 고른 것만 고른 순서로, 두 언어 같은 id", () => {
  const ids: TermId[] = ["crlf", "nagle"];
  const ko = termsSection("ko", ids);
  const en = termsSection("en", ids);
  assert.equal(ko.id, "terms");
  assert.equal(en.id, "terms");
  assert.equal(ko.title, "용어");
  assert.equal(en.title, "Terms");
  assert.equal(ko.body.length, 2);
  assert.ok(ko.body[0].startsWith("- CR · LF"));
  assert.ok(en.body[1].startsWith("- Nagle"));
});
