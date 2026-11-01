// 여러 언어 일관성 시험 — 언어 목록(i18n/langs.ts)·번역 범위(i18n/scope.ts)·추가 언어 사전(i18n/<언어>/)·계산 라이브러리 문구 표가 서로 맞는지.
// 빌드 결과(사이트맵·hreflang)는 tools/site-check.mjs 가 따로 본다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_LANGS, EXTRA_LANGS, LANGS, LANG_META, url } from "../i18n/langs.ts";
import { LATER, LATER_PATHS, MORE, SCOPE, SCOPE2, SCOPE3, SCOPE_PATHS, SCOPE3_PATHS, SCOPE2_PATHS, extraPages, isTranslated, langsOf, link, pathsOf, staticPaths, type Page2Id, type Page3Id, type Scope2Path, type Scope3Path } from "../i18n/scope.ts";
import { DICTS, DICTS2, DICTS3 } from "../i18n/index.ts";
import { fromEn, misses, msg } from "./tr.ts";
import { decodeFrame } from "./modbusDecode.ts";
import { decodeMc, buildRequest as buildMc, endText } from "./mcDecode.ts";
import { parseHex, parseAscii } from "./checksum.ts";
import { parseRegisters, encodeValue } from "./modbusFloat.ts";
import { convert, signalStatus, countStatus } from "./analogScale.ts";
import { pair, parseCidr } from "./subnet.ts";
import { CONNECTORS, VIEWS, headCells, rowCells, pinoutSvg } from "./pinouts.ts";
import { buildRequest as buildMb } from "../../../shared/modbusBuild.ts";
import { TREE } from "../data/troubleshoot.ts";
import { allPaths, checkText, localize, say, toText, walk } from "./troubleshoot.ts";
import { DEFAULT_STATE, TEMPLATES, TEMPLATE_NAME, build as buildWiring, type WiringState } from "./wiring.ts";
import { ITEMS, ITEM_NAME, LEVEL_NAME, groundDiff, loopCurrent, rs232TxIdle, rs485CommonMode, rs485Idle, rs485Ohm, sensorOutput, supplyUnderLoad, verdictText } from "./meterCheck.ts";
import { probeSvg } from "./meterFig.ts";
import { HB_STATE, NMT_CMD, PGNS, SDO_ABORT, SPNS, objectName } from "./canFrame.ts";
import { CHIPS } from "./i2c.ts";
import { USES, ethernetCheck, rs232Check, rs485Check } from "./cableSelect.ts";
import { buildFrame, convertNotes, parseFrame as parseMbFrame } from "./modbusConvert.ts";
import { XGT_DEVICES, XGT_ERRORS, buildXgtRequest, decodeXgt, errText, errWhen } from "./xgtDecode.ts";
import { STANDARD_BUTTONS, channelLabel } from "./hwSignal.ts";
import { MOUSE_BUTTONS } from "./inputTiming.ts";
import { LAYOUTS } from "./keyboardLayout.ts";
import { BUGCHECKS, STEPS, causesOf } from "./bsod.ts";
import { parseGs1 } from "./barcode.ts";
import { tx } from "./tr.ts";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("언어 목록 — ko 는 루트, 나머지는 /<언어>/, 이름·hreflang 이 다 있다", () => {
  assert.deepEqual([...CORE_LANGS], ["ko", "en"]);
  for (const l of LANGS) {
    assert.ok(LANG_META[l]?.name && LANG_META[l].hreflang && LANG_META[l].locale && LANG_META[l].og, l);
    assert.equal(url(l, "tools/checksum/"), l === "ko" ? "/tools/checksum/" : `/${l}/tools/checksum/`);
  }
  assert.equal(new Set(LANGS.map((l) => LANG_META[l].hreflang)).size, LANGS.length);
});

test("번역 범위의 쪽은 한국어·영어 쪽이 있고, 추가 언어마다 pages/<언어>/[...path].astro 가 있다", () => {
  const page = (rel: string) => [path.join(SRC, "pages", rel + "index.astro"), path.join(SRC, "pages", rel.replace(/\/$/, "") + ".astro")].some((f) => fs.existsSync(f));
  for (const p of [...SCOPE_PATHS, ...LATER_PATHS]) {
    assert.ok(page(p), `한국어 쪽 없음: ${p}`);
    assert.ok(page("en/" + p), `영어 쪽 없음: en/${p}`);
  }
  for (const l of EXTRA_LANGS) assert.ok(fs.existsSync(path.join(SRC, "pages", l, "[...path].astro")), `pages/${l}/[...path].astro 없음`);
  // 거꾸로: 추가 언어 폴더가 있는데 EXTRA_LANGS 에 빠진 경우(사이트맵·hreflang 에 안 나온다)
  for (const d of fs.readdirSync(path.join(SRC, "pages"), { withFileTypes: true }))
    if (d.isDirectory() && /^[a-z]{2}(-[a-z]{2})?$/.test(d.name) && d.name !== "en") assert.ok((EXTRA_LANGS as readonly string[]).includes(d.name), `pages/${d.name} 가 있는데 langs.ts EXTRA_LANGS 에 없음`);
  // getStaticPaths 가 만드는 주소 = 그 언어의 번역 범위(1차 전부 + MORE[언어])
  for (const l of EXTRA_LANGS) {
    assert.deepEqual(
      staticPaths(l).map((x) => x.props.path),
      [...SCOPE_PATHS, ...LATER_PATHS.filter((p) => MORE[l]?.includes(p))],
    );
    // 주소 파일이 언어를 넘기는지(복사하고 lang 을 안 바꾸면 다른 언어의 범위로 만든다)
    const file = fs.readFileSync(path.join(SRC, "pages", l, "[...path].astro"), "utf8");
    assert.match(file, new RegExp(`staticPaths\\("${l}"\\)`), `pages/${l}/[...path].astro 가 staticPaths("${l}") 를 부르지 않음`);
    assert.match(file, new RegExp(`lang="${l}"`), `pages/${l}/[...path].astro 의 lang 이 ${l} 이 아님`);
  }
  assert.equal(extraPages().length, EXTRA_LANGS.reduce((n, l) => n + pathsOf(l).length, 0));
  // MORE 는 1차 밖 묶음(2차·3차) 경로만, 겹침 없이
  for (const [l, list] of Object.entries(MORE)) {
    assert.ok((EXTRA_LANGS as readonly string[]).includes(l), `MORE 의 ${l} 이 EXTRA_LANGS 에 없음`);
    for (const p of list ?? []) assert.ok(p in LATER, `MORE.${l}: 2차·3차 묶음 밖 경로 ${p}`);
    assert.equal(new Set(list).size, list?.length ?? 0, `MORE.${l}: 겹친 경로`);
  }
});

