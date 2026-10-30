// pcap 해석기의 TCP 다시 잇기·프레임 자르기·짝 맞추기·통계 — 직접 만든 캡처(pcapFixture.ts).
// 프레임은 기존 시험의 예시를 그대로: Modbus 03 요청·응답(modbusDecode.test.ts «03 요청·응답»),
// MC M100~M107 비트 읽기(mcDecode.test.ts, SLMP SH-080956ENG 예시).
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeCapture, parsePorts, percentile, toCsv, decoderLink, modbusFrameLen, mcFrameLen, mcHead } from "./pcapAnalyze.ts";
import { TcpConv, pcap, pcapng, wrap, ipv4, mbap, mc3eReq, mc3eResp, mc4eReq, mc4eResp, mc3eAsciiReq, mc3eAsciiResp, type Rec } from "./pcapFixture.ts";

const T0 = 1700000000;
const REQ03 = (tid: number) => mbap(tid, 1, [0x03, 0x00, 0x6b, 0x00, 0x03]);
const RESP03 = (tid: number) => mbap(tid, 1, [0x03, 0x06, 0x02, 0x2b, 0x00, 0x00, 0x00, 0x64]);
const MC_REQ = mc3eReq([0x01, 0x04, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00]);
const MC_RESP = mc3eResp(0, [0x00, 0x01, 0x00, 0x11]);
const file = (recs: Rec[], link = 1) => pcap(recs, { link });

test("포트 목록 읽기", () => {
  assert.deepEqual(parsePorts("502, 1502;5000-5002"), [502, 1502, 5000, 5001, 5002]);
  assert.equal(parsePorts("abc"), null);
  assert.equal(parsePorts("70000"), null);
  assert.deepEqual(parsePorts(""), []);
});

test("백분위(가장 가까운 순위)", () => {
  const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.deepEqual([percentile(s, 0.5), percentile(s, 0.95), percentile([7], 0.95), percentile([], 0.5)], [5, 10, 7, null]);
});

test("프레임 길이: MBAP·MC 3E/4E 이진·ASCII", () => {
  assert.equal(modbusFrameLen(Uint8Array.from(REQ03(1))), 12);
  assert.equal(modbusFrameLen(Uint8Array.from([0, 1, 0])), 0);
  assert.equal(modbusFrameLen(Uint8Array.from([0, 1, 0, 1, 0, 6, 1, 3])), -1);
  assert.equal(mcFrameLen(Uint8Array.from(MC_REQ)), MC_REQ.length);
  assert.equal(mcFrameLen(Uint8Array.from(mc4eReq(0x1234, [0x19, 0x06, 0, 0, 5, 0, 0x41, 0x42, 0x43, 0x44, 0x45]))), 26);
  const a = mc3eAsciiReq("04010001M*0001000008");
  assert.equal(mcFrameLen(Uint8Array.from(a)), a.length);
  assert.equal(mcFrameLen(Uint8Array.from(a.slice(0, 3))), 0);
  const h = mcHead(Uint8Array.from(a))!;
  assert.deepEqual([h.req, h.ascii, h.cmd, h.sub, h.addr, h.qty, h.station], [true, true, 0x0401, 1, "M100", 8, "00-FF-03FF-00"]);
  const hb = mcHead(Uint8Array.from(MC_REQ))!;
  assert.deepEqual([hb.req, hb.ascii, hb.cmd, hb.sub, hb.addr, hb.qty], [true, false, 0x0401, 1, "M100", 8]);
});

