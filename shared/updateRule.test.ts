// @ts-nocheck — 실행: node --test shared/updateRule.test.ts (새 버전 확인 — 실제 GitHub 에 묻지 않고 응답 모양만)
import assert from "node:assert/strict";
import test from "node:test";
import { checkDue, compareVersions, DAY_MS, parseLatest, parseVersion, shouldNotify } from "./updateRule.ts";

test("버전 읽기·비교", () => {
  assert.deepEqual(parseVersion("v0.3.1"), [0, 3, 1]);
  assert.deepEqual(parseVersion("1.10.0-beta.1"), [1, 10, 0]);
  for (const s of ["", "v1", "1.2", "1.2.3.4", "x1.2.3", "1.2.3 ; rm"]) assert.equal(parseVersion(s), null, s);
  assert.equal(compareVersions("0.3.0", "0.2.0"), 1);
  assert.equal(compareVersions("v0.10.0", "0.9.9"), 1);
  assert.equal(compareVersions("0.2.0", "0.2.0"), 0);
  assert.equal(compareVersions("0.2.0", "1.0.0"), -1);
  assert.equal(compareVersions("abc", "0.1.0"), 0);
});

test("GitHub 응답(가짜) 읽기", () => {
  assert.deepEqual(parseLatest({ tag_name: "v0.3.1", html_url: "https://github.com/portdock/PortDock/releases/tag/v0.3.1", draft: false, prerelease: false }), {
    version: "0.3.1",
    url: "https://github.com/portdock/PortDock/releases/tag/v0.3.1",
  });
  // 다른 곳 주소는 쓰지 않고 우리 릴리스 페이지로
  assert.equal(parseLatest({ tag_name: "v0.3.1", html_url: "https://evil.example/x" }).url, "https://github.com/portdock/PortDock/releases/latest");
  assert.equal(parseLatest({ tag_name: "v0.4.0", prerelease: true }), null);
  assert.equal(parseLatest({ tag_name: "v0.4.0", draft: true }), null);
  assert.equal(parseLatest({ message: "API rate limit exceeded" }), null);
  assert.equal(parseLatest(null), null);
  assert.equal(parseLatest("x"), null);
});

test("하루 한 번·알릴지", () => {
  const now = 1_800_000_000_000;
  assert.ok(checkDue(0, now));
  assert.ok(!checkDue(now - DAY_MS + 1000, now));
  assert.ok(checkDue(now - DAY_MS, now));
  assert.ok(checkDue(now + 2 * DAY_MS, now));
  assert.ok(checkDue(NaN, now));
  assert.ok(shouldNotify("0.2.0", "0.3.0", null));
  assert.ok(!shouldNotify("0.3.0", "0.3.0", null));
  assert.ok(!shouldNotify("0.3.0", "0.2.9", null));
  assert.ok(!shouldNotify("0.2.0", "0.3.0", "0.3.0"));
  assert.ok(shouldNotify("0.2.0", "0.3.1", "0.3.0"));
  assert.ok(!shouldNotify("0.2.0", null, null));
});
