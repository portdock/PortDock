// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plot/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelName, csvOf, decimate, fmtDur, fmtNum, fmtTick, frameLen, lowerBound, nearest, padRange, parseHex, rangeOf, Ring, stats, ticks } from "./model.ts";

test("고리 버퍼 — 넘치면 오래된 것부터, 받은 순서 번호는 계속", () => {
  const r = new Ring(4);
  for (let i = 0; i < 6; i++) r.push(1000 + i * 10, [i, i * 2]);
  assert.equal(r.n, 4);
  assert.equal(r.total, 6);
  assert.deepEqual([0, 1, 2, 3].map((i) => r.index(i)), [2, 3, 4, 5]);
  assert.deepEqual([0, 1, 2, 3].map((i) => r.val(1, i)), [4, 6, 8, 10]);
  assert.equal(r.time(0), 1020);
  // 채널이 나중에 늘면 앞 줄은 빈 값
  r.push(1060, [9, 9, 7]);
  assert.equal(r.channels, 3);
  assert.ok(Number.isNaN(r.val(2, 0)));
  assert.equal(r.val(2, 3), 7);
  // 시각이 거꾸로 와도 앞 줄보다 작아지지 않는다, null 은 빈 값
  r.push(5, [null]);
  assert.equal(r.time(3), 1060);
  assert.ok(Number.isNaN(r.val(0, 3)));
  r.clear();
  assert.equal(r.n + r.total + r.channels, 0);
});

test("범위 찾기·가까운 점", () => {
  const r = new Ring(100);
  for (let i = 0; i < 10; i++) r.push(i * 100, [i]);
  assert.equal(lowerBound(r, "time", 250), 3);
  assert.equal(lowerBound(r, "points", 4), 4);
  assert.deepEqual(rangeOf(r, "time", 200, 500), [1, 7]);
  assert.deepEqual(rangeOf(r, "points", -5, 100), [0, 10]);
  assert.equal(nearest(r, "time", 240), 2);
  assert.equal(nearest(r, "time", 260), 3);
  assert.equal(nearest(r, "points", 99), 9);
  assert.equal(nearest(new Ring(4), "time", 0), -1);
});

test("솎아 그리기 — 적으면 그대로, 많으면 픽셀마다 처음·최소·최대·마지막", () => {
  const r = new Ring(10_000);
  for (let i = 0; i < 10; i++) r.push(i, [i % 2 ? 5 : -5]);
  const few = decimate(r, "points", 0, 0, 10, 0, 9, 90);
  assert.equal(few.length, 20);
  assert.equal(few[0], 0);
  assert.equal(few[18], 90);
  for (let i = 0; i < 5000; i++) r.push(i, [i === 2500 ? 1000 : Math.sin(i / 50)]);
  const [lo, hi] = [0, r.n];
  const many = decimate(r, "points", 0, lo, hi, r.firstX("points"), r.lastX("points"), 100);
  assert.ok(many.length <= 101 * 8 + 8, `${many.length}`);
  // 뾰족한 한 점이 남는다
  let peak = -Infinity;
  for (let k = 1; k < many.length; k += 2) if (many[k] > peak) peak = many[k];
  assert.equal(peak, 1000);
  // 빈 값은 선 끊기(NaN)
  const g = new Ring(10);
  g.push(0, [1]);
  g.push(1, [null]);
  g.push(2, [3]);
  const d = decimate(g, "points", 0, 0, 3, 0, 2, 100);
  assert.ok(Number.isNaN(d[3]));
});

test("통계 — 빈 값 빼고", () => {
  const r = new Ring(10);
  [3, null, 1, 5].forEach((v, i) => r.push(i, [v]));
  assert.deepEqual(stats(r, 0, 0, 4), { n: 3, last: 5, min: 1, max: 5, mean: 3 });
  assert.equal(stats(r, 3, 0, 4).n, 0);
});

test("눈금·범위·글자", () => {
  assert.deepEqual(ticks(0, 10, 5), [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(ticks(-0.3, 0.3, 4), [-0.2, 0, 0.2]);
  assert.deepEqual(ticks(0.1, 0.7, 6), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
  assert.deepEqual(padRange(5, 5), [4.75, 5.25]);
  assert.deepEqual(padRange(0, 0), [-1, 1]);
  assert.equal(fmtTick(0.1 + 0.2, 0.1), "0.3");
  assert.equal(fmtTick(1500, 500), "1500");
  assert.equal(fmtNum(23.100000001), "23.1");
  assert.equal(fmtNum(NaN), "—");
  assert.equal(fmtNum(0.00001234), "1.234e-5");
  assert.equal(fmtDur(12.345), "12.35 ms");
  assert.equal(fmtDur(1500), "1.500 s");
  assert.equal(fmtDur(-65_000), "-1 min 5.0 s");
});

test("화면 데이터 CSV", () => {
  const r = new Ring(10);
  r.push(Date.UTC(2026, 9, 19, 3, 0, 0), [1.5, null]);
  r.push(Date.UTC(2026, 9, 19, 3, 0, 0, 250), [2, 3]);
  const csv = csvOf(r, 0, 2, ["a,b", "c"]);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], '﻿time,elapsed_s,index,"a,b",c');
  assert.match(lines[1], /,0\.000,0,1\.5,$/);
  assert.match(lines[2], /,0\.250,1,2,3$/);
  assert.equal(lines.length, 4);
});

test("HEX 칸·프레임 길이·채널 이름", () => {
  assert.deepEqual(parseHex("AA 55"), { bytes: [0xaa, 0x55], error: null });
  assert.deepEqual(parseHex("0xAA,0x55").bytes, [0xaa, 0x55]);
  assert.deepEqual(parseHex("aa55").bytes, [0xaa, 0x55]);
  assert.ok(parseHex("AG").error);
  assert.ok(parseHex("A").error);
  assert.equal(frameLen({ kind: "binary", sync: [0xaa, 0x55], channels: 3, num: "f32", little: true, checksum: "crc16-modbus", checkSync: false }), 16);
  assert.equal(frameLen({ kind: "text", sep: "auto", header: "auto" }), 0);
  assert.equal(channelName(0, "", "temp"), "temp");
  assert.equal(channelName(1, " 압력 ", "x"), "압력");
  assert.equal(channelName(2, undefined, undefined), "CH3");
});
