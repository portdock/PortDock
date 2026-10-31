// 장비 설정 백업·비교·복원(0.10.0) — 화면(React) 없는 부분. 장비 교체·유지보수 때 설정 레지스터를 파일로 남기고, 새 장비와 견주고, 골라서 다시 쓴다.
// 시험: node --test apps/modbus-master/src/backup.test.ts (Node 24 는 타입을 지우고 바로 돌린다 — enum 같은 TS 전용 문법은 쓰지 않는다)
//
// 파일(JSON)에는 장비 쪽 정보만 넣는다 — 사용자 메모·국번·통신 설정·읽은 시각·앱 판. PC 이름·사용자 폴더·파일 경로는 넣지 않는다.

import { FC_TABLE, isBitFc, layout, maxQty, pointRegs, shapeOf, showValue, type Fc, type Format, type Item, type Lang, type Point } from "./model.ts";
import { pollGroups, type Device } from "../../../shared/devices.ts";
import { tableRows, toCsv, type CsvRow } from "../../modbus-slave/src/regmap.ts";

export const BACKUP_FORMAT = "portdock-modbus-backup";
export const BACKUP_VERSION = 1;
/** 한 범위에 넣을 수 있는 가장 큰 개수(나눠 읽는다) */
export const RANGE_MAX = 10000;
/** 한 번에 쓰는 레지스터·코일 한도(0x10 은 123, 0x0F 는 1968) */
export const WRITE_MAX_REGS = 123;
export const WRITE_MAX_BITS = 1968;

/** 읽을 범위 한 줄 — 0 기준 주소. points 는 칸 이름·형식(장비 프로필에서 채우면 있음) */
export interface BackupRange {
  fc: Fc;
  start: number;
  qty: number;
  name?: string;
  points?: Point[];
}

/** 요청 하나로 읽은 덩어리 — 실패하면 values 는 null, error 에 이유 */
export interface BackupBlock {
  fc: Fc;
  start: number;
  qty: number;
  name?: string;
  points?: Point[];
  values: number[] | null;
  error?: string;
}

/** 통신 설정 — 장비 쪽(속도·패리티 또는 장비 IP·포트). PC 쪽 COM 이름은 넣지 않는다 */
export interface BackupComm {
  transport: "serial" | "tcp" | "rtu-tcp";
  baud?: number;
  dataBits?: number;
  parity?: "none" | "even" | "odd";
  stopBits?: number;
  host?: string;
  port?: number;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** «PortDock Modbus Master 0.10.0» */
  app: string;
  /** 읽은 시각(이 PC 시각) «2026-10-31 13:05:09» */
  readAt: string;
  note: string;
  unit: number;
  comm: BackupComm;
  /** 장비 프로필에서 범위를 채웠으면 그 프로필 */
  device?: { id: string; name: string };
  blocks: BackupBlock[];
}

const int = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

// ------------------------------------------------------------------ 범위

/** 범위 한 줄의 문제 — 없으면 null */
export function rangeProblem(r: Pick<BackupRange, "start" | "qty">, lang: Lang): string | null {
  if (!int(r.start, 0, 65535)) return lang === "ko" ? "시작 주소는 0~65535 입니다" : "Start address must be 0–65535";
  if (!int(r.qty, 1, RANGE_MAX)) return lang === "ko" ? `개수는 1~${RANGE_MAX} 입니다` : `Count must be 1–${RANGE_MAX}`;
  if (r.start + r.qty > 65536) return lang === "ko" ? "주소 끝(65535)을 넘습니다" : "Runs past address 65535";
  return null;
}

/** 범위 안에 있는 점만(점 전체가 들어올 때) */
function pointsIn(points: Point[] | undefined, start: number, end: number): Point[] | undefined {
  if (!points?.length) return undefined;
  const out = points.filter((p) => p.addr >= start && p.addr + pointRegs(p) <= end);
  return out.length ? out : undefined;
}

/**
 * 범위 하나 → 요청 하나씩 읽을 덩어리들. 한 번에 최대 limit 개(레지스터 125·비트 2000, 장비 프로필의 maxRegisters 가 더 작으면 그것).
 * 32비트·실수·문자열 칸이 덩어리 끝에 걸치면 그 칸 앞에서 끊는다(값 반쪽만 읽지 않게)
 */
