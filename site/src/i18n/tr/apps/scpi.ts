// PortDock SCPI — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock SCPI — Ücretsiz SCPI terminali (LAN, RS-232, VISA yok)",
    desc: "VISA olmadan LAN soketi (5025) veya RS-232 üzerinden ücretsiz SCPI cihaz terminali: *IDN?, hata kuyruğu, *OPC? beklemeleri, CSV'ye tekrarlı ölçüm.",
  },
  summary: "Güç kaynakları, multimetreler ve osiloskoplar gibi SCPI cihazlarına komut gönderip yanıtları okuyun. VISA kurmadan LAN soketi (TCP 5025) veya RS-232 ile bağlanır, cihazı *IDN? ile tanır, hata kuyruğunu boşaltır ve tekrarlı sayısal okumaları CSV'ye kaydeder.",
  who: [
    "Test otomasyonu yazmadan önce komutları elle deneyen geliştiriciler",
    "VISA'sız bir PC'den bir cihaza hızlıca bakması gereken saha mühendisleri",
  ],
  features: [
    {
      title: "VISA gerekmez",
      body: "LAN soketi (genellikle 5025) ve RS-232 (baud, parity, akış denetimi); LF, CR LF veya CR satır sonları. VXI-11, HiSLIP ve USBTMC henüz desteklenmez.",
    },
    {
      title: "Sorgula, yaz, oku",
      body: "? ile biten komutlar sorgulanır, diğerleri yazılır. Yanıt süreleri, zaman aşımları ve satır sonu olmayan yanıtlar gösterilir. Komut geçmişi, komut listesi ve yaygın komutlar için tamamlama.",
    },
    {
      title: "Kimlik, hata kuyruğu, *OPC?",
      body: "*IDN? üretici, model, seri numarası ve firmware olarak ayrılır; SYST:ERR? 0 gelene kadar sorularak kuyruktaki tüm hatalar listelenir. *RST, *CLS ve *OPC? beklemesi için düğmeler.",
    },
    {
      title: "Tekrarlı ölçüm",
      body: "MEAS:VOLT:DC? gibi bir sorguyu belirli aralıkla belirli sayıda tekrarlayın; değer tablosu, eğilim ve istatistik (en az, en çok, ortalama, standart sapma) gösterilir, CSV olarak kaydedilir.",
    },
    {
      title: "Blok veri",
      body: "IEEE 488.2 blokları (#NXXXX…) uzunluk başlığına göre okunur; bu yüzden ikili veri içindeki LF baytları onları kesmez. HEX önizleme ve dosyaya kaydetme (ör. PNG ekran görüntüleri).",
    },
  ],
  steps: [
    "LAN: cihazın IP'si ve port 5025; seri: cihazdaki gibi port ve baud",
    "«Bağlan» (F4) — *IDN? cihazın adını gösterir",
    "Bir komut yazıp Enter'a basın; hataları «Hata kuyruğunu boşalt» ile kontrol edin",
  ],
  uses: [
    {
      title: "Otomasyon yazmadan önce komutları denemek",
      body: "Komutları elle yazın, yanıtı ve yanıt süresini görün. ? ile biten komutlar sorgudur, diğerleri yazma. Hataları hemen «Hata kuyruğunu boşalt» ile kontrol edin.",
    },
    {
      title: "VISA'sız bir PC'den cihaza ulaşmak",
      body: "LAN soketi (genellikle port 5025) veya RS-232 ile doğrudan bağlanın. *IDN? üretici, model, seri numarası ve firmware olarak ayrılır.",
    },
    {
      title: "Tekrarlı okumaları CSV'ye kaydetmek",
      body: "«Tekrarlı ölçüm»de MEAS:VOLT:DC? gibi bir sorguyu belirli aralıkla belirli sayıda sorun; tabloyu, eğilimi ve istatistiği (en az, en çok, ortalama, standart sapma) görün ve CSV olarak kaydedin.",
    },
    {
      title: "Ekran görüntüsü gibi blok veri almak",
      body: "IEEE 488.2 blokları (#N…) uzunluk başlığına göre okunur; bu yüzden ikili veri içindeki LF baytları onları kesmez. HEX olarak önizleyin ve dosyaya kaydedin (PNG vb.).",
    },
  ],
  faq: [
    {
      q: "«connection refused» alıyorum",
      a: "Port farklıdır (kılavuzdaki «socket port»a bakın — her cihaz 5025 kullanmaz) ya da soket arayüzü kapalıdır. Bazı cihazlar başka bir program (bir VISA oturumu) bağlıyken yeni bağlantıyı reddeder.",
    },
    {
      q: "«no response (timeout)» alıyorum",
      a: "Sorgu olmayan bir komut sorgu olarak gönderilmiştir, komut yanlış yazılmıştır (hata kuyruğuna bakın) veya cihaz ölçümle meşguldür. Yanıt bekleme süresini artırın ya da *OPC? kullanın. «Reply not finished», satır sonunun (LF, CR LF, CR) cihazınkinden farklı olduğu anlamına gelir.",
    },
    {
      q: "-410 Query INTERRUPTED nedir?",
      a: "Yanıt okunmadan sonraki komut gönderildi. Bir sorguyu «Yaz» ile gönderdiyseniz önce «Oku» ile yanıtı alın.",
    },
    {
      q: "USBTMC, GPIB, VXI-11 veya HiSLIP destekleniyor mu?",
      a: "Şimdilik hayır. VXI-11 şu an desteklenmiyor; HiSLIP, USBTMC ve GPIB için VISA veya sürücüler gerekir, kapsam dışıdır. Çoğu LAN cihazı bir soket de (5025) sunar; yalnızca USB'li cihazlar «USB virtual COM» ayarıyla seri üzerinden çalışır.",
    },
    {
      q: "Cihaz olmadan deneyebilir miyim?",
      a: "PortDock Simulator'ı 5025 portunda LF çerçevelemeli bir TCP sunucusu olarak ve [SCPI *IDN? reply] örneğiyle çalıştırın, sonra 127.0.0.1:5025'e bağlanın.",
    },
  ],
  similar: "VISA tabanlı üretici araçları (NI MAX, Keysight Connection Expert …) da komut gönderebilir. PortDock SCPI, VISA'sız PC'lerde LAN soketi veya RS-232 ile bağlanır.",
};
