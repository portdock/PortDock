// Italiano — 6º lotto (strumenti web elettrici, 15; scope.ts SCOPE6). Stessa forma della versione base ja/batch6.ts; la traduzione parte dalla versione inglese (site/I18N.md «6차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page6Id, Scope6Path } from "../scope.ts";
import awgMm2 from "./pages/awgMm2.ts";
import conduitFill from "./pages/conduitFill.ts";
import ctRatio from "./pages/ctRatio.ts";
import energyPulse from "./pages/energyPulse.ts";
import heater from "./pages/heater.ts";
import ledResistor from "./pages/ledResistor.ts";
import motorCurrent from "./pages/motorCurrent.ts";
import motorSpeed from "./pages/motorSpeed.ts";
import resistor from "./pages/resistor.ts";
import pfCapacitor from "./pages/pfCapacitor.ts";
import psuSizing from "./pages/psuSizing.ts";
import affinity from "./pages/affinity.ts";
import reactance from "./pages/reactance.ts";
import power from "./pages/power.ts";
import voltageDrop from "./pages/voltageDrop.ts";
import libConduitFill from "./lib/conduitFill.ts";
import libCtRatio from "./lib/ctRatio.ts";
import libEnergyPulse from "./lib/energyPulse.ts";
import libHeater from "./lib/heater.ts";
import libLedResistor from "./lib/ledResistor.ts";
import libMotorCurrent from "./lib/motorCurrent.ts";
import libMotorSpeed from "./lib/motorSpeed.ts";
import libResistor from "./lib/resistor.ts";
import libPfCapacitor from "./lib/pfCapacitor.ts";
import libPsuSizing from "./lib/psuSizing.ts";
import libAffinity from "./lib/affinity.ts";
import libReactance from "./lib/reactance.ts";
import libPower from "./lib/power.ts";
import libVoltageDrop from "./lib/voltageDrop.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/awg-mm2/": { name: "Tabella di conversione AWG in mm²", blurb: "Diametro e area da AWG 0000 a 40 (formula ASTM B258), sezione metrica più vicina (IEC 60228), Ω/km del rame. Converte in entrambe le direzioni." },
    "tools/conduit-fill/": { name: "Calcolatore di riempimento di tubi e canaline", blurb: "Diametro esterno e numero di cavi → % di riempimento. Confronto con NEC tubo 53/31/40 %, canale 20 %, canalina da quadro NFPA 79 50 %; diametro interno minimo e numero massimo di cavi." },
    "tools/ct-ratio/": { name: "Calcolatore di rapporto e carico del TA", blurb: "Corrente primaria ↔ secondaria dal rapporto del TA, cavi di andata e ritorno + VA dello strumento → carico totale (VA, Ω) rispetto al nominale, fattore di correzione del rapporto." },
    "tools/energy-pulse/": { name: "Calcolatore di impulsi del contatore di energia", blurb: "imp/kWh, intervallo o numero di impulsi → kW e kWh, moltiplicatore TA/TV, frequenza e larghezza degli impulsi a pieno carico." },
    "tools/heater-power/": { name: "Calcolatore di potenza di riscaldatori (kW, ampere)", blurb: "Massa, calore specifico, aumento di temperatura e tempo → kW del riscaldatore, kW per fluidi in circolazione, ampere monofase e trifase e potenza ad altre tensioni." },
    "tools/led-resistor/": { name: "Calcolatore della resistenza per LED", blurb: "Alimentazione, Vf, corrente e LED in serie → resistenza e potenza, corrente con un valore E12/E24. Indicatori a 5, 12, 24 V." },
    "tools/motor-current/": { name: "Calcolatore della corrente del motore", blurb: "kW (HP) trifase, monofase o CC → ampere, potenza assorbita, kVA, coppia. Rendimento da targa." },
    "tools/motor-speed/": { name: "Frequenza dell'inverter ↔ giri del motore", blurb: "Hz e poli → velocità di sincronismo, scorrimento da targa, uscita del riduttore, Hz per un numero di giri obiettivo." },
    "tools/parallel-resistor/": { name: "Calcolatore di resistenze in parallelo e in serie", blurb: "Totali in serie e in parallelo, ripartizione della corrente, la resistenza complementare per un valore obiettivo e coppie E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Calcolatore dei condensatori di rifasamento", blurb: "kW, fattore di potenza attuale e obiettivo → kvar necessari, µF per condensatore a triangolo o stella, corrente prima e dopo." },
    "tools/power-supply-sizing/": { name: "Calcolatore di dimensionamento dell'alimentatore a 24 V CC", blurb: "Corrente, spunto e fattore di utilizzo di PLC, HMI, sensori, valvole e bobine di relè → totale, taglia con margine (taglie comuni), verifica dello spunto e canali del protettore di circuito." },
    "tools/pump-fan-affinity/": { name: "Calcolatore di velocità e potenza di pompe e ventilatori", blurb: "Frequenza dell'inverter → portata, pressione e potenza (leggi di affinità), differenza di energia annua, frequenza per una portata obiettivo." },
    "tools/reactance/": { name: "Calcolatore di reattanza e risonanza LC", blurb: "Xc e XL a una frequenza, C o L per una X obiettivo, frequenza e impedenza di risonanza LC, corrente e kvar del condensatore." },
    "tools/three-phase-power/": { name: "Calcolatore di potenza trifase", blurb: "Tensione più ampere, kW o kVA e fattore di potenza → kVA, kW, kvar e ampere; fattore di potenza da kW e kVA." },
    "tools/voltage-drop/": { name: "Calcolatore di caduta di tensione e sezione del cavo", blurb: "CC, monofase e trifase, mm² o AWG, rame o alluminio → caduta e %, sezione e lunghezza per una caduta ammessa." },
  } satisfies Record<Scope6Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다 — conduitFill 은 서버에서만 그린다) */
  lib: {
    conduitFill: libConduitFill,
    ctRatio: libCtRatio,
    energyPulse: libEnergyPulse,
    heater: libHeater,
    ledResistor: libLedResistor,
    motorCurrent: libMotorCurrent,
    motorSpeed: libMotorSpeed,
    resistor: libResistor,
    pfCapacitor: libPfCapacitor,
    psuSizing: libPsuSizing,
    affinity: libAffinity,
    reactance: libReactance,
    power: libPower,
    voltageDrop: libVoltageDrop,
  },

  /** 쪽 글 */
  pages: { awgMm2, conduitFill, ctRatio, energyPulse, heater, ledResistor, motorCurrent, motorSpeed, resistor, pfCapacitor, psuSizing, affinity, reactance, power, voltageDrop } satisfies Record<Page6Id, unknown>,
};
