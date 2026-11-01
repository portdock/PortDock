// Deutsch — 2. Paket (10 Web-Tools, scope.ts SCOPE2). Aufbau wie das Referenzpaket ja/batch2.ts (site/I18N.md).
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
    "tools/wiring/": { name: "Schaltplan-Generator", blurb: "RS-485 2/4-Draht, RS-232-Nullmodem, 4-20 mA 2/3/4-Leiter, NPN/PNP-Sensoren, Relaisausgänge — für Ihre Geräte und Adressen gezeichnet, mit Checkliste, SVG/PNG." },
    "tools/troubleshoot/": { name: "Fehlersuche-Assistent", blurb: "RS-485, RS-232, Modbus TCP, USB-Seriell, 4–20 mA, NPN/PNP-Sensoren, MC-Protokoll, USB-Abbrüche — per Ja/Nein zu möglichen Ursachen, Messprüfungen und Anleitungen. Als Text kopieren." },
    "tools/multimeter-check/": { name: "Multimeter-Messwertprüfung", blurb: "RS-485 Widerstand A–B, Ruhe- und Gleichtaktspannung, 4–20 mA (NE 43), 24-V-Spannungsfall, NPN/PNP-Ausgang, RS-232 TX, Massedifferenz — Messwert rein, Bewertung raus." },
    "tools/can-decoder/": { name: "CAN-Telegramm-Decoder (J1939, CANopen)", blurb: "candump-Zeilen, ID DLC Daten oder rohe Bits → Standard-/Extended-ID, DLC (FD-Längen), Destuffing und CRC15, J1939-PGN, Adressen und SPNs, CANopen COB-ID, NMT und SDO." },
    "tools/can-bit-timing/": { name: "CAN-Bit-Timing-Rechner", blurb: "CAN-Takt, Bitrate und Abtastpunkt → Prescaler, TQ, PROP, PHASE_SEG1/2 und SJW, mit Oszillatortoleranz." },
    "tools/i2c/": { name: "I2C-Tools (Pull-up, Adressen, Decoder)", blurb: "VDD, Buskapazität und 100k/400k/1M → Pull-up Rp min. und max. (UM10204), 7-Bit-Adresstabelle gängiger Chips mit 8-Bit-Umrechnung, Decoder für „S A0 A … P“." },
    "tools/uart-baud/": { name: "UART-Baudratenfehler-Rechner", blurb: "MCU-Takt und Oversampling → Teiler (UBRR), tatsächliche Baudrate und Fehler in %, Empfängertoleranz, Tabelle der Standard-Baudraten." },
    "tools/modbus-rtu-tcp/": { name: "Modbus-RTU ↔ TCP-Telegrammumsetzer", blurb: "RTU (Adresse + CRC) ↔ TCP (MBAP: Transaktion, Länge, Unit-ID) ↔ ASCII (Doppelpunkt, LRC, CR LF). Anfragen und Antworten, farbig markierte Bytes, Unit-ID 0 und 255 an Gateways erklärt." },
    "tools/xgt-decoder/": { name: "LS XGT dediziertes Protokoll (FEnet) — Telegramm-Decoder", blurb: "Telegramme mit Header „LSIS-XGT“ → Header-Felder, BCC, Befehl, Variablen (%MW, %MX, %DB), Werte und Fehlercode. Antwort mit Anfrage entschlüsseln; Anfragen erstellen. Passt zum XGT-Modus von PLC Simulator (ab 0.10.0)." },
    "tools/cable-selection/": { name: "Kabelauswahl-Hilfe", blurb: "AC- und 24-V-DC-Versorgung, RS-485, RS-232, 4–20 mA, Thermoelemente und Pt100, Ethernet, Servo, Energieketten — Kabeltyp und Bedingungen je Anwendung; Querschnitt aus dem Spannungsfall, Längenprüfung für Kommunikation." },
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
