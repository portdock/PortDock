// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/lang.test.ts
// 화면 언어 구조(lang.ts)와 언어별 사전 — 열쇠가 영어 사전의 부분집합인지, 빈 값·빠진 자리표시({a})가 없는지, 영어로 떨어지는지.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseLang, detectLang, dicts, isUiLang, LANG_NAMES, LANGS, UI_LANGS } from "./lang.ts";
import { UI } from "./uiText.ts";
import { IO } from "./ioText.ts";
import { AR_TEXT } from "./autoReplyText.ts";
import { ALARM_TEXT } from "./alarmText.ts";
import { USAGE_TEXT } from "./usageText.ts";
import { JA_UI } from "./ja/ui.ts";
import { JA_IO } from "./ja/io.ts";
import { JA_AR } from "./ja/autoReply.ts";
import { JA_ALARM } from "./ja/alarm.ts";
import { JA_AI_COPY } from "./ja/aiCopy.ts";
import * as JA_PARTS from "./ja/parts.ts";
import { DE_UI } from "./de/ui.ts";
import { DE_IO } from "./de/io.ts";
import { DE_AR } from "./de/autoReply.ts";
import { DE_ALARM } from "./de/alarm.ts";
import { DE_AI_COPY } from "./de/aiCopy.ts";
import * as DE_PARTS from "./de/parts.ts";
import { tip, TIP_KEYS, TIP_MORE } from "./tips.ts";
import { buildAiCopy } from "./aiCopy.ts";

const APPS = ["hw-tester", "modbus-master", "modbus-slave", "netscan", "plc-simulator", "plot", "port-inspector", "scpi", "serial", "simulator", "tcp", "udp"];

/** 아직 사전이 없는 언어 하나(영어로 떨어지는지 볼 때) — 모두 붙으면 undefined */
const NOUI = LANGS.find((l) => !(UI_LANGS as readonly string[]).includes(l));

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** 추가 언어 사전 하나 검사 — 열쇠 ⊆ 영어, 빈 값 없음, 자리표시가 영어와 같음, 앞 빈칸(이어 붙이는 글)이 영어와 같음 */
function checkMore(name: string, en: Record<string, unknown>, more: Record<string, unknown>) {
  for (const [k, v] of Object.entries(more)) {
    assert.ok(k in en, `${name}: 영어 사전에 없는 열쇠 «${k}»`);
    if (typeof v === "string") {
      assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
      const e = en[k];
      if (typeof e === "string") {
        assert.deepEqual(holes(v), holes(e), `${name}.${k}: 자리표시가 영어와 다름`);
        assert.equal(v.startsWith(" "), e.startsWith(" "), `${name}.${k}: 앞 빈칸이 영어와 다름`);
      }
    } else if (Array.isArray(v)) {
      assert.ok(v.length > 0 && v.every((x) => typeof x === "string" && x.trim() !== ""), `${name}.${k}: 빈 목록·빈 값`);
    }
  }
}

test("언어 목록 — 사이트와 같은 12개, 이름이 다 있고 고를 수 있는 언어는 그 안에", () => {
  assert.deepEqual([...LANGS], ["ko", "en", "ja", "de", "es", "pt", "pl", "fr", "vi", "tr", "it", "id"]);
  for (const l of LANGS) assert.ok(LANG_NAMES[l]);
  for (const l of UI_LANGS) assert.ok((LANGS as readonly string[]).includes(l));
  assert.deepEqual([...UI_LANGS].slice(0, 4), ["ko", "en", "ja", "de"]);
});

test("Windows 표시 언어 → 처음 화면 언어(ja-JP → ja, 고를 수 없는 언어 → en)", () => {
  assert.equal(detectLang("ko-KR"), "ko");
  assert.equal(detectLang("ja-JP"), "ja");
  assert.equal(detectLang("ja"), "ja");
  assert.equal(detectLang("en-US"), "en");
  assert.equal(detectLang("de-DE"), "de");
  if (NOUI) assert.equal(detectLang(`${NOUI}-XX`), "en");
  assert.equal(detectLang(""), "en");
  assert.equal(detectLang(undefined), "en");
  assert.ok(isUiLang("ja"));
  assert.ok(isUiLang("de"));
  if (NOUI) assert.ok(!isUiLang(NOUI));
  assert.ok(!isUiLang("ja-JP"));
  assert.equal(baseLang("ja"), "en");
  assert.equal(baseLang("ko"), "ko");
});

