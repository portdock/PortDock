// 웹 도구 «케이블·단자 라벨 만들기» — 연번(W001~W120, X1:1~X1:40)·붙여넣은 이름·양끝 «A→B» 쌍 라벨 목록을 만들고,
// A4 라벨 용지(행·열·여백 mm)에 놓을 자리를 계산하고, 라벨 프린터·열수축 튜브 프린터 소프트웨어로 불러갈 CSV·텍스트를 만든다.
// 순수 함수만(node --test). 화면·인쇄는 views/CableLabelsPage.astro. 모두 브라우저 안 — 서버로 보내지 않는다.

export type { Lang } from "./tr.ts";

/** 한 번에 만들 수 있는 라벨 수 상한 — 실수로 백만 개를 만들어 브라우저가 멈추지 않게 */
export const MAX_LABELS = 5000;

export interface SeqOpts {
  prefix: string;
  start: number;
  end: number;
  /** 0 이면 0 채우기 없음 */
  digits: number;
  step?: number;
  suffix?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: { ko: string; en: string } };
/** 두 갈래 문구(추가 언어는 화면이 tx() 로 영어 문장 → 번역) */
const t = (ko: string, en: string) => ({ ko, en });
const fail = (error: { ko: string; en: string }): { ok: false; error: { ko: string; en: string } } => ({ ok: false, error });

/** 숫자를 자릿수만큼 0 으로 채움(음수는 쓰지 않는다) */
export const pad = (n: number, digits: number) => (digits > 0 ? String(n).padStart(digits, "0") : String(n));

/** 연번 라벨 — W001~W120, X1:1~X1:40 처럼. 끝이 시작보다 작으면 거꾸로 센다 */
export function seqLabels(o: SeqOpts): Result<string[]> {
  const step = o.step ?? 1;
  if (![o.start, o.end, step, o.digits].every(Number.isInteger)) return fail(t("시작·끝·간격·자릿수는 정수로 넣으세요.", "Start, end, step and digits must be whole numbers."));
  if (o.start < 0 || o.end < 0) return fail(t("시작·끝은 0 이상으로 넣으세요.", "Start and end must be 0 or more."));
  if (step <= 0) return fail(t("간격은 1 이상으로 넣으세요.", "Step must be 1 or more."));
  if (o.digits < 0 || o.digits > 8) return fail(t("자릿수는 0~8 로 넣으세요.", "Digits must be 0–8."));
  const count = Math.floor(Math.abs(o.end - o.start) / step) + 1;
  if (count > MAX_LABELS) return fail(t(`라벨이 ${count}개입니다 — ${MAX_LABELS}개까지 만듭니다.`, `That is ${count} labels — the limit is ${MAX_LABELS}.`));
  const dir = o.end >= o.start ? 1 : -1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(`${o.prefix}${pad(o.start + dir * i * step, o.digits)}${o.suffix ?? ""}`);
  return { ok: true, value: out };
}

/** 붙여넣은 글 → 줄마다 칸 배열. 칸 나눔은 탭(엑셀 복사)·세미콜론·쉼표 순으로 그 줄에 있는 것. 빈 줄·앞뒤 공백은 뺀다 */
export function parseLines(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => {
      const sep = l.includes("\t") ? "\t" : l.includes(";") ? ";" : l.includes(",") ? "," : null;
      return (sep ? l.split(sep) : [l]).map((c) => c.trim());
    });
}

/** 붙여넣은 장비 IO 이름 → 라벨(줄마다 첫 칸, 둘째 칸이 있으면 «첫 칸 둘째 칸») */
export function listLabels(text: string, joinCols = true): Result<string[]> {
  const rows = parseLines(text);
  if (rows.length > MAX_LABELS) return fail(t(`줄이 ${rows.length}개입니다 — ${MAX_LABELS}개까지 만듭니다.`, `That is ${rows.length} lines — the limit is ${MAX_LABELS}.`));
  return { ok: true, value: rows.map((r) => (joinCols ? r.filter(Boolean).join(" ") : r[0])) };
}

