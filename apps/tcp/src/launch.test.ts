// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/tcp/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { tcpLaunch } from "./launch.ts";

test("--connect host:port → 주소·포트", () => {
  assert.deepEqual(tcpLaunch(["--connect", "10.0.0.5:5000"]), { auto: false, bad: [], host: "10.0.0.5", port: 5000 });
  assert.deepEqual(tcpLaunch(["--connect=plc-1.local:502"]), { auto: false, bad: [], host: "plc-1.local", port: 502 });
  assert.deepEqual(tcpLaunch(["--CONNECT", "[fe80::1]:502"]), { auto: false, bad: [], host: "fe80::1", port: 502 });
});

test("포트가 없거나 틀리면 bad — 기본 포트를 짐작하지 않는다", () => {
  assert.deepEqual(tcpLaunch(["--connect", "10.0.0.5"]), { auto: false, bad: ["--connect 10.0.0.5"] });
  assert.deepEqual(tcpLaunch(["--connect", "10.0.0.5:0"]), { auto: false, bad: ["--connect 10.0.0.5:0"] });
  assert.deepEqual(tcpLaunch(["--connect", "10.0.0.5:70000"]), { auto: false, bad: ["--connect 10.0.0.5:70000"] });
  assert.deepEqual(tcpLaunch(["--connect", "1.2.3.999:502"]), { auto: false, bad: ["--connect 1.2.3.999:502"] });
});

test("모르는 인자·값 빠짐은 bad, 아무것도 없으면 빈 것", () => {
  assert.deepEqual(tcpLaunch(["--port", "COM3", "--connect"]), { auto: false, bad: ["--port", "COM3", "--connect"] });
  assert.deepEqual(tcpLaunch([]), { auto: false, bad: [] });
});

test("--auto 는 값 없이 — 혼자서도, --connect 와 함께도", () => {
  assert.deepEqual(tcpLaunch(["--auto"]), { auto: true, bad: [] });
  assert.deepEqual(tcpLaunch(["--connect", "10.0.0.5:502", "--AUTO"]), { auto: true, bad: [], host: "10.0.0.5", port: 502 });
  // 값을 붙이면 잘못된 인자 — 켜지 않는다
  assert.deepEqual(tcpLaunch(["--auto=1"]), { auto: false, bad: ["--auto=1"] });
});
