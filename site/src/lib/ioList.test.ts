// IO 리스트·통신 사양서 — 문서 검사, 주소 겹침·국번·태그 점검, 장비 맵 가져오기, CSV·HTML 내보내기
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  checkDoc,
  csvCell,
  defaultFc,
  emptyDoc,
  exampleDoc,
  fromDeviceMap,
  nextAddress,
  parseDoc,
  plcNumber,
  regCount,
  tagFrom,
  toCsv,
  toJson,
  toRows,
  toTableHtml,
  validateDoc,
  CSV_HEAD,
  type IoDevice,
  type IoDoc,
  type MapDevice,
} from "./ioList.ts";

const dev = (p: Partial<IoDevice>): IoDevice => ({ id: "d1", name: "A", protocol: "rtu", unit: 1, signals: [], ...p });
const doc = (devices: IoDevice[]): IoDoc => ({ ...emptyDoc("t"), devices });

test("형식별 레지스터 수·함수 코드 기본값·PLC 꼴 번호", () => {
  assert.equal(regCount({ table: "holding-registers", type: "u16" }), 1);
  assert.equal(regCount({ table: "holding-registers", type: "f32" }), 2);
  assert.equal(regCount({ table: "input-registers", type: "f64" }), 4);
  assert.equal(regCount({ table: "holding-registers", type: "string", len: 5 }), 3);
  assert.equal(regCount({ table: "coils", type: "u32" }), 1);
  assert.equal(defaultFc({ table: "holding-registers", access: "r", type: "u16" }), "03");
  assert.equal(defaultFc({ table: "holding-registers", access: "rw", type: "u16" }), "03/06");
  assert.equal(defaultFc({ table: "holding-registers", access: "rw", type: "f32" }), "03/16");
  assert.equal(defaultFc({ table: "coils", access: "rw", type: "bit" }), "01/05");
  assert.equal(defaultFc({ table: "input-registers", access: "r", type: "u16" }), "04");
  assert.equal(plcNumber("holding-registers", 0), "40001");
  assert.equal(plcNumber("input-registers", 99), "30100");
  assert.equal(plcNumber("coils", 9998), "09999");
  assert.equal(plcNumber("holding-registers", 9999), "410000");
});

test("예시 문서는 점검에 걸리지 않고, JSON 으로 저장했다 불러오면 같다", () => {
  for (const lang of ["ko", "en"] as const) {
    const d = exampleDoc(lang);
    assert.deepEqual(checkDoc(d, lang), []);
    const back = parseDoc(toJson(d));
    assert.deepEqual(back.errors, []);
    assert.deepEqual(JSON.parse(JSON.stringify(back.doc)), JSON.parse(JSON.stringify(d)));
  }
});

test("불러오기: 모양이 틀리면 오류, 틀린 신호만 버린다", () => {
  assert.deepEqual(parseDoc("{").errors, ["not JSON"]);
  assert.equal(validateDoc({ format: "x", version: 1, devices: [] }).doc, null);
  const v = validateDoc({
    format: "portdock-io-list",
    version: 1,
    title: "t",
    devices: [{ id: "bad id!", name: "A", protocol: "zz", unit: 300, signals: [{ table: "holding-registers", address: 5, type: "f32" }, { table: "nope", address: 1 }, { table: "coils", address: 70000 }] }],
  });
  assert.equal(v.doc!.devices[0].id, "d1");
  assert.equal(v.doc!.devices[0].protocol, "other");
  assert.equal(v.doc!.devices[0].unit, undefined);
  assert.equal(v.doc!.devices[0].signals.length, 1);
  assert.equal(v.errors.length, 2);
  // BOM 이 붙은 파일
  assert.deepEqual(parseDoc("﻿" + toJson(emptyDoc())).errors, []);
});

test("주소 겹침: 같은 주소, f32 가 다음 주소를 먹음, 영역이 다르면 괜찮음", () => {
  const f = checkDoc(
    doc([
      dev({
        signals: [
          { tag: "A", table: "holding-registers", address: 10, type: "f32", access: "r" },
          { tag: "B", table: "holding-registers", address: 11, type: "u16", access: "r" },
          { tag: "C", table: "holding-registers", address: 20, type: "u16", access: "r" },
          { tag: "D", table: "holding-registers", address: 20, type: "u16", access: "r" },
          { tag: "E", table: "input-registers", address: 10, type: "u16", access: "r" },
          { tag: "F", table: "holding-registers", address: 12, type: "u16", access: "r" },
        ],
      }),
    ]),
    "ko",
  );
  assert.equal(f.filter((x) => x.level === "fault").length, 2);
  assert.ok(f.some((x) => x.text.includes("겹칩니다") && x.sig?.[1] === 1));
  assert.ok(f.some((x) => x.text.includes("두 번") && x.sig?.[1] === 3));
});

