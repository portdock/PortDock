// 웹 도구 «로직 분석기 캡처 해석기» 의 해석 쪽 — 채널(logicCapture.ts 의 Sig)에서 UART·SPI·I2C·CAN 을 푼다.
// 순수 함수(브라우저·Node 시험 둘 다). 시험: logicDecode.test.ts(logicSynth.ts 로 만든 파형을 왕복).
// 근거:
//  - UART: 시작 비트(0)·데이터 5~9비트(LSB 먼저)·패리티·정지 비트(1) — Microchip ATmega328P 데이터시트 USART «Frame Formats».
//    수신 쪽은 비트 가운데에서 읽고, 첫 정지 비트가 0 이면 프레임 오류.
//  - SPI: 모드 = CPOL·CPHA, 모드 0·3 은 올라가는 클럭에서, 1·2 는 내려가는 클럭에서 읽기 — Microchip AVR151 표 1-3.
//  - I2C: SCL 이 1 일 때 SDA 가 내려가면 시작, 올라가면 정지, 데이터는 SCL 이 1 인 동안 읽기, 9번째 클럭이 ACK(0)/NACK(1),
//    첫 바이트 = 7비트 주소 + R/W, 11110xx 는 10비트 주소 — NXP UM10204 Rev. 7 §3.1.3~3.1.6·3.1.10·3.1.11.
//  - CAN: 우성 0·열성 1, SOF·ID 11(29)·RTR·IDE·r0·DLC·데이터·CRC 15·구분자·ACK·EOF 7, 같은 값 5비트 뒤 반대 비트 끼움(스터핑),
//    CRC 다항식 0x4599 — TI SLOA101B §3·4, Microchip MCP2515 데이터시트 DS20001801J §2·§6. 재동기화는 열성→우성 변화에서.
import { lowerBound, upperBound, valueAt, valueBefore, levelAfter, type Sig } from "./logicCapture.ts";

export type Kind = "byte" | "break" | "word" | "cs" | "start" | "restart" | "stop" | "addr" | "data" | "frame";
export type Err = "parity" | "frame" | "glitch" | "partial" | "mode" | "stuff" | "errflag" | "crc" | "form" | "noack" | "fd";

export interface Item {
  t0: number;
  t1: number;
  kind: Kind;
  /** 어느 채널 해석인지(UART 두 채널) */
  ch?: string;
  /** UART 바이트·SPI MOSI·I2C 데이터 */
  v?: number;
  /** SPI MISO */
  miso?: number;
  /** SPI CS 가 켜졌는지(true) 꺼졌는지 */
  on?: boolean;
  addr?: number;
  rw?: 0 | 1;
  tenBit?: boolean;
  ack?: boolean;
  id?: number;
  ext?: boolean;
  rtr?: boolean;
  dlc?: number;
  data?: number[];
  crc?: number;
  crcCalc?: number;
  err: Err[];
}

// ---------------------------------------------------------------- UART

export type Parity = "none" | "even" | "odd" | "mark" | "space";
export interface UartOpts {
  baud: number;
  dataBits: number;
  parity: Parity;
  stopBits: 1 | 1.5 | 2;
  /** 선이 거꾸로(쉴 때 0) — RS-232 레벨을 직접 뜬 경우 */
  invert: boolean;
  msbFirst?: boolean;
  ch?: string;
}

export function decodeUart(s: Sig, start: number, end: number, o: UartOpts): Item[] {
  const T = 1 / o.baud;
  const inv = o.invert ? 1 : 0;
  const lvl = (t: number) => valueAt(s, t) ^ inv;
  const pb = o.parity === "none" ? 0 : 1;
  const out: Item[] = [];
  const n = s.t.length;
  let i = lowerBound(s.t, start);
  while (i < n) {
    // 다음 «쉼(1) → 0» 변화
    while (i < n && (levelAfter(s, i) ^ inv) !== 0) i++;
    if (i >= n) break;
    const t0 = s.t[i];
    const tStop = t0 + (1.5 + o.dataBits + pb) * T;
    if (tStop > end) break;
    if (lvl(t0 + 0.5 * T) !== 0) {
      // 시작 비트 가운데에서 이미 1 — 잡음(글리치)
      i++;
      continue;
    }
    let v = 0;
    for (let k = 0; k < o.dataBits; k++) {
      const b = lvl(t0 + (1.5 + k) * T);
      if (o.msbFirst) v = (v << 1) | b;
      else v |= b << k;
    }
    const err: Err[] = [];
    let pbit = 0;
    if (pb) {
      pbit = lvl(t0 + (1.5 + o.dataBits) * T);
      let ones = pbit;
      for (let k = 0; k < o.dataBits; k++) ones += (v >> k) & 1;
      const ok =
        o.parity === "even" ? ones % 2 === 0 : o.parity === "odd" ? ones % 2 === 1 : o.parity === "mark" ? pbit === 1 : pbit === 0;
      if (!ok) err.push("parity");
    }
    const sb = lvl(tStop);
    let kind: Kind = "byte";
    if (sb !== 1) {
      err.push("frame");
      if (v === 0 && pbit === 0) kind = "break";
    }
    out.push({ t0, t1: t0 + (1 + o.dataBits + pb + o.stopBits) * T, kind, v, ch: o.ch, err });
    // 다음 시작 비트는 정지 비트 가운데 뒤에서 찾는다(프레임 오류면 선이 1 로 돌아온 뒤의 0)
    i = upperBound(s.t, tStop);
  }
  return out;
}

