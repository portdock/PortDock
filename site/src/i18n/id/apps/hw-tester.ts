// PortDock Hardware Tester — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Hardware Tester — Pencatat Wi-Fi Putus dan Ping (Gratis)",
    desc: "Alat Windows gratis yang mencatat Wi-Fi putus: ping gateway vs internet berdampingan, waktu DNS, alasan pemutusan Windows, dan log sambung/putus Bluetooth.",
  },
  summary: "Mengubah «Wi-Fi saya terus putus» menjadi catatan. Saat merekam, ia mem-ping gateway (router) dan satu alamat internet berdampingan, menggambar latensi dan loss pada satu grafik bersama alasan pemutusan Wi-Fi yang dicatat Windows pada lini masa yang sama, lalu memberi tahu apakah perlu mencari di sisi router atau di luarnya. Ia juga mencatat kapan perangkat Bluetooth tersambung dan terputus. Hanya baca, tanpa hak administrator; tidak mengubah pengaturan apa pun.",
  who: [
    "Siapa pun yang Wi-Fi-nya terus putus dan ingin tahu apakah masalahnya di router atau internet",
    "Orang yang ingin catatan kapan earbud atau keyboard Bluetooth terputus",
    "Teknisi lapangan yang mendokumentasikan link nirkabel PC perangkat sebelum menghubungi dukungan",
  ],
  features: [
    {
      title: "Gateway dibanding internet",
      body: "Mem-ping router dan sebuah alamat internet (1.1.1.1, 8.8.8.8, atau milik Anda) pada ketukan yang sama dan menampilkan loss, rata-rata, persentil ke-95, dan jitter berdampingan. Tidak pernah lebih dari sekali per detik; satu rekaman berhenti setelah 24 jam.",
    },
    {
      title: "Alasan pemutusan Windows pada grafik yang sama",
      body: "Membaca log WLAN-AutoConfig (8001 tersambung, 8003 terputus) dan menampilkannya sebagai garis pada grafik serta sebagai kata-kata alasan Windows di daftar peristiwa. Nama Wi-Fi tidak dibaca.",
    },
    {
      title: "Waktu respons DNS",
      body: "Setiap 5 detik satu nama (bawaan example.com) dicari di server DNS tanpa cache, mengukur waktu balasan dan kegagalan.",
    },
    {
      title: "Ringkasan tempat mencari dan CSV",
      body: "Menyebut «sisi router» saat loss mencapai gateway dan «di luar router» saat hanya target internet yang kehilangan balasan — tempat mencari, bukan penyebab. Rekaman dapat disimpan sebagai CSV.",
    },
    {
      title: "Log koneksi Bluetooth",
      body: "Membaca status «Connected» perangkat yang dipasangkan setiap 2 detik dan mencatat sambungan dan putusnya. Nama hanya tampil di layar; teks yang disimpan dan disalin memakai «Perangkat N».",
    },
    {
      title: "Log sambung/putus USB (mulai 0.10.0)",
      body: "Menemukan perangkat USB mana di balik bunyi sambung/putus yang berulang. Mencatat waktu pemasangan dan pelepasan beserta nama perangkat, VID:PID, port hub, dan kecepatan, menandai perangkat yang putus 3+ kali dalam 10 menit sebagai «dugaan putus berulang» dan perangkat USB 3 yang berjalan pada kecepatan USB 2.0 sebagai «Perlu dilihat». Juga membaca waktu pemasangan/pelepasan terakhir dari sebelum aplikasi dimulai.",
    },
    {
      title: "Mode audio Bluetooth dan nada kiri/kanan",
      body: "Menunjukkan apakah output bawaan adalah stereo (A2DP) atau hands-free untuk panggilan, dan memutar nada uji kiri, kanan, serta keduanya.",
    },
    {
      title: "Sinyal dan kanal Wi-Fi (atas permintaan)",
      body: "Hanya saat «Tampilkan sinyal» aktif: kekuatan sinyal, kecepatan link, band, kanal, dan berapa banyak jaringan sekitar yang berbagi tiap kanal (tanpa nama). Mulai Windows 11 24H2 ini memerlukan izin lokasi (sisanya berfungsi tanpanya).",
    },
  ],
  steps: [
    "Pilih target internet dan interval, lalu «Mulai rekam»",
    "Biarkan sampai putusnya terjadi — latensi router dan internet beserta alasan Windows pada satu grafik",
    "Baca tempat mencari di «Ringkasan», lalu «Simpan CSV…» atau «Salin ringkasan»",
  ],
  faq: [
    {
      q: "Apakah ini mengukur kecepatan internet?",
      a: "Tidak. Ia mencatat putus, latensi, dan loss, bukan kecepatan unduh atau unggah. Gunakan situs tes kecepatan untuk itu.",
    },
    {
      q: "Apakah ini memperbaiki masalahnya?",
      a: "Tidak. Ia hanya membaca dan tidak mengubah pengaturan apa pun. Ia menunjuk tempat mencari (sisi router, di luar router, DNS, alasan pemutusan Windows).",
    },
    {
      q: "Apa yang dikirimkannya ke luar?",
      a: "Hanya ping ke gateway dan alamat internet yang dipilih serta satu pencarian DNS, selama merekam. Target selalu ditampilkan, dan tidak ada yang dikirim setelah Anda berhenti.",
    },
  ],
  similar: "Alat serupa antara lain PingPlotter (komersial, dengan edisi gratis) dan WifiHistoryView (gratis, riwayat sambung/putus). PortDock Hardware Tester gratis (GPL-3.0) dan menaruh ping gateway dan internet serta alasan pemutusan Windows pada satu grafik, bersama log koneksi Bluetooth.",
};
