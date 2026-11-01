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
import { JA_ALARM, JA_KIND as JA_ALARM_KIND } from "./ja/alarm.ts";
import { JA_AI_COPY } from "./ja/aiCopy.ts";
import * as JA_PARTS from "./ja/parts.ts";
import { ES_UI } from "./es/ui.ts";
import { ES_IO } from "./es/io.ts";
import { ES_AR } from "./es/autoReply.ts";
import { ES_ALARM } from "./es/alarm.ts";
import { ES_AI_COPY } from "./es/aiCopy.ts";
import * as ES_PARTS from "./es/parts.ts";
import { PT_UI } from "./pt/ui.ts";
import { PT_IO } from "./pt/io.ts";
import { PT_AR } from "./pt/autoReply.ts";
import { PT_ALARM } from "./pt/alarm.ts";
import { PT_AI_COPY } from "./pt/aiCopy.ts";
import * as PT_PARTS from "./pt/parts.ts";
import { FR_UI } from "./fr/ui.ts";
import { FR_IO } from "./fr/io.ts";
import { FR_AR } from "./fr/autoReply.ts";
import { FR_ALARM } from "./fr/alarm.ts";
import { FR_AI_COPY } from "./fr/aiCopy.ts";
import * as FR_PARTS from "./fr/parts.ts";
import { IT_UI } from "./it/ui.ts";
import { IT_IO } from "./it/io.ts";
import { IT_AR } from "./it/autoReply.ts";
import { IT_ALARM } from "./it/alarm.ts";
import { IT_AI_COPY } from "./it/aiCopy.ts";
import * as IT_PARTS from "./it/parts.ts";
import { DE_UI } from "./de/ui.ts";
import { DE_IO } from "./de/io.ts";
import { DE_AR } from "./de/autoReply.ts";
import { DE_ALARM } from "./de/alarm.ts";
import { DE_AI_COPY } from "./de/aiCopy.ts";
import * as DE_PARTS from "./de/parts.ts";
import { PL_UI } from "./pl/ui.ts";
import { PL_IO } from "./pl/io.ts";
import { PL_AR } from "./pl/autoReply.ts";
import { PL_ALARM } from "./pl/alarm.ts";
import { PL_AI_COPY } from "./pl/aiCopy.ts";
import * as PL_PARTS from "./pl/parts.ts";
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
  assert.deepEqual([...UI_LANGS], [...LANGS]);
});

