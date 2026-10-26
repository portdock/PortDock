// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plot/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { launchFilled, plotLaunch } from "./launch.ts";

test("--serial COMx --baud n → 시리얼·포트·속도", () => {
  assert.deepEqual(plotLaunch(["--serial", "com3", "--baud", "9600"]), { bad: [], transport: "serial", serialPort: "COM3", baud: 9600 });
  assert.deepEqual(plotLaunch(["--serial=COM12"]), { bad: [], transport: "serial", serialPort: "COM12" });
});

test("--tcp host:port → TCP 클라이언트, 포트가 없으면 무시", () => {
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5:5000"]), { bad: [], transport: "tcp", host: "10.0.0.5", port: 5000 });
  assert.deepEqual(plotLaunch(["--tcp", "[::1]:5000"]), { bad: [], transport: "tcp", host: "::1", port: 5000 });
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5"]), { bad: ["--tcp 10.0.0.5"] });
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5:0"]), { bad: ["--tcp 10.0.0.5:0"] });
});

test("--udp port → UDP 받기, 0~65535", () => {
  assert.deepEqual(plotLaunch(["--udp", "5005"]), { bad: [], transport: "udp", port: 5005 });
  assert.equal(plotLaunch(["--udp", "0"]).port, 0);
  assert.deepEqual(plotLaunch(["--udp", "70000"]), { bad: ["--udp 70000"] });
});

test("받는 곳이 둘 이상이면 모두 무시, 그 밖의 잘못된 인자도 bad 로", () => {
  const r = plotLaunch(["--serial", "COM3", "--udp", "5005", "--baud", "115200"]);
  assert.equal(r.transport, undefined);
  assert.deepEqual(r.bad, ["--serial COM3", "--udp 5005"]);
  assert.equal(r.baud, 115200);
  assert.ok(launchFilled(r));
  const x = plotLaunch(["--serial", "LPT1", "--baud", "10", "--x"]);
  assert.deepEqual(x, { bad: ["--x", "--serial LPT1", "--baud 10"] });
  assert.ok(!launchFilled(x));
  assert.deepEqual(plotLaunch([]), { bad: [] });
});
