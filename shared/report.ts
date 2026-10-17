// 문제 보고 — 오류를 모아 두었다가, 사용자가 내용을 확인하고 직접 개발자에게 보낸다.
// 몰래 보내지 않는다: 공장 PC 는 인터넷이 없거나 통신 내용이 회사 기밀인 경우가 많다.
import { invoke } from "@tauri-apps/api/core";
import { hex } from "./format";

/** 받는 곳 — 비워 두면 그 버튼은 숨는다 */
export const REPORT_EMAIL = "";
export const ISSUES_URL = "https://github.com/juhak0308/PortDock/issues/new";
/**
 * 자동 전송 받는 곳 — Sentry 프로젝트의 DSN(https://<key>@<host>/<project>).
 * 비워 두면 자동 전송·«지금 보내기» 가 숨는다. 이 값은 공개돼도 되는 값이다(보내기만 가능).
 * Sentry 프로젝트 설정에서 «Prevent Storing of IP Addresses» 를 켠다.
 */
export const SENTRY_DSN = "";

export interface CrashReport {
  name: string;
  text: string;
}
export interface EnvInfo {
  app: string;
  version: string;
  os: string;
  arch: string;
  reportsDir: string;
}
export interface ReportFrame {
  ts: number;
  dir: string;
  bytes: number[];
  note?: string;
  peer?: string;
}

export const reportApi = {
  pending: () => invoke<CrashReport[]>("report_pending").catch(() => [] as CrashReport[]),
  dismiss: (name: string) => invoke<void>("report_dismiss", { name }).catch(() => {}),
  env: () => invoke<EnvInfo>("report_env").catch(() => null),
};

// ---- 최근 오류(이번 실행 동안)
export interface NotedError {
  ts: number;
  source: string;
  message: string;
  count: number;
}
const MAX_ERRORS = 50;
const errors: NotedError[] = [];

/** 화면에 보인 오류·잡히지 않은 예외를 기록한다. 같은 오류가 이어지면 횟수만 늘린다 */
export function noteError(message: string, source = "ui") {
  const m = message.trim();
  if (!m) return;
  const last = errors[errors.length - 1];
  if (last && last.message === m && last.source === source) {
    last.count++;
    last.ts = Date.now();
    return;
  }
  errors.push({ ts: Date.now(), source, message: m.slice(0, 4000), count: 1 });
  if (errors.length > MAX_ERRORS) errors.shift();
}
export const recentErrors = () => errors.slice();

// ---- 자동 전송(Sentry envelope 형식, 라이브러리 없이 fetch 로)
export const autoSendAvailable = () => !!SENTRY_DSN;

/** 설정의 «오류 자동 전송» — React 밖(전역 예외 처리)에서도 읽는다 */
export function autoReportMode(): "ask" | "on" | "off" {
  try {
    const v = (JSON.parse(localStorage.getItem("settings") ?? "{}") as { autoReport?: string }).autoReport;
    return v === "on" || v === "off" ? v : "ask";
  } catch {
    return "ask";
  }
}

let envCache: Promise<EnvInfo | null> | null = null;
const envOnce = () => (envCache ??= reportApi.env());

const hex32 = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

export interface AutoItem {
  /** exception · promise · render · crash · user */
  source: string;
  /** 한 줄 요약 — Sentry 에서 같은 오류를 묶는 기준 */
  title: string;
  /** 자세한 내용(스택·보고서) — 첨부 파일로 간다 */
  detail: string;
  level?: "error" | "fatal" | "info";
}

