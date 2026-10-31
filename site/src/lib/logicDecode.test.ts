// UART·SPI·I2C·CAN 해석 — logicSynth.ts 로 규칙대로 그린 파형을 풀어 처음 값과 같은지(왕복), 오류를 잡는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeUart, estimateBaud, decodeSpi, decodeI2c, decodeCan, crc15, itemsCsv, valueText, type Item } from "./logicDecode.ts";
import { parseCapture } from "./logicCapture.ts";
import { Wave, uartBytes, spiTransfer, i2cOps, canFrames, canBits } from "./logicSynth.ts";
import { sampleUartCsv, sampleI2cCsv, sampleCanVcd } from "./logicSample.ts";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const vals = (it: Item[]) => it.filter((x) => x.kind === "byte").map((x) => x.v);

test("UART 8N1 왕복, 반전, 7E2·홀수 패리티", () => {
  const msg = ascii("Hello, PortDock!\r\n");
  for (const o of [
    { baud: 115200, dataBits: 8, parity: "none" as const, stopBits: 1 as const, invert: false },
    { baud: 9600, dataBits: 8, parity: "none" as const, stopBits: 1 as const, invert: true },
    { baud: 19200, dataBits: 7, parity: "even" as const, stopBits: 2 as const, invert: false },
    { baud: 57600, dataBits: 8, parity: "odd" as const, stopBits: 1 as const, invert: false },
  ]) {
    const w = new Wave(o.invert ? 0 : 1);
    const end = uartBytes(w, 1e-4, msg, { ...o, gapBits: 0 });
    const it = decodeUart(w.sig(), 0, end + 1e-3, o);
    assert.deepEqual(vals(it), o.dataBits === 7 ? msg.map((x) => x & 0x7f) : msg, JSON.stringify(o));
    assert.ok(it.every((x) => x.err.length === 0));
  }
});

test("UART 패리티 틀림·프레임 오류(보율 틀림)·브레이크", () => {
  const w = new Wave(1);
  const end = uartBytes(w, 1e-4, [0x31, 0x32, 0x33], { baud: 9600, parity: "even", badParity: [1], gapBits: 2 });
  const it = decodeUart(w.sig(), 0, end + 1e-3, { baud: 9600, dataBits: 8, parity: "even", stopBits: 1, invert: false });
  assert.deepEqual(
    it.map((x) => x.err),
    [[], ["parity"], []],
  );
  // 브레이크: 13비트 동안 0
  const b = new Wave(1);
  b.set(1e-3, 0);
  b.set(1e-3 + 13 / 9600, 1);
  const bi = decodeUart(b.sig(), 0, 5e-3, { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, invert: false });
  assert.equal(bi[0].kind, "break");
  assert.ok(bi[0].err.includes("frame"));
});

test("보율 추정: 115200·9600 → 표준 값, 잡음 펄스 하나는 무시", () => {
  for (const baud of [115200, 9600, 250000]) {
    const w = new Wave(1);
    w.set(5e-6, 0);
    w.set(5e-6 + 2e-8, 1); // 20 ns 잡음
    uartBytes(w, 1e-4, ascii("U~ PortDock 0123"), { baud, gapBits: 1 });
    const e = estimateBaud(w.sig());
    assert.ok(e);
    assert.equal(e.std, baud);
    assert.ok(Math.abs(e.raw / baud - 1) < 0.01);
  }
});

test("SPI 모드 0~3, MSB·LSB 먼저, CS 로 워드 맞춤", () => {
  const words: [number, number][] = [
    [0x9f, 0xff],
    [0x00, 0xef],
    [0xa5, 0x5a],
  ];
  for (const mode of [0, 1, 2, 3] as const) {
    for (const msbFirst of [true, false]) {
      const cpol = (mode >> 1) as 0 | 1;
      const sck = new Wave(cpol);
      const mosi = new Wave(0);
      const miso = new Wave(0);
      const cs = new Wave(1);
      let t = spiTransfer(sck, mosi, miso, cs, 1e-6, words, { hz: 1e6, mode, msbFirst });
      t = spiTransfer(sck, mosi, miso, cs, t + 5e-6, [[0x01, 0x80]], { hz: 1e6, mode, msbFirst });
      const it = decodeSpi(sck.sig(), mosi.sig(), miso.sig(), cs.sig(), 0, t + 1e-6, { mode, msbFirst, bits: 8, csActiveLow: true });
      const ws = it.filter((x) => x.kind === "word");
      assert.deepEqual(
        ws.map((x) => [x.v, x.miso]),
        [...words, [0x01, 0x80]],
        `mode ${mode} msb ${msbFirst}`,
      );
      assert.equal(it.filter((x) => x.kind === "cs").length, 4);
      assert.ok(it.every((x) => x.err.length === 0), `mode ${mode}`);
      // 모드를 잘못 고르면 CS 켤 때 SCK 수준이 다르다는 알림(CPOL 이 다를 때)
      const wrong = ((mode + 2) % 4) as 0 | 1 | 2 | 3;
      const bad = decodeSpi(sck.sig(), mosi.sig(), miso.sig(), cs.sig(), 0, t + 1e-6, { mode: wrong, msbFirst, bits: 8, csActiveLow: true });
      assert.ok(bad.some((x) => x.err.includes("mode")));
    }
  }
});

