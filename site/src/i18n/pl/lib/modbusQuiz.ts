// lib/modbusQuiz.ts i skrypt strony ćwiczeń Modbus (zdanie angielskie → polskie) — 4. pakiet.
// Nazwy funkcji i znaczenie kodów wyjątków w zadaniach pochodzą z tłumaczenia modbusDecode (1. pakiet; strona ładuje też tę grupę).
// Liczebniki zapisane jako „liczba rejestrów: n”, żeby nie odmieniać (2 rejestry / 5 rejestrów).
export default {
  "holding registers": "rejestry Holding",
  "input registers": "rejestry wejściowe",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Adres urządzenia {0}, funkcja {1} ({2}); adres liczony jest od 0, więc {3} → {4} = {5} {6}; liczba {7} = 00 {8}; ostatnie 2 bajty to CRC16 (młodszy bajt pierwszy) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Które zapytanie Modbus RTU odczytuje {0} {1} (liczba rejestrów: {2}) z urządzenia o adresie {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Zapisz w HEX, razem z CRC, zapytanie Modbus RTU odczytujące {0} {1} (liczba rejestrów: {2}) z urządzenia o adresie {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Zapytano urządzenie o adresie {0} o rejestry od {2} (liczba rejestrów: {1}) i przyszła poniższa odpowiedź. Jaka jest wartość {3} (dziesiętnie bez znaku)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Po adresie urządzenia {0}, funkcji 03 i liczbie bajtów {1} (= {2}) każdy rejestr zajmuje 2 bajty, starszy bajt pierwszy. {3} to rejestr nr {4}, więc bajty {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Co oznacza ta odpowiedź ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} to funkcja {1} plus 0x80 — odpowiedź z wyjątkiem; następny bajt {2} to kod wyjątku: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "CRC16 Modbus poniższych bajtów wynosi {0}. Które dwa bajty trafiają na koniec ramki?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Inaczej niż wartości rejestrów, CRC w Modbus RTU wysyłane jest młodszym bajtem naprzód: {0} → {1} {2}. Dlatego CRC 0xCDC5 dla „01 03 00 00 00 0A” dopisywane jest jako „C5 CD”.",
  "ABCD (high word first)": "ABCD (starsze słowo pierwsze)",
  "CDAB (low word first, word swap)": "CDAB (młodsze słowo pierwsze, zamiana słów)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Według instrukcji urządzenia wartości float32 są wysyłane w kolejności {0}. Jaka jest wartość przy poniższych dwóch rejestrach?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD oznacza, że pierwszy rejestr to starsze słowo, więc {0} czytamy jako float32 IEEE 754 = {1}. Odczyt jako CDAB daje bezsensowną wartość, np. {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB oznacza, że pierwszy rejestr to młodsze słowo, więc zamieniamy je i {0} czytamy jako float32 = {1}. Odczyt bez zamiany (ABCD) daje bezsensowną wartość, np. {2}.",
  "Pick the read request": "Wybierz zapytanie odczytu",
  "Write the read request": "Zapisz zapytanie odczytu",
  "Find a value in a response": "Znajdź wartość w odpowiedzi",
  "Meaning of an exception": "Znaczenie wyjątku",
  "CRC byte order": "Kolejność bajtów CRC",
  "Float word order": "Kolejność słów float",
  // skrypt strony
  "Score {}/{} · streak {} · best {}": "Wynik {0}/{1} · seria {2} · rekord {3}",
  "Pick one of the choices.": "Wybierz jedną z odpowiedzi.",
  "Type your answer.": "Wpisz odpowiedź.",
  Correct: "Dobrze",
  "Not quite": "Nie do końca",
  answer: "odpowiedź",
  "Read more: ": "Więcej: ",
};
