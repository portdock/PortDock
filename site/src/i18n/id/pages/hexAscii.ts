// Konverter HEX ↔ ASCII (views/HexAsciiPage.astro) — paket ke-4
export default {
  title: "Konverter HEX ↔ ASCII",
  seo: "Konverter HEX ke ASCII (Teks) dengan Karakter Kontrol — PortDock",
  desc: "Ubah byte HEX menjadi teks dan teks menjadi HEX. Karakter kontrol seperti CR dan LF tampil sebagai \\r \\n \\xNN, siap disalin dan dikirim apa adanya.",
  hex: "HEX",
  ascii: "Teks (ASCII · escape)",
  dec: "Desimal",
  count: "byte",
  how: "Karakter yang bisa dicetak (0x20–0x7E) tetap apa adanya; selain itu ditulis sebagai \\r \\n \\t \\0 \\\\ \\xNN. Teks di luar ASCII menjadi byte UTF-8. Semua dihitung di browser Anda.",
  tableTitle: "Karakter kontrol yang umum",
  appNote: "Untuk langsung mengirimnya ke perangkat, pakai",
  appEnd: ".",
  ctrlHead: ["HEX", "Nama", "Escape"],
  asciiNote: "Semua kode 0–127 dan nama karakter kontrol ada di",
  asciiEnd: ".",
};
