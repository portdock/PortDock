// 폴링 표·값 보기·쓰기 입력·주소 표기·CSV·값 기록·추세 — 화면(React) 없는 부분.
// 타입(u16~f64·문자열)·워드/바이트 순서·CSV 모양은 Modbus Slave 의 레지스터 맵(apps/modbus-slave/src/regmap.ts)을 그대로 쓴다
// — 두 프로그램이 같은 CSV 를 주고받는다. 시험: node --test apps/modbus-master/src/model.test.ts
// (Node 24 는 타입을 지우고 바로 돌린다 — enum 같은 TS 전용 문법은 쓰지 않는다)

import {
  PREFIX,
  parse16,
  addrText,
  decodeValue,
  encodeValue,
  formatValue,
  isPlainPoint,
  layout,
  mergePoints,
  parseCsv,
  parseValue,
  pointRegs,
  regsOf,
  rowPoint,
  tableRows,
  toCsv,
  type AddrMode,
  type CsvRow,
  type Item,
  type Lang,
  type Order,
  type Point,
  type Table,
  type VType,
} from "../../modbus-slave/src/regmap.ts";

export { addrText, decodeValue, encodeValue, formatValue, isPlainPoint, layout, pointRegs, regsOf };
export type { AddrMode, Item, Lang, Order, Point, Table, VType };

// ------------------------------------------------------------------ 함수 코드·표

export type Fc = 1 | 2 | 3 | 4;
export const FCS: Fc[] = [1, 2, 3, 4];
export const FC_TABLE: Record<Fc, Table> = { 1: "coils", 2: "discrete-inputs", 3: "holding-registers", 4: "input-registers" };
export const isBitFc = (fc: Fc) => fc === 1 || fc === 2;
/** 쓸 수 있는 표 — 코일(05·0F)·보유 레지스터(06·10) */
export const writableFc = (fc: Fc) => fc === 1 || fc === 3;
/** 읽기·찾기에 쓸 수 있는 가장 작은 국번 — RTU 의 0 은 브로드캐스트(답이 없음, 쓰기 창에서만), Modbus TCP 의 0 은 보통 유닛 */
export const minUnit = (wire: "tcp" | "rtu") => (wire === "tcp" ? 0 : 1);
/** RTU 에서 국번 0 인 읽기 표인지 — 국번 0 은 브로드캐스트라 응답이 없어 백엔드가 폴링하지 않는다(표를 조용히 뺀다).
 *  TCP 의 유닛 0 은 «이 장비» 라 보통 요청이다 */
export const broadcastRead = (t: Pick<PollTable, "unit">, wire: "tcp" | "rtu") => wire === "rtu" && t.unit === 0;
export const maxQty = (fc: Fc) => (isBitFc(fc) ? 2000 : 125);
export const fcHex = (fc: number) => fc.toString(16).toUpperCase().padStart(2, "0");

/** u16 칸을 보이는 방식 */
export type Format = "u16" | "s16" | "hex" | "bin";
export const FORMATS: Format[] = ["u16", "s16", "hex", "bin"];
export type View = "grid" | "list";

/** 폴링 표 하나 — 화면에 저장하는 모양 */
export interface PollTable {
  id: number;
  /** 탭 이름(비우면 «표 n») */
  name: string;
  unit: number;
  fc: Fc;
  /** 0 기준(프로토콜) 시작 주소 */
  start: number;
  qty: number;
  /** 폴링 주기(ms). 0 = 손으로만(«한 번 읽기») */
  intervalMs: number;
  enabled: boolean;
  format: Format;
  view: View;
  /** 주소별 이름·타입·순서 */
  points: Point[];
}

export function newTable(existing: PollTable[], from?: Partial<PollTable>): PollTable {
  const id = existing.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  return { name: "", unit: 1, fc: 3, start: 0, qty: 10, intervalMs: 1000, enabled: true, format: "u16", view: "grid", points: [], ...from, id };
}

const int = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : d);

