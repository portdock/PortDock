// 검색 결과·목록에서 뺀 쪽 — 2026-11 정리(Search Console: Google 이 크롤링하고도 색인하지 않음, 노출 2~24·클릭 0).
// 쪽 자체는 남는다(주소로 들어오면 열림, 되돌리려면 여기서 지운다). noindex 메타 · sitemap · 목록 · llms.txt 에서만 빠진다.
export const HIDDEN_PATHS: ReadonlySet<string> = new Set([
  "tools/vacuum-pad/",
  "tools/cylinder-force/",
  "tools/op-amp-gain/",
  "tools/ball-screw/",
  "tools/air-consumption/",
  "tools/timing-belt/",
  // 2단계(11/13): 독자가 겹치지 않거나 큰 사이트와 겨루는 것 — 임베디드 해석기 6 · PC 하드웨어 테스트 6
  "tools/can-decoder/",
  "tools/can-bit-timing/",
  "tools/i2c/",
  "tools/spi/",
  "tools/uart-waveform/",
  "tools/mqtt-decoder/",
  "tools/keyboard-test/",
  "tools/mouse-test/",
  "tools/monitor-test/",
  "tools/gamepad-test/",
  "tools/speaker-test/",
  "tools/barcode-scanner-test/",
  "guides/ball-screw-torque-motor/",
  "guides/vacuum-pad-lifting-force/",
  "guides/pneumatic-air-consumption/",
  "guides/pneumatic-cylinder-force/",
]);

/** 번역 언어 숨김 — 원어민 검토 전까지 검색에서 뺀다. 쪽은 남고 언어 선택으로 들어오면 열린다. 일본어만 노출이 있어 둔다.
 *  다시 열려면 여기서 지운다(검토를 마친 언어부터) */
export const HIDDEN_LANGS: ReadonlySet<string> = new Set(["de", "es", "pt", "pl", "fr", "vi", "tr", "it", "id"]);
export const isHiddenLang = (lang: string) => HIDDEN_LANGS.has(lang);

export const isHiddenPath = (path: string) => HIDDEN_PATHS.has(path);
export const isHiddenSlug = (slug: string) => HIDDEN_PATHS.has(`guides/${slug}/`);

/** sitemap 용 — 완성 주소(언어 접두 포함)에서 언어를 뺀 경로를 만들어 판정 */
export const isHiddenUrl = (u: string) => {
  const lang = new URL(u).pathname.split("/")[1];
  if (isHiddenLang(lang)) return true;
  const p = new URL(u).pathname.replace(/^\/(?:en|ja|de|es|pt|pl|fr|vi|tr|it|id)\//, "/").replace(/^\//, "");
  return HIDDEN_PATHS.has(p);
};
