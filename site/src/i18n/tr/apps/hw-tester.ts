// PortDock Hardware Tester — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Hardware Tester — Wi-Fi kopma ve ping kaydı (ücretsiz)",
    desc: "Wi-Fi kopmalarını kaydeden ücretsiz Windows aracı: ağ geçidi ve internet ping'i yan yana, DNS süresi, Windows kopma nedenleri ve Bluetooth bağlanma/kopma kaydı.",
  },
  summary: "«Wi-Fi'm sürekli kopuyor» sorununu bir kayda dönüştürür. Kayıt sırasında ağ geçidinize (yönlendirici) ve bir internet adresine yan yana ping atar; gecikmeyi ve kaybı, Windows'un kaydettiği Wi-Fi kopma nedenleriyle aynı zaman çizelgesinde tek grafikte çizer ve yönlendirici tarafına mı, ötesine mi bakmanız gerektiğini söyler. Ayrıca Bluetooth cihazlarının ne zaman bağlanıp koptuğunu kaydeder. Salt okunur, yönetici hakkı gerekmez; hiçbir ayarı değiştirmez.",
  who: [
    "Wi-Fi'si sürekli kopan ve sorunun yönlendiricide mi internette mi olduğunu bilmek isteyenler",
    "Bluetooth kulaklık veya klavyelerin ne zaman koptuğunun kaydını isteyenler",
    "Destek görüşmesi öncesi bir cihaz PC'sinin kablosuz bağlantısını belgeleyen saha mühendisleri",
  ],
  features: [
    {
      title: "Ağ geçidi ve internet karşılaştırması",
      body: "Yönlendiriciye ve bir internet adresine (1.1.1.1, 8.8.8.8 veya kendi adresiniz) aynı anda ping atar; kaybı, ortalamayı, 95. yüzdelik değeri ve jitter'ı yan yana gösterir. Saniyede birden fazla değil; bir kayıt 24 saat sonra durur.",
    },
    {
      title: "Windows'un kopma nedenleri aynı grafikte",
      body: "WLAN-AutoConfig günlüğünü okur (8001 bağlanma, 8003 kopma) ve grafikte çizgi olarak, olay listesinde de Windows'un neden ifadesiyle gösterir. Wi-Fi adı okunmaz.",
    },
    {
      title: "DNS yanıt süresi",
      body: "Her 5 sn'de bir ad (varsayılan example.com) önbellek kullanmadan DNS sunucusunda sorgulanır; yanıt süreleri ve başarısızlıklar ölçülür.",
    },
    {
      title: "Nereye bakılacağı özeti ve CSV",
      body: "Kayıp ağ geçidine kadar uzanıyorsa «yönlendirici tarafı», yalnızca internet hedefi yanıt kaybediyorsa «yönlendiricinin ötesi» der — nedeni değil, nereye bakılacağını. Kayıtlar CSV olarak saklanır.",
    },
    {
      title: "Bluetooth bağlantı kaydı",
      body: "Eşleşmiş cihazların «Bağlı» durumunu her 2 sn'de bir okur, bağlanmaları ve kopmaları kaydeder. Adlar yalnızca ekranda gösterilir; kaydedilen ve kopyalanan metinde «Cihaz N» kullanılır.",
    },
    {
      title: "USB bağlanma/kopma kaydı (0.10.0'dan itibaren)",
      body: "Tekrar eden bağlanma/kopma sesinin arkasında hangi USB cihazının olduğunu bulur. Takma ve çıkarma zamanlarını cihaz adı, VID:PID, hub portu ve hızla kaydeder; 10 dakika içinde 3+ kez kopan cihazı «tekrarlı kopma şüphesi», USB 2.0 hızında çalışan bir USB 3 cihazını «Bakmaya değer» olarak işaretler. Uygulama başlamadan önceki son takma/çıkarma zamanlarını da okur.",
    },
    {
      title: "Bluetooth ses modu ve sol/sağ test sesleri",
      body: "Varsayılan çıkışın stereo (A2DP) mu yoksa çağrı için eller serbest mi olduğunu gösterir; sol, sağ ve her iki taraf test seslerini çalar.",
    },
    {
      title: "Wi-Fi sinyali ve kanalı (istek üzerine)",
      body: "Yalnızca «Sinyali göster» açıkken: sinyal gücü, bağlantı hızı, bant, kanal ve her kanalı paylaşan yakın ağ sayısı (adsız). Windows 11 24H2'den itibaren bunun için konum izni gerekir (geri kalanı onsuz çalışır).",
    },
  ],
  steps: [
    "İnternet hedefini ve aralığı seçin, sonra «Kaydı başlat»",
    "Kopmalar olana dek çalışır bırakın — yönlendirici ve internet gecikmesi ile Windows'un nedenleri tek grafikte",
    "Nereye bakacağınızı «Özet»te okuyun, sonra «CSV kaydet…» veya «Özeti kopyala»",
  ],
  faq: [
    {
      q: "İnternet hızını ölçer mi?",
      a: "Hayır. Kopmaları, gecikmeyi ve kaybı kaydeder; indirme veya yükleme hızını değil. Bunun için bir hız testi sitesi kullanın.",
    },
    {
      q: "Sorunu düzeltir mi?",
      a: "Hayır. Yalnızca okur ve hiçbir ayarı değiştirmez. Nereye bakacağınızı gösterir (yönlendirici tarafı, yönlendiricinin ötesi, DNS, Windows'un kopma nedenleri).",
    },
    {
      q: "Dışarıya ne gönderir?",
      a: "Kayıt sırasında yalnızca ağ geçidine ve seçtiğiniz internet adresine atılan ping'ler ile bir DNS sorgusu. Hedefler her zaman gösterilir; durdurduktan sonra hiçbir şey gönderilmez.",
    },
  ],
  similar: "Benzer araçlar arasında PingPlotter (ticari, ücretsiz sürümü var) ve WifiHistoryView (ücretsiz, bağlanma/kopma geçmişi) var. PortDock Hardware Tester ücretsizdir (GPL-3.0); ağ geçidi ve internet ping'lerini ve Windows'un kopma nedenlerini tek grafikte, bir Bluetooth bağlantı kaydıyla birlikte sunar.",
};
