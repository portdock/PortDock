// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/recent.test.ts (최근 연결 기록 정리)
import assert from "node:assert/strict";
import test from "node:test";
import { cleanRecent, forgetRecent, joinHostPort, lastRecent, loadRecent, pushRecent, RECENT_MAX, rememberRecent, removeRecent, splitHostPort } from "./recent.ts";

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

test("넣기 — 맨 앞, 같은 것(대소문자 무시)은 앞으로 옮김, 최대 8개", () => {
  let l = [];
  for (let i = 1; i <= 10; i++) l = pushRecent(l, `10.0.0.${i}:502`);
  assert.equal(l.length, RECENT_MAX);
  assert.equal(l[0], "10.0.0.10:502");
  assert.equal(l.at(-1), "10.0.0.3:502");
  l = pushRecent(l, " 10.0.0.5:502 ");
  assert.equal(l[0], "10.0.0.5:502");
  assert.equal(l.filter((x) => x === "10.0.0.5:502").length, 1);
  assert.deepEqual(pushRecent(["PLC-1:502"], "plc-1:502"), ["plc-1:502"]);
  assert.deepEqual(pushRecent(["a"], "   "), ["a"]);
  assert.deepEqual(pushRecent(["a"], "x".repeat(400)), ["a"]);
});

test("지우기·저장값 고치기", () => {
  assert.deepEqual(removeRecent(["A:1", "b:2"], "a:1"), ["b:2"]);
  assert.deepEqual(cleanRecent(null), []);
  assert.deepEqual(cleanRecent({ a: 1 }), []);
  assert.deepEqual(cleanRecent(["x", 3, null, " x ", "", "y"]), ["x", "y"]);
  assert.equal(cleanRecent(Array.from({ length: 20 }, (_, i) => `h${i}`)).length, RECENT_MAX);
});

test("모드별 저장 — 성공한 주소만 넣고 마지막 값", () => {
  const m = fakeStorage({ "recent:tcp-client": "not json" });
  assert.deepEqual(loadRecent("tcp-client"), []);
  rememberRecent("tcp-client", "192.168.0.10:502");
  rememberRecent("tcp-client", "192.168.0.11:502");
  rememberRecent("tcp-server", "0.0.0.0:5000");
  assert.equal(lastRecent("tcp-client"), "192.168.0.11:502");
  assert.equal(lastRecent("tcp-server"), "0.0.0.0:5000");
  assert.equal(lastRecent("udp"), null);
  forgetRecent("tcp-client", "192.168.0.11:502");
  assert.deepEqual(JSON.parse(m.get("recent:tcp-client")), ["192.168.0.10:502"]);
});

test("host:port 나누기·합치기", () => {
  assert.deepEqual(splitHostPort("192.168.0.10:502"), { host: "192.168.0.10", port: 502 });
  assert.deepEqual(splitHostPort("plc-1.local"), { host: "plc-1.local", port: null });
  assert.deepEqual(splitHostPort("[fe80::1]:1502"), { host: "fe80::1", port: 1502 });
  assert.deepEqual(splitHostPort("fe80::1"), { host: "fe80::1", port: null });
  assert.deepEqual(splitHostPort("h:99999"), { host: "h:99999", port: null });
  assert.deepEqual(splitHostPort("5000"), { host: "5000", port: null });
  assert.equal(joinHostPort("10.0.0.1", 502), "10.0.0.1:502");
  assert.equal(joinHostPort("fe80::1", 502), "[fe80::1]:502");
});
