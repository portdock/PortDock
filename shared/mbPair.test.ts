// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/mbPair.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16Modbus, exceptionText, pairInLog, rtuRequest, tcpRequest, valueRows } from "./mbPair.ts";
import { mbapWrap } from "./mbap.ts";

const crc = (b) => {
  const c = crc16Modbus(b);
  return [...b, c & 0xff, c >> 8];
};
const tx = (bytes, peer) => ({ dir: "tx", bytes, peer });
const rx = (bytes, peer) => ({ dir: "rx", bytes, peer });
// 국번 1 FC03 시작 0 개수 10 → CRC C5 CD
const req03 = crc([1, 3, 0, 0, 0, 10]);
const regs10 = [0x0714, 0xffff, 0x4048, 0xf5c3, 5, 6, 7, 8, 9, 10];
const resp03 = crc([1, 3, 20, ...regs10.flatMap((v) => [v >> 8, v & 0xff])]);

test("CRC16 Modbus — 01 03 00 00 00 0A → C5 CD", () => {
  assert.deepEqual(req03.slice(-2), [0xc5, 0xcd]);
  assert.deepEqual(rtuRequest(req03), { unit: 1, fc: 3, addr: 0, qty: 10 });
  // CRC 가 틀리면 요청이 아니다
  assert.equal(rtuRequest([...req03.slice(0, -1), 0]), null);
});

test("RTU FC03: 바로 앞 TX 요청과 짝 → 40001 = 1812 (0x0714)", () => {
  const log = [{ dir: "ev", bytes: [] }, tx(req03), rx([0x41, 0x54]), rx(resp03)];
  const p = pairInLog(log, 3, "rtu");
  assert.equal(p.kind, "regs");
  assert.deepEqual(p.req, { unit: 1, fc: 3, addr: 0, qty: 10 });
  const rows = valueRows(p, "u16", "plc");
  assert.deepEqual(rows[0], { addr: "40001", value: "1812 (0x0714)" });
  assert.equal(rows[9].addr, "40010");
  assert.deepEqual(valueRows(p, "u16", "zero")[1], { addr: "1", value: "65535 (0xFFFF)" });
  assert.deepEqual(valueRows(p, "s16", "plc")[1], { addr: "40002", value: "-1 (0xFFFF)" });
  assert.deepEqual(valueRows(p, "hex", "plc")[0], { addr: "40001", value: "0x0714" });
});

test("F32 ABCD·CDAB — 두 칸씩, 남는 칸은 U16", () => {
  const p = pairInLog([tx(req03), rx(resp03)], 1, "rtu");
  // 40003·40004 = 40 48 F5 C3 → 3.14 (ABCD)
  assert.equal(valueRows(p, "f32abcd", "plc")[1].value, "3.14");
  assert.equal(valueRows(p, "f32abcd", "plc")[1].addr, "40003–40004");
  assert.equal(valueRows(p, "f32cdab", "plc")[1].value, String(Number(new DataView(new Uint8Array([0xf5, 0xc3, 0x40, 0x48]).buffer).getFloat32(0).toPrecision(7))));
  // 개수 3 → F32 하나 + 남는 칸 U16 하나
  const r3 = crc([1, 3, 0, 0, 0, 3]);
  const a3 = crc([1, 3, 6, 0x40, 0x48, 0xf5, 0xc3, 0, 7]);
  const rows = valueRows(pairInLog([tx(r3), rx(a3)], 1, "rtu"), "f32abcd", "zero");
  assert.deepEqual(rows, [{ addr: "0–1", value: "3.14" }, { addr: "2", value: "7 (0x0007)" }]);
});

test("짝이 아닌 경우 — 국번·함수·바이트 수가 다르거나, CRC 틀림, 두 번째 응답", () => {
  assert.equal(pairInLog([tx(req03), rx(crc([2, 3, 20, ...new Array(20).fill(0)]))], 1, "rtu"), null);
  assert.equal(pairInLog([tx(req03), rx(crc([1, 4, 20, ...new Array(20).fill(0)]))], 1, "rtu"), null);
  assert.equal(pairInLog([tx(req03), rx(crc([1, 3, 4, 0, 1, 0, 2]))], 1, "rtu"), null);
  assert.equal(pairInLog([tx(req03), rx([...resp03.slice(0, -1), 0])], 1, "rtu"), null);
  // 같은 요청에 대한 두 번째 응답 줄은 짝이 아니다
  const log = [tx(req03), rx(resp03), rx(resp03)];
  assert.ok(pairInLog(log, 1, "rtu"));
  assert.equal(pairInLog(log, 2, "rtu"), null);
  // 요청 없이 온 응답
  assert.equal(pairInLog([rx(resp03)], 0, "rtu"), null);
  // 가장 가까운 요청(다른 국번)이 맞지 않으면 그 앞 요청과도 짝짓지 않는다
  assert.equal(pairInLog([tx(req03), tx(crc([2, 3, 0, 0, 0, 1])), rx(resp03)], 2, "rtu"), null);
  // 글자 TX 는 요청이 아니라 건너뛴다
  assert.ok(pairInLog([tx(req03), tx([0x41, 0x54, 0x0d, 0x0a]), rx(resp03)], 2, "rtu"));
});

