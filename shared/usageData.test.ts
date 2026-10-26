// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/usageData.test.ts (사용 통계 묶기·허용 목록)
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowed, APTABASE_KEY, buildBatch, FEATURES, ingestUrl, MAX_MINUTES, SDK_VERSION, sessionId, windowsMajor, type UsageEvent, type UsageSession } from "./usageData.ts";

const T0 = Date.UTC(2026, 9, 26, 9, 0, 0);
const base: UsageSession = { app: "serial", version: "0.3.0", windows: "11", lang: "ko", portable: false, startedAt: T0, now: T0 + 12.6 * 60_000, counts: {}, random: 42 };

test("키가 비면 받는 곳이 없다 — 공개 저장소의 기본값", () => {
  assert.equal(APTABASE_KEY, "");
  assert.equal(ingestUrl(""), null);
  assert.equal(ingestUrl("A-US-1234567890"), null, "EU 키만");
  assert.equal(ingestUrl("A-SH-1234567890"), null);
  assert.equal(ingestUrl("A-EU-1234567890"), "https://eu.aptabase.com/api/v0/events");
});

test("세션: 앱·분(반올림)·설치판/휴대판만", () => {
  const [s, ...rest] = buildBatch(base);
  assert.equal(rest.length, 0);
  assert.equal(s.eventName, "session");
  assert.deepEqual(s.props, { app: "serial", minutes: 13, edition: "installed" });
  assert.deepEqual(s.systemProps, { isDebug: false, osName: "Windows", osVersion: "11", locale: "ko", appVersion: "0.3.0", sdkVersion: SDK_VERSION });
  assert.equal(s.sessionId, String(BigInt(T0 / 1000) * 100_000_000n + 42n));
  assert.equal(buildBatch({ ...base, portable: true })[0].props.edition, "portable");
});

test("기능은 횟수만, 쓴 것만, 목록 순서로", () => {
  const b = buildBatch({ ...base, counts: { send: 7, connect: 2, file_log: 0 } });
  assert.deepEqual(
    b.slice(1).map((e) => [e.eventName, e.props]),
    [
      ["serial.connect", { app: "serial", count: 2 }],
      ["serial.send", { app: "serial", count: 7 }],
    ],
  );
});

test("목록 밖 기능·다른 앱의 기능·모르는 앱은 버린다", () => {
  const b = buildBatch({ ...base, counts: { "COM3": 1, scan: 3, connect: 1 } as Record<string, number> });
  assert.deepEqual(b.map((e) => e.eventName), ["session", "serial.connect"]);
  assert.deepEqual(buildBatch({ ...base, app: "C:\\Users\\kim" }), []);
});

test("언어·윈도우 값이 낯설면 정해진 값으로", () => {
  const [s] = buildBatch({ ...base, lang: "de-DE", windows: "DESKTOP-ABC" });
  assert.equal(s.systemProps.locale, "en");
  assert.equal(s.systemProps.osVersion, "?");
});

test("버전 꼴이 틀리면(경로·이름이 섞일 수 있는 자리) 통째로 버린다", () => {
  assert.deepEqual(buildBatch({ ...base, version: "0.3.0 (kim-pc)" }), []);
});

test("세션 길이는 0 ~ 7일로 자른다", () => {
  assert.equal(buildBatch({ ...base, now: T0 - 5000 })[0].props.minutes, 0);
  assert.equal(buildBatch({ ...base, now: T0 + 30 * 86_400_000 })[0].props.minutes, MAX_MINUTES);
});

test("보내기 전 검사: 속성이 하나라도 더 붙으면 버린다", () => {
  const [s, f] = buildBatch({ ...base, counts: { send: 1 } });
  assert.ok(allowed(s) && allowed(f));
  const bad = (e: UsageEvent, props: Record<string, string | number>) => allowed({ ...e, props: { ...e.props, ...props } });
  assert.equal(bad(s, { port: "COM3" }), false);
  assert.equal(bad(f, { ip: "192.168.0.10" }), false);
  assert.equal(bad(f, { count: 1.5 }), false);
  assert.equal(bad(f, { count: 0 }), false);
  assert.equal(bad(s, { edition: "C:\\PortDock" }), false);
  assert.equal(bad(s, { minutes: "12" }), false);
  assert.equal(allowed({ ...f, eventName: "serial.send hello" }), false);
  assert.equal(allowed({ ...f, eventName: "tcp.send" }), false, "앱 속성과 이름의 앱이 다르면");
  assert.equal(allowed({ ...s, eventName: "user=kim" }), false);
  assert.equal(allowed({ ...s, systemProps: { ...s.systemProps, osName: "DESKTOP-ABC" } }), false);
  assert.equal(allowed({ ...s, systemProps: { ...s.systemProps, locale: "ko-KR" } }), false);
  assert.equal(allowed({ ...s, sessionId: "kim" }), false);
});

test("모든 기능 이름은 짧은 소문자_밑줄, 앱마다 3~10개", () => {
  for (const [app, list] of Object.entries(FEATURES)) {
    assert.ok(list.length >= 3 && list.length <= 10, app);
    for (const f of list) {
      assert.match(f, /^[a-z_]+$/);
      assert.ok(`${app}.${f}`.length <= 60, "Aptabase 사건 이름 한도");
    }
    assert.equal(new Set(list).size, list.length, `${app} 중복`);
  }
});

test("윈도우 메이저 — WebView2 platformVersion", () => {
  assert.equal(windowsMajor("15.0.0"), "11");
  assert.equal(windowsMajor("13.0.0"), "11");
  assert.equal(windowsMajor("10.0.0"), "10");
  assert.equal(windowsMajor("0.0.0"), "?");
  assert.equal(windowsMajor(undefined), "?");
  assert.equal(windowsMajor("x"), "?");
});

test("세션 id 는 Aptabase 숫자 꼴", () => {
  assert.equal(sessionId(1_000_000, 99_999_999_999), "100099999999");
  assert.match(sessionId(T0, 0.5), /^\d+$/);
});
