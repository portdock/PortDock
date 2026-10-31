// 멀티미터 측정값 점검기 — 경계값 판정
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expectedOhm, groundDiff, ITEMS, LEVEL_NAME, RC_TERM, loopCurrent, loopPercent, parseReading, rs232TxIdle, rs485CommonMode, rs485Idle, rs485Ohm, sensorOutput, supplyUnderLoad, verdictText } from "./meterCheck.ts";
import { probeSvg } from "./meterFig.ts";

const lv = (v: { level: string }) => v.level;
const bus = { nodes: 2, rTerm: 120, rBias: 0 };

test("읽기: OL·k·M·쉼표·유니코드 빼기·Ω", () => {
  assert.equal(parseReading("OL"), Infinity);
  assert.equal(parseReading("O.L"), Infinity);
  assert.equal(parseReading("1.2k"), 1200);
  assert.equal(parseReading("2M"), 2e6);
  assert.equal(parseReading("60 Ω"), 60);
  assert.equal(parseReading("0,25"), 0.25);
  assert.equal(parseReading("−7.5"), -7.5);
  assert.ok(Number.isNaN(parseReading("")));
  assert.ok(Number.isNaN(parseReading("abc")));
});

test("RS-485 저항: 예상값(종단 ∥ 단위 부하 ∥ 바이어스)", () => {
  // 장비 2대(6 kΩ) ∥ 60 Ω
  assert.ok(Math.abs(expectedOhm(2, bus) - 1 / (1 / 60 + 2 / 12000)) < 1e-9);
  assert.equal(expectedOhm(0, { nodes: 0, rTerm: 120, rBias: 0 }), Infinity);
  // 바이어스 560 Ω 둘 → 1120 Ω 가 나란히
  assert.ok(Math.abs(expectedOhm(2, { ...bus, rBias: 560 }) - 1 / (1 / 60 + 2 / 12000 + 1 / 1120)) < 1e-9);
});

test("RS-485 저항: 60 Ω 문제 없음, 120 Ω 한쪽만, 수 kΩ·OL 종단 없음, 40 Ω 과다, 0 Ω 단락", () => {
  assert.equal(lv(rs485Ohm({ ohm: 60, ...bus })), "ok");
  assert.equal(lv(rs485Ohm({ ohm: 58, ...bus, rBias: 560 })), "ok");
  assert.equal(lv(rs485Ohm({ ohm: 75, nodes: 2, rTerm: 150, rBias: 0 })), "ok");
  assert.equal(lv(rs485Ohm({ ohm: 120, ...bus })), "warn");
  assert.match(rs485Ohm({ ohm: 120, ...bus }).msg.ko, /한 곳에만/);
  assert.equal(lv(rs485Ohm({ ohm: 5000, ...bus })), "warn");
  assert.match(rs485Ohm({ ohm: Infinity, ...bus }).msg.ko, /종단이 없는/);
  assert.equal(lv(rs485Ohm({ ohm: 40, ...bus })), "fault");
  assert.equal(lv(rs485Ohm({ ohm: 30, ...bus })), "fault");
  assert.match(rs485Ohm({ ohm: 1, ...bus }).msg.ko, /단락/);
  assert.equal(lv(rs485Ohm({ ohm: NaN, ...bus })), "warn");
});

test("RS-485 저항: RC 종단(1 nF + 120 Ω)은 직류로 안 보임 — 종단 없음 값이면 문제 없음, 저항 종단이 보이면 볼 것", () => {
  const rc = { nodes: 3, rTerm: RC_TERM, rBias: 0 };
  assert.equal(lv(rs485Ohm({ ohm: 4000, ...rc })), "ok");
  assert.equal(lv(rs485Ohm({ ohm: Infinity, ...rc })), "ok");
  assert.match(rs485Ohm({ ohm: 4000, ...rc }).more.map((m) => m.ko).join(" "), /직류/);
  assert.equal(lv(rs485Ohm({ ohm: 117, ...rc })), "warn");
  assert.match(rs485Ohm({ ohm: 117, ...rc }).msg.en, /resistor termination/);
  assert.equal(lv(rs485Ohm({ ohm: 1, ...rc })), "fault");
  // 저항 종단으로 고르고 «종단 없음» 이 나오면 RC 일 수 있다는 안내
  assert.ok(rs485Ohm({ ohm: 5000, ...bus }).more.some((m) => /RC/.test(m.ko) && /DC/.test(m.en)));
});

