// node --test — SPI 모드(lib/spi.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { byteBits, modeInfo, notations, parseBytes, transferTime, wave } from "./spi.ts";

test("모드 → 샘플·시프트 엣지(Linux spi-summary 정의)", () => {
  assert.deepEqual(modeInfo(0), { mode: 0, cpol: 0, cpha: 0, sample: "rising", shift: "falling" });
  assert.deepEqual(modeInfo(1), { mode: 1, cpol: 0, cpha: 1, sample: "falling", shift: "rising" });
  assert.deepEqual(modeInfo(2), { mode: 2, cpol: 1, cpha: 0, sample: "falling", shift: "rising" });
  assert.deepEqual(modeInfo(3), { mode: 3, cpol: 1, cpha: 1, sample: "rising", shift: "falling" });
  assert.throws(() => modeInfo(4));
});

test("MSB/LSB first: 0x01 → 0000 0001 / 1000 0000", () => {
  assert.deepEqual(byteBits(0x01, true), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(byteBits(0x01, false), [1, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(byteBits(0xa5, true), [1, 0, 1, 0, 0, 1, 0, 1]);
});

test("파형: 샘플 엣지에서 그 비트가 안정되게 놓여 있다(모든 모드)", () => {
  for (const mode of [0, 1, 2, 3]) {
    const w = wave([0x9c], mode);
    const m = modeInfo(mode);
    const samples = w.edges.filter((e) => e.action === "sample");
    assert.equal(samples.length, 8);
    samples.forEach((e, i) => {
      assert.equal(e.dir, m.sample);
      const b = w.bits[i];
      // 샘플 시점이 비트 칸 안쪽(경계가 아님)
      assert.ok(b.t0 < e.t && e.t < b.t1, `mode ${mode} bit ${i}`);
    });
    // 시프트 엣지는 비트 경계
    for (const e of w.edges.filter((x) => x.action === "shift")) assert.ok(w.bits.some((b) => b.t0 === e.t || b.t1 === e.t));
    // SCK 는 쉼 상태(CPOL)에서 시작하고 끝난다
    assert.equal(w.sck[0][1], m.cpol);
    assert.equal(w.sck[w.sck.length - 1][1], m.cpol);
  }
  // CPHA 0 은 첫 비트가 첫 엣지 전(t = 0)부터, CPHA 1 은 첫 엣지(t = 1)부터
  assert.equal(wave([1], 0).bits[0].t0, 0);
  assert.equal(wave([1], 1).bits[0].t0, 1);
  assert.equal(wave([1], 3).edges[0].dir, "falling");
  assert.equal(wave([1], 3).edges[0].action, "shift");
});

test("전송 시간: 1 MHz 4바이트 = 32 µs, 10 MHz 256바이트 = 204.8 µs", () => {
  assert.equal(transferTime(4, 1e6), 32e-6);
  assert.ok(Math.abs(transferTime(256, 10e6) - 204.8e-6) < 1e-12);
});

test("표기: PIC CKE·MSP430 UCCKPH 는 CPHA 의 반대", () => {
  assert.deepEqual(notations(0), { generic: "CPOL=0 CPHA=0", linux: "SPI_MODE_0", arduino: "SPI_MODE0", msp430: "UCCKPL=0 UCCKPH=1", pic: "CKP=0 CKE=1" });
  assert.equal(notations(3).pic, "CKP=1 CKE=0");
  assert.deepEqual(parseBytes("0x9F 00, 00"), [0x9f, 0, 0]);
  assert.throws(() => parseBytes("9F0"));
});
