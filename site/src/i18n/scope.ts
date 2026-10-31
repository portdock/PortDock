// 추가 언어(ja 등)로 번역하는 쪽 — 모든 추가 언어가 같은 목록을 갖는다. 목록은 여기 한 곳에서만 정한다.
// 이 목록에 있는 쪽만 /<언어>/… 주소가 생기고, hreflang·sitemap·언어 고르기에 그 언어가 나온다.
// 목록에 없는 쪽으로 가는 링크는 추가 언어 쪽에서 영어판(/en/…)으로 간다(link()).
// 쪽을 더하면: 여기 한 줄 + 모든 추가 언어의 i18n/<언어>/pages 에 그 쪽 글 + pages/[lang]/[...path].astro 의 VIEWS 한 줄.
import { CORE_LANGS, EXTRA_LANGS, LANGS, url, type SiteLang } from "./langs.ts";

/** 언어를 뺀 경로 → 쪽 이름(i18n/<언어>/pages/<쪽 이름>.ts) */
export const SCOPE = {
  "": "home",
  "tools/": "tools",
  "download/": "download",
  "safety/": "safety",
  "privacy/": "privacy",
  "tools/4-20ma/": "analog",
  "tools/modbus/": "modbus",
  "tools/modbus-decoder/": "modbusDecoder",
  "tools/modbus-float/": "modbusFloat",
  "tools/mc-decoder/": "mcDecoder",
  "tools/rs485/": "rs485",
  "tools/serial-timing/": "serialTiming",
  "tools/checksum/": "checksum",
  "tools/subnet/": "subnet",
  "tools/pinouts/": "pinouts",
} as const;

export type ScopePath = keyof typeof SCOPE;
export type PageId = (typeof SCOPE)[ScopePath];
export const SCOPE_PATHS = Object.keys(SCOPE) as ScopePath[];
/** 번역 범위의 웹 도구(tools/ 아래 쪽) */
export const SCOPE_TOOLS = SCOPE_PATHS.filter((p) => p.startsWith("tools/") && p !== "tools/");

const bare = (path: string) => path.replace(/^\/+/, "").replace(/[#?].*$/, "");

/** 이 쪽이 이 언어로 있나 */
export const isTranslated = (lang: SiteLang, path: string) =>
  (CORE_LANGS as readonly string[]).includes(lang) || bare(path) in SCOPE;

/** 이 쪽이 있는 언어들(hreflang·언어 고르기 순서) */
export const langsOf = (path: string): SiteLang[] => LANGS.filter((l) => isTranslated(l, path));

/** 이 언어 쪽에서 path 로 가는 링크 — 번역이 없는 쪽이면 영어판으로 */
export const link = (lang: SiteLang, path = "") => url(isTranslated(lang, path) ? lang : "en", path);

/** sitemap·site-check 가 대조할 추가 언어 주소 전부 */
export const extraPages = () => EXTRA_LANGS.flatMap((l) => SCOPE_PATHS.map((p) => url(l, p)));

/** pages/<언어>/[...path].astro 의 getStaticPaths — 번역 범위의 쪽마다 하나 */
export const staticPaths = () => SCOPE_PATHS.map((p) => ({ params: { path: p.replace(/\/$/, "") || undefined }, props: { path: p } }));
