// 레지스터 맵 — 타입(u16·s16·u32·s32·f32·f64·문자열)·워드/바이트 순서·이름, 주소 표기, CSV, 자동 변화 설정.
// 화면(React) 없는 부분. 숫자 규칙은 백엔드 crates/core/src/regmap.rs 와 같다.
// node --test apps/modbus-slave/src/regmap.test.ts 로 시험한다(Node 24 는 타입을 지우고 바로 돌린다 — enum 같은 TS 전용 문법은 쓰지 않는다).

export type Lang = "ko" | "en";
export type Table = "coils" | "discrete-inputs" | "holding-registers" | "input-registers";
export const TABLE_IDS: Table[] = ["coils", "discrete-inputs", "holding-registers", "input-registers"];
export const isBits = (t: Table) => t === "coils" || t === "discrete-inputs";
/** PLC 표기 앞자리 — 0xxxx 코일, 1xxxx 입력 접점, 3xxxx 입력 레지스터, 4xxxx 보유 레지스터 */
export const PREFIX: Record<Table, string> = { coils: "0", "discrete-inputs": "1", "input-registers": "3", "holding-registers": "4" };

export type VType = "bit" | "u16" | "s16" | "u32" | "s32" | "f32" | "f64" | "string";
export type Order = "ABCD" | "CDAB" | "BADC" | "DCBA";
export const REG_TYPES: VType[] = ["u16", "s16", "u32", "s32", "f32", "f64", "string"];
export const ORDERS: Order[] = ["ABCD", "CDAB", "BADC", "DCBA"];
/** 문자열 최대 길이(바이트) — 125 레지스터 */
export const STR_MAX = 250;

/** 타입을 지정한 칸(점) — 시작 주소부터 타입의 칸 수만큼 차지한다 */
export interface Point {
  addr: number;
  type: VType;
  order: Order;
  name: string;
  /** 문자열의 길이(바이트) */
  len?: number;
}

/** 차지하는 레지스터 수 */
export function regsOf(type: VType, len = 2): number {
  switch (type) {
    case "u32":
    case "s32":
    case "f32":
      return 2;
    case "f64":
      return 4;
    case "string":
      return Math.max(1, Math.ceil(Math.min(STR_MAX, Math.max(1, len)) / 2));
    default:
      return 1;
  }
}
export const pointRegs = (p: Pick<Point, "type" | "len">) => regsOf(p.type, p.len);

const wordSwap = (o: Order) => o === "CDAB" || o === "DCBA";
const byteSwap = (o: Order) => o === "BADC" || o === "DCBA";

/** 바이트(최상위 먼저) → 레지스터. 문자열은 바이트 바꿈만 본다(워드 순서는 그대로) */
function bytesToRegs(bytes: number[], order: Order, str = false): number[] {
  const regs: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    regs.push(byteSwap(order) ? (b << 8) | a : (a << 8) | b);
  }
  if (!str && wordSwap(order)) regs.reverse();
  return regs;
}

function regsToBytes(regs: number[], order: Order, str = false): number[] {
  const r = !str && wordSwap(order) ? [...regs].reverse() : regs;
  const out: number[] = [];
  for (const v of r) {
    const hi = (v >> 8) & 0xff;
    const lo = v & 0xff;
    if (byteSwap(order)) out.push(lo, hi);
    else out.push(hi, lo);
  }
  return out;
}

const RANGES: Partial<Record<VType, [number, number]>> = {
  bit: [0, 1],
  u16: [0, 0xffff],
  s16: [-0x8000, 0x7fff],
  u32: [0, 0xffffffff],
  s32: [-0x80000000, 0x7fffffff],
};

