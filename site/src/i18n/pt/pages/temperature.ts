// Conversor de temperatura Pt100 e termopar (views/TemperaturePage.astro) — 5º lote. Termos: termorresistência (RTD), termopar tipo K, junta fria, compensação de junta fria, f.e.m. (força eletromotriz), função de referência
// Os nomes dos tipos de termopar e as mensagens de erro ficam em lib/temperature.ts. src2 = pedaços antes e depois do link para its90.nist.gov
// Depois de mmNote vem o link do aplicativo (PortDock Modbus Master, nome sem tradução); o nome do link depois de nNote vem de pageName()
export default {
  title: "Conversor de temperatura Pt100 e termopar",
  seo: "Calculadora Pt100 e termopar: Ω, mV ↔ °C, tabelas — PortDock",
  desc: "Converta a resistência de Pt100/Pt1000 e os mV de termopares tipo K, J, T, E, N, R, S e B em temperatura e vice-versa. IEC 60751 e NIST ITS-90, com junta fria.",
  rtdTitle: "Termorresistência (RTD)",
  sensor: "Sensor",
  temp: "Temperatura (°C)",
  res: "Resistência (Ω)",
  tcTitle: "Termopar",
  type: "Tipo",
  cj: "Junta fria (°C)",
  emf: "Tensão medida (mV)",
  emf0: "F.e.m. (referência 0 °C)",
  range: "Faixa",
  rtdNote: "α = 0.00385, de -200 a 850 °C",
  tcNote: "Temperatura → mV vale em toda a «Faixa»; mV → temperatura, só dentro da faixa da função inversa do NIST.",
  tableTitle: "Tabela de temperaturas",
  step: "Passo (°C)",
  tableNote: "As tabelas de termopar usam junta fria a 0 °C, como as tabelas do NIST.",
  how: "Tudo é calculado no seu navegador; nada do que você digita é enviado. Valores fora da faixa são avisados, não calculados.",
  srcTitle: "Equações e fontes",
  faqTitle: "Perguntas frequentes",
  faq: [
    [
      "Como funciona a compensação de junta fria?",
      "A tensão de um termopar depende da diferença entre a junta de medição e a junta fria (os terminais). Some aos mV medidos a f.e.m. da junta fria e converta: E(t) = E medida + E(junta fria). No sentido inverso, a leitura esperada é E(t) − E(junta fria).",
    ],
    [
      "Qual a diferença entre Pt100 e Pt1000?",
      "Só a resistência a 0 °C (R0): 100 Ω ou 1000 Ω. As duas usam a mesma equação (α = 0.00385), então em qualquer temperatura um Pt1000 lê dez vezes o valor de um Pt100.",
    ],
    [
      "Por que a faixa de mV → temperatura é mais estreita?",
      "O NIST publica a inversa da função de referência temperatura → mV como aproximações por trechos. Esta ferramenta converte mV → temperatura só onde essas aproximações valem, ex.: tipo K de -200 a 1372 °C, tipo B de 250 a 1820 °C.",
    ],
  ],
  src1: "RTD: a equação de Callendar–Van Dusen da IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 a partir de 0 °C). Resistência → temperatura usa a raiz da equação do 2º grau a partir de 0 °C e iteração abaixo disso.",
  src2: [
    "Termopares: as funções de referência E = Σ cᵢ·tⁱ (o tipo K soma a₀·exp(a₁·(t − a₂)²) acima de 0 °C) e os coeficientes inversos publicados na NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), copiados dos arquivos de cada tipo em",
    ". mV → temperatura parte da função inversa e é refinada pela função de referência. Aqui, temperatura → mV bate com todos os valores das tabelas do NIST (0.001 mV).",
  ],
  rngHead: ["Temperatura → mV", "mV → temperatura"],
  mmNote: "Para ler controladores de temperatura ou transmissores por Modbus, use o",
  mmEnd: ".",
  nNote: "Para termistores NTC (valor B, Steinhart–Hart), use a",
  nEnd: ".",
};
