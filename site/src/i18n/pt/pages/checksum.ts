// Calculadora de CRC e checksum (views/ChecksumPage.astro)
export default {
  title: "Calculadora de CRC e checksum",
  seo: "Calculadora de CRC16 Modbus e checksum online — PortDock",
  desc: "Calcule juntos CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 e SUM16. Entrada em HEX ou ASCII (\\r \\n \\xNN), na ordem de transmissão.",
  input: "Dados",
  mode: "Formato de entrada",
  kind: "Tipo",
  value: "Checksum (ordem de envio)",
  frame: "Dados + checksum",
  bytes: "bytes",
  hexHelp: "ex.: 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "ex.: STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Algoritmos",
  how: "Todo o cálculo é feito no seu navegador; nada do que você digita é enviado para lugar nenhum.",
  appNote: "Para anexar e conferir checksums enquanto conversa com o equipamento, use o",
  appLink: "PortDock Serial",
  faqTitle: "Perguntas frequentes",
  faq: [
    ["Por que a ordem dos bytes do CRC no Modbus RTU é invertida?", "O Modbus RTU envia primeiro o byte menos significativo do CRC16. O CRC de «01 03 00 00 00 0A» é 0xCDC5 e vai para a linha como «C5 CD»."],
    ["Meu CRC16 CCITT dá diferente de outra calculadora", "O CCITT tem variantes conforme o valor inicial. Aqui o «CRC16 CCITT» usa valor inicial 0xFFFF (CCITT-FALSE) e o «CRC16 XMODEM» usa 0x0000. O Kermit é outra variante, com a ordem dos bits invertida."],
    ["O LRC é o mesmo do Modbus ASCII?", "É a mesma fórmula (complemento de dois da soma dos bytes) aplicada aos bytes brutos. No Modbus ASCII, converta primeiro os caracteres em bytes."],
  ],
};
