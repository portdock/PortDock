// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/port-inspector/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { entryKey, overall, portLabel } from "./model.ts";

const e = (o = {}) => ({ port: "COM5", name: "USB Serial Port (COM5)", instanceId: "X\\1", present: true, vid: null, pid: null, problem: null, class: "Ports", ...o });

test("열쇠·이름", () => {
  assert.equal(entryKey(e()), "X\\1");
  assert.equal(entryKey(e({ instanceId: "" })), "COM5");
  assert.equal(portLabel(e()), "COM5 · USB Serial Port");
  assert.equal(portLabel(e({ name: "Bluetooth 링크" })), "COM5 · Bluetooth 링크");
  assert.equal(portLabel(e({ port: null, name: "LPT?" })), "LPT?");
});

test("전체 결과는 가장 무거운 것", () => {
  assert.equal(overall(["ok", "ok"]), "ok");
  assert.equal(overall(["ok", "unread"]), "unread");
  assert.equal(overall(["unread", "look"]), "look");
  assert.equal(overall(["look", "problem", "ok"]), "problem");
  assert.equal(overall([]), "ok");
});