/** 저장해 둔 표 목록을 믿을 수 있게 — 틀린 칸은 기본값으로, 개수는 함수 한도 안으로 */
export function sanitizeTables(raw: unknown): PollTable[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: PollTable[] = [];
  const seen = new Set<number>();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const o = r as Partial<PollTable>;
    const fc = (FCS.includes(o.fc as Fc) ? o.fc : 3) as Fc;
    let id = int(o.id, 1, 1_000_000, 0);
    if (!id || seen.has(id)) id = Math.max(0, ...seen) + 1;
    seen.add(id);
    const start = int(o.start, 0, 65535, 0);
    const qty = Math.min(int(o.qty, 1, maxQty(fc), 10), 65536 - start);
    const points = Array.isArray(o.points)
      ? o.points.filter((p): p is Point => !!p && Number.isInteger(p.addr) && p.addr >= 0 && p.addr < 65536 && typeof p.name === "string" && typeof p.type === "string" && typeof p.order === "string")
      : [];
    out.push({
      id,
      name: typeof o.name === "string" ? o.name.slice(0, 40) : "",
      // 0 은 Modbus TCP 에서 쓸 수 있다(RTU 로 바꾸면 그 표는 백엔드가 «0 은 브로드캐스트» 로 거절해 알린다)
      unit: int(o.unit, 0, 255, 1),
      fc,
      start,
      qty,
      intervalMs: o.intervalMs === 0 ? 0 : int(o.intervalMs, 10, 86_400_000, 1000),
      enabled: o.enabled !== false,
      format: FORMATS.includes(o.format as Format) ? (o.format as Format) : "u16",
      view: o.view === "list" ? "list" : "grid",
      points,
    });
  }
  return out.length ? out : [newTable([])];
}

/** 백엔드 폴링 모양(PollSpec) */
export const toSpec = (t: PollTable) => ({ id: t.id, unit: t.unit, fc: t.fc, start: t.start, qty: Math.min(t.qty, maxQty(t.fc), 65536 - t.start), intervalMs: t.intervalMs, enabled: t.enabled });

export const tableLabel = (t: PollTable, i: number, word: string) => t.name.trim() || `${word} ${i + 1}`;

// ------------------------------------------------------------------ 주소 표기

export const addrLabel = (fc: Fc, a: number, mode: AddrMode) => addrText(FC_TABLE[fc], a, mode);

const PREFIX_FC: Record<string, Fc> = { [PREFIX.coils]: 1, [PREFIX["discrete-inputs"]]: 2, [PREFIX["input-registers"]]: 4, [PREFIX["holding-registers"]]: 3 };

/**
 * 시작 주소 글 → 0 기준 주소. PLC 표기에서 «30001» 처럼 앞자리가 다른 표를 가리키면 그 함수 코드도 돌려준다.
 * PLC 표기에서 앞자리 없이 짧은 수(1~9999)는 지금 표의 1 기준 번호로 본다. 틀리면 null
 */
export function parseAddr(text: string, mode: AddrMode, fc: Fc): { start: number; fc: Fc } | null {
  const s = text.trim();
  if (!/^\d{1,6}$/.test(s)) return null;
  const n = Number(s);
  if (mode === "zero") return n <= 65535 ? { start: n, fc } : null;
  if (mode === "one") return n >= 1 && n <= 65536 ? { start: n - 1, fc } : null;
  if (s.length >= 5) {
    const pfc = PREFIX_FC[s[0]];
    const rest = Number(s.slice(1));
    // 5자리(40001)는 9999 까지, 6자리(410000)는 65536 까지
    if (pfc && rest >= 1 && rest <= (s.length === 5 ? 9999 : 65536)) return { start: rest - 1, fc: pfc };
    return null;
  }
  return n >= 1 ? { start: n - 1, fc } : null;
}

/**
 * 0·1 기준 칸에 넣은 수가 PLC 표기(40001·30001·10001·00001)로도 읽히는지 — 현장에서 가장 흔한 «40001 을 0 기준 칸에» 실수.
 * 5~6자리이고 앞자리가 0·1·3·4 이며 PLC 로 읽히면 그 주소·함수를, 아니면 null. PLC 모드면 늘 null
 */
export function plcGuess(text: string, mode: AddrMode, fc: Fc): { start: number; fc: Fc } | null {
  if (mode === "plc") return null;
  const s = text.trim();
  if (!/^\d{5,6}$/.test(s)) return null;
  return parseAddr(s, "plc", fc);
}

// ------------------------------------------------------------------ 값 보기·쓰기 입력

/** u16 하나를 표시 방식대로 */
export function show16(v: number, f: Format): string {
  switch (f) {
    case "s16":
      return String(v > 0x7fff ? v - 0x10000 : v);
    case "hex":
      return v.toString(16).toUpperCase().padStart(4, "0");
    case "bin":
      return v.toString(2).padStart(16, "0").replace(/(.{4})(?!$)/g, "$1 ");
    default:
      return String(v);
  }
}