/** 보냈으면 true. 인터넷이 없거나 받는 곳이 없으면 false(호출한 쪽이 다음에 다시) */
export async function autoSend(item: AutoItem): Promise<boolean> {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(SENTRY_DSN.trim());
  if (!m) return false;
  const [, key, host, project] = m;
  const env = await envOnce();
  const app = env?.app ?? document.title;
  const id = hex32();
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: "other",
    level: item.level ?? "error",
    logger: item.source,
    release: `portdock-${app}@${env?.version ?? "?"}`,
    environment: import.meta.env.DEV ? "dev" : "production",
    // 사용자·PC 를 알아볼 정보는 보내지 않는다
    server_name: "-",
    tags: { app, source: item.source, os: env ? `${env.os}-${env.arch}` : "?", lang: navigator.language },
    contexts: { browser: { name: "WebView2", version: /Edg\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? "?" } },
    message: { formatted: item.title.slice(0, 500) },
  };
  const enc = new TextEncoder();
  const ev = enc.encode(JSON.stringify(event));
  const att = enc.encode(item.detail);
  const parts = [
    enc.encode(JSON.stringify({ event_id: id, sent_at: new Date().toISOString(), dsn: SENTRY_DSN }) + "\n"),
    enc.encode(JSON.stringify({ type: "event", length: ev.length }) + "\n"),
    ev,
    enc.encode("\n" + JSON.stringify({ type: "attachment", length: att.length, filename: "report.txt", content_type: "text/plain" }) + "\n"),
    att,
    enc.encode("\n"),
  ];
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    body.set(p, o);
    o += p.length;
  }
  try {
    const r = await fetch(`https://${host}/api/${project}/envelope/?sentry_key=${key}&sentry_version=7`, {
      method: "POST",
      // text/plain 이면 브라우저가 사전 확인(preflight) 없이 보낸다
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** 한 번 실행에서 자동으로 보내는 최대 수 — 같은 오류는 한 번만 */
const AUTO_MAX = 10;
const autoSent = new Set<string>();
function autoSendException(source: string, text: string) {
  if (!autoSendAvailable() || autoReportMode() !== "on") return;
  const title = text.split("\n")[0];
  if (autoSent.has(title) || autoSent.size >= AUTO_MAX) return;
  autoSent.add(title);
  void autoSend({ source, title, detail: text });
}

/** 지난번 비정상 종료 기록을 보낸다. 보낸 것은 지우고, 못 보낸 수를 돌려준다(다음에 다시) */
export async function autoSendCrashes(crashes: CrashReport[]) {
  let left = 0;
  for (const c of crashes) {
    const msg = /^message: (.*)$/m.exec(c.text)?.[1] ?? c.name;
    if (await autoSend({ source: "crash", title: `crash: ${msg}`, detail: c.text, level: "fatal" })) await reportApi.dismiss(c.name);
    else left++;
  }
  return left;
}

/** 화면이 깨졌을 때(Boundary) */
export function reportRenderCrash(text: string) {
  noteError(text, "render");
  autoSendException("render", text);
}

let installed = false;
/** main.tsx 에서 한 번 — 화면 코드의 잡히지 않은 예외도 모으고, 자동 전송을 켰으면 보낸다 */
export function installErrorCapture() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => {
    const err = e.error as unknown;
    const text = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : `${e.message} (${e.filename}:${e.lineno})`;
    noteError(text, "exception");
    autoSendException("exception", text);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown;
    const text = r instanceof Error ? `${r.message}\n${r.stack ?? ""}` : String(r);
    noteError(text, "promise");
    autoSendException("promise", text);
  });
}

// ---- 보고서 만들기
/** 보고서에 넣어도 되는 저장값 — 명령 목록·규칙·표 값처럼 프로토콜 내용이 담긴 것은 뺀다 */
const CONFIG_KEYS = ["settings", "cfg", "com", "net", "transport", "framing", "rxCheck", "faults", "format", "view", "trafficView", "terminatorText", "termText", "ids", "ranges"];

export function configSnapshot() {
  const out: Record<string, unknown> = {};
  for (const k of CONFIG_KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = JSON.parse(v);
    } catch {
      /* 읽을 수 없는 값은 건너뛴다 */
    }
  }
  return out;
}

const iso = (ts: number) => new Date(ts).toISOString();

export function frameLines(frames: ReportFrame[], n: number) {
  return frames.slice(-n).map((f) => {
    const who = f.peer ? ` ${f.peer}` : "";
    const body = f.dir === "ev" ? (f.note ?? "") : `${hex(f.bytes)}${f.note ? `  | ${f.note}` : ""}`;
    return `${iso(f.ts)} ${f.dir.toUpperCase()}${who} ${body}`;
  });
}

export interface ReportParts {
  app: string;
  env: EnvInfo | null;
  description: string;
  errors: NotedError[] | null;
  crashes: CrashReport[] | null;
  config: Record<string, unknown> | null;
  log: string[] | null;
}

export function buildReport(p: ReportParts) {
  const out: string[] = [];
  out.push(`# ${p.app} problem report`, "");
  out.push("## What happened", p.description.trim() || "(not described)", "");
  out.push("## Environment");
  out.push(`- app: ${p.env ? `${p.env.app} ${p.env.version}` : p.app}`);
  if (p.env) out.push(`- os: ${p.env.os} ${p.env.arch}`);
  out.push(`- webview: ${navigator.userAgent}`);
  out.push(`- screen: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`);
  out.push(`- language: ${navigator.language}`);
  out.push(`- time: ${new Date().toString()}`, "");
  if (p.errors) {
    out.push(`## Recent errors (${p.errors.length})`);
    if (p.errors.length === 0) out.push("(none)");
    for (const e of p.errors) out.push(`- ${iso(e.ts)} [${e.source}]${e.count > 1 ? ` ×${e.count}` : ""} ${e.message.replace(/\n/g, "\n    ")}`);
    out.push("");
  }
  if (p.crashes && p.crashes.length) {
    out.push(`## Crash reports (${p.crashes.length})`);
    for (const c of p.crashes) out.push(`### ${c.name}`, "```", c.text.trimEnd(), "```");
    out.push("");
  }
  if (p.config) out.push("## Settings", "```json", JSON.stringify(p.config, null, 2), "```", "");
  if (p.log) out.push(`## Last ${p.log.length} log lines`, "```", ...p.log, "```", "");
  return out.join("\n");
}

/** 주소창 길이 제한 때문에 자른다 — 전체는 «파일로 저장» 해서 붙인다 */
function cut(text: string, max: number, note: string) {
  return text.length <= max ? text : `${text.slice(0, max)}\n\n…(${note})`;
}

export function mailtoUrl(app: string, report: string) {
  const subject = encodeURIComponent(`[${app}] problem report`);
  const body = encodeURIComponent(cut(report, 1500, "truncated — the full report is attached as a file"));
  return `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export function issueUrl(app: string, title: string, report: string) {
  const t = encodeURIComponent(`[${app}] ${title.trim().split("\n")[0].slice(0, 80) || "problem report"}`);
  const body = encodeURIComponent(cut(report, 6000, "truncated — please attach the saved report file"));
  return `${ISSUES_URL}?title=${t}&body=${body}`;
}
