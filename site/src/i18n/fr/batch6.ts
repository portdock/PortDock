// Français — 6e lot (15 outils web d’électricité, scope.ts SCOPE6). Structure comme la version de référence ja/batch6.ts (site/I18N.md «6차 묶음 붙이는 법»), source : version anglaise.
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
    "tools/awg-mm2/": { name: "Table de conversion AWG ↔ mm²", blurb: "Diamètre et section de l’AWG 0000 à 40 (formule ASTM B258), section métrique la plus proche (IEC 60228), cuivre en Ω/km. Conversion dans les deux sens." },
    "tools/conduit-fill/": { name: "Calculateur de remplissage de conduits et goulottes", blurb: "Diamètre extérieur et nombre de fils → taux de remplissage en %. Comparaison avec NEC conduit 53/31/40 %, chemin de câbles 20 %, goulotte d’armoire NFPA 79 50 % ; diamètre intérieur minimal et nombre maximal de fils." },
    "tools/ct-ratio/": { name: "Calculateur de rapport et de charge de TC", blurb: "Courant primaire ↔ secondaire par le rapport du TC, fils aller-retour plus VA du compteur → charge totale (VA, Ω) face au calibre, facteur de correction du rapport." },
    "tools/energy-pulse/": { name: "Calculateur d’impulsions de compteur d’énergie", blurb: "imp/kWh, intervalle ou nombre d’impulsions → kW et kWh, multiplicateur TC/TT, fréquence et largeur d’impulsion à pleine charge." },
    "tools/heater-power/": { name: "Calculateur de puissance de chauffage (kW, ampères)", blurb: "Masse, chaleur massique, élévation de température et durée → kW de chauffe, kW pour un fluide en circulation, courant mono et triphasé, puissance sous une autre tension." },
    "tools/led-resistor/": { name: "Calculateur de résistance pour LED", blurb: "Alimentation, Vf, courant et LED en série → résistance et puissance, courant avec une valeur E12/E24. Voyants 5, 12, 24 V." },
    "tools/motor-current/": { name: "Calculateur de courant de moteur", blurb: "kW (HP) en triphasé, monophasé ou continu → ampères, puissance absorbée, kVA, couple. Rendement de la plaque signalétique." },
    "tools/motor-speed/": { name: "Fréquence du variateur ↔ vitesse du moteur", blurb: "Hz et pôles → vitesse synchrone, glissement de la plaque, vitesse en sortie de réducteur, Hz pour une vitesse cible." },
    "tools/parallel-resistor/": { name: "Calculateur de résistances en série et en parallèle", blurb: "Totaux en série et en parallèle, partage du courant, résistance complémentaire pour une valeur cible et paires E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Calculateur de condensateur de compensation du facteur de puissance", blurb: "kW, facteur de puissance actuel et cible → kvar nécessaires, µF par condensateur en triangle ou en étoile, courant avant et après." },
    "tools/power-supply-sizing/": { name: "Calculateur de dimensionnement d’alimentation 24 V DC", blurb: "Courant, appel de courant et facteur de marche d’automates, IHM, capteurs, vannes et bobines de relais → total, calibre avec marge (tailles courantes), contrôle de l’appel de courant, voies de protection." },
    "tools/pump-fan-affinity/": { name: "Calculateur vitesse et puissance de pompes et ventilateurs", blurb: "Fréquence du variateur → débit, pression et puissance (lois de similitude), différence d’énergie annuelle, fréquence pour un débit cible." },
    "tools/reactance/": { name: "Calculateur de réactance et de résonance LC", blurb: "Xc et XL à une fréquence, C ou L pour un X cible, fréquence de résonance et impédance LC, courant du condensateur et kvar." },
    "tools/three-phase-power/": { name: "Calculateur de puissance triphasée", blurb: "Tension plus ampères, kW ou kVA et facteur de puissance → kVA, kW, kvar et courant ; facteur de puissance à partir de kW et kVA." },
    "tools/voltage-drop/": { name: "Calculateur de chute de tension et de section de câble", blurb: "Continu, monophasé et triphasé, mm² ou AWG, cuivre ou aluminium → chute et %, section et longueur pour une chute admissible." },
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
