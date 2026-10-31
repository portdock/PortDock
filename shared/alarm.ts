// (0.10.0) 값 감시·알람 — 값마다 «하한·상한·변화 없음(멈춤) N초·통신 끊김 N초» 조건을 걸고, 걸리고 풀린 때를 기록한다.
// PortDock 은 안전 장치가 아니다 — 감시 보조용. 판정은 화면에서만 하고 장비에 아무것도 쓰지 않는다.
// React·Tauri 없는 부분(시험: node --test shared/alarm.test.ts). Modbus Master(표의 칸)·Plot(채널)이 함께 쓴다.

export type AlarmKind = "lo" | "hi" | "stuck" | "lost";
export const ALARM_KINDS: AlarmKind[] = ["lo", "hi", "stuck", "lost"];

/** 값 하나의 감시 조건. 비운 조건(null)은 보지 않는다 */
export interface AlarmRule {
  /** 무엇을 보나 — Modbus Master «표id:주소», Plot «ch:채널» */
  key: string;
  /** 이 값보다 작으면 */
  lo: number | null;
  /** 이 값보다 크면 */
  hi: number | null;
  /** 값이 이 초 동안 그대로면(멈춤) */
  stuckSec: number | null;
  /** 이 초 동안 값을 못 받으면(통신 끊김) */
  lostSec: number | null;
  /** 되돌아올 때 여유(히스테리시스, 값 단위) — 하한 알람은 lo + hyst 이상, 상한 알람은 hi − hyst 이하가 돼야 풀린다 */
  hyst: number;
}

export const emptyRule = (key: string): AlarmRule => ({ key, lo: null, hi: null, stuckSec: null, lostSec: null, hyst: 0 });
/** 조건이 하나라도 있는지 */
export const ruleUsed = (r: AlarmRule) => r.lo != null || r.hi != null || r.stuckSec != null || r.lostSec != null;
export const kindOn = (r: AlarmRule, k: AlarmKind) => (k === "lo" ? r.lo != null : k === "hi" ? r.hi != null : k === "stuck" ? r.stuckSec != null : r.lostSec != null);

/** 조건 확인 — 틀리면 이유(글 열쇠), 맞으면 null */
export function ruleProblem(r: AlarmRule): "loHi" | "secs" | "hyst" | null {
  if (r.lo != null && r.hi != null && r.lo >= r.hi) return "loHi";
  for (const s of [r.stuckSec, r.lostSec]) if (s != null && !(s >= 1 && s <= 86_400)) return "secs";
  if (!(r.hyst >= 0) || !Number.isFinite(r.hyst)) return "hyst";
  return null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const secs = (v: unknown) => {
  const n = num(v);
  return n != null && n >= 1 && n <= 86_400 ? Math.round(n) : null;
};
/** 저장해 둔 조건 목록을 믿을 수 있게 — 틀린 칸은 비우고, 조건이 없거나 열쇠가 겹치면 뺀다(최대 max 개) */
export function sanitizeRules(raw: unknown, max = 200): AlarmRule[] {
  const out: AlarmRule[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r || typeof r !== "object") continue;
    const o = r as Partial<AlarmRule>;
    if (typeof o.key !== "string" || !o.key || o.key.length > 40 || seen.has(o.key)) continue;
    const rule: AlarmRule = { key: o.key, lo: num(o.lo), hi: num(o.hi), stuckSec: secs(o.stuckSec), lostSec: secs(o.lostSec), hyst: Math.max(0, num(o.hyst) ?? 0) };
    if (rule.lo != null && rule.hi != null && rule.lo >= rule.hi) rule.hi = null;
    if (!ruleUsed(rule)) continue;
    seen.add(o.key);
    out.push(rule);
    if (out.length >= max) break;
  }
  return out;
}

// ---------------------------------------------------------------- 판정

/** 값 하나의 감시 상태(화면 쪽에서 열쇠마다 하나) */
export interface Watch {
  /** 마지막으로 받은 값 */
  last: number | null;
  /** 값이 마지막으로 바뀐 때(처음 받은 때 포함) */
  changedAt: number;
  /** 마지막으로 값을 받은 때(감시를 시작한 때로 시작) */
  okAt: number;
  /** 지금 걸린 조건 */
  active: AlarmKind[];
}

