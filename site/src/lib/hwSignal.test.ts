// 소리·영상·게임패드 계산
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelLabel, clipped, driftSummary, noiseFloor } from "./hwSignal.ts";
import { fmtHz, framesPerSecond, freqToSlider, levelOf, mediaErrorKind, meterFraction, radialDeadzone, resolutionLabel, sliderToFreq, STANDARD_BUTTONS, sweepFreqAt } from "./hwSignal.ts";

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("로그 스윕: 20 Hz → 20 kHz, 10초의 중간(5초)은 기하 평균 632 Hz", () => {
  near(sweepFreqAt(20, 20000, 10, 0), 20, 1e-9);
  near(sweepFreqAt(20, 20000, 10, 5), Math.sqrt(20 * 20000), 1e-6);
  near(sweepFreqAt(20, 20000, 10, 99), 20000, 1e-6);
  assert.throws(() => sweepFreqAt(0, 100, 1, 0));
});

test("슬라이더 ↔ 주파수(로그 눈금) 왕복", () => {
  near(sliderToFreq(0), 20, 1e-9);
  near(sliderToFreq(1), 20000, 1e-6);
  near(sliderToFreq(freqToSlider(1000)), 1000, 1e-6);
  assert.equal(fmtHz(440), "440 Hz");
  assert.equal(fmtHz(1500), "1.50 kHz");
  assert.equal(fmtHz(15000), "15.0 kHz");
});

test("레벨: 진폭 1 사인파 → RMS −3.01 dBFS·피크 0 dBFS, 무음 → −100", () => {
  const sine = Array.from({ length: 4800 }, (_, i) => Math.sin((2 * Math.PI * 100 * i) / 48000));
  const l = levelOf(sine);
  near(l.rmsDb, -3.0103, 0.01);
  near(l.peakDb, 0, 0.01);
  assert.equal(levelOf(new Float32Array(10)).rmsDb, -100);
  assert.equal(levelOf([]).rms, 0);
});

test("막대: −60 dB 이하 0, −30 dB 절반, 0 dB 이상 1", () => {
  assert.equal(meterFraction(-80), 0);
  near(meterFraction(-30), 0.5, 1e-12);
  assert.equal(meterFraction(3), 1);
});

test("원형 데드존: 안은 0, 밖은 다시 늘여 끝은 1", () => {
  assert.deepEqual(radialDeadzone(0.05, 0.05, 0.1), { x: 0, y: 0, r: Math.hypot(0.05, 0.05), inside: true });
  const o = radialDeadzone(1, 0, 0.2);
  near(o.x, 1, 1e-12);
  assert.equal(o.inside, false);
  const h = radialDeadzone(0.6, 0, 0.2); // (0.6 − 0.2)/0.8 = 0.5
  near(h.x, 0.5, 1e-12);
  const d = radialDeadzone(0.3, 0.4, 0); // 데드존 0 이면 그대로
  near(d.x, 0.3, 1e-12);
  near(d.y, 0.4, 1e-12);
});

test("standard 배치 버튼 17개", () => {
  assert.equal(STANDARD_BUTTONS.length, 17);
});

test("초당 프레임: 30 fps 시각 → 30", () => {
  near(framesPerSecond(Array.from({ length: 31 }, (_, i) => (i * 1000) / 30))!, 30, 1e-9);
  assert.equal(framesPerSecond([5]), null);
});

test("getUserMedia 오류 이름 → 안내 종류", () => {
  assert.equal(mediaErrorKind("NotAllowedError"), "denied");
  assert.equal(mediaErrorKind("NotFoundError"), "notfound");
  assert.equal(mediaErrorKind("NotReadableError"), "busy");
  assert.equal(mediaErrorKind("OverconstrainedError"), "constraint");
  assert.equal(mediaErrorKind("TypeError"), "insecure");
  assert.equal(mediaErrorKind(undefined), "other");
});

test("잡음 바닥: 하위 10 % — 조용한 −70 dB 사이에 말소리 −20 dB 가 섞여도 −70", () => {
  const xs = [...Array(80).fill(-70), ...Array(20).fill(-20)];
  assert.equal(noiseFloor(xs), -70);
  assert.equal(noiseFloor([]), null);
});

test("클리핑: 0.999 이상", () => {
  assert.equal(clipped(1), true);
  assert.equal(clipped(0.98), false);
});

test("채널 이름: 스테레오 L·R, 5.1 은 L R C LFE SL SR, 7.1 의 5번부터는 번호", () => {
  assert.equal(channelLabel(1, 2, "en"), "Right (R)");
  assert.equal(channelLabel(3, 6, "ko"), "우퍼(LFE)");
  assert.equal(channelLabel(5, 6, "en"), "Surround right (SR)");
  assert.equal(channelLabel(2, 8, "en"), "Center (C)");
  assert.equal(channelLabel(4, 8, "ko"), "채널 5");
});

test("스틱 쏠림: 놓았을 때 (0.06, −0.08) 근처 → 거리 0.1, 데드존 12 %", () => {
  const d = driftSummary([
    [0.06, -0.08],
    [0.05, -0.07],
    [0.06, -0.08],
  ])!;
  near(d.maxR, 0.1, 1e-12);
  near(d.meanX, 0.17 / 3, 1e-12);
  assert.equal(d.deadzone, 0.12);
  assert.equal(driftSummary([]), null);
  assert.equal(driftSummary([[0, 0]])!.deadzone, 0.02);
});

test("해상도 이름", () => {
  assert.equal(resolutionLabel(1920, 1080), "1920×1080 (1080p Full HD)");
  assert.equal(resolutionLabel(1080, 1920), "1080×1920 (1080p Full HD)");
  assert.equal(resolutionLabel(800, 600), "800×600");
  assert.equal(resolutionLabel(undefined, 1), "–");
});
