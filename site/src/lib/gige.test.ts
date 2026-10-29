// GigE 카메라 대역폭 — Beckhoff «Bandwidth management for GigE Vision» 예, PFNC 2.4 화소 크기
import { test } from "node:test";
import assert from "node:assert/strict";
import { bitsOf, gige, linkBytes, streamRate } from "./gige.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("Beckhoff 예: 1920 × 1200 Mono8 30 fps = 69.12 MB/s", () => {
  near(streamRate(1920, 1200, 8, 30), 69.12e6, 1e-6);
});

test("Beckhoff 예: 카메라 3대 207.36 MB/s(1 GbE 125 MB/s 를 넘음), 15 fps 로 줄이면 103.68 MB/s", () => {
  near(linkBytes(1), 125e6, 1e-6);
  const a = gige(1920, 1200, 8, 30, 3, 1, 0.9);
  near(a.total, 207.36e6, 1e-6);
  assert.ok(a.ofLink > 1);
  const b = gige(1920, 1200, 8, 15, 3, 1, 0.9);
  near(b.total, 103.68e6, 1e-6);
  near(b.ofLink, 103.68 / 125, 1e-12);
  // Beckhoff 가 가정한 110 MB/s(0.88) 안쪽
  assert.ok(gige(1920, 1200, 8, 15, 3, 1, 110 / 125).ofUsable < 1);
});

test("PFNC 화소 크기: Mono8 8, Mono12(unpacked) 16, Mono12p 12, RGB8 24, YCbCr422_8 16", () => {
  assert.equal(bitsOf("Mono8"), 8);
  assert.equal(bitsOf("Mono12"), 16);
  assert.equal(bitsOf("Mono12p"), 12);
  assert.equal(bitsOf("Mono10p"), 10);
  assert.equal(bitsOf("RGB8 / BGR8"), 24);
  assert.equal(bitsOf("YCbCr422_8"), 16);
});

test("최대 fps: 1 GbE 의 110 MB/s 를 한 대가 쓰면 1920 × 1200 Mono8 은 약 47.7 fps, Mono12 는 그 절반", () => {
  const m8 = gige(1920, 1200, 8, 30, 1, 1, 110 / 125);
  near(m8.maxFps, 110e6 / 2304000, 1e-9);
  const m12 = gige(1920, 1200, 16, 30, 1, 1, 110 / 125);
  near(m12.maxFps, m8.maxFps / 2, 1e-9);
  // 10 GbE 는 10배
  near(gige(1920, 1200, 8, 30, 1, 10, 110 / 125).maxFps, m8.maxFps * 10, 1e-6);
});

test("잘못된 값은 RangeError", () => {
  assert.throws(() => streamRate(0, 1200, 8, 30), RangeError);
  assert.throws(() => gige(1920, 1200, 8, 30, 0, 1, 0.9), RangeError);
  assert.throws(() => gige(1920, 1200, 8, 30, 1, 1, 1.2), RangeError);
});
