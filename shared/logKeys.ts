// 로그 키보드 이동(0.3.0) — 로그 칸에 포커스가 있을 때 ↑↓·Shift+↑↓·PageUp/PageDown·Home/End 로 줄을 고른다.
// 로그 칸(.log 등)에 tabIndex={0}·onKeyDown 을 붙인다 — 칸 밖(입력칸·표·숫자 칸)의 ↑↓ 와 겹치지 않는다.
// 고른 줄로 굴리고 따라가기는 멈춘다. End 는 맨 아래 줄을 고르고 다시 따라간다(useFollowTail 의 End 와 같은 뜻).
import { useCallback, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { navTarget, type NavKey } from "./logNav";
import type { LogSelection } from "./logCopy";

export interface LogKeysOptions {
  sel: LogSelection;
  /** 지금 보이는 줄 수(거르기 반영) */
  count: number;
  /** 보이는 자리(index) → 줄 번호(seq) */
  seqAt: (i: number) => number | undefined;
  indexOfSeq: (seq: number) => number;
  /** 그 자리가 보이게 굴린다 */
  scrollTo: (i: number) => void;
  /** 한 화면 줄 수(PageUp/PageDown) — 모르면 10 */
  page?: () => number;
  follow?: { pause: () => void; resume: () => void };
  /** 고른 줄이 바뀐 뒤(예: 좁은 창에서 상세 칸 열기 — 키 이동에서는 보통 안 함) */
  onMove?: (seq: number) => void;
}

const KEYS = new Set<string>(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

/** 로그 칸의 onKeyDown */
export function useLogKeys(o: LogKeysOptions) {
  const cur = useRef(o);
  cur.current = o;
  return useCallback((e: ReactKeyboardEvent) => {
    if (!KEYS.has(e.key) || e.ctrlKey || e.altKey || e.metaKey || e.nativeEvent.isComposing) return;
    const { sel, count, seqAt, indexOfSeq, scrollTo, page, follow, onMove } = cur.current;
    if (count <= 0) return;
    const at = sel.primary != null ? indexOfSeq(sel.primary) : -1;
    const i = navTarget(e.key as NavKey, at, count, Math.max(1, page?.() ?? 10));
    e.preventDefault();
    // End 는 useFollowTail 이 창 단위로도 받는다 — 여기서는 줄만 고르고 따라가기를 다시 켠다
    if (e.key === "End") e.stopPropagation();
    const seq = seqAt(i);
    if (seq == null) return;
    if (e.shiftKey && sel.anchor != null) sel.click({ shiftKey: true, ctrlKey: false, metaKey: false } as MouseEvent, seq);
    else sel.only(seq);
    if (e.key === "End" && !e.shiftKey) follow?.resume();
    else {
      follow?.pause();
      scrollTo(i);
    }
    onMove?.(seq);
  }, []);
}
