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

/**
 * 문장 조각 사이에 쪽 이름 링크 글을 끼운다: [a, b, c] + [p1, p2] → [a, pageName(p1), b, pageName(p2), c].
 * 추가 언어 사전은 링크 글을 갖지 않고 앞뒤 조각만 둔다 — 링크 글의 «(英語)» 표시는 번역 여부(scope.ts)로 정해진다.
 */
export function weave(lang: SiteLang, parts: readonly string[], paths: readonly string[]): string[] {
  if (parts.length !== paths.length + 1) throw new Error(`weave: 조각 ${parts.length}개, 링크 ${paths.length}개`);
  return parts.flatMap((s, i) => (i < paths.length ? [s, pageName(lang, paths[i])] : [s]));
}
