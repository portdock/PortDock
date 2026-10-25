// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/mbap.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTcpRequest, isMbap, mbapWrap } from "./mbap.ts";

const form = (o) => ({ slave: 1, fc: 3, addrText: "0", addrMode: "zero", qty: 2, valuesText: "", ...o });

test("MBAP 머리 — 트랜잭션·프로토콜 0·길이(유닛부터)", () => {
  assert.deepEqual(mbapWrap(0x1234, [1, 3, 0, 0, 0, 2]), [0x12, 0x34, 0, 0, 0, 6, 1, 3, 0, 0, 0, 2]);
  assert.deepEqual(mbapWrap(0x1ffff, [1]).slice(0, 2), [0xff, 0xff]);
  assert.ok(isMbap(mbapWrap(7, [1, 3, 0, 0, 0, 2])));
  assert.ok(!isMbap([0, 1, 0, 0, 0, 9, 1, 3]));
  assert.ok(!isMbap([1, 3, 0, 0]));
});

test("Modbus TCP 요청 — 유닛 ID 0·255 도 되고 CRC 가 없다", () => {
  const r = buildTcpRequest(form({ slave: 255 }), 1, "en");
  assert.deepEqual(r.bytes, [0, 1, 0, 0, 0, 6, 255, 3, 0, 0, 0, 2]);
  // 읽기 + 유닛 0: RTU 에서는 브로드캐스트라 막지만 TCP 에서는 흔하다
  assert.deepEqual(buildTcpRequest(form({ slave: 0 }), 2, "en").bytes?.slice(0, 7), [0, 2, 0, 0, 0, 6, 0]);
  // FC10 값 2개 → 길이 = 유닛 1 + PDU(1+2+2+1+4)
  const w = buildTcpRequest(form({ fc: 0x10, valuesText: "1, 2" }), 3, "en");
  assert.equal(w.bytes?.[5], 11);
  assert.equal(w.bytes?.length, 6 + 11);
  // 틀린 칸은 그대로 오류
  assert.equal(buildTcpRequest(form({ addrText: "x" }), 1, "en").bytes, null);
});
