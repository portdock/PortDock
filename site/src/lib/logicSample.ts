// 로직 분석기 캡처 해석기의 «예시 캡처» 세 개 — 빌드 때 logicSynth.ts 로 만든 합성 파일(실제 장비에서 뜬 것 아님).
// pages/tools/logic-capture/sample-*.ts 가 내려 주고, 시험(logicDecode.test.ts)도 같은 파일을 풀어 본다.
import { Wave, uartBytes, i2cOps, canFrames, spiTransfer, toSaleaeCsv, toSigrokCsv, toVcd } from "./logicSynth.ts";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Saleae Logic 2 CSV — UART 9600 8E1, Channel 0 = 요청(TX), Channel 1 = 응답(RX). 응답 다섯째 바이트의 패리티를 일부러 틀림 */
export function sampleUartCsv(): string {
  const tx = new Wave(1);
  const rx = new Wave(1);
  const o = { baud: 9600, parity: "even" as const, gapBits: 1 };
  const t1 = uartBytes(tx, 0.0005, ascii("READ 1\r\n"), o);
  uartBytes(rx, t1 + 0.004, ascii("OK 23.5\r\n"), { ...o, badParity: [4] });
  const end = t1 + 0.004 + 9 * 13 / 9600 + 0.0005;
  return toSaleaeCsv(
    [
      { name: "Channel 0", sig: tx.sig() },
      { name: "Channel 1", sig: rx.sig() },
    ],
    0,
    end,
  );
}

/** sigrok CSV — I2C 100 kHz, 2 MHz 샘플. 0x48 에 레지스터 0x00 쓰고 반복 시작으로 2바이트 읽기, 이어서 없는 장치 0x50 (NACK) */
export function sampleI2cCsv(): string {
  const scl = new Wave(1);
  const sda = new Wave(1);
  let t = 20e-6;
  t = i2cOps(
    scl,
    sda,
    t,
    [{ start: true }, { byte: 0x48 << 1, ack: true }, { byte: 0x00, ack: true }, { start: true }, { byte: (0x48 << 1) | 1, ack: true }, { byte: 0x19, ack: true }, { byte: 0x80, ack: false }, { stop: true }],
    100_000,
  );
  t += 50e-6;
  t = i2cOps(scl, sda, t, [{ start: true }, { byte: 0x50 << 1, ack: false }, { stop: true }], 100_000);
  const rate = 2e6;
  return toSigrokCsv(
    [
      { name: "SCL", sig: scl.sig() },
      { name: "SDA", sig: sda.sig() },
    ],
    rate,
    Math.ceil((t + 20e-6) * rate),
  );
}

/** VCD — CAN 500 kbit/s(CAN_RX) 세 프레임(마지막은 ACK 없음) + SPI 모드 0, 1 MHz 로 JEDEC ID 읽기(9F → EF 40 18) */
export function sampleCanVcd(): string {
  const can = new Wave(1);
  const br = 500_000;
  let t = 30e-6;
  t = canFrames(can, t, [{ id: 0x123, data: [0x11, 0x22, 0x33, 0x44] }, { id: 0x18ff50e5, ext: true, data: [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08] }], br, 20);
  t = canFrames(can, t, [{ id: 0x7df, data: [0x02, 0x01, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00], ack: false }], br, 20);
  const sck = new Wave(0);
  const mosi = new Wave(0);
  const miso = new Wave(0);
  const cs = new Wave(1);
  const s = spiTransfer(sck, mosi, miso, cs, 20e-6, [[0x9f, 0xff], [0x00, 0xef], [0x00, 0x40], [0x00, 0x18]], { hz: 1e6, mode: 0 });
  const end = Math.max(t, s) + 10e-6;
  return toVcd(
    [
      { name: "CAN_RX", sig: can.sig() },
      { name: "SCK", sig: sck.sig() },
      { name: "MOSI", sig: mosi.sig() },
      { name: "MISO", sig: miso.sig() },
      { name: "CS", sig: cs.sig() },
    ],
    0,
    end,
  );
}
