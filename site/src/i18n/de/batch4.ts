// Deutsch — 4. Paket (11 Kommunikations-Web-Tools, scope.ts SCOPE4). Aufbau wie das Referenzpaket ja/batch4.ts (site/I18N.md «4차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import pcapAnalyzer from "./pages/pcapAnalyzer.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import logicCapture from "./pages/logicCapture.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libPcap from "./lib/pcap.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";
import libLogic from "./lib/logic.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/ascii/": { name: "ASCII-Tabelle (Steuerzeichen)", blurb: "0–127 dezimal, hex, binär und als Zeichen; Namen, Caret-Schreibweise und Verwendung von STX, ETX, ACK, NAK, CR und LF." },
    "tools/hex-ascii/": { name: "HEX ↔ ASCII-Umrechner", blurb: "Bytes in Text, Text in Bytes. Steuerzeichen als \\r \\n \\xNN." },
    "tools/integer/": { name: "Ganzzahl- und Zahlensystem-Umrechner", blurb: "Hex, dezimal, binär ↔ 8/16/32 Bit, mit Vorzeichen (Zweierkomplement), BCD, Gray-Code, Bytefolge der Register." },
    "tools/modbus-blocks/": { name: "Modbus-Leseanfragen bündeln", blurb: "Adressliste → Anfragen je Funktionscode. 125-Register-Grenze, erlaubte Lücke, ungenutzte Register, RTU-Pollzyklus und Bytes." },
    "tools/modbus-practice/": { name: "Modbus-Übung (Quiz)", blurb: "Automatische Aufgaben für Einsteiger — HEX einer Leseanfrage, Wert von 40003 in einer Antwort, Exception 83 02, CRC-Bytefolge, Float ABCD und CDAB. Mit Erklärung, Leitfaden-Links und Punktestand." },
    "tools/mqtt-decoder/": { name: "MQTT-Payload-Decoder (Sparkplug B)", blurb: "HEX, Base64 oder Text → formatiertes JSON, Sparkplug-B-Metriken (Name, Alias, Typ, Wert), rohe MQTT-Pakete (Header, Topic, QoS, Paket-ID)." },
    "tools/pcap-analyzer/": { name: "Industrie-pcap-Analyzer", blurb: "Mitschnitte aus Wireshark oder pktmon → Anfrage-Antwort-Paare von Modbus TCP und MC, Antwortzeiten, fehlende Antworten, Exception- und Endcodes. Nur im Browser." },
    "tools/spi/": { name: "SPI-Modus-Helfer (CPOL/CPHA-Signalverlauf)", blurb: "Modus 0–3 → Verlauf von SCK, MOSI, MISO und CS mit Abtast- und Schiebeflanken, Bits eines Bytes (MSB/LSB zuerst), Übertragungszeit, Herstellerbezeichnungen (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "UART-Signalverlauf zeichnen", blurb: "Text oder HEX → Start, Daten (LSB zuerst), Parität und Stopp als TTL- oder RS-232-Pegel, Bit- und Rahmenzeit, Pulsbreite → Standard-Baudrate." },
    "tools/web-serial/": { name: "Web-Serial-Terminal", blurb: "COM-Port im Browser öffnen. HEX-/ASCII-Ansicht, Prüfsumme und Zeilenende anhängen, Protokoll speichern." },
    "tools/logic-capture/": { name: "Logikanalysator-Mitschnitt decodieren (UART, SPI, I2C, CAN)", blurb: "CSV von sigrok/PulseView oder Saleae Logic 2, VCD → Kanäle wählen und UART (Baudraten-Erkennung), SPI-Modus 0–3, I2C mit Adresse/ACK, CAN (Stuffing, CRC) decodieren. Signalverlauf, Tabelle, CSV. Nur im Browser." },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    pcap: libPcap,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
    logic: libLogic,
  },

  /** 쪽 글 */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, pcapAnalyzer, spi, uartWaveform, webSerial, logicCapture } satisfies Record<Page4Id, unknown>,
};
