// PortDock MCP — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock MCP — Baca Port COM dan Modbus dari Klien AI",
    desc: "Server MCP gratis agar Claude Desktop dan klien AI lain membaca laporan port COM, Modbus, protokol MC, dan nilai SCPI. Menulis hanya ke simulator 127.0.0.1.",
  },
  summary: "Server MCP tanpa jendela yang dijalankan klien AI (Claude Desktop, VS Code, Cursor …). AI membaca port COM dan adaptor jaringan PC ini serta membaca nilai Modbus, protokol MC, dan SCPI dari perangkat yang Anda sebutkan. Alat tulisnya hanya menerima alamat PC ini (127.0.0.1) dan ditujukan untuk simulator. Mulai 0.10.0, penulisan Modbus hanya menuju target yang mengidentifikasi dirinya sebagai PortDock. Penulisan MC hanya diperiksa menurut alamat, jadi jika program di PC ini meneruskan ke perangkat lain (relay TCP, gateway, atau tunnel), penulisan bisa sampai ke perangkat asli.",
  who: [
    "Siapa pun yang ingin asisten AI ikut melihat masalah port COM dan adaptor USB",
    "Pengembang yang ingin membaca nilai Modbus, MC, atau SCPI di dalam percakapan AI",
    "Orang yang berlatih memakai alat AI pada simulator, bukan perangkat asli",
  ],
  features: [
    {
      title: "Sembilan alat baca",
      body: "Daftar port COM, laporan Port Inspector, mendengar serial (tidak mengirim apa pun), pembacaan Modbus (FC 01–04), baca batch MC 3E, query SCPI, ping, adaptor jaringan, dan peta register perangkat.",
    },
    {
      title: "Menulis hanya ke simulator 127.0.0.1",
      body: "Berlatih «tulis, lalu baca kembali» dengan Modbus Slave atau PLC Simulator di PC ini. Alamat lain ditolak sebelum menyambung. Mulai 0.10.0, penulisan Modbus juga mensyaratkan target mengidentifikasi dirinya sebagai «PortDock» (FC 2B/0E); penulisan MC hanya diperiksa menurut alamat, jadi jangan dipakai saat program relay berjalan.",
    },
    {
      title: "Hanya query SCPI",
      body: "Mengirim satu query berakhiran «?»; yang bisa mengubah status, seperti *TST?, *CAL?, dan *RST, ditolak. READ? dan MEAS…?, yang memulai pengukuran baru, ditolak secara default dan baru dikirim bila Anda mengizinkannya dengan allow_measure (sejak 0.8.0). Pakai FETC? untuk membaca nilai terakhir saja.",
    },
    {
      title: "Log sesi dan batas laju",
      body: "Setiap panggilan disimpan di PC ini sebagai baris JSON dan tidak pernah dikirim keluar. Target yang sama paling sering sekali per 100 ms, 120 panggilan per menit.",
    },
    {
      title: "Data pribadi disamarkan",
      body: "Path folder pengguna dalam hasil menjadi «~», alamat MAC menjadi «xx-…», dan nama jaringan menjadi «(hidden)».",
    },
    {
      title: "Satu file untuk diinstal",
      body: "Tanpa Python, Node, atau Docker: sebuah .mcpb (buka di Claude Desktop) atau satu exe dalam zip.",
    },
  ],
  steps: [
    "Buka PortDock-MCP.mcpb di Claude Desktop (klien lain: taruh path exe dari zip di pengaturannya)",
    "Tanyakan sesuatu seperti «list my COM ports» kepada AI — klien akan bertanya kepada Anda sebelum setiap pemanggilan alat",
    "Berikan alamat, port, dan unit untuk membaca sebuah perangkat. Berlatihlah dengan Modbus Slave atau PLC Simulator di 127.0.0.1",
  ],
  faq: [
    {
      q: "Bisakah AI mengubah pengaturan perangkat?",
      a: "Kedua alat tulis hanya bekerja bila targetnya 127.0.0.1 atau localhost (PC ini); alamat lain ditolak sebelum menyambung. Mulai 0.10.0, modbus_write_sim hanya menulis bila target menjawab identifikasi perangkat (FC 2B/0E) dengan nama vendor yang diawali «PortDock», sehingga tidak menulis ke perangkat asli di balik gateway Modbus TCP ↔ RTU milik PortDock Serial (bawaan 127.0.0.1:502). mc_write_sim hanya diperiksa menurut alamat, jadi jika program di PC ini meneruskan ke perangkat lain (relay TCP, gateway vendor, tunnel SSH …), penulisan bisa sampai ke perangkat asli — jangan pakai alat tulis selama program seperti itu berjalan.",
    },
    {
      q: "Apa yang dikirimkannya ke luar?",
      a: "PortDock MCP sendiri hanya berbicara dengan alamat dan port perangkat yang Anda berikan, dan log sesi tetap di PC ini. Hasil alat dikirim ke klien AI yang Anda pakai, jadi sejak itu kebijakan klien tersebut yang berlaku.",
    },
  ],
};
