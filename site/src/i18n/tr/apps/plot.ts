// PortDock Plot — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Plot — Canlı grafik ve CSV için ücretsiz seri çizici",
    desc: "Seri, TCP veya UDP'den gelen sayılar için ücretsiz canlı çizici: Arduino tarzı ad:değer, ikili çerçeveler, 32 kanala kadar, imleçler ve CSV kaydı.",
  },
  summary: "Bir Arduino'nun, sensörün veya cihazın gönderdiği sayıları canlı grafik olarak görün. Virgül/boşluk/sekme/noktalı virgülle ayrılmış metni, Arduino tarzı «ad:değer»i ve ikili çerçeveleri okur; kanal başına renk ve eksen, duraklatma, yakınlaştırma ve iki nokta arası fark sunar, alırken CSV kaydeder.",
  who: [
    "Sensör veya kart değerlerini izleyerek yazılımı (firmware) ayarlayan geliştiriciler",
    "Anormallikleri bulmak için cihaz çıkışını saatlerce kaydeden saha mühendisleri",
  ],
  features: [
    {
      title: "Seri, TCP, UDP",
      body: "COM portları (baud, veri biti, parity, stop biti — varsayılan 8N1 — ve DTR), cihaza bağlanan bir TCP istemcisi ve UDP alımı (multicast dahil). Çıkarıp takınca yeniden bağlanır.",
    },
    {
      title: "Metin, ad:değer, ikili",
      body: "Virgül, boşluk, sekme veya noktalı virgül otomatik algılanır; temp:23.1 hum:40 gibi adlı değerler, başlık satırları ve başlangıç baytı, u8–f64, bayt sırası (endianness) ve sağlama toplamı olan çerçeveler. Başarısız satırlar nedeniyle kırmızı gösterilir.",
    },
    {
      title: "Görüntüleme ve ölçüm",
      body: "Sol/sağ eksenlerde 32 kanala kadar, son N nokta veya saniye, otomatik/sabit Y, duraklatma (alım sürer), imleç okuması, iki işaretçi arasında Δt ve Δdeğer, tekerlekle yakınlaştırma ve sürükleyerek kaydırma.",
    },
    {
      title: "Kanal izleme ve alarmlar (0.10.0'dan itibaren)",
      body: "Kanal başına alt/üst sınır, N saniye takılma ve N saniye veri kaybı ayarlayın: alarm veren satırlar vurgulanır; alarm listesi, isteğe bağlı ses ve alarm CSV kaydı vardır. Bir izleme yardımcısıdır, güvenlik cihazı değildir.",
    },
    {
      title: "Hıza yetişir",
      body: "Ayrıştırma Rust'ta çalışır; çizim kare başına bir kez, piksel başına en az/en çok değerle bir canvas üzerinde yapılır — saniyede binlerce satır, sivri tepeler kaybolmadan.",
    },
    {
      title: "Kaydet ve sakla",
      body: "Alırken her değer CSV'ye (Excel uyumlu), görünen aralık CSV olarak, grafik PNG olarak. Son değer tablosu ile görünen aralıktaki en az, en çok ve ortalama.",
    },
  ],
  steps: [
    "Cihaza satır başına sayı yazdırın (ör. 23.1,40 veya temp:23.1 hum:40)",
    "Kaynağı seçin (seri port ve baud, TCP, UDP) ve «Başlat» (F4)",
    "Ölçmek için grafiğe tıklayın; saklamak için «● CSV kaydet»",
  ],
  similar: "Benzer araçlar arasında Arduino IDE Seri Çizici ve açık kaynaklı SerialPlot var. PortDock Plot ayrıca TCP ve UDP girişi ile ikili çerçeveleri destekler ve alırken CSV kaydeder.",
};
