// lib/modbusQuiz.ts und Seitenskript der Modbus-Übung (englischer Satz → Deutsch) — 4. Paket.
// Funktionsnamen und Bedeutung der Exception-Codes in den Aufgaben kommen aus der Übersetzung modbusDecode (1. Paket; die Seite lädt diese Gruppe mit).
export default {
  "holding registers": "Holding-Register",
  "input registers": "Input-Register",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Slave {0}, Funktion {1} ({2}); die Adresse zählt ab 0, also {3} → {4} = {5} {6}; Anzahl {7} = 00 {8}; die letzten 2 Bytes sind die CRC16 (niederwertiges Byte zuerst) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Welche Modbus-RTU-Anfrage liest {0} {1} ({2} Register) von Slave {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Schreiben Sie die Modbus-RTU-Anfrage samt CRC in HEX, die {0} {1} ({2} Register) von Slave {3} liest.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Sie haben Slave {0} nach {1} Registern ab {2} gefragt und die Antwort unten erhalten. Welchen Wert hat {3} (dezimal ohne Vorzeichen)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Nach Slave {0}, Funktion 03 und Byteanzahl {1} (= {2}) belegt jedes Register 2 Bytes, höherwertiges Byte zuerst. {3} ist Register Nr. {4}, also Bytes {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Was bedeutet diese Antwort ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} ist Funktion {1} plus 0x80 — eine Exception-Antwort; das nächste Byte {2} ist der Exception-Code: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "Die CRC16 Modbus der Bytes unten ist {0}. Welche zwei Bytes stehen am Ende des Telegramms?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Anders als Registerwerte wird die CRC bei Modbus RTU mit dem niederwertigen Byte zuerst gesendet: {0} → {1} {2}. Deshalb wird die CRC 0xCDC5 von „01 03 00 00 00 0A“ als „C5 CD“ angehängt.",
  "ABCD (high word first)": "ABCD (High-Word zuerst)",
  "CDAB (low word first, word swap)": "CDAB (Low-Word zuerst, Word-Swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Laut Gerätehandbuch werden float32-Werte in der Folge {0} gesendet. Welcher Wert ergibt sich aus den zwei Registern unten?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD heißt: Das erste Register ist das High-Word, also {0} als IEEE-754-float32 lesen = {1}. Als CDAB gelesen ergibt sich ein unsinniger Wert wie {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB heißt: Das erste Register ist das Low-Word, also beide tauschen und {0} als float32 lesen = {1}. Unverändert (ABCD) gelesen ergibt sich ein unsinniger Wert wie {2}.",
  "Pick the read request": "Leseanfrage auswählen",
  "Write the read request": "Leseanfrage schreiben",
  "Find a value in a response": "Wert in einer Antwort finden",
  "Meaning of an exception": "Bedeutung einer Exception",
  "CRC byte order": "CRC-Bytefolge",
  "Float word order": "Float-Wortfolge",
  // Seitenskript
  "Score {}/{} · streak {} · best {}": "Punkte {0}/{1} · Serie {2} · Bestwert {3}",
  "Pick one of the choices.": "Bitte eine der Antworten auswählen.",
  "Type your answer.": "Bitte Ihre Antwort eingeben.",
  Correct: "Richtig",
  "Not quite": "Nicht ganz",
  answer: "Lösung",
  "Read more: ": "Mehr dazu: ",
};
