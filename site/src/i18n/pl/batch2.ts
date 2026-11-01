// Polski — 2. pakiet (10 narzędzi online, scope.ts SCOPE2). Budowa jak w pakiecie wzorcowym ja/batch2.ts (site/I18N.md).
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
    "tools/wiring/": { name: "Kreator schematów połączeń", blurb: "RS-485 2/4-przewodowa, null-modem RS-232, 4-20 mA 2/3/4-przewodowe, czujniki NPN/PNP, wyjścia przekaźnikowe — rysowane dla Twoich urządzeń i adresów, z listą kontrolną, SVG/PNG." },
    "tools/troubleshoot/": { name: "Kreator diagnozy usterek", blurb: "RS-485, RS-232, Modbus TCP, USB-serial, 4–20 mA, czujniki NPN/PNP, protokół MC, zrywanie USB — zawężanie pytaniami tak/nie do możliwych przyczyn, pomiarów i poradników. Kopiowanie jako tekst." },
    "tools/multimeter-check/": { name: "Sprawdzanie odczytów multimetru", blurb: "RS-485 rezystancja A–B, napięcie spoczynkowe i współbieżne, 4–20 mA (NE 43), spadek 24 V, wyjście NPN/PNP, TX RS-232, różnica mas — wpisz odczyt, dostaniesz ocenę." },
    "tools/can-decoder/": { name: "Dekoder ramek CAN (J1939, CANopen)", blurb: "Wiersze candump, ID DLC dane lub surowe bity → ID standardowe/rozszerzone, DLC (długości FD), usuwanie bitów wypełnienia i CRC15, PGN, adresy i SPN J1939, COB-ID, NMT i SDO CANopen." },
    "tools/can-bit-timing/": { name: "Kalkulator czasu bitu CAN", blurb: "Zegar CAN, prędkość bitowa i punkt próbkowania → preskaler, TQ, PROP, PHASE_SEG1/2 i SJW, z tolerancją oscylatora." },
    "tools/i2c/": { name: "Narzędzia I2C (podciąganie, adresy, dekoder)", blurb: "VDD, pojemność magistrali i 100k/400k/1M → Rp min. i maks. (UM10204), tabela 7-bitowych adresów popularnych układów z przeliczeniem na 8 bitów, dekoder „S A0 A … P”." },
    "tools/uart-baud/": { name: "Kalkulator błędu prędkości UART", blurb: "Zegar MCU i nadpróbkowanie → dzielnik (UBRR), rzeczywista prędkość i błąd w %, tolerancja odbiornika, tabela standardowych prędkości." },
    "tools/modbus-rtu-tcp/": { name: "Konwerter ramek Modbus RTU ↔ TCP", blurb: "RTU (adres + CRC) ↔ TCP (MBAP: transakcja, długość, identyfikator jednostki) ↔ ASCII (dwukropek, LRC, CR LF). Zapytania i odpowiedzi, bajty w kolorach, objaśnione identyfikatory 0 i 255 w bramkach." },
    "tools/xgt-decoder/": { name: "Dekoder ramek protokołu dedykowanego LS XGT (FEnet)", blurb: "Ramki z nagłówkiem „LSIS-XGT” → pola nagłówka, BCC, instrukcja, zmienne (%MW, %MX, %DB), wartości i kod błędu. Odpowiedź z zapytaniem; tworzenie zapytań. Pasuje do trybu XGT w PLC Simulator (od 0.10.0)." },
    "tools/cable-selection/": { name: "Dobór kabli", blurb: "Zasilanie AC i 24 V DC, RS-485, RS-232, 4–20 mA, termopary i Pt100, Ethernet, serwo, prowadniki kablowe — typ kabla i warunki według zastosowania; przekrój ze spadku napięcia, długość łączy." },
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
