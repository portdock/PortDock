// 노트북 배터리 리포트 해석 — 가짜 리포트(영어·한국어·배터리 없음)로 표 가리기·숫자 읽기·개인 정보 빼기를 본다
import { test } from "node:test";
import assert from "node:assert/strict";
import { cellText, chart, mwh, NotBatteryReport, parseBatteryReport, tables, totalHealth, trend } from "./batteryReport.ts";
import { REPORT_EN, REPORT_KO, REPORT_NO_BATTERY } from "./batteryFixture.ts";

test("mWh 숫자: 쉼표·마침표·띄어쓰기 천 단위, mWh 아니면 null", () => {
  assert.equal(mwh("41,440 mWh"), 41440);
  assert.equal(mwh("41.440 mWh"), 41440);
  assert.equal(mwh("41 440 mWh"), 41440);
  assert.equal(mwh("41 440 mWh"), 41440);
  assert.equal(mwh("212"), null);
  assert.equal(mwh("-"), null);
  assert.equal(mwh("0:12:00"), null);
});

test("칸 글: 꼬리표·엔티티 빼고 공백 하나로", () => {
  assert.equal(cellText('<span class="date">2026-10-30 </span><span class="time">08:01:23</span>'), "2026-10-30 08:01:23");
  assert.equal(cellText("&nbsp;A&amp;B&#65;&#x42;\n"), "A&BAB");
});

test("표 나누기: script 안의 표 글은 세지 않는다", () => {
  const t = tables(REPORT_EN);
  assert.equal(t.length, 6);
  assert.ok(t.every((rows) => rows.every((r) => !r.cells.includes("not a table"))));
});

test("영어 리포트: 설계·완전 충전·충전 횟수·남은 비율", () => {
  const r = parseBatteryReport(REPORT_EN);
  assert.equal(r.batteries.length, 1);
  const b = r.batteries[0];
  assert.equal(b.design, 56000);
  assert.equal(b.full, 47320);
  assert.equal(b.cycles, 212);
  assert.equal(b.health.toFixed(1), "84.5");
});

test("영어 리포트: 용량 이력(기간·순서), 배터리 사용·수명 추정 표는 이력으로 섞이지 않음", () => {
  const r = parseBatteryReport(REPORT_EN);
  assert.equal(r.history.length, 5);
  assert.deepEqual(r.history[0], { start: "2025-10-01", end: "2025-11-01", full: 55210, design: 56000 });
  assert.deepEqual(r.history[4], { start: "2026-10-24", end: undefined, full: 47320, design: 56000 });
  const tr = trend(r.history)!;
  assert.equal(tr.from, "2025-10-01");
  assert.equal(tr.to, "2026-10-24");
  assert.equal(tr.startPct.toFixed(1), "98.6");
  assert.equal(tr.endPct.toFixed(1), "84.5");
});

test("영어 리포트: 최근 사용 — 날짜 이어받기, 빈 원본, mWh 없음(-), 배터리 사용 표(시간 칸)는 빼기", () => {
  const r = parseBatteryReport(REPORT_EN);
  assert.equal(r.recent.length, 6);
  assert.deepEqual(r.recent[0], { date: "2026-10-30", time: "08:01:23", state: "Active", source: "Battery", percent: 93, mWh: 44010 });
  assert.equal(r.recent[2].date, "2026-10-30");
  assert.equal(r.recent[2].source, "AC");
  assert.equal(r.recent[3].date, "2026-10-31");
  assert.equal(r.recent[3].source, "");
  assert.equal(r.recent[5].mWh, null);
  assert.equal(r.recent[5].percent, 85);
});

test("한국어 리포트: 배터리 둘, 충전 횟수 없음, 이력 머리글이 «설계» 먼저면 그 순서로", () => {
  const r = parseBatteryReport(REPORT_KO);
  assert.equal(r.batteries.length, 2);
  assert.deepEqual(
    r.batteries.map((b) => [b.design, b.full, b.cycles]),
    [
      [24000, 20400, null],
      [48000, 45600, null],
    ],
  );
  assert.equal(totalHealth(r.batteries).toFixed(1), "91.7");
  assert.deepEqual(r.history[0], { start: "2026-08-01", end: "2026-09-01", full: 68000, design: 72000 });
  assert.equal(r.recent.length, 1);
  assert.equal(r.recent[0].state, "활성");
});

test("개인 정보: 풀이 결과 어디에도 컴퓨터 이름·제품·배터리 이름·일련번호가 없다", () => {
  for (const html of [REPORT_EN, REPORT_KO]) {
    const s = JSON.stringify(parseBatteryReport(html));
    for (const bad of ["EXAMPLE-LAPTOP-01", "Example Notebook", "SN-", "EX-BAT", "ExampleCell", "EX-A", "10.0.26100"]) assert.ok(!s.includes(bad), bad);
  }
});

test("배터리가 없는 리포트·다른 HTML 은 NotBatteryReport", () => {
  assert.throws(() => parseBatteryReport(REPORT_NO_BATTERY), NotBatteryReport);
  assert.throws(() => parseBatteryReport("<html><body><table><tr><td>a</td><td>b</td></tr></table></body></html>"), NotBatteryReport);
});

test("그래프 점: 처음은 왼쪽, 끝은 오른쪽, 큰 값이 위", () => {
  const r = parseBatteryReport(REPORT_EN);
  const c = chart(r.history, 300, 100);
  const pts = c.full.split(" ").map((p) => p.split(",").map(Number));
  assert.equal(pts.length, 5);
  assert.equal(pts[0][0], 0);
  assert.equal(pts[4][0], 300);
  assert.ok(pts[0][1] < pts[4][1], "줄어드는 용량은 오른쪽이 아래");
  const d = c.design.split(" ").map((p) => Number(p.split(",")[1]));
  assert.ok(d.every((y) => y === d[0]) && d[0] < pts[0][1], "설계 선은 가로·맨 위");
  assert.equal(chart([], 10, 10).full, "");
});
