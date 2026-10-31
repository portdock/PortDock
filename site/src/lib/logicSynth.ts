// 로직 분석기 캡처 해석기의 시험·예시 파일용 파형 만들기 — UART·SPI·I2C·CAN 을 규칙대로 그려
// Saleae CSV·sigrok CSV·VCD 글로 쓴다. 실제 장비에서 뜬 캡처가 아니라 손으로 만든 합성 파형이다.
import { crc15 } from "./logicDecode.ts";
import type { Sig } from "./logicCapture.ts";

/** 값을 시각 순서로 적어 Sig 로 */
export class Wave {
  init: 0 | 1;
  cur: 0 | 1;
  times: number[] = [];
  constructor(init: 0 | 1) {
    this.init = init;
    this.cur = init;
  }
  set(t: number, v: 0 | 1) {
    if (v === this.cur) return;
    if (this.times.length && t < this.times[this.times.length - 1]) throw new Error("time goes back");
    this.cur = v;
    this.times.push(t);
  }
  sig(): Sig {
    return { init: this.init, t: Float64Array.from(this.times) };
  }
}

// ---------------------------------------------------------------- UART

export interface UartSynth {
  baud: number;
  dataBits?: number;
  parity?: "none" | "even" | "odd";
  stopBits?: 1 | 2;
  invert?: boolean;
  /** 바이트 사이 쉼(비트 수) */
  gapBits?: number;
  /** 이 순서의 바이트는 패리티를 일부러 틀리게 */
  badParity?: number[];
}

/** 바이트들을 UART 로 그린다 — 끝난 시각을 돌려준다 */
export function uartBytes(w: Wave, t: number, bytes: number[], o: UartSynth): number {
  const T = 1 / o.baud;
  const db = o.dataBits ?? 8;
  const inv = o.invert ? 1 : 0;
  const put = (v: number) => {
    w.set(t, ((v ^ inv) & 1) as 0 | 1);
    t += T;
  };
  bytes.forEach((b, idx) => {
    put(0);
    let ones = 0;
    for (let k = 0; k < db; k++) {
      const bit = (b >> k) & 1;
      ones += bit;
      put(bit);
    }
    if (o.parity && o.parity !== "none") {
      let p = o.parity === "even" ? ones & 1 : (ones & 1) ^ 1;
      if (o.badParity?.includes(idx)) p ^= 1;
      put(p);
    }
    for (let k = 0; k < (o.stopBits ?? 1); k++) put(1);
    for (let k = 0; k < (o.gapBits ?? 0); k++) put(1);
  });
  return t;
}

// ---------------------------------------------------------------- SPI

export interface SpiSynth {
  hz: number;
  mode: 0 | 1 | 2 | 3;
  msbFirst?: boolean;
  bits?: number;
}

/** CS 를 켜고 워드들을 주고받은 뒤 끈다 */
export function spiTransfer(sck: Wave, mosi: Wave, miso: Wave, cs: Wave, t: number, words: [number, number][], o: SpiSynth): number {
  const half = 1 / o.hz / 2;
  const cpol = (o.mode >> 1) as 0 | 1;
  const cpha = o.mode & 1;
  const nb = o.bits ?? 8;
  const bitOf = (v: number, k: number) => (((o.msbFirst ?? true) ? v >> (nb - 1 - k) : v >> k) & 1) as 0 | 1;
  sck.set(t, cpol);
  cs.set(t, 0);
  t += half;
  for (const [mo, mi] of words) {
    for (let k = 0; k < nb; k++) {
      if (cpha === 0) {
        // 앞 가장자리 전에 데이터를 놓고, 앞 가장자리에서 읽힌다
        mosi.set(t - half / 2, bitOf(mo, k));
        miso.set(t - half / 2, bitOf(mi, k));
        sck.set(t, (cpol ^ 1) as 0 | 1);
        t += half;
        sck.set(t, cpol);
        t += half;
      } else {
        // 앞 가장자리에서 데이터를 놓고 뒤 가장자리에서 읽힌다
        sck.set(t, (cpol ^ 1) as 0 | 1);
        mosi.set(t, bitOf(mo, k));
        miso.set(t, bitOf(mi, k));
        t += half;
        sck.set(t, cpol);
        t += half;
      }
    }
  }
  cs.set(t, 1);
  return t + half;
}

// ---------------------------------------------------------------- I2C

export type I2cOp = { start: true } | { stop: true } | { byte: number; ack: boolean };

/** I2C 동작들을 그린다(쉴 때 SCL·SDA 1) */
export function i2cOps(scl: Wave, sda: Wave, t: number, ops: I2cOp[], hz: number): number {
  const q = 1 / hz / 4;
  for (const op of ops) {
    if ("start" in op) {
      // (반복 시작이면 SCL 이 0 인 상태에서) SDA 1 → SCL 1 → SDA 0 → SCL 0
      sda.set(t, 1);
      t += q;
      scl.set(t, 1);
      t += q;
      sda.set(t, 0);
      t += q;
      scl.set(t, 0);
      t += q;
    } else if ("stop" in op) {
      sda.set(t, 0);
      t += q;
      scl.set(t, 1);
      t += q;
      sda.set(t, 1);
      t += 2 * q;
    } else {
      for (let k = 0; k < 9; k++) {
        const bit = k < 8 ? ((op.byte >> (7 - k)) & 1) : op.ack ? 0 : 1;
        sda.set(t, bit as 0 | 1);
        t += q;
        scl.set(t, 1);
        t += 2 * q;
        scl.set(t, 0);
        t += q;
      }
    }
  }
  return t;
}

// ---------------------------------------------------------------- CAN

