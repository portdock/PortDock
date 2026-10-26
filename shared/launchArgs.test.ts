// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/launchArgs.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { comPort, hostPort, intIn, isIpv4, parseArgs } from "./launchArgs.ts";

const SPEC = { tcp: "value", unit: "value", quiet: "flag" };

test("«--이름 값»·«--이름=값»·대소문자·마지막 값", () => {
  const r = parseArgs(["--tcp", "10.0.0.5:502", "--UNIT=3", "--quiet", "--unit", "4"], SPEC);
  assert.deepEqual([...r.opts], [["tcp", "10.0.0.5:502"], ["unit", "4"], ["quiet", ""]]);
  assert.deepEqual(r.bad, []);
});

test("모르는 인자·값 빠짐·위치 인자·flag 에 값은 bad", () => {
  const r = parseArgs(["--foo", "x", "--tcp", "--unit", "", "--quiet=1", "--unit"], SPEC);
  assert.deepEqual(r.bad, ["--foo", "x", "--tcp", "--quiet=1", "--unit"]);
  assert.equal(r.opts.get("unit"), "");
  assert.deepEqual(parseArgs([], SPEC), { opts: new Map(), bad: [] });
  assert.deepEqual(parseArgs(["  "], SPEC).bad, []);
});

test("값 검사 — 정수·COM·IPv4·host:port", () => {
  assert.equal(intIn(" 12 ", 1, 247), 12);
  for (const s of ["0", "248", "1.5", "-1", "", "0x10", "99999999999"]) assert.equal(intIn(s, 1, 247), null, s);
  assert.equal(comPort("com7"), "COM7");
  assert.equal(comPort("COM012"), "COM12");
  for (const s of ["COM0", "COM", "/dev/ttyS0", "COM1; x", "COM1234"]) assert.equal(comPort(s), null, s);
  assert.ok(isIpv4("192.168.0.10"));
  for (const s of ["256.1.1.1", "1.2.3", "01.2.3.4", "1.2.3.4.5"]) assert.ok(!isIpv4(s), s);
  assert.deepEqual(hostPort("192.168.0.10", 502), { host: "192.168.0.10", port: 502 });
  assert.deepEqual(hostPort("192.168.0.10:1502", 502), { host: "192.168.0.10", port: 1502 });
  assert.deepEqual(hostPort("plc-1.local:503", 502), { host: "plc-1.local", port: 503 });
  assert.deepEqual(hostPort("[fe80::1]:502", 502), { host: "fe80::1", port: 502 });
  for (const s of ["", "1.2.3.999", "a b", "h:0", "h:70000", "h:x", "-h", "a;calc", "fe80::1", "[1.2.3.4]:5", "h\"x"]) assert.equal(hostPort(s, 502), null, s);
});
