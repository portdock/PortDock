// 배선도 만들기 — 템플릿 → 도형·확인 목록·경고, 주소(#) 주고받기, SVG 글
import { test } from "node:test";
import assert from "node:assert/strict";
import { build, DEFAULT_STATE, deviceMismatch, duplicateUnits, loop420, loopRows, parseHash, rs232, rs232Pairs, rs485FourWire, rs485TwoWire, sensors, output, toHash, txHeadroom, TEMPLATES, MAX_DEVICES } from "./wiring.ts";
import { renderSvg, LIGHT, DARK, legendLayout, esc } from "./diagramSvg.ts";

const base = { conv: "ab" as const, dev: "ab" as const, lengthM: 100, baud: 9600, parity: "even" as const, bias: true };

test("RS-485 2선: 끝 두 곳에만 종단(바이어스 켬 → 150 Ω 또는 1 nF+120 Ω 글 둘), 장비 수만큼 상자 + 변환기", () => {
  const r = rs485TwoWire({ ...base, devices: [{ name: "A", unit: 1 }, { name: "B", unit: 2 }, { name: "C", unit: 3 }] }, "ko");
  const boxes = r.drawing.shapes.filter((s) => s.k === "box");
  assert.equal(boxes.length, 4);
  // Modbus V1.02 §3.4.5: 바이어스를 쓰면 150 Ω 또는 1 nF + 120 Ω 직렬
  assert.equal(r.drawing.shapes.filter((s) => s.k === "text" && s.t === "150 Ω").length, 2);
  assert.equal(r.drawing.shapes.filter((s) => s.k === "text" && s.t === "또는 1 nF+120 Ω").length, 2);
  assert.ok(r.checks.some((c) => c.text.includes("1 nF + 120 Ω") && c.src?.includes("§3.4.5")));
  assert.ok(r.checks.some((c) => c.text.includes("32 → 28") && c.src?.includes("§3.4.6")));
  // 종단 2 + 바이어스 2 = 저항 4
  assert.equal(r.drawing.shapes.filter((s) => s.k === "res").length, 4);
  assert.equal(r.warnings.length, 0);
  assert.ok(r.checks.length >= 5 && r.checks.length <= 8);
  assert.ok(r.checks.some((c) => c.text.includes("«C»")), "마지막 장비 이름이 종단 안내에");
});

test("RS-485 2선: 바이어스 끄면 저항 2개, 단자 표기 다르면 안내", () => {
  const r = rs485TwoWire({ ...base, bias: false, dev: "d", devices: [{ name: "A", unit: 1 }] }, "en");
  assert.equal(r.drawing.shapes.filter((s) => s.k === "res").length, 2);
  assert.equal(r.drawing.shapes.filter((s) => s.k === "text" && s.t === "120 Ω").length, 2);
  assert.ok(!r.drawing.shapes.some((s) => s.k === "text" && /1 nF/.test(s.t)));
  assert.ok(r.warnings.some((w) => w.level === "info" && w.text.includes("D+")));
  const terms = r.drawing.shapes.filter((s) => s.k === "term").map((s) => (s.k === "term" ? s.label : ""));
  assert.deepEqual(terms, ["B", "A", "SG", "D+", "D−", "SG"]);
});

test("RS-485 2선: 국번 중복·범위, 길이·보율 경고", () => {
  const r = rs485TwoWire({ ...base, baud: 115200, lengthM: 1000, devices: [{ name: "A", unit: 5 }, { name: "B", unit: 5 }, { name: "C", unit: 300 }] }, "ko");
  assert.ok(r.warnings.some((w) => w.level === "fault" && w.text.includes("국번 5")));
  assert.ok(r.warnings.some((w) => w.text.includes("1~247")));
  // 10^8 / 115200 ≈ 868 m < 1000 m
  assert.ok(r.warnings.some((w) => w.level === "warn" && w.text.includes("868")));
  const far = rs485TwoWire({ ...base, lengthM: 1500, devices: [{ name: "A", unit: 1 }] }, "ko");
  assert.ok(far.warnings.some((w) => w.level === "fault" && w.text.includes("1200")));
  // 1000~1200 m @ 9600: TIA 일반값 안이지만 Modbus §3.4.3(9600·AWG26 → 1000 m)은 넘음
  const mid = rs485TwoWire({ ...base, lengthM: 1100, devices: [{ name: "A", unit: 1 }] }, "en");
  assert.ok(mid.warnings.some((w) => w.level === "warn" && w.text.includes("1000 m") && w.src?.includes("§3.4.3")));
  assert.equal(rs485TwoWire({ ...base, lengthM: 1000, devices: [{ name: "A", unit: 1 }] }, "ko").warnings.length, 0);
  const mid4 = rs485FourWire({ devices: [{ name: "A", unit: 1 }], labels: "txrx", lengthM: 1100, baud: 9600, parity: "none" }, "ko");
  assert.ok(mid4.warnings.some((w) => w.text.includes("1000 m")));
});

