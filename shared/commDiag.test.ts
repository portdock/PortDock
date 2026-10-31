// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/commDiag.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, diagnose, diagnosisText, TROUBLESHOOT } from "./commDiag.ts";

test("갈래 나누기", () => {
  assert.equal(classify({ result: "ok" }), null);
  assert.equal(classify({ result: "broadcast" }), null);
  assert.equal(classify({ result: "timeout" }), "silent");
  assert.equal(classify({ result: "timeout", echo: true }), "echo-only");
  assert.equal(classify({ result: "crc", got: 7 }), "garbled");
  assert.equal(classify({ result: "bad", partial: true, got: 3 }), "partial");
  assert.equal(classify({ result: "bad", otherUnit: 9 }), "other-unit");
  assert.equal(classify({ result: "bad" }), "bad-shape");
  assert.equal(classify({ result: "exception", code: 2 }), "exception");
  assert.equal(classify({ result: "send-error" }), "send-error");
});

test("모두 응답 없음 — 배선·국번 후보가 problem 으로 하나", () => {
  const d = diagnose(Array.from({ length: 10 }, () => ({ result: "timeout" })));
  assert.equal(d.total, 10);
  assert.equal(d.ok, 0);
  assert.deepEqual(
    d.causes.map((c) => [c.id, c.level, c.count]),
    [["silent", "problem", 10]],
  );
  const c = d.causes[0];
  assert.ok(c.candidates.some((x) => x.ko.includes("A/B")));
  assert.ok(c.links.includes(TROUBLESHOOT));
  assert.equal(TROUBLESHOOT.url("en"), "https://portdock.dev/en/tools/troubleshoot/");
  assert.equal(c.links[0].url("ko"), "https://portdock.dev/guides/modbus-no-response/");
});

test("섞인 결과 — 많이 나온 차례, 가끔 실패, 예외 코드·국번 모음", () => {
  const d = diagnose([
    { result: "ok" },
    { result: "ok" },
    { result: "crc" },
    { result: "crc" },
    { result: "crc" },
    { result: "exception", code: 2 },
    { result: "exception", code: 1 },
    { result: "exception", code: 2 },
    { result: "bad", otherUnit: 7 },
    { result: "timeout", echo: true },
  ]);
  assert.deepEqual(
    d.causes.map((c) => c.id),
    ["garbled", "exception", "other-unit", "echo-only", "intermittent"],
  );
  assert.equal(d.causes[0].level, "look");
  assert.deepEqual(d.causes[1].codes, [1, 2]);
  assert.deepEqual(d.causes[2].units, [7]);
  const intermittent = d.causes.find((c) => c.id === "intermittent");
  assert.equal(intermittent.count, 3);
});

test("빈 목록·모두 성공은 후보 없음, TCP 는 배선 후보를 빼고", () => {
  assert.deepEqual(diagnose([]).causes, []);
  assert.deepEqual(diagnose([{ result: "ok" }, { result: "ok" }]).causes, []);
  const tcp = diagnose([{ result: "timeout" }], "tcp").causes[0];
  assert.ok(!tcp.candidates.some((x) => x.ko.includes("A/B")));
});

test("글로 — 언어 섞지 않기", () => {
  const d = diagnose([{ result: "timeout" }, { result: "exception", code: 2 }]);
  const ko = diagnosisText(d, "ko", (k) => `예외 ${k}`);
  assert.ok(ko.startsWith("최근 요청 2개"));
  assert.ok(ko.includes("예외 2"));
  assert.ok(ko.includes("원인 후보:"));
  const en = diagnosisText(d, "en", (k) => `Exception ${k}`);
  assert.ok(en.startsWith("Last 2 requests"));
  assert.ok(!/[가-힣]/.test(en));
});
