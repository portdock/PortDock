// 커넥터 핀 배치 사전 — 핀 번호 중복·빠짐·범위, 표 칸 수, 출처, 찾기, SVG 글
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONNECTORS, CATEGORIES, VIEWS, WIRE, checkPins, expectedIds, filterConnectors, pinoutSvg, rowCells, headCells, connectorById, type Connector } from "./pinouts.ts";
import { DARK } from "./diagramSvg.ts";

test("모든 커넥터: 핀 번호 중복·범위 밖·빠짐 없음, 추가 칸 수 맞음", () => {
  const problems = CONNECTORS.flatMap(checkPins);
  assert.deepEqual(problems, []);
});

test("검사 함수가 중복·빠짐·범위 밖을 실제로 잡는다", () => {
  const base = connectorById("db9-rs232")!;
  const dup: Connector = { ...base, pins: [...base.pins, base.pins[0]] };
  assert.ok(checkPins(dup).some((s) => s.includes("duplicate pin 1")));
  const miss: Connector = { ...base, pins: base.pins.slice(1) };
  assert.ok(checkPins(miss).some((s) => s.includes("missing pin 1")));
  const out: Connector = { ...base, pins: [...base.pins, { ...base.pins[0], n: "10" }] };
  assert.ok(checkPins(out).some((s) => s.includes("pin 10 out of range")));
  // partial(DB25) 은 빠짐을 봐 준다
  const db25 = connectorById("db25-rs232")!;
  assert.equal(db25.partial, true);
  assert.deepEqual(checkPins(db25), []);
});

test("id 는 겹치지 않고, 묶음·출처·메모가 있다", () => {
  const ids = CONNECTORS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const c of CONNECTORS) {
    assert.ok(cats.has(c.cat), c.id);
    assert.ok(c.src.length > 0, `${c.id} 출처`);
    for (const s of c.src) assert.match(s.href, /^https:\/\//, `${c.id} ${s.href}`);
    assert.ok(c.notes.length > 0, c.id);
    for (const p of c.pins) if (p.color) assert.ok(WIRE[p.color], `${c.id} ${p.n} 색`);
  }
});

test("규격·관례 값 고정 — Modbus V1.02 §3.5, IEC 60947-5-2 색, M8 3핀 1·3·4", () => {
  const sig = (c: Connector, n: string) => c.pins.find((p) => p.n === n)!.sig.en;
  const rj = connectorById("rj45-modbus")!;
  assert.equal(sig(rj, "4"), "D1");
  assert.equal(sig(rj, "5"), "D0");
  assert.equal(sig(rj, "8"), "Common");
  assert.equal(sig(rj, "7"), "VP");
  const db = connectorById("db9-modbus")!;
  assert.equal(sig(db, "5"), "D1");
  assert.equal(sig(db, "9"), "D0");
  assert.equal(sig(db, "1"), "Common");
  const m12 = connectorById("m12a-4")!;
  assert.deepEqual(
    m12.pins.map((p) => p.color),
    ["bn", "wh", "bu", "bk"],
  );
  assert.deepEqual(expectedIds(connectorById("m8-3")!), ["1", "3", "4"]);
  assert.equal(expectedIds(connectorById("usb-c")!).length, 24);
  const rs232 = connectorById("db9-rs232")!;
  assert.equal(sig(rs232, "2"), "RXD");
  assert.equal(sig(rs232, "3"), "TXD");
  assert.equal(sig(rs232, "5"), "GND");
  // X-코드 7·8 은 DC−·DC+
  const x = connectorById("m12x-eth")!;
  assert.equal(sig(x, "7"), "DC−");
  assert.equal(sig(x, "8"), "DC+");
  // T568A·B 는 1·2 와 3·6 이 바뀐다
  const a = connectorById("rj45-t568a")!.pins.map((p) => p.color);
  const b = connectorById("rj45-t568b")!.pins.map((p) => p.color);
  assert.deepEqual([a[0], a[1], a[2], a[5]], [b[2], b[5], b[0], b[1]]);
  assert.deepEqual([a[3], a[4], a[6], a[7]], [b[3], b[4], b[6], b[7]]);
});

test("찾기: 낱말·묶음, 한글·영어·핀 신호", () => {
  assert.ok(filterConnectors("rs232").some((c) => c.id === "db9-rs232"));
  assert.ok(filterConnectors("널 모뎀").some((c) => c.id === "db9-rs232"));
  assert.deepEqual(
    filterConnectors("t568b").map((c) => c.id),
    ["rj45-t568b"],
  );
  assert.ok(filterConnectors("TRX").some((c) => c.id === "rs485-terms"));
  assert.ok(filterConnectors("", "usb").every((c) => c.cat === "usb"));
  assert.equal(filterConnectors("", "usb").length, 2);
  assert.equal(filterConnectors("zzzz").length, 0);
  assert.equal(filterConnectors("").length, CONNECTORS.length);
});

test("SVG: 보기마다 그려지고, 핀마다 data-pin, 강조 핀은 accent 색", () => {
  for (const c of CONNECTORS) {
    for (const v of VIEWS[c.kind]) {
      const svg = pinoutSvg(c, v, { lang: "ko" });
      assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+/);
      assert.ok(svg.endsWith("</svg>"));
      const n = (svg.match(/data-pin="/g) ?? []).length;
      const want = c.kind === "list" ? c.pins.length : c.kind === "usbc" ? 24 : c.pinCount;
      assert.equal(n, want, `${c.id} ${v}`);
    }
  }
  const db9 = connectorById("db9-rs232")!;
  const hl = pinoutSvg(db9, "male", { lang: "en", pal: DARK, hl: "3", bg: true, footer: "portdock.dev" });
  assert.ok(hl.includes(DARK.accent));
  assert.ok(hl.includes("portdock.dev"));
  assert.ok(!hl.includes("<script"));
});

test("DB9 정면: 수는 1번이 왼쪽 위, 암은 1번이 오른쪽 위(거울)", () => {
  const db9 = connectorById("db9-rs232")!;
  const xOf = (svg: string, id: string) => Number(svg.match(new RegExp(`data-pin="${id}"[^>]*><circle cx="([\\d.]+)"`))![1]);
  const m = pinoutSvg(db9, "male", { lang: "ko" });
  const f = pinoutSvg(db9, "female", { lang: "ko" });
  assert.ok(xOf(m, "1") < xOf(m, "5"));
  assert.ok(xOf(f, "1") > xOf(f, "5"));
  assert.ok(xOf(m, "6") < xOf(m, "9"));
});

test("표 칸: 머리·줄 칸 수가 같다", () => {
  for (const c of CONNECTORS)
    for (const lang of ["ko", "en"] as const) {
      const h = headCells(c, lang).length;
      for (const p of c.pins) assert.equal(rowCells(c, p, lang).length, h, `${c.id} ${p.n}`);
    }
});

test("이어지는 링크는 실제 가이드·웹 도구만", () => {
  const guides = new Set([...readFileSync(new URL("../data/guides.ts", import.meta.url), "utf8").matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => `guides/${m[1]}/`));
  const tools = new Set([...readFileSync(new URL("../data/webTools.ts", import.meta.url), "utf8").matchAll(/path: "(tools\/[^"]+)"/g)].map((m) => m[1]));
  for (const c of CONNECTORS) for (const l of c.links ?? []) assert.ok(guides.has(l) || tools.has(l), `${c.id}: ${l}`);
});
