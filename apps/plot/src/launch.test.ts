// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plot/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { lastOkOf, lastOkText, launchFilled, plotLaunch } from "./launch.ts";

test("--serial COMx --baud n → 시리얼·포트·속도", () => {
  assert.deepEqual(plotLaunch(["--serial", "com3", "--baud", "9600"]), { auto: false, bad: [], transport: "serial", serialPort: "COM3", baud: 9600 });
  assert.deepEqual(plotLaunch(["--serial=COM12"]), { auto: false, bad: [], transport: "serial", serialPort: "COM12" });
});

test("--tcp host:port → TCP 클라이언트, 포트가 없으면 무시", () => {
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5:5000"]), { auto: false, bad: [], transport: "tcp", host: "10.0.0.5", port: 5000 });
  assert.deepEqual(plotLaunch(["--tcp", "[::1]:5000"]), { auto: false, bad: [], transport: "tcp", host: "::1", port: 5000 });
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5"]), { auto: false, bad: ["--tcp 10.0.0.5"] });
  assert.deepEqual(plotLaunch(["--tcp", "10.0.0.5:0"]), { auto: false, bad: ["--tcp 10.0.0.5:0"] });
});

test("--udp port → UDP 받기, 0~65535", () => {
  assert.deepEqual(plotLaunch(["--udp", "5005"]), { auto: false, bad: [], transport: "udp", port: 5005 });
  assert.equal(plotLaunch(["--udp", "0"]).port, 0);
  assert.deepEqual(plotLaunch(["--udp", "70000"]), { auto: false, bad: ["--udp 70000"] });
});

test("받는 곳이 둘 이상이면 모두 무시, 그 밖의 잘못된 인자도 bad 로", () => {
  const r = plotLaunch(["--serial", "COM3", "--udp", "5005", "--baud", "115200"]);
  assert.equal(r.transport, undefined);
  assert.deepEqual(r.bad, ["--serial COM3", "--udp 5005"]);
  assert.equal(r.baud, 115200);
  assert.ok(launchFilled(r));
  const x = plotLaunch(["--serial", "LPT1", "--baud", "10", "--x"]);
  assert.deepEqual(x, { auto: false, bad: ["--x", "--serial LPT1", "--baud 10"] });
  assert.ok(!launchFilled(x));
  assert.deepEqual(plotLaunch([]), { auto: false, bad: [] });
});

test("--auto 는 혼자 쓰는 인자", () => {
  assert.deepEqual(plotLaunch(["--udp", "5005", "--auto"]), { auto: true, bad: [], transport: "udp", port: 5005 });
  assert.equal(plotLaunch(["--auto"]).auto, true);
  assert.ok(!launchFilled(plotLaunch(["--auto"])));
  assert.deepEqual(plotLaunch(["--auto=1"]).bad, ["--auto=1"]);
});

test("마지막 성공 설정 확인 — 틀린 모양은 null, 빠진 칸은 기본값", () => {
  assert.deepEqual(lastOkOf({ transport: "serial", cfg: { port: "COM3", baud: 9600 } }), {
    transport: "serial",
    cfg: { port: "COM3", baud: 9600, dataBits: 8, parity: "none", stopBits: 1, dtr: true, autoReconnect: true },
  });
  assert.deepEqual(lastOkOf({ transport: "tcp", host: " 10.0.0.5 ", port: 5000 }), { transport: "tcp", host: "10.0.0.5", port: 5000 });
  assert.deepEqual(lastOkOf({ transport: "udp", host: "0.0.0.0", port: 0 }), { transport: "udp", host: "0.0.0.0", port: 0, group: "" });
  for (const bad of [null, "x", [], { transport: "serial", cfg: { port: "", baud: 9600 } }, { transport: "serial", cfg: { port: "COM3", baud: 10 } }, { transport: "tcp", host: "", port: 1 }, { transport: "tcp", host: "a", port: 0 }, { transport: "udp", host: "", port: 70000 }, { transport: "x" }])
    assert.equal(lastOkOf(bad), null);
  assert.equal(lastOkText(lastOkOf({ transport: "serial", cfg: { port: "COM3", baud: 9600 } })), "COM3 9600");
  assert.equal(lastOkText({ transport: "tcp", host: "::1", port: 5000 }), "TCP [::1]:5000");
  assert.equal(lastOkText({ transport: "udp", host: "", port: 5005, group: "" }), "UDP :5005");
});
