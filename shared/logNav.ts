// 로그 키보드 이동(0.3.0)의 계산 — React 없는 부분(시험: node --test shared/logNav.test.ts)

export type NavKey = "ArrowUp" | "ArrowDown" | "PageUp" | "PageDown" | "Home" | "End";

/**
 * 지금 자리(cur, 고른 줄이 없거나 안 보이면 -1)에서 키를 누른 뒤의 자리(0~count-1).
 * 고른 줄이 없으면 ↑·↓·PageUp·PageDown 은 맨 아래(최근) 줄부터.
 */
export function navTarget(key: NavKey, cur: number, count: number, page: number): number {
  const last = Math.max(0, count - 1);
  const clamp = (n: number) => Math.min(last, Math.max(0, n));
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (cur < 0 || cur > last) return last;
  const step = Math.max(1, Math.floor(page));
  switch (key) {
    case "ArrowUp":
      return clamp(cur - 1);
    case "ArrowDown":
      return clamp(cur + 1);
    case "PageUp":
      return clamp(cur - step);
    case "PageDown":
      return clamp(cur + step);
  }
}
