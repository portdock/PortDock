// Polski — 4. pakiet (11 narzędzi komunikacyjnych, scope.ts SCOPE4). Budowa jak w pakiecie wzorcowym ja/batch4.ts (site/I18N.md «4차 묶음 붙이는 법»).
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
    "tools/ascii/": { name: "Tabela ASCII i znaki sterujące", blurb: "0–127 dziesiętnie, hex, binarnie i jako znak; nazwy, zapis z daszkiem i zastosowania STX, ETX, ACK, NAK, CR i LF." },
    "tools/hex-ascii/": { name: "Konwerter HEX ↔ ASCII", blurb: "Bajty na tekst, tekst na bajty. Znaki sterujące jako \\r \\n \\xNN." },
    "tools/integer/": { name: "Konwerter liczb całkowitych i systemów liczbowych", blurb: "Hex, dziesiętnie, binarnie ↔ 8/16/32 bity, ze znakiem (kod U2), BCD, kod Graya, kolejność bajtów rejestrów." },
    "tools/modbus-blocks/": { name: "Grupowanie zapytań odczytu Modbus", blurb: "Lista adresów → zapytania według kodu funkcji. Limit 125 rejestrów, dozwolona przerwa, nieużywane rejestry, czas cyklu RTU i bajty." },
    "tools/modbus-practice/": { name: "Ćwiczenia Modbus (quiz)", blurb: "Automatyczne zadania dla początkujących — HEX zapytania odczytu, wartość 40003 w odpowiedzi, wyjątek 83 02, kolejność bajtów CRC, float ABCD i CDAB. Z objaśnieniami, linkami do poradników i wynikiem." },
    "tools/mqtt-decoder/": { name: "Dekoder ładunku MQTT (Sparkplug B)", blurb: "HEX, Base64 lub tekst → sformatowany JSON, metryki Sparkplug B (nazwa, alias, typ, wartość), surowe pakiety MQTT (nagłówek, temat, QoS, ID pakietu)." },
    "tools/pcap-analyzer/": { name: "Analizator pcap komunikacji przemysłowej", blurb: "Przechwycenia z Wiresharka lub pktmon → pary zapytanie–odpowiedź Modbus TCP i MC, czasy odpowiedzi, brak odpowiedzi, kody wyjątków i zakończenia. Tylko w przeglądarce." },
    "tools/spi/": { name: "Pomocnik trybów SPI (przebiegi CPOL/CPHA)", blurb: "Tryb 0–3 → przebiegi SCK, MOSI, MISO i CS ze zboczami próbkowania i przesuwania, bity bajtu (MSB/LSB pierwszy), czas transmisji, oznaczenia producentów (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Rysowanie przebiegu UART", blurb: "Tekst lub HEX → start, dane (od LSB), parzystość i stop w poziomach TTL lub RS-232, czas bitu i ramki, szerokość impulsu → standardowa prędkość." },
    "tools/web-serial/": { name: "Terminal szeregowy w przeglądarce (Web Serial)", blurb: "Otwórz port COM w przeglądarce. Widok HEX/ASCII, dołączanie sumy kontrolnej i końca wiersza, zapis logu." },
    "tools/logic-capture/": { name: "Dekoder przechwyceń analizatora logicznego (UART, SPI, I2C, CAN)", blurb: "CSV z sigrok/PulseView lub Saleae Logic 2, VCD → wybierz kanały i zdekoduj UART (wykrywanie prędkości), SPI tryby 0–3, I2C z adresem/ACK, CAN (stuffing, CRC). Przebieg, tabela, CSV. Tylko w przeglądarce." },
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