test("Windows 표시 언어 → 처음 화면 언어(ja-JP → ja, 고를 수 없는 언어 → en)", () => {
  assert.equal(detectLang("ko-KR"), "ko");
  assert.equal(detectLang("ja-JP"), "ja");
  assert.equal(detectLang("ja"), "ja");
  assert.equal(detectLang("es-ES"), "es");
  assert.equal(detectLang("es-MX"), "es");
  assert.equal(detectLang("es-419"), "es");
  assert.equal(detectLang("pt-BR"), "pt");
  assert.equal(detectLang("pt-PT"), "pt");
  assert.equal(detectLang("fr-FR"), "fr");
  assert.equal(detectLang("it-IT"), "it");
  assert.equal(detectLang("en-US"), "en");
  assert.equal(detectLang("de-DE"), "de");
  assert.equal(detectLang("pl-PL"), "pl");
  if (NOUI) assert.equal(detectLang(`${NOUI}-XX`), "en");
  assert.equal(detectLang("tr-TR"), "tr");
  assert.equal(detectLang("vi-VN"), "vi");
  assert.equal(detectLang("id-ID"), "id");
  assert.equal(detectLang("xx-XX"), "en");
  assert.equal(detectLang(""), "en");
  assert.equal(detectLang(undefined), "en");
  assert.ok(isUiLang("ja"));
  assert.ok(isUiLang("es"));
  assert.ok(isUiLang("pt"));
  assert.ok(isUiLang("fr"));
  assert.ok(isUiLang("it"));
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
  assert.equal(UI.pl.settings, "Ustawienia");
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
  checkMore("uiText/pl", UI.en, PL_UI);
  checkMore("ioText/pl", IO.en, PL_IO);
  checkMore("autoReplyText/pl", AR_TEXT.en, PL_AR);
  checkMore("alarmText/pl", ALARM_TEXT.en, PL_ALARM);
  checkMore("usageText/pl", USAGE_TEXT.en, PL_PARTS.PL_USAGE);
  for (const [name, more] of [...Object.entries(JA_PARTS), ...Object.entries(DE_PARTS), ...Object.entries(PL_PARTS)]) {
    for (const [k, v] of Object.entries(more)) {
      if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
    }
  }
  checkMore("uiText/es", UI.en, ES_UI);
  checkMore("ioText/es", IO.en, ES_IO);
  checkMore("autoReplyText/es", AR_TEXT.en, ES_AR);
  checkMore("alarmText/es", ALARM_TEXT.en, ES_ALARM);
  checkMore("usageText/es", USAGE_TEXT.en, ES_PARTS.ES_USAGE);
  for (const [name, more] of Object.entries(ES_PARTS)) {
    for (const [k, v] of Object.entries(more)) {
      if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
    }
  }
  assert.equal(UI.es.settings, ES_UI.settings);
  checkMore("uiText/pt", UI.en, PT_UI);
  checkMore("ioText/pt", IO.en, PT_IO);
  checkMore("autoReplyText/pt", AR_TEXT.en, PT_AR);
  checkMore("alarmText/pt", ALARM_TEXT.en, PT_ALARM);
  checkMore("usageText/pt", USAGE_TEXT.en, PT_PARTS.PT_USAGE);
  for (const [name, more] of Object.entries(PT_PARTS)) {
    for (const [k, v] of Object.entries(more)) {
      if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
    }
  }
  assert.equal(UI.pt.settings, PT_UI.settings);
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
    const { es } = (await import(`../apps/${app}/src/i18n.es.ts`)) as { es: Record<string, string> };
    checkMore(`${app}/es`, dict.en, es);
    assert.ok(Object.keys(es).length > 0, `${app}: 스페인어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.es[k], es[k] || dict.en[k], `${app}/es.${k}`);
    const { pt } = (await import(`../apps/${app}/src/i18n.pt.ts`)) as { pt: Record<string, string> };
    checkMore(`${app}/pt`, dict.en, pt);
    assert.ok(Object.keys(pt).length > 0, `${app}: 포르투갈어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.pt[k], pt[k] || dict.en[k], `${app}/pt.${k}`);
    const { de } = (await import(`../apps/${app}/src/i18n.de.ts`)) as { de: Record<string, string> };
    checkMore(`${app}/de`, dict.en, de);
    assert.ok(Object.keys(de).length > 0, `${app}: 독일어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.de[k], de[k] || dict.en[k], `${app}/de.${k}`);
    const { pl } = (await import(`../apps/${app}/src/i18n.pl.ts`)) as { pl: Record<string, string> };
    checkMore(`${app}/pl`, dict.en, pl);
    assert.ok(Object.keys(pl).length > 0, `${app}: 폴란드어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.pl[k], pl[k] || dict.en[k], `${app}/pl.${k}`);
  }
});

test("말풍선 — 일본어 열쇠가 영어 열쇠의 부분집합, 없는 열쇠는 영어", () => {
  const ja = TIP_MORE.ja!;
  const en = Object.fromEntries(TIP_KEYS.map((k) => [k, tip("en", k)!]));
  checkMore("tips", en, ja);
  for (const k of TIP_KEYS) assert.equal(tip("ja", k), ja[k] || tip("en", k));
  const es = TIP_MORE.es!;
  checkMore("tips/es", en, es);
  for (const k of TIP_KEYS) assert.equal(tip("es", k), es[k] || tip("en", k));
  const pt = TIP_MORE.pt!;
  checkMore("tips/pt", en, pt);
  for (const k of TIP_KEYS) assert.equal(tip("pt", k), pt[k] || tip("en", k));
  const de = TIP_MORE.de!;
  checkMore("tips/de", en, de);
  for (const k of TIP_KEYS) assert.equal(tip("de", k), de[k] || tip("en", k));
  const pl = TIP_MORE.pl!;
  checkMore("tips/pl", en, pl);
  for (const k of TIP_KEYS) assert.equal(tip("pl", k), pl[k] || tip("en", k));
  if (NOUI) assert.equal(tip(NOUI, "baud"), tip("en", "baud"));
  assert.equal(tip("ja", "없는 열쇠"), undefined);
});

