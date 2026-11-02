// PortDock Modbus Slave — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Modbus Slave — Simulator Modbus Slave Gratis (RTU/TCP)",
    desc: "Simulator Modbus slave RTU/TCP gratis untuk Windows: uji PLC, HMI, atau master tanpa perangkatnya, dengan tabel register, fault injection, dan profil perangkat.",
  },
  summary: "Mengubah PC menjadi Modbus slave (RTU serial, atau server Modbus TCP atau RTU over TCP) agar Anda bisa menguji master (PLC, HMI, software host) tanpa perangkat asli — termasuk keterlambatan dan error yang disengaja.",
  who: [
    "Pengembang yang menulis Modbus master",
    "Tim yang menyiapkan layar HMI sebelum perangkat tiba",
  ],
  features: [
    {
      title: "Tiga jenis transport",
      body: "Serial (RTU), server TCP (Modbus TCP), dan server TCP (RTU over TCP — perangkat di balik device server serial).",
    },
    {
      title: "Empat tabel",
      body: "Coil, discrete input, holding register, dan input register. Lihat tabel sebagai U16, S16, HEX, atau BIN, atur tipe U32, S32, F32, F64, atau string per sel beserta urutan byte, dan biarkan nilai berubah sendiri (naik bertahap, acak, sinus …).",
    },
    {
      title: "Beberapa Slave ID",
      body: "Jalankan beberapa Slave ID (1–247), masing-masing dengan nilainya sendiri.",
    },
    {
      title: "Injeksi kesalahan (fault injection)",
      body: "Keterlambatan, tanpa respons, CRC rusak, panjang MBAP salah, atau exception paksa — dapat ditargetkan menurut Slave ID, fungsi, alamat, setiap request ke-N, atau probabilitas — untuk menguji timeout dan retry milik master.",
    },
    {
      title: "Lihat setiap penulisan",
      body: "Sel yang ditulis master berkedip, lengkap dengan log lalu lintas dan statistik.",
    },
    {
      title: "Profil perangkat, tabel tersimpan",
      body: (c: { nDevices: number }) => `Muat nama dan tipe register dari ${c.nDevices} perangkat bawaan (inverter, pengontrol suhu, power meter …) beserta nilai contoh. Ekspor dan impor tabel sebagai peta register CSV (format sama dengan Modbus Master) atau JSON.`,
    },
    {
      title: "Emulasi dengan profil perangkat — nilai hidup (mulai 0.10.0)",
      body: "Uji SCADA, HMI, atau program Anda sendiri tanpa inverter atau power meter asli. Menulis perintah jalan menaikkan frekuensi keluaran bertahap ke setelan frekuensi (turun bila 0) dengan arus, tegangan, dan daya mengikuti; pada power meter, tegangan dan arus bergeser sedikit dan energi terakumulasi. «Aturan tautan» yang dapat diedit (mengikuti, proporsional, akumulasi) menghubungkan sel satu sama lain. Sel baca-saja dan tulis-saja dari peta perangkat diberlakukan (exception 02 atau 03, pilihan Anda), alamat yang tidak ada di peta memberi exception 02, dan semuanya bekerja bersama fault injection. Nilai berasal dari tabel di manual, jadi perilaku perangkat asli (waktu ramp dan sebagainya) bisa berbeda.",
    },
    {
      title: "Alamat bind awal 127.0.0.1 (mulai 0.10.0)",
      body: "«Alamat bind» server TCP dimulai sebagai 127.0.0.1 (hanya PC ini). Untuk master di PC lain, pilih di sana 0.0.0.0 (semua adaptor) atau alamat sebuah adaptor. Pengaturan yang disimpan versi sebelumnya tetap dipertahankan.",
    },
  ],
  steps: [
    "Pilih transport (serial atau TCP) beserta port dan baud rate (atau alamat dan port); tambahkan Slave ID bila perlu",
    "Pilih tabel, atur alamat awal dan jumlah, lalu isi nilai",
    "«Sambung» («Mulai» untuk TCP) — request master dijawab dari tabel",
  ],
  similar: "Alat serupa antara lain Modbus Slave komersial (Witte Software) dan ModRSsim2 open source. PortDock Modbus Slave gratis (GPL-3.0) tanpa batas waktu.",
};
