// Conversor HEX ↔ ASCII (views/HexAsciiPage.astro) — 4º lote
export default {
  title: "Conversor HEX ↔ ASCII",
  seo: "Conversor HEX para ASCII com caracteres de controle — PortDock",
  desc: "Converta bytes HEX em texto e texto em HEX. Caracteres de controle como CR e LF aparecem como \\r \\n \\xNN para você copiar e enviar como estão.",
  hex: "HEX",
  ascii: "Texto (ASCII · escapes)",
  dec: "Decimal",
  count: "bytes",
  how: "Caracteres imprimíveis (0x20–0x7E) ficam como estão; o resto vira \\r \\n \\t \\0 \\\\ \\xNN. Texto fora do ASCII (ç, acentos…) vira bytes UTF-8. Tudo é calculado no seu navegador.",
  tableTitle: "Caracteres de controle comuns",
  appNote: "Para enviar a um equipamento na hora, use o",
  appEnd: ".",
  ctrlHead: ["HEX", "Nome", "Escape"],
  asciiNote: "Todos os códigos 0–127 e os nomes dos caracteres de controle estão na",
  asciiEnd: ".",
};
