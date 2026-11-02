// PortDock PLC Simulator — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock PLC Simulator — Simulator Protokol MC (SLMP) Gratis",
    desc: "Alat Windows gratis untuk menguji koneksi protokol MC (3E/4E, biner/ASCII) tanpa PLC: tabel perangkat (D, M, X, Y …), baca/tulis batch, injeksi kesalahan.",
  },
  summary: "PC menjawab request protokol MC (SLMP) seperti port Ethernet PLC. Isi nilai pada tabel perangkat dan HMI, pengumpul data, atau software host dapat membaca dan menulisnya; delay dan end code error yang disengaja menguji penanganan error-nya. Mengikuti format pesan dalam manual publik Mitsubishi Electric (SLMP/MC); tidak berafiliasi, dan perilakunya bisa berbeda dari PLC asli.",
  who: [
    "Tim yang menyiapkan layar HMI dan komunikasi sebelum PLC tiba",
    "Pengembang software pengumpul data atau software host yang membaca PLC lewat protokol MC",
  ],
  features: [
    {
      title: "3E/4E, biner/ASCII, TCP/UDP",
      body: "Mendengar sebagai server TCP (beberapa client) atau lewat UDP. Balasan 4E membawa nomor seri request. Secara default hanya PC ini (127.0.0.1) yang bisa menyambung; mengizinkan PC lain adalah pilihan Anda.",
    },
    {
      title: "Perintah yang diimplementasikan",
      body: "0401 Read dan 1401 Write (word dan bit, subperintah 0000–0003), 0403 Read Random, 1402 Write Random, dan 0619 Loopback. Mulai 0.6.0 juga 0406/1406 Read/Write Block, monitor 0801/0802, 1001–1006 remote RUN/STOP/PAUSE/latch clear/reset (hanya status simulasi), dan 0101 Read Type Name (nilai simulasi). Perintah lain mendapat end code C059.",
    },
    {
      title: "Protokol khusus LS XGT (mulai 0.10.0)",
      body: "Ganti «Protokol» ke «XGT khusus» dan ia menjawab protokol khusus FEnet pada PLC XGT LS ELECTRIC (header «LSIS-XGT», bawaan TCP 2004 · UDP 2005): baca h0054 dan tulis h0058, individual (%MX, %MB, %MW, %MD, %ML, hingga 16 blok) dan kontinu (%MB byte, hingga 1.400 byte), perangkat P, M, K, F, T, C, D, L, N, dan balasan kode error (1–6, h75–h78). Dibangun dari manual pengguna publik LS ELECTRIC — tidak berafiliasi.",
    },
    {
      title: "Aturan kondisi (mulai 0.6.0)",
      body: "Meniru handshake seperti «saat bit request menyala, nyalakan bit done 300 ms kemudian»: kondisi (bit ON/OFF/edge, perbandingan word, periodik) → delay (tetap atau acak) → aksi (tulis bit dan word). Bukan program ladder.",
    },
    {
      title: "18 perangkat",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC, dan CN. X, Y, B, W, dan ZR memakai nomor hex; setiap perangkat punya ukuran dan request di luarnya mendapat C056. Perangkat bit dapat dilihat sebagai word 16 titik; sel dapat berupa 32-bit, float, string, atau bernama.",
    },
    {
      title: "Injeksi kesalahan (fault injection)",
      body: "Delay respons (dengan rentang), tanpa respons, atau end code pilihan — ditargetkan menurut perintah, perangkat, setiap request ke-N, atau probabilitas.",
    },
    {
      title: "Lalu lintas yang didekode",
      body: "Setiap request menampilkan nama perintah, perangkat, dan jumlah titik; setiap balasan menampilkan end code dan artinya. Sel yang diubah client berkedip, beserta statistik.",
    },
    {
      title: "Simulasi dan status tersimpan",
      body: "Nilai dapat berubah sendiri (naik bertahap, acak, sinus, ramp, toggle), dan nilai perangkat serta pengaturan sel disimpan ke dan dimuat dari file JSON.",
    },
  ],
  steps: [
    "Cocokkan frame (3E/4E), kode data (biner/ASCII), dan port dengan client",
    "Pilih perangkat (D, M, X …) dan isi nilai",
    "«Mulai» — baca dan tulis dari client dijawab dari tabel",
  ],
  faq: [
    {
      q: "Apakah perilakunya persis seperti PLC asli?",
      a: "Tidak. Ia mengikuti format pesan dalam manual publik dan belum dibandingkan dengan hardware asli. Tidak ada program ladder yang berjalan, dan kode error, waktu, batas koneksi, serta rentang perangkat per model bisa berbeda.",
    },
    {
      q: "Bagaimana menyambungkan HMI di PC lain?",
      a: "Aktifkan «Izinkan PC lain menyambung (0.0.0.0)» dan izinkan program di Windows Firewall. Jangan menjalankannya di jaringan pabrik dengan IP dan port yang sama seperti PLC asli.",
    },
  ],
  similar: "Alat serupa antara lain DummyPLC (gratis, closed source) dan HslCommunication (komersial). PortDock PLC Simulator gratis (GPL-3.0) dan menambahkan fault injection, lalu lintas yang didekode, dan simulasi nilai.",
};
