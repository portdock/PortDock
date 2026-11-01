// HEX ↔ ASCII 변환기(views/HexAsciiPage.astro) — 4차 묶음
export default {
  title: "Convertisseur HEX ↔ ASCII",
  seo: "Convertisseur hexa ↔ ASCII avec caractères de contrôle — PortDock",
  desc: "Convertissez des octets hexa en texte et du texte en hexa. CR, LF et autres caractères de contrôle s’affichent en \\r \\n \\xNN, prêts à copier et envoyer.",
  hex: "HEX",
  ascii: "Texte (ASCII · échappements)",
  dec: "Décimal",
  count: "octets",
  how: "Les caractères imprimables (0x20–0x7E) restent tels quels ; tout le reste devient \\r \\n \\t \\0 \\\\ \\xNN. Le texte non ASCII (é, à…) devient des octets UTF-8. Tout s’exécute dans votre navigateur.",
  tableTitle: "Caractères de contrôle courants",
  appNote: "Pour l’envoyer tout de suite à un appareil, utilisez",
  appEnd: ".",
  ctrlHead: ["HEX", "Nom", "Échappement"],
  asciiNote: "Pour tous les codes de 0 à 127 et le nom des caractères de contrôle, voir la",
  asciiEnd: ".",
};
