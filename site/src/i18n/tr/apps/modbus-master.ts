// PortDock Modbus Master — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Modbus Master — Ücretsiz Modbus RTU/TCP test aracı",
    desc: "Windows için ücretsiz Modbus RTU/TCP master (sorgulama aracı): çoklu sorgu tabloları, F32/U32, bayt sırası, 40001 gösterimi, yazma, Slave ID taraması, CSV.",
  },
  summary: "Bir PLC veya HMI yerine Modbus cihazlarından veri isteyin. Birden çok tabloyu Slave ID, fonksiyon, adres ve aralığa göre sorgulayın; F32/U32/metin değerlerini bayt sıraları ve 40001 gösterimiyle görün; yazmak için hücreye çift tıklayın. Çözülmüş istek/yanıt HEX'i, istatistikler ve CSV değer kaydı dahildir.",
  who: [
    "Yeni bir sürücünün veya ölçerin Modbus haritasını kontrol eden saha mühendisleri",
    "Slave cihaz yazılımını (firmware) test eden geliştiriciler",
  ],
  features: [
    {
      title: "Birden çok sorgu tablosu",
      body: "Her tablonun kendi Slave ID'si, fonksiyonu (01–04), başlangıç adresi, adedi ve aralığı vardır; sekmesinde hata sayısı görünür. Seri RTU, Modbus TCP ve RTU over TCP.",
    },
    {
      title: "Türlü değerler ve bayt sırası",
      body: "U16'dan F64'e ve metin; ABCD/CDAB/BADC/DCBA, HEX/BIN ve 40001 gösterimi. Modbus Slave ile aynı CSV kayıt haritası biçimini paylaşır.",
    },
    {
      title: "Önizlemeli yazma",
      body: "Çift tıklayıp 05/06/0F/10 ile yazın ve gönderilecek baytları önizleyin. «hep FC15/16» seçeneği tek değerleri bile 0F/10 ile gönderir.",
    },
    {
      title: "Cihaz profilleri",
      body: (c: { nDevices: number }) => `${c.nDevices} yerleşik cihazdan (sürücüler, sıcaklık kontrolörleri, güç ölçerler …) birini seçip adlı (birim ve ölçek), türlü, Slave ID'li ve varsayılan seri ayarlı sorgu tabloları ekleyin.`,
    },
    {
      title: "Slave ID ve adres taraması",
      body: "Hangi Slave ID'lerin (1–247) yanıt verdiğini ve hangi adres aralıklarının okunabildiğini bulun, sonra bunları tabloya çevirin.",
    },
    {
      title: "Hat ayarlarını bulma (0.10.0'dan itibaren)",
      body: "Cihazın baud, parity ve ID'si bilinmiyorsa seçilen her baud (1200–115200) × parity/stop biti × ID aralığı için kısa bir okuma gönderir ve yanıt veren birleşimleri listeler. İstisna yanıtı da «orada bir cihaz var» demektir. Süre tahmini, durdurma düğmesi ve «Bu ayarla bağlan» var; ID 0 (broadcast) hiç kullanılmaz. Başka bir master'ın olduğu hatlar için değildir.",
    },
    {
      title: "«Yanıt yok» — olası nedenler (0.10.0'dan itibaren)",
      body: "Son isteklerin sonuçlarını olası nedenlere ve kontrol yollarına ayırır — hiç bayt yok (kablolama, ID, A/B kutbu), yalnızca istek geri yansımış (2 telli adaptör yankısı), CRC hataları (baud, parity, gürültü, sonlandırma), kesik çerçeveler (zaman aşımı, USB gecikmesi), her istisna kodunun anlamı, başka bir ID'nin yanıt vermesi. Rehberlere ve sorun giderme yardımcısına bağlantılar; metin olarak kopyalanabilir.",
    },
    {
      title: "Cihaz ayarlarını yedekleme, karşılaştırma, geri yükleme (0.10.0'dan itibaren)",
      body: "Cihaz değişimi ve bakım için. Birden çok aralığı aynı anda okur (veya cihaz profilinden doldurur) ve JSON ile CSV'ye yazar — 125'i aşan aralıklar bölünür, başarısız aralıklar listelenir — sonra cihazın şu anki hâliyle veya başka bir yedekle karşılaştırıp yalnızca farkları gösterir. Geri yükleme yalnızca seçtiğiniz hücreleri yazar: önizleme (şimdi / yazılacak), yazmak için ikinci tıklama, ardından geri okuma denetimi. Input kayıtları ve profildeki salt okunur kayıtlar engellenir.",
    },
    {
      title: "Zaman aşımı, yeniden deneme, istatistik",
      body: "Zaman aşımını, yeniden denemeyi ve gecikmeyi ayarlayın; tablo başına istekleri, başarılıları, zaman aşımlarını, CRC hatalarını ve istisnaları yanıt süreleriyle sayın. İstisnalar açıklanır.",
    },
    {
      title: "Değer kaydı ve eğilimler",
      body: "Değerleri her sorguda veya değişimde CSV'ye kaydedin, seçili hücreleri küçük eğilim çizgileriyle izleyin.",
    },
    {
      title: "Değer izleme ve alarmlar (0.10.0'dan itibaren)",
      body: "Hücre başına: alt/üst sınırlar, N saniye değişmeme (takılma) ve N saniye iletişim kaybı; geri dönüş payı (histerezis) ile. Alarm veren hücre vurgulanır; alarm listesi (oluştu, bitti, süre, onayla), isteğe bağlı ses, görev çubuğunda yanıp sönme ve alarm CSV kaydı bulunur. Bir izleme yardımcısıdır, güvenlik cihazı değildir.",
    },
  ],
  steps: [
    "Bağlantıyı ve portu (veya IP'yi) cihaza uydurun",
    "«Bağlan» (F4), sonra Slave ID, fonksiyon, başlangıç adresi ve adedi kılavuza göre ayarlayın",
    "Yazmak için hücreye çift tıklayın; ad ve tür için sağ tıklayın",
  ],
  similar: "Benzer araçlar arasında ticari Modbus Poll (Witte Software) ve açık kaynaklı QModMaster var. PortDock Modbus Master ücretsizdir (GPL-3.0), süre sınırı yoktur.",
};
