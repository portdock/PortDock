// 사이트 언어 목록 — 한 곳에서만 정한다(astro.config.mjs·Base.astro·site-check 가 여기서 읽는다).
// ko·en 은 모든 쪽을 갖고(ko 는 루트 /, en 은 /en/), EXTRA_LANGS 는 scope.ts 의 쪽만 /<언어>/… 로 갖는다.
// 새 언어를 붙이는 법: site/I18N.md
// 이 파일은 node 시험(.ts 그대로 실행)에서도 읽으므로 타입 지우기로 돌아가는 문법만 쓴다(enum·namespace 금지).

export const CORE_LANGS = ["ko", "en"] as const;
/** 번역이 끝나 공개하는 추가 언어 — 순서가 언어 고르기 목록 순서 */
export const EXTRA_LANGS = ["ja"] as const;
export const LANGS = [...CORE_LANGS, ...EXTRA_LANGS] as const;

export type CoreLang = (typeof CORE_LANGS)[number];
export type ExtraLang = (typeof EXTRA_LANGS)[number];
export type SiteLang = CoreLang | ExtraLang;

export interface LangMeta {
  /** 언어 고르기에 보이는 이름(그 언어로) */
  name: string;
  /** <html lang>·hreflang 값 */
  hreflang: string;
  /** sitemap 의 xhtml:link hreflang */
  locale: string;
  /** og:locale */
  og: string;
}

export const LANG_META: Record<SiteLang, LangMeta> = {
  ko: { name: "한국어", hreflang: "ko", locale: "ko-KR", og: "ko_KR" },
  en: { name: "English", hreflang: "en", locale: "en-US", og: "en_US" },
  ja: { name: "日本語", hreflang: "ja", locale: "ja-JP", og: "ja_JP" },
};

export const isCore = (lang: string): lang is CoreLang => (CORE_LANGS as readonly string[]).includes(lang);
export const isExtra = (lang: string): lang is ExtraLang => (EXTRA_LANGS as readonly string[]).includes(lang);

/** 언어별 주소 — 한국어는 /, 그 밖은 /<언어>/ */
export const url = (lang: SiteLang, path = "") => {
  const p = path.replace(/^\/+/, "");
  return lang === "ko" ? `/${p}` : `/${lang}/${p}`;
};
