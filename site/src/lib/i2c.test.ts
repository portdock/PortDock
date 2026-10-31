// node --test — I2C(lib/i2c.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIPS, addr8, analyze, chipsAt, pullup, reserved, riseNs, tokenize } from "./i2c.ts";

const near = (a: number, b: number, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test("풀업 Rp: UM10204 §7.1 식을 손계산과 대조", () => {
  // 3.3 V, Fast-mode, 200 pF: (3.3 − 0.4) / 3 mA = 966.7 Ω, 300 ns / (0.8473 × 200 pF) = 1770.3 Ω
  const a = pullup(3.3, 200, "fm");
  near(a.rpMin, 966.67);
  near(a.rpMax, 1770.33);
  assert.equal(a.ok, true);
  // 5 V, Standard-mode, 400 pF: 1533.3 Ω ~ 2950.6 Ω
  const b = pullup(5, 400, "sm");
  near(b.rpMin, 1533.33);
  near(b.rpMax, 2950.55);
  // Fast-mode Plus 20 mA: (5 − 0.4) / 20 mA = 230 Ω, 120 ns / (0.8473 × 550 pF) = 257.5 Ω
  const c = pullup(5, 550, "fmp");
  near(c.rpMin, 230);
  near(c.rpMax, 257.5);
  // 400 pF Fast-mode 3.3 V: 최대 885 Ω < 최소 967 Ω → 맞는 저항 없음
  assert.equal(pullup(3.3, 400, "fm").ok, false);
  assert.equal(pullup(3.3, 450, "fm").overCb, true);
  // VDD ≤ 2 V: VOL = 0.2·VDD, 2 mA → 1.8 V: (1.8 − 0.36) / 2 mA = 720 Ω
  const d = pullup(1.8, 100, "fm");
  near(d.rpMin, 720);
  assert.equal(d.lowVdd, true);
  // 상승 시간은 Rp(max) 에서 정확히 tr
  near(riseNs(a.rpMax, 200), 300, 1e-6);
});

test("7비트 ↔ 8비트: 0x50 → 쓰기 0xA0, 읽기 0xA1; 0x68 → D0·D1", () => {
  assert.deepEqual(addr8(0x50), { write: 0xa0, read: 0xa1 });
  assert.deepEqual(addr8(0x68), { write: 0xd0, read: 0xd1 });
});

test("예약 주소(UM10204 표 4)", () => {
  assert.equal(reserved(0x00), "general");
  assert.equal(reserved(0x05), "hs");
  assert.equal(reserved(0x78), "ten");
  assert.equal(reserved(0x7f), "devid");
  assert.equal(reserved(0x50), undefined);
  // 표의 칩은 예약 주소를 쓰지 않는다
  for (const c of CHIPS) for (const a of c.addrs) assert.equal(reserved(a), undefined, c.chip);
  assert.ok(chipsAt(0x68).some((c) => c.chip.includes("DS3231")));
  assert.ok(CHIPS.length >= 30);
});

test("바이트 풀이: EEPROM 랜덤 읽기 «S A0 A 00 A Sr A1 A 12 N P»", () => {
  const s = analyze(tokenize("S 0xA0 A 0x00 A Sr 0xA1 A 0x12 N P"));
  assert.deepEqual(
    s.map((x) => x.kind),
    ["start", "addr", "data", "restart", "addr", "data", "stop"],
  );
  assert.equal(s[1].addr, 0x50);
  assert.equal(s[1].rw, "W");
  assert.equal(s[1].ack, true);
  assert.equal(s[2].from, "master");
  assert.equal(s[4].rw, "R");
  assert.equal(s[5].from, "slave");
  assert.equal(s[5].byte, 0x12);
  assert.equal(s[5].ack, false);
});

test("바이트 풀이: S/P 없는 HEX 나열은 첫 바이트가 주소, 주소 NACK", () => {
  const s = analyze(tokenize("D0 00 1F"));
  assert.equal(s[0].kind, "addr");
  assert.equal(s[0].addr, 0x68);
  assert.equal(s[2].n, 1);
  const n = analyze(tokenize("S 0x90 N P"));
  assert.equal(n[1].ack, false);
});

test("10비트 주소: 1111 0XX0 + 아래 8비트", () => {
  // 10비트 주소 0x2A5 → 첫 바이트 1111 0 10 0 = 0xF4, 둘째 0xA5
  const s = analyze(tokenize("S F4 A A5 A 33 A Sr F5 A 44 N P"));
  assert.equal(s[1].kind, "addr10");
  assert.equal(s[2].addr, 0x2a5);
  assert.equal(s[3].kind, "data");
  assert.equal(s[5].addr, 0x2a5);
  assert.equal(s[6].from, "slave");
  assert.throws(() => tokenize("S 0xZZ"));
});
