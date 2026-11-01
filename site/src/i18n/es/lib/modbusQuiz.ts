// Textos de lib/modbusQuiz.ts y del script de los ejercicios Modbus (frase en inglés → español) — 4.º lote.
// Los nombres de función y los significados de las excepciones dentro de las preguntas usan la traducción del 1.er lote (modbusDecode; la página también carga ese grupo).
export default {
  "holding registers": "los registros de retención",
  "input registers": "los registros de entrada",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Esclavo {0}, función {1} ({2}); la dirección empieza en 0, así que {3} → {4} = {5} {6}; cantidad {7} = 00 {8}; los 2 últimos bytes son el CRC16 (byte bajo primero) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "¿Qué petición Modbus RTU lee {0} {1} ({2} registros) del esclavo {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Escriba en HEX, con el CRC incluido, la petición Modbus RTU que lee {0} {1} ({2} registros) del esclavo {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Pidió al esclavo {0} {1} registros a partir de {2} y llegó la respuesta de abajo. ¿Cuál es el valor de {3} (decimal sin signo)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Después del esclavo {0}, la función 03 y el contador de bytes {1} (= {2}), cada registro ocupa 2 bytes, byte alto primero. {3} es el registro n.º {4}, así que los bytes {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "¿Qué significa esta respuesta ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} es la función {1} más 0x80: una respuesta de excepción; el byte siguiente, {2}, es el código de excepción: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "El CRC16 Modbus de los bytes de abajo es {0}. ¿Qué dos bytes van al final de la trama?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "A diferencia de los valores de registro, el CRC de Modbus RTU se envía con el byte bajo primero: {0} → {1} {2}. Por eso el CRC 0xCDC5 de «01 03 00 00 00 0A» se añade como «C5 CD».",
  "ABCD (high word first)": "ABCD (palabra alta primero)",
  "CDAB (low word first, word swap)": "CDAB (palabra baja primero, word swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "El manual del equipo dice que los float32 se envían en orden {0}. Con los dos registros de abajo, ¿cuál es el valor?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD significa que el primer registro es la palabra alta, así que {0} se lee como float32 IEEE 754 = {1}. Tomarlo como CDAB da un valor sin sentido, como {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB significa que el primer registro es la palabra baja, así que se intercambian y {0} se lee como float32 = {1}. Leerlo tal cual (ABCD) da un valor sin sentido, como {2}.",
  "Pick the read request": "Elegir la petición de lectura",
  "Write the read request": "Escribir la petición de lectura",
  "Find a value in a response": "Buscar un valor en una respuesta",
  "Meaning of an exception": "Significado de una excepción",
  "CRC byte order": "Orden de bytes del CRC",
  "Float word order": "Orden de palabras del float",
  // script de la página
  "Score {}/{} · streak {} · best {}": "Puntuación {0}/{1} · racha {2} · mejor {3}",
  "Pick one of the choices.": "Elija una de las opciones.",
  "Type your answer.": "Escriba su respuesta.",
  Correct: "Correcto",
  "Not quite": "No es correcto",
  answer: "respuesta",
  "Read more: ": "Más información: ",
};
