// Conversion Pt100 et thermocouples (views/TemperaturePage.astro) — 5차 묶음. 영어판에서 옮김.
// 용어: sonde à résistance (RTD), thermocouple de type K, soudure froide, compensation de soudure froide, f.é.m., fonction de référence
// 열전대 형 이름·오류 문구는 lib/temperature. src2 는 its90.nist.gov 링크 앞·뒤 조각
// mmNote 뒤 링크는 앱 쪽(PortDock Modbus Master, 이름 그대로), nNote 뒤 링크 글은 화면이 pageName() 으로
export default {
  title: "Conversion Pt100 et thermocouples",
  seo: "Conversion Pt100 et thermocouple : Ω, mV ↔ °C — PortDock",
  desc: "Pt100/Pt1000 (Ω) et thermocouples K, J, T, E, N, R, S, B (mV) ↔ température. IEC 60751, NIST ITS-90, compensation de soudure froide.",
  rtdTitle: "Sonde à résistance (RTD)",
  sensor: "Capteur",
  temp: "Température (°C)",
  res: "Résistance (Ω)",
  tcTitle: "Thermocouple",
  type: "Type",
  cj: "Soudure froide (°C)",
  emf: "Tension mesurée (mV)",
  emf0: "F.é.m. (référence 0 °C)",
  range: "Plage",
  rtdNote: "α = 0.00385, de −200 à 850 °C",
  tcNote: "Température → mV fonctionne sur toute la « Plage » ; mV → température seulement dans la plage des fonctions inverses du NIST.",
  tableTitle: "Table de températures",
  step: "Pas (°C)",
  tableNote: "Les tables de thermocouples sont données avec la soudure froide à 0 °C, comme les tables du NIST.",
  how: "Tout est calculé dans votre navigateur ; rien de ce que vous saisissez n’est envoyé. Les valeurs hors plage sont signalées, pas calculées.",
  srcTitle: "Équations et sources",
  faqTitle: "Questions fréquentes",
  faq: [
    [
      "Comment fonctionne la compensation de soudure froide ?",
      "La tension d’un thermocouple dépend de la différence de température entre la soudure chaude (point de mesure) et la soudure froide (bornes). Ajoutez la f.é.m. de la soudure froide aux mV mesurés puis convertissez : E(t) = E mesurée + E(soudure froide). En sens inverse, la lecture attendue est E(t) − E(soudure froide).",
    ],
    [
      "Quelle différence entre Pt100 et Pt1000 ?",
      "Seulement la résistance à 0 °C (R0) : 100 Ω ou 1000 Ω. Les deux suivent la même équation (α = 0.00385) : à toute température, une Pt1000 a une résistance dix fois plus grande qu’une Pt100.",
    ],
    [
      "Pourquoi la plage mV → température est-elle plus étroite ?",
      "Le NIST publie l’inverse de la fonction de référence température → mV sous forme d’approximations par intervalles. Cet outil ne convertit mV → température que là où ces approximations s’appliquent, ex. type K de −200 à 1372 °C, type B de 250 à 1820 °C.",
    ],
  ],
  src1: "Sondes à résistance : équation de Callendar–Van Dusen de l’IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 à partir de 0 °C). Résistance → température utilise la racine de l’équation du second degré à partir de 0 °C et un calcul itératif en dessous.",
  src2: [
    "Thermocouples : les fonctions de référence E = Σ cᵢ·tⁱ (le type K ajoute a₀·exp(a₁·(t − a₂)²) au-dessus de 0 °C) et les coefficients inverses publiés dans la NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), recopiés des fichiers par type sur",
    ". mV → température part de la fonction inverse puis est affiné avec la fonction de référence. Ici, température → mV reproduit toutes les valeurs des tables du NIST (0.001 mV).",
  ],
  rngHead: ["Température → mV", "mV → température"],
  mmNote: "Pour lire des régulateurs de température ou des transmetteurs en Modbus :",
  mmEnd: ".",
  nNote: "Pour les thermistances CTN (valeur B, Steinhart–Hart) :",
  nEnd: ".",
};