/** 걸리거나(on) 풀린(off) 순간 */
export interface AlarmEdge {
  key: string;
  kind: AlarmKind;
  on: boolean;
  ts: number;
  /** 그때 값(통신 끊김은 null) */
  value: number | null;
}

export const newWatch = (ts: number): Watch => ({ last: null, changedAt: ts, okAt: ts, active: [] });

function set(w: Watch, rule: AlarmRule, kind: AlarmKind, on: boolean, ts: number, value: number | null, out: AlarmEdge[]) {
  const was = w.active.includes(kind);
  if (was === on) return;
  w.active = on ? [...w.active, kind] : w.active.filter((k) => k !== kind);
  out.push({ key: rule.key, kind, on, ts, value });
}

/** 조건이 지워진 알람은 풀어 둔다 */
function dropUnused(rule: AlarmRule, w: Watch, ts: number, out: AlarmEdge[]) {
  for (const k of w.active) if (!kindOn(rule, k)) set(w, rule, k, false, ts, w.last, out);
}

/**
 * 값 하나를 받았다 — value 가 null 이면 이번 읽기가 실패했다(통신 끊김 판정에만 쓴다). w 를 고친다
 * - 하한: value < lo 에서 걸리고 value ≥ lo + hyst 에서 풀린다. 상한: value > hi 에서 걸리고 value ≤ hi − hyst 에서 풀린다
 * - 멈춤: 값이 stuckSec 동안 그대로면 걸리고, 바뀌면 풀린다(값을 받을 때만 본다 — 끊긴 동안은 «끊김» 이 맡는다)
 * - 끊김: 마지막으로 값을 받은 뒤 lostSec 이 지나면 걸리고, 값을 받으면 풀린다
 */
export function stepWatch(rule: AlarmRule, w: Watch, ts: number, value: number | null): AlarmEdge[] {
  const out: AlarmEdge[] = [];
  dropUnused(rule, w, ts, out);
  if (value == null || !Number.isFinite(value)) {
    if (rule.lostSec != null && ts - w.okAt >= rule.lostSec * 1000) set(w, rule, "lost", true, ts, null, out);
    return out;
  }
  w.okAt = ts;
  set(w, rule, "lost", false, ts, value, out);
  if (w.last == null || value !== w.last) {
    w.changedAt = ts;
    set(w, rule, "stuck", false, ts, value, out);
  }
  w.last = value;
  if (rule.stuckSec != null && ts - w.changedAt >= rule.stuckSec * 1000) set(w, rule, "stuck", true, ts, value, out);
  const h = Math.max(0, rule.hyst);
  if (rule.lo != null) {
    if (value < rule.lo) set(w, rule, "lo", true, ts, value, out);
    else if (value >= rule.lo + h) set(w, rule, "lo", false, ts, value, out);
  }
  if (rule.hi != null) {
    if (value > rule.hi) set(w, rule, "hi", true, ts, value, out);
    else if (value <= rule.hi - h) set(w, rule, "hi", false, ts, value, out);
  }
  return out;
}

/** 시간만 흘렀다(값이 오지 않음 — 연결이 끊겨 폴링 결과가 없을 때) — 끊김만 본다 */
export function tickWatch(rule: AlarmRule, w: Watch, now: number): AlarmEdge[] {
  const out: AlarmEdge[] = [];
  dropUnused(rule, w, now, out);
  if (rule.lostSec != null && now - w.okAt >= rule.lostSec * 1000) set(w, rule, "lost", true, now, null, out);
  return out;
}

// ---------------------------------------------------------------- 알람 목록

export interface AlarmEntry {
  id: number;
  key: string;
  kind: AlarmKind;
  /** 걸린 때·풀린 때(아직이면 null) */
  start: number;
  end: number | null;
  /** 걸린 때의 값 */
  value: number | null;
  /** 확인(소리·깜빡임 멈춤) */
  acked: boolean;
}

/** 목록에 남길 최대 건수 — 넘치면 끝난 것 가운데 오래된 것부터 버린다 */
export const MAX_ENTRIES = 300;

