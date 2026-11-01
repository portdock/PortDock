// Calcolatore di CRC e checksum (views/ChecksumPage.astro)
export default {
  title: "Calcolatore di CRC e checksum",
  seo: "Calcolatore CRC16 Modbus e checksum online — PortDock",
  desc: "Calcola in un colpo solo CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 e SUM16. Ingresso HEX o ASCII (\\r \\n \\xNN), byte nell'ordine di trasmissione.",
  input: "Dati",
  mode: "Formato d'ingresso",
  kind: "Algoritmo",
  value: "Checksum (ordine di trasmissione)",
  frame: "Dati + checksum",
  bytes: "byte",
  hexHelp: "es. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "es. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Algoritmi",
  how: "Tutto viene calcolato nel vostro browser; quello che digitate non viene inviato da nessuna parte.",
  appNote: "Per aggiungere e verificare le checksum mentre comunicate con un dispositivo:",
  appLink: "PortDock Serial",
  faqTitle: "Domande frequenti",
  faq: [
    ["Perché l'ordine dei byte del CRC Modbus RTU è invertito?", "Modbus RTU trasmette per primo il byte basso del CRC16. Il CRC di «01 03 00 00 00 0A» è 0xCDC5 e sulla linea viaggia come «C5 CD»."],
    ["Il mio CRC16 CCITT è diverso da quello di un altro calcolatore", "Del CCITT esistono varianti con valore iniziale diverso. Qui «CRC16 CCITT» usa il valore iniziale 0xFFFF (CCITT-FALSE) e «CRC16 XMODEM» usa 0x0000. Kermit è un'altra variante, con i bit in ordine inverso."],
    ["L'LRC è lo stesso del Modbus ASCII?", "Stessa formula (complemento a due della somma dei byte), applicata ai byte grezzi. Per il Modbus ASCII convertite prima i caratteri in byte."],
  ],
};
