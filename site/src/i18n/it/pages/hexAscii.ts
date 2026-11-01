// HEX ↔ ASCII 변환기(views/HexAsciiPage.astro) — 4차 묶음
export default {
  title: "Convertitore HEX ↔ ASCII",
  seo: "Convertitore HEX ↔ ASCII con caratteri di controllo — PortDock",
  desc: "Convertite byte esadecimali in testo e testo in HEX. CR, LF e gli altri caratteri di controllo appaiono come \\r \\n \\xNN, pronti da copiare e inviare.",
  hex: "HEX",
  ascii: "Testo (ASCII · escape)",
  dec: "Decimale",
  count: "byte",
  how: "I caratteri stampabili (0x20–0x7E) restano come sono; tutto il resto diventa \\r \\n \\t \\0 \\\\ \\xNN. Il testo non ASCII (à, è…) diventa byte UTF-8. Tutto avviene nel browser.",
  tableTitle: "Caratteri di controllo frequenti",
  appNote: "Per inviarlo subito a un dispositivo, usate",
  appEnd: ".",
  ctrlHead: ["HEX", "Nome", "Escape"],
  asciiNote: "Per tutti i codici 0–127 e i nomi dei caratteri di controllo, vedete la",
  asciiEnd: ".",
};
