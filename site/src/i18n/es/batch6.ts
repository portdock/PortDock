// Español — 6.º lote (herramientas web eléctricas, 15; scope.ts SCOPE6). Misma forma que la versión base ja/batch6.ts; la traducción parte de la versión inglesa (site/I18N.md «6차 묶음 붙이는 법»).
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
    "tools/awg-mm2/": { name: "Tabla de conversión AWG a mm²", blurb: "Diámetro y área de AWG 0000 a 40 (fórmula ASTM B258), sección métrica más cercana (IEC 60228), Ω/km del cobre. Convierte en ambos sentidos." },
    "tools/conduit-fill/": { name: "Calculadora de llenado de tubos y canaletas", blurb: "Diámetro exterior y número de cables → % de llenado. Se compara con NEC tubo 53/31/40 %, canal 20 %, canaleta de cuadro NFPA 79 50 %; diámetro interior mínimo y máximo de cables." },
    "tools/ct-ratio/": { name: "Calculadora de relación y carga de TI", blurb: "Corriente primaria ↔ secundaria según la relación del TI, cables de ida y vuelta + VA del medidor → carga total (VA, Ω) frente al valor nominal, factor de corrección de relación." },
    "tools/energy-pulse/": { name: "Calculadora de pulsos de contador de energía", blurb: "imp/kWh, intervalo o número de pulsos → kW y kWh, multiplicador TI/TT, frecuencia y anchura de los pulsos a plena carga." },
    "tools/heater-power/": { name: "Calculadora de potencia de calentadores (kW, amperios)", blurb: "Masa, calor específico, subida de temperatura y tiempo → kW del calentador, kW para fluidos en circulación, amperios monofásicos y trifásicos y potencia a otras tensiones." },
    "tools/led-resistor/": { name: "Calculadora de resistencia para LED", blurb: "Alimentación, Vf, corriente y LED en serie → resistencia y potencia, corriente con un valor E12/E24. Indicadores de 5, 12 y 24 V." },
    "tools/motor-current/": { name: "Calculadora de corriente de motor", blurb: "kW (HP) trifásicos, monofásicos o de CC → amperios, potencia de entrada, kVA y par. Rendimiento a partir de la placa." },
    "tools/motor-speed/": { name: "Frecuencia del variador ↔ rpm del motor", blurb: "Hz y polos → velocidad síncrona, deslizamiento de la placa, salida del reductor, Hz para unas rpm objetivo." },
    "tools/parallel-resistor/": { name: "Calculadora de resistencias en paralelo y en serie", blurb: "Totales en serie y en paralelo, reparto de corriente, la resistencia complementaria para un valor objetivo y pares E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Calculadora de condensadores para factor de potencia", blurb: "kW, factor de potencia actual y objetivo → kvar necesarios, µF por condensador en triángulo o estrella, corriente antes y después." },
    "tools/power-supply-sizing/": { name: "Calculadora de dimensionado de fuente de 24 V CC", blurb: "Corriente, arranque y ciclo de trabajo de PLC, HMI, sensores, válvulas y bobinas de relé → total, valor nominal con margen (tamaños habituales), comprobación del arranque y canales del protector de circuito." },
    "tools/pump-fan-affinity/": { name: "Calculadora de velocidad y potencia de bombas y ventiladores", blurb: "Frecuencia del variador → caudal, presión y potencia (leyes de afinidad), diferencia de energía anual, frecuencia para un caudal objetivo." },
    "tools/reactance/": { name: "Calculadora de reactancia y resonancia LC", blurb: "Xc y XL a una frecuencia, C o L para una X objetivo, frecuencia e impedancia de resonancia LC, corriente y kvar del condensador." },
    "tools/three-phase-power/": { name: "Calculadora de potencia trifásica", blurb: "Tensión más amperios, kW o kVA y factor de potencia → kVA, kW, kvar y amperios; factor de potencia a partir de kW y kVA." },
    "tools/voltage-drop/": { name: "Calculadora de caída de tensión y sección de cable", blurb: "CC, monofásica y trifásica, mm² o AWG, cobre o aluminio → caída y %, sección y longitud para una caída admitida." },
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