test("번역된 쪽에만 그 언어가 붙고, 나머지 링크는 영어판으로", () => {
  for (const l of EXTRA_LANGS) {
    assert.deepEqual(langsOf("tools/checksum/"), [...CORE_LANGS, ...EXTRA_LANGS]);
    assert.deepEqual(langsOf("tools/adc/"), [...CORE_LANGS]);
    assert.ok(isTranslated(l, "download/#safe"));
    assert.equal(link(l, "guides/rs485-wiring/"), "/en/guides/rs485-wiring/");
    assert.equal(link(l, "tools/subnet/"), `/${l}/tools/subnet/`);
    // 2차·3차 묶음: 그 언어가 번역한 쪽만
    for (const p of LATER_PATHS) {
      const has = MORE[l]?.includes(p) ?? false;
      assert.equal(isTranslated(l, p + "#x"), has);
      assert.equal(link(l, p), has ? `/${l}/${p}` : `/en/${p}`);
    }
  }
  for (const p of LATER_PATHS) assert.deepEqual(langsOf(p), [...CORE_LANGS, ...EXTRA_LANGS.filter((l) => MORE[l]?.includes(p))]);
});

/** 사전의 모양(열쇠·배열 길이·글 종류) — 함수는 시험 값으로 불러서 결과의 모양 */
const CTX = { nApps: 12, mcp: true, nWeb: 10, nHw: 9, nDevices: 3, nGuides: 60, version: "0.10.0", n: 13 };
function shape(v: unknown): unknown {
  if (typeof v === "function") return shape((v as (a: unknown) => unknown)(CTX));
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
  return typeof v;
}

test("추가 언어 사전 — 기준판(ja)과 같은 모양, 쪽마다 글이 있고 빈 글이 없다", () => {
  const base = shape({ ...DICTS.ja, lib: Object.keys(DICTS.ja.lib) });
  for (const l of EXTRA_LANGS) {
    const d = DICTS[l];
    assert.deepEqual(shape({ ...d, lib: Object.keys(d.lib) }), base, `${l} 사전 모양이 ja 와 다름`);
    assert.deepEqual(Object.keys(d.pages).sort(), [...new Set(Object.values(SCOPE))].sort(), `${l}: 쪽 글 = 번역 범위`);
    const empty: string[] = [];
    const walk = (v: unknown, at: string) => {
      if (typeof v === "function") return walk((v as (a: unknown) => unknown)(CTX), at);
      if (typeof v === "string") {
        if (!v.trim() && !/inEnglish|allToolsEn/.test(at)) empty.push(at);
        return;
      }
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
    };
    walk({ ui: d.ui, common: d.common, pages: d.pages }, l);
    assert.deepEqual(empty, [], `${l}: 빈 문구`);
  }
});

/** JS 소스의 글 하나(" ' `)를 읽는다 — ${…} 는 {} 로, 이스케이프는 풀어서 */
function readLit(s: string, i: number): [string, number] | null {
  const q = s[i];
  if (q !== '"' && q !== "'" && q !== "`") return null;
  let out = "";
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === "\\") {
      const n = s[j + 1];
      out += n === "n" ? "\n" : n === "t" ? "\t" : n;
      j += 2;
      continue;
    }
    if (q === "`" && c === "$" && s[j + 1] === "{") {
      let k = j + 2;
      let depth = 1;
      while (depth) {
        if (s[k] === "{") depth++;
        else if (s[k] === "}") depth--;
        else if (s[k] === '"' || s[k] === "'" || s[k] === "`") {
          const r = readLit(s, k);
          if (r) k = r[1] - 1;
        }
        k++;
      }
      out += "{}";
      j = k;
      continue;
    }
    if (c === q) return [out, j + 1];
    out += c;
    j++;
  }
  return null;
}

/** 두 갈래 문구의 영어 쪽: t("ko", "en") · msg(lang, "ko", "en") · trMsg(o.lang, …) · { en: "…" } · whenEn: "…" */
function englishOf(file: string): string[] {
  const s = fs.readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of s.matchAll(/\b(?:t|msg|trMsg)\(\s*(?:lang,\s*|o\.lang,\s*)?/g)) {
    const a = readLit(s, m.index! + m[0].length);
    if (!a) continue;
    let j = a[1];
    while (/[\s,]/.test(s[j])) j++;
    const b = readLit(s, j);
    if (b) out.push(b[0]);
  }
  for (const m of s.matchAll(/\b(?:en|whenEn):\s*/g)) {
    const a = readLit(s, m.index! + m[0].length);
    if (a) out.push(a[0]);
  }
  return [...new Set(out)].filter((x) => /[a-z]{3}/.test(x));
}