export interface PairOpts {
  /** 화살표(기본 «→») */
  arrow?: string;
  /** B 끝 라벨은 «B→A» 로 뒤집기(각 끝에서 자기 쪽이 먼저 읽히게) */
  reverseAtB?: boolean;
}

/**
 * 양끝 라벨 — 한 줄 «케이블 번호, A 끝, B 끝»(또는 «A 끝, B 끝») → 라벨 두 장.
 * A 끝: «W001 X1:1→K1:A1», B 끝: 같은 글(또는 reverseAtB 면 «W001 K1:A1→X1:1»).
 */
export function pairLabels(text: string, o: PairOpts = {}): Result<{ label: string; end: "A" | "B"; line: number }[]> {
  const arrow = o.arrow ?? "→";
  const rows = parseLines(text);
  if (rows.length * 2 > MAX_LABELS) return fail(t(`라벨이 ${rows.length * 2}개입니다 — ${MAX_LABELS}개까지 만듭니다.`, `That is ${rows.length * 2} labels — the limit is ${MAX_LABELS}.`));
  const out: { label: string; end: "A" | "B"; line: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 2) return fail(t(`${i + 1}번째 줄에 끝이 하나뿐입니다 — «A 끝, B 끝» 또는 «케이블, A 끝, B 끝» 으로 넣으세요.`, `Line ${i + 1} has only one end — use «end A, end B» or «cable, end A, end B».`));
    const [id, a, b] = r.length >= 3 ? [r[0], r[1], r[2]] : ["", r[0], r[1]];
    const pre = id ? `${id} ` : "";
    out.push({ label: `${pre}${a}${arrow}${b}`, end: "A", line: i + 1 });
    out.push({ label: o.reverseAtB ? `${pre}${b}${arrow}${a}` : `${pre}${a}${arrow}${b}`, end: "B", line: i + 1 });
  }
  return { ok: true, value: out };
}

/** 라벨마다 copies 장씩(케이블 양끝에 같은 번호 → 2) */
export function repeatEach<T>(xs: T[], copies: number): T[] {
  const n = Math.max(1, Math.floor(copies));
  return xs.flatMap((x) => Array.from({ length: n }, () => x));
}

// ---- 용지 배치(mm)

export interface Sheet {
  pageW: number;
  pageH: number;
  rows: number;
  cols: number;
  marginTop: number;
  marginLeft: number;
  /** 라벨 사이 가로·세로 간격 */
  gapX: number;
  gapY: number;
  /** 라벨 크기 — 0 이면 남은 자리를 똑같이 나눈다 */
  labelW: number;
  labelH: number;
}

export interface Layout {
  labelW: number;
  labelH: number;
  perPage: number;
  /** 한 장 안의 칸 자리(왼쪽 위 기준, mm) — 행 우선(왼→오, 위→아래) */
  cells: { x: number; y: number }[];
}

/** 흔한 A4 라벨 용지 배치 예(용지 포장의 치수를 넣는 것이 먼저) */
export const SHEET_PRESETS: { id: string; name: { ko: string; en: string }; s: Sheet }[] = [
  {
    id: "a4-3x8",
    name: { ko: "A4 3×8 (70×37 mm, 여백 0)", en: "A4 3×8 (70×37 mm, no margin)" },
    s: { pageW: 210, pageH: 297, rows: 8, cols: 3, marginTop: 0.5, marginLeft: 0, gapX: 0, gapY: 0, labelW: 70, labelH: 37 },
  },
  {
    id: "a4-4x10",
    name: { ko: "A4 4×10 (나눠 계산)", en: "A4 4×10 (split evenly)" },
    s: { pageW: 210, pageH: 297, rows: 10, cols: 4, marginTop: 10, marginLeft: 8, gapX: 2, gapY: 0, labelW: 0, labelH: 0 },
  },
  {
    id: "a4-5x13",
    name: { ko: "A4 5×13 (나눠 계산)", en: "A4 5×13 (split evenly)" },
    s: { pageW: 210, pageH: 297, rows: 13, cols: 5, marginTop: 10.5, marginLeft: 5, gapX: 2.5, gapY: 0, labelW: 0, labelH: 0 },
  },
];

