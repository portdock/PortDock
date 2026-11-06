// Bahasa Indonesia — paket ke-3 (10 alat web tes perangkat keras PC, scope.ts SCOPE3). Disalin dari kamus acuan ja/batch3.ts, diterjemahkan dari versi bahasa Inggris.
// webTools = nama dan ringkasan alat, hwPrivacy = baris privasi halaman tes perangkat keras (components/HwPrivacy.astro), lib = teks pustaka dan skrip halaman (kalimat bahasa Inggris → terjemahan), pages = teks halaman
import type { Page3Id, Scope3Path } from "../scope.ts";
import micTest from "./pages/micTest.ts";
import keyboardTest from "./pages/keyboardTest.ts";
import webcamTest from "./pages/webcamTest.ts";
import speakerTest from "./pages/speakerTest.ts";
import mouseTest from "./pages/mouseTest.ts";
import gamepadTest from "./pages/gamepadTest.ts";
import monitorTest from "./pages/monitorTest.ts";
import bsodCodes from "./pages/bsodCodes.ts";
import barcodeTest from "./pages/barcodeTest.ts";
import libHwSignal from "./lib/hwSignal.ts";
import libBsod from "./lib/bsod.ts";
import libBarcode from "./lib/barcode.ts";
import libInputTiming from "./lib/inputTiming.ts";
import libKeyboardLayout from "./lib/keyboardLayout.ts";

export default {
  /** Nama dan ringkasan alat web (name, blurb di webTools.ts) */
  webTools: {
    "tools/mic-test/": { name: "Tes Mikrofon", blurb: "Meter level langsung, sample rate sebenarnya, noise floor dan clipping, peredam gema nyala/mati, rekam 5 detik lalu putar secara lokal." },
    "tools/keyboard-test/": { name: "Tes Keyboard (Chattering & Rollover)", blurb: "Tata letak Korea 106, ANSI, atau ISO: tombol yang ditekan, jumlah rollover, hitungan per tombol, dugaan chattering dalam ms, tombol yang tak terlihat browser." },
    "tools/webcam-test/": { name: "Tes Webcam", blurb: "Pratinjau, resolusi yang diminta vs sebenarnya, fps terukur, pilihan kamera. Video tidak pernah disimpan atau dikirim." },
    "tools/speaker-test/": { name: "Tes Speaker Kiri Kanan", blurb: "Kiri, kanan, dan keduanya, per kanal 5.1/7.1, cek polaritas, sweep frekuensi dan nada, pilihan perangkat output." },
    "tools/mouse-test/": { name: "Tes Double Klik Mouse", blurb: "Lima tombol dan empat arah roda, jeda double klik dalam ms, dugaan chattering, drag putus, perkiraan polling rate." },
    "tools/gamepad-test/": { name: "Tes Gamepad (Stick Drift & Dead Zone)", blurb: "Tombol, trigger, dan sumbu secara langsung, stick drift saat dilepas dengan jejaknya, pratinjau dead zone, getar jika didukung." },
    "tools/monitor-test/": { name: "Tes Dead Pixel & Refresh Rate", blurb: "Warna polos layar penuh untuk dead pixel atau stuck pixel, banding gradasi, perkiraan refresh rate, pola gerak untuk ghosting." },
    "tools/bsod-codes/": { name: "Kamus Kode Stop Layar Biru (BSOD)", blurb: "Tempel kode seperti 0xD1 atau 0x133, nama, atau pesan Event 1001 untuk arti, kemungkinan penyebab, apa yang diperiksa, dan halaman Microsoft." },
    "tools/barcode-scanner-test/": { name: "Tes Pemindai Barcode", blurb: "Teks hasil pindai dengan Enter, Tab, dan GS terlihat, ms antarkarakter, pemulihan teks yang kacau karena IME Korea, Caps Lock, AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** Baris privasi halaman tes perangkat keras — ads dan tester adalah potongan sebelum/sesudah tautan (teks tautan «PortDock Hardware Tester» tetap) */
  hwPrivacy: {
    media: "Privasi: video kamera dan suara mikrofon tetap di dalam browser ini dan tidak pernah disimpan atau diunggah — data kamera dan mikrofon serta nama perangkat tidak dikirim ke mana pun.",
    input: "Privasi: tombol, klik, dan gerakan dihitung di dalam browser ini dan tidak dikirim ke mana pun.",
    output: "Privasi: alat ini hanya menghasilkan gambar atau suara dan tidak mengirim apa pun tentang tes Anda.",
    ads: [" Iklan di halaman ini (Google AdSense) bekerja terpisah — lihat ", "kebijakan privasi", "."],
    tester: ["Untuk mencatat putusnya Wi-Fi atau internet serta sambung-putus Bluetooth dari waktu ke waktu, gunakan program Windows ", " (gratis)."],
  },

  /** Kelompok teks pustaka dan skrip halaman (halaman hanya memuat kelompok yang dipilih libText di Base) */
  lib: {
    hwSignal: libHwSignal,
    bsod: libBsod,
    barcode: libBarcode,
    inputTiming: libInputTiming,
    keyboardLayout: libKeyboardLayout,
  },

  /** Teks halaman */
  pages: { micTest, keyboardTest, webcamTest, speakerTest, mouseTest, gamepadTest, monitorTest, bsodCodes, barcodeTest } satisfies Record<Page3Id, unknown>,
};
