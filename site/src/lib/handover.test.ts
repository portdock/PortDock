// 현장 문서 묶음 — 파일 읽기(구성도 JSON·IO JSON·점검표 CSV), 절·목차, escape, 실제 내보내기 형식과 맞는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAMPLES } from "./sysDiagram.ts";
import { emptySaved, toCsv as checklistCsv } from "./commissioning.ts";
import { exampleDoc, toJson } from "./ioList.ts";
import { buildHtml, fileSlug, paragraphs, parseChecklistCsv, parseCsv, parseSaved, readIo, readSystem, sections, type Pack } from "./handover.ts";

const cover = { site: "2라인", date: "2026-10-31", author: "홍길동" };

test("CSV 읽기: 따옴표 안 쉼표·줄바꿈·\"\", BOM, CRLF, 빈 줄", () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x,1","y\n2"\r\n\r\n"q""q",\n'), [
    ["a", "b"],
    ["x,1", "y\n2"],
    ['q"q', ""],
  ]);
});

test("점검표 CSV: 시운전 점검표 «CSV 저장» 모양(한·영) 그대로 읽는다", () => {
  for (const lang of ["ko", "en"] as const) {
    const s = emptySaved();
    s.memo = {};
    const csv = "﻿" + checklistCsv(s, lang);
    const r = parseChecklistCsv(csv);
    assert.equal(r.error, undefined);
    assert.equal(r.rows.length, csv.trim().split("\r\n").length - 1);
    assert.ok(r.rows.every((x) => x.stage && x.item && !x.done));
  }
});

test("점검표 CSV: 완료 표시·메모·수식 막기 ' 떼기, 칸 순서가 달라도, 머리 없어도", () => {
  const a = parseChecklistCsv("메모,항목,완료,단계\n'=확인,배선 확인,예,설치 전\n,전원,,전원\n");
  assert.deepEqual(a.rows[0], { stage: "설치 전", item: "배선 확인", done: true, note: "=확인" });
  assert.equal(a.rows[1].done, false);
  const b = parseChecklistCsv("pre,check wiring,yes,ok\n");
  assert.deepEqual(b.rows[0], { stage: "pre", item: "check wiring", done: true, note: "ok" });
  assert.equal(parseChecklistCsv("").error, "empty");
  assert.equal(parseChecklistCsv("Stage,Done\nx,yes\n").error, "no item column");
});

test("구성도·IO JSON 읽기 — 저장 형식 그대로, 틀리면 오류", () => {
  const sys = EXAMPLES[0].make("ko");
  const r = readSystem("﻿" + JSON.stringify(sys));
  assert.deepEqual(r.errors, []);
  assert.equal(r.doc!.nodes.length, sys.nodes.length);
  assert.ok(readSystem("{").errors.length);
  assert.ok(readSystem('{"format":"x"}').errors.length);
  assert.deepEqual(readIo(toJson(exampleDoc("en"))).errors, []);
});

test("절은 들어 있는 자료만, 번호·목차가 맞는다", () => {
  const empty = buildHtml({ cover }, "ko");
  assert.ok(empty.includes("넣은 자료가 없습니다"));
  assert.equal(sections({ cover }, "ko").length, 0);
  const full: Pack = {
    cover,
    sys: EXAMPLES[0].make("ko"),
    io: exampleDoc("ko"),
    checks: [
      { stage: "설치 전", item: "배선", done: true, note: "" },
      { stage: "통신", item: "국번", done: false, note: "2번 확인" },
    ],
    contacts: "담당: 010-0000-0000",
    memo: "첫 줄\n둘째 줄\n\n새 문단",
  };
  const secs = sections(full, "ko");
  assert.deepEqual(secs.map((s) => s.id), ["sys", "devices", "io", "checks", "contacts", "memo"]);
  const html = buildHtml(full, "ko", { footer: "PortDock" });
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes('href="#io"'));
  assert.ok(html.includes("완료 1 / 2"));
  assert.ok(html.includes("남은 항목 (1)"));
  assert.ok(html.includes("INV1_FREQ_REF"));
  assert.ok(!/<script/i.test(html));
  // 구성도 없이 IO 만 → 장비 표는 IO 장비로
  const io = sections({ cover, io: exampleDoc("en") }, "en");
  assert.deepEqual(io.map((s) => s.id), ["devices", "io"]);
  assert.ok(io[0].html.includes("Modbus RTU"));
});

test("글은 모두 escape — 표지·메모·점검표·IO", () => {
  const evil = '<img src=x onerror="alert(1)">';
  const io = exampleDoc("en");
  io.devices[0].name = evil;
  const html = buildHtml({ cover: { site: evil, date: evil, author: evil }, io, checks: [{ stage: evil, item: evil, done: false, note: evil }], contacts: evil, memo: evil }, "en");
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
  assert.equal(paragraphs("a\nb\n\n<c>"), "<p>a<br>b</p><p>&lt;c&gt;</p>");
});

test("파일 이름·저장 글", () => {
  assert.equal(fileSlug(' 2라인 / 포장기:A '), "2라인-포장기-A");
  assert.equal(fileSlug(""), "handover");
  assert.deepEqual(parseSaved("{").cover, { site: "", date: "", author: "" });
  assert.equal(parseSaved(JSON.stringify({ v: 1, cover: { site: "x".repeat(500) }, memo: 3 })).cover.site.length, 120);
});
