// PortDock Serial — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Serial — Windows için ücretsiz seri terminal (RS-232/485)",
    desc: "RS-232, RS-485 ve USB COM portları için ücretsiz Windows seri terminali: HEX/ASCII, otomatik yeniden bağlanma, dokuz sağlama toplamı, Modbus RTU çözümleme.",
  },
  summary: "RS-232, RS-485 ve USB seri cihazlarla veri alışverişi yapın ve zaman damgalı bir test kaydı tutun. USB adaptörü çıkarıp takarsanız program aynı cihaza yeniden bağlanır.",
  who: [
    "Yeni bir cihazı devreye alan saha mühendisleri",
    "UART protokolünü test eden yazılım (firmware) geliştiricileri",
    "Modbus RTU trafiğini okuması gereken herkes",
  ],
  features: [
    {
      title: "Tanıyabileceğiniz portlar",
      body: "Her portun yanında cihaz adını, USB VID:PID bilgisini ve seri numarasını gösterir; takma ve çıkarmada güncellenir.",
    },
    {
      title: "Kopmalara dayanıklı",
      body: "COM numarası değişse bile tekrar taktıktan sonra aynı cihazı yeniden açar ve her kopma ile yeniden bağlanmayı kaydeder.",
    },
    {
      title: "Dört çerçeveleme modu",
      body: "Boşluk süresi, sonlandırıcı, sabit uzunluk veya Modbus RTU — böylece bir mesaj bir satır olur.",
    },
    {
      title: "Dokuz sağlama toplamı ve özel CRC",
      body: "Gönderirken CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 veya özel bir CRC ekleyin, alırken doğrulayın.",
    },
    {
      title: "Modbus RTU çözümleme",
      body: "İstekleri, yanıtları ve istisnaları adres, fonksiyon ve değerlere çözer.",
    },
    {
      title: "Sinyal hatları",
      body: "DTR/RTS'yi açıp kapatın, CTS/DSR/RI/CD'yi göstergelerde ve kayıtta izleyin.",
    },
    {
      title: "Test kayıtları",
      body: "Milisaniye zaman damgaları, komut listesi, tekrarlı gönderim ve dosyaya sürekli kayıt.",
    },
    {
      title: "Bağlantıyı denetle…",
      body: "Seçili portun cihazını, sürücüsünü, sorun kodunu, FTDI gecikme zamanlayıcısını ve USB güç tasarrufunu yönetici hakkı olmadan okur; loopback veya 2 telli RS-485 yankı testi yapar. 0.10.0'dan itibaren iki port testi (birbirine kablolanmış iki adaptör), desenler (0x00–0xFF, 0x55/0xAA) ve bir bağlantı şeması da var. Hiçbir şey değiştirilmez.",
    },
    {
      title: "Port paylaşımı — COM ↔ TCP (0.10.0'dan itibaren)",
      body: "Açık COM portunu bir TCP sunucusu olarak sunar; böylece diğer programlar, WSL2, Docker veya başka bir PC aynı portu kullanabilir. Ham veya RFC 2217 (uzaktan baud/parity değişimi); alınan veri tüm istemcilere gider ve gönderen istemci kayıtta etiketlenir. Varsayılan olarak yalnızca bu PC (127.0.0.1); diğer PC'ler yalnızca siz izin verirseniz. Sanal COM sürücüsü ve yönetici hakkı gerekmez.",
    },
    {
      title: "Modbus TCP ↔ RTU ağ geçidi (0.10.0'dan itibaren)",
      body: "PC'yi bir ağ geçidine çevirir — SCADA, HMI veya bir PC programı Modbus TCP ile bağlanır (varsayılan port 502), istekler RS-485 cihazlarına RTU çerçevesi olarak gider, yanıtlar MBAP olarak döner. Aynı anda tek istek; yanıt yoksa → istisna 0B, yol yoksa → 0A, istek/yanıt/zaman aşımı istatistikleri ve «TCP #1 → RTU unit 3 FC03» kayıt satırları.",
    },
    {
      title: "Modbus RTU salt dinleme (0.10.0'dan itibaren)",
      body: "RS-485 hattındaki bir adaptörle hiçbir şey göndermeden master–slave trafiğini dinler. Çerçeveler CRC'ye göre kesilir (boşluklar belirsizleşince yeniden eşitlenir); istek/yanıt çiftleri, yanıt süreleri, yanıtsız kalanlar, istisnalar ve istatistikler gösterilir. RS-232 için Y kablosundaki iki port tek zaman çizelgesinde birleşir. Dosyaya, CSV dahil, kaydedilir.",
    },
  ],
  steps: [
    "Portu, baud hızını ve parity'yi seçin, sonra «Bağlan»a tıklayın",
    "HEX veya ASCII yazın; gerekirse sağlama toplamı veya satır sonu ekleyin",
    "«Gönder» — alınan satırlar RX ◀, gönderilenler TX ▶ olarak görünür",
  ],
  similar: "Benzer araçlar arasında Tera Term ve PuTTY (açık kaynak terminaller) var. PortDock Serial, cihaz testi özelliklerini — USB yeniden bağlanma, çerçeveleme, sağlama toplamı denetimi, Modbus RTU çözümleme — tek ekranda toplar.",
};