// 번역 범위의 웹 도구가 쓰는 라이브러리와 화면 스크립트
const LIB_FILES = ["lib/checksum.ts", "lib/analogScale.ts", "lib/modbusDecode.ts", "lib/modbusFloat.ts", "lib/mcDecode.ts", "lib/subnet.ts", "lib/pinouts.ts", "views/ModbusDecoderPage.astro", "views/McDecoderPage.astro", "views/SubnetPage.astro"];
// 2차 묶음 — 쪽마다 화면(views)과 그 화면이 쓰는 라이브러리(그 언어가 MORE 에 그 쪽을 넣었을 때만 본다)
const VIEW2: Record<Page2Id, string> = {
  wiring: "WiringPage",
  troubleshoot: "TroubleshootPage",
  multimeterCheck: "MultimeterCheckPage",
  canDecoder: "CanDecoderPage",
  canTiming: "CanTimingPage",
  i2c: "I2cPage",
  uartBaud: "UartBaudPage",
  modbusRtuTcp: "ModbusRtuTcpPage",
  xgtDecoder: "XgtDecoderPage",
  cableSelection: "CableSelectionPage",
};
const LIB2: Record<Page2Id, string[]> = {
  wiring: ["lib/wiring.ts"],
  troubleshoot: ["lib/troubleshoot.ts"],
  multimeterCheck: ["lib/meterCheck.ts", "lib/meterFig.ts"],
  canDecoder: ["lib/canFrame.ts"],
  canTiming: [],
  i2c: ["lib/i2c.ts"],
  uartBaud: [],
  modbusRtuTcp: ["lib/modbusConvert.ts"],
  xgtDecoder: ["lib/xgtDecode.ts"],
  cableSelection: ["lib/cableSelect.ts"],
};
/** 그 언어가 번역한 2차 묶음 쪽 이름 */
const pages2Of = (l: (typeof EXTRA_LANGS)[number]) => (MORE[l] ?? []).filter((p): p is Scope2Path => p in SCOPE2).map((p) => SCOPE2[p]);

test("계산 라이브러리 문구 — 번역 범위 도구의 영어 문장마다 추가 언어 번역이 있다", () => {
  for (const l of EXTRA_LANGS) {
    const cat: Record<string, string> = Object.assign({}, ...Object.values(DICTS[l].lib));
    const missing = LIB_FILES.flatMap((f) => englishOf(path.join(SRC, f)).filter((en) => !(en in cat)).map((en) => `${f}: ${en}`));
    assert.deepEqual(missing, [], `${l}: 번역 없는 문장`);
  }
});

test("계산 라이브러리 문구 — 묶음끼리 같은 영어 문장을 다르게 옮기지 않는다(쪽마다 다른 묶음을 싣는다)", () => {
  for (const l of EXTRA_LANGS) {
    const seen = new Map<string, [string, string]>();
    for (const [sec, cat] of Object.entries(DICTS[l].lib))
      for (const [k, v] of Object.entries(cat as Record<string, string>)) {
        const prev = seen.get(k);
        assert.ok(!prev || prev[1] === v, `${l}: «${k}» 가 ${prev?.[0]} 와 ${sec} 에서 다름`);
        seen.set(k, [sec, v]);
        assert.equal((k.match(/\{\}/g) ?? []).length >= Math.max(-1, ...[...v.matchAll(/\{(\d)\}/g)].map((x) => Number(x[1]))) + 1, true, `${l}: «${k}» 의 {n} 이 {} 수보다 큼`);
      }
  }
});

