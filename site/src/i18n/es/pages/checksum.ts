// CRC·체크섬 계산기(views/ChecksumPage.astro)
export default {
  title: "Calculadora de CRC y checksum",
  seo: "Calculadora CRC16 Modbus y checksum en línea — PortDock",
  desc: "Calcule de una vez CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 y SUM16. Entrada HEX o ASCII (\\r \\n \\xNN), con los bytes en el orden de transmisión.",
  input: "Datos",
  mode: "Entrada",
  kind: "Tipo",
  value: "Checksum (orden de bytes)",
  frame: "Datos + checksum",
  bytes: "bytes",
  hexHelp: "p. ej.: 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "p. ej.: STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Algoritmos",
  how: "Todo se calcula en su navegador; nada de lo que escribe se envía a ningún sitio.",
  appNote: "Para añadir y comprobar checksums mientras se comunica con un equipo, use",
  appLink: "PortDock Serial",
  faqTitle: "Preguntas frecuentes",
  faq: [
    ["¿Por qué el CRC de Modbus RTU va en orden inverso?", "Modbus RTU envía primero el byte bajo del CRC16. El CRC de «01 03 00 00 00 0A» es 0xCDC5 y en la línea viaja como «C5 CD»."],
    ["Mi CRC16 CCITT no coincide con otra calculadora", "CCITT tiene variantes según el valor inicial. Aquí «CRC16 CCITT» usa el valor inicial 0xFFFF (CCITT-FALSE) y «CRC16 XMODEM» usa 0x0000. Kermit es otra variante con el orden de bits invertido."],
    ["¿El LRC es el mismo que el LRC de Modbus ASCII?", "Es la misma fórmula (complemento a dos de la suma de los bytes) aplicada a los bytes en bruto. Para Modbus ASCII, convierta primero los caracteres a bytes."],
  ],
};
