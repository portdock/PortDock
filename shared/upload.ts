// 오류 보고 올리기의 판정 — React·Tauri 없는 부분(시험: node --test shared/upload.test.ts)
import { load, store } from "./framing.ts";

/**
 * 폼을 올리고 응답 코드를 읽어 성공(2xx)만 true. 응답을 읽지 못하면(네트워크 실패·CORS 머리 없음) false.
 * 예전에는 그때 no-cors 로 한 번 더 보내고 «닿았으면 보냄» 으로 봤는데, no-cors 는 응답이 가려져
 * 서버가 거부(4xx·5xx)해도 성공으로 보여 덤프를 지웠고, 첫 요청이 이미 닿았으면 같은 덤프가 두 번 올라갔다
 */
export async function postForm(url: string, body: FormData, f: typeof fetch = fetch, timeoutMs = 30_000): Promise<boolean> {
  try {
    const r = await f(url, { method: "POST", body, signal: AbortSignal.timeout(timeoutMs) });
    return r.ok;
  } catch {
    return false;
  }
}

/** 자동 전송에서 같은 비정상 종료 기록을 몇 번까지 다시 보낼지 — 응답을 못 읽는 환경에서 끝없이(중복으로) 올리지 않게 */
export const MAX_AUTO_TRIES = 3;
const KEY = "crashTries";

/** 자동 전송을 한 번 더 해도 되면 횟수를 세고 true. 다 썼으면 false(기록은 남아 «문제 보고» 로 직접 보낼 수 있다) */
export function takeAutoTry(name: string): boolean {
  const m = load<Record<string, number>>(KEY, {});
  const n = Number.isInteger(m[name]) ? m[name] : 0;
  if (n >= MAX_AUTO_TRIES) return false;
  store(KEY, { ...m, [name]: n + 1 });
  return true;
}

/** 보냈거나 지운 기록의 횟수는 잊는다 */
export function forgetTries(name: string) {
  const m = load<Record<string, number>>(KEY, {});
  if (!(name in m)) return;
  delete m[name];
  store(KEY, m);
}
