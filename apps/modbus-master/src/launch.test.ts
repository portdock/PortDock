// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-master/src/launch.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { launchFilled, masterLaunch } from "./launch.ts";

test("--tcp host[:port] --unit n → Modbus TCP·장비 주소·국번", () => {
  assert.deepEqual(masterLaunch(["--tcp", "192.168.0.10:502", "--unit", "1"], "rtu"), { bad: [], transport: "tcp", host: "192.168.0.10", port: 502, unit: 1 });
  assert.deepEqual(masterLaunch(["--tcp=plc1"], "rtu"), { bad: [], transport: "tcp", host: "plc1", port: 502 });
  // TCP 는 유닛 0 도 된다
  assert.equal(masterLaunch(["--tcp", "10.0.0.1", "--unit", "0"], "rtu").unit, 0);
});

test("--rtu COMx --baud n → 시리얼, RTU 국번은 1 부터", () => {
  assert.deepEqual(masterLaunch(["--rtu", "com3", "--baud", "19200", "--unit", "247"], "tcp"), { bad: [], transport: "serial", serialPort: "COM3", baud: 19200, unit: 247 });
  assert.deepEqual(masterLaunch(["--rtu", "COM3", "--unit", "0"], "tcp").bad, ["--unit 0"]);
  // 연결 방식을 안 주면 지금 방식의 범위
  assert.deepEqual(masterLaunch(["--unit", "0"], "rtu").bad, ["--unit 0"]);
  assert.equal(masterLaunch(["--unit", "0"], "tcp").unit, 0);
  assert.equal(masterLaunch(["--baud", "9600"], "tcp").baud, 9600);
});

test("잘못된 인자는 무시하고 bad 로 — 맞는 것만 채운다", () => {
  const r = masterLaunch(["--tcp", "1.2.3.999", "--unit", "256", "--baud", "10", "--x"], "tcp");
  assert.deepEqual(r, { bad: ["--x", "--tcp 1.2.3.999", "--baud 10", "--unit 256"] });
  assert.ok(!launchFilled(r));
  const both = masterLaunch(["--tcp", "10.0.0.1", "--rtu", "COM1", "--unit", "2"], "tcp");
  assert.equal(both.transport, undefined);
  assert.deepEqual(both.bad, ["--tcp 10.0.0.1", "--rtu COM1"]);
  assert.equal(both.unit, 2);
  assert.ok(launchFilled(both));
  assert.deepEqual(masterLaunch([], "tcp"), { bad: [] });
});
