// Kalkulator CRC dan checksum (views/ChecksumPage.astro)
export default {
  title: "Kalkulator CRC dan checksum",
  seo: "Kalkulator CRC16 Modbus dan Checksum Online — PortDock",
  desc: "Hitung CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8, dan SUM16 sekaligus. Input HEX atau ASCII (\\r \\n \\xNN), ditampilkan dalam urutan byte pengiriman.",
  input: "Data",
  mode: "Format input",
  kind: "Metode",
  value: "Checksum (urutan byte)",
  frame: "Data + checksum",
  bytes: "byte",
  hexHelp: "mis. 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "mis. STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Metode",
  how: "Semua dihitung di browser Anda; apa pun yang Anda ketik tidak dikirim ke mana pun.",
  appNote: "Untuk menambahkan dan memeriksa checksum sambil berkomunikasi dengan perangkat, pakai",
  appLink: "PortDock Serial",
  faqTitle: "Pertanyaan umum",
  faq: [
    ["Mengapa urutan byte CRC Modbus RTU terbalik?", "Modbus RTU mengirim byte rendah CRC16 lebih dulu. CRC dari «01 03 00 00 00 0A» adalah 0xCDC5 dan dikirim di jalur sebagai «C5 CD»."],
    ["Nilai CRC16 CCITT saya berbeda dari kalkulator lain", "CCITT punya beberapa varian menurut nilai awalnya. «CRC16 CCITT» di sini memakai nilai awal 0xFFFF (CCITT-FALSE), dan «CRC16 XMODEM» memakai 0x0000. Kermit adalah varian lain dengan urutan bit terbalik."],
    ["Apakah LRC ini sama dengan LRC Modbus ASCII?", "Rumusnya sama (komplemen dua dari jumlah byte), diterapkan pada byte mentah. Untuk Modbus ASCII, ubah dulu karakternya menjadi byte."],
  ],
};
