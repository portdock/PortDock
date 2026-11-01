// 이탈리아어 — 4차 묶음(통신 웹 도구 11개, scope.ts SCOPE4). 기준판 ja/batch4.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «4차 묶음 붙이는 법»).
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
    "tools/ascii/": { name: "Tabella ASCII e caratteri di controllo", blurb: "Da 0 a 127 in decimale, esadecimale, binario e carattere, con nome, notazione caret e uso di STX, ETX, ACK, NAK, CR e LF." },
    "tools/hex-ascii/": { name: "Convertitore HEX ↔ ASCII", blurb: "Da byte a testo e viceversa. Caratteri di controllo mostrati come \\r \\n \\xNN." },
    "tools/integer/": { name: "Convertitore di interi e basi numeriche", blurb: "Esadecimale, decimale, binario ↔ 8/16/32 bit, con segno (complemento a due), BCD, codice Gray, ordine dei byte dei registri." },
    "tools/modbus-blocks/": { name: "Raggruppamento delle richieste di lettura Modbus", blurb: "Elenco di indirizzi → richieste per codice funzione. Limite di 125 registri, buco ammesso, registri inutilizzati, tempo di ciclo RTU e byte." },
    "tools/modbus-practice/": { name: "Esercizi Modbus (quiz)", blurb: "Esercizi generati per principianti — HEX di una richiesta di lettura, valore di 40003 in una risposta, eccezione 83 02, ordine dei byte del CRC, float ABCD o CDAB. Spiegazioni, link alle guide, punteggio." },
    "tools/mqtt-decoder/": { name: "Decodificatore di payload MQTT (Sparkplug B)", blurb: "HEX, Base64 o testo → JSON formattato, metriche Sparkplug B (nome, alias, tipo, valore), pacchetti MQTT grezzi (header, topic, QoS, packet ID)." },
    "tools/pcap-analyzer/": { name: "Analizzatore pcap Modbus TCP e MC", blurb: "Cattura Wireshark o pktmon → coppie richiesta/risposta Modbus TCP e MC, tempi di risposta, risposte mancanti, codici di eccezione e di fine. Solo nel browser." },
    "tools/spi/": { name: "Aiuto modalità SPI (forme d'onda CPOL/CPHA)", blurb: "Modalità 0–3 → forme d'onda SCK, MOSI, MISO e CS con fronti di campionamento e di shift, bit del byte (MSB/LSB first), tempo di trasferimento, notazioni dei produttori (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Disegno forma d'onda UART", blurb: "Testo o hex → forma d'onda di start, dati (LSB per primo), parità e stop ai livelli TTL o RS-232, tempo di bit e di frame, larghezza d'impulso → baud rate standard." },
    "tools/web-serial/": { name: "Terminale seriale Web", blurb: "Aprire una porta COM nel browser. Vista HEX/ASCII, checksum e fine riga, salvataggio del log." },
    "tools/logic-capture/": { name: "Decodificatore di catture da analizzatore logico (UART, SPI, I2C, CAN)", blurb: "CSV sigrok/PulseView, CSV Saleae Logic 2 o VCD → scelta dei canali e decodifica UART (rilevamento del baud rate), SPI modalità 0–3, I2C indirizzo/ACK, CAN (bit stuffing, CRC); mini forma d'onda, tabella, CSV. Solo nel browser." },
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
