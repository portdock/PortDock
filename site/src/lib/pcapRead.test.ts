// pcap·pcapng 읽기와 링크·IP·TCP 풀기 — 직접 만든 바이트(pcapFixture.ts)로 고정
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCapture, decodeLayers, CaptureError, type RawPacket } from "./pcapRead.ts";
import { ipv4, wrap, pcap, pcapng, concat } from "./pcapFixture.ts";

const ip = ipv4({ src: "192.168.0.10", dst: "192.168.0.20", sport: 50000, dport: 502, seq: 7, ack: 9, flags: 0x18, payload: [1, 2, 3], ipId: 5 });
const all = (b: Uint8Array) => {
  const out: RawPacket[] = [];
  const info = readCapture(b, (p) => out.push({ ...p, data: p.data.slice() }));
  return { info, out };
};

test("pcap 마이크로초 리틀 엔디언", () => {
  const { info, out } = all(pcap([{ t: 1700000000.25, data: wrap(1, ip) }, { t: 1700000001.000001, data: wrap(1, ip) }], { link: 1 }));
  assert.deepEqual([info.format, info.precision, info.bigEndian, info.packets], ["pcap", "us", false, 2]);
  assert.deepEqual(out.map((p) => [p.no, p.sec, p.ns]), [
    [1, 1700000000, 250000000],
    [2, 1700000001, 1000],
  ]);
});

test("pcap 나노초 빅 엔디언", () => {
  const { info, out } = all(pcap([{ t: 1700000000, ns: 123456789, data: wrap(101, ip) }], { link: 101, nano: true, bigEndian: true }));
  assert.deepEqual([info.precision, info.bigEndian, info.linkTypes], ["ns", true, [101]]);
  assert.deepEqual([out[0].sec, out[0].ns], [1700000000, 123456789]);
  const L = decodeLayers(out[0].link, out[0].data);
  assert.equal(L.kind, "ipv4");
});

test("pcapng 두 인터페이스(마이크로초·나노초) · SPB · 빅 엔디언 구역 이어 붙이기", () => {
  const a = pcapng(
    [{ link: 1 }, { link: 113, tsresol: 9 }],
    [
      { t: 1700000000.5, data: wrap(1, ip), iface: 0 },
      { t: 1700000000, ns: 987654321, data: wrap(113, ip), iface: 1 },
      { t: 0, data: wrap(1, ip), spb: true },
    ],
  );
  const b = pcapng([{ link: 276 }], [{ t: 1700000002.000002, data: wrap(276, ip) }], { bigEndian: true });
  const { info, out } = all(concat(a, b));
  assert.equal(info.format, "pcapng");
  assert.equal(info.interfaces, 3);
  assert.equal(info.precision, "mixed");
  assert.deepEqual(
    out.map((p) => [p.iface, p.link, p.sec, p.ns]),
    [
      [0, 1, 1700000000, 500000000],
      [1, 113, 1700000000, 987654321],
      [0, 1, NaN, 0],
      [2, 276, 1700000002, 2000],
    ],
  );
  for (const p of out) {
    const L = decodeLayers(p.link, p.data);
    assert.equal(L.kind, "ipv4");
    if (L.kind === "ipv4") assert.deepEqual(Array.from(L.ip.tcp!.payload), [1, 2, 3]);
  }
});

test("링크: VLAN·SLL·SLL2·Raw·NULL 을 벗기고 이더넷 덧붙임은 IP 길이로 자른다", () => {
  for (const [link, vlan] of [[1, undefined], [1, 100], [113, undefined], [276, undefined], [101, undefined], [0, undefined]] as const) {
    const L = decodeLayers(link, wrap(link, ip, vlan));
    assert.equal(L.kind, "ipv4", `link ${link} vlan ${vlan}`);
    if (L.kind !== "ipv4") continue;
    assert.deepEqual([L.ip.src, L.ip.dst, L.ip.id, L.ip.tcp!.sport, L.ip.tcp!.dport, L.ip.tcp!.seq, L.ip.tcp!.flags], ["192.168.0.10", "192.168.0.20", 5, 50000, 502, 7, 0x18]);
    assert.deepEqual(Array.from(L.ip.tcp!.payload), [1, 2, 3]);
  }
  assert.equal(decodeLayers(147, wrap(101, ip)).kind, "unsupported-link");
  const v6 = wrap(1, ip);
  v6[12] = 0x86;
  v6[13] = 0xdd;
  assert.equal(decodeLayers(1, v6).kind, "ipv6");
});

test("UDP · IP 조각", () => {
  const u = decodeLayers(101, ipv4({ src: "10.0.0.1", dst: "10.0.0.2", sport: 5000, dport: 5001, udp: true, payload: [9, 8] }));
  assert.ok(u.kind === "ipv4" && u.ip.udp && Array.from(u.ip.udp.payload).join() === "9,8");
  const f = ipv4({ src: "10.0.0.1", dst: "10.0.0.2", sport: 1, dport: 2, payload: [1] });
  f[6] = 0x20; // MF
  const L = decodeLayers(101, f);
  assert.ok(L.kind === "ipv4" && L.ip.fragment && !L.ip.tcp);
});

test("잘린 파일·모르는 형식·gzip", () => {
  const b = pcap([{ t: 1, data: wrap(1, ip) }, { t: 2, data: wrap(1, ip) }], { link: 1 });
  const { info, out } = all(b.subarray(0, b.length - 5));
  assert.deepEqual([info.truncatedFile, out.length], [true, 1]);
  assert.throws(() => readCapture(Uint8Array.from([1, 2, 3, 4, 5]), () => {}), (e) => e instanceof CaptureError && e.code === "unknown");
  assert.throws(() => readCapture(Uint8Array.from([0x1f, 0x8b, 8, 0]), () => {}), (e) => e instanceof CaptureError && e.code === "gzip");
});