export function splitRange(r: BackupRange, limit?: number): BackupRange[] {
  const max = Math.max(1, Math.min(limit ?? maxQty(r.fc), maxQty(r.fc)));
  const end = r.start + r.qty;
  const pts = isBitFc(r.fc) ? undefined : r.points;
  const out: BackupRange[] = [];
  for (let a = r.start; a < end; ) {
    let b = Math.min(a + max, end);
    if (b < end && pts) {
      const cut = pts.find((p) => p.addr > a && p.addr < b && p.addr + pointRegs(p) > b);
      if (cut) b = cut.addr;
    }
    out.push({ fc: r.fc, start: a, qty: b - a, ...(r.name ? { name: r.name } : {}), ...(pointsIn(pts, a, b) ? { points: pointsIn(pts, a, b) } : {}) });
    a = b;
  }
  return out;
}

/** 여러 범위 → 읽을 덩어리 전부(순서대로) */
export const planReads = (ranges: BackupRange[], limit?: number) => ranges.flatMap((r) => splitRange(r, limit));

/** 장비 프로필 → 읽을 범위(Modbus Master 의 «장비 프로필 불러오기» 와 같은 묶음 — 이어진 칸끼리) */
export function rangesFromDevice(d: Device, lang: Lang): BackupRange[] {
  return pollGroups(d, lang, 0).map((g) => ({
    fc: g.fc,
    start: g.start,
    qty: g.qty,
    name: g.name,
    ...(isBitFc(g.fc) || !g.points.length ? {} : { points: g.points.map((p) => ({ addr: p.addr, type: p.type, order: p.order, name: p.name, ...(p.len != null ? { len: p.len } : {}) })) }),
  }));
}

// ------------------------------------------------------------------ 파일

export function makeBackup(meta: Omit<Backup, "format" | "version" | "blocks">, blocks: BackupBlock[]): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, ...meta, note: meta.note.slice(0, 500), blocks };
}

export const backupJson = (b: Backup) => JSON.stringify(b, null, 2) + "\n";

const TYPES = ["bit", "u16", "s16", "u32", "s32", "f32", "f64", "string"];
const ORDERS = ["ABCD", "CDAB", "BADC", "DCBA"];

function cleanPoints(raw: unknown, start: number, end: number): Point[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Point[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Partial<Point>;
    if (!int(o.addr, start, end - 1) || !TYPES.includes(o.type as string) || !ORDERS.includes(o.order as string)) continue;
    const pt: Point = { addr: o.addr!, type: o.type!, order: o.order!, name: typeof o.name === "string" ? o.name.slice(0, 80) : "", ...(o.type === "string" && int(o.len, 1, 250) ? { len: o.len } : {}) };
    if (pt.addr + pointRegs(pt) <= end) out.push(pt);
  }
  return out.length ? out : undefined;
}

