// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/udp/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { lastOkConfig, udpLaunch } from "./launch.ts";

const base = {
  bindHost: "0.0.0.0",
  bindPort: 5000,
  remoteHost: "192.168.0.10",
  remotePort: 5000,
  broadcast: false,
  multicastGroup: "",
  multicastIf: "0.0.0.0",
  multicastTtl: 1,
  multicastLoop: true,
  echo: false,
};

test("--auto 만 읽고 나머지는 bad", () => {
  assert.deepEqual(udpLaunch([]), { auto: false, bad: [] });
  assert.deepEqual(udpLaunch(["--auto"]), { auto: true, bad: [] });
  const r = udpLaunch(["--auto", "--port", "COM3", "x"]);
  assert.equal(r.auto, true);
  assert.ok(r.bad.length > 0);
  assert.equal(udpLaunch(["--port", "COM3"]).auto, false);
});

test("lastOkConfig — 맞는 칸만 덮고, 받을 포트가 틀리면 null", () => {
  assert.equal(lastOkConfig(null, base), null);
  assert.equal(lastOkConfig("x", base), null);
  assert.equal(lastOkConfig([], base), null);
  assert.equal(lastOkConfig({ bindPort: 70000 }, base), null);
  assert.equal(lastOkConfig({ bindPort: "5000" }, base), null);
  assert.deepEqual(lastOkConfig({ bindPort: 6000, remoteHost: " 10.0.0.5 ", remotePort: 7000, echo: true }, base), {
    ...base,
    bindPort: 6000,
    remoteHost: "10.0.0.5",
    remotePort: 7000,
    echo: true,
  });
  const bad = lastOkConfig({ bindPort: 0, bindHost: "", remotePort: -1, multicastTtl: 0, broadcast: "yes" }, base);
  assert.deepEqual(bad, { ...base, bindPort: 0 });
});
