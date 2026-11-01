// Türkçe — 2. paket (10 web aracı, scope.ts SCOPE2). Referans ja/batch2.ts ile aynı biçim; İngilizce sürümden çevrildi (site/I18N.md «2차 묶음 붙이는 법»).
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
    "tools/wiring/": { name: "Bağlantı şeması çizici", blurb: "RS-485 2/4 telli, RS-232 null modem, 4-20 mA 2/3/4 telli, NPN/PNP sensörler, röle çıkışları — cihazlarınıza ve adreslerinize göre çizilir, kontrol listesiyle, SVG/PNG." },
    "tools/troubleshoot/": { name: "Saha arıza bulma sihirbazı", blurb: "RS-485, RS-232, Modbus TCP, USB-seri, 4-20 mA, NPN/PNP sensörler, MC protokolü, USB kopmaları — evet/hayır ile olası nedenlere, multimetre kontrollerine ve kılavuzlara daraltın. Metin olarak kopyalayın." },
    "tools/multimeter-check/": { name: "Multimetre ölçüm denetleyicisi", blurb: "RS-485 A–B direnci, boşta ve ortak mod gerilimi, 4-20 mA (NE 43), 24 V düşümü, NPN/PNP çıkış, RS-232 TX, toprak farkı — ölçümü girin, yorumu alın." },
    "tools/can-decoder/": { name: "CAN çerçeve çözücü (J1939, CANopen)", blurb: "candump satırları, ID DLC veri ya da ham bitler → standart/genişletilmiş ID, DLC (FD uzunlukları), dolgu bitlerinin çıkarılması ve CRC15, J1939 PGN, adresler ve SPN’ler, CANopen COB-ID, NMT ve SDO." },
    "tools/can-bit-timing/": { name: "CAN bit zamanlaması hesaplayıcı", blurb: "CAN saati, bit hızı ve örnekleme noktası → prescaler, TQ, PROP, PHASE_SEG1/2 ve SJW, osilatör toleransıyla birlikte." },
    "tools/i2c/": { name: "I2C araçları (pull-up, adresler, çözücü)", blurb: "VDD, hat kapasitansı ve 100k/400k/1M → pull-up Rp en küçük ve en büyük (UM10204), yaygın çiplerin 7 bit adres tablosu ve 8 bit dönüşümü, «S A0 A … P» çözücü." },
    "tools/uart-baud/": { name: "UART baud hızı hata hesaplayıcı", blurb: "MCU saati ve aşırı örnekleme → bölücü (UBRR), gerçek baud ve % hata, alıcı toleransı, standart baud tablosu." },
    "tools/modbus-rtu-tcp/": { name: "Modbus RTU ↔ TCP çerçeve dönüştürücü", blurb: "RTU (adres + CRC) ↔ TCP (MBAP: işlem, uzunluk, Unit ID) ↔ ASCII (iki nokta, LRC, CR LF). İstekler ve yanıtlar, renkli baytlar, ağ geçidinde Unit ID 0 ve 255 açıklaması." },
    "tools/xgt-decoder/": { name: "LS XGT özel protokol (FEnet) çerçeve çözücü", blurb: "«LSIS-XGT» başlıklı çerçeveler → başlık alanları, BCC, komut, değişkenler (%MW, %MX, %DB), değerler ve hata kodu. Yanıtı isteğiyle eşleştirin; istek oluşturun. PLC Simulator’ın XGT moduyla (0.10.0’dan itibaren) birlikte kullanılır." },
    "tools/cable-selection/": { name: "Kablo seçim yardımcısı", blurb: "AC ve 24 V DC güç, RS-485, RS-232, 4-20 mA, termokupllar ve RTD’ler, Ethernet, servo, kablo zincirleri — kullanıma göre kablo tipi ve koşulları; gerilim düşümünden kesit, iletişim için uzunluk kontrolü." },
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
