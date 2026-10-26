// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-slave/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLastOk, slaveLaunch } from "./launch.ts";

test("--auto 만 읽는다", () => {
  assert.deepEqual(slaveLaunch([]), { auto: false, bad: [] });
  assert.deepEqual(slaveLaunch(["--auto"]), { auto: true, bad: [] });
  assert.deepEqual(slaveLaunch(["--AUTO"]), { auto: true, bad: [] });
});

test("다른 인자·값 붙은 --auto 는 bad", () => {
  assert.deepEqual(slaveLaunch(["--port", "COM3", "--auto"]), { auto: true, bad: ["--port", "COM3"] });
  assert.deepEqual(slaveLaunch(["--auto=1"]), { auto: false, bad: ["--auto=1"] });
});

test("마지막 성공 설정 확인", () => {
  assert.equal(cleanLastOk(null), null);
  assert.equal(cleanLastOk("x"), null);
  assert.equal(cleanLastOk({ transport: "udp" }), null);
  assert.deepEqual(cleanLastOk({ transport: "serial", cfg: { port: "COM3", baud: 9600 } }), { transport: "serial", cfg: { port: "COM3", baud: 9600 } });
  assert.equal(cleanLastOk({ transport: "serial", cfg: { port: "" } }), null);
  assert.equal(cleanLastOk({ transport: "serial" }), null);
  assert.deepEqual(cleanLastOk({ transport: "tcp", net: { host: " 0.0.0.0 ", port: 502, ignoreUnitId: true } }), { transport: "tcp", net: { host: "0.0.0.0", port: 502 } });
  assert.deepEqual(cleanLastOk({ transport: "rtu-tcp", net: { host: "127.0.0.1", port: 0 } }), { transport: "rtu-tcp", net: { host: "127.0.0.1", port: 0 } });
  assert.equal(cleanLastOk({ transport: "tcp", net: { host: "", port: 502 } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", net: { host: "a", port: 70000 } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", net: { host: "a", port: "502" } }), null);
});
