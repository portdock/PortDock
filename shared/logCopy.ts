// 로그 줄 고르기(누르기·Shift 범위·Ctrl 하나씩)와 복사 — 다섯 프로그램 공통.
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ascii as asciiOf, hex as hexOf } from "./format";
import { frameLine, type LogFrame, type ViewMode } from "./logSearch";
import { overlayOpen, typingTarget } from "./shortcuts";

/** 클립보드에 쓴다. WebView 가 막으면 숨은 글 칸 + execCommand 로 한 번 더 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* 아래 방법으로 */
  }
  try {
    const prev = document.activeElement as HTMLElement | null;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    prev?.focus?.();
    return ok;
  } catch {
    return false;
  }
}

/** C 배열 표기: {0x01, 0x03} */
export const cArray = (bytes: number[]) => `{${bytes.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`).join(", ")}}`;

export type CopyKind = "lines" | "hex" | "ascii" | "both" | "c";

/**
 * 고른 줄을 글로. lines = «시각 방향 내용»(지금 보기대로, 화면 내용 저장과 같은 모양),
 * 나머지는 내용만(사건 줄 EV 는 뺀다) — 다른 프로그램·코드에 붙여 넣기 좋게.
 */
export function copyTextOf(frames: LogFrame[], kind: CopyKind, view: ViewMode, fmt: (ts: number) => string, peers?: boolean, col?: (f: LogFrame) => string) {
  if (kind === "lines") return frames.map((f) => frameLine(f, view, fmt, hexOf, (b) => asciiOf(b), peers, col)).join("\r\n");
  return frames
    .filter((f) => f.dir !== "ev")
    .map((f) => (kind === "hex" ? hexOf(f.bytes) : kind === "ascii" ? asciiOf(f.bytes) : kind === "both" ? `${hexOf(f.bytes)} | ${asciiOf(f.bytes)}` : cArray(f.bytes)))
    .join("\r\n");
}

export interface Selection {
  /** 고른 줄 번호(seq) */
  set: Set<number>;
  /** 마지막으로 누른 줄 — 상세 칸·찾기 기준 */
  primary: number | null;
  /** Shift 범위의 시작 */
  anchor: number | null;
}

const EMPTY: Selection = { set: new Set(), primary: null, anchor: null };
/** 한 번에 고를 수 있는 줄 수 — 너무 큰 범위로 화면이 멈추지 않게 */
const MAX_RANGE = 200_000;

/**
 * 로그 줄 고르기. order 는 지금 보이는 순서(거르기 반영): seq → 자리, 자리 → seq.
 * 누르기 = 하나만, Shift+누르기 = 앞서 누른 줄부터 범위, Ctrl+누르기 = 하나씩 더하기·빼기.
 */
export function useLogSelection(order: { indexOfSeq: (seq: number) => number; seqAt: (i: number) => number | undefined }) {
  const [sel, setSel] = useState<Selection>(EMPTY);
  const orderRef = useRef(order);
  orderRef.current = order;

  const only = useCallback((seq: number | null) => setSel(seq == null ? EMPTY : { set: new Set([seq]), primary: seq, anchor: seq }), []);
  const clear = useCallback(() => setSel(EMPTY), []);

  const click = useCallback((e: ReactMouseEvent | MouseEvent, seq: number) => {
    // 상세 칸 등에서 끌어 고른 글자가 남아 있으면 Ctrl+C 가 그것을 복사한다 — 줄을 누르면 지운다
    window.getSelection()?.removeAllRanges();
    setSel((s) => {
      const o = orderRef.current;
      if (e.shiftKey && s.anchor != null) {
        const a = o.indexOfSeq(s.anchor);
        const b = o.indexOfSeq(seq);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const set = new Set<number>();
          for (let i = lo; i <= hi && set.size < MAX_RANGE; i++) {
            const q = o.seqAt(i);
            if (q != null) set.add(q);
          }
          return { set, primary: seq, anchor: s.anchor };
        }
      }
      if (e.ctrlKey || e.metaKey) {
        const set = new Set(s.set);
        if (set.has(seq)) {
          set.delete(seq);
          const rest = [...set];
          return { set, primary: s.primary === seq ? (rest.length ? rest[rest.length - 1] : null) : s.primary, anchor: seq };
        }
        set.add(seq);
        return { set, primary: seq, anchor: seq };
      }
      return { set: new Set([seq]), primary: seq, anchor: seq };
    });
  }, []);

  /** 오른쪽 버튼 — 고른 줄 밖을 누르면 그 줄만 고른다(고른 묶음 안이면 그대로) */
  const context = useCallback((seq: number) => {
    setSel((s) => (s.set.has(seq) ? { ...s, primary: seq } : { set: new Set([seq]), primary: seq, anchor: seq }));
  }, []);

  return { ...sel, has: (seq: number | undefined) => seq != null && sel.set.has(seq), only, clear, click, context };
}

export type LogSelection = ReturnType<typeof useLogSelection>;

/** 고른 줄을 화면 순서대로(seq 오름차순). frameOf 가 undefined 를 주면(이미 잘려 나간 줄) 뺀다 */
export function selectedFrames<F extends LogFrame>(sel: Selection, frameOf: (seq: number) => F | undefined): F[] {
  return [...sel.set]
    .sort((a, b) => a - b)
    .map(frameOf)
    .filter((f): f is F => !!f);
}

/**
 * Ctrl+C — 글 쓰는 칸 밖이고 화면에서 글자를 끌어 고른 게 없을 때 고른 로그 줄을 복사한다.
 * getText 가 null 이면(고른 줄 없음) 기본 동작 그대로.
 */
export function useCopyKey(getText: () => string | null, onCopied?: (ok: boolean) => void) {
  const cur = useRef({ getText, onCopied });
  cur.current = { getText, onCopied };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "c" || e.isComposing) return;
      if (typingTarget() || overlayOpen()) return;
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      const text = cur.current.getText();
      if (text == null) return;
      e.preventDefault();
      copyText(text).then((ok) => cur.current.onCopied?.(ok));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
