// 고장 원인 찾기 도우미 — 나무 모양(닿음·막다른 곳·고리), 링크가 실제 있는 페이지인지, 걷기·주소·텍스트
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TREE } from "../data/troubleshoot.ts";
import { WEB_TOOLS } from "../data/webTools.ts";
import { TEMPLATES } from "./wiring.ts";
import { ITEMS } from "./meterCheck.ts";
import { allPaths, checkTree, isQuestion, linkPath, parseHash, toHash, toText, walk } from "./troubleshoot.ts";

// guides.ts·tools.ts 는 별칭(@shared)을 써서 node 로 바로 못 불러온다 — 글에서 슬러그·id 를 읽는다
const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const guideSlugs = [...src("../data/guides.ts").matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => m[1]);
const appIds = [...src("../data/tools.ts").matchAll(/^ {4}id: "([^"]+)"/gm)].map((m) => m[1]);
const known = new Set<string>([...guideSlugs.map((s) => `guides/${s}/`), ...appIds.map((a) => `${a}/`), ...WEB_TOOLS.map((w) => w.path)]);
const hashes = {
  "tools/wiring/": (h: string) => h.startsWith("tpl=") && (TEMPLATES as string[]).includes(h.slice(4)),
  "tools/multimeter-check/": (h: string) => (ITEMS as readonly string[]).includes(h),
};

test("읽어 온 목록이 비지 않음(정규식이 깨지지 않았는지)", () => {
  assert.ok(guideSlugs.length >= 40, `가이드 ${guideSlugs.length}`);
  assert.ok(appIds.includes("port-inspector") && appIds.includes("hw-tester") && appIds.includes("serial"));
  assert.ok(known.has("tools/troubleshoot/") && known.has("tools/multimeter-check/"));
});

test("나무 점검: id 중복·없는 다음 노드·막다른 곳·고리·닿지 않는 노드·없는 링크가 없음", () => {
  assert.deepEqual(checkTree(TREE, known, hashes), []);
});

test("증상 8갈래, 갈래마다 결과 셋 이상", () => {
  assert.equal(TREE.symptoms.length, 8);
  const paths = allPaths(TREE);
  for (const s of TREE.symptoms) {
    const ends = new Set(paths.filter((p) => p.symptom === s.id).map((p) => p.end));
    assert.ok(ends.size >= 3, `${s.id}: 결과 ${ends.size}`);
  }
  // 모든 길이 결과에서 끝나고, 모든 결과가 어느 길의 끝
  const results = TREE.nodes.filter((n) => !isQuestion(n)).map((n) => n.id);
  const ends = new Set(paths.map((p) => p.end));
  for (const r of results) assert.ok(ends.has(r), `닿지 않는 결과 ${r}`);
});

test("점검기가 나쁜 나무를 잡아냄", () => {
  const bad = {
    symptoms: [{ id: "x", start: "a", name: { ko: "가", en: "A" } }],
    nodes: [
      { id: "a", q: { ko: "?", en: "?" }, opts: [{ a: { ko: "예", en: "Yes" }, next: "b" }, { a: { ko: "아니오", en: "No" }, next: "nope" }] },
      { id: "b", q: { ko: "?", en: "?" }, opts: [{ a: { ko: "예", en: "Yes" }, next: "a" }, { a: { ko: "아니오", en: "No" }, next: "r" }] },
      { id: "r", title: { ko: "끝", en: "End" }, causes: [], checks: [{ ko: "c", en: "c" }], links: [{ k: "guide" as const, to: "no-such-guide" }] },
      { id: "lost", title: { ko: "외톨이", en: "Orphan" }, causes: [{ ko: "c", en: "c" }], checks: [{ ko: "c", en: "c" }], links: [{ k: "web" as const, to: "tools/wiring/", hash: "tpl=nope" }] },
    ],
  };
  const what = checkTree(bad, known, hashes).map((p) => p.what);
  assert.ok(what.some((w) => w.startsWith("없는 다음 노드")));
  assert.ok(what.some((w) => w.startsWith("고리")));
  assert.ok(what.includes("원인 후보 없음"));
  assert.ok(what.some((w) => w.startsWith("없는 링크: guides/no-such-guide/")));
  assert.ok(what.includes("어느 증상에서도 닿지 않음"));
  assert.ok(what.some((w) => w.startsWith("알 수 없는 #")));
});

