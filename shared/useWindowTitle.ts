// 창 제목에 지금 상태를 — 작업 표시줄에서 어느 창이 어느 포트인지 보이게.
// 예: «COM3 115200 8N1 · 연결됨 ● REC — PortDock Serial». 쉬는 중이면 프로그램 이름만.
import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** 제목 조각을 « · » 로 잇고 « — 프로그램 이름» 을 붙인다. 조각이 없으면 이름만 */
export function windowTitle(app: string, parts: (string | false | null | undefined)[], rec = false) {
  const body = parts.filter(Boolean).join(" · ");
  return body ? `${body}${rec ? " ● REC" : ""} — ${app}` : app;
}

export function useWindowTitle(title: string) {
  useEffect(() => {
    document.title = title;
    // 권한(core:window:allow-set-title)이 없거나 미리보기(가짜 백엔드)면 조용히 넘어간다
    try {
      getCurrentWindow()
        .setTitle(title)
        .catch(() => {});
    } catch {
      /* 창 API 없음 */
    }
  }, [title]);
}
