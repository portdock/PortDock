// 바코드 스캐너 테스트 — 키 → 글자, 간격 판정, 한/영 깨짐 되살리기, Caps Lock, 접두·접미, GS1 풀이
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeScan, checkOk, codeChar, commonAffix, gs1Check, hangulToKeys, keyToken, parseGs1, retailCode, visibleText, type KeyEv } from "./barcode.ts";

/** 글자열을 스캐너처럼 keydown 으로 — 대문자는 Shift, 기본 간격 4 ms */
function typeKeys(s: string, opt: { gap?: number; caps?: boolean; ime?: boolean; t0?: number } = {}): KeyEv[] {
  const gap = opt.gap ?? 4;
  let t = opt.t0 ?? 1000;
  const out: KeyEv[] = [];
  for (const c of s) {
    const ev: KeyEv = { t, key: c, code: "", shift: false, caps: !!opt.caps, ctrl: false, alt: false };
    if (c === "\r") Object.assign(ev, { key: "Enter", code: "Enter" });
    else if (c === "\t") Object.assign(ev, { key: "Tab", code: "Tab" });
    else if (c === "\x1d") Object.assign(ev, { key: "]", code: "BracketRight", ctrl: true });
    else if (/[a-z]/i.test(c)) {
      const shift = c === c.toUpperCase();
      // Caps Lock 이 켜져 있으면 Shift 와 반대로 나온다
      const typed = shift !== !!opt.caps ? c.toUpperCase() : c.toLowerCase();
      Object.assign(ev, { code: `Key${c.toUpperCase()}`, shift, key: opt.ime ? "Process" : typed });
    } else if (/\d/.test(c)) Object.assign(ev, { code: `Digit${c}`, key: opt.ime ? "Process" : c });
    else if (c === "-") Object.assign(ev, { code: "Minus" });
    out.push(ev);
    t += gap;
  }
  return out;
}

test("보이지 않는 글자 표시", () => {
  assert.equal(visibleText("A\r\n\tB\x1dC D\x04"), "A‹CR/Enter›‹LF›‹Tab›B‹GS›C␠D‹EOT›");
});

test("키 위치 → 미국 배열 글자", () => {
  assert.equal(codeChar("KeyA", false), "a");
  assert.equal(codeChar("KeyA", true), "A");
  assert.equal(codeChar("Digit1", true), "!");
  assert.equal(codeChar("Minus", false), "-");
  assert.equal(codeChar("Numpad7", false), "7");
  assert.equal(codeChar("F1", false), null);
});

test("Ctrl+] 는 GS(0x1D), 수식 키는 건너뜀, 글자 아닌 키는 이름", () => {
  assert.equal(keyToken({ t: 0, key: "]", code: "BracketRight", shift: false, caps: false, ctrl: true, alt: false })!.ch, "\x1d");
  assert.equal(keyToken({ t: 0, key: "Shift", code: "ShiftLeft", shift: true, caps: false, ctrl: false, alt: false }), null);
  assert.equal(keyToken({ t: 0, key: "F5", code: "F5", shift: false, caps: false, ctrl: false, alt: false })!.named, "F5");
});

test("스캐너 속도(4 ms) — 받은 글자·끝 키 Enter·판정 scanner", () => {
  const a = analyzeScan(typeKeys("ABC-123\r"), "ABC-123");
  assert.equal(a.received, "ABC-123\r");
  assert.equal(a.intended, "ABC-123\r");
  assert.equal(a.terminator, "\r");
  assert.equal(a.verdict, "scanner");
  assert.equal(a.median, 4);
  assert.equal(a.keys, 8);
  assert.equal(a.hangul, false);
  assert.equal(a.capsFlipped, 0);
});

test("손 입력 속도(120 ms) — human, 끝 키 없음", () => {
  const a = analyzeScan(typeKeys("1234", { gap: 120 }), "1234");
  assert.equal(a.verdict, "human");
  assert.equal(a.terminator, null);
  assert.equal(analyzeScan(typeKeys("12", { gap: 45 })).verdict, "unclear");
  assert.equal(analyzeScan(typeKeys("1")).verdict, "single");
});

