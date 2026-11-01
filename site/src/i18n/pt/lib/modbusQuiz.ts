// Textos de lib/modbusQuiz.ts e do script dos exercícios Modbus (frase em inglês → português) — 4º lote.
// Os nomes de função e os significados das exceções dentro das questões usam a tradução do 1º lote (modbusDecode; a página também carrega esse grupo).
export default {
  "holding registers": "os holding registers",
  "input registers": "os registradores de entrada",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Escravo {0}, função {1} ({2}); o endereço começa em 0, então {3} → {4} = {5} {6}; quantidade {7} = 00 {8}; os 2 últimos bytes são o CRC16 (byte baixo primeiro) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Qual requisição Modbus RTU lê {0} {1} ({2} registradores) do escravo {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Escreva em HEX, com o CRC, a requisição Modbus RTU que lê {0} {1} ({2} registradores) do escravo {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Você pediu ao escravo {0} {1} registradores a partir de {2} e chegou a resposta abaixo. Qual é o valor de {3} (decimal sem sinal)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Depois do escravo {0}, da função 03 e da contagem de bytes {1} (= {2}), cada registrador ocupa 2 bytes, byte alto primeiro. {3} é o registrador nº {4}, então os bytes {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "O que significa esta resposta ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} é a função {1} somada a 0x80 — uma resposta de exceção; o byte seguinte, {2}, é o código de exceção: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "O CRC16 Modbus dos bytes abaixo é {0}. Quais dois bytes vão no fim do quadro?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Ao contrário dos valores de registrador, o CRC do Modbus RTU é enviado com o byte baixo primeiro: {0} → {1} {2}. Por isso o CRC 0xCDC5 de «01 03 00 00 00 0A» é anexado como «C5 CD».",
  "ABCD (high word first)": "ABCD (word alta primeiro)",
  "CDAB (low word first, word swap)": "CDAB (word baixa primeiro, word swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "O manual do equipamento diz que valores float32 são enviados na ordem {0}. Com os dois registradores abaixo, qual é o valor?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD significa que o primeiro registrador é a word alta, então {0} é lido como float32 IEEE 754 = {1}. Tomar como CDAB dá um valor sem sentido, como {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB significa que o primeiro registrador é a word baixa, então troque os dois e leia {0} como float32 = {1}. Ler como está (ABCD) dá um valor sem sentido, como {2}.",
  "Pick the read request": "Escolher a requisição de leitura",
  "Write the read request": "Escrever a requisição de leitura",
  "Find a value in a response": "Achar um valor na resposta",
  "Meaning of an exception": "Significado de uma exceção",
  "CRC byte order": "Ordem dos bytes do CRC",
  "Float word order": "Ordem das words do float",
  // script da página
  "Score {}/{} · streak {} · best {}": "Pontuação {0}/{1} · sequência {2} · melhor {3}",
  "Pick one of the choices.": "Escolha uma das opções.",
  "Type your answer.": "Digite sua resposta.",
  Correct: "Correto",
  "Not quite": "Não é bem isso",
  answer: "resposta",
  "Read more: ": "Saiba mais: ",
};
