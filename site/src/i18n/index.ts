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
import id4 from "./id/batch4.ts";
import fr4 from "./fr/batch4.ts";
import it4 from "./it/batch4.ts";
import es4 from "./es/batch4.ts";
import pt4 from "./pt/batch4.ts";
import vi4 from "./vi/batch4.ts";
import tr4 from "./tr/batch4.ts";
import de4 from "./de/batch4.ts";
import pl4 from "./pl/batch4.ts";
import ja5 from "./ja/batch5.ts";
import id5 from "./id/batch5.ts";
import es5 from "./es/batch5.ts";
import pt5 from "./pt/batch5.ts";
import fr5 from "./fr/batch5.ts";
import it5 from "./it/batch5.ts";
import vi5 from "./vi/batch5.ts";
import tr5 from "./tr/batch5.ts";
import de5 from "./de/batch5.ts";
import pl5 from "./pl/batch5.ts";
import ja6 from "./ja/batch6.ts";
import tr6 from "./tr/batch6.ts";
import id6 from "./id/batch6.ts";
import vi6 from "./vi/batch6.ts";
import de6 from "./de/batch6.ts";
import pl6 from "./pl/batch6.ts";
import fr6 from "./fr/batch6.ts";
import es6 from "./es/batch6.ts";
import pt6 from "./pt/batch6.ts";
import it6 from "./it/batch6.ts";
import ja7 from "./ja/batch7.ts";
import id7 from "./id/batch7.ts";
import tr7 from "./tr/batch7.ts";
import vi7 from "./vi/batch7.ts";
import de7 from "./de/batch7.ts";
import pl7 from "./pl/batch7.ts";
import fr7 from "./fr/batch7.ts";
import it7 from "./it/batch7.ts";
import pt7 from "./pt/batch7.ts";
import es7 from "./es/batch7.ts";
import ja8 from "./ja/batch8.ts";
import it8 from "./it/batch8.ts";
import pt8 from "./pt/batch8.ts";
import es8 from "./es/batch8.ts";
import { registerCatalog, type Catalog } from "../lib/tr.ts";
import type { ExtraLang } from "./langs.ts";
import type { Page2Id, Page3Id, Page4Id, Page5Id, Page6Id, Page7Id, Page8Id } from "./scope.ts";

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
/** 5차 묶음 사전(i18n/<언어>/batch5.ts) — 기준판 ja 의 모양 */
export type Batch5 = typeof ja5;
/** 5차 묶음도 쪽 단위로 일부만 있어도 된다 */
export interface Batch5Part {
  webTools: Partial<Batch5["webTools"]>;
  lib: Partial<Batch5["lib"]>;
  pages: Partial<Batch5["pages"]>;
}
/** 6차 묶음 사전(i18n/<언어>/batch6.ts) — 기준판 ja 의 모양 */
export type Batch6 = typeof ja6;
/** 6차 묶음도 쪽 단위로 일부만 있어도 된다 */
export interface Batch6Part {
  webTools: Partial<Batch6["webTools"]>;
  lib: Partial<Batch6["lib"]>;
  pages: Partial<Batch6["pages"]>;
}
/** 7차 묶음 사전(i18n/<언어>/batch7.ts) — 기준판 ja 의 모양 */
export type Batch7 = typeof ja7;
/** 7차 묶음도 쪽 단위로 일부만 있어도 된다 */
export interface Batch7Part {
  webTools: Partial<Batch7["webTools"]>;
  lib: Partial<Batch7["lib"]>;
  pages: Partial<Batch7["pages"]>;
}
/** 8차 묶음 쪽 글 하나(앱 하나의 소개) — data/tools.ts 의 {ko,en} 글과 같은 모양(tagline·이름은 빼고). 내장 장비 수가 들어가는 글은 함수 */
export interface AppPage {
  seo: { title: string; desc: string };
  summary: string;
  who: readonly string[];
  features: readonly { title: string; body: string | ((c: { nDevices: number }) => string) }[];
  steps: readonly string[];
  uses?: readonly { title: string; body: string }[];
  faq?: readonly { q: string; a: string }[];
  similar?: string;
}
/** 8차 묶음 사전(i18n/<언어>/batch8.ts) — 기준판 ja 의 모양. 쪽 글 pages 는 앱 id 마다(data/tools.ts 의 {ko,en} 글과 같은 모양), toolPage 는 소개 화면(views/ToolPage.astro) 공통 글 */
export type Batch8 = typeof ja8;
/** 8차 묶음도 쪽(앱) 단위로 일부만 있어도 된다 — toolPage 는 쪽이 하나라도 있으면 있어야 한다(시험이 본다) */
export interface Batch8Part {
  toolPage?: Batch8["toolPage"];
  pages: Partial<Batch8["pages"]>;
}
export type LibSection = keyof Dict["lib"] | keyof Batch2["lib"] | keyof Batch3["lib"] | keyof Batch4["lib"] | keyof Batch5["lib"] | keyof Batch6["lib"] | keyof Batch7["lib"];