/** 백업 파일 글 → 백업. 모양이 틀리면 error(한·영 문장) */
export function parseBackup(text: string, lang: Lang): { backup: Backup } | { error: string } {
  const ko = lang === "ko";
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { error: ko ? "JSON 이 아닙니다" : "Not JSON" };
  }
  const o = raw as Partial<Backup> | null;
  if (!o || typeof o !== "object" || o.format !== BACKUP_FORMAT) return { error: ko ? "PortDock 장비 설정 백업 파일이 아닙니다" : "Not a PortDock device settings backup" };
  if (o.version !== BACKUP_VERSION) return { error: ko ? `모르는 판입니다(${String(o.version)}) — 새 PortDock 으로 여세요` : `Unknown version (${String(o.version)}) — open it with a newer PortDock` };
  if (!Array.isArray(o.blocks) || !o.blocks.length) return { error: ko ? "읽은 범위가 없습니다" : "No ranges in the file" };
  if (o.blocks.length > 2000) return { error: ko ? "범위가 너무 많습니다(2000 넘음)" : "Too many ranges (over 2000)" };
  const blocks: BackupBlock[] = [];
  for (let i = 0; i < o.blocks.length; i++) {
    const b = o.blocks[i] as Partial<BackupBlock> | null;
    const at = ko ? `${i + 1}번째 범위: ` : `Range ${i + 1}: `;
    if (!b || typeof b !== "object") return { error: at + (ko ? "모양이 틀림" : "bad shape") };
    if (![1, 2, 3, 4].includes(b.fc as number)) return { error: at + (ko ? "함수 코드는 01~04" : "function code must be 01–04") };
    const fc = b.fc as Fc;
    if (!int(b.start, 0, 65535) || !int(b.qty, 1, maxQty(fc)) || b.start! + b.qty! > 65536) return { error: at + (ko ? "시작·개수가 틀림" : "bad start or count") };
    let values: number[] | null = null;
    if (b.values != null) {
      const hi = isBitFc(fc) ? 1 : 0xffff;
      if (!Array.isArray(b.values) || b.values.length !== b.qty || !b.values.every((v) => int(v, 0, hi))) return { error: at + (ko ? `값이 틀림(${isBitFc(fc) ? "0·1" : "0~65535"} ${b.qty}개여야 함)` : `bad values (need ${b.qty} of ${isBitFc(fc) ? "0/1" : "0–65535"})`) };
      values = b.values.slice();
    }
    const pts = isBitFc(fc) ? undefined : cleanPoints(b.points, b.start!, b.start! + b.qty!);
    blocks.push({
      fc,
      start: b.start!,
      qty: b.qty!,
      ...(typeof b.name === "string" && b.name ? { name: b.name.slice(0, 40) } : {}),
      ...(pts ? { points: pts } : {}),
      values,
      ...(values == null ? { error: typeof b.error === "string" ? b.error.slice(0, 300) : ko ? "읽지 못함" : "Not read" } : {}),
    });
  }
  const c = (o.comm ?? {}) as Partial<BackupComm>;
  const transport = c.transport === "tcp" || c.transport === "rtu-tcp" ? c.transport : "serial";
  const comm: BackupComm = { transport };
  if (int(c.baud, 50, 20_000_000)) comm.baud = c.baud;
  if (int(c.dataBits, 5, 8)) comm.dataBits = c.dataBits;
  if (c.parity === "none" || c.parity === "even" || c.parity === "odd") comm.parity = c.parity;
  if (c.stopBits === 1 || c.stopBits === 2) comm.stopBits = c.stopBits;
  if (typeof c.host === "string" && c.host.length <= 255) comm.host = c.host;
  if (int(c.port, 1, 65535)) comm.port = c.port;
  const dev = o.device && typeof o.device === "object" && typeof o.device.id === "string" && typeof o.device.name === "string" ? { id: o.device.id.slice(0, 120), name: o.device.name.slice(0, 120) } : undefined;
  return {
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      app: typeof o.app === "string" ? o.app.slice(0, 80) : "",
      readAt: typeof o.readAt === "string" ? o.readAt.slice(0, 40) : "",
      note: typeof o.note === "string" ? o.note.slice(0, 500) : "",
      unit: int(o.unit, 0, 255) ? o.unit! : 1,
      comm,
      ...(dev ? { device: dev } : {}),
      blocks,
    },
  };
}

/**
 * 사람이 읽을 CSV — Modbus Slave·Master 의 레지스터 맵과 같은 모양(table,address,type,order,name,value; 엑셀용 BOM).
 * 읽지 못한 범위는 값 칸을 비우고 이름 칸에 «(읽지 못함)» 을 붙인다. 이 CSV 를 Modbus Slave 에 불러오면 같은 값으로 장비를 흉내 낸다
 */
export function backupCsv(b: Backup, lang: Lang): string {
  const rows: CsvRow[] = [];
  const miss = lang === "ko" ? "(읽지 못함)" : "(not read)";
  for (const k of b.blocks) {
    const table = FC_TABLE[k.fc];
    if (k.values) rows.push(...tableRows(table, k.start, k.values, k.points));
    else
      for (const it of layout(k.start, k.qty, isBitFc(k.fc) ? undefined : k.points)) {
        const s = shapeOf(k.fc, it.point);
        rows.push({ table, address: it.addr, type: s.type, order: s.order, name: `${it.point?.name ?? ""} ${miss}`.trim(), value: null, len: s.len });
      }
  }
  return toCsv(rows);
}

/** 파일 이름 «modbus-backup-국번1-2026-10-31-130509.json» (메모는 넣지 않는다) */
export function backupFileName(unit: number, readAt: string, ext: "json" | "csv"): string {
  const st = readAt.replace(/[^\d]/g, "").slice(0, 14);
  const d = st.length >= 14 ? `${st.slice(0, 4)}-${st.slice(4, 6)}-${st.slice(6, 8)}-${st.slice(8, 14)}` : "now";
  return `modbus-backup-id${unit}-${d}.${ext}`;
}

/** 덩어리들 요약 — 읽은 칸 수·실패한 범위 수 */
export function backupSummary(blocks: BackupBlock[]): { ok: number; failed: number; items: number } {
  let ok = 0;
  let failed = 0;
  let items = 0;
  for (const k of blocks) {
    if (k.values) {
      ok++;
      items += k.qty;
    } else failed++;
  }
  return { ok, failed, items };
}

// ------------------------------------------------------------------ 비교

