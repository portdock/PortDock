// Tabla de roscas métricas: broca de roscado y tornillos (views/MetricThreadsPage.astro) — 7.º lote. Términos: rosca métrica, paso grueso/fino, broca de roscado, llave Allen, llave fija
// see = fragmentos entre enlaces
export default {
  h1: "Tabla de roscas métricas: broca de roscado y tornillos",
  desc: "Paso y broca de roscado (d − P) de roscas métricas M2–M20, gruesas y finas, más llave Allen (ISO 4762) y llave fija (ISO 4032). Busque por rosca o herramienta.",
  seo: "Brocas de roscado métricas, llaves Allen y fijas — PortDock",
  find: "Buscar una rosca",
  thread: "Rosca (p. ej. M8, M10x1.25)",
  bad: "No está en la tabla: introduzca M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 o M20 con su paso grueso o fino.",
  k: { p: "Paso", kind: "Tipo", coarse: "Grueso", fine: "Fino", drill: "Broca de roscado ≈ d − P", key: "Llave Allen (tornillo de cabeza cilíndrica ISO 4762)", sp: "Llave fija (tuerca ISO 4032, tornillo ISO 4014/4017)", din: "DIN 934 (norma antigua)" },
  rev: "Buscar por tamaño de herramienta",
  bySp: "Llave fija (mm)",
  byKey: "Llave Allen (mm)",
  tTitle: "Tabla de roscas métricas (M2–M20)",
  tHead: ["Rosca", "Paso grueso", "Broca de roscado", "Paso fino (broca de roscado)", "Llave Allen", "Llave fija"],
  tNote:
    "La broca de roscado d − P es una aproximación para machos de corte. En la práctica use la broca más cercana que tenga y ajuste según el material y la profundidad de la rosca. Los machos de laminación (formación) necesitan otro tamaño de broca: consulte la tabla del fabricante del macho. Los tamaños de llave fija son los de ISO 4032; las tuercas antiguas DIN 934 son de 17 mm para M10, 19 mm para M12 y 22 mm para M14.",
  torqueTitle: "Par de apriete",
  torque:
    "El par de un tornillo depende de la clase de resistencia (8.8, A2-70, etc.), de la lubricación y del material de contacto, y las regletas de bornes, los interruptores y los contactores tienen su propio par especificado por el fabricante (impreso en la pieza o en la hoja de datos). Esta tabla no tiene valores de par: consulte el valor del fabricante y use un destornillador dinamométrico.",
  privacy: "Esta página consulta los datos dentro de su navegador; lo que introduce no se envía a ningún servidor.",
  srcTitle: "Fuentes",
  see: ["Para los terminales de ojal que encajan en un espárrago, vea la ", ". Para convertir entre pulgadas y mm, use el ", "."],
  isoNut: "Tuercas hexagonales normales (estilo 1)",
  dinNut: "antigua norma de tuercas hexagonales",
  faqTitle: "Preguntas frecuentes",
  faq: [
    ["¿Por qué la broca de roscado es «d − P»?", "Es la aproximación habitual para machos de corte (diámetro nominal menos paso). En la práctica use la broca más cercana que tenga y ajuste según el material y la profundidad de la rosca. Los machos de laminación (formación) necesitan otra broca: consulte la tabla del fabricante del macho."],
    ["El tamaño de mi llave fija no coincide con la tabla", "Las tuercas antiguas DIN 934 usan tamaños de llave distintos de ISO 4032 para M10, M12 y M14. Compruebe el valor «DIN 934» de la tabla."],
    ["¿Por qué no hay par de apriete?", "Depende de la clase de resistencia del tornillo, de la lubricación y del material de contacto, y las regletas de bornes, los interruptores y los contactores tienen su propio par del fabricante. Siga el marcado del producto o la hoja de datos."],
  ] as [string, string][],
};