/** u16 입력 하나 — Modbus Slave 와 같은 규칙(regmap.ts) */
export { parse16 };

/** 칸 하나의 모양 — 점이 없으면 u16(비트 표는 bit) */
export interface Shape {
  type: VType;
  order: Order;
  len?: number;
}

export const shapeOf = (fc: Fc, p: Point | undefined): Shape => (isBitFc(fc) ? { type: "bit", order: "ABCD" } : { type: p?.type ?? "u16", order: p?.order ?? "ABCD", len: p?.len });

/**
 * 레지스터 → 화면 글. u16 은 표시 방식대로, 정수형(S16·U32·S32)은 HEX·BIN 이면 그 진법으로(부호 없이), 실수·문자열은 타입대로.
 * 칸이 모자라면 «—»
 */
export function showValue(regs: number[], s: Shape, f: Format): string {
  if (s.type === "bit") return regs.length ? (regs[0] ? "1" : "0") : "—";
  const v = decodeValue(regs, s.type, s.order, s.len);
  if (v == null) return "—";
  if (s.type === "u16") return show16(v as number, f);
  if ((f === "hex" || f === "bin") && (s.type === "s16" || s.type === "u32" || s.type === "s32")) {
    const bits = s.type === "s16" ? 16 : 32;
    const u = (v as number) < 0 ? (v as number) + 2 ** bits : (v as number);
    if (f === "hex") return u.toString(16).toUpperCase().padStart(bits / 4, "0");
    return u.toString(2).padStart(bits, "0").replace(/(.{4})(?!$)/g, "$1 ");
  }
  return formatValue(v, s.type);
}

