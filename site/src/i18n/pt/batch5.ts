// Português (Brasil) — 5º lote (ferramentas web de sinais, unidades e rede, 12; scope.ts SCOPE5). Mesma forma da versão base ja/batch5.ts; a tradução parte da versão em inglês (site/I18N.md «5차 묶음 붙이는 법»).
// webTools = nome e resumo de cada ferramenta, lib = textos de bibliotecas e scripts (frase em inglês → tradução), pages = textos de cada página
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
    "tools/adc/": { name: "Calculadora de resolução e escala de ADC", blurb: "Bits e referência → 1 LSB e código ↔ tensão; 4–20 mA (shunt) ou 0–10 V (divisor) → valor de engenharia por contagem." },
    "tools/encoder/": { name: "Calculadora de pulsos de encoder ↔ rpm", blurb: "PPR e ×1/×2/×4 → frequência de saída e taxa de contagem, rpm pelas contagens, rpm máxima, ângulo e deslocamento por contagem." },
    "tools/loop-load/": { name: "Calculadora de carga da malha 4–20 mA", blurb: "Fonte da malha, mínimo do transmissor, 250 Ω e cabo → margem de tensão, carga máxima e comprimento do cabo." },
    "tools/ntc/": { name: "Calculadora de termistor NTC", blurb: "Resistência ↔ temperatura pelo valor B ou Steinhart–Hart, tensão do divisor e contagem do ADC, tabela, autoaquecimento." },
    "tools/op-amp-gain/": { name: "Calculadora de ganho de amplificador operacional", blurb: "Ganho não inversor, inversor e diferencial, dB, tensão de saída, erro do ganho em malha aberta, largura de banda e resistores comerciais para um ganho." },
    "tools/rc-filter/": { name: "Calculadora de constante de tempo RC e frequência de corte", blurb: "R e C → τ, tempo até 63 % e 99 %, corte do filtro passa-baixa de 1ª ordem, atenuação e fase, R ou C para a fc." },
    "tools/temperature/": { name: "Conversor de temperatura Pt100 e termopar", blurb: "Resistência de Pt100/Pt1000 e mV de termopares tipo K, J, T, E, N, R, S, B ↔ °C. Junta fria e tabelas." },
    "tools/voltage-divider/": { name: "Calculadora de divisor de tensão", blurb: "Vin e Vout → R1 e R2, pares E12/E24/E96 mais próximos, carga, corrente, potência, impedância de saída e tolerância." },
    "tools/gige-bandwidth/": { name: "Calculadora de largura de banda de câmeras GigE", blurb: "Resolução, formato de pixel, fps e câmeras → MB/s, uso de 1/2.5/5/10 GbE e fps máximo que cabe." },
    "tools/db/": { name: "Conversor de dB e dBm", blurb: "dBm ↔ mW e W; dBµV, dBV, dBu e volts para 50/75/600 Ω; relação de potência ou de tensão ↔ dB." },
    "tools/pressure/": { name: "Conversor de unidades de pressão", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O e mmHg de uma vez. Manométrica ↔ absoluta e faixa do sensor com tabela 4–20 mA." },
    "tools/units/": { name: "Conversor de unidades industriais", blurb: "Vazão m³/h, L/min, gpm; torque N·m, kgf·cm, lbf·ft; potência kW, hp, cv, kcal/h; °C, °F, K." },
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
