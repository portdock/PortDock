// crates/core/src/modbus.rs 의 decode·Summarizer 시험과 같은 프레임 — 웹 해석기와 프로그램이 같은 답을 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16Modbus } from "./checksum.ts";
import { decodeFrame, plcAddr, tableRows } from "./modbusDecode.ts";

const withCrc = (b: number[]) => {
  const c = crc16Modbus(b);
  return [...b, c & 0xff, c >> 8];
};
const val = (r: { fields: { name: string; value: string }[] }, name: string) => r.fields.find((f) => f.name === name)?.value;

test("03 요청·응답 (core read_holding_request_and_response)", () => {
  const req = decodeFrame(withCrc([0x01, 0x03, 0x00, 0x6b, 0x00, 0x03]), "auto", "en");
  assert.equal(req.wire, "rtu");
  assert.ok(req.crc!.ok);
  assert.equal(req.readings.length, 1);
  assert.equal(req.readings[0].role, "request");
  assert.equal(val(req.readings[0], "Start address"), "107 (40108)");

  const resp = decodeFrame(withCrc([0x01, 0x03, 0x06, 0x02, 0x2b, 0x00, 0x00, 0x00, 0x64]));
  assert.equal(resp.readings[0].role, "response");
  assert.deepEqual(resp.readings[0].tables[0].values, [555, 0, 100]);
});

test("01 바이트 수 3 은 요청·응답 둘 다 (core ambiguous_coil_response)", () => {
  const d = decodeFrame(withCrc([0x01, 0x01, 0x03, 0xff, 0x00, 0x01]));
  assert.deepEqual(
    d.readings.map((r) => r.role),
    ["request", "response"],
  );
  assert.equal(d.readings[1].tables[0].values.length, 24);
});

test("예외·CRC 틀림 (core exception_and_bad_crc)", () => {
  const ex = decodeFrame(withCrc([0x01, 0x83, 0x02]), "auto", "en");
  assert.equal(ex.readings[0].role, "exception");
  assert.ok(val(ex.readings[0], "Exception code")!.includes("Illegal Data Address"));
  assert.equal(ex.fc, 0x83);

  const bad = withCrc([0x01, 0x06, 0x00, 0x01, 0x00, 0x03]);
  bad[5] = 0x04;
  const d = decodeFrame(bad);
  assert.equal(d.crc!.ok, false);
  assert.deepEqual(d.crc!.want, withCrc([0x01, 0x06, 0x00, 0x01, 0x00, 0x04]).slice(-2));
});

test("10 요청 (core write_multiple_registers_request)·응답", () => {
  const req = decodeFrame(withCrc([0x01, 0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0a, 0x01, 0x02]));
  assert.equal(req.readings[0].role, "request");
  assert.deepEqual(req.readings[0].tables[0].values, [10, 258]);
  assert.deepEqual(req.readings[0].issues, []);
  const resp = decodeFrame(withCrc([1, 0x10, 0, 100, 0, 2]));
  assert.equal(resp.readings[0].role, "response");
});

test("0F 요청 비트, 05 에코", () => {
  const d = decodeFrame(withCrc([1, 0x0f, 0, 0, 0, 3, 1, 0b101]));
  assert.deepEqual(d.readings[0].tables[0].values, [1, 0, 1]);
  const c = decodeFrame(withCrc([2, 5, 0, 3, 0xff, 0]), "auto", "en");
  assert.equal(c.readings[0].role, "echo");
  assert.ok(val(c.readings[0], "Value")!.startsWith("ON"));
  assert.ok(val(c.readings[0], "Address")!.includes("00004"));
  const wrong = decodeFrame(withCrc([2, 5, 0, 3, 0x12, 0x34]));
  assert.equal(wrong.readings[0].issues.length, 1);
});

test("17 요청 (core new_function_names_and_fields)", () => {
  const rw = decodeFrame(withCrc([0x01, 0x17, 0, 0, 0, 2, 0, 5, 0, 1, 2, 0x12, 0x34]));
  assert.equal(rw.readings[0].role, "request");
  assert.deepEqual(rw.readings[0].tables[0].values, [0x1234]);
  assert.equal(rw.readings[0].tables[0].start, 5);
  assert.deepEqual(rw.readings[0].issues, []);
});

test("Modbus TCP 자동 판별 (core summarizer TCP 줄)", () => {
  const req = decodeFrame([0, 7, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2], "auto", "en");
  assert.equal(req.wire, "tcp");
  assert.equal(req.unit, 1);
  assert.equal(req.header[0].raw, "00 07");
  assert.equal(req.readings[0].role, "request");
  const resp = decodeFrame([0, 7, 0, 0, 0, 7, 1, 3, 4, 0, 5, 0, 6]);
  assert.equal(resp.wire, "tcp");
  assert.deepEqual(resp.readings[0].tables[0].values, [5, 6]);
  // 프로토콜 ID 가 0 이 아니면 자동은 RTU(CRC 틀림), TCP 로 고르면 알림
  const bad = [0, 1, 0, 1, 0, 6, 1, 3, 0, 0, 0, 1];
  assert.equal(decodeFrame(bad).wire, "rtu");
  assert.ok(decodeFrame(bad, "tcp").notes.length > 0);
});

test("주소 표기 (core AddrStyle plc)", () => {
  assert.equal(plcAddr("hr", 0), "40001");
  assert.equal(plcAddr("co", 3), "00004");
  assert.equal(plcAddr("ir", 0x2710), "310001");
  const rows = tableRows({ space: "hr", start: 0, values: [1, 0xffff], caption: "" });
  assert.deepEqual(rows[1], { i: 1, zero: "1", plc: "40002", dec: 65535, signed: -1, hex: "0xFFFF" });
  assert.equal(tableRows({ space: "hr", start: null, values: [1], caption: "" })[0].zero, "+0");
});

test("짧은 입력·모양이 안 맞는 프레임", () => {
  assert.throws(() => decodeFrame([1, 3, 0]));
  assert.throws(() => decodeFrame([0, 1, 0, 0, 0, 1, 1], "tcp"));
  const d = decodeFrame(withCrc([1, 3, 0, 0]));
  assert.equal(d.readings[0].role, "unknown");
  const q = decodeFrame(withCrc([1, 3, 0, 0, 0, 200]));
  assert.equal(q.readings[0].issues.length, 1);
});
