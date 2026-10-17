// 연결·기록 중에 창을 닫으려 하면 한 번 묻는다(설정에서 끌 수 있음)
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";

const MSG = {
  ko: "연결 중이거나 파일에 기록하는 중입니다. 닫으면 연결이 끊기고 기록이 멈춥니다. 닫을까요?",
  en: "A connection or file log is active. Closing will disconnect and stop logging. Close anyway?",
};

export function useExitGuard(active: boolean, enabled: boolean, lang: "ko" | "en", title: string) {
  const cur = useRef({ active, enabled, lang, title });
  cur.current = { active, enabled, lang, title };
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(async (e) => {
        const c = cur.current;
        if (!c.enabled || !c.active) return;
        const ok = await ask(MSG[c.lang], { title: c.title, kind: "warning" });
        if (!ok) e.preventDefault();
      })
      .then((u) => (unlisten = u))
      .catch(() => {});
    return () => unlisten?.();
  }, []);
}
