// 스페인어 — 3차 묶음(PC 하드웨어 테스트 웹 도구 10개, scope.ts SCOPE3). 기준판 ja/batch3.ts 와 같은 모양, 번역 원천은 영어판(site/I18N.md «3차 묶음 붙이는 법»).
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
    "tools/mic-test/": { name: "Prueba de micrófono", blurb: "Medidor de nivel de entrada, frecuencia de muestreo real, ruido de fondo, saturación, comparación con y sin cancelación de eco y grabación local de 5 s." },
    "tools/keyboard-test/": { name: "Prueba de teclado (rebote y rollover)", blurb: "Teclas pulsadas sobre distribución ANSI, ISO o coreana 106, pulsaciones simultáneas, recuento por tecla, sospechas de rebote (ms) y teclas que el navegador no recibe." },
    "tools/webcam-test/": { name: "Prueba de cámara web", blurb: "Vista previa, resolución pedida frente a la real, FPS medidos y cambio de cámara. El vídeo no se guarda ni se envía." },
    "tools/speaker-test/": { name: "Prueba de altavoces izquierdo y derecho", blurb: "Izquierda, derecha o ambos, sonido por canal en 5.1 y 7.1, comprobación de fase (polaridad), barrido de frecuencias y tono, elección de salida." },
    "tools/mouse-test/": { name: "Prueba de doble clic del ratón", blurb: "Cinco botones y cuatro direcciones de rueda, intervalo de doble clic en ms, sospechas de rebote, cortes de arrastre y estimación del polling rate." },
    "tools/gamepad-test/": { name: "Prueba de mando (drift del joystick y zona muerta)", blurb: "Botones, gatillos y ejes en directo, desviación y trazo del joystick al soltarlo, vista previa de la zona muerta y vibración (navegadores compatibles)." },
    "tools/monitor-test/": { name: "Prueba de píxeles muertos y frecuencia de actualización", blurb: "Colores lisos a pantalla completa para píxeles muertos o atascados, banding en degradados, estimación de los Hz y barra móvil para ver el ghosting." },
    "tools/bsod-codes/": { name: "Códigos de error de pantalla azul (BSOD)", blurb: "Pegue un código como 0xD1 o 0x133, su nombre o un mensaje del evento 1001: significado, causas posibles, qué revisar en orden y documentación de Microsoft." },
    "tools/battery-report/": { name: "Lector del informe de batería del portátil", blurb: "Suelte el HTML de powercfg /batteryreport: porcentaje restante frente a la capacidad de diseño, ciclos y gráfica del historial. Todo dentro del navegador." },
    "tools/barcode-scanner-test/": { name: "Prueba de lector de códigos de barras", blurb: "Caracteres leídos con Enter, Tab y GS visibles, ms entre caracteres (lector o tecleo), distribución de teclado, Caps Lock y análisis de AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Privacidad: la imagen de la cámara y el sonido del micrófono solo se procesan dentro de este navegador y nunca se guardan ni se suben; ni los datos ni los nombres de los dispositivos se envían a ningún sitio.",
    input: "Privacidad: las teclas, botones y movimientos solo se cuentan dentro de este navegador y no se envían a ningún sitio.",
    output: "Privacidad: esta herramienta solo produce imagen o sonido y no envía nada de la prueba a ningún sitio.",
    ads: [" Los anuncios de esta página (Google AdSense) funcionan aparte; consulte la ", "política de privacidad", "."],
    tester: ["Para registrar a lo largo del tiempo las caídas de Wi-Fi e internet o las conexiones y desconexiones de Bluetooth, use el programa para Windows ", " (gratuito)."],
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