test("한글 입력 상태로 스캔: 입력 칸은 «뮻123», 키 위치로 되살리면 «ABC123»", () => {
  const a = analyzeScan(typeKeys("ABC123\r", { ime: true }), "뮻123");
  assert.equal(a.hangul, true);
  assert.equal(a.received, "뮻123\r");
  assert.equal(a.intended, "ABC123\r");
});

test("한글 → 2벌식 키: 자모·음절·겹모음·겹받침·쌍자음", () => {
  assert.equal(hangulToKeys("ㅁㅠㅊ"), "abc");
  assert.equal(hangulToKeys("뮻"), "abc");
  assert.equal(hangulToKeys("뮻123"), "abc123");
  assert.equal(hangulToKeys("ㅃ괜"), "Qrhos");
  assert.equal(hangulToKeys("닭"), "ekfr");
  assert.equal(hangulToKeys("A-1"), "A-1");
});

test("Caps Lock 이 켜진 채 스캔하면 대소문자가 뒤바뀐다", () => {
  const a = analyzeScan(typeKeys("Ab1\r", { caps: true }));
  assert.equal(a.received, "aB1\r");
  assert.equal(a.intended, "Ab1\r");
  assert.equal(a.capsFlipped, 2);
  assert.equal(a.capsOn, true);
});

test("여러 스캔의 공통 접두·접미", () => {
  assert.deepEqual(commonAffix(["#A123\r", "#B9\r"]), { prefix: "#", suffix: "\r" });
  assert.deepEqual(commonAffix(["X\r"]), { prefix: "", suffix: "" });
  assert.deepEqual(commonAffix(["SAME\r", "SAME\r"]), { prefix: "", suffix: "" });
});

test("GS1 확인 숫자", () => {
  assert.equal(gs1Check("0950600013435"), 2);
  assert.ok(checkOk("09506000134352"));
  assert.ok(!checkOk("09506000134353"));
  assert.deepEqual(retailCode("8801234567893"), { kind: "EAN-13", ok: true, expect: 3 });
  assert.deepEqual(retailCode("8801234567890"), { kind: "EAN-13", ok: false, expect: 3 });
  assert.equal(retailCode("4006381333931")!.ok, true);
  assert.equal(retailCode("ABC"), null);
});

test("GS1: ]C1 + GS 구분 — 01 GTIN · 17 유효 기한 · 10 로트 · 21 일련번호", () => {
  const r = parseGs1("]C10109506000134352172812311" + "0ABC123\x1d21SN0001\r")!;
  assert.equal(r.symbology, "C1");
  assert.deepEqual(
    r.fields.map((f) => [f.ai, f.value]),
    [
      ["01", "09506000134352"],
      ["17", "281231"],
      ["10", "ABC123"],
      ["21", "SN0001"],
    ],
  );
  assert.equal(r.fields[0].note!.ko, "확인 숫자 맞음");
  assert.equal(r.fields[1].note!.en, "2028-12-31");
  assert.equal(r.noSeparator, false);
  assert.equal(r.rest, "");
});

test("GS1: 괄호 꼴, 일 00 은 그 달 말일, 기호 식별자 없이 01 로 시작", () => {
  const p = parseGs1("(01)09506000134352(17)270600(10)L1")!;
  assert.equal(p.fields.length, 3);
  assert.equal(p.fields[1].note!.ko, "2027-06 (그 달 말일)");
  const q = parseGs1("010950600013435310LOT7")!;
  assert.equal(q.fields[0].bad, true);
  assert.equal(q.fields[1].value, "LOT7");
  assert.equal(parseGs1("HELLO"), null);
  assert.equal(parseGs1("8801234567893"), null);
});

test("GS1: GS 가 빠져 가변 칸이 너무 길면 noSeparator", () => {
  const r = parseGs1("]d2010950600013435210ABCDEFGHIJKLMNOPQRSTUV21X")!;
  assert.equal(r.noSeparator, true);
  assert.equal(r.fields[1].ai, "10");
});

test("GS1: 3103 순중량 소수 3자리", () => {
  const r = parseGs1("]C13103001250")!;
  assert.equal(r.fields[0].note!.en, "1.250 kg");
});
