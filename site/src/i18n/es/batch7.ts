// es — 7차 묶음(기계·배선 작업·문서 웹 도구 15개, scope.ts SCOPE7). 기준판 ja/batch7.ts 와 같은 모양(site/I18N.md «7차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page7Id, Scope7Path } from "../scope.ts";
import airConsumption from "./pages/airConsumption.ts";
import ballScrew from "./pages/ballScrew.ts";
import conveyorSpeed from "./pages/conveyorSpeed.ts";
import cylinder from "./pages/cylinder.ts";
import timingBelt from "./pages/timingBelt.ts";
import vacuumPad from "./pages/vacuumPad.ts";
import cableLabels from "./pages/cableLabels.ts";
import ferrules from "./pages/ferrules.ts";
import insulation from "./pages/insulation.ts";
import metricThreads from "./pages/metricThreads.ts";
import panelHeat from "./pages/panelHeat.ts";
import handover from "./pages/handover.ts";
import ioList from "./pages/ioList.ts";
import systemDiagram from "./pages/systemDiagram.ts";
import commissioning from "./pages/commissioning.ts";
import libAirConsumption from "./lib/airConsumption.ts";
import libBallScrew from "./lib/ballScrew.ts";
import libConveyor from "./lib/conveyor.ts";
import libCylinder from "./lib/cylinder.ts";
import libTimingBelt from "./lib/timingBelt.ts";
import libVacuumPad from "./lib/vacuumPad.ts";
import libCableLabels from "./lib/cableLabels.ts";
import libFerrules from "./lib/ferrules.ts";
import libInsulation from "./lib/insulation.ts";
import libPanelHeat from "./lib/panelHeat.ts";
import libHandover from "./lib/handover.ts";
import libIoList from "./lib/ioList.ts";
import libSysDiagram from "./lib/sysDiagram.ts";
import libSysDiff from "./lib/sysDiff.ts";
import libCommissioning from "./lib/commissioning.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/air-consumption/": { name: "エアシリンダの空気消費量計算ツール", blurb: "内径・ストローク・圧力・配管 → 1 サイクルの空気消費量(L ANR)、毎分の消費量、必要空気流量とコンプレッサーの目安。" },
    "tools/ball-screw/": { name: "ボールねじのトルク・モーター選定計算ツール", blurb: "質量・速度・加速時間・リード → 軸方向荷重、モーター回転数、加速・定速・減速トルク、負荷慣性モーメント、実効トルク。水平・垂直。" },
    "tools/conveyor-speed/": { name: "コンベヤ速度 ↔ インバーター周波数の計算ツール", blurb: "ローラー径・減速比・極数・すべり → ライン速度 m/min、目標速度の Hz、1 Hz あたりの速度。" },
    "tools/cylinder-force/": { name: "エアシリンダの推力計算ツール", blurb: "内径・ロッド・圧力 → 押し側・引き側の理論出力(N・kgf)、必要な力と負荷率から SMC の表で内径を選ぶ。" },
    "tools/timing-belt/": { name: "タイミングベルトの長さ・軸間距離計算ツール", blurb: "ピッチ・プーリー歯数・軸間距離 → ベルト長さ・歯数、またはベルト → 軸間距離。ピッチ円直径、巻き付け角、かみ合い歯数、ベルト速度。" },
    "tools/vacuum-pad/": { name: "真空パッドの吊り上げ力計算ツール", blurb: "パッド径・真空圧・安全率 → 吊り上げ力(N・kgf)、必要な真空圧・パッド径、配管容積と応答時間。" },
    "tools/cable-labels/": { name: "ケーブル・端子ラベル作成ツール", blurb: "連番(W001~W120、X1:1~X1:40)、貼り付けた I/O 名、両端の «A→B» ラベル — A4 ラベル用紙(行・列・余白 mm)に印刷、またはラベルプリンター用の CSV・テキスト。" },
    "tools/ferrules/": { name: "棒端子・圧着端子の早見表", blurb: "mm² または AWG → 棒端子のスリーブ色(DIN 46228-4 とフランス式)、色 → サイズ、丸形端子の呼び(1.25・2・5.5)とねじ径。出典のある値だけ。" },
    "tools/insulation-resistance/": { name: "絶縁抵抗の判定ツール", blurb: "SELV/PELV・500 V 以下・500 V 超の回路、試験電圧と MΩ → IEC 60364-6 の最小値(0.5・1 MΩ)と比較。測定前の安全手順つき。" },
    "tools/metric-threads/": { name: "メートルねじの下穴・ボルト早見表", blurb: "M2~M20 の並目・細目ピッチ、下穴径(d − P)、六角棒スパナ(ISO 4762)とスパナ(ISO 4032)のサイズ、工具サイズ → ねじ。" },
    "tools/panel-heat/": { name: "制御盤の発熱・ファン選定計算ツール", blurb: "機器の発熱量の合計、盤の寸法と設置条件(IEC 60890)→ 自然放熱量、ファン風量 m³/h(標高補正)、盤用クーラー・ヒーターの能力。" },
    "tools/handover-pack/": { name: "現場引き渡し資料の作成ツール", blurb: "構成図 JSON・I/O リスト JSON・立ち上げチェックリスト CSV・連絡先・メモ → 表紙と目次つきの印刷できる 1 冊の資料。HTML 保存または PDF 印刷、ブラウザの中だけで。" },
    "tools/io-list/": { name: "I/O リスト・通信仕様書の作成ツール", blurb: "機器ごとの通信(RTU/TCP、局番、IP、ボーレート)とタグ・アドレス・ファンクション・データ型・ワード順・スケール。範囲の重なりと局番の重複を確認、デバイスマップの取り込み、CSV(Excel)・JSON・印刷。" },
    "tools/system-diagram/": { name: "システム構成図エディタ", blurb: "PC・PLC・HMI・インバーター・スイッチを Ethernet・RS-485 のバスに配置。IP 重複・サブネット・局番・終端抵抗・ユニット負荷・ポーリング時間・変更前後の比較、JSON・SVG・PNG。" },
    "tools/commissioning-checklist/": { name: "立ち上げ・保守チェックリスト", blurb: "新規設置・定期点検・増設・交換・撤去 × PC・PLC・HMI・インバーター・RS-485・スイッチ・24 V 電源 — 段階別のチェックリスト。チェックとメモを保存、印刷、CSV。" },
  } satisfies Record<Scope7Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    airConsumption: libAirConsumption,
    ballScrew: libBallScrew,
    conveyor: libConveyor,
    cylinder: libCylinder,
    timingBelt: libTimingBelt,
    vacuumPad: libVacuumPad,
    cableLabels: libCableLabels,
    ferrules: libFerrules,
    insulation: libInsulation,
    panelHeat: libPanelHeat,
    handover: libHandover,
    ioList: libIoList,
    sysDiagram: libSysDiagram,
    sysDiff: libSysDiff,
    commissioning: libCommissioning,
  },

  /** 쪽 글 */
  pages: { airConsumption, ballScrew, conveyorSpeed, cylinder, timingBelt, vacuumPad, cableLabels, ferrules, insulation, metricThreads, panelHeat, handover, ioList, systemDiagram, commissioning } satisfies Record<Page7Id, unknown>,
};
