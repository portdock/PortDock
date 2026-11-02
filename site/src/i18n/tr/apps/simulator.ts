// PortDock Simulator — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Simulator — Seri, TCP, UDP için ücretsiz cihaz simülatörü",
    desc: "Kural tabanlı ücretsiz cihaz simülatörü: seri, TCP, UDP üzerinden «bu gelirse şunu yanıtla». Donanımsız ana yazılım geliştirin; gecikme ve kayıp deneyin.",
  },
  summary: "«Bu gelirse → şunu yanıtla» kurallarıyla herhangi bir cihazı taklit edin. Donanım olmadan ana yazılım geliştirin; gecikmeler, düşürülen yanıtlar (her N. veya rastgele) ve dönüşümlü yanıtlarla hata işlemeyi test edin.",
  who: [
    "Henüz donanımı olmayan ana yazılım geliştiricileri",
    "Otomatik test düzenekleri kuran ekipler",
  ],
  features: [
    {
      title: "Joker karakterli kurallar",
      body: "HEX'te ?? (herhangi bir bayt) ve ** (sıfır veya daha çok bayt). ASCII varsayılan olarak harfi harfine eşleşir; ? ve * için kuralın «Joker karakterler» seçeneğini açın. Tam veya içerir eşleşme.",
    },
    {
      title: "Biçimlendirilmiş yanıtlar",
      body: "Otomatik sağlama toplamı ve satır sonu, yanıt gecikmesi ve kural başına eşleşme sayısı.",
    },
    {
      title: "Cihazın kendi başlattığı mesajlar",
      body: "Belirli aralıklarla heartbeat veya durum raporu gönderir.",
    },
    {
      title: "Dört iletim türü",
      body: "Seri, TCP sunucusu, TCP istemcisi, UDP. Kuralları, bağlantı ve çerçeveleme ayarlarıyla birlikte tek bir JSON dosyası olarak kaydedin ve yükleyin.",
    },
    {
      title: "İlk açılışta adres 127.0.0.1 (0.10.0'dan itibaren)",
      body: "TCP sunucusu ve UDP için «Adres» 127.0.0.1 (yalnızca bu PC) ile başlar. Başka bir PC'deki ana yazılım için 0.0.0.0 (tüm bağdaştırıcılar) veya bir bağdaştırıcının adresini seçin. Önceki sürümlerde kaydedilen ayarlar korunur.",
    },
  ],
  steps: [
    "Bir iletim türü seçin; port veya adres girin",
    "«+ Kural ekle» — Koşul / Yanıt",
    "«Başlat» — ana yazılımınızdan bir istek gönderin",
  ],
  uses: [
    {
      title: "Donanım gelmeden ana yazılımı geliştirmek",
      body: "Cihaz kılavuzundaki istek/yanıt çiftlerini «bu gelirse → yanıtla» kurallarına çevirin; gerçek cihaz olmadan HMI veya test programınızı bağlayın.",
    },
    {
      title: "Zaman aşımı ve hata işlemeyi test etmek",
      body: "Yanıt gecikmeleri (titreşimli), her N. seferde veya rastgele yanıtsızlık ve dönüşümlü yanıtlar, ana yazılımınızın geç veya eksik cevaplarla nasıl başa çıktığını gösterir.",
    },
    {
      title: "Cihaz olmadan SCPI denemek",
      body: "[SCPI *IDN? reply] örneğiyle 5025 portunda bir TCP sunucusu çalıştırın ve PortDock SCPI'ı 127.0.0.1'e bağlayın. «+1.2{rand 0..9}E+00» gibi yanıtlar her istekte değişir.",
    },
    {
      title: "Heartbeat ve durum raporlarını taklit etmek",
      body: "«Cihazın kendi gönderdiği mesaj» istek olmadan belirli aralıkla gönderir. {counter}, {rand} ve {time} yer tutucuları her gönderimde doldurulur.",
    },
  ],
  faq: [
    {
      q: "İstekler geliyor ama yanıt gitmiyor",
      a: "Kuralın açık olduğunu, desen türünün (HEX/ASCII) ve «tam/içerir» seçiminin uyduğunu ve üstte bir «**» kuralı olmadığını kontrol edin. «Eşleşmeyen istekleri kaydet» açıkken bir «NO MATCH» satırı görünür; sağ tıklayıp ondan kural oluşturabilirsiniz.",
    },
    {
      q: "İstekler bölünmüş ya da birleşmiş geliyor",
      a: "Kurallar tüm çerçeveleri karşılaştırır. «Çerçeveleme»yi (boşluk süresi veya sonlandırıcı) ve ms cinsinden boşluğu ayarlayın. UDP için çerçeveleme gerekmez — bir datagram bir çerçevedir.",
    },
    {
      q: "Aynı PC'deki bir programı nasıl bağlarım?",
      a: "TCP için bir sunucu başlatın ve ana programı 127.0.0.1'e bağlayın. Seri için sanal bir COM çifti kullanın (com0com veya benzeri).",
    },
    {
      q: "«*IDN?» kuralım ilgisiz isteklere de yanıt veriyor",
      a: "«Joker karakterler» açıkken ASCII kuralındaki ? ve * herhangi bir karakterle eşleşir. SCPI kurallarında joker karakterleri kapalı tutun (yeni kurallarda varsayılan).",
    },
    {
      q: "Kuralları başka bir PC'ye taşıyabilir miyim?",
      a: "«Kural setini kaydet», kuralları ve iletim türünü, portu, adresi, çerçevelemeyi ve cihazın kendi başlattığı mesajları tek bir JSON dosyasında saklar — cihaz veya test başına bir dosya tutun.",
    },
  ],
};
