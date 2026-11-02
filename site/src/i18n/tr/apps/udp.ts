// PortDock UDP — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock UDP — Ücretsiz UDP gönderici/alıcı (yayın, çoklu yayın)",
    desc: "Windows için ücretsiz UDP test aracı: datagram alma ve gönderme, broadcast ve multicast, son göndericiye yanıt, yankı ve zaman damgalı kayıt.",
  },
  summary: "Bir portta datagram alın; sabit bir hedefe veya son göndericiye yanıt verin. Broadcast ve multicast kullanan cihazlar için tasarlandı.",
  who: [
    "Durumunu UDP ile yayınlayan cihazlarla çalışan herkes",
    "Multicast alımını doğrulayan ekipler",
  ],
  features: [
    {
      title: "Gönderici listesi",
      body: "Gönderici adreslerini toplar; birine tıklayıp hedef olarak kullanın.",
    },
    {
      title: "Broadcast ve multicast",
      body: "Broadcast'e izin verin, bir multicast grubuna katılın veya yeniden katılın, ağ kartını seçin.",
    },
    {
      title: "Yankı",
      body: "Göndericiye geri yankılar; otomatik döngü koruması vardır.",
    },
  ],
  steps: [
    "Dinleme portunu ve hedefi girin",
    "«Başlat»",
    "Yazın ve «Gönder»e tıklayın",
  ],
  uses: [
    {
      title: "Durum yayınlarını almak",
      body: "Dinleme portunu girip «Başlat»a basın. Her datagram bir kayıt satırıdır ve göndericiler «Gönderenler» listesinde toplanır (en çok 256).",
    },
    {
      title: "Cihazın adresini bilmiyorsanız",
      body: "Cihazın gönderdiği portu dinlemeye başlayın ve «Gönderenler»i izleyin. Bir adresin yanındaki «Hedef olarak kullan»a tıklayarak oraya yanıt verin.",
    },
    {
      title: "Broadcast göndermek",
      body: "Başlatmadan önce «Yayına izin ver»i açın, sonra 255.255.255.255 veya 192.168.0.255 gibi bir adrese gönderin. Kapalıysa uyarılırsınız.",
    },
    {
      title: "Multicast alımını denetlemek",
      body: "Bir grup girin (224–239.x.x.x); başlatınca gruba katılınır. Birden çok ağ kartı varsa (ofis ve makine ağları) makine tarafındaki «Çoklu yayın NIC'i»ni seçin. Varsayılan TTL 1, trafiği yerel ağda tutar.",
    },
  ],
  faq: [
    {
      q: "Hiçbir şey gelmiyor",
      a: "Cihazın gönderdiği IP'yi ve portu, Windows Güvenlik Duvarı iznini ve ikisinin aynı alt ağda olduğunu kontrol edin. Multicast için grubu ve NIC'i kontrol edin, «Yeniden katıl»ı deneyin.",
    },
    {
      q: "Başlatma «address in use» ile başarısız oluyor",
      a: "Portu başka bir program tutuyor; olay satırı o programın adını ve PID'sini gösterir. Başka bir port kullanın veya o programı kapatın.",
    },
    {
      q: "«ICMP port unreachable» ne demek?",
      a: "İşletim sistemi, hedefte o portu dinleyen bir şey olmadığını bildiriyor. Cihazın port numarasını ve gücünü kontrol edin.",
    },
    {
      q: "Tek seferde ne kadar gönderebilirim?",
      a: "Bir gönderim bir datagramdır. Yaklaşık 64 KB'ın üstünü işletim sistemi reddeder.",
    },
  ],
};
