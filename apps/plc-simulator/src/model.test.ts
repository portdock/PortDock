// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test apps/plc-simulator/src/model.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addrText, checkRule, cleanLastOk, cleanRules, expandRule, fillSeries, handshakeRules, isBitAddr, isLoopback, nextRuleId, packWord, parseCommands, parseDevices, parseEndCode, parseNum, parseNumList, parseRuleAddr, parseState, parseWord, ruleAddrText, ruleSummary, runs, show16, showWord, sparse, STATE_APP, textWords, unpackWord, WORD_FMTS, type Rule } from "./model.ts";
import { DEV_INFO, DEVS } from "./devs.ts";

test("번호 표기: X·Y·B·W·ZR 는 16진, 나머지는 10진", () => {
  assert.equal(addrText("X", 0x1f), "X1F");
  assert.equal(addrText("ZR", 255), "ZRFF");
  assert.equal(addrText("D", 100), "D100");
  assert.deepEqual(
    DEVS.filter((d) => DEV_INFO[d].hex),
    ["X", "Y", "B", "W", "ZR"],
  );
});

test("번호 입력 읽기", () => {
  assert.equal(parseNum("D", "100"), 100);
  assert.equal(parseNum("D", " d100 "), 100);
  assert.equal(parseNum("X", "1F"), 31);
  assert.equal(parseNum("X", "x1f"), 31);
  assert.equal(parseNum("W", "0x10"), 16);
  assert.equal(parseNum("D", "1F"), null, "10진 디바이스에 16진 글자");
  assert.equal(parseNum("D", "-1"), null);
  assert.equal(parseNum("D", "65536"), null, "최대 65535");
  assert.equal(parseNum("D", ""), null);
  assert.equal(parseNum("M", "M"), null);
  assert.equal(parseNum("SM", "SM400"), 400);
});

test("비트 ↔ 워드: 번호가 작은 점이 비트 0", () => {
  const bits = [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0]; // 매뉴얼 예: M100~M115 = 1234H
  assert.equal(packWord(bits), 0x1234);
  assert.deepEqual(unpackWord(0x1234), bits);
  assert.equal(packWord(unpackWord(0xffff)), 0xffff);
});

test("워드 표시", () => {
  assert.equal(show16(0xfffe, "s16"), "-2");
  assert.equal(show16(0xab, "hex"), "00AB");
  assert.equal(show16(5, "bin"), "0000 0000 0000 0101");
  assert.equal(show16(65535, "u16"), "65535");
});

test("장애 대상 글", () => {
  assert.deepEqual(parseCommands("0401, 1401 0x0619"), [0x0401, 0x1401, 0x0619]);
  assert.deepEqual(parseCommands(""), []);
  assert.equal(parseCommands("04011"), null);
  assert.equal(parseCommands("zz"), null);
  assert.deepEqual(parseDevices("d, M m"), ["D", "M"]);
  assert.equal(parseDevices("D, Q"), null);
  assert.equal(parseEndCode("C051"), 0xc051);
  assert.equal(parseEndCode("0x4031"), 0x4031);
  assert.equal(parseEndCode("0"), null);
  assert.equal(parseEndCode("12345"), null);
});

test("0 이 아닌 칸만 저장하고 이어진 덩어리로 되살린다", () => {
  const m = sparse(10, [0, 5, 6, 0, 7]);
  assert.deepEqual(m, { "11": 5, "12": 6, "14": 7 });
  assert.deepEqual(runs(m), [
    [11, [5, 6]],
    [14, [7]],
  ]);
  assert.deepEqual(runs({ x: 1, "-1": 2, "70000": 3 }), []);
});

