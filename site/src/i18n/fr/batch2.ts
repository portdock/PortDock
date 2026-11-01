// 프랑스어 — 2차 묶음(웹 도구 10개, scope.ts SCOPE2). 기준판 ja/batch2.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «2차 묶음 붙이는 법»).
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
    "tools/wiring/": { name: "Générateur de schémas de câblage", blurb: "RS-485 2 et 4 fils, RS-232 croisé, 4-20 mA 2, 3 et 4 fils, capteurs NPN/PNP, sorties relais — dessiné selon vos appareils et adresses, avec liste de contrôle, export SVG et PNG." },
    "tools/troubleshoot/": { name: "Guide de recherche de panne", blurb: "RS-485, RS-232, Modbus TCP, USB-série, 4–20 mA, capteurs NPN/PNP, protocole MC, déconnexions USB — oui/non jusqu’aux causes possibles, contrôles au multimètre et guides. Copie en texte." },
    "tools/multimeter-check/": { name: "Contrôle des mesures au multimètre", blurb: "Résistance A–B, tension au repos et mode commun en RS-485, 4–20 mA (NE 43), chute du 24 V, sortie NPN/PNP, TX RS-232, tension entre masses — saisissez la mesure, obtenez un verdict." },
    "tools/can-decoder/": { name: "Décodeur de trames CAN (J1939, CANopen)", blurb: "Lignes candump, ID DLC données ou bits bruts → ID standard/étendu, DLC (longueurs FD), retrait du bourrage et CRC15, PGN, adresses et SPN J1939, COB-ID, NMT et SDO CANopen." },
    "tools/can-bit-timing/": { name: "Calculateur de temporisation des bits CAN", blurb: "Horloge CAN, débit et point d’échantillonnage → prédiviseur, TQ, PROP, PHASE_SEG1/2, SJW et tolérance de l’oscillateur." },
    "tools/i2c/": { name: "Outils I2C (résistance de rappel, adresses, décodeur)", blurb: "VDD, capacité du bus et 100k/400k/1M → Rp min et max (UM10204), table des adresses 7 bits des circuits courants et conversion 8 bits, décodage de « S A0 A … P »." },
    "tools/uart-baud/": { name: "Calculateur d’erreur de débit UART", blurb: "Horloge du microcontrôleur et suréchantillonnage → diviseur (UBRR), débit réel et erreur en %, plage de tolérance du récepteur, table des débits standard." },
    "tools/modbus-rtu-tcp/": { name: "Convertisseur de trames Modbus RTU ↔ TCP", blurb: "RTU (adresse + CRC) ↔ TCP (MBAP : transaction, longueur, identifiant d’unité) ↔ ASCII (deux-points, LRC, CR LF). Requêtes et réponses, octets colorés, identifiants d’unité 0 et 255 des passerelles expliqués." },
    "tools/xgt-decoder/": { name: "Décodeur de trames protocole dédié LS XGT (FEnet)", blurb: "Trame à en-tête « LSIS-XGT » → champs de l’en-tête, BCC, instruction, variables (%MW, %MX, %DB), valeurs, code d’erreur. Réponse décodée avec sa requête, création de requêtes. À utiliser avec le mode XGT de PLC Simulator (à partir de 0.10.0)." },
    "tools/cable-selection/": { name: "Guide de choix des câbles", blurb: "Alimentation AC et 24 V DC, RS-485, RS-232, 4–20 mA, thermocouples et sondes à résistance, Ethernet, servos, chaînes porte-câbles — type de câble et conditions par usage, section d’après la chute de tension, contrôle des longueurs de communication." },
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
