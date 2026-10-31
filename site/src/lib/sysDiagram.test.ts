// 시스템 구성도 — JSON 검사, 구성 점검(IP 중복·서브넷·국번 중복·보율), 예시, Net Scan CSV, 그리기
import { test } from "node:test";
import assert from "node:assert/strict";
import { addLink, addScanRows, checkDoc, csvLine, emptyDoc, EXAMPLES, freeSpot, guessKind, hitTest, l2Groups, parseNetScanCsv, removeItem, toDrawing, validateDoc, type SysDoc } from "./sysDiagram.ts";
import { renderSvg, LIGHT } from "./diagramSvg.ts";

const doc = (p: Partial<SysDoc>): SysDoc => ({ ...emptyDoc("t"), ...p });

test("예시 셋은 검사를 통과하고 점검 경고가 없다", () => {
  for (const ex of EXAMPLES) {
    for (const lang of ["ko", "en"] as const) {
      const d = ex.make(lang);
      const v = validateDoc(JSON.parse(JSON.stringify(d)));
      assert.deepEqual(v.errors, [], ex.id);
      assert.deepEqual(v.doc, d);
      const f = checkDoc(d, lang).filter((x) => x.level !== "info");
      assert.deepEqual(f, [], ex.id);
    }
  }
});

test("JSON 검사: 형식·id 중복·없는 끝·버스끼리·종류 불일치", () => {
  assert.equal(validateDoc(null).doc, null);
  assert.ok(validateDoc({ format: "x", version: 1, nodes: [] }).errors[0].includes("format"));
  const v = validateDoc({
    format: "portdock-system-diagram",
    version: 1,
    title: "x",
    nodes: [
      { id: "a", kind: "pc", name: "A", x: 1, y: 2 },
      { id: "a", kind: "pc", name: "dup", x: 1, y: 2 },
      { id: "b", kind: "spaceship", x: 0, y: 0 },
      { id: "c", kind: "plc", name: "C", x: "1", y: 0 },
      { id: "d", kind: "plc", name: "D", x: -50, y: 99999, unit: 3.6, parity: "mark", baud: -1 },
    ],
    buses: [
      { id: "b1", kind: "rs485", name: "", x: 0, y: 100, len: 10 },
      { id: "b2", kind: "can", name: "", x: 0, y: 200, len: 300 },
    ],
    links: [
      { id: "l1", kind: "eth", a: "a", b: "d" },
      { id: "l2", kind: "eth", a: "a", b: "zz" },
      { id: "l3", kind: "rs485", a: "b1", b: "b2" },
      { id: "l4", kind: "eth", a: "d", b: "b1" },
      { id: "l5", kind: "rs485", a: "d", b: "b1" },
    ],
  });
  assert.ok(v.doc);
  assert.deepEqual(v.doc!.nodes.map((n) => n.id), ["a", "d"]);
  const d = v.doc!.nodes[1];
  assert.equal(d.x, 0);
  assert.equal(d.y, 6000);
  assert.equal(d.unit, 4);
  assert.equal(d.parity, undefined);
  assert.equal(d.baud, undefined);
  assert.equal(v.doc!.buses[0].len, 120);
  assert.deepEqual(v.doc!.links.map((l) => l.id), ["l1", "l5"]);
  for (const s of ["duplicate id a", "unknown kind", "x, y must be numbers", "node or bus ids", "bus to bus", "eth link to a rs485 bus"]) assert.ok(v.errors.some((e) => e.includes(s)), s);
});

test("IP 중복·모양", () => {
  const d = doc({
    nodes: [
      { id: "a", kind: "plc", name: "A", x: 0, y: 0, ip: "192.168.0.10" },
      { id: "b", kind: "hmi", name: "B", x: 0, y: 0, ip: "192.168.0.10" },
      { id: "c", kind: "pc", name: "C", x: 0, y: 0, ip: "192.168.0.300", mask: "255.0.255.0" },
    ],
  });
  const f = checkDoc(d, "ko");
  assert.ok(f.some((x) => x.level === "fault" && x.ids.join() === "a,b"));
  assert.ok(f.some((x) => x.level === "warn" && x.text.includes("192.168.0.300")));
});

