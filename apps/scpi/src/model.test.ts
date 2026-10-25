// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/scpi/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addSample, blockExt, COMMON, MAX_SAMPLES, findCommon, fmtNum, hexDump, isQuery, parseIdn, parseNumber, sampleStats, samplesCsv, shortForm, showBytes } from "./model.ts";

test("*IDN? 풀이", () => {
  assert.deepEqual(parseIdn("Keysight Technologies,34465A,MY12345678,A.03.01-02.40"), { maker: "Keysight Technologies", model: "34465A", serial: "MY12345678", firmware: "A.03.01-02.40" });
  // 펌웨어에 쉼표가 있어도 넷째 칸 뒤를 모두
  assert.equal(parseIdn("ACME,X1,0,1.0,beta").firmware, "1.0,beta");
  assert.deepEqual(parseIdn("PORTDOCK,SIM"), { maker: "PORTDOCK", model: "SIM", serial: "", firmware: "" });
  assert.equal(parseIdn("1.234"), null);
  assert.equal(parseIdn(",X"), null);
});

test("질의인지", () => {
  assert.equal(isQuery("*IDN?"), true);
  assert.equal(isQuery("MEAS:VOLT:DC? 10,0.001"), true);
  assert.equal(isQuery("*CLS;*OPC?"), true);
  assert.equal(isQuery("*RST"), false);
  assert.equal(isQuery("DISP:TEXT \"OK?\""), false);
  assert.equal(isQuery("  "), false);
});

test("숫자 응답", () => {
  assert.deepEqual(parseNumber("+1.23456789E+00"), { value: 1.23456789, special: null });
  assert.deepEqual(parseNumber("-5.0E-03,+2.0E+00"), { value: -0.005, special: null });
  assert.deepEqual(parseNumber("1.5 V"), { value: 1.5, special: null });
  assert.deepEqual(parseNumber("+9.90000000E+37"), { value: null, special: "+OVLD" });
  assert.deepEqual(parseNumber("-9.9E37"), { value: null, special: "-OVLD" });
  assert.deepEqual(parseNumber("9.91E37"), { value: null, special: "NaN" });
  assert.equal(parseNumber("ACME,X1"), null);
  assert.equal(parseNumber("1.2.3"), null);
  assert.equal(parseNumber(""), null);
});

test("측정 통계·CSV", () => {
  const s = [
    { i: 1, ts: 0, ms: 1.25, value: 1, text: "1", ok: true },
    { i: 2, ts: 1000, ms: 2, value: 3, text: "3", ok: true },
    { i: 3, ts: 2000, ms: 0, value: null, text: "응답 없음, \"x\"", ok: false },
  ];
  const st = sampleStats(s);
  assert.deepEqual({ n: st.n, min: st.min, max: st.max, mean: st.mean }, { n: 2, min: 1, max: 3, mean: 2 });
  assert.equal(st.sd.toFixed(4), "1.4142");
  assert.equal(sampleStats([]), null);
  const csv = samplesCsv("MEAS:VOLT:DC?", s).split("\r\n");
  assert.equal(csv[0], "# MEAS:VOLT:DC?");
  assert.equal(csv[1], "index,time,response_ms,value,response");
  assert.match(csv[2], /^1,\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.000,1\.3,1,1$/);
  assert.match(csv[4], /,"응답 없음, ""x"""$/);
});

test("숫자 보이기·HEX 덤프·바이트 글", () => {
  assert.equal(fmtNum(1.23456789), "1.234568");
  assert.equal(fmtNum(0.00001234), "1.234e-5");
  assert.equal(fmtNum(12345678), "1.234568e+7");
  assert.equal(fmtNum(0), "0");
  assert.equal(hexDump([0x41, 0x00, 0x0a]), `000000  ${"41 00 0A".padEnd(47)}  |A..|`);
  assert.equal(hexDump(Array.from({ length: 17 }, (_, i) => i), 16).split("\n")[1].slice(0, 12), "000020  10  ");
  assert.equal(showBytes([0x2a, 0x49, 0x0d, 0x0a, 0x00]), "*I<CR><LF><00>");
  assert.equal(blockExt([0x89, 0x50, 0x4e, 0x47, 0x0d]), "png");
  assert.equal(blockExt([0x42, 0x4d, 1]), "bmp");
  assert.equal(blockExt([1, 2]), "bin");
});

test("자주 쓰는 명령 — 짧은 꼴·긴 꼴", () => {
  assert.equal(shortForm("MEASure:VOLTage:DC?"), "MEAS:VOLT:DC?");
  assert.equal(shortForm("*IDN?"), "*IDN?");
  assert.equal(findCommon("meas:volt:dc? 10")?.cmd, "MEASure:VOLTage:DC?");
  assert.equal(findCommon(":MEASURE:VOLTAGE:DC?")?.cmd, "MEASure:VOLTage:DC?");
  assert.equal(findCommon("syst:err?")?.cmd, "SYSTem:ERRor?");
  assert.equal(findCommon("*idn?")?.cmd, "*IDN?");
  assert.equal(findCommon("*CLS;*OPC?")?.cmd, "*CLS");
  // 질의 꼴이 다르면 다른 명령
  assert.equal(findCommon("*OPC")?.cmd, "*OPC");
  assert.equal(findCommon("MEAS:VOLT:DC"), null);
  assert.equal(findCommon("SOUR:VOLT 5"), null);
  // 목록의 짧은 꼴이 겹치지 않는다
  const shorts = COMMON.map((c) => shortForm(c.cmd));
  assert.equal(new Set(shorts).size, shorts.length);
});

test("반복 측정 표본 — 상한을 넘으면 오래된 것부터 버리고, 통계는 큰 배열에서도 스택을 넘치지 않는다", () => {
  const list = [];
  for (let i = 1; i <= MAX_SAMPLES + 5; i++) addSample(list, { i, ts: i, ms: 1, value: i, text: String(i), ok: true });
  assert.equal(list.length, MAX_SAMPLES);
  assert.equal(list[0].i, 6);
  const big = Array.from({ length: 300_000 }, (_, i) => ({ i, ts: i, ms: 1, value: i % 1000, text: "", ok: true }));
  const st = sampleStats(big);
  assert.equal(st.min, 0);
  assert.equal(st.max, 999);
  assert.equal(st.n, 300_000);
});
