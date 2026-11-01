// Bahasa Indonesia — paket ke-2 (10 alat web, scope.ts SCOPE2). Disalin dari kamus acuan ja/batch2.ts, diterjemahkan dari versi bahasa Inggris.
// webTools = nama dan ringkasan alat, lib = teks pustaka perhitungan dan skrip halaman (kalimat bahasa Inggris → terjemahan), pages = teks halaman
import type { Page2Id, Scope2Path } from "../scope.ts";
import wiring from "./pages/wiring.ts";
import troubleshoot from "./pages/troubleshoot.ts";
import multimeterCheck from "./pages/multimeterCheck.ts";
import canDecoder from "./pages/canDecoder.ts";
import canTiming from "./pages/canTiming.ts";
import i2c from "./pages/i2c.ts";
import uartBaud from "./pages/uartBaud.ts";
import modbusRtuTcp from "./pages/modbusRtuTcp.ts";
import xgtDecoder from "./pages/xgtDecoder.ts";
import cableSelection from "./pages/cableSelection.ts";
import libWiring from "./lib/wiring.ts";
import libTroubleshoot from "./lib/troubleshoot.ts";
import libMeterCheck from "./lib/meterCheck.ts";
import libMeterUi from "./lib/meterUi.ts";
import libCanFrame from "./lib/canFrame.ts";
import libCanTiming from "./lib/canTiming.ts";
import libI2c from "./lib/i2c.ts";
import libUartBaud from "./lib/uartBaud.ts";
import libModbusConvert from "./lib/modbusConvert.ts";
import libXgt from "./lib/xgt.ts";
import libXgtManuals from "./lib/xgtManuals.ts";
import libCableSelect from "./lib/cableSelect.ts";

export default {
  /** Nama dan ringkasan alat web (name, blurb di webTools.ts) */
  webTools: {
    "tools/wiring/": { name: "Pembuat diagram pengawatan", blurb: "RS-485 2/4 kawat, null modem RS-232, 4-20 mA 2/3/4 kawat, sensor NPN/PNP, output relai — digambar sesuai perangkat dan alamatnya, dengan daftar periksa, SVG/PNG." },
    "tools/troubleshoot/": { name: "Panduan pencarian penyebab gangguan", blurb: "RS-485, RS-232, Modbus TCP, USB-serial, 4–20 mA, sensor NPN/PNP, protokol MC, USB terputus — persempit dengan ya/tidak ke kemungkinan penyebab, cek multimeter, dan panduan. Salin sebagai teks." },
    "tools/multimeter-check/": { name: "Pemeriksa hasil ukur multimeter", blurb: "Resistansi A–B RS-485, tegangan diam dan common mode, 4–20 mA (NE 43), jatuh tegangan 24 V, output NPN/PNP, TX RS-232, beda ground — masukkan hasil ukur, dapatkan penilaian." },
    "tools/can-decoder/": { name: "Dekoder frame CAN (J1939, CANopen)", blurb: "Baris candump, ID DLC data, atau bit mentah → ID standar/extended, DLC (panjang FD), pembuangan stuff bit dan CRC15, PGN, alamat, dan SPN J1939, COB-ID, NMT, dan SDO CANopen." },
    "tools/can-bit-timing/": { name: "Kalkulator bit timing CAN", blurb: "Clock CAN, bit rate, dan sample point → prescaler, TQ, PROP, PHASE_SEG1/2, dan SJW, dengan toleransi osilator." },
    "tools/i2c/": { name: "Alat I2C (pull-up, alamat, dekoder)", blurb: "VDD, kapasitansi bus, dan 100k/400k/1M → Rp pull-up min dan maks (UM10204), tabel alamat 7 bit chip umum dengan konversi 8 bit, dekoder «S A0 A … P»." },
    "tools/uart-baud/": { name: "Kalkulator galat baud rate UART", blurb: "Clock MCU dan oversampling → pembagi (UBRR), baud sebenarnya dan galat %, toleransi penerima, tabel baud rate standar." },
    "tools/modbus-rtu-tcp/": { name: "Konverter frame Modbus RTU ↔ TCP", blurb: "RTU (alamat + CRC) ↔ TCP (MBAP: transaction, length, unit ID) ↔ ASCII (titik dua, LRC, CR LF). Request dan respons, byte berwarna, penjelasan unit ID 0 dan 255 di gateway." },
    "tools/xgt-decoder/": { name: "Dekoder frame protokol khusus LS XGT (FEnet)", blurb: "Frame berheader «LSIS-XGT» → kolom header, BCC, perintah, variabel (%MW, %MX, %DB), nilai, dan kode error. Pasangkan respons dengan request-nya; buat request. Berpasangan dengan mode XGT PLC Simulator (mulai 0.10.0)." },
    "tools/cable-selection/": { name: "Panduan pemilihan kabel", blurb: "Daya AC dan 24 V DC, RS-485, RS-232, 4–20 mA, termokopel dan RTD, Ethernet, servo, cable chain — jenis kabel dan syarat per penggunaan; ukuran dari jatuh tegangan, cek panjang untuk komunikasi." },
  } satisfies Record<Scope2Path, { name: string; blurb: string }>,

  /** Kelompok teks pustaka dan skrip halaman (halaman hanya memuat kelompok yang dipilih libText di Base) */
  lib: {
    // Dimuat di JSON halaman (dipakai skrip halaman) — libText di Base
    wiring: libWiring,
    troubleshoot: libTroubleshoot,
    meterCheck: libMeterCheck,
    canFrame: libCanFrame,
    canTiming: libCanTiming,
    i2c: libI2c,
    uartBaud: libUartBaud,
    modbusConvert: libModbusConvert,
    xgt: libXgt,
    cableSelect: libCableSelect,
    // Hanya digambar di server (tidak dimuat di JSON halaman)
    meterUi: libMeterUi,
    xgtManuals: libXgtManuals,
  },


  /** Teks halaman */
  pages: { wiring, troubleshoot, multimeterCheck, canDecoder, canTiming, i2c, uartBaud, modbusRtuTcp, xgtDecoder, cableSelection } satisfies Record<Page2Id, unknown>,
};
