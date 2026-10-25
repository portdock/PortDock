// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/upload.test.ts (덤프 올리기 판정)
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_AUTO_TRIES, forgetTries, postForm, takeAutoTry } from "./upload.ts";

test("응답을 못 읽으면 실패 — no-cors 로 다시 보내 성공으로 치지 않는다", async () => {
  const calls = [];
  const cors = async (url, init) => {
    calls.push(init.mode ?? "cors");
    throw new TypeError("Failed to fetch");
  };
  assert.equal(await postForm("https://x/minidump", new FormData(), cors), false);
  assert.deepEqual(calls, ["cors"], "only one request, never no-cors");
  assert.equal(await postForm("https://x", new FormData(), async () => ({ ok: false, status: 429 })), false);
  assert.equal(await postForm("https://x", new FormData(), async () => ({ ok: true, status: 200 })), true);
});

test("자동 전송 다시 보내기는 기록마다 정해진 횟수까지", () => {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
  for (let i = 0; i < MAX_AUTO_TRIES; i++) assert.equal(takeAutoTry("a.txt"), true);
  assert.equal(takeAutoTry("a.txt"), false);
  assert.equal(takeAutoTry("b.txt"), true);
  forgetTries("a.txt");
  assert.equal(takeAutoTry("a.txt"), true);
});
