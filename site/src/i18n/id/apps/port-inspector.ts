// PortDock Port Inspector — Bahasa Indonesia (paket 8)
export default {
  seo: {
    title: "PortDock Port Inspector — Pemeriksa Port COM Gratis (USB Serial)",
    desc: "Pemeriksa port COM Windows gratis: driver USB serial, kode masalah Pengelola Perangkat, latensi FTDI, nomor COM hantu. Baca-saja, tanpa hak administrator.",
  },
  summary: "Pilih port COM dan lihat di satu tempat apa yang biasanya harus Anda gali dari Pengelola Perangkat, Penampil Kejadian, dan registry: driver, kode masalah beserta artinya, chip USB, pengaturan perangkat seperti timer latensi FTDI, penghematan daya USB, riwayat pemasangan terbaru, dan reservasi nomor COM. Hanya membaca, tanpa hak administrator, dan dengan TX dihubungkan ke RX ia mengukur waktu pulang-pergi pada setiap baud rate. Tab lain membaca adaptor jaringan PC ini, pengaturan Windows-nya sebagai PC peralatan, serta Wi-Fi dan Bluetooth dengan cara yang sama.",
  who: [
    "Teknisi lapangan yang adaptor USB-serial-nya tidak terdeteksi atau sesekali terputus",
    "Siapa pun yang mencari tahu mengapa balasan Modbus RTU terasa terlambat (timer latensi FTDI)",
    "Siapa pun yang perlu melampirkan detail port sisi PC pada permintaan dukungan atau issue",
  ],
  features: [
    {
      title: "Perangkat, driver, kode masalah",
      body: "Nama, nomor COM, lokasi, instance ID, dan produsen; penyedia driver, versi, tanggal, INF, dan service; status dan kode masalah Pengelola Perangkat beserta artinya dan apa yang bisa dicoba; pemasangan dan pelepasan terakhir.",
    },
    {
      title: "Chip USB dan pengaturan perangkat",
      body: "Nama chip dari tabel VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), bawaan port di Windows dan Device Parameters driver, dengan penjelasan timer latensi FTDI (LatencyTimer).",
    },
    {
      title: "Penghematan daya dan riwayat",
      body: "USB selective suspend dari opsi daya, «Izinkan komputer mematikan perangkat ini untuk menghemat daya» untuk perangkat dan perangkat USB di atasnya, serta peristiwa pemasangan dan driver dari log kejadian (7, 30, atau 90 hari).",
    },
    {
      title: "Reservasi nomor COM",
      body: "Nomor yang dicadangkan Windows (ComDB), nomor yang dipegang perangkat yang tidak sedang tersambung, nomor yatim, dan nomor yang dipegang lebih dari satu perangkat — mengapa adaptor baru berakhir di COM15.",
    },
    {
      title: "Uji koneksi",
      body: "Loopback TX–RX per baud rate: byte sama, hilang, dan berubah, waktu pulang-pergi 1 byte dalam ms (median dan maks) dan flag error driver (ClearCommError). Juga memberi tahu apakah adaptor RS-485 2 kabel bergema.",
    },
    {
      title: "Uji dua port dan pola (mulai 0.10.0)",
      body: "Dengan dua adaptor saling dikabelkan, mengirim ke kedua arah pada setiap kecepatan dan membandingkan yang diterima (untuk memeriksa adaptor RS-485). Pola: byte campuran, 0x00–0xFF, 0x55/0xAA; panjang 64–4096 byte. Diagram pengkabelan berupa teks dan vonis keseluruhan «Tidak ada masalah (dalam uji ini) / Perlu dilihat / Masalah». Sama dengan «Cek koneksi…» di Serial.",
    },
    {
      title: "Adaptor jaringan di PC ini",
      body: "«Baca adaptor» menampilkan, untuk tiap adaptor, link, kecepatan, duplex, IPv4, dan gateway plus nilai «Lanjutan» Pengelola Perangkat (jumbo frame, receive buffer, interrupt moderation, EEE …), penghematan daya, error terima, profil jaringan, dan apakah firewall-nya aktif. Kegunaan «Kamera GigE» menampilkan nilai yang dipublikasikan produsen kamera beserta sumbernya.",
    },
    {
      title: "PC ini — pengaturan PC peralatan",
      body: "«Baca pengaturan PC ini» membaca fast startup, sleep, USB selective suspend, kebijakan restart pembaruan, screen saver, sinkronisasi waktu, serta shutdown tak terduga dan error hardware terbaru. Dengan kegunaan «PC peralatan», nilai yang dapat menyebabkan berhenti atau restart ditandai «Perlu dilihat».",
    },
    {
      title: "PC ini — blue screen, kesehatan SSD, sumber bangun (mulai 0.10.0)",
      body: "Kartu «PC ini» yang sama membaca kode stop blue screen beserta namanya (mis. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) dan waktu shutdown mendadak, suhu SSD NVMe, persentase terpakai, cadangan, jam menyala, dan error media, apa yang membangunkan PC dari sleep, serta kapasitas baterai laptop dibanding desain dan jumlah siklus — tanpa hak administrator. File dump hanya didaftar; nomor seri disk tidak dibaca.",
    },
    {
      title: "Bandingkan dengan yang terakhir — pemeriksaan tersimpan (mulai 0.10.0)",
      body: "Simpan pemeriksaan saat ini (daftar port COM, nama/versi/tanggal driver, lokasi USB, pengaturan adaptor jaringan, pengaturan PC ini, catatan blue screen) dan pada perawatan berikutnya baca lagi untuk melihat hanya yang berubah — mis. COM3 → COM7, versi driver baru (Windows Update?), jumbo frame dimatikan, pengaturan daya berubah, blue screen baru. Nomor seri perangkat, nama PC, atau folder pengguna tidak disimpan. Simpan hasilnya sebagai teks atau CSV.",
    },
    {
      title: "Nirkabel — Wi-Fi dan Bluetooth",
      body: "Tab «Nirkabel» membaca adaptor Wi-Fi, driver, penghematan daya, dan catatan pemutusan yang disimpan Windows (dihitung menurut alasan), plus adaptor Bluetooth, status service, peristiwa error, dan apakah audio Bluetooth dalam mode hands-free (panggilan) — tanpa izin administrator atau lokasi. Tidak mengirim ping, dan ekspor menyamarkan nama perangkat.",
    },
    {
      title: "Baca-saja, hasil yang mudah dipahami",
      body: "Tidak pernah mengubah pengaturan atau driver (bantuan menjelaskan perbaikan manual). Setiap kartu ditandai «Tidak ada masalah (dalam yang terbaca) / Perlu dilihat / Masalah / Tidak bisa dibaca»; apa yang tidak bisa dilihat PC — tukar A/B, terminasi, bias, ground — selalu didaftar; ekspor teks dan JSON menyamarkan path folder pengguna.",
    },
  ],
  steps: [
    "Klik sebuah port di daftar «Port COM» di sebelah kiri",
    "Baca hasil dan alasan tiap kartu; jika perlu, ubah sendiri di Windows seperti dijelaskan bantuan",
    "Hubungkan TX ke RX untuk «Uji koneksi»; pakai «Salin teks» untuk melampirkan hasil pada pertanyaan",
  ],
  similar: "Alat serupa antara lain Pengelola Perangkat Windows, NirSoft USBDeview (freeware), USB Device Tree Viewer karya Uwe Sieber (freeware), dan FT_PROG dari FTDI untuk chip FTDI (gratis). PortDock Port Inspector mengumpulkan driver, kode masalah, penghematan daya, riwayat pemasangan, dan reservasi nomor COM untuk satu port COM di satu tempat, dan menambahkan uji koneksi loopback.",
};
