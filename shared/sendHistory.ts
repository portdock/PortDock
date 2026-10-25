// 보내기 입력칸 이력 — ↑/↓ 로 앞서 보낸 내용(모드 포함)을 다시 불러온다. Serial·TCP·UDP 공통.
// 50개, 프로그램마다 따로(localStorage "sendHistory"). 한글 조합 중에는 움직이지 않고,
// 고치던 글은 잃지 않는다 — 처음 ↑ 를 누를 때 지금 글을 따로 두었다가 맨 아래에서 ↓ 로 돌아온다.
import { useCallback, useRef, type KeyboardEvent } from "react";
import { load, store } from "./framing";
import { HISTORY_MAX, pushHistory, stepHistory, type HistoryEntry } from "./history.ts";
export type { HistoryEntry } from "./history.ts";

function sane(v: unknown): HistoryEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is HistoryEntry => !!x && typeof x.text === "string" && (x.mode === "hex" || x.mode === "ascii")).slice(-HISTORY_MAX);
}

/**
 * 입력칸에 붙이는 이력. `current` 는 지금 입력(글·모드), `apply` 는 불러온 글을 입력칸에 넣는 함수.
 * 보낸 뒤 `remember` 를 부른다. 글을 직접 고치면 `edited` 로 걷던 자리를 놓는다.
 */
export function useSendHistory(current: HistoryEntry, apply: (e: HistoryEntry) => void) {
  const pos = useRef<number | null>(null);
  const draft = useRef<HistoryEntry | null>(null);
  const cur = useRef(current);
  cur.current = current;

  const remember = useCallback((e: HistoryEntry) => {
    store("sendHistory", pushHistory(sane(load("sendHistory", [])), e));
    pos.current = null;
    draft.current = null;
  }, []);

  const edited = useCallback(() => {
    pos.current = null;
    draft.current = null;
  }, []);

  /** 입력칸 onKeyDown 에서 먼저 부른다 — 이력을 움직였으면 true */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return false;
      const list = sane(load("sendHistory", []));
      const r = stepHistory(list, pos.current, e.key === "ArrowUp" ? -1 : 1);
      if (!r.entry) return false;
      e.preventDefault();
      if (pos.current == null) draft.current = { ...cur.current };
      pos.current = r.pos;
      if (r.entry === "draft") {
        if (draft.current) apply(draft.current);
        draft.current = null;
      } else apply(r.entry);
      // 글 끝으로 커서를 옮긴다
      const el = e.currentTarget;
      requestAnimationFrame(() => el.setSelectionRange?.(el.value.length, el.value.length));
      return true;
    },
    [apply],
  );

  return { onKeyDown, remember, edited };
}
