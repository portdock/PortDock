// MQTT 페이로드 디코더 — 직접 만든 바이트(작은 protobuf 인코더로 Sparkplug B, 손으로 짠 MQTT 패킷)로 확인
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, decodePackets, decodePayload, decodeSparkplug, hexOf, protoTree, readFields, toBytes, InputError, type SpbPayload } from "./mqttDecode.ts";

// ---- 시험용 protobuf 인코더(필드 번호·형만 — 라이브러리 없이)
const varint = (v: bigint | number): number[] => {
  let x = BigInt.asUintN(64, BigInt(v));
  const out: number[] = [];
  do {
    let b = Number(x & 0x7fn);
    x >>= 7n;
    if (x) b |= 0x80;
    out.push(b);
  } while (x);
  return out;
};
const key = (field: number, wire: number) => varint((field << 3) | wire);
const fv = (field: number, v: bigint | number) => [...key(field, 0), ...varint(v)];
const fl = (field: number, b: number[] | Uint8Array) => [...key(field, 2), ...varint(b.length), ...b];
const fs = (field: number, s: string) => fl(field, [...new TextEncoder().encode(s)]);
const ff32 = (field: number, x: number) => {
  const d = new DataView(new ArrayBuffer(4));
  d.setFloat32(0, x, true);
  return [...key(field, 5), ...new Uint8Array(d.buffer)];
};
const ff64 = (field: number, x: number) => {
  const d = new DataView(new ArrayBuffer(8));
  d.setFloat64(0, x, true);
  return [...key(field, 1), ...new Uint8Array(d.buffer)];
};
const u8 = (a: number[]) => Uint8Array.from(a);

// Sparkplug B NDATA 예: timestamp, seq, 지표 다섯
const TS = 1761868800000n; // 2025-10-31T00:00:00Z
const SPB = u8([
  ...fv(1, TS),
  ...fl(2, [...fs(1, "Motor/Speed"), ...fv(2, 7), ...fv(3, TS), ...fv(4, 9), ...ff32(12, 1450.5)]),
  ...fl(2, [...fs(1, "Motor/Temp"), ...fv(4, 2), ...fv(10, 0xffffff85)]), // Int16 −123 을 uint32 로
  ...fl(2, [...fv(2, 3), ...fv(11, -5n)]), // 별칭만, datatype 없음, long
  ...fl(2, [...fs(1, "Run"), ...fv(4, 11), ...fv(14, 1)]),
  ...fl(2, [...fs(1, "Recipe"), ...fv(4, 12), ...fs(15, "A-01")]),
  ...fl(2, [...fs(1, "Count64"), ...fv(4, 4), ...fv(11, -2n)]),
  ...fl(2, [...fs(1, "Ratio"), ...fv(4, 10), ...ff64(13, 0.25)]),
  ...fl(2, [...fs(1, "Arr"), ...fv(4, 23), ...fl(16, [0x01, 0x00, 0xff, 0xff])]), // Int16Array [1, −1]
  ...fl(2, [...fs(1, "Nothing"), ...fv(4, 3), ...fv(7, 1)]),
  ...fl(2, [...fs(1, "Meta"), ...fv(4, 7), ...fl(9, [...fs(1, "engUnit"), ...fl(2, [...fv(1, 12), ...fs(8, "rpm")])]), ...fv(10, 42)]),
  ...fv(3, 17),
]);

test("입력: HEX(띄어쓰기·0x·콜론), Base64, 텍스트, JSON 은 텍스트로", () => {
  assert.deepEqual([...toBytes("30 0A 00 03").bytes], [0x30, 0x0a, 0x00, 0x03]);
  assert.equal(toBytes("0x30:0x0A").as, "hex");
  assert.equal(toBytes("MAoAA2EvYmhlbGxv").as, "base64");
  assert.equal(toBytes('{"a":1}').as, "text");
  assert.equal(toBytes("hello world").as, "text");
  assert.throws(() => toBytes("zz", "hex"), InputError);
  assert.throws(() => toBytes("   "), InputError);
  assert.deepEqual([...toBytes("AAEC", "base64").bytes], [0, 1, 2]);
});

test("protobuf 필드 읽기: varint·LEN·I32·I64, 남는 바이트·그룹은 오류", () => {
  const f = readFields(u8([...fv(1, 300), ...fs(2, "x"), ...ff32(3, 1), ...ff64(4, 2)]));
  assert.deepEqual(f.map((x) => [x.field, x.wire]), [[1, 0], [2, 2], [3, 5], [4, 1]]);
  assert.equal(f[0].v, 300n);
  assert.throws(() => readFields(u8([0x0a, 0x05, 0x01])));
  assert.throws(() => readFields(u8([0x0b])));
});