/** 화면 칸의 숫자 값(추세·값 기록용) — 문자열·없음은 null */
export function numValue(regs: number[], s: Shape): number | null {
  if (s.type === "string") return null;
  const v = decodeValue(regs, s.type, s.order, s.len);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseBit(t: string): number | null {
  const u = t.trim().toUpperCase();
  if (u === "1" || u === "ON" || u === "TRUE") return 1;
  if (u === "0" || u === "OFF" || u === "FALSE") return 0;
  return null;
}

/**
 * 쓰기 창의 입력 → 쓸 레지스터(비트는 0/1). 틀리면 null.
 * - 비트·u16 은 쉼표·공백으로 여러 값을 이어 쓸 수 있다(이어진 칸에 0F·10 으로)
 * - 그 밖의 타입은 값 하나 → 타입의 칸 수만큼
 */
export function parseInput(text: string, s: Shape, f: Format): number[] | null {
  if (s.type === "bit") {
    const toks = text.split(/[\s,;]+/).filter(Boolean);
    if (!toks.length) return null;
    const out = toks.map(parseBit);
    return out.every((x) => x != null) ? (out as number[]) : null;
  }
  if (s.type === "u16") {
    let parts = text.split(/[,;\t\r\n]+/).map((x) => x.trim()).filter(Boolean);
    // BIN 은 4자리마다 띄어 보이므로(«0000 0001») 공백으로 나누지 않는다
    if (f !== "bin") parts = parts.flatMap((p) => p.split(/\s+/));
    if (!parts.length) return null;
    const out = parts.map((x) => parse16(x, f));
    return out.every((x) => x != null) ? (out as number[]) : null;
  }
  const v = parseValue(text, s.type, s.len);
  if (v == null) return null;
  return encodeValue(v, s.type, s.order, s.len);
}

// ------------------------------------------------------------------ CSV(레지스터 맵 — Modbus Slave 와 같은 모양)

/** 표의 점(이름·타입)과 지금 값 → CSV(엑셀용 UTF-8 BOM). 값이 없으면(읽기 전) value 칸은 비운다 */
export function exportCsv(t: PollTable, values: number[] | null): string {
  const table = FC_TABLE[t.fc];
  if (values && values.length) return toCsv(tableRows(table, t.start, values, t.points));
  const rows: CsvRow[] = layout(t.start, Math.min(t.qty, maxQty(t.fc)), t.points).map((it) => {
    const s = shapeOf(t.fc, it.point);
    return { table, address: it.addr, type: s.type, order: s.order, name: it.point?.name ?? "", value: null, len: s.len };
  });
  return toCsv(rows);
}

/**
 * CSV → 이 표의 점(이름·타입·순서). 이 표의 함수 코드와 같은 표(HR·IR…) 줄만 쓰고 나머지는 센다. 값 칸은 쓰지 않는다(장비에 쓰지 않음).
 * 틀린 줄이 있으면 errors 만
 */
export function importCsv(text: string, t: PollTable, lang: Lang): { points: Point[]; used: number; skipped: number; outside: number; errors: string[] } {
  const r = parseCsv(text, lang);
  if (r.errors.length) return { points: t.points, used: 0, skipped: 0, outside: 0, errors: r.errors };
  const table = FC_TABLE[t.fc];
  const mine = r.rows.filter((row) => row.table === table);
  const add = mine.map(rowPoint).filter((p): p is Point => !!p);
  const clear = mine.filter((row) => !rowPoint(row)).map((row) => row.address);
  const end = t.start + t.qty;
  return {
    points: mergePoints(t.points, add, clear),
    used: mine.length,
    skipped: r.rows.length - mine.length,
    outside: mine.filter((row) => row.address < t.start || row.address >= end).length,
    errors: [],
  };
}

// ------------------------------------------------------------------ 값 기록(CSV)

export const VALUE_LOG_HEADER = "time,table,address,name,value\r\n";

const p2 = (n: number) => String(n).padStart(2, "0");
/** «2026-10-18 13:05:09.123» (이 PC 시각) */
export function stamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function csvCell(s: string) {
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 폴링 한 번의 값 → 값 기록 줄들. onChange 면 지난번(prev: 주소 → 글)과 다른 칸만. prev 는 이 함수가 고쳐 둔다.
 * 값은 화면과 같은 글(타입·표시 방식대로)
 */
export function valueLogLines(ts: number, t: PollTable, tableName: string, values: number[], mode: AddrMode, onChange: boolean, prev: Map<number, string>): string {
  const out: string[] = [];
  for (const it of layout(t.start, values.length, t.points)) {
    const s = shapeOf(t.fc, it.point);
    const v = showValue(values.slice(it.addr - t.start, it.addr - t.start + it.span), s, t.format);
    if (onChange && prev.get(it.addr) === v) continue;
    prev.set(it.addr, v);
    out.push([stamp(ts), csvCell(tableName), addrLabel(t.fc, it.addr, mode), csvCell(it.point?.name ?? ""), csvCell(v)].join(","));
  }
  return out.length ? out.join("\r\n") + "\r\n" : "";
}

// ------------------------------------------------------------------ 추세(가벼운 그림)

/** 추세 하나의 열쇠 «표:주소» */
export const trendKey = (table: number, addr: number) => `${table}:${addr}`;

export interface Series {
  ts: number[];
  v: number[];
}

/** 표본을 더한다 — 최대 n 개(오래된 것부터 버림) */
export function pushSample(s: Series, ts: number, v: number, max = 600) {
  s.ts.push(ts);
  s.v.push(v);
  if (s.v.length > max) {
    s.ts.splice(0, s.ts.length - max);
    s.v.splice(0, s.v.length - max);
  }
}

/** 그림 좌표 — 시간 축은 첫·끝 표본, 값 축은 최소~최대(같으면 가운데) */
export function scaleSeries(s: Series, w: number, h: number, pad = 2): { pts: [number, number][]; min: number; max: number } {
  const n = s.v.length;
  if (!n) return { pts: [], min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of s.v) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const t0 = s.ts[0];
  const span = Math.max(1, s.ts[n - 1] - t0);
  const range = max - min;
  const pts = s.v.map((v, i): [number, number] => {
    const x = n === 1 ? w - pad : pad + ((s.ts[i] - t0) / span) * (w - 2 * pad);
    const y = range === 0 ? h / 2 : pad + (1 - (v - min) / range) * (h - 2 * pad);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  return { pts, min, max };
}

// ------------------------------------------------------------------ 통계

export interface TableStats {
  requests: number;
  ok: number;
  exceptions: number;
  timeouts: number;
  crc: number;
  bad: number;
  sendErrors: number;
  avgMs: number;
  maxMs: number;
  lastMs: number;
}

export const errorCount = (s: TableStats | undefined) => (s ? s.exceptions + s.timeouts + s.crc + s.bad + s.sendErrors : 0);

/** «12.3» / «<1» */
export const fmtMs = (ms: number) => (ms <= 0 ? "—" : ms < 1 ? "<1" : ms < 100 ? ms.toFixed(1) : String(Math.round(ms)));
