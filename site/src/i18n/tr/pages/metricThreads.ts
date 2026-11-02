// metricThreads — Türkçe, ja/pages/metricThreads.ts ile aynı anahtarlar
export default {
  h1: "Metrik Dişli Kılavuz Matkap ve Cıvata Tablosu",
  desc: "M2–M20 normal ve ince metrik dişler için hatve ve kılavuz matkabı (d − P), alyan (ISO 4762) ve açık ağızlı anahtar (ISO 4032) ölçüleri. Dişe veya takıma göre.",
  seo: "Metrik Kılavuz Matkap Tablosu, Alyan ve Anahtar — PortDock",
  find: "Bir diş arayın",
  thread: "Diş (örn. M8, M10x1.25)",
  bad: "Tabloda yok — M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 veya M20 ile normal ya da ince hatvesini girin.",
  k: { p: "Hatve", kind: "Tür", coarse: "Normal", fine: "İnce", drill: "Kılavuz matkabı ≈ d − P", key: "Alyan anahtar (ISO 4762 silindirik başlı vida)", sp: "Açık ağızlı anahtar (ISO 4032 somun, ISO 4014/4017 cıvata)", din: "DIN 934 (eski standart)" },
  rev: "Takım ölçüsüne göre arayın",
  bySp: "Açık ağızlı anahtar (mm)",
  byKey: "Alyan anahtar (mm)",
  tTitle: "Metrik diş tablosu (M2–M20)",
  tHead: ["Diş", "Normal hatve", "Kılavuz matkabı", "İnce hatve (kılavuz matkabı)", "Alyan", "Anahtar"],
  tNote:
    "Kılavuz matkabı d − P, kesme kılavuzları için bir yaklaşımdır. Uygulamada elinizdeki en yakın matkabı kullanın ve malzemeye ve diş derinliğine göre ayarlayın. Şekillendirme (haddeleme) kılavuzları farklı matkap ölçüsü ister — kılavuz üreticisinin tablosuna bakın. Anahtar ölçüleri ISO 4032'dir; eski DIN 934 somunlar M10 için 17 mm, M12 için 19 mm ve M14 için 22 mm'dir.",
  torqueTitle: "Sıkma torku",
  torque:
    "Cıvata torku mukavemet sınıfına (8.8, A2-70 vb.), yağlamaya ve eşleşen malzemeye bağlıdır; klemensler, şalterler ve kontaktörlerin üreticinin belirttiği kendi torkları vardır (parçanın üzerinde veya veri sayfasında yazar). Bu tabloda tork değeri yoktur — üreticinin değerine bakın ve torklu tornavida kullanın.",
  privacy: "Bu sayfa aramaları tarayıcınızın içinde yapar; girdiğiniz bilgiler bir sunucuya gönderilmez.",
  srcTitle: "Kaynaklar",
  see: ["Saplamaya uyan halka pabuçlar için ", " aracına bakın. İnç ve mm dönüşümü için ", " aracını kullanın."],
  isoNut: "Altıgen normal somunlar (tip 1)",
  dinNut: "eski altıgen somun standardı",
  faqTitle: "Sık sorulanlar",
  faq: [
    ["Kılavuz matkabı neden «d − P»?", "Kesme kılavuzları için olağan yaklaşımdır (anma çapı eksi hatve). Uygulamada elinizdeki en yakın matkabı kullanın ve malzemeye ve diş derinliğine göre ayarlayın. Şekillendirme (haddeleme) kılavuzları farklı bir matkap ister — kılavuz üreticisinin tablosuna bakın."],
    ["Anahtar ölçüm tabloyla uyuşmuyor", "Eski DIN 934 somunlar M10, M12 ve M14 için ISO 4032'den farklı anahtar ölçüleri kullanır. Tablodaki «DIN 934» değerine bakın."],
    ["Neden sıkma torku yok?", "Cıvatanın mukavemet sınıfına, yağlamaya ve eşleşen malzemeye bağlıdır; klemensler, şalterler ve kontaktörlerin üreticiden gelen kendi torkları vardır. Ürün işaretini veya veri sayfasını izleyin."],
  ] as [string, string][],
};
