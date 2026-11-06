// 프랑스어 — 4차 묶음(통신 웹 도구 9개, scope.ts SCOPE4). 기준판 ja/batch4.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «4차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
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
    "tools/ascii/": { name: "Table ASCII et caractères de contrôle", blurb: "0 à 127 en décimal, hexadécimal, binaire et caractère, avec le nom, la notation caret et l’usage de STX, ETX, ACK, NAK, CR et LF." },
    "tools/hex-ascii/": { name: "Convertisseur HEX ↔ ASCII", blurb: "Des octets au texte et retour. Caractères de contrôle affichés en \\r \\n \\xNN." },
    "tools/integer/": { name: "Convertisseur d’entiers et de bases", blurb: "Hexadécimal, décimal, binaire ↔ 8/16/32 bits, signé (complément à deux), BCD, code Gray, ordre des octets des registres." },
    "tools/modbus-blocks/": { name: "Regroupement des requêtes de lecture Modbus", blurb: "Liste d’adresses → requêtes par code fonction. Limite de 125 registres, écart toléré, registres inutilisés, durée de cycle RTU et octets." },
    "tools/modbus-practice/": { name: "Exercices Modbus (quiz)", blurb: "Exercices générés pour débutants — HEX d’une requête de lecture, valeur de 40003 dans une réponse, exception 83 02, ordre des octets du CRC, float ABCD ou CDAB. Explications, liens vers les guides, score." },
    "tools/mqtt-decoder/": { name: "Décodeur de payload MQTT (Sparkplug B)", blurb: "HEX, Base64 ou texte → JSON mis en forme, métriques Sparkplug B (nom, alias, type, valeur), paquets MQTT bruts (en-tête, topic, QoS, identifiant de paquet)." },
    "tools/spi/": { name: "Aide aux modes SPI (chronogrammes CPOL/CPHA)", blurb: "Mode 0 à 3 → chronogrammes SCK, MOSI, MISO et CS avec fronts d’échantillonnage et de décalage, bits de l’octet (MSB/LSB en premier), durée de transfert, notations des fabricants (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Tracé de trame UART", blurb: "Texte ou hex → chronogramme start, données (LSB en premier), parité et stop aux niveaux TTL ou RS-232, durée de bit et de trame, largeur d’impulsion → débit standard." },
    "tools/web-serial/": { name: "Terminal série Web", blurb: "Ouvrir un port COM dans le navigateur. Affichage HEX/ASCII, somme de contrôle et fin de ligne, enregistrement du journal." },
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
