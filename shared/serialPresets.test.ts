// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/serialPresets.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPreset, isPresetId, presetDiff, PRESETS } from "./serialPresets.ts";
import { isExampleName, serialExamples, tcpExamples, udpExamples } from "./examples.ts";

// 첫 실행 상태(9600 8N1 · 끊김 시간 20ms · ASCII + CR LF)
const first = { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, frameKind: "gap", gapMs: 20, terminatorText: "0D 0A", rxCheck: null, mode: "ascii", checksum: null, suffix: "\\r\\n" };

test("첫 실행 값은 «일반» 그대로 — (바꿈) 없음", () => {
  assert.deepEqual(presetDiff("general", first), []);
});

test("일반은 속도를 보지 않는다", () => {
  assert.deepEqual(presetDiff("general", { ...first, baud: 115200 }), []);
  assert.deepEqual(presetDiff("general", { ...first, gapMs: 50 }), ["gapMs"]);
});

test("AT 명령 프리셋 적용 → 다른 칸 없음, 속도를 바꾸면 baud", () => {
  const at = applyPreset("at", first);
  assert.equal(at.baud, 115200);
  assert.equal(at.frameKind, "terminator");
  assert.equal(at.suffix, "\\r\\n");
  assert.deepEqual(presetDiff("at", at), []);
  assert.deepEqual(presetDiff("at", { ...at, baud: 9600 }), ["baud"]);
  // 끝 문자 칸은 표기만 달라도(0D0A·CR LF) 같은 값
  assert.deepEqual(presetDiff("at", { ...at, terminatorText: "0d0a" }), []);
  assert.deepEqual(presetDiff("at", { ...at, terminatorText: "CR LF" }), []);
  assert.deepEqual(presetDiff("at", { ...at, terminatorText: "0A" }), ["terminatorText"]);
});

test("Modbus RTU 프리셋 — HEX + CRC16, Modbus 프레임·수신 CRC, 줄 끝 없음", () => {
  const m = applyPreset("modbus", first);
  assert.deepEqual([m.baud, m.dataBits, m.parity, m.stopBits], [9600, 8, "none", 1]);
  assert.deepEqual([m.frameKind, m.rxCheck, m.mode, m.checksum, m.suffix], ["modbus-rtu", "crc16-modbus", "hex", "crc16-modbus", ""]);
  assert.deepEqual(presetDiff("modbus", m), []);
  // 짝수 패리티 장비로 고치면 (바꿈)
  assert.deepEqual(presetDiff("modbus", { ...m, parity: "even" }), ["parity"]);
  // 프레임 구분을 바꾸면 그것만(끊김 시간은 Modbus 프리셋이 정하지 않는다)
  assert.deepEqual(presetDiff("modbus", { ...m, frameKind: "gap", gapMs: 20 }), ["frameKind"]);
});

test("NMEA 프리셋 — LF 로 끊기", () => {
  const n = applyPreset("nmea", first);
  assert.deepEqual([n.frameKind, n.terminatorText, n.mode], ["terminator", "0A", "ascii"]);
  assert.deepEqual(presetDiff("nmea", { ...n, terminatorText: "\\n" }), []);
});

test("프리셋 이름 확인", () => {
  assert.ok(isPresetId("at"));
  assert.ok(!isPresetId("rtu"));
  assert.ok(!isPresetId(null));
  assert.deepEqual(Object.keys(PRESETS), ["general", "at", "modbus", "nmea"]);
});

test("예시 명령 — 이름 앞 «예:», Modbus 는 요청 창과 같은 바이트", () => {
  const at = serialExamples("at", "ko");
  assert.deepEqual(at.map((c) => c.text), ["AT", "ATI", "AT+GMR"]);
  assert.ok(at.every((c) => isExampleName(c.name) && c.name.startsWith("예: ") && c.suffix === "\\r\\n" && c.mode === "ascii"));
  const mb = serialExamples("modbus", "en");
  assert.equal(mb[0].text, "01 03 00 00 00 0A");
  assert.equal(mb[0].checksum, "crc16-modbus");
  assert.ok(mb[0].name.startsWith("e.g. "));
  assert.equal(serialExamples("general", "ko").length, 3);
  // Modbus TCP: MBAP(트랜잭션 1·길이 6) + 국번 1 FC03 0 ×10, 체크섬 없음
  const t = tcpExamples(true, "ko");
  assert.equal(t[0].text, "00 01 00 00 00 06 01 03 00 00 00 0A");
  assert.equal(t[0].checksum, null);
  assert.ok(tcpExamples(false, "en").some((c) => c.text === "*IDN?"));
  assert.equal(udpExamples("ko").length, 3);
  // 쓰기 예시는 넣지 않는다(모르고 눌러도 장비 값이 바뀌지 않게)
  const fcOf = (c, at) => parseInt(c.text.split(" ")[at], 16);
  for (const c of [...serialExamples("general", "ko"), ...serialExamples("modbus", "ko")].filter((c) => c.mode === "hex")) assert.ok([3, 4].includes(fcOf(c, 1)), c.text);
  for (const c of [...tcpExamples(true, "ko"), ...tcpExamples(false, "ko")].filter((c) => c.mode === "hex")) assert.ok([3, 4].includes(fcOf(c, 7)), c.text);
});
