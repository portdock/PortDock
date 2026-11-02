// PortDock TCP — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock TCP — Alat Uji TCP Client, Server, dan Relay Gratis",
    desc: "Alat uji TCP socket gratis untuk Windows: mode client, server multi-peer, dan relay (pemantau), echo, sambung ulang otomatis, dan framing Modbus TCP.",
  },
  summary: "Sambungkan ke perangkat Ethernet (client) atau biarkan perangkat menyambung ke PC (server). Server menerima beberapa peer dan bisa mengirim ke satu atau semuanya; relay berada di antara dua perangkat dan mencatat kedua arah.",
  who: [
    "Pengembang HMI, MES, dan software host",
    "Pengembang firmware perangkat TCP",
  ],
  features: [
    {
      title: "Client dan server",
      body: "Server menerima hingga 64 peer; kirim ke satu atau semuanya, dan putuskan satu per satu.",
    },
    {
      title: "Relay (pemantau)",
      body: "Berada di antara A (mis. HMI) dan B (mis. PLC), meneruskan lalu lintas, dan mencatat kedua arah.",
    },
    {
      title: "Sambung ulang otomatis",
      body: "Client menyambung ulang pada interval yang diatur saat koneksi terputus.",
    },
    {
      title: "Echo (gema)",
      body: "Server mengembalikan apa yang diterima; echo mematikan dirinya sendiri di atas 200 per detik untuk mencegah loop echo.",
    },
    {
      title: "Framing dan checksum",
      body: "Pecah aliran TCP menurut jeda idle, terminator, panjang tetap, atau Modbus TCP (panjang MBAP), dan verifikasi sembilan jenis checksum atau CRC kustom.",
    },
    {
      title: "Alamat bind awal 127.0.0.1 (mulai 0.10.0)",
      body: "«Alamat bind» server dan «Alamat PC ini untuk disambung A» pada relay dimulai sebagai 127.0.0.1 (hanya PC ini). Agar PC lain atau HMI bisa menyambung, pilih di sana 0.0.0.0 (semua NIC) atau alamat sebuah adaptor. Pengaturan yang disimpan versi sebelumnya tetap dipertahankan.",
    },
  ],
  steps: [
    "Pilih «Client» atau «Server», isi alamat dan port",
    "«Sambung» atau «Mulai dengar»",
    "Ketik lalu «Kirim»",
  ],
  uses: [
    {
      title: "Berkomunikasi dengan perangkat",
      body: "Jika perangkat menunggu koneksi, pakai «Client» dengan IP dan port-nya, kirim perintah, dan baca balasan dalam HEX atau ASCII. Client menyambung ulang pada interval yang diatur bila koneksi terputus.",
    },
    {
      title: "Saat perangkat yang menyambung ke PC",
      body: "Buka port dengan «Server» dan hingga 64 perangkat dapat menyambung. Kirim ke satu atau semuanya, dan putuskan satu per satu.",
    },
    {
      title: "Mencatat lalu lintas HMI ⇄ PLC",
      body: "Dengan «Relay», PC berada di antara dua perangkat; arahkan HMI ke PC ini dan kedua arah tercatat. Byte diteruskan tanpa diubah. Mulai 0.8.0 relay bisa menyimpan pcap dan menampilkan pasangan request-balasan Modbus/MC beserta waktu responsnya.",
    },
    {
      title: "Membaca perangkat Modbus TCP sekali",
      body: "Sambung ke port 502 dan bilah «Lihat sebagai Modbus TCP» muncul. Request dan balasan dipisah satu per satu lalu didekode di panel detail. Untuk polling terus-menerus, Modbus Master lebih mudah.",
    },
  ],
  faq: [
    {
      q: "Client terus gagal menyambung (CONNECT FAIL)",
      a: "Periksa daya dan kabel perangkat, IP dan port, serta pastikan PC dan perangkat berada di subnet yang sama (mis. 192.168.0.x).",
    },
    {
      q: "Server sudah dimulai tetapi perangkat tidak bisa menyambung",
      a: "Pastikan Anda mengizinkannya di prompt Windows Firewall dan perangkat menyambung ke IP PC ini. Error «already in use» berarti program lain memakai port itu.",
    },
    {
      q: "Data tampak menyatu atau terpecah",
      a: "TCP tidak menjaga batas pesan. Ubah framing di «Pengaturan terima» menjadi terminator, panjang tetap, atau Modbus TCP (panjang MBAP), atau sesuaikan jeda idle.",
    },
    {
      q: "Apakah relay mengubah lalu lintas?",
      a: "Tidak. Byte diteruskan apa adanya; framing dan pemeriksaan checksum hanya dipakai untuk log, sedangkan balasan otomatis dan echo mati. Hanya yang Anda sisipkan sendiri yang sampai ke perangkat, jadi berhati-hatilah.",
    },
  ],
  similar: "Alat serupa antara lain Hercules SETUP utility (HW-group, freeware).",
};
