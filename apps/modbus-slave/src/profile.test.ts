// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/modbus-slave/src/profile.test.ts
// 장비 프로필로 흉내(0.10.0) — 제한 칸·짐작한 값·칸 잇기 규칙·백엔드 모양·저장값 되살리기
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  accessAt,
  cleanProfiles,
  guardCells,
  guardSpec,
  linkCheck,
  linkSpec,
  linkSummary,
  makeProfile,
  maskBits,
  newLink,
  planProfile,
  toRaw,
} from "./profile.ts";
import { simCheck, simSummary, simToSpec } from "./regmap.ts";

const t = (ko, en = ko) => ({ ko, en });
const reg = (o) => ({ table: "holding-registers", address: 0, manualAddress: "0", type: "u16", name: t("값", "Value"), access: "r", fc: [3], ...o });
const dev = (kind, registers) => ({ schemaVersion: 1, id: "maker/m1", manufacturer: t("메이커", "Maker"), model: "M1", kind, title: t("시험"), protocols: ["rtu"], comm: { addressing: "zero" }, registers, sources: [] });

const INV = dev("inverter", [
  reg({ address: 4, name: t("주파수 지령", "Frequency command"), access: "rw", unit: "Hz", scale: 0.01, fc: [3, 6] }),
  reg({
    address: 5,
    name: t("운전 지령", "Operation command"),
    access: "rw",
    fc: [3, 6],
    bits: [
      { bit: 0, ko: "정지", en: "Stop (S)" },
      { bit: 1, ko: "정방향", en: "Forward run (F)" },
      { bit: 2, ko: "역방향", en: "Reverse run (R)" },
      { bit: 3, ko: "리셋", en: "Trip reset" },
    ],
  }),
  reg({ address: 8, name: t("출력 전류", "Output current"), unit: "A", scale: 0.1 }),
  reg({ address: 9, name: t("출력 주파수", "Output frequency"), unit: "Hz", scale: 0.01 }),
  reg({ address: 10, name: t("출력 전압", "Output voltage"), unit: "V" }),
  reg({ address: 11, name: t("DC 링크 전압", "DC link voltage"), unit: "V" }),
  reg({ address: 12, name: t("출력 전력", "Output power"), unit: "kW", scale: 0.1 }),
  reg({ address: 20, type: "u32", name: t("전력량", "Energy"), unit: "kWh", scale: 0.1 }),
  reg({ address: 30, name: t("리셋", "Reset"), access: "w", fc: [6] }),
]);

test("제한 칸 — 주소·칸 수·읽기/쓰기, 백엔드 모양, 끄면 null", () => {
  const cells = guardCells(INV);
  assert.deepEqual(cells.find((c) => c.addr === 20), { table: "holding-registers", addr: 20, count: 2, access: "r" });
  assert.equal(cells.find((c) => c.addr === 30).access, "w");
  const p = makeProfile(INV, "Maker M1", []);
  assert.deepEqual(guardSpec(p), { cells, access: true, denyException: 2, unmapped: false }, "맵에 없는 주소 → 예외 02 는 기본 끔(0.9 처럼 빈 번지는 0)");
  assert.equal(guardSpec({ ...p, guard: { ...p.guard, unmapped: true } }).unmapped, true);
  assert.equal(guardSpec({ ...p, guard: { access: false, unmapped: false, code: 2 } }), null);
  assert.equal(guardSpec({ ...p, guard: { access: true, unmapped: false, code: 3 } }).denyException, 3);
  assert.equal(guardSpec(undefined), null);
  assert.equal(accessAt(p, "holding-registers", 21), "r");
  assert.equal(accessAt(p, "holding-registers", 22), undefined);
});

