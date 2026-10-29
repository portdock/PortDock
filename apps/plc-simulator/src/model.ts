// PLC Simulator 화면 규칙 — React·Tauri 없는 부분(시험: node --test apps/plc-simulator/src/model.test.ts).
// 디바이스 번호 표기(X·Y·B·W·ZR 는 16진), 비트 ↔ 워드 묶기, 저장 파일(JSON) 검사, 장애 대상 글 읽기, 마지막 시작 설정.
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
  return { state: { app: STATE_APP, version: 1, sizes, values, points, sims }, skipped };
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
