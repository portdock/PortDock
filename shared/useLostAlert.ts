// 끊기면 작업 표시줄 깜빡임(0.3.0) — 연결이 끊기거나 재연결 대기로 바뀌었는데 이 창이 앞에 없으면 작업 표시줄 단추를 깜빡인다.
// 설정 «끊기면 작업 표시줄 깜빡임»(기본 켬). 사용자가 끊은 것(끊기·멈춤 버튼)은 앱이 lost=false 로 넘겨 깜빡이지 않는다.
import { useEffect, useRef } from "react";
import { getCurrentWindow, UserAttentionType } from "@tauri-apps/api/window";
import { shouldFlash } from "./lostRule";

/**
 * @param lost 연결이 뜻하지 않게 끊긴 상태인지(끊김·재연결 대기·상대가 닫음 등). 사용자가 끊은 «닫힘» 은 false
 * @param on 설정 lostAlert
 */
export function useLostAlert(lost: boolean, on: boolean) {
  const prev = useRef(lost);
  useEffect(() => {
    const was = prev.current;
    prev.current = lost;
    if (!shouldFlash(was, lost, document.hasFocus(), on)) return;
    getCurrentWindow()
      .requestUserAttention(UserAttentionType.Informational)
      .catch(() => {});
  }, [lost, on]);
}