test("계산 라이브러리 — 추가 언어로 돌려도 영어가 남지 않는다(예시 입력)", () => {
  misses.clear();
  for (const l of EXTRA_LANGS) {
    const frames = ["01 03 00 00 00 0A C5 CD", "01 03 06 02 2B 00 00 00 64 00 00", "01 83 02 C0 F1", "00 07 00 00 00 06 01 03 00 00 00 02", "01 01 03 FF 00 01 00 00", "01 10 00 01 00 02 04 00 0A 01 02 92 30", "01 05 00 01 FF 00 DD FA", "02 2B 0E 01 00 00 00"];
    for (const f of frames) JSON.stringify(decodeFrame(parseHex(f, l), "auto", l));
    for (const bad of ["0G", "123", "01"]) {
      try {
        decodeFrame(parseHex(bad, l), "auto", l);
      } catch {
        /* 오류 문구도 번역 대상 */
      }
    }
    for (const e of ["\\q", "\\xZZ"]) assert.throws(() => parseAscii(e, l));
    // MC — 요청·응답·ASCII·4E·오류 응답·짝 요청
    const req = buildMc({ frame: "3e", code: "binary", op: "read-words", dev: "D", start: 100, count: 3 }, l);
    const hx = (u: number[]) => u.map((x) => x.toString(16).padStart(2, "0")).join(" ");
    for (const [input, pairIn] of [
      [hx(req), ""],
      ["D0 00 00 FF FF 03 00 08 00 00 00 95 19 02 12 30 11", hx(req)],
      ["54 00 34 12 00 00 00 FF FF 03 00 0D 00 10 00 19 06 00 00 05 00 41 42 43 44 45", ""],
      ["D0 00 00 FF FF 03 00 0B 00 59 C0 00 FF FF 03 00 01 01 00 00", ""],
      ["500000FF03FF000018001004010000D*0001000003", ""],
    ])
      JSON.stringify(decodeMc(input, { lang: l, pair: pairIn }));
    for (const c of [0, 0xc051, 0xc059, 0x4031]) endText(c, l);
    assert.throws(() => decodeMc("zz", { lang: l }));
    // Modbus 실수·4–20mA·서브넷·핀 배치
    assert.throws(() => parseRegisters("41C8", "hex", l));
    assert.throws(() => encodeValue("1.5", "int32", l));
    assert.throws(() => convert({ signal: "4-20mA", engLo: 0, engHi: 0, countLo: 0, countHi: 1 }, "sig", 4, l));
    for (const v of [3, 3.7, 12, 20.7, 22]) {
      const s = signalStatus("4-20mA", v);
      if (s) msg(l, s.ko, s.en);
    }
    const cs = countStatus({ lo: 0, hi: 100, min: 0, max: 110 }, 120);
    if (cs) msg(l, cs.ko, cs.en);
    const A = parseCidr("192.168.1.10", "24")!;
    for (const [b, m] of [["192.168.1.10", "24"], ["192.168.2.10", "24"], ["192.168.1.20", "16"], ["192.168.1.0", "24"]]) for (const x of pair(A, parseCidr(b, m)!, parseCidr("10.0.0.1", "32")!.ip).messages) msg(l, x.ko, x.en);
    for (const c of CONNECTORS) {
      headCells(c, l);
      for (const p of c.pins) rowCells(c, p, l);
      for (const v of VIEWS[c.kind]) pinoutSvg(c, v, { lang: l });
    }
    // 공용 Modbus 요청 만들기(앱과 함께 쓰는 shared — 영어로 만든 뒤 번역)
    for (const form of [
      { slave: 300, fc: 3, addrText: "0", addrMode: "zero" as const, qty: 1, valuesText: "" },
      { slave: 1, fc: 3, addrText: "40001", addrMode: "zero" as const, qty: 1, valuesText: "" },
      { slave: 1, fc: 3, addrText: "30001", addrMode: "plc" as const, qty: 1, valuesText: "" },
      { slave: 1, fc: 16, addrText: "0", addrMode: "zero" as const, qty: 1, valuesText: "x" },
      { slave: 1, fc: 3, addrText: "65535", addrMode: "zero" as const, qty: 10, valuesText: "" },
    ]) {
      const r = buildMb(form, "en");
      if (r.error) fromEn(r.error, l);
      if (r.note) fromEn(r.note, l);
    }
  }
  assert.deepEqual([...misses], [], "번역 표에 없는 영어 문장");
});

test("공용 Modbus 요청 만들기(shared/modbusBuild.ts) — 영어 안내 문구마다 추가 언어 번역이 있다", () => {
  const s = fs.readFileSync(path.join(SRC, "..", "..", "shared", "modbusBuild.ts"), "utf8");
  const en = s.slice(s.indexOf("\n  en: {"), s.indexOf("\n  },", s.indexOf("\n  en: {")));
  const texts = [...en.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\{\w+\}/g, "{}")).filter((x) => /[a-z]{3}/.test(x));
  assert.ok(texts.length > 15, "en 문구를 못 읽음");
  for (const l of EXTRA_LANGS) {
    const cat: Record<string, string> = Object.assign({}, ...Object.values(DICTS[l].lib));
    assert.deepEqual(
      texts.filter((x) => !(x in cat)),
      [],
      `${l}: 번역 없는 문장`,
    );
  }
});

// ---------------------------------------------------------------- 2차 묶음(scope.ts SCOPE2 · MORE)

test("2차 묶음 사전 — 번역 범위(MORE)의 쪽마다 기준판(ja)과 같은 모양의 글·도구 이름이 있다", () => {
  const ja2 = DICTS2.ja!;
  // 기준판은 2차 묶음 전부
  assert.deepEqual(Object.keys(ja2.pages).sort(), Object.values(SCOPE2).sort(), "ja 2차 묶음 쪽 글 = SCOPE2");
  assert.deepEqual(Object.keys(ja2.webTools).sort(), [...SCOPE2_PATHS].sort(), "ja 2차 묶음 도구 이름 = SCOPE2");
  for (const l of EXTRA_LANGS) {
    const ids = pages2Of(l);
    if (!ids.length) continue;
    const d = DICTS2[l];
    assert.ok(d, `${l}: MORE 에 쪽이 있는데 i18n/index.ts DICTS2 에 ${l} 사전이 없음`);
    for (const id of ids) {
      const pg: unknown = (d.pages as Record<string, unknown>)[id];
      assert.ok(pg, `${l}: 2차 묶음 쪽 글 없음 — ${id}`);
      assert.deepEqual(shape(pg), shape((ja2.pages as Record<string, unknown>)[id]), `${l}: ${id} 쪽 글 모양이 ja 와 다름`);
    }
    for (const p of (MORE[l] ?? []).filter((x) => x in SCOPE2)) {
      const w = (d.webTools as Record<string, { name: string; blurb: string } | undefined>)[p];
      assert.ok(w?.name.trim() && w.blurb.trim(), `${l}: 도구 이름·소개 없음 — ${p}`);
    }
    const empty: string[] = [];
    const walkS = (v: unknown, at: string) => {
      if (typeof v === "function") return walkS((v as (a: unknown) => unknown)(CTX), at);
      if (typeof v === "string") {
        if (!v.trim()) empty.push(at);
        return;
      }
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkS(x, `${at}.${k}`);
    };
    for (const id of ids) walkS({ ...(d.pages as Record<string, object>)[id], tree: undefined }, `${l}.${id}`);
    assert.deepEqual(empty, [], `${l}: 빈 문구`);
  }
});

