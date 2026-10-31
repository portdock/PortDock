// 케이블 선정 도우미·AWG 표·점유율 — 계산값, 기준값, 링크가 실제 있는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { USES, ethernetCheck, powerSize, rs232Check, rs485Check, useById } from "./cableSelect.ts";
import { awgLabel, gaugeRow, gaugeTable, metricRows, mm2ToAwg, nearestIec, parseAwg } from "./wireGauge.ts";
import { DUCT_LIMIT, conduitFill, ductFill, maxSameDuct, maxSameWires, minConduitInner, necConduitLimit, wiresArea } from "./conduitFill.ts";
import { voltageDrop } from "./wire.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("용도: id 가 겹치지 않고 한·영 문구가 모두 있다, 금지어 없음", () => {
  const ids = USES.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  const BANNED = /검증|최적화|고쳐 줍니다|원인 확정|정상/;
  for (const u of USES) {
    assert.ok(useById(u.id) === u);
    for (const l of [u.name, ...u.cable, ...u.check, ...u.src]) {
      assert.ok(l.ko.trim() && l.en.trim(), u.id);
      assert.ok(!BANNED.test(l.ko), `${u.id}: ${l.ko}`);
    }
    assert.ok(u.cable.length > 0 && u.src.length > 0, u.id);
  }
});

