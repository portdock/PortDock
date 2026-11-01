// 프랑스어 — 5차 묶음(신호·단위·네트워크 웹 도구 12개, scope.ts SCOPE5). 기준판 ja/batch5.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «5차 묶음 붙이는 법»).
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
    "tools/adc/": { name: "Calculateur de résolution et de mise à l’échelle CAN (ADC)", blurb: "Bits et référence → 1 LSB, code ↔ tension, 4–20 mA (shunt) et 0–10 V (pont diviseur) → valeur physique, valeur d’un point." },
    "tools/encoder/": { name: "Calculateur impulsions codeur ↔ tr/min", blurb: "PPR et multiplication → fréquence de sortie et cadence de comptage, tr/min d’après les points comptés, tr/min max d’après la fréquence de réponse, angle et déplacement par point." },
    "tools/loop-load/": { name: "Calculateur de charge de boucle 4–20 mA", blurb: "Alimentation de boucle, tension minimale du transmetteur, 250 Ω et résistance du câble → tension restante, charge maximale, longueur de câble maximale." },
    "tools/ntc/": { name: "Calculateur de thermistance CTN (NTC)", blurb: "Résistance ↔ température par la valeur B ou Steinhart–Hart, tension du pont et point CAN, table de températures, auto-échauffement." },
    "tools/op-amp-gain/": { name: "Calculateur de gain d’AOP", blurb: "Gain et dB en non inverseur, inverseur et différentiel, tension de sortie, erreur due au gain en boucle ouverte, bande passante, résistances normalisées pour un gain visé." },
    "tools/rc-filter/": { name: "Calculateur de constante de temps RC et de fréquence de coupure", blurb: "R et C → τ, temps de charge à 63 % et 99 %, coupure, atténuation et phase d’un passe-bas du premier ordre, R ou C pour une fc donnée." },
    "tools/temperature/": { name: "Conversion Pt100 et thermocouples", blurb: "Résistance Pt100 et Pt1000, mV ↔ température des thermocouples K, J, T, E, N, R, S, B. Compensation de soudure froide, table de températures." },
    "tools/voltage-divider/": { name: "Calculateur de pont diviseur de tension", blurb: "Tensions d’entrée et de sortie → R1 et R2, paires normalisées E12, E24, E96 (par erreur), charge, courant, puissance, impédance de sortie, tolérance." },
    "tools/gige-bandwidth/": { name: "Calculateur de bande passante caméra GigE", blurb: "Résolution, format de pixel, fps et nombre de caméras → MB/s, % d’un lien 1, 2.5, 5 ou 10 GbE, fps max dans le lien." },
    "tools/db/": { name: "Convertisseur dB et dBm", blurb: "dBm ↔ mW et W, dBµV, dBV, dBu et tension sur 50, 75 ou 600 Ω, rapport de puissance ou de tension ↔ dB." },
    "tools/pressure/": { name: "Convertisseur d’unités de pression", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O et mmHg d’un coup. Pression relative ↔ absolue, table 4–20 mA de la plage d’un capteur." },
    "tools/units/": { name: "Convertisseur d’unités industrielles", blurb: "Débit m³/h, L/min, gpm, couple N·m, kgf·cm, lbf·ft, puissance kW, HP, ch, kcal/h, température °C, °F, K." },
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
