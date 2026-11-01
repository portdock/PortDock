// 연결·기록 중에 창을 닫으려 하면 한 번 묻는다(설정에서 끌 수 있음).
// 닫기로 정해지면 사용 통계(켰을 때만)를 짧게 보내고 닫는다 — 닫기 처리는 여기 하나뿐이어야 한다
// (onCloseRequested 처리기가 둘이면 한쪽이 «취소» 해도 다른 쪽이 창을 닫는다)
import { dicts, type Lang } from "./lang.ts";
import { JA_EXIT } from "./ja/dialogs.ts";
import { PT_EXIT } from "./pt/dialogs.ts";
import { FR_EXIT } from "./fr/dialogs.ts";
import { IT_EXIT } from "./it/dialogs.ts";
import { ID_EXIT } from "./id/dialogs.ts";
import { VI_EXIT } from "./vi/dialogs.ts";
import { TR_EXIT } from "./tr/dialogs.ts";
import { DE_EXIT } from "./de/dialogs.ts";
import { PL_EXIT } from "./pl/dialogs.ts";
import { ES_EXIT } from "./es/dialogs.ts";
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { flushUsage } from "./usage";

const MSG = {
  ko: "연결 중이거나 파일에 기록하는 중입니다. 닫으면 연결이 끊기고 기록이 멈춥니다. 닫을까요?",
  en: "A connection or file log is active. Closing will disconnect and stop logging. Close anyway?",
};
const MSG_L = dicts({ msg: MSG.ko }, { msg: MSG.en }, { ja: { msg: JA_EXIT }, de: { msg: DE_EXIT }, es: { msg: ES_EXIT }, pt: { msg: PT_EXIT }, pl: { msg: PL_EXIT }, fr: { msg: FR_EXIT }, vi: { msg: VI_EXIT }, tr: { msg: TR_EXIT }, it: { msg: IT_EXIT }, id: { msg: ID_EXIT } });

export function useExitGuard(active: boolean, enabled: boolean, lang: Lang, title: string) {
  const cur = useRef({ active, enabled, lang, title });
  cur.current = { active, enabled, lang, title };
  useEffect(() => {
    // 등록이 비동기라, 정리가 먼저 오면(개발 모드 이중 실행) 등록되는 즉시 해제한다 — 확인 창이 두 번 뜨지 않게
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(async (e) => {
        const c = cur.current;
        if (c.enabled && c.active) {
          const ok = await ask(MSG_L[c.lang].msg, { title: c.title, kind: "warning" });
          if (!ok) {
            e.preventDefault();
            return;
          }
        }
        // 1.5초 안에 끝난다(못 보내면 버림) — 닫기를 막지 않는다
        await flushUsage();
      })
      .then((u) => {
        if (cancelled) u();
        else unlisten = u;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
