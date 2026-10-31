// 웹 도구 «노트북 배터리 리포트 해석기» 의 풀이 — powercfg /batteryreport 가 만든 battery-report.html 의 글을 받아
// 설치된 배터리(설계 용량·완전 충전 용량·충전 횟수), 용량 이력, 최근 사용을 뽑는다. 브라우저 밖으로 아무것도 보내지 않는다.
// 표 머리글은 Windows 언어마다 다르므로(DESIGN CAPACITY·설계 용량 …) 머리글 글자에 기대지 않고 «표의 모양» 으로 가린다:
//   - 설치된 배터리: 첫 칸이 이름표이고 나머지 칸이 모두 «… mWh» 인 줄이 둘 이상인 표 — 첫째가 설계 용량, 둘째가 완전 충전 용량
//     (이름표에 DESIGN·설계, FULL·완전·완충 이 있으면 그것을 먼저 따른다). 충전 횟수는 이름표(CYCLE·사이클·횟수·주기) 또는 완전 충전 줄 바로 다음 줄의 정수.
//   - 용량 이력: 칸이 셋이고 둘째·셋째가 mWh 인 줄 — 기본 순서는 기간·완전 충전·설계(머리글에 DESIGN·설계 가 있으면 그 칸을 설계로).
//   - 최근 사용: 칸이 다섯 이상이고 넷째가 «NN %» 인 줄 중 셋째 칸이 시간(0:12:34)이 아닌 것(시간이면 «배터리 사용» 표).
// 리포트 머리(컴퓨터 이름·BIOS·OS 빌드 등)와 배터리 이름·제조사·일련번호는 읽지 않는다 — 화면에 개인 정보가 나오지 않게.

export interface Battery {
  design: number;
  full: number;
  /** 완전 충전 ÷ 설계 × 100 */
  health: number;
  /** 배터리가 알려 주지 않으면 null */
  cycles: number | null;
}
export interface HistoryRow {
  /** 기간 시작(YYYY-MM-DD) — 날짜가 없으면 칸 글 그대로 */
  start: string;
  end?: string;
  full: number;
  design: number;
}
export interface UsageRow {
  date?: string;
  time: string;
  state: string;
  source: string;
  percent: number | null;
  mWh: number | null;
}
export interface BatteryReport {
  batteries: Battery[];
  history: HistoryRow[];
  recent: UsageRow[];
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function cellText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e.toLowerCase()] ?? m),
    )
    .replace(/[\s  ]+/g, " ")
    .trim();
}

interface Row {
  cells: string[];
  head: boolean;
}
/** 표마다 줄·칸 글 — 리포트는 표 안에 표를 두지 않는다. </tr>·</td> 가 빠져도 다음 여는 꼬리표에서 끊는다 */
export function tables(html: string): Row[][] {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const out: Row[][] = [];
  for (const t of body.matchAll(/<table\b[\s\S]*?(?:<\/table>|$)/gi)) {
    const rows: Row[] = [];
    let inHead = false;
    for (const part of t[0].split(/(?=<tr\b)|(?=<thead\b)|(?=<\/thead>)/i)) {
      if (/^<thead\b/i.test(part)) inHead = true;
      if (/^<\/thead>/i.test(part)) inHead = false;
      if (!/^<tr\b/i.test(part)) continue;
      const cells = [...part.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)(?=<t[dh]\b|<\/tr>|<\/table>|<\/thead>|$)/gi)].map((m) => cellText(m[1]));
      if (cells.length) rows.push({ cells, head: inHead || /<th\b/i.test(part) });
    }
    out.push(rows);
  }
  return out;
}

