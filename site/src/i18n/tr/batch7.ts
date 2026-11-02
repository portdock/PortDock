// Türkçe — 7. grup (makine, kablolama işi ve belge web araçları, 15 adet; scope.ts SCOPE7). ja/batch7.ts örnek alınarak yapıldı, çeviri kaynağı İngilizce sürümdür (site/I18N.md «7차 묶음 붙이는 법»).
// webTools = araç adı ve tek satırlık tanıtım, lib = kütüphane ve ekran betiği metinleri (İngilizce cümle → çeviri), pages = sayfa metinleri
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
    "tools/air-consumption/": { name: "Pnömatik Silindir Hava Tüketimi Hesaplayıcı", blurb: "Çap, strok, basınç ve borulama → çevrim başına hava (L ANR), dakikadaki hava, gereken hava debisi ve kompresör kılavuzu." },
    "tools/ball-screw/": { name: "Bilyalı Vida Torku ve Motor Seçimi Hesaplayıcı", blurb: "Kütle, hız, hızlanma süresi ve hatve → eksenel yük, motor hızı, hızlanma/sabit/yavaşlama torku, yük eylemsizliği, RMS tork. Yatay veya dikey." },
    "tools/conveyor-speed/": { name: "Konveyör Hızı ↔ Sürücü Frekansı Hesaplayıcı", blurb: "Tambur çapı, dişli oranı, kutup sayısı ve kayma → m/dk cinsinden hat hızı, hedef hız için Hz, Hz başına hız." },
    "tools/cylinder-force/": { name: "Pnömatik Silindir Kuvveti Hesaplayıcı", blurb: "Çap, piston kolu ve basınç → ileri ve geri kuvvet (N, kgf); kuvvet ve yük katsayısı için SMC tablosundan çap seçimi." },
    "tools/timing-belt/": { name: "Triger Kayışı Uzunluğu ve Eksen Mesafesi Hesaplayıcı", blurb: "Adım, kasnak diş sayısı ve eksen mesafesi → kayış uzunluğu ve diş sayısı veya kayıştan eksen mesafesi. Hatve çapı, sarım açısı, kavrayan diş, hız." },
    "tools/vacuum-pad/": { name: "Vakum Pedi Kaldırma Kuvveti Hesaplayıcı", blurb: "Ped çapı, vakum ve emniyet katsayısı → kaldırma kuvveti (N, kgf), gereken vakum veya ped boyutu, boru hacmi ve tepki süresi." },
    "tools/cable-labels/": { name: "Kablo ve Klemens Etiketi Oluşturucu", blurb: "Diziler (W001–W120, X1:1–X1:40), yapıştırılan G/Ç adları, iki uçlu «A→B» etiketleri — A4 etiket sayfalarına (satır, sütun, mm kenar boşlukları) yazdırın veya etiket yazıcıları için CSV ve metin aktarın." },
    "tools/ferrules/": { name: "Yüksük (Ferrül) ve Sıkıştırmalı Kablo Pabucu Tablosu", blurb: "mm² veya AWG → yüksük yaka rengi (DIN 46228-4 ve Fransız kodu), renk → boyut, halka pabuç sınıfı (1.25, 2, 5.5) ve saplama. Yalnızca kaynaklı değerler." },
    "tools/insulation-resistance/": { name: "Yalıtım Direnci Kontrol Aracı", blurb: "SELV/PELV, ≤ 500 V veya > 500 V devre, test gerilimi ve MΩ → IEC 60364-6 asgari değerleriyle (0.5 ve 1 MΩ) karşılaştırma, ayrıca testten önce güvenlik adımları." },
    "tools/metric-threads/": { name: "Metrik Dişli Kılavuz Matkap ve Cıvata Tablosu", blurb: "M2–M20 normal ve ince hatve, kılavuz matkabı (d − P), alyan anahtar (ISO 4762) ve açık ağızlı anahtar (ISO 4032) ölçüleri, takım ölçüsü → diş." },
    "tools/panel-heat/": { name: "Pano Isı Yükü ve Fan Seçimi Hesaplayıcı", blurb: "Toplam cihaz ısı kaybı, pano boyutu ve montaj (IEC 60890) → doğal ısı atımı, m³/h fan debisi (irtifa düzeltmeli), soğutucu ve ısıtıcı gücü." },
    "tools/handover-pack/": { name: "Saha Teslim Dosyası Oluşturucu", blurb: "Şema JSON, G/Ç listesi JSON, devreye alma kontrol listesi CSV, kişiler ve notlar → kapaklı ve içindekiler tablolu yazdırılabilir tek belge. HTML kaydedin veya PDF'ye yazdırın, yalnızca tarayıcıda." },
    "tools/io-list/": { name: "G/Ç Listesi ve Haberleşme Şartnamesi Oluşturucu", blurb: "Tag, adres, fonksiyon, tip, kelime sırası ve ölçekle cihaz başına haberleşme (RTU/TCP, unit ID, IP, baud). Çakışma ve yinelenen ID kontrolleri, cihaz haritası içe aktarma, CSV (Excel), JSON, yazdırma." },
    "tools/system-diagram/": { name: "Sistem Şeması Düzenleyici", blurb: "PC, PLC, HMI, sürücü ve switch'leri Ethernet veya RS-485 hatlarına yerleştirin. Yinelenen IP, alt ağ, ID, sonlandırma, unit load, polling süresi, öncesi/sonrası karşılaştırma; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Devreye Alma ve Bakım Kontrol Listesi", blurb: "Yeni kurulum, periyodik kontrol, genişletme, değiştirme veya sökme × PC, PLC, HMI, sürücü, RS-485, switch, 24 V besleme — aşamalı kontrol listesi. İşaretler ve notlar kaydedilir, yazdırma, CSV." },
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