test("Sparkplug B: 머리(timestamp·seq)와 지표 값 — 형별 부호·float·별칭·null·속성·배열", () => {
  const p: SpbPayload = decodeSparkplug(SPB);
  assert.equal(p.timestamp, "2025-10-31T00:00:00.000Z (1761868800000)");
  assert.equal(p.seq, "17");
  const by = (n: string) => p.metrics.find((m) => m.name === n)!;
  assert.equal(p.metrics.length, 10);
  const sp = by("Motor/Speed");
  assert.deepEqual([sp.alias, sp.typeName, sp.value], ["7", "Float", "1450.5"]);
  assert.equal(by("Motor/Temp").value, "-123");
  assert.equal(by("Motor/Temp").typeName, "Int16");
  const al = p.metrics[2];
  assert.equal(al.name, undefined);
  assert.equal(al.alias, "3");
  assert.equal(al.value, "18446744073709551611"); // 형이 없으면 부호 없는 64비트로
  assert.equal(by("Run").value, "true");
  assert.equal(by("Recipe").value, '"A-01"');
  assert.equal(by("Count64").value, "-2");
  assert.equal(by("Ratio").value, "0.25");
  assert.equal(by("Arr").value, "[1, -1]");
  assert.equal(by("Nothing").value, "null");
  assert.deepEqual(by("Meta").properties, [["engUnit", '"rpm"']]);
  assert.equal(by("Meta").value, "42");
});

test("Sparkplug 가 아닌 protobuf 는 거절하고 일반 필드 나무로", () => {
  const other = u8([...fv(1, 5), ...fs(9, "abc")]);
  assert.throws(() => decodeSparkplug(other));
  const d = decodePayload(u8([0x08, 0x96, 0x01, ...fs(9, "\u0001abc")]));
  assert.equal(d.kind, "protobuf");
  if (d.kind === "protobuf") assert.equal(d.tree[0].value, "150");
  const t = protoTree(u8(fl(1, [...fv(1, 2)])));
  assert.equal(t[0].children![0].value, "2");
});

test("페이로드: JSON 은 예쁘게, 글은 글로, Sparkplug 는 토픽 없이도, 깨진 바이트는 HEX", () => {
  const j = decodePayload(new TextEncoder().encode('{"t":21.5,"ok":true}'));
  assert.equal(j.kind, "json");
  if (j.kind === "json") assert.equal(j.pretty, '{\n  "t": 21.5,\n  "ok": true\n}');
  assert.equal(decodePayload(new TextEncoder().encode("ON")).kind, "text");
  assert.equal(decodePayload(SPB).kind, "sparkplug");
  const b = decodePayload(u8([0xff, 0xfe, 0x07]));
  assert.equal(b.kind, "binary");
  assert.equal(decodePayload(u8([])).kind, "empty");
});

test("MQTT 3.1.1 PUBLISH QoS 1: 고정 헤더·남은 길이·토픽·패킷 ID·페이로드(JSON)", () => {
  // 0x32 = PUBLISH, QoS 1 / 남은 길이 / 토픽 «a/b» / 패킷 ID 10 / 페이로드 {"v":1}
  const pl = [...new TextEncoder().encode('{"v":1}')];
  const body = [0x00, 0x03, 0x61, 0x2f, 0x62, 0x00, 0x0a, ...pl];
  const hex = hexOf(u8([0x32, body.length, ...body]));
  const a = analyze(hex);
  assert.equal(a.kind, "packets");
  if (a.kind !== "packets") return;
  const p = a.packets[0];
  assert.equal(p.name, "PUBLISH");
  assert.equal(p.topic, "a/b");
  const f = Object.fromEntries(p.fields.map((x) => [x.k, x.v]));
  assert.equal(f.qos, "1");
  assert.equal(f.retain, "0");
  assert.equal(f.packetId, "10");
  assert.equal(f.remaining, String(body.length));
  assert.equal(f.payloadLen, "7 B");
  assert.equal(p.decoded?.kind, "json");
});

test("Sparkplug 토픽의 PUBLISH → 페이로드를 Sparkplug 로, 남은 길이 2바이트(200 B)", () => {
  const topic = [...new TextEncoder().encode("spBv1.0/G1/NDATA/E1")];
  const body = [0x00, topic.length, ...topic, ...SPB];
  const len = body.length;
  const rl = len < 128 ? [len] : [(len & 0x7f) | 0x80, len >> 7];
  const d = decodePackets(u8([0x30, ...rl, ...body]));
  assert.equal(d.packets[0].topic, "spBv1.0/G1/NDATA/E1");
  const a = analyze(hexOf(u8([0x30, ...rl, ...body])));
  assert.ok(a.kind === "packets" && a.packets[0].decoded?.kind === "sparkplug");
  // 200 바이트짜리 남은 길이 인코딩: C8 01
  const big = [0x00, 0x01, 0x74, ...new Array(197).fill(0x41)];
  const r = decodePackets(u8([0x31, 0xc8, 0x01, ...big]));
  const f = Object.fromEntries(r.packets[0].fields.map((x) => [x.k, x.v]));
  assert.equal(f.remaining, "200");
  assert.equal(f.retain, "1");
  assert.equal(f.payloadLen, "197 B");
});