test("AI 복사 — 질문 틀은 화면 언어(ja), 번역이 없는 언어는 영어", () => {
  const ja = buildAiCopy({ lang: "ja", app: "PortDock Serial", log: [] }).text;
  assert.ok(ja.includes(JA_AI_COPY.situation!), ja);
  assert.ok(ja.includes("PortDock Serial"));
  const es = buildAiCopy({ lang: "es", app: "PortDock Serial", log: [] }).text;
  assert.ok(es.includes(ES_AI_COPY.situation!), es);
  const pt = buildAiCopy({ lang: "pt", app: "PortDock Serial", log: [] }).text;
  assert.ok(pt.includes(PT_AI_COPY.situation!), pt);
  const de = buildAiCopy({ lang: "de", app: "PortDock Serial", log: [] }).text;
  assert.ok(de.includes(DE_AI_COPY.situation!), de);
  const pl = buildAiCopy({ lang: "pl", app: "PortDock Serial", log: [] }).text;
  assert.ok(pl.includes(PL_AI_COPY.situation!), pl);
  const en = buildAiCopy({ lang: "en", app: "PortDock Serial", log: [] }).text;
  if (NOUI) assert.equal(buildAiCopy({ lang: NOUI, app: "PortDock Serial", log: [] }).text, en);
});