export interface CanFrame {
  id: number;
  ext?: boolean;
  rtr?: boolean;
  data?: number[];
  dlc?: number;
  ack?: boolean;
  /** CRC 를 일부러 틀리게 */
  badCrc?: boolean;
}

/** 프레임 → 선 위의 비트(스터핑 포함, SOF ~ EOF) */
export function canBits(f: CanFrame): number[] {
  const b: number[] = [];
  const put = (v: number, m: number) => {
    for (let k = m - 1; k >= 0; k--) b.push(Math.floor(v / 2 ** k) & 1);
  };
  const data = f.rtr ? [] : (f.data ?? []);
  const dlc = f.dlc ?? data.length;
  b.push(0); // SOF
  if (f.ext) {
    put(Math.floor(f.id / 2 ** 18), 11);
    b.push(1, 1); // SRR, IDE
    put(f.id % 2 ** 18, 18);
    b.push(f.rtr ? 1 : 0, 0, 0); // RTR r1 r0
  } else {
    put(f.id, 11);
    b.push(f.rtr ? 1 : 0, 0, 0); // RTR IDE r0
  }
  put(dlc, 4);
  for (const x of data) put(x, 8);
  let crc = crc15(b);
  if (f.badCrc) crc ^= 1;
  put(crc, 15);
  // 스터핑(SOF ~ CRC)
  const s: number[] = [];
  let run = 0;
  let prev = -1;
  for (const v of b) {
    s.push(v);
    if (v === prev) run++;
    else {
      prev = v;
      run = 1;
    }
    if (run === 5) {
      const st = prev ^ 1;
      s.push(st);
      prev = st;
      run = 1;
    }
  }
  s.push(1, f.ack === false ? 1 : 0, 1, 1, 1, 1, 1, 1, 1, 1);
  return s;
}

export function canFrames(w: Wave, t: number, frames: CanFrame[], bitrate: number, idleBits = 11): number {
  const T = 1 / bitrate;
  for (const f of frames) {
    for (const v of canBits(f)) {
      w.set(t, v as 0 | 1);
      t += T;
    }
    for (let k = 0; k < idleBits; k++) {
      w.set(t, 1);
      t += T;
    }
  }
  return t;
}

// ---------------------------------------------------------------- 파일 글

export interface Named {
  name: string;
  sig: Sig;
}

/** 모든 채널의 변화 시각(겹치면 하나) */
function changeTimes(chs: Named[], start: number, end: number): number[] {
  const set = new Set<number>([start]);
  for (const c of chs) for (const t of c.sig.t) set.add(t);
  set.add(end);
  return [...set].filter((t) => t >= start && t <= end).sort((a, b) => a - b);
}

const at = (s: Sig, t: number) => {
  let n = 0;
  for (const x of s.t) if (x <= t) n++;
  return s.init ^ (n & 1);
};

/** Saleae Logic 2 «Export raw data» 모양(Time [s], 채널…; 바뀔 때만 한 줄, 마지막 시각도 한 줄) */
export function toSaleaeCsv(chs: Named[], start: number, end: number): string {
  const lines = [["Time [s]", ...chs.map((c) => c.name)].join(",")];
  for (const t of changeTimes(chs, start, end)) lines.push([t.toFixed(9), ...chs.map((c) => at(c.sig, t))].join(","));
  return lines.join("\n") + "\n";
}

/** sigrok CSV 모양 — 주석 머리, 샘플마다 한 줄(시간 열 없음) */
export function toSigrokCsv(chs: Named[], rate: number, samples: number): string {
  const lines = ["; CSV generated by PortDock (synthetic sample, sigrok-style)", `; Channels (${chs.length}/${chs.length}): ${chs.map((c) => c.name).join(", ")}`, `; Samplerate: ${rate >= 1e6 ? rate / 1e6 + " MHz" : rate / 1e3 + " kHz"}`];
  lines.push(chs.map((c) => c.name).join(","));
  const idx = chs.map(() => 0);
  const cur = chs.map((c) => c.sig.init);
  for (let n = 0; n < samples; n++) {
    const t = n / rate;
    chs.forEach((c, i) => {
      while (idx[i] < c.sig.t.length && c.sig.t[idx[i]] <= t + 1e-15) {
        cur[i] = (cur[i] ^ 1) as 0 | 1;
        idx[i]++;
      }
    });
    lines.push(cur.join(","));
  }
  return lines.join("\n") + "\n";
}

/** VCD — timescale 1 ns, 1비트 wire */
export function toVcd(chs: Named[], start: number, end: number, comment = "synthetic sample made by PortDock"): string {
  const ids = chs.map((_, i) => String.fromCharCode(33 + i));
  const L = [`$comment ${comment} $end`, "$timescale 1 ns $end", "$scope module top $end"];
  chs.forEach((c, i) => L.push(`$var wire 1 ${ids[i]} ${c.name} $end`));
  L.push("$upscope $end", "$enddefinitions $end");
  const ns = (t: number) => Math.round(t * 1e9);
  L.push(`#${ns(start)}`, "$dumpvars", ...chs.map((c, i) => `${c.sig.init}${ids[i]}`), "$end");
  const ev: [number, number, number][] = [];
  chs.forEach((c, i) => c.sig.t.forEach((t, k) => ev.push([ns(t), i, (c.sig.init ^ ((k + 1) & 1)) as number])));
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let last = -1;
  for (const [t, i, v] of ev) {
    if (t !== last) {
      L.push(`#${t}`);
      last = t;
    }
    L.push(`${v}${ids[i]}`);
  }
  if (ns(end) !== last) L.push(`#${ns(end)}`);
  return L.join("\n") + "\n";
}