test("2차 묶음 — 고장 원인 찾기 나무 글 표가 나무(data/troubleshoot.ts)와 맞는다", () => {
  for (const l of EXTRA_LANGS) {
    if (!pages2Of(l).includes("troubleshoot")) continue;
    const text = DICTS2[l]!.pages.troubleshoot!.tree;
    assert.deepEqual(checkText(TREE, text), [], `${l}: 나무 글 표`);
    // 걸어 본 모든 길에서 영어가 남지 않음(글이 다 붙었는지)
    const tree = localize(TREE, text);
    for (const s of tree.symptoms) assert.ok(s.name.x, `${l}: 증상 ${s.id}`);
    for (const p of allPaths(tree)) {
      const w = walk(tree, p.symptom, p.picks)!;
      for (const st of w.steps) assert.ok(st.q.q.x && st.q.opts[st.pick].a.x, `${l}: ${st.q.id}`);
      const txt = toText(w, l, {}, "https://portdock.dev/");
      assert.ok(!/Possible causes|How to check|Symptom/.test(txt), `${l}: 복사 글에 영어 머리말`);
    }
    assert.equal(say(TREE.symptoms[0].name, l), TREE.symptoms[0].name.en, "localize 안 한 나무는 영어");
  }
});

/** 화면 파일에서 Base 에 넘긴 libText 묶음 */
const libTextOf = (view: string): string[] => {
  const s = fs.readFileSync(path.join(SRC, "views", view + ".astro"), "utf8");
  const m = /libText=\{\[([^\]]*)\]\}/.exec(s);
  return m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : [];
};
/** 화면의 브라우저 스크립트 부분(<script> … </script>, 구조화 데이터 제외)과 그 스크립트가 가져오는 lib 파일 */
const clientOf = (view: string): { code: string; libs: string[] } => {
  const s = fs.readFileSync(path.join(SRC, "views", view + ".astro"), "utf8");
  const i = s.lastIndexOf("\n  <script>\n");
  if (i < 0) return { code: "", libs: [] };
  const code = s.slice(i, s.indexOf("</script>", i));
  return { code, libs: [...code.matchAll(/from "\.\.\/lib\/(\w+)"/g)].map((m) => `lib/${m[1]}.ts`).filter((f) => f !== "lib/tr.ts") };
};

test("2차 묶음 — 쪽의 영어 문장마다 번역이 있고, 브라우저 스크립트가 쓰는 문장은 그 쪽이 싣는 묶음(libText)에 있다", () => {
  const tmp = path.join(SRC, "..", "node_modules", ".i18n-test-client.ts");
  for (const l of EXTRA_LANGS) {
    const ids = pages2Of(l);
    if (!ids.length) continue;
    const all: Record<string, string> = Object.assign({}, ...Object.values(DICTS[l].lib), ...Object.values(DICTS2[l]!.lib));
    const missing = ids.flatMap((id) => [`views/${VIEW2[id]}.astro`, ...LIB2[id]].flatMap((f) => englishOf(path.join(SRC, f)).filter((en) => !(en in all)).map((en) => `${f}: ${en}`)));
    assert.deepEqual(missing, [], `${l}: 번역 없는 문장`);
    for (const id of ids) {
      const libs = { ...(DICTS[l].lib as Record<string, Record<string, string>>), ...(DICTS2[l]!.lib as Record<string, Record<string, string>>) };
      const sections = libTextOf(VIEW2[id]);
      for (const s of sections) assert.ok(libs[s], `${l}: ${VIEW2[id]} 의 libText «${s}» 묶음이 없음`);
      const shipped: Record<string, string> = Object.assign({}, ...sections.map((s) => libs[s] ?? {}));
      const c = clientOf(VIEW2[id]);
      fs.writeFileSync(tmp, c.code);
      const need = [...englishOf(tmp), ...c.libs.flatMap((f) => englishOf(path.join(SRC, f)))];
      const notShipped = [...new Set(need)].filter((en) => !(en in shipped));
      assert.deepEqual(notShipped, [], `${l}: ${VIEW2[id]} 브라우저 스크립트 문장이 libText ${JSON.stringify(sections)} 에 없음`);
    }
  }
  fs.rmSync(tmp, { force: true });
});

