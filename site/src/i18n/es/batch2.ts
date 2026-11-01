// 스페인어 — 2차 묶음(웹 도구 10개, scope.ts SCOPE2). 기준판 ja/batch2.ts 와 같은 모양, 번역 원천은 영어판(site/I18N.md «2차 묶음 붙이는 법»).
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
    "tools/wiring/": { name: "Generador de diagramas de cableado", blurb: "RS-485 a 2/4 hilos, null modem RS-232, 4-20 mA a 2/3/4 hilos, sensores NPN/PNP, salidas de relé: dibujado para sus equipos y direcciones, con lista de comprobación, SVG/PNG." },
    "tools/troubleshoot/": { name: "Asistente de diagnóstico de averías", blurb: "RS-485, RS-232, Modbus TCP, USB-serie, 4–20 mA, sensores NPN/PNP, protocolo MC, cortes de USB: acote con sí/no hasta las causas posibles, comprobaciones con multímetro y guías. Copia como texto." },
    "tools/multimeter-check/": { name: "Comprobador de lecturas del multímetro", blurb: "Resistencia A–B de RS-485, tensión en reposo y de modo común, 4–20 mA (NE 43), caída de 24 V, salida NPN/PNP, TX de RS-232, diferencia de tierras: introduzca la lectura y obtenga una valoración." },
    "tools/can-decoder/": { name: "Decodificador de tramas CAN (J1939, CANopen)", blurb: "Líneas de candump, «ID DLC datos» o bits en bruto → ID estándar/extendido, DLC (longitudes FD), bits de relleno y CRC15, PGN, direcciones y SPN J1939, COB-ID, NMT y SDO CANopen." },
    "tools/can-bit-timing/": { name: "Calculadora de temporización de bit CAN", blurb: "Reloj CAN, velocidad y punto de muestreo → preescalador, TQ, PROP, PHASE_SEG1/2 y SJW, con la tolerancia del oscilador." },
    "tools/i2c/": { name: "Herramientas I2C (pull-up, direcciones, decodificador)", blurb: "VDD, capacidad del bus y 100k/400k/1M → pull-up Rp mínima y máxima (UM10204), tabla de direcciones de 7 bits de chips habituales con conversión a 8 bits, decodificador «S A0 A … P»." },
    "tools/uart-baud/": { name: "Calculadora de error de baudios UART", blurb: "Reloj del microcontrolador y sobremuestreo → divisor (UBRR), velocidad real y error %, tolerancia del receptor, tabla de velocidades estándar." },
    "tools/modbus-rtu-tcp/": { name: "Conversor de tramas Modbus RTU ↔ TCP", blurb: "RTU (dirección + CRC) ↔ TCP (MBAP: transacción, longitud, identificador de unidad) ↔ ASCII (dos puntos, LRC, CR LF). Peticiones y respuestas, bytes por colores, identificador de unidad 0 y 255 en pasarelas." },
    "tools/xgt-decoder/": { name: "Decodificador de tramas del protocolo dedicado LS XGT (FEnet)", blurb: "Tramas con cabecera «LSIS-XGT» → campos de cabecera, BCC, instrucción, variables (%MW, %MX, %DB), valores y código de error. Empareja respuesta y petición; crea peticiones. Va con el modo XGT de PLC Simulator (desde 0.10.0)." },
    "tools/cable-selection/": { name: "Guía de selección de cables", blurb: "Alimentación de CA y 24 V CC, RS-485, RS-232, 4–20 mA, termopares y RTD, Ethernet, servo, cadenas portacables: tipo de cable y condiciones por uso; sección por caída de tensión, longitudes de comunicación." },
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
