// Tabela de roscas métricas: furo de macho e parafusos (views/MetricThreadsPage.astro) — 7.º lote. Termos: rosca métrica, passo normal/fino, furo para macho, chave Allen, chave de boca
// see = trechos entre links
export default {
  h1: "Tabela de roscas métricas: furo de macho e parafusos",
  desc: "Passo e furo para macho (d − P) de roscas métricas M2–M20, normais e finas, mais chave Allen (ISO 4762) e de boca (ISO 4032). Busque por rosca ou ferramenta.",
  seo: "Tabela de furos para macho, chaves Allen e de boca — PortDock",
  find: "Buscar uma rosca",
  thread: "Rosca (p. ex. M8, M10x1.25)",
  bad: "Não está na tabela — informe M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 ou M20 com o passo normal ou fino.",
  k: { p: "Passo", kind: "Tipo", coarse: "Normal", fine: "Fino", drill: "Furo para macho ≈ d − P", key: "Chave Allen (parafuso de cabeça cilíndrica ISO 4762)", sp: "Chave de boca (porca ISO 4032, parafuso ISO 4014/4017)", din: "DIN 934 (norma antiga)" },
  rev: "Buscar pelo tamanho da ferramenta",
  bySp: "Chave de boca (mm)",
  byKey: "Chave Allen (mm)",
  tTitle: "Tabela de roscas métricas (M2–M20)",
  tHead: ["Rosca", "Passo normal", "Furo para macho", "Passo fino (furo para macho)", "Chave Allen", "Chave de boca"],
  tNote:
    "O furo para macho d − P é uma aproximação para machos de corte. Na prática use a broca mais próxima que tiver e ajuste conforme o material e a profundidade da rosca. Machos de laminação (formação) pedem outro diâmetro de furo — veja a tabela do fabricante do macho. Os tamanhos de chave de boca são os da ISO 4032; as porcas antigas DIN 934 são de 17 mm para M10, 19 mm para M12 e 22 mm para M14.",
  torqueTitle: "Torque de aperto",
  torque:
    "O torque de um parafuso depende da classe de resistência (8.8, A2-70 etc.), da lubrificação e do material de contato, e réguas de bornes, disjuntores e contatores têm seu próprio torque especificado pelo fabricante (impresso na peça ou no datasheet). Esta tabela não tem valores de torque — confira o valor do fabricante e use uma chave de fenda com torquímetro.",
  privacy: "Esta página consulta os dados dentro do seu navegador; o que você digita não é enviado a nenhum servidor.",
  srcTitle: "Fontes",
  see: ["Para os terminais de olhal que servem num parafuso, veja a ", ". Para converter entre polegadas e mm, use o ", "."],
  isoNut: "Porcas sextavadas normais (estilo 1)",
  dinNut: "antiga norma de porcas sextavadas",
  faqTitle: "Perguntas frequentes",
  faq: [
    ["Por que o furo para macho é «d − P»?", "É a aproximação usual para machos de corte (diâmetro nominal menos passo). Na prática use a broca mais próxima que tiver e ajuste conforme o material e a profundidade da rosca. Machos de laminação (formação) pedem outra broca — veja a tabela do fabricante do macho."],
    ["O tamanho da minha chave de boca não bate com a tabela", "As porcas antigas DIN 934 usam tamanhos de chave diferentes dos da ISO 4032 para M10, M12 e M14. Confira o valor «DIN 934» da tabela."],
    ["Por que não há torque de aperto?", "Depende da classe de resistência do parafuso, da lubrificação e do material de contato, e réguas de bornes, disjuntores e contatores têm seu próprio torque do fabricante. Siga a marcação do produto ou o datasheet."],
  ] as [string, string][],
};
