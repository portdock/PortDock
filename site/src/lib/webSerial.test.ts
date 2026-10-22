// 웹 시리얼 터미널의 순수 함수 — 설정 검사·보낼 바이트·받은 바이트 끊기·로그 글
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTx, formatEntry, formatTime, logFileName, logToText, optionsLabel, portOptions, RxFramer, showBytes, trimLog, type Entry } from "./webSerial.ts";

const F = { baud: "9600", dataBits: "8", stopBits: "1", parity: "none", flow: "none" };

test("포트 설정 — 명세의 SerialOptions 범위", () => {
  assert.deepEqual(portOptions(F), { baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });
  assert.equal(optionsLabel(portOptions(F)), "9600 8N1");
  assert.equal(optionsLabel(portOptions({ ...F, baud: " 115200 ", dataBits: "7", parity: "even", stopBits: "2", flow: "hardware" })), "115200 7E2 RTS/CTS");
  for (const bad of ["0", "-9600", "96.5", "", "abc"]) assert.throws(() => portOptions({ ...F, baud: bad }), /보레이트/, bad);
  assert.throws(() => portOptions({ ...F, dataBits: "5" }));
  assert.throws(() => portOptions({ ...F, stopBits: "1.5" }));
  assert.throws(() => portOptions({ ...F, parity: "mark" }));
  assert.throws(() => portOptions({ ...F, flow: "xon" }));
  assert.throws(() => portOptions({ ...F, baud: "x" }, "en"), /positive integer/);
});

test("보낼 바이트 = 본문 + 체크섬 + 끝 문자", () => {
  assert.deepEqual(buildTx("01 03 00 00 00 0A", "hex", "crc16-modbus", "none"), [1, 3, 0, 0, 0, 0x0a, 0xc5, 0xcd]);
  assert.deepEqual(buildTx("AT", "ascii", "none", "crlf"), [0x41, 0x54, 13, 10]);
  assert.deepEqual(buildTx("AT", "ascii", "none", "cr"), [0x41, 0x54, 13]);
  assert.deepEqual(buildTx("AT", "ascii", "none", "lf"), [0x41, 0x54, 10]);
  // 체크섬은 끝 문자 앞, 끝 문자는 계산에 들어가지 않는다
  assert.deepEqual(buildTx("\\x02A\\x03", "ascii", "bcc", "cr"), [2, 0x41, 3, 0x40, 13]);
  assert.deepEqual(buildTx("", "hex", "none", "none"), []);
  assert.throws(() => buildTx("0G", "hex", "none", "none"));
});

test("받은 바이트 끊기 — LF 마다", () => {
  const f = new RxFramer("lf", 20);
  assert.deepEqual(f.push([0x4f, 0x4b], 1000), []);
  const out = f.push([0x0d, 0x0a, 0x41], 1005);
  assert.deepEqual(out, [{ dir: "rx", t: 1000, bytes: [0x4f, 0x4b, 0x0d, 0x0a] }]);
  assert.equal(f.due(1010), false);
  assert.equal(f.due(1025), true);
  assert.deepEqual(f.flush(), [{ dir: "rx", t: 1005, bytes: [0x41] }]);
  assert.deepEqual(f.flush(), []);
  assert.equal(f.due(5000), false);
});

test("받은 바이트 끊기 — 쉼(idle)·최대 길이", () => {
  const f = new RxFramer("idle", 20);
  assert.deepEqual(f.push([1, 3], 0), []);
  assert.deepEqual(f.push([2, 10], 10), []); // LF 로는 끊지 않는다
  // 20ms 넘게 쉬고 새 조각이 오면 앞의 것을 먼저 내보낸다
  assert.deepEqual(f.push([9], 40), [{ dir: "rx", t: 0, bytes: [1, 3, 2, 10] }]);
  assert.deepEqual(f.flush(), [{ dir: "rx", t: 40, bytes: [9] }]);
  const g = new RxFramer("idle", 20, 3);
  assert.deepEqual(
    g.push([1, 2, 3, 4], 0).map((e) => e.bytes),
    [[1, 2, 3]],
  );
  assert.deepEqual(g.flush()[0].bytes, [4]);
});

test("시각·파일 이름(이 PC 시각대)", () => {
  const t = new Date(2026, 9, 22, 9, 5, 7, 42).getTime();
  assert.equal(formatTime(t), "09:05:07.042");
  assert.equal(logFileName(t), "web-serial-20261022-090507.txt");
});

test("표시·로그 글", () => {
  const t = new Date(2026, 9, 22, 13, 0, 0, 5).getTime();
  const rx: Entry = { dir: "rx", t, bytes: [0x4f, 0x4b, 0x0d, 0x0a] };
  const tx: Entry = { dir: "tx", t, bytes: [0x01, 0xff] };
  const ev: Entry = { dir: "ev", t, bytes: [], text: "connected 9600 8N1" };
  assert.equal(showBytes(rx.bytes, "hex"), "4F 4B 0D 0A");
  assert.equal(showBytes(rx.bytes, "ascii"), String.raw`OK\r\n`);
  assert.equal(formatEntry(rx, "ascii", true), String.raw`13:00:00.005 RX OK\r\n`);
  assert.equal(formatEntry(tx, "hex", false), "TX 01 FF");
  assert.equal(formatEntry(tx, "ascii", false), String.raw`TX \x01\xFF`);
  assert.equal(formatEntry(ev, "hex", true), "13:00:00.005 -- connected 9600 8N1");
  assert.equal(logToText([rx, tx], "hex", false), "RX 4F 4B 0D 0A\r\nTX 01 FF\r\n");
  assert.equal(logToText([], "hex", true), "");
});

test("로그 개수 제한 — 오래된 것부터", () => {
  const xs = [1, 2, 3, 4, 5].map((t): Entry => ({ dir: "rx", t, bytes: [] }));
  assert.deepEqual(trimLog(xs, 3).map((e) => e.t), [3, 4, 5]);
  assert.equal(trimLog(xs, 10).length, 3);
});
