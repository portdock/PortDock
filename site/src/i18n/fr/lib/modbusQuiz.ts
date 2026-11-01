// lib/modbusQuiz.ts 와 Modbus 연습장 화면 스크립트 문구(영어 문장 → 프랑스어) — 4차 묶음.
// 문제 안의 함수 이름·예외 코드 뜻은 1차 묶음 modbusDecode 의 번역을 그대로 쓴다(쪽이 modbusDecode 묶음도 싣는다).
export default {
  "holding registers": "les registres de maintien",
  "input registers": "les registres d’entrée",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Esclave {0}, fonction {1} ({2}) ; l’adresse commence à 0, donc {3} → {4} = {5} {6} ; quantité {7} = 00 {8} ; les 2 derniers octets sont le CRC16 (octet de poids faible en premier) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Quelle requête Modbus RTU lit {0} {1} ({2} registres) de l’esclave {3} ?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Écrivez en HEX, CRC compris, la requête Modbus RTU qui lit {0} {1} ({2} registres) de l’esclave {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Vous avez demandé à l’esclave {0} de lire {1} registres à partir de {2} et reçu la réponse ci-dessous. Quelle est la valeur de {3} (décimal non signé) ?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Après l’esclave {0}, la fonction 03 et le nombre d’octets {1} (= {2}), chaque registre occupe 2 octets, poids fort en premier. {3} est le registre n° {4}, donc les octets {5} à {6} : {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Que signifie cette réponse ({0} {1}) ?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} est la fonction {1} plus 0x80 — une réponse d’exception ; l’octet suivant {2} est le code d’exception : {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "Le CRC16 Modbus des octets ci-dessous vaut {0}. Quels sont les deux octets placés à la fin de la trame ?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Contrairement aux valeurs des registres, le CRC Modbus RTU est envoyé octet de poids faible en premier : {0} → {1} {2}. C’est pourquoi le CRC 0xCDC5 de « 01 03 00 00 00 0A » est ajouté sous la forme « C5 CD ».",
  "ABCD (high word first)": "ABCD (mot de poids fort en premier)",
  "CDAB (low word first, word swap)": "CDAB (mot de poids faible en premier, mots inversés)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Le manuel de l’appareil indique que les float32 sont envoyés dans l’ordre {0}. Avec les deux registres ci-dessous, quelle est la valeur ?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "En ABCD, le premier registre est le mot de poids fort : on lit donc {0} comme un float32 IEEE 754 = {1}. Le lire en CDAB donne une valeur absurde comme {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "En CDAB, le premier registre est le mot de poids faible : on les inverse et on lit {0} comme un float32 = {1}. Le lire tel quel (ABCD) donne une valeur absurde comme {2}.",
  "Pick the read request": "Choisir la requête de lecture",
  "Write the read request": "Écrire la requête de lecture",
  "Find a value in a response": "Trouver une valeur dans une réponse",
  "Meaning of an exception": "Sens d’une exception",
  "CRC byte order": "Ordre des octets du CRC",
  "Float word order": "Ordre des mots d’un float",
  // 화면 스크립트
  "Score {}/{} · streak {} · best {}": "Score {0}/{1} · série {2} · record {3}",
  "Pick one of the choices.": "Choisissez une des réponses.",
  "Type your answer.": "Saisissez votre réponse.",
  Correct: "Correct",
  "Not quite": "Pas tout à fait",
  answer: "réponse",
  "Read more: ": "Pour aller plus loin : ",
};
