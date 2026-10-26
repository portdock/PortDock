// 새 버전 확인(0.3.0, 선택·기본 꺼짐)의 계산 — React·Tauri 없는 부분(시험: node --test shared/updateRule.test.ts)
// 켜면 하루 한 번 GitHub API 의 «최신 릴리스» 하나만 묻는다. 결과는 버전 글자와 릴리스 페이지 주소만 쓴다.

export const LATEST_API = "https://api.github.com/repos/portdock/PortDock/releases/latest";
/** 릴리스 페이지 주소는 이 앞부분이어야 연다(opener 권한과 같은 저장소) */
export const RELEASE_PREFIX = "https://github.com/portdock/PortDock/releases/";
export const DAY_MS = 24 * 60 * 60 * 1000;

/** «v0.3.1»·«0.3.1» → [0,3,1]. 숫자 세 덩이(뒤 «-beta» 등은 버림)가 아니면 null */
export function parseVersion(s: string): [number, number, number] | null {
  const m = /^v?(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:[-+][0-9A-Za-z.-]*)?$/.exec(s.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** a 가 b 보다 새로우면 1, 같으면 0, 낮으면 -1. 읽을 수 없으면 0(알리지 않음) */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

/** GitHub «releases/latest» 응답 → { version, url }. 초안·미리보기·모양이 다르면 null */
export function parseLatest(body: unknown): { version: string; url: string } | null {
  if (!body || typeof body !== "object") return null;
  const r = body as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown };
  if (r.draft === true || r.prerelease === true || typeof r.tag_name !== "string") return null;
  const v = parseVersion(r.tag_name);
  if (!v) return null;
  const url = typeof r.html_url === "string" && r.html_url.startsWith(RELEASE_PREFIX) ? r.html_url : `${RELEASE_PREFIX}latest`;
  return { version: v.join("."), url };
}

/** 지난번 확인 시각(ms, 없으면 0)부터 하루가 지났는지. 시계가 거꾸로 갔어도(미래 시각) 다시 묻는다 */
export function checkDue(last: number, now: number): boolean {
  return !Number.isFinite(last) || last <= 0 || now - last >= DAY_MS || last > now + DAY_MS;
}

/** 알릴지 — 새 버전이고, 사용자가 «이 버전은 그만» 으로 닫은 버전이 아니면 */
export function shouldNotify(current: string, latest: string | null, dismissed: string | null): boolean {
  return !!latest && compareVersions(latest, current) > 0 && latest !== dismissed;
}
