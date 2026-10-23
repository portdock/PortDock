// IP 서브넷 — 마스크·CIDR 파싱, 네트워크·브로드캐스트·호스트 범위, /31·/32, 양쪽 마스크 판정
import { test } from "node:test";
import assert from "node:assert/strict";
import { bin, ipStr, kindOf, pair, parseCidr, parseIp, parseMask, prefixOf, subnet } from "./subnet.ts";

const ip = (s: string) => parseIp(s)!;

test("주소 파싱", () => {
  assert.equal(ipStr(ip("192.168.1.10")), "192.168.1.10");
  assert.equal(parseIp("256.1.1.1"), null);
  assert.equal(parseIp("192.168.01.1"), null);
  assert.equal(parseIp("192.168.1"), null);
  assert.equal(ip("255.255.255.255"), 0xffffffff);
});

test("마스크: /24 = 255.255.255.0, 이어지지 않은 마스크는 거부", () => {
  assert.equal(parseMask("24"), 24);
  assert.equal(parseMask("/16"), 16);
  assert.equal(parseMask("255.255.255.0"), 24);
  assert.equal(parseMask("255.255.255.252"), 30);
  assert.equal(parseMask("0.0.0.0"), 0);
  assert.equal(parseMask("255.0.255.0"), null);
  assert.equal(parseMask("33"), null);
  assert.equal(prefixOf(0xffffffff), 32);
  assert.deepEqual(parseCidr("10.0.0.5/8"), { ip: ip("10.0.0.5"), prefix: 8 });
  assert.deepEqual(parseCidr("10.0.0.5", "255.255.0.0"), { ip: ip("10.0.0.5"), prefix: 16 });
});

test("192.168.1.10/24", () => {
  const s = subnet(ip("192.168.1.10"), 24);
  assert.equal(ipStr(s.network), "192.168.1.0");
  assert.equal(ipStr(s.broadcast), "192.168.1.255");
  assert.equal(ipStr(s.first), "192.168.1.1");
  assert.equal(ipStr(s.last), "192.168.1.254");
  assert.equal(ipStr(s.wildcard), "0.0.0.255");
  assert.equal(s.hosts, 254);
  assert.equal(s.kind, "private");
  assert.equal(bin(s.mask), "11111111.11111111.11111111.00000000");
});

test("172.20.5.9/12 · /30 · /31 · /32", () => {
  const a = subnet(ip("172.20.5.9"), 12);
  assert.equal(ipStr(a.network), "172.16.0.0");
  assert.equal(ipStr(a.broadcast), "172.31.255.255");
  assert.equal(subnet(ip("10.0.0.5"), 30).hosts, 2);
  const b = subnet(ip("10.0.0.4"), 31);
  assert.equal(b.hosts, 2);
  assert.equal(ipStr(b.first), "10.0.0.4");
  assert.equal(ipStr(b.last), "10.0.0.5");
  assert.equal(b.isNetwork, false);
  assert.equal(subnet(ip("10.0.0.4"), 32).hosts, 1);
  assert.equal(subnet(ip("10.0.0.4"), 0).hosts, 2 ** 32 - 2);
  assert.equal(subnet(ip("192.168.1.0"), 24).isNetwork, true);
  assert.equal(subnet(ip("192.168.1.255"), 24).isBroadcast, true);
});

test("주소 종류", () => {
  assert.equal(kindOf(ip("10.1.2.3")), "private");
  assert.equal(kindOf(ip("172.32.0.1")), "public");
  assert.equal(kindOf(ip("169.254.10.1")), "linklocal");
  assert.equal(kindOf(ip("127.0.0.1")), "loopback");
  assert.equal(kindOf(ip("239.1.1.1")), "multicast");
  assert.equal(kindOf(ip("100.64.0.1")), "cgnat");
  assert.equal(kindOf(ip("8.8.8.8")), "public");
});

test("PC 와 장비 — 같은 서브넷·다른 서브넷·한쪽만", () => {
  const ok = pair({ ip: ip("192.168.1.200"), prefix: 24 }, { ip: ip("192.168.1.10"), prefix: 24 });
  assert.equal(ok.same, true);
  assert.equal(ok.messages[0].level, "ok");
  const no = pair({ ip: ip("192.168.0.5"), prefix: 24 }, { ip: ip("192.168.1.10"), prefix: 24 });
  assert.equal(no.same, false);
  assert.equal(no.messages[0].level, "fault");
  // PC /16 은 장비를 같은 망으로 보지만, 장비 /24 는 PC 를 다른 망으로 본다
  const one = pair({ ip: ip("192.168.0.5"), prefix: 16 }, { ip: ip("192.168.1.10"), prefix: 24 });
  assert.equal(one.aSeesB, true);
  assert.equal(one.bSeesA, false);
  assert.match(one.messages[0].ko, /B 의 응답은 게이트웨이/);
  const dup = pair({ ip: ip("192.168.1.10"), prefix: 24 }, { ip: ip("192.168.1.10"), prefix: 24 });
  assert.equal(dup.duplicate, true);
  const gw = pair({ ip: ip("192.168.1.200"), prefix: 24 }, { ip: ip("192.168.1.10"), prefix: 24 }, ip("192.168.2.1"));
  assert.ok(gw.messages.some((m) => m.level === "warn"));
  const net = pair({ ip: ip("192.168.1.0"), prefix: 24 }, { ip: ip("192.168.1.10"), prefix: 24 });
  assert.ok(net.messages.some((m) => /네트워크 주소/.test(m.ko)));
});
