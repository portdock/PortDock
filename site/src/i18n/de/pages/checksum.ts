// CRC- und Prüfsummenrechner (views/ChecksumPage.astro)
export default {
  title: "CRC- und Prüfsummenrechner",
  seo: "CRC16-Modbus- und Prüfsummenrechner online — PortDock",
  desc: "Berechnet CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 und SUM16 auf einmal. Eingabe als HEX oder ASCII (\\r \\n \\xNN), Bytes in Senderreihenfolge.",
  input: "Daten",
  mode: "Eingabeformat",
  kind: "Verfahren",
  value: "Prüfsumme (Senderreihenfolge)",
  frame: "Daten + Prüfsumme",
  bytes: "Bytes",
  hexHelp: "z. B. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "z. B. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Verfahren",
  how: "Alles wird in Ihrem Browser berechnet; Ihre Eingaben werden nirgendwohin gesendet.",
  appNote: "Prüfsummen direkt beim Senden an ein Gerät anhängen und prüfen:",
  appLink: "PortDock Serial",
  faqTitle: "Häufige Fragen",
  faq: [
    ["Warum ist die Bytefolge der Modbus-RTU-CRC vertauscht?", "Modbus RTU sendet das niederwertige Byte der CRC16 zuerst. Die CRC von „01 03 00 00 00 0A“ ist 0xCDC5 und steht auf der Leitung als „C5 CD“."],
    ["Mein CRC16-CCITT-Wert weicht von einem anderen Rechner ab", "Von CCITT gibt es Varianten mit unterschiedlichem Startwert. „CRC16 CCITT“ nutzt hier den Startwert 0xFFFF (CCITT-FALSE), „CRC16 XMODEM“ den Startwert 0x0000. Kermit ist eine weitere Variante mit umgekehrter Bitfolge."],
    ["Ist die LRC dieselbe wie bei Modbus ASCII?", "Gleiche Formel (Zweierkomplement der Bytesumme), angewandt auf die Rohbytes. Bei Modbus ASCII wandeln Sie die Zeichen zuerst in Bytes um."],
  ],
};
