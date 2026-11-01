// Bahasa Indonesia — nama dan ringkasan yang dipakai di banyak halaman (program, alat web, kelompok, «Apa yang ingin Anda lakukan?», ukuran berkas).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Ringkasan program (tagline di tools.ts) */
  apps: {
    serial: "Terminal serial (COM) dengan jalur sinyal kontrol dan sambung ulang otomatis",
    "modbus-slave": "Simulator slave Modbus (RTU dan TCP) dengan tabel register dan injeksi gangguan",
    tcp: "Klien, server, dan relay TCP — banyak koneksi, echo, sambung ulang otomatis",
    udp: "Kirim dan terima UDP — broadcast, multicast, echo",
    simulator: "Perangkat tiruan yang menjawab sesuai aturan lewat serial, TCP, dan UDP",
    netscan: "Cari perangkat di jaringan industri — kenali port industri, ping jangka panjang",
    "modbus-master": "Master Modbus RTU/TCP (polling) — nilai bertipe, penulisan, pemindaian alamat slave",
    scpi: "Terminal SCPI untuk instrumen ukur — socket LAN dan RS-232, tanpa VISA",
    plot: "Grafik waktu nyata dari angka lewat serial, TCP, dan UDP",
    "port-inspector": "Pemeriksa port COM, adaptor jaringan, pengaturan PC, dan nirkabel (Wi-Fi, Bluetooth) — hanya baca",
    "plc-simulator": "Simulator server MC protocol (SLMP) — uji HMI dan program pengumpul data tanpa PLC",
    "hw-tester": "Merekam putus dan latensi Wi-Fi serta internet, plus log sambung/putus Bluetooth dan USB (mulai 0.10.0)",
    mcp: "Server MCP untuk klien AI — membaca port, Modbus, MC, dan SCPI; menulis hanya ke simulator di PC ini",
  } satisfies Record<Tool["id"], string>,

  /** Nama dan ringkasan alat web (name, blurb di webTools.ts) */
  webTools: {
    "tools/4-20ma/": { name: "Kalkulator skala 4–20 mA", blurb: "Arus/tegangan ↔ nilai teknik ↔ % ↔ hitungan PLC (0–27648, dll.). Dengan tabel 4, 8, 12, 16, dan 20 mA." },
    "tools/modbus/": { name: "Pembuat request Modbus RTU", blurb: "Alamat slave (Slave ID), fungsi, alamat, jumlah → byte request lengkap dengan CRC. Menerima penulisan 40001." },
    "tools/modbus-decoder/": { name: "Dekoder frame Modbus", blurb: "Tempel byte RTU atau TCP: alamat slave, fungsi, nilai, CRC, MBAP, dan kode exception diuraikan." },
    "tools/modbus-float/": { name: "Konverter float Modbus", blurb: "2 atau 4 register ↔ float32, float64, int32. Urutan word ABCD, CDAB, BADC, dan DCBA dalam satu tabel." },
    "tools/mc-decoder/": { name: "Dekoder frame MC protocol (SLMP)", blurb: "Frame 3E/4E biner atau ASCII → header, perintah, device, nilai, dan end code. Uraikan respons bersama request-nya, buat request." },
    "tools/rs485/": { name: "Kalkulator terminasi dan bias RS-485", blurb: "Pull-up/pull-down dan terminasi 120 atau 150 Ω → tegangan diam terhadap ambang 200 mV, daya resistor, panjang kabel per baud rate." },
    "tools/serial-timing/": { name: "Kalkulator waktu komunikasi serial", blurb: "Baud rate dan paritas → waktu karakter, Modbus RTU t3.5 dan t1.5, waktu request dan respons, siklus polling, batas bawah timeout." },
    "tools/checksum/": { name: "Kalkulator CRC dan checksum", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, dan SUM16 sekaligus." },
    "tools/subnet/": { name: "Kalkulator subnet IP", blurb: "Alamat dan mask (/24) → jaringan, broadcast, rentang. Memeriksa dengan kedua mask: apakah PC dan PLC satu subnet?" },
    "tools/pinouts/": { name: "Referensi pinout konektor", blurb: "DB9/DB25 RS-232, RJ45 T568A/B dan Ethernet, Modbus RJ45/DB9 (spesifikasi), M12 kode A/D/X, M8, USB-A/B/C, nama terminal RS-485 — tampak depan male/female, warna kabel, sumber, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Kelompok alat web (webToolGroups.ts) */
  groups: {
    comm: "Serial dan Modbus",
    net: "Jaringan",
    draw: "Pengawatan dan diagram",
    diag: "Mencari gangguan dan pemeriksaan",
    field: "Alat lapangan",
    signal: "Sinyal dan sensor",
    elec: "Listrik dan motor",
    mech: "Mekanik dan pneumatik",
    units: "Konversi satuan",
    hw: "Uji perangkat keras PC",
    etc: "Alat lainnya",
  } satisfies Record<GroupId, string>,

  /** «Apa yang ingin Anda lakukan?» (components/PickApp.astro) — menurut ID jalur */
  pick: {
    title: "Apa yang ingin Anda lakukan?",
    q: {
      serial: "Berkomunikasi dengan perangkat serial (COM) atau RS-485",
      modbus: "Membaca dan menulis perangkat Modbus, atau mensimulasikannya",
      net: "Mencari perangkat di jaringan, TCP dan UDP",
      sim: "Menguji HMI atau program host tanpa PLC atau perangkat",
      scpi: "Mengendalikan instrumen (SCPI) dan merekam hasil ukur",
      pc: "Masalah koneksi PC — port COM, adaptor jaringan, Wi-Fi, Bluetooth",
      mcp: "Membaca perangkat dari klien AI (MCP)",
      pcap: "Menganalisis rekaman lalu lintas (pcap) — waktu respons, respons yang hilang",
    },
    notes: {
      "pcap:tcp": "Pasang sebagai relay di antara HMI dan PLC lalu simpan sebagai pcap — tanpa Wireshark",
    },
    pcapName: "Penganalisis pcap (bahasa Inggris)",
    pcapNote: "Rekaman Wireshark atau pktmon langsung di browser, tanpa instalasi — pasangan request/respons Modbus TCP dan MC",
    hwTitle: "Uji mikrofon, keyboard, mouse, webcam, atau monitor",
    hwName: "Uji perangkat keras PC (bahasa Inggris)",
    hwNote: (n: number) => `Bukan program Windows — langsung di browser, tanpa instalasi (${n} uji)`,
  },

  /** Ukuran berkas (SIZE di release.ts) */
  size: { setup: "sekitar 4 MB", offline: "sekitar 220 MB", portable: "sekitar 3 MB" },
};
