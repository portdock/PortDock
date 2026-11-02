// 추가 언어(ja 등)로 번역하는 쪽 — 목록은 여기 한 곳에서만 정한다.
//   SCOPE  = 1차 묶음: 모든 추가 언어가 갖는 쪽(언어를 붙일 때 다 번역한다).
//   SCOPE2 = 2차 묶음(산업 웹 도구 10개), SCOPE3 = 3차 묶음(PC 하드웨어 테스트 웹 도구 10개), SCOPE4 = 4차 묶음(통신 웹 도구 11개),
//   SCOPE5 = 5차 묶음(신호·단위·네트워크 웹 도구 12개), SCOPE6 = 6차 묶음(전기 웹 도구 15개), SCOPE7 = 7차 묶음(기계·배선 작업·문서 웹 도구 15개),
//   SCOPE8 = 8차 묶음(윈도우 프로그램 소개 13쪽 — 사용법 쪽은 아직 아님), SCOPE9 = 9차 묶음(장비 레지스터 맵 — 목록 1쪽 + 장비마다 1쪽, 장비 목록은 data/devices 에서)
//   — 묶음마다 사전 파일이 따로(i18n/<언어>/batch2.ts·batch3.ts·batch4.ts·batch5.ts·batch6.ts·batch7.ts·batch8.ts·batch9.ts).
//   2차~9차 묶음은 언어마다 번역이 끝난 쪽만 MORE[언어] 한 목록에 적는다 — 번역 전에는 그 언어 주소·hreflang·언어 고르기·sitemap 에 나오지 않는다.
// 번역된 쪽만 /<언어>/… 주소가 생기고, 번역이 없는 쪽으로 가는 링크는 추가 언어 쪽에서 영어판(/en/…)으로 간다(link()).
// 묶음을 더하면(10차 …): SCOPE10 + LATER 에 펼치기 + i18n/index.ts 의 DICTS10·page10 (site/I18N.md «묶음을 더 더할 때»).
// 쪽을 더하면: 여기 한 줄 + 그 언어의 i18n/<언어>/pages 에 그 쪽 글 + LangPage.astro 의 VIEWS 한 줄(site/I18N.md).
// 이 파일은 node(site-check·시험)도 .ts 그대로 읽는다 — 사전을 가져오지 말 것(9차 묶음의 장비 목록은 data/devices 폴더를 fs 로 읽는다 — 빌드·node 둘 다 서버).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

/** 6차 묶음 — 전기 웹 도구 15개(i18n/<언어>/batch6.ts 의 pages/<쪽 이름>) */
export const SCOPE6 = {
  "tools/awg-mm2/": "awgMm2",
  "tools/conduit-fill/": "conduitFill",
  "tools/ct-ratio/": "ctRatio",
  "tools/energy-pulse/": "energyPulse",
  "tools/heater-power/": "heater",
  "tools/led-resistor/": "ledResistor",
  "tools/motor-current/": "motorCurrent",
  "tools/motor-speed/": "motorSpeed",
  "tools/parallel-resistor/": "resistor",
  "tools/pf-capacitor/": "pfCapacitor",
  "tools/power-supply-sizing/": "psuSizing",
  "tools/pump-fan-affinity/": "affinity",
  "tools/reactance/": "reactance",
  "tools/three-phase-power/": "power",
  "tools/voltage-drop/": "voltageDrop",
} as const;

/** 7차 묶음 — 기계·배선 작업·문서 웹 도구 15개(i18n/<언어>/batch7.ts 의 pages/<쪽 이름>) */
export const SCOPE7 = {
  "tools/air-consumption/": "airConsumption",
  "tools/ball-screw/": "ballScrew",
  "tools/conveyor-speed/": "conveyorSpeed",
  "tools/cylinder-force/": "cylinder",
  "tools/timing-belt/": "timingBelt",
  "tools/vacuum-pad/": "vacuumPad",
  "tools/cable-labels/": "cableLabels",
  "tools/ferrules/": "ferrules",
  "tools/insulation-resistance/": "insulation",
  "tools/metric-threads/": "metricThreads",
  "tools/panel-heat/": "panelHeat",
  "tools/handover-pack/": "handover",
  "tools/io-list/": "ioList",
  "tools/system-diagram/": "systemDiagram",
  "tools/commissioning-checklist/": "commissioning",
} as const;

