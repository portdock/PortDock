// @ts-nocheck — 실행: node --test shared/lostAlert.test.ts (끊기면 작업 표시줄 깜빡임 — 언제 깜빡이나)
import assert from "node:assert/strict";
import test from "node:test";

// useLostAlert.ts 는 Tauri 를 불러오므로 판단 함수(lostRule.ts)만 본다
import { shouldFlash } from "./lostRule.ts";

test("연결 → 끊김, 창이 뒤에 있을 때만", () => {
  assert.equal(shouldFlash(false, true, false, true), true);
  assert.equal(shouldFlash(false, true, true, true), false); // 창이 앞
  assert.equal(shouldFlash(true, true, false, true), false); // 이미 끊긴 채(재연결 대기 계속)
  assert.equal(shouldFlash(false, false, false, true), false);
  assert.equal(shouldFlash(false, true, false, false), false); // 설정 끔
});
