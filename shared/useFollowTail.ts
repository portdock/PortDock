// 로그 «따라가기» — 맨 아래에 있을 때만 새 줄을 따라 내려간다.
// 위로 굴리면 따라가기를 멈추고(새 줄이 와도 그 자리), «↓ 맨 아래로 (새 줄 n)» 버튼·End·맨 아래까지 굴리기로 다시 따라간다.
// 가상 스크롤(Serial·TCP·UDP)과 단순 목록(Modbus Slave·Simulator) 모두 같은 규칙.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { overlayOpen, typingTarget } from "./shortcuts";

/** 이만큼(px) 안이면 «맨 아래» 로 본다 — 한 줄 높이 안쪽 */
const NEAR = 24;

export interface FollowTail {
  following: boolean;
  /** 멈춘 뒤 새로 온 줄 수 */
  newCount: number;
  pause: () => void;
  resume: () => void;
}

/**
 * @param ref 굴러가는 칸(.log·.tlog)
 * @param initial 처음 따라갈지(설정 «새 줄이 오면 자동 스크롤»). 설정을 바꾸면 그대로 따른다
 * @param mark 지금까지 들어온 줄 수(줄 번호처럼 늘기만 하는 값) — 멈춘 뒤 새 줄 수를 센다
 * @param tick 새 줄·거르기·글자 크기처럼 내용 높이가 바뀌는 값 — 바뀌면(따라가는 중이면) 맨 아래로
 */
export function useFollowTail(ref: RefObject<HTMLElement | null>, initial: boolean, mark: number, tick: unknown): FollowTail {
  const [following, setFollowing] = useState(initial);
  const [pausedAt, setPausedAt] = useState(mark);
  const followRef = useRef(following);
  followRef.current = following;
  const markRef = useRef(mark);
  markRef.current = mark;
  // 마지막으로 본 scrollTop — 위로 굴렸는지(멈춤)·아래로 굴렸는지(재개) 가린다
  const lastTop = useRef(0);

  const snap = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    lastTop.current = el.scrollTop;
  }, [ref]);
  const pause = useCallback(() => {
    if (!followRef.current) return;
    followRef.current = false;
    setPausedAt(markRef.current);
    setFollowing(false);
  }, []);
  const resume = useCallback(() => {
    followRef.current = true;
    setFollowing(true);
    snap();
  }, [snap]);

  // 설정을 바꾸면 따른다(처음 값과 같으면 아무 일 없음)
  const firstInitial = useRef(initial);
  useEffect(() => {
    if (firstInitial.current === initial) return;
    firstInitial.current = initial;
    if (initial) resume();
    else pause();
  }, [initial, pause, resume]);

  // 새 줄·거르기·줄 높이가 바뀌면, 따라가는 중일 때만 맨 아래로(그리기 직후, 깜빡임 없이)
  useLayoutEffect(() => {
    if (following) snap();
  }, [tick, following, snap]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    lastTop.current = el.scrollTop;
    const onScroll = () => {
      const top = el.scrollTop;
      const prev = lastTop.current;
      lastTop.current = top;
      const atBottom = el.scrollHeight - top - el.clientHeight <= NEAR;
      // 사람이 위로 굴렸을 때만 멈춘다(앞줄이 잘려 scrollTop 이 줄어도 맨 아래면 그대로)
      if (followRef.current) {
        if (!atBottom && top < prev - 1) pause();
      } else if (atBottom && top > prev) resume();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // 창 크기가 바뀌어도 따라가는 중이면 맨 아래에 붙어 있게
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => followRef.current && snap()) : null;
    ro?.observe(el);
    // End — 글 쓰는 칸 밖에서 누르면 맨 아래로 가서 다시 따라간다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "End" || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.isComposing) return;
      if (typingTarget() || overlayOpen()) return;
      e.preventDefault();
      resume();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [ref, pause, resume, snap]);

  return { following, newCount: following ? 0 : Math.max(0, mark - pausedAt), pause, resume };
}
