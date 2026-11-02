// PortDock Modbus Slave — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Modbus Slave — Ücretsiz Modbus Slave simülatörü (RTU/TCP)",
    desc: "Windows için ücretsiz Modbus RTU/TCP slave simülatörü: cihaz olmadan PLC, HMI veya master test edin; kayıt tabloları, hata enjeksiyonu ve cihaz profilleri var.",
  },
  summary: "PC'yi bir Modbus slave'e (seri RTU veya Modbus TCP ya da RTU over TCP sunucusu) çevirir; böylece bir master'ı (PLC, HMI, ana yazılım) gerçek cihaz olmadan test edebilirsiniz — bilerek gecikme ve hata üretmek dahil.",
  who: [
    "Modbus master yazan geliştiriciler",
    "Cihaz gelmeden HMI ekranlarını hazırlayan ekipler",
  ],
  features: [
    {
      title: "Üç iletim türü",
      body: "Seri (RTU), TCP sunucusu (Modbus TCP) ve TCP sunucusu (RTU over TCP — seri cihaz sunucusunun arkasındaki cihaz).",
    },
    {
      title: "Dört tablo",
      body: "Coil, discrete input, holding ve input kayıtları. Tabloyu U16, S16, HEX veya BIN olarak görün, hücre başına bayt sıralı U32, S32, F32, F64 veya metin türleri ayarlayın ve değerlerin kendiliğinden değişmesini sağlayın (artan, rastgele, sinüs …).",
    },
    {
      title: "Birden çok Slave ID",
      body: "Her biri kendi değerlerine sahip birden çok Slave ID (1–247) çalıştırın.",
    },
    {
      title: "Hata enjeksiyonu",
      body: "Gecikme, yanıtsızlık, bozuk CRC, yanlış MBAP uzunluğu veya zorlanmış istisnalar — Slave ID, fonksiyon, adres, her N. istek veya olasılığa göre hedeflenir — master'ın zaman aşımı ve yeniden denemelerini test etmek için.",
    },
    {
      title: "Her yazmayı görün",
      body: "Master'ın yazdığı hücreler yanıp söner; trafik kaydı ve istatistikler de vardır.",
    },
    {
      title: "Cihaz profilleri, kayıtlı tablolar",
      body: (c: { nDevices: number }) => `${c.nDevices} yerleşik cihazın (sürücüler, sıcaklık kontrolörleri, güç ölçerler …) kayıt adlarını ve türlerini örnek değerlerle yükleyin. Tabloları CSV kayıt haritası (Modbus Master ile aynı biçim) veya JSON olarak dışa/içe aktarın.`,
    },
    {
      title: "Cihaz profiliyle taklit — canlı değerler (0.10.0'dan itibaren)",
      body: "SCADA, HMI veya kendi programınızı gerçek bir sürücü ya da güç ölçer olmadan test edin. Çalıştırma komutunu yazınca çıkış frekansı frekans ayarına doğru yükselir (0 ise düşer), akım, gerilim ve güç de buna uyar; güç ölçerlerde gerilim ve akım hafifçe sapar, enerji birikir. Düzenlenebilir «bağlantı kuralları» (izle, orantılı, biriktir) hücreleri birbirine bağlar. Cihaz haritasındaki salt okunur ve salt yazılır hücreler uygulanır (istisna 02 veya 03, seçim sizin), haritada olmayan adresler istisna 02 verir ve hata enjeksiyonuyla birlikte çalışır. Değerler kılavuzdaki tablolardan gelir; bu yüzden gerçek cihaz davranışı (rampa süreleri vb.) farklı olabilir.",
    },
    {
      title: "İlk açılışta bağlanma adresi 127.0.0.1 (0.10.0'dan itibaren)",
      body: "TCP sunucusunun «Bağlanma adresi» 127.0.0.1 (yalnızca bu PC) ile başlar. Başka bir PC'deki master için orada 0.0.0.0 (tüm bağdaştırıcılar) veya bir bağdaştırıcının adresini seçin. Önceki sürümlerde kaydedilen ayarlar korunur.",
    },
  ],
  steps: [
    "İletim türünü (seri veya TCP) ve portu ile baud hızını (veya adres ve portu) seçin; gerekirse Slave ID ekleyin",
    "Bir tablo seçin, başlangıç adresini ve adedi ayarlayın, değerleri girin",
    "«Bağlan» (TCP için «Başlat») — master istekleri tablodan yanıtlanır",
  ],
  similar: "Benzer araçlar arasında ticari Modbus Slave (Witte Software) ve açık kaynaklı ModRSsim2 var. PortDock Modbus Slave ücretsizdir (GPL-3.0), süre sınırı yoktur.",
};
