// PortDock Simulator — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Simulator — Simulator Perangkat Gratis: Serial, TCP, UDP",
    desc: "Simulator perangkat berbasis aturan: «jika ini datang, balas itu» lewat serial, TCP, UDP. Kembangkan software host tanpa hardware; uji delay dan balasan hilang.",
  },
  summary: "Tiru perangkat apa pun dengan aturan «jika ini datang → balas itu». Kembangkan software host tanpa hardware dan uji penanganan error dengan delay, balasan yang dibuang (setiap ke-N atau acak), dan balasan bergiliran.",
  who: [
    "Pengembang software host yang belum punya hardware-nya",
    "Tim yang membangun rig pengujian otomatis",
  ],
  features: [
    {
      title: "Aturan dengan wildcard",
      body: "HEX ?? (byte apa saja) dan ** (nol byte atau lebih). ASCII secara default cocok persis apa adanya; aktifkan «Wildcard» pada aturan untuk ? dan *. Cocok persis atau memuat.",
    },
    {
      title: "Balasan yang dibentuk",
      body: "Checksum dan akhir baris otomatis, delay balasan, dan jumlah kecocokan per aturan.",
    },
    {
      title: "Pesan dari perangkat sendiri",
      body: "Kirim heartbeat atau laporan status pada interval tertentu.",
    },
    {
      title: "Empat jenis transport",
      body: "Serial, server TCP, client TCP, UDP. Simpan dan muat aturan beserta pengaturan koneksi dan framing sebagai satu file JSON.",
    },
    {
      title: "Alamat awal 127.0.0.1 (mulai 0.10.0)",
      body: "«Host» untuk server TCP dan UDP dimulai sebagai 127.0.0.1 (hanya PC ini). Untuk software host di PC lain, pilih 0.0.0.0 (semua adaptor) atau alamat sebuah adaptor. Pengaturan yang disimpan versi sebelumnya tetap dipertahankan.",
    },
  ],
  steps: [
    "Pilih transport dan isi port atau alamat",
    "«+ Tambah aturan» — Saat / Balasan",
    "«Mulai» — kirim request dari software host Anda",
  ],
  uses: [
    {
      title: "Membangun software host sebelum hardware tiba",
      body: "Ubah pasangan request/balasan dari manual perangkat menjadi aturan «jika datang → balas» dan sambungkan HMI atau program uji Anda tanpa perangkat asli.",
    },
    {
      title: "Menguji timeout dan penanganan error",
      body: "Delay balasan (dengan jitter), tanpa balasan setiap ke-N kali atau secara acak, dan balasan bergiliran menunjukkan bagaimana software host Anda menghadapi jawaban yang terlambat atau hilang.",
    },
    {
      title: "Berlatih SCPI tanpa instrumen",
      body: "Jalankan server TCP di port 5025 dengan contoh [SCPI *IDN? reply] dan sambungkan PortDock SCPI ke 127.0.0.1. Balasan seperti «+1.2{rand 0..9}E+00» berubah pada setiap request.",
    },
    {
      title: "Meniru heartbeat dan laporan status",
      body: "«Pesan dari perangkat sendiri» mengirim tanpa request pada interval tertentu. Placeholder {counter}, {rand}, dan {time} diisi pada setiap pengiriman.",
    },
  ],
  faq: [
    {
      q: "Request masuk tetapi tidak ada balasan keluar",
      a: "Periksa bahwa aturan aktif, jenis pola (HEX/ASCII) dan «persis/memuat» sesuai, dan tidak ada aturan «**» di atasnya. Dengan «Catat request yang tidak cocok» aktif, baris «NO MATCH» muncul; klik kanan padanya untuk membuat aturan darinya.",
    },
    {
      q: "Request masuk terpecah atau menyatu",
      a: "Aturan membandingkan frame utuh. Sesuaikan «Framing» (jeda idle atau terminator) dan jedanya dalam ms. UDP tidak perlu framing — satu datagram adalah satu frame.",
    },
    {
      q: "Bagaimana menyambungkan program di PC yang sama?",
      a: "Untuk TCP, mulai server dan biarkan program host menyambung ke 127.0.0.1. Untuk serial, pakai pasangan COM virtual (com0com atau sejenisnya).",
    },
    {
      q: "Aturan «*IDN?» saya menjawab request yang tidak terkait",
      a: "Dengan «Wildcard» aktif, ? dan * dalam aturan ASCII cocok dengan karakter apa pun. Biarkan wildcard mati untuk aturan SCPI (bawaan untuk aturan baru).",
    },
    {
      q: "Bisakah aturan dipindah ke PC lain?",
      a: "«Simpan set aturan» menyimpan aturan beserta transport, port, alamat, framing, dan pesan dari perangkat sendiri dalam satu file JSON — simpan satu per perangkat atau pengujian.",
    },
  ],
};