export const STD_BAUDS = [300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 31250, 38400, 57600, 76800, 115200, 128000, 230400, 250000, 256000, 460800, 500000, 921600, 1000000, 1500000, 2000000, 3000000, 4000000];

/**
 * 보율 추정 — 가장 짧은 펄스 무리(3번 넘게 나온 폭)를 1비트로 보고, 12비트보다 짧은 폭 전체를 비트 수로 나눠 다듬는다.
 * 표준 보율과 3% 안이면 그 값을 함께 준다.
 */
export function estimateBaud(s: Sig, start = -Infinity, end = Infinity, maxEdges = 200_000): { raw: number; std: number | null; pulses: number } | null {
  const a = lowerBound(s.t, start);
  const b = Math.min(upperBound(s.t, end), a + maxEdges);
  if (b - a < 3) return null;
  const d: number[] = [];
  for (let i = a + 1; i < b; i++) {
    const w = s.t[i] - s.t[i - 1];
    if (w > 0) d.push(w);
  }
  if (d.length < 2) return null;
  const sorted = [...d].sort((x, y) => x - y);
  const need = Math.max(3, Math.ceil(sorted.length * 0.002));
  let bit = 0;
  for (let i = 0; i < sorted.length; i++) {
    const x = sorted[i];
    let j = i;
    while (j < sorted.length && sorted[j] <= x * 1.3) j++;
    if (j - i >= Math.min(need, sorted.length - i)) {
      bit = sorted[Math.floor((i + j - 1) / 2)];
      break;
    }
  }
  if (!(bit > 0)) return null;
  let sum = 0;
  let bits = 0;
  for (const w of d) {
    const k = Math.round(w / bit);
    if (k >= 1 && k <= 12 && Math.abs(w / bit - k) < 0.3) {
      sum += w;
      bits += k;
    }
  }
  const raw = bits ? bits / sum : 1 / bit;
  let std: number | null = null;
  let best = 0.03;
  for (const x of STD_BAUDS) {
    const d = Math.abs(raw / x - 1);
    if (d <= best) {
      best = d;
      std = x;
    }
  }
  return { raw, std, pulses: d.length };
}

// ---------------------------------------------------------------- SPI

export interface SpiOpts {
  mode: 0 | 1 | 2 | 3;
  msbFirst: boolean;
  bits: number;
  csActiveLow: boolean;
}

