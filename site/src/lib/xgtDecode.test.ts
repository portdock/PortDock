// crates/core/src/xgt.rs 시험과 같은 프레임(LS ELECTRIC 사용설명서 V2.30 8.2절·XBL-EMTA V1.8 표 5-6~5-9 예시) — 웹 해석기와 PLC Simulator 가 같은 답을 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { hex } from "./checksum.ts";
import { bcc, buildXgtRequest, decodeXgt, parseVar } from "./xgtDecode.ts";

const XGT = [0x4c, 0x53, 0x49, 0x53, 0x2d, 0x58, 0x47, 0x54, 0x00, 0x00];
/** xgt.rs req: 요청 머리(BCC 맞게) + 몸체 */
function req(invoke: number, body: number[]) {
  const h = [...XGT, 0, 0, 0xa0, 0x33, invoke & 0xff, invoke >> 8, body.length & 0xff, body.length >> 8, 0];
  h.push(bcc(h));
  return [...h, ...body];
}
const s = (t: string) => [...t].map((c) => c.charCodeAt(0));

test("XBL-EMTA 표 5-8·5-9 — BCC 와 연속 읽기", () => {
  const f = [...XGT, 0x00, 0x00, 0xa0, 0x33, 0x00, 0x01, 0x10, 0x00, 0x00, 0x3f, 0x54, 0x00, 0x14, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4d, 0x42, 0x30, 0x02, 0x00];
  assert.equal(bcc(f), 0x3f);
  const q = decodeXgt(hex(f), { lang: "en" });
  assert.deepEqual([q.dir, q.command, q.dataType, q.simError], ["request", 0x54, 0x14, 0]);
  assert.equal(q.vars[0].text, "%MB0");
  const resp = [...XGT, 0x02, 0x08, 0xa0, 0x11, 0x00, 0x01, 0x0e, 0x00, 0x01, 0x26, 0x55, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x12];
  assert.equal(bcc(resp), 0x26);
  const r = decodeXgt(hex(resp), { lang: "en", pair: hex(f) });
  assert.equal(r.error, 0);
  assert.deepEqual(
    r.items.map((i) => [i.addr, i.value]),
    [
      ["%MB0", "52"],
      ["%MB1", "18"],
    ],
  );
});

test("XBL-EMTA 표 5-6 — 원문 BCC 0x4E 는 머리 합 0x3C 와 다름 → h77", () => {
  const f = [...XGT, 0x00, 0x00, 0xa0, 0x33, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x4e, 0x54, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x25, 0x4d, 0x57, 0x30];
  assert.equal(bcc(f), 0x3c);
  assert.equal(decodeXgt(hex(f)).simError, 0x77);
});

test("V2.30 8.2.1·8.2.3 — 개별 읽기·쓰기 %MW100 h1234", () => {
  const w = req(1, [0x58, 0, 2, 0, 0, 0, 1, 0, 6, 0, ...s("%MW100"), 2, 0, 0x34, 0x12]);
  assert.equal(decodeXgt(hex(w)).simError, 0);
  assert.deepEqual(buildXgtRequest({ op: "write", vars: ["%MW100"], values: [0x1234], invoke: 1 }), w);
  const rq = req(2, [0x54, 0, 2, 0, 0, 0, 1, 0, 6, 0, ...s("%MW100")]);
  assert.deepEqual(buildXgtRequest({ op: "read", vars: ["%MW100"], invoke: 2 }), rq);
  const head = [...XGT, 0, 1, 0xa0, 0x11, 2, 0, 14, 0, 0];
  head.push(bcc(head));
  const r = decodeXgt(hex([...head, 0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]), { pair: hex(rq) });
  assert.deepEqual(
    r.items.map((i) => [i.addr, i.value, i.hex]),
    [["%MW100", "4660", "1234"]],
  );
  // 연속 쓰기 %MB100 ← 34 12
  assert.deepEqual(buildXgtRequest({ op: "write-cont", vars: ["%MB100"], values: [0x34, 0x12], invoke: 3 }), req(3, [0x58, 0, 0x14, 0, 0, 0, 1, 0, 6, 0, ...s("%MB100"), 2, 0, 0x34, 0x12]));
});

test("오류 코드 — 블록·형·디바이스·크기·명령·NAK 응답", () => {
  const code = (body: number[]) => decodeXgt(hex(req(1, body))).simError;
  assert.equal(code([0x54, 0, 2, 0, 0, 0, 17, 0]), 0x01);
  assert.equal(code([0x54, 0, 5, 0, 0, 0, 1, 0, 4, 0, ...s("%MW0")]), 0x02);
  assert.equal(code([0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, ...s("%MB0")]), 0x02);
  assert.equal(code([0x54, 0, 2, 0, 0, 0, 1, 0, 4, 0, ...s("%ZW0")]), 0x03);
  assert.equal(code([0x54, 0, 0x14, 0, 0, 0, 1, 0, 4, 0, ...s("%MB0"), 0x79, 0x05]), 0x05);
  assert.equal(code([0xb0, 0, 0, 0, 0, 0]), 0x78);
  assert.equal(code([0x54, 0, 1, 0, 0, 0, 2, 0, 7, 0, ...s("%DB2468")]), 0x76);
  const head = [...XGT, 0, 1, 0xa0, 0x11, 1, 0, 10, 0, 0];
  head.push(bcc(head));
  const nak = decodeXgt(hex([...head, 0x55, 0, 2, 0, 0, 0, 0xff, 0xff, 4, 0]), { lang: "en" });
  assert.equal(nak.error, 4);
  assert.match(nak.body.at(-1)!.value, /Device area exceeded/);
});

test("변수 이름 — 비트는 워드×16+비트(%MX2764 = %MW172 bit C)", () => {
  const v = parseVar("%MX2764");
  assert.ok(typeof v !== "number");
  assert.equal(v.index, 2764);
  assert.equal(parseVar("%MW10.1"), 0x03);
  assert.equal(parseVar("MW10"), 0x03);
  assert.equal(parseVar("%MQ10"), 0x02);
  assert.throws(() => buildXgtRequest({ op: "read", vars: ["%MW0", "%MB0"] }));
  assert.throws(() => buildXgtRequest({ op: "read-cont", vars: ["%MW0"], count: 2 }));
});
