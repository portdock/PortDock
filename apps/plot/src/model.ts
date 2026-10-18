// 화면 없는 부분 — 값 고리 버퍼, 보이는 범위·솎아 그리기(min/max), 눈금, 통계, 화면 데이터 CSV, HEX 칸 해석, 채널 색(시험: model.test.ts)
// 숫자 해석(글자 줄·«이름:값»·바이너리 프레임)은 Rust(crates/core/src/plot.rs)가 한다 — 여기는 받은 숫자를 담고 그리기만.

/** 버퍼에 담는 줄 수 — 넘치면 오래된 것부터 밀려난다(1 kHz 면 약 100초) */
export const CAP = 100_000;
/** 채널 상한(crates/core/src/plot.rs MAX_CHANNELS 와 같다) */
export const MAX_CHANNELS = 32;

/** 가로축: points = 받은 순서 번호(점), time = PC 가 받은 시각(ms) */
export type XMode = "points" | "time";

/**
 * 고리 버퍼 — 시각 하나 + 채널마다 값 열. 채널 열은 처음 값이 올 때 만든다(앞 줄은 빈 값 NaN).
 * 논리 번호 i(0 = 가장 오래된 것)로 읽는다. 받은 순서 번호(index)는 지우기 뒤로 늘 늘어난다.
 */
export class Ring {
  readonly cap: number;
  /** 들어 있는 줄 수 */
  n = 0;
  /** 가장 오래된 줄의 실제 자리 */
  head = 0;
  /** 지우기 뒤로 받은 줄 수 */
  total = 0;
  t: Float64Array;
  cols: Float64Array[] = [];

  constructor(cap = CAP) {
    this.cap = cap;
    this.t = new Float64Array(cap);
  }

  clear() {
    this.n = 0;
    this.head = 0;
    this.total = 0;
    this.cols = [];
  }

  get channels() {
    return this.cols.length;
  }

  /** 한 줄 넣기. 시각은 앞 줄보다 작아지지 않게(가로축이 거꾸로 가지 않게) */
  push(ts: number, row: ArrayLike<number | null>) {
    const len = Math.min(row.length, MAX_CHANNELS);
    while (this.cols.length < len) this.cols.push(new Float64Array(this.cap).fill(NaN));
    const at = (this.head + this.n) % this.cap;
    const prev = this.n ? this.t[(at - 1 + this.cap) % this.cap] : -Infinity;
    this.t[at] = ts < prev ? prev : ts;
    for (let c = 0; c < this.cols.length; c++) {
      const v = c < len ? row[c] : null;
      this.cols[c][at] = v == null ? NaN : v;
    }
    if (this.n < this.cap) this.n++;
    else this.head = (this.head + 1) % this.cap;
    this.total++;
  }

  phys(i: number) {
    return (this.head + i) % this.cap;
  }
  time(i: number) {
    return this.t[this.phys(i)];
  }
  /** 받은 순서 번호(0부터) */
  index(i: number) {
    return this.total - this.n + i;
  }
  x(i: number, mode: XMode) {
    return mode === "time" ? this.time(i) : this.index(i);
  }
  val(ch: number, i: number) {
    const col = this.cols[ch];
    return col ? col[this.phys(i)] : NaN;
  }
  /** 맨 끝 x(비었으면 0) */
  lastX(mode: XMode) {
    return this.n ? this.x(this.n - 1, mode) : 0;
  }
  firstX(mode: XMode) {
    return this.n ? this.x(0, mode) : 0;
  }
}

