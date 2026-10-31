// 시스템 구성도 — 종단·단위 부하·폴링 어림(busStats), 변경 비교(diffDocs), 옛 JSON 호환
import { test } from "node:test";
import assert from "node:assert/strict";
import { busStats, checkDoc, devicePollTime, emptyDoc, EXAMPLES, removeItem, toDrawing, validateDoc, type SysDoc, type SysNode } from "./sysDiagram.ts";
import { diffDocs, diffText } from "./sysDiff.ts";
import { poll } from "./serialTiming.ts";
import { renderSvg, LIGHT } from "./diagramSvg.ts";

/** 마스터 + 슬레이브 n 대가 x 순서로 매달린 RS-485 버스 */
function line(n: number, extra: Partial<SysNode>[] = []): SysDoc {
  const nodes: SysNode[] = [{ id: "m", kind: "usb485", name: "M", x: 0, y: 0, term: true }];
  for (let i = 1; i <= n; i++) nodes.push({ id: `s${i}`, kind: "inverter", name: `S${i}`, x: i * 160, y: 200, unit: i, ...(extra[i - 1] ?? {}) });
  nodes[nodes.length - 1].term = true;
  return {
    ...emptyDoc("t"),
    nodes,
    buses: [{ id: "b", kind: "rs485", name: "BUS", x: 0, y: 150, len: 160 * n + 200, baud: 9600, parity: "even" }],
    links: nodes.map((x, i) => ({ id: `l${i}`, kind: "rs485" as const, a: x.id, b: "b" })),
  };
}

test("옛 JSON(새 칸 없음)은 그대로 열리고, 새 칸은 모양이 맞을 때만", () => {
  const old = { format: "portdock-system-diagram", version: 1, title: "", nodes: [{ id: "a", kind: "plc", name: "A", x: 1, y: 2 }], buses: [], links: [] };
  const v = validateDoc(old);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.doc!.nodes[0], { id: "a", kind: "plc", name: "A", x: 1, y: 2 });
  const w = validateDoc({
    ...old,
    nodes: [{ id: "a", kind: "plc", name: "A", x: 1, y: 2, term: true, ul: 0.125, regs: 40.4 }, { id: "c", kind: "plc", name: "C", x: 1, y: 2, term: "yes", ul: 0.3, regs: 0 }],
    buses: [{ id: "b", kind: "rs485", name: "", x: 0, y: 0, len: 300, termStart: true, termEnd: 1 }],
  });
  assert.deepEqual(w.errors, []);
  assert.equal(w.doc!.nodes[0].term, true);
  assert.equal(w.doc!.nodes[0].ul, 0.125);
  assert.equal(w.doc!.nodes[0].regs, 40);
  assert.deepEqual(Object.keys(w.doc!.nodes[1]).sort(), ["id", "kind", "name", "x", "y"]);
  assert.equal(w.doc!.buses[0].termStart, true);
  assert.equal(w.doc!.buses[0].termEnd, undefined);
});

test("버스 요약: 장비 순서·단위 부하·폴링 어림은 serialTiming.poll 과 같다", () => {
  const d = line(3, [{ regs: 20 }, { ul: 0.5 }, {}]);
  const st = busStats(d, d.buses[0]);
  assert.deepEqual(st.devices.map((n) => n.id), ["m", "s1", "s2", "s3"]);
  assert.equal(st.left!.id, "m");
  assert.equal(st.right!.id, "s3");
  assert.equal(st.unitLoads, 3.5);
  assert.equal(st.regsAssumed, 2);
  const one = (q: number) => poll({ baud: 9600, format: { dataBits: 8, parity: "even", stopBits: 1 }, fc: 3, qty: q, slaveDelay: 0.01, masterGap: 0, transactions: 1 }).cycle;
  assert.ok(Math.abs(st.cycle - (one(20) + one(10) + one(10))) < 1e-12);
  // 125 개 넘으면 나눠 읽는다
  assert.ok(Math.abs(devicePollTime(200, 9600, "even") - 2 * one(100)) < 1e-12);
  // 장비가 늘면 한 바퀴가 길어진다
  assert.ok(busStats(line(6), line(6).buses[0]).cycle > busStats(line(3), line(3).buses[0]).cycle);
});

test("단위 부하 32 넘으면 경고(1/8 이면 괜찮음)", () => {
  const many = line(33);
  assert.ok(checkDoc(many, "ko").some((f) => f.text.includes("단위 부하 합 34")));
  const eighth = line(33, Array.from({ length: 33 }, () => ({ ul: 0.125 })));
  assert.ok(!checkDoc(eighth, "ko").some((f) => f.text.includes("단위 부하")));
});