/** 값 → 레지스터. 정수형은 반올림해 범위 안으로 */
export function encodeValue(v: number | string, type: VType, order: Order = "ABCD", len = 2): number[] {
  if (type === "string") {
    const n = Math.min(STR_MAX, Math.max(1, len));
    const bytes = [...new TextEncoder().encode(String(v))].slice(0, n);
    while (bytes.length < regsOf("string", n) * 2) bytes.push(0);
    return bytesToRegs(bytes, order, true);
  }
  let x = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(x)) x = 0;
  const r = RANGES[type];
  if (r) x = Math.min(r[1], Math.max(r[0], Math.round(x)));
  if (type === "bit") return [x ? 1 : 0];
  const dv = new DataView(new ArrayBuffer(8));
  let n = 2;
  switch (type) {
    case "u16":
      dv.setUint16(0, x);
      break;
    case "s16":
      dv.setInt16(0, x);
      break;
    case "u32":
      dv.setUint32(0, x);
      n = 4;
      break;
    case "s32":
      dv.setInt32(0, x);
      n = 4;
      break;
    case "f32":
      dv.setFloat32(0, x);
      n = 4;
      break;
    case "f64":
      dv.setFloat64(0, x);
      n = 8;
      break;
  }
  return bytesToRegs([...new Uint8Array(dv.buffer, 0, n)], order);
}

/** 레지스터 → 값(문자열은 첫 0 바이트까지). 칸이 모자라면 null */
export function decodeValue(regs: number[], type: VType, order: Order = "ABCD", len = 2): number | string | null {
  const n = regsOf(type, len);
  if (regs.length < n) return null;
  if (type === "bit") return regs[0] ? 1 : 0;
  if (type === "string") {
    const bytes = regsToBytes(regs.slice(0, n), order, true).slice(0, Math.min(STR_MAX, Math.max(1, len)));
    const end = bytes.indexOf(0);
    return new TextDecoder().decode(new Uint8Array(end >= 0 ? bytes.slice(0, end) : bytes));
  }
  const bytes = regsToBytes(regs.slice(0, n), order);
  const dv = new DataView(new Uint8Array(bytes).buffer);
  switch (type) {
    case "u16":
      return dv.getUint16(0);
    case "s16":
      return dv.getInt16(0);
    case "u32":
      return dv.getUint32(0);
    case "s32":
      return dv.getInt32(0);
    case "f32":
      return dv.getFloat32(0);
    default:
      return dv.getFloat64(0);
  }
}

/** 화면에 보일 글 — f32 는 유효숫자 7, f64 는 15 자리에서 끝의 0 을 뗀다 */
export function formatValue(v: number | string | null, type: VType): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (type === "f32" || type === "f64") {
    if (!Number.isFinite(v)) return String(v);
    if (v === 0) return "0";
    return String(Number(v.toPrecision(type === "f32" ? 7 : 15)));
  }
  return String(v);
}

/** 입력 글 → 값. 정수형은 10진수·0x16진수, 범위 검사. 틀리면 null */
export function parseValue(text: string, type: VType, len = 2): number | string | null {
  if (type === "string") {
    const n = Math.min(STR_MAX, Math.max(1, len));
    return new TextEncoder().encode(text).length <= n ? text : null;
  }
  const s = text.trim().replace(/[\s_]/g, "");
  if (!s) return null;
  if (type === "f32" || type === "f64") {
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    const x = Number(s);
    if (!Number.isFinite(x)) return null;
    if (type === "f32" && Math.abs(x) > 3.4028234663852886e38) return null;
    return x;
  }
  let x: number;
  if (/^-?0x[0-9a-f]+$/i.test(s)) x = (s.startsWith("-") ? -1 : 1) * parseInt(s.replace(/^-?0x/i, ""), 16);
  else if (/^[-+]?\d+$/.test(s)) x = Number(s);
  else return null;
  const r = RANGES[type]!;
  return x >= r[0] && x <= r[1] ? x : null;
}

// ------------------------------------------------------------------ 화면 배치

/** 화면 칸 하나 — 타입 지정 점이면 여러 레지스터를 차지한다 */
export interface Item {
  addr: number;
  span: number;
  point?: Point;
}

/**
 * 보이는 범위 [start, start + count) 의 칸들. 점이 범위 안에 다 들어오면 한 칸으로 묶고,
 * 범위 밖으로 걸치면(시작이 앞에 있거나 끝이 넘침) 레지스터를 하나씩 보인다.
 */
