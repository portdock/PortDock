// CRC·체크섬 계산기(views/ChecksumPage.astro)
export default {
  title: "Calculateur de CRC et somme de contrôle",
  seo: "Calcul CRC16 Modbus et somme de contrôle en ligne — PortDock",
  desc: "Calcule CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 et SUM16 en une fois. Saisie HEX ou ASCII (\\r \\n \\xNN), octets dans l’ordre d’envoi.",
  input: "Données",
  mode: "Saisie",
  kind: "Type",
  value: "Somme de contrôle (ordre des octets)",
  frame: "Données + somme de contrôle",
  bytes: "octets",
  hexHelp: "ex. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "ex. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Algorithmes",
  how: "Tout le calcul se fait dans votre navigateur ; rien de ce que vous saisissez n’est envoyé.",
  appNote: "Pour ajouter et vérifier les sommes de contrôle en dialoguant avec un appareil :",
  appLink: "PortDock Serial",
  faqTitle: "Questions fréquentes",
  faq: [
    ["Pourquoi l’ordre des octets du CRC Modbus RTU est-il inversé ?", "Modbus RTU envoie d’abord l’octet de poids faible du CRC16. Le CRC de « 01 03 00 00 00 0A » vaut 0xCDC5 et circule sur la ligne sous la forme « C5 CD »."],
    ["Mon CRC16 CCITT diffère de celui d’un autre calculateur", "Le CCITT existe en plusieurs variantes selon la valeur initiale. Ici, « CRC16 CCITT » part de 0xFFFF (CCITT-FALSE) et « CRC16 XMODEM » de 0x0000. Kermit est une variante à bits inversés."],
    ["Le LRC est-il le même que celui de Modbus ASCII ?", "Même formule (complément à deux de la somme des octets), appliquée aux octets bruts. Pour Modbus ASCII, convertissez d’abord les caractères en octets."],
  ],
};