test("서브넷: 스위치를 지나 다른 대역이면 경고, 라우터 너머는 괜찮다", () => {
  const d = doc({
    nodes: [
      { id: "sw", kind: "switch", name: "SW", x: 0, y: 0 },
      { id: "pc", kind: "pc", name: "PC", x: 0, y: 0, ip: "192.168.0.5", mask: "255.255.255.0" },
      { id: "plc", kind: "plc", name: "PLC", x: 0, y: 0, ip: "192.168.1.10", mask: "/24" },
      { id: "rt", kind: "router", name: "R", x: 0, y: 0, ip: "192.168.0.1" },
      { id: "far", kind: "plc", name: "FAR", x: 0, y: 0, ip: "10.0.0.5", mask: "/8" },
    ],
    links: [
      { id: "l1", kind: "eth", a: "pc", b: "sw" },
      { id: "l2", kind: "eth", a: "plc", b: "sw" },
      { id: "l3", kind: "eth", a: "rt", b: "sw" },
      { id: "l4", kind: "eth", a: "rt", b: "far" },
    ],
  });
  const g = l2Groups(d);
  assert.ok(g.some((x) => x.includes("pc") && x.includes("plc") && !x.includes("far")));
  const f = checkDoc(d, "en").filter((x) => x.level === "warn");
  assert.equal(f.length, 1);
  assert.deepEqual(f[0].ids.sort(), ["pc", "plc"]);
  // PLC 를 같은 대역으로 고치면 경고 없음
  d.nodes[2].ip = "192.168.0.10";
  assert.equal(checkDoc(d, "en").filter((x) => x.level === "warn").length, 0);
  // 마스크가 하나도 없으면 /24 로 보고 그렇게 적는다
  const n = doc({
    nodes: [
      { id: "a", kind: "pc", name: "A", x: 0, y: 0, ip: "192.168.0.5" },
      { id: "b", kind: "plc", name: "B", x: 0, y: 0, ip: "192.168.5.5" },
    ],
    links: [{ id: "l", kind: "eth", a: "a", b: "b" }],
  });
  assert.ok(checkDoc(n, "ko").some((x) => x.text.includes("/24 로 봄")));
  // 마스크가 /16 이면 같은 서브넷
  n.nodes[0].mask = "/16";
  n.nodes[1].mask = "255.255.0.0";
  assert.equal(checkDoc(n, "ko").filter((x) => x.level === "warn").length, 0);
});

test("RS-485 버스: 국번 중복·마스터 둘·보율/패리티 다름·빈 버스·외톨이", () => {
  const d = doc({
    nodes: [
      { id: "cv", kind: "usb485", name: "CV", x: 0, y: 0 },
      { id: "gw", kind: "gateway", name: "GW", x: 0, y: 0 },
      { id: "i1", kind: "inverter", name: "I1", x: 0, y: 0, unit: 1, baud: 9600, parity: "even" },
      { id: "i2", kind: "inverter", name: "I2", x: 0, y: 0, unit: 1, baud: 19200, parity: "none" },
      { id: "lone", kind: "sensor", name: "L", x: 0, y: 0 },
    ],
    buses: [
      { id: "b1", kind: "rs485", name: "BUS", x: 0, y: 100, len: 400, baud: 9600, parity: "even" },
      { id: "b2", kind: "can", name: "CAN", x: 0, y: 200, len: 400 },
    ],
    links: ["cv", "gw", "i1", "i2"].map((n, i) => ({ id: `l${i}`, kind: "rs485" as const, a: n, b: "b1" })),
  });
  const f = checkDoc(d, "ko");
  assert.ok(f.some((x) => x.level === "fault" && x.text.includes("국번 1")));
  assert.ok(f.some((x) => x.text.includes("마스터")));
  assert.ok(f.some((x) => x.text.includes("보율 19200")));
  assert.ok(f.some((x) => x.text.includes("패리티")));
  assert.ok(f.some((x) => x.level === "info" && x.ids[0] === "b2"));
  assert.ok(f.some((x) => x.level === "info" && x.ids[0] === "lone"));
});

test("선 잇기·지우기·빈 자리·누르기", () => {
  let d = EXAMPLES[0].make("ko");
  const n = d.links.length;
  // 버스에 이을 때 종류는 버스 종류로
  d = addLink(d, "eth", "pc", "b1")!;
  assert.equal(d.links.at(-1)!.kind, "rs485");
  assert.equal(d.links.length, n + 1);
  // 같은 선은 다시 넣지 않음
  assert.equal(addLink(d, "eth", "b1", "pc")!.links.length, n + 1);
  assert.equal(addLink(d, "eth", "pc", "pc"), null);
  d = removeItem(d, "b1");
  assert.equal(d.buses.length, 0);
  assert.ok(d.links.every((l) => l.a !== "b1" && l.b !== "b1"));
  const spot = freeSpot(d);
  assert.ok(d.nodes.every((x) => Math.abs(x.x - spot.x) >= 150 || Math.abs(x.y - spot.y) >= 66));
  assert.equal(hitTest(d, 50, 50), "pc");
  assert.equal(hitTest(d, 5, 5), null);
  const e = EXAMPLES[0].make("ko");
  assert.equal(hitTest(e, 300, 292), "b1");
});