test("Modbus: 짝·응답 시간·예외·무응답·통계", () => {
  const c = new TcpConv("192.168.0.10", 50000, "192.168.0.20", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(1));
  c.s2c(T0 + 1.010, RESP03(1)); // 10 ms
  c.c2s(T0 + 2, REQ03(2));
  c.s2c(T0 + 2.020, RESP03(2)); // 20 ms
  c.c2s(T0 + 3, mbap(3, 1, [0x03, 0x01, 0x00, 0x00, 0x01]));
  c.s2c(T0 + 3.005, mbap(3, 1, [0x83, 0x02])); // 예외 02, 5 ms
  c.c2s(T0 + 4, REQ03(4)); // 응답 없음
  c.c2s(T0 + 6, REQ03(5));
  c.s2c(T0 + 6.030, RESP03(5)); // 30 ms
  const a = analyzeCapture(file(c.recs()), { lang: "en" });
  assert.equal(a.convs.length, 1);
  const cv = a.convs[0];
  assert.deepEqual([cv.proto, cv.client, cv.server, cv.requests, cv.ok, cv.exception, cv.timeout], ["modbus", "192.168.0.10:50000", "192.168.0.20:502", 5, 3, 1, 1]);
  assert.deepEqual([cv.min, cv.median, cv.p95, cv.max], [5, 10, 30, 30]);
  assert.deepEqual(
    a.rows.map((r) => [r.tag, r.status, r.rtMs, r.code]),
    [
      [1, "ok", 10, null],
      [2, "ok", 20, null],
      [3, "exception", 5, 2],
      [4, "timeout", null, null],
      [5, "ok", 30, null],
    ],
  );
  assert.equal(a.rows[0].fnName, "FC03 Read Holding Registers");
  assert.deepEqual([a.rows[0].addr, a.rows[0].qty, a.rows[0].unit], ["107", 3, "1"]);
  assert.deepEqual(a.codes, [{ proto: "modbus", code: 2, name: "02 Illegal Data Address", count: 1 }]);
  assert.deepEqual(
    a.funcs.map((f) => [f.label, f.requests]),
    [["FC03 Read Holding Registers", 5]],
  );
  assert.deepEqual([a.devices.length, a.devices[0].label, a.devices[0].server], [1, "1", "192.168.0.20"]);
  assert.equal(a.counts.otherTcpUdp, 0);
  assert.equal(cv.interval, 1000);
});

test("TCP: 한 프레임이 둘로 쪼개짐 · 한 세그먼트에 두 프레임 · 재전송 · 순서 바뀜", () => {
  const c = new TcpConv("10.0.0.1", 40000, "10.0.0.2", 502).handshake(T0);
  const r1 = REQ03(1);
  c.c2s(T0 + 1, r1.slice(0, 5)); // 쪼개짐
  c.c2s(T0 + 1.001, r1.slice(5));
  c.s2c(T0 + 1.011, [...RESP03(1), ...RESP03(1).map((b, i) => (i === 1 ? 9 : b))]); // 응답 둘(두 번째는 짝 없는 tid 9)
  c.c2sAt(T0 + 1.3, -12, r1); // 같은 바이트 재전송(새 IP ID)
  // 순서 바뀜: 뒤 조각이 먼저 잡힘
  const r2 = REQ03(2);
  c.c2sAt(T0 + 2.0005, 6, r2.slice(6));
  c.c2s(T0 + 2, r2.slice(0, 6));
  c.skipClient(6);
  c.s2c(T0 + 2.02, RESP03(2));
  const a = analyzeCapture(file(c.recs(1, 10)), { lang: "en" });
  const cv = a.convs[0];
  assert.equal(cv.retrans, 1);
  assert.deepEqual(
    a.rows.map((r) => [r.tag, r.status, r.rtMs]),
    [
      [1, "ok", 10],
      [9, "orphan", null],
      [2, "ok", 19.5],
    ],
  );
  // 요청 1 은 두 패킷에 걸침 — 첫 패킷 번호
  assert.equal(a.rows[0].reqNo, 4);
});

