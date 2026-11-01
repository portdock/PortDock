// CRC·체크섬 계산기(views/ChecksumPage.astro)
export default {
  title: "Kalkulator CRC i sum kontrolnych",
  seo: "Kalkulator CRC16 Modbus i sum kontrolnych online — PortDock",
  desc: "Oblicz naraz CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 i SUM16. Wejście HEX lub ASCII (\\r \\n \\xNN), wynik w kolejności bajtów do wysłania.",
  input: "Dane",
  mode: "Format wejścia",
  kind: "Rodzaj",
  value: "Suma kontrolna (kolejność wysyłania)",
  frame: "Dane + suma kontrolna",
  bytes: "B",
  hexHelp: "np. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "np. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Algorytmy",
  how: "Wszystko jest liczone w Twojej przeglądarce; nic z tego, co wpiszesz, nie jest nigdzie wysyłane.",
  appNote: "Aby dopisywać i sprawdzać sumy kontrolne podczas pracy z urządzeniem, użyj programu",
  appLink: "PortDock Serial",
  faqTitle: "Najczęstsze pytania",
  faq: [
    ["Dlaczego kolejność bajtów CRC w Modbus RTU jest odwrócona?", "Modbus RTU wysyła najpierw młodszy bajt CRC16. CRC dla „01 03 00 00 00 0A” to 0xCDC5, a w linii pojawia się jako „C5 CD”."],
    ["Moje CRC16 CCITT różni się od wyniku innego kalkulatora", "CCITT ma odmiany różniące się wartością początkową. „CRC16 CCITT” tutaj startuje od 0xFFFF (CCITT-FALSE), a „CRC16 XMODEM” od 0x0000. Kermit to odmiana z odwróconą kolejnością bitów."],
    ["Czy LRC to to samo co LRC w Modbus ASCII?", "Ten sam wzór (uzupełnienie do dwóch sumy bajtów) zastosowany do surowych bajtów. Dla Modbus ASCII najpierw zamień znaki na bajty."],
  ],
};