test("2차 묶음 계산 라이브러리 — 추가 언어로 돌려도 영어가 남지 않는다(예시 입력)", () => {
  misses.clear();
  for (const l of EXTRA_LANGS) {
    const ids = pages2Of(l);
    if (ids.includes("wiring")) {
      const base = DEFAULT_STATE(l);
      const states: Partial<WiringState>[] = [
        {},
        { devices: [{ name: "X", unit: 1 }, { name: "Y", unit: 1 }, { name: "Z", unit: 300, bauds: [19200], parity: "none", unitRange: [1, 99] }], len: 1500, baud: 115200, conv: "d", dev: "ab" },
        { len: 1100, bias: false },
        { tpl: "rs485-4w", len: 1500 },
        { tpl: "rs485-4w", baud: 115200, devices: [{ name: "Q", unit: 2 }, { name: "R", unit: 2, bauds: [9600], parity: "odd" }] },
        { tpl: "rs232", rs232: "null3" },
        { tpl: "rs232", rs232: "nullFull", loopback: true },
        { tpl: "rs232", rs232: "straight" },
        { tpl: "4-20ma", loop: "2w", supply: 12, rRecv: 500 },
        { tpl: "4-20ma", loop: "3w" },
        { tpl: "4-20ma", loop: "4w", rRecv: 0 },
        { tpl: "npn-pnp", sensor: "npn", count: 4 },
        { tpl: "npn-pnp", sensor: "pnp", count: 1 },
        { tpl: "output", out: "relay", load: "ac" },
        { tpl: "output", out: "npn", load: "dc" },
        { tpl: "output", out: "pnp", load: "ac" },
      ];
      for (const s of states) {
        const r = buildWiring({ ...base, ...s }, l);
        JSON.stringify(r);
      }
      for (const t of TEMPLATES) fromEn(TEMPLATE_NAME[t].en, l);
    }
    if (ids.includes("multimeterCheck")) {
      const vs = [
        ...[0, 59, 61, 118, 200, 2000, 30, Infinity].flatMap((ohm) => [120, -1].map((rTerm) => rs485Ohm({ ohm, nodes: 3, rTerm, rBias: 560 }))),
        ...[0.5, 0.1, -0.5].map(rs485Idle),
        rs485CommonMode(2, 3), rs485CommonMode(11, 13), rs485CommonMode(-8, 0), rs485CommonMode(NaN, NaN),
        ...[0, -1, 2, 3.7, 3.9, 12, 20.2, 20.7, 22].map(loopCurrent),
        ...[[24, 30], [24, 23.5], [24, 22], [24, 19]].map(([a, b]) => supplyUnderLoad(a, b)),
        ...(["npn", "pnp"] as const).flatMap((t) => (["on", "off"] as const).flatMap((st) => [0.5, 8, 13, 23, 31].map((v) => sensorOutput(t, st, v, 24)))),
        ...[-30, -20, -9, -4, 0, 4, 9].map(rs232TxIdle),
        ...[0.3, 3, 9].map(groundDiff),
      ];
      for (const v of vs) verdictText("x", "y", v, l);
      for (const i of ITEMS) {
        fromEn(ITEM_NAME[i].en, l);
        probeSvg(i, l, "x");
      }
      for (const v of Object.values(LEVEL_NAME)) fromEn(v.en, l);
    }
    if (ids.includes("canDecoder")) {
      for (const v of [...Object.values(PGNS), ...Object.values(NMT_CMD), ...Object.values(HB_STATE), ...Object.values(SDO_ABORT), ...SPNS]) fromEn(v.en, l);
      for (const ix of [0x1000, 0x1001, 0x1003, 0x1005, 0x1008, 0x1009, 0x100a, 0x1010, 0x1011, 0x1014, 0x1016, 0x1017, 0x1018, 0x1400, 0x1600, 0x1800, 0x1a00, 0x2000, 0x6000, 0x1f00]) objectName(ix, l);
    }
    if (ids.includes("i2c")) for (const c of CHIPS) fromEn(c.kind.en, l), fromEn(c.pins.en, l);
    if (ids.includes("cableSelection")) {
      for (const u of USES) for (const x of [u.name, ...u.cable, ...u.check, ...u.src]) fromEn(x.en, l);
      for (const r of [rs485Check(9600, 100), rs485Check(115200, 900), rs485Check(9600, 1100), rs485Check(9600, 1300), rs232Check(10, 100), rs232Check(20, 100), rs232Check(40, 100), ethernetCheck("1G", 50), ethernetCheck("10G", 95), ethernetCheck("100M", 120)])
        for (const n of r.notes) fromEn(n.text.en, l);
    }
    if (ids.includes("modbusRtuTcp")) {
      for (const [txt, fmt] of [
        ["01 03 00 00 00 0A C5 CD", "auto"],
        ["01 03 00 00 00 0A 00 00", "auto"],
        ["00 01 00 00 00 06 01 03 00 00 00 0A", "auto"],
        ["00 01 00 05 00 09 00 03 00 00 00 0A", "tcp"],
        [":01030000000AF2\\r\\n", "auto"],
        [":01030000000aF0", "ascii"],
        ["00 01 00 00 00 03 FF 08 00", "auto"],
      ] as const) {
        const p = parseMbFrame(txt, fmt, l);
        for (const f of ["rtu", "tcp", "ascii"] as const) {
          JSON.stringify(buildFrame(f, p.unit, p.pdu, 7, l));
          convertNotes(p, f, l);
        }
      }
      for (const bad of ["", "0", ":0", ":0G", "01 02"]) {
        try {
          parseMbFrame(bad, "auto", l);
        } catch {
          /* 오류 문구도 번역 대상 */
        }
      }
    }
    if (ids.includes("xgtDecoder")) {
      for (const c of Object.keys(XGT_ERRORS)) errText(Number(c), l), errWhen(Number(c), l);
      for (const d of XGT_DEVICES) fromEn(d.en, l);
      const hx = (u: number[]) => u.map((x) => x.toString(16).padStart(2, "0")).join(" ");
      const reqs = [
        buildXgtRequest({ op: "read", vars: ["%DW100", "%DW101"], invoke: 1 }),
        buildXgtRequest({ op: "read-cont", vars: ["%DB200"], count: 6 }),
        buildXgtRequest({ op: "write", vars: ["%MX1603"], values: [1] }),
        buildXgtRequest({ op: "write", vars: ["%DL1"], values: [123456789] }),
        buildXgtRequest({ op: "write-cont", vars: ["%MB0"], values: [1, 2, 3] }),
      ];
      for (const r of reqs) JSON.stringify(decodeXgt(hx(r), { lang: l }));
      const head = [0x4c, 0x53, 0x49, 0x53, 0x2d, 0x58, 0x47, 0x54, 0, 0, 0, 1, 0xa0, 0x11, 1, 0, 14, 0, 0];
      const sum = (b: number[]) => b.reduce((a, x) => (a + x) & 0xff, 0);
      JSON.stringify(decodeXgt(hx([...head, sum(head), 0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]), { lang: l, pair: hx(reqs[0]) }));
      JSON.stringify(decodeXgt(hx([...head, sum(head), 0x55, 0, 2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0x34, 0x12]), { lang: l }));
      const nak = [...head.slice(0, 16), 10, 0, 0];
      JSON.stringify(decodeXgt(hx([...nak, sum(nak), 0x55, 0, 2, 0, 0, 0, 0xff, 0xff, 4, 0]), { lang: l }));
      const badHead = [0x4c, 0x47, 0x49, 0x53, 0, 0, 0, 0, 0, 0, 0, 0, 0xa0, 0x33, 1, 0, 9, 0, 0x12];
      JSON.stringify(decodeXgt(hx([...badHead, 0, 0x54, 0, 2, 0, 0, 0, 1, 0, 3, 0]), { lang: l }));
      for (const o of [{ op: "read" as const, vars: [] }, { op: "read-cont" as const, vars: ["%MB0", "%MB1"] }, { op: "read" as const, vars: ["%MW1", "%MD2"] }, { op: "read-cont" as const, vars: ["%MW0"], count: 2 }, { op: "read-cont" as const, vars: ["%MB0"], count: 0 }, { op: "write" as const, vars: ["%MW1"], values: [] }, { op: "write" as const, vars: ["%MW1"], values: [70000] }, { op: "read" as const, vars: ["%ZW1"] }]) {
        try {
          buildXgtRequest(o, l);
        } catch {
          /* 오류 문구도 번역 대상 */
        }
      }
      try {
        decodeXgt("4c 53", { lang: l });
      } catch {
        /* 짧은 프레임 */
      }
    }
  }
  assert.deepEqual([...misses], [], "번역 표에 없는 영어 문장");
});

