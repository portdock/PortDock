// 최근 연결 기록(0.3.0) — 모드마다 연결에 성공한 주소(«host:port» 등)를 최근 것부터 8개까지.
// 저장은 localStorage «recent:<모드>»(앱마다 저장소가 따로라 앱 이름은 붙이지 않는다). React·Tauri 없는 부분(시험: node --test shared/recent.test.ts)
import { load, store } from "./framing.ts";

export const RECENT_MAX = 8;
/** 한 항목 최대 길이 — 이보다 긴 값은 버린다(손으로 고친 저장값·쓰레기) */
const MAX_LEN = 300;

const norm = (v: string) => v.trim().toLowerCase();

/** 저장값 고치기 — 글자 목록만, 앞뒤 공백 없이, 같은 것(대소문자 무시)은 앞의 것만, 최대 max 개 */
export function cleanRecent(v: unknown, max = RECENT_MAX): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t || t.length > MAX_LEN || out.some((o) => norm(o) === norm(t))) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** 맨 앞에 넣는다 — 이미 있으면(대소문자 무시) 앞으로 옮긴다. 빈 값은 그대로 */
export function pushRecent(list: readonly string[], value: string, max = RECENT_MAX): string[] {
  const t = value.trim();
  if (!t || t.length > MAX_LEN) return cleanRecent(list, max);
  return cleanRecent([t, ...list.filter((x) => norm(x) !== norm(t))], max);
}

/** 하나 지우기(대소문자 무시) */
export function removeRecent(list: readonly string[], value: string): string[] {
  return cleanRecent(list.filter((x) => norm(x) !== norm(value)));
}

const key = (mode: string) => `recent:${mode}`;

/** 그 모드의 최근 목록(최근 것부터) */
export const loadRecent = (mode: string): string[] => cleanRecent(load<unknown>(key(mode), []));

/** 연결에 성공했을 때 부른다. 바뀐 목록을 돌려준다 */
export function rememberRecent(mode: string, value: string): string[] {
  const next = pushRecent(loadRecent(mode), value);
  store(key(mode), next);
  return next;
}

/** 목록에서 하나 지운다. 바뀐 목록을 돌려준다 */
export function forgetRecent(mode: string, value: string): string[] {
  const next = removeRecent(loadRecent(mode), value);
  store(key(mode), next);
  return next;
}

/** 그 모드의 마지막 값(없으면 null) — 모드를 바꿀 때 주소 칸을 채운다 */
export const lastRecent = (mode: string): string | null => loadRecent(mode)[0] ?? null;

/**
 * «host:port» → { host, port }. 포트가 없으면 port 는 null. «[IPv6]:port» 도 받는다.
 * 주소 모양은 검사하지 않는다(그건 연결할 때 백엔드가 한다) — 기록을 칸 두 개에 나눠 넣는 데만 쓴다
 */
export function splitHostPort(s: string): { host: string; port: number | null } {
  const t = s.trim();
  const v6 = /^\[([^\]]+)\](?::(\d{1,5}))?$/.exec(t);
  if (v6) return { host: v6[1], port: v6[2] ? portOrNull(v6[2]) : null };
  const i = t.lastIndexOf(":");
  // 콜론이 둘 이상이면 괄호 없는 IPv6 — 포트 없음
  if (i < 0 || t.indexOf(":") !== i) return { host: t, port: null };
  const p = portOrNull(t.slice(i + 1));
  return p == null ? { host: t, port: null } : { host: t.slice(0, i), port: p };
}

const portOrNull = (s: string) => {
  if (!/^\d{1,5}$/.test(s)) return null;
  const n = Number(s);
  return n >= 0 && n <= 65535 ? n : null;
};

/** { host, port } → «host:port»(IPv6 는 괄호) */
export const joinHostPort = (host: string, port: number) => (host.includes(":") && !host.startsWith("[") ? `[${host}]:${port}` : `${host.trim()}:${port}`);
