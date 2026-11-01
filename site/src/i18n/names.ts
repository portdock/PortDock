// 사이트 안 쪽 이름(가이드·웹 도구) — 링크 글에 쓴다. 빌드(서버)에서만 읽는다(가이드 목록이 크다 — 브라우저 스크립트에서 가져오지 말 것).
// 추가 언어: 번역된 웹 도구는 그 언어 이름, 번역이 없는 쪽(가이드 전부·범위 밖 웹 도구)은 영어 이름 + «(英語)» 같은 그 언어 표시.
import { GUIDES } from "../data/guides";
import { WEB_TOOLS } from "../data/webTools";
import { isCore, type SiteLang } from "./langs";
import { isTranslated } from "./scope";
import { ui, webToolText } from "../lib/i18n";

/** «guides/<slug>/» 나 «tools/<…>/» 경로의 이름(없으면 경로 그대로) */
export function pageName(lang: SiteLang, path: string): string {
  if (path.startsWith("guides/")) {
    const g = GUIDES.find((x) => `guides/${x.slug}/` === path);
    if (!g) return path;
    return isCore(lang) ? g.title[lang] : g.title.en + ui(lang).inEnglish;
  }
  const w = WEB_TOOLS.find((x) => x.path === path);
  if (!w) return path;
  if (isCore(lang)) return w.name[lang];
  return isTranslated(lang, path) ? webToolText(w, lang).name : w.name.en + ui(lang).inEnglish;
}
