// «AI 에게 물어보기용 복사»(0.8.0) — 지금 화면의 상황을 AI 채팅에 붙여 넣기 좋은 마크다운으로 만든다.
// 화면·Tauri 의존 없는 순수 함수(시험: node --test shared/aiCopy.test.ts). 보내지 않는다 — 클립보드에 넣는 것은 AiCopyButton.
//
// 가리는 것(maskForAi):
// - 사용자 폴더(C:\Users\이름 → ~) — redact.ts 와 같은 규칙
// - PC 이름 — 윈도우 기본 이름(DESKTOP-…·LAPTOP-…·WIN-…)·UNC 경로(\\이름\)·따로 넘긴 이름
// - MAC 주소 — 앞 3바이트(제조사 번호, OUI)는 남기고 뒤 3바이트를 xx 로. 제조사는 원인 찾기에 쓸모 있고 기기 하나를 가리키지 않는다
// - IP 주소 — 공인 IP 는 늘 «[IP-1]» 처럼 번호로 바꾼다(같은 주소는 같은 번호라 관계는 남는다).
//   사설·루프백·링크 로컬·CGNAT·멀티캐스트·브로드캐스트(10/8·172.16/12·192.168/16·127/8·169.254/16·100.64/10·224/4·0.0.0.0·255.255.255.255)는
//   기본으로 남긴다: 회사 안 주소라 바깥에서 그 PC·회사를 찾을 수 없고, «PC 와 장비의 서브넷이 다름» 같은 흔한 원인을 보려면 숫자가 필요하다.
//   설정(hideIp: "all")이면 사설 IP 도 번호로 바꾼다. IPv6 는 루프백(::1)·링크 로컬(fe80::)만 남기고 번호로 바꾼다.
import { ascii, hex } from "./format.ts";
import { hideUserPaths } from "./redact.ts";

export type AiLang = "ko" | "en";
/** IP 가림 — public: 공인 IP 만(기본) · all: 사설 IP 까지 */
export type HideIp = "public" | "all";

/** 붙여 넣을 글의 기본 길이 상한(글자) — 대부분의 AI 채팅 입력칸에 들어가고 읽기에도 짧은 정도 */
export const AI_MAX_CHARS = 8000;
/** 통신 기록은 최근 몇 줄까지 보나(길이 상한이 먼저 걸리면 더 줄인다) */
export const AI_LOG_LINES = 200;

export interface AiFrame {
  ts: number;
  dir: string;
  bytes: number[];
  note?: string;
  peer?: string;
}

export interface AiCopyInput {
  lang: AiLang;
  /** 프로그램 이름(«PortDock Serial») */
  app: string;
  version?: string | null;
  /** «windows x86_64» */
  os?: string | null;
  /** 창 제목처럼 지금 상태 한 줄(«COM3 115200 8N1 · 연결됨») */
  state?: string | null;
  /** 연결 설정 요약 — «이름: 값» 줄 */
  settings?: string[];
  /** 이번 실행의 오류(최근 것이 뒤) */
  errors?: string[];
  /** 점검 결과 글(Port Inspector·Hardware Tester) */
  checks?: string | null;
  /** 통신 기록 줄(오래된 것이 앞) — aiFrameLines 로 만든 것 */
  log?: string[];
  /** 가림 */
  hideIp?: HideIp;
  /** 더 가릴 이름(PC 이름 등) */
  names?: string[];
  /** 길이 상한(글자) */
  max?: number;
}

export interface AiCopyResult {
  text: string;
  /** 줄인 통신 기록 줄 수(오래된 것부터) */
  cutLines: number;
  /** 점검 결과·오류 글을 뒤에서 잘랐나 */
  cutText: boolean;
}

