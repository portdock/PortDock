// Konversi suhu Pt100 dan termokopel (views/TemperaturePage.astro) — paket ke-5. Istilah: RTD (detektor suhu resistansi), termokopel, GGL termal (EMF), kompensasi sambungan dingin (cold junction), fungsi acuan
// Nama tipe termokopel (tipe K dll.) dan pesan galat ada di tabel lib/temperature. src2 = potongan sebelum dan sesudah tautan its90.nist.gov
// Tautan sesudah mmNote adalah halaman aplikasi (PortDock Modbus Master, nama tetap); teks tautan sesudah nNote dibuat halaman lewat pageName()
export default {
  title: "Konversi suhu Pt100 dan termokopel",
  seo: "Kalkulator Pt100 dan Termokopel: Ω, mV ↔ °C — PortDock",
  desc: "Ubah resistansi Pt100/Pt1000 dan mV termokopel tipe K, J, T, E, N, R, S, B ke suhu dan sebaliknya. IEC 60751 dan NIST ITS-90, dengan sambungan dingin.",
  rtdTitle: "Termometer resistansi (RTD)",
  sensor: "Sensor",
  temp: "Suhu (°C)",
  res: "Resistansi (Ω)",
  tcTitle: "Termokopel",
  type: "Tipe",
  cj: "Sambungan dingin (°C)",
  emf: "Tegangan terukur (mV)",
  emf0: "GGL (acuan 0 °C)",
  range: "Rentang",
  rtdNote: "α = 0.00385, -200 sampai 850 °C",
  tcNote: "Suhu → mV berlaku di seluruh «Rentang»; mV → suhu hanya di dalam rentang fungsi invers NIST.",
  tableTitle: "Tabel suhu",
  step: "Langkah (°C)",
  tableNote: "Tabel termokopel memakai sambungan dingin 0 °C, sama seperti tabel NIST.",
  how: "Semua dihitung di browser Anda; apa pun yang Anda ketik tidak dikirim ke mana pun. Nilai di luar rentang dilaporkan, tidak dihitung.",
  srcTitle: "Persamaan dan sumber",
  faqTitle: "Pertanyaan umum",
  faq: [
    [
      "Bagaimana cara kerja kompensasi sambungan dingin?",
      "Tegangan termokopel bergantung pada selisih suhu antara sambungan ukur dan sambungan dingin (terminal). Tambahkan GGL sambungan dingin ke mV terukur lalu ubah ke suhu: E(t) = E terukur + E(sambungan dingin). Sebaliknya, pembacaan yang diharapkan adalah E(t) − E(sambungan dingin).",
    ],
    [
      "Apa beda Pt100 dan Pt1000?",
      "Hanya resistansi pada 0 °C (R0): 100 Ω atau 1000 Ω. Keduanya memakai persamaan yang sama (α = 0.00385), sehingga pada suhu berapa pun Pt1000 terbaca sepuluh kali Pt100.",
    ],
    [
      "Mengapa rentang mV → suhu lebih sempit?",
      "NIST menerbitkan invers dari fungsi acuan suhu → mV sebagai pendekatan per bagian. Alat ini mengubah mV → suhu hanya di bagian yang dicakup pendekatan itu, mis. tipe K −200 sampai 1372 °C, tipe B 250 sampai 1820 °C.",
    ],
  ],
  src1: "RTD: persamaan Callendar–Van Dusen dari IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 pada 0 °C ke atas). Resistansi → suhu memakai akar persamaan kuadrat pada 0 °C ke atas dan iterasi di bawahnya.",
  src2: [
    "Termokopel: fungsi acuan E = Σ cᵢ·tⁱ (tipe K menambahkan a₀·exp(a₁·(t − a₂)²) di atas 0 °C) dan koefisien invers yang diterbitkan NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), disalin dari berkas per tipe di",
    ". mV → suhu dimulai dari fungsi invers lalu diperhalus terhadap fungsi acuan. Suhu → mV di sini cocok dengan setiap entri tabel NIST (0.001 mV).",
  ],
  rngHead: ["Suhu → mV", "mV → suhu"],
  mmNote: "Untuk membaca kontroler suhu atau transmitter lewat Modbus, pakai",
  mmEnd: ".",
  nNote: "Untuk termistor NTC (nilai B, Steinhart–Hart), pakai",
  nEnd: ".",
};
