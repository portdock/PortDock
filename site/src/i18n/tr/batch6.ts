// Türkçe — 6. grup (15 elektrik web aracı; scope.ts SCOPE6). ja/batch6.ts örnek alınarak İngilizce kaynaktan çevrildi (site/I18N.md «6차 묶음 붙이는 법»).
// webTools = araç adı ve tek satır tanıtım, lib = kütüphane ve ekran betiği metinleri (İngilizce cümle → çeviri), pages = sayfa metinleri
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
    "tools/awg-mm2/": { name: "AWG – mm² Dönüşüm Tablosu", blurb: "AWG 0000–40 çap ve kesit (ASTM B258 formülü), en yakın metrik boyut (IEC 60228), bakır Ω/km. İki yönde dönüştürür." },
    "tools/conduit-fill/": { name: "Boru ve Kablo Kanalı Doluluk Hesaplayıcı", blurb: "İletken dış çapı ve adedi → doluluk %. NEC boru %53/31/40, kapalı kanal %20, pano kanalı NFPA 79 %50 ile karşılaştırma; en küçük iç çap ve en çok iletken." },
    "tools/ct-ratio/": { name: "CT Oranı ve Yük Hesaplayıcı", blurb: "CT oranıyla primer ↔ sekonder akım, gidiş-dönüş kablo + sayaç VA → toplam yük (VA, Ω) ve anma karşılaştırması, oran düzeltme katsayısı." },
    "tools/energy-pulse/": { name: "Enerji Sayacı Darbe Hesaplayıcı", blurb: "imp/kWh, darbe aralığı veya adedi → kW ve kWh, CT/VT çarpanı, tam yükte darbe hızı ve genişliği." },
    "tools/heater-power/": { name: "Isıtıcı Gücü Hesaplayıcı (kW, Amper)", blurb: "Kütle, özgül ısı, sıcaklık artışı ve süre → ısıtıcı kW, akan akışkan için kW, tek/üç faz akım ve diğer gerilimlerde çıkış." },
    "tools/led-resistor/": { name: "LED Direnci Hesaplayıcı", blurb: "Besleme, Vf, akım ve seri LED sayısı → direnç ve güç, E12/E24 değeriyle akım. 5, 12, 24 V göstergeler." },
    "tools/motor-current/": { name: "Motor Akımı Hesaplayıcı", blurb: "Üç faz, tek faz veya DC kW (HP) → amper, giriş gücü, kVA, tork. Etiketten verim." },
    "tools/motor-speed/": { name: "Sürücü Frekansı ↔ Motor Devri", blurb: "Hz ve kutup → senkron hız, etiketten kayma, redüktör çıkışı, hedef devir için Hz." },
    "tools/parallel-resistor/": { name: "Paralel ve Seri Direnç Hesaplayıcı", blurb: "Seri ve paralel toplamlar, akım paylaşımı, hedef değer için tamamlayıcı direnç ve E12/E24/E96 çiftleri." },
    "tools/pf-capacitor/": { name: "Güç Faktörü Düzeltme Kondansatörü Hesaplayıcı", blurb: "kW, mevcut ve hedef güç faktörü → gereken kvar, üçgen veya yıldızda kondansatör başına µF, öncesi ve sonrası akım." },
    "tools/power-supply-sizing/": { name: "24 V DC Güç Kaynağı Boyutlandırma Hesaplayıcı", blurb: "PLC, HMI, sensör, valf ve röle bobini akımı, kalkış akımı ve kullanımı → toplam, paylı anma (yaygın boyutlar), kalkış kontrolü ve devre koruyucu kanalları." },
    "tools/pump-fan-affinity/": { name: "Pompa ve Fan Hız–Güç Hesaplayıcı", blurb: "Sürücü frekansı → debi, basınç ve güç (benzerlik yasaları), yıllık enerji farkı, hedef debi için frekans." },
    "tools/reactance/": { name: "Reaktans ve LC Rezonans Hesaplayıcı", blurb: "Bir frekansta Xc ve XL, hedef X için C veya L, LC rezonans frekansı ve empedansı, kondansatör akımı ve kvar." },
    "tools/three-phase-power/": { name: "Üç Faz Güç Hesaplayıcı", blurb: "Gerilim ile amper, kW veya kVA ve güç faktörü → kVA, kW, kvar ve amper; kW ve kVA'dan güç faktörü." },
    "tools/voltage-drop/": { name: "Gerilim Düşümü ve Kablo Kesiti Hesaplayıcı", blurb: "DC, tek ve üç faz, mm² veya AWG, bakır veya alüminyum → düşüm ve %, izin verilen düşüm için kesit ve uzunluk." },
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