export function layout(start: number, count: number, points: Point[] | undefined): Item[] {
  const at = new Map<number, Point>();
  for (const p of points ?? []) at.set(p.addr, p);
  const out: Item[] = [];
  const end = start + count;
  for (let a = start; a < end; ) {
    const p = at.get(a);
    const n = p ? pointRegs(p) : 1;
    if (p && a + n <= end) {
      out.push({ addr: a, span: n, point: p });
      a += n;
    } else {
      out.push({ addr: a, span: 1, point: p && n === 1 ? p : undefined });
      a++;
    }
  }
  return out;
}

/** 새 점이 다른 점과 겹치는지 — 겹치는 점의 주소, 없으면 null */
export function overlapOf(points: Point[], p: Point): number | null {
  const lo = p.addr;
  const hi = p.addr + pointRegs(p);
  for (const q of points) {
    if (q.addr === p.addr) continue;
    const qlo = q.addr;
    const qhi = q.addr + pointRegs(q);
    if (qlo < hi && lo < qhi) return q.addr;
  }
  return null;
}

/** 주소 a 를 덮는 점(시작 주소가 아니어도) */
export function pointCovering(points: Point[] | undefined, a: number): Point | undefined {
  return (points ?? []).find((p) => a >= p.addr && a < p.addr + pointRegs(p));
}

/** 기본 모양(u16·bit, 이름 없음, ABCD)이면 저장할 필요가 없다 */
export const isPlainPoint = (p: Point) => (p.type === "u16" || p.type === "bit") && !p.name.trim() && p.order === "ABCD";

// ------------------------------------------------------------------ 주소 표기

/** 0 기준(프로토콜 주소) · 1 기준 · PLC 표기(40001) */
export type AddrMode = "zero" | "one" | "plc";
export const addrBase = (m: AddrMode) => (m === "zero" ? 0 : 1);

/** 화면 주소 글 — PLC 표기는 9999 까지 5자리(40001), 넘으면 6자리(410000). 백엔드 AddrStyle 과 같다 */
export function addrText(table: Table, a: number, mode: AddrMode): string {
  if (mode === "plc") return PREFIX[table] + String(a + 1).padStart(a < 9999 ? 4 : 5, "0");
  return String(a + addrBase(mode));
}

// ------------------------------------------------------------------ 값 자동 변화

export type SimKindName = "increment" | "decrement" | "random" | "sine" | "ramp" | "toggle";
export const SIM_KINDS: SimKindName[] = ["increment", "decrement", "random", "sine", "ramp", "toggle"];
/** 비트 표에서 쓸 수 있는 것 */
export const BIT_SIM_KINDS: SimKindName[] = ["toggle", "random"];

/** 화면에 저장하는 자동 변화 설정(모든 칸을 들고 있고, 방식에 맞는 것만 쓴다) */
export interface SimCfg {
  addr: number;
  kind: SimKindName;
  step: number;
  min: number;
  max: number;
  wrap: boolean;
  amp: number;
  offset: number;
  /** 사인·램프의 한 주기(ms) */
  waveMs: number;
  /** 바꾸는 간격(ms). 0 이면 마스터가 읽을 때마다 */
  periodMs: number;
}

export const defaultSim = (addr: number, bits: boolean): SimCfg => ({
  addr,
  kind: bits ? "toggle" : "increment",
  step: 1,
  min: 0,
  max: bits ? 1 : 100,
  wrap: true,
  amp: 100,
  offset: 0,
  waveMs: 10000,
  periodMs: 1000,
});

/** 백엔드(set_sims) 모양 */
export interface SimSpec {
  addr: number;
  valueType: Exclude<VType, "string">;
  order: Order;
  periodMs: number;
  sim: Record<string, unknown> & { kind: SimKindName };
}

