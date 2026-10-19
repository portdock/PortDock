// 모든 프로그램 공통 설정 — 화면 쪽에서만 쓰는 값. 저장은 localStorage("settings").
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load, store } from "./framing";
import { isEncoding, type Encoding } from "./format";

export type Theme = "system" | "light" | "dark";
/** 오류 자동 전송 — ask: 오류로 꺼졌을 때 묻기, on: 묻지 않고 보내기, off: 보내지 않기 */
export type AutoReport = "ask" | "on" | "off";
export type TimeFormat = "local" | "local-date" | "utc" | "elapsed";
/** 파일 로그 한 줄 모양(백엔드 event::LogFormat) */
export type LogFormat = "hex" | "ascii" | "hex-ascii" | "csv";

export interface Settings {
  lang: "ko" | "en";
  theme: Theme;
  /** 글자 크기(px) */
  fontSize: number;
  timeFormat: TimeFormat;
  /** 화면에 남길 최대 줄 수 — 넘치면 오래된 것부터 지운다(파일 로그는 그대로) */
  maxLines: number;
  autoScroll: boolean;
  /** 연결할 때 자동으로 파일 로그 시작 */
  autoLog: boolean;
  /** 자동 로그를 둘 폴더(비우면 매번 묻기) */
  logFolder: string;
  /** 연결·기록 중에 창을 닫으려 하면 묻기 */
  confirmExit: boolean;
  autoReport: AutoReport;
  /** 창을 늘 다른 창 위에(머리줄 📌 과 같은 값) */
  alwaysOnTop: boolean;
  /** 글자 보기·ASCII 송신 인코딩(Serial·TCP·UDP) */
  encoding: Encoding;
  /** 파일 로그 형식·나누기(Serial·TCP·UDP) — 다음 파일부터 */
  logFormat: LogFormat;
  logSplitMb: number;
  logSplitHours: number;
  /** 모두 펼치기(전문가 화면) — 접어 둔 칸(고급 연결·받기 설정·장애 주입·통계 등)을 늘 펼친 채 시작 */
  expandAll: boolean;
}

export const DEFAULTS: Settings = {
  lang: typeof navigator !== "undefined" && navigator.language.startsWith("ko") ? "ko" : "en",
  theme: "system",
  fontSize: 13,
  timeFormat: "local",
  maxLines: 100_000,
  autoScroll: true,
  autoLog: false,
  logFolder: "",
  confirmExit: true,
  autoReport: "ask",
  alwaysOnTop: false,
  encoding: "utf-8",
  logFormat: "hex",
  logSplitMb: 0,
  logSplitHours: 0,
  expandAll: false,
};

export const LIMITS = { fontSize: [11, 18], maxLines: [1_000, 1_000_000], logSplitMb: [0, 4096], logSplitHours: [0, 720] } as const;

function sanitize(s: Partial<Settings>): Settings {
  const v = { ...DEFAULTS, ...s };
  v.fontSize = Math.min(LIMITS.fontSize[1], Math.max(LIMITS.fontSize[0], Math.round(v.fontSize) || DEFAULTS.fontSize));
  v.maxLines = Math.min(LIMITS.maxLines[1], Math.max(LIMITS.maxLines[0], Math.round(v.maxLines) || DEFAULTS.maxLines));
  if (!["system", "light", "dark"].includes(v.theme)) v.theme = "system";
  if (!["local", "local-date", "utc", "elapsed"].includes(v.timeFormat)) v.timeFormat = "local";
  if (!["ask", "on", "off"].includes(v.autoReport)) v.autoReport = "ask";
  if (v.lang !== "ko" && v.lang !== "en") v.lang = DEFAULTS.lang;
  v.alwaysOnTop = v.alwaysOnTop === true;
  v.expandAll = v.expandAll === true;
  if (!isEncoding(v.encoding)) v.encoding = "utf-8";
  if (!["hex", "ascii", "hex-ascii", "csv"].includes(v.logFormat)) v.logFormat = "hex";
  const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(Number(n)) || 0));
  v.logSplitMb = clamp(v.logSplitMb, LIMITS.logSplitMb);
  v.logSplitHours = clamp(v.logSplitHours, LIMITS.logSplitHours);
  return v;
}

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
  return { settings, update, reset };
}

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
  const d = new Date();
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const sep = folder.includes("/") && !folder.includes("\\") ? "/" : "\\";
  return `${folder.replace(/[\\/]+$/, "")}${sep}portdock-${tool}-${stamp}.${ext}`;
}

/** 이 프로그램의 화면 설정 전부(명령 목록·규칙 포함)를 JSON 으로 */
export function exportAll(app: string) {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    try {
      data[k] = JSON.parse(localStorage.getItem(k)!);
    } catch {
      data[k] = localStorage.getItem(k);
    }
  }
  return JSON.stringify({ app, version: 1, exported: new Date().toISOString(), data }, null, 2);
}

/** 가져오기 — 다른 PortDock 도구의 파일이면 거절 */
export function importAll(app: string, json: string, lang: "ko" | "en" = "ko") {
  const body = JSON.parse(json) as { app?: string; data?: Record<string, unknown> };
  if (!body || typeof body !== "object" || !body.data) throw new Error(lang === "ko" ? "PortDock 설정 파일이 아닙니다" : "Not a PortDock settings file");
  if (body.app !== app) throw new Error(lang === "ko" ? `${body.app ?? "?"} 의 설정 파일입니다 (지금 프로그램: ${app})` : `This file belongs to ${body.app ?? "?"} (this program: ${app})`);
  localStorage.clear();
  for (const [k, v] of Object.entries(body.data)) localStorage.setItem(k, JSON.stringify(v));
}
