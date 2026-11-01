// Deutsch — 5. Paket (12 Web-Tools für Signale, Einheiten und Netzwerk, scope.ts SCOPE5). Aufbau wie das Referenzpaket ja/batch5.ts (site/I18N.md «5차 묶음 붙이는 법»), Quelle ist die englische Fassung.
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page5Id, Scope5Path } from "../scope.ts";
import adc from "./pages/adc.ts";
import encoder from "./pages/encoder.ts";
import loopLoad from "./pages/loopLoad.ts";
import ntc from "./pages/ntc.ts";
import opAmp from "./pages/opAmp.ts";
import rcFilter from "./pages/rcFilter.ts";
import temperature from "./pages/temperature.ts";
import voltageDivider from "./pages/voltageDivider.ts";
import gigeBandwidth from "./pages/gigeBandwidth.ts";
import decibel from "./pages/decibel.ts";
import pressure from "./pages/pressure.ts";
import units from "./pages/units.ts";
import libAdc from "./lib/adc.ts";
import libEncoder from "./lib/encoder.ts";
import libLoopLoad from "./lib/loopLoad.ts";
import libNtc from "./lib/ntc.ts";
import libOpAmp from "./lib/opAmp.ts";
import libRcFilter from "./lib/rcFilter.ts";
import libTemperature from "./lib/temperature.ts";
import libVoltageDivider from "./lib/voltageDivider.ts";
import libGige from "./lib/gige.ts";
import libDecibel from "./lib/decibel.ts";
import libPressure from "./lib/pressure.ts";
import libUnits from "./lib/units.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/adc/": { name: "ADC-Rechner: Auflösung und Skalierung", blurb: "Bitzahl und Referenzspannung → 1 LSB, Code ↔ Spannung; 4–20 mA (Shunt) und 0–10 V (Spannungsteiler) → physikalischer Wert, Wert pro Digit." },
    "tools/encoder/": { name: "Drehgeber-Rechner: Impulse ↔ Drehzahl", blurb: "Impulse pro Umdrehung und Auswertung → Ausgangsfrequenz, Zählrate, Drehzahl aus gezählten Impulsen, max. Drehzahl aus der Grenzfrequenz, Winkel und Weg pro Zählschritt." },
    "tools/loop-load/": { name: "4–20-mA-Bürde-Rechner", blurb: "Speisespannung, Mindestspannung des Messumformers, 250 Ω und Leitungswiderstand → Restspannung, maximale Bürde, maximale Leitungslänge." },
    "tools/ntc/": { name: "NTC-Rechner (Heißleiter)", blurb: "Widerstand ↔ Temperatur mit B-Wert oder Steinhart–Hart, Teilerspannung und ADC-Wert, Temperaturtabelle, Eigenerwärmung." },
    "tools/op-amp-gain/": { name: "OPV-Verstärkungsrechner", blurb: "Nichtinvertierend, invertierend, Differenzverstärker: Verstärkung und dB, Ausgangsspannung, Fehler durch Leerlaufverstärkung, Bandbreite, Normwiderstände für eine Zielverstärkung." },
    "tools/rc-filter/": { name: "RC-Rechner: Zeitkonstante und Grenzfrequenz", blurb: "R und C → τ, Ladezeit bis 63 % und 99 %, Grenzfrequenz, Dämpfung und Phase des Tiefpasses 1. Ordnung, R oder C für eine Ziel-Grenzfrequenz." },
    "tools/temperature/": { name: "Pt100- und Thermoelement-Rechner", blurb: "Widerstand von Pt100 und Pt1000, mV ↔ Temperatur für Thermoelemente Typ K, J, T, E, N, R, S, B. Vergleichsstellenkompensation und Temperaturtabelle." },
    "tools/voltage-divider/": { name: "Spannungsteiler-Rechner", blurb: "Ein- und Ausgangsspannung → R1 und R2, Paare aus E12, E24 und E96 nach Fehler sortiert; Last, Strom, Leistung, Ausgangswiderstand, Toleranz." },
    "tools/gige-bandwidth/": { name: "GigE-Kamera-Bandbreitenrechner", blurb: "Auflösung, Pixelformat, Bildrate und Kamerazahl → MB/s, Anteil an 1, 2.5, 5 und 10 GbE, höchste Bildrate, die in die Verbindung passt." },
    "tools/db/": { name: "dB- und dBm-Umrechner", blurb: "dBm ↔ mW und W; dBµV, dBV, dBu und Spannung bei 50, 75 und 600 Ω; Leistungs- und Spannungsverhältnis ↔ dB." },
    "tools/pressure/": { name: "Druckeinheiten-Umrechner", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O und mmHg auf einmal. Überdruck ↔ Absolutdruck, Sensorbereich mit 4–20-mA-Tabelle." },
    "tools/units/": { name: "Einheitenumrechner für die Industrie", blurb: "Durchfluss m³/h, L/min, gpm; Drehmoment N·m, kgf·cm, lbf·ft; Leistung kW, hp, PS, kcal/h; Temperatur °C, °F, K." },
  } satisfies Record<Scope5Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    adc: libAdc,
    encoder: libEncoder,
    loopLoad: libLoopLoad,
    ntc: libNtc,
    opAmp: libOpAmp,
    rcFilter: libRcFilter,
    temperature: libTemperature,
    voltageDivider: libVoltageDivider,
    gige: libGige,
    decibel: libDecibel,
    pressure: libPressure,
    units: libUnits,
  },

  /** 쪽 글 */
  pages: { adc, encoder, loopLoad, ntc, opAmp, rcFilter, temperature, voltageDivider, gigeBandwidth, decibel, pressure, units } satisfies Record<Page5Id, unknown>,
};
