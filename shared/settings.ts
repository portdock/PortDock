// 모든 프로그램 공통 설정 — 화면 쪽에서만 쓰는 값. 저장은 localStorage("settings").
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load, store } from "./framing";
import { fileStamp } from "./fileName";
import { useZoomKeys } from "./useZoomKeys";

export * from "./settingsData.ts";
import { DEFAULTS, sanitize, type Settings, type TimeFormat } from "./settingsData.ts";

/** 테마·글자 크기는 문서 전체에 바로 반영 */
/** 가상 스크롤 기록의 한 줄 높이(px) — CSS --row-h 와 같은 값 */
export const rowHeight = (fontSize: number) => Math.max(22, Math.round(fontSize * 1.7));

function apply(s: Settings) {
  const root = document.documentElement;
  if (s.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  root.style.setProperty("--fs", `${s.fontSize}px`);
  // 기록 한 줄 높이 — 글자를 키워도 줄이 잘리지 않게
  root.style.setProperty("--row-h", `${rowHeight(s.fontSize)}px`);
  root.lang = s.lang;
}

export function useSettings() {
  // 예전 판에서 따로 저장하던 언어도 이어받는다
  const [settings, setState] = useState<Settings>(() => sanitize({ lang: load("lang", DEFAULTS.lang), ...load<Partial<Settings>>("settings", {}) }));
  const cur = useRef(settings);
  cur.current = settings;
  useEffect(() => {
    // 백엔드 문구(오류·사건 줄)도 같은 언어로
    invoke("set_lang", { lang: settings.lang }).catch(() => {});
  }, [settings.lang]);
  useEffect(() => apply(settings), [settings]);
  // 같은 프로그램 창이 둘이면 서로 덮어쓰지 않게 — 바뀐 키만 마지막 저장값에 합쳐 쓴다
  const save = useCallback((next: Settings) => {
    store("settings", next);
    store("lang", next.lang);
    // 같은 창의 다른 조각(새 버전 알림 등 — main.tsx 에서 그림)도 바뀐 설정을 알게
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);
  const update = useCallback(
    (patch: Partial<Settings>) => {
      const next = sanitize({ ...cur.current, ...load<Partial<Settings>>("settings", {}), ...patch });
      save(next);
      setState(next);
    },
    [save],
  );
  const reset = useCallback(() => {
    const next = sanitize({ lang: cur.current.lang });
    save(next);
    setState(next);
  }, [save]);
  // 다른 창에서 바꾼 설정도 받아 온다
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "settings" || !e.newValue) return;
      try {
        setState(sanitize(JSON.parse(e.newValue) as Partial<Settings>));
      } catch {
        /* 읽을 수 없는 값 — 무시 */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Ctrl+휠·Ctrl+=/-/0 글자 크기(0.3.0)
  useZoomKeys(settings.fontSize, update);
  return { settings, update, reset };
}

/** 이 창에서 설정을 저장했을 때 window 에 보내는 사건 이름 */
export const SETTINGS_EVENT = "portdock-settings";

/**
 * 접기 칸 하나의 열림 상태 — 평소에는 칸마다 기억한 값(open·setOpen)을 쓰고,
 * «모두 펼치기(전문가 화면)» 가 켜져 있으면 펼친 채 보인다. 그때 접은 칸은 이번 실행 동안만 접혀 있고
 * 기억한 값은 건드리지 않는다(끄면 칸마다 기억한 상태로 돌아간다).
 */
export function useFold(open: boolean, setOpen: (v: boolean) => void, expandAll: boolean): [boolean, (v: boolean) => void] {
  const [shut, setShut] = useState(false);
  useEffect(() => {
    if (!expandAll) setShut(false);
  }, [expandAll]);
  const setShown = useCallback((v: boolean) => setShut(!v), []);
  return expandAll ? [!shut, setShown] : [open, setOpen];
}

const p2 = (n: number) => String(n).padStart(2, "0");
const p3 = (n: number) => String(n).padStart(3, "0");

/** 로그 줄 시각. elapsed 는 base(첫 줄 또는 연결 시각)부터 */
export function formatTime(ts: number, f: TimeFormat, base: number) {
  if (f === "elapsed") {
    const ms = Math.max(0, ts - base);
    const s = Math.floor(ms / 1000);
    return `+${p2(Math.floor(s / 3600))}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}.${p3(ms % 1000)}`;
  }
  const d = new Date(ts);
  if (f === "utc") return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}.${p3(d.getUTCMilliseconds())}Z`;
  const t = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
  return f === "local-date" ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${t}` : t;
}

/** 백엔드 set_log_options 에 넘기는 값 */
export const logOptionsOf = (s: Settings) => ({ format: s.logFormat, encoding: s.encoding, splitMb: s.logSplitMb, splitHours: s.logSplitHours });

/** 파일 로그 확장자 — CSV 면 .csv */
export const logExt = (s: Settings) => (s.logFormat === "csv" ? "csv" : "log");

/** 자동 로그 파일 경로: 폴더\portdock-<도구>-<시각>.log */
export function autoLogPath(folder: string, tool: string, ext = "log") {
  const stamp = fileStamp();
  const sep = folder.includes("/") && !folder.includes("\\") ? "/" : "\\";
  return `${folder.replace(/[\\/]+$/, "")}${sep}portdock-${tool}-${stamp}.${ext}`;
}