test("장비 맵 값과 맞지 않는 보율·패리티·국번 범위", () => {
  assert.deepEqual(deviceMismatch({ name: "x", unit: 1, bauds: [9600, 19200], parity: "none" }, 9600, "none"), []);
  assert.deepEqual(deviceMismatch({ name: "x", unit: 40, bauds: [9600], parity: "even", unitRange: [1, 32] }, 38400, "none"), ["baud", "parity", "unit"]);
  assert.deepEqual(duplicateUnits([1, 2, 2, 3, 3, 3]), [2, 3]);
  const r = rs485TwoWire({ ...base, parity: "none", devices: [{ name: "G100", unit: 1, bauds: [9600], parity: "even" }] }, "en");
  assert.ok(r.warnings.some((w) => w.text.includes("parity E")));
});

test("RS-485 2선: 8대까지만 그린다", () => {
  const devices = Array.from({ length: 12 }, (_, i) => ({ name: `D${i}`, unit: i + 1 }));
  const r = rs485TwoWire({ ...base, devices }, "ko");
  assert.equal(r.drawing.shapes.filter((s) => s.k === "box").length, MAX_DEVICES + 1);
  assert.ok(r.warnings.some((w) => w.level === "info"));
});

test("RS-485 4선: 마스터 TX 는 장비 RX 와 같은 줄, 두 쌍 모두 양 끝 종단(Modbus §3.4.5)", () => {
  const r = rs485FourWire({ devices: [{ name: "A", unit: 1 }, { name: "B", unit: 2 }], labels: "txrx", lengthM: 50, baud: 9600, parity: "none" }, "ko");
  const terms = r.drawing.shapes.filter((s) => s.k === "term").map((s) => (s.k === "term" ? s.label : ""));
  assert.deepEqual(terms.slice(0, 5), ["TX+", "TX−", "RX+", "RX−", "SG"]);
  assert.deepEqual(terms.slice(5, 10), ["RX+", "RX−", "TX+", "TX−", "SG"]);
  assert.equal(r.drawing.shapes.filter((s) => s.k === "res").length, 4);
  assert.ok(r.checks.some((c) => c.src?.includes("§3.4.5") && c.text.includes("양 끝")));
});

test("RS-232: 널 모뎀 3선은 3→2·2→3·5–5, 핸드셰이크 포함은 7↔8·4→6·1", () => {
  assert.deepEqual(rs232Pairs("null3").map((p) => [p.a, p.b]), [[3, 2], [2, 3], [5, 5]]);
  const full = rs232Pairs("nullFull").map((p) => `${p.a}-${p.b}`);
  for (const x of ["7-8", "8-7", "4-6", "4-1", "6-4", "1-4"]) assert.ok(full.includes(x), x);
  assert.equal(rs232Pairs("straight").length, 9);
  assert.ok(rs232Pairs("straight").every((p) => p.a === p.b));
  const r = rs232({ mode: "null3" }, "ko");
  assert.equal(r.tables[0].rows.length, 3);
  assert.equal(r.tables[1].rows.length, 9);
  assert.equal(r.tables[1].rows[2][1], "TxD");
  assert.equal(r.tables[1].rows[2][2], "출력");
});

test("4-20mA: 250 Ω → 1~5 V, 2선식 남는 전압", () => {
  const rows = loopRows(250);
  assert.deepEqual(rows.map((r) => r.v), [1, 2, 3, 4, 5]);
  assert.equal(txHeadroom(24, 250), 19);
  const r = loop420({ kind: "2w", supplyV: 24, rRecv: 250 }, "ko");
  assert.ok(r.checks[0].text.includes("1~5 V"));
  assert.ok(r.warnings.some((w) => w.text.includes("19 V")));
  assert.equal(r.tables[0].rows[4][1], "5");
  const low = loop420({ kind: "2w", supplyV: 12, rRecv: 500 }, "en");
  assert.equal(low.warnings[0].level, "warn");
  for (const kind of ["3w", "4w"] as const) assert.equal(loop420({ kind, supplyV: 24, rRecv: 250 }, "en").warnings.length, 0);
});

