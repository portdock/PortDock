// PortDock Modbus Master — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Modbus Master — Alat Uji Modbus RTU/TCP Gratis",
    desc: "Modbus master RTU/TCP (alat poll) gratis untuk Windows: banyak tabel poll, F32/U32 dan urutan byte, notasi 40001, penulisan, pemindaian Slave ID, log CSV.",
  },
  summary: "Minta data dari perangkat Modbus sebagai pengganti PLC atau HMI. Poll beberapa tabel menurut Slave ID, fungsi, alamat, dan interval, lihat F32/U32/string dengan urutan byte dan notasi 40001, dan klik dua kali sel untuk menulis. Termasuk HEX request/response yang didekode, statistik, dan pencatatan nilai ke CSV.",
  who: [
    "Teknisi lapangan yang memeriksa peta Modbus drive atau meter baru",
    "Pengembang yang menguji firmware perangkat slave",
  ],
  features: [
    {
      title: "Banyak tabel poll",
      body: "Setiap tabel punya Slave ID, fungsi (01–04), alamat awal, jumlah, dan interval sendiri, dengan hitungan error pada tab-nya. RTU serial, Modbus TCP, dan RTU over TCP.",
    },
    {
      title: "Nilai bertipe dan urutan byte",
      body: "U16 hingga F64 dan string dalam ABCD/CDAB/BADC/DCBA, HEX/BIN, dan notasi 40001. Berbagi format peta register CSV dengan Modbus Slave.",
    },
    {
      title: "Penulisan dengan pratinjau",
      body: "Klik dua kali untuk menulis dengan 05/06/0F/10 dan lihat pratinjau byte persisnya. Opsi «selalu FC15/16» mengirim bahkan nilai tunggal dengan 0F/10.",
    },
    {
      title: "Profil perangkat",
      body: (c: { nDevices: number }) => `Pilih salah satu dari ${c.nDevices} perangkat bawaan (inverter, pengontrol suhu, power meter …) untuk menambahkan tabel poll dengan nama (satuan dan skala), tipe, Slave ID, dan pengaturan serial bawaan.`,
    },
    {
      title: "Pemindaian Slave ID dan alamat",
      body: "Cari Slave ID mana (1–247) yang menjawab dan rentang alamat mana yang bisa dibaca, lalu jadikan tabel.",
    },
    {
      title: "Cari pengaturan jalur (mulai 0.10.0)",
      body: "Saat baud, parity, dan ID perangkat tidak diketahui, mengirim pembacaan singkat untuk setiap baud yang dipilih (1200–115200) × parity/stop bit × rentang ID dan mendaftar kombinasi yang menjawab. Balasan exception tetap berarti «ada perangkat di sana». Ada perkiraan waktu, tombol berhenti, dan «Sambung dengan pengaturan ini»; ID 0 (broadcast) tidak pernah dipakai. Bukan untuk bus yang punya master lain.",
    },
    {
      title: "«Tidak ada respons» — kemungkinan penyebab (mulai 0.10.0)",
      body: "Mengelompokkan hasil request terbaru menjadi kemungkinan penyebab dan cara memeriksanya — tidak ada byte sama sekali (pengkabelan, ID, polaritas A/B), hanya request yang bergema kembali (echo adaptor 2 kabel), error CRC (baud, parity, noise, terminasi), frame terpotong (timeout, latensi USB), arti setiap kode exception, ID lain yang menjawab. Ada tautan ke panduan dan pembantu pemecahan masalah; salin sebagai teks.",
    },
    {
      title: "Cadangkan, bandingkan, pulihkan pengaturan perangkat (mulai 0.10.0)",
      body: "Untuk penggantian dan perawatan perangkat. Membaca beberapa rentang sekaligus (atau mengisinya dari profil perangkat) ke JSON dan CSV — rentang di atas 125 dipecah, rentang yang gagal didaftar — lalu membandingkan dengan perangkat saat ini atau cadangan lain, hanya menampilkan perbedaan. Pemulihan hanya menulis sel yang Anda pilih: pratinjau (sekarang vs. yang akan ditulis), klik kedua untuk menulis, lalu pemeriksaan baca-ulang. Input register dan register baca-saja dari profil diblokir.",
    },
    {
      title: "Timeout, retry, statistik",
      body: "Atur timeout, retry, dan delay; hitung request, OK, timeout, error CRC, dan exception beserta waktu respons per tabel. Exception dijelaskan.",
    },
    {
      title: "Log nilai dan tren",
      body: "Catat nilai ke CSV pada setiap poll atau saat berubah, dan pantau sel terpilih sebagai garis tren kecil.",
    },
    {
      title: "Pemantauan nilai dan alarm (mulai 0.10.0)",
      body: "Per sel: batas bawah/atas, tidak berubah (macet) selama N detik dan komunikasi hilang selama N detik, dengan margin kembali (histeresis). Sel yang memicu disorot, dengan daftar alarm (muncul, hilang, durasi, akui), suara opsional, kedipan taskbar, dan log alarm CSV. Alat bantu pemantauan, bukan perangkat keselamatan.",
    },
  ],
  steps: [
    "Sesuaikan koneksi dan port (atau IP) dengan perangkat",
    "«Sambung» (F4), lalu atur Slave ID, fungsi, alamat awal, dan jumlah sesuai manual",
    "Klik dua kali sel untuk menulis; klik kanan untuk nama dan tipe",
  ],
  similar: "Alat serupa antara lain Modbus Poll komersial (Witte Software) dan QModMaster open source. PortDock Modbus Master gratis (GPL-3.0) tanpa batas waktu.",
};
