// 로그 찾기·거르기 — 화면(React) 없는 부분. 보기 거르기라 원래 기록은 건드리지 않는다.
// 10만 줄에서도 버티게: 새로 붙은 줄만 검사하고(증분), 앞에서 잘린 줄은 결과에서 덜어 낸다.

export interface LogFrame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  seq?: number;
  peer?: string | null;
}

export type QueryMode = "auto" | "hex" | "text";
export type DirFilter = "all" | "rx" | "tx" | "ev";

export interface FilterState {
  query: string;
  qmode: QueryMode;
  dir: DirFilter;
  /** 체크섬 틀린 줄만 */
  failOnly: boolean;
  /** 찾은 줄만 보이기(끄면 찾은 줄은 표시만 하고 모두 보인다) */
  hitsOnly: boolean;
}

export const EMPTY_FILTER: FilterState = { query: "", qmode: "auto", dir: "all", failOnly: false, hitsOnly: false };

export type Query = { kind: "hex"; bytes: number[] } | { kind: "text"; bytes: number[]; text: string };

/** «01 03», «0x01,0x03» 처럼 2자리 HEX 묶음만 있으면 HEX 로 본다 */
export function looksHex(q: string) {
  const toks = q.trim().split(/[\s,]+/).filter(Boolean);
  return toks.length > 0 && toks.every((t) => /^(0x)?[0-9a-f]{2}$/i.test(t));
}

/** 찾기 칸 → 찾을 바이트. HEX 로 읽을 수 없으면 null(빈 칸도 null) */
export function parseQuery(q: string, mode: QueryMode): Query | null {
  if (!q.trim()) return null;
  const asHex = mode === "hex" || (mode === "auto" && looksHex(q));
  if (asHex) {
    const digits = q.replace(/0x/gi, "").replace(/[\s,;-]/g, "");
    if (!digits || digits.length % 2 || /[^0-9a-f]/i.test(digits)) return null;
    const bytes: number[] = [];
    for (let i = 0; i < digits.length; i += 2) bytes.push(parseInt(digits.slice(i, i + 2), 16));
    return { kind: "hex", bytes };
  }
  // 글자 찾기: 대소문자 무시. 바이트에서 바로 찾는다(줄마다 문자열을 만들지 않게)
  const bytes = [...q].map((c) => c.charCodeAt(0) & 0xff).map(lowerByte);
  return { kind: "text", bytes, text: q.toLowerCase() };
}

const lowerByte = (b: number) => (b >= 0x41 && b <= 0x5a ? b + 32 : b);

function indexOfBytes(hay: number[], needle: number[], fold: boolean) {
  const n = needle.length;
  if (!n) return true;
  outer: for (let i = 0; i + n <= hay.length; i++) {
    for (let j = 0; j < n; j++) {
      const b = fold ? lowerByte(hay[i + j]) : hay[i + j];
      if (b !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function frameMatches(f: LogFrame, q: Query) {
  if (f.dir === "ev") return q.kind === "text" && (f.note ?? "").toLowerCase().includes(q.text);
  return indexOfBytes(f.bytes, q.bytes, q.kind === "text");
}

export const filterActive = (s: FilterState) => s.dir !== "all" || s.failOnly || (s.hitsOnly && !!s.query.trim());

function passes(f: LogFrame, s: FilterState) {
  if (s.dir !== "all" && f.dir !== s.dir) return false;
  if (s.failOnly && f.check !== false) return false;
  return true;
}

/** 정렬된 수 배열에서 x 이상인 첫 자리 */
export function lowerBound(a: number[], x: number) {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/**
 * 증분 거르기. frames 는 뒤에 붙고 앞에서 잘리며(seq 가 이어짐), «지우기» 하면 새 배열이 된다.
 * view: 보일 줄의 seq(거르기가 없으면 null — 전체), hits: 찾은 줄의 seq. 둘 다 오름차순.
 */
export class LogIndex {
  private arr: LogFrame[] | null = null;
  private key = "";
  private lastSeq = 0;
  view: number[] = [];
  hits: number[] = [];

  update(frames: LogFrame[], s: FilterState): { view: number[] | null; hits: number[] } {
    const q = parseQuery(s.query, s.qmode);
    const active = filterActive(s);
    const key = JSON.stringify([s.dir, s.failOnly, s.hitsOnly, q && q.kind, q && q.bytes]);
    if (!active && !q) {
      this.arr = null;
      return { view: null, hits: [] };
    }
    const first = frames.length ? (frames[0].seq ?? 0) : 0;
    if (frames !== this.arr || key !== this.key) {
      this.arr = frames;
      this.key = key;
      this.view = [];
      this.hits = [];
      this.lastSeq = first - 1;
    } else {
      // 앞에서 잘린 줄을 덜어 낸다
      const cut = (a: number[]) => {
        const i = lowerBound(a, first);
        return i ? a.slice(i) : a;
      };
      this.view = cut(this.view);
      this.hits = cut(this.hits);
    }
    if (frames.length) {
      let i = Math.max(0, this.lastSeq + 1 - first);
      for (; i < frames.length; i++) {
        const f = frames[i];
        const seq = f.seq ?? first + i;
        if (!passes(f, s)) continue;
        const hit = !!q && frameMatches(f, q);
        if (hit) this.hits.push(seq);
        if (active && (!s.hitsOnly || !q || hit)) this.view.push(seq);
      }
      this.lastSeq = frames[frames.length - 1].seq ?? first + frames.length - 1;
    }
    // 바뀐 것을 React 가 알도록 새 배열로 건넨다
    return { view: active ? this.view.slice() : null, hits: this.hits.slice() };
  }
}

export type ViewMode = "hex" | "ascii" | "both";

/**
 * «화면 내용 저장» 글 — 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만.
 * 첫 줄은 # 로 시작하는 머리줄(보기·거르기 설명).
 */
export function screenText(opts: {
  app: string;
  frames: LogFrame[];
  view: number[] | null;
  mode: ViewMode;
  fmt: (ts: number) => string;
  hex: (b: number[]) => string;
  ascii: (b: number[]) => string;
  filterDesc: string | null;
  lang: "ko" | "en";
  peers?: boolean;
}) {
  const { frames, view, mode, fmt, hex, ascii, lang } = opts;
  const ko = lang === "ko";
  const first = frames.length ? (frames[0].seq ?? 0) : 0;
  const rows = view ? view.map((s) => frames[s - first]).filter(Boolean) : frames;
  const modeName = mode === "both" ? (ko ? "HEX + ASCII" : "HEX + ASCII") : mode.toUpperCase();
  const head = `# ${opts.app} · ${ko ? "보기" : "view"} ${modeName} · ${
    opts.filterDesc
      ? ko
        ? `거르기 ${opts.filterDesc} — 전체 ${frames.length}줄 중 ${rows.length}줄`
        : `filter ${opts.filterDesc} — ${rows.length} of ${frames.length} lines`
      : ko
        ? `전체 ${frames.length}줄`
        : `all ${frames.length} lines`
  }`;
  const body = rows.map((f) => {
    const peer = opts.peers ? ` [${f.peer ?? ""}]` : "";
    if (f.dir === "ev") return `${fmt(f.ts)} EV${peer} ${f.note ?? ""}`;
    const data = mode === "hex" ? hex(f.bytes) : mode === "ascii" ? ascii(f.bytes) : `${hex(f.bytes)} | ${ascii(f.bytes)}`;
    return `${fmt(f.ts)} ${f.dir.toUpperCase()}${peer} ${data}${f.check === false ? " [CHECK FAIL]" : ""}`;
  });
  return [head, ...body].join("\n");
}
