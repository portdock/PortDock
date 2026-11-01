// Modbus-Übungsquiz (views/ModbusPracticePage.astro) — 4. Paket. rtu = Teile vor und nach dem Link zum RTU↔TCP-Umrechner (den Linktext setzt weave() ein)
export default {
  title: "Modbus-Übung (Quiz)",
  seo: "Modbus Übung: Quiz zu RTU-Telegrammen, CRC, Exceptions — PortDock",
  desc: "Modbus-RTU-Übung: HEX einer Leseanfrage, Wert von 40003 in einer Antwort, Exception 83 02, CRC-Bytefolge, Float ABCD oder CDAB — jeweils mit Erklärung.",
  kind: "Aufgabentyp",
  mixed: "Gemischt",
  check: "Antwort prüfen",
  next: "Nächste Aufgabe",
  reset: "Punkte zurücksetzen",
  answerLabel: "Antwort",
  how: "Die Aufgaben werden in Ihrem Browser erstellt und bewertet. Der Punktestand bleibt nur in diesem Browser und wird nirgendwohin gesendet.",
  faqTitle: "So funktioniert es",
  faq: [
    ["Für wen ist das?", "Für Berufseinsteiger und Auszubildende, die Modbus RTU lernen, oder alle, die vor einem Einsatz vor Ort ihr Wissen auffrischen wollen. Nach jeder Antwort gibt es eine Erklärung und Links zum passenden Leitfaden und Web-Tool."],
    ["Kann ich jemandem dieselbe Aufgabe geben?", "Kopieren Sie „Link zu dieser Aufgabe“ unter der Aufgabe und schicken Sie ihn weiter; er öffnet dieselbe Aufgabe. Jede Aufgabe entsteht aus einer Zahl (Seed) — dieselbe Zahl ergibt dieselbe Aufgabe."],
    ["Wie gebe ich eine freie Antwort ein?", "Bei HEX zählen Leerzeichen, Groß-/Kleinschreibung und 0x nicht (01 03 00 00 00 0A C5 CD ist gleich 0103000000 0ac5cd). Werte sind dezimal; mit vorangestelltem 0x wird HEX gelesen."],
  ],
  srcTitle: "Grundlagen",
  qlink: "Link zu dieser Aufgabe",
  guidesTitle: "Leitfäden zum Weiterlesen",
  src: ["Funktionscodes, Aufbau von Anfrage und Antwort, Exception-Codes", "RTU-Telegramm, CRC (niederwertiges Byte zuerst)", "float32. Die Wortfolge der Register (ABCD, CDAB) steht nicht in der Modbus-Spezifikation und ist je nach Gerät verschieden"],
  rtu: ["Um Telegramme zwischen RTU, TCP und ASCII umzuwandeln, nutzen Sie den ", "."],
};