test("문구 규칙: 금지어 없음(정상·원인 확정·검증·최적화·고쳐 줍니다)", () => {
  const banned = ["정상", "원인 확정", "검증", "최적화", "고쳐 줍니다"];
  const texts: string[] = [];
  for (const s of TREE.symptoms) texts.push(s.name.ko);
  for (const n of TREE.nodes) {
    if (isQuestion(n)) texts.push(n.q.ko, n.hint?.ko ?? "", ...n.opts.map((o) => o.a.ko));
    else texts.push(n.title.ko, ...n.causes.map((c) => c.ko), ...n.checks.map((c) => c.ko));
  }
  for (const t of texts) for (const b of banned) assert.ok(!t.includes(b), `«${b}»: ${t}`);
  // 영어 쪽에 한글이 섞이지 않음
  for (const n of TREE.nodes) {
    const en = isQuestion(n) ? [n.q.en, n.hint?.en ?? "", ...n.opts.map((o) => o.a.en)] : [n.title.en, ...n.causes.map((c) => c.en), ...n.checks.map((c) => c.en)];
    for (const t of en) assert.ok(!/[가-힣]/.test(t), `영어에 한글: ${t}`);
  }
});

test("걷기: 답 번호대로 따라가고, 잘못된 번호에서 멈춤", () => {
  const w = walk(TREE, "rs485", [0, 0, 0, 0])!;
  assert.equal(w.steps.length, 4);
  assert.equal(w.at.id, "r-rs485-polarity");
  const stop = walk(TREE, "rs485", [0, 9, 0])!;
  assert.equal(stop.steps.length, 1);
  assert.equal(stop.at.id, "rs485-txled");
  assert.equal(walk(TREE, "nope", []), null);
  // 갈래를 건너는 공유 노드: RS-232 → 변환기 인식
  assert.equal(walk(TREE, "rs232", [1])!.at.id, "usb-sound");
  assert.equal(walk(TREE, "mc", [1, 1])!.at.id, "r-tcp-subnet");
});

test("주소 #: 왕복, 이상한 값은 버림", () => {
  assert.equal(toHash("ma", [0, 1]), "s=ma&a=0.1");
  assert.deepEqual(parseHash("#s=ma&a=0.1"), { s: "ma", a: [0, 1] });
  assert.deepEqual(parseHash("#s=ma&a=0.x.999.2"), { s: "ma", a: [0, 2] });
  assert.equal(parseHash("#tpl=rs232"), null);
});

test("텍스트 복사: 증상·답한 것·원인 후보·확인 방법·링크 주소", () => {
  const w = walk(TREE, "tcp", [1, 1])!;
  assert.equal(w.at.id, "r-tcp-subnet");
  const names = { "guides/plc-ip-subnet/": "PLC IP" };
  const ko = toText(w, "ko", names, "https://portdock.dev/");
  assert.match(ko, /증상: Modbus TCP/);
  assert.match(ko, /답한 것:\n- PC 에서 장비 IP 로 ping 이 되나요\? → 아니오/);
  assert.match(ko, /원인 후보:/);
  assert.match(ko, /확인 방법:/);
  assert.match(ko, /- PLC IP: https:\/\/portdock\.dev\/guides\/plc-ip-subnet\//);
  assert.match(ko, /https:\/\/portdock\.dev\/tools\/subnet\//);
  const en = toText(w, "en", {}, "https://portdock.dev/en/");
  assert.match(en, /Possible causes:/);
  assert.ok(!/[가-힣]/.test(en));
  // 끝나기 전이면 남은 질문을 적는다
  assert.match(toText(walk(TREE, "tcp", [])!, "ko", {}, "/"), /아직 답하지 않은 질문: PC 에서 장비 IP/);
});

test("linkPath", () => {
  assert.equal(linkPath({ k: "guide", to: "rs485-wiring" }), "guides/rs485-wiring/");
  assert.equal(linkPath({ k: "app", to: "serial" }), "serial/");
  assert.equal(linkPath({ k: "web", to: "tools/wiring/", hash: "tpl=rs232" }), "tools/wiring/#tpl=rs232");
});