test("인버터 짐작 — 운전 지령(정·역방향 비트) → 출력 주파수 가감속, 비례·누적, 설정 주파수 30 Hz", () => {
  const plan = planProfile(INV);
  const roles = Object.fromEntries(plan.roles.map((r) => [r.role, r.reg.address]));
  assert.equal(roles.run, 5);
  assert.equal(roles.freqSet, 4);
  assert.equal(roles.outFreq, 9);
  const ap = plan.links.find((l) => l.kind === "approach");
  assert.deepEqual(ap.out, { table: "holding-registers", addr: 9 });
  assert.deepEqual(ap.src, { table: "holding-registers", addr: 4 });
  assert.deepEqual(ap.run, { table: "holding-registers", addr: 5 });
  assert.equal(ap.runMask, 0b110); // 정지·리셋 비트는 빼고
  assert.deepEqual(maskBits(ap.runMask), [1, 2]);
  assert.equal(ap.gain, 1);
  assert.equal(ap.rate, 600); // 초당 6 Hz = 600 × 0.01 Hz
  assert.deepEqual(plan.values.find((v) => v.addr === 4), { table: "holding-registers", addr: 4, value: 3000 });
  // 출력 전류: 60 Hz(6000) 일 때 5 A(50 × 0.1 A)
  const cur = plan.links.find((l) => l.out.addr === 8);
  assert.equal(cur.kind, "scale");
  assert.ok(Math.abs(cur.gain * 6000 - 50) < 1e-9);
  assert.ok(plan.links.find((l) => l.out.addr === 10)); // 출력 전압
  assert.ok(!plan.links.find((l) => l.out.addr === 11)); // DC 링크는 비례가 아니라 잡음
  assert.equal(plan.sims.find((s) => s.sim.addr === 11).sim.kind, "noise");
  // 전력량(0.1 kWh) += 출력 전력(0.1 kW) × gain/초 — 1.5 kW 한 시간이면 1.5 kWh = 15
  const e = plan.links.find((l) => l.out.addr === 20);
  assert.equal(e.kind, "integrate");
  assert.deepEqual(e.src, { table: "holding-registers", addr: 12 });
  assert.ok(Math.abs(e.gain * 15 * 3600 - 15) < 1e-9);
  // 규칙 결과 칸에는 값 만들기를 걸지 않는다
  const outs = new Set(plan.links.map((l) => l.out.addr));
  assert.ok(plan.sims.every((s) => !outs.has(s.sim.addr)));
});

test("전력 미터 짐작 — 전압·전류·전력·역률 잡음, 전력량은 전력 누적(내보낸 전력량은 그대로)", () => {
  const PM = dev("power-meter", [
    reg({ table: "input-registers", address: 0, type: "f32", name: t("전압 A-N", "Voltage A-N"), unit: "V", fc: [4] }),
    reg({ table: "input-registers", address: 2, type: "f32", name: t("전압 A-B", "Voltage A-B"), unit: "V", fc: [4] }),
    reg({ table: "input-registers", address: 4, type: "f32", name: t("A상 전류", "Phase A current"), unit: "A", fc: [4] }),
    reg({ table: "input-registers", address: 6, type: "f32", name: t("유효 전력 합", "Total active power"), unit: "W", fc: [4] }),
    reg({ table: "input-registers", address: 8, type: "f32", name: t("역률", "Power factor"), fc: [4] }),
    reg({ table: "input-registers", address: 10, type: "f32", name: t("유효 전력량", "Import active energy"), unit: "kWh", fc: [4] }),
    reg({ table: "input-registers", address: 12, type: "f32", name: t("내보낸 전력량", "Export active energy"), unit: "kWh", fc: [4] }),
    reg({ table: "input-registers", address: 14, type: "f32", name: t("주파수", "Frequency"), unit: "Hz", fc: [4] }),
    reg({ address: 100, name: t("전압 0.1", "Phase voltage V1"), unit: "V", scale: 0.1 }),
  ]);
  const plan = planProfile(PM);
  const v = (a, tb = "input-registers") => plan.values.find((x) => x.addr === a && x.table === tb)?.value;
  assert.equal(v(0), 220);
  assert.equal(v(2), 380);
  assert.equal(v(4), 10);
  assert.equal(v(6), 6000);
  assert.equal(v(8), 0.95);
  assert.equal(v(14), 60);
  assert.equal(v(100, "holding-registers"), 2200); // 0.1 V 단위
  assert.equal(v(12), undefined);
  const s0 = plan.sims.find((s) => s.table === "input-registers" && s.sim.addr === 0).sim;
  assert.equal(s0.kind, "noise");
  assert.ok(s0.min < 220 && s0.max > 220 && s0.step > 0);
  assert.equal(simCheck(s0, "ko"), null);
  const e = plan.links.find((l) => l.out.addr === 10);
  assert.equal(e.kind, "integrate");
  assert.deepEqual(e.src, { table: "input-registers", addr: 6 });
  // W → kWh: 6000 W 한 시간 = 6 kWh
  assert.ok(Math.abs(e.gain * 6000 * 3600 - 6) < 1e-9);
  assert.ok(v(10) > 0);
  assert.ok(!plan.links.some((l) => l.out.addr === 12));
});

