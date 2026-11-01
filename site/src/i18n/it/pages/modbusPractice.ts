// Modbus 연습장(views/ModbusPracticePage.astro) — 4차 묶음. rtu 는 RTU↔TCP 변환기 링크의 앞·뒤 조각(링크 글은 weave() 가 끼운다)
export default {
  title: "Esercizi Modbus (quiz)",
  seo: "Esercizi Modbus: quiz su frame RTU, CRC, eccezioni — PortDock",
  desc: "Esercizi Modbus RTU: HEX di una richiesta di lettura, valore di 40003 in una risposta, eccezione 83 02, ordine del CRC, float ABCD o CDAB. Con spiegazioni.",
  kind: "Tipo di domanda",
  mixed: "Misto",
  check: "Verifica",
  next: "Domanda successiva",
  reset: "Azzera il punteggio",
  answerLabel: "Risposta",
  how: "Le domande vengono create e corrette nel browser. Il punteggio resta solo in questo browser e non viene inviato da nessuna parte.",
  faqTitle: "Come si usa",
  faq: [
    ["A chi è rivolto?", "A tecnici alle prime armi e tirocinanti che imparano il Modbus RTU, o a chi vuole ripassare prima di un intervento. Dopo ogni risposta compaiono una spiegazione e i link alla guida e allo strumento web corrispondenti."],
    ["Posso dare la stessa domanda a qualcun altro?", "Copiate «Link a questa domanda» sotto la domanda e inviatelo: apre la stessa domanda. Ogni domanda è costruita da un numero (un seed), quindi lo stesso numero dà la stessa domanda."],
    ["Come si scrive una risposta libera?", "In HEX spazi, maiuscole/minuscole e 0x sono ignorati (01 03 00 00 00 0A C5 CD equivale a 0103000000 0ac5cd). I valori sono in decimale; anteponete 0x per inserire un esadecimale."],
  ],
  srcTitle: "Riferimenti",
  qlink: "Link a questa domanda",
  guidesTitle: "Guide da leggere insieme",
  src: ["codici funzione, struttura di richieste e risposte, codici di eccezione", "frame RTU, CRC (prima il byte basso)", "float32. L'ordine delle word nei registri (ABCD, CDAB) non è nella specifica Modbus e varia da dispositivo a dispositivo"],
  rtu: ["Per convertire frame tra RTU, TCP e ASCII usate il ", "."],
};
