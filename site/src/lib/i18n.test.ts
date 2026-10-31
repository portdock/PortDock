// 여러 언어 일관성 시험 — 언어 목록(i18n/langs.ts)·번역 범위(i18n/scope.ts)·추가 언어 사전(i18n/<언어>/)·계산 라이브러리 문구 표가 서로 맞는지.
// 빌드 결과(사이트맵·hreflang)는 tools/site-check.mjs 가 따로 본다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_LANGS, EXTRA_LANGS, LANGS, LANG_META, url } from "../i18n/langs.ts";
import { SCOPE, SCOPE_PATHS, extraPages, isTranslated, langsOf, link, staticPaths } from "../i18n/scope.ts";
import { DICTS } from "../i18n/index.ts";
import { fromEn, misses, msg } from "./tr.ts";
import { decodeFrame } from "./modbusDecode.ts";
import { decodeMc, buildRequest as buildMc, endText } from "./mcDecode.ts";
import { parseHex, parseAscii } from "./checksum.ts";
import { parseRegisters, encodeValue } from "./modbusFloat.ts";
import { convert, signalStatus, countStatus } from "./analogScale.ts";
import { pair, parseCidr } from "./subnet.ts";
import { CONNECTORS, VIEWS, headCells, rowCells, pinoutSvg } from "./pinouts.ts";
import { buildRequest as buildMb } from "../../../shared/modbusBuild.ts";

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
  for (const p of SCOPE_PATHS) {
    assert.ok(page(p), `한국어 쪽 없음: ${p}`);
    assert.ok(page("en/" + p), `영어 쪽 없음: en/${p}`);
  }
  for (const l of EXTRA_LANGS) assert.ok(fs.existsSync(path.join(SRC, "pages", l, "[...path].astro")), `pages/${l}/[...path].astro 없음`);
  // 거꾸로: 추가 언어 폴더가 있는데 EXTRA_LANGS 에 빠진 경우(사이트맵·hreflang 에 안 나온다)
  for (const d of fs.readdirSync(path.join(SRC, "pages"), { withFileTypes: true }))
    if (d.isDirectory() && /^[a-z]{2}(-[a-z]{2})?$/.test(d.name) && d.name !== "en") assert.ok((EXTRA_LANGS as readonly string[]).includes(d.name), `pages/${d.name} 가 있는데 langs.ts EXTRA_LANGS 에 없음`);
  // getStaticPaths 가 만드는 주소 = 번역 범위
  assert.deepEqual(
    staticPaths().map((x) => x.props.path),
    SCOPE_PATHS,
  );
  assert.equal(extraPages().length, EXTRA_LANGS.length * SCOPE_PATHS.length);
});

test("번역된 쪽에만 그 언어가 붙고, 나머지 링크는 영어판으로", () => {
  for (const l of EXTRA_LANGS) {
    assert.deepEqual(langsOf("tools/checksum/"), [...CORE_LANGS, ...EXTRA_LANGS]);
    assert.deepEqual(langsOf("tools/adc/"), [...CORE_LANGS]);
    assert.ok(isTranslated(l, "download/#safe"));
    assert.equal(link(l, "guides/rs485-wiring/"), "/en/guides/rs485-wiring/");
    assert.equal(link(l, "tools/subnet/"), `/${l}/tools/subnet/`);
  }
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
