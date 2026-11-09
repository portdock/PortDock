// 화면 로직의 순수 함수 — React·Tauri 없이 시험한다(node --test apps/packet/src/logic.test.ts)

/** 시각 표시 형식 */
export type TimeMode = "rel" | "abs" | "delta" | "deltaView";

export interface RowTime {
  hasTs: boolean;
  sec: number;
  nsec: number;
  relNs: number;
  deltaNs: number;
  deltaViewNs: number;
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** ns → «1.234567»(초) */
export function secText(ns: number, digits = 6): string {
  const neg = ns < 0;
  const a = Math.abs(ns);
  const s = Math.floor(a / 1e9);
  const frac = pad(Math.floor(a % 1e9), 9).slice(0, digits);
  return `${neg ? "-" : ""}${s}.${frac}`;
}

export function timeText(r: RowTime, mode: TimeMode): string {
  if (!r.hasTs) return "";
  switch (mode) {
    case "rel":
      return secText(r.relNs);
    case "delta":
      return r.deltaNs < 0 ? "" : secText(r.deltaNs);
    case "deltaView":
      return r.deltaViewNs < 0 ? "" : secText(r.deltaViewNs);
    case "abs": {
      const d = new Date(r.sec * 1000);
      return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(r.nsec, 9).slice(0, 6)}`;
    }
  }
}

/** 응답 시간(ns) → «8.0 ms» · «250 µs» · «1.20 s» */
export function rtText(ns: number | null | undefined): string {
  if (ns === null || ns === undefined || ns < 0) return "—";
  if (ns < 1000) return `${ns} ns`;
  if (ns < 1e6) return `${(ns / 1e3).toFixed(ns < 1e4 ? 1 : 0)} µs`;
  if (ns < 1e9) return `${(ns / 1e6).toFixed(ns < 1e7 ? 2 : ns < 1e8 ? 1 : 0)} ms`;
  return `${(ns / 1e9).toFixed(2)} s`;
}

export function bytesText(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function durationText(ns: number): string {
  if (ns <= 0) return "0 s";
  if (ns < 1e9) return rtText(ns);
  const s = ns / 1e9;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s - m * 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ---------------------------------------------------------------- 가상 스크롤

/** 브라우저가 견디는 요소 높이 상한(px) — 넘으면 스크롤 위치를 비율로 환산한다 */
export const MAX_SPACER_PX = 30_000_000;

export interface VWin {
  first: number;
  last: number;
  /** 첫 행을 그릴 위치(스크롤 칸 안 px) */
  offset: number;
  spacer: number;
  scale: number;
}

/** 스크롤 위치 → 보이는 행 범위(앞뒤 overscan 포함). total 행·행 높이 rowH·보이는 높이 viewH */
export function windowOf(scrollTop: number, viewH: number, rowH: number, total: number, overscan = 8, maxPx = MAX_SPACER_PX): VWin {
  const full = total * rowH;
  const spacer = Math.min(full, maxPx);
  const scale = full > spacer ? (full - viewH) / Math.max(1, spacer - viewH) : 1;
  const virtualTop = scrollTop * scale;
  const first = Math.max(0, Math.min(total - 1, Math.floor(virtualTop / rowH)) - overscan);
  const last = Math.min(total - 1, Math.ceil((virtualTop + viewH) / rowH) + overscan);
  // 스케일된 경우 첫 행 위치는 스크롤 위치 기준으로 맞춘다(행이 손가락 아래에서 안 튀게)
  const offset = scale === 1 ? first * rowH : scrollTop - (virtualTop - first * rowH);
  return { first, last, offset, spacer, scale };
}

/** 목록 위치 pos 를 보이게 하려는 scrollTop(이미 보이면 null) */
export function scrollToShow(pos: number, scrollTop: number, viewH: number, rowH: number, total: number, maxPx = MAX_SPACER_PX): number | null {
  const full = total * rowH;
  const spacer = Math.min(full, maxPx);
  const scale = full > spacer ? (full - viewH) / Math.max(1, spacer - viewH) : 1;
  const top = pos * rowH;
  const vTop = scrollTop * scale;
  if (top >= vTop && top + rowH <= vTop + viewH) return null;
  const want = top < vTop ? top : top + rowH - viewH;
  return Math.max(0, want / scale);
}

/** 키보드로 고른 위치를 옮긴다 */
export function moveSel(sel: number, key: string, page: number, total: number): number {
  if (total <= 0) return -1;
  if (sel < 0) return key === "End" ? total - 1 : 0;
  const cur = sel;
  const to = key === "ArrowDown" ? cur + 1 : key === "ArrowUp" ? cur - 1 : key === "PageDown" ? cur + page : key === "PageUp" ? cur - page : key === "Home" ? 0 : key === "End" ? total - 1 : cur;
  return Math.max(0, Math.min(total - 1, to));
}

/** 행 덩어리 캐시 — 덩어리 번호 목록(이미 있는 건 빼고) */
export function missingChunks(first: number, last: number, size: number, have: (c: number) => boolean): number[] {
  const out: number[] = [];
  for (let c = Math.floor(first / size); c <= Math.floor(last / size); c++) if (!have(c)) out.push(c);
  return out;
}

// ---------------------------------------------------------------- 열

export const COLUMN_IDS = ["no", "time", "src", "dst", "proto", "len", "rt", "info"] as const;
export type ColId = (typeof COLUMN_IDS)[number];
export const DEFAULT_WIDTHS: Record<ColId, number> = { no: 64, time: 110, src: 150, dst: 150, proto: 96, len: 60, rt: 90, info: 600 };
export const MIN_COL = 40;

export interface ColCfg {
  hidden: ColId[];
  widths: Partial<Record<ColId, number>>;
}

export function colWidth(cfg: ColCfg, id: ColId): number {
  const w = cfg.widths[id];
  return typeof w === "number" && Number.isFinite(w) ? Math.max(MIN_COL, Math.min(2000, Math.round(w))) : DEFAULT_WIDTHS[id];
}

export function visibleCols(cfg: ColCfg): ColId[] {
  const h = new Set(cfg.hidden);
  const v = COLUMN_IDS.filter((c) => !h.has(c));
  return v.length ? v : ["no"];
}

export function sanitizeCols(v: unknown): ColCfg {
  const o = (v && typeof v === "object" ? v : {}) as Partial<ColCfg>;
  const hidden = Array.isArray(o.hidden) ? o.hidden.filter((x): x is ColId => (COLUMN_IDS as readonly string[]).includes(x as string)) : [];
  const widths: ColCfg["widths"] = {};
  if (o.widths && typeof o.widths === "object") for (const id of COLUMN_IDS) if (typeof o.widths[id] === "number") widths[id] = o.widths[id];
  return { hidden, widths };
}

export const gridTemplate = (cfg: ColCfg) => visibleCols(cfg).map((c) => (c === "info" ? `minmax(${colWidth(cfg, c)}px, 1fr)` : `${colWidth(cfg, c)}px`)).join(" ");

// ---------------------------------------------------------------- 필터

/** 입력 글을 (보통 / 틀린 곳) 조각으로 나눈다 — 오류 위치·길이는 엔진이 준다 */
export function errorSegments(text: string, pos: number, len: number): { text: string; bad: boolean }[] {
  if (pos < 0 || pos >= text.length) return [{ text, bad: false }];
  const end = Math.min(text.length, pos + Math.max(1, len));
  const out = [
    { text: text.slice(0, pos), bad: false },
    { text: text.slice(pos, end), bad: true },
    { text: text.slice(end), bad: false },
  ];
  return out.filter((s) => s.text.length > 0);
}

/** 커서 앞의 «필드 이름 조각» — 자동 완성 대상(없으면 null) */
export function wordBefore(text: string, caret: number): { word: string; start: number } | null {
  const m = /[A-Za-z_][A-Za-z0-9_.]*$/.exec(text.slice(0, caret));
  return m ? { word: m[0], start: caret - m[0].length } : null;
}

/** 완성한 필드 이름을 넣는다 */
export function applyCompletion(text: string, caret: number, name: string): { text: string; caret: number } {
  const w = wordBefore(text, caret);
  const start = w ? w.start : caret;
  const next = text.slice(0, start) + name + text.slice(caret);
  return { text: next, caret: start + name.length };
}

/** 필드 뒤 «== » 다음에 제안할 값(자주 쓰는 것만) */
const VALUES: Record<string, string[]> = {
  "modbus.func_code": ["1", "2", "3", "4", "5", "6", "15", "16", "23"],
  "modbus.exception_code": ["1", "2", "3", "4", "6"],
  "mc.end_code": ["0", "0xc050", "0xc059", "0xc05c"],
  "xgt.error_code": ["0", "4"],
  "tcp.port": ["502", "5007", "2004", "44818"],
  "udp.port": ["53", "67", "68"],
  "ip.proto": ["1", "6", "17"],
  "expert.severity": ['"error"', '"warn"', '"note"', '"chat"'],
  "expert.key": ['"pair.no_response"', '"pair.closed"', '"modbus.exception"', '"mc.end_code"', '"xgt.error"', '"tcp.retransmission"'],
  "frame.protocols": ['"mbtcp"', '"mc"', '"xgt"', '"dns"'],
};

export function valueSuggestions(text: string, caret: number): { field: string; values: string[]; typed: string } | null {
  const m = /([A-Za-z_][A-Za-z0-9_.]*)\s*(?:==|!=|contains|matches)\s*("?[\w.:]*)$/.exec(text.slice(0, caret));
  if (!m) return null;
  const all = VALUES[m[1]];
  if (!all) return null;
  const typed = m[2];
  const values = all.filter((v) => v.startsWith(typed) && v !== typed);
  return values.length ? { field: m[1], values, typed } : null;
}

/** 이력에 넣는다 — 중복은 맨 앞으로, 20개까지 */
export function pushHistory(h: string[], text: string, max = 20): string[] {
  const t = text.trim();
  if (!t) return h;
  return [t, ...h.filter((x) => x !== t)].slice(0, max);
}

/** 이미 있는 필터에 조건을 «그리고» 로 붙인다(같은 조건이면 그대로) */
export function andFilter(cur: string, add: string): string {
  const c = cur.trim();
  if (!c) return add;
  if (c === add || c.includes(`(${add})`)) return c;
  return `(${c}) && (${add})`;
}

/** 필터 단추 — 열쇠는 i18n 의 fb_<id> */
export const QUICK_FILTERS: { id: string; expr: string }[] = [
  { id: "modbus", expr: "mbtcp || modbus" },
  { id: "mc", expr: "mc" },
  { id: "xgt", expr: "xgt" },
  { id: "errors", expr: 'expert.key == "modbus.exception" || expert.key == "mc.end_code" || expert.key == "xgt.error" || expert.key == "pair.no_response" || expert.key == "pair.closed"' },
  { id: "noresp", expr: 'expert.key == "pair.no_response" || expert.key == "pair.closed"' },
  { id: "retrans", expr: "tcp.analysis.retransmission || tcp.analysis.fast_retransmission || tcp.flags.reset" },
];

// ---------------------------------------------------------------- 바이트 칸

export function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const printable = (b: number) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".");

export interface HexLine {
  offset: number;
  bytes: number[];
}

export function hexLines(data: Uint8Array, width = 16): HexLine[] {
  const out: HexLine[] = [];
  for (let o = 0; o < data.length; o += width) out.push({ offset: o, bytes: Array.from(data.subarray(o, o + width)) });
  return out;
}

export const inRange = (i: number, sel: { start: number; len: number } | null) => !!sel && sel.len > 0 && i >= sel.start && i < sel.start + sel.len;

// ---------------------------------------------------------------- 해석 트리

export interface TNode {
  label: string;
  name: string;
  start: number;
  len: number;
  expert: string | null;
  children: TNode[];
}

/** 노드 경로 열쇠 «0.2.1» */
export const pathKey = (p: number[]) => p.join(".");

export interface FlatNode {
  node: TNode;
  path: number[];
  depth: number;
  open: boolean;
  hasKids: boolean;
}

/** 펼친 노드만 줄로 편다. 기본: 맨 위 계층은 펼침 */
export function flattenTree(tree: TNode[], collapsed: Set<string>, expandedDeep: Set<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (nodes: TNode[], base: number[], depth: number) => {
    nodes.forEach((n, i) => {
      const path = [...base, i];
      const key = pathKey(path);
      const hasKids = n.children.length > 0;
      const defaultOpen = depth === 0 || expandedDeep.has(key);
      const open = hasKids && (defaultOpen ? !collapsed.has(key) : false);
      out.push({ node: n, path, depth, open, hasKids });
      if (open) walk(n.children, path, depth + 1);
    });
  };
  walk(tree, [], 0);
  return out;
}

export interface FieldRef {
  name: string;
  start: number;
  len: number;
  filter: string | null;
}

/** 트리 노드의 필터 — «필터로 적용»(필드 있음 확인) · «이 값만 보기»(값 고정) */
export function nodeFilters(n: TNode, fields: FieldRef[]): { apply: string | null; only: string | null } {
  if (!n.name) return { apply: null, only: null };
  const exact = fields.find((f) => f.name === n.name && f.start === n.start && f.len === n.len) ?? fields.find((f) => f.name === n.name);
  return { apply: n.name, only: exact?.filter ?? null };
}

/** 한 노드 아래 모든 경로(전체 펼치기) */
export function allPaths(tree: TNode[]): Set<string> {
  const s = new Set<string>();
  const walk = (nodes: TNode[], base: number[]) =>
    nodes.forEach((n, i) => {
      const p = [...base, i];
      if (n.children.length) {
        s.add(pathKey(p));
        walk(n.children, p);
      }
    });
  walk(tree, []);
  return s;
}

// ---------------------------------------------------------------- 흐름 따라가기

export interface Chunk {
  fromClient: boolean;
  first: number;
  last: number;
  len: number;
  data: string;
}

export interface FollowPiece {
  fromClient: boolean;
  text: string;
}

/** ASCII — 인쇄 안 되는 바이트는 «.», 줄 바꿈은 유지 */
export function followAscii(data: Uint8Array): string {
  let s = "";
  for (const b of data) s += b === 10 || b === 13 ? "\n" : printable(b);
  return s.replace(/\n+/g, "\n");
}

/** HEX — 16바이트씩 «0000  xx xx …  ascii» */
export function followHex(data: Uint8Array): string {
  return hexLines(data)
    .map((l) => `${l.offset.toString(16).padStart(4, "0")}  ${l.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ").padEnd(47)}  ${l.bytes.map(printable).join("")}`)
    .join("\n");
}

export function followPieces(chunks: Chunk[], mode: "ascii" | "hex"): FollowPiece[] {
  return chunks.map((c) => {
    const d = fromB64(c.data);
    return { fromClient: c.fromClient, text: mode === "ascii" ? followAscii(d) : followHex(d) };
  });
}

// ---------------------------------------------------------------- 응답 시간 분포

export interface Bucket {
  loNs: number;
  hiNs: number;
  count: number;
}

export function bucketLabel(b: Bucket): string {
  const hi = b.hiNs > 1e15 ? null : b.hiNs;
  if (hi === null) return `≥ ${rtText(b.loNs)}`;
  return `${rtText(b.loNs)} – ${rtText(hi)}`;
}

/** 막대 폭(0~1) — 가장 큰 구간이 1 */
export function barFractions(b: Bucket[]): number[] {
  const max = Math.max(1, ...b.map((x) => x.count));
  return b.map((x) => x.count / max);
}

// ---------------------------------------------------------------- 요약 띠

export interface Rt {
  pairs: number;
  minNs: number | null;
  medianNs: number | null;
  p95Ns: number | null;
  maxNs: number | null;
  exceptions: number;
  noResponse: number;
  pending: number;
  orphans: number;
}

/** 요약 띠에서 눌렀을 때 거는 필터 */
export function appFilter(proto: string, what: "all" | "noresp" | "exception"): string {
  const base = proto === "mbtcp" ? "mbtcp" : proto;
  if (what === "all") return base;
  if (what === "noresp") return `(${base}) && (expert.key == "pair.no_response" || expert.key == "pair.closed")`;
  const key = proto === "mc" ? "mc.end_code" : proto === "xgt" ? "xgt.error" : "modbus.exception";
  return `(${base}) && expert.key == "${key}"`;
}

/** 응답 시간이 눈에 띄게 느린가(95% 가 중앙값의 10배 넘고 50ms 이상) */
export function slowTail(rt: Rt): boolean {
  return rt.p95Ns !== null && rt.medianNs !== null && rt.p95Ns > 50e6 && rt.p95Ns > rt.medianNs * 10;
}

export const SEV_RANK: Record<string, number> = { error: 0, warn: 1, note: 2, chat: 3 };
