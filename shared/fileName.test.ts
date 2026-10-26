// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/fileName.test.ts (저장 파일 기본 이름)
import assert from "node:assert/strict";
import test from "node:test";
import { filePart, fileStamp, saveName } from "./fileName.ts";

const d = new Date(2026, 9, 26, 15, 30, 12);

test("시각 조각", () => {
  assert.equal(fileStamp(d), "20261026-153012");
  assert.equal(fileStamp(new Date(2026, 0, 2, 3, 4, 5)), "20260102-030405");
});

test("이름 조각 — 파일 이름에 못 쓰는 글자는 «-»", () => {
  assert.equal(filePart("COM3"), "COM3");
  assert.equal(filePart("192.168.0.10:502"), "192.168.0.10-502");
  assert.equal(filePart("[fe80::1]:502"), "fe80-1-502");
  assert.equal(filePart("a\\b/c*d?e\"f<g>h|i"), "a-b-c-d-e-f-g-h-i");
  assert.equal(filePart("  장비 1  "), "1");
  assert.equal(filePart("..hidden.."), "hidden");
  assert.equal(filePart("한글만"), "");
  assert.equal(filePart("x".repeat(80)).length, 40);
});

test("저장 이름", () => {
  assert.equal(saveName("serial", "COM3", "txt", d), "portdock-serial-COM3-20261026-153012.txt");
  assert.equal(saveName("tcp", "10.0.0.5:502", "txt", d), "portdock-tcp-10.0.0.5-502-20261026-153012.txt");
  assert.equal(saveName("udp", null, "txt", d), "portdock-udp-20261026-153012.txt");
  assert.equal(saveName("simulator", "한글", "txt", d), "portdock-simulator-20261026-153012.txt");
  // 이름에 경로 글자가 끼어도 폴더가 바뀌지 않는다
  assert.ok(!/[\\/:]/.test(saveName("modbus-slave", "..\\..\\x:1", "txt", d)));
});