/** 용지 배치 계산 — 라벨이 용지 밖으로 나가면 오류 */
export function layoutSheet(s: Sheet): Result<Layout> {
  const nums = [s.pageW, s.pageH, s.rows, s.cols, s.marginTop, s.marginLeft, s.gapX, s.gapY, s.labelW, s.labelH];
  if (!nums.every(Number.isFinite)) return fail(t("배치 칸에 숫자를 넣으세요.", "Enter numbers in the layout fields."));
  if (!Number.isInteger(s.rows) || !Number.isInteger(s.cols) || s.rows < 1 || s.cols < 1 || s.rows > 60 || s.cols > 20)
    return fail(t("행은 1~60, 열은 1~20 으로 넣으세요.", "Rows must be 1–60 and columns 1–20."));
  if ([s.marginTop, s.marginLeft, s.gapX, s.gapY, s.labelW, s.labelH].some((v) => v < 0)) return fail(t("여백·간격·크기는 0 이상으로 넣으세요.", "Margins, gaps and sizes must be 0 or more."));
  const w = s.labelW > 0 ? s.labelW : (s.pageW - 2 * s.marginLeft - (s.cols - 1) * s.gapX) / s.cols;
  const h = s.labelH > 0 ? s.labelH : (s.pageH - 2 * s.marginTop - (s.rows - 1) * s.gapY) / s.rows;
  if (w <= 0 || h <= 0) return fail(t("여백·간격이 너무 커서 라벨 자리가 없습니다.", "Margins and gaps leave no room for labels."));
  const right = s.marginLeft + s.cols * w + (s.cols - 1) * s.gapX;
  const bottom = s.marginTop + s.rows * h + (s.rows - 1) * s.gapY;
  const EPS = 0.01;
  if (right > s.pageW + EPS) return fail(t(`가로가 용지보다 ${(right - s.pageW).toFixed(1)} mm 넘칩니다.`, `The labels overrun the page width by ${(right - s.pageW).toFixed(1)} mm.`));
  if (bottom > s.pageH + EPS) return fail(t(`세로가 용지보다 ${(bottom - s.pageH).toFixed(1)} mm 넘칩니다.`, `The labels overrun the page height by ${(bottom - s.pageH).toFixed(1)} mm.`));
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) cells.push({ x: round2(s.marginLeft + c * (w + s.gapX)), y: round2(s.marginTop + r * (h + s.gapY)) });
  return { ok: true, value: { labelW: round2(w), labelH: round2(h), perPage: s.rows * s.cols, cells } };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 라벨을 장으로 나눔. skip = 첫 장에서 이미 쓴 칸 수(쓰다 남은 용지) — 그 칸은 null.
 */
export function paginate(labels: string[], perPage: number, skip = 0): (string | null)[][] {
  const s = Math.max(0, Math.min(Math.floor(skip), perPage - 1));
  const all: (string | null)[] = [...Array<null>(s).fill(null), ...labels];
  const pages: (string | null)[][] = [];
  for (let i = 0; i < all.length; i += perPage) pages.push(all.slice(i, i + perPage));
  return pages;
}

// ---- 내보내기

/** CSV 한 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다(RFC 4180) */
export const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** 라벨 프린터 소프트웨어로 불러갈 CSV — 머리 줄 «No,Label» (+ 양끝이면 End) */
export function toCsv(rows: { label: string; end?: "A" | "B" }[]): string {
  const hasEnd = rows.some((r) => r.end);
  const head = hasEnd ? "No,Label,End" : "No,Label";
  const body = rows.map((r, i) => [String(i + 1), csvCell(r.label), ...(hasEnd ? [r.end ?? ""] : [])].join(","));
  return [head, ...body].join("\r\n") + "\r\n";
}

/** 한 줄에 라벨 하나(열수축 튜브 프린터 등 텍스트 불러오기용) */
export const toText = (labels: string[]) => labels.join("\r\n") + "\r\n";
