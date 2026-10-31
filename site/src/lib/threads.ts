// 웹 도구 «미터 나사 탭 드릴·볼트 참고표» — ISO 미터 보통·가는 나사(M2~M20) 피치, 탭 드릴(d − P), 육각 렌치·스패너 크기.
// 순수 자료·함수(node --test). 화면은 views/MetricThreadsPage.astro.
// 근거:
//   피치: ISO 261·ISO 262 선호 크기(en.wikipedia «ISO metric screw thread» 의 Preferred sizes 표)
//   탭 드릴 ≈ 바깥지름 − 피치(같은 문서)
//   육각 구멍 렌치(s): ISO 4762 육각 구멍붙이 볼트 — M2 1.5 … M20 17 (같은 문서의 렌치 크기 표, M14 12 는 Würth ISO 4762 목록으로 확인)
//   스패너(s): ISO 4032 육각 너트·ISO 4014/4017 볼트 머리 — M10 16·M12 18·M14 21 (DIN 934 옛 규격은 17·19·22)
// 체결 토크는 볼트 등급·윤활·단자대 제조사마다 달라 값을 넣지 않는다(«제조사 값 확인»).

export interface ThreadRow {
  /** 호칭 지름 d (mm) */
  d: number;
  coarse: number;
  fine: number[];
  /** ISO 4762 육각 렌치 크기 */
  hexKey: number;
  /** ISO 4032 스패너 크기 */
  spanner: number;
  /** DIN 934(옛 규격)에서 다른 스패너 크기 */
  spannerDin?: number;
}

export const THREADS: ThreadRow[] = [
  { d: 2, coarse: 0.4, fine: [0.25], hexKey: 1.5, spanner: 4 },
  { d: 2.5, coarse: 0.45, fine: [0.35], hexKey: 2, spanner: 5 },
  { d: 3, coarse: 0.5, fine: [0.35], hexKey: 2.5, spanner: 5.5 },
  { d: 4, coarse: 0.7, fine: [0.5], hexKey: 3, spanner: 7 },
  { d: 5, coarse: 0.8, fine: [0.5], hexKey: 4, spanner: 8 },
  { d: 6, coarse: 1, fine: [0.75], hexKey: 5, spanner: 10 },
  { d: 8, coarse: 1.25, fine: [1, 0.75], hexKey: 6, spanner: 13 },
  { d: 10, coarse: 1.5, fine: [1.25, 1], hexKey: 8, spanner: 16, spannerDin: 17 },
  { d: 12, coarse: 1.75, fine: [1.5, 1.25], hexKey: 10, spanner: 18, spannerDin: 19 },
  { d: 14, coarse: 2, fine: [1.5], hexKey: 12, spanner: 21, spannerDin: 22 },
  { d: 16, coarse: 2, fine: [1.5], hexKey: 14, spanner: 24 },
  { d: 18, coarse: 2.5, fine: [2, 1.5], hexKey: 14, spanner: 27 },
  { d: 20, coarse: 2.5, fine: [2, 1.5], hexKey: 17, spanner: 30 },
];

/** 탭 드릴 ≈ d − P (소수 둘째 자리까지) */
export const tapDrill = (d: number, p: number) => Math.round((d - p) * 100) / 100;

/** «M8», «M8x1», «m10 × 1.25», «8-1.25» → { d, p } (피치 없으면 보통 나사) — 표에 없는 지름·피치는 오류 */
export function parseThread(s: string): { ok: true; d: number; p: number; fine: boolean; row: ThreadRow } | { ok: false } {
  const m = s
    .trim()
    .replace(/,/g, ".")
    .match(/^m?\s*(\d+(?:\.\d+)?)\s*(?:[x×*\-]\s*(\d+(?:\.\d+)?))?$/i);
  if (!m) return { ok: false };
  const d = Number(m[1]);
  const row = THREADS.find((r) => r.d === d);
  if (!row) return { ok: false };
  if (m[2] === undefined) return { ok: true, d, p: row.coarse, fine: false, row };
  const p = Number(m[2]);
  if (p === row.coarse) return { ok: true, d, p, fine: false, row };
  if (row.fine.includes(p)) return { ok: true, d, p, fine: true, row };
  return { ok: false };
}

/** 스패너·렌치 크기 → 맞는 나사(현장에서 «이 13 mm 스패너는 몇 M?») */
export const bySpanner = (s: number) => THREADS.filter((r) => r.spanner === s || r.spannerDin === s);
export const byHexKey = (s: number) => THREADS.filter((r) => r.hexKey === s);
