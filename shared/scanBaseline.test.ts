// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/scanBaseline.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareScan, diffCsv, diffDetail, diffSummary, diffText, makeBaseline, normMac, parseBaseline, scopeOf, upsertNamed, upsertPlan, freeName } from "./scanBaseline.ts";
import { maskForAi } from "./aiCopy.ts";

const M = (n) => `02:00:5E:10:00:${n.toString(16).padStart(2, "0").toUpperCase()}`;
const h = (ip, mac, ports = [], o = {}) => ({
  ip,
  mac,
  vendor: mac ? "Test" : null,
  name: null,
  ports,
  ...o,
});
const PORTS = [80, 502];

/** 지역 시간 «YYYY-MM-DD HH:MM» — 저장 시각은 이 PC 의 시간대로 보인다 */
const localHm = (t: number) => { const d = new Date(t); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

test("normMac — 구분자·대소문자 무관, 6바이트만", () => {
  assert.equal(normMac("02-00-5e-10-00-0a"), "02:00:5E:10:00:0A");
  assert.equal(normMac("0200.5e10.000a"), "02:00:5E:10:00:0A");
  assert.equal(normMac("02:00"), null);
  assert.equal(normMac(null), null);
});

test("새로 생김·사라짐·같음", () => {
  const base = makeBaseline("line1", "192.168.0.0/24", PORTS, [h("192.168.0.10", M(10), [502]), h("192.168.0.11", M(11))]);
  const d = compareScan(base, {
    hosts: [h("192.168.0.10", M(10), [502]), h("192.168.0.12", M(12))],
    ports: PORTS,
  });
  assert.deepEqual(
    d.rows.map((r) => [r.change, r.ip]),
    [
      ["new", "192.168.0.12"],
      ["gone", "192.168.0.11"],
      ["same", "192.168.0.10"],
    ],
  );
  assert.equal(d.counts.new, 1);
  assert.equal(d.counts.gone, 1);
  assert.equal(d.counts.same, 1);
});

test("MAC 바뀜 — 같은 IP 에 다른 장비(교체 의심)", () => {
  const base = makeBaseline("b", "r", PORTS, [h("192.168.0.20", M(20), [502])]);
  const d = compareScan(base, {
    hosts: [h("192.168.0.20", M(99), [502], { vendor: "Other" })],
    ports: PORTS,
  });
  assert.equal(d.rows.length, 1);
  assert.equal(d.rows[0].change, "macChanged");
  assert.equal(d.rows[0].oldMac, M(20));
  assert.match(diffDetail(d.rows[0], "ko"), /02:00:5E:10:00:14 → 02:00:5E:10:00:63 \(Test → Other\)/);
});

test("IP 바뀜 — 같은 MAC 이 다른 IP(DHCP?)", () => {
  const base = makeBaseline("b", "r", PORTS, [h("192.168.0.30", M(30))]);
  const d = compareScan(base, {
    hosts: [h("192.168.0.31", M(30))],
    ports: PORTS,
  });
  assert.equal(d.rows.length, 1);
  assert.equal(d.rows[0].change, "ipChanged");
  assert.equal(d.rows[0].oldIp, "192.168.0.30");
  assert.equal(diffDetail(d.rows[0], "en"), "192.168.0.30 → 192.168.0.31");
});

test("두 장비가 IP 를 맞바꿈 — 둘 다 IP 바뀜(MAC 바뀜이 아님)", () => {
  const base = makeBaseline("b", "r", PORTS, [h("10.0.0.1", M(1)), h("10.0.0.2", M(2))]);
  const d = compareScan(base, {
    hosts: [h("10.0.0.1", M(2)), h("10.0.0.2", M(1))],
    ports: PORTS,
  });
  assert.deepEqual(
    d.rows.map((r) => r.change),
    ["ipChanged", "ipChanged"],
  );
});

test("열린 포트 바뀜 — 두 번 다 확인한 포트만", () => {
  const base = makeBaseline("b", "r", [80, 502, 102], [h("10.0.0.5", M(5), [80, 102])]);
  // 이번에는 102 를 확인하지 않음 → 102 가 없는 것은 «닫힘» 이 아니다
  const d = compareScan(base, {
    hosts: [h("10.0.0.5", M(5), [502])],
    ports: PORTS,
  });
  assert.equal(d.rows[0].change, "portsChanged");
  assert.deepEqual(d.rows[0].opened, [502]);
  assert.deepEqual(d.rows[0].closed, [80]);
  assert.equal(d.portsCompared, 2);
  assert.equal(diffDetail(d.rows[0], "ko"), "열림 502 · 닫힘 80");
});

test("MAC 을 모르는 쪽(경유·ARP 끔)은 IP 로 같은 장비", () => {
  const base = makeBaseline("b", "r", PORTS, [h("10.1.0.5", M(5))]);
  const d = compareScan(base, { hosts: [h("10.1.0.5", null)], ports: PORTS });
  assert.equal(d.rows[0].change, "same");
  assert.equal(d.rows[0].mac, M(5));
});

test("같은 MAC 이 여러 IP(프록시 ARP) — MAC 으로 짝짓지 않고 IP 로", () => {
  const base = makeBaseline("b", "r", PORTS, [h("10.2.0.1", M(1)), h("10.2.0.2", M(1))]);
  const d = compareScan(base, {
    hosts: [h("10.2.0.2", M(1)), h("10.2.0.3", M(1))],
    ports: PORTS,
  });
  assert.deepEqual(
    d.rows.map((r) => [r.change, r.ip]),
    [
      ["new", "10.2.0.3"],
      ["gone", "10.2.0.1"],
      ["same", "10.2.0.2"],
    ],
  );
});

test("이번 범위 밖의 기준 장비는 사라짐이 아니라 «범위 밖»", () => {
  const base = makeBaseline("b", "192.168.0.0/24", PORTS, [h("192.168.0.10", M(10)), h("192.168.1.10", M(11))]);
  const d = compareScan(base, { hosts: [h("192.168.0.10", M(10))], ports: PORTS }, scopeOf("192.168.0.1", "192.168.0.254"));
  assert.equal(d.counts.gone, 0);
  assert.equal(d.outside, 1);
  assert.match(diffSummary(d, "ko"), /같음 1 · 범위 밖 1/);
});

test("parseBaseline — 저장한 글을 다시 읽고, 모양이 틀리면 null", () => {
  const b = makeBaseline(" 1호기 ", "10.0.0.0/24", [502, 80, 502], [h("10.0.0.9", M(9), [502, 80]), h("10.0.0.2", null)], 1000);
  assert.equal(b.name, "1호기");
  assert.deepEqual(b.ports, [80, 502]);
  assert.deepEqual(
    b.hosts.map((x) => x.ip),
    ["10.0.0.2", "10.0.0.9"],
  );
  const back = parseBaseline("﻿" + JSON.stringify(b));
  assert.deepEqual(back, b);
  assert.equal(parseBaseline("{}"), null);
  assert.equal(parseBaseline("not json"), null);
  assert.equal(parseBaseline({ kind: "portdock-netscan-baseline", hosts: [{ ip: "x" }] }).hosts.length, 0);
});

test("upsertNamed — 같은 이름은 바꾸고 새것이 앞, 최대 개수", () => {
  let l = [];
  l = upsertNamed(l, { name: "A", savedAt: 1 });
  l = upsertNamed(l, { name: "B", savedAt: 2 });
  l = upsertNamed(l, { name: "a", savedAt: 3 });
  assert.deepEqual(
    l.map((x) => x.name),
    ["a", "B"],
  );
  assert.equal(upsertNamed(l, { name: "C", savedAt: 4 }, 2).length, 2);
});

test("upsertPlan — 20개가 차 있어도 불러온 오래된 항목은 남고, 나머지에서 가장 오래된 것을 뺀다", () => {
  const full = Array.from({ length: 20 }, (_, i) => ({ name: `B${i}`, savedAt: 1000 + i }));
  // 다른 PC 에서 받은 작년 기준(저장 시각이 가장 오래됨)
  const old = { name: "작년", savedAt: 1 };
  // 고치기 전: 넣고 나서 시각순으로 자르면 불러온 것이 바로 사라졌다
  assert.equal(upsertNamed(full, old).some((x) => x.name === "작년"), true);
  const p = upsertPlan(full, old);
  assert.equal(p.list.length, 20);
  assert.equal(p.list[0].name, "작년");
  assert.deepEqual(p.dropped.map((x) => x.name), ["B0"], "가장 오래된 B0 을 뺀다");
  assert.equal(p.replaced, null);
  // 같은 이름은 바꾸기만 — 뺄 것 없음
  const r = upsertPlan(full, { name: "b5", savedAt: 5000 });
  assert.equal(r.replaced.name, "B5");
  assert.equal(r.dropped.length, 0);
  assert.equal(r.list.length, 20);
  // 자리가 남으면 뺄 것 없음
  assert.equal(upsertPlan(full.slice(0, 3), old).dropped.length, 0);
});

test("freeName — 겹치면 «이름 (2)»", () => {
  assert.equal(freeName([{ name: "A" }], "B"), "B");
  assert.equal(freeName([{ name: "A" }], "a"), "a (2)");
  assert.equal(freeName([{ name: "A" }, { name: "A (2)" }], "A"), "A (3)");
});

test("CSV·AI 글 — AI 글은 aiCopy 가 MAC 뒤 3바이트를 가린다", () => {
  const base = makeBaseline("b", "r", PORTS, [h("192.168.0.20", M(20))], Date.UTC(2026, 9, 31, 9, 0));
  const d = compareScan(base, {
    hosts: [h("192.168.0.20", M(21))],
    ports: PORTS,
  });
  const csv = diffCsv(d.rows, "ko");
  assert.match(csv, /^change,change_text,ip,old_ip,mac,old_mac/);
  assert.match(csv, /macChanged,MAC 바뀜,192\.168\.0\.20,,02:00:5E:10:00:15,02:00:5E:10:00:14/);
  const text = diffText(base, d, "en");
  assert.ok(text.includes(`Compared with baseline «b» (r, saved ${localHm(Date.UTC(2026, 9, 31, 9, 0))})`), text);
  const masked = maskForAi(text);
  assert.ok(!masked.includes("02:00:5E:10:00:15"));
  assert.match(masked, /02:00:5E:xx:xx:xx/);
});