test("캡처가 빠뜨린 바이트 → 그 프레임은 버리고 다음 머리부터", () => {
  const c = new TcpConv("10.0.0.1", 40001, "10.0.0.2", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(1).slice(0, 4));
  c.skipClient(8); // 나머지 8바이트를 못 잡음
  c.c2s(T0 + 2, REQ03(2));
  c.s2c(T0 + 2.01, RESP03(2));
  // 뒤 조각이 계속 오지 않으면 끝에서 건너뛴다
  const a = analyzeCapture(file(c.recs()), { lang: "en" });
  assert.equal(a.convs[0].gaps, 1);
  assert.deepEqual(
    a.rows.map((r) => [r.tag, r.status]),
    [[2, "ok"]],
  );
});

test("pktmon 식 겹친 패킷 빼기 — 다른 인터페이스·마이크로초 차이, 링크 머리도 다름", () => {
  const c = new TcpConv("10.0.0.1", 40002, "10.0.0.2", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(1));
  c.s2c(T0 + 1.01, RESP03(1));
  const recs: Rec[] = [];
  for (const x of c.out) {
    recs.push({ t: x.t, data: wrap(1, x.ip), iface: 0 });
    recs.push({ t: x.t + 0.000003, data: wrap(1, x.ip, 5), iface: 1 });
  }
  const f = pcapng([{ link: 1 }, { link: 1 }], recs);
  const a = analyzeCapture(f, { lang: "en" });
  assert.equal(a.counts.duplicates, 5);
  assert.deepEqual([a.convs[0].retrans, a.rows.length, a.rows[0].status, a.rows[0].rtMs], [0, 1, "ok", 10]);
  const b = analyzeCapture(f, { lang: "en", dedupe: false });
  assert.equal(b.convs[0].retrans, 2);
  assert.equal(b.rows.length, 1);
});

test("MC 3E 이진: 포트 지정 없이 서브헤더로 찾고 순서대로 짝, 종료 코드 집계", () => {
  const c = new TcpConv("10.0.0.5", 51000, "10.0.0.6", 5000); // SYN 없음(연결 중간부터 뜬 파일)
  c.c2s(T0, MC_REQ);
  c.s2c(T0 + 0.004, MC_RESP);
  c.c2s(T0 + 0.1, MC_REQ);
  c.s2c(T0 + 0.103, [0xd0, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00, 0x0b, 0x00, 0x59, 0xc0, 0x00, 0xff, 0xff, 0x03, 0x00, 0x01, 0x01, 0x00, 0x00]);
  const a = analyzeCapture(file(c.recs(113), 113), { lang: "en" });
  const cv = a.convs[0];
  assert.deepEqual([cv.proto, cv.mcCode, cv.client, cv.requests, cv.ok, cv.exception], ["mc", "binary", "10.0.0.5:51000", 2, 1, 1]);
  assert.deepEqual(
    a.rows.map((r) => [r.status, r.rtMs, r.addr, r.qty, r.unit]),
    [
      ["ok", 4, "M100", 8, "00-FF-03FF-00"],
      ["exception", 3, "M100", 8, "00-FF-03FF-00"],
    ],
  );
  assert.equal(a.rows[0].fnName, "0401/0001 Read (bits)");
  assert.equal(a.codes[0].code, 0xc059);
  assert.ok(a.codes[0].name.startsWith("C059 "));
  // 자동 감지를 끄면 산업 통신이 아님
  const b = analyzeCapture(file(c.recs(113), 113), { lang: "en", autoDetect: false });
  assert.deepEqual([b.convs.length, b.counts.otherConvs, b.counts.otherTcpUdp], [0, 1, 4]);
});