test("CONNECT(3.1.1)·CONNACK·SUBSCRIBE·SUBACK·PINGREQ 이어진 흐름, 암호는 길이만", () => {
  const s = (x: string) => {
    const b = [...new TextEncoder().encode(x)];
    return [b.length >> 8, b.length & 255, ...b];
  };
  const connBody = [...s("MQTT"), 4, 0xc2, 0x00, 0x3c, ...s("dev1"), ...s("user"), ...s("secret")];
  const conn = [0x10, connBody.length, ...connBody];
  const connack = [0x20, 0x02, 0x00, 0x05];
  const subBody = [0x00, 0x01, ...s("plant/+/temp"), 0x01];
  const sub = [0x82, subBody.length, ...subBody];
  const suback = [0x90, 0x04, 0x00, 0x01, 0x01, 0x80];
  const ping = [0xc0, 0x00];
  const d = decodePackets(u8([...conn, ...connack, ...sub, ...suback, ...ping]));
  assert.equal(d.version, 4);
  assert.deepEqual(d.packets.map((p) => p.name), ["CONNECT", "CONNACK", "SUBSCRIBE", "SUBACK", "PINGREQ"]);
  const f0 = Object.fromEntries(d.packets[0].fields.map((x) => [x.k, x.v]));
  assert.equal(f0.clientId, '"dev1"');
  assert.equal(f0.username, '"user"');
  assert.equal(f0.password, "6 B");
  assert.ok(!JSON.stringify(d.packets[0].fields).includes("secret"));
  assert.equal(f0.keepAlive, "60");
  assert.match(f0.connectFlags, /clean session/); // 3.1.1 이름
  const ack = d.packets[1].fields.find((x) => x.k === "returnCode")!;
  assert.equal(ack.note!.en, "Not authorized");
  assert.equal(d.packets[2].fields.find((x) => x.k === "filters")!.v, "plant/+/temp (QoS 1)");
  assert.equal(d.packets[3].fields.find((x) => x.k === "codes")!.v, "QoS 1\n0x80 Failure");
});

test("MQTT 5: CONNECT 수준 5 로 자동, PUBLISH 속성(Content Type·User Property·Topic Alias)", () => {
  const s = (x: string) => {
    const b = [...new TextEncoder().encode(x)];
    return [b.length >> 8, b.length & 255, ...b];
  };
  const connBody = [...s("MQTT"), 5, 0x02, 0x00, 0x0a, 0x00, ...s("c")];
  const props = [0x03, ...s("application/json"), 0x23, 0x00, 0x02, 0x26, ...s("k"), ...s("v")];
  const pubBody = [...s("t"), props.length, ...props, ...new TextEncoder().encode("[1,2]")];
  const all = u8([0x10, connBody.length, ...connBody, 0x30, pubBody.length, ...pubBody]);
  const d = decodePackets(all);
  assert.equal(d.version, 5);
  // MQTT 5.0 §3.1.2.4: bit1 은 «Clean Start»(3.1.1 의 Clean Session 이 아님)
  const cf = d.packets[0].fields.find((x) => x.k === "connectFlags")!.v;
  assert.match(cf, /clean start/);
  assert.ok(!/clean session/.test(cf));
  const pr = d.packets[1].fields.find((x) => x.k === "props")!.v;
  assert.equal(pr, 'Content Type: "application/json"\nTopic Alias: 2\nUser Property: "k" = "v"');
  assert.equal(decodePayload(d.packets[1].payload!).kind, "json");
  // 버전을 3.1.1 로 못 박으면 속성 바이트가 페이로드로 들어간다
  const v4 = decodePackets(all.subarray(connBody.length + 2), 4);
  assert.equal(v4.packets[0].payload!.length, props.length + 1 + 5);
});

test("패킷이 아닌 것: 잘린 패킷·잘못된 플래그·JSON 글은 페이로드로", () => {
  assert.throws(() => decodePackets(u8([0x30, 0x05, 0x00])));
  assert.throws(() => decodePackets(u8([0x83, 0x00]))); // SUBSCRIBE 플래그는 0010 이어야
  assert.throws(() => decodePackets(u8([0x00, 0x00])));
  const a = analyze('{"a":1}');
  assert.equal(a.kind, "payload");
  const b = analyze(hexOf(SPB));
  assert.ok(b.kind === "payload" && b.payload.kind === "sparkplug");
  const c = analyze(hexOf(SPB), { what: "packet" });
  assert.ok(c.kind === "payload" && !!c.packetError);
});
