// PLC Simulator 화면 규칙 — React·Tauri 없는 부분(시험: node --test apps/plc-simulator/src/model.test.ts).
// 디바이스 번호 표기(X·Y·B·W·ZR 는 16진), 비트 ↔ 워드 묶기, 저장 파일(JSON) 검사, 장애 대상 글 읽기, 마지막 시작 설정,
// (0.6.0) 워드 ASCII·바이트 보기, 범위 채우기·문자열 써 넣기, 조건 규칙(주소 «D100.3» 읽기·검사·요약·예제·범위로 여러 개).
import { DEV_INFO, DEVS, MAX_SIZE, type Dev, type Format } from "./devs.ts";

export const isDev = (v: unknown): v is Dev => typeof v === "string" && (DEVS as string[]).includes(v);

/** 번호 글 — «D100», «X1F»(16진 디바이스) */
export const numText = (dev: Dev, n: number) => (DEV_INFO[dev].hex ? n.toString(16).toUpperCase() : String(n));
export const addrText = (dev: Dev, n: number) => `${dev}${numText(dev, n)}`;

/**
 * 번호 입력 읽기 — «100», «D100», 16진 디바이스는 «1F»·«X1F»·«0x1F». 디바이스 이름이 붙었으면 같은 디바이스여야.
 * 틀리면 null
 */
export function parseNum(dev: Dev, text: string): number | null {
  let s = text.trim().toUpperCase();
  if (s.startsWith(dev) && s.length > dev.length) s = s.slice(dev.length);
  const hex = DEV_INFO[dev].hex;
  if (hex) s = s.replace(/^0X/, "");
  if (!(hex ? /^[0-9A-F]{1,6}$/ : /^\d{1,7}$/).test(s)) return null;
  const n = parseInt(s, hex ? 16 : 10);
  return n >= 0 && n < MAX_SIZE ? n : null;
}

/** 비트 16개(번호가 작은 점이 비트 0) → 워드 */
export function packWord(bits: readonly number[]): number {
  let w = 0;
  for (let j = 0; j < 16; j++) if (bits[j]) w |= 1 << j;
  return w & 0xffff;
}
export const unpackWord = (w: number): number[] => Array.from({ length: 16 }, (_, j) => (w >> j) & 1);