test("SPI: CS 가 중간에 꺼지면 «끝나지 않음»", () => {
  const sck = new Wave(0);
  const mosi = new Wave(0);
  const miso = new Wave(0);
  const cs = new Wave(1);
  const t = spiTransfer(sck, mosi, miso, cs, 1e-6, [[0xaa, 0x55]], { hz: 1e6, mode: 0, bits: 12 });
  const it = decodeSpi(sck.sig(), mosi.sig(), null, cs.sig(), 0, t, { mode: 0, msbFirst: true, bits: 16, csActiveLow: true });
  const w = it.find((x) => x.kind === "word")!;
  assert.deepEqual(w.err, ["partial"]);
  assert.equal(w.miso, undefined);
});

test("I2C: 시작·주소·쓰기·반복 시작·읽기·NACK·정지", () => {
  const scl = new Wave(1);
  const sda = new Wave(1);
  const t = i2cOps(scl, sda, 1e-5, [{ start: true }, { byte: 0x48 << 1, ack: true }, { byte: 0x00, ack: true }, { start: true }, { byte: (0x48 << 1) | 1, ack: true }, { byte: 0x19, ack: true }, { byte: 0x80, ack: false }, { stop: true }], 400_000);
  const it = decodeI2c(scl.sig(), sda.sig(), 0, t + 1e-5);
  assert.deepEqual(
    it.map((x) => x.kind),
    ["start", "addr", "data", "restart", "addr", "data", "data", "stop"],
  );
  assert.deepEqual([it[1].addr, it[1].rw, it[1].ack], [0x48, 0, true]);
  assert.deepEqual([it[4].addr, it[4].rw], [0x48, 1]);
  assert.deepEqual(
    it.filter((x) => x.kind === "data").map((x) => [x.v, x.ack]),
    [
      [0x00, true],
      [0x19, true],
      [0x80, false],
    ],
  );
  assert.equal(valueText(it[1], "ko"), "0x48 쓰기 · ACK");
});

test("I2C: 10비트 주소, 바이트 중간 정지", () => {
  const scl = new Wave(1);
  const sda = new Wave(1);
  const a10 = 0x2b4;
  let t = i2cOps(scl, sda, 1e-5, [{ start: true }, { byte: 0xf0 | ((a10 >> 8) << 1), ack: true }, { byte: a10 & 0xff, ack: true }, { byte: 0x42, ack: true }, { stop: true }], 100_000);
  const it = decodeI2c(scl.sig(), sda.sig(), 0, t);
  const ad = it.find((x) => x.kind === "addr")!;
  assert.deepEqual([ad.addr, ad.tenBit, ad.rw], [a10, true, 0]);
  assert.equal(it.find((x) => x.kind === "data")!.v, 0x42);
  // 4비트만 보내고 정지
  const s2 = new Wave(1);
  const d2 = new Wave(1);
  t = i2cOps(s2, d2, 1e-5, [{ start: true }], 100_000);
  for (let k = 0; k < 4; k++) {
    d2.set(t, 1);
    t += 2.5e-6;
    s2.set(t, 1);
    t += 5e-6;
    s2.set(t, 0);
    t += 2.5e-6;
  }
  t = i2cOps(s2, d2, t, [{ stop: true }], 100_000);
  const it2 = decodeI2c(s2.sig(), d2.sig(), 0, t);
  assert.ok(it2.some((x) => x.err.includes("partial")));
});

test("CRC-15/CAN 검사값: «123456789» → 0x059E", () => {
  const bits: number[] = [];
  for (const c of ascii("123456789")) for (let k = 7; k >= 0; k--) bits.push((c >> k) & 1);
  assert.equal(crc15(bits), 0x059e);
});

test("CAN: 표준·확장·원격 프레임 왕복, 스터핑, 비트 시간이 1% 어긋나도", () => {
  const frames = [
    { id: 0x123, data: [0x11, 0x22, 0x33, 0x44] },
    { id: 0x000, data: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] }, // 스터핑이 많은 프레임
    { id: 0x7ff, data: [0xff, 0xff] },
    { id: 0x18ff50e5, ext: true, data: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 0x321, rtr: true, dlc: 2 },
  ];
  for (const skew of [1, 1.01, 0.99]) {
    const w = new Wave(1);
    const end = canFrames(w, 50e-6, frames, 500_000 * skew);
    const it = decodeCan(w.sig(), 0, end + 1e-4, { bitrate: 500_000, samplePoint: 0.75 });
    assert.equal(it.length, frames.length, `skew ${skew}`);
    it.forEach((x, k) => {
      assert.deepEqual(x.err, [], `skew ${skew} frame ${k}`);
      assert.equal(x.id, frames[k].id);
      assert.equal(!!x.ext, !!frames[k].ext);
      assert.equal(!!x.rtr, !!frames[k].rtr);
      assert.deepEqual(x.data, frames[k].rtr ? [] : frames[k].data);
    });
    assert.equal(it[4].dlc, 2);
  }
  // 스터핑 비트가 실제로 들어갔는지
  assert.ok(canBits({ id: 0, data: [0, 0, 0, 0, 0, 0, 0, 0] }).length > 1 + 11 + 3 + 4 + 64 + 15 + 10);
});

