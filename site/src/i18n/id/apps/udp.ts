// PortDock UDP — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock UDP — Pengirim/Penerima UDP Gratis (Broadcast, Multicast)",
    desc: "Alat uji UDP gratis untuk Windows: terima dan kirim datagram, broadcast dan multicast, balas ke pengirim terakhir, echo, dan log ber-timestamp.",
  },
  summary: "Terima datagram pada sebuah port dan balas ke tujuan tetap atau pengirim terakhir. Dibuat untuk perangkat broadcast dan multicast.",
  who: [
    "Siapa pun yang bekerja dengan perangkat yang menyiarkan status lewat UDP",
    "Tim yang memverifikasi penerimaan multicast",
  ],
  features: [
    {
      title: "Daftar pengirim",
      body: "Mengumpulkan alamat pengirim; klik salah satunya untuk dipakai sebagai tujuan.",
    },
    {
      title: "Broadcast dan multicast",
      body: "Izinkan broadcast, gabung atau gabung ulang ke grup multicast, pilih kartu jaringan.",
    },
    {
      title: "Echo (gema)",
      body: "Gaungkan kembali ke pengirim, dengan perlindungan loop otomatis.",
    },
  ],
  steps: [
    "Isi port dengar dan tujuan",
    "«Mulai»",
    "Ketik lalu «Kirim»",
  ],
  uses: [
    {
      title: "Menerima siaran status",
      body: "Isi port dengar lalu tekan «Mulai». Setiap datagram menjadi satu baris log, dan pengirim terkumpul di daftar «Pengirim» (hingga 256).",
    },
    {
      title: "Saat Anda tidak tahu alamat perangkat",
      body: "Mulai mendengar pada port tujuan kiriman perangkat dan amati «Pengirim». Klik «Pakai sebagai tujuan» di samping sebuah alamat untuk membalas ke sana.",
    },
    {
      title: "Mengirim broadcast",
      body: "Aktifkan «Izinkan broadcast» sebelum memulai, lalu kirim ke 255.255.255.255 atau alamat seperti 192.168.0.255. Anda diperingatkan bila opsi ini mati.",
    },
    {
      title: "Memeriksa penerimaan multicast",
      body: "Isi sebuah grup (224–239.x.x.x) dan grup itu digabung saat dimulai. Bila ada beberapa kartu jaringan (jaringan kantor dan mesin), pilih «NIC multicast» di sisi mesin. TTL bawaan 1 membuat lalu lintas tetap di jaringan lokal.",
    },
  ],
  faq: [
    {
      q: "Tidak ada yang masuk",
      a: "Periksa IP dan port tujuan kiriman perangkat, izin Windows Firewall, dan pastikan keduanya di subnet yang sama. Untuk multicast, periksa grup dan NIC lalu coba «Gabung ulang».",
    },
    {
      q: "Memulai gagal dengan «address in use»",
      a: "Program lain memakai port itu; baris peristiwa menyebut nama program dan PID-nya. Pakai port lain atau tutup program tersebut.",
    },
    {
      q: "Apa arti «ICMP port unreachable»?",
      a: "OS melaporkan bahwa tidak ada yang mendengar pada port itu di tujuan. Periksa nomor port dan daya perangkat.",
    },
    {
      q: "Berapa banyak yang bisa dikirim sekaligus?",
      a: "Satu kiriman adalah satu datagram. Di atas sekitar 64 KB, OS menolaknya.",
    },
  ],
};