/**
 * 8차 묶음 — 윈도우 프로그램 소개 13쪽(i18n/<언어>/batch8.ts 의 pages/<앱 id>). 쪽 이름 = data/tools.ts 의 앱 id(화면 하나 views/ToolPage.astro 가 13개를 그린다).
 * 사용법 쪽(<앱>/docs/)은 앱 도움말 본문(apps/<앱>/src/help.ts, 한국어·영어 두 판)을 그대로 보이므로 넣지 않는다 — 추가 언어 쪽에서는 영어판으로 간다.
 */
export const SCOPE8 = {
  "serial/": "serial",
  "modbus-slave/": "modbus-slave",
  "tcp/": "tcp",
  "udp/": "udp",
  "simulator/": "simulator",
  "netscan/": "netscan",
  "modbus-master/": "modbus-master",
  "scpi/": "scpi",
  "plot/": "plot",
  "port-inspector/": "port-inspector",
  "plc-simulator/": "plc-simulator",
  "hw-tester/": "hw-tester",
  "mcp/": "mcp",
} as const;

/**
 * 저장소의 data/devices 폴더 — node(시험·site-check)는 이 파일 자리에서 찾고, astro 빌드는 이 파일이 묶여 다른 자리에서 돌므로 작업 폴더에서 위로 찾는다.
 * data/devices.ts(import.meta.glob — 빌드만)와 같은 파일(data/devices/<제조사>/<모델>.json)을 본다.
 */
function devicesDir(): string {
  const tries: string[] = [];
  try {
    tries.push(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data/devices"));
  } catch {
    // 묶인 파일이 file: 주소가 아니면 작업 폴더에서 찾는다
  }
  for (let d = process.cwd(); ; d = path.dirname(d)) {
    tries.push(path.join(d, "data", "devices"));
    if (path.dirname(d) === d) break;
  }
  const hit = tries.find((d) => fs.existsSync(path.join(d, "schema.json")));
  if (!hit) throw new Error("scope.ts: 저장소의 data/devices 폴더를 찾지 못함");
  return hit;
}
/** 장비 id(«제조사/모델» = data/devices/<제조사>/<모델>.json) — 이름 순 */
export const DEVICE_IDS: readonly string[] = (() => {
  const dir = devicesDir();
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => fs.readdirSync(path.join(dir, d.name)).filter((f) => f.endsWith(".json")).map((f) => `${d.name}/${f.slice(0, -5)}`))
    .sort();
})();
/** 장비 한 종의 쪽 주소 «devices/<제조사>/<모델>/» (data/devices.ts 의 devPath) */
export type DevicePath = `devices/${string}/${string}/`;
export const DEVICE_PATHS = DEVICE_IDS.map((id) => `devices/${id}/` as DevicePath);

/**
 * 9차 묶음 — 장비 레지스터 맵: 목록 «devices/»(쪽 이름 devices — views/DevicesIndex.astro) + 장비마다 «devices/<제조사>/<모델>/»(쪽 이름 device — views/DevicePage.astro 하나가 그 장비를 그린다).
 * 장비 쪽은 손으로 적지 않고 data/devices 에서 만든다(장비를 더하면 저절로 늘어난다 — 9차 묶음을 공개한 언어는 그 장비의 요약 글도 같이 더한다, 시험이 본다).
 * 레지스터 이름·설명·주의·출처는 데이터(영어)를 그대로 보이고, 화면 공통 글·장비 종류 이름·장비마다 요약(summary)만 옮긴다(site/I18N.md «9차 묶음 붙이는 법»).
 */
export const SCOPE9: { readonly "devices/": "devices" } & { readonly [p: DevicePath]: "device" } = {
  "devices/": "devices",
  ...(Object.fromEntries(DEVICE_PATHS.map((p) => [p, "device"])) as Record<DevicePath, "device">),
};