// ---------------------------------------------------------------- 3차 묶음(scope.ts SCOPE3 · MORE) — PC 하드웨어 테스트 웹 도구 10개

const VIEW3: Record<Page3Id, string> = {
  micTest: "MicTestPage",
  keyboardTest: "KeyboardTestPage",
  webcamTest: "WebcamTestPage",
  speakerTest: "SpeakerTestPage",
  mouseTest: "MouseTestPage",
  gamepadTest: "GamepadTestPage",
  monitorTest: "MonitorTestPage",
  bsodCodes: "BsodCodesPage",
  batteryReport: "BatteryReportPage",
  barcodeTest: "BarcodeTestPage",
};
/** 화면(서버)이 쓰는 라이브러리 — 브라우저 스크립트가 가져오는 것은 clientOf 가 따로 찾는다 */
const LIB3: Record<Page3Id, string[]> = {
  micTest: [],
  keyboardTest: ["lib/keyboardLayout.ts"],
  webcamTest: [],
  speakerTest: ["lib/hwSignal.ts"],
  mouseTest: ["lib/inputTiming.ts"],
  gamepadTest: ["lib/hwSignal.ts"],
  monitorTest: [],
  bsodCodes: ["lib/bsod.ts"],
  batteryReport: ["lib/batteryReport.ts"],
  barcodeTest: ["lib/barcode.ts"],
};
/** 개인정보 줄(components/HwPrivacy.astro)을 쓰는 쪽 */
const HW3: readonly Page3Id[] = ["micTest", "keyboardTest", "webcamTest", "speakerTest", "mouseTest", "gamepadTest", "monitorTest"];
/** 그 언어가 번역한 3차 묶음 쪽 이름 */
const pages3Of = (l: (typeof EXTRA_LANGS)[number]) => (MORE[l] ?? []).filter((p): p is Scope3Path => p in SCOPE3).map((p) => SCOPE3[p]);
const allLibs = (l: (typeof EXTRA_LANGS)[number]) => ({ ...DICTS[l].lib, ...DICTS2[l]?.lib, ...DICTS3[l]?.lib }) as Record<string, Record<string, string>>;

test("3차 묶음 사전 — 번역 범위(MORE)의 쪽마다 기준판(ja)과 같은 모양의 글·도구 이름·개인정보 줄이 있다", () => {
  const ja3 = DICTS3.ja!;
  assert.deepEqual(Object.keys(ja3.pages).sort(), Object.values(SCOPE3).sort(), "ja 3차 묶음 쪽 글 = SCOPE3");
  assert.deepEqual(Object.keys(ja3.webTools).sort(), [...SCOPE3_PATHS].sort(), "ja 3차 묶음 도구 이름 = SCOPE3");
  for (const l of EXTRA_LANGS) {
    const ids = pages3Of(l);
    if (!ids.length) continue;
    const d = DICTS3[l];
    assert.ok(d, `${l}: MORE 에 3차 묶음 쪽이 있는데 i18n/index.ts DICTS3 에 ${l} 사전이 없음`);
    for (const id of ids) {
      const pg: unknown = (d.pages as Record<string, unknown>)[id];
      assert.ok(pg, `${l}: 3차 묶음 쪽 글 없음 — ${id}`);
      assert.deepEqual(shape(pg), shape((ja3.pages as Record<string, unknown>)[id]), `${l}: ${id} 쪽 글 모양이 ja 와 다름`);
    }
    for (const p of (MORE[l] ?? []).filter((x) => x in SCOPE3)) {
      const w = (d.webTools as Record<string, { name: string; blurb: string } | undefined>)[p];
      assert.ok(w?.name.trim() && w.blurb.trim(), `${l}: 도구 이름·소개 없음 — ${p}`);
    }
    if (ids.some((id) => HW3.includes(id))) assert.deepEqual(shape(d.hwPrivacy), shape(ja3.hwPrivacy), `${l}: hwPrivacy 가 없거나 ja 와 모양이 다름`);
    const empty: string[] = [];
    const walkS = (v: unknown, at: string) => {
      if (typeof v === "function") return walkS((v as (a: unknown) => unknown)(CTX), at);
      if (typeof v === "string") {
        if (!v.trim() && !/\.(more|ads|tester)\.|from\.none$/.test(at)) empty.push(at);
        return;
      }
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkS(x, `${at}.${k}`);
    };
    for (const id of ids) walkS((d.pages as Record<string, object>)[id], `${l}.${id}`);
    assert.deepEqual(empty, [], `${l}: 빈 문구`);
  }
});

