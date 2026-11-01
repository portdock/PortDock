// HEX ↔ ASCII-Umrechner (views/HexAsciiPage.astro) — 4. Paket
export default {
  title: "HEX ↔ ASCII-Umrechner",
  seo: "HEX in ASCII umrechnen — mit Steuerzeichen — PortDock",
  desc: "Wandelt HEX-Bytes in Text und Text in HEX um. Steuerzeichen wie CR und LF erscheinen als \\r \\n \\xNN, sodass Sie sie direkt kopieren und senden können.",
  hex: "HEX",
  ascii: "Text (ASCII · Escape-Folgen)",
  dec: "Dezimal",
  count: "Bytes",
  how: "Druckbare Zeichen (0x20–0x7E) bleiben, wie sie sind; alles andere wird zu \\r \\n \\t \\0 \\\\ \\xNN. Umlaute und andere Nicht-ASCII-Zeichen werden zu UTF-8-Bytes. Alles läuft in Ihrem Browser.",
  tableTitle: "Häufige Steuerzeichen",
  appNote: "Um es gleich an ein Gerät zu senden, nutzen Sie",
  appEnd: ".",
  ctrlHead: ["HEX", "Name", "Eingabe"],
  asciiNote: "Alle Codes 0–127 und die Namen der Steuerzeichen finden Sie in der",
  asciiEnd: ".",
};