test("저장 파일 검사: 다른 프로그램·깨진 JSON 은 거절, 틀린 칸은 빼고 센다", () => {
  assert.deepEqual(parseState("{"), { error: "json" });
  assert.deepEqual(parseState(JSON.stringify({ app: "PortDock Modbus Slave" })), { error: "app" });
  const r = parseState(
    "﻿" +
      JSON.stringify({
        app: STATE_APP,
        version: 1,
        sizes: { D: 100, Q: 5, M: 0 },
        values: { D: { "1": 7, "2": 70000, x: 1 }, M: { "3": 1, "4": 2 }, Q: {} },
        points: { D: [{ addr: 1, type: "f32", order: "CDAB", name: "T" }, { addr: -1 }], Z: [] },
        sims: { D: [{ addr: 1, kind: "toggle" }] },
      }),
  );
  assert.ok("state" in r);
  assert.deepEqual(r.state.sizes, { D: 100 });
  assert.deepEqual(r.state.values, { D: { "1": 7 }, M: { "3": 1 } });
  assert.equal(r.state.points.D.length, 1);
  assert.equal(r.state.sims.D.length, 1);
  // Q·M0 크기, 70000·x·M4=2, Q 값, Z 칸 설정
  assert.equal(r.skipped, 7);
});

test("마지막 시작 설정", () => {
  assert.deepEqual(cleanLastOk({ transport: "udp", host: " 127.0.0.1 ", port: 5000, format: { frame: "4e", code: "ascii" } }), {
    transport: "udp",
    host: "127.0.0.1",
    port: 5000,
    format: { frame: "4e", code: "ascii" },
  });
  assert.equal(cleanLastOk({ transport: "serial", host: "x", port: 1, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "", port: 1, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "h", port: 70000, format: { frame: "3e", code: "binary" } }), null);
  assert.equal(cleanLastOk({ transport: "tcp", host: "h", port: 1, format: { frame: "1e", code: "binary" } }), null);
  assert.equal(cleanLastOk(null), null);
});

test("이 PC 안에서만 듣는 주소", () => {
  assert.ok(isLoopback("127.0.0.1"));
  assert.ok(isLoopback("localhost"));
  assert.ok(!isLoopback("0.0.0.0"));
  assert.ok(!isLoopback("192.168.0.10"));
});

// ---- 0.6.0: 워드 보기·채우기·써 넣기·조건 규칙

test("워드 보기: ASCII 는 아래 바이트 글자가 먼저, 바이트는 위·아래 10진", () => {
  assert.equal(showWord(0x4241, "ascii"), "AB");
  assert.equal(showWord(0x0041, "ascii"), "A");
  assert.equal(showWord(0, "ascii"), "\\0");
  assert.equal(showWord(0x0d5c, "ascii"), "\\\\\\x0D");
  assert.equal(parseWord("AB", "ascii"), 0x4241);
  assert.equal(parseWord("A", "ascii"), 0x0041);
  assert.equal(parseWord("\\x0D\\x0A", "ascii"), 0x0a0d);
  assert.equal(parseWord("ABC", "ascii"), null);
  assert.equal(parseWord("", "ascii"), null);
  assert.equal(parseWord("가", "ascii"), null);
  for (const v of [0, 0x41, 0x4241, 0x0d5c, 0xffff, 0x7f20]) assert.equal(parseWord(showWord(v, "ascii"), "ascii"), v, v.toString(16));
  assert.equal(showWord(0x1234, "bytes"), "18 52");
  assert.equal(parseWord("18 52", "bytes"), 0x1234);
  assert.equal(parseWord("0x12, 0x34", "bytes"), 0x1234);
  assert.equal(parseWord("256 0", "bytes"), null);
  assert.equal(parseWord("1", "bytes"), null);
  // 기존 형식은 그대로
  assert.equal(showWord(0xfffe, "s16"), "-2");
  assert.equal(parseWord("-2", "s16"), 0xfffe);
  assert.equal(parseWord("00ab", "hex"), 0xab);
  assert.equal(parseWord("0101", "bin"), 5);
  assert.equal(parseWord("70000", "u16"), null);
  assert.deepEqual(WORD_FMTS, ["u16", "s16", "hex", "bin", "ascii", "bytes"]);
});

