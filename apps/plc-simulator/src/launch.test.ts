// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plc-simulator/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { plcLaunch } from "./launch.ts";

test("--auto 만 읽는다", () => {
  assert.deepEqual(plcLaunch([]), { auto: false, bad: [] });
  assert.deepEqual(plcLaunch(["--auto"]), { auto: true, bad: [] });
});

test("다른 인자는 bad", () => {
  assert.deepEqual(plcLaunch(["--port", "5000", "--auto"]), { auto: true, bad: ["--port", "5000"] });
  assert.deepEqual(plcLaunch(["--auto=1"]), { auto: false, bad: ["--auto=1"] });
});
