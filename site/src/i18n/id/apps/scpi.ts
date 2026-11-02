// PortDock SCPI — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock SCPI — Terminal SCPI Gratis (LAN, RS-232, Tanpa VISA)",
    desc: "Terminal instrumen SCPI gratis lewat LAN socket (5025) atau RS-232 tanpa VISA: *IDN?, antrean error, tunggu *OPC?, pengukuran berulang ke CSV.",
  },
  summary: "Kirim perintah ke instrumen SCPI seperti power supply, multimeter, dan osiloskop lalu baca jawabannya. Tersambung lewat LAN socket (TCP 5025) atau RS-232 tanpa menginstal VISA, mengenali instrumen dengan *IDN?, menguras antrean error, dan mencatat pembacaan numerik berulang ke CSV.",
  who: [
    "Pengembang yang memeriksa perintah secara manual sebelum menulis otomatisasi pengujian",
    "Teknisi lapangan yang perlu melihat cepat sebuah instrumen dari PC tanpa VISA",
  ],
  features: [
    {
      title: "Tanpa VISA",
      body: "LAN socket (biasanya 5025) dan RS-232 (baud, parity, flow control) dengan akhir baris LF, CR LF, atau CR. VXI-11, HiSLIP, dan USBTMC belum didukung.",
    },
    {
      title: "Query, tulis, baca",
      body: "Perintah berakhiran ? di-query, yang lain ditulis. Waktu respons, timeout, dan balasan tanpa akhir baris ditampilkan. Riwayat perintah, daftar perintah, dan pelengkapan untuk perintah umum.",
    },
    {
      title: "ID, antrean error, *OPC?",
      body: "*IDN? dipecah menjadi pembuat, model, nomor seri, dan firmware; SYST:ERR? ditanyakan sampai 0 untuk mendaftar setiap error dalam antrean. Tombol untuk *RST, *CLS, dan menunggu *OPC?.",
    },
    {
      title: "Ukur berulang",
      body: "Ulangi query seperti MEAS:VOLT:DC? pada interval tertentu sebanyak hitungan yang diatur, dengan tabel nilai, tren, dan statistik (min, maks, rata-rata, simpangan baku), disimpan sebagai CSV.",
    },
    {
      title: "Data blok",
      body: "Blok IEEE 488.2 (#NXXXX…) dibaca menurut header panjangnya, sehingga byte LF di dalam data biner tidak memotongnya. Pratinjau HEX dan simpan ke file (mis. tangkapan layar PNG).",
    },
  ],
  steps: [
    "LAN: IP instrumen dan port 5025; serial: port dan baud seperti pada instrumen",
    "«Sambung» (F4) — *IDN? menampilkan nama instrumen",
    "Ketik perintah lalu tekan Enter; periksa kesalahan dengan «Kuras antrean error»",
  ],
  uses: [
    {
      title: "Memeriksa perintah sebelum menulis otomatisasi",
      body: "Ketik perintah secara manual dan lihat balasan serta waktu responsnya. Perintah berakhiran ? adalah query, yang lain adalah penulisan. Periksa kesalahan seketika dengan «Kuras antrean error».",
    },
    {
      title: "Menjangkau instrumen dari PC tanpa VISA",
      body: "Sambung langsung lewat LAN socket (biasanya port 5025) atau RS-232. *IDN? dipecah menjadi pembuat, model, nomor seri, dan firmware.",
    },
    {
      title: "Mencatat pembacaan berulang ke CSV",
      body: "Di «Ukur berulang», ajukan query seperti MEAS:VOLT:DC? pada interval tertentu sebanyak hitungan yang diatur, lihat tabel, tren, dan statistik (min, maks, rata-rata, simpangan baku) lalu simpan sebagai CSV.",
    },
    {
      title: "Mengambil data blok seperti tangkapan layar",
      body: "Blok IEEE 488.2 (#N…) dibaca menurut header panjangnya, sehingga byte LF di dalam data biner tidak memotongnya. Pratinjau dalam HEX dan simpan ke file (PNG dan sebagainya).",
    },
  ],
  faq: [
    {
      q: "Saya mendapat «connection refused»",
      a: "Port berbeda (lihat «socket port» di manual — tidak semua instrumen memakai 5025) atau antarmuka socket mati. Beberapa instrumen menolak koneksi baru selama program lain (sesi VISA) masih tersambung.",
    },
    {
      q: "Saya mendapat «no response (timeout)»",
      a: "Perintah non-query dikirim sebagai query, perintah salah ketik (periksa antrean error), atau instrumen sedang sibuk mengukur. Perpanjang waktu tunggu balasan atau pakai *OPC?. «Reply not finished» berarti akhir baris (LF, CR LF, CR) berbeda dengan milik instrumen.",
    },
    {
      q: "Apa itu -410 Query INTERRUPTED?",
      a: "Perintah berikutnya dikirim sebelum balasan dibaca. Jika Anda mengirim query dengan «Tulis», ambil jawabannya dengan «Baca» lebih dulu.",
    },
    {
      q: "Apakah mendukung USBTMC, GPIB, VXI-11, atau HiSLIP?",
      a: "Belum. VXI-11 saat ini belum didukung; HiSLIP, USBTMC, dan GPIB memerlukan VISA atau driver sehingga di luar cakupan. Kebanyakan instrumen LAN juga menyediakan socket (5025), dan instrumen khusus USB dengan pengaturan «USB virtual COM» bisa dipakai lewat serial.",
    },
    {
      q: "Bisakah dicoba tanpa instrumen?",
      a: "Jalankan PortDock Simulator sebagai server TCP di 5025 dengan framing LF dan contoh [SCPI *IDN? reply], lalu sambung ke 127.0.0.1:5025.",
    },
  ],
  similar: "Alat vendor berbasis VISA (NI MAX, Keysight Connection Expert …) juga dapat mengirim perintah. PortDock SCPI tersambung lewat LAN socket atau RS-232 pada PC tanpa VISA.",
};
