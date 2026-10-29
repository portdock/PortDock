// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/hw-tester/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { btApply, btText, longestLoss, recCsv, recText, sameChannel, signalNote, stats, summarize, validDnsName, validTarget, yMax } from "./model.ts";

const BAN = /진단|검증|최적|정상|diagnos|verif|optimi/i;
const ticks = (n, f) => Array.from({ length: n }, (_, i) => ({ ts: 1_700_000_000_000 + i * 1000, gw: null, net: null, dns: null, ...f(i) }));

test("대상·DNS 이름 칸", () => {
  assert.ok(validTarget("1.1.1.1") && validTarget(" 8.8.8.8 ") && validTarget("one.one.one.one"));
  assert.ok(!validTarget("0.0.0.0") && !validTarget("255.255.255.255") && !validTarget("224.0.0.1") && !validTarget("1.2.3.300") && !validTarget("a b") && !validTarget(""));
  assert.ok(validDnsName("example.com") && validDnsName("example.com.") && !validDnsName("1.1.1.1") && !validDnsName("-a.com") && !validDnsName("a..b"));
});

test("통계 — 손실·평균·95%·흔들림", () => {
  assert.equal(stats([null, null]), null);
  const s = stats([10, 20, -1, 30, null, -1]);
  assert.equal(s.sent, 5);
  assert.equal(s.lost, 2);
  assert.equal(s.loss, 40);
  assert.equal(s.avg, 20);
  assert.equal(s.max, 30);
  assert.equal(s.p95, 30);
  assert.equal(s.jitter, 10);
  assert.deepEqual(stats([-1, -1]), { sent: 2, lost: 2, loss: 100, avg: null, p95: null, max: null, jitter: null });
  assert.equal(longestLoss([1, -1, -1, null, -1, 2, -1]), 3);
});

test("구간 요약 — 짧으면 판정하지 않음", () => {
  const s = summarize(ticks(5, () => ({ gw: 2, net: 10 })), [], true);
  assert.equal(s.level, "short");
});

test("구간 요약 — 공유기 쪽 / 공유기 너머 / 걸리는 것 없음", () => {
  // 게이트웨이까지 10% 손실 → 공유기 쪽
  const a = summarize(ticks(100, (i) => ({ gw: i % 10 === 0 ? -1 : 3, net: i % 10 === 0 ? -1 : 15 })), [], true);
  assert.equal(a.level, "look");
  assert.match(a.notes[0].ko, /공유기 쪽/);
  assert.match(a.notes[0].en, /router side/);
  // 게이트웨이 0%, 인터넷 5% → 공유기 너머
  const b = summarize(ticks(100, (i) => ({ gw: 3, net: i % 20 === 0 ? -1 : 15 })), [], true);
  assert.equal(b.level, "look");
  assert.match(b.notes[0].ko, /공유기 너머/);
  // 다 괜찮음
  const c = summarize(ticks(100, () => ({ gw: 3, net: 15, dns: null })), [], true);
  assert.equal(c.level, "ok");
  // 게이트웨이 지연 튐
  const d = summarize(ticks(100, (i) => ({ gw: i % 4 === 0 ? 120 : 3, net: 20 })), [], true);
  assert.ok(d.notes.some((n) => /게이트웨이 지연이 튑니다/.test(n.ko)));
  // 게이트웨이 없음 + 손실 → 구간 못 나눔
  const e = summarize(ticks(100, (i) => ({ net: i % 10 === 0 ? -1 : 15 })), [], false);
  assert.ok(e.notes.some((n) => /나누지 못했습니다/.test(n.ko)));
  // DNS 느림, Wi-Fi 끊김
  const f = summarize(ticks(100, (i) => ({ gw: 3, net: 15, dns: i % 5 === 0 ? 400 : null })), [{ ts: 1, connected: false, code: 1, reason: "x" }], true);
  assert.ok(f.notes.some((n) => /DNS/.test(n.ko)) && f.notes.some((n) => /끊김 1번/.test(n.ko)) && f.disconnects === 1);
  for (const s of [a, b, c, d, e, f]) for (const n of s.notes) assert.ok(!BAN.test(n.ko) && !BAN.test(n.en), n.ko);
});

