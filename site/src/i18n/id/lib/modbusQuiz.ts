// Teks dari lib/modbusQuiz.ts dan skrip halaman latihan Modbus (kalimat bahasa Inggris → bahasa Indonesia) — paket ke-4.
// Nama fungsi dan arti kode exception di dalam soal memakai terjemahan modbusDecode paket ke-1 (halaman juga memuat kelompok modbusDecode).
export default {
  "holding registers": "holding register",
  "input registers": "input register",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Alamat slave {0}, fungsi {1} ({2}); alamat dihitung mulai 0 sehingga {3} → {4} = {5} {6}; jumlah {7} = 00 {8}; 2 byte terakhir adalah CRC16 (byte rendah lebih dulu) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Request Modbus RTU mana yang membaca {0} {1} ({2} register) dari alamat slave {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Tulis dalam HEX, termasuk CRC, request Modbus RTU yang membaca {0} {1} ({2} register) dari alamat slave {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Anda meminta {1} register mulai dari {2} ke alamat slave {0} dan menerima respons di bawah. Berapa nilai {3} (desimal tak bertanda)?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Setelah alamat slave {0}, fungsi 03, dan byte count {1} (= {2}), setiap register memakai 2 byte, byte tinggi lebih dulu. {3} adalah register ke-{4}, jadi byte ke-{5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Apa arti respons ini ({0} {1})?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} adalah fungsi {1} ditambah 0x80 — respons exception; byte berikutnya {2} adalah kode exception: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "CRC16 Modbus dari byte di bawah adalah {0}. Dua byte mana yang dipasang di akhir frame?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Berbeda dengan nilai register, CRC Modbus RTU dikirim dengan byte rendah lebih dulu: {0} → {1} {2}. Karena itu CRC 0xCDC5 dari «01 03 00 00 00 0A» dipasang sebagai «C5 CD».",
  "ABCD (high word first)": "ABCD (word atas lebih dulu)",
  "CDAB (low word first, word swap)": "CDAB (word bawah lebih dulu, word swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Manual perangkat menyebut nilai float32 dikirim dalam urutan {0}. Dengan dua register di bawah, berapa nilainya?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD berarti register pertama adalah word atas, jadi baca {0} sebagai float32 IEEE 754 = {1}. Jika dianggap CDAB, hasilnya nilai yang tidak masuk akal seperti {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB berarti register pertama adalah word bawah, jadi tukar keduanya dan baca {0} sebagai float32 = {1}. Jika dibaca apa adanya (ABCD), hasilnya nilai yang tidak masuk akal seperti {2}.",
  "Pick the read request": "Pilih request baca",
  "Write the read request": "Tulis request baca",
  "Find a value in a response": "Cari nilai di dalam respons",
  "Meaning of an exception": "Arti respons exception",
  "CRC byte order": "Urutan byte CRC",
  "Float word order": "Urutan word float",
  // skrip halaman
  "Score {}/{} · streak {} · best {}": "Skor {0}/{1} · beruntun {2} · terbaik {3}",
  "Pick one of the choices.": "Pilih salah satu jawaban.",
  "Type your answer.": "Ketik jawaban Anda.",
  Correct: "Benar",
  "Not quite": "Belum tepat",
  answer: "jawaban",
  "Read more: ": "Baca selengkapnya: ",
};