/** 워드 표시 — U16·S16·HEX·BIN */
export type Fmt = "u16" | "s16" | "hex" | "bin";
export function show16(v: number, f: Fmt) {
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

/** 장애 대상 «명령» 칸 — «0401, 1401»(16진 4자리까지). 비면 []. 틀리면 null */
export function parseCommands(text: string): number[] | null {
  const out: number[] = [];
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    if (!/^(0x)?[0-9a-f]{1,4}$/i.test(tok)) return null;
    const n = parseInt(tok.replace(/^0x/i, ""), 16);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** 장애 대상 «디바이스» 칸 — «D, M». 비면 []. 틀리면 null */
export function parseDevices(text: string): Dev[] | null {
  const out: Dev[] = [];
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const d = tok.toUpperCase();
    if (!isDev(d)) return null;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

/** 강제 종료 코드 «C051»(16진, 1~FFFF). 틀리면 null */
export function parseEndCode(text: string): number | null {
  const s = text.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{1,4}$/i.test(s)) return null;
  const n = parseInt(s, 16);
  return n > 0 ? n : null;
}

// ---------------------------------------------------------------- 저장 파일(JSON)

export const STATE_APP = "PortDock PLC Simulator";

/** 디바이스마다 0 이 아닌 값만 — {"D": {"100": 5}} */
export type SparseValues = Partial<Record<Dev, Record<string, number>>>;

export interface StateFile {
  app: string;
  version: 1;
  sizes: Partial<Record<Dev, number>>;
  values: SparseValues;
  /** 칸 설정(이름·형식·순서)과 값 자동 변화 — 디바이스마다(modbus-slave regmap 의 Point·SimCfg 모양) */
  points: Partial<Record<Dev, unknown[]>>;
  sims: Partial<Record<Dev, unknown[]>>;
  /** (0.6.0) 조건 규칙 — 없으면 빈 목록 */
  rules: Rule[];
}

/** 배열(start 부터) → 0 이 아닌 칸만 */
export function sparse(start: number, values: readonly number[]): Record<string, number> {
  const m: Record<string, number> = {};
  values.forEach((v, i) => v && (m[String(start + i)] = v));
  return m;
}

/** 0 이 아닌 칸 → 이어진 덩어리 [시작, 값들] — 한 번에 쓰려고 */
export function runs(m: Record<string, number>): [number, number[]][] {
  const addrs = Object.keys(m)
    .map(Number)
    .filter((a) => Number.isInteger(a) && a >= 0 && a < MAX_SIZE)
    .sort((a, b) => a - b);
  const out: [number, number[]][] = [];
  for (const a of addrs) {
    const last = out[out.length - 1];
    if (last && last[0] + last[1].length === a) last[1].push(m[String(a)]);
    else out.push([a, [m[String(a)]]]);
  }
  return out;
}

/**
 * 저장 파일 읽기 — 틀린 칸은 버리고(skipped 에 센다) 쓸 수 있는 것만 돌려준다. 다른 프로그램의 파일이면 오류
 */
export function parseState(text: string): { state: StateFile; skipped: number } | { error: "json" | "app" } {
  let o: unknown;
  try {
    o = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { error: "json" };
  }
  if (!o || typeof o !== "object" || (o as { app?: unknown }).app !== STATE_APP) return { error: "app" };
  const src = o as Record<string, unknown>;
  let skipped = 0;
  const sizes: StateFile["sizes"] = {};
  const values: SparseValues = {};
  const points: StateFile["points"] = {};
  const sims: StateFile["sims"] = {};
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  for (const [k, v] of Object.entries(obj(src.sizes))) {
    if (isDev(k) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_SIZE) sizes[k] = v as number;
    else skipped++;
  }
  for (const [k, v] of Object.entries(obj(src.values))) {
    if (!isDev(k)) {
      skipped++;
      continue;
    }
    const bits = DEV_INFO[k].bits;
    const m: Record<string, number> = {};
    for (const [a, x] of Object.entries(obj(v))) {
      const n = Number(a);
      const ok = /^\d+$/.test(a) && n < MAX_SIZE && Number.isInteger(x) && (x as number) >= 0 && (x as number) <= (bits ? 1 : 0xffff);
      if (ok) m[a] = x as number;
      else skipped++;
    }
    values[k] = m;
  }
  for (const [name, into] of [
    ["points", points],
    ["sims", sims],
  ] as const) {
    for (const [k, v] of Object.entries(obj(src[name]))) {
      if (isDev(k) && Array.isArray(v)) into[k] = v.filter((x) => x && typeof x === "object" && Number.isInteger((x as { addr?: unknown }).addr) && (x as { addr: number }).addr >= 0 && (x as { addr: number }).addr < MAX_SIZE);
      else skipped++;
    }
  }
  const r = cleanRules(src.rules);
  skipped += r.skipped;
  return { state: { app: STATE_APP, version: 1, sizes, values, points, sims, rules: r.rules }, skipped };
}

// ---------------------------------------------------------------- 마지막으로 시작에 성공한 설정(켤 때 다시 열기)

export interface LastOk {
  transport: "tcp" | "udp";
  host: string;
  port: number;
  format: Format;
}

export function cleanLastOk(v: unknown): LastOk | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const f = o.format as Record<string, unknown> | undefined;
  if (o.transport !== "tcp" && o.transport !== "udp") return null;
  if (typeof o.host !== "string" || !o.host.trim()) return null;
  if (typeof o.port !== "number" || !Number.isInteger(o.port) || o.port < 0 || o.port > 65535) return null;
  if (!f || (f.frame !== "3e" && f.frame !== "4e") || (f.code !== "binary" && f.code !== "ascii")) return null;
  return { transport: o.transport, host: o.host.trim(), port: o.port, format: { frame: f.frame, code: f.code } };
}

/** 이 PC 안에서만 듣는 주소인지(127.x·localhost) — 아니면 다른 PC 에서 붙을 수 있다 */
export const isLoopback = (host: string) => /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|::1)$/i.test(host.trim());

