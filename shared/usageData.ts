// 사용 통계(선택, 기본 꺼짐) — 묶기·허용 목록 검사. React·Tauri 없는 부분(시험: node --test shared/usageData.test.ts)
//
// 받는 곳은 Aptabase(EU) 의 수집 주소 하나. 라이브러리·플러그인 없이 창을 닫을 때 POST 한 번.
// 보내는 것은 아래 허용 목록에 있는 이름·속성뿐이고, 목록 밖이면 그 사건을 통째로 버린다.

/**
 * Aptabase 앱 키(«A-EU-…»). 비워 두면 통계 기능 전체가 숨는다(묻는 카드·설정 칸·전송 모두).
 * 이 키는 공개돼도 되는 «쓰기 전용» 값이다 — 사건을 보내는 것만 되고 통계를 읽을 수는 없다(읽기는 계정 로그인).
 * EU 지역 키만 받는다(CSP 의 connect-src 도 eu.aptabase.com 하나만 연다).
 */
export const APTABASE_KEY = "A-EU-6553686203";

/** 키 → 수집 주소. 비었거나 EU 키가 아니면 null(보내지 않음) */
export function ingestUrl(key: string = APTABASE_KEY): string | null {
  return /^A-EU-[0-9A-Za-z]{4,40}$/.test(key.trim()) ? "https://eu.aptabase.com/api/v0/events" : null;
}

/** 프로그램마다 세는 기능 — 값·주소·내용 없이 횟수만. 이름은 이 목록에서만 */
export const FEATURES = {
  serial: ["connect", "send", "send_file", "file_log", "send_break", "port_check", "open_in_master"],
  tcp: ["start", "relay", "send", "send_file", "file_log", "open_in_master"],
  udp: ["start", "send", "file_log"],
  "modbus-master": ["connect_serial", "connect_tcp", "modbus_read", "modbus_write", "scan_ids", "scan_addrs", "file_log"],
  "modbus-slave": ["start_serial", "start_tcp", "edit_values", "faults", "simulate", "file_log"],
  simulator: ["start_serial", "start_tcp", "start_udp", "send", "file_log"],
  scpi: ["connect_tcp", "connect_serial", "write", "query", "read", "save_block"],
  plot: ["start", "record", "export"],
  netscan: ["scan", "modbus_ident", "wake", "open_web", "open_master", "open_in_tcp", "monitor"],
  "port-inspector": ["port_report", "com_numbers", "events", "nics", "pc_check", "loopback", "open_in_serial"],
} as const satisfies Record<string, readonly string[]>;

export type UsageApp = keyof typeof FEATURES;
export type Feature = (typeof FEATURES)[UsageApp][number];

export const isUsageApp = (a: string): a is UsageApp => Object.prototype.hasOwnProperty.call(FEATURES, a);

/** Aptabase 사건 하나(수집 API 의 본문 모양) */
export interface UsageEvent {
  timestamp: string;
  sessionId: string;
  eventName: string;
  systemProps: { isDebug: boolean; osName: string; osVersion: string; locale: string; appVersion: string; sdkVersion: string };
  props: Record<string, string | number>;
}

export interface UsageSession {
  app: string;
  version: string;
  /** "10" · "11" · "?" */
  windows: string;
  lang: string;
  portable: boolean;
  /** 이번 실행이 시작된 때·지금(ms) */
  startedAt: number;
  now: number;
  counts: Readonly<Record<string, number | undefined>>;
  /** 실행마다 새로 만드는 무작위 수(설치·PC 와 이어지지 않는다) */
  random: number;
  debug?: boolean;
}

export const SDK_VERSION = "portdock-usage@1";
/** 한 실행의 최대 길이(분) — 이보다 길면 이 값으로 */
export const MAX_MINUTES = 7 * 24 * 60;
export const MAX_COUNT = 1_000_000;
const WINDOWS = ["10", "11", "?"];
const LANGS = ["ko", "en"];
const EDITIONS = ["installed", "portable"];

