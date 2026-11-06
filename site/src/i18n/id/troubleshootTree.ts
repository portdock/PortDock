// Teks pohon pertanyaan panduan pencarian penyebab gangguan (bahasa Indonesia) — bentuk pohon (id, node berikutnya, tautan) dipakai bersama dari data/troubleshoot.ts; di sini hanya teks yang dicari lewat id node.
// Pertanyaan: q, hint (hanya jika pohon punya hint), opts (hanya untuk jawaban selain ya/tidak, sesuai urutan). Hasil: title, causes, checks (jumlah dan urutan sama dengan pohon).
// id yang hilang atau jumlah yang berbeda ditangkap checkText() di lib/troubleshoot.ts (i18n.test.ts). Bahasanya «kemungkinan penyebab» — tidak memastikan.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Ya",
  no: "Tidak",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: tidak ada jawaban atau data kacau",
    rs232: "RS-232 tidak bisa berkomunikasi",
    tcp: "Modbus TCP / perangkat Ethernet tidak bisa tersambung",
    usb: "Konverter USB-serial tidak terdeteksi atau terputus-putus",
    ma: "Nilai 4–20 mA terlihat aneh",
    sensor: "Input sensor NPN/PNP tidak masuk",
    mc: "Protokol MC (Mitsubishi) tidak bisa tersambung",
    pcusb: "Perangkat USB di PC terus terputus",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Apakah sama sekali tidak ada jawaban?", hint: "«Tidak» = jawaban kadang datang, atau datang dengan byte yang kacau" },
    "rs485-txled": { q: "Apakah LED TX (kirim) konverter berkedip saat request dikirim?", hint: "Tidak ada LED? Sebagai gantinya, periksa apakah byte yang dikirim muncul di log PortDock Serial" },
    "rs485-settings": { q: "Sudahkah baud rate, paritas, stop bit, dan alamat slave dicocokkan satu per satu dengan layar pengaturan perangkat (atau manualnya)?" },
    "rs485-swap": { q: "Jika kabel A dan B (D+/D−) ditukar, apakah ada jawaban?", hint: "Menukarnya tidak merusak perangkat" },
    "rs485-single": { q: "Dengan satu perangkat saja yang disambung langsung ke konverter memakai kabel pendek, apakah ada jawaban?" },
    "rs485-garbled": { q: "Apakah byte yang diterima tampak rusak (error CRC, karakter aneh)?", hint: "«Tidak» = byte tampak benar, tetapi jawaban kadang hilang (timeout)" },
    "rs485-slower": { q: "Apakah menurunkan baud rate atau memperpendek kabel mengurangi kerusakan data?" },
    "rs485-timeout": { q: "Apakah timeout jawaban yang lebih lama (mis. 1000 ms) mengurangi jawaban yang hilang?" },
    "r-rs485-port": {
      title: "Request tidak pernah keluar dari PC — sisi port atau driver",
      causes: [
        "Nomor COM yang dibuka salah (nomornya berubah jika konverter dipindah ke port USB lain)",
        "Program lain (SCADA, terminal yang dipakai sebelumnya) masih memegang port itu",
        "Masalah driver (tanda peringatan atau kode masalah di Device Manager)",
        "Konverter tidak mengganti arah kirim/terima secara otomatis untuk RS-485 2 kawat",
      ],
      checks: [
        "Cari nomor COM konverter di «Ports (COM & LPT)» pada Device Manager dan cocokkan dengan pengaturan program",
        "Baca driver dan kode masalah port di Port Inspector, lalu jalankan uji echo RS-485 2 kawat untuk melihat apakah ada yang dikirim",
        "Dengan multimeter (V⎓) di antara A–B, mengirim request berulang-ulang seharusnya membuat bacaan melompat — jika diam saja, tidak ada yang dikirim",
      ],
    },
    "r-rs485-settings": {
      title: "Pengaturan komunikasi kemungkinan berbeda",
      causes: [
        "Baud rate atau paritas berbeda (mis. perangkat 8E1, program 8N1)",
        "Alamat slave berbeda, atau memakai 0 (broadcast) — broadcast tidak dijawab",
        "Protokol perangkat bukan Modbus RTU (protokol pabrikan atau ASCII), atau pengaturan diubah tanpa disimpan dan di-restart",
      ],
      checks: [
        "Catat parameter komunikasi dari layar perangkat dan bandingkan baris demi baris dengan program",
        "Untuk inverter, periksa juga parameter «sumber perintah jalan» dan «pemilihan protokol»",
        "Jika baud rate tidak diketahui, cari dengan Modbus Master — pindai alamat slave, serta baud rate/paritas dengan «pencarian pengaturan jalur» (mulai 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Penandaan A/B (+/−) ternyata terbalik",
      causes: ["Pabrikan berbeda pendapat tentang mana yang + di antara A/B (spesifikasi Modbus: D1 = B = +, D0 = A = −)", "Mungkin hanya sebagian perangkat yang terbalik — jika perangkat lain berhenti menjawab setelah ditukar, periksa penandaannya"],
      checks: ["Daya menyala, polling dihentikan: probe merah di B (D1·+), hitam di A (D0·−) seharusnya terbaca +200 mV atau lebih jika ada bias", "Catat keadaan yang sudah ditukar di diagram pengawatan agar tidak ada yang menukarnya kembali"],
    },
    "r-rs485-bus": {
      title: "Satu perangkat berjalan sendiri, tetapi tidak di bus — pengawatan atau tata letak bus",
      causes: [
        "Tiga terminasi atau lebih (sakelar perangkat di tengah menyala), atau tidak ada sama sekali",
        "Dua perangkat memakai alamat slave yang sama dan menjawab bersamaan sehingga saling merusak",
        "Cabang (stub) panjang atau pengawatan bintang, atau putus di terminal perantara",
        "Tidak ada kabel SG (common), sehingga perangkat yang jauh keluar dari rentang common mode",
      ],
      checks: [
        "Semua daya mati, resistansi A–B: sekitar 60 Ω (kedua ujung), sekitar 120 Ω (satu ujung), ratusan Ω hingga beberapa kΩ atau lebih (tanpa terminasi — banyak perangkat atau resistor bias yang terlihat menurunkannya sampai sekitar 1 kΩ), 40 Ω atau kurang (terlalu banyak). Terminasi RC (1 nF + 120 Ω) tidak terlihat oleh DC dan terbaca «tanpa terminasi»",
        "Daya menyala: A–SG dan B–SG dalam −7 sampai +12 V",
        "Sambungkan kembali perangkat satu per satu untuk melihat di mana mulai gagal; catat semua alamat slave",
      ],
    },
    "r-rs485-device": {
      title: "Gagal walaupun hanya satu perangkat — pengaturan perangkat, port komunikasi, atau konverter",
      causes: [
        "Pengaturan perangkat belum disimpan, atau baru berlaku setelah restart",
        "Komunikasi ada di kartu opsi atau terminal terpisah, atau ada pengaturan mode 2 kawat/4 kawat",
        "Konverter rusak, atau diawat ke terminal RS-422/RS-232, bukan RS-485",
      ],
      checks: [
        "Uji konverter sendirian dengan uji echo RS-485 2 kawat di Port Inspector",
        "Coba perangkat yang sama dengan konverter atau PC lain",
        "Cari nomor terminal komunikasi dan kapan pengaturan baru berlaku di manual perangkat",
      ],
    },
    "r-rs485-signal": {
      title: "Kualitas sinyal — pantulan, derau, panjang",
      causes: [
        "Tanpa terminasi atau hanya di satu ujung — pantulan pada jalur yang panjang dan cepat",
        "Kabel terlalu panjang untuk baud rate-nya (kira-kira baud × meter ≤ 10^8)",
        "Bukan twisted pair, ditarik sejajar dengan kabel daya, atau shield tidak di-ground",
      ],
      checks: ["Daya mati: A–B sekitar 60 Ω", "Common mode A–SG dan B–SG dalam −7 sampai +12 V, juga saat motor berjalan", "Periksa batas panjang untuk baud rate ini di kalkulator RS-485"],
    },
    "r-rs485-framing": {
      title: "Frame bergeser — pengaturan, echo, atau terpotong",
      causes: [
        "Baud rate atau paritas sedikit berbeda (sebagian byte masih bisa tampak benar)",
        "Konverter 2 kawat meng-echo request, yang muncul di depan jawaban",
        "Latency USB memotong satu jawaban menjadi dua dan penerima mengurainya terpisah",
      ],
      checks: ["Tempel byte yang diterima ke dekoder frame Modbus dan periksa ID, fungsi, dan CRC", "Periksa echo konverter dan latency timer FTDI di Port Inspector"],
    },
    "r-rs485-timing": {
      title: "Waktu terlalu ketat — timeout, interval polling, latency USB",
      causes: [
        "Timeout lebih pendek dari waktu jawab perangkat (inverter dan meter bisa memerlukan puluhan hingga ratusan ms)",
        "Request berikutnya dikirim terlalu cepat sehingga bertumpuk dengan jawaban sebelumnya",
        "Latency timer konverter USB (bawaan FTDI 16 ms) menambah waktu pada setiap frame pendek",
      ],
      checks: ["Hitung waktu request/jawaban dan timeout minimum dengan kalkulator waktu komunikasi serial", "Baca nilai latency timer dengan Port Inspector"],
    },
    "r-rs485-idle": {
      title: "Jalur mengambang saat diam, atau jawaban bertabrakan — bias atau alamat",
      causes: [
        "Tidak ada resistor bias (failsafe), sehingga derau saat diam terbaca sebagai byte",
        "Dua perangkat dengan alamat yang sama sesekali bertabrakan",
        "Derau hanya saat motor atau inverter berjalan (shield, ground)",
      ],
      checks: ["Daya menyala, polling dihentikan: diferensial B–A +200 mV atau lebih", "Catat semua perangkat dan alamatnya di diagram sistem untuk menemukan yang kembar", "Bandingkan kapan jawaban hilang dengan kapan motor berjalan"],
    },
    // ② RS-232
    "rs232-seen": { q: "Apakah port COM muncul di Device Manager PC?", hint: "Untuk konverter USB-RS232, «Tidak» berlanjut ke cabang deteksi konverter" },
    "rs232-loop": { q: "Dengan pin 2 (RXD) dan 3 (TXD) DB9 sisi PC disambung (loopback), apakah karakter yang dikirim kembali?" },
    "rs232-cross": { q: "Apakah TX perangkat disambung ke RX PC (pin 2) dan TX PC (pin 3) ke RX perangkat — disilang?", hint: "Tidak yakin? Pilih «Tidak» untuk melihat cara memeriksanya" },
    "rs232-flow": { q: "Apakah flow control diatur ke «None» di program dan di perangkat?" },
    "r-rs232-pc": {
      title: "Tertahan di port PC atau konverter",
      causes: ["Program lain memegang port itu, atau nomor COM yang dibuka salah", "Konverter atau port rusak, masalah driver", "Pin yang disambung salah (loopback adalah pin 2–3)"],
      checks: ["Saat diam, pin 3 (TXD) ke pin 5 (GND) terbaca −5 sampai −15 V (−3 sampai −5 V lemah — perlu diperiksa)", "Jalankan uji loopback Port Inspector dan periksa apakah byte kembali pada tiap baud rate"],
    },
    "r-rs232-cross": {
      title: "TX mungkin tersambung ke TX — kabel silang atau lurus",
      causes: ["PC dan perangkat sama-sama DTE, tetapi dipakai kabel lurus (TX–TX) — perlu kabel null modem (silang)", "Atau perangkatnya DCE dan dipakai kabel silang"],
      checks: [
        "Di tiap konektor, pin yang menunjukkan −5 sampai −15 V saat diam (−3 sampai −5 V jika lemah) adalah TX sisi itu — jika kedua pin TX berada di satu kabel, keduanya bertabrakan",
        "Pakai mode kontinuitas di sepanjang kabel untuk melihat apakah 2↔3 disilang",
      ],
    },
    "r-rs232-flow": {
      title: "Flow control tidak cocok",
      causes: ["Flow control perangkat keras (RTS/CTS) aktif tetapi CTS tidak diawat, sehingga PC menunggu selamanya", "Perangkat memerlukan DTR/DSR aktif, tetapi hanya dipakai kabel 3 kawat"],
      checks: ["Atur flow control ke «None» di program lalu uji lagi", "Jika perangkat mewajibkan handshake, jumper RTS–CTS (7–8) dan DTR–DSR–DCD (4–6–1) di dalam konektor, atau pakai kabel handshake lengkap"],
    },
    "r-rs232-settings": {
      title: "Pengawatan tampak benar — pengaturan, format perintah, atau level sinyal",
      causes: ["Baud rate, data bit, paritas, atau stop bit berbeda", "Akhir baris (CR, LF, CR LF) atau checksum berbeda dari yang diharapkan perangkat", "Port perangkat adalah UART TTL (3,3/5 V), bukan RS-232"],
      checks: ["Jika TX perangkat diam di +3,3 atau +5 V, itu TTL — jangan disambung langsung ke port RS-232", "Kirim dan terima dalam HEX, lalu bandingkan akhir baris dan checksum byte demi byte"],
    },
    // ③ Modbus TCP · Ethernet
    "tcp-ping": { q: "Apakah perangkat menjawab ping dari PC?" },
    "tcp-subnet": { q: "Apakah IP PC dan perangkat berada di subnet yang sama? (mis. 192.168.0.10/24 dan 192.168.0.50)" },
    "tcp-link": { q: "Apakah LED link menyala di port LAN PC dan perangkat (atau switch)?" },
    "tcp-502": { q: "Bisakah Anda membuka koneksi TCP ke port 502 (atau port yang tercantum di manual)?", hint: "Coba sambungkan dengan PortDock TCP, atau PowerShell Test-NetConnection <IP> -Port 502" },
    "tcp-reply": { q: "Setelah tersambung, apakah request mendapat jawaban?" },
    "tcp-exception": { q: "Apakah jawabannya berupa exception (kode fungsi + 0x80, mis. 83 02)?", hint: "«Tidak» = jawaban datang, tetapi nilainya tampak salah" },
    "r-tcp-subnet": {
      title: "Subnet IP berbeda",
      causes: ["Bagian jaringannya berbeda, sehingga tidak bisa saling menjangkau tanpa gateway", "IP perangkat tidak diketahui (bawaan pabrik atau DHCP)"],
      checks: [
        "Masukkan kedua IP dan mask ke kalkulator subnet untuk melihat apakah keduanya satu subnet",
        "Tambahkan IP kedua di subnet perangkat ke adaptor jaringan PC (mis. 192.168.0.200/24)",
        "Jika IP tidak diketahui, cari dengan Net Scan",
      ],
    },
    "r-tcp-link": {
      title: "Tidak ada link fisik — kabel, port, atau switch",
      causes: ["Kabel atau konektor rusak, atau tercolok ke port lain", "Daya atau port switch mati, atau port LAN perangkat dinonaktifkan"],
      checks: ["Tukar kabel dan port switch", "Baca link, kecepatan, dan duplex dengan «Read adapters» di Port Inspector"],
    },
    "r-tcp-noping": {
      title: "Link menyala tetapi ping tidak dijawab",
      causes: [
        "Perangkat diatur untuk tidak menjawab ping (ICMP) — uji koneksi ke 502 secara langsung",
        "Dua perangkat memakai IP yang sama (konflik alamat)",
        "Adaptor PC lain (mis. Wi-Fi) berada di subnet yang sama dan lalu lintas keluar lewat sana; firewall",
      ],
      checks: [
        "Cabut perangkat lalu ping — jika ada jawaban, perangkat lain memakai IP itu",
        "Pindai subnet dengan Net Scan untuk melihat IP dan MAC; periksa IP kembar di diagram sistem",
        "Nonaktifkan sementara adaptor lain lalu coba lagi",
      ],
    },
    "r-tcp-port": {
      title: "Ping berhasil, tetapi port 502 menolak",
      causes: ["Modbus TCP dinonaktifkan di perangkat atau merupakan opsi (kartu atau lisensi terpisah)", "Port-nya bukan 502", "Batas koneksi sudah penuh (SCADA atau HMI sudah tersambung)"],
      checks: ["Periksa pengaturan Modbus TCP, port, dan koneksi maksimum di manual", "Putuskan sebentar client lain lalu sambungkan lagi"],
    },
    "r-tcp-unitid": {
      title: "Tersambung tetapi tidak ada jawaban — Unit ID atau gateway",
      causes: [
        "Unit ID salah — di belakang gateway harus sama dengan alamat slave RTU; untuk perangkat langsung pakai nilai dari manual (1 atau 255 lazim)",
        "Sisi RTU gateway (baud rate, pengawatan) gagal — gateway membuang request atau mengembalikan exception 0B",
        "Kode fungsi yang tidak didukung perangkat",
      ],
      checks: ["Urai byte yang dipertukarkan di dekoder frame Modbus untuk melihat MBAP dan Unit ID"],
    },
    "r-tcp-exception": {
      title: "Perangkat menjawab dengan exception — alamat, fungsi, atau jumlah",
      causes: [
        "Exception 02: alamat tidak ada — penulisan 40001 tidak diubah ke alamat mulai 0 (bergeser satu)",
        "Exception 01: fungsi tidak didukung (mis. membaca input register dengan 03)",
        "Exception 03: jumlah lebih dari 125 atau melebihi batas perangkat",
      ],
      checks: ["Tempel jawaban ke dekoder frame Modbus untuk melihat arti exception", "Periksa apakah peta register memakai alamat mulai 0 atau mulai 1"],
    },
    "r-tcp-values": {
      title: "Komunikasi berjalan tetapi nilainya tampak salah — format, urutan, atau skala",
      causes: ["Urutan word nilai 32 bit (float, int32) berbeda (ABCD, CDAB …)", "Skala (×0,1, ×0,01), tanda (int16/uint16), atau rasio CT tidak diterapkan", "Alamat bergeser satu (mulai 0 atau mulai 1)"],
      checks: ["Masukkan dua register ke konverter float Modbus dan bandingkan keempat urutan", "Bandingkan bertanda dan tak bertanda dengan konverter bilangan bulat"],
    },
    // ④ Konverter USB-serial
    "usb-sound": { q: "Saat konverter dicolokkan, apakah Windows membunyikan suara sambung atau tampilan Device Manager berubah?" },
    "usb-com": { q: "Apakah muncul di «Ports (COM & LPT)» dengan nomor COM?", hint: "«Tidak» = muncul di «Other devices», dengan tanda peringatan atau sebagai perangkat tak dikenal" },
    "usb-drops": { q: "Apakah terputus saat dipakai (port hilang lalu muncul lagi)?" },
    "usb-motor": { q: "Apakah terputus saat beban besar seperti motor, inverter, atau mesin las mulai menyala atau berjalan?" },
    "usb-comnum": { q: "Apakah nomor COM berubah setiap kali dicolokkan, atau melompat tinggi seperti COM15?", hint: "«Tidak» = terdeteksi dan tersambung, tetapi komunikasi lambat atau jawaban terpotong" },
    "r-usb-none": {
      title: "Sama sekali tidak terlihat sebagai perangkat USB — kabel, port, atau konverter",
      causes: ["Kabel USB khusus pengisian daya (tanpa kabel data)", "Masalah sambungan atau daya pada port panel depan atau hub", "Konverter rusak"],
      checks: [
        "Colokkan langsung ke port belakang tanpa hub, dengan kabel lain",
        "Lihat apakah PC lain berperilaku sama",
        "Periksa apakah pencolokan tercatat di log sambung/putus USB Hardware Tester (mulai 0.10.0)",
      ],
    },
    "r-usb-driver": {
      title: "Driver tidak ada atau perangkat tidak bisa dimulai",
      causes: ["Tidak ada driver yang terpasang untuk chip-nya (FTDI, CH34x, CP210x, PL2303)", "Driver menolak chip itu (kode 10 dll.) — sering terjadi pada PL2303 versi lama"],
      checks: ["Baca VID:PID, nama chip, serta kode masalah dan artinya di Port Inspector", "Pakai driver dari situs pembuat chip (minta bantuan tim IT jika perlu hak administrator)"],
    },
    "r-usb-emi": {
      title: "Derau atau beda ground masuk ke USB",
      causes: ["Dengan konverter tanpa isolasi, beda potensial antara ground perangkat dan PC me-reset USB", "Kabel komunikasi atau USB ditarik di samping kabel daya"],
      checks: [
        "Tegangan antara selubung USB PC dan SG/PE perangkat (V⎓ dan V~): di bawah 1 V lazim; 7 V atau lebih bermasalah",
        "Coba konverter berisolasi, kabel USB yang lebih pendek, atau inti ferit",
        "Bandingkan waktu USB terputus di Hardware Tester dengan waktu motor berjalan (mulai 0.10.0)",
      ],
    },
    "r-usb-power": {
      title: "Penghematan daya, catu daya, atau kontak",
      causes: ["USB selective suspend, atau «Allow the computer to turn off this device to save power»", "Hub bertenaga bus kekurangan daya, atau konektor kendur"],
      checks: ["Baca pengaturan penghematan daya dan riwayat pencolokan terakhir dengan Port Inspector (hanya baca — ubah sendiri di Windows)", "Lihat apakah menggoyang kabel menyebabkan terputus"],
    },
    "r-usb-comnum": {
      title: "Nomor COM berubah — lokasi port, nomor seri, reservasi",
      causes: ["Chip tanpa nomor seri (CH34x dll.) mendapat nomor baru di setiap port USB", "Perangkat yang pernah tersambung tetap memesan nomornya (ComDB)"],
      checks: ["Selalu pakai port USB yang sama", "Lihat reservasi nomor COM di Port Inspector", "PortDock Serial membuka kembali perangkat yang sama walaupun nomornya berubah"],
    },
    "r-usb-latency": {
      title: "Tersambung tetapi lambat atau jawaban terpotong — latency USB",
      causes: ["Latency timer FTDI (bawaan 16 ms) menambah jeda pada setiap frame pendek", "Program menganggap setiap potongan sebagai jawaban terpisah", "Jika sama sekali tidak ada komunikasi, lanjutkan ke cabang RS-485 atau RS-232"],
      checks: ["Periksa latency timer dan waktu bolak-balik loopback di Port Inspector", "Bandingkan dengan waktu jawab yang diharapkan dari kalkulator waktu komunikasi serial"],
    },
    // ⑤ 4-20 mA
    "ma-kind": { q: "Bagaimana nilainya terlihat aneh?", opts: ["Tetap di 0 (atau minimum)", "Tetap di maksimum", "Berfluktuasi atau melompat", "Bergerak, tetapi tidak sesuai kenyataan"] },
    "ma-flow": { q: "Dengan multimeter (mA) dipasang seri di loop, apakah mengalir lebih dari 3,6 mA?" },
    "ma-volt": { q: "Apakah ada tegangan (biasanya 10 V atau lebih) di antara terminal + dan − transmitter?" },
    "ma-high": { q: "Apakah arus yang terukur 21 mA atau lebih?" },
    "ma-motor": { q: "Apakah fluktuasinya membesar saat motor atau inverter berjalan?" },
    "ma-loopv": { q: "Di sekitar 20 mA, apakah tegangan terminal transmitter masih di atas tegangan kerja minimum di manualnya?" },
    "r-ma-open": {
      title: "Tidak ada arus dan tegangan di loop — rangkaian terbuka atau catu daya",
      causes: ["Kabel putus, terminal kendur, atau sekring", "Catu loop (24 V) mati atau diawat ke tempat lain", "Transmitter 4 kawat (catu daya terpisah) diawat seperti 2 kawat, sehingga tidak mendapat daya"],
      checks: ["Ukur 24 V di catu daya, lalu di transmitter, untuk menemukan di mana tegangannya hilang", "Bandingkan pengawatan sebenarnya dengan gambar 2/3/4 kawat"],
    },
    "r-ma-tx": {
      title: "Ada tegangan tetapi tidak ada arus — transmitter atau polaritas",
      causes: ["Polaritas 2 kawat terbalik (+ dan − tertukar)", "Input penerima diatur ke mode tegangan, sehingga loop praktis terbuka", "Transmitter rusak"],
      checks: ["Periksa ulang + dan − transmitter terhadap gambar di manual", "Periksa pengaturan atau jumper tipe kanal (arus/tegangan) di kartu input"],
    },
    "r-ma-input": {
      title: "Arus mengalir tetapi nilainya 0 — pengaturan sisi penerima atau skala",
      causes: [
        "Rentang input diatur lain (0–20 mA, 1–5 V, 0–10 V)",
        "Yang dilihat kanal lain, atau penskalaan diatur ke 0",
        "Pada 3,6 mA atau kurang, transmitter melaporkan kerusakan NE 43 (3,6–3,8 mA adalah di bawah rentang, bukan sinyal kegagalan)",
      ],
      checks: ["Masukkan mA yang terukur ke pemeriksa multimeter untuk melihat % dan zona NE 43", "Bandingkan dengan nilai raw yang diharapkan (mis. 0–27648) di kalkulator 4–20 mA"],
    },
    "r-ma-fault-high": {
      title: "21 mA atau lebih — sinyal kegagalan atau hubung singkat",
      causes: ["Transmitter mengeluarkan sinyal kegagalan atas NE 43 (mis. sensor putus)", "Jauh di atas 25 mA: catu daya melewati transmitter (hubung singkat)"],
      checks: ["Periksa tampilan atau diagnostik transmitter", "Ukur resistansi sensor (mis. Pt100) untuk melihat apakah terbuka"],
    },
    "r-ma-over": {
      title: "Tetap di maksimum — pengaturan rentang atau nilai sebenarnya",
      causes: ["Rentang penskalaan PLC lebih sempit dari rentang transmitter", "Nilai proses melebihi rentang transmitter (mis. 0–10 bar)", "Satuan tertukar (bar, psi, kPa)"],
      checks: ["Hitung % dari mA yang terukur dan bandingkan dengan nilai di PLC", "Periksa rentang di pelat nama atau pengaturan transmitter"],
    },
    "r-ma-noise": {
      title: "Derau — shield, ground, atau jalur kabel",
      causes: ["Kabel sinyal satu duct dengan kabel daya", "Shield di-ground di kedua ujung sehingga membentuk ground loop (biasanya satu ujung saja)", "Beda potensial ground antara transmitter dan PLC"],
      checks: ["Ukur tegangan di antara kedua ground (di bawah 1 V lazim)", "Catat ayunan nilainya dalam mA; pertimbangkan isolator sinyal", "Kurangi fluktuasi dengan konstanta waktu filter input (filter RC)"],
    },
    "r-ma-loadv": {
      title: "Tegangan loop terlalu rendah — resistansi beban atau penurunan catu",
      causes: ["Terlalu banyak penerima, indikator, atau barrier di loop", "Pengawatan panjang atau tipis, penurunan catu 24 V"],
      checks: ["Pakai kalkulator beban loop untuk tegangan transmitter pada 20 mA (atau 21 mA)", "Ukur catu 24 V saat berbeban (penurunan 5 % atau kurang masih aman)"],
    },
    "r-ma-process": {
      title: "Pengawatan dan tegangan tampak baik — variasi proses sebenarnya atau damping",
      causes: ["Nilai proses memang berfluktuasi (denyut pompa dll.)", "Damping transmitter atau filter input PLC terlalu pendek"],
      checks: ["Rekam nilainya di grafik waktu dan cari pola berkala", "Periksa pengaturan damping transmitter"],
    },
    "r-ma-scale": {
      title: "Nilai tidak sesuai kenyataan — penskalaan, satuan, atau nilai raw",
      causes: ["Rentang teknik (bawah/atas) berbeda dari pengaturan transmitter", "Rentang nilai raw PLC salah (0–27648, 0–4000, 0–32000)", "Satuan tertukar (bar/psi, gauge/absolut)"],
      checks: ["Masukkan mA yang terukur ke kalkulator 4–20 mA dan bandingkan dengan nilai dan raw yang diharapkan", "Periksa apakah nilai PLC sebanding pada 4, 12, dan 20 mA"],
    },
    // ⑥ Sensor NPN/PNP
    "sn-kind": { q: "Apa gejalanya?", opts: ["Input tidak pernah ON", "Input tidak pernah OFF (selalu ON)"] },
    "sn-led": { q: "Apakah LED indikator sensor itu sendiri menyala saat ada objek?" },
    "sn-power": { q: "Apakah tegangan antara kabel cokelat (+) dan biru (0 V) sensor mendekati tegangan catu (biasanya 24 V)?" },
    "sn-type": { q: "Apakah jenis sensor dan COM input PLC cocok — COM input ke +24 V untuk NPN, ke 0 V untuk PNP?", hint: "Tidak yakin? Pilih «Tidak»" },
    "sn-vin": { q: "Dengan sensor ON, apakah ada 15 V atau lebih di antara terminal input PLC dan COM input?" },
    "sn-plcled": { q: "Apakah LED input PLC menyala pada saat itu?" },
    "r-sn-power": {
      title: "Tidak ada daya di sensor",
      causes: ["Kabel catu putus, kontak konektor, atau sekring", "Warna kabel berbeda dari konvensi (cokelat +, biru 0 V, hitam output)", "Penurunan tegangan ke sensor yang jauh"],
      checks: ["Ukur tegangan catu di sensor dengan beban menyala — penurunan lebih dari 15 % bermasalah", "Periksa warna kabel dan rentang catu di datasheet sensor"],
    },
    "r-sn-sense": {
      title: "Ada daya tetapi tidak mendeteksi — pengaturan sensor atau objek",
      causes: ["Jarak deteksi atau sensitivitas, bahan objek (jangkauan sensor proximity bergantung pada jenis logam)", "Sensor fotoelektrik tidak lurus atau lensanya kotor", "Sensor rusak"],
      checks: ["Dekatkan objek untuk melihat pada jarak berapa LED menyala", "Ganti dengan sensor sejenis"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP dan polaritas COM input mungkin tidak cocok",
      causes: ["Sensor NPN dengan COM input di 0 V (atau PNP dengan +24 V) — tidak ada jalur untuk arus", "Pabrikan memakai «sink/source» dengan arti yang berlawanan"],
      checks: ["Dengan sensor ON, hitam–biru terbaca mendekati 0 V untuk NPN, mendekati tegangan catu untuk PNP", "Periksa di gambar pengawatan input pada manual PLC ke mana COM disambung"],
    },
    "r-sn-wire": {
      title: "Sensor ON tetapi tegangan tidak sampai ke input — pengawatan",
      causes: ["Kabel output masuk ke input lain, atau putus di terminal block perantara", "Kabel COM input tidak ada", "Tegangan sisa sensor tinggi, atau arus output terlalu kecil untuk input"],
      checks: ["Ukur hitam–biru saat sensor ON dan OFF lalu masukkan keduanya ke pemeriksa", "Input PLC ke COM: ON 15 V atau lebih (tipe 1), OFF 5 V atau kurang"],
    },
    "r-sn-input": {
      title: "Tegangan sampai tetapi PLC tidak membaca ON — kartu input",
      causes: ["Daya kartu input atau kerusakan, atau yang dilihat slot lain", "Tegangan input dekat ambang (11–15 V) — input tipe 1 bisa tetap OFF"],
      checks: ["Pindahkan sensor ke kanal sebelahnya", "Periksa tegangan dan arus ON di manual kartu input"],
    },
    "r-sn-program": {
      title: "Input memang ON — alamat, filter, atau lebar pulsa",
      causes: ["Program membaca alamat input lain (penomoran X oktal atau heksadesimal)", "Sinyal lebih pendek dari waktu filter input (objek bergerak cepat)", "Jika dibaca lewat komunikasi, perhitungan alamat bit bergeser"],
      checks: ["Pantau bit input itu langsung di monitor PLC", "Untuk protokol MC, periksa penulisan nomor device"],
    },
    "r-sn-stuck": {
      title: "Input tidak pernah OFF — arus bocor, hubung singkat, atau mode output",
      causes: ["Arus bocor saat OFF dari sensor 2 kawat membuat input tetap ON", "Kabel output terhubung singkat ke +24 V (PNP) atau 0 V (NPN)", "Mode output sensor (NO/NC, light-on/dark-on) terbalik"],
      checks: ["Dengan sensor OFF, input PLC ke COM seharusnya 5 V atau kurang", "Lihat apakah input menjadi OFF saat kabel output dilepas"],
    },
    // ⑦ Protokol MC
    "mc-ping": { q: "Apakah PLC menjawab ping dari PC?", hint: "«Tidak» berlanjut ke cabang Ethernet (subnet IP)" },
    "mc-port": { q: "Apakah koneksi protokol MC (SLMP) sudah dibuka di pengaturan Ethernet PLC, dengan nomor port, TCP/UDP, dan biner/ASCII yang sama dengan program?" },
    "mc-endcode": { q: "Apakah end code di jawaban bukan nol (mis. C059)?" },
    "mc-noreply": { q: "Apakah koneksi terbuka tetapi jawaban tidak pernah datang (timeout)?", hint: "«Tidak» = jawaban datang, tetapi nilainya tampak salah" },
    "r-mc-port": {
      title: "Pengaturan koneksi protokol MC di PLC",
      causes: ["Koneksi protokol MC (SLMP) belum diatur, atau pengaturannya belum ditulis ke PLC dan di-restart", "Nomor port, TCP/UDP, atau kode (biner/ASCII) berbeda dari program", "Program lain sudah memakai koneksi TCP yang sama"],
      checks: ["Uji sisi program lebih dulu terhadap PortDock PLC Simulator di 127.0.0.1, tanpa PLC", "Tulis pengaturan Ethernet dari software engineering di samping nilai program lalu bandingkan"],
    },
    "r-mc-endcode": {
      title: "PLC menolak request dengan end code",
      causes: ["Perintah atau subperintah tidak didukung model PLC itu", "Kode atau nomor device di luar rentang, atau jumlah titik terlalu banyak", "Pengaturan di sisi PLC seperti proteksi tulis saat RUN"],
      checks: ["Tempel jawaban ke dekoder frame MC protocol untuk melihat arti end code", "Ikuti urutan pemeriksaan di panduan end code"],
    },
    "r-mc-frame": {
      title: "Format frame tidak cocok, sehingga PLC diam saja",
      causes: ["Frame 3E/4E atau biner/ASCII berbeda dari pengaturan PLC", "Nilai header (nomor jaringan, nomor PC, modul tujuan) atau panjang data salah", "Memakai UDP padahal PLC mengharapkan TCP (atau sebaliknya)"],
      checks: ["Urai byte yang dikirim kolom demi kolom di dekoder frame MC protocol"],
    },
    "r-mc-values": {
      title: "Jawaban datang tetapi nilainya tampak salah — nomor device atau satuan",
      causes: ["X dan Y heksadesimal tetapi dimasukkan sebagai desimal", "Pembacaan satuan bit dan satuan word tertukar", "Urutan word atau tanda nilai 32 bit"],
      checks: ["Bandingkan dengan tabel penulisan di panduan nomor device", "Bandingkan tanda dan hex di konverter bilangan bulat"],
    },
    // ⑧ USB PC terputus
    "pu-know": { q: "Apakah Anda tahu perangkat mana yang terputus?", hint: "Jika yang terdengar hanya suara sambung/putus berulang, pilih «Tidak»" },
    "pu-port": { q: "Apakah tetap terputus di port USB lain (panel belakang, tanpa hub)?" },
    "pu-cable": { q: "Apakah tetap terputus dengan kabel lain?" },
    "pu-suspend": { q: "Apakah mematikan penghematan daya USB (selective suspend, «allow turn off») menguranginya?", hint: "PortDock hanya membaca pengaturan ini — ubah sendiri di pengaturan Windows" },
    "r-pu-find": {
      title: "Cari dulu perangkat mana yang terputus",
      causes: ["Belum diketahui — bisa mouse, keyboard, dongle nirkabel, kamera, konverter USB-serial, atau hub"],
      checks: [
        "Pakai log sambung/putus USB di Hardware Tester (mulai 0.10.0) untuk melihat waktu, nama perangkat, dan VID:PID",
        "Perangkat yang terputus 3 kali atau lebih dalam 10 menit ditandai «diduga sering terputus» — lalu ikuti cabang ini lagi untuk perangkat itu",
      ],
    },
    "r-pu-port": {
      title: "Port atau hub asalnya",
      causes: ["Kabel internal atau kontak port panel depan", "Hub bertenaga bus kekurangan daya"],
      checks: ["Pakai port belakang atau hub yang punya catu daya sendiri", "Pastikan lewat log sambung/putus USB Hardware Tester bahwa putusnya berhenti setelah pindah port (mulai 0.10.0)"],
    },
    "r-pu-cable": {
      title: "Kabel atau konektor",
      causes: ["Kabel putus di dalam (terputus saat digerakkan), konektor kendur", "Kabel USB atau kabel ekstensi terlalu panjang"],
      checks: ["Pakai kabel pendek yang berkualitas baik"],
    },
    "r-pu-suspend": {
      title: "Penghematan daya USB mematikan perangkat",
      causes: ["USB selective suspend, «allow the computer to turn off» pada perangkat atau hub"],
      checks: ["Baca USB selective suspend dengan «Read this PC's settings» di Port Inspector", "Pada PC mesin, tinjau juga pengaturan sleep di power plan"],
    },
    "r-pu-device": {
      title: "Perangkat, driver, atau lingkungan sekitar",
      causes: ["Perangkat itu sendiri atau driver-nya", "Perangkat USB 3 berjalan pada kecepatan USB 2.0 (tanda masalah kabel atau port)", "Untuk dongle nirkabel, interferensi 2,4 GHz di dekat port USB 3.0", "Beda ground atau derau peralatan (lokasi industri)"],
      checks: ["Lihat apakah terputus juga di PC lain", "Cari tanda «Perlu diperiksa» pada kecepatan USB di Hardware Tester (mulai 0.10.0)", "Ukur tegangan di antara ground PC dan ground peralatan"],
    },
  },
} satisfies TreeText;
