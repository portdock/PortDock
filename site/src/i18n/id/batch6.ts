// Bahasa Indonesia — batch 6 (15 alat web kelistrikan; scope.ts SCOPE6). Mengikuti ja/batch6.ts, diterjemahkan dari versi bahasa Inggris (site/I18N.md «6차 묶음 붙이는 법»).
// webTools = nama dan ringkasan alat, lib = teks pustaka dan skrip layar (kalimat Inggris → terjemahan), pages = teks halaman
import type { Page6Id, Scope6Path } from "../scope.ts";
import awgMm2 from "./pages/awgMm2.ts";
import conduitFill from "./pages/conduitFill.ts";
import ctRatio from "./pages/ctRatio.ts";
import energyPulse from "./pages/energyPulse.ts";
import heater from "./pages/heater.ts";
import ledResistor from "./pages/ledResistor.ts";
import motorCurrent from "./pages/motorCurrent.ts";
import motorSpeed from "./pages/motorSpeed.ts";
import resistor from "./pages/resistor.ts";
import pfCapacitor from "./pages/pfCapacitor.ts";
import psuSizing from "./pages/psuSizing.ts";
import affinity from "./pages/affinity.ts";
import reactance from "./pages/reactance.ts";
import power from "./pages/power.ts";
import voltageDrop from "./pages/voltageDrop.ts";
import libConduitFill from "./lib/conduitFill.ts";
import libCtRatio from "./lib/ctRatio.ts";
import libEnergyPulse from "./lib/energyPulse.ts";
import libHeater from "./lib/heater.ts";
import libLedResistor from "./lib/ledResistor.ts";
import libMotorCurrent from "./lib/motorCurrent.ts";
import libMotorSpeed from "./lib/motorSpeed.ts";
import libResistor from "./lib/resistor.ts";
import libPfCapacitor from "./lib/pfCapacitor.ts";
import libPsuSizing from "./lib/psuSizing.ts";
import libAffinity from "./lib/affinity.ts";
import libReactance from "./lib/reactance.ts";
import libPower from "./lib/power.ts";
import libVoltageDrop from "./lib/voltageDrop.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/awg-mm2/": { name: "Tabel Konversi AWG ke mm²", blurb: "Diameter dan luas AWG 0000 sampai 40 (rumus ASTM B258), ukuran metrik terdekat (IEC 60228), Ω/km tembaga. Konversi dua arah." },
    "tools/conduit-fill/": { name: "Kalkulator Pengisian Konduit & Saluran Kabel", blurb: "Diameter luar dan jumlah kabel → pengisian %. Dibandingkan konduit NEC 53/31/40 %, saluran tertutup 20 %, saluran panel NFPA 79 50 %; diameter dalam minimum dan jumlah kabel maksimum." },
    "tools/ct-ratio/": { name: "Kalkulator Rasio CT & Beban", blurb: "Arus primer ↔ sekunder menurut rasio CT, kabel pergi-pulang + VA meter → total beban (VA, Ω) terhadap nilai pengenal, faktor koreksi rasio." },
    "tools/energy-pulse/": { name: "Kalkulator Pulsa Meter Energi", blurb: "imp/kWh, selang atau jumlah pulsa → kW dan kWh, pengali CT/VT, laju dan lebar pulsa pada beban penuh." },
    "tools/heater-power/": { name: "Kalkulator Daya Pemanas (kW, Ampere)", blurb: "Massa, kalor jenis, kenaikan suhu, dan waktu → kW pemanas, kW untuk fluida mengalir, arus satu/tiga fase, dan keluaran pada tegangan lain." },
    "tools/led-resistor/": { name: "Kalkulator Resistor LED", blurb: "Sumber, Vf, arus, dan jumlah LED seri → resistor dan daya, arus dengan nilai E12/E24. Indikator 5, 12, 24 V." },
    "tools/motor-current/": { name: "Kalkulator Arus Motor", blurb: "kW (HP) tiga fase, satu fase, atau DC → ampere, daya masukan, kVA, torsi. Efisiensi dari pelat nama." },
    "tools/motor-speed/": { name: "Frekuensi Inverter ↔ Putaran Motor", blurb: "Hz dan kutub → kecepatan sinkron, slip dari pelat nama, keluaran gearbox, Hz untuk rpm target." },
    "tools/parallel-resistor/": { name: "Kalkulator Resistor Paralel & Seri", blurb: "Total seri dan paralel, pembagian arus, resistor pasangan untuk nilai target, dan pasangan E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Kalkulator Kapasitor Perbaikan Faktor Daya", blurb: "kW, faktor daya sekarang dan target → kvar yang dibutuhkan, µF per kapasitor pada delta atau bintang, arus sebelum dan sesudah." },
    "tools/power-supply-sizing/": { name: "Kalkulator Kapasitas Catu Daya 24 V DC", blurb: "Arus, arus masuk, dan duty PLC, HMI, sensor, katup, kumparan rele → total, peringkat dengan cadangan (ukuran umum), pemeriksaan arus masuk, kanal pelindung." },
    "tools/pump-fan-affinity/": { name: "Kalkulator Kecepatan dan Daya Pompa & Kipas", blurb: "Frekuensi inverter → debit, tekanan, daya (hukum afinitas), selisih energi tahunan, frekuensi untuk debit target." },
    "tools/reactance/": { name: "Kalkulator Reaktansi & Resonansi LC", blurb: "Xc dan XL pada suatu frekuensi, C atau L untuk X target, frekuensi resonansi dan impedansi LC, arus dan kvar kapasitor." },
    "tools/three-phase-power/": { name: "Kalkulator Daya Tiga Fase", blurb: "Tegangan dengan ampere, kW atau kVA dan faktor daya → kVA, kW, kvar, dan ampere; faktor daya dari kW dan kVA." },
    "tools/voltage-drop/": { name: "Kalkulator Jatuh Tegangan & Ukuran Kabel", blurb: "DC, satu dan tiga fase, mm² atau AWG, tembaga atau aluminium → jatuh tegangan dan %, ukuran dan panjang untuk jatuh tegangan yang diizinkan." },
  } satisfies Record<Scope6Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다 — conduitFill 은 서버에서만 그린다) */
  lib: {
    conduitFill: libConduitFill,
    ctRatio: libCtRatio,
    energyPulse: libEnergyPulse,
    heater: libHeater,
    ledResistor: libLedResistor,
    motorCurrent: libMotorCurrent,
    motorSpeed: libMotorSpeed,
    resistor: libResistor,
    pfCapacitor: libPfCapacitor,
    psuSizing: libPsuSizing,
    affinity: libAffinity,
    reactance: libReactance,
    power: libPower,
    voltageDrop: libVoltageDrop,
  },

  /** 쪽 글 */
  pages: { awgMm2, conduitFill, ctRatio, energyPulse, heater, ledResistor, motorCurrent, motorSpeed, resistor, pfCapacitor, psuSizing, affinity, reactance, power, voltageDrop } satisfies Record<Page6Id, unknown>,
};
