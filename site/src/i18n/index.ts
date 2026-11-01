// 추가 언어 사전 모음 — 언어마다 i18n/<언어>/index.ts 하나(공용 문구 ui·common, 쪽 글 pages, 계산 라이브러리 문구 lib).
// 일본어(ja)가 기준판: 다른 언어 사전은 `satisfies Dict` 로 ja 와 같은 모양이어야 한다(빠진 문구는 astro check 가 잡는다).
// 이 파일은 빌드(서버)에서만 읽는다 — 브라우저 스크립트에서 가져오지 말 것(모든 언어 문구가 JS 에 들어간다).
import ja from "./ja/index.ts";
import pl from "./pl/index.ts";
import { registerCatalog, type Catalog } from "../lib/tr.ts";
import type { ExtraLang } from "./langs.ts";

export type Dict = typeof ja;
export type LibSection = keyof Dict["lib"];

export const DICTS: Record<ExtraLang, Dict> = { ja, pl };

/** 추가 언어 사전 */
export const dict = (lang: ExtraLang): Dict => DICTS[lang];

/** 계산 라이브러리 문구 표(고른 묶음만) — 쪽에 넣어 브라우저 스크립트가 쓴다 */
export const libCatalog = (lang: ExtraLang, sections: readonly LibSection[]): Catalog =>
  Object.assign({}, ...sections.map((s) => DICTS[lang].lib[s] as Catalog));

// 빌드 중 화면을 그릴 때(서버)도 라이브러리가 번역을 찾을 수 있게 모두 등록
for (const [lang, d] of Object.entries(DICTS)) registerCatalog(lang, Object.assign({}, ...Object.values(d.lib)) as Catalog);
