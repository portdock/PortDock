// PortDock Net Scan — Türkçe (8. paket)
export default {
  seo: {
    title: "PortDock Net Scan — Endüstriyel ağlar için ücretsiz IP tarayıcı",
    desc: "Endüstriyel ağlar için ücretsiz IP tarayıcı: ping ve ARP taraması, MAC üreticisi, endüstriyel portlar (Modbus 502, MC, XGT, S7 …), uzun süreli ping izleme.",
  },
  summary: "Bir ağ kartının alt ağını tarayarak cihazları bulun; MAC üreticisine ve açık endüstriyel portlara (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …) göre tanıyın. Ping'i engelleyen cihazlar aynı alt ağda ARP ile yine bulunur.",
  who: [
    "Yeni bir cihazın IP'sini bilmeyen saha mühendisleri",
    "Bir cihaz ağını gece boyunca izlemesi gerekenler",
  ],
  features: [
    {
      title: "Ping + ARP taraması",
      body: "Aynı alt ağdaki ARP, ping'i engelleyen cihazları bulur; yanıt süresini, adı, bu PC'yi ve ağ geçidini gösterir. Yönetici hakkı gerekmez.",
    },
    {
      title: "Endüstriyel port denetimi",
      body: "Yalnızca bir port listesini denetler (varsayılan 502, 2004, 5000–5010, 102, 44818, 4840 …; düzenlenebilir, en çok 32) — genel port taraması yapmaz — ve Modbus cihazlarından üretici/model bilgisini ister (FC 2B/0E).",
    },
    {
      title: "Açıkta kalma notları (0.10.0'dan itibaren)",
      body: "Denetlenen portlar arasında Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 veya HTTP 80 varsa «Endüstriyel protokol açık — aynı ağdaki herkes okuyup yazabilir (kimlik doğrulama yok) — ağ ayrımını kontrol edin» gibi bir not ekler. Ek port taramaz, hiçbir cihaz ayarını değiştirmez.",
    },
    {
      title: "Yayınla keşif — EtherNet/IP, BACnet (0.11.0'dan itibaren)",
      body: "Yalnızca düğmeye bastığınızda, seçili bağdaştırıcının yayın adresine EtherNet/IP ListIdentity (UDP 44818) ve BACnet Who-Is (UDP 47808) gönderir; IP'sini bilmediğiniz cihazların üreticisini, cihaz türünü, ürün adını ve revizyonunu — ayrıca BACnet cihaz örneğini ve üretici kimliğini — tabloya ekler. Salt okunur isteklerdir; seri numaraları gösterilmez.",
    },
    {
      title: "MAC üreticisi",
      body: "Gömülü IEEE listesi, internet olmadan üreticiyi gösterir.",
    },
    {
      title: "Uzun süreli ping izleme",
      body: "Birden çok cihazın kaybını, gecikmesini ve kesintilerini CSV'ye kaydeder; kopmada görev çubuğunu yanıp söndürür.",
    },
    {
      title: "Yeni / kayıp",
      body: "Önceki taramayla karşılaştırıp yeni ve kayıp cihazları işaretler. CSV'ye aktarılabilir.",
    },
    {
      title: "Referanslar — geçen seferle karşılaştırma (0.10.0'dan itibaren)",
      body: "Cihaz listesini adlandırılmış referanslar olarak kaydedin (birden çok, JSON dosyası olarak da) ve sonraki taramayı biriyle karşılaştırın — yeni (eklendi mi?), kayıp (kaldırıldı mı, kapalı mı?), MAC değişti (aynı IP'de başka cihaz, değiştirildi mi?), IP değişti (aynı cihaz başka IP'de, DHCP mi?) ve açık portlar değişti; renk kodlu. Karşılaştırma CSV'si ve «AI» kopyası (MAC'in son 3 baytı gizli). Referans dosyaları MAC adresleri içerir — paylaşırken dikkat edin.",
    },
    {
      title: "Wake-on-LAN, web'i aç",
      body: "Cihaz başına: web sayfasını açın, IP/MAC kopyalayın, magic packet gönderin.",
    },
  ],
  steps: [
    "Bir ağ bağdaştırıcısı seçin — alt ağı tarama aralığı olur (daha genişse içinde bulunduğu /24)",
    "«Tara» (F4)",
    "Hizmet ve üretici sütunlarına bakın; web sayfasını açmak, IP'yi kopyalamak, uyandırmak veya «Ping izlemeye ekle» için bir cihaza tıklayın",
  ],
  similar: "Benzer araçlar arasında Angry IP Scanner (açık kaynak) ve Advanced IP Scanner (ücretsiz yazılım) var. PortDock Net Scan, endüstriyel port denetimi (Modbus 502, MC, XGT, S7 …) ve uzun süreli ping izleme ekler.",
};