test("3차 묶음 문구 — 1차·2차 묶음에 같은 영어 문장이 있으면 같은 번역, {n} 은 {} 수 안에서", () => {
  for (const l of EXTRA_LANGS) {
    const before: Record<string, string> = Object.assign({}, ...Object.values(DICTS[l].lib), ...Object.values(DICTS2[l]?.lib ?? {}));
    const seen = new Map<string, [string, string]>();
    for (const [sec, cat] of Object.entries(DICTS3[l]?.lib ?? {}))
      for (const [k, v] of Object.entries(cat as Record<string, string>)) {
        assert.ok(!(k in before) || before[k] === v, `${l}: «${k}» 가 1·2차 묶음과 3차 ${sec} 에서 다름`);
        const prev = seen.get(k);
        assert.ok(!prev || prev[1] === v, `${l}: «${k}» 가 ${prev?.[0]} 와 ${sec} 에서 다름`);
        seen.set(k, [sec, v]);
        assert.ok((k.match(/\{\}/g) ?? []).length >= Math.max(-1, ...[...v.matchAll(/\{(\d)\}/g)].map((x) => Number(x[1]))) + 1, `${l}: «${k}» 의 {n} 이 {} 수보다 큼`);
      }
  }
});

test("3차 묶음 — 쪽의 영어 문장마다 번역이 있고, 브라우저 스크립트가 쓰는 문장은 그 쪽이 싣는 묶음(libText)에 있다", () => {
  const tmp = path.join(SRC, "..", "node_modules", ".i18n-test-client3.ts");
  for (const l of EXTRA_LANGS) {
    const ids = pages3Of(l);
    if (!ids.length) continue;
    const libs = allLibs(l);
    const all: Record<string, string> = Object.assign({}, ...Object.values(libs));
    const missing = ids.flatMap((id) => [`views/${VIEW3[id]}.astro`, ...LIB3[id]].flatMap((f) => englishOf(path.join(SRC, f)).filter((en) => !(en in all)).map((en) => `${f}: ${en}`)));
    assert.deepEqual(missing, [], `${l}: 번역 없는 문장`);
    for (const id of ids) {
      const sections = libTextOf(VIEW3[id]);
      for (const s of sections) assert.ok(libs[s], `${l}: ${VIEW3[id]} 의 libText «${s}» 묶음이 없음`);
      const shipped: Record<string, string> = Object.assign({}, ...sections.map((s) => libs[s] ?? {}));
      const c = clientOf(VIEW3[id]);
      fs.writeFileSync(tmp, c.code);
      const need = [...englishOf(tmp), ...c.libs.flatMap((f) => englishOf(path.join(SRC, f)))];
      const notShipped = [...new Set(need)].filter((en) => !(en in shipped));
      assert.deepEqual(notShipped, [], `${l}: ${VIEW3[id]} 브라우저 스크립트 문장이 libText ${JSON.stringify(sections)} 에 없음`);
    }
  }
  fs.rmSync(tmp, { force: true });
});

test("3차 묶음 라이브러리 — 추가 언어로 돌려도 영어가 남지 않는다(블루스크린 코드 전부·GS1 AI 전부·채널·버튼 이름)", () => {
  misses.clear();
  for (const l of EXTRA_LANGS) {
    const ids = pages3Of(l);
    if (ids.includes("speakerTest")) for (const n of [2, 6, 8]) for (let i = 0; i < n; i++) channelLabel(i, n, l);
    if (ids.includes("gamepadTest")) for (const b of STANDARD_BUTTONS) tx(b, l);
    if (ids.includes("mouseTest")) for (const b of MOUSE_BUTTONS) tx(b, l);
    if (ids.includes("keyboardTest")) for (const k of LAYOUTS) tx(k, l);
    if (ids.includes("bsodCodes")) {
      for (const s of Object.values(STEPS)) tx(s, l);
      for (const b of BUGCHECKS) {
        tx(b.meaning, l);
        causesOf(b, l);
      }
    }
    if (ids.includes("batteryReport")) msg(l, "x", "2026-01-01 → 2026-06-01: 98.2 % → 91.0 % of design");
    if (ids.includes("barcodeTest")) {
      const ais = ["00", "01", "02", "10", "11", "12", "13", "15", "16", "17", "20", "21", "22", "240", "241", "30", "37", "400", "410", "414", "3100", "3101", "3102", "3103", "3104", "3105", "99"];
      const val = (ai: string) => (["11", "12", "13", "15", "16"].includes(ai) ? "260115" : ai === "17" ? "261100" : ai === "00" ? "106141412345678908" : ai === "01" ? "09506000134352" : ai === "02" ? "09506000134353" : ai.startsWith("310") ? "001250" : "AB12");
      const r = parseGs1(ais.map((a) => `(${a})${val(a)}`).join(""));
      assert.ok(r && r.fields.length === ais.length, "GS1 괄호 꼴 풀이");
      for (const f of r!.fields) {
        tx(f.name, l);
        if (f.note) tx(f.note, l);
      }
    }
  }
  assert.deepEqual([...misses], [], "번역 표에 없는 영어 문장");
});