/** «41,440 mWh» · «41.440 mWh» · «41 440 mWh» → 41440. mWh 가 아니면 null */
export function mwh(s: string): number | null {
  const m = s.match(/^([\d.,'   ]+)\s*mWh$/i);
  if (!m) return null;
  const d = m[1].replace(/\D/g, "");
  return d ? Number(d) : null;
}
const percent = (s: string) => {
  const m = s.match(/^(\d{1,3})\s*%$/);
  return m ? Number(m[1]) : null;
};
const isHms = (s: string) => /^\d+:\d{2}:\d{2}$/.test(s);
const DATE = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/g;
const pad = (n: string) => n.padStart(2, "0");

const DESIGN_RE = /DESIGN|설계|CONCEPTION|NENN|DISEÑO|設計/i;
const FULL_RE = /FULL|완전|완충|COMPLÈTE|VOLL|COMPLETA|フル|满/i;
const CYCLE_RE = /CYCLE|사이클|횟수|주기|ZYKLUS|CICLO|サイクル|循环/i;

function installed(rows: Row[]): Battery[] | null {
  // 용량 이력 표(«기간 | 완전 충전 | 설계»)도 «이름표 + mWh» 꼴이라 — 첫 칸에 날짜가 있는 줄은 설치 배터리 줄이 아니다
  // (설치 배터리 값을 «-» 로만 알리는 노트북에서 이력 표를 배터리 표로 잘못 읽던 것)
  const cap = rows.filter((r) => !r.head && r.cells.length >= 2 && mwh(r.cells[0]) === null && !/\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(r.cells[0]) && r.cells.slice(1).every((c) => mwh(c) !== null));
  if (cap.length < 2) return null;
  const dRow = cap.find((r) => DESIGN_RE.test(r.cells[0])) ?? cap[0];
  const fRow = cap.find((r) => r !== dRow && FULL_RE.test(r.cells[0])) ?? cap.find((r) => r !== dRow)!;
  // 충전 횟수 — 이름표로, 없으면 완전 충전 줄 다음의 «값이 있는» 줄
  const all = rows.filter((r) => r.cells.length >= 2 && !r.head);
  let cRow = all.find((r) => CYCLE_RE.test(r.cells[0]));
  if (!cRow) {
    const i = all.indexOf(fRow);
    cRow = all.slice(i + 1).find((r) => r.cells.slice(1).some((c) => c !== ""));
  }
  const n = dRow.cells.length - 1;
  const out: Battery[] = [];
  for (let k = 1; k <= n; k++) {
    const design = mwh(dRow.cells[k]) ?? 0;
    const full = mwh(fRow.cells[k] ?? "") ?? 0;
    const cy = cRow?.cells[k]?.replace(/[,.\s]/g, "") ?? "";
    out.push({ design, full, health: design > 0 ? (full / design) * 100 : NaN, cycles: /^\d+$/.test(cy) ? Number(cy) : null });
  }
  return out;
}

function history(rows: Row[]): HistoryRow[] | null {
  const data = rows.filter((r) => !r.head && r.cells.length === 3 && mwh(r.cells[0]) === null && mwh(r.cells[1]) !== null && mwh(r.cells[2]) !== null);
  if (!data.length) return null;
  const head = rows.find((r) => r.head && r.cells.length >= 3);
  let dIdx = 2;
  if (head) {
    const i = head.cells.findIndex((c, k) => k > 0 && DESIGN_RE.test(c));
    if (i === 1 || i === 2) dIdx = i;
  }
  const fIdx = dIdx === 2 ? 1 : 2;
  return data.map((r) => {
    const ds = [...r.cells[0].matchAll(DATE)].map((m) => `${m[1]}-${pad(m[2])}-${pad(m[3])}`);
    return { start: ds[0] ?? r.cells[0], end: ds[1], full: mwh(r.cells[fIdx])!, design: mwh(r.cells[dIdx])! };
  });
}

function recent(rows: Row[]): UsageRow[] | null {
  const data = rows.filter((r) => !r.head && r.cells.length >= 5 && percent(r.cells[3]) !== null && !isHms(r.cells[2]) && !isHms(r.cells[1]));
  if (!data.length) return null;
  let date: string | undefined;
  return data.map((r) => {
    const d = [...r.cells[0].matchAll(DATE)][0];
    if (d) date = `${d[1]}-${pad(d[2])}-${pad(d[3])}`;
    const t = r.cells[0].match(/\d{1,2}:\d{2}(?::\d{2})?/);
    return { date, time: t ? t[0] : r.cells[0], state: r.cells[1], source: r.cells[2], percent: percent(r.cells[3]), mWh: mwh(r.cells[4]) };
  });
}

export class NotBatteryReport extends Error {}

/** battery-report.html 의 글 → 풀이. 배터리 표가 없으면 NotBatteryReport */
export function parseBatteryReport(html: string): BatteryReport {
  let batteries: Battery[] = [];
  let hist: HistoryRow[] = [];
  let rec: UsageRow[] = [];
  for (const rows of tables(html)) {
    if (!batteries.length) {
      const b = installed(rows);
      if (b) {
        batteries = b;
        continue;
      }
    }
    if (!hist.length) {
      const h = history(rows);
      if (h) {
        hist = h;
        continue;
      }
    }
    if (!rec.length) {
      const r = recent(rows);
      if (r) rec = r;
    }
  }
  if (!batteries.length && !hist.length) throw new NotBatteryReport("no battery tables");
  return { batteries, history: hist, recent: rec };
}

/** 배터리 여럿이면 합으로 본 남은 비율 */
export function totalHealth(bs: Battery[]): number {
  const d = bs.reduce((s, b) => s + b.design, 0);
  const f = bs.reduce((s, b) => s + b.full, 0);
  return d > 0 ? (f / d) * 100 : NaN;
}

/** 이력 그래프 점 — x 는 순서(기간 폭이 고르지 않아도 차례대로), y 는 위가 큰 값. 설계 용량 선도 같은 눈금 */
export function chart(h: HistoryRow[], w: number, ht: number, padY = 8) {
  if (!h.length) return { full: "", design: "", max: 0, min: 0 };
  const vals = h.flatMap((r) => [r.full, r.design]);
  const max = Math.max(...vals);
  const min = Math.max(0, Math.min(...vals) * 0.9);
  const span = max - min || 1;
  const x = (i: number) => (h.length === 1 ? w / 2 : (i * w) / (h.length - 1));
  const y = (v: number) => padY + (ht - 2 * padY) * (1 - (v - min) / span);
  const pts = (k: "full" | "design") => h.map((r, i) => `${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join(" ");
  return { full: pts("full"), design: pts("design"), max, min };
}

/** 이력 처음 → 끝 완전 충전 용량 변화(%p, 설계 대비) */
export function trend(h: HistoryRow[]) {
  const ok = h.filter((r) => r.design > 0 && r.full > 0);
  if (ok.length < 2) return null;
  const a = ok[0];
  const b = ok[ok.length - 1];
  return { from: a.start, to: b.end ?? b.start, startPct: (a.full / a.design) * 100, endPct: (b.full / b.design) * 100 };
}