/** 설정 + 그 주소의 점(타입·순서) → 백엔드 모양. 문자열 점이면 null(자동 변화 없음) */
export function simToSpec(s: SimCfg, point: Point | undefined, bits: boolean): SimSpec | null {
  const type: VType = bits ? "bit" : (point?.type ?? "u16");
  if (type === "string") return null;
  const sim: SimSpec["sim"] =
    s.kind === "increment" || s.kind === "decrement"
      ? { kind: s.kind, step: s.step, min: s.min, max: s.max, wrap: s.wrap }
      : s.kind === "random"
        ? { kind: "random", min: s.min, max: s.max }
        : s.kind === "sine"
          ? { kind: "sine", amp: s.amp, offset: s.offset, waveMs: s.waveMs }
          : s.kind === "ramp"
            ? { kind: "ramp", min: s.min, max: s.max, waveMs: s.waveMs }
            : { kind: "toggle" };
  return { addr: s.addr, valueType: type, order: bits ? "ABCD" : (point?.order ?? "ABCD"), periodMs: s.periodMs, sim };
}

const SM = {
  ko: {
    stepPos: "증가·감소 폭은 0 보다 커야 합니다.",
    minMax: "최소는 최대보다 클 수 없습니다.",
    wave: "사인·램프의 주기는 1ms 이상입니다.",
    period: "바꾸는 간격은 50ms~1시간(3,600,000ms)입니다. «읽을 때마다» 를 쓰려면 체크를 켜세요.",
    num: "숫자가 아닌 칸이 있습니다.",
    str: "문자열에는 자동 변화를 쓸 수 없습니다.",
    increment: "증가",
    decrement: "감소",
    random: "랜덤",
    sine: "사인",
    ramp: "램프",
    toggle: "토글",
    onRead: "읽을 때마다",
    every: "{a}ms 마다",
    wrapOn: "끝에서 처음으로",
    wrapOff: "끝에서 멈춤",
  },
  en: {
    stepPos: "Step must be greater than 0.",
    minMax: "Min cannot be greater than max.",
    wave: "Sine/ramp period must be at least 1 ms.",
    period: "Update interval is 50 ms – 1 hour (3,600,000 ms). Check «On every read» to change on reads instead.",
    num: "Some fields are not numbers.",
    str: "Strings cannot be simulated.",
    increment: "Increment",
    decrement: "Decrement",
    random: "Random",
    sine: "Sine",
    ramp: "Ramp",
    toggle: "Toggle",
    onRead: "on every read",
    every: "every {a} ms",
    wrapOn: "wraps",
    wrapOff: "stops at the end",
  },
};

export const simKindName = (k: SimKindName, lang: Lang) => SM[lang][k];

/** 설정 검사 — 틀리면 이유 */
export function simCheck(s: SimCfg, lang: Lang): string | null {
  const m = SM[lang];
  const nums = [s.step, s.min, s.max, s.amp, s.offset, s.waveMs, s.periodMs];
  if (nums.some((x) => typeof x !== "number" || !Number.isFinite(x))) return m.num;
  if (s.periodMs !== 0 && (s.periodMs < 50 || s.periodMs > 3_600_000)) return m.period;
  if ((s.kind === "increment" || s.kind === "decrement") && !(s.step > 0)) return m.stepPos;
  if ((s.kind === "increment" || s.kind === "decrement" || s.kind === "random" || s.kind === "ramp") && s.min > s.max) return m.minMax;
  if ((s.kind === "sine" || s.kind === "ramp") && !(s.waveMs >= 1)) return m.wave;
  return null;
}

/** 한 줄 설명(말풍선·목록 보기) — «증가 +1 (0~100, 끝에서 처음으로) · 1000ms 마다» */
export function simSummary(s: SimCfg, lang: Lang): string {
  const m = SM[lang];
  const when = s.periodMs === 0 ? m.onRead : m.every.replace("{a}", String(s.periodMs));
  let what: string;
  switch (s.kind) {
    case "increment":
    case "decrement":
      what = `${m[s.kind]} ${s.kind === "increment" ? "+" : "−"}${s.step} (${s.min}~${s.max}, ${s.wrap ? m.wrapOn : m.wrapOff})`;
      break;
    case "random":
      what = `${m.random} ${s.min}~${s.max}`;
      break;
    case "sine":
      what = `${m.sine} ${s.offset} ± ${s.amp} / ${s.waveMs}ms`;
      break;
    case "ramp":
      what = `${m.ramp} ${s.min} → ${s.max} / ${s.waveMs}ms`;
      break;
    default:
      what = m.toggle;
  }
  return `${what} · ${when}`;
}

