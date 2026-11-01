// Bahasa Indonesia — paket ke-4 (11 alat web komunikasi, scope.ts SCOPE4). Disalin dari kamus acuan ja/batch4.ts, diterjemahkan dari versi bahasa Inggris.
// webTools = nama dan ringkasan alat, lib = teks pustaka dan skrip halaman (kalimat bahasa Inggris → terjemahan), pages = teks halaman
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import pcapAnalyzer from "./pages/pcapAnalyzer.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import logicCapture from "./pages/logicCapture.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libPcap from "./lib/pcap.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";
import libLogic from "./lib/logic.ts";

export default {
  /** Nama dan ringkasan alat web (name, blurb di webTools.ts) */
  webTools: {
    "tools/ascii/": { name: "Tabel ASCII dan karakter kontrol", blurb: "0–127 dalam desimal, hex, biner, dan karakter, plus nama, notasi caret, dan kegunaan STX, ETX, ACK, NAK, CR, LF." },
    "tools/hex-ascii/": { name: "Konverter HEX ↔ ASCII", blurb: "Byte ke teks, teks ke byte. Karakter kontrol ditampilkan sebagai \\r \\n \\xNN." },
    "tools/integer/": { name: "Konverter bilangan bulat dan basis", blurb: "Hex, desimal, biner ↔ 8/16/32 bit, bertanda (komplemen dua), BCD, kode Gray, urutan byte register." },
    "tools/modbus-blocks/": { name: "Perencana request baca Modbus", blurb: "Daftar alamat → request per kode fungsi. Batas 125 register, celah yang diizinkan, register tak terpakai, waktu satu siklus dan jumlah byte RTU." },
    "tools/modbus-practice/": { name: "Latihan soal Modbus (kuis)", blurb: "Soal otomatis untuk pemula — HEX request baca, nilai 40003 di respons, exception 83 02, urutan byte CRC, float ABCD vs CDAB. Dengan pembahasan, tautan panduan, dan skor." },
    "tools/mqtt-decoder/": { name: "Dekoder payload MQTT (Sparkplug B)", blurb: "HEX, Base64, teks → JSON yang dirapikan, metrik Sparkplug B (nama, alias, tipe, nilai), paket MQTT mentah (header, topic, QoS, packet ID)." },
    "tools/pcap-analyzer/": { name: "Penganalisis pcap komunikasi industri", blurb: "Tangkapan Wireshark atau pktmon → pasangan request/respons Modbus TCP dan MC, waktu respons, respons hilang, kode exception dan end code. Hanya di browser Anda." },
    "tools/spi/": { name: "Pembantu mode SPI (gelombang CPOL/CPHA)", blurb: "Mode 0–3 → gelombang SCK, MOSI, MISO, CS dengan edge sampel dan geser, bit dalam byte (MSB/LSB dulu), waktu transfer, penamaan pabrikan (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Penggambar gelombang UART", blurb: "Teks atau HEX → gelombang start, data (mulai LSB), paritas, dan stop pada level TTL atau RS-232, waktu bit dan frame, lebar pulsa → baud rate standar." },
    "tools/web-serial/": { name: "Terminal serial web", blurb: "Buka port COM dari browser. Tampilan HEX/ASCII, tambahkan checksum dan akhir baris, simpan log." },
    "tools/logic-capture/": { name: "Dekoder tangkapan logic analyzer (UART, SPI, I2C, CAN)", blurb: "CSV sigrok/PulseView, CSV Saleae Logic 2, VCD → pilih kanal lalu uraikan UART (deteksi baud rate), SPI mode 0–3, alamat/ACK I2C, CAN (stuffing, CRC). Gelombang, tabel, CSV. Hanya di browser Anda." },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** Kelompok teks pustaka dan skrip halaman (halaman hanya memuat kelompok yang dipilih libText di Base) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    pcap: libPcap,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
    logic: libLogic,
  },

  /** Teks halaman */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, pcapAnalyzer, spi, uartWaveform, webSerial, logicCapture } satisfies Record<Page4Id, unknown>,
};