/** «fc:주소» → 값(읽은 칸만) */
export function cellMap(blocks: BackupBlock[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const k of blocks) if (k.values) k.values.forEach((v, i) => m.set(`${k.fc}:${k.start + i}`, v));
  return m;
}

/** 비교 한 줄 — 칸 하나(32비트·실수·문자열은 묶어서) */
export interface DiffRow {
  key: string;
  fc: Fc;
  addr: number;
  span: number;
  point?: Point;
  /** 백업(왼쪽) 값 — 없으면 null(읽지 못함·범위 밖) */
  a: number[] | null;
  /** 견줄 쪽 값 — 없으면 null */
  b: number[] | null;
  same: boolean;
}

const regsAt = (m: Map<string, number>, fc: Fc, addr: number, span: number): number[] | null => {
  const out: number[] = [];
  for (let i = 0; i < span; i++) {
    const v = m.get(`${fc}:${addr + i}`);
    if (v == null) return null;
    out.push(v);
  }
  return out;
};

/**
 * 백업 a 와 b(다른 백업 또는 지금 장비에서 읽은 값)를 칸마다 견준다. 칸 모양(이름·형식)은 a 의 것.
 * a 에서 읽지 못한 범위는 b 의 값만 있는 줄로, b 에만 있는 칸도 줄로 넣는다(같지 않음)
 */
export function compareBlocks(a: BackupBlock[], b: BackupBlock[]): DiffRow[] {
  const ma = cellMap(a);
  const mb = cellMap(b);
  const rows: DiffRow[] = [];
  const seen = new Set<string>();
  const push = (fc: Fc, it: Item) => {
    const key = `${fc}:${it.addr}`;
    if (seen.has(key)) return;
    for (let i = 0; i < it.span; i++) seen.add(`${fc}:${it.addr + i}`);
    const ra = regsAt(ma, fc, it.addr, it.span);
    const rb = regsAt(mb, fc, it.addr, it.span);
    const same = !!ra && !!rb && ra.every((v, i) => v === rb[i]);
    rows.push({ key, fc, addr: it.addr, span: it.span, ...(it.point ? { point: it.point } : {}), a: ra, b: rb, same });
  };
  for (const k of a) for (const it of layout(k.start, k.qty, isBitFc(k.fc) ? undefined : k.points)) push(k.fc, it);
  for (const k of b) {
    if (!k.values) continue;
    for (const it of layout(k.start, k.qty, isBitFc(k.fc) ? undefined : k.points)) push(k.fc, it);
  }
  return rows.sort((x, y) => x.fc - y.fc || x.addr - y.addr);
}

/** 비교 줄의 값 글 — 화면 표시 형식(U16·S16·HEX·BIN, 칸 형식·워드 순서) 그대로. 없으면 «—» */
export const diffText = (r: Pick<DiffRow, "fc" | "point">, regs: number[] | null, f: Format) => (regs ? showValue(regs, shapeOf(r.fc, r.point), f) : "—");

// ------------------------------------------------------------------ 복원(쓰기)

/** 쓸 수 없는 이유 — 입력 레지스터·접점(04·02), 장비 프로필의 읽기 전용, 너무 김, 백업에서 읽지 못함 */
export type BlockReason = "input" | "profile-ro" | "too-long" | "no-value";

export interface RestoreRow {
  key: string;
  fc: Fc;
  addr: number;
  span: number;
  point?: Point;
  /** 백업 값(쓸 값) */
  values: number[] | null;
  /** 쓸 수 없으면 그 이유 */
  blocked: BlockReason | null;
}

/** 장비 프로필에서 이 칸이 읽기 전용(access r)인지 — 코일(01)·보유 레지스터(03)만 본다 */
export function profileReadOnly(d: Device | undefined, fc: Fc, addr: number, span: number): boolean {
  if (!d || (fc !== 1 && fc !== 3)) return false;
  const table = FC_TABLE[fc];
  return d.registers.some((r) => {
    if (r.table !== table || r.access !== "r") return false;
    const n = r.type === "u32" || r.type === "s32" || r.type === "f32" ? 2 : r.type === "f64" ? 4 : r.type === "string" ? Math.max(1, Math.ceil((r.len ?? 2) / 2)) : 1;
    return r.address < addr + span && addr < r.address + n;
  });
}

