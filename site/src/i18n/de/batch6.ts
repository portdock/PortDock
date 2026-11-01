// Deutsch — 6. Paket (15 Web-Tools für Elektrik, scope.ts SCOPE6). Aufbau wie das Referenzpaket ja/batch6.ts (site/I18N.md «6차 묶음 붙이는 법»), Quelle ist die englische Fassung.
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
    "tools/awg-mm2/": { name: "AWG-mm²-Umrechnungstabelle", blurb: "Durchmesser und Querschnitt von AWG 0000 bis 40 (Formel nach ASTM B258), nächste metrische Größe (IEC 60228), Kupfer in Ω/km. In beide Richtungen umrechnen." },
    "tools/conduit-fill/": { name: "Füllgrad-Rechner für Rohre und Kanäle", blurb: "Außendurchmesser und Anzahl der Leitungen → Füllgrad in %. Vergleich mit NEC-Rohr 53/31/40 %, Wireway 20 %, Schaltschrankkanal NFPA 79 50 %; kleinster Innendurchmesser und größte Anzahl." },
    "tools/ct-ratio/": { name: "Stromwandler-Übersetzung und Bürde berechnen", blurb: "Primär- ↔ Sekundärstrom über die Wandlerübersetzung, Hin- und Rückleitung plus Zähler-VA → Gesamtbürde (VA, Ω) gegen den Nennwert, Korrekturfaktor des Übersetzungsfehlers." },
    "tools/energy-pulse/": { name: "Impulsrechner für Energiezähler", blurb: "imp/kWh, Impulsabstand oder Impulszahl → kW und kWh, Multiplikator aus Strom- und Spannungswandler, Impulsrate und -breite bei Volllast." },
    "tools/heater-power/": { name: "Heizleistung berechnen (kW, Ampere)", blurb: "Masse, spezifische Wärme, Temperaturanstieg und Zeit → Heizleistung in kW, kW für strömende Medien, Strom ein- und dreiphasig, Leistung bei anderen Spannungen." },
    "tools/led-resistor/": { name: "LED-Vorwiderstand berechnen", blurb: "Versorgung, Vf, Strom und LEDs in Reihe → Widerstand und Verlustleistung, Strom mit einem Wert der Reihe E12/E24. Anzeigen an 5, 12, 24 V." },
    "tools/motor-current/": { name: "Motorstrom berechnen", blurb: "Drehstrom, Wechselstrom oder Gleichstrom, kW (HP) → Ampere, Aufnahmeleistung, kVA, Drehmoment. Wirkungsgrad vom Typenschild." },
    "tools/motor-speed/": { name: "Umrichter-Frequenz ↔ Motordrehzahl", blurb: "Hz und Polzahl → synchrone Drehzahl, Schlupf vom Typenschild, Abtriebsdrehzahl am Getriebe, Hz für eine Zieldrehzahl." },
    "tools/parallel-resistor/": { name: "Reihen- und Parallelschaltung von Widerständen", blurb: "Gesamtwert in Reihe und parallel, Stromaufteilung, der Partnerwiderstand für einen Zielwert und Paare aus E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Kondensator für die Blindleistungskompensation berechnen", blurb: "kW, jetziger und Ziel-Leistungsfaktor → benötigte kvar, µF je Kondensator in Dreieck oder Stern, Strom vor und nach der Kompensation." },
    "tools/power-supply-sizing/": { name: "24-V-DC-Netzteil dimensionieren", blurb: "Strom, Einschaltstrom und Einschaltdauer von SPS, HMI, Sensoren, Ventilen und Relaisspulen → Summe, Nennstrom mit Reserve (gängige Größen), Prüfung des Einschaltstroms, Kanäle des Schutzschalters." },
    "tools/pump-fan-affinity/": { name: "Pumpen und Lüfter: Drehzahl und Leistung", blurb: "Umrichterfrequenz → Volumenstrom, Druck und Leistung (Affinitätsgesetze), jährlicher Energieunterschied, Frequenz für einen Ziel-Volumenstrom." },
    "tools/reactance/": { name: "Blindwiderstand und LC-Resonanz berechnen", blurb: "Xc und XL bei einer Frequenz, C oder L für ein Ziel-X, LC-Resonanzfrequenz und Impedanz, Kondensatorstrom und kvar." },
    "tools/three-phase-power/": { name: "Drehstromleistung berechnen", blurb: "Spannung plus Strom, kW oder kVA und Leistungsfaktor → kVA, kW, kvar und Strom; Leistungsfaktor aus kW und kVA." },
    "tools/voltage-drop/": { name: "Spannungsabfall und Leitungsquerschnitt berechnen", blurb: "Gleichstrom, Wechsel- und Drehstrom, mm² oder AWG, Kupfer oder Aluminium → Abfall und %, Querschnitt und Länge für einen zulässigen Abfall." },
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
