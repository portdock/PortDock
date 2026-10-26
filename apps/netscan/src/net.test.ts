// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/netscan/src/net.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORTS, chipOn, extraPorts, formatPorts, parsePorts, PORT_CHIPS, samePortSet, subnetFit, subnetNote, tcpOpenPorts, togglePortChip } from "./net.ts";

test("포트 칩 — 기본 목록은 칩이 모두 켜짐, 글 모양은 기본 목록과 같다", () => {
  const p = parsePorts(DEFAULT_PORTS, "ko").ports;
  assert.ok(PORT_CHIPS.every((c) => chipOn(p, c.ports)));
  assert.equal(formatPorts(p), DEFAULT_PORTS);
  assert.deepEqual(extraPorts(p), []);
});

test("포트 칩 끄고 켜기 — 범위 칩(MC/SLMP 5000-5010)·직접 넣은 포트는 뒤에", () => {
  const off = togglePortChip(DEFAULT_PORTS, [5000, 5010], false, "ko");
  assert.equal(off, "502, 2004, 102, 44818, 4840, 80, 443, 23, 21, 1883, 5025");
  assert.equal(togglePortChip(off, [5000, 5010], true, "ko"), DEFAULT_PORTS);
  const mine = togglePortChip("502, 8080, 9000-9003, 5001", [102, 102], true, "en");
  assert.equal(mine, "502, 102, 5001, 8080, 9000-9003");
  assert.deepEqual(extraPorts(parsePorts(mine, "en").ports), [8080, 9000, 9001, 9002, 9003]);
  // 칸이 틀리면 칩을 못 누른다
  assert.equal(togglePortChip("502, abc", [102, 102], true, "ko"), null);
  assert.ok(samePortSet(parsePorts("502, 102", "ko").ports, parsePorts("102,502", "ko").ports));
  assert.ok(!samePortSet([502], [502, 102]));
});

const eth = { name: "Ethernet", addrs: [{ ip: "192.168.0.5", prefix: 24 }], gateway: null, up: true };
const wifi = { name: "Wi-Fi", addrs: [{ ip: "10.0.0.3", prefix: 24 }], gateway: "10.0.0.1", up: true };

test("대상 대역 — 고른 랜카드 안이면 알림 없음, 다른 랜카드 안이면 그 랜카드 이름", () => {
  assert.equal(subnetFit("192.168.0.1", "192.168.0.254", [eth, wifi], "192.168.0.5").kind, "in");
  const o = subnetFit("10.0.0.1", "10.0.0.254", [eth, wifi], "192.168.0.5");
  assert.equal(o.kind, "otherNic");
  assert.equal(o.nic, "Wi-Fi");
  assert.match(subnetNote(o, "10.0.0.0/24", "10.0.0.1", "ko").text, /«Wi-Fi»/);
  // 127.x 는 이 PC
  assert.equal(subnetFit("127.0.0.1", "127.0.0.1", [], null).kind, "in");
});

test("대상 대역 — /32 경계: 한 주소짜리 랜카드는 제 주소만, 한 주소 범위도 판정", () => {
  const vpn = { name: "VPN", addrs: [{ ip: "172.16.5.9", prefix: 32 }], gateway: null, up: true };
  assert.equal(subnetFit("172.16.5.9", "172.16.5.9", [vpn], "172.16.5.9").kind, "in");
  assert.equal(subnetFit("172.16.5.10", "172.16.5.10", [vpn], "172.16.5.9").kind, "none");
  assert.equal(subnetFit("192.168.0.77", "192.168.0.77", [eth], "192.168.0.5").kind, "in");
  // 범위 일부만 대역 안
  const p = subnetFit("192.168.0.200", "192.168.1.20", [eth], "192.168.0.5");
  assert.equal(p.kind, "partial");
  assert.ok(subnetNote(p, "192.168.0.200-192.168.1.20", "192.168.0.200", "en").weak);
});