test("국번 중복: 같은 선만, TCP 는 같은 IP·포트만", () => {
  const f = checkDoc(
    doc([
      dev({ id: "a", name: "A", line: "COM3", unit: 1 }),
      dev({ id: "b", name: "B", line: "com3", unit: 1 }),
      dev({ id: "c", name: "C", line: "COM4", unit: 1 }),
      dev({ id: "d", name: "D", protocol: "tcp", ip: "192.168.0.10", unit: 1 }),
      dev({ id: "e", name: "E", protocol: "tcp", ip: "192.168.0.10", unit: 2 }),
      dev({ id: "f", name: "F", protocol: "tcp", ip: "192.168.0.11", unit: 1 }),
    ]),
    "en",
  );
  const dup = f.filter((x) => x.text.startsWith("Duplicate"));
  assert.equal(dup.length, 1);
  assert.ok(dup[0].text.includes("A, B"));
  const g = checkDoc(doc([dev({ id: "a", protocol: "tcp", ip: "10.0.0.1", unit: 1 }), dev({ id: "b", protocol: "tcp", ip: "10.0.0.1", unit: 1 })]), "en");
  assert.equal(g.filter((x) => x.level === "fault").length, 1);
});

test("국번 범위, 같은 선 보율 다름, 태그 중복, 읽기 전용 영역에 쓰기", () => {
  const f = checkDoc(
    doc([
      dev({ id: "a", name: "A", unit: 0, baud: 9600, parity: "even", signals: [{ tag: "X", table: "input-registers", address: 0, type: "u16", access: "rw" }] }),
      dev({ id: "b", name: "B", unit: 2, baud: 19200, parity: "even", signals: [{ tag: "x", table: "holding-registers", address: 0, type: "u16", access: "r" }] }),
    ]),
    "ko",
  );
  assert.ok(f.some((x) => x.level === "fault" && x.text.includes("1~247")));
  assert.ok(f.some((x) => x.text.includes("9600/even") && x.text.includes("19200/even")));
  assert.ok(f.some((x) => x.text.includes("«X»") && x.text.includes("2번")));
  assert.ok(f.some((x) => x.text.includes("읽기 전용")));
});

test("장비 맵 가져오기: 저장소의 모든 장비 JSON 이 점검 오류 없이 들어오고, 주소·형식·함수가 그대로", () => {
  const root = new URL("../../../data/devices/", import.meta.url);
  let n = 0;
  for (const maker of readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const f of readdirSync(new URL(`${maker.name}/`, root)).filter((x) => x.endsWith(".json"))) {
      const m = JSON.parse(readFileSync(new URL(`${maker.name}/${f}`, root), "utf8")) as MapDevice;
      const d = fromDeviceMap(m, "en", "d1", "X");
      assert.equal(d.signals.length, m.registers.length, m.id);
      assert.equal(d.source, m.id);
      const r0 = m.registers[0];
      assert.equal(d.signals[0].address, r0.address);
      assert.equal(d.signals[0].type, r0.type);
      assert.equal(d.signals[0].manual, r0.manualAddress);
      if (r0.fc?.length) assert.equal(d.signals[0].fc, r0.fc.map((x) => String(x).padStart(2, "0")).join("/"));
      // 저장 → 불러오기 모양이 맞는지(검사가 버리는 칸이 없어야)
      const back = validateDoc(JSON.parse(toJson(doc([d]))));
      assert.deepEqual(back.errors, [], m.id);
      assert.equal(back.doc!.devices[0].signals.length, d.signals.length, m.id);
      n++;
    }
  }
  assert.ok(n > 20);
});

test("태그 이름 만들기", () => {
  assert.equal(tagFrom("INV1", "Output frequency (Hz)"), "INV1_OUTPUT_FREQUENCY_HZ");
  assert.equal(tagFrom("", "  L1–N voltage "), "L1_N_VOLTAGE");
  assert.ok(tagFrom("P", "x".repeat(80)).length <= 40);
});

test("CSV: 머리·장비 칸 되풀이·수식 막기, 신호 없는 장비는 한 줄", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("-12"), "-12");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  const d = exampleDoc("ko");
  d.devices.push(dev({ id: "z", name: "빈 장비" }));
  const rows = toRows(d, "ko");
  assert.deepEqual(rows[0], CSV_HEAD.ko);
  assert.equal(rows.length, 1 + 3 + 2 + 1);
  assert.ok(rows.every((r) => r.length === CSV_HEAD.ko.length));
  assert.equal(rows[2][9], "INV1_FREQ_REF");
  assert.equal(rows[2][16], "0.01");
  const csv = toCsv(d, "en");
  assert.ok(csv.endsWith("\r\n"));
  assert.ok(csv.startsWith("Device name,Location,"));
});

test("HTML 표: 글은 escape, 매뉴얼 주소가 없으면 PLC 꼴", () => {
  const d = doc([dev({ name: "<b>x</b>", signals: [{ tag: "T&1", table: "holding-registers", address: 4, type: "u16", access: "r" }] })]);
  const h = toTableHtml(d, "en");
  assert.ok(h.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(h.includes("T&amp;1"));
  assert.ok(h.includes("40005"));
  assert.ok(!h.includes("<b>"));
  assert.ok(toTableHtml(doc([dev({})]), "ko").includes("신호 없음"));
});

test("다음 주소는 마지막 신호 바로 뒤", () => {
  const d = dev({ signals: [{ tag: "a", table: "holding-registers", address: 10, type: "f32", access: "r" }] });
  assert.equal(nextAddress(d, "holding-registers"), 12);
  assert.equal(nextAddress(d, "coils"), 0);
});
