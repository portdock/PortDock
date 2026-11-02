// PortDock Net Scan — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Net Scan — IP Scanner Gratis untuk Jaringan Industri",
    desc: "IP scanner gratis untuk jaringan industri: sapuan ping dan ARP, vendor MAC, port industri (Modbus 502, MC, XGT, S7 …), pemantau ping jangka panjang.",
  },
  summary: "Sapu subnet sebuah kartu jaringan untuk menemukan perangkat, lalu kenali lewat vendor MAC dan port industri yang terbuka (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Perangkat yang memblokir ping tetap ditemukan lewat ARP pada subnet yang sama.",
  who: [
    "Teknisi lapangan yang tidak tahu IP perangkat baru",
    "Siapa pun yang harus memantau jaringan perangkat semalaman",
  ],
  features: [
    {
      title: "Sapuan ping + ARP",
      body: "ARP pada subnet yang sama menemukan perangkat yang memblokir ping; menampilkan waktu respons, nama, PC ini, dan gateway. Tanpa hak administrator.",
    },
    {
      title: "Pemeriksaan port industri",
      body: "Hanya memeriksa daftar port (bawaan 502, 2004, 5000–5010, 102, 44818, 4840 …; dapat diedit, hingga 32) — bukan pemindaian port umum — dan menanyakan vendor/model ke perangkat Modbus (FC 2B/0E).",
    },
    {
      title: "Catatan keterpaparan (mulai 0.10.0)",
      body: "Jika Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23, atau HTTP 80 termasuk port yang sudah diperiksa, ditambahkan catatan seperti «Protokol industri terbuka — siapa pun di jaringan yang sama bisa membaca dan menulis (tanpa autentikasi) — periksa pemisahan jaringan». Tidak memindai port tambahan dan tidak mengubah pengaturan perangkat apa pun.",
    },
    {
      title: "Penemuan lewat broadcast — EtherNet/IP, BACnet (mulai 0.11.0)",
      body: "Hanya saat ditekan, mengirim EtherNet/IP ListIdentity (UDP 44818) dan BACnet Who-Is (UDP 47808) ke alamat broadcast adaptor yang dipilih dan menggabungkan vendor, tipe perangkat, nama produk, dan revisi — serta instance perangkat BACnet dan ID vendor — dari perangkat yang IP-nya belum Anda ketahui ke dalam tabel. Request hanya-baca; nomor seri tidak ditampilkan.",
    },
    {
      title: "Vendor MAC",
      body: "Daftar IEEE tertanam menampilkan vendor tanpa akses internet.",
    },
    {
      title: "Pemantau ping jangka panjang",
      body: "Mencatat kehilangan paket, latensi, dan pemadaman dari beberapa perangkat ke CSV dan mengedipkan taskbar saat ada yang putus.",
    },
    {
      title: "Baru / hilang",
      body: "Membandingkan dengan pemindaian sebelumnya untuk menandai perangkat baru dan hilang. Ekspor ke CSV.",
    },
    {
      title: "Baseline — bandingkan dengan yang terakhir (mulai 0.10.0)",
      body: "Simpan daftar perangkat sebagai baseline bernama (beberapa, juga sebagai file JSON) dan bandingkan pemindaian berikutnya dengan salah satunya — baru (ditambahkan?), hilang (dilepas atau mati?), MAC berubah (perangkat lain di IP yang sama, diganti?), IP berubah (perangkat yang sama di IP lain, DHCP?), dan port terbuka berubah, dengan kode warna. CSV perbandingan dan salinan «AI» (3 byte terakhir MAC disembunyikan). File baseline berisi alamat MAC — hati-hati saat membagikannya.",
    },
    {
      title: "Wake-on-LAN, buka web",
      body: "Per perangkat: buka halaman webnya, salin IP/MAC, kirim magic packet.",
    },
  ],
  steps: [
    "Pilih adaptor jaringan — subnet-nya menjadi rentang (/24 tempat ia berada, jika lebih luas)",
    "«Pindai» (F4)",
    "Periksa kolom layanan dan vendor; klik perangkat untuk membuka halaman webnya, menyalin IP, membangunkannya, atau «Tambah ke pantau ping»",
  ],
  similar: "Alat serupa antara lain Angry IP Scanner (open source) dan Advanced IP Scanner (freeware). PortDock Net Scan menambahkan pemeriksaan port industri (Modbus 502, MC, XGT, S7 …) dan pemantauan ping jangka panjang.",
};