test("범위 채우기·문자열·숫자 목록", () => {
  assert.deepEqual(fillSeries(4, 10, 5, false), [10, 15, 20, 25]);
  assert.deepEqual(fillSeries(3, 1, -1, false), [1, 0, 65535]);
  assert.deepEqual(fillSeries(3, 65535, 1, false), [65535, 0, 1]);
  assert.deepEqual(fillSeries(3, 5, 1, true), [1, 1, 1]);
  assert.deepEqual(fillSeries(2, 0, 1, true), [0, 0]);
  // «ABC» — 아래 바이트 먼저: 4241 0043, 끝 NUL 을 넣으면 홀수라 같은 자리에
  assert.deepEqual(textWords("ABC", true, false), [0x4241, 0x0043]);
  assert.deepEqual(textWords("ABC", true, true), [0x4241, 0x0043]);
  assert.deepEqual(textWords("AB", true, true), [0x4241, 0x0000]);
  assert.deepEqual(textWords("AB", false, false), [0x4142]);
  assert.deepEqual(textWords("A\\x0D", true, false), [0x0d41]);
  assert.equal(textWords("", true, true), null);
  assert.equal(textWords("한글", true, true), null);
  assert.deepEqual(parseNumList("1, 2 0x10;-1", false), [1, 2, 16, 65535]);
  assert.deepEqual(parseNumList("1 0 1", true), [1, 0, 1]);
  assert.deepEqual(parseNumList("1 2", true), { bad: "2" });
  assert.deepEqual(parseNumList("x", false), { bad: "x" });
  assert.deepEqual(parseNumList("  ", false), { bad: "" });
});

test("규칙 주소: 비트·워드·워드 안 비트, 16진 디바이스", () => {
  assert.deepEqual(parseRuleAddr("m100"), { dev: "M", no: 100 });
  assert.deepEqual(parseRuleAddr("D100.3"), { dev: "D", no: 100, bit: 3 });
  assert.deepEqual(parseRuleAddr("D100.f"), { dev: "D", no: 100, bit: 15 });
  assert.deepEqual(parseRuleAddr("X1F"), { dev: "X", no: 0x1f });
  assert.deepEqual(parseRuleAddr("W10.A"), { dev: "W", no: 0x10, bit: 10 });
  assert.deepEqual(parseRuleAddr("SM400"), { dev: "SM", no: 400 });
  assert.deepEqual(parseRuleAddr("SD10.1"), { dev: "SD", no: 10, bit: 1 });
  assert.deepEqual(parseRuleAddr("ZR1F"), { dev: "ZR", no: 0x1f });
  assert.deepEqual(parseRuleAddr("TN5"), { dev: "TN", no: 5 });
  assert.equal(parseRuleAddr("M100.1"), null, "비트 디바이스에 .비트");
  assert.equal(parseRuleAddr("D1F"), null, "10진 디바이스에 16진");
  assert.equal(parseRuleAddr("D100.10"), null);
  assert.equal(parseRuleAddr("Q1"), null);
  assert.equal(parseRuleAddr("D65536"), null);
  assert.equal(parseRuleAddr(""), null);
  assert.equal(ruleAddrText({ dev: "W", no: 0x1f, bit: 11 }), "W1F.B");
  assert.ok(isBitAddr({ dev: "D", no: 1, bit: 0 }) && isBitAddr({ dev: "M", no: 1 }) && !isBitAddr({ dev: "D", no: 1 }));
});

