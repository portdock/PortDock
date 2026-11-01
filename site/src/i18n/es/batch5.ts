// Español — 5.º lote (herramientas web de señales, unidades y red, 12; scope.ts SCOPE5). Misma forma que la versión base ja/batch5.ts; la traducción parte de la versión inglesa (site/I18N.md «5차 묶음 붙이는 법»).
// webTools = nombre y resumen de cada herramienta, lib = textos de bibliotecas y scripts (frase en inglés → traducción), pages = textos de cada página
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
    "tools/adc/": { name: "Calculadora de resolución y escalado ADC", blurb: "Bits y referencia → 1 LSB y código ↔ tensión; 4–20 mA (shunt) o 0–10 V (divisor) → valor de ingeniería por cuenta." },
    "tools/encoder/": { name: "Calculadora de pulsos de encoder ↔ rpm", blurb: "PPR y ×1/×2/×4 → frecuencia de salida y velocidad de conteo, rpm según cuentas, rpm máximas, ángulo y avance por cuenta." },
    "tools/loop-load/": { name: "Calculadora de carga del lazo 4–20 mA", blurb: "Fuente del lazo, mínimo del transmisor, 250 Ω y cable → margen de tensión, carga máxima y longitud de cable." },
    "tools/ntc/": { name: "Calculadora de termistores NTC", blurb: "Resistencia ↔ temperatura con valor B o Steinhart–Hart, tensión del divisor y cuentas del ADC, tabla, autocalentamiento." },
    "tools/op-amp-gain/": { name: "Calculadora de ganancia de amplificador operacional", blurb: "Ganancia no inversora, inversora y diferencial, dB, tensión de salida, error por ganancia en lazo abierto, ancho de banda y resistencias normalizadas para una ganancia." },
    "tools/rc-filter/": { name: "Calculadora de constante de tiempo RC y frecuencia de corte", blurb: "R y C → τ, tiempo hasta 63 % y 99 %, corte del filtro pasa bajos de primer orden, atenuación y fase, R o C para fc." },
    "tools/temperature/": { name: "Conversor de temperatura Pt100 y termopares", blurb: "Resistencia de Pt100/Pt1000 y mV de termopares tipo K, J, T, E, N, R, S, B ↔ °C. Unión fría y tablas." },
    "tools/voltage-divider/": { name: "Calculadora de divisor de tensión", blurb: "Vin y Vout → R1 y R2, pares E12/E24/E96 más cercanos, carga, corriente, potencia, impedancia de salida y tolerancia." },
    "tools/gige-bandwidth/": { name: "Calculadora de ancho de banda de cámaras GigE", blurb: "Resolución, formato de píxel, fps y cámaras → MB/s, uso de 1/2.5/5/10 GbE y fps máximos que caben." },
    "tools/db/": { name: "Conversor de dB y dBm", blurb: "dBm ↔ mW y W; dBµV, dBV, dBu y voltios para 50/75/600 Ω; relación de potencia o de tensión ↔ dB." },
    "tools/pressure/": { name: "Conversor de unidades de presión", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O y mmHg a la vez. Manométrica ↔ absoluta y rango del sensor con tabla de 4–20 mA." },
    "tools/units/": { name: "Conversor de unidades industriales", blurb: "Caudal m³/h, L/min, gpm; par N·m, kgf·cm, lbf·ft; potencia kW, HP, CV, kcal/h; °C, °F, K." },
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
