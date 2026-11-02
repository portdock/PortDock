// PortDock PLC Simulator — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock PLC Simulator — Ücretsiz MC protokolü (SLMP) simülatörü",
    desc: "PLC olmadan MC protokolü (3E/4E, ikili/ASCII) bağlantısı test eden ücretsiz Windows aracı: cihaz tabloları (D, M, X, Y …), toplu okuma/yazma, hata enjeksiyonu.",
  },
  summary: "PC, MC protokolü (SLMP) isteklerine bir PLC'nin Ethernet portu gibi yanıt verir. Cihaz tablolarına değer koyun; HMI, veri toplama veya ana yazılım bunları okuyup yazabilir; bilerek eklenen gecikmeler ve hata bitiş kodları hata işlemeyi sınar. Mitsubishi Electric'in herkese açık kılavuzlarındaki (SLMP/MC) mesaj biçimlerini izler; şirketle bağlantısı yoktur ve davranış gerçek bir PLC'den farklı olabilir.",
  who: [
    "PLC gelmeden HMI ekranlarını ve haberleşmeyi hazırlayan ekipler",
    "PLC'leri MC protokolüyle okuyan veri toplama veya ana yazılım geliştiricileri",
  ],
  features: [
    {
      title: "3E/4E, ikili/ASCII, TCP/UDP",
      body: "TCP sunucusu (birden çok istemci) olarak veya UDP üzerinde dinler. 4E yanıtları isteğin seri numarasını taşır. Varsayılan olarak yalnızca bu PC (127.0.0.1) bağlanabilir; diğer PC'lere izin vermek size kalmış.",
    },
    {
      title: "Uygulanan komutlar",
      body: "0401 Read ve 1401 Write (word ve bit, alt komutlar 0000–0003), 0403 Read Random, 1402 Write Random ve 0619 Loopback. 0.6.0'dan itibaren ayrıca 0406/1406 Read/Write Block, 0801/0802 izleme, 1001–1006 uzaktan RUN/STOP/PAUSE/latch clear/reset (yalnızca simüle durum) ve 0101 Read Type Name (simüle değerler). Diğer komutlar C059 bitiş kodunu alır.",
    },
    {
      title: "LS XGT özel protokolü (0.10.0'dan itibaren)",
      body: "«Protokol»ü «XGT özel» yapın; LS ELECTRIC XGT PLC'lerinin FEnet özel protokolüne yanıt verir («LSIS-XGT» başlığı, varsayılan TCP 2004 · UDP 2005): okuma h0054 ve yazma h0058, tek tek (%MX, %MB, %MW, %MD, %ML, en çok 16 blok) ve sürekli (%MB bayt, en çok 1.400 bayt), P, M, K, F, T, C, D, L, N cihazları ve hata kodu yanıtları (1–6, h75–h78). LS ELECTRIC'in herkese açık kullanım kılavuzlarından yapılmıştır — şirketle bağlantısı yoktur.",
    },
    {
      title: "Koşul kuralları (0.6.0'dan itibaren)",
      body: "«İstek biti açılınca 300 ms sonra bitti bitini aç» gibi el sıkışmaları taklit eder: koşul (bit ON/OFF/kenar, word karşılaştırması, periyodik) → gecikme (sabit veya rastgele) → eylemler (bit ve word yazma). Bir merdiven (ladder) programı değildir.",
    },
    {
      title: "18 cihaz",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC ve CN. X, Y, B, W ve ZR onaltılık numara kullanır; her cihazın bir boyutu vardır ve aşan istekler C056 alır. Bit cihazları 16 noktalı word olarak görüntülenebilir; hücreler 32 bit, kayan nokta, metin veya adlı olabilir.",
    },
    {
      title: "Hata enjeksiyonu",
      body: "Yanıt gecikmesi (aralıklı), yanıtsızlık veya seçilen bir bitiş kodu — komuta, cihaza, her N. isteğe veya olasılığa göre hedeflenir.",
    },
    {
      title: "Çözülmüş trafik",
      body: "Her istek komut adını, cihazı ve nokta sayısını; her yanıt bitiş kodunu ve anlamını gösterir. İstemcinin değiştirdiği hücreler yanıp söner; istatistikler de vardır.",
    },
    {
      title: "Simülasyon ve kayıtlı durumlar",
      body: "Değerler kendiliğinden değişebilir (artan, rastgele, sinüs, rampa, geçiş); cihaz değerleri ve hücre ayarları bir JSON dosyasına kaydedilir ve oradan yüklenir.",
    },
  ],
  steps: [
    "Çerçeveyi (3E/4E), veri kodunu (ikili/ASCII) ve portu istemciyle eşleştirin",
    "Bir cihaz seçin (D, M, X …) ve değerleri girin",
    "«Başlat» — istemcinin okuma ve yazmaları tablolardan yanıtlanır",
  ],
  faq: [
    {
      q: "Gerçek bir PLC gibi tam olarak davranır mı?",
      a: "Hayır. Herkese açık kılavuzlardaki mesaj biçimlerini izler ve gerçek donanımla karşılaştırılmamıştır. Merdiven programı çalışmaz; hata kodları, zamanlama, bağlantı sınırları ve modele göre cihaz aralıkları farklı olabilir.",
    },
    {
      q: "Başka bir PC'deki HMI'yı nasıl bağlarım?",
      a: "«Diğer PC'lerin bağlanmasına izin ver (0.0.0.0)» seçeneğini açın ve programa Windows Güvenlik Duvarı'nda izin verin. Gerçek bir PLC ile aynı IP ve portta bir fabrika ağında çalıştırmayın.",
    },
  ],
  similar: "Benzer araçlar arasında DummyPLC (ücretsiz, kapalı kaynak) ve HslCommunication (ticari) var. PortDock PLC Simulator ücretsizdir (GPL-3.0) ve hata enjeksiyonu, çözülmüş trafik ve değer simülasyonu ekler.",
};
