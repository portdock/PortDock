// PortDock Port Inspector — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Port Inspector — Ücretsiz COM port denetleyici (USB seri)",
    desc: "Ücretsiz Windows COM port denetleyici: USB seri sürücü, Aygıt Yöneticisi sorun kodu, FTDI gecikmesi, hayalet COM numaraları. Salt okunur, yönetici hakkı yok.",
  },
  summary: "Bir COM portu seçin ve normalde Aygıt Yöneticisi'nde, Olay Görüntüleyicisi'nde ve kayıt defterinde aramanız gerekenleri tek yerde görün: sürücü, sorun kodu ve anlamı, USB çipi, FTDI gecikme zamanlayıcısı gibi cihaz ayarları, USB güç tasarrufu, son takma geçmişi ve COM numarası rezervasyonları. Yalnızca okur, yönetici hakkı gerekmez; TX, RX'e bağlandığında her baud hızında gidiş-dönüş süresini ölçer. Diğer sekmeler bu PC'nin ağ bağdaştırıcılarını, bir ekipman PC'si olarak Windows ayarlarını ve aynı şekilde Wi-Fi ile Bluetooth'u okur.",
  who: [
    "USB-seri adaptörü algılanmayan veya ara sıra kopan saha mühendisleri",
    "Modbus RTU yanıtlarının neden geç geldiğini arayanlar (FTDI gecikme zamanlayıcısı)",
    "Bir destek talebine veya issue'ya PC tarafı port ayrıntılarını eklemesi gerekenler",
  ],
  features: [
    {
      title: "Cihaz, sürücü, sorun kodu",
      body: "Ad, COM numarası, konum, örnek (instance) kimliği ve üretici; sürücü sağlayıcısı, sürüm, tarih, INF ve hizmet; durum ile Aygıt Yöneticisi sorun kodu, anlamı ve denenecekler; son takma ve çıkarma.",
    },
    {
      title: "USB çipi ve cihaz ayarları",
      body: "VID/PID tablosundan çip adı (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), Windows'un port varsayılanı ve sürücünün Device Parameters değerleri; FTDI gecikme zamanlayıcısı (LatencyTimer) açıklamasıyla.",
    },
    {
      title: "Güç tasarrufu ve geçmiş",
      body: "Güç seçeneklerinden USB selective suspend, cihaz ve üzerindeki USB cihazları için «Güç tasarrufu için bilgisayarın bu aygıtı kapatmasına izin ver», ayrıca olay günlüklerinden takma ve sürücü olayları (7, 30 veya 90 gün).",
    },
    {
      title: "COM numarası rezervasyonları",
      body: "Windows'un ayırdığı numaralar (ComDB), şu an bağlı olmayan cihazların tuttuğu numaralar, sahipsiz numaralar ve birden çok cihazın tuttuğu numaralar — yeni bir adaptörün neden COM15 olduğu.",
    },
    {
      title: "Bağlantı testi",
      body: "Baud hızı başına TX–RX loopback: aynı, kaybolan ve değişen baytlar, 1 baytlık gidiş-dönüş süresi ms olarak (ortanca ve en yüksek) ve sürücü hata bayrakları (ClearCommError). 2 telli bir RS-485 adaptörünün yankı yapıp yapmadığını da söyler.",
    },
    {
      title: "İki port testi ve desenler (0.10.0'dan itibaren)",
      body: "Birbirine kablolanmış iki adaptörle her hızda iki yönde gönderir ve gelenleri karşılaştırır (RS-485 adaptörlerini denetlemek için). Desenler: karışık baytlar, 0x00–0xFF, 0x55/0xAA; uzunluk 64–4096 bayt. Metin bağlantı şeması ve genel «Sorun bulunmadı (bu test kapsamında) / Bakmaya değer / Sorun» kararı. Serial'daki «Bağlantıyı denetle…» ile aynıdır.",
    },
    {
      title: "Bu PC'deki ağ bağdaştırıcıları",
      body: "«Bağdaştırıcıları oku», her bağdaştırıcı için bağlantıyı, hızı, dupleksi, IPv4'ü ve ağ geçidini; ayrıca Aygıt Yöneticisi «Gelişmiş» değerlerini (jumbo çerçeve, alım tamponları, kesme denetimi, EEE …), güç tasarrufunu, alım hatalarını, ağ profilini ve güvenlik duvarının açık olup olmadığını gösterir. «GigE kamera» kullanımı, kamera üreticilerinin yayımladığı değerleri kaynaklarıyla yan yana gösterir.",
    },
    {
      title: "Bu PC — ekipman PC'si ayarları",
      body: "«Bu PC'nin ayarlarını oku», hızlı başlatmayı, uykuyu, USB selective suspend'i, güncelleme yeniden başlatma ilkesini, ekran koruyucuyu, saat eşitlemeyi ve son beklenmedik kapanmalarla donanım hatalarını okur. «Ekipman PC'si» kullanımında duruşa veya yeniden başlatmaya yol açabilecek değerler «Bakmaya değer» olarak işaretlenir.",
    },
    {
      title: "Bu PC — mavi ekranlar, SSD sağlığı, uyandırma kaynakları (0.10.0'dan itibaren)",
      body: "Aynı «Bu PC» kartı, mavi ekran durdurma kodlarını adlarıyla (ör. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) ve ani kapanma zamanlarını, NVMe SSD sıcaklığını, kullanılan yüzdeyi, yedek alanı, çalışma saatini ve ortam hatalarını, PC'yi uykudan neyin uyandırdığını, bir dizüstünün pil kapasitesini (tasarıma göre) ve döngü sayısını okur — yönetici hakkı gerekmez. Döküm dosyaları yalnızca listelenir; disk seri numaraları okunmaz.",
    },
    {
      title: "Geçen seferle karşılaştırma — kayıtlı denetimler (0.10.0'dan itibaren)",
      body: "Geçerli denetimi (COM port listesi, sürücü adı/sürümü/tarihi, USB konumu, ağ bağdaştırıcısı ayarları, Bu PC ayarları, mavi ekran kayıtları) kaydedin; sonraki bakımda yeniden okuyup yalnızca değişenleri görün — ör. COM3 → COM7, yeni sürücü sürümü (Windows Update?), kapatılan jumbo çerçeve, değişen bir güç ayarı, yeni bir mavi ekran. Cihaz seri numaraları, PC adı veya kullanıcı klasörü saklanmaz. Sonucu metin veya CSV olarak saklayın.",
    },
    {
      title: "Kablosuz — Wi-Fi ve Bluetooth",
      body: "«Kablosuz» sekmesi Wi-Fi bağdaştırıcısını, sürücüyü, güç tasarrufunu ve Windows'un tuttuğu bağlantı kopma kayıtlarını (nedene göre sayılmış), ayrıca Bluetooth bağdaştırıcısını, hizmet durumunu, hata olaylarını ve Bluetooth sesinin eller serbest (çağrı) modunda olup olmadığını okur — yönetici veya konum izni gerekmez. Ping göndermez; dışa aktarımlarda cihaz adları maskelenir.",
    },
    {
      title: "Salt okunur, sade sonuçlar",
      body: "Ayarları veya sürücüleri asla değiştirmez (yardım, elle düzeltmeyi anlatır). Her kart «Sorun bulunmadı (okunanlarda) / Bakmaya değer / Sorun / Okunamadı» olarak işaretlenir; PC'nin göremedikleri — A/B ters bağlantısı, sonlandırma, bias, toprak — her zaman listelenir; metin ve JSON dışa aktarımlarında kullanıcı klasörü yolları maskelenir.",
    },
  ],
  steps: [
    "Soldaki «COM portları» listesinden bir porta tıklayın",
    "Her kartın sonucunu ve nedenini okuyun; gerekirse yardımın anlattığı gibi Windows'ta kendiniz değiştirin",
    "«Bağlantı testi» için TX'i RX'e bağlayın; sonucu bir soruya eklemek için «Metni kopyala»yı kullanın",
  ],
  similar: "Benzer araçlar arasında Windows Aygıt Yöneticisi, NirSoft USBDeview (ücretsiz yazılım), Uwe Sieber'in USB Device Tree Viewer'ı (ücretsiz yazılım) ve FTDI çipleri için FTDI'nin FT_PROG'u (ücretsiz) var. PortDock Port Inspector, bir COM portunun sürücüsünü, sorun kodunu, güç tasarrufunu, takma geçmişini ve COM numarası rezervasyonlarını tek yerde toplar ve loopback bağlantı testi ekler.",
};