/** 백업 → 복원 표의 줄들(칸 단위). 기본은 아무것도 고르지 않는다(고르는 것은 화면) */
export function restoreRows(b: Backup, device?: Device): RestoreRow[] {
  const rows: RestoreRow[] = [];
  const seen = new Set<string>();
  for (const k of b.blocks) {
    for (const it of layout(k.start, k.qty, isBitFc(k.fc) ? undefined : k.points)) {
      const key = `${k.fc}:${it.addr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const values = k.values ? k.values.slice(it.addr - k.start, it.addr - k.start + it.span) : null;
      const blocked: BlockReason | null =
        k.fc === 2 || k.fc === 4
          ? "input"
          : !values
            ? "no-value"
            : profileReadOnly(device, k.fc, it.addr, it.span)
              ? "profile-ro"
              : it.span > (k.fc === 1 ? WRITE_MAX_BITS : WRITE_MAX_REGS)
                ? "too-long"
                : null;
      rows.push({ key, fc: k.fc, addr: it.addr, span: it.span, ...(it.point ? { point: it.point } : {}), values, blocked });
    }
  }
  return rows.sort((x, y) => x.fc - y.fc || x.addr - y.addr);
}

/** 고른 줄 → 쓰기 요청(칸 하나에 요청 하나 — 장비가 빈 주소를 거부해도 다른 칸이 막히지 않게). 막힌 줄은 뺀다 */
export function writePlan(rows: RestoreRow[], picked: Set<string>): { row: RestoreRow; bits: boolean; start: number; values: number[] }[] {
  return rows.filter((r) => picked.has(r.key) && !r.blocked && r.values).map((r) => ({ row: r, bits: r.fc === 1, start: r.addr, values: r.values! }));
}

/** 쓸 칸을 다시 읽을 범위(이어진 칸끼리 묶고 함수 한도로 나눔) */
export function readBackRanges(rows: Pick<RestoreRow, "fc" | "addr" | "span">[]): BackupRange[] {
  const list = rows.slice().sort((x, y) => x.fc - y.fc || x.addr - y.addr);
  const out: BackupRange[] = [];
  for (const r of list) {
    const last = out[out.length - 1];
    if (last && last.fc === r.fc && r.addr <= last.start + last.qty && r.addr + r.span - last.start <= maxQty(r.fc)) last.qty = Math.max(last.qty, r.addr + r.span - last.start);
    else out.push({ fc: r.fc, start: r.addr, qty: r.span });
  }
  return out;
}

/** 복원(미리보기·쓰기)에 쓸 수 없는 국번 — RTU 의 0 은 브로드캐스트(버스의 모든 장비가 받는다), 248~255 는 예약.
 *  손으로는 입력칸이 막지만 파일에서 연 백업의 국번(예: TCP 에서 국번 0 으로 받은 것)은 그대로 들어오므로 여기서 한 번 더 본다.
 *  TCP 의 0 은 장비에 바로 붙으면 보통 국번이지만 게이트웨이 뒤라면 브로드캐스트일 수 있다 — 미리보기에서 한 칸이라도 답해야 쓰게 한다(previewReadAny) */
export type UnitProblem = "broadcast" | "reserved";
export function restoreUnitProblem(unit: number, wire: "tcp" | "rtu"): UnitProblem | null {
  if (wire !== "rtu") return null;
  if (unit === 0) return "broadcast";
  if (unit >= 248) return "reserved";
  return null;
}

/** 미리보기에서 한 칸이라도 지금 값을 읽었는지 — 하나도 못 읽었으면 국번·연결이 틀렸을 수 있어 «쓰기» 를 막는다 */
export const previewReadAny = (preview: Map<string, number[] | null>) => [...preview.values()].some((v) => v !== null);

/** 쓴 뒤 다시 읽은 값과 견주기 — 줄마다 «맞음 / 다름 / 다시 읽지 못함 / 쓰기 실패 / 멈춰서 쓰지 않음» */
export type VerifyState = "match" | "differ" | "unread" | "write-failed" | "skipped";
/** ok: 썼으면 true, 장비가 거절했으면 false, 멈춰서 보내지 않았으면 "skipped" */
export function verifyRows(written: { row: RestoreRow; ok: boolean | "skipped" }[], readBack: BackupBlock[]): { row: RestoreRow; state: VerifyState; got: number[] | null }[] {
  const m = cellMap(readBack);
  return written.map(({ row, ok }) => {
    const got = regsAt(m, row.fc, row.addr, row.span);
    if (ok === "skipped") return { row, state: "skipped" as const, got };
    if (!ok) return { row, state: "write-failed" as const, got };
    if (!got) return { row, state: "unread" as const, got };
    return { row, state: got.every((v, i) => v === row.values![i]) ? ("match" as const) : ("differ" as const), got };
  });
}
