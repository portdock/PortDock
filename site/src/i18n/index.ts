// 추가 언어 사전 모음 — 언어마다 i18n/<언어>/index.ts 하나(공용 문구 ui·common, 쪽 글 pages, 계산 라이브러리 문구 lib).
// 일본어(ja)가 기준판: 다른 언어 사전은 `satisfies Dict` 로 ja 와 같은 모양이어야 한다(빠진 문구는 astro check 가 잡는다).
// 이 파일은 빌드(서버)에서만 읽는다 — 브라우저 스크립트에서 가져오지 말 것(모든 언어 문구가 JS 에 들어간다).
import ja from "./ja/index.ts";
import de from "./de/index.ts";
import es from "./es/index.ts";
import pt from "./pt/index.ts";
import pl from "./pl/index.ts";
import fr from "./fr/index.ts";
import vi from "./vi/index.ts";
import tr from "./tr/index.ts";
import it from "./it/index.ts";
import id from "./id/index.ts";
import ja2 from "./ja/batch2.ts";
import id2 from "./id/batch2.ts";
import fr2 from "./fr/batch2.ts";
import it2 from "./it/batch2.ts";
import de2 from "./de/batch2.ts";
import pl2 from "./pl/batch2.ts";
import es2 from "./es/batch2.ts";
import pt2 from "./pt/batch2.ts";
import tr2 from "./tr/batch2.ts";
import vi2 from "./vi/batch2.ts";
import ja3 from "./ja/batch3.ts";
import id3 from "./id/batch3.ts";
import fr3 from "./fr/batch3.ts";
import it3 from "./it/batch3.ts";
import vi3 from "./vi/batch3.ts";
import tr3 from "./tr/batch3.ts";
import es3 from "./es/batch3.ts";
import pt3 from "./pt/batch3.ts";
import de3 from "./de/batch3.ts";
import pl3 from "./pl/batch3.ts";
import ja4 from "./ja/batch4.ts";
import de4 from "./de/batch4.ts";
import pl4 from "./pl/batch4.ts";
import { registerCatalog, type Catalog } from "../lib/tr.ts";
import type { ExtraLang } from "./langs.ts";
import type { Page2Id, Page3Id, Page4Id } from "./scope.ts";

/** 1차 묶음 사전(모든 추가 언어) */
export type Dict = typeof ja;
/** 2차 묶음 사전(i18n/<언어>/batch2.ts) — 기준판 ja 의 모양 */
export type Batch2 = typeof ja2;
/** 2차 묶음은 쪽 단위로 일부만 있어도 된다 — scope.ts MORE[언어] 의 쪽은 다 있어야 한다(시험이 본다) */
export interface Batch2Part {
  webTools: Partial<Batch2["webTools"]>;
  lib: Partial<Batch2["lib"]>;
  pages: Partial<Batch2["pages"]>;
}
/** 3차 묶음 사전(i18n/<언어>/batch3.ts) — 기준판 ja 의 모양 */
export type Batch3 = typeof ja3;
/** 3차 묶음도 쪽 단위로 일부만 있어도 된다. hwPrivacy 는 하드웨어 테스트 쪽(마이크·키보드·웹캠·스피커·마우스·게임패드·모니터)이 함께 쓰는 개인정보 줄 */
export interface Batch3Part {
  webTools: Partial<Batch3["webTools"]>;
  lib: Partial<Batch3["lib"]>;
  pages: Partial<Batch3["pages"]>;
  hwPrivacy?: Batch3["hwPrivacy"];
}
/** 4차 묶음 사전(i18n/<언어>/batch4.ts) — 기준판 ja 의 모양 */
export type Batch4 = typeof ja4;
/** 4차 묶음도 쪽 단위로 일부만 있어도 된다 */
export interface Batch4Part {
  webTools: Partial<Batch4["webTools"]>;
  lib: Partial<Batch4["lib"]>;
  pages: Partial<Batch4["pages"]>;
}
export type LibSection = keyof Dict["lib"] | keyof Batch2["lib"] | keyof Batch3["lib"] | keyof Batch4["lib"];

export const DICTS: Record<ExtraLang, Dict> = { ja, de, es, pt, pl, fr, vi, tr, it, id };
/** 2차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS2: Partial<Record<ExtraLang, Batch2Part>> = { ja: ja2, id: id2, fr: fr2, it: it2, de: de2, pl: pl2, es: es2, pt: pt2, tr: tr2, vi: vi2 };
/** 3차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS3: Partial<Record<ExtraLang, Batch3Part>> = { ja: ja3, id: id3, fr: fr3, it: it3, vi: vi3, tr: tr3, es: es3, pt: pt3, de: de3, pl: pl3 };
/** 4차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS4: Partial<Record<ExtraLang, Batch4Part>> = { ja: ja4, de: de4, pl: pl4 };

/** 추가 언어 사전 */
export const dict = (lang: ExtraLang): Dict => DICTS[lang];

/** 2차 묶음 쪽 글 — 번역 범위(scope.ts MORE)에 있는 쪽만 그려지므로 없으면 빌드를 멈춘다 */
export function page2<K extends Page2Id>(lang: ExtraLang, id: K): Batch2["pages"][K] {
  const p = DICTS2[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 2차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch2["pages"][K];
}

/** 3차 묶음 쪽 글 — page2 와 같음 */
export function page3<K extends Page3Id>(lang: ExtraLang, id: K): Batch3["pages"][K] {
  const p = DICTS3[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 3차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch3["pages"][K];
}

/** 4차 묶음 쪽 글 — page2 와 같음 */
export function page4<K extends Page4Id>(lang: ExtraLang, id: K): Batch4["pages"][K] {
  const p = DICTS4[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 4차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch4["pages"][K];
}

/** 3차 묶음 하드웨어 테스트 쪽의 개인정보 줄(components/HwPrivacy.astro) */
export function hwPrivacy(lang: ExtraLang): Batch3["hwPrivacy"] {
  const p = DICTS3[lang]?.hwPrivacy;
  if (!p) throw new Error(`${lang}: 3차 묶음 hwPrivacy 없음`);
  return p;
}

const libOf = (lang: ExtraLang): Record<string, Catalog> => ({
  ...(DICTS4[lang]?.lib as Record<string, Catalog> | undefined),
  ...(DICTS3[lang]?.lib as Record<string, Catalog> | undefined),
  ...(DICTS2[lang]?.lib as Record<string, Catalog> | undefined),
  ...(DICTS[lang].lib as Record<string, Catalog>),
});

/** 계산 라이브러리 문구 표(고른 묶음만) — 쪽에 넣어 브라우저 스크립트가 쓴다 */
export const libCatalog = (lang: ExtraLang, sections: readonly LibSection[]): Catalog => {
  const all = libOf(lang);
  return Object.assign({}, ...sections.map((s) => all[s] ?? {}));
};

// 빌드 중 화면을 그릴 때(서버)도 라이브러리가 번역을 찾을 수 있게 모두 등록
for (const lang of Object.keys(DICTS) as ExtraLang[]) registerCatalog(lang, Object.assign({}, ...Object.values(libOf(lang))) as Catalog);
