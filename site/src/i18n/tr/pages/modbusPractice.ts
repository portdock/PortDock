// Modbus alıştırma testi (views/ModbusPracticePage.astro) — 4. paket. rtu, RTU↔TCP dönüştürücü bağlantısının önü ve arkası (bağlantı metnini weave() ekler)
export default {
  title: "Modbus alıştırma testi",
  seo: "Modbus alıştırma testi: RTU çerçevesi, CRC, istisnalar — PortDock",
  desc: "Modbus RTU alıştırması: okuma isteği HEX’i, yanıttaki 40003 değeri, istisna 83 02, CRC bayt sırası, float ABCD ve CDAB. Otomatik sorular ve açıklamalarla.",
  kind: "Soru türü",
  mixed: "Karışık",
  check: "Cevabı kontrol et",
  next: "Sonraki soru",
  reset: "Puanı sıfırla",
  answerLabel: "Cevap",
  how: "Sorular tarayıcınızda oluşturulur ve puanlanır. Puan yalnızca bu tarayıcıda saklanır ve hiçbir yere gönderilmez.",
  faqTitle: "Nasıl kullanılır",
  faq: [
    ["Kimler için?", "Modbus RTU öğrenen yeni mühendisler ve stajyerler ya da sahaya çıkmadan önce bilgisini tazelemek isteyen herkes için. Her cevaptan sonra bir açıklama ve ilgili rehber ile web aracına bağlantılar çıkar."],
    ["Aynı soruyu başkasına verebilir miyim?", "Sorunun altındaki “Bu soruya bağlantı”yı kopyalayıp gönderin; aynı soruyu açar. Her soru tek bir sayıdan (seed) üretilir, aynı sayı aynı soruyu verir."],
    ["Yazılı cevabı nasıl yazarım?", "HEX boşlukları, büyük/küçük harfi ve 0x’i dikkate almaz (01 03 00 00 00 0A C5 CD ile 0103000000 0ac5cd aynıdır). Değerler ondalıktır; HEX girmek için başına 0x ekleyin."],
  ],
  srcTitle: "Kaynaklar",
  qlink: "Bu soruya bağlantı",
  guidesTitle: "Birlikte okunacak rehberler",
  src: ["fonksiyon kodları, istek/yanıt yapıları, istisna kodları", "RTU çerçeveleme, CRC (düşük bayt önce)", "float32. Register word sırası (ABCD, CDAB) Modbus şartnamesinde yoktur ve cihaza göre değişir"],
  rtu: ["Çerçeveleri RTU, TCP ve ASCII arasında dönüştürmek için şunu kullanın: ", "."],
};
