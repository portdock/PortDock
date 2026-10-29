// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plc-simulator/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addrText, cleanLastOk, isLoopback, packWord, parseCommands, parseDevices, parseEndCode, parseNum, parseState, runs, show16, sparse, STATE_APP, unpackWord } from "./model.ts";
import { DEV_INFO, DEVS } from "./devs.ts";

test("번호 표기: X·Y·B·W·ZR 는 16진, 나머지는 10진", () => {
  assert.equal(addrText("X", 0x1f), "X1F");
  assert.equal(addrText("ZR", 255), "ZRFF");
  assert.equal(addrText("D", 100), "D100");
  assert.deepEqual(
    DEVS.filter((d) => DEV_INFO[d].hex),
    ["X", "Y", "B", "W", "ZR"],
  );
});

test("번호 입력 읽기", () => {
  assert.equal(parseNum("D", "100"), 100);
  assert.equal(parseNum("D", " d100 "), 100);
  assert.equal(parseNum("X", "1F"), 31);
  assert.equal(parseNum("X", "x1f"), 31);
  assert.equal(parseNum("W", "0x10"), 16);
  assert.equal(parseNum("D", "1F"), null, "10진 디바이스에 16진 글자");
  assert.equal(parseNum("D", "-1"), null);
  assert.equal(parseNum("D", "65536"), null, "최대 65535");
  assert.equal(parseNum("D", ""), null);
  assert.equal(parseNum("M", "M"), null);
  assert.equal(parseNum("SM", "SM400"), 400);
});

test("비트 ↔ 워드: 번호가 작은 점이 비트 0", () => {
  const bits = [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0]; // 매뉴얼 예: M100~M115 = 1234H
  assert.equal(packWord(bits), 0x1234);
  assert.deepEqual(unpackWord(0x1234), bits);
  assert.equal(packWord(unpackWord(0xffff)), 0xffff);
});

test("워드 표시", () => {
  assert.equal(show16(0xfffe, "s16"), "-2");
  assert.equal(show16(0xab, "hex"), "00AB");
  assert.equal(show16(5, "bin"), "0000 0000 0000 0101");
  assert.equal(show16(65535, "u16"), "65535");
});

test("장애 대상 글", () => {
  assert.deepEqual(parseCommands("0401, 1401 0x0619"), [0x0401, 0x1401, 0x0619]);
  assert.deepEqual(parseCommands(""), []);
  assert.equal(parseCommands("04011"), null);
  assert.equal(parseCommands("zz"), null);
  assert.deepEqual(parseDevices("d, M m"), ["D", "M"]);
  assert.equal(parseDevices("D, Q"), null);
  assert.equal(parseEndCode("C051"), 0xc051);
  assert.equal(parseEndCode("0x4031"), 0x4031);
  assert.equal(parseEndCode("0"), null);
  assert.equal(parseEndCode("12345"), null);
});

test("0 이 아닌 칸만 저장하고 이어진 덩어리로 되살린다", () => {
  const m = sparse(10, [0, 5, 6, 0, 7]);
  assert.deepEqual(m, { "11": 5, "12": 6, "14": 7 });
  assert.deepEqual(runs(m), [
    [11, [5, 6]],
    [14, [7]],
  ]);
  assert.deepEqual(runs({ x: 1, "-1": 2, "70000": 3 }), []);
});

test("저장 파일 검사: 다른 프로그램·깨진 JSON 은 거절, 틀린 칸은 빼고 센다", () => {
  assert.deepEqual(parseState("{"), { error: "json" });
  assert.deepEqual(parseState(JSON.stringify({ app: "PortDock Modbus Slave" })), { error: "app" });
  const r = parseState(
    "﻿" +
      JSON.stringify({
        app: STATE_APP,
        version: 1,
        sizes: { D: 100, Q: 5, M: 0 },
        values: { D: { "1": 7, "2": 70000, x: 1 }, M: { "3": 1, "4": 2 }, Q: {} },
        points: { D: [{ addr: 1, type: "f32", order: "CDAB", name: "T" }, { addr: -1 }], Z: [] },
        sims: { D: [{ addr: 1, kind: "toggle" }] },
      }),
  );
  assert.ok("state" in r);
  assert.deepEqual(r.state.sizes, { D: 100 });
  assert.deepEqual(r.state.values, { D: { "1": 7 }, M: { "3": 1 } });
  assert.equal(r.state.points.D.length, 1);
  assert.equal(r.state.sims.D.length, 1);
  // Q·M0 크기, 70000·x·M4=2, Q 값, Z 칸 설정
  assert.equal(r.skipped, 7);
});

test("마지막 시작 설정", () => {
  assert.deepEqual(cleanLastOk({ transport: "udp", host: " 127.0.0.1 ", port: 5000, format: { frame: "4e", code: "ascii" } }), {
    transport: "udp",
    host: "127.0.0.1",
    port: 5000,
    format: { frame: "4e", code: "ascii" },
  });
  assert.equal(cleanLastOk({ transport: "serial", host: "x", port: 1, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "", port: 1, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "h", port: 70000, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "h", port: 1, format: { frame: "1e", code: "binary" } }), null);
  assert.equal(cleanLastOk(null), null);
});

test("이 PC 안에서만 듣는 주소", () => {
  assert.ok(isLoopback("127.0.0.1"));
  assert.ok(isLoopback("localhost"));
  assert.ok(!isLoopback("0.0.0.0"));
  assert.ok(!isLoopback("192.168.0.10"));
});
