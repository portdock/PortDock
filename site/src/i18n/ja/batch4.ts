// 일본어 — 4차 묶음(통신 웹 도구 9개, scope.ts SCOPE4). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/*.ts·lib/*.ts 를 본떠 옮긴다(site/I18N.md «4차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/ascii/": { name: "ASCII コード表・制御文字", blurb: "0~127 の 10 進・16 進・2 進と文字、STX・ETX・ACK・NAK・CR・LF の名前・キャレット表記・使い方。" },
    "tools/hex-ascii/": { name: "HEX ↔ ASCII 変換ツール", blurb: "バイトを文字に、文字をバイトに。制御文字は \\r \\n \\xNN で表示。" },
    "tools/integer/": { name: "整数・基数変換ツール", blurb: "16 進・10 進・2 進 ↔ 8/16/32 ビット、符号付き(2 の補数)、BCD、グレイコード、レジスタのバイト順。" },
    "tools/modbus-blocks/": { name: "Modbus 読み出し要求のまとめ計算ツール", blurb: "アドレス一覧 → ファンクションコードごとの要求。125 点の上限、許容する空き、使わない点、RTU の 1 周の時間とバイト数。" },
    "tools/modbus-practice/": { name: "Modbus 練習問題(クイズ)", blurb: "初心者向けの自動出題 — 読み出し要求の HEX、応答の中の 40003 の値、例外 83 02、CRC のバイト順、float の ABCD・CDAB。解説・ガイドへのリンク・得点付き。" },
    "tools/mqtt-decoder/": { name: "MQTT ペイロードデコーダ(Sparkplug B)", blurb: "HEX・Base64・テキスト → 整形した JSON、Sparkplug B のメトリクス(名前・エイリアス・型・値)、生の MQTT パケット(ヘッダ・トピック・QoS・パケット ID)。" },
    "tools/spi/": { name: "SPI モードヘルパー(CPOL・CPHA の波形)", blurb: "モード 0~3 → SCK・MOSI・MISO・CS の波形とサンプル・シフトのエッジ、バイトのビット(MSB/LSB ファースト)、転送時間、メーカーごとの表記(CKE・UCCKPH)。" },
    "tools/uart-waveform/": { name: "UART 波形描画ツール", blurb: "文字・HEX → スタート・データ(LSB から)・パリティ・ストップの波形を TTL・RS-232 の電圧で、ビット・フレーム時間、パルス幅 → 標準ボーレート。" },
    "tools/web-serial/": { name: "Web シリアルターミナル", blurb: "ブラウザで COM ポートを開く。HEX・ASCII 表示、チェックサム・改行コードの付加、ログの保存。" },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
  },

  /** 쪽 글 */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, spi, uartWaveform, webSerial } satisfies Record<Page4Id, unknown>,
};
