// Latihan Modbus (views/ModbusPracticePage.astro) — paket ke-4. rtu = potongan sebelum/sesudah tautan konverter RTU↔TCP (teks tautan disisipkan weave())
export default {
  title: "Latihan soal Modbus (kuis)",
  seo: "Latihan Soal Modbus RTU: Frame, CRC, Kode Exception — PortDock",
  desc: "Latihan soal Modbus RTU: HEX request baca, nilai 40003 di respons, arti exception 83 02, urutan byte CRC, float ABCD vs CDAB. Soal otomatis dengan pembahasan.",
  kind: "Jenis soal",
  mixed: "Acak",
  check: "Periksa jawaban",
  next: "Soal berikutnya",
  reset: "Hapus skor",
  answerLabel: "Jawaban",
  how: "Soal dibuat dan dinilai di browser Anda. Skor hanya disimpan di browser ini dan tidak dikirim ke mana pun.",
  faqTitle: "Cara memakai",
  faq: [
    ["Untuk siapa?", "Teknisi baru dan peserta pelatihan yang sedang belajar Modbus RTU, atau siapa saja yang ingin menyegarkan ingatan sebelum turun ke lapangan. Setelah menjawab, muncul pembahasan dan tautan ke panduan serta alat web yang terkait."],
    ["Bisakah soal yang sama diberikan ke orang lain?", "Salin «Tautan ke soal ini» di bawah soal lalu kirimkan; tautan itu membuka soal yang sama. Setiap soal dibuat dari satu angka (seed), jadi angka yang sama menghasilkan soal yang sama."],
    ["Bagaimana menulis jawaban isian?", "HEX tidak membedakan spasi, huruf besar-kecil, dan 0x (01 03 00 00 00 0A C5 CD sama dengan 0103000000 0ac5cd). Nilai ditulis dalam desimal; awali dengan 0x untuk memasukkan HEX."],
  ],
  srcTitle: "Referensi",
  qlink: "Tautan ke soal ini",
  guidesTitle: "Panduan untuk dibaca bersama",
  src: ["kode fungsi, bentuk request/respons, kode exception", "frame RTU, CRC (byte rendah lebih dulu)", "float32. Urutan word register (ABCD, CDAB) tidak ada di spesifikasi Modbus dan berbeda di tiap perangkat"],
  rtu: ["Untuk mengubah frame antara RTU, TCP, dan ASCII, pakai ", "."],
};