export function decodeSpi(sck: Sig, mosi: Sig | null, miso: Sig | null, cs: Sig | null, start: number, end: number, o: SpiOpts): Item[] {
  const cpol = o.mode >> 1;
  const cpha = o.mode & 1;
  const sampleRising = (cpol ^ cpha) === 0;
  const act = o.csActiveLow ? 0 : 1;
  const out: Item[] = [];
  let nb = 0;
  let mo = 0;
  let mi = 0;
  let w0 = 0;
  let wl = 0;
  let active = cs ? valueAt(cs, start) === act : true;
  const flush = (t: number) => {
    if (nb > 0) out.push({ t0: w0, t1: t, kind: "word", v: mosi ? mo : undefined, miso: miso ? mi : undefined, err: ["partial"] });
    nb = 0;
    mo = 0;
    mi = 0;
  };
  const csT = cs ? cs.t : new Float64Array(0);
  let ci = lowerBound(csT, start);
  let ki = lowerBound(sck.t, start);
  const kEnd = upperBound(sck.t, end);
  const cEnd = upperBound(csT, end);
  while (ki < kEnd || ci < cEnd) {
    const tk = ki < kEnd ? sck.t[ki] : Infinity;
    const tc = ci < cEnd ? csT[ci] : Infinity;
    if (tc <= tk) {
      // CS 가 같은 시각이면 CS 먼저(켜짐은 클럭 전, 꺼짐은 마지막 클럭 뒤)
      const on = levelAfter(cs!, ci) === act;
      if (!on && active) flush(tc);
      if (on && !active) {
        nb = 0;
        mo = 0;
        mi = 0;
      }
      active = on;
      const err: Err[] = [];
      if (on && valueAt(sck, tc) !== cpol) err.push("mode");
      out.push({ t0: tc, t1: tc, kind: "cs", on, err });
      ci++;
      continue;
    }
    const rising = levelAfter(sck, ki) === 1;
    ki++;
    if (rising !== sampleRising || !active) continue;
    if (nb === 0) w0 = tk;
    const bo = mosi ? valueBefore(mosi, tk) : 0;
    const bi = miso ? valueBefore(miso, tk) : 0;
    if (o.msbFirst) {
      mo = (mo << 1) | bo;
      mi = (mi << 1) | bi;
    } else {
      mo |= bo << nb;
      mi |= bi << nb;
    }
    nb++;
    wl = tk;
    if (nb === o.bits) {
      out.push({ t0: w0, t1: wl, kind: "word", v: mosi ? mo >>> 0 : undefined, miso: miso ? mi >>> 0 : undefined, err: [] });
      nb = 0;
      mo = 0;
      mi = 0;
    }
  }
  if (nb > 0) flush(wl);
  return out;
}

// ---------------------------------------------------------------- I2C

export function decodeI2c(scl: Sig, sda: Sig, start: number, end: number): Item[] {
  const out: Item[] = [];
  let sclL = valueAt(scl, start);
  let sdaL = valueAt(sda, start);
  let inFrame = false;
  let expectAddr = false;
  /** 10비트 주소 첫 바이트(쓰기)를 받고 둘째를 기다림 */
  let tenHi: { hi: number; t0: number; ack: boolean } | null = null;
  let lastTen: number | null = null;
  let nb = 0;
  let byte = 0;
  let b0 = 0;
  let i = lowerBound(scl.t, start);
  let j = lowerBound(sda.t, start);
  const iEnd = upperBound(scl.t, end);
  const jEnd = upperBound(sda.t, end);
  // 반복 시작·정지 앞의 SCL 올림 한 번은 비트가 아니다 — 두 비트 넘게 받다 끊긴 것만 «끝나지 않음»
  const partial = (t: number) => {
    if (nb > 1) out.push({ t0: b0, t1: t, kind: "data", v: byte, err: ["partial"] });
    nb = 0;
    byte = 0;
  };
  const sclEdge = (t: number, v: 0 | 1) => {
    sclL = v;
    if (v !== 1 || !inFrame) return;
    if (nb < 8) {
      if (nb === 0) b0 = t;
      byte = (byte << 1) | sdaL;
      nb++;
      return;
    }
    // 9번째 클럭: ACK
    const ack = sdaL === 0;
    if (tenHi) {
      const addr = (tenHi.hi << 8) | byte;
      lastTen = addr;
      out.push({ t0: tenHi.t0, t1: t, kind: "addr", addr, rw: 0, tenBit: true, ack: tenHi.ack && ack, err: [] });
      tenHi = null;
    } else if (expectAddr) {
      expectAddr = false;
      const rw = (byte & 1) as 0 | 1;
      if ((byte & 0xf8) === 0xf0) {
        const hi = (byte >> 1) & 3;
        if (rw === 0) tenHi = { hi, t0: b0, ack };
        else
          out.push({ t0: b0, t1: t, kind: "addr", addr: lastTen !== null && lastTen >> 8 === hi ? lastTen : hi << 8, rw, tenBit: true, ack, err: [] });
      } else out.push({ t0: b0, t1: t, kind: "addr", addr: byte >> 1, rw, ack, err: [] });
    } else out.push({ t0: b0, t1: t, kind: "data", v: byte, ack, err: [] });
    nb = 0;
    byte = 0;
  };
  const sdaEdge = (t: number, v: 0 | 1) => {
    sdaL = v;
    if (sclL !== 1) return;
    if (v === 0) {
      // 시작·반복 시작
      if (inFrame) partial(t);
      out.push({ t0: t, t1: t, kind: inFrame ? "restart" : "start", err: [] });
      inFrame = true;
      expectAddr = true;
      tenHi = null;
      nb = 0;
      byte = 0;
    } else {
      if (inFrame) partial(t);
      out.push({ t0: t, t1: t, kind: "stop", err: [] });
      inFrame = false;
      expectAddr = false;
      tenHi = null;
    }
  };
  while (i < iEnd || j < jEnd) {
    const ti = i < iEnd ? scl.t[i] : Infinity;
    const tj = j < jEnd ? sda.t[j] : Infinity;
    if (ti < tj) {
      sclEdge(ti, levelAfter(scl, i));
      i++;
    } else if (tj < ti) {
      sdaEdge(tj, levelAfter(sda, j));
      j++;
    } else {
      // 같은 시각: SCL 이 내려가면 SCL 먼저(데이터 바뀜), 올라가면 SDA 먼저(데이터가 먼저 놓임)
      const sv = levelAfter(scl, i);
      if (sv === 0) {
        sclEdge(ti, sv);
        sdaEdge(tj, levelAfter(sda, j));
      } else {
        sdaEdge(tj, levelAfter(sda, j));
        sclEdge(ti, sv);
      }
      i++;
      j++;
    }
  }
  return out;
}

