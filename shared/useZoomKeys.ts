// Ctrl+휠·Ctrl+=/Ctrl+-/Ctrl+0 글자 크기(0.3.0) — 설정 «글자 크기» 와 같은 값을 바꾼다(useSettings 가 부른다).
// WebView 자체 확대는 꺼진 그대로. 계산은 zoomRule.ts(시험 있음)
import { useEffect, useRef } from "react";
import type { Settings } from "./settingsData";
import { nextFontSize, zoomKey } from "./zoomRule";

/** Ctrl+휠·Ctrl+=/-/0 → 설정 fontSize */
export function useZoomKeys(fontSize: number, update: (p: Partial<Settings>) => void) {
  const cur = useRef({ fontSize, update });
  cur.current = { fontSize, update };
  useEffect(() => {
    const set = (step: "in" | "out" | "reset") => {
      const n = nextFontSize(cur.current.fontSize, step);
      if (n !== cur.current.fontSize) cur.current.update({ fontSize: n });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return;
      const step = zoomKey(e);
      if (!step) return;
      e.preventDefault();
      set(step);
    };
    // 휠은 한 칸씩(빠르게 굴려도 50ms 에 한 번)
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.deltaY === 0) return;
      // 그래프(Plot 캔버스)는 휠을 확대에 쓴다
      if ((e.target as Element | null)?.closest?.("canvas")) return;
      e.preventDefault();
      const now = Date.now();
      if (now - last < 50) return;
      last = now;
      set(e.deltaY < 0 ? "in" : "out");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);
}

