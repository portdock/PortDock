// Konwerter HEX ↔ ASCII (views/HexAsciiPage.astro) — 4. pakiet
export default {
  title: "Konwerter HEX ↔ ASCII",
  seo: "Konwerter HEX na ASCII ze znakami sterującymi — PortDock",
  desc: "Zamienia bajty HEX na tekst i tekst na HEX. Znaki sterujące, takie jak CR i LF, pojawiają się jako \\r \\n \\xNN, więc można je od razu skopiować i wysłać.",
  hex: "HEX",
  ascii: "Tekst (ASCII · sekwencje ucieczki)",
  dec: "Dziesiętnie",
  count: "bajtów",
  how: "Znaki drukowalne (0x20–0x7E) zostają bez zmian; wszystko inne staje się \\r \\n \\t \\0 \\\\ \\xNN. Polskie litery i inne znaki spoza ASCII stają się bajtami UTF-8. Wszystko działa w Twojej przeglądarce.",
  tableTitle: "Częste znaki sterujące",
  appNote: "Aby od razu wysłać to do urządzenia, użyj programu",
  appEnd: ".",
  ctrlHead: ["HEX", "Nazwa", "Wpisz"],
  asciiNote: "Wszystkie kody 0–127 i nazwy znaków sterujących znajdziesz w narzędziu",
  asciiEnd: ".",
};
