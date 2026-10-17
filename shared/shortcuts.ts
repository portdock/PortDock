// 프로그램 단축키 — F4 연결·끊기, Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤.
// 대화상자·우클릭 메뉴가 열려 있거나 한글 조합 중이면 아무것도 하지 않는다.
import { useEffect, useRef } from "react";

export const KEYS = {
  connect: "F4",
  clear: "Ctrl+L",
  save: "Ctrl+S",
  fileLog: "Ctrl+Shift+L",
  stopRepeat: "Esc",
  end: "End",
  copy: "Ctrl+C",
} as const;

export interface Shortcut {
  /** KeyboardEvent.key (대소문자 무시) */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  run: () => void;
  /** 입력칸(글 쓰는 중)에서도 받을지 — 기본 받음. Esc 처럼 입력칸 동작과 겹치면 false */
  inInput?: boolean;
}

/** 지금 글을 쓰는 칸에 포커스가 있는지(체크·버튼은 아님) */
export function typingTarget(el: Element | null = document.activeElement) {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(el.type);
  return (el as HTMLElement).isContentEditable === true;
}

/** 대화상자·우클릭 메뉴가 떠 있으면 단축키를 그쪽에 맡긴다 */
export const overlayOpen = () => !!document.querySelector(".modal-back, .log-menu");

export function useShortcuts(list: Shortcut[]) {
  const cur = useRef(list);
  cur.current = list;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 한글 조합 중(229)·자동 반복 중인 F4 는 무시
      if (e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      if (overlayOpen()) return;
      const k = e.key.toLowerCase();
      for (const s of cur.current) {
        if (s.key.toLowerCase() !== k) continue;
        if (!!s.ctrl !== (e.ctrlKey || e.metaKey) || !!s.shift !== e.shiftKey || e.altKey) continue;
        if (s.inInput === false && typingTarget()) return;
        e.preventDefault();
        if (e.repeat && s.key === "F4") return; // 누르고 있을 때 연결·끊기가 번갈아 반복되지 않게
        s.run();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** 말풍선·제목에 단축키를 덧붙인다: «연결 (F4)» */
export const withKey = (text: string | undefined, key: string) => (text ? `${text} (${key})` : key);
