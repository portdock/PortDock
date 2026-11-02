// Bahasa Indonesia — gelombang 7 (15 alat web untuk mesin, pengawatan, dan dokumen; scope.ts SCOPE7). Mengikuti ja/batch7.ts, sumber terjemahan adalah versi Inggris (site/I18N.md «7차 묶음 붙이는 법»).
// webTools = nama dan pengantar alat, lib = teks untuk pustaka dan skrip layar (kalimat Inggris → terjemahan), pages = teks halaman
import type { Page7Id, Scope7Path } from "../scope.ts";
import airConsumption from "./pages/airConsumption.ts";
import ballScrew from "./pages/ballScrew.ts";
import conveyorSpeed from "./pages/conveyorSpeed.ts";
import cylinder from "./pages/cylinder.ts";
import timingBelt from "./pages/timingBelt.ts";
import vacuumPad from "./pages/vacuumPad.ts";
import cableLabels from "./pages/cableLabels.ts";
import ferrules from "./pages/ferrules.ts";
import insulation from "./pages/insulation.ts";
import metricThreads from "./pages/metricThreads.ts";
import panelHeat from "./pages/panelHeat.ts";
import handover from "./pages/handover.ts";
import ioList from "./pages/ioList.ts";
import systemDiagram from "./pages/systemDiagram.ts";
import commissioning from "./pages/commissioning.ts";
import libAirConsumption from "./lib/airConsumption.ts";
import libBallScrew from "./lib/ballScrew.ts";
import libConveyor from "./lib/conveyor.ts";
import libCylinder from "./lib/cylinder.ts";
import libTimingBelt from "./lib/timingBelt.ts";
import libVacuumPad from "./lib/vacuumPad.ts";
import libCableLabels from "./lib/cableLabels.ts";
import libFerrules from "./lib/ferrules.ts";
import libInsulation from "./lib/insulation.ts";
import libPanelHeat from "./lib/panelHeat.ts";
import libHandover from "./lib/handover.ts";
import libIoList from "./lib/ioList.ts";
import libSysDiagram from "./lib/sysDiagram.ts";
import libSysDiff from "./lib/sysDiff.ts";
import libCommissioning from "./lib/commissioning.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/air-consumption/": { name: "Kalkulator Konsumsi Udara Silinder Pneumatik", blurb: "Diameter, langkah, tekanan dan pipa → udara per siklus (L ANR), per menit, debit udara yang dibutuhkan, dan acuan kompresor." },
    "tools/ball-screw/": { name: "Kalkulator Torsi Ball Screw dan Pemilihan Motor", blurb: "Massa, kecepatan, waktu akselerasi dan lead → beban aksial, kecepatan motor, torsi akselerasi/tetap/deselerasi, inersia beban, torsi RMS. Horizontal atau vertikal." },
    "tools/conveyor-speed/": { name: "Kalkulator Kecepatan Konveyor ↔ Frekuensi VFD", blurb: "Diameter rol, rasio gigi, jumlah kutub dan slip → kecepatan lini dalam m/menit, Hz untuk kecepatan target, kecepatan per Hz." },
    "tools/cylinder-force/": { name: "Kalkulator Gaya Silinder Pneumatik", blurb: "Diameter, batang dan tekanan → gaya memanjang dan menarik (N, kgf); pilih diameter dari tabel SMC untuk suatu gaya dan faktor beban." },
    "tools/timing-belt/": { name: "Kalkulator Panjang Timing Belt dan Jarak Sumbu", blurb: "Pitch, jumlah gigi puli dan jarak sumbu → panjang dan jumlah gigi belt, atau belt → jarak sumbu. Diameter pitch, sudut lilit, gigi berkait, kecepatan." },
    "tools/vacuum-pad/": { name: "Kalkulator Gaya Angkat Bantalan Vakum", blurb: "Diameter bantalan, vakum dan faktor keamanan → gaya angkat (N, kgf), vakum atau ukuran bantalan yang dibutuhkan, volume pipa dan waktu respons." },
    "tools/cable-labels/": { name: "Pembuat Label Kabel dan Terminal", blurb: "Urutan (W001–W120, X1:1–X1:40), nama I/O yang ditempel, label dua ujung «A→B» — cetak di lembar label A4 (baris, kolom, margin dalam mm) atau ekspor CSV dan teks untuk printer label." },
    "tools/ferrules/": { name: "Tabel Ferrule dan Terminal Krimping", blurb: "mm² atau AWG → warna kerah ferrule (DIN 46228-4 dan kode Prancis), warna → ukuran, kelas terminal cincin (1.25, 2, 5.5) dan baut. Hanya nilai yang bersumber." },
    "tools/insulation-resistance/": { name: "Pemeriksa Tahanan Isolasi", blurb: "Rangkaian SELV/PELV, ≤ 500 V atau > 500 V, tegangan uji dan MΩ → dibandingkan dengan minimum IEC 60364-6 (0.5 dan 1 MΩ), plus langkah keselamatan sebelum pengujian." },
    "tools/metric-threads/": { name: "Tabel Mata Bor Tap Ulir Metrik dan Baut", blurb: "M2–M20 pitch kasar dan halus, mata bor tap (d − P), ukuran kunci L (ISO 4762) dan kunci pas (ISO 4032), ukuran perkakas → ulir." },
    "tools/panel-heat/": { name: "Kalkulator Beban Panas Panel dan Ukuran Kipas", blurb: "Total rugi panas perangkat, ukuran panel dan pemasangan (IEC 60890) → pelepasan alami, debit udara kipas dalam m³/jam (dikoreksi ketinggian), daya unit pendingin dan pemanas." },
    "tools/handover-pack/": { name: "Pembuat Dokumen Serah Terima Lapangan", blurb: "JSON diagram, JSON daftar I/O, CSV daftar periksa commissioning, kontak, dan catatan → satu dokumen yang dapat dicetak dengan sampul dan daftar isi. Simpan HTML atau cetak ke PDF, hanya di peramban." },
    "tools/io-list/": { name: "Pembuat Daftar I/O dan Spesifikasi Komunikasi", blurb: "Komunikasi per perangkat (RTU/TCP, unit ID, IP, baud) dengan tag, alamat, fungsi, tipe, urutan word dan skala. Pemeriksaan tumpang tindih dan ID ganda, impor peta perangkat, CSV (Excel), JSON, cetak." },
    "tools/system-diagram/": { name: "Editor Diagram Sistem", blurb: "Tempatkan PC, PLC, HMI, inverter, dan switch pada bus Ethernet atau RS-485. IP ganda, subnet, ID, terminasi, unit load, waktu polling, perbandingan sebelum/sesudah; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Daftar Periksa Commissioning dan Pemeliharaan", blurb: "Instalasi baru, inspeksi rutin, penambahan, penggantian, atau pelepasan × PC, PLC, HMI, inverter, RS-485, switch, catu 24 V — daftar periksa bertahap. Centang dan catatan tersimpan, cetak, CSV." },
  } satisfies Record<Scope7Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    airConsumption: libAirConsumption,
    ballScrew: libBallScrew,
    conveyor: libConveyor,
    cylinder: libCylinder,
    timingBelt: libTimingBelt,
    vacuumPad: libVacuumPad,
    cableLabels: libCableLabels,
    ferrules: libFerrules,
    insulation: libInsulation,
    panelHeat: libPanelHeat,
    handover: libHandover,
    ioList: libIoList,
    sysDiagram: libSysDiagram,
    sysDiff: libSysDiff,
    commissioning: libCommissioning,
  },

  /** 쪽 글 */
  pages: { airConsumption, ballScrew, conveyorSpeed, cylinder, timingBelt, vacuumPad, cableLabels, ferrules, insulation, metricThreads, panelHeat, handover, ioList, systemDiagram, commissioning } satisfies Record<Page7Id, unknown>,
};
