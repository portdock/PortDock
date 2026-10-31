// node --test — CAN 프레임 해석(lib/canFrame.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRaw, bytesToBits, canopenId, crc15Bits, decodeRaw, dlcLen, j1939, j1939Id, parseFrame, pgnInfo, sdo, spnValues, stuff } from "./canFrame.ts";

test("CRC-15/CAN 카탈로그 check 값: «123456789» → 0x059E", () => {
  const bits = bytesToBits([..."123456789"].map((c) => c.charCodeAt(0)));
  assert.equal(crc15Bits(bits), 0x059e);
  // 나머지 0: 데이터 + CRC 를 다시 넣으면 0
  const crcBits = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => (0x059e >> i) & 1);
  assert.equal(crc15Bits([...bits, ...crcBits]), 0);
});

test("비트 스터핑: 같은 값 5개 뒤에 반대 값, 스터프 비트도 다음 5개에 셈", () => {
  assert.deepEqual(stuff([0, 0, 0, 0, 0, 0]), [0, 0, 0, 0, 0, 1, 0]);
  // 1 1 1 1 0 0 0 0 0 → 0 다섯 뒤 1 삽입
  assert.deepEqual(stuff([1, 1, 1, 1, 0, 0, 0, 0, 0]), [1, 1, 1, 1, 0, 0, 0, 0, 0, 1]);
  // 0×5 뒤 스터프 1, 그 1 과 이어지는 1 1 1 1 → 1 다섯 → 0 삽입
  assert.deepEqual(stuff([0, 0, 0, 0, 0, 1, 1, 1, 1]), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0]);
});

