// 검색 결과·목록에서 뺀 쪽 — 2026-11 정리(Search Console: Google 이 크롤링하고도 색인하지 않음, 노출 2~24·클릭 0).
// 쪽 자체는 남는다(주소로 들어오면 열림, 되돌리려면 여기서 지운다). noindex 메타 · sitemap · 목록 · llms.txt 에서만 빠진다.
export const HIDDEN_PATHS: ReadonlySet<string> = new Set([
  "tools/vacuum-pad/",
  "tools/cylinder-force/",
  "tools/op-amp-gain/",
  "tools/ball-screw/",
  "tools/air-consumption/",
  "tools/timing-belt/",
  "guides/ball-screw-torque-motor/",
  "guides/vacuum-pad-lifting-force/",
  "guides/pneumatic-air-consumption/",
  "guides/pneumatic-cylinder-force/",
]);

export const isHiddenPath = (path: string) => HIDDEN_PATHS.has(path);
export const isHiddenSlug = (slug: string) => HIDDEN_PATHS.has(`guides/${slug}/`);

/** sitemap 용 — 완성 주소(언어 접두 포함)에서 언어를 뺀 경로를 만들어 판정 */
export const isHiddenUrl = (u: string) => {
  const p = new URL(u).pathname.replace(/^\/(?:en|ja|de|es|pt|pl|fr|vi|tr|it|id)\//, "/").replace(/^\//, "");
  return HIDDEN_PATHS.has(p);
};
