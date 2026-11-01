// Conversor HEX ↔ ASCII (views/HexAsciiPage.astro) — 4.º lote
export default {
  title: "Conversor HEX ↔ ASCII",
  seo: "Conversor HEX a ASCII con caracteres de control — PortDock",
  desc: "Convierta bytes HEX en texto y texto en HEX. Los caracteres de control como CR y LF se muestran como \\r \\n \\xNN para copiarlos y enviarlos tal cual.",
  hex: "HEX",
  ascii: "Texto (ASCII · escapes)",
  dec: "Decimal",
  count: "bytes",
  how: "Los caracteres imprimibles (0x20–0x7E) quedan igual; el resto se escribe como \\r \\n \\t \\0 \\\\ \\xNN. El texto no ASCII (ñ, tildes…) se convierte en bytes UTF-8. Todo se calcula en su navegador.",
  tableTitle: "Caracteres de control habituales",
  appNote: "Para enviarlo a un equipo enseguida, use",
  appEnd: ".",
  ctrlHead: ["HEX", "Nombre", "Escape"],
  asciiNote: "Todos los códigos 0–127 y los nombres de los caracteres de control están en la",
  asciiEnd: ".",
};
