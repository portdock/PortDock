// Polski — 5. pakiet (12 narzędzi webowych: sygnały, jednostki, sieć; scope.ts SCOPE5). Układ jak w pakiecie wzorcowym ja/batch5.ts (site/I18N.md «5차 묶음 붙이는 법»), źródłem jest wersja angielska.
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
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
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/adc/": { name: "Kalkulator rozdzielczości i skalowania ADC", blurb: "Liczba bitów i napięcie odniesienia → 1 LSB, kod ↔ napięcie; 4–20 mA (bocznik) i 0–10 V (dzielnik) → wartość fizyczna, wartość na jeden krok." },
    "tools/encoder/": { name: "Kalkulator enkodera: impulsy ↔ obr/min", blurb: "Impulsy na obrót i krotność zliczania → częstotliwość wyjściowa, szybkość zliczania, obroty z policzonych impulsów, maks. obroty z częstotliwości granicznej, kąt i droga na impuls." },
    "tools/loop-load/": { name: "Kalkulator obciążenia pętli 4–20 mA", blurb: "Zasilanie pętli, minimalne napięcie przetwornika, 250 Ω i rezystancja przewodów → pozostałe napięcie, maksymalna rezystancja obciążenia, maksymalna długość kabla." },
    "tools/ntc/": { name: "Kalkulator termistora NTC", blurb: "Rezystancja ↔ temperatura ze stałej B lub Steinharta–Harta, napięcie dzielnika i wartość ADC, tabela temperatur, samonagrzewanie." },
    "tools/op-amp-gain/": { name: "Kalkulator wzmocnienia wzmacniacza operacyjnego", blurb: "Nieodwracający, odwracający, różnicowy: wzmocnienie i dB, napięcie wyjściowe, błąd od wzmocnienia w otwartej pętli, pasmo, rezystory znormalizowane dla zadanego wzmocnienia." },
    "tools/rc-filter/": { name: "Kalkulator stałej czasowej RC i częstotliwości granicznej", blurb: "R i C → τ, czas ładowania do 63 % i 99 %, częstotliwość graniczna, tłumienie i faza filtru dolnoprzepustowego I rzędu, R lub C dla zadanej fc." },
    "tools/temperature/": { name: "Przelicznik Pt100 i termopar", blurb: "Rezystancja Pt100 i Pt1000, mV ↔ temperatura dla termopar typu K, J, T, E, N, R, S, B. Kompensacja spoiny odniesienia i tabela temperatur." },
    "tools/voltage-divider/": { name: "Kalkulator dzielnika napięcia", blurb: "Napięcie wejściowe i wyjściowe → R1 i R2, pary z szeregów E12, E24, E96 według błędu; obciążenie, prąd, moc, impedancja wyjściowa, tolerancja." },
    "tools/gige-bandwidth/": { name: "Kalkulator przepustowości kamer GigE", blurb: "Rozdzielczość, format pikseli, fps i liczba kamer → MB/s, udział w łączu 1, 2.5, 5 i 10 GbE, największa liczba klatek mieszcząca się w łączu." },
    "tools/db/": { name: "Przelicznik dB i dBm", blurb: "dBm ↔ mW i W; dBµV, dBV, dBu i napięcie przy 50, 75 i 600 Ω; stosunek mocy i napięć ↔ dB." },
    "tools/pressure/": { name: "Przelicznik jednostek ciśnienia", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O i mmHg naraz. Nadciśnienie ↔ ciśnienie absolutne, zakres czujnika z tabelą 4–20 mA." },
    "tools/units/": { name: "Przelicznik jednostek przemysłowych", blurb: "Przepływ m³/h, L/min, gpm; moment obrotowy N·m, kgf·cm, lbf·ft; moc kW, hp, KM (PS), kcal/h; temperatura °C, °F, K." },
  } satisfies Record<Scope5Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
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

  /** 쪽 글 */
  pages: { adc, encoder, loopLoad, ntc, opAmp, rcFilter, temperature, voltageDivider, gigeBandwidth, decibel, pressure, units } satisfies Record<Page5Id, unknown>,
};
