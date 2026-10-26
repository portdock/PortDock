// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/nicCheck.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { effective, jumboOff, keyProps, nicLines, nicsVerdict, nicVerdict, rangeText, VENDOR_EXAMPLES } from "./nicCheck.ts";
import { bundleText, fmtSpeed } from "./portinfo.ts";

const prop = (keyword, raw, o = {}) => ({ keyword, name: keyword.replace("*", ""), display: raw, raw, default: raw, valid: [], min: null, max: null, ...o });
const nic = (o = {}) => ({
  name: "이더넷",
  description: "Test Ethernet",
  up: true,
  speed: 1e9,
  fullDuplex: true,
  ipv4: ["192.168.0.10/24"],
  gateway: null,
  pnpId: "PCI\\VEN_8086&DEV_15B8\\1",
  advanced: [
    prop("*JumboPacket", "1514", { display: "사용 안 함", valid: ["1514", "4088", "9014"] }),
    prop("*ReceiveBuffers", "512", { min: 80, max: 2048 }),
    prop("*EEE", "0"),
    prop("*SpeedDuplex", "0", { display: "자동 협상" }),
    prop("*InterruptModeration", "1"),
    prop("*PMARPOffload", "1"),
  ],
  canTurnOff: true,
  pnpCapabilities: null,
  stats: { inPackets: 10, outPackets: 10, inErrors: 0, inDiscards: 0, outErrors: 0, outDiscards: 0 },
  profile: "private",
  network: "lab",
  ...o,
});
const fw = [
  { profile: "domain", enabled: true, current: false },
  { profile: "private", enabled: true, current: true },
  { profile: "public", enabled: true, current: false },
];

test("일반 용도 — 링크·오류만, 카메라 값으로 판정하지 않는다", () => {
  const v = nicVerdict(nic(), "general", fw);
  assert.equal(v.level, "ok");
  assert.equal(v.notes.length, 0);
  assert.equal(nicVerdict(nic({ fullDuplex: false }), "general").level, "look");
  assert.equal(nicVerdict(nic({ speed: 1e7 }), "general").level, "look");
  assert.equal(nicVerdict(nic({ stats: { ...nic().stats, inErrors: 3 } }), "general").level, "look");
  // 버린 패킷은 일반 용도면 적기만
  const d = nicVerdict(nic({ stats: { ...nic().stats, inDiscards: 3 } }), "general");
  assert.equal(d.level, "ok");
  assert.equal(d.notes.length, 1);
  // 속도·이중 고정
  const fixed = nicVerdict(nic({ advanced: [prop("*SpeedDuplex", "6", { display: "1.0 Gbps 전이중" })] }), "general");
  assert.equal(fixed.level, "look");
  assert.ok(fixed.notes.some((n) => /1.0 Gbps/.test(n.ko)));
  // 연결 안 된 랜카드는 판정하지 않는다
  const down = nicVerdict(nic({ up: false, speed: null, fullDuplex: null }), "camera", fw);
  assert.ok(down.notes.some((n) => /연결 안 됨/.test(n.ko)));
});

test("카메라 용도 — 점보 꺼짐·버퍼·절전·방화벽은 «볼 것» 까지만, «문제 있음» 은 없다", () => {
  const v = nicVerdict(nic({ profile: "public" }), "camera", fw);
  assert.equal(v.level, "look");
  const all = v.notes.map((n) => n.ko).join("\n");
  assert.match(all, /점보 프레임 꺼짐/);
  assert.match(all, /패킷 크기/); // 카메라·스위치도 맞아야 함을 늘 함께
  assert.match(all, /수신 버퍼 512 \(이 랜카드 최대 2048\)/);
  assert.match(all, /끌 수 있음/);
  assert.match(all, /공용/);
  assert.match(all, /방화벽 켜짐/);
  // 다 맞춰 두면 문제 없음
  const tuned = nic({
    advanced: [prop("*JumboPacket", "9014"), prop("*ReceiveBuffers", "2048", { max: 2048 }), prop("*EEE", "0")],
    canTurnOff: false,
  });
  assert.equal(nicVerdict(tuned, "camera", [{ profile: "private", enabled: false, current: true }]).level, "ok");
  // 점보 키워드가 없으면 «알려 주지 않음» 만(판정 없음)
  const none = nicVerdict(nic({ advanced: [], canTurnOff: false }), "camera", []);
  assert.equal(none.level, "ok");
  assert.ok(none.notes.some((n) => /알려 주지 않습니다/.test(n.ko)));
  // 고급 속성을 읽지 못했으면 «읽지 못함»
  assert.equal(nicVerdict(nic({ advanced: [], canTurnOff: false }), "camera", [], false).level, "unread");
  // 버린 패킷은 카메라면 «볼 것»
  assert.equal(nicVerdict(tuned && nic({ ...tuned, stats: { ...nic().stats, inDiscards: 5 } }), "camera", []).level, "look");
});