/** 걸리고 풀린 순간들을 목록에 — 걸리면 맨 앞에 새 줄, 풀리면 그 열쇠·조건의 열린 줄에 끝 시각. raised = 새로 걸린 줄들 */
export function applyEdges(list: AlarmEntry[], edges: AlarmEdge[], nextId: () => number): { list: AlarmEntry[]; raised: AlarmEntry[]; cleared: AlarmEntry[] } {
  if (!edges.length) return { list, raised: [], cleared: [] };
  let next = list.slice();
  const raised: AlarmEntry[] = [];
  const cleared: AlarmEntry[] = [];
  for (const e of edges) {
    if (e.on) {
      const it: AlarmEntry = { id: nextId(), key: e.key, kind: e.kind, start: e.ts, end: null, value: e.value, acked: false };
      next.unshift(it);
      raised.push(it);
    } else {
      const i = next.findIndex((x) => x.key === e.key && x.kind === e.kind && x.end == null);
      if (i >= 0) {
        next[i] = { ...next[i], end: e.ts };
        cleared.push(next[i]);
      }
    }
  }
  if (next.length > MAX_ENTRIES) {
    let over = next.length - MAX_ENTRIES;
    const drop = new Set<number>();
    for (let i = next.length - 1; i >= 0 && over > 0; i--)
      if (next[i].end != null) {
        drop.add(next[i].id);
        over--;
      }
    next = next.filter((x) => !drop.has(x.id));
  }
  return { list: next, raised, cleared };
}

/** 감시를 멈출 때 — 열린 줄을 모두 닫는다 */
export function closeAll(list: AlarmEntry[], ts: number): { list: AlarmEntry[]; closed: AlarmEntry[] } {
  const closed: AlarmEntry[] = [];
  const next = list.map((x) => {
    if (x.end != null) return x;
    const c = { ...x, end: ts };
    closed.push(c);
    return c;
  });
  return { list: closed.length ? next : list, closed };
}

/** 확인 안 된 열린 알람이 있는지(소리·작업 표시줄 깜빡임) */
export const unacked = (list: AlarmEntry[]) => list.some((x) => !x.acked && x.end == null);
/** 지금 알람이 걸린 열쇠들(화면 줄 강조) */
export const activeKeys = (list: AlarmEntry[]) => new Set(list.filter((x) => x.end == null).map((x) => x.key));

// ---------------------------------------------------------------- 글

/** 조건 글(언어와 상관없이 같은 모양 — CSV·목록) «< 10», «> 90», «stuck 30 s», «lost 5 s» */
export function condText(rule: AlarmRule | undefined, kind: AlarmKind): string {
  if (!rule) return kind;
  const h = rule.hyst > 0 ? ` (±${rule.hyst})` : "";
  switch (kind) {
    case "lo":
      return `< ${rule.lo}${h}`;
    case "hi":
      return `> ${rule.hi}${h}`;
    case "stuck":
      return `stuck ${rule.stuckSec} s`;
    default:
      return `lost ${rule.lostSec} s`;
  }
}

/** 조건 모음 한 줄 «< 10 · > 90 · stuck 30 s» */
export const ruleSummary = (r: AlarmRule) => ALARM_KINDS.filter((k) => kindOn(r, k)).map((k) => condText(r, k)).join(" · ");

/** 지속 시간 «12 s», «3:05», «1:02:03» */
export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p2 = (n: number) => String(n).padStart(2, "0");
  if (h) return `${h}:${p2(m)}:${p2(r)}`;
  if (m) return `${m}:${p2(r)}`;
  return `${r} s`;
}

// ---------------------------------------------------------------- CSV(알람 기록 — «파일로 계속 저장» 과 같은 방식으로 덧붙임)

export const ALARM_CSV_HEADER = "time,event,name,condition,value,duration_s\r\n";

const p2 = (n: number) => String(n).padStart(2, "0");
/** «2026-10-31 13:05:09.123»(이 PC 시각) */
export function stampLocal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function cell(s: string) {
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 기록 한 줄 — event: raise(걸림)·clear(풀림)·ack(확인)·stop(감시 멈춤으로 닫음) */
export function alarmCsvLine(event: "raise" | "clear" | "ack" | "stop", e: AlarmEntry, name: string, rule: AlarmRule | undefined, ts: number): string {
  const dur = event === "clear" || event === "stop" ? ((ts - e.start) / 1000).toFixed(1) : "";
  return [stampLocal(ts), event, cell(name), cell(condText(rule, e.kind)), e.value == null ? "" : String(e.value), dur].join(",") + "\r\n";
}
