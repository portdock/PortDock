// Português (Brasil) — 4º lote (ferramentas web de comunicação, 11; scope.ts SCOPE4). Mesmo formato da versão base ja/batch4.ts; a tradução parte da versão em inglês (site/I18N.md «4차 묶음 붙이는 법»).
// webTools = nome e resumo de cada ferramenta, lib = textos de bibliotecas e scripts (frase em inglês → tradução), pages = textos de cada página
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/ascii/": { name: "Tabela ASCII e caracteres de controle", blurb: "0–127 em decimal, hex, binário e caractere, com nome, notação ^ e uso de STX, ETX, ACK, NAK, CR e LF." },
    "tools/hex-ascii/": { name: "Conversor HEX ↔ ASCII", blurb: "Bytes para texto e texto para bytes. Caracteres de controle como \\r \\n \\xNN." },
    "tools/integer/": { name: "Conversor de inteiros e bases numéricas", blurb: "Hex, decimal, binário ↔ 8/16/32 bits, com sinal (complemento de dois), BCD, código Gray e ordem dos bytes de registradores." },
    "tools/modbus-blocks/": { name: "Planejador de requisições de leitura Modbus", blurb: "Lista de endereços → requisições por código de função. Limite de 125 registradores, intervalo permitido, registradores não usados, ciclo e bytes RTU." },
    "tools/modbus-practice/": { name: "Exercícios de Modbus (quiz)", blurb: "Questões automáticas para iniciantes — HEX de uma requisição de leitura, valor de 40003 numa resposta, exceção 83 02, ordem dos bytes do CRC, float ABCD vs. CDAB. Explicações, links para guias e pontuação." },
    "tools/mqtt-decoder/": { name: "Decodificador de payload MQTT (Sparkplug B)", blurb: "HEX, Base64 ou texto → JSON formatado, métricas Sparkplug B (nome, alias, tipo, valor) e pacotes MQTT (cabeçalho, tópico, QoS, ID do pacote)." },
    "tools/spi/": { name: "Assistente de modos SPI (formas de onda CPOL/CPHA)", blurb: "Modo 0–3 → formas de onda de SCK, MOSI, MISO e CS com bordas de amostragem e deslocamento, bits do byte (MSB/LSB primeiro), tempo de transferência e notação de cada fabricante (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Desenho de formas de onda UART", blurb: "Texto ou hex → forma de onda de start, dados (LSB primeiro), paridade e stop em níveis TTL ou RS-232, tempo de bit e de quadro, largura de pulso → baud rate padrão." },
    "tools/web-serial/": { name: "Terminal serial web", blurb: "Abra uma porta COM no navegador. Visão HEX/ASCII, checksum e fim de linha, log salvo em arquivo." },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
  },

  /** 쪽 글 */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, spi, uartWaveform, webSerial } satisfies Record<Page4Id, unknown>,
};
