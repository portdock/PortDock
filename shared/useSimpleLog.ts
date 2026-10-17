// 단순 통신 기록(Modbus Slave·Simulator) — 마지막 n줄만 그리는 목록에 따라가기·줄 고르기를 붙인다.
// 따라가기를 멈추면 그 순간의 n줄을 그대로 보여 준다(새 줄이 와도 읽던 줄이 밀려 올라가지 않게).
import { useRef, type RefObject } from "react";
import { useFollowTail } from "./useFollowTail";
import { useLogSelection } from "./logCopy";
import type { LogFrame } from "./logSearch";

export function useSimpleLog<F extends LogFrame>(traffic: RefObject<F[]>, seqRef: RefObject<number>, ref: RefObject<HTMLElement | null>, autoScroll: boolean, tick: unknown, viewN: number) {
  const follow = useFollowTail(ref, autoScroll, seqRef.current, tick);
  // 보여 줄 마지막 줄 번호 — 따라가는 중이면 최신, 멈췄으면 멈춘 때 그대로
  const end = useRef(0);
  if (follow.following || end.current > seqRef.current) end.current = seqRef.current;
  const all = traffic.current;
  const first = all.length ? (all[0].seq ?? 0) : 0;
  const endIdx = Math.min(all.length, end.current - first + 1);
  const frames = endIdx > 0 ? all.slice(Math.max(0, endIdx - viewN), endIdx) : [];
  const shownFirst = frames.length ? (frames[0].seq ?? 0) : 0;
  const sel = useLogSelection({
    indexOfSeq: (seq) => (seq - shownFirst >= 0 && seq - shownFirst < frames.length ? seq - shownFirst : -1),
    seqAt: (i) => frames[i]?.seq,
  });
  /** 줄 번호 → 기록(이미 잘려 나갔으면 undefined) */
  const frameOf = (seq: number) => {
    const f = all[seq - first];
    return f && f.seq === seq ? f : undefined;
  };
  return { frames, follow, sel, frameOf };
}
