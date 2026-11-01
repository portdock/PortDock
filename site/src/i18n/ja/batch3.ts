// 일본어 — 3차 묶음(PC 하드웨어 테스트 웹 도구 10개, scope.ts SCOPE3). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/*.ts·lib/*.ts 를 본떠 옮긴다(site/I18N.md «3차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, hwPrivacy = 하드웨어 테스트 쪽 개인정보 줄(components/HwPrivacy.astro), lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page3Id, Scope3Path } from "../scope.ts";
import micTest from "./pages/micTest.ts";
import keyboardTest from "./pages/keyboardTest.ts";
import webcamTest from "./pages/webcamTest.ts";
import speakerTest from "./pages/speakerTest.ts";
import mouseTest from "./pages/mouseTest.ts";
import gamepadTest from "./pages/gamepadTest.ts";
import monitorTest from "./pages/monitorTest.ts";
import bsodCodes from "./pages/bsodCodes.ts";
import batteryReport from "./pages/batteryReport.ts";
import barcodeTest from "./pages/barcodeTest.ts";
import libHwSignal from "./lib/hwSignal.ts";
import libBsod from "./lib/bsod.ts";
import libBatteryReport from "./lib/batteryReport.ts";
import libBarcode from "./lib/barcode.ts";
import libInputTiming from "./lib/inputTiming.ts";
import libKeyboardLayout from "./lib/keyboardLayout.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/mic-test/": { name: "マイクテスト", blurb: "入力レベルのメーター・実際のサンプリングレート・ノイズフロア・クリッピング、エコーキャンセルのオン/オフ比較、5 秒のローカル録音を再生。" },
    "tools/keyboard-test/": { name: "キーボードテスト(チャタリング・同時押し)", blurb: "ANSI・ISO・韓国語 106 配列に押したキーを表示、同時押しの数、キーごとの回数、チャタリングの疑い(ms)、ブラウザが受け取れないキー。" },
    "tools/webcam-test/": { name: "Web カメラテスト", blurb: "プレビュー、要求した解像度と実際の解像度、fps の測定、カメラの切り替え。映像は保存も送信もしません。" },
    "tools/speaker-test/": { name: "スピーカー左右テスト", blurb: "左・右・両方、5.1・7.1 のチャンネルごとの音、位相(極性)の確認、周波数スイープとトーン、出力デバイスの選択。" },
    "tools/mouse-test/": { name: "マウスのダブルクリックテスト", blurb: "ボタン 5 個・ホイール 4 方向、ダブルクリックの間隔 ms、チャタリングの疑い、ドラッグ切れ、ポーリングレートの推定。" },
    "tools/gamepad-test/": { name: "ゲームパッドテスト(スティックのドリフト・デッドゾーン)", blurb: "ボタン・トリガー・軸のリアルタイム表示、離したときのスティックのずれと軌跡、デッドゾーンのプレビュー、振動(対応ブラウザ)。" },
    "tools/monitor-test/": { name: "ドット抜け・リフレッシュレートテスト", blurb: "全画面の単色でドット抜け・常時点灯を確認、グラデーションのバンディング、リフレッシュレートの推定、残像を見る動くバー。" },
    "tools/bsod-codes/": { name: "ブルースクリーン停止コード辞典", blurb: "0xD1・0x133 などのコード、名前、イベント 1001 のメッセージを貼り付けると、意味・原因の候補・確認する順番・Microsoft のドキュメント。" },
    "tools/battery-report/": { name: "ノート PC バッテリーレポート解析ツール", blurb: "powercfg /batteryreport の HTML をドロップすると、設計容量に対する残りの割合、充放電回数、容量の履歴グラフ。ブラウザの中だけで処理。" },
    "tools/barcode-scanner-test/": { name: "バーコードスキャナテスト", blurb: "読み取った文字と Enter・Tab・GS の表示、文字間の ms(スキャナか手入力か)、IME による文字化け、Caps Lock、GS1 AI の解析。" },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "個人情報: カメラの映像・マイクの音はこのブラウザの中だけで扱い、保存もアップロードもしません — カメラ・マイクのデータとデバイス名は外部に送信しません。",
    input: "個人情報: 押したキー・ボタン・動きはこのブラウザの中だけで数え、外部に送信しません。",
    output: "個人情報: このツールは画面・音を出すだけで、テストの内容を外部に送信しません。",
    ads: [" このページの広告(Google AdSense)は別に動作します — ", "プライバシーポリシー", " をご覧ください。"],
    tester: ["Wi-Fi・インターネットの切断や Bluetooth の接続・切断を時間ごとに記録するには、Windows プログラム ", " を使います(無料)。"],
  },

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    hwSignal: libHwSignal,
    bsod: libBsod,
    batteryReport: libBatteryReport,
    barcode: libBarcode,
    inputTiming: libInputTiming,
    keyboardLayout: libKeyboardLayout,
  },

  /** 쪽 글 */
  pages: { micTest, keyboardTest, webcamTest, speakerTest, mouseTest, gamepadTest, monitorTest, bsodCodes, batteryReport, barcodeTest } satisfies Record<Page3Id, unknown>,
};
