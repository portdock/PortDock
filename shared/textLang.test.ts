// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/textLang.test.ts
// 한·영 두 판 글(판정·점검 글)을 화면 언어로 — txt()
import { test } from "node:test";
import assert from "node:assert/strict";
import { txt } from "./textLang.ts";
import { LEVEL_TEXT } from "./portinfo.ts";
import { dur } from "./pcCheck.ts";
import { commLine } from "./devices.ts";

const T = (ko, en) => ({ ko, en });

test("ko·en 은 그대로, ja 는 사전, 다른 언어·없는 글은 영어", () => {
  assert.equal(txt(LEVEL_TEXT.look, "ko"), "볼 것");
  assert.equal(txt(LEVEL_TEXT.look, "en"), "Worth a look");
  assert.equal(txt(LEVEL_TEXT.look, "ja"), "確認推奨");
  assert.equal(txt(LEVEL_TEXT.look, "vi"), "Worth a look");
  // 백엔드 문구(사전에 없음)는 ja 에서 영어
  assert.equal(txt(T("장치를 시작할 수 없습니다", "This device cannot start."), "ja"), "This device cannot start.");
});

test("템플릿 글 — 자리 값을 끼우고, 끼운 값도 사전에 있으면 옮긴다", () => {
  assert.equal(txt(T("x", "Problem code 10: Worth a look"), "ja"), "問題コード 10: 確認推奨");
  assert.equal(txt(T("x", "Goes through 2 hub(s) — if it drops now and then, compare with plugging it straight into the PC."), "ja"), "ハブを 2 段経由しています — ときどき切れるなら、PC に直接挿した場合と比べてください。");
  assert.equal(txt(dur(90 * 60 + 0), "ja"), "1 時間 30 分");
  assert.equal(txt(dur(15 * 60), "ja"), "15 分");
  assert.equal(txt(dur(0), "ja"), "なし");
  // « · » 로 이은 글은 조각마다
  assert.equal(txt(T("x", "on · Worth a look · zzz"), "ja"), "オン · 確認推奨 · zzz");
});

test("짧은 틀은 숫자 자리만 — 아무 글에나 맞지 않는다", () => {
  assert.equal(txt(T("x", "Windows has updates"), "ja"), "Windows has updates");
  assert.equal(txt(T("x", "high h"), "ja"), "high h");
});

test("장비 통신 기본값 한 줄 — ja", () => {
  const d = { comm: { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, unit: 1, addressing: "zero" } };
  assert.equal(commLine(d, "ja"), "9600 8N1 · 局番 1 · マニュアルのアドレスは 0 基準");
  assert.equal(commLine(d, "en"), "9600 8N1 · Slave ID 1 · manual uses 0-based addresses");
});

test("예시 명령·용어·닫기 확인 — ja", async () => {
  const { serialExamples, isExampleName } = await import("./examples.ts");
  const ja = serialExamples("at", "ja");
  assert.equal(ja[0].name, "例: AT(応答の確認)");
  assert.ok(ja.every((c) => isExampleName(c.name)));
  assert.equal(serialExamples("at", "vi")[0].name, "e.g. AT (check reply)");
  const { term } = await import("./glossary.ts");
  assert.equal(term("jitter", "ja")[0], "ジッター ms");
  assert.equal(term("jitter", "vi")[0], "Jitter ms");
});

test("판정 글·장비 통신 기본값·예시 명령·용어 — de", async () => {
  assert.equal(txt(LEVEL_TEXT.look, "de"), "Ansehen");
  assert.equal(txt(dur(90 * 60), "de"), "1 Std. 30 Min.");
  assert.equal(txt(T("x", "Problem code 10: Worth a look"), "de"), "Problemcode 10: Ansehen");
  const d = { comm: { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, unit: 1, addressing: "zero" } };
  assert.equal(commLine(d, "de"), "9600 8N1 · Slave-Adresse 1 · Handbuch nutzt 0-basierte Adressen");
  const { serialExamples, isExampleName } = await import("./examples.ts");
  const ex = serialExamples("at", "de");
  assert.equal(ex[0].name, "z. B. AT (Antwort prüfen)");
  assert.ok(ex.every((c) => isExampleName(c.name)));
  const { term } = await import("./glossary.ts");
  assert.equal(term("checksum", "de")[0], "Prüfsumme");
});

test("판정 글·장비 통신 기본값·예시 명령·용어 — pl", async () => {
  assert.equal(txt(LEVEL_TEXT.look, "pl"), "Warto sprawdzić");
  assert.equal(txt(dur(90 * 60), "pl"), "1 godz. 30 min");
  assert.equal(txt(T("x", "Problem code 10: Worth a look"), "pl"), "Kod problemu 10: Warto sprawdzić");
  const d = { comm: { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, unit: 1, addressing: "zero" } };
  assert.equal(commLine(d, "pl"), "9600 8N1 · adres Slave 1 · instrukcja używa adresów od 0");
  const { serialExamples, isExampleName } = await import("./examples.ts");
  const ex = serialExamples("at", "pl");
  assert.equal(ex[0].name, "np. AT (sprawdź odpowiedź)");
  assert.ok(ex.every((c) => isExampleName(c.name)));
  const { term } = await import("./glossary.ts");
  assert.equal(term("checksum", "pl")[0], "Suma kontrolna");
});