test("PLC 용도 — EEE·절전·공용 프로필, 점보는 보지 않는다", () => {
  const v = nicVerdict(nic({ advanced: [prop("*EEE", "1"), prop("*JumboPacket", "1514")], canTurnOff: false }), "plc", fw);
  assert.equal(v.level, "look");
  assert.ok(v.notes.some((n) => /EEE/.test(n.en)));
  assert.ok(!v.notes.some((n) => /Jumbo/.test(n.en)));
  // 방화벽 켜짐은 PLC 용도에서 판정하지 않는다(PC 가 먼저 연결)
  assert.equal(nicVerdict(nic({ advanced: [], canTurnOff: false }), "plc", fw).level, "ok");
});

test("값 풀이 — 원값·기본값·범위·점보", () => {
  assert.equal(effective(prop("*X", null, { default: "7" })), "7");
  assert.equal(effective(null), null);
  assert.equal(jumboOff(prop("*JumboPacket", "1514")), true);
  assert.equal(jumboOff(prop("*JumboPacket", "9014")), false);
  assert.equal(jumboOff(null), null);
  assert.equal(rangeText(prop("*ReceiveBuffers", "512", { min: 80, max: 2048 })), "80–2048");
  assert.equal(rangeText(prop("*EEE", "0", { valid: ["0", "1"] })), "0 · 1");
  const k = keyProps(nic());
  assert.deepEqual(
    k.rows.map((r) => r.id),
    ["jumbo", "rxbuf", "intmod", "eee", "speed"],
  );
  assert.deepEqual(
    k.others.map((p) => p.keyword),
    ["*PMARPOffload"],
  );
  assert.ok(k.missing.some((m) => m.en === "Transmit buffers"));
  // ITR(Intel) 도 인터럽트 완화 정도로
  assert.equal(keyProps(nic({ advanced: [prop("ITR", "65535")] })).rows[0].id, "intrate");
});

test("제조사 예 — 출처 주소가 있고, 다른 의견은 둘 다", () => {
  for (const list of Object.values(VENDOR_EXAMPLES)) for (const e of list) assert.match(e.url, /^https:\/\//);
  assert.equal(VENDOR_EXAMPLES.intrate.length, 2);
});

test("카드 머리·결과 글", () => {
  const list = { nics: [nic(), nic({ name: "Wi-Fi", up: false, speed: null, fullDuplex: null })], firewall: fw, errors: [] };
  assert.equal(nicsVerdict(list, "general").level, "ok");
  assert.equal(nicsVerdict(list, "camera").level, "look");
  assert.equal(nicsVerdict(null, "camera").level, "unread");
  const v = (x) => `[${x.level}]`;
  const lines = nicLines("ko", list, "camera", v, fmtSpeed).join("\n");
  assert.match(lines, /용도: GigE 카메라/);
  assert.match(lines, /방화벽: 도메인 켜짐 · 개인\* 켜짐 · 공용 켜짐/);
  assert.match(lines, /\*JumboPacket \(JumboPacket\) = 사용 안 함 \[1514\] \(1514 · 4088 · 9014\)/);
  assert.match(lines, /docs\.baslerweb\.com/);
  assert.match(lines, /PC 가 볼 수 없는 것\(랜카드\)/);
  // 일반 용도면 제조사 예는 넣지 않는다
  assert.doesNotMatch(nicLines("en", list, "general", v, fmtSpeed).join("\n"), /baslerweb/);
  const text = bundleText("en", { app: "PI", version: "0", report: null, com: null, events: null, nics: list, loop: [], echo: null, loopError: null, nicPurpose: "plc" });
  assert.match(text, /Use: PLC \/ Modbus TCP device/);
  assert.match(text, /PC may turn off: on/);
  assert.doesNotMatch(text, /진단|검증|최적|정상|diagnos|verif|optimi/i);
});