export const DICTS: Record<ExtraLang, Dict> = { ja, de, es, pt, pl, fr, vi, tr, it, id };
/** 2차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS2: Partial<Record<ExtraLang, Batch2Part>> = { ja: ja2, id: id2, fr: fr2, it: it2, de: de2, pl: pl2, es: es2, pt: pt2, tr: tr2, vi: vi2 };
/** 3차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS3: Partial<Record<ExtraLang, Batch3Part>> = { ja: ja3, id: id3, fr: fr3, it: it3, vi: vi3, tr: tr3, es: es3, pt: pt3, de: de3, pl: pl3 };
/** 4차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS4: Partial<Record<ExtraLang, Batch4Part>> = { ja: ja4, id: id4, fr: fr4, it: it4, es: es4, pt: pt4, vi: vi4, tr: tr4, de: de4, pl: pl4 };
/** 5차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS5: Partial<Record<ExtraLang, Batch5Part>> = { ja: ja5, id: id5, es: es5, pt: pt5, fr: fr5, it: it5, vi: vi5, tr: tr5, de: de5, pl: pl5 };
/** 6차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS6: Partial<Record<ExtraLang, Batch6Part>> = { ja: ja6, es: es6, pt: pt6, it: it6, vi: vi6, tr: tr6, id: id6, de: de6, pl: pl6, fr: fr6 };
/** 7차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS7: Partial<Record<ExtraLang, Batch7Part>> = { ja: ja7, id: id7, tr: tr7, vi: vi7, de: de7, pl: pl7, fr: fr7, it: it7, pt: pt7, es: es7 };
/** 8차 묶음을 (일부라도) 옮긴 언어 */
export const DICTS8: Partial<Record<ExtraLang, Batch8Part>> = { ja: ja8, es: es8, pt: pt8, it: it8 };

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

/** 5차 묶음 쪽 글 — page2 와 같음 */
export function page5<K extends Page5Id>(lang: ExtraLang, id: K): Batch5["pages"][K] {
  const p = DICTS5[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 5차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch5["pages"][K];
}

/** 6차 묶음 쪽 글 — page2 와 같음 */
export function page6<K extends Page6Id>(lang: ExtraLang, id: K): Batch6["pages"][K] {
  const p = DICTS6[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 6차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch6["pages"][K];
}

/** 7차 묶음 쪽 글 — page2 와 같음 */
export function page7<K extends Page7Id>(lang: ExtraLang, id: K): Batch7["pages"][K] {
  const p = DICTS7[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 7차 묶음 쪽 글 없음 — ${id}`);
  return p as Batch7["pages"][K];
}

/** 8차 묶음 쪽 글(앱 하나의 소개 글) — page2 와 같음 */
export function page8(lang: ExtraLang, id: Page8Id): AppPage {
  const p: AppPage | undefined = DICTS8[lang]?.pages[id];
  if (!p) throw new Error(`${lang}: 8차 묶음 쪽 글 없음 — ${id}`);
  return p;
}

/** 8차 묶음 소개 화면 공통 글(views/ToolPage.astro·components/DownloadBox.astro·AppShot.astro) */
export function toolPage8(lang: ExtraLang): Batch8["toolPage"] {
  const p = DICTS8[lang]?.toolPage;
  if (!p) throw new Error(`${lang}: 8차 묶음 toolPage 없음`);
  return p;
}

/** 3차 묶음 하드웨어 테스트 쪽의 개인정보 줄(components/HwPrivacy.astro) */
export function hwPrivacy(lang: ExtraLang): Batch3["hwPrivacy"] {
  const p = DICTS3[lang]?.hwPrivacy;
  if (!p) throw new Error(`${lang}: 3차 묶음 hwPrivacy 없음`);
  return p;
}

const libOf = (lang: ExtraLang): Record<string, Catalog> => ({
  ...(DICTS7[lang]?.lib as Record<string, Catalog> | undefined),
  ...(DICTS6[lang]?.lib as Record<string, Catalog> | undefined),
  ...(DICTS5[lang]?.lib as Record<string, Catalog> | undefined),
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