test("번역이 없는 열쇠·빈 값은 영어로 떨어진다", () => {
  const d = dicts({ a: "가", b: "나" }, { a: "A", b: "B" }, { ja: { a: "あ", b: "" } });
  assert.equal(d.ja.a, "あ");
  assert.equal(d.ja.b, "B");
  assert.equal(d.de.a, "A");
  assert.equal(d.ko.a, "가");
  for (const l of LANGS) assert.deepEqual(Object.keys(d[l]).sort(), ["a", "b"]);
  // 실제 사전 — 일본어가 없는 언어는 영어 그대로
  if (NOUI) assert.equal(UI[NOUI].settings, "Settings");
  assert.equal(UI.de.settings, "Einstellungen");
  assert.equal(UI.ja.settings, "設定");
});

test("공용 사전 — 일본어 열쇠가 영어의 부분집합, 빈 값 없음", () => {
  checkMore("uiText", UI.en, JA_UI);
  checkMore("ioText", IO.en, JA_IO);
  checkMore("autoReplyText", AR_TEXT.en, JA_AR);
  checkMore("alarmText", ALARM_TEXT.en, JA_ALARM);
  checkMore("usageText", USAGE_TEXT.en, JA_PARTS.JA_USAGE);
  checkMore("uiText/de", UI.en, DE_UI);
  checkMore("ioText/de", IO.en, DE_IO);
  checkMore("autoReplyText/de", AR_TEXT.en, DE_AR);
  checkMore("alarmText/de", ALARM_TEXT.en, DE_ALARM);
  checkMore("usageText/de", USAGE_TEXT.en, DE_PARTS.DE_USAGE);
  for (const [name, more] of [...Object.entries(JA_PARTS), ...Object.entries(DE_PARTS)]) {
    for (const [k, v] of Object.entries(more)) {
      if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
    }
  }
  // 모든 언어의 사전이 영어와 같은 열쇠를 갖는다
  for (const l of LANGS) assert.deepEqual(Object.keys(UI[l]).sort(), Object.keys(UI.en).sort(), l);
});

test("앱 12개 사전 — 일본어 열쇠가 영어의 부분집합, 빈 값·자리표시 차이 없음", async () => {
  for (const app of APPS) {
    const { dict } = (await import(`../apps/${app}/src/i18n.ts`)) as { dict: Record<string, Record<string, string>> };
    const { ja } = (await import(`../apps/${app}/src/i18n.ja.ts`)) as { ja: Record<string, string> };
    checkMore(app, dict.en, ja);
    assert.ok(Object.keys(ja).length > 0, `${app}: 일본어 사전이 비었음`);
    for (const l of LANGS) assert.deepEqual(Object.keys(dict[l]).sort(), Object.keys(dict.en).sort(), `${app}/${l}`);
    // 빠진 열쇠는 영어
    for (const k of Object.keys(dict.en)) assert.equal(dict.ja[k], ja[k] || dict.en[k], `${app}.${k}`);
    const { de } = (await import(`../apps/${app}/src/i18n.de.ts`)) as { de: Record<string, string> };
    checkMore(`${app}/de`, dict.en, de);
    assert.ok(Object.keys(de).length > 0, `${app}: 독일어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.de[k], de[k] || dict.en[k], `${app}/de.${k}`);
  }
});

test("말풍선 — 일본어 열쇠가 영어 열쇠의 부분집합, 없는 열쇠는 영어", () => {
  const ja = TIP_MORE.ja!;
  const en = Object.fromEntries(TIP_KEYS.map((k) => [k, tip("en", k)!]));
  checkMore("tips", en, ja);
  for (const k of TIP_KEYS) assert.equal(tip("ja", k), ja[k] || tip("en", k));
  const de = TIP_MORE.de!;
  checkMore("tips/de", en, de);
  for (const k of TIP_KEYS) assert.equal(tip("de", k), de[k] || tip("en", k));
  if (NOUI) assert.equal(tip(NOUI, "baud"), tip("en", "baud"));
  assert.equal(tip("ja", "없는 열쇠"), undefined);
});

test("AI 복사 — 질문 틀은 화면 언어(ja), 번역이 없는 언어는 영어", () => {
  const ja = buildAiCopy({ lang: "ja", app: "PortDock Serial", log: [] }).text;
  assert.ok(ja.includes(JA_AI_COPY.situation!), ja);
  assert.ok(ja.includes("PortDock Serial"));
  const de = buildAiCopy({ lang: "de", app: "PortDock Serial", log: [] }).text;
  assert.ok(de.includes(DE_AI_COPY.situation!), de);
  const en = buildAiCopy({ lang: "en", app: "PortDock Serial", log: [] }).text;
  if (NOUI) assert.equal(buildAiCopy({ lang: NOUI, app: "PortDock Serial", log: [] }).text, en);
});