/** Aptabase 형식의 세션 id — «시작 시각(초) × 10⁸ + 무작위» (서버가 7일 넘은 세션을 버리는 기준) */
export function sessionId(startedAt: number, random: number) {
  const r = Math.min(99_999_999, Math.max(0, Math.floor(random)));
  return String(BigInt(Math.floor(startedAt / 1000)) * 100_000_000n + BigInt(r));
}

/** 정수이고 [lo, hi] 안이면 true */
const intIn = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

/**
 * 보내기 전 개인정보 검사 — 허용 목록 밖이면 false(그 사건은 버린다).
 * 이름·속성 이름·속성 값 모두 정해진 것만: 통신 내용·주소·포트·COM 이름·경로·PC/사용자 이름이 섞일 자리가 없다
 */
export function allowed(e: UsageEvent): boolean {
  const s = e.systemProps;
  if (!s || s.osName !== "Windows" || !WINDOWS.includes(s.osVersion) || !LANGS.includes(s.locale)) return false;
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s.appVersion) || s.sdkVersion !== SDK_VERSION || typeof s.isDebug !== "boolean") return false;
  if (!/^\d{1,20}$/.test(e.sessionId) || Number.isNaN(Date.parse(e.timestamp))) return false;
  const p = e.props ?? {};
  const app = p.app;
  if (typeof app !== "string" || !isUsageApp(app)) return false;
  const keys = Object.keys(p).sort().join(",");
  if (e.eventName === "session") {
    return keys === "app,edition,minutes" && EDITIONS.includes(p.edition as string) && intIn(p.minutes, 0, MAX_MINUTES);
  }
  const m = /^([a-z-]+)\.([a-z_]+)$/.exec(e.eventName);
  if (!m || m[1] !== app || !(FEATURES[app] as readonly string[]).includes(m[2])) return false;
  return keys === "app,count" && intIn(p.count, 1, MAX_COUNT);
}

/**
 * 이번 실행의 사건 묶음 — «session» 하나 + 쓴 기능마다 하나(«serial.connect», 속성 count).
 * 허용 목록 밖은 버린다. 알 수 없는 프로그램이면 빈 목록
 */
export function buildBatch(s: UsageSession): UsageEvent[] {
  if (!isUsageApp(s.app)) return [];
  const sid = sessionId(s.startedAt, s.random);
  const systemProps = {
    isDebug: s.debug === true,
    osName: "Windows",
    osVersion: WINDOWS.includes(s.windows) ? s.windows : "?",
    locale: LANGS.includes(s.lang) ? s.lang : "en",
    appVersion: s.version,
    sdkVersion: SDK_VERSION,
  };
  const timestamp = new Date(s.now).toISOString();
  const minutes = Math.min(MAX_MINUTES, Math.max(0, Math.round((s.now - s.startedAt) / 60_000)));
  const out: UsageEvent[] = [
    { timestamp, sessionId: sid, eventName: "session", systemProps, props: { app: s.app, minutes, edition: s.portable ? "portable" : "installed" } },
  ];
  for (const f of FEATURES[s.app]) {
    const n = s.counts[f];
    if (!n) continue;
    out.push({ timestamp, sessionId: sid, eventName: `${s.app}.${f}`, systemProps, props: { app: s.app, count: Math.min(MAX_COUNT, Math.floor(n)) } });
  }
  return out.filter(allowed);
}

/** WebView2 의 platformVersion(«15.0.0») → 윈도우 메이저. 13 이상이 11, 1~12 가 10 */
export function windowsMajor(platformVersion: string | undefined): string {
  const n = Number(/^(\d+)\./.exec(platformVersion ?? "")?.[1]);
  if (!Number.isFinite(n) || n <= 0) return "?";
  return n >= 13 ? "11" : "10";
}
