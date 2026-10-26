// 공통 설정의 모양·기본값·고치기·내보내기/가져오기 — React·Tauri 없는 부분(시험: node --test shared/settingsData.test.ts)
import { isEncoding, type Encoding } from "./format.ts";

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
  /** 연결이 끊기면 작업 표시줄 깜빡임(창이 뒤에 있을 때, 0.3.0) */
  lostAlert: boolean;
  /** 연결·기록 중 절전 막기(0.3.0, 기본 끔) — PC 가 대기 모드로 들어가지 않게(화면은 꺼져도 됨) */
  keepAwake: boolean;
  /** 켤 때 마지막으로 성공한 연결 다시 열기(0.3.0, 기본 끔) */
  autoConnect: boolean;
  autoReport: AutoReport;
  /** 사용 통계 보내기(선택, 기본 꺼짐) — 창을 닫을 때 익명 횟수만(shared/usage.ts) */
  usageStats: boolean;
  /** 새 버전 확인(0.3.0, 선택·기본 꺼짐) — 하루 한 번 GitHub API 의 최신 릴리스만 묻는다(shared/UpdateNotice.tsx) */
  updateCheck: boolean;
  /** 사용 통계를 한 번 물었다(첫 실행·이 기능이 생긴 판으로 올린 뒤 처음) — 다시 묻지 않는다 */
  usageAsked: boolean;
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
  lostAlert: true,
  keepAwake: false,
  autoConnect: false,
  autoReport: "ask",
  usageStats: false,
  updateCheck: false,
  usageAsked: false,
  alwaysOnTop: false,
  encoding: "utf-8",
  logFormat: "hex",
  logSplitMb: 0,
  logSplitHours: 0,
  expandAll: false,
};

export const LIMITS = { fontSize: [11, 18], maxLines: [1_000, 1_000_000], logSplitMb: [0, 4096], logSplitHours: [0, 720] } as const;

/** 저장값·가져온 값 고치기 — 범위 밖·종류가 다른 값은 기본값으로 */
export function sanitize(s: Partial<Settings>): Settings {
  const v = { ...DEFAULTS, ...s };
  if (typeof v.logFolder !== "string") v.logFolder = "";
  for (const k of ["autoScroll", "autoLog", "confirmExit", "lostAlert"] as const) if (typeof v[k] !== "boolean") v[k] = DEFAULTS[k];
  v.fontSize = Math.min(LIMITS.fontSize[1], Math.max(LIMITS.fontSize[0], Math.round(v.fontSize) || DEFAULTS.fontSize));
  v.maxLines = Math.min(LIMITS.maxLines[1], Math.max(LIMITS.maxLines[0], Math.round(v.maxLines) || DEFAULTS.maxLines));
  if (!["system", "light", "dark"].includes(v.theme)) v.theme = "system";
  if (!["local", "local-date", "utc", "elapsed"].includes(v.timeFormat)) v.timeFormat = "local";
  if (!["ask", "on", "off"].includes(v.autoReport)) v.autoReport = "ask";
  if (v.lang !== "ko" && v.lang !== "en") v.lang = DEFAULTS.lang;
  v.alwaysOnTop = v.alwaysOnTop === true;
  v.keepAwake = v.keepAwake === true;
  v.autoConnect = v.autoConnect === true;
  v.expandAll = v.expandAll === true;
  v.usageStats = v.usageStats === true;
  v.updateCheck = v.updateCheck === true;
  v.usageAsked = v.usageAsked === true;
  if (!isEncoding(v.encoding)) v.encoding = "utf-8";
  if (!["hex", "ascii", "hex-ascii", "csv"].includes(v.logFormat)) v.logFormat = "hex";
  const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(Number(n)) || 0));
  v.logSplitMb = clamp(v.logSplitMb, LIMITS.logSplitMb);
  v.logSplitHours = clamp(v.logSplitHours, LIMITS.logSplitHours);
  return v;
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

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * 가져오기 — 다른 PortDock 도구의 파일이면 거절. 모양이 틀리면 지금 설정은 그대로 두고 거절한다.
 * 공통 설정은 고쳐서 넣고, 오류 자동 전송 «켬(묻지 않고 보내기)» 은 «묻기» 로, 사용 통계 «보내기» 는 «묻기» 로, 새 버전 확인은 «끔» 으로 낮춘다
 * — 남이 준 파일로 몰래 켜지지 않게.
 * 도구별 값(명령 목록·표 등)은 읽는 쪽(`load`)이 종류를 보고, 그래도 화면이 깨지면 오류 화면의 «설정 초기화» 로 빠져나온다
 */
export function importAll(app: string, json: string, lang: "ko" | "en" = "ko") {
  const notOurs = () => new Error(lang === "ko" ? "PortDock 설정 파일이 아닙니다" : "Not a PortDock settings file");
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    throw notOurs();
  }
  if (!isPlain(body) || !isPlain(body.data)) throw notOurs();
  const from = typeof body.app === "string" ? body.app : "?";
  if (from !== app) throw new Error(lang === "ko" ? `${from} 의 설정 파일입니다 (지금 프로그램: ${app})` : `This file belongs to ${from} (this program: ${app})`);
  const data = { ...body.data };
  if ("settings" in data) {
    if (!isPlain(data.settings)) throw notOurs();
    const s = sanitize(data.settings as Partial<Settings>);
    if (s.autoReport === "on") s.autoReport = "ask";
    if (s.usageStats) {
      s.usageStats = false;
      s.usageAsked = false;
    }
    s.updateCheck = false;
    data.settings = s;
  }
  localStorage.clear();
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
}