test("규칙 검사·요약·예제·범위로 여러 개", () => {
  const hs = handshakeRules(1, ["완료 켜기", "완료 끄기"]);
  assert.equal(hs.length, 2);
  assert.ok(hs.every((r) => checkRule(r) === null));
  assert.equal(ruleSummary(hs[0], "주기"), "M100 ON → 300 ms → M101 ON");
  assert.equal(ruleSummary(hs[1], "주기"), "M100 OFF → 0 ms → M101 OFF");
  assert.equal(nextRuleId(hs), 3);
  assert.equal(nextRuleId([]), 1);
  const base: Rule = { id: 1, name: "", enabled: true, cond: { kind: "word", at: { dev: "D", no: 0 }, op: "gt", value: 9 }, delayMs: 10, delayMaxMs: 50, actions: [{ at: { dev: "D", no: 1 }, op: "add", value: -2 }] };
  assert.equal(checkRule(base), null);
  assert.equal(ruleSummary(base, "주기"), "D0 > 9 → 10–50 ms → D1 -2");
  assert.equal(checkRule({ ...base, cond: { kind: "on", at: { dev: "D", no: 0 } } }), "condBit");
  assert.equal(checkRule({ ...base, cond: { kind: "word", at: { dev: "M", no: 0 }, op: "eq", value: 1 } }), "condWord");
  assert.equal(checkRule({ ...base, actions: [] }), "noActions");
  assert.equal(checkRule({ ...base, actions: [{ at: { dev: "D", no: 0 }, op: "on", value: 0 }] }), "actBit");
  assert.equal(checkRule({ ...base, actions: [{ at: { dev: "D", no: 0, bit: 2 }, op: "set", value: 1 }] }), "actWord");
  assert.equal(checkRule({ ...base, actions: [{ at: { dev: "D", no: 0 }, op: "set", value: 70000 }] }), "setRange");
  assert.equal(checkRule({ ...base, delayMs: -1 }), "delayRange");
  assert.equal(checkRule({ ...base, cond: { kind: "always" }, delayMs: 10, delayMaxMs: 0 }), "periodShort");
  assert.equal(checkRule({ ...base, cond: { kind: "always" }, delayMs: 100, delayMaxMs: 0 }), null);
  // 범위로 여러 개: M100→M101 을 3개, 간격 2 → M100·M102·M104
  const many = expandRule(hs[0], 3, 2, 10)!;
  assert.deepEqual(
    many.map((r) => [r.id, r.name, ruleSummary(r, "")]),
    [
      [10, "완료 켜기 (1)", "M100 ON → 300 ms → M101 ON"],
      [11, "완료 켜기 (2)", "M102 ON → 300 ms → M103 ON"],
      [12, "완료 켜기 (3)", "M104 ON → 300 ms → M105 ON"],
    ],
  );
  assert.equal(expandRule({ ...hs[0], cond: { kind: "on", at: { dev: "M", no: 65534 } } }, 3, 1, 1), null, "번호 넘침");
  assert.equal(expandRule(hs[0], 1, 5, 7)![0].name, "완료 켜기");
});

test("규칙 고르기(저장·파일): 틀린 것·겹친 번호는 빼고 센다", () => {
  const good = handshakeRules(1, ["a", "b"]);
  const r = cleanRules([...good, { ...good[0] }, { id: 9, cond: { kind: "on", at: { dev: "D", no: 1 } }, actions: [{ at: { dev: "M", no: 1 }, op: "on" }] }, { id: 10, cond: { kind: "zzz" }, actions: [] }, null, { id: 11, cond: { kind: "always" }, delayMs: 100, actions: [{ at: { dev: "D", no: 0 }, op: "add", value: 1 }] }]);
  assert.deepEqual(
    r.rules.map((x) => x.id),
    [1, 2, 11],
  );
  assert.equal(r.skipped, 4);
  assert.deepEqual(cleanRules("x"), { rules: [], skipped: 0 });
  // 저장 파일에 들어간 규칙
  const st = parseState(JSON.stringify({ app: STATE_APP, version: 1, sizes: {}, values: {}, points: {}, sims: {}, rules: [...good, { id: 3 }] }));
  assert.ok("state" in st);
  assert.equal(st.state.rules.length, 2);
  assert.equal(st.skipped, 1);
  const old = parseState(JSON.stringify({ app: STATE_APP, version: 1 }));
  assert.ok("state" in old);
  assert.deepEqual(old.state.rules, []);
});
