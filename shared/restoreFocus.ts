import { useEffect, useRef, useState } from "react";

/**
 * 대화상자를 닫으면 열기 전에 포커스가 있던 곳(누른 버튼·입력칸)으로 돌려놓는다 — 키보드로 이어서 쓸 수 있게.
 * 돌려줄 ref 를 대화상자 바깥 요소(.modal-back)에 단다.
 */
export function useRestoreFocus<T extends HTMLElement>() {
  // autoFocus 가 포커스를 옮기기 전(첫 그리기 중)에 잡아 둔다
  const [prev] = useState(() => (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null));
  const root = useRef<T>(null);
  useEffect(() => {
    const el = root.current;
    return () => {
      setTimeout(() => {
        // 개발 모드(StrictMode)의 가짜 해제면 창이 그대로 있다 — 건드리지 않는다
        if (el?.isConnected) return;
        const now = document.activeElement;
        if (prev && prev !== document.body && prev.isConnected && (!now || now === document.body)) prev.focus();
      });
    };
  }, [prev]);
  return root;
}
