// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/netscan/src/discover.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DISC_CSV_HEAD, ENIP_VENDORS, bacnetLine, deviceTypeLabel, discChips, discCsv, discPorts, enipLine, enipVendorLabel, mergeDisc } from "./discover.ts";

const enip = { ip: "192.168.0.20", addr: null, vendorId: 47, deviceType: 0x0e, productCode: 1234, revision: "1.010", productName: "NJ501-1300", status: 0x30, state: 3 };
const bac = (instance, ip = "192.168.0.30") => ({ ip, port: 47808, instance, vendorId: 260, maxApdu: 1476, segmentation: 3, network: null, mac: null });

test("벤더 표 — 40개 이하, 모르면 숫자", () => {
  const n = Object.keys(ENIP_VENDORS).length;
  assert.ok(n >= 20 && n <= 40, String(n));
  assert.equal(enipVendorLabel(1, "en"), "Rockwell Automation/Allen-Bradley (1)");
  assert.equal(enipVendorLabel(65000, "ko"), "벤더 65000");
  assert.equal(deviceTypeLabel(0x0c, "ko"), "통신 어댑터 (0x0C)");
  assert.equal(deviceTypeLabel(0x99, "en"), "type 0x99");
});

test("IP 별로 합치기 — BACnet 은 인스턴스마다, 같은 인스턴스는 새 것으로", () => {
  let m = mergeDisc(new Map(), { enip: [enip], bacnet: [bac(5), bac(2, "192.168.0.20")], sent: [], notes: [] });
  m = mergeDisc(m, { enip: [], bacnet: [{ ...bac(5), maxApdu: 480 }, bac(1)], sent: [], notes: [] });
  assert.equal(m.size, 2);
  const a = m.get("192.168.0.20");
  assert.equal(a.enip.productName, "NJ501-1300");
  assert.deepEqual(a.bacnet.map((b) => b.instance), [2]);
  assert.deepEqual(m.get("192.168.0.30").bacnet.map((b) => [b.instance, b.maxApdu]), [[1, 1476], [5, 480]]);
  assert.deepEqual(discPorts(a), [44818, 47808]);
  assert.deepEqual(discPorts(undefined), []);
});

test("화면 글·CSV — 일련번호 칸 없음", () => {
  const d = { enip, bacnet: [bac(7)] };
  assert.deepEqual(discChips(d, "en").map((c) => c.text), ["EtherNet/IP · OMRON NJ501-1300", "BACnet #7"]);
  assert.match(enipLine(enip, "ko"), /^EtherNet\/IP — OMRON \(47\) · PLC \(0x0E\) · 제품 코드 1234 · 제품 «NJ501-1300» · 버전 1\.010$/);
  assert.match(bacnetLine(bac(7), "en"), /device instance 7 · vendor ID 260 · max APDU 1476 · segmentation none$/);
  assert.match(bacnetLine({ ...bac(7), network: 5, mac: "17" }, "ko"), /라우터 뒤 망 5 \/ 17$/);
  assert.equal(discCsv(d).length, DISC_CSV_HEAD.length);
  assert.deepEqual(discCsv(d), ["OMRON", "0x0E", 1234, "NJ501-1300", "1.010", "7", "260", "1476"]);
  assert.deepEqual(discCsv(null), [null, null, null, null, null, null, null, null]);
  assert.ok(!DISC_CSV_HEAD.some((h) => /serial/i.test(h)));
});

test("방송 주소·AI 조각", async () => {
  const { bcastOf, discAi } = await import("./discover.ts");
  assert.equal(bcastOf("192.168.0.23", 24), "192.168.0.255");
  assert.equal(bcastOf("10.1.2.3", 8), "10.255.255.255");
  assert.equal(bcastOf("172.16.5.9", 22), "172.16.7.255");
  assert.equal(bcastOf("192.168.0.1", 31), null);
  assert.equal(bcastOf("x", 24), null);
  assert.equal(discAi({ enip, bacnet: [bac(7)] }), "enip OMRON NJ501-1300 1.010 bacnet #7 vendor 260");
  assert.equal(discAi(undefined), "");
});
