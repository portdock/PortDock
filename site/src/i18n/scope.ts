// 추가 언어(ja 등)로 번역하는 쪽 — 목록은 여기 한 곳에서만 정한다.
//   SCOPE  = 1차 묶음: 모든 추가 언어가 갖는 쪽(언어를 붙일 때 다 번역한다).
//   SCOPE2 = 2차 묶음(산업 웹 도구 10개), SCOPE3 = 3차 묶음(PC 하드웨어 테스트 웹 도구 10개), SCOPE4 = 4차 묶음(통신 웹 도구 11개),
//   SCOPE5 = 5차 묶음(신호·단위·네트워크 웹 도구 12개)
//   — 묶음마다 사전 파일이 따로(i18n/<언어>/batch2.ts·batch3.ts·batch4.ts·batch5.ts).
//   2차~5차 묶음은 언어마다 번역이 끝난 쪽만 MORE[언어] 한 목록에 적는다 — 번역 전에는 그 언어 주소·hreflang·언어 고르기·sitemap 에 나오지 않는다.
// 번역된 쪽만 /<언어>/… 주소가 생기고, 번역이 없는 쪽으로 가는 링크는 추가 언어 쪽에서 영어판(/en/…)으로 간다(link()).
// 묶음을 더하면(6차 …): SCOPE6 + LATER 에 펼치기 + i18n/index.ts 의 DICTS6·page6 (site/I18N.md «묶음을 더 더할 때»).
// 쪽을 더하면: 여기 한 줄 + 그 언어의 i18n/<언어>/pages 에 그 쪽 글 + LangPage.astro 의 VIEWS 한 줄(site/I18N.md).
// 이 파일은 node(site-check·시험)도 .ts 그대로 읽는다 — 사전을 가져오지 말 것.
import { EXTRA_LANGS, LANGS, isCore, url, type ExtraLang, type SiteLang } from "./langs.ts";

/** 1차 묶음 — 언어를 뺀 경로 → 쪽 이름(i18n/<언어>/pages/<쪽 이름>.ts) */
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

/** 2차 묶음 — 웹 도구 10개(i18n/<언어>/batch2.ts 의 pages/<쪽 이름>) */
export const SCOPE2 = {
  "tools/wiring/": "wiring",
  "tools/troubleshoot/": "troubleshoot",
  "tools/multimeter-check/": "multimeterCheck",
  "tools/can-decoder/": "canDecoder",
  "tools/can-bit-timing/": "canTiming",
  "tools/i2c/": "i2c",
  "tools/uart-baud/": "uartBaud",
  "tools/modbus-rtu-tcp/": "modbusRtuTcp",
  "tools/xgt-decoder/": "xgtDecoder",
  "tools/cable-selection/": "cableSelection",
} as const;

/** 3차 묶음 — PC 하드웨어 테스트 웹 도구 10개(i18n/<언어>/batch3.ts 의 pages/<쪽 이름>) */
export const SCOPE3 = {
  "tools/mic-test/": "micTest",
  "tools/keyboard-test/": "keyboardTest",
  "tools/webcam-test/": "webcamTest",
  "tools/speaker-test/": "speakerTest",
  "tools/mouse-test/": "mouseTest",
  "tools/gamepad-test/": "gamepadTest",
  "tools/monitor-test/": "monitorTest",
  "tools/bsod-codes/": "bsodCodes",
  "tools/battery-report/": "batteryReport",
  "tools/barcode-scanner-test/": "barcodeTest",
} as const;

/** 4차 묶음 — 통신 웹 도구 11개(i18n/<언어>/batch4.ts 의 pages/<쪽 이름>) */
export const SCOPE4 = {
  "tools/ascii/": "ascii",
  "tools/hex-ascii/": "hexAscii",
  "tools/integer/": "integer",
  "tools/modbus-blocks/": "modbusBlocks",
  "tools/modbus-practice/": "modbusPractice",
  "tools/mqtt-decoder/": "mqttDecoder",
  "tools/pcap-analyzer/": "pcapAnalyzer",
  "tools/spi/": "spi",
  "tools/uart-waveform/": "uartWaveform",
  "tools/web-serial/": "webSerial",
  "tools/logic-capture/": "logicCapture",
} as const;

/** 5차 묶음 — 신호·단위·네트워크 웹 도구 12개(i18n/<언어>/batch5.ts 의 pages/<쪽 이름>) */
export const SCOPE5 = {
  "tools/adc/": "adc",
  "tools/encoder/": "encoder",
  "tools/loop-load/": "loopLoad",
  "tools/ntc/": "ntc",
  "tools/op-amp-gain/": "opAmp",
  "tools/rc-filter/": "rcFilter",
  "tools/temperature/": "temperature",
  "tools/voltage-divider/": "voltageDivider",
  "tools/gige-bandwidth/": "gigeBandwidth",
  "tools/db/": "decibel",
  "tools/pressure/": "pressure",
  "tools/units/": "units",
} as const;

/** 1차 묶음 밖(언어별로 고르는) 쪽 전부 — 2차·3차·4차·5차 묶음을 차례로 */
export const LATER = { ...SCOPE2, ...SCOPE3, ...SCOPE4, ...SCOPE5 } as const;