test("MC 4E: 일련번호로 짝(응답 순서가 바뀌어도)", () => {
  const cmd = [0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00];
  const c = new TcpConv("10.0.0.5", 51001, "10.0.0.6", 5001).handshake(T0);
  c.c2s(T0 + 1, [...mc4eReq(1, cmd), ...mc4eReq(2, cmd)]);
  c.s2c(T0 + 1.002, mc4eResp(2, 0, [1, 0, 2, 0, 3, 0]));
  c.s2c(T0 + 1.005, mc4eResp(1, 0, [1, 0, 2, 0, 3, 0]));
  const a = analyzeCapture(file(c.recs(101), 101), { lang: "en", mcPorts: [5001] });
  assert.deepEqual(
    a.rows.map((r) => [r.tag, r.status, r.rtMs, r.addr]),
    [
      [1, "ok", 5, "D100"],
      [2, "ok", 2, "D100"],
    ],
  );
});

test("MC 3E ASCII · 나노초 pcap · 빅 엔디언", () => {
  const c = new TcpConv("10.0.0.7", 52000, "10.0.0.8", 6000).handshake(T0);
  c.c2s(T0 + 1, mc3eAsciiReq("04010001M*0001000008"));
  c.s2c(T0 + 1.0025, mc3eAsciiResp("00010011"));
  const f = pcap(c.recs(), { link: 1, nano: true, bigEndian: true });
  const a = analyzeCapture(f, { lang: "ko" });
  assert.deepEqual(
    a.rows.map((r) => [r.status, r.rtMs, r.addr, r.ascii]),
    [["ok", 2.5, "M100", true]],
  );
  assert.equal(a.rows[0].fnName, "0401/0001 일괄 읽기 (비트)");
  assert.equal(a.convs[0].mcCode, "ascii");
});

test("MC over UDP · 산업 통신이 아닌 것은 개수만", () => {
  const recs: Rec[] = [
    { t: T0, data: wrap(1, ipv4({ src: "10.0.0.9", dst: "10.0.0.10", sport: 6001, dport: 5002, udp: true, payload: MC_REQ })) },
    { t: T0 + 0.006, data: wrap(1, ipv4({ src: "10.0.0.10", dst: "10.0.0.9", sport: 5002, dport: 6001, udp: true, payload: MC_RESP })) },
    { t: T0 + 0.01, data: wrap(1, ipv4({ src: "10.0.0.9", dst: "10.0.0.1", sport: 53000, dport: 53, udp: true, payload: [1, 2, 3, 4, 5, 6, 7, 8] })) },
    { t: T0 + 0.02, data: wrap(1, ipv4({ src: "10.0.0.9", dst: "10.0.0.1", sport: 53001, dport: 80, payload: [0x47, 0x45, 0x54, 0x20, 0x2f, 0x20, 0x48, 0x54, 0x54, 0x50] })) },
  ];
  const a = analyzeCapture(file(recs), { lang: "en" });
  assert.deepEqual([a.convs.length, a.convs[0].transport, a.rows[0].status, a.rows[0].rtMs], [1, "udp", "ok", 6]);
  assert.deepEqual([a.counts.otherConvs, a.counts.otherTcpUdp, a.counts.industrial], [2, 2, 2]);
  // 산업 통신 밖의 내용·주소는 결과 어디에도 없다
  const json = JSON.stringify(a, (_k, v) => (v instanceof Uint8Array ? Array.from(v) : v));
  assert.ok(!json.includes("10.0.0.1:") && !json.includes("53001"));
});

test("연결 끊김·캡처 끝·같은 트랜잭션 ID 다시 씀", () => {
  const c = new TcpConv("10.0.0.1", 40010, "10.0.0.2", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(7));
  c.c2s(T0 + 3, REQ03(7)); // 앞 요청 무응답 뒤 같은 ID
  c.s2c(T0 + 3.01, RESP03(7));
  c.c2s(T0 + 4, REQ03(8));
  c.fin(false, T0 + 4.1); // 서버가 닫음
  const d = new TcpConv("10.0.0.1", 40011, "10.0.0.2", 502).handshake(T0 + 4.2);
  d.c2s(T0 + 4.5, REQ03(1)); // 0.3 s 뒤 캡처 끝(시간 초과 1 s 전)
  const a = analyzeCapture(file([...c.recs(), ...d.recs()].sort((x, y) => x.t - y.t)), { lang: "en" });
  assert.deepEqual(
    a.rows.map((r) => [r.conv, r.tag, r.status]),
    [
      [1, 7, "timeout"],
      [1, 7, "ok"],
      [1, 8, "closed"],
      [2, 1, "cut"],
    ],
  );
  assert.deepEqual([a.overall.timeout, a.overall.closed, a.overall.cut], [1, 1, 1]);
});