test("RS-485 쉬는 전압: +200 mV 이상 / ±200 mV 안 / −200 mV 이하", () => {
  assert.equal(lv(rs485Idle(0.2)), "ok");
  assert.equal(lv(rs485Idle(0.35)), "ok");
  assert.equal(lv(rs485Idle(0.19)), "warn");
  assert.equal(lv(rs485Idle(0)), "warn");
  assert.equal(lv(rs485Idle(-0.19)), "warn");
  assert.equal(lv(rs485Idle(-0.2)), "fault");
  assert.equal(rs485Idle(0.35).values![0].v, "350 mV");
});

test("RS-485 공통 모드: −7~+12 V", () => {
  assert.equal(lv(rs485CommonMode(2.3, 2.7)), "ok");
  assert.equal(lv(rs485CommonMode(-7, 12)), "warn");
  assert.equal(lv(rs485CommonMode(-7.1, 2)), "fault");
  assert.equal(lv(rs485CommonMode(NaN, 12.5)), "fault");
  assert.equal(lv(rs485CommonMode(11, NaN)), "warn");
  assert.equal(lv(rs485CommonMode(NaN, NaN)), "warn");
  assert.equal(rs485CommonMode(2, 3).values!.at(-1)!.v, "2.5 V");
});

test("4–20 mA: % 와 NE 43 경계(3.6·3.8·20.5·21)", () => {
  assert.equal(loopPercent(4), 0);
  assert.equal(loopPercent(12), 50);
  assert.equal(loopPercent(20), 100);
  assert.equal(lv(loopCurrent(0)), "fault");
  assert.match(loopCurrent(0).msg.ko, /흐르지 않습니다/);
  assert.equal(lv(loopCurrent(3.6)), "fault");
  assert.equal(lv(loopCurrent(3.7)), "warn");
  assert.equal(lv(loopCurrent(3.8)), "warn");
  assert.equal(lv(loopCurrent(4)), "ok");
  assert.equal(lv(loopCurrent(20)), "ok");
  assert.equal(lv(loopCurrent(20.5)), "warn");
  assert.equal(lv(loopCurrent(20.9)), "warn");
  assert.equal(lv(loopCurrent(21)), "fault");
  assert.match(loopCurrent(30).more[0].ko, /단락/);
  assert.equal(lv(loopCurrent(-5)), "fault");
  assert.equal(loopCurrent(12).values![0].v, "50 %");
});

test("24 V 부하 시: 강하 5 %·15 %·+20 %", () => {
  assert.equal(lv(supplyUnderLoad(24, 23)), "ok");
  assert.equal(lv(supplyUnderLoad(24, 22.8)), "ok");
  assert.equal(lv(supplyUnderLoad(24, 21)), "warn");
  assert.equal(lv(supplyUnderLoad(24, 20.4)), "warn");
  assert.equal(lv(supplyUnderLoad(24, 20)), "fault");
  assert.equal(lv(supplyUnderLoad(24, 29)), "fault");
  assert.equal(lv(supplyUnderLoad(0, 24)), "warn");
});

