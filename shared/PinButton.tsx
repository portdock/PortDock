// 머리줄 📌 — 이 창을 늘 다른 창 위에. 설정(⚙)의 «항상 위» 와 같은 값.
import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ui, type Lang } from "./uiText";

/** 설정 값을 창에 적용 — 권한이 없거나 미리보기면 조용히 넘어간다 */
export function useAlwaysOnTop(on: boolean) {
  useEffect(() => {
    try {
      getCurrentWindow()
        .setAlwaysOnTop(on)
        .catch(() => {});
    } catch {
      /* 창 API 없음 */
    }
  }, [on]);
}

export function PinButton({ lang, on, onToggle }: { lang: Lang; on: boolean; onToggle: (v: boolean) => void }) {
  useAlwaysOnTop(on);
  const label = ui(lang, on ? "pinOn" : "pinOff");
  return (
    <button type="button" className={on ? "icon-btn pin on" : "icon-btn pin"} onClick={() => onToggle(!on)} aria-pressed={on} aria-label={label} data-tip={label}>
      📌
    </button>
  );
}
