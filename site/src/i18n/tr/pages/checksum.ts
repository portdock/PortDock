// CRC ve sağlama toplamı hesaplayıcı (views/ChecksumPage.astro)
export default {
  title: "CRC ve sağlama toplamı hesaplayıcı",
  seo: "Çevrimiçi CRC16 Modbus ve sağlama toplamı hesaplayıcı — PortDock",
  desc: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 ve SUM16’yı tek seferde hesaplar. HEX veya ASCII (\\r \\n \\xNN) giriş, baytlar gönderim sırasıyla.",
  input: "Veri",
  mode: "Giriş biçimi",
  kind: "Yöntem",
  value: "Sağlama toplamı (gönderim sırası)",
  frame: "Veri + sağlama toplamı",
  bytes: "bayt",
  hexHelp: "ör. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "ör. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Yöntemler",
  how: "Her şey tarayıcınızda hesaplanır; girdiğiniz hiçbir şey bir yere gönderilmez.",
  appNote: "Bir cihazla haberleşirken sağlama toplamını eklemek ve doğrulamak için:",
  appLink: "PortDock Serial",
  faqTitle: "Sık sorulan sorular",
  faq: [
    ["Modbus RTU CRC’sinde bayt sırası neden ters?", "Modbus RTU, CRC16’nın düşük baytını önce gönderir. “01 03 00 00 00 0A” verisinin CRC’si 0xCDC5’tir ve hatta “C5 CD” olarak gider."],
    ["CRC16 CCITT değerim başka bir hesaplayıcıdan farklı", "CCITT’nin başlangıç değerine göre farklı türleri vardır. Buradaki “CRC16 CCITT” 0xFFFF başlangıç değerini (CCITT-FALSE), “CRC16 XMODEM” ise 0x0000’ı kullanır. Kermit, bit sırası ters çevrilmiş başka bir türdür."],
    ["LRC, Modbus ASCII’deki LRC ile aynı mı?", "Aynı formül (bayt toplamının ikiye tümleyeni), ham baytlara uygulanır. Modbus ASCII için önce karakterleri bayta çevirin."],
  ],
};
