// 앱 화면 언어 — 목록은 여기 한 곳(사이트 site/src/i18n/langs.ts 와 같은 12개, 0.11.0).
// 한국어·영어는 모든 문구가 있다(원천). 다른 언어는 사전(…/ja.ts 등)에 있는 문구만 그 언어로, 없는 문구는 영어로 보인다.
// 그래서 언어를 하나씩·부분씩 붙일 수 있다.
// 새 언어(예: de) 붙이는 법 — 영어판을 원천으로:
//   1. 앱마다 apps/<앱>/src/i18n.de.ts(i18n.ja.ts 와 같은 모양)를 만들고 i18n.ts 의 dicts(ko, en, { ja, de }) 에 더한다
//   2. 공용 글은 shared/de/ 에 shared/ja/ 와 같은 파일(ui·io·autoReply·alarm·aiCopy·parts·tips)을 두고, 각 모듈의 dicts(…, { ja, de })·tips.ts 의 MORE 에 더한다
//   3. 아래 UI_LANGS 에 넣으면 언어 고르기에 나온다(detectLang 도 그 언어를 인식). 시험: node --test shared/lang.test.ts 에 de 를 더한다
//   도움말(help.ts)·백엔드 문구(tr!)·점검 결과 글은 한국어·영어 두 판이라 영어로 보인다(baseLang).
// 시험: node --test shared/lang.test.ts

/** 화면 언어 코드 — 사이트와 같은 순서 */
export const LANGS = ["ko", "en", "ja", "de", "es", "pt", "pl", "fr", "vi", "tr", "it", "id"] as const;
export type Lang = (typeof LANGS)[number];

/** 설정·머리줄 언어 고르기에 나오는 언어 — 앱 화면 사전이 있는 것만(나머지는 구조만 있음) */
export const UI_LANGS: readonly Lang[] = ["ko", "en", "ja", "de", "pl"];

/** 언어 고르기에 보이는 이름(그 언어로) */
export const LANG_NAMES: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  pl: "Polski",
  fr: "Français",
  vi: "Tiếng Việt",
  tr: "Türkçe",
  it: "Italiano",
  id: "Bahasa Indonesia",
};

/** 한국어·영어 두 판만 있는 글(도움말·백엔드 문구·장비 목록 등)에 넘길 언어 — 한국어가 아니면 영어 */
export type BaseLang = "ko" | "en";
export const baseLang = (l: Lang | string): BaseLang => (l === "ko" ? "ko" : "en");

/** 고를 수 있는 화면 언어인가 */
export const isUiLang = (v: unknown): v is Lang => typeof v === "string" && (UI_LANGS as readonly string[]).includes(v);

/** Windows 표시 언어(navigator.language: «ko-KR»·«ja-JP»·«en-US» …) → 처음 화면 언어. 고를 수 없는 언어면 영어 */
export function detectLang(tag: string | undefined | null): Lang {
  const l = (tag ?? "").toLowerCase().split(/[-_]/)[0];
  return isUiLang(l) ? l : "en";
}

/** 추가 언어 사전 — 언어별로 원천(영어) 열쇠의 일부만 있어도 된다 */
export type More<T> = { [L in Lang]?: Partial<T> };

/**
 * 원천 사전 둘(한국어·영어)과 추가 언어 사전으로 모든 언어의 사전을 만든다.
 * 추가 언어는 영어 위에 덮는다 — 빠진 열쇠(또는 빈 값)는 영어로 떨어진다.
 */
export function dicts<T extends object>(ko: T, en: T, more: More<T> = {}): Record<Lang, T> {
  const out = {} as Record<Lang, T>;
  for (const l of LANGS) {
    if (l === "ko") out[l] = ko;
    else if (l === "en") out[l] = en;
    else {
      const m = more[l];
      if (!m) out[l] = en;
      else {
        const filled = { ...en } as Record<string, unknown>;
        for (const [k, v] of Object.entries(m)) if (v !== undefined && v !== "" && k in en) filled[k] = v;
        out[l] = filled as T;
      }
    }
  }
  return out;
}