test("Net Scan CSV: BOM·# 줄·따옴표, gone 빼기, 종류 짐작", () => {
  const csv =
    "﻿# PortDock Net Scan · 192.168.0.1-254 · 2026-10-31T00:00:00.000Z\r\n" +
    "ip,mac,vendor,name,rtt_ms,found_by,open_ports,services,modbus_vendor,modbus_product,modbus_revision,mark,conflict_macs\r\n" +
    "192.168.0.1,02:00:5E:10:00:01,,,1,arp+ping,80,HTTP,,,,gateway,\r\n" +
    "192.168.0.10,02:00:5E:10:00:0A,\"Vendor, Inc.\",,2,arp,502 2004,Modbus FEnet,,,,new,\r\n" +
    "192.168.0.20,02:00:5E:10:00:14,,,3,arp,502,Modbus,LS,\"G100 \"\"x\"\"\",1.0,,\r\n" +
    "192.168.0.30,02:00:5E:10:00:1E,,,,,,,,,,gone,\r\n" +
    "192.168.0.40,02:00:5E:10:00:28,,,1,arp+self,,,,,,self,\r\n" +
    "not-an-ip,,,,,,,,,,,,\r\n";
  const { rows, error } = parseNetScanCsv(csv);
  assert.equal(error, undefined);
  assert.deepEqual(rows.map((r) => r.ip), ["192.168.0.1", "192.168.0.10", "192.168.0.20", "192.168.0.40"]);
  assert.deepEqual(rows.map(guessKind), ["router", "plc", "other", "pc"]);
  assert.equal(rows[2].modbusProduct, 'G100 "x"');
  assert.equal(rows[1].vendor, "Vendor, Inc.");
  const d = addScanRows(emptyDoc(), rows, "ko");
  assert.equal(d.nodes.length, 5);
  assert.equal(d.links.length, 4);
  assert.ok(d.nodes.every((n) => !JSON.stringify(n).includes("02:00:5E")), "MAC 은 넣지 않음");
  assert.deepEqual(validateDoc(JSON.parse(JSON.stringify(d))).errors, []);
  assert.equal(checkDoc(d, "ko").filter((x) => x.level !== "info").length, 0);
  assert.equal(parseNetScanCsv("a,b\n1,2").error, "no ip column");
  assert.deepEqual(csvLine('a,"b,c","d""e"'), ["a", "b,c", 'd"e']);
});

test("그리기: 예시 → SVG, 고른 것 강조, 범례는 쓴 선 종류만", () => {
  const d = EXAMPLES[1].make("en");
  const dr = toDrawing(d, "en", { selected: "plc" });
  assert.deepEqual(dr.legend.map((l) => l.label), ["Ethernet", "4-20 mA"]);
  const box = dr.shapes.find((s) => s.k === "box" && s.title === "PLC");
  assert.ok(box && box.k === "box" && box.stroke === "accent");
  const svg = renderSvg(dr, LIGHT, { bg: true, title: true });
  assert.ok(svg.includes("192.168.10.10/24"));
  assert.ok(!svg.includes("NaN"));
  const bus = toDrawing(EXAMPLES[0].make("ko"), "ko");
  assert.ok(bus.shapes.some((s) => s.k === "wire" && s.w === 6));
});

test("단위 부하: 32 넘으면 볼 것, 29~32 는 바이어스를 쓰면 28 로 줄어든다는 안내(Modbus §3.4.6)", () => {
  const bus = (n: number) =>
    doc({
      nodes: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, kind: "sensor" as const, name: `S${i}`, x: 0, y: 0, unit: i + 1 })),
      buses: [{ id: "b", kind: "rs485", name: "B", x: 0, y: 0, len: 100 }],
      links: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, kind: "rs485" as const, a: `s${i}`, b: "b" })),
    });
  const ul = (n: number) => checkDoc(bus(n), "ko").filter((x) => x.text.includes("단위 부하"));
  assert.equal(ul(28).length, 0);
  assert.equal(ul(30).length, 1);
  assert.equal(ul(30)[0].level, "info");
  assert.match(ul(30)[0].text, /28/);
  assert.equal(ul(33)[0].level, "warn");
  assert.match(checkDoc(bus(33), "en").find((x) => x.text.includes("unit loads"))!.text, /28 with biasing/);
});
