// 글자 크기 단축(0.3.0) — Ctrl+휠·Ctrl+=/Ctrl+-/Ctrl+0 의 계산. React 없는 부분(시험: node --test shared/zoomRule.test.ts)
import { DEFAULTS, LIMITS } from "./settingsData.ts";

export type ZoomStep = "in" | "out" | "reset";

/** 키 → 크게·작게·처음대로(아니면 null). Ctrl(또는 ⌘)이 눌린 때만. 숫자 패드 +/- 와 Shift 없는 «=» 도 받는다 */
export function zoomKey(e: { key: string; ctrlKey: boolean; metaKey?: boolean; altKey: boolean }): ZoomStep | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  if (e.key === "=" || e.key === "+" || e.key === "Add") return "in";
  if (e.key === "-" || e.key === "_" || e.key === "Subtract") return "out";
  if (e.key === "0") return "reset";
  return null;
}

/** 지금 글자 크기 → 다음 크기(설정 칸과 같은 범위 LIMITS.fontSize, 처음대로는 기본 13) */
export function nextFontSize(cur: number, step: ZoomStep): number {
  const [lo, hi] = LIMITS.fontSize;
  if (step === "reset") return DEFAULTS.fontSize;
  const n = Math.round(cur) + (step === "in" ? 1 : -1);
  return Math.min(hi, Math.max(lo, n));
}
