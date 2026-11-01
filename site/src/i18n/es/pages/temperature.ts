// Conversor de temperatura Pt100 y termopares (views/TemperaturePage.astro) — 5.º lote. Términos: termorresistencia (RTD), termopar tipo K, unión fría, compensación de unión fría, f.e.m. (fuerza electromotriz), función de referencia
// Los nombres de tipo de termopar y los mensajes de error están en lib/temperature.ts. src2 = trozos antes y después del enlace a its90.nist.gov
// Tras mmNote va el enlace a la aplicación (PortDock Modbus Master, nombre sin traducir); el nombre del enlace tras nNote lo pone pageName()
export default {
  title: "Conversor de temperatura Pt100 y termopares",
  seo: "Calculadora Pt100 y termopar: Ω, mV ↔ °C, tablas — PortDock",
  desc: "Convierta la resistencia de Pt100/Pt1000 y los mV de termopares tipo K, J, T, E, N, R, S y B a temperatura y al revés. IEC 60751 y NIST ITS-90, con unión fría.",
  rtdTitle: "Termorresistencia (RTD)",
  sensor: "Sensor",
  temp: "Temperatura (°C)",
  res: "Resistencia (Ω)",
  tcTitle: "Termopar",
  type: "Tipo",
  cj: "Unión fría (°C)",
  emf: "Tensión medida (mV)",
  emf0: "F.e.m. (referencia 0 °C)",
  range: "Rango",
  rtdNote: "α = 0.00385, de -200 a 850 °C",
  tcNote: "Temperatura → mV funciona en todo el «Rango»; mV → temperatura, solo dentro del rango de la función inversa de NIST.",
  tableTitle: "Tabla de temperaturas",
  step: "Paso (°C)",
  tableNote: "Las tablas de termopares usan la unión fría a 0 °C, como las tablas de NIST.",
  how: "Todo se calcula en su navegador; nada de lo que escribe se envía a ningún sitio. Los valores fuera de rango se avisan, no se calculan.",
  srcTitle: "Ecuaciones y fuentes",
  faqTitle: "Preguntas frecuentes",
  faq: [
    [
      "¿Cómo funciona la compensación de unión fría?",
      "La tensión de un termopar depende de la diferencia entre la unión de medida y la unión fría (los bornes). Sume a los mV medidos la f.e.m. de la unión fría y convierta: E(t) = E medida + E(unión fría). Al revés, la lectura esperada es E(t) − E(unión fría).",
    ],
    [
      "¿Qué diferencia hay entre Pt100 y Pt1000?",
      "Solo la resistencia a 0 °C (R0): 100 Ω o 1000 Ω. Ambas usan la misma ecuación (α = 0.00385), así que a cualquier temperatura una Pt1000 marca diez veces lo que una Pt100.",
    ],
    [
      "¿Por qué el rango de mV → temperatura es más estrecho?",
      "NIST publica la inversa de la función de referencia temperatura → mV como aproximaciones por tramos. Esta herramienta convierte mV → temperatura solo donde se aplican esas aproximaciones, p. ej. tipo K de -200 a 1372 °C y tipo B de 250 a 1820 °C.",
    ],
  ],
  src1: "RTD: la ecuación de Callendar–Van Dusen de IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 desde 0 °C). Resistencia → temperatura usa la raíz de la cuadrática desde 0 °C e iteración por debajo.",
  src2: [
    "Termopares: las funciones de referencia E = Σ cᵢ·tⁱ (el tipo K añade a₀·exp(a₁·(t − a₂)²) por encima de 0 °C) y los coeficientes inversos publicados en la NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), copiados de los archivos de cada tipo en",
    ". mV → temperatura parte de la función inversa y se afina con la función de referencia. Aquí, temperatura → mV coincide con todos los valores de las tablas de NIST (0.001 mV).",
  ],
  rngHead: ["Temperatura → mV", "mV → temperatura"],
  mmNote: "Para leer controladores de temperatura o transmisores por Modbus, use",
  mmEnd: ".",
  nNote: "Para termistores NTC (valor B, Steinhart–Hart), use la",
  nEnd: ".",
};