/** 1차 묶음 밖(언어별로 고르는) 쪽 전부 — 2차~9차 묶음을 차례로 */
// SCOPE9 의 장비 경로(템플릿 문자열 열쇠)가 펼치기에서 빠지지 않게 모양을 적어 둔다
export const LATER: typeof SCOPE2 & typeof SCOPE3 & typeof SCOPE4 & typeof SCOPE5 & typeof SCOPE6 & typeof SCOPE7 & typeof SCOPE8 & typeof SCOPE9 = { ...SCOPE2, ...SCOPE3, ...SCOPE4, ...SCOPE5, ...SCOPE6, ...SCOPE7, ...SCOPE8, ...SCOPE9 };

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
/** 6차 묶음 경로 */
export type Scope6Path = keyof typeof SCOPE6;
/** 7차 묶음 경로 */
export type Scope7Path = keyof typeof SCOPE7;
/** 8차 묶음 경로 */
export type Scope8Path = keyof typeof SCOPE8;
/** 9차 묶음 경로(장비 맵 목록 + 장비마다) */
export type Scope9Path = "devices/" | DevicePath;
/** 1차 묶음 밖 경로(2차~9차) */
export type LaterPath = Scope2Path | Scope3Path | Scope4Path | Scope5Path | Scope6Path | Scope7Path | Scope8Path | Scope9Path;
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
/** 6차 묶음 쪽 이름 */
export type Page6Id = (typeof SCOPE6)[Scope6Path];
/** 7차 묶음 쪽 이름 */
export type Page7Id = (typeof SCOPE7)[Scope7Path];
/** 8차 묶음 쪽 이름(= 앱 id) */
export type Page8Id = (typeof SCOPE8)[Scope8Path];
/** 9차 묶음 쪽 이름 — devices(목록)·device(장비 한 종, 장비마다 같은 이름) */
export type Page9Id = "devices" | "device";
export type AnyPageId = PageId | Page2Id | Page3Id | Page4Id | Page5Id | Page6Id | Page7Id | Page8Id | Page9Id;

export const SCOPE_PATHS = Object.keys(SCOPE) as ScopePath[];
export const SCOPE2_PATHS = Object.keys(SCOPE2) as Scope2Path[];
export const SCOPE3_PATHS = Object.keys(SCOPE3) as Scope3Path[];
export const SCOPE4_PATHS = Object.keys(SCOPE4) as Scope4Path[];
export const SCOPE5_PATHS = Object.keys(SCOPE5) as Scope5Path[];
export const SCOPE6_PATHS = Object.keys(SCOPE6) as Scope6Path[];
export const SCOPE7_PATHS = Object.keys(SCOPE7) as Scope7Path[];
export const SCOPE8_PATHS = Object.keys(SCOPE8) as Scope8Path[];
/** 9차 묶음 경로 — 목록 «devices/» 다음 장비마다(DEVICE_PATHS) */
export const SCOPE9_PATHS: Scope9Path[] = ["devices/", ...DEVICE_PATHS];
/** 1차 묶음 밖 경로 전부(2차 다음 3차 … 9차) */
export const LATER_PATHS: LaterPath[] = [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS, ...SCOPE9_PATHS];
/** 1차 묶음의 웹 도구(tools/ 아래 쪽) — 모든 추가 언어에 있다 */
export const SCOPE_TOOLS = SCOPE_PATHS.filter((p) => p.startsWith("tools/") && p !== "tools/");

/**
 * 언어별로 1차 묶음 밖에서 번역이 끝난 쪽(2차~9차 묶음 — 한 목록). 번역을 다 싣고 시험이 통과할 때만 여기에 더한다.
 * 쪽 하나씩 더해도 된다 — 그 묶음 사전(i18n/<언어>/batch2.ts~batch9.ts)에 그 쪽 글이 있어야 한다(시험이 본다). 9차 장비 쪽을 넣으면 목록 «devices/» 도 넣는다.
 * 예: 6차 묶음까지 끝낸 언어는 [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS].
 */
export const MORE: Partial<Record<ExtraLang, readonly LaterPath[]>> = {
  ja: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS, ...SCOPE9_PATHS],
  id: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  fr: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  it: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  de: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  pl: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  es: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS, ...SCOPE9_PATHS],
  pt: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  tr: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
  vi: [...SCOPE2_PATHS, ...SCOPE3_PATHS, ...SCOPE4_PATHS, ...SCOPE5_PATHS, ...SCOPE6_PATHS, ...SCOPE7_PATHS, ...SCOPE8_PATHS],
};

const bare = (path: string) => path.replace(/^\/+/, "").replace(/[#?].*$/, "");

/** 이 추가 언어로 있는 쪽 전부(1차 + 언어별 추가) — 순서는 SCOPE, SCOPE2 … SCOPE9 순 */
export const pathsOf = (lang: ExtraLang): AnyScopePath[] => [...SCOPE_PATHS, ...LATER_PATHS.filter((p) => MORE[lang]?.includes(p))];

/** 경로 → 쪽 이름(1차~9차) */
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
