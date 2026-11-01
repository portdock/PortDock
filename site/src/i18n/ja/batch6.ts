// 일본어 — 6차 묶음(전기 웹 도구 15개, scope.ts SCOPE6). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/*.ts·lib/*.ts 를 본떠 옮긴다(site/I18N.md «6차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page6Id, Scope6Path } from "../scope.ts";
import awgMm2 from "./pages/awgMm2.ts";
import conduitFill from "./pages/conduitFill.ts";
import ctRatio from "./pages/ctRatio.ts";
import energyPulse from "./pages/energyPulse.ts";
import heater from "./pages/heater.ts";
import ledResistor from "./pages/ledResistor.ts";
import motorCurrent from "./pages/motorCurrent.ts";
import motorSpeed from "./pages/motorSpeed.ts";
import resistor from "./pages/resistor.ts";
import pfCapacitor from "./pages/pfCapacitor.ts";
import psuSizing from "./pages/psuSizing.ts";
import affinity from "./pages/affinity.ts";
import reactance from "./pages/reactance.ts";
import power from "./pages/power.ts";
import voltageDrop from "./pages/voltageDrop.ts";
import libConduitFill from "./lib/conduitFill.ts";
import libCtRatio from "./lib/ctRatio.ts";
import libEnergyPulse from "./lib/energyPulse.ts";
import libHeater from "./lib/heater.ts";
import libLedResistor from "./lib/ledResistor.ts";
import libMotorCurrent from "./lib/motorCurrent.ts";
import libMotorSpeed from "./lib/motorSpeed.ts";
import libResistor from "./lib/resistor.ts";
import libPfCapacitor from "./lib/pfCapacitor.ts";
import libPsuSizing from "./lib/psuSizing.ts";
import libAffinity from "./lib/affinity.ts";
import libReactance from "./lib/reactance.ts";
import libPower from "./lib/power.ts";
import libVoltageDrop from "./lib/voltageDrop.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/awg-mm2/": { name: "AWG ↔ mm² 換算表", blurb: "AWG 0000~40 の直径・断面積(ASTM B258 の式)、近いメートル規格(IEC 60228)、銅の Ω/km。どちらからでも換算。" },
    "tools/conduit-fill/": { name: "電線管・ダクト占積率計算ツール", blurb: "電線の外径・本数 → 占積率 %。電線管 NEC 53・31・40 %、ワイヤウェイ 20 %、制御盤ダクト NFPA 79 50 % と比較、最小内径と最大本数。" },
    "tools/ct-ratio/": { name: "CT 変流比・負担計算ツール", blurb: "変流比で一次 ↔ 二次電流、往復の電線 + 計器 VA → 合計負担(VA・Ω)と定格の比較、比補正係数。" },
    "tools/energy-pulse/": { name: "電力量計パルス計算ツール", blurb: "imp/kWh・パルス間隔・パルス数 → kW・kWh、CT/VT の乗率、全負荷でのパルス速度とパルス幅。" },
    "tools/heater-power/": { name: "ヒーター容量計算ツール(kW・電流)", blurb: "質量・比熱・温度上昇・時間 → ヒーター kW、流れる流体の kW、単相・三相の電流、ほかの電圧での出力。" },
    "tools/led-resistor/": { name: "LED 抵抗計算ツール", blurb: "電源・Vf・電流・直列の個数 → 抵抗と電力、E12・E24 の値での電流。5・12・24 V の表示灯。" },
    "tools/motor-current/": { name: "モーター電流計算ツール", blurb: "三相・単相・直流の kW(HP)→ 電流・入力電力・kVA・トルク。銘板から効率。" },
    "tools/motor-speed/": { name: "インバーター周波数 ↔ モーター回転数", blurb: "Hz と極数 → 同期速度、銘板からすべり、減速機の出力、目標回転数に必要な Hz。" },
    "tools/parallel-resistor/": { name: "合成抵抗計算ツール(並列・直列)", blurb: "直列・並列の合成値、電流の分かれ方、目標値にする相手の抵抗、E12・E24・E96 の組み合わせ。" },
    "tools/pf-capacitor/": { name: "力率改善コンデンサ計算ツール", blurb: "kW・現在と目標の力率 → 必要な kvar、デルタ・スター結線での 1 個あたりの µF、改善前後の電流。" },
    "tools/power-supply-sizing/": { name: "24 V DC 電源容量計算ツール", blurb: "PLC・HMI・センサー・バルブ・リレーコイルの電流・突入電流・使用率 → 合計、余裕を見た定格(よくある容量)、突入の確認、プロテクタのチャンネル。" },
    "tools/pump-fan-affinity/": { name: "ポンプ・ファンの回転数と動力の計算ツール", blurb: "インバーター周波数 → 流量・圧力・動力(相似則)、年間電力量の差、目標流量に合う周波数。" },
    "tools/reactance/": { name: "リアクタンス・LC 共振計算ツール", blurb: "周波数での Xc・XL、目標の X になる C・L、LC 共振周波数とインピーダンス、コンデンサの電流と kvar。" },
    "tools/three-phase-power/": { name: "三相電力計算ツール", blurb: "電圧と電流・kW・kVA のどれかと力率 → kVA・kW・kvar・電流、kW と kVA から力率。" },
    "tools/voltage-drop/": { name: "電圧降下・電線サイズ計算ツール", blurb: "直流・単相・三相、mm² または AWG、銅・アルミ → 降下と %、許容降下に収まるサイズとこう長。" },
  } satisfies Record<Scope6Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다 — conduitFill 은 서버에서만 그린다) */
  lib: {
    conduitFill: libConduitFill,
    ctRatio: libCtRatio,
    energyPulse: libEnergyPulse,
    heater: libHeater,
    ledResistor: libLedResistor,
    motorCurrent: libMotorCurrent,
    motorSpeed: libMotorSpeed,
    resistor: libResistor,
    pfCapacitor: libPfCapacitor,
    psuSizing: libPsuSizing,
    affinity: libAffinity,
    reactance: libReactance,
    power: libPower,
    voltageDrop: libVoltageDrop,
  },

  /** 쪽 글 */
  pages: { awgMm2, conduitFill, ctRatio, energyPulse, heater, ledResistor, motorCurrent, motorSpeed, resistor, pfCapacitor, psuSizing, affinity, reactance, power, voltageDrop } satisfies Record<Page6Id, unknown>,
};