const T = {
  ko: {
    ask: (app: string) => `다음은 ${app} 의 기록입니다. 문제 원인 후보와 확인 순서를 알려 주세요.`,
    ask2: "장비 설정·배선·PC 설정 가운데 무엇부터 볼지, 기록에서 근거가 되는 줄을 짚어 주세요. 확실하지 않으면 무엇을 더 확인하면 되는지 알려 주세요.",
    situation: "## 상황 (붙여 넣은 뒤 직접 적어 주세요)",
    situationLines: ["- 하려던 일:", "- 기대한 결과 / 실제 결과:", "- 장비(제조사·형명)·연결 방식:"],
    program: "## 프로그램",
    state: "지금 상태",
    settings: "## 연결 설정",
    errors: (n: number) => `## 이번 실행의 오류 (${n})`,
    checks: "## 점검 결과",
    log: (n: number) => `## 최근 통신 기록 (${n}줄)`,
    logFormat: "형식: 시각 방향 [상대] HEX | 글자 | 프로그램이 붙인 풀이",
    logEmpty: "(기록 없음)",
    cutLines: (n: number, max: number) => `(길이 ${max.toLocaleString("en-US")}자에 맞추려고 오래된 줄 ${n}개를 뺐습니다)`,
    cutText: "…(길어서 뒤를 잘랐습니다)",
    masked: (ip: HideIp) => `_PortDock 이 가린 것: 사용자 폴더·PC 이름(DESKTOP-… 등)·MAC 뒤 3바이트·${ip === "all" ? "모든 IP 주소" : "공인 IP 주소"}(«[IP-n]»)._`,
  },
  en: {
    ask: (app: string) => `Below is a log from ${app}. Please list likely causes of the problem and the order to check them.`,
    ask2: "Say whether to look at the device settings, the wiring or the PC first, and point to the log lines that support it. If unsure, tell me what else to check.",
    situation: "## Situation (fill in after pasting)",
    situationLines: ["- What I was trying to do:", "- Expected / actual result:", "- Device (maker, model) and connection:"],
    program: "## Program",
    state: "Current state",
    settings: "## Connection settings",
    errors: (n: number) => `## Errors in this session (${n})`,
    checks: "## Check results",
    log: (n: number) => `## Recent traffic (${n} lines)`,
    logFormat: "Format: time direction [peer] HEX | text | note added by the program",
    logEmpty: "(no traffic)",
    cutLines: (n: number, max: number) => `(${n} older lines removed to fit ${max.toLocaleString("en-US")} characters)`,
    cutText: "…(cut — too long)",
    masked: (ip: HideIp) => `_Hidden by PortDock: user folder, PC name (DESKTOP-… etc.), last 3 bytes of MAC addresses, ${ip === "all" ? "all IP addresses" : "public IP addresses"} («[IP-n]»)._`,
  },
};

// ---- 가림

const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`(?<![\\w.])${OCTET}(?:\\.${OCTET}){3}(?![\\w.]*\\w)`, "g");
const MAC = /(?<![\w:-])([0-9a-f]{2})([:-])([0-9a-f]{2})\2([0-9a-f]{2})\2[0-9a-f]{2}\2[0-9a-f]{2}\2[0-9a-f]{2}(?![\w:-])/gi;
// 콜론이 둘 이상인 16진 묶음 — «::» 가 있거나 묶음이 8개일 때만 IPv6 로 본다(시각 12:34:56 은 아님)
const IPV6 = /(?<![\w:.])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:])/gi;
const PC_DEFAULT = /\b(?:DESKTOP|LAPTOP|WIN)-[A-Z0-9]{4,15}\b/gi;
const UNC = /\\\\([^\\/\s"'`<>|]{1,63})\\/g;

/** 그 IPv4 가 사설·루프백 등 «바깥에서 찾을 수 없는» 주소인가 */
export function isPrivateIpv4(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224 ||
    ip === "0.0.0.0"
  );
}

function isIpv6(s: string) {
  // 16진 숫자가 넷 이상(«a::b» 같은 글은 주소로 보지 않는다)
  if ((s.match(/[0-9a-f]/gi) ?? []).length < 4) return false;
  const groups = s.split(":");
  if (s.includes("::")) return s.indexOf("::") === s.lastIndexOf("::") && groups.length <= 9;
  return groups.length === 8 && groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g));
}

