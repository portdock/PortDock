// 일본어 — 5차 묶음(신호·단위·네트워크 웹 도구 12개, scope.ts SCOPE5). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/*.ts·lib/*.ts 를 본떠 옮긴다(site/I18N.md «5차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page5Id, Scope5Path } from "../scope.ts";
import adc from "./pages/adc.ts";
import encoder from "./pages/encoder.ts";
import loopLoad from "./pages/loopLoad.ts";
import ntc from "./pages/ntc.ts";
import opAmp from "./pages/opAmp.ts";
import rcFilter from "./pages/rcFilter.ts";
import temperature from "./pages/temperature.ts";
import voltageDivider from "./pages/voltageDivider.ts";
import gigeBandwidth from "./pages/gigeBandwidth.ts";
import decibel from "./pages/decibel.ts";
import pressure from "./pages/pressure.ts";
import units from "./pages/units.ts";
import libAdc from "./lib/adc.ts";
import libEncoder from "./lib/encoder.ts";
import libLoopLoad from "./lib/loopLoad.ts";
import libNtc from "./lib/ntc.ts";
import libOpAmp from "./lib/opAmp.ts";
import libRcFilter from "./lib/rcFilter.ts";
import libTemperature from "./lib/temperature.ts";
import libVoltageDivider from "./lib/voltageDivider.ts";
import libGige from "./lib/gige.ts";
import libDecibel from "./lib/decibel.ts";
import libPressure from "./lib/pressure.ts";
import libUnits from "./lib/units.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/adc/": { name: "ADC 分解能・スケーリング計算ツール", blurb: "ビット数・基準電圧 → 1 LSB・コード ↔ 電圧、4–20mA(シャント)・0–10V(分圧)→ 工業値、1 カウントの値。" },
    "tools/encoder/": { name: "エンコーダ パルス ↔ rpm 計算ツール", blurb: "PPR・逓倍 → 出力周波数・カウント速度、カウントから rpm、応答周波数から最大 rpm、1 カウントの角度・距離。" },
    "tools/loop-load/": { name: "4–20mA ループ負荷計算ツール", blurb: "ループ電源・伝送器の最小電圧・250 Ω・線の抵抗 → 残る電圧、最大負荷抵抗、最大ケーブル長。" },
    "tools/ntc/": { name: "NTC サーミスタ計算ツール", blurb: "B 定数・Steinhart–Hart で抵抗 ↔ 温度、分圧電圧・ADC 値、温度表、自己発熱。" },
    "tools/op-amp-gain/": { name: "オペアンプ増幅率計算ツール", blurb: "非反転・反転・差動のゲインと dB、出力電圧、オープンループゲインによる誤差、帯域幅、目標ゲインの標準抵抗。" },
    "tools/rc-filter/": { name: "RC 時定数・カットオフ周波数計算ツール", blurb: "R・C → τ、63 %・99 % までの充電時間、1 次ローパスフィルタのカットオフ周波数・減衰・位相、fc に合う R・C。" },
    "tools/temperature/": { name: "Pt100・熱電対の温度換算", blurb: "Pt100・Pt1000 の抵抗、K・J・T・E・N・R・S・B 熱電対の mV ↔ 温度。冷接点補償・温度表。" },
    "tools/voltage-divider/": { name: "分圧抵抗計算ツール", blurb: "入力・出力電圧 → R1・R2、E12・E24・E96 標準値の組み合わせ(誤差順)、負荷・電流・電力・出力インピーダンス・許容差。" },
    "tools/gige-bandwidth/": { name: "GigE カメラ帯域計算ツール", blurb: "解像度・ピクセルフォーマット・fps・カメラ台数 → MB/s、1・2.5・5・10 GbE に対する %、リンク内の最大 fps。" },
    "tools/db/": { name: "dB・dBm 変換ツール", blurb: "dBm ↔ mW・W、50・75・600 Ω 基準の dBµV・dBV・dBu・電圧、電力比・電圧比 ↔ dB。" },
    "tools/pressure/": { name: "圧力単位変換ツール", blurb: "bar・psi・kPa・MPa・kgf/cm²・mmH₂O・mmHg を一度に。ゲージ圧 ↔ 絶対圧、センサ範囲の 4–20mA 換算表。" },
    "tools/units/": { name: "産業用単位変換ツール", blurb: "流量 m³/h・L/min・gpm、トルク N·m・kgf·cm・lbf·ft、動力 kW・HP・PS・kcal/h、温度 °C・°F・K。" },
  } satisfies Record<Scope5Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    adc: libAdc,
    encoder: libEncoder,
    loopLoad: libLoopLoad,
    ntc: libNtc,
    opAmp: libOpAmp,
    rcFilter: libRcFilter,
    temperature: libTemperature,
    voltageDivider: libVoltageDivider,
    gige: libGige,
    decibel: libDecibel,
    pressure: libPressure,
    units: libUnits,
  },

  /** 쪽 글 */
  pages: { adc, encoder, loopLoad, ntc, opAmp, rcFilter, temperature, voltageDivider, gigeBandwidth, decibel, pressure, units } satisfies Record<Page5Id, unknown>,
};