test("온도 조절기 짐작 — 채널마다 PV 가 SV 를 따라가고, SV 읽기 칸은 그대로 복사", () => {
  const TC = dev("temperature-controller", [
    reg({ address: 0, type: "s16", name: t("CH1 설정값", "CH1 set value (SV)"), access: "rw", fc: [3, 6] }),
    reg({ address: 1000, type: "s16", name: t("CH2 설정값", "CH2 set value (SV)"), access: "rw", fc: [3, 6] }),
    reg({ address: 160, type: "s16", name: t("SV 하한", "SV low limit (L-SV)"), access: "rw", fc: [3, 6] }),
    reg({ table: "input-registers", address: 1000, type: "s16", name: t("CH1 현재값", "CH1 present value (PV)"), fc: [4] }),
    reg({ table: "input-registers", address: 1003, type: "s16", name: t("CH1 SV 읽기", "CH1 set value SV (read)"), fc: [4] }),
    reg({ table: "input-registers", address: 1006, type: "s16", name: t("CH2 현재값", "CH2 present value (PV)"), fc: [4] }),
  ]);
  const plan = planProfile(TC);
  const ap = plan.links.filter((l) => l.kind === "approach");
  assert.equal(ap.length, 2);
  assert.deepEqual(ap.map((l) => [l.out.addr, l.src.addr]), [
    [1000, 0],
    [1006, 1000],
  ]);
  assert.ok(plan.links.some((l) => l.kind === "scale" && l.out.addr === 1003 && l.src.addr === 0));
});

test("다른 종류·역할 못 찾음 — 빈 계획(칸 잇기 규칙 창에서 직접)", () => {
  assert.deepEqual(planProfile(dev("panel-meter", [reg({})])), { values: [], sims: [], links: [], roles: [] });
  const noOut = planProfile(dev("inverter", [reg({ address: 5, name: t("운전 지령", "Operation command"), access: "rw" })]));
  assert.equal(noOut.links.length, 0);
  assert.equal(noOut.roles[0].role, "run");
});

test("실제 장비 데이터 — 모든 인버터·전력 미터·온도 조절기에서 규칙이 백엔드 모양으로 바뀌고 검사를 통과", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "data", "devices");
  let n = 0;
  for (const m of fs.readdirSync(root, { withFileTypes: true })) {
    if (!m.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, m.name))) {
      const d = JSON.parse(fs.readFileSync(path.join(root, m.name, f), "utf8"));
      const plan = planProfile(d);
      const pointAt = (c) => {
        const r = d.registers.find((x) => x.table === c.table && x.address === c.addr);
        return r && { addr: r.address, type: r.type, order: r.order ?? d.comm.order ?? "ABCD", name: "" };
      };
      for (const l of plan.links) {
        assert.equal(linkCheck(l, "ko"), null, `${d.id} ${JSON.stringify(l)}`);
        assert.ok(linkSpec(l, pointAt), `${d.id} ${l.out.addr}`);
        n++;
      }
      for (const s of plan.sims) assert.equal(simCheck(s.sim, "en"), null, `${d.id} ${s.sim.addr}`);
      // 장비 맵 안의 칸만
      for (const x of [...plan.values, ...plan.links.map((l) => ({ table: l.out.table, addr: l.out.addr }))]) assert.ok(d.registers.some((r) => r.table === x.table && r.address === x.addr), `${d.id} ${x.addr}`);
      if (d.kind === "inverter" && plan.roles.some((r) => r.role === "freqSet")) assert.ok(plan.links.some((l) => l.kind === "approach"), d.id);
    }
  }
  assert.ok(n > 50, `규칙 ${n}개`);
});

