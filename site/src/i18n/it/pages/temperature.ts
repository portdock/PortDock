// Conversione Pt100 e termocoppie (views/TemperaturePage.astro) — 5차 묶음. 영어판에서 옮김.
// 용어: termoresistenza (RTD), termocoppia tipo K, giunto freddo, compensazione del giunto freddo, f.e.m., funzione di riferimento
// 열전대 형 이름·오류 문구는 lib/temperature. src2 는 its90.nist.gov 링크 앞·뒤 조각
// mmNote 뒤 링크는 앱 쪽(PortDock Modbus Master, 이름 그대로), nNote 뒤 링크 글은 화면이 pageName() 으로
export default {
  title: "Conversione Pt100 e termocoppie",
  seo: "Calcolatore Pt100 e termocoppie: Ω, mV ↔ °C — PortDock",
  desc: "Pt100/Pt1000 (Ω) e termocoppie K, J, T, E, N, R, S, B (mV) ↔ temperatura. IEC 60751, NIST ITS-90, compensazione del giunto freddo.",
  rtdTitle: "Termoresistenza (RTD)",
  sensor: "Sensore",
  temp: "Temperatura (°C)",
  res: "Resistenza (Ω)",
  tcTitle: "Termocoppia",
  type: "Tipo",
  cj: "Giunto freddo (°C)",
  emf: "Tensione misurata (mV)",
  emf0: "F.e.m. (riferimento 0 °C)",
  range: "Campo",
  rtdNote: "α = 0.00385, da −200 a 850 °C",
  tcNote: "Temperatura → mV funziona su tutto il «Campo»; mV → temperatura solo nel campo delle funzioni inverse del NIST.",
  tableTitle: "Tabella delle temperature",
  step: "Passo (°C)",
  tableNote: "Le tabelle delle termocoppie usano il giunto freddo a 0 °C, come le tabelle del NIST.",
  how: "Tutto è calcolato nel vostro browser; nulla di ciò che inserite viene inviato. I valori fuori campo vengono segnalati, non calcolati.",
  srcTitle: "Equazioni e fonti",
  faqTitle: "Domande frequenti",
  faq: [
    [
      "Come funziona la compensazione del giunto freddo?",
      "La tensione di una termocoppia dipende dalla differenza di temperatura tra il giunto caldo (punto di misura) e il giunto freddo (morsetti). Sommate ai mV misurati la f.e.m. del giunto freddo e convertite: E(t) = E misurata + E(giunto freddo). Al contrario, la lettura attesa è E(t) − E(giunto freddo).",
    ],
    [
      "Che differenza c'è tra Pt100 e Pt1000?",
      "Solo la resistenza a 0 °C (R0): 100 Ω o 1000 Ω. Entrambe seguono la stessa equazione (α = 0.00385), quindi a qualsiasi temperatura una Pt1000 ha una resistenza dieci volte quella di una Pt100.",
    ],
    [
      "Perché il campo mV → temperatura è più stretto?",
      "Il NIST pubblica l'inversa della funzione di riferimento temperatura → mV come approssimazioni a tratti. Questo strumento converte mV → temperatura solo dove queste approssimazioni valgono, es. tipo K da −200 a 1372 °C, tipo B da 250 a 1820 °C.",
    ],
  ],
  src1: "Termoresistenze: l'equazione di Callendar–Van Dusen della IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 da 0 °C in su). Resistenza → temperatura usa la radice dell'equazione di secondo grado da 0 °C in su e un calcolo iterativo sotto.",
  src2: [
    "Termocoppie: le funzioni di riferimento E = Σ cᵢ·tⁱ (il tipo K aggiunge a₀·exp(a₁·(t − a₂)²) sopra 0 °C) e i coefficienti inversi pubblicati nella NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), copiati dai file per tipo su",
    ". mV → temperatura parte dalla funzione inversa e viene affinato con la funzione di riferimento. Qui temperatura → mV riproduce tutti i valori delle tabelle NIST (0.001 mV).",
  ],
  rngHead: ["Temperatura → mV", "mV → temperatura"],
  mmNote: "Per leggere regolatori di temperatura o trasmettitori via Modbus:",
  mmEnd: ".",
  nNote: "Per i termistori NTC (valore B, Steinhart–Hart):",
  nEnd: ".",
};
