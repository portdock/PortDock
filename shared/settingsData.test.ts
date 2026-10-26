// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/settingsData.test.ts (저장값 고치기·설정 가져오기)
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, exportAll, importAll, sanitize } from "./settingsData.ts";
import { load, loadInt } from "./framing.ts";
import { repeatInterval } from "./interlocks.ts";

/** localStorage 흉내 */
function fakeStorage(init: Record<string, string> = {}) {
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

test("저장값 — 기본값과 종류가 다르면 기본값(예: ranges 가 null 이면 {})", () => {
  fakeStorage({ ranges: "null", list: '{"a":1}', n: '"12"', ok: '{"x":1}', arr: "[1,2]" });
  assert.deepEqual(load("ranges", {}), {});
  assert.deepEqual(load("list", []), []);
  assert.equal(load("n", 5), 5);
  assert.deepEqual(load("ok", {}), { x: 1 });
  assert.deepEqual(load("arr", []), [1, 2]);
  // 기본값이 null 이면 무엇이든 받는다
  assert.deepEqual(load("ok", null), { x: 1 });
});

test("설정 고치기 — 로그 폴더·켜고 끄기 값의 타입", () => {
  const s = sanitize({ logFolder: 5, autoScroll: "yes", autoLog: 1, confirmExit: null, fontSize: NaN });
  assert.equal(s.logFolder, "");
  assert.equal(s.autoScroll, DEFAULTS.autoScroll);
  assert.equal(s.autoLog, DEFAULTS.autoLog);
  assert.equal(s.confirmExit, DEFAULTS.confirmExit);
  assert.equal(s.fontSize, DEFAULTS.fontSize);
  assert.equal(sanitize({ logFolder: "D:\\logs" }).logFolder, "D:\\logs");
});

test("설정 가져오기 — 모양 검사, 오류 자동 전송 «켬» 은 «묻기» 로", () => {
  const m = fakeStorage({ keep: '"old"' });
  const file = (data) => JSON.stringify({ app: "PortDock Serial", version: 1, data });
  assert.throws(() => importAll("PortDock Serial", file([1, 2])));
  assert.throws(() => importAll("PortDock Serial", file({ settings: "junk" })));
  assert.throws(() => importAll("PortDock Serial", "null"));
  assert.throws(() => importAll("PortDock TCP", file({})));
  assert.equal(m.get("keep"), '"old"', "rejected import leaves storage alone");
  importAll("PortDock Serial", file({ settings: { autoReport: "on", fontSize: 99 }, cmds: [1] }));
  const s = JSON.parse(m.get("settings"));
  assert.equal(s.autoReport, "ask");
  assert.equal(s.fontSize, 18);
  assert.equal(m.get("cmds"), "[1]");
  assert.equal(m.has("keep"), false);
  // 내보낸 것을 그대로 다시 가져올 수 있다
  importAll("PortDock Serial", exportAll("PortDock Serial"));
  assert.equal(JSON.parse(m.get("settings")).autoReport, "ask");
});

test("사용 통계 — 기본 꺼짐, 참·거짓만, 가져온 파일로는 켜지지 않는다(다시 묻기)", () => {
  assert.equal(DEFAULTS.usageStats, false);
  assert.equal(DEFAULTS.usageAsked, false);
  assert.equal(sanitize({ usageStats: "yes", usageAsked: 1 }).usageStats, false);
  assert.equal(sanitize({ usageStats: true, usageAsked: true }).usageStats, true);
  const m = fakeStorage();
  const file = (settings) => JSON.stringify({ app: "PortDock Serial", version: 1, data: { settings } });
  importAll("PortDock Serial", file({ usageStats: true, usageAsked: true }));
  let s = JSON.parse(m.get("settings"));
  assert.equal(s.usageStats, false);
  assert.equal(s.usageAsked, false);
  importAll("PortDock Serial", file({ usageStats: false, usageAsked: true }));
  s = JSON.parse(m.get("settings"));
  assert.equal(s.usageAsked, true, "«보내지 않기» 를 고른 것은 그대로");
});

test("반복 간격 — NaN·0·음수면 최소값(0ms 로 장비에 계속 보내지 않게)", () => {
  assert.equal(repeatInterval(NaN), 10);
  assert.equal(repeatInterval(0), 10);
  assert.equal(repeatInterval(-5), 10);
  assert.equal(repeatInterval(Infinity), 3_600_000);
  assert.equal(repeatInterval(250), 250);
  assert.equal(repeatInterval(3, 50), 50);
  fakeStorage({ a: "0", b: "12.5", c: "40", d: "null" });
  assert.equal(loadInt("a", 1, 3600, 5), 5);
  assert.equal(loadInt("b", 1, 3600, 5), 5);
  assert.equal(loadInt("c", 1, 3600, 5), 40);
  assert.equal(loadInt("d", 1, 3600, 5), 5);
  assert.equal(loadInt("none", 1, 3600, 5), 5);
});

test("새 버전 확인(0.3.0) — 기본 끔, 참일 때만 켬, 가져온 설정 파일로는 켜지지 않음", () => {
  assert.equal(DEFAULTS.updateCheck, false);
  assert.equal(sanitize({ updateCheck: "yes" }).updateCheck, false);
  assert.equal(sanitize({ updateCheck: true }).updateCheck, true);
  fakeStorage();
  importAll("PortDock Serial", JSON.stringify({ app: "PortDock Serial", data: { settings: { updateCheck: true, keepAwake: true } } }));
  const s = JSON.parse(localStorage.getItem("settings"));
  assert.equal(s.updateCheck, false);
  assert.equal(s.keepAwake, true);
});