/**
 * AI 에 붙여 넣기 전 가림 — 사용자 폴더·PC 이름·MAC·IP. 같은 IP 는 같은 번호가 되도록 `ipMap` 을 이어 쓴다
 */
export function maskForAi(text: string, opt: { hideIp?: HideIp; names?: string[]; ipMap?: Map<string, string> } = {}) {
  const hideIp = opt.hideIp ?? "public";
  const ipMap = opt.ipMap ?? new Map<string, string>();
  const ipToken = (ip: string) => {
    const k = ip.toLowerCase();
    let v = ipMap.get(k);
    if (!v) ipMap.set(k, (v = `[IP-${ipMap.size + 1}]`));
    return v;
  };
  let s = hideUserPaths(text);
  for (const n of opt.names ?? []) {
    const name = n.trim();
    if (name.length >= 2) s = s.split(name).join("[PC]");
  }
  s = s.replace(UNC, "\\\\[PC]\\").replace(PC_DEFAULT, "[PC]");
  s = s.replace(MAC, (_m, a: string, sep: string, b: string, c: string) => [a, b, c, "xx", "xx", "xx"].join(sep));
  s = s.replace(IPV6, (m) => {
    if (!isIpv6(m)) return m;
    const low = m.toLowerCase();
    if (low === "::1" || low === "::" || /^fe[89ab][0-9a-f]:/.test(low)) return m;
    return ipToken(m);
  });
  s = s.replace(IPV4, (m) => (hideIp === "public" && isPrivateIpv4(m) ? m : ipToken(m)));
  return s;
}