test("백엔드 모양 — 칸 형식은 그 자리 점에서, 비트 표는 bit, 문자열 칸이면 null", () => {
  const points = { "holding-registers:9": { addr: 9, type: "f32", order: "CDAB", name: "" }, "holding-registers:7": { addr: 7, type: "string", order: "ABCD", name: "", len: 4 } };
  const at = (c) => points[`${c.table}:${c.addr}`];
  const l = { ...newLink({ table: "holding-registers", addr: 9 }), src: { table: "holding-registers", addr: 4 }, run: { table: "coils", addr: 0 }, rate: 6 };
  assert.deepEqual(linkSpec(l, at), {
    out: { table: "holding-registers", addr: 9, valueType: "f32", order: "CDAB" },
    rule: { kind: "approach", src: { table: "holding-registers", addr: 4, valueType: "u16", order: "ABCD" }, run: { table: "coils", addr: 0, valueType: "bit", order: "ABCD" }, runMask: 0, gain: 1, rate: 6 },
  });
  assert.equal(linkSpec({ ...l, out: { table: "holding-registers", addr: 7 } }, at), null);
  assert.equal(linkSpec({ ...l, kind: "scale", src: null }, at), null);
  assert.deepEqual(linkSpec({ ...l, kind: "integrate", src: null, gain: 0.5 }, at).rule, { kind: "integrate", src: null, gain: 0.5 });
});

test("규칙 검사·설명(한·영)", () => {
  const base = { ...newLink({ table: "holding-registers", addr: 9 }), src: { table: "holding-registers", addr: 4 } };
  assert.equal(linkCheck(base, "ko"), null);
  assert.match(linkCheck({ ...base, src: null }, "ko"), /원본/);
  assert.match(linkCheck({ ...base, src: base.out }, "en"), /same/);
  assert.match(linkCheck({ ...base, rate: 0 }, "en"), /Rate/);
  assert.match(linkCheck({ ...base, gain: NaN }, "ko"), /숫자/);
  assert.match(linkCheck({ ...base, runMask: -1 }, "en"), /mask/);
  assert.equal(linkCheck({ ...base, kind: "integrate", src: null }, "ko"), null);
  const label = (c) => `${c.table === "coils" ? "C" : "HR"}${c.addr}`;
  assert.equal(linkSummary({ ...base, run: { table: "coils", addr: 0 }, runMask: 6, rate: 600 }, label, "ko"), "HR9 → HR4 × 1 로 600/초 («C0 비트 1·2» 가 운전일 때, 아니면 0 으로)");
  assert.equal(linkSummary({ ...base, kind: "scale", gain: 0.5, offset: 1 }, label, "en"), "HR9 = HR4 × 0.5 + 1");
  assert.equal(linkSummary({ ...base, kind: "integrate", src: null, gain: 0.25 }, label, "en"), "HR9 += 0.25/s");
});

test("toRaw — 배율·범위·형식", () => {
  assert.equal(toRaw(reg({ scale: 0.01 }), 30), 3000);
  assert.equal(toRaw(reg({ type: "s16" }), -40000), -32768);
  assert.equal(toRaw(reg({ range: { min: 45, max: 65 } }), 10), 45);
  assert.equal(toRaw(reg({ type: "f32", scale: 0.1 }), 1.25), 12.5);
});

test("잡음 값 만들기 — 백엔드 모양·설명·검사", () => {
  const s = { addr: 3, kind: "noise", step: 2, min: 2190, max: 2210, wrap: true, amp: 0, offset: 0, waveMs: 1000, periodMs: 1000 };
  assert.deepEqual(simToSpec(s, undefined, false).sim, { kind: "noise", step: 2, min: 2190, max: 2210 });
  assert.equal(simCheck(s, "ko"), null);
  assert.ok(simCheck({ ...s, step: 0 }, "ko"));
  assert.ok(simCheck({ ...s, min: 3000 }, "en"));
  assert.match(simSummary(s, "ko"), /잡음/);
});

test("저장값 되살리기 — 틀린 것은 빼고 기본값으로", () => {
  const good = makeProfile(INV, "Maker M1", [{ ...newLink({ table: "holding-registers", addr: 9 }), src: { table: "holding-registers", addr: 4 } }]);
  const back = cleanProfiles({ 1: good, 2: { device: 5 }, 300: good, x: good, 3: { device: "a/b", cells: [{ table: "coils", addr: -1, count: 1, access: "r" }], links: [{ kind: "zzz" }], guard: { code: 9, access: false } } });
  assert.deepEqual(Object.keys(back).sort(), ["1", "3"]);
  assert.deepEqual(back[1], good);
  assert.deepEqual(back[3], { device: "a/b", name: "a/b", cells: [], guard: { access: false, unmapped: false, code: 2 }, links: [] });
  assert.deepEqual(cleanProfiles(null), {});
  assert.deepEqual(cleanProfiles([1]), {});
});
