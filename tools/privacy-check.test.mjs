// node --test tools/privacy-check.test.mjs
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parsePrivateTerms, run, scanText } from "./privacy-check.mjs";

const rules = (text, file = "docs/x.md") => scanText(file, text).map((f) => f.rule);

test("저장소의 공개 파일에 금지 패턴이 없다", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { found, count } = run(root);
  assert.deepEqual(found, []);
  assert.ok(count > 100);
});

test("개인 경로를 잡는다", () => {
  assert.deepEqual(rules("근거: `C:\\dev\\review\\a.md`"), ["개인 경로 C:\\dev"]);
  assert.deepEqual(rules("C:/auto/career/x.md"), ["개인 경로 C:\\auto"]);
  assert.deepEqual(rules("열기 C:\\Users\\first\\a.txt"), ["개인 경로 C:\\Users\\<이름>"]);
  assert.deepEqual(rules('"C:\\\\Users\\\\first\\\\x"'), ["개인 경로 C:\\Users\\<이름>"]);
});

test("개인 경로가 아닌 것은 넘긴다", () => {
  assert.deepEqual(rules("C:\\devices\\a.json · D:\\dev2 · C:\\automation"), []);
  assert.deepEqual(rules("사용자 폴더(C:\\Users\\이름)를 ~ 로"), []);
  assert.deepEqual(rules('hideUserPaths("C:\\\\Users\\\\홍길동\\\\a.log")'), []);
  assert.deepEqual(rules("C:\\Users\\John Smith\\Desktop"), []);
  assert.deepEqual(rules("replaces `C:\\Users\\<name>` with `~`"), []);
});

test("개인 낱말은 저장소 밖(.private-terms·환경 변수)에서 읽는다 — 가짜 낱말로 시험", () => {
  const terms = parsePrivateTerms(["# 주석", "개인 메일=someone123", "회사 이름=acmecorp|에이씨엠이; 실명=hong"].join("\n"));
  assert.deepEqual(terms.map((t) => t.id), ["개인 메일", "회사 이름", "실명"]);
  assert.ok(terms[0].re.test("메일 someone123@example.com"));
  assert.ok(terms[1].re.test("ACMECORP 문서"));
  assert.ok(terms[1].re.test("에이씨엠이 이야기"));
  assert.ok(!terms[2].re.test("Copyright (C) 2026 PortDock"));
  assert.deepEqual(parsePrivateTerms(""), []);
});

test("개인 계획 낱말과 결정 기록을 잡는다", () => {
  assert.deepEqual(rules("수습 기간 겸업 조항"), ["개인 계획 낱말(수습)", "개인 계획 낱말(겸업)"]);
  assert.deepEqual(rules("부업·외주 계획"), ["개인 계획 낱말(부업)", "개인 계획 낱말(외주)"]);
  assert.deepEqual(rules("이 PC 에서는 실행하지 않는다(사용자 10/17)."), ["개인 결정 기록"]);
  assert.deepEqual(rules("방향(10/22 사용자): 광고"), ["개인 결정 기록"]);
  assert.deepEqual(rules("사용자 결정(10/23)"), ["개인 결정 기록"]);
  assert.deepEqual(rules("사용자가 요청할 때만 보낸다 · 2026-10-17 · 1/2 배율"), []);
});

test("비공개 검토 문서 경로를 잡는다", () => {
  assert.deepEqual(rules("초안 review/2026-10-23_장비맵_초안/ms300.json"), ["비공개 검토 문서 경로"]);
  assert.deepEqual(rules("docs/review-2026-10-17.md"), []);
});

test("허용 목록은 그 파일에만", () => {
  assert.deepEqual(rules("겸업", "tools/privacy-check.mjs"), []);
  assert.deepEqual(rules("겸업", "tools/other.mjs"), ["개인 계획 낱말(겸업)"]);
});