// ---------------------------------------------------------------- CAN

/** CAN CRC-15(다항식 0x4599, 처음 값 0) — SOF 부터 데이터 끝까지 스터핑 뺀 비트 */
export function crc15(bits: ArrayLike<number>): number {
  let crc = 0;
  for (let k = 0; k < bits.length; k++) {
    const nx = (bits[k] & 1) ^ ((crc >> 14) & 1);
    crc = (crc << 1) & 0x7fff;
    if (nx) crc ^= 0x4599;
  }
  return crc;
}

export interface CanOpts {
  bitrate: number;
  /** 샘플 포인트 0~1 (비트 시작에서) */
  samplePoint: number;
  invert?: boolean;
}

class StuffError extends Error {
  at: number;
  constructor(at: number) {
    super("stuff");
    this.at = at;
  }
}
class EndOfCapture extends Error {}

export function decodeCan(s: Sig, start: number, end: number, o: CanOpts): Item[] {
  const T = 1 / o.bitrate;
  const sp = Math.min(0.95, Math.max(0.05, o.samplePoint));
  const inv = o.invert ? 1 : 0;
  const lvl = (t: number) => valueAt(s, t) ^ inv;
  const out: Item[] = [];
  const n = s.t.length;
  const isFall = (i: number) => (levelAfter(s, i) ^ inv) === 0;
  /** i 번째 변화 앞의 열성(1) 길이 */
  const idleBefore = (i: number) => {
    const prev = i > 0 ? s.t[i - 1] : start;
    return s.t[i] - prev;
  };
  let i = lowerBound(s.t, start);
  const firstIdx = i;
  const recAtStart = lvl(start) === 1;

  while (i < n) {
    // SOF 찾기: 열성 → 우성, 앞에 열성이 10비트 이상(캡처 처음은 예외)
    while (i < n && !(isFall(i) && (idleBefore(i) >= 10 * T - T * 0.25 || (i === firstIdx && recAtStart)))) i++;
    if (i >= n) break;
    const sof = s.t[i];
    if (sof > end) break;
    // 비트 읽기(재동기화 포함)
    let sync = sof;
    let k = 0;
    let lastSample = sof;
    const raw = (): 0 | 1 => {
      const ts = sync + (k + sp) * T;
      if (ts > end) throw new EndOfCapture();
      lastSample = ts;
      const v = lvl(ts) as 0 | 1;
      // 다음 비트 경계 근처의 열성→우성 변화로 다시 맞춘다
      const nextB = sync + (k + 1) * T;
      let e = upperBound(s.t, ts);
      while (e < n && s.t[e] < sync + (k + 1 + sp) * T && !isFall(e)) e++;
      if (e < n && s.t[e] < sync + (k + 1 + sp) * T && Math.abs(s.t[e] - nextB) <= 0.5 * T) {
        sync = s.t[e];
        k = 0;
      } else k++;
      return v;
    };
    let run = 0;
    let prev = -1;
    const crcBits: number[] = [];
    const bit = (): 0 | 1 => {
      if (run === 5) {
        const st = raw();
        if (st === prev) throw new StuffError(lastSample);
        prev = st;
        run = 1;
      }
      const v = raw();
      if (v === prev) run++;
      else {
        prev = v;
        run = 1;
      }
      crcBits.push(v);
      return v;
    };
    const bits = (m: number) => {
      let x = 0;
      for (let q = 0; q < m; q++) x = x * 2 + bit();
      return x;
    };
    const it: Item = { t0: sof, t1: sof, kind: "frame", err: [] };
    try {
      bit(); // SOF
      let id = bits(11);
      const b12 = bit();
      const ide = bit();
      let rtr = false;
      if (ide) {
        id = id * 2 ** 18 + bits(18);
        rtr = bit() === 1;
        const r1 = bit();
        bit(); // r0
        it.ext = true;
        if (r1 === 1) it.err.push("fd");
      } else {
        rtr = b12 === 1;
        const r0 = bit();
        it.ext = false;
        if (r0 === 1) it.err.push("fd");
      }
      it.id = id;
      it.rtr = rtr;
      if (it.err.includes("fd")) {
        // CAN FD — 데이터 구간 속도가 달라 여기서는 풀지 않는다
        it.t1 = lastSample;
        out.push(it);
        i = upperBound(s.t, lastSample);
        continue;
      }
      const dlc = bits(4);
      it.dlc = dlc;
      const len = rtr ? 0 : Math.min(dlc, 8);
      const data: number[] = [];
      for (let q = 0; q < len; q++) data.push(bits(8));
      it.data = data;
      const calc = crc15(crcBits);
      it.crc = bits(15);
      it.crcCalc = calc;
      if (it.crc !== calc) it.err.push("crc");
      // CRC 끝이 같은 값 5비트면 끼운 비트가 하나 더 있다
      if (run === 5 && raw() === prev) throw new StuffError(lastSample);
      // 여기부터 스터핑 없음
      if (raw() !== 1) it.err.push("form"); // CRC 구분자
      const ackSlot = raw();
      if (ackSlot === 1) it.err.push("noack");
      if (raw() !== 1 && !it.err.includes("form")) it.err.push("form"); // ACK 구분자
      let eofBad = false;
      for (let q = 0; q < 7; q++) if (raw() !== 1) eofBad = true;
      if (eofBad && !it.err.includes("form")) it.err.push("form");
      it.t1 = sync + k * T;
      out.push(it);
      i = upperBound(s.t, lastSample);
    } catch (e) {
      if (e instanceof EndOfCapture) {
        if (it.id !== undefined) {
          it.err.push("partial");
          it.t1 = end;
          out.push(it);
        }
        break;
      }
      if (e instanceof StuffError) {
        it.err.push("stuff");
        // 우성 6비트 이상이면 오류 플래그(오류 프레임)일 수 있다
        const at = e.at;
        const a = upperBound(s.t, at);
        const from = a > 0 ? s.t[a - 1] : start;
        const to = a < n ? s.t[a] : end;
        if (lvl(at) === 0 && to - from >= 5.5 * T) it.err.push("errflag");
        it.t1 = at;
        out.push(it);
        i = upperBound(s.t, at);
        continue;
      }
      throw e;
    }
  }
  return out;
}