/** x 가 처음으로 x 이상이 되는 논리 번호(없으면 n) */
export function lowerBound(r: Ring, mode: XMode, x: number) {
  let lo = 0;
  let hi = r.n;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (r.x(m, mode) < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** [x0, x1] 에 드는 논리 범위 [lo, hi) — 가장자리 밖 한 점씩 넣어 선이 칸 끝까지 이어지게 */
export function rangeOf(r: Ring, mode: XMode, x0: number, x1: number): [number, number] {
  const lo = Math.max(0, lowerBound(r, mode, x0) - 1);
  let hi = lowerBound(r, mode, x1);
  while (hi < r.n && r.x(hi, mode) <= x1) hi++;
  hi = Math.min(r.n, hi + 1);
  return [lo, Math.max(lo, hi)];
}

/** x 에 가장 가까운 점(범위 안에서) — 커서 값 읽기 */
export function nearest(r: Ring, mode: XMode, x: number): number {
  if (!r.n) return -1;
  const i = lowerBound(r, mode, x);
  if (i <= 0) return 0;
  if (i >= r.n) return r.n - 1;
  return x - r.x(i - 1, mode) <= r.x(i, mode) - x ? i - 1 : i;
}

/**
 * 그릴 점들 — (픽셀 x, 값) 쌍을 이어 붙인 배열. 값 NaN 은 선 끊기.
 * 점이 픽셀보다 훨씬 많으면 픽셀 칸마다 처음·최소·최대·마지막 넷만 남긴다(뾰족한 값이 사라지지 않게).
 */
export function decimate(r: Ring, mode: XMode, ch: number, lo: number, hi: number, x0: number, x1: number, width: number): Float64Array {
  const span = x1 - x0 || 1;
  const px = (x: number) => ((x - x0) / span) * width;
  const count = hi - lo;
  if (count <= Math.max(2, width * 2)) {
    const out = new Float64Array(count * 2);
    for (let k = 0, i = lo; i < hi; i++, k += 2) {
      out[k] = px(r.x(i, mode));
      out[k + 1] = r.val(ch, i);
    }
    return out;
  }
  const cols = Math.max(1, Math.ceil(width));
  const parts: number[] = [];
  let col = -1;
  let first = NaN;
  let min = Infinity;
  let max = -Infinity;
  let last = NaN;
  let cx = 0;
  let any = false;
  const emit = () => {
    if (col < 0) return;
    if (!any) {
      parts.push(cx, NaN);
    } else {
      parts.push(cx, first, cx, min, cx, max, cx, last);
    }
  };
  for (let i = lo; i < hi; i++) {
    const p = px(r.x(i, mode));
    const c = Math.min(cols - 1, Math.max(-1, Math.floor(p)));
    if (c !== col) {
      emit();
      col = c;
      cx = p;
      first = NaN;
      min = Infinity;
      max = -Infinity;
      last = NaN;
      any = false;
    }
    const v = r.val(ch, i);
    if (Number.isNaN(v)) {
      // 칸 안의 빈 값 — 앞뒤가 있으면 끊어 보인다
      if (any) {
        emit();
        any = false;
        first = NaN;
        min = Infinity;
        max = -Infinity;
        last = NaN;
        parts.push(p, NaN);
      }
      continue;
    }
    if (!any) first = v;
    any = true;
    if (v < min) min = v;
    if (v > max) max = v;
    last = v;
  }
  emit();
  return Float64Array.from(parts);
}

export interface Stat {
  n: number;
  last: number;
  min: number;
  max: number;
  mean: number;
}

/** [lo, hi) 의 채널 통계(빈 값 제외). 값이 없으면 n = 0 · 나머지 NaN */
export function stats(r: Ring, ch: number, lo: number, hi: number): Stat {
  let n = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let last = NaN;
  for (let i = lo; i < hi; i++) {
    const v = r.val(ch, i);
    if (Number.isNaN(v)) continue;
    n++;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    last = v;
  }
  return n ? { n, last, min, max, mean: sum / n } : { n: 0, last: NaN, min: NaN, max: NaN, mean: NaN };
}

/** 값 범위에 여백 — 같은 값이면 위아래로 벌린다 */
export function padRange(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
  if (max === min) {
    const d = Math.abs(max) * 0.05 || 1;
    return [min - d, max + d];
  }
  const d = (max - min) * 0.06;
  return [min - d, max + d];
}

/** 보기 좋은 눈금 간격(1·2·5 × 10^n) */
export function niceStep(range: number, count: number) {
  const raw = Math.abs(range) / Math.max(1, count);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export function ticks(lo: number, hi: number, count: number): number[] {
  const step = niceStep(hi - lo, count);
  const out: number[] = [];
  const start = Math.ceil(lo / step) * step;
  for (let k = 0; k < 200; k++) {
    const v = Number((start + k * step).toPrecision(12));
    if (v > hi + step * 1e-9) break;
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

/** 눈금 글자 — 간격에 맞는 자릿수 */
export function fmtTick(v: number, step: number) {
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e7 || a < 1e-4)) return v.toExponential(2);
  const d = Math.max(0, Math.min(8, -Math.floor(Math.log10(step) + 1e-9)));
  return v.toFixed(d);
}

/** 값 글자 — 7자리 정밀도, 아주 크거나 작으면 지수 */
export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e9 || a < 1e-4) return v.toExponential(4).replace(/\.?0+e/, "e");
  return String(Number(v.toPrecision(7)));
}

const p2 = (n: number, w = 2) => String(n).padStart(w, "0");

/** 로컬 시각 «12:03:05.123» */
export function clock(ts: number) {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p2(d.getMilliseconds(), 3)}`;
}

/** 로컬 날짜 시각 «2026-10-18 14:03:05.123» */
export function stamp(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${clock(ts)}`;
}