test("종단 점검: 양 끝 OK, 중간에 켬·한쪽 없음·같은 끝 둘, 적지 않은 버스는 점검 안 함", () => {
  const ok = line(3);
  assert.deepEqual(checkDoc(ok, "ko").filter((f) => f.text.includes("종단")), []);
  const mid = line(3);
  mid.nodes.find((n) => n.id === "s2")!.term = true;
  assert.ok(checkDoc(mid, "ko").some((f) => f.text.includes("S2") && f.text.includes("버스 끝이 아닌데")));
  const oneSide = line(3);
  delete oneSide.nodes.find((n) => n.id === "s3")!.term;
  assert.ok(checkDoc(oneSide, "en").some((f) => f.text.includes("no termination at the right end") && f.ids.includes("s3")));
  const dbl = line(3);
  dbl.buses[0].termStart = true;
  assert.ok(checkDoc(dbl, "ko").some((f) => f.text.includes("같은 끝에 종단이 둘")));
  const none = line(3);
  for (const n of none.nodes) delete n.term;
  assert.deepEqual(checkDoc(none, "ko").filter((f) => f.text.includes("종단")), []);
  // 예시에는 종단 경고가 없다
  for (const ex of EXAMPLES) assert.deepEqual(checkDoc(ex.make("ko"), "ko").filter((f) => f.level !== "info"), [], ex.id);
});

test("그리기: 종단 자리 Ω, 더해진·바뀐 강조, 빠진 장비 점선", () => {
  const d = line(2);
  const svg = renderSvg(toDrawing(d, "ko", { added: new Set(["s1"]), changed: new Set(["s2"]), ghosts: [{ id: "x", kind: "plc", name: "OLD", x: 900, y: 600 }] }), LIGHT, {});
  assert.ok(svg.includes("− OLD"));
  assert.ok(svg.includes(LIGHT.gnd) && svg.includes(LIGHT.aux));
  assert.ok((svg.match(/>Ω</g) ?? []).length >= 2);
});

test("변경 비교: 더함·뺌·바뀜, 선, 버스 영향", () => {
  const before = line(3);
  const after = structuredClone(before);
  after.nodes.find((n) => n.id === "s1")!.unit = 7;
  after.nodes.push({ id: "s4", kind: "meter", name: "S4", x: 160 * 4, y: 200, unit: 4 });
  after.buses[0].len += 200;
  after.links.push({ id: "l9", kind: "rs485", a: "s4", b: "b" });
  const d = diffDocs(before, after, "ko");
  assert.ok(d.rows.some((r) => r.change === "changed" && r.id === "s1" && r.details.includes("국번 1 → 7")));
  assert.ok(d.rows.some((r) => r.change === "added" && r.what === "node" && r.id === "s4"));
  assert.ok(d.rows.some((r) => r.change === "added" && r.what === "link"));
  assert.ok(d.added.has("s4") && d.changed.has("s1"));
  assert.equal(d.buses.length, 1);
  assert.equal(d.buses[0].before!.devices.length, 4);
  assert.equal(d.buses[0].after!.devices.length, 5);
  assert.ok(d.buses[0].after!.cycle > d.buses[0].before!.cycle);
  // 새 장비가 오른쪽 끝 → 종단 옮기기
  assert.ok(d.findings.some((f) => f.text.includes("새 장비 «S4»") && f.text.includes("옛 끝 «S3»")));
  assert.ok(diffText(d, "ko").includes("BUS: 4대"));
  assert.equal(diffDocs(before, structuredClone(before), "en").same, true);
});

test("변경 비교: 끝 장비 제거 → 종단을 새 끝으로, 국번 반납", () => {
  const before = line(3);
  const after = removeItem(before, "s3");
  const d = diffDocs(before, after, "ko");
  assert.ok(d.rows.some((r) => r.change === "removed" && r.id === "s3"));
  assert.ok(d.rows.some((r) => r.change === "removed" && r.what === "link"));
  assert.deepEqual(d.removed.map((n) => n.id), ["s3"]);
  assert.ok(d.findings.some((f) => f.level === "warn" && f.text.includes("«S3»") && f.text.includes("종단 켬이었음") && f.text.includes("새 끝 «S2»")));
  assert.ok(d.findings.some((f) => f.level === "info" && f.text.includes("국번 3")));
  // 제거 뒤 문서 자체 점검도 오른쪽 끝 종단이 없다고 알린다
  assert.ok(checkDoc(after, "ko").some((f) => f.text.includes("오른쪽 끝") && f.text.includes("S2")));
  // 중간 장비 제거는 끝 경고 없음
  const mid = diffDocs(before, removeItem(before, "s2"), "en");
  assert.ok(!mid.findings.some((f) => f.level === "warn"));
});

test("변경 비교: id 가 달라도 같은 종류·이름이면 같은 장비로 본다", () => {
  const before: SysDoc = { ...emptyDoc(), nodes: [{ id: "n1", kind: "plc", name: "PLC-A", x: 0, y: 0, ip: "192.168.0.10" }] };
  const after: SysDoc = { ...emptyDoc(), nodes: [{ id: "n7", kind: "plc", name: "PLC-A", x: 50, y: 0, ip: "192.168.0.11" }] };
  const d = diffDocs(before, after, "en");
  assert.equal(d.rows.length, 1);
  assert.equal(d.rows[0].change, "changed");
  assert.deepEqual(d.rows[0].details, ["IP 192.168.0.10 → 192.168.0.11"]);
});
