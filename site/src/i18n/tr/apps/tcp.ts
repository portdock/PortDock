// PortDock TCP — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock TCP — Ücretsiz TCP istemci, sunucu ve röle test aracı",
    desc: "Windows için ücretsiz TCP soket test aracı: istemci, çok bağlantılı sunucu ve röle (izleme) modları, yankı, otomatik yeniden bağlanma ve Modbus TCP çerçeveleme.",
  },
  summary: "Bir Ethernet cihazına bağlanın (istemci) ya da cihazların PC'ye bağlanmasını sağlayın (sunucu). Sunucu birden çok bağlantıyı kabul eder, birine veya hepsine gönderebilir; röle iki cihazın arasına girer ve iki yönü de kaydeder.",
  who: [
    "HMI, MES ve ana yazılım geliştiricileri",
    "TCP cihazlarının yazılım (firmware) geliştiricileri",
  ],
  features: [
    {
      title: "İstemci ve sunucu",
      body: "Sunucu 64 bağlantıya kadar kabul eder; birine veya hepsine gönderin, bağlantıları tek tek kesin.",
    },
    {
      title: "Röle (izleme)",
      body: "A (ör. bir HMI) ile B (ör. bir PLC) arasına girer, trafiği geçirir ve iki yönü de kaydeder.",
    },
    {
      title: "Otomatik yeniden bağlanma",
      body: "Bağlantı kopunca istemci ayarlanan aralıkla yeniden bağlanır.",
    },
    {
      title: "Yankı",
      body: "Sunucu gelen veriyi geri yollar; yankı döngülerini önlemek için saniyede 200'ün üstünde yankı kendiliğinden kapanır.",
    },
    {
      title: "Çerçeveleme ve sağlama toplamları",
      body: "TCP akışını boşluk süresi, sonlandırıcı, sabit uzunluk veya Modbus TCP (MBAP uzunluğu) ile bölün; dokuz sağlama toplamı türünü veya özel bir CRC'yi doğrulayın.",
    },
    {
      title: "İlk açılışta bağlanma adresi 127.0.0.1 (0.10.0'dan itibaren)",
      body: "Sunucunun «Bağlanma adresi» ile rölenin «A'nın bağlanacağı bu PC adresi» 127.0.0.1 (yalnızca bu PC) ile başlar. Başka bir PC veya HMI'nın bağlanması için orada 0.0.0.0 (tüm ağ kartları) veya bir bağdaştırıcının adresini seçin. Önceki sürümlerde kaydedilen ayarlar korunur.",
    },
  ],
  steps: [
    "«İstemci» veya «Sunucu» seçin, adresi ve portu girin",
    "«Bağlan» veya «Dinlemeye başla»",
    "Yazın ve «Gönder»e tıklayın",
  ],
  uses: [
    {
      title: "Bir cihazla konuşmak",
      body: "Cihaz bağlantı bekliyorsa IP'si ve portuyla «İstemci» kullanın, komut gönderin, yanıtları HEX veya ASCII olarak okuyun. Bağlantı koparsa istemci ayarlanan aralıkla yeniden bağlanır.",
    },
    {
      title: "Cihaz PC'ye bağlandığında",
      body: "«Sunucu» ile bir port açın; 64 cihaza kadar bağlanabilir. Birine veya hepsine gönderin, cihazları tek tek düşürün.",
    },
    {
      title: "HMI ⇄ PLC trafiğini kaydetmek",
      body: "«Röle» ile PC iki cihazın arasına girer; HMI'yı bu PC'ye yönlendirirseniz iki yön de kaydedilir. Baytlar değişmeden geçer. 0.8.0'dan itibaren röle pcap kaydedebilir ve Modbus/MC istek-yanıt çiftlerini ve yanıt sürelerini gösterir.",
    },
    {
      title: "Bir Modbus TCP cihazını bir kez okumak",
      body: "502 portuna bağlanınca «Modbus TCP olarak gör» çubuğu belirir. İstekleri ve yanıtları tek tek ayırır, ayrıntı bölmesinde çözer. Sürekli sorgulama için Modbus Master daha kolaydır.",
    },
  ],
  faq: [
    {
      q: "İstemci sürekli bağlanamıyor (CONNECT FAIL)",
      a: "Cihazın gücünü ve kablosunu, IP'yi ve portu kontrol edin; PC ile cihaz aynı alt ağda olmalı (ör. 192.168.0.x).",
    },
    {
      q: "Sunucuyu başlattım ama cihaz bağlanamıyor",
      a: "Windows Güvenlik Duvarı isteminde izin verdiğinizden ve cihazın bu PC'nin IP'sine bağlandığından emin olun. «already in use» hatası portu başka bir programın tuttuğu anlamına gelir.",
    },
    {
      q: "Veriler birleşmiş ya da bölünmüş görünüyor",
      a: "TCP mesaj sınırlarını korumaz. «Alım ayarları»ndaki çerçevelemeyi sonlandırıcı, sabit uzunluk veya Modbus TCP (MBAP uzunluğu) olarak değiştirin ya da boşluk süresini ayarlayın.",
    },
    {
      q: "Röle trafiği değiştirir mi?",
      a: "Hayır. Baytlar geldiği gibi iletilir; çerçeveleme ve sağlama toplamı denetimi yalnızca kayıt içindir, otomatik yanıt ve yankı kapalıdır. Cihazlara yalnızca sizin kendiniz eklediğiniz veri ulaşır; dikkatli olun.",
    },
  ],
  similar: "Benzer araçlar arasında Hercules SETUP utility (HW-group, ücretsiz yazılım) var.",
};
