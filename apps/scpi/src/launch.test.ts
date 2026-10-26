// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/scpi/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLastOk, scpiLaunch } from "./launch.ts";

test("--auto 만 읽고 나머지는 bad", () => {
  assert.deepEqual(scpiLaunch([]), { auto: false, bad: [] });
  assert.deepEqual(scpiLaunch(["--auto"]), { auto: true, bad: [] });
  assert.deepEqual(scpiLaunch(["--AUTO"]), { auto: true, bad: [] });
  assert.deepEqual(scpiLaunch(["--auto=1", "--port", "COM3", "x"]), { auto: false, bad: ["--auto=1", "--port", "COM3", "x"] });
});

test("마지막 성공 설정 — LAN", () => {
  assert.deepEqual(cleanLastOk({ transport: "lan", host: " 10.0.0.5 ", port: 5025, term: "crlf" }), { transport: "lan", host: "10.0.0.5", port: 5025, term: "crlf" });
  assert.deepEqual(cleanLastOk({ transport: "lan", host: "a", port: 1, term: "zz" }), { transport: "lan", host: "a", port: 1, term: undefined });
  assert.equal(cleanLastOk({ transport: "lan", host: "", port: 5025 }), null);
  assert.equal(cleanLastOk({ transport: "lan", host: "a", port: 0 }), null);
  assert.equal(cleanLastOk({ transport: "lan", host: "a", port: "5025" }), null);
});

test("마지막 성공 설정 — 시리얼, 틀린 칸은 버린다", () => {
  assert.deepEqual(cleanLastOk({ transport: "serial", serialPort: "COM3", baud: 9600, dataBits: 8, parity: "even", stopBits: 2, flow: "hardware", term: "lf" }), {
    transport: "serial",
    serialPort: "COM3",
    baud: 9600,
    dataBits: 8,
    parity: "even",
    stopBits: 2,
    flow: "hardware",
    term: "lf",
  });
  assert.deepEqual(cleanLastOk({ transport: "serial", serialPort: "COM3", baud: 9600, dataBits: 9, parity: "mark", stopBits: 3, flow: 1 }), {
    transport: "serial",
    serialPort: "COM3",
    baud: 9600,
    dataBits: undefined,
    parity: undefined,
    stopBits: undefined,
    flow: undefined,
    term: undefined,
  });
  assert.equal(cleanLastOk({ transport: "serial", serialPort: "COM3", baud: 10 }), null);
  assert.equal(cleanLastOk({ transport: "usb" }), null);
  assert.equal(cleanLastOk(null), null);
  assert.equal(cleanLastOk("x"), null);
});
