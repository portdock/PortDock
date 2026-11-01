// 계산 라이브러리(lib/*.ts)의 문구 — 한국어·영어는 코드 안에 두 갈래(msg(lang, ko, en))로 두고,
// 그 밖의 언어(ja 등)는 «영어 문장 → 번역» 표(i18n/<언어>/lib.ts)에서 찾는다. 계산 코드는 언어가 늘어도 고치지 않는다.
// 표의 열쇠에 {} 를 두면 그 자리에 무엇이 와도 맞고(숫자·주소 등), 번역에서 {0} {1} … {10} … 로 그 값을 순서와 상관없이 쓴다.
// 끼워 넣은 값이 표에 그대로 있는 영어 문구(함수 이름 등)면 그 값도 번역한다.
//   예: "Byte count {} does not match quantity {} (should be {})" → "バイト数 {0} が個数 {1} と合いません({2} のはず)"
// 서버(빌드)에서는 i18n/index.ts 가 표를 모두 등록하고, 브라우저에서는 Base.astro 가 쪽에 넣은
// <script type="application/json" id="pd-lib-i18n"> 를 처음 찾을 때 읽는다(ko·en 쪽에는 넣지 않는다 — 내려받는 JS 가 늘지 않게).
import type { SiteLang } from "../i18n/langs.ts";

export type Lang = SiteLang;
export type Catalog = Record<string, string>;

interface Compiled {
  exact: Map<string, string>;
  patterns: { re: RegExp; to: string; weight: number }[];
}
const CATALOGS = new Map<string, Compiled>();
/** 번역을 못 찾은 영어 문장(시험이 비어 있는지 본다) */
export const misses = new Set<string>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function registerCatalog(lang: string, cat: Catalog) {
  const c: Compiled = CATALOGS.get(lang) ?? { exact: new Map(), patterns: [] };
  for (const [k, v] of Object.entries(cat)) {
    if (k.includes("{}")) {
      const re = new RegExp("^" + k.split("{}").map(escapeRe).join("([\\s\\S]*?)") + "$");
      c.patterns.push({ re, to: v, weight: k.replace(/\{\}/g, "").length });
    } else c.exact.set(k, v);
  }
  // 글자가 많이 고정된 틀부터(«{} bytes» 가 더 긴 틀을 먼저 가로채지 않게)
  c.patterns.sort((a, b) => b.weight - a.weight);
  CATALOGS.set(lang, c);
}

function load(lang: string): Compiled | undefined {
  if (!CATALOGS.has(lang) && typeof document !== "undefined") {
    const el = document.getElementById("pd-lib-i18n");
    if (el && el.dataset.lang === lang) registerCatalog(lang, JSON.parse(el.textContent || "{}") as Catalog);
  }
  return CATALOGS.get(lang);
}

/** 영어 문장을 lang 으로 — 표에 없으면 영어 그대로(그리고 misses 에 남김) */
export function fromEn(en: string, lang: Lang): string {
  if (lang === "en" || lang === "ko" || !en) return en;
  const c = load(lang);
  const hit = c?.exact.get(en);
  if (hit !== undefined) return hit;
  // 신호 이름·숫자·기호(TXD, BI_DA+, 0x0A, —)처럼 낱말이 없는 글은 어느 언어로도 그대로
  if (!/[a-z]{3}/.test(en)) return en;
  for (const p of c?.patterns ?? []) {
    const m = p.re.exec(en);
    // 끼워 넣은 값이 그 자체로 표에 있는 영어 문구면(함수 이름 등) 그것도 바꾼다
    if (m)
      return p.to.replace(/\{(\d+)\}/g, (_, i: string) => {
        const v = m[Number(i) + 1] ?? "";
        return c?.exact.get(v) ?? v;
      });
  }
  misses.add(en);
  return en;
}

/** 두 갈래 문구 — 추가 언어는 영어 문장으로 표를 찾는다 */
export const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : lang === "en" ? en : fromEn(en, lang));

/** { ko, en } 묶음에서 lang 문구 */
export const tx = (o: { ko: string; en: string }, lang: Lang) => msg(lang, o.ko, o.en);
