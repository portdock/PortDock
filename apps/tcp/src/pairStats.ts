// 중계 기록의 요청/응답 짝 열·응답 시간 통계(0.8.0) — 짝 맞추기는 core reqpair.rs 가 하고, 화면은 표시·통계만.
// 화면 없이 값만 — node --test apps/tcp/src/pairStats.test.ts

/** core reqpair::PairMark 와 같은 모양 */
export interface PairMark {
  id: number;
  role: "req" | "rsp" | "miss";
  proto: "modbus" | "mc";
  /** «FC03»·«0401» */
  what: string;
  /** 응답: 요청 → 응답(ms) · 무응답: 기다린 시간 */
  rtMs?: number;
  /** «EXC 02»·«C056» */
  error?: string;
}

export interface RtStats {
  n: number;
  min: number;
  med: number;
  p95: number;
  max: number;
}

/** 순위 백분위(nearest-rank) — 정렬된 값에서 ceil(p·n) 번째 */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const k = Math.min(sorted.length, Math.max(1, Math.ceil(p * sorted.length)));
  return sorted[k - 1];
}

/** 최소·중앙(50%)·95%·최대. 값이 없으면 null */
export function rtStats(values: readonly number[]): RtStats | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return { n: v.length, min: v[0], med: percentile(v, 0.5), p95: percentile(v, 0.95), max: v[v.length - 1] };
}

/** «3.25»·«12.4»·«1250» — 10ms 아래는 소수 둘째, 100ms 아래는 첫째, 그 위는 정수 */
export function fmtMs(ms: number): string {
  if (ms < 10) return String(Math.round(ms * 100) / 100);
  if (ms < 100) return String(Math.round(ms * 10) / 10);
  return String(Math.round(ms));
}

/** 응답 시간을 모아 두는 통(가장 최근 cap 개만) */
export class RtBag {
  values: number[] = [];
  misses = 0;
  errors = 0;
  cap: number;
  constructor(cap = 10_000) {
    this.cap = cap;
  }
  add(ms: number) {
    this.values.push(ms);
    if (this.values.length > this.cap) this.values.splice(0, this.values.length - this.cap);
  }
  reset() {
    this.values = [];
    this.misses = 0;
    this.errors = 0;
  }
}

/** 짝 열 한 칸 — 요청 «#12 FC03 →», 응답 «#12 3.25 ms», 오류 응답 «#12 3.25 ms EXC 02», 무응답이 된 요청 «#12 FC03 무응답» */
export function pairCell(p: PairMark, lang: "ko" | "en", missed = false): { text: string; cls: string } {
  if (p.role === "req") return missed ? { text: `#${p.id} ${p.what} ${lang === "ko" ? "무응답" : "no reply"}`, cls: "pair miss" } : { text: `#${p.id} ${p.what} →`, cls: "pair req" };
  if (p.role === "rsp") {
    const t = `#${p.id} ${fmtMs(p.rtMs ?? 0)} ms`;
    return p.error ? { text: `${t} ${p.error}`, cls: "pair err" } : { text: t, cls: "pair rsp" };
  }
  return { text: `#${p.id} ${lang === "ko" ? "무응답" : "no reply"}`, cls: "pair miss" };
}

/** 통계 한 줄 «짝 120 · 무응답 2 · 오류 1 · 응답 ms 최소 1.2 · 중앙 3.4 · 95% 8 · 최대 15» */
export function statsText(s: RtStats | null, misses: number, errors: number, lang: "ko" | "en"): string {
  const ko = lang === "ko";
  const head = [`${ko ? "짝" : "pairs"} ${s?.n ?? 0}`, `${ko ? "무응답" : "no reply"} ${misses}`];
  if (errors) head.push(`${ko ? "오류 응답" : "error replies"} ${errors}`);
  if (!s) return head.join(" · ");
  const ms = (x: number) => fmtMs(x);
  return `${head.join(" · ")} · ${ko ? "응답 ms" : "reply ms"} ${ko ? "최소" : "min"} ${ms(s.min)} · ${ko ? "중앙" : "median"} ${ms(s.med)} · 95% ${ms(s.p95)} · ${ko ? "최대" : "max"} ${ms(s.max)}`;
}
