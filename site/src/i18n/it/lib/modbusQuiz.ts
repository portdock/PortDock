// lib/modbusQuiz.ts 와 Modbus 연습장 화면 스크립트 문구(영어 문장 → 이탈리아어) — 4차 묶음.
// 문제 안의 함수 이름·예외 코드 뜻은 1차 묶음 modbusDecode 의 번역을 그대로 쓴다(쪽이 modbusDecode 묶음도 싣는다).
export default {
  "holding registers": "gli holding register",
  "input registers": "gli input register",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Slave {0}, funzione {1} ({2}); l'indirizzo parte da 0, quindi {3} → {4} = {5} {6}; quantità {7} = 00 {8}; gli ultimi 2 byte sono il CRC16 (prima il byte basso) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Quale richiesta Modbus RTU legge {0} {1} ({2} registri) dallo slave {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Scrivete in HEX, CRC compreso, la richiesta Modbus RTU che legge {0} {1} ({2} registri) dallo slave {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Avete chiesto allo slave {0} {1} registri a partire da {2} e avete ricevuto la risposta qui sotto. Qual è il valore di {3} (decimale senza segno)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Dopo lo slave {0}, la funzione 03 e il conteggio byte {1} (= {2}), ogni registro occupa 2 byte, prima il byte alto. {3} è il registro n. {4}, quindi i byte {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Che cosa significa questa risposta ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} è la funzione {1} più 0x80 — una risposta di eccezione; il byte successivo {2} è il codice di eccezione: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "Il CRC16 Modbus dei byte qui sotto è {0}. Quali due byte vanno alla fine del frame?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "A differenza dei valori dei registri, il CRC Modbus RTU si invia con il byte basso per primo: {0} → {1} {2}. Per questo il CRC 0xCDC5 di «01 03 00 00 00 0A» si aggiunge come «C5 CD».",
  "ABCD (high word first)": "ABCD (prima la word alta)",
  "CDAB (low word first, word swap)": "CDAB (prima la word bassa, word swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Il manuale del dispositivo dice che i float32 sono inviati in ordine {0}. Con i due registri qui sotto, qual è il valore?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "In ABCD il primo registro è la word alta, quindi si legge {0} come float32 IEEE 754 = {1}. Leggendolo come CDAB si ottiene un valore assurdo come {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "In CDAB il primo registro è la word bassa, quindi si scambiano e si legge {0} come float32 = {1}. Leggendolo così com'è (ABCD) si ottiene un valore assurdo come {2}.",
  "Pick the read request": "Scegli la richiesta di lettura",
  "Write the read request": "Scrivi la richiesta di lettura",
  "Find a value in a response": "Trova un valore in una risposta",
  "Meaning of an exception": "Significato di un'eccezione",
  "CRC byte order": "Ordine dei byte del CRC",
  "Float word order": "Ordine delle word di un float",
  // 화면 스크립트
  "Score {}/{} · streak {} · best {}": "Punteggio {0}/{1} · serie {2} · record {3}",
  "Pick one of the choices.": "Scegliete una delle risposte.",
  "Type your answer.": "Scrivete la risposta.",
  Correct: "Corretto",
  "Not quite": "Non proprio",
  answer: "risposta",
  "Read more: ": "Per approfondire: ",
};
