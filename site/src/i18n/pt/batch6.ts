// Português (Brasil) — 6º lote (ferramentas web elétricas, 15; scope.ts SCOPE6). Mesma forma da versão base ja/batch6.ts; a tradução parte da versão inglesa (site/I18N.md «6차 묶음 붙이는 법»).
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
    "tools/awg-mm2/": { name: "Tabela de conversão AWG para mm²", blurb: "Diâmetro e área de AWG 0000 a 40 (fórmula ASTM B258), seção métrica mais próxima (IEC 60228), Ω/km do cobre. Converte nos dois sentidos." },
    "tools/conduit-fill/": { name: "Calculadora de ocupação de eletroduto e calha", blurb: "Diâmetro externo e quantidade de fios → % de ocupação. Comparado com NEC eletroduto 53/31/40 %, calha 20 %, canaleta de painel NFPA 79 50 %; diâmetro interno mínimo e máximo de fios." },
    "tools/ct-ratio/": { name: "Calculadora de relação e carga de TC", blurb: "Corrente primária ↔ secundária pela relação do TC, fios de ida e volta + VA do medidor → carga total (VA, Ω) frente ao valor nominal, fator de correção da relação." },
    "tools/energy-pulse/": { name: "Calculadora de pulsos de medidor de energia", blurb: "imp/kWh, intervalo ou contagem de pulsos → kW e kWh, multiplicador TC/TP, taxa e largura dos pulsos em plena carga." },
    "tools/heater-power/": { name: "Calculadora de potência de aquecedores (kW, ampères)", blurb: "Massa, calor específico, elevação de temperatura e tempo → kW do aquecedor, kW para fluidos em circulação, ampères monofásicos e trifásicos e potência em outras tensões." },
    "tools/led-resistor/": { name: "Calculadora de resistor para LED", blurb: "Alimentação, Vf, corrente e LEDs em série → resistor e potência, corrente com um valor E12/E24. Indicadores de 5, 12 e 24 V." },
    "tools/motor-current/": { name: "Calculadora de corrente de motor", blurb: "kW (HP) trifásicos, monofásicos ou CC → ampères, potência de entrada, kVA e torque. Rendimento pela placa." },
    "tools/motor-speed/": { name: "Frequência do inversor ↔ rpm do motor", blurb: "Hz e polos → velocidade síncrona, escorregamento da placa, saída do redutor, Hz para um rpm desejado." },
    "tools/parallel-resistor/": { name: "Calculadora de resistores em paralelo e em série", blurb: "Totais em série e em paralelo, divisão de corrente, o resistor complementar para um valor desejado e pares E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Calculadora de capacitores de correção do fator de potência", blurb: "kW, fator de potência atual e desejado → kvar necessários, µF por capacitor em triângulo ou estrela, corrente antes e depois." },
    "tools/power-supply-sizing/": { name: "Calculadora de dimensionamento de fonte de 24 V CC", blurb: "Corrente, partida e ciclo de trabalho de CLPs, IHMs, sensores, válvulas e bobinas de relé → total, valor nominal com folga (tamanhos comuns), verificação da partida e canais do protetor de circuito." },
    "tools/pump-fan-affinity/": { name: "Calculadora de rotação e potência de bombas e ventiladores", blurb: "Frequência do inversor → vazão, pressão e potência (leis de afinidade), diferença de energia anual, frequência para uma vazão desejada." },
    "tools/reactance/": { name: "Calculadora de reatância e ressonância LC", blurb: "Xc e XL em uma frequência, C ou L para um X desejado, frequência e impedância de ressonância LC, corrente e kvar do capacitor." },
    "tools/three-phase-power/": { name: "Calculadora de potência trifásica", blurb: "Tensão mais ampères, kW ou kVA e fator de potência → kVA, kW, kvar e ampères; fator de potência a partir de kW e kVA." },
    "tools/voltage-drop/": { name: "Calculadora de queda de tensão e seção do cabo", blurb: "CC, monofásica e trifásica, mm² ou AWG, cobre ou alumínio → queda e %, seção e comprimento para uma queda permitida." },
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
