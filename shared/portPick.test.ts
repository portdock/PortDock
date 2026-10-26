// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/portPick.test.ts (직접 넣은 COM 포트)
import assert from "node:assert/strict";
import test from "node:test";
import { comName, extraChoice, manualPort, portUsable, setManualPort } from "./portPick.ts";

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  globalThis.localStorage = {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
  return m;
}

test("COM 이름 검사", () => {
  assert.equal(comName("com12"), "COM12");
  assert.equal(comName(" COM 7 "), "COM7");
  assert.equal(comName("COM012"), "COM12");
  assert.equal(comName(String.raw`\\.\COM20`), "COM20");
  assert.equal(comName("COM256"), "COM256");
  for (const s of ["", "COM", "COM0", "COM257", "COM1234", "/dev/ttyS0", "COM1; calc", "LPT1", "COM1 2", "콤3"]) assert.equal(comName(s), null, s);
});

test("직접 넣은 포트 — 목록에 없어도 연결할 수 있고, 고르기에 «(직접 입력)» 으로", () => {
  fakeStorage();
  const ports = [{ name: "COM3" }, { name: "COM5" }];
  assert.equal(manualPort(), "");
  assert.ok(portUsable(ports, "COM3"));
  assert.ok(!portUsable(ports, "COM12"));
  assert.ok(!portUsable(ports, ""));
  setManualPort("com12");
  assert.equal(manualPort(), "COM12");
  assert.ok(portUsable(ports, "COM12"));
  assert.equal(extraChoice(ports, "COM12"), "manual");
  assert.equal(extraChoice(ports, "COM9"), "missing");
  assert.equal(extraChoice(ports, "COM3"), null);
  assert.equal(extraChoice(ports, ""), null);
  // 잘못된 저장값은 없는 것으로
  setManualPort("x");
  assert.equal(manualPort(), "");
  fakeStorage({ manualPort: '"COM1; calc"' });
  assert.equal(manualPort(), "");
});