// ---------------------------------------------------------------- 글로

export type Lang = "ko" | "en";
const hex = (v: number, w = 2) => v.toString(16).toUpperCase().padStart(w, "0");
const printable = (v: number) => (v >= 0x20 && v < 0x7f ? `'${String.fromCharCode(v)}'` : v === 0x0d ? "\\r" : v === 0x0a ? "\\n" : v === 0x09 ? "\\t" : "");

export const ERR_TEXT: Record<Err, { ko: string; en: string }> = {
  parity: { ko: "패리티 틀림", en: "parity error" },
  frame: { ko: "프레임 오류(정지 비트 0)", en: "framing error (stop bit 0)" },
  glitch: { ko: "잡음", en: "glitch" },
  partial: { ko: "끝나지 않음", en: "incomplete" },
  mode: { ko: "CS 켤 때 SCK 가 모드와 다름", en: "SCK idle level does not match the mode" },
  stuff: { ko: "스터핑 오류(같은 값 6비트)", en: "stuff error (6 equal bits)" },
  errflag: { ko: "오류 프레임 후보(우성 6비트 이상)", en: "possible error frame (6+ dominant bits)" },
  crc: { ko: "CRC 틀림", en: "CRC mismatch" },
  form: { ko: "형식 오류(구분자·EOF 가 우성)", en: "form error (delimiter or EOF dominant)" },
  noack: { ko: "ACK 없음", en: "no ACK" },
  fd: { ko: "CAN FD 프레임 — 풀지 않음", en: "CAN FD frame — not decoded" },
};

