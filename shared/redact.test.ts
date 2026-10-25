// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/redact.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { hideUserPaths } from "./redact.ts";

test("사용자 폴더를 가린다", () => {
  assert.equal(hideUserPaths("C:\\Users\\홍길동\\a.log"), "~\\a.log");
  assert.equal(hideUserPaths('{"p":"c:\\\\users\\\\kim\\\\x"}'), '{"p":"~\\\\x"}');
  assert.equal(hideUserPaths("open C:/Users/lee/b.txt failed"), "open ~/b.txt failed");
  assert.equal(hideUserPaths("at C:\\Users\\park"), "at ~");
});

test("빈칸이 있는 사용자 이름도 통째로 가린다", () => {
  assert.equal(hideUserPaths("C:\\Users\\John Smith\\Desktop\\log.txt: denied"), "~\\Desktop\\log.txt: denied");
  assert.equal(hideUserPaths('"C:\\\\Users\\\\John Smith\\\\a"'), '"~\\\\a"');
  // 구분자 없이 끝나면 빈칸 앞까지(뒤 글은 남긴다)
  assert.equal(hideUserPaths("home C:\\Users\\bob and D:\\x"), "home ~ and D:\\x");
});
