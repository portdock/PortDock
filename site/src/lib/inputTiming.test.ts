// 입력 장치 시간 계산 — 채터링 판정·간격 통계·주사율·폴링 레이트
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimatePolling, estimateRefresh, judgePress, snapTo, stats, trimWindow, wheelDir, fmtMs } from "./inputTiming.ts";

test("첫 누름은 간격 없음·의심 아님", () => {
  assert.deepEqual(judgePress({}, 100, 50), { suspect: false });
});

test("누름 간격이 임계값보다 짧으면 fast-repeat(채터링 의심)", () => {
  const j = judgePress({ lastDown: 100, lastUp: 105 }, 118, 30);
  assert.equal(j.interval, 18);
  assert.equal(j.upGap, 13);
  assert.equal(j.suspect, true);
  assert.equal(j.reason, "fast-repeat");
});

test("사람이 빨리 두 번 누름(누름 간격 120 ms, 뗌 → 누름 60 ms)은 의심 아님", () => {
  const j = judgePress({ lastDown: 0, lastUp: 60 }, 120, 30);
  assert.equal(j.suspect, false);
  assert.equal(j.interval, 120);
});

test("길게 누르다 뗀 뒤 임계값 안에 다시 눌림 → release-bounce(드래그 끊김 의심)", () => {
  // 0 ms 누름 → 800 ms 뗌 → 812 ms 다시 누름: 누름 간격은 길지만 뗌→누름 12 ms
  const j = judgePress({ lastDown: 0, lastUp: 800 }, 812, 40);
  assert.equal(j.suspect, true);
  assert.equal(j.reason, "release-bounce");
  // 뗌→누름 50 ms 는 임계값 40 보다 길다 → 의심 아님
  assert.equal(judgePress({ lastDown: 0, lastUp: 800 }, 850, 40).suspect, false);
});

test("뗌 기록이 앞 누름보다 이르면(뗌 이벤트를 놓침) upGap 은 없다", () => {
  const j = judgePress({ lastDown: 100, lastUp: 50 }, 400, 50);
  assert.equal(j.upGap, undefined);
  assert.equal(j.suspect, false);
});

test("임계값이 0 이하면 오류", () => {
  assert.throws(() => judgePress({}, 1, 0));
});

test("통계: 개수·최소·최대·평균·중앙값(짝수 개는 가운데 둘의 평균)", () => {
  assert.equal(stats([]), null);
  assert.deepEqual(stats([3, 1, 2]), { n: 3, min: 1, max: 3, mean: 2, median: 2 });
  assert.equal(stats([1, 2, 3, 10])!.median, 2.5);
  assert.equal(stats([NaN, 4])!.n, 1);
});

test("표준 값 붙이기: 오차 안이면 가장 가까운 값, 밖이면 null", () => {
  assert.equal(snapTo(59.94, [60, 75], 0.03), 60);
  assert.equal(snapTo(143.2, [120, 144, 165], 0.03), 144);
  assert.equal(snapTo(100, [60, 144], 0.03), null);
});

const frames = (hz: number, n: number, jitter = 0) => Array.from({ length: n }, (_, i) => i * (1000 / hz) + (i % 2 ? jitter : -jitter));

test("주사율: 60 Hz·144 Hz rAF 시각 → 60·144, 시각이 0.1 ms 단위로 잘려도", () => {
  const r60 = estimateRefresh(frames(60, 120).map((t) => Math.round(t * 10) / 10))!;
  assert.equal(r60.snapped, 60);
  assert.ok(Math.abs(r60.hz - 60) < 0.5);
  const r144 = estimateRefresh(frames(144, 300, 0.3))!;
  assert.equal(r144.snapped, 144);
  assert.equal(r144.dropped, 0);
});

test("주사율: 프레임을 건너뛴 간격은 dropped 로 세고 Hz 는 흔들리지 않는다", () => {
  const ts = frames(60, 100);
  ts.splice(50, 3); // 3프레임 빠짐 → 한 간격이 4배
  const r = estimateRefresh(ts)!;
  assert.equal(r.dropped, 1);
  assert.equal(r.snapped, 60);
});

test("주사율: 간격 10개 미만이면 null", () => {
  assert.equal(estimateRefresh(frames(60, 5)), null);
});

test("폴링: 1000 Hz 이벤트를 1 ms 단위로 잘라도 1000 으로", () => {
  const ts = Array.from({ length: 400 }, (_, i) => Math.floor(i * 1.0 + 0.37));
  const p = estimatePolling(ts)!;
  assert.equal(p.snapped, 1000);
  assert.equal(p.events, 400);
});

test("폴링: 멈춘 틈(50 ms 넘는 쉼)에서 구간을 나눠 가장 긴 구간으로 — 125 Hz", () => {
  const a = Array.from({ length: 30 }, (_, i) => i * 8);
  const b = Array.from({ length: 80 }, (_, i) => 1000 + i * 8);
  const p = estimatePolling([...a, ...b])!;
  assert.equal(p.events, 80);
  assert.equal(p.snapped, 125);
  assert.ok(Math.abs(p.hz - 125) < 0.01);
});

test("폴링: 이벤트가 모자라면 null", () => {
  assert.equal(estimatePolling([0, 1, 2]), null);
  assert.equal(estimatePolling([]), null);
});

test("시간 창: 오래된 시각을 앞에서 지운다", () => {
  assert.deepEqual(trimWindow([1, 2, 500, 900, 1000], 1000, 500), [500, 900, 1000]);
});

test("휠 방향: 세로 우선, 0 이면 null", () => {
  assert.equal(wheelDir(0, -100), "up");
  assert.equal(wheelDir(0, 3), "down");
  assert.equal(wheelDir(-40, 2), "left");
  assert.equal(wheelDir(40, 0), "right");
  assert.equal(wheelDir(0, 0), null);
});

test("ms 표시", () => {
  assert.equal(fmtMs(12.345), "12.3 ms");
  assert.equal(fmtMs(undefined), "–");
});