// ---------------------------------------------------------------- 워드 보기: ASCII 2글자·바이트(0.6.0)

/** 워드 보기 형식 — U16·S16·HEX·BIN, ASCII(아래 바이트 글자 먼저 — PLC 문자열 순서), 바이트(위·아래, 10진) */
export type WordFmt = Fmt | "ascii" | "bytes";
export const WORD_FMTS: WordFmt[] = ["u16", "s16", "hex", "bin", "ascii", "bytes"];

const escByte = (b: number) => (b === 0x5c ? "\\\\" : b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : b === 0 ? "\\0" : `\\x${b.toString(16).toUpperCase().padStart(2, "0")}`);

/** 워드 보이기 */
export function showWord(v: number, f: WordFmt): string {
  if (f === "ascii") {
    const lo = v & 0xff;
    const hi = (v >> 8) & 0xff;
    if (v === 0) return "\\0";
    return hi === 0 ? escByte(lo) : escByte(lo) + escByte(hi);
  }
  if (f === "bytes") return `${(v >> 8) & 0xff} ${v & 0xff}`;
  return show16(v, f);
}

/** 글자·\xNN·\0·\\ → 바이트들. ASCII 밖 글자·틀린 이스케이프면 null */
export function unescapeBytes(text: string): number[] | null {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x5c) {
      const n = text[i + 1];
      if (n === "\\") {
        out.push(0x5c);
        i++;
      } else if (n === "0") {
        out.push(0);
        i++;
      } else if ((n === "x" || n === "X") && /^[0-9a-fA-F]{2}$/.test(text.slice(i + 2, i + 4))) {
        out.push(parseInt(text.slice(i + 2, i + 4), 16));
        i += 3;
      } else return null;
    } else if (c >= 0x20 && c <= 0x7e) out.push(c);
    else return null;
  }
  return out;
}

/** 워드 입력 읽기 — 틀리면 null */
export function parseWord(text: string, f: WordFmt): number | null {
  if (f === "ascii") {
    const b = unescapeBytes(text);
    if (!b || b.length === 0 || b.length > 2) return null;
    return (b[0] | ((b[1] ?? 0) << 8)) & 0xffff;
  }
  if (f === "bytes") {
    const t = text
      .trim()
      .split(/[\s,|:]+/)
      .filter(Boolean);
    if (t.length !== 2) return null;
    const n = t.map((x) => (/^0x[0-9a-f]{1,2}$/i.test(x) ? parseInt(x.slice(2), 16) : /^\d{1,3}$/.test(x) ? Number(x) : NaN));
    if (n.some((x) => !(x >= 0 && x <= 255))) return null;
    return (n[0] << 8) | n[1];
  }
  const s = text.trim().replace(/[\s_]+/g, "");
  if (!s) return null;
  let n: number;
  if (/^-?0x[0-9a-f]+$/i.test(s)) n = (s.startsWith("-") ? -1 : 1) * parseInt(s.replace(/^-?0x/i, ""), 16);
  else if (f === "hex") n = /^[0-9a-f]+$/i.test(s) ? parseInt(s, 16) : NaN;
  else if (f === "bin") n = /^[01]+$/.test(s) ? parseInt(s, 2) : NaN;
  else n = /^[-+]?\d+$/.test(s) ? Number(s) : NaN;
  if (!Number.isInteger(n)) return null;
  if (n < 0 && n >= -0x8000) n += 0x10000;
  return n >= 0 && n <= 0xffff ? n : null;
}

// ---------------------------------------------------------------- 범위 채우기·써 넣기(0.6.0)

