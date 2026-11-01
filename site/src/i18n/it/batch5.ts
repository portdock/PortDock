// 이탈리아어 — 5차 묶음(신호·단위·네트워크 웹 도구 12개, scope.ts SCOPE5). 기준판 ja/batch5.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «5차 묶음 붙이는 법»).
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
    "tools/adc/": { name: "Calcolatore di risoluzione e scalatura ADC", blurb: "Bit e riferimento → 1 LSB, codice ↔ tensione, 4–20 mA (shunt) e 0–10 V (partitore) → valore ingegneristico, valore di un conteggio." },
    "tools/encoder/": { name: "Calcolatore impulsi encoder ↔ giri/min", blurb: "PPR e moltiplicazione → frequenza d'uscita e velocità di conteggio, giri/min dai conteggi, giri/min max dalla frequenza di risposta, angolo e corsa per conteggio." },
    "tools/loop-load/": { name: "Calcolatore del carico del loop 4–20 mA", blurb: "Alimentazione del loop, tensione minima del trasmettitore, 250 Ω e resistenza del cavo → tensione residua, carico massimo, lunghezza massima del cavo." },
    "tools/ntc/": { name: "Calcolatore termistore NTC", blurb: "Resistenza ↔ temperatura con valore B o Steinhart–Hart, tensione del partitore e conteggio ADC, tabella delle temperature, autoriscaldamento." },
    "tools/op-amp-gain/": { name: "Calcolatore guadagno op amp", blurb: "Guadagno e dB non invertente, invertente e differenziale, tensione d'uscita, errore da guadagno ad anello aperto, banda, resistenze normalizzate per un guadagno obiettivo." },
    "tools/rc-filter/": { name: "Calcolatore costante di tempo RC e frequenza di taglio", blurb: "R e C → τ, tempo di carica al 63 % e al 99 %, frequenza di taglio, attenuazione e fase di un passa-basso del primo ordine, R o C per una fc data." },
    "tools/temperature/": { name: "Conversione Pt100 e termocoppie", blurb: "Resistenza Pt100 e Pt1000, mV ↔ temperatura delle termocoppie K, J, T, E, N, R, S, B. Compensazione del giunto freddo, tabella delle temperature." },
    "tools/voltage-divider/": { name: "Calcolatore partitore di tensione", blurb: "Tensioni d'ingresso e d'uscita → R1 e R2, coppie normalizzate E12, E24, E96 (per errore), carico, corrente, potenza, impedenza d'uscita, tolleranza." },
    "tools/gige-bandwidth/": { name: "Calcolatore banda telecamere GigE", blurb: "Risoluzione, formato pixel, fps e numero di telecamere → MB/s, % di un link 1, 2.5, 5 o 10 GbE, fps massimi nel link." },
    "tools/db/": { name: "Convertitore dB e dBm", blurb: "dBm ↔ mW e W, dBµV, dBV, dBu e tensione su 50, 75 o 600 Ω, rapporto di potenza o di tensione ↔ dB." },
    "tools/pressure/": { name: "Convertitore di unità di pressione", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O e mmHg insieme. Pressione relativa ↔ assoluta, tabella 4–20 mA del campo di un sensore." },
    "tools/units/": { name: "Convertitore di unità industriali", blurb: "Portata m³/h, L/min, gpm, coppia N·m, kgf·cm, lbf·ft, potenza kW, HP, CV, kcal/h, temperatura °C, °F, K." },
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