test("NPN/PNP 출력: PLC 입력 전압으로 판정(켜짐 15·11 V, 꺼짐 5 V)", () => {
  // NPN 켜짐: 출력 ≈ 0 V → 입력 24 V
  assert.equal(lv(sensorOutput("npn", "on", 0.8)), "ok");
  assert.equal(lv(sensorOutput("npn", "on", 11)), "warn"); // 입력 13 V
  assert.equal(lv(sensorOutput("npn", "on", 16)), "fault"); // 입력 8 V
  assert.equal(lv(sensorOutput("npn", "on", 23.5)), "fault"); // 입력 0.5 V
  // NPN 꺼짐: 출력 ≈ 24 V → 입력 0 V
  assert.equal(lv(sensorOutput("npn", "off", 23.8)), "ok");
  assert.equal(lv(sensorOutput("npn", "off", 0.2)), "fault");
  // PNP
  assert.equal(lv(sensorOutput("pnp", "on", 22.5)), "ok");
  assert.equal(lv(sensorOutput("pnp", "on", 0.3)), "fault");
  assert.equal(lv(sensorOutput("pnp", "off", 0.5)), "ok");
  assert.equal(lv(sensorOutput("pnp", "off", 7)), "warn");
  assert.equal(lv(sensorOutput("pnp", "off", 20)), "fault");
  assert.ok(sensorOutput("pnp", "on", 12, 12).more.some((m) => m.ko.includes("24 V DC 입력 기준")));
});

test("RS-232 TX 쉬는 전압: −5~−15 V 문제 없음, ±3 V 안·TTL·+ 는 문제", () => {
  assert.equal(lv(rs232TxIdle(-9)), "ok");
  assert.equal(lv(rs232TxIdle(-5)), "ok");
  assert.equal(lv(rs232TxIdle(-15)), "ok");
  assert.equal(lv(rs232TxIdle(-4)), "warn");
  assert.equal(lv(rs232TxIdle(-16)), "warn");
  assert.equal(lv(rs232TxIdle(0)), "fault");
  assert.match(rs232TxIdle(3.3).msg.ko, /TTL/);
  assert.match(rs232TxIdle(5).msg.ko, /TTL/);
  assert.equal(lv(rs232TxIdle(9)), "fault");
  assert.equal(lv(rs232TxIdle(-30)), "fault");
});

test("접지 간 전위차: 1 V·7 V", () => {
  assert.equal(lv(groundDiff(0.4)), "ok");
  assert.equal(lv(groundDiff(-2)), "warn");
  assert.equal(lv(groundDiff(7)), "fault");
});

test("문구 규칙: 금지어 없음, 영어에 한글 없음", () => {
  const s = readFileSync(new URL("./meterCheck.ts", import.meta.url), "utf8");
  for (const b of ["정상", "원인 확정", "검증", "최적화", "고쳐 줍니다"]) assert.ok(!s.includes(b), b);
  const all = [rs485Ohm({ ohm: 120, ...bus }), rs485Idle(0), rs485CommonMode(20, 0), loopCurrent(30), supplyUnderLoad(24, 19), sensorOutput("npn", "on", 12, 12), rs232TxIdle(4), groundDiff(9)];
  for (const v of all) for (const t of [v.msg, ...v.more, ...(v.values ?? []).map((x) => x.k)]) assert.ok(!/[가-힣]/.test(t.en), t.en);
  assert.equal(LEVEL_NAME.ok.ko, "문제 없음(이 측정 범위)");
});

test("텍스트로·그림: 항목마다 SVG 가 나오고 제목이 들어감", () => {
  const txt = verdictText("RS-485 A–B", "60 Ω", rs485Ohm({ ohm: 60, ...bus }), "ko");
  assert.match(txt, /→ 문제 없음\(이 측정 범위\)/);
  for (const id of ITEMS)
    for (const lang of ["ko", "en"] as const) {
      const svg = probeSvg(id, lang, `그림 ${id}`);
      assert.match(svg, /^<svg [^>]*viewBox="0 0 360 190"/);
      assert.ok(svg.includes(`<title>그림 ${id}</title>`));
      assert.ok(svg.includes("#d92d20"), "빨강 프로브");
      assert.ok(svg.endsWith("</svg>"));
    }
});