/** 1차 묶음 경로 */
export type ScopePath = keyof typeof SCOPE;
/** 2차 묶음 경로 */
export type Scope2Path = keyof typeof SCOPE2;
/** 3차 묶음 경로 */
export type Scope3Path = keyof typeof SCOPE3;
/** 4차 묶음 경로 */
export type Scope4Path = keyof typeof SCOPE4;
/** 5차 묶음 경로 */
export type Scope5Path = keyof typeof SCOPE5;
/** 1차 묶음 밖 경로(2차·3차·4차·5차) */
export type LaterPath = Scope2Path | Scope3Path | Scope4Path | Scope5Path;
export type AnyScopePath = ScopePath | LaterPath;
/** 1차 묶음 쪽 이름 */
export type PageId = (typeof SCOPE)[ScopePath];
/** 2차 묶음 쪽 이름 */
export type Page2Id = (typeof SCOPE2)[Scope2Path];
/** 3차 묶음 쪽 이름 */
export type Page3Id = (typeof SCOPE3)[Scope3Path];
/** 4차 묶음 쪽 이름 */
export type Page4Id = (typeof SCOPE4)[Scope4Path];
/** 5차 묶음 쪽 이름 */
export type Page5Id = (typeof SCOPE5)[Scope5Path];
export type AnyPageId = PageId | Page2Id | Page3Id | Page4Id | Page5Id;

export const SCOPE_PATHS = Object.keys(SCOPE) as ScopePath[];
export const SCOPE2_PATHS = Object.keys(SCOPE2) as Scope2Path[];
export const SCOPE3_PATHS = Object.keys(SCOPE3) as Scope3Path[];
export const SCOPE4_PATHS = Object.keys(SCOPE4) as Scope4Path[];
export const SCOPE5_PATHS = Object.keys(SCOPE5) as Scope5Path[];
/** 1차 묶음 밖 경로 전부(2차 다음 3차 다음 4차 다음 5차) */
export const LATER_PATHS: LaterPath[] = [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS];
/** 1차 묶음의 웹 도구(tools/ 아래 쪽) — 모든 추가 언어에 있다 */
export const SCOPE_TOOLS = SCOPE_PATHS.filter((p) => p.startsWith("tools/") && p !== "tools/");

/**
 * 언어별로 1차 묶음 밖에서 번역이 끝난 쪽(2차~5차 묶음 — 한 목록). 번역을 다 싣고 시험이 통과할 때만 여기에 더한다.
 * 쪽 하나씩 더해도 된다 — 그 묶음 사전(i18n/<언어>/batch2.ts~batch5.ts)에 그 쪽 글이 있어야 한다(시험이 본다).
 * 예: 5차 묶음까지 끝낸 언어는 [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS].
 */
export const MORE: Partial<Record<ExtraLang, readonly LaterPath[]>> = {
  ja: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS],
  id: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS],
  fr: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
  it: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
  de: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
  pl: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
  es: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS],
  pt: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS],
  tr: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
  vi: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS],
};

const bare = (path: string) => path.replace(/^\/+/, "").replace(/[#?].*$/, "");

/** 이 추가 언어로 있는 쪽 전부(1차 + 언어별 추가) — 순서는 SCOPE, SCOPE2 … SCOPE5 순 */
export const pathsOf = (lang: ExtraLang): AnyScopePath[] => [...SCOPE_PATHS, ...LATER_PATHS.filter((p) => MORE[lang]?.includes(p))];

/** 경로 → 쪽 이름(1차~5차) */
export const pageOf = (path: AnyScopePath): AnyPageId => (path in SCOPE ? SCOPE[path as ScopePath] : LATER[path as LaterPath]);

/** 이 쪽이 이 언어로 있나 */
export const isTranslated = (lang: SiteLang, path: string) => {
  if (isCore(lang)) return true;
  const p = bare(path);
  return p in SCOPE || (MORE[lang]?.includes(p as LaterPath) ?? false);
};

/** 이 쪽이 있는 언어들(hreflang·언어 고르기 순서) */
export const langsOf = (path: string): SiteLang[] => LANGS.filter((l) => isTranslated(l, path));

/** 이 언어 쪽에서 path 로 가는 링크 — 번역이 없는 쪽이면 영어판으로 */
export const link = (lang: SiteLang, path = "") => url(isTranslated(lang, path) ? lang : "en", path);

/** sitemap·site-check 가 대조할 추가 언어 주소 전부 */
export const extraPages = () => EXTRA_LANGS.flatMap((l) => pathsOf(l).map((p) => url(l, p)));

/** pages/<언어>/[...path].astro 의 getStaticPaths — 그 언어로 번역된 쪽마다 하나 */
export const staticPaths = (lang: ExtraLang) => pathsOf(lang).map((p) => ({ params: { path: p.replace(/\/$/, "") || undefined }, props: { path: p } }));

/** 이 추가 언어로 번역된 웹 도구 수(홈의 «웹 도구 n개») */
export const toolCount = (lang: ExtraLang) => pathsOf(lang).filter((p) => p.startsWith("tools/") && p !== "tools/").length;
