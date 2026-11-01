// Bahasa Indonesia — paket ke-5 (12 alat web sinyal, satuan, dan jaringan, scope.ts SCOPE5). Disalin dari kamus acuan ja/batch5.ts, diterjemahkan dari versi bahasa Inggris.
// webTools = nama dan ringkasan alat, lib = teks pustaka dan skrip halaman (kalimat bahasa Inggris → terjemahan), pages = teks halaman
import type { Page5Id, Scope5Path } from "../scope.ts";
import adc from "./pages/adc.ts";
import encoder from "./pages/encoder.ts";
import loopLoad from "./pages/loopLoad.ts";
import ntc from "./pages/ntc.ts";
import opAmp from "./pages/opAmp.ts";
import rcFilter from "./pages/rcFilter.ts";
import temperature from "./pages/temperature.ts";
import voltageDivider from "./pages/voltageDivider.ts";
import gigeBandwidth from "./pages/gigeBandwidth.ts";
import decibel from "./pages/decibel.ts";
import pressure from "./pages/pressure.ts";
import units from "./pages/units.ts";
import libAdc from "./lib/adc.ts";
import libEncoder from "./lib/encoder.ts";
import libLoopLoad from "./lib/loopLoad.ts";
import libNtc from "./lib/ntc.ts";
import libOpAmp from "./lib/opAmp.ts";
import libRcFilter from "./lib/rcFilter.ts";
import libTemperature from "./lib/temperature.ts";
import libVoltageDivider from "./lib/voltageDivider.ts";
import libGige from "./lib/gige.ts";
import libDecibel from "./lib/decibel.ts";
import libPressure from "./lib/pressure.ts";
import libUnits from "./lib/units.ts";

export default {
  /** Nama dan ringkasan alat web (name, blurb di webTools.ts) */
  webTools: {
    "tools/adc/": { name: "Kalkulator resolusi dan skala ADC", blurb: "Jumlah bit dan tegangan referensi → 1 LSB, kode ↔ tegangan, 4–20 mA (shunt) dan 0–10 V (pembagi) → nilai teknik, nilai satu hitungan." },
    "tools/encoder/": { name: "Kalkulator pulsa encoder ↔ rpm", blurb: "PPR dan dekode → frekuensi output dan laju hitungan, rpm dari hitungan, rpm maks dari frekuensi respons, sudut dan jarak per hitungan." },
    "tools/loop-load/": { name: "Kalkulator beban loop 4–20 mA", blurb: "Catu loop, tegangan minimum transmitter, 250 Ω, dan resistansi kabel → sisa tegangan, resistansi beban maksimum, panjang kabel maksimum." },
    "tools/ntc/": { name: "Kalkulator termistor NTC", blurb: "Resistansi ↔ suhu dengan nilai B atau Steinhart–Hart, tegangan pembagi dan nilai ADC, tabel suhu, pemanasan sendiri." },
    "tools/op-amp-gain/": { name: "Kalkulator penguatan op amp", blurb: "Penguatan dan dB rangkaian tak membalik, membalik, dan diferensial, tegangan output, galat penguatan open-loop, bandwidth, resistor standar untuk penguatan target." },
    "tools/rc-filter/": { name: "Kalkulator konstanta waktu RC dan frekuensi cut-off", blurb: "R dan C → τ, waktu pengisian hingga 63 % dan 99 %, cut-off filter low-pass orde 1, redaman dan fase, R atau C untuk fc." },
    "tools/temperature/": { name: "Konversi suhu Pt100 dan termokopel", blurb: "Resistansi Pt100 dan Pt1000, mV termokopel K, J, T, E, N, R, S, B ↔ suhu. Kompensasi sambungan dingin dan tabel suhu." },
    "tools/voltage-divider/": { name: "Kalkulator pembagi tegangan", blurb: "Tegangan input dan output → R1 dan R2, pasangan nilai standar E12, E24, E96 (urut galat), beban, arus, daya, impedansi output, toleransi." },
    "tools/gige-bandwidth/": { name: "Kalkulator bandwidth kamera GigE", blurb: "Resolusi, format piksel, fps, dan jumlah kamera → MB/s, persen dari 1, 2.5, 5, 10 GbE, fps maksimum dalam link." },
    "tools/db/": { name: "Konverter dB dan dBm", blurb: "dBm ↔ mW dan W, dBµV, dBV, dBu, dan tegangan untuk 50, 75, 600 Ω, rasio daya dan tegangan ↔ dB." },
    "tools/pressure/": { name: "Konverter satuan tekanan", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O, mmHg sekaligus. Tekanan gauge ↔ absolut, tabel 4–20 mA untuk rentang sensor." },
    "tools/units/": { name: "Konverter satuan industri", blurb: "Debit m³/h, L/min, gpm; torsi N·m, kgf·cm, lbf·ft; daya kW, HP, PS, kcal/h; suhu °C, °F, K." },
  } satisfies Record<Scope5Path, { name: string; blurb: string }>,

  /** Kelompok teks pustaka dan skrip halaman (halaman hanya memuat kelompok yang dipilih libText di Base) */
  lib: {
    adc: libAdc,
    encoder: libEncoder,
    loopLoad: libLoopLoad,
    ntc: libNtc,
    opAmp: libOpAmp,
    rcFilter: libRcFilter,
    temperature: libTemperature,
    voltageDivider: libVoltageDivider,
    gige: libGige,
    decibel: libDecibel,
    pressure: libPressure,
    units: libUnits,
  },

  /** Teks halaman */
  pages: { adc, encoder, loopLoad, ntc, opAmp, rcFilter, temperature, voltageDivider, gigeBandwidth, decibel, pressure, units } satisfies Record<Page5Id, unknown>,
};