test("링크는 실제 가이드 slug·웹 도구 경로만", () => {
  const guides = new Set([...readFileSync(new URL("../data/guides.ts", import.meta.url), "utf8").matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => `guides/${m[1]}/`));
  const tools = new Set([...readFileSync(new URL("../data/webTools.ts", import.meta.url), "utf8").matchAll(/path: "(tools\/[^"]+)"/g)].map((m) => m[1]));
  assert.ok(guides.size > 30 && tools.size > 30);
  for (const u of USES) for (const l of u.links) assert.ok(guides.has(l) || tools.has(l), `${u.id}: ${l}`);
});

test("전원 굵기: 24 V·2 A·50 m·5 % → 최소 약 2.87 mm² → 4 mm², 강하는 wire.ts 와 같다", () => {
  const r = powerSize({ system: "dc", volts: 24, amps: 2, lengthM: 50, pct: 5, material: "cu", tempC: 20 });
  near(r.need, (2 * 2 * 50) / 58 / 1.2, 1e-9);
  assert.equal(r.iec, 4);
  assert.equal(r.awg, 12); // 12 AWG ≈ 3.31 mm²
  assert.equal(r.awgLabel, "12 AWG");
  const d = voltageDrop({ system: "dc", volts: 24, amps: 2, lengthM: 50, areaMm2: 4, material: "cu", tempC: 20 });
  near(r.dropAtIec!.drop, d.drop);
  assert.ok(r.dropAtIec!.pct <= 5);
  // 3상 400 V·100 A·300 m·0.5 % → IEC 계열(300 mm²)보다 큼
  const big = powerSize({ system: "3ph", volts: 400, amps: 100, lengthM: 300, pct: 0.5, material: "cu", tempC: 20 });
  assert.ok(big.need > 300);
  assert.equal(big.iec, undefined);
  assert.throws(() => powerSize({ system: "dc", volts: 24, amps: NaN, lengthM: 1, pct: 5, material: "cu", tempC: 20 }));
});

test("RS-485: 9600 bps 는 1200 m, 115200 bps 는 약 868 m, 1200 m 넘으면 fault", () => {
  assert.equal(rs485Check(9600, 500).max, 1200);
  assert.equal(rs485Check(9600, 500).notes[0].level, "ok");
  near(rs485Check(115200, 100).max, 1e8 / 115200);
  assert.equal(rs485Check(115200, 900).notes[0].level, "warn");
  assert.equal(rs485Check(9600, 1300).notes[0].level, "fault");
  assert.ok(rs485Check(9600, 1100).notes.some((n) => n.level === "warn"));
});

test("RS-232: 100 pF/m 이면 25 m 까지 2500 pF, 15 m 넘으면 warn", () => {
  const a = rs232Check(10, 100);
  assert.equal(a.max, 25);
  assert.equal(a.cap, 1000);
  assert.equal(a.notes[0].level, "ok");
  assert.equal(rs232Check(20, 100).notes[0].level, "warn");
  assert.equal(rs232Check(30, 100).notes[0].level, "fault");
});

test("이더넷: 10G 는 Cat6A, 100 m 넘으면 fault, 90~100 m 는 warn", () => {
  assert.equal(ethernetCheck("10G", 50).cat, "Cat6A");
  assert.equal(ethernetCheck("1G", 50).cat, "Cat5e");
  assert.equal(ethernetCheck("1G", 95).notes[0].level, "warn");
  assert.equal(ethernetCheck("100M", 101).notes[0].level, "fault");
});

test("AWG 읽기·이름: 4/0 = 0000 = −3, 1/0 = 0, #18 = 18", () => {
  assert.equal(parseAwg("4/0"), -3);
  assert.equal(parseAwg("0000"), -3);
  assert.equal(parseAwg("00"), -1);
  assert.equal(parseAwg("1/0"), 0);
  assert.equal(parseAwg("0"), 0);
  assert.equal(parseAwg("#18"), 18);
  assert.equal(parseAwg("18 AWG"), 18);
  assert.equal(parseAwg("abc"), undefined);
  assert.equal(parseAwg("99"), undefined);
  assert.equal(awgLabel(-3), "4/0 (0000) AWG");
  assert.equal(awgLabel(0), "1/0 (0) AWG");
  assert.equal(awgLabel(14), "14 AWG");
});

test("AWG 표: 0000 ~ 40, 14 AWG ≈ 2.08 mm²·8.28 Ω/km, 가까운 IEC 2.5 mm²", () => {
  const rows = gaugeTable();
  assert.equal(rows[0].n, -3);
  assert.equal(rows.at(-1)!.n, 40);
  const r = gaugeRow(14);
  near(r.d, 1.628, 1e-3);
  near(r.area, 2.081, 1e-3);
  near(r.ohmKm, 1000 / 58 / r.area, 1e-9);
  near(r.ohmKm, 8.28, 0.01);
  assert.equal(r.near, 2.5); // 2.08 은 1.5 보다 2.5 에 비율로 가깝다
  near(gaugeRow(0).area, 53.475, 0.001);
  assert.equal(nearestIec(0.82), 0.75);
  assert.equal(nearestIec(1000), 300);
});

test("mm² → AWG: 1.5 mm² 는 가장 가까운 15 AWG(1.65 mm²), 같거나 굵은 것도 15 AWG; 2.5 → 13·13", () => {
  const a = mm2ToAwg(1.5);
  assert.equal(a.nearest, 15);
  assert.equal(a.atLeast, 15);
  const b = mm2ToAwg(2.5);
  assert.equal(b.nearest, 13);
  assert.equal(b.atLeast, 13);
  near(mm2ToAwg(gaugeRow(18).area).exact, 18, 1e-9);
  assert.equal(metricRows([1]).length, 1);
  near(metricRows([1])[0].ohmKm, 1000 / 58, 1e-9);
});

test("NEC Chapter 9 Table 1: 1 → 53 %, 2 → 31 %, 3 이상 → 40 %; 덕트 20·50 %", () => {
  assert.equal(necConduitLimit(0), undefined);
  assert.equal(necConduitLimit(1), 53);
  assert.equal(necConduitLimit(2), 31);
  assert.equal(necConduitLimit(3), 40);
  assert.equal(necConduitLimit(30), 40);
  assert.deepEqual(DUCT_LIMIT, { wireway: 20, panel: 50 });
});

test("전선관: 외경 3 mm × 10 가닥, 안지름 16 mm → 약 35.2 % (40 % 안), 최소 안지름·최대 가닥", () => {
  const g = [{ od: 3, count: 10 }];
  const r = conduitFill(g, 16);
  near(r.pct, (10 * 9) / 256 * 100, 1e-9);
  assert.equal(r.limit, 40);
  assert.equal(r.over, false);
  const d = minConduitInner(g)!;
  near(conduitFill(g, d).pct, 40, 1e-9);
  // 같은 외경: 16 mm 관에 3 mm 선은 (256/9) × 0.4 = 11.37 → 11 가닥
  assert.equal(maxSameWires(3, 16), 11);
  // 한 가닥만 53 %: 외경 10 mm 선, 안지름 14 mm → 51 % 한 가닥 OK, 두 가닥은 102 %
  assert.equal(maxSameWires(10, 14), 1);
  // 섞인 굵기
  near(wiresArea([{ od: 2, count: 2 }, { od: 4, count: 1 }]), Math.PI * 2 + Math.PI * 4, 1e-9);
  assert.throws(() => conduitFill([{ od: 0, count: 1 }], 10));
  assert.throws(() => conduitFill([{ od: 3, count: 1.5 }], 10));
});

test("덕트: 40 × 60 mm, 외경 3 mm × 100 가닥 → 약 29.5 %, 50 % 면 169 가닥까지", () => {
  const r = ductFill([{ od: 3, count: 100 }], 40, 60, "panel");
  near(r.pct, (100 * Math.PI * 2.25) / 2400 * 100, 1e-9);
  assert.equal(r.over, false);
  assert.equal(ductFill([{ od: 3, count: 100 }], 40, 60, "wireway").over, true);
  assert.equal(maxSameDuct(3, 40, 60, "panel"), Math.floor(1200 / (Math.PI * 2.25)));
});

test("mm² → AWG: 표 범위 밖(300 mm²)은 가장 가까운 AWG 없음", () => {
  assert.equal(mm2ToAwg(300).nearest, undefined);
  assert.equal(mm2ToAwg(300).atLeast, undefined);
  assert.equal(mm2ToAwg(100).nearest, -3);
});