// ------------------------------------------------------------------ CSV

export const CSV_HEADER = ["table", "address", "type", "order", "name", "value"];

export interface CsvRow {
  table: Table;
  /** 0 기준(프로토콜) 주소 */
  address: number;
  type: VType;
  order: Order;
  name: string;
  /** 비었으면 값은 그대로 두고 타입·이름만 */
  value: number | string | null;
  len?: number;
}

const typeText = (t: VType, len?: number) => (t === "string" ? `string(${len ?? 2})` : t);

function csvField(s: string) {
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV 글 — UTF-8 BOM, CRLF(엑셀에서 한글이 깨지지 않게) */
export function toCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) {
    const bits = isBits(r.table);
    lines.push(
      [r.table, String(r.address), typeText(r.type, r.len), bits ? "" : r.order, r.name, r.value == null ? "" : formatValue(r.value, r.type)].map(csvField).join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** 지금 표의 보이는(응답) 범위 → CSV 줄. 점은 한 줄로, 나머지 레지스터는 u16(비트 표는 bit) */
export function tableRows(table: Table, start: number, values: number[], points: Point[] | undefined): CsvRow[] {
  const bits = isBits(table);
  return layout(start, values.length, points).map((it) => {
    const regs = values.slice(it.addr - start, it.addr - start + it.span);
    const p = it.point;
    const type: VType = bits ? "bit" : (p?.type ?? "u16");
    return { table, address: it.addr, type, order: p?.order ?? "ABCD", name: p?.name ?? "", value: decodeValue(regs, type, p?.order ?? "ABCD", p?.len), len: p?.len };
  });
}

/** CSV 한 줄 나누기(따옴표·"" 지원). 구분자는 쉼표(엑셀 유럽식 ; · 탭도) */
function splitCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"' && f === "") q = true;
    else if (c === sep) {
      row.push(f);
      f = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else f += c;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}

const CM = {
  ko: {
    empty: "CSV 에 줄이 없습니다.",
    header: "첫 줄은 머리줄이어야 합니다: table,address,type,order,name,value (table·address 는 꼭 있어야 합니다)",
    table: "{r}행: 표 «{a}» 를 모릅니다(coils·discrete-inputs·holding-registers·input-registers 또는 CO·DI·HR·IR).",
    address: "{r}행: 주소 «{a}» 는 0~65535 정수(0 기준 프로토콜 주소)여야 합니다.",
    type: "{r}행: 형식 «{a}» 를 모릅니다(u16·s16·u32·s32·f32·f64·string(길이)·bit).",
    bitType: "{r}행: 코일·입력 접점은 형식이 bit 여야 합니다.",
    regType: "{r}행: 레지스터 표에는 bit 를 쓸 수 없습니다.",
    order: "{r}행: 순서 «{a}» 를 모릅니다(ABCD·CDAB·BADC·DCBA).",
    over: "{r}행: 주소 {a} 부터 {n}칸이 65535 를 넘습니다.",
    value: "{r}행: 값 «{a}» 를 {b} 로 읽을 수 없습니다.",
    overlap: "{r}행: 주소 {a} 가 {b}행의 칸과 겹칩니다.",
    dup: "{r}행: 같은 표·주소({a})가 {b}행에도 있습니다.",
    more: "…그 밖에 {n}개",
  },
  en: {
    empty: "The CSV has no rows.",
    header: "The first row must be the header: table,address,type,order,name,value (table and address are required)",
    table: "Row {r}: unknown table «{a}» (coils, discrete-inputs, holding-registers, input-registers or CO, DI, HR, IR).",
    address: "Row {r}: address «{a}» must be a whole number 0–65535 (0-based protocol address).",
    type: "Row {r}: unknown type «{a}» (u16, s16, u32, s32, f32, f64, string(len), bit).",
    bitType: "Row {r}: coils and discrete inputs must use type bit.",
    regType: "Row {r}: register tables cannot use type bit.",
    order: "Row {r}: unknown order «{a}» (ABCD, CDAB, BADC, DCBA).",
    over: "Row {r}: {n} registers from address {a} run past 65535.",
    value: "Row {r}: cannot read value «{a}» as {b}.",
    overlap: "Row {r}: address {a} overlaps the cells of row {b}.",
    dup: "Row {r}: the same table/address ({a}) is also on row {b}.",
    more: "…and {n} more",
  },
};

const fillMsg = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

const TABLE_ALIASES: Record<string, Table> = {
  coils: "coils",
  coil: "coils",
  co: "coils",
  "0x": "coils",
  "코일": "coils",
  "discrete-inputs": "discrete-inputs",
  "discrete-input": "discrete-inputs",
  di: "discrete-inputs",
  "1x": "discrete-inputs",
  "입력 접점": "discrete-inputs",
  "holding-registers": "holding-registers",
  "holding-register": "holding-registers",
  hr: "holding-registers",
  "4x": "holding-registers",
  "보유 레지스터": "holding-registers",
  "input-registers": "input-registers",
  "input-register": "input-registers",
  ir: "input-registers",
  "3x": "input-registers",
  "입력 레지스터": "input-registers",
};

const TYPE_ALIASES: Record<string, VType> = {
  u16: "u16",
  uint16: "u16",
  word: "u16",
  s16: "s16",
  int16: "s16",
  i16: "s16",
  u32: "u32",
  uint32: "u32",
  dword: "u32",
  s32: "s32",
  int32: "s32",
  i32: "s32",
  f32: "f32",
  float: "f32",
  float32: "f32",
  real: "f32",
  f64: "f64",
  double: "f64",
  float64: "f64",
  lreal: "f64",
  bit: "bit",
  bool: "bit",
};

/**
 * CSV 읽기. 하나라도 틀리면 rows 없이 errors(행 번호는 엑셀과 같은 1부터, 머리줄 포함).
 * 빈 type 은 u16(비트 표는 bit), 빈 order 는 ABCD, 빈 value 는 «값은 그대로».
 */
export function parseCsv(text: string, lang: Lang = "ko"): { rows: CsvRow[]; errors: string[] } {
  const m = CM[lang];
  const body = text.replace(/^﻿/, "");
  const first = body.split(/\r?\n/, 1)[0] ?? "";
  const sep = first.includes(",") ? "," : first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const all = splitCsv(body, sep);
  // 줄 번호를 지키며 빈 줄은 건너뛴다
  const lines = all.map((cells, i) => ({ cells, line: i + 1 })).filter((l) => l.cells.some((c) => c.trim() !== ""));
  if (!lines.length) return { rows: [], errors: [m.empty] };
  const head = lines[0].cells.map((c) => c.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  if (col("table") < 0 || col("address") < 0) return { rows: [], errors: [m.header] };
  const get = (cells: string[], name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "") : "");
  const errors: string[] = [];
  const rows: CsvRow[] = [];
  const lineOf: number[] = [];
  for (const { cells, line } of lines.slice(1)) {
    const r = line;
    const tRaw = get(cells, "table").trim();
    const table = TABLE_ALIASES[tRaw.toLowerCase()];
    if (!table) {
      errors.push(fillMsg(m.table, { r, a: tRaw }));
      continue;
    }
    const aRaw = get(cells, "address").trim();
    const address = /^\d+$/.test(aRaw) ? Number(aRaw) : NaN;
    if (!(address >= 0 && address <= 65535)) {
      errors.push(fillMsg(m.address, { r, a: aRaw }));
      continue;
    }
    const bits = isBits(table);
    const tyRaw = get(cells, "type").trim().toLowerCase();
    let type: VType;
    let len: number | undefined;
    const sm = /^(?:string|str|ascii)\s*\(\s*(\d+)\s*\)$/.exec(tyRaw);
    if (!tyRaw) type = bits ? "bit" : "u16";
    else if (sm) {
      type = "string";
      len = Math.min(STR_MAX, Math.max(1, Number(sm[1])));
    } else if (TYPE_ALIASES[tyRaw]) type = TYPE_ALIASES[tyRaw];
    else {
      errors.push(fillMsg(m.type, { r, a: tyRaw }));
      continue;
    }
    if (bits && type !== "bit") {
      errors.push(fillMsg(m.bitType, { r }));
      continue;
    }
    if (!bits && type === "bit") {
      errors.push(fillMsg(m.regType, { r }));
      continue;
    }
    const oRaw = get(cells, "order").trim().toUpperCase();
    const order = (oRaw || "ABCD") as Order;
    if (!ORDERS.includes(order)) {
      errors.push(fillMsg(m.order, { r, a: oRaw }));
      continue;
    }
    const n = regsOf(type, len);
    if (address + n > 65536) {
      errors.push(fillMsg(m.over, { r, a: address, n }));
      continue;
    }
    const vRaw = get(cells, "value");
    let value: number | string | null = null;
    if (type === "string" ? vRaw !== "" : vRaw.trim() !== "") {
      // 엑셀이 소수점을 쉼표로 바꾼 칸(세미콜론 구분 파일)도 읽는다
      const v = type === "bit" ? parseBit(vRaw) : parseValue(sep === ";" && (type === "f32" || type === "f64") ? vRaw.replace(",", ".") : vRaw, type, len);
      if (v == null) {
        errors.push(fillMsg(m.value, { r, a: vRaw, b: typeText(type, len) }));
        continue;
      }
      value = v;
    }
    rows.push({ table, address, type, order, name: get(cells, "name").trim(), value, len });
    lineOf.push(r);
  }
  // 같은 표 안에서 겹침·중복
  const byTable = new Map<Table, number[]>();
  rows.forEach((row, i) => (byTable.get(row.table) ?? byTable.set(row.table, []).get(row.table)!).push(i));
  for (const idx of byTable.values()) {
    idx.sort((a, b) => rows[a].address - rows[b].address);
    // 지금까지 가장 멀리 닿은 줄과 비교한다(짧은 줄 뒤에 숨은 긴 줄과의 겹침도 잡게)
    let far = idx[0];
    for (let k = 1; k < idx.length; k++) {
      const p = rows[far];
      const c = rows[idx[k]];
      const pEnd = p.address + regsOf(p.type, p.len);
      if (c.address === rows[idx[k - 1]].address) errors.push(fillMsg(m.dup, { r: lineOf[idx[k]], a: c.address, b: lineOf[idx[k - 1]] }));
      else if (c.address < pEnd) errors.push(fillMsg(m.overlap, { r: lineOf[idx[k]], a: c.address, b: lineOf[far] }));
      if (c.address + regsOf(c.type, c.len) > pEnd) far = idx[k];
    }
  }
  if (errors.length) {
    const shown = errors.slice(0, 6);
    if (errors.length > 6) shown.push(fillMsg(m.more, { n: errors.length - 6 }));
    return { rows: [], errors: shown };
  }
  return { rows, errors: [] };
}

function parseBit(s: string): number | null {
  const t = s.trim().toUpperCase();
  if (t === "1" || t === "ON" || t === "TRUE") return 1;
  if (t === "0" || t === "OFF" || t === "FALSE") return 0;
  return null;
}

/** CSV 줄 하나 → 저장할 점(기본 모양이면 null) */
export function rowPoint(r: CsvRow): Point | null {
  const p: Point = { addr: r.address, type: r.type, order: isBits(r.table) ? "ABCD" : r.order, name: r.name, ...(r.type === "string" ? { len: r.len ?? 2 } : {}) };
  return isPlainPoint(p) ? null : p;
}

/** 기존 점 목록에 새 점들을 넣는다 — 새 점과 겹치는 기존 점은 뺀다. 주소 순 */
export function mergePoints(old: Point[] | undefined, add: Point[], clearAt: number[] = []): Point[] {
  const clear = new Set(clearAt);
  const keep = (old ?? []).filter((q) => !clear.has(q.addr) && !add.some((p) => q.addr < p.addr + pointRegs(p) && p.addr < q.addr + pointRegs(q)));
  return [...keep, ...add].sort((a, b) => a.addr - b.addr);
}
