// 다섯 프로그램 공통 설정 — 화면 쪽에서만 쓰는 값. 저장은 localStorage("settings").
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load, store } from "./framing";

export type Theme = "system" | "light" | "dark";
export type TimeFormat = "local" | "local-date" | "utc" | "elapsed";

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
};

export const LIMITS = { fontSize: [11, 18], maxLines: [1_000, 1_000_000] } as const;

function sanitize(s: Partial<Settings>): Settings {
  const v = { ...DEFAULTS, ...s };
  v.fontSize = Math.min(LIMITS.fontSize[1], Math.max(LIMITS.fontSize[0], Math.round(v.fontSize) || DEFAULTS.fontSize));
  v.maxLines = Math.min(LIMITS.maxLines[1], Math.max(LIMITS.maxLines[0], Math.round(v.maxLines) || DEFAULTS.maxLines));
  if (!["system", "light", "dark"].includes(v.theme)) v.theme = "system";
  if (!["local", "local-date", "utc", "elapsed"].includes(v.timeFormat)) v.timeFormat = "local";
  if (v.lang !== "ko" && v.lang !== "en") v.lang = DEFAULTS.lang;
  return v;
}

/** 테마·글자 크기는 문서 전체에 바로 반영 */
function apply(s: Settings) {
  const root = document.documentElement;
  if (s.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  root.style.setProperty("--fs", `${s.fontSize}px`);
  root.lang = s.lang;
}

export function useSettings() {
  // 예전 판에서 따로 저장하던 언어도 이어받는다
  const [settings, setState] = useState<Settings>(() => sanitize({ lang: load("lang", DEFAULTS.lang), ...load<Partial<Settings>>("settings", {}) }));
  useEffect(() => {
    // 백엔드 문구(오류·사건 줄)도 같은 언어로
    invoke("set_lang", { lang: settings.lang }).catch(() => {});
  }, [settings.lang]);
  useEffect(() => {
    apply(settings);
    store("settings", settings);
    store("lang", settings.lang);
  }, [settings]);
  const update = useCallback((patch: Partial<Settings>) => setState((s) => sanitize({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(sanitize({ lang: settings.lang })), [settings.lang]);
  return { settings, update, reset };
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

/** 자동 로그 파일 경로: 폴더\portdock-<도구>-<시각>.log */
export function autoLogPath(folder: string, tool: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const sep = folder.includes("/") && !folder.includes("\\") ? "/" : "\\";
  return `${folder.replace(/[\\/]+$/, "")}${sep}portdock-${tool}-${stamp}.log`;
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