/** 시작 값부터 증가량씩 count 개(워드는 0~65535 를 돈다, 비트는 0·1 하나로) */
export function fillSeries(count: number, value: number, step: number, bits: boolean): number[] {
  if (bits) return new Array<number>(count).fill(value ? 1 : 0);
  return Array.from({ length: count }, (_, i) => (((value + i * step) % 0x10000) + 0x10000) % 0x10000);
}

/** 문자열 → 워드들(한 워드에 두 글자 — loFirst 면 아래 바이트가 앞 글자, PLC 문자열 순서). 홀수면 끝 0, nul 이면 끝에 0 을 더 넣는다. 틀리면 null */
export function textWords(text: string, loFirst: boolean, nul: boolean): number[] | null {
  const b = unescapeBytes(text);
  if (!b || b.length === 0) return null;
  if (nul) b.push(0);
  if (b.length % 2) b.push(0);
  const out: number[] = [];
  for (let i = 0; i < b.length; i += 2) out.push(loFirst ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1]);
  return out;
}

/** 숫자 목록(«1, 2 0x10 -5») → 값들. 비트면 0·1 만. 틀리면 그 낱말 */
export function parseNumList(text: string, bits: boolean): number[] | { bad: string } {
  const toks = text.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return { bad: "" };
  const out: number[] = [];
  for (const t of toks) {
    const n = bits ? (t === "0" || t === "1" ? Number(t) : null) : parseWord(t, "u16");
    if (n == null) return { bad: t };
    out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------- 조건 규칙(0.6.0) — 백엔드 crates/core/src/mc_rules.rs 와 같은 모양

export interface RuleAddr {
  dev: Dev;
  no: number;
  /** 워드 안 비트(0~15) */
  bit?: number;
}
export type CmpOp = "eq" | "ne" | "gt" | "lt";
export type BitCondKind = "on" | "off" | "rise" | "fall";
export type Cond = { kind: "always" } | { kind: BitCondKind; at: RuleAddr } | { kind: "word"; at: RuleAddr; op: CmpOp; value: number };
export type CondKind = Cond["kind"];
export type ActOp = "on" | "off" | "toggle" | "set" | "add";
export interface RuleAction {
  at: RuleAddr;
  op: ActOp;
  value: number;
}
export interface Rule {
  id: number;
  name: string;
  enabled: boolean;
  cond: Cond;
  delayMs: number;
  /** 0 이거나 delayMs 이하면 고정 지연 */
  delayMaxMs: number;
  actions: RuleAction[];
}

export const RULE_LIMITS = { rules: 1000, actions: 16, delayMs: 3_600_000, periodMs: 50 } as const;
export const COND_KINDS: CondKind[] = ["on", "off", "rise", "fall", "word", "always"];
export const CMP_OPS: [CmpOp, string][] = [
  ["eq", "="],
  ["ne", "≠"],
  ["gt", ">"],
  ["lt", "<"],
];

const BY_LEN = [...DEVS].sort((a, b) => b.length - a.length);

/** «M100»·«X1F»·«D100.3»·«W10.F» 읽기. 틀리면 null */
export function parseRuleAddr(text: string): RuleAddr | null {
  const s = text.trim().toUpperCase();
  for (const dev of BY_LEN) {
    if (!s.startsWith(dev)) continue;
    const m = /^([0-9A-F]+)(?:\.([0-9A-F]))?$/.exec(s.slice(dev.length));
    if (!m) continue;
    const info = DEV_INFO[dev];
    if (!info.hex && !/^\d+$/.test(m[1])) continue;
    const no = parseInt(m[1], info.hex ? 16 : 10);
    if (!(no >= 0 && no < MAX_SIZE)) return null;
    if (m[2] != null) {
      if (info.bits) return null;
      return { dev, no, bit: parseInt(m[2], 16) };
    }
    return { dev, no };
  }
  return null;
}

export const ruleAddrText = (a: RuleAddr) => `${addrText(a.dev, a.no)}${a.bit != null ? `.${a.bit.toString(16).toUpperCase()}` : ""}`;
export const isBitAddr = (a: RuleAddr) => DEV_INFO[a.dev].bits || a.bit != null;
export const isBitOp = (op: ActOp) => op === "on" || op === "off" || op === "toggle";

/** 규칙 검사(백엔드와 같은 규칙) — 틀리면 이유 열쇠, 맞으면 null */
export type RuleErr = "condBit" | "condWord" | "noActions" | "tooManyActions" | "actBit" | "actWord" | "setRange" | "addRange" | "delayRange" | "periodShort";
export function checkRule(r: Rule): RuleErr | null {
  const c = r.cond;
  if (c.kind === "word" && isBitAddr(c.at)) return "condWord";
  if (c.kind !== "always" && c.kind !== "word" && !isBitAddr(c.at)) return "condBit";
  if (!r.actions.length) return "noActions";
  if (r.actions.length > RULE_LIMITS.actions) return "tooManyActions";
  for (const a of r.actions) {
    if (isBitOp(a.op) && !isBitAddr(a.at)) return "actBit";
    if (!isBitOp(a.op) && isBitAddr(a.at)) return "actWord";
    if (a.op === "set" && !(Number.isInteger(a.value) && a.value >= 0 && a.value <= 0xffff)) return "setRange";
    if (a.op === "add" && !(Number.isInteger(a.value) && a.value >= -0xffff && a.value <= 0xffff)) return "addRange";
  }
  const okDelay = (n: number) => Number.isInteger(n) && n >= 0 && n <= RULE_LIMITS.delayMs;
  if (!okDelay(r.delayMs) || !okDelay(r.delayMaxMs)) return "delayRange";
  if (c.kind === "always" && Math.max(r.delayMs, r.delayMaxMs) < RULE_LIMITS.periodMs) return "periodShort";
  return null;
}

const COND_SIGN: Record<BitCondKind, string> = { on: "ON", off: "OFF", rise: "↑", fall: "↓" };

/** 한 줄 요약 «M100 ON → 300 ms → M101 ON» */
export function ruleSummary(r: Rule, periodic: string): string {
  const c = r.cond;
  const cond = c.kind === "always" ? periodic : c.kind === "word" ? `${ruleAddrText(c.at)} ${CMP_OPS.find(([o]) => o === c.op)![1]} ${c.value}` : `${ruleAddrText(c.at)} ${COND_SIGN[c.kind]}`;
  const d = r.delayMaxMs > r.delayMs ? `${r.delayMs}–${r.delayMaxMs} ms` : `${r.delayMs} ms`;
  const acts = r.actions.map((a) => {
    const t = ruleAddrText(a.at);
    if (a.op === "on") return `${t} ON`;
    if (a.op === "off") return `${t} OFF`;
    if (a.op === "toggle") return `${t} ⇄`;
    if (a.op === "set") return `${t} = ${a.value}`;
    return `${t} ${a.value >= 0 ? "+" : ""}${a.value}`;
  });
  return `${cond} → ${d} → ${acts.join(", ")}`;
}

export const nextRuleId = (rules: readonly Rule[]) => rules.reduce((m, r) => Math.max(m, r.id), 0) + 1;

/** 핸드셰이크 예제 — 요청 M100 ON → 300 ms → 완료 M101 ON, 요청 OFF → 완료 OFF */
export function handshakeRules(firstId: number, names: [string, string]): Rule[] {
  const at = (no: number): RuleAddr => ({ dev: "M", no });
  return [
    { id: firstId, name: names[0], enabled: true, cond: { kind: "on", at: at(100) }, delayMs: 300, delayMaxMs: 0, actions: [{ at: at(101), op: "on", value: 0 }] },
    { id: firstId + 1, name: names[1], enabled: true, cond: { kind: "off", at: at(100) }, delayMs: 0, delayMaxMs: 0, actions: [{ at: at(101), op: "off", value: 0 }] },
  ];
}

/** 범위로 여러 개 — 조건·동작 번호를 k × step 만큼 옮긴 규칙 count 개(이름 뒤 «(1)»…). 번호가 넘치면 null */
export function expandRule(r: Rule, count: number, step: number, firstId: number): Rule[] | null {
  const move = (a: RuleAddr, k: number): RuleAddr | null => {
    const no = a.no + k * step;
    return no >= 0 && no < MAX_SIZE ? { ...a, no } : null;
  };
  const out: Rule[] = [];
  for (let k = 0; k < count; k++) {
    let cond: Cond | null = r.cond;
    if (r.cond.kind !== "always") {
      const at = move(r.cond.at, k);
      cond = at ? ({ ...r.cond, at } as Cond) : null;
    }
    const actions: RuleAction[] = [];
    for (const a of r.actions) {
      const at = move(a.at, k);
      if (!at) return null;
      actions.push({ ...a, at });
    }
    if (!cond) return null;
    out.push({ ...r, id: firstId + k, name: count > 1 ? `${r.name || "#"} (${k + 1})` : r.name, cond, actions });
  }
  return out;
}

function cleanAddr(x: unknown): RuleAddr | null {
  const o = x as Record<string, unknown> | null;
  if (!o || !isDev(o.dev) || !Number.isInteger(o.no) || (o.no as number) < 0 || (o.no as number) >= MAX_SIZE) return null;
  if (o.bit == null) return { dev: o.dev, no: o.no as number };
  if (!Number.isInteger(o.bit) || (o.bit as number) < 0 || (o.bit as number) > 15 || DEV_INFO[o.dev].bits) return null;
  return { dev: o.dev, no: o.no as number, bit: o.bit as number };
}

function cleanCond(c: Record<string, unknown> | undefined): Cond | null {
  if (!c) return null;
  if (c.kind === "always") return { kind: "always" };
  const at = cleanAddr(c.at);
  if (!at) return null;
  if (c.kind === "on" || c.kind === "off" || c.kind === "rise" || c.kind === "fall") return { kind: c.kind, at };
  const op = CMP_OPS.find(([k]) => k === c.op)?.[0];
  if (c.kind === "word" && op && Number.isInteger(c.value) && (c.value as number) >= 0 && (c.value as number) <= 0xffff) return { kind: "word", at, op, value: c.value as number };
  return null;
}

/** 저장해 둔·파일의 규칙 고르기 — 모양이 틀리거나 검사에 걸리는 것·번호가 겹치는 것은 버리고 센다 */
export function cleanRules(v: unknown): { rules: Rule[]; skipped: number } {
  if (!Array.isArray(v)) return { rules: [], skipped: 0 };
  const rules: Rule[] = [];
  let skipped = 0;
  for (const x of v) {
    const o = x as Record<string, unknown> | null;
    const cond = cleanCond(o?.cond as Record<string, unknown> | undefined);
    const acts = (Array.isArray(o?.actions) ? (o.actions as unknown[]) : []).map((a) => {
      const r = a as Record<string, unknown> | null;
      const at = cleanAddr(r?.at);
      const op = r?.op as ActOp;
      return at && ["on", "off", "toggle", "set", "add"].includes(op) ? { at, op, value: Number.isInteger(r!.value) ? (r!.value as number) : 0 } : null;
    });
    const ok = o && Number.isInteger(o.id) && (o.id as number) >= 1 && cond && acts.length > 0 && acts.every(Boolean);
    const rule: Rule | null = ok
      ? {
          id: o.id as number,
          name: typeof o.name === "string" ? o.name.slice(0, 60) : "",
          enabled: o.enabled !== false,
          cond: cond!,
          delayMs: Number.isInteger(o.delayMs) ? (o.delayMs as number) : 0,
          delayMaxMs: Number.isInteger(o.delayMaxMs) ? (o.delayMaxMs as number) : 0,
          actions: acts as RuleAction[],
        }
      : null;
    if (!rule || checkRule(rule) || rules.some((q) => q.id === rule.id) || rules.length >= RULE_LIMITS.rules) skipped++;
    else rules.push(rule);
  }
  return { rules, skipped };
}