/** 시간 차 «850 ms» · «12.35 s» · «3 min 5.0 s» */
export function fmtDur(ms: number) {
  const a = Math.abs(ms);
  const sign = ms < 0 ? "-" : "";
  if (a < 1000) return `${sign}${Number(a.toPrecision(4))} ms`;
  if (a < 60_000) return `${sign}${(a / 1000).toFixed(a < 10_000 ? 3 : 2)} s`;
  return `${sign}${Math.floor(a / 60_000)} min ${((a % 60_000) / 1000).toFixed(1)} s`;
}

const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** 화면 데이터 CSV — [lo, hi) 줄. 첫 줄 BOM + 머리(time·elapsed_s·index·채널 이름), 빈 값은 빈 칸 */
export function csvOf(r: Ring, lo: number, hi: number, names: string[]) {
  const head = ["time", "elapsed_s", "index", ...names.slice(0, r.channels).map(csvCell)];
  const lines = ["﻿" + head.join(",")];
  const t0 = hi > lo ? r.time(lo) : 0;
  for (let i = lo; i < hi; i++) {
    const cells = [stamp(r.time(i)), ((r.time(i) - t0) / 1000).toFixed(3), String(r.index(i))];
    for (let c = 0; c < r.channels; c++) {
      const v = r.val(c, i);
      cells.push(Number.isNaN(v) ? "" : String(v));
    }
    lines.push(cells.join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

/** 시작 바이트 칸 «AA 55» · «0xAA,0x55» · «AA55» → 바이트. 틀리면 error */
export function parseHex(text: string): { bytes: number[]; error: string | null } {
  const bytes: number[] = [];
  for (const tok of text.split(/[\s,;-]+/)) {
    const t = tok.replace(/^0x/i, "");
    if (!t) continue;
    const bad = [...t].find((c) => !/[0-9a-f]/i.test(c));
    if (bad) return { bytes: [], error: `«${bad}»` };
    if (t.length % 2) return { bytes: [], error: `«${tok}»` };
    for (let i = 0; i < t.length; i += 2) bytes.push(parseInt(t.slice(i, i + 2), 16));
  }
  return { bytes, error: null };
}

/** 해석 방식 (crates/core/src/plot.rs Format) */
export type Sep = "auto" | "comma" | "space" | "tab" | "semicolon";
export type NumKind = "u8" | "i8" | "u16" | "i16" | "u32" | "i32" | "f32" | "f64";
export type CkKind = "sum8" | "bcc" | "crc8" | "crc16-modbus" | "crc16-ccitt" | "crc16-xmodem" | "lrc" | "sum16" | "crc32";
export type Format =
  | { kind: "text"; sep: Sep; header: "auto" | "off" }
  | { kind: "binary"; sync: number[]; channels: number; num: NumKind; little: boolean; checksum: CkKind | null; checkSync: boolean };

export const NUM_SIZE: Record<NumKind, number> = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, f32: 4, f64: 8 };
export const CK_SIZE: Record<CkKind, number> = { sum8: 1, bcc: 1, crc8: 1, lrc: 1, "crc16-modbus": 2, "crc16-ccitt": 2, "crc16-xmodem": 2, sum16: 2, crc32: 4 };

/** 바이너리 프레임 길이(시작 바이트 + 값 + 체크섬) */
export function frameLen(f: Format) {
  if (f.kind !== "binary") return 0;
  return f.sync.length + f.channels * NUM_SIZE[f.num] + (f.checksum ? CK_SIZE[f.checksum] : 0);
}

/**
 * 채널 색 — 색맹 구별이 검증된 8색(밝은·어두운 테마 각각). 9번째부터는 같은 색을 다시 쓰되 점선으로 그린다(dash 로 구별)
 */
export const PALETTE = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};
export const channelColor = (i: number, dark: boolean) => (dark ? PALETTE.dark : PALETTE.light)[i % 8];
export const channelDash = (i: number) => Math.floor(i / 8) % 2 === 1;

/** 채널 이름 — 사용자가 바꾼 이름 > 장비가 보낸 이름(머리글·«이름:값») > CH1 */
export function channelName(i: number, user: string | undefined, device: string | undefined) {
  return user?.trim() || device?.trim() || `CH${i + 1}`;
}
