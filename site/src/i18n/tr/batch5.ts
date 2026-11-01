// Türkçe — 5. grup (sinyal, birim ve ağ web araçları 12 adet; scope.ts SCOPE5). ja/batch5.ts örnek alınarak, kaynak İngilizce sürüm (site/I18N.md «5차 묶음 붙이는 법»).
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
    "tools/adc/": { name: "ADC çözünürlük ve ölçekleme hesaplayıcı", blurb: "Bit sayısı, referans → 1 LSB, kod ↔ gerilim; 4–20 mA (şönt), 0–10 V (bölücü) → mühendislik birimi, bir sayımın değeri." },
    "tools/encoder/": { name: "Enkoder darbe ↔ rpm hesaplayıcı", blurb: "PPR, çarpan → çıkış frekansı ve sayım hızı, sayımdan rpm, tepki frekansından en yüksek rpm, sayım başına açı ve hareket." },
    "tools/loop-load/": { name: "4–20 mA çevrim yükü hesaplayıcı", blurb: "Çevrim beslemesi, transmiter en düşük gerilimi, 250 Ω, kablo direnci → kalan gerilim, en büyük yük direnci, en uzun kablo." },
    "tools/ntc/": { name: "NTC termistör hesaplayıcı", blurb: "B değeri veya Steinhart–Hart ile direnç ↔ sıcaklık, bölücü gerilimi, ADC değeri, sıcaklık tablosu, kendi kendine ısınma." },
    "tools/op-amp-gain/": { name: "Op-amp kazanç hesaplayıcı", blurb: "Evirmeyen, eviren ve fark kazancı ile dB, çıkış gerilimi, açık çevrim kazancı hatası, bant genişliği, hedef kazanç için standart dirençler." },
    "tools/rc-filter/": { name: "RC zaman sabiti ve kesim frekansı hesaplayıcı", blurb: "R, C → τ, %63 ve %99 dolma süresi, birinci dereceden alçak geçirenin kesim frekansı, zayıflama ve faz, fc için R veya C." },
    "tools/temperature/": { name: "Pt100 ve termokupl sıcaklık dönüştürücü", blurb: "Pt100, Pt1000 direnci; K, J, T, E, N, R, S, B termokupl mV ↔ sıcaklık. Soğuk uç kompanzasyonu, sıcaklık tablosu." },
    "tools/voltage-divider/": { name: "Gerilim bölücü hesaplayıcı", blurb: "Giriş, çıkış gerilimi → R1, R2, hataya göre E12, E24, E96 standart çiftleri; yük, akım, güç, çıkış empedansı, tolerans." },
    "tools/gige-bandwidth/": { name: "GigE kamera bant genişliği hesaplayıcı", blurb: "Çözünürlük, piksel formatı, fps, kamera sayısı → MB/s, 1, 2.5, 5, 10 GbE’ye göre %, bağlantıya sığan en yüksek fps." },
    "tools/db/": { name: "dB ve dBm dönüştürücü", blurb: "dBm ↔ mW, W; 50, 75, 600 Ω için dBµV, dBV, dBu ve volt; güç ve gerilim oranı ↔ dB." },
    "tools/pressure/": { name: "Basınç birimi dönüştürücü", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O, mmHg bir kerede. Gösterge ↔ mutlak basınç, sensör aralığı için 4–20 mA tablosu." },
    "tools/units/": { name: "Endüstriyel birim dönüştürücü", blurb: "Debi m³/h, L/min, gpm; tork N·m, kgf·cm, lbf·ft; güç kW, HP, PS, kcal/h; sıcaklık °C, °F, K." },
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