test("예외 응답 — 함수 + 0x80, 예외 이름", () => {
  const p = pairInLog([tx(req03), rx(crc([1, 0x83, 2]))], 1, "rtu");
  assert.deepEqual([p.kind, p.code], ["exception", 2]);
  assert.equal(exceptionText(2, "ko"), "02 없는 주소 (Illegal Data Address)");
  assert.equal(exceptionText(2, "en"), "02 Illegal Data Address");
  assert.equal(exceptionText(0x0b, "en"), "0B Gateway Target Device Failed to Respond");
  assert.equal(exceptionText(0x99, "ko"), "99 알 수 없는 예외");
});

test("코일 읽기 FC01 — 비트 순서(LSB 먼저), 00001 표기", () => {
  const r = crc([1, 1, 0, 0, 0, 10]);
  const a = crc([1, 1, 2, 0b00000101, 0b10]);
  const rows = valueRows(pairInLog([tx(r), rx(a)], 1, "rtu"), "u16", "plc");
  assert.deepEqual(rows.slice(0, 3).map((x) => x.value), ["1 (ON)", "0 (OFF)", "1 (ON)"]);
  assert.equal(rows[9].value, "1 (ON)");
  assert.equal(rows[0].addr, "00001");
});

test("쓰기 응답 FC06·FC10 — 짝은 «write», 값 줄은 없다", () => {
  const r6 = crc([1, 6, 0, 1, 0, 3]);
  const p6 = pairInLog([tx(r6), rx(r6)], 1, "rtu");
  assert.equal(p6.kind, "write");
  assert.deepEqual(valueRows(p6, "u16", "plc"), []);
  const r10 = crc([1, 0x10, 0, 0, 0, 2, 4, 0, 1, 0, 2]);
  assert.equal(pairInLog([tx(r10), rx(crc([1, 0x10, 0, 0, 0, 2]))], 1, "rtu").kind, "write");
  assert.equal(pairInLog([tx(r10), rx(crc([1, 0x10, 0, 0, 0, 3]))], 1, "rtu"), null);
});

test("Modbus TCP — 트랜잭션 ID 로 짝, 같은 상대만", () => {
  const q1 = mbapWrap(7, [1, 3, 0, 0, 0, 2]);
  const q2 = mbapWrap(8, [1, 3, 0, 10, 0, 1]);
  assert.deepEqual(tcpRequest(q1), { unit: 1, fc: 3, addr: 0, qty: 2, tid: 7 });
  const a1 = mbapWrap(7, [1, 3, 4, 0x07, 0x14, 0, 9]);
  // 요청 둘을 먼저 보내고 응답이 나중에 와도 트랜잭션 ID 로 찾는다
  const log = [tx(q1, "A"), tx(q2, "A"), rx(a1, "A")];
  const p = pairInLog(log, 2, "tcp");
  assert.deepEqual(p.req, { unit: 1, fc: 3, addr: 0, qty: 2, tid: 7 });
  assert.deepEqual(valueRows(p, "u16", "plc")[0], { addr: "40001", value: "1812 (0x0714)" });
  // 다른 상대의 요청과는 짝짓지 않는다
  assert.equal(pairInLog([tx(q1, "B"), rx(a1, "A")], 1, "tcp"), null);
  // 트랜잭션 ID 가 다르면 짝 없음
  assert.equal(pairInLog([tx(q2, "A"), rx(a1, "A")], 1, "tcp"), null);
  // 예외
  assert.equal(pairInLog([tx(q1), rx(mbapWrap(7, [1, 0x83, 2]))], 1, "tcp").code, 2);
  // 중계: 요청이 RX(HMI 에서), 응답이 TX(HMI 로)
  assert.ok(pairInLog([rx(q1), tx(a1)], 1, "tcp"));
});