test("원시 비트열 왕복: 표준·확장·원격, CRC 맞음", () => {
  for (const f of [
    { id: 0x123, ext: false, rtr: false, dlc: 2, data: [0x11, 0x22] },
    { id: 0x000, ext: false, rtr: false, dlc: 8, data: [0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 0x18fef100, ext: true, rtr: false, dlc: 8, data: [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77] },
    { id: 0x7ff, ext: false, rtr: true, dlc: 4, data: [] },
  ]) {
    const raw = buildRaw(f);
    const r = decodeRaw(raw);
    assert.equal(r.id, f.id);
    assert.equal(r.ext, f.ext);
    assert.equal(r.rtr, f.rtr);
    assert.equal(r.dlc, f.dlc);
    assert.deepEqual(r.data, f.data);
    assert.equal(r.raw!.crcOk, true);
    assert.equal(r.raw!.crcDelim, 1);
    assert.equal(r.raw!.ack, 0);
    assert.equal(r.raw!.eofOnes, 7);
    assert.equal(r.raw!.stuffError, undefined);
  }
  // 모두 0 인 데이터는 스터프 비트가 많다
  assert.ok(decodeRaw(buildRaw({ id: 0, ext: false, rtr: false, dlc: 8, data: [0, 0, 0, 0, 0, 0, 0, 0] })).raw!.stuffAt.length > 10);
});

test("원시 비트열: 데이터 비트 하나 뒤집으면 CRC 틀림", () => {
  const raw = buildRaw({ id: 0x123, ext: false, rtr: false, dlc: 1, data: [0xa5] });
  // 데이터 첫 비트 근처(SOF1+ID11+3+DLC4 = 19 → 스터프 없는 구간이라 바로 그 자리)
  const bad = raw.slice();
  bad[20] ^= 1;
  const r = decodeRaw(bad);
  assert.equal(r.raw!.crcOk, false);
});

test("parseFrame: candump·cansend·«ID DLC 데이터»", () => {
  const a = parseFrame("can0 18FEF100#0011223344556677");
  assert.equal(a.ext, true);
  assert.equal(a.id, 0x18fef100);
  assert.deepEqual(a.data, [0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
  const b = parseFrame("(1600000000.123456) can0 123#DE.AD");
  assert.equal(b.ext, false);
  assert.deepEqual(b.data, [0xde, 0xad]);
  const c = parseFrame("123#R4");
  assert.equal(c.rtr, true);
  assert.equal(c.dlc, 4);
  const d = parseFrame("  can0  0CF00400   [8]  FF FF FF 68 13 FF FF FF");
  assert.equal(d.id, 0x0cf00400);
  assert.equal(d.data.length, 8);
  const e = parseFrame("701 1 05");
  assert.equal(e.id, 0x701);
  assert.equal(e.ext, false);
  assert.deepEqual(e.data, [5]);
  const f = parseFrame("18EA00F9 3 00 EE 00");
  assert.equal(f.ext, true);
  const g = parseFrame("123##1" + "00".repeat(12));
  assert.equal(g.fd, true);
  assert.equal(g.dlc, 9);
  assert.throws(() => parseFrame("123 2 11"));
  assert.throws(() => parseFrame("1234#11"));
});

test("DLC → 길이: 고전은 8 까지, FD 는 12·16·20·24·32·48·64", () => {
  assert.equal(dlcLen(15, false), 8);
  assert.deepEqual([9, 10, 11, 12, 13, 14, 15].map((x) => dlcLen(x, true)), [12, 16, 20, 24, 32, 48, 64]);
});

test("J1939: PDU2(PF ≥ 240) 0x18FEF100 → 우선순위 6, PGN 65265(CCVS1), SA 0", () => {
  const j = j1939(0x18fef100);
  assert.equal(j.priority, 6);
  assert.equal(j.pdu, 2);
  assert.equal(j.pgn, 65265);
  assert.equal(j.sa, 0);
  assert.equal(j.da, 255);
  assert.equal(pgnInfo(j.pgn)!.abbr, "CCVS1");
});

test("J1939: PDU1(PF < 240) 0x18EA00F9 → PGN 59904(요청), DA 0x00, SA 0xF9", () => {
  const j = j1939(0x18ea00f9);
  assert.equal(j.pdu, 1);
  assert.equal(j.pgn, 0xea00);
  assert.equal(j.da, 0);
  assert.equal(j.sa, 0xf9);
  // 목적 주소가 달라도 PGN 은 같다
  assert.equal(j1939(0x18ea17f9).pgn, 0xea00);
  assert.equal(j1939Id(6, 0xea00, 0xf9, 0x17), 0x18ea17f9);
  assert.equal(j1939Id(3, 61444, 0), 0x0cf00400);
});

test("J1939: DP·EDP 비트가 PGN 에 들어간다", () => {
  assert.equal(j1939(0x19fef100).pgn, 0x1fef1);
  assert.equal(j1939(0x1bfef100).pgn, 0x3fef1);
});

test("SPN 190 엔진 회전수: 바이트 4·5 0x1368 × 0.125 = 621 rpm, FF FF = 없음", () => {
  const v = spnValues(61444, [0xff, 0xff, 0xff, 0x68, 0x13, 0xff, 0xff, 0xff]);
  const rpm = v.find((x) => x.spec.spn === 190)!;
  assert.equal(rpm.value, 621);
  assert.equal(v.find((x) => x.spec.spn === 513)!.status, "na");
  const t = spnValues(65262, [0x5a]);
  assert.equal(t.find((x) => x.spec.spn === 110)!.value, 50);
});

test("CANopen COB-ID: 기능·노드", () => {
  assert.deepEqual(canopenId(0x000), { func: "nmt", node: 0, fc: 0 });
  assert.equal(canopenId(0x080).func, "sync");
  assert.deepEqual(canopenId(0x085), { func: "emcy", node: 5, fc: 1 });
  assert.deepEqual(canopenId(0x181), { func: "tpdo1", node: 1, fc: 3 });
  assert.equal(canopenId(0x20a).func, "rpdo1");
  assert.equal(canopenId(0x4ff).func, "tpdo4");
  assert.equal(canopenId(0x501).func, "rpdo4");
  assert.deepEqual(canopenId(0x581), { func: "sdoTx", node: 1, fc: 11 });
  assert.deepEqual(canopenId(0x60a), { func: "sdoRx", node: 10, fc: 12 });
  assert.deepEqual(canopenId(0x77f), { func: "hb", node: 127, fc: 14 });
});

test("SDO: 읽기 요청 40 18 10 01, 응답 43 … 4바이트, 쓰기 2B 17 10 00 E8 03 → 1000 ms, 중단 코드", () => {
  const rq = sdo("request", [0x40, 0x18, 0x10, 0x01, 0, 0, 0, 0])!;
  assert.equal(rq.kind, "initUpload");
  assert.equal(rq.index, 0x1018);
  assert.equal(rq.sub, 1);
  const rs = sdo("response", [0x43, 0x18, 0x10, 0x01, 0x78, 0x56, 0x34, 0x12])!;
  assert.equal(rs.kind, "initUploadResp");
  assert.equal(rs.n, 4);
  assert.equal(rs.value, 0x12345678);
  const w = sdo("request", [0x2b, 0x17, 0x10, 0x00, 0xe8, 0x03, 0, 0])!;
  assert.equal(w.kind, "initDownload");
  assert.equal(w.n, 2);
  assert.equal(w.value, 1000);
  assert.equal(sdo("request", [0x2f, 0, 0x60, 0, 0x06, 0, 0, 0])!.n, 1);
  assert.equal(sdo("response", [0x60, 0x17, 0x10, 0, 0, 0, 0, 0])!.kind, "initDownloadResp");
  const ab = sdo("response", [0x80, 0x00, 0x20, 0x00, 0x00, 0x00, 0x02, 0x06])!;
  assert.equal(ab.kind, "abort");
  assert.equal(ab.abort, 0x06020000);
  // 세그먼트 업로드 응답: 0x0B = 토글 0, 빈 바이트 5 → 데이터 2, 마지막
  const sg = sdo("response", [0x0b, 0x41, 0x42, 0, 0, 0, 0, 0])!;
  assert.equal(sg.kind, "uploadSegResp");
  assert.equal(sg.n, 2);
  assert.equal(sg.last, true);
});
