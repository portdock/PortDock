// 보내기 입력칸 이력 — 화면 없는 부분(시험: shared/ioFeatures.test.ts)

export interface HistoryEntry {
  text: string;
  mode: "hex" | "ascii";
}

export const HISTORY_MAX = 50;

/** 이력에 더하기 — 같은 것이 있으면 맨 뒤(가장 최근)로 옮긴다. 빈 글은 넣지 않는다 */
export function pushHistory(list: HistoryEntry[], e: HistoryEntry, max = HISTORY_MAX): HistoryEntry[] {
  if (!e.text.trim()) return list;
  const rest = list.filter((x) => !(x.text === e.text && x.mode === e.mode));
  rest.push({ text: e.text, mode: e.mode });
  return rest.length > max ? rest.slice(rest.length - max) : rest;
}

/**
 * 이력 걷기 — pos 는 이력 안 자리(null = 지금 고치던 글). ↑ 는 더 오래된 쪽.
 * 돌려주는 값: 새 자리와 보일 글(null 이면 움직이지 않음)
 */
export function stepHistory(list: HistoryEntry[], pos: number | null, dir: -1 | 1): { pos: number | null; entry: HistoryEntry | "draft" | null } {
  if (!list.length) return { pos, entry: null };
  if (dir === -1) {
    const next = pos == null ? list.length - 1 : pos - 1;
    if (next < 0) return { pos, entry: null };
    return { pos: next, entry: list[next] };
  }
  if (pos == null) return { pos, entry: null };
  if (pos + 1 >= list.length) return { pos: null, entry: "draft" };
  return { pos: pos + 1, entry: list[pos + 1] };
}