test("대상 대역 — 어느 랜카드에도 없음: 게이트웨이가 있으면 «경유»(약함), 없으면 강한 알림 + 지금 랜카드 목록", () => {
  const none = subnetFit("192.168.1.1", "192.168.1.254", [eth], "192.168.0.5");
  assert.equal(none.kind, "none");
  const t = subnetNote(none, "192.168.1.0/24", "192.168.1.1", "ko");
  assert.equal(t.weak, false);
  assert.match(t.text, /192\.168\.1\.0\/24 는 이 PC 의 어느 랜카드 대역에도 없습니다/);
  assert.match(t.text, /예 192\.168\.1\.x/);
  assert.match(t.text, /지금 랜카드: Ethernet 192\.168\.0\.5\/24/);
  // 여러 랜카드 — Wi-Fi 에 게이트웨이가 있으면 경유
  const r = subnetFit("192.168.1.1", "192.168.1.254", [eth, wifi], "192.168.0.5");
  assert.equal(r.kind, "routed");
  assert.equal(r.gateway, "10.0.0.1");
  const rt = subnetNote(r, "192.168.1.0/24", "192.168.1.1", "en");
  assert.ok(rt.weak);
  assert.match(rt.text, /via gateway 10\.0\.0\.1/);
  assert.match(rt.text, /Ethernet 192\.168\.0\.5\/24, Wi-Fi 10\.0\.0\.3\/24/);
  // 고른 랜카드의 게이트웨이가 먼저
  const eth2 = { ...eth, gateway: "192.168.0.1" };
  assert.equal(subnetFit("192.168.1.1", "192.168.1.9", [wifi, eth2], "192.168.0.5").gateway, "192.168.0.1");
  // 꺼진 랜카드는 대역으로 치지 않는다 — 그 랜카드 대역이면 «연결 끊김»
  const d = subnetFit("192.168.0.1", "192.168.0.254", [{ ...eth, up: false }, wifi], "192.168.0.5");
  assert.equal(d.kind, "down");
  assert.match(subnetNote(d, "192.168.0.0/24", "192.168.0.1", "ko").text, /연결 끊김/);
  // 켜진 랜카드가 없음
  assert.match(subnetNote(subnetFit("192.168.1.1", "192.168.1.9", [], null), "192.168.1.1-9", "192.168.1.1", "ko").text, /켜진 랜카드가 없습니다/);
});

test("대상 대역 — 169.254(APIPA) 랜카드는 «IP 를 못 받음» 안내, 169.254 범위면 그 랜카드 안", () => {
  const ap = { name: "Ethernet 2", addrs: [{ ip: "169.254.12.7", prefix: 16 }], gateway: null, up: true };
  const f = subnetFit("192.168.1.1", "192.168.1.254", [ap, wifi], "169.254.12.7");
  assert.equal(f.kind, "routed");
  assert.deepEqual(f.apipa, ["Ethernet 2"]);
  assert.match(subnetNote(f, "192.168.1.0/24", "192.168.1.1", "ko").text, /«Ethernet 2» 는 169\.254\.x\.x — IP 를 못 받았습니다/);
  assert.match(subnetNote(subnetFit("192.168.1.1", "192.168.1.9", [ap], "169.254.12.7"), "x", "192.168.1.1", "en").text, /did not get an IP/);
  assert.equal(subnetFit("169.254.12.1", "169.254.12.254", [ap, wifi], "169.254.12.7").kind, "in");
});

test("TCP 로 열기 — 502·80·443 은 빼고 정렬·중복 없음", () => {
  assert.deepEqual(tcpOpenPorts([502, 80, 443]), []);
  assert.deepEqual(tcpOpenPorts([5001, 502, 102, 5001, 443, 4840]), [102, 4840, 5001]);
  assert.deepEqual(tcpOpenPorts([0, 70000, 23]), [23]);
  assert.deepEqual(tcpOpenPorts([]), []);
});
