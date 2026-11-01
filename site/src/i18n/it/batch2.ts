// 이탈리아어 — 2차 묶음(웹 도구 10개, scope.ts SCOPE2). 기준판 ja/batch2.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «2차 묶음 붙이는 법»).
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
    "tools/wiring/": { name: "Generatore di schemi di cablaggio", blurb: "RS-485 a 2 e 4 fili, RS-232 incrociato, 4-20 mA a 2, 3 e 4 fili, sensori NPN/PNP, uscite a relè — disegnati con i vostri dispositivi e indirizzi, con checklist, salvataggio SVG e PNG." },
    "tools/troubleshoot/": { name: "Guida alla ricerca guasti", blurb: "RS-485, RS-232, Modbus TCP, USB-seriale, 4–20 mA, sensori NPN/PNP, protocollo MC, disconnessioni USB — sì/no fino a cause possibili, verifiche con il multimetro e guide. Copia come testo." },
    "tools/multimeter-check/": { name: "Controllo delle letture del multimetro", blurb: "Resistenza A–B, tensione a riposo e di modo comune RS-485, 4–20 mA (NE 43), caduta dei 24 V, uscita NPN/PNP, TX RS-232, tensione tra le masse — inserite la lettura e ottenete un giudizio." },
    "tools/can-decoder/": { name: "Decodificatore di frame CAN (J1939, CANopen)", blurb: "Righe candump, ID DLC dati o bit grezzi → ID standard/esteso, DLC (lunghezze FD), rimozione dello stuffing e CRC15, PGN, indirizzi e SPN J1939, COB-ID, NMT e SDO CANopen." },
    "tools/can-bit-timing/": { name: "Calcolatore del bit timing CAN", blurb: "Clock CAN, bit rate e punto di campionamento → prescaler, TQ, PROP, PHASE_SEG1/2, SJW e tolleranza dell'oscillatore." },
    "tools/i2c/": { name: "Strumenti I2C (pull-up, indirizzi, decodificatore)", blurb: "VDD, capacità del bus e 100k/400k/1M → Rp minima e massima (UM10204), tabella degli indirizzi a 7 bit dei chip comuni e conversione a 8 bit, decodifica di «S A0 A … P»." },
    "tools/uart-baud/": { name: "Calcolatore dell'errore di baud rate UART", blurb: "Clock del microcontrollore e sovracampionamento → divisore (UBRR), baud rate reale ed errore %, campo di tolleranza del ricevitore, tabella dei baud rate standard." },
    "tools/modbus-rtu-tcp/": { name: "Convertitore di frame Modbus RTU ↔ TCP", blurb: "RTU (indirizzo + CRC) ↔ TCP (MBAP: transazione, lunghezza, Unit ID) ↔ ASCII (due punti, LRC, CR LF). Richieste e risposte, byte colorati, Unit ID 0 e 255 dei gateway spiegati." },
    "tools/xgt-decoder/": { name: "Decodificatore di frame del protocollo dedicato LS XGT (FEnet)", blurb: "Frame con intestazione «LSIS-XGT» → campi dell'intestazione, BCC, istruzione, variabili (%MW, %MX, %DB), valori, codice di errore. Risposta decodificata con la sua richiesta, creazione di richieste. Da usare con la modalità XGT di PLC Simulator (dalla 0.10.0)." },
    "tools/cable-selection/": { name: "Guida alla scelta dei cavi", blurb: "Alimentazione AC e 24 V DC, RS-485, RS-232, 4–20 mA, termocoppie e termoresistenze, Ethernet, servo, catene portacavi — tipo di cavo e condizioni per uso, sezione dalla caduta di tensione, verifica delle lunghezze di comunicazione." },
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
