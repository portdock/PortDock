// Ejercicios Modbus (views/ModbusPracticePage.astro) — 4.º lote. rtu = trozos antes y después del enlace al conversor RTU↔TCP (el texto del enlace lo pone weave())
export default {
  title: "Ejercicios de Modbus (cuestionario)",
  seo: "Ejercicios Modbus: tramas RTU, CRC y excepciones — PortDock",
  desc: "Ejercicios de Modbus RTU: HEX de una petición de lectura, valor de 40003 en una respuesta, excepción 83 02, orden de bytes del CRC, float ABCD o CDAB.",
  kind: "Tipo de pregunta",
  mixed: "Al azar",
  check: "Comprobar",
  next: "Siguiente pregunta",
  reset: "Borrar puntuación",
  answerLabel: "Respuesta",
  how: "Las preguntas se generan y se corrigen en su navegador. La puntuación solo se guarda en este navegador y no se envía a ningún sitio.",
  faqTitle: "Cómo se usa",
  faq: [
    ["¿Para quién es?", "Para técnicos recién incorporados y personas en formación que empiezan con Modbus RTU, o para quien quiera repasar antes de ir a campo. Tras cada respuesta aparece una explicación y enlaces a la guía y la herramienta web relacionadas."],
    ["¿Puedo pasarle la misma pregunta a otra persona?", "Copie «Enlace a esta pregunta», debajo de la pregunta, y envíelo: se abre la misma pregunta. Cada pregunta se genera a partir de un número (semilla), así que el mismo número da la misma pregunta."],
    ["¿Cómo escribo una respuesta abierta?", "En HEX no importan los espacios, las mayúsculas ni el 0x (01 03 00 00 00 0A C5 CD es igual que 0103000000 0ac5cd). Los valores van en decimal; anteponga 0x para escribirlos en HEX."],
  ],
  srcTitle: "Referencias",
  qlink: "Enlace a esta pregunta",
  guidesTitle: "Guías para leer en paralelo",
  src: ["códigos de función, forma de peticiones y respuestas, códigos de excepción", "trama RTU, CRC (byte bajo primero)", "float32. El orden de palabras de los registros (ABCD, CDAB) no está en la especificación Modbus y varía según el equipo"],
  rtu: ["Para convertir tramas entre RTU, TCP y ASCII, use el ", "."],
};
