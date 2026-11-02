// PortDock Serial — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Serial — Terminal Serial Gratis untuk Windows (RS-232)",
    desc: "Terminal serial gratis untuk Windows: port RS-232, RS-485, USB COM, HEX/ASCII, sambung ulang otomatis, sembilan checksum, dekode Modbus RTU, log ber-timestamp.",
  },
  summary: "Bertukar data dengan perangkat RS-232, RS-485, dan USB serial serta menyimpan log pengujian ber-timestamp. Cabut lalu pasang kembali adaptor USB, dan program tersambung lagi ke perangkat yang sama.",
  who: [
    "Teknisi lapangan yang menjalankan perangkat baru",
    "Pengembang firmware yang menguji protokol UART",
    "Siapa pun yang perlu membaca lalu lintas Modbus RTU",
  ],
  features: [
    {
      title: "Port yang mudah dikenali",
      body: "Menampilkan nama perangkat, USB VID:PID, dan nomor seri di samping setiap port, dan diperbarui saat dicolok atau dicabut.",
    },
    {
      title: "Tahan terputus",
      body: "Membuka kembali perangkat yang sama setelah dicolok ulang meskipun nomor COM berubah, dan mencatat setiap putus dan sambung ulang.",
    },
    {
      title: "Empat mode framing",
      body: "Jeda idle, terminator, panjang tetap, atau Modbus RTU — sehingga satu pesan menjadi satu baris.",
    },
    {
      title: "Sembilan checksum plus CRC kustom",
      body: "Tambahkan CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32, atau CRC kustom saat mengirim, dan verifikasi saat menerima.",
    },
    {
      title: "Dekode Modbus RTU",
      body: "Mendekode request, response, dan exception menjadi alamat, fungsi, dan nilai.",
    },
    {
      title: "Jalur sinyal",
      body: "Alihkan DTR/RTS dan pantau CTS/DSR/RI/CD pada indikator dan di log.",
    },
    {
      title: "Log pengujian",
      body: "Timestamp milidetik, daftar perintah, kirim berulang, dan pencatatan terus-menerus ke file.",
    },
    {
      title: "Cek koneksi…",
      body: "Membaca perangkat, driver, kode masalah, timer latensi FTDI, dan penghematan daya USB dari port yang dipilih tanpa hak administrator, lalu menjalankan uji loopback atau echo RS-485 2 kabel. Mulai 0.10.0 ada juga uji dua port (dua adaptor saling dikabelkan), pola (0x00–0xFF, 0x55/0xAA), dan diagram pengkabelan. Tidak ada yang diubah.",
    },
    {
      title: "Berbagi port — COM ↔ TCP (mulai 0.10.0)",
      body: "Membuka port COM yang aktif sebagai server TCP agar program lain, WSL2, Docker, atau PC lain bisa memakai port yang sama. Mentah atau RFC 2217 (ubah baud/parity dari jauh); data yang diterima dikirim ke semua client dan client pengirim diberi label di log. Secara default hanya PC ini (127.0.0.1); PC lain hanya jika Anda mengizinkan. Tanpa driver COM virtual, tanpa hak administrator.",
    },
    {
      title: "Gateway Modbus TCP ↔ RTU (mulai 0.10.0)",
      body: "Mengubah PC menjadi gateway — SCADA, HMI, atau program PC tersambung lewat Modbus TCP (port bawaan 502), request diteruskan ke perangkat RS-485 sebagai frame RTU, dan balasan kembali sebagai MBAP. Satu request pada satu waktu, tanpa balasan → exception 0B, tanpa rute → 0A, statistik request/response/timeout, dan baris log «TCP #1 → RTU unit 3 FC03».",
    },
    {
      title: "Sniffing Modbus RTU hanya-dengar (mulai 0.10.0)",
      body: "Menyimak lalu lintas master–slave lewat adaptor di bus RS-485 tanpa mengirim apa pun. Frame dipotong berdasarkan CRC (sinkron ulang saat jeda kabur), lengkap dengan pasangan request/balasan, waktu balasan, tanpa balasan, exception, dan statistik. Untuk RS-232, dua port pada kabel Y digabung dalam satu lini masa. Dicatat ke file, termasuk CSV.",
    },
  ],
  steps: [
    "Pilih port, baud rate, dan parity, lalu «Sambung»",
    "Ketik HEX atau ASCII; tambahkan checksum atau akhir baris jika perlu",
    "«Kirim» — baris yang diterima tampil sebagai RX ◀, yang dikirim sebagai TX ▶",
  ],
  similar: "Alat serupa antara lain Tera Term dan PuTTY (terminal open source). PortDock Serial menyatukan fitur pengujian perangkat — sambung ulang USB, framing, pemeriksaan checksum, dekode Modbus RTU — dalam satu layar.",
};
