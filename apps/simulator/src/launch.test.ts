// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/simulator/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { simLaunch } from "./launch.ts";

test("--auto 만 읽는다(대소문자·- 하나도)", () => {
  assert.deepEqual(simLaunch(["--auto"]), { auto: true, bad: [] });
  assert.deepEqual(simLaunch(["-AUTO"]), { auto: true, bad: [] });
  assert.deepEqual(simLaunch([]), { auto: false, bad: [] });
});

test("그 밖의 인자·값 붙은 --auto 는 무시하고 bad 로", () => {
  assert.deepEqual(simLaunch(["--port", "COM3", "--auto"]), { auto: true, bad: ["--port", "COM3"] });
  assert.deepEqual(simLaunch(["--auto=1"]), { auto: false, bad: ["--auto=1"] });
});
