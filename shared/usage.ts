// 사용 통계(선택, 기본 꺼짐) — 이번 실행 동안 기능 횟수를 메모리에 세고, 창을 닫을 때 한 번 보낸다.
// 켜는 것은 사용자만(첫 실행 카드·설정). 키가 없으면(APTABASE_KEY 비움) 아무것도 보내지 않는다.
// 묶기·허용 목록 검사는 usageData.ts(시험 있음). 파일에는 아무것도 남기지 않는다 — 못 보내면 버린다.
import { envOnce } from "./report";
import { APTABASE_KEY, buildBatch, ingestUrl, windowsMajor, type Feature } from "./usageData.ts";

export { APTABASE_KEY, FEATURES, type Feature } from "./usageData.ts";

const startedAt = Date.now();
const counts: Partial<Record<Feature, number>> = {};
let flushed = false;

/** 키가 들어간 빌드에서만 true — false 면 묻는 카드·설정 칸을 숨긴다 */
export const usageAvailable = () => ingestUrl() !== null;

/** 설정의 «사용 통계 보내기» — React 밖(창 닫기)에서도 읽는다 */
export function usageOn(): boolean {
  try {
    return (JSON.parse(localStorage.getItem("settings") ?? "{}") as { usageStats?: unknown }).usageStats === true;
  } catch {
    return false;
  }
}

function settingsLang(): string {
  try {
    const v = (JSON.parse(localStorage.getItem("settings") ?? "{}") as { lang?: unknown }).lang;
    return typeof v === "string" ? v : "en";
  } catch {
    return "en";
  }
}

/** 기능을 한 번 썼다 — 이름만 센다(값·주소·내용은 받지 않는다). 거짓 값이면 세지 않는다 */
export function count(f: Feature | null | false | undefined) {
  if (f) counts[f] = (counts[f] ?? 0) + 1;
}

/** `api.send(...)` 같은 호출을 그대로 돌려주며 센다 — `tally("send", invoke(...))` */
export function tally<T>(f: Feature | null | false | undefined, v: T): T {
  count(f);
  return v;
}

/** WebView2 가 알려 주는 윈도우 버전(메이저만) */
async function windows(): Promise<string> {
  const ua = (navigator as Navigator & { userAgentData?: { getHighEntropyValues(h: string[]): Promise<{ platformVersion?: string }> } }).userAgentData;
  if (!ua) return "?";
  try {
    return windowsMajor((await ua.getHighEntropyValues(["platformVersion"])).platformVersion);
  } catch {
    return "?";
  }
}

const later = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

/**
 * 창을 닫을 때 한 번 — 켜져 있고 키·인터넷이 있으면 이번 실행 통계를 보낸다.
 * 무엇이든 `limitMs` 안에 끝난다(닫기를 붙잡지 않는다). 실패하면 버린다(다시 보내지 않는다)
 */
export async function flushUsage(limitMs = 1500): Promise<void> {
  if (flushed) return;
  flushed = true;
  const url = ingestUrl();
  if (!url || !usageOn() || !navigator.onLine) return;
  const send = async () => {
    const [env, win] = await Promise.all([envOnce(), windows()]);
    if (!env) return;
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000;
    const batch = buildBatch({
      app: env.app,
      version: env.version,
      windows: win,
      lang: settingsLang(),
      portable: env.portable === true,
      startedAt,
      now: Date.now(),
      counts,
      random,
      debug: import.meta.env.DEV,
    });
    if (!batch.length) return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "App-Key": APTABASE_KEY.trim() },
      body: JSON.stringify(batch),
      credentials: "omit",
      signal: AbortSignal.timeout(limitMs),
    });
  };
  await Promise.race([send().catch(() => {}), later(limitMs, undefined)]);
}
