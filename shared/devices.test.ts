// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/devices.test.ts (장비 프로필 → Master 폴링 표·Slave 칸)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { commLine, devRegs, exampleRaw, matchDevice, pointName, pollGroups, readFc, serialDefaults, slaveRows, tableSpans, type Device, type DevRegister } from "./devices.ts";
import { encodeValue, decodeValue } from "../apps/modbus-slave/src/regmap.ts";

const t = (ko: string, en = ko) => ({ ko, en });
const reg = (o: Partial<DevRegister>): DevRegister => ({ table: "holding-registers", address: 0, manualAddress: "0", type: "u16", name: t("값", "Value"), access: "r", fc: [3], ...o });
const dev = (registers: DevRegister[], comm: Partial<Device["comm"]> = {}): Device => ({
  schemaVersion: 1,
  id: "maker/m1",
  manufacturer: t("메이커", "Maker"),
  model: "M1",
  kind: "inverter",
  title: t("시험", "Test"),
  protocols: ["rtu"],
  comm: { addressing: "zero", ...comm },
  registers,
  sources: [{ title: "x", url: "https://example.com", checked: "2026-10-19" }],
});

test("이름에 배율·단위", () => {
  assert.equal(pointName(reg({ name: t("출력 주파수", "Output frequency"), unit: "Hz", scale: 0.01 }), "ko"), "출력 주파수 (×0.01 Hz)");
  assert.equal(pointName(reg({ name: t("전류", "Current"), unit: "A" }), "en"), "Current (A)");
  assert.equal(pointName(reg({ name: t("상태", "Status") }), "ko"), "상태");
});

test("폴링 표 — 함수별·이어진 칸만, 빈 주소 묶기, 쓰기 전용 제외", () => {
  const d = dev([
    reg({ address: 5 }),
    reg({ address: 0 }),
    reg({ address: 1, type: "u32", order: "CDAB" }),
    reg({ address: 3 }),
    reg({ address: 10 }),
    reg({ address: 20, access: "w", fc: [6] }),
    reg({ table: "input-registers", address: 0, fc: [4] }),
    reg({ table: "coils", address: 7, type: "bit", fc: [1, 5], access: "rw" }),
  ]);
  const g = pollGroups(d, "ko");
  assert.deepEqual(
    g.map((x) => [x.fc, x.start, x.qty, x.count]),
    [
      [1, 7, 1, 1],
      [3, 0, 4, 3],
      [3, 5, 1, 1],
      [3, 10, 1, 1],
      [4, 0, 1, 1],
    ],
  );
  assert.equal(g[1].points[1].type, "u32");
  assert.equal(g[1].points[1].order, "CDAB");
  assert.equal(g[0].points[0].type, "bit");
  assert.equal(g[1].name, "M1 HR 0");
  const joined = pollGroups(d, "ko", 8).filter((x) => x.fc === 3);
  assert.deepEqual(
    joined.map((x) => [x.start, x.qty]),
    [[0, 11]],
  );
  // 125 칸을 넘지 않는다
  const wide = pollGroups(dev([reg({ address: 0 }), reg({ address: 124 }), reg({ address: 125 })]), "ko", 200);
  assert.deepEqual(
    wide.map((x) => [x.start, x.qty]),
    [
      [0, 125],
      [125, 1],
    ],
  );
  // 보유 레지스터를 04 로만 읽는 장비
  assert.equal(readFc(reg({ fc: [4] })), 4);
  assert.equal(readFc(reg({ access: "w", fc: [6] })), null);
});

test("Slave 줄 — 예시 값이 형식에 맞게 들어간다", () => {
  const d = dev(
    [
      reg({ address: 0, values: [{ value: 3, ko: "a", en: "a" }] }),
      reg({ address: 1, range: { min: 0.5, max: 400 }, scale: 0.01, unit: "Hz" }),
      reg({ address: 2, type: "f32" }),
      reg({ address: 4, type: "string", len: 4 }),
      reg({ address: 6, type: "s16", range: { min: -100, max: -10 } }),
    ],
    { order: "CDAB" },
  );
  const rows = slaveRows(d, "en");
  assert.equal(rows[0].value, 3);
  assert.equal(rows[1].value, 50);
  assert.equal(rows[1].name, "Value (×0.01 Hz)");
  assert.equal(rows[2].order, "CDAB");
  assert.equal(rows[3].value, "M1");
  assert.equal(exampleRaw(d.registers[4], d), -10);
  for (const r of rows) {
    const regs = encodeValue(r.value, r.type, r.order, r.len);
    assert.equal(regs.length, devRegs(r));
    assert.equal(decodeValue(regs, r.type, r.order, r.len), r.value);
  }
  const sp = tableSpans(d).get("holding-registers");
  assert.deepEqual(sp, { start: 0, end: 7 });
});

test("통신 기본값·찾기", () => {
  const d = dev([reg({})], { baud: 9600, dataBits: 8, parity: "even", stopBits: 1, unit: 1 });
  assert.deepEqual(serialDefaults(d), { baud: 9600, dataBits: 8, parity: "even", stopBits: 1 });
  assert.deepEqual(serialDefaults(dev([reg({})])), {});
  assert.match(commLine(d, "ko"), /9600 8E1 · 국번 1/);
  assert.ok(matchDevice(d, "maker m1"));
  assert.ok(matchDevice(d, "인버터"));
  assert.ok(!matchDevice(d, "meter"));
});

test("내장 장비 모두 — 표·Slave 줄로 바뀐다", () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "devices");
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).flatMap((e) => fs.readdirSync(path.join(dir, e.name)).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, e.name, f)));
  assert.ok(files.length > 0);
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as Device;
    for (const lang of ["ko", "en"] as const) {
      const g = pollGroups(d, lang);
      assert.ok(g.length > 0, d.id);
      for (const x of g) {
        assert.ok(x.qty >= 1 && x.qty <= (x.fc <= 2 ? 2000 : 125), d.id);
        assert.ok(x.start + x.qty <= 65536, d.id);
        assert.ok(x.name.length <= 40, d.id);
        for (const p of x.points) assert.ok(p.name.length <= 80, d.id);
      }
      for (const r of slaveRows(d, lang)) assert.equal(encodeValue(r.value, r.type, r.order, r.len).length, devRegs(r), `${d.id} ${r.address}`);
    }
  }
});

test("통신 한 줄 — 모르는 값은 비운다", () => {
  const d = dev([reg({})], { baud: 9600, parity: "even", stopBits: 1 });
  assert.match(commLine(d, "ko"), /^9600 짝수 패리티 정지 1 · /);
  assert.doesNotMatch(commLine(d, "en"), /\?/);
});
