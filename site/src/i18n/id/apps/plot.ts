// PortDock Plot — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Plot — Serial Plotter Gratis: Grafik Langsung dan CSV",
    desc: "Plotter langsung gratis untuk angka dari serial, TCP, atau UDP: nama:nilai ala Arduino, frame biner, hingga 32 kanal, kursor, dan perekaman CSV.",
  },
  summary: "Lihat angka yang dikirim Arduino, sensor, atau perangkat sebagai grafik langsung. Membaca teks berpemisah koma/spasi/tab/titik koma, «nama:nilai» ala Arduino, dan frame biner, dengan warna dan sumbu per kanal, jeda, zoom, dan selisih dua titik, serta merekam CSV saat menerima.",
  who: [
    "Pengembang yang menyetel firmware sambil mengamati nilai sensor atau board",
    "Teknisi lapangan yang mencatat keluaran perangkat berjam-jam untuk mencari anomali",
  ],
  features: [
    {
      title: "Serial, TCP, dan UDP",
      body: "Port COM (baud, data bit, parity, stop bit — 8N1 secara default — dan DTR), client TCP yang menyambung ke perangkat, dan penerimaan UDP (termasuk multicast). Menyambung ulang setelah dicabut/dipasang.",
    },
    {
      title: "Teks, nama:nilai, biner",
      body: "Koma, spasi, tab, atau titik koma terdeteksi otomatis, nilai bernama seperti temp:23.1 hum:40, baris header, dan frame dengan byte awal, u8–f64, endianness, dan checksum. Baris yang gagal tampil merah beserta alasannya.",
    },
    {
      title: "Lihat dan ukur",
      body: "Hingga 32 kanal pada sumbu kiri/kanan, N titik atau detik terakhir, Y otomatis/tetap, jeda (tetap menerima), pembacaan kursor, Δt dan Δnilai antara dua penanda, zoom dengan roda dan geser dengan seret.",
    },
    {
      title: "Pemantauan kanal dan alarm (mulai 0.10.0)",
      body: "Atur batas bawah/atas, macet selama N detik, dan data hilang selama N detik per kanal: baris yang memicu disorot, dengan daftar alarm, suara opsional, dan log alarm CSV. Alat bantu pemantauan, bukan perangkat keselamatan.",
    },
    {
      title: "Tetap lancar",
      body: "Parsing berjalan di Rust; penggambaran terjadi sekali per frame pada canvas dengan min/maks per piksel — ribuan baris per detik tanpa kehilangan lonjakan.",
    },
    {
      title: "Rekam dan simpan",
      body: "Setiap nilai ke CSV saat menerima (ramah Excel), rentang yang terlihat sebagai CSV, grafik sebagai PNG. Tabel nilai terakhir plus min, maks, dan rata-rata pada rentang yang terlihat.",
    },
  ],
  steps: [
    "Buat perangkat mencetak angka per baris (mis. 23.1,40 atau temp:23.1 hum:40)",
    "Pilih sumber (port serial dan baud, TCP, UDP) lalu «Mulai» (F4)",
    "Klik grafik untuk mengukur; «● Rekam CSV» untuk menyimpannya",
  ],
  similar: "Alat serupa antara lain Serial Plotter Arduino IDE dan SerialPlot open source. PortDock Plot juga menerima input TCP dan UDP, frame biner, dan merekam CSV saat menerima.",
};