test("NPN/PNP: COM 이 +24 V / 0 V 로", () => {
  const npn = sensors({ type: "npn", count: 2 }, "ko");
  const pnp = sensors({ type: "pnp", count: 2 }, "ko");
  const comWire = (r: typeof npn) => r.drawing.shapes.filter((s) => s.k === "wire").at(-1)!;
  const last = (r: typeof npn) => {
    const w = comWire(r);
    return w.k === "wire" ? w.pts.at(-1)![1] : -1;
  };
  assert.equal(last(npn), 40);
  assert.equal(last(pnp), 70);
  assert.equal(npn.drawing.shapes.filter((s) => s.k === "box").length, 3);
  assert.equal(sensors({ type: "npn", count: 9 }, "ko").drawing.shapes.filter((s) => s.k === "box").length, 5);
});

test("출력: DC 부하는 다이오드(캐소드가 위 = + 쪽), AC 는 다이오드 없음, TR + AC 는 경고", () => {
  for (const out of ["relay", "npn", "pnp"] as const) {
    const r = output({ out, load: "dc" }, "ko");
    const d = r.drawing.shapes.find((s) => s.k === "diode");
    assert.ok(d && d.k === "diode" && d.y1 < d.y2, out);
  }
  const ac = output({ out: "relay", load: "ac" }, "en");
  assert.equal(ac.drawing.shapes.filter((s) => s.k === "diode").length, 0);
  assert.equal(ac.warnings.length, 0);
  assert.equal(output({ out: "npn", load: "ac" }, "en").warnings[0].level, "fault");
});

test("주소 # ↔ 상태 왕복, 틀린 값은 기본값", () => {
  const s = DEFAULT_STATE("ko");
  s.devices = [{ name: "G100 1", unit: 3 }, { name: "SDM120", unit: 7 }];
  s.baud = 19200;
  s.parity = "none";
  s.dev = "trx";
  const back = parseHash("#" + toHash(s), "ko");
  assert.deepEqual(back.devices, s.devices);
  assert.equal(back.baud, 19200);
  assert.equal(back.parity, "none");
  assert.equal(back.dev, "trx");
  const bad = parseHash("#tpl=nope&baud=-5&parity=x&n=99&ref=../../etc", "en");
  assert.equal(bad.tpl, "rs485-2w");
  assert.equal(bad.baud, 9600);
  assert.equal(bad.parity, "even");
  assert.equal(bad.ref, undefined);
  assert.equal(parseHash("#tpl=npn-pnp&ref=ls-electric/g100", "ko").ref, "ls-electric/g100");
});

test("모든 템플릿이 그려지고 SVG 글이 닫힌다(밝게·어둡게)", () => {
  for (const tpl of TEMPLATES) {
    for (const lang of ["ko", "en"] as const) {
      const s = { ...DEFAULT_STATE(lang), tpl };
      const r = build(s, lang);
      for (const pal of [LIGHT, DARK]) {
        const svg = renderSvg(r.drawing, pal, { bg: true, title: true, footer: "portdock.dev" });
        assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"), tpl);
        assert.ok(!svg.includes("NaN") && !svg.includes("undefined"), tpl);
      }
      assert.ok(r.checks.length >= 5 && r.checks.length <= 8, `${tpl} ${r.checks.length}`);
    }
  }
});

test("SVG 글 이스케이프·범례 줄 바꿈", () => {
  assert.equal(esc(`<a & "b">`), "&lt;a &amp; &quot;b&quot;&gt;");
  const r = rs485TwoWire({ ...base, devices: [{ name: `<script>`, unit: 1 }] }, "ko");
  assert.ok(!renderSvg(r.drawing, LIGHT).includes("<script>"));
  const items = Array.from({ length: 6 }, () => ({ c: "ink" as const, label: "아주 긴 범례 이름입니다" }));
  assert.ok(legendLayout(items, 400).rows > 1);
  assert.equal(legendLayout([], 400).rows, 0);
});