// 프랑스어(fr) — 일본어와 같은 검사
test("프랑스어 사전 — 공용·앱 12개·말풍선·AI 복사", async () => {
  checkMore("fr/uiText", UI.en, FR_UI);
  checkMore("fr/ioText", IO.en, FR_IO);
  checkMore("fr/autoReplyText", AR_TEXT.en, FR_AR);
  checkMore("fr/alarmText", ALARM_TEXT.en, FR_ALARM);
  checkMore("fr/usageText", USAGE_TEXT.en, FR_PARTS.FR_USAGE);
  for (const [name, more] of Object.entries(FR_PARTS)) {
    for (const [k, v] of Object.entries(more)) if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
  }
  assert.equal(UI.fr.settings, FR_UI.settings);
  for (const app of APPS) {
    const { dict } = (await import(`../apps/${app}/src/i18n.ts`)) as { dict: Record<string, Record<string, string>> };
    const { fr } = (await import(`../apps/${app}/src/i18n.fr.ts`)) as { fr: Record<string, string> };
    checkMore(`fr/${app}`, dict.en, fr);
    assert.ok(Object.keys(fr).length > 0, `${app}: 프랑스어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.fr[k], fr[k] || dict.en[k], `fr/${app}.${k}`);
  }
  const tfr = TIP_MORE.fr!;
  const ten = Object.fromEntries(TIP_KEYS.map((k) => [k, tip("en", k)!]));
  checkMore("fr/tips", ten, tfr);
  for (const k of TIP_KEYS) assert.equal(tip("fr", k), tfr[k] || tip("en", k));
  const t = buildAiCopy({ lang: "fr", app: "PortDock Serial", log: [] }).text;
  assert.ok(t.includes(FR_AI_COPY.situation!), t);
});

// 이탈리아어(it) — 일본어와 같은 검사
test("이탈리아어 사전 — 공용·앱 12개·말풍선·AI 복사", async () => {
  checkMore("it/uiText", UI.en, IT_UI);
  checkMore("it/ioText", IO.en, IT_IO);
  checkMore("it/autoReplyText", AR_TEXT.en, IT_AR);
  checkMore("it/alarmText", ALARM_TEXT.en, IT_ALARM);
  checkMore("it/usageText", USAGE_TEXT.en, IT_PARTS.IT_USAGE);
  for (const [name, more] of Object.entries(IT_PARTS)) {
    for (const [k, v] of Object.entries(more)) if (typeof v === "string") assert.ok(v.trim() !== "", `${name}.${k}: 빈 값`);
  }
  assert.equal(UI.it.settings, IT_UI.settings);
  for (const app of APPS) {
    const { dict } = (await import(`../apps/${app}/src/i18n.ts`)) as { dict: Record<string, Record<string, string>> };
    const { it } = (await import(`../apps/${app}/src/i18n.it.ts`)) as { it: Record<string, string> };
    checkMore(`it/${app}`, dict.en, it);
    assert.ok(Object.keys(it).length > 0, `${app}: 이탈리아어 사전이 비었음`);
    for (const k of Object.keys(dict.en)) assert.equal(dict.it[k], it[k] || dict.en[k], `it/${app}.${k}`);
  }
  const tit = TIP_MORE.it!;
  const ten = Object.fromEntries(TIP_KEYS.map((k) => [k, tip("en", k)!]));
  checkMore("it/tips", ten, tit);
  for (const k of TIP_KEYS) assert.equal(tip("it", k), tit[k] || tip("en", k));
  const t = buildAiCopy({ lang: "it", app: "PortDock Serial", log: [] }).text;
  assert.ok(t.includes(IT_AI_COPY.situation!), t);
});

// 일본어 다음에 붙인 언어(원천은 영어) — 일본어와 같은 검사를 언어마다
const MORE_LANGS = ["tr", "vi", "id"] as const;

for (const l of MORE_LANGS) {
  const U = l.toUpperCase();
  test(`추가 언어 ${l} — 공용·앱 12개·말풍선 사전이 영어의 부분집합, 빈 값·자리표시 차이 없음`, async () => {
    const ui = (await import(`./${l}/ui.ts`))[`${U}_UI`];
    const io = (await import(`./${l}/io.ts`))[`${U}_IO`];
    const ar = (await import(`./${l}/autoReply.ts`))[`${U}_AR`];
    const al = await import(`./${l}/alarm.ts`);
    const ai = (await import(`./${l}/aiCopy.ts`))[`${U}_AI_COPY`];
    const parts = await import(`./${l}/parts.ts`);
    const tips = (await import(`./${l}/tips.ts`))[`${U}_TIPS`];
    checkMore(`${l}/uiText`, UI.en, ui);
    checkMore(`${l}/ioText`, IO.en, io);
    checkMore(`${l}/autoReplyText`, AR_TEXT.en, ar);
    checkMore(`${l}/alarmText`, ALARM_TEXT.en, al[`${U}_ALARM`]);
    checkMore(`${l}/usageText`, USAGE_TEXT.en, parts[`${U}_USAGE`]);
    for (const [name, more] of Object.entries(parts)) {
      for (const [k, v] of Object.entries(more as Record<string, unknown>)) {
        if (typeof v === "string") assert.ok(v.trim() !== "", `${l}/${name}.${k}: 빈 값`);
      }
    }
    // 공용 부품 사전 — 일본어(기준판)에 있는 열쇠는 다 있다
    for (const [name, more] of Object.entries(JA_PARTS)) {
      const mine = parts[name.replace(/^JA_/, `${U}_`)];
      assert.ok(mine, `${l}: ${name} 짝이 없음`);
      for (const k of Object.keys(more)) assert.ok(k in mine, `${l}/${name}: 일본어에 있는 열쇠 «${k}» 가 없음`);
    }
    assert.deepEqual(Object.keys(al[`${U}_KIND`]).sort(), Object.keys(JA_ALARM_KIND).sort());
    assert.ok(ui.settings && UI[l].settings === ui.settings);
    // 앱 12개
    for (const app of APPS) {
      const { dict } = (await import(`../apps/${app}/src/i18n.ts`)) as { dict: Record<string, Record<string, string>> };
      const more = (await import(`../apps/${app}/src/i18n.${l}.ts`))[l] as Record<string, string>;
      checkMore(`${app}/${l}`, dict.en, more);
      assert.ok(Object.keys(more).length > 0, `${app}: ${l} 사전이 비었음`);
      for (const k of Object.keys(dict.en)) assert.equal(dict[l][k], more[k] || dict.en[k], `${app}.${k}`);
    }
    // 말풍선
    const en = Object.fromEntries(TIP_KEYS.map((k) => [k, tip("en", k)!]));
    checkMore(`${l}/tips`, en, tips);
    for (const k of TIP_KEYS) assert.equal(tip(l, k), tips[k] || tip("en", k));
    // AI 복사 질문 틀은 화면 언어
    const text = buildAiCopy({ lang: l, app: "PortDock Serial", log: [] }).text;
    assert.ok(text.includes(ai.situation), text);
  });

  test(`추가 언어 ${l} — 공용 창·Modbus·용어·판정 글 사전이 일본어(기준판) 열쇠를 다 갖고, 자리표시가 같다`, async () => {
    // 공용 창(dialogs)·Modbus(modbus) — 내보낸 사전마다 일본어 짝과 열쇠·자리표시 비교
    for (const mod of ["dialogs", "modbus"]) {
      const ja = await import(`./ja/${mod}.ts`);
      const mine = await import(`./${l}/${mod}.ts`);
      for (const [name, jv] of Object.entries(ja)) {
        const mv = mine[name.replace(/^JA_/, `${U}_`)];
        assert.ok(mv, `${l}/${mod}: ${name} 짝이 없음`);
        if (typeof jv === "string") {
          assert.ok(typeof mv === "string" && mv.trim() !== "", `${l}/${name}: 빈 값`);
          continue;
        }
        for (const [k, v] of Object.entries(jv as Record<string, unknown>)) {
          assert.ok(k in mv, `${l}/${name}: 일본어에 있는 열쇠 «${k}» 가 없음`);
          const m = mv[k];
          if (typeof v === "string") {
            assert.ok(typeof m === "string" && m.trim() !== "", `${l}/${name}.${k}: 빈 값`);
            assert.deepEqual(holes(m), holes(v), `${l}/${name}.${k}: 자리표시가 다름`);
          } else assert.deepEqual(Object.keys(m).sort(), Object.keys(v as object).sort(), `${l}/${name}.${k}`);
        }
      }
    }
    // 예시 명령 — 앞말이 붙고 예시 이름으로 알아본다
    const { serialExamples, scpiExamples, isExampleName } = await import("./examples.ts");
    const { [`${U}_EXAMPLE_PREFIX`]: prefix, [`${U}_EXAMPLES`]: names } = await import(`./${l}/dialogs.ts`);
    const exs = [...serialExamples("at", l), ...scpiExamples(l)];
    assert.ok(exs.every((c) => c.name.startsWith(prefix) && isExampleName(c.name)));
    assert.equal(serialExamples("at", l)[0].name, prefix + names["AT (check reply)"]);
    // 용어
    const { term, TERMS } = await import("./glossary.ts");
    const { JA_TERMS } = await import("./ja/glossary.ts");
    const terms = (await import(`./${l}/glossary.ts`))[`${U}_TERMS`];
    for (const id of Object.keys(JA_TERMS)) assert.ok(terms[id]?.[0]?.trim() && terms[id]?.[1]?.trim(), `${l}: 용어 «${id}» 가 없음`);
    for (const id of Object.keys(TERMS)) assert.deepEqual(term(id, l), terms[id] ?? TERMS[id].en);
    // 판정 글(txt) — 일본어에 있는 열쇠는 다 있고, 값의 자리표시는 열쇠의 것만, 한글·가나 섞임 없음
    const { JA_TEXT } = await import("./ja/text.ts");
    const tx = (await import(`./${l}/text.ts`))[`${U}_TEXT`];
    for (const k of Object.keys(JA_TEXT)) assert.ok(k in tx, `${l}/text: 열쇠 «${k}» 가 없음`);
    for (const [k, v] of Object.entries(tx as Record<string, string>)) {
      assert.ok(k in JA_TEXT, `${l}/text: 일본어에 없는 열쇠 «${k}»`);
      assert.ok(v.trim(), `${l}/text: 빈 값 ${k}`);
      const kh = new Set(holes(k));
      for (const h of holes(v)) assert.ok(kh.has(h), `${l}/text: ${k} → 값에 없는 자리 {${h}}`);
      assert.ok(!/[가-힣぀-ヿ]/.test(v), `${l}/text: 한글·가나 섞임 ${v}`);
    }
    const { txt } = await import("./textLang.ts");
    const { LEVEL_TEXT } = await import("./portinfo.ts");
    assert.equal(txt(LEVEL_TEXT.look, l), tx["Worth a look"]);
    assert.equal(txt({ ko: "x", en: "Problem code 10: Worth a look" }, l), tx["Problem code {a}: {b}"].replace("{a}", "10").replace("{b}", tx["Worth a look"]));
  });
}
