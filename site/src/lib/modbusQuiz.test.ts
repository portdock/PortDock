// Modbus 연습장 — 같은 시드면 같은 문제, 정답은 채점을 통과하고 오답은 떨어지며, 링크는 실제 가이드·웹 도구만
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crc16Modbus, parseHex } from "./checksum.ts";
import { decodeFrame } from "./modbusDecode.ts";
import { KINDS, addResult, emptyScore, grade, makeQuestion, parseScore, rng } from "./modbusQuiz.ts";

test("시드 재현", () => {
  const a = rng(42);
  const b = rng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  for (const lang of ["ko", "en"] as const) for (let s = 1; s < 50; s++) assert.deepEqual(makeQuestion(s, lang), makeQuestion(s, lang));
  assert.notDeepEqual(makeQuestion(1), makeQuestion(2));
});

test("모든 종류 × 여러 시드: 보기·정답·채점", () => {
  for (const kind of KINDS)
    for (const lang of ["ko", "en"] as const)
      for (let s = 0; s < 300; s++) {
        const q = makeQuestion(s * 7919 + 13, lang, kind);
        assert.equal(q.kind, kind);
        assert.ok(q.prompt && q.explain);
        if (q.choices) {
          assert.ok(q.choices.length >= 3, `${kind} ${s}`);
          assert.equal(new Set(q.choices).size, q.choices.length, `보기 중복 ${kind} ${s}`);
          assert.equal(q.choices[q.answerIndex!], q.answer);
          assert.ok(grade(q, q.answerIndex!));
          assert.ok(!grade(q, (q.answerIndex! + 1) % q.choices.length));
        } else {
          assert.ok(grade(q, q.answer));
          assert.ok(!grade(q, "12345678"));
        }
      }
});

test("문제 프레임은 CRC 가 맞고 해석기와 답이 같다", () => {
  for (let s = 0; s < 200; s++) {
    const w = makeQuestion(s, "en", "readWrite");
    const d = decodeFrame(parseHex(w.answer), "rtu", "en");
    assert.ok(d.crc!.ok);
    assert.equal(d.readings[0].role, "request");
    // 주관식은 띄어쓰기·소문자를 가리지 않는다
    assert.ok(grade(w, w.answer.replace(/ /g, "").toLowerCase()));

    const r = makeQuestion(s, "en", "respValue");
    const rd = decodeFrame(parseHex(r.shown!), "rtu", "en");
    assert.ok(rd.crc!.ok);
    const k = Number(/value of 4(\d{4})/.exec(r.prompt)![1]) - Number(/starting at 4(\d{4})/.exec(r.prompt)![1]);
    assert.equal(rd.readings.find((x) => x.role === "response")!.tables[0].values[k], Number(r.answer));
    assert.ok(grade(r, "0x" + Number(r.answer).toString(16)));

    const c = makeQuestion(s, "en", "crcOrder");
    const crc = crc16Modbus(parseHex(c.shown!));
    assert.equal(c.answer, [crc & 0xff, crc >> 8].map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" "));

    const e = makeQuestion(s, "en", "exception");
    const ed = decodeFrame(parseHex(e.shown!), "rtu", "en");
    assert.equal(ed.readings[0].role, "exception");
    assert.ok(e.answer.startsWith(e.shown!.split(" ")[2]));
  }
});

test("실수 문제 — 레지스터 2개, 정답은 유한한 수", () => {
  for (let s = 0; s < 50; s++) {
    const q = makeQuestion(s, "en", "floatOrder");
    assert.match(q.shown!, /^[0-9A-F]{4} [0-9A-F]{4}$/);
    assert.ok(Number.isFinite(Number(q.answer)));
  }
});

test("링크는 실제 가이드 slug·웹 도구 경로만", () => {
  const guides = new Set([...readFileSync(new URL("../data/guides.ts", import.meta.url), "utf8").matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => m[1]));
  const tools = new Set([...readFileSync(new URL("../data/webTools.ts", import.meta.url), "utf8").matchAll(/path: "(tools\/[^"]+)"/g)].map((m) => m[1]));
  for (const kind of KINDS)
    for (let s = 0; s < 20; s++) {
      const q = makeQuestion(s, "ko", kind);
      assert.ok(guides.has(q.guide), q.guide);
      assert.ok(tools.has(q.tool), q.tool);
    }
});

test("점수 — 연속 정답·최고 기록, 깨진 저장값", () => {
  let s = emptyScore();
  for (const ok of [true, true, false, true, true, true]) s = addResult(s, ok);
  assert.deepEqual(s, { tried: 6, right: 5, streak: 3, best: 3 });
  assert.deepEqual(parseScore(JSON.stringify(s)), s);
  assert.deepEqual(parseScore("{bad"), emptyScore());
  assert.deepEqual(parseScore(JSON.stringify({ tried: 1, right: 5 })), emptyScore());
  assert.deepEqual(parseScore(null), emptyScore());
});
