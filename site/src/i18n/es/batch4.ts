// Español — 4.º lote (herramientas web de comunicación, 11; scope.ts SCOPE4). Misma forma que la versión base ja/batch4.ts; la traducción parte de la versión inglesa (site/I18N.md «4차 묶음 붙이는 법»).
// webTools = nombre y resumen de cada herramienta, lib = textos de bibliotecas y scripts (frase en inglés → traducción), pages = textos de cada página
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
    "tools/ascii/": { name: "Tabla ASCII y caracteres de control", blurb: "0–127 en decimal, hex, binario y carácter, con nombre, notación ^ y uso de STX, ETX, ACK, NAK, CR y LF." },
    "tools/hex-ascii/": { name: "Conversor HEX ↔ ASCII", blurb: "Bytes a texto y texto a bytes. Caracteres de control como \\r \\n \\xNN." },
    "tools/integer/": { name: "Conversor de enteros y bases numéricas", blurb: "Hex, decimal, binario ↔ 8/16/32 bits, con signo (complemento a dos), BCD, código Gray y orden de bytes de registros." },
    "tools/modbus-blocks/": { name: "Planificador de peticiones de lectura Modbus", blurb: "Lista de direcciones → peticiones por código de función. Límite de 125 registros, hueco permitido, registros sin usar, ciclo y bytes RTU." },
    "tools/modbus-practice/": { name: "Ejercicios de Modbus (cuestionario)", blurb: "Preguntas automáticas para principiantes: HEX de una petición de lectura, valor de 40003 en una respuesta, excepción 83 02, orden de bytes del CRC, float ABCD frente a CDAB. Explicaciones, enlaces a guías y puntuación." },
    "tools/mqtt-decoder/": { name: "Decodificador de payload MQTT (Sparkplug B)", blurb: "HEX, Base64 o texto → JSON formateado, métricas Sparkplug B (nombre, alias, tipo, valor) y paquetes MQTT (cabecera, topic, QoS, ID de paquete)." },
    "tools/pcap-analyzer/": { name: "Analizador pcap industrial", blurb: "Captura de Wireshark o pktmon → pares petición/respuesta Modbus TCP y MC, tiempos de respuesta, respuestas que faltan, códigos de excepción y de fin. Solo en su navegador." },
    "tools/spi/": { name: "Ayudante de modos SPI (formas de onda CPOL/CPHA)", blurb: "Modo 0–3 → formas de onda de SCK, MOSI, MISO y CS con flancos de muestreo y desplazamiento, bits del byte (MSB/LSB primero), tiempo de transferencia y notación de cada fabricante (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Dibujo de formas de onda UART", blurb: "Texto o hex → forma de onda de inicio, datos (LSB primero), paridad y parada con niveles TTL o RS-232, tiempo de bit y de trama, ancho de pulso → baudios estándar." },
    "tools/web-serial/": { name: "Terminal serie web", blurb: "Abra un puerto COM en el navegador. Vista HEX/ASCII, checksum y fin de línea, guardado del registro." },
    "tools/logic-capture/": { name: "Decodificador de capturas de analizador lógico (UART, SPI, I2C, CAN)", blurb: "CSV de sigrok/PulseView, CSV de Saleae Logic 2 o VCD → elija canales y decodifique UART (detección de baudios), SPI modos 0–3, I2C dirección/ACK y CAN (relleno de bits, CRC); forma de onda, tabla y CSV. Solo en su navegador." },
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
