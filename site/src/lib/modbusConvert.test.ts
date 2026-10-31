// RTU ↔ TCP ↔ ASCII 변환 — 규격 예시 프레임(Serial Line V1.02 의 01 03 … C5 CD, ASCII LRC)과 왕복
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFrame, convertNotes, parseFrame } from "./modbusConvert.ts";

test("RTU 요청 → TCP: MBAP 길이·유닛 ID", () => {
  const p = parseFrame("01 03 00 00 00 0A C5 CD", "auto", "en");
  assert.equal(p.format, "rtu");
  assert.deepEqual(p.problems, []);
  assert.equal(p.unit, 1);
  const tcp = buildFrame("tcp", p.unit, p.pdu, 7, "en");
  assert.equal(tcp.text, "00 07 00 00 00 06 01 03 00 00 00 0A");
  assert.ok(convertNotes(p, "tcp", "en").some((n) => n.includes("Unit ID")));
});

test("TCP 응답 → RTU: CRC 계산해 붙임, 트랜잭션 ID 사라짐", () => {
  const p = parseFrame("00 07 00 00 00 07 11 03 04 00 0A 01 02", "auto", "ko");
  assert.equal(p.format, "tcp");
  assert.equal(p.tid, 7);
  assert.equal(p.unit, 0x11);
  const rtu = buildFrame("rtu", p.unit, p.pdu);
  const back = parseFrame(rtu.text, "rtu");
  assert.deepEqual(back.problems, []);
  assert.deepEqual(back.pdu, p.pdu);
  assert.equal(rtu.segments.at(-1)!.kind, "crc");
});

test("ASCII: LRC 와 CR LF", () => {
  // 국번 01 함수 03 시작 0 개수 10 → 합 0x0E → LRC F2
  const a = buildFrame("ascii", 1, [0x03, 0x00, 0x00, 0x00, 0x0a]);
  assert.equal(a.text, ":01030000000AF2\\r\\n");
  assert.deepEqual(a.bytes.slice(-2), [0x0d, 0x0a]);
  const p = parseFrame(":01030000000AF2\\r\\n");
  assert.equal(p.format, "ascii");
  assert.deepEqual(p.problems, []);
  assert.deepEqual(p.notes, []);
  assert.deepEqual(p.pdu, [0x03, 0x00, 0x00, 0x00, 0x0a]);
  // HEX 바이트로 붙여 넣어도(실제 CR LF 포함) 같다
  const fromBytes = parseFrame(a.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" "));
  assert.equal(fromBytes.format, "ascii");
  assert.deepEqual(fromBytes.pdu, p.pdu);
  assert.deepEqual(fromBytes.notes, []);
  // 틀린 LRC
  const bad = parseFrame(":01030000000AF3", "auto", "en");
  assert.equal(bad.problems.length, 1);
  assert.ok(bad.problems[0].includes("F2"));
  assert.equal(bad.notes.length, 1); // CR LF 없음
});

test("세 형식 왕복 — 예외 응답·쓰기 요청", () => {
  for (const pdu of [
    [0x83, 0x02],
    [0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0a, 0x01, 0x02],
    [0x06, 0x00, 0x01, 0x00, 0x03],
  ]) {
    for (const f of ["rtu", "tcp", "ascii"] as const) {
      const b = buildFrame(f, 5, pdu, 300);
      const p = parseFrame(b.text, "auto");
      assert.equal(p.format, f, `${f} ${b.text}`);
      assert.deepEqual(p.pdu, pdu);
      assert.equal(p.unit, 5);
      assert.deepEqual(p.problems, []);
    }
  }
  assert.equal(buildFrame("tcp", 5, [0x83, 0x02], 300).text, "01 2C 00 00 00 03 05 83 02");
});

test("색 구분 조각이 프레임 전체를 덮는다", () => {
  const b = buildFrame("rtu", 1, [0x03, 0x00, 0x6b, 0x00, 0x03]);
  assert.equal(b.segments.map((s) => s.raw).join(" "), b.text);
  const t = buildFrame("tcp", 1, [0x03, 0x06, 0x02, 0x2b, 0x00, 0x00, 0x00, 0x64], 1);
  assert.equal(t.segments.map((s) => s.raw).join(" "), t.text);
  const a = buildFrame("ascii", 1, [0x03, 0x00, 0x6b, 0x00, 0x03]);
  assert.equal(
    a.segments
      .slice(0, -1)
      .map((s) => s.raw)
      .join(""),
    a.text.replace("\\r\\n", ""),
  );
  const p = parseFrame(a.text);
  assert.equal(
    p.segments
      .filter((s) => s.kind !== "end")
      .map((s) => s.raw)
      .join(""),
    a.text.replace("\\r\\n", ""),
  );
});

test("CRC 틀림·길이 틀림·유닛 ID 0/255 알림", () => {
  const p = parseFrame("01 03 00 00 00 0A C5 CC", "rtu", "en");
  assert.equal(p.problems.length, 1);
  assert.ok(p.problems[0].includes("C5 CD"));
  const l = parseFrame("00 01 00 00 00 09 01 03 00 00 00 0A", "tcp", "en");
  assert.ok(l.problems.some((x) => x.includes("length field")));
  assert.ok(convertNotes(parseFrame("00 01 00 00 00 06 00 06 00 01 00 03", "tcp", "en"), "rtu", "en").some((x) => x.includes("broadcast")));
  assert.ok(convertNotes(parseFrame("00 01 00 00 00 06 FF 03 00 00 00 01", "tcp", "en"), "rtu", "en").some((x) => x.includes("255")));
  // 3A 로 시작하는 RTU(국번 58)를 ASCII 로 잘못 보지 않는다
  const r58 = buildFrame("rtu", 0x3a, [0x03, 0x00, 0x00, 0x00, 0x01]);
  assert.equal(parseFrame(r58.text).format, "rtu");
});

test("잘못된 입력", () => {
  assert.throws(() => parseFrame("01 03", "rtu"));
  assert.throws(() => parseFrame("00 01 00 00 00 01 01", "tcp"));
  assert.throws(() => parseFrame(":0103X", "ascii"));
  assert.throws(() => parseFrame("", "auto"));
});