// ---- 기록 줄

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
/** 시각 «12:34:56.789»(이 PC 시각) */
export function clockMs(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** 통신 기록 한 줄 — «시각 방향 [상대] HEX | 글자 | 풀이». 사건 줄(ev)은 풀이만 */
export function aiFrameLine(f: AiFrame) {
  const who = f.peer ? ` ${f.peer}` : "";
  const head = `${clockMs(f.ts)} ${f.dir.toUpperCase()}${who}`;
  if (f.dir === "ev" || !f.bytes.length) return `${head} ${f.note ?? ""}`.trimEnd();
  // 아주 긴 프레임은 앞 64바이트만(한 줄이 기록 전체를 밀어내지 않게)
  const LIMIT = 64;
  const b = f.bytes.length > LIMIT ? f.bytes.slice(0, LIMIT) : f.bytes;
  const more = f.bytes.length > LIMIT ? ` …(+${f.bytes.length - LIMIT} B)` : "";
  return `${head} ${hex(b)}${more} | ${ascii(b)}${f.note ? ` | ${f.note}` : ""}`;
}

export function aiFrameLines(frames: readonly AiFrame[], n = AI_LOG_LINES) {
  return frames.slice(-n).map(aiFrameLine);
}

/** localStorage 저장값(연결 설정) → «이름: 값» 줄. 값은 한 줄 JSON, 길면 자른다 */
export function settingsLines(cfg: Record<string, unknown>, maxEach = 300) {
  const out: string[] = [];
  for (const [k, v] of Object.entries(cfg)) {
    if (v == null || v === "") continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    out.push(`- ${k}: ${s.length > maxEach ? `${s.slice(0, maxEach)}…` : s}`);
  }
  return out;
}

// ---- 마크다운

/** 글 안의 ``` 와 겹치지 않는 울타리 */
function fence(body: string) {
  let f = "```";
  while (body.includes(f)) f += "`";
  return f;
}
const block = (body: string) => {
  const f = fence(body);
  return `${f}text\n${body}\n${f}`;
};

/** 서로게이트 쌍을 가르지 않게 n 글자 앞까지 */
function cutAt(text: string, n: number) {
  if (n <= 0) return "";
  if (text.length <= n) return text;
  const c = text.charCodeAt(n - 1);
  return text.slice(0, c >= 0xd800 && c <= 0xdbff ? n - 1 : n);
}

/**
 * 붙여 넣을 마크다운 — 질문 틀(앱 언어) → 상황 칸 → 프로그램 → 연결 설정 → 오류 → 점검 결과 → 통신 기록.
 * 모든 칸을 가린 뒤 길이를 잰다. 넘치면 통신 기록의 오래된 줄부터 빼고(뺀 수를 적는다), 그래도 넘치면 점검 결과·오류 글의 뒤를 자른다.
 */
export function buildAiCopy(i: AiCopyInput): AiCopyResult {
  const t = T[i.lang];
  const max = Math.max(1000, i.max ?? AI_MAX_CHARS);
  const hideIp = i.hideIp ?? "public";
  const ipMap = new Map<string, string>();
  const mask = (s: string) => maskForAi(s, { hideIp, names: i.names, ipMap });

  const head: string[] = [t.ask(i.app), t.ask2, "", t.situation, ...t.situationLines, "", t.program];
  head.push(`- ${mask([i.app, i.version].filter(Boolean).join(" "))}${i.os ? ` · ${mask(i.os)}` : ""}`);
  if (i.state?.trim()) head.push(`- ${t.state}: ${mask(i.state.trim())}`);
  head.push("");
  if (i.settings?.length) head.push(t.settings, ...i.settings.map(mask), "");
  const foot = ["", t.masked(hideIp)];

  let errors = i.errors?.length ? mask(i.errors.map((e) => `- ${e.replace(/\n/g, "\n  ")}`).join("\n")) : "";
  let checks = i.checks?.trim() ? mask(i.checks.trim()) : "";
  const log = (i.log ?? []).map(mask);
  const hasLog = i.log !== undefined;

  const assemble = (keep: number, cut: number) => {
    const out = [...head];
    if (errors) out.push(t.errors(i.errors!.length), errors, "");
    if (checks) out.push(t.checks, block(checks), "");
    if (hasLog) {
      const lines = log.slice(log.length - keep);
      out.push(t.log(lines.length), t.logFormat);
      if (cut) out.push(t.cutLines(cut, max));
      out.push(lines.length ? block(lines.join("\n")) : t.logEmpty);
    }
    out.push(...foot);
    return out.join("\n");
  };

  // 1) 기록 줄을 오래된 것부터 뺀다(이분 탐색 — 줄 수가 많아도 빠르게)
  let text = assemble(log.length, 0);
  let cutLines = 0;
  if (text.length > max && log.length) {
    let lo = 0;
    let hi = log.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (assemble(mid, log.length - mid).length <= max) lo = mid;
      else hi = mid - 1;
    }
    cutLines = log.length - lo;
    text = assemble(lo, cutLines);
  }
  // 2) 그래도 넘치면 점검 결과 → 오류 글의 뒤를 자른다
  let cutText = false;
  for (const which of ["checks", "errors"] as const) {
    if (text.length <= max) break;
    const cur = which === "checks" ? checks : errors;
    if (!cur) continue;
    const room = cur.length - (text.length - max) - t.cutText.length - 1;
    const next = room > 0 ? `${cutAt(cur, room)}\n${t.cutText}` : t.cutText;
    if (which === "checks") checks = next;
    else errors = next;
    cutText = true;
    text = assemble(log.length - cutLines, cutLines);
  }
  // 3) 마지막 안전장치 — 머리 칸만으로 넘치는 일은 거의 없지만 상한은 지킨다
  if (text.length > max) {
    text = `${cutAt(text, max - t.cutText.length - 1)}\n${t.cutText}`;
    cutText = true;
  }
  return { text, cutLines, cutText };
}