test("CSV — 손실·빈칸·Wi-Fi 사건, 따옴표", () => {
  const csv = recCsv({ gateway: "192.0.2.1", target: "1.1.1.1", dnsName: "example.com", intervalMs: 1000, startedAt: 1 }, ticks(2, (i) => ({ gw: i ? -1 : 3, net: 12, dns: i ? null : 40 })), [{ ts: 1_700_000_000_500, connected: false, code: 0x48000, reason: 'a, "b"' }]);
  const lines = csv.trim().split("\n");
  assert.match(lines[0], /^# PortDock Hardware Tester — gateway 192\.0\.2\.1, internet 1\.1\.1\.1, dns example\.com/);
  assert.equal(lines[1], "time,gateway_ms,internet_ms,dns_ms,event");
  assert.match(lines[2], /,3,12,40,$/);
  assert.match(lines[3], /,,,,"wifi_disconnected \(0x48000\): a, ""b"""$/);
  assert.match(lines[4], /,lost,12,,$/);
});

test("요약 글 — 금지 낱말 없음", () => {
  const s = summarize(ticks(50, () => ({ gw: 3, net: 15 })), [], true);
  for (const lang of ["ko", "en"]) {
    const txt = recText(lang, "PortDock Hardware Tester", "0.4.0", { gateway: "192.0.2.1", target: "1.1.1.1", dnsName: "", intervalMs: 1000, startedAt: 1 }, s, [{ ts: 2, connected: true, code: null, reason: null }]);
    assert.ok(!BAN.test(txt));
    assert.match(txt, /192\.0\.2\.1/);
  }
});

test("블루투스 — 연결·끊김 세기, 저장 글은 «장치 N» 만", () => {
  let st = btApply([], [], { type: "snapshot", ts: 1, devices: [{ n: 1, name: "Example Headset", connected: true }, { n: 2, name: "Example Mouse", connected: false }] });
  st = btApply(st.rows, st.log, { type: "change", ts: 2, dev: { n: 1, name: "Example Headset", connected: false }, added: false, removed: false });
  st = btApply(st.rows, st.log, { type: "change", ts: 3, dev: { n: 1, name: "Example Headset", connected: true }, added: false, removed: false });
  st = btApply(st.rows, st.log, { type: "change", ts: 4, dev: { n: 3, name: "Example Keyboard", connected: true }, added: true, removed: false });
  st = btApply(st.rows, st.log, { type: "change", ts: 5, dev: { n: 2, name: "", connected: null }, added: false, removed: true });
  assert.deepEqual(st.rows.map((r) => [r.n, r.connected, r.connects, r.drops, r.removed]), [
    [1, true, 1, 1, false],
    [2, null, 0, 0, true],
    [3, true, 1, 0, false],
  ]);
  assert.equal(st.rows[1].name, "Example Mouse");
  assert.equal(st.log.length, 4);
  for (const lang of ["ko", "en"]) {
    const txt = btText(lang, "PortDock Hardware Tester", "0.4.0", st.rows, st.log, 1);
    assert.ok(!/Example/.test(txt), "이름이 새면 안 됨");
    assert.match(txt, lang === "ko" ? /장치 1: 연결됨 · 연결 1 · 끊김 1/ : /Device 1: connected · connects 1 · drops 1/);
    assert.ok(!BAN.test(txt));
  }
});

test("신호 풀이·같은 채널", () => {
  const base = { state: "ok", quality: 80, rssi: -50, rxMbps: 866, txMbps: 866, phy: "802.11ac", band: "5", channel: 36, channels: [{ band: "5", channel: 36, count: 3, mine: true }], error: null };
  assert.equal(signalNote(base).level, "ok");
  assert.equal(signalNote({ ...base, rssi: -70 }).level, "look");
  assert.equal(signalNote({ ...base, rssi: -80 }).level, "look");
  assert.equal(signalNote({ ...base, state: "denied" }), null);
  assert.equal(sameChannel(base), 2);
  assert.equal(sameChannel({ ...base, channels: [] }), null);
});

test("그래프 y 상한", () => {
  assert.equal(yMax([]), 20);
  assert.equal(yMax([3, 4, 5, -1]), 20);
  assert.equal(yMax([10, 20, 30, 60]), 100);
  assert.equal(yMax([5000]), 2000);
});