export function kindText(it: Item, lang: Lang): string {
  const ko = lang === "ko";
  switch (it.kind) {
    case "byte":
      return ko ? "바이트" : "Byte";
    case "break":
      return ko ? "브레이크" : "Break";
    case "word":
      return ko ? "워드" : "Word";
    case "cs":
      return it.on ? (ko ? "CS 켜짐" : "CS on") : ko ? "CS 꺼짐" : "CS off";
    case "start":
      return ko ? "시작" : "Start";
    case "restart":
      return ko ? "반복 시작" : "Repeated start";
    case "stop":
      return ko ? "정지" : "Stop";
    case "addr":
      return ko ? "주소" : "Address";
    case "data":
      return ko ? "데이터" : "Data";
    case "frame":
      return ko ? "프레임" : "Frame";
  }
}

export function valueText(it: Item, lang: Lang, bits = 8): string {
  const ko = lang === "ko";
  const w = Math.max(2, Math.ceil(bits / 4));
  switch (it.kind) {
    case "byte":
    case "break":
      return `0x${hex(it.v ?? 0)}${printable(it.v ?? 0) ? " " + printable(it.v ?? 0) : ""}`;
    case "word": {
      const p: string[] = [];
      if (it.v !== undefined) p.push(`MOSI 0x${hex(it.v, w)}`);
      if (it.miso !== undefined) p.push(`MISO 0x${hex(it.miso, w)}`);
      return p.join(" · ");
    }
    case "addr": {
      const a = it.tenBit ? `0x${hex(it.addr ?? 0, 3)} (${ko ? "10비트" : "10-bit"})` : `0x${hex(it.addr ?? 0)}`;
      return `${a} ${it.rw ? (ko ? "읽기" : "read") : ko ? "쓰기" : "write"} · ${it.ack ? "ACK" : "NACK"}`;
    }
    case "data":
      return `0x${hex(it.v ?? 0)}${it.ack === undefined ? "" : it.ack ? " · ACK" : " · NACK"}`;
    case "frame": {
      if (it.id === undefined) return "";
      const id = it.ext ? `0x${hex(it.id, 8)} (${ko ? "확장" : "ext"})` : `0x${hex(it.id, 3)}`;
      const p = [`ID ${id}`];
      if (it.dlc !== undefined) p.push(`DLC ${it.dlc}`);
      if (it.rtr) p.push(ko ? "원격(RTR)" : "remote (RTR)");
      if (it.data && it.data.length) p.push(it.data.map((x) => hex(x)).join(" "));
      if (it.crc !== undefined) p.push(`CRC 0x${hex(it.crc, 4)}${it.crcCalc !== undefined && it.crcCalc !== it.crc ? ` (${ko ? "계산" : "calc"} 0x${hex(it.crcCalc, 4)})` : ""}`);
      if (it.dlc !== undefined && !it.err.includes("noack") && !it.err.includes("partial")) p.push("ACK");
      return p.join(" · ");
    }
    default:
      return "";
  }
}

export const errText = (it: Item, lang: Lang) => it.err.map((e) => ERR_TEXT[e][lang]).join(", ");

/** 짧은 글 — 칸 사이를 탭으로(복사해 표 프로그램에 붙이기 좋게) */
export function itemsText(items: Item[], lang: Lang, bits = 8): string {
  return items
    .map((it) => [it.t0.toFixed(9), it.ch ?? "", kindText(it, lang), valueText(it, lang, bits), errText(it, lang)].join("\t").replace(/\t+$/, ""))
    .join("\n");
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function itemsCsv(items: Item[], lang: Lang, bits = 8): string {
  const ko = lang === "ko";
  const head = ko ? ["시작(s)", "끝(s)", "채널", "종류", "값", "오류"] : ["start_s", "end_s", "channel", "kind", "value", "error"];
  const lines = [head.join(",")];
  for (const it of items) lines.push([it.t0.toFixed(9), it.t1.toFixed(9), it.ch ?? "", kindText(it, lang), valueText(it, lang, bits), errText(it, lang)].map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
