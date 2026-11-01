// 일본어 — 2차 묶음(웹 도구 10개, scope.ts SCOPE2). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/*.ts·lib/*.ts·troubleshootTree.ts 를 본떠 옮긴다(site/I18N.md «2차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 계산 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글(scope.ts SCOPE2 의 값과 같은 이름)
import type { Page2Id, Scope2Path } from "../scope.ts";
import wiring from "./pages/wiring.ts";
import troubleshoot from "./pages/troubleshoot.ts";
import multimeterCheck from "./pages/multimeterCheck.ts";
import canDecoder from "./pages/canDecoder.ts";
import canTiming from "./pages/canTiming.ts";
import i2c from "./pages/i2c.ts";
import uartBaud from "./pages/uartBaud.ts";
import modbusRtuTcp from "./pages/modbusRtuTcp.ts";
import xgtDecoder from "./pages/xgtDecoder.ts";
import cableSelection from "./pages/cableSelection.ts";
import libWiring from "./lib/wiring.ts";
import libTroubleshoot from "./lib/troubleshoot.ts";
import libMeterCheck from "./lib/meterCheck.ts";
import libMeterUi from "./lib/meterUi.ts";
import libCanFrame from "./lib/canFrame.ts";
import libCanTiming from "./lib/canTiming.ts";
import libI2c from "./lib/i2c.ts";
import libUartBaud from "./lib/uartBaud.ts";
import libModbusConvert from "./lib/modbusConvert.ts";
import libXgt from "./lib/xgt.ts";
import libXgtManuals from "./lib/xgtManuals.ts";
import libCableSelect from "./lib/cableSelect.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/wiring/": { name: "配線図作成ツール", blurb: "RS-485 2 線・4 線、RS-232 クロス、4-20mA 2・3・4 線式、NPN/PNP センサ、リレー出力 — 使う機器と局番で描き、チェックリスト付き、SVG・PNG 保存。" },
    "tools/troubleshoot/": { name: "故障原因の切り分けガイド", blurb: "RS-485・RS-232・Modbus TCP・USB-シリアル・4–20mA・NPN/PNP センサ・MC プロトコル・USB の切断 — はい/いいえで原因の候補・テスターでの確認・ガイドまで絞り込み。テキストでコピー。" },
    "tools/multimeter-check/": { name: "テスター測定値チェックツール", blurb: "RS-485 の A–B 間抵抗・アイドル電圧・コモンモード電圧、4–20mA(NE 43)、24 V の電圧降下、NPN/PNP 出力、RS-232 TX、GND 間の電位差 — 測定値を入れると判定。" },
    "tools/can-decoder/": { name: "CAN フレーム解析ツール(J1939・CANopen)", blurb: "candump の行、ID DLC データ、生のビット列 → 標準/拡張 ID、DLC(FD の長さ)、スタッフビット除去と CRC15、J1939 の PGN・アドレス・SPN、CANopen の COB-ID・NMT・SDO。" },
    "tools/can-bit-timing/": { name: "CAN ビットタイミング計算ツール", blurb: "CAN クロック・ビットレート・サンプルポイント → プリスケーラ、TQ、PROP、PHASE_SEG1/2、SJW と発振子の許容偏差。" },
    "tools/i2c/": { name: "I2C ツール(プルアップ・アドレス・解析)", blurb: "VDD・バス容量・100k/400k/1M → プルアップ抵抗 Rp の最小・最大(UM10204)、よく使うチップの 7 ビットアドレス表と 8 ビット換算、«S A0 A … P» の解析。" },
    "tools/uart-baud/": { name: "UART ボーレート誤差計算ツール", blurb: "マイコンのクロックとオーバーサンプリング → 分周比(UBRR)、実際のボーレートと誤差 %、受信許容範囲、標準ボーレートの表。" },
    "tools/modbus-rtu-tcp/": { name: "Modbus RTU ↔ TCP フレーム変換ツール", blurb: "RTU(局番+CRC)↔ TCP(MBAP: トランザクション・長さ・ユニット ID)↔ ASCII(コロン・LRC・CR LF)。要求・応答、バイトの色分け、ゲートウェイのユニット ID 0・255 の説明付き。" },
    "tools/xgt-decoder/": { name: "LS XGT 専用プロトコル(FEnet)フレーム解析ツール", blurb: "«LSIS-XGT» ヘッダのフレーム → ヘッダの各項目、BCC、命令、変数(%MW・%MX・%DB)、値、エラーコード。要求と組で応答を解析、要求の作成も。PLC Simulator の XGT モード(0.10.0 から)と組み合わせて。" },
    "tools/cable-selection/": { name: "ケーブル選定ガイド", blurb: "AC・DC 24 V 電源、RS-485、RS-232、4–20mA、熱電対・測温抵抗体、イーサネット、サーボ、ケーブルチェーン — 用途ごとのケーブルの種類と条件、電圧降下からの太さ、通信の長さの確認。" },
  } satisfies Record<Scope2Path, { name: string; blurb: string }>,

  /** 계산 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    // 쪽 JSON 에 싣는 묶음(화면 스크립트가 쓴다) — 쪽의 Base libText
    wiring: libWiring,
    troubleshoot: libTroubleshoot,
    meterCheck: libMeterCheck,
    canFrame: libCanFrame,
    canTiming: libCanTiming,
    i2c: libI2c,
    uartBaud: libUartBaud,
    modbusConvert: libModbusConvert,
    xgt: libXgt,
    cableSelect: libCableSelect,
    // 서버에서만 그리는 묶음(쪽 JSON 에 싣지 않음)
    meterUi: libMeterUi,
    xgtManuals: libXgtManuals,
  },


  /** 쪽 글 */
  pages: { wiring, troubleshoot, multimeterCheck, canDecoder, canTiming, i2c, uartBaud, modbusRtuTcp, xgtDecoder, cableSelection } satisfies Record<Page2Id, unknown>,
};