test("CSV: IP 는 고를 때만, 해석기 링크는 # 뒤에", () => {
  const c = new TcpConv("192.168.0.10", 50000, "192.168.0.20", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(1));
  c.s2c(T0 + 1.01, RESP03(1));
  const a = analyzeCapture(file(c.recs()), { lang: "en" });
  const plain = toCsv(a, { withAddr: false, withBytes: true, lang: "en" });
  assert.ok(!plain.includes("192.168"));
  assert.ok(plain.split("\r\n")[1].startsWith("C1,Modbus TCP,1.000"));
  assert.ok(plain.includes("00 01 00 00 00 06 01 03 00 6B 00 03"));
  assert.ok(toCsv(a, { withAddr: true, withBytes: false, lang: "en" }).includes("192.168.0.10:50000,192.168.0.20:502"));
  const l = decoderLink(a.rows[0], "resp")!;
  assert.equal(l.path, "tools/modbus-decoder/");
  assert.equal(new URLSearchParams(l.hash.slice(1)).get("start"), "107");
  const m = new TcpConv("10.0.0.5", 51000, "10.0.0.6", 5000).handshake(T0);
  m.c2s(T0 + 1, MC_REQ);
  m.s2c(T0 + 1.01, MC_RESP);
  const am = analyzeCapture(file(m.recs()), { lang: "en" });
  const q = new URLSearchParams(decoderLink(am.rows[0], "resp")!.hash.slice(1));
  assert.equal(q.get("frame"), "D0 00 00 FF FF 03 00 06 00 00 00 00 01 00 11");
  assert.ok(q.get("pair")!.startsWith("50 00"));
});

test("SLL2·나노초 pcapng 의 응답 시간은 나노초까지", () => {
  const c = new TcpConv("10.1.1.1", 40000, "10.1.1.2", 502).handshake(T0);
  c.c2s(T0 + 1, REQ03(1));
  c.s2c(T0 + 1, RESP03(1));
  const recs = c.recs(276).map((r, i) => ({ ...r, t: Math.floor(r.t), ns: i === 3 ? 100 : i === 4 ? 1600 : Math.round((r.t % 1) * 1e9) }));
  const a = analyzeCapture(pcapng([{ link: 276, tsresol: 9 }], recs), { lang: "en" });
  assert.equal(a.rows[0].rtMs, 0.0015);
});

test("예시 캡처(사이트 /tools/pcap-analyzer/sample.pcapng): Modbus 예외·무응답, MC C059 가 보이고 작다", async () => {
  const { samplePcapng } = await import("./pcapSample.ts");
  const buf = samplePcapng();
  assert.ok(buf.length < 64 * 1024, `크기 ${buf.length}`);
  const a = analyzeCapture(buf, { lang: "ko" });
  assert.equal(a.capture.format, "pcapng");
  const mb = a.convs.find((c) => c.proto === "modbus")!;
  const mc = a.convs.find((c) => c.proto === "mc")!;
  assert.deepEqual([mb.requests, mb.ok, mb.exception, mb.timeout], [30, 28, 1, 1]);
  assert.deepEqual([mc.requests, mc.ok, mc.exception], [12, 11, 1]);
  assert.ok(a.codes.some((c) => c.proto === "mc" && /C059/.test(c.name)));
  assert.ok(a.counts.otherTcpUdp >= 4);
  assert.equal(a.overall.orphan, 0);
});
