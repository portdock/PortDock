// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/serial/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { launchFilled, serialLaunch } from "./launch.ts";

test("--port COMx --baud n → 포트·속도", () => {
  assert.deepEqual(serialLaunch(["--port", "com3", "--baud", "9600"]), { bad: [], port: "COM3", baud: 9600 });
  assert.deepEqual(serialLaunch(["--port=COM12"]), { bad: [], port: "COM12" });
  assert.deepEqual(serialLaunch(["--baud", "115200"]), { bad: [], baud: 115200 });
  assert.ok(launchFilled(serialLaunch(["--baud", "50"])));
});

test("잘못된 인자는 무시하고 bad 로 — 맞는 것만 채운다", () => {
  const r = serialLaunch(["--port", "LPT1", "--baud", "10", "--x"]);
  assert.deepEqual(r, { bad: ["--x", "--port LPT1", "--baud 10"] });
  assert.ok(!launchFilled(r));
  assert.deepEqual(serialLaunch(["--port", "COM0", "--baud", "9600"]), { bad: ["--port COM0"], baud: 9600 });
  assert.deepEqual(serialLaunch(["--baud", "20000001"]).bad, ["--baud 20000001"]);
  // 값이 빠진 인자
  assert.deepEqual(serialLaunch(["--port"]).bad, ["--port"]);
  assert.deepEqual(serialLaunch([]), { bad: [] });
});