test("CAN: CRC 틀림·ACK 없음·오류 플래그(우성 6비트)", () => {
  const w = new Wave(1);
  let t = canFrames(w, 50e-6, [{ id: 0x100, data: [0xde, 0xad], badCrc: true }, { id: 0x101, data: [1], ack: false }], 250_000);
  // 프레임 가운데에서 우성 8비트(오류 플래그 흉내)
  const T = 1 / 250_000;
  const bits = canBits({ id: 0x155, data: [0x55] });
  for (let k = 0; k < 20; k++) {
    w.set(t, bits[k] as 0 | 1);
    t += T;
  }
  w.set(t, 0);
  t += 8 * T;
  w.set(t, 1);
  t += 15 * T;
  t = canFrames(w, t, [{ id: 0x102, data: [2] }], 250_000);
  const it = decodeCan(w.sig(), 0, t, { bitrate: 250_000, samplePoint: 0.8 });
  assert.deepEqual(
    it.map((x) => x.id),
    [0x100, 0x101, 0x155, 0x102],
  );
  assert.ok(it[0].err.includes("crc"));
  assert.ok(it[1].err.includes("noack"));
  assert.ok(it[2].err.includes("stuff") && it[2].err.includes("errflag"));
  assert.deepEqual(it[3].err, []);
});

test("CAN FD 프레임(r0/FDF 열성)은 표시만 하고 풀지 않는다", () => {
  const w = new Wave(1);
  const T = 2e-6;
  let t = 20e-6;
  // SOF + ID 0x0AA + RTR(0) IDE(0) FDF(1) … 뒤는 열성
  const raw = [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  for (const v of raw) {
    w.set(t, v as 0 | 1);
    t += T;
  }
  const it = decodeCan(w.sig(), 0, t + 30 * T, { bitrate: 500_000, samplePoint: 0.75 });
  assert.equal(it.length, 1);
  assert.deepEqual(it[0].err, ["fd"]);
});

test("예시 파일 세 개를 읽어 풀면 만든 값 그대로", () => {
  const u = parseCapture(sampleUartCsv());
  assert.equal(u.format, "saleae-csv");
  const o = { baud: 9600, dataBits: 8, parity: "even" as const, stopBits: 1 as const, invert: false };
  const tx = decodeUart(u.channels[0], u.start, u.end, o);
  const rx = decodeUart(u.channels[1], u.start, u.end, o);
  assert.equal(String.fromCharCode(...(vals(tx) as number[])), "READ 1\r\n");
  assert.equal(String.fromCharCode(...(vals(rx) as number[])), "OK 23.5\r\n");
  assert.deepEqual(
    rx.map((x) => x.err.length > 0),
    [false, false, false, false, true, false, false, false, false],
  );
  assert.equal(estimateBaud(u.channels[0])?.std, 9600);

  const i = parseCapture(sampleI2cCsv());
  assert.equal(i.format, "sigrok-csv");
  assert.equal(i.rate, 2e6);
  const ii = decodeI2c(i.channels[0], i.channels[1], i.start, i.end);
  assert.deepEqual(
    ii.filter((x) => x.kind === "addr").map((x) => [x.addr, x.rw, x.ack]),
    [
      [0x48, 0, true],
      [0x48, 1, true],
      [0x50, 0, false],
    ],
  );

  const c = parseCapture(sampleCanVcd());
  assert.equal(c.format, "vcd");
  const names = c.channels.map((x) => x.name);
  const ch = (n: string) => c.channels[names.indexOf(n)];
  const cf = decodeCan(ch("CAN_RX"), c.start, c.end, { bitrate: 500_000, samplePoint: 0.875 });
  assert.deepEqual(
    cf.map((x) => [x.id, x.err]),
    [
      [0x123, []],
      [0x18ff50e5, []],
      [0x7df, ["noack"]],
    ],
  );
  const sp = decodeSpi(ch("SCK"), ch("MOSI"), ch("MISO"), ch("CS"), c.start, c.end, { mode: 0, msbFirst: true, bits: 8, csActiveLow: true });
  assert.deepEqual(
    sp.filter((x) => x.kind === "word").map((x) => x.miso),
    [0xff, 0xef, 0x40, 0x18],
  );
  // CSV 로 내보내기 — 머리 + 줄 수
  const csv = itemsCsv(cf, "en");
  assert.equal(csv.trim().split("\r\n").length, 4);
  assert.match(csv, /ID 0x123 · DLC 4 · 11 22 33 44 · CRC 0x[0-9A-F]{4} · ACK/);
});
