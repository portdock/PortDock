// Saha arıza bulma sihirbazının soru ağacı metinleri (Türkçe) — ağacın yapısı (id, sonraki düğüm, bağlantılar) tek bir data/troubleshoot.ts dosyasında ortaktır; burada yalnızca düğüm id’siyle bulunan metinler var.
// Soru: q · hint (yalnızca ağaçta ipucu varsa) · opts (yalnızca evet/hayır olmayan yanıtlar, yanıt sırasıyla). Sonuç: title · causes · checks (ağaçla aynı sayı ve sıra).
// Eksik id ya da sayısı farklı satırları lib/troubleshoot.ts içindeki checkText() yakalar (i18n.test.ts). Metinler «olası neden»dir — kesin hüküm vermez.
// Programların (Port Inspector, Hardware Tester …) ekranları yalnızca Korece/İngilizcedir; bu yüzden düğme ve menü adları İngilizce bırakıldı.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Evet",
  no: "Hayır",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: yanıt yok ya da bozuk",
    rs232: "RS-232 iletişim kurmuyor",
    tcp: "Modbus TCP / Ethernet cihazına bağlanılamıyor",
    usb: "USB-seri dönüştürücü tanınmıyor ya da kopuyor",
    ma: "4-20 mA değeri yanlış görünüyor",
    sensor: "NPN/PNP sensör girişi gelmiyor",
    mc: "MC protokolü (Mitsubishi) bağlanmıyor",
    pcusb: "PC’deki bir USB cihazı sürekli kopuyor",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Hiç yanıt gelmiyor mu?", hint: "«Hayır» = yanıtlar bazen geliyor ya da bozuk baytlarla geliyor" },
    "rs485-txled": { q: "İstek gönderilirken dönüştürücünün TX LED’i yanıp sönüyor mu?", hint: "LED yok mu? Bunun yerine gönderilen baytların PortDock Serial kaydında görünüp görünmediğine bakın" },
    "rs485-settings": { q: "Baud hızı, parite, stop bitleri ve slave adresini cihazın kendi ayar ekranıyla (ya da kılavuzuyla) tek tek karşılaştırdınız mı?" },
    "rs485-swap": { q: "A ve B (D+/D−) tellerini yer değiştirirseniz yanıt geliyor mu?", hint: "Yer değiştirmek cihazlara zarar vermez" },
    "rs485-single": { q: "Kısa bir kabloyla doğrudan dönüştürücüye bağlı tek bir cihazla yanıt geliyor mu?" },
    "rs485-garbled": { q: "Alınan baytlar bozuk görünüyor mu (CRC hataları, tuhaf karakterler)?", hint: "«Hayır» = baytlar düzgün ama yanıtlar bazen eksik (zaman aşımı)" },
    "rs485-slower": { q: "Baud hızını düşürmek ya da kabloyu kısaltmak bozulmayı azaltıyor mu?" },
    "rs485-timeout": { q: "Yanıt zaman aşımını uzatmak (ör. 1000 ms) eksik yanıtları azaltıyor mu?" },
    "r-rs485-port": {
      title: "İstek PC’den hiç çıkmıyor — port ya da sürücü tarafı",
      causes: [
        "Yanlış COM numarası açılmış (dönüştürücü başka bir USB portuna takılınca numara değişir)",
        "Başka bir program (SCADA, önceden açılmış bir terminal) portu hâlâ tutuyor",
        "Sürücü sorunu (Aygıt Yöneticisi’nde uyarı işareti ya da sorun kodu)",
        "Dönüştürücü 2 telli RS-485 için yönü otomatik değiştirmiyor (otomatik TX denetimi yok)",
      ],
      checks: [
        "Aygıt Yöneticisi’nde «Bağlantı noktaları (COM ve LPT)» altında dönüştürücünün COM numarasını bulun ve program ayarıyla eşleştirin",
        "Port Inspector’da portun sürücüsünü ve sorun kodunu okuyun; bir şey gönderilip gönderilmediğini görmek için 2 telli RS-485 yankı testini çalıştırın",
        "Multimetre (V⎓) A–B arasındayken istekleri tekrar tekrar göndermek değeri oynatmalı — sabit kalıyorsa hiçbir şey gönderilmiyor",
      ],
    },
    "r-rs485-settings": {
      title: "İletişim ayarları büyük olasılıkla farklı",
      causes: [
        "Baud hızı ya da parite farklı (ör. cihaz 8E1, program 8N1)",
        "Slave adresi farklı ya da 0 (broadcast) kullanılıyor — broadcast’e yanıt gelmez",
        "Cihaz protokolü Modbus RTU değil (üreticiye özel protokol ya da ASCII) veya ayarlar kaydedilip yeniden başlatılmadan değiştirilmiş",
      ],
      checks: [
        "Cihaz ekranındaki iletişim parametrelerini yazın ve programla satır satır karşılaştırın",
        "Sürücülerde «çalıştırma komutu kaynağı» ve «protokol seçimi» parametrelerine de bakın",
        "Baud hızı bilinmiyorsa Modbus Master ile tarayın — slave adresi taraması, baud/parite için «line settings search» (hat ayarı arama, 0.10.0’dan itibaren)",
      ],
    },
    "r-rs485-polarity": {
      title: "A/B (+/−) etiketlemesi tersmiş",
      causes: ["Üreticiler A/B’den hangisinin + olduğu konusunda anlaşamaz (Modbus şartnamesi: D1 = B = +, D0 = A = −)", "Yalnızca bazı cihazlar ters olabilir — değişiklikten sonra diğerleri yanıt vermeyi bırakırsa onların etiketlerini kontrol edin"],
      checks: ["Besleme açık, yoklama durdurulmuş: kırmızı B’de (D1·+), siyah A’da (D0·−) iken bias varsa +200 mV ya da daha fazla okunmalı", "Kimse geri çevirmesin diye ters bağlantıyı bağlantı şemasına kaydedin"],
    },
    "r-rs485-bus": {
      title: "Cihaz tek başına çalışıyor ama hatta çalışmıyor — hat bağlantısı ya da düzeni",
      causes: [
        "Üç ya da daha fazla sonlandırma (ortadaki bir cihazın anahtarı açık) ya da hiç sonlandırma yok",
        "İki cihaz aynı slave adresini paylaşıyor ve aynı anda yanıt verip birbirini bozuyor",
        "Uzun branşmanlar ya da yıldız bağlantı veya ara bir klemenste kopukluk",
        "SG (ortak) teli yok; uzaktaki cihazlar ortak mod aralığının dışına itiliyor",
      ],
      checks: [
        "Tüm beslemeler kesik, A–B direnci: yaklaşık 60 Ω (iki uç), yaklaşık 120 Ω (bir uç), yüzlerce Ω ile birkaç kΩ ya da daha fazlası (hiç — çok sayıda cihaz ya da görünen bias dirençleri değeri 1 kΩ civarına çeker), 40 Ω ya da daha az (fazla). RC sonlandırma (1 nF + 120 Ω) DC’de görünmez ve «hiç» olarak okunur",
        "Besleme açık: A–SG ve B–SG −7 ile +12 V içinde",
        "Nerede bozulduğunu görmek için cihazları tek tek geri ekleyin; tüm slave adreslerini listeleyin",
      ],
    },
    "r-rs485-device": {
      title: "Tek cihazla bile çalışmıyor — cihaz ayarları, iletişim portu ya da dönüştürücü",
      causes: [
        "Cihaz ayarları kaydedilmemiş ya da ancak yeniden başlatmadan sonra geçerli oluyor",
        "İletişim bir opsiyon kartında ya da ayrı klemenslerde veya bir 2 telli/4 telli mod ayarı var",
        "Dönüştürücü arızalı ya da RS-485 yerine RS-422/RS-232 klemenslerine bağlanmış",
      ],
      checks: [
        "Dönüştürücüyü tek başına Port Inspector’ın 2 telli RS-485 yankı testiyle deneyin",
        "Aynı cihazı başka bir dönüştürücü ya da PC ile deneyin",
        "İletişim klemens numaralarını ve yeni ayarların ne zaman geçerli olduğunu cihaz kılavuzunda bulun",
      ],
    },
    "r-rs485-signal": {
      title: "Sinyal kalitesi — yansımalar, gürültü, uzunluk",
      causes: [
        "Sonlandırma yok ya da yalnızca bir uçta — uzun ve hızlı hatlarda yansımalar",
        "Kablo baud hızına göre fazla uzun (kabaca baud × metre ≤ 10^8)",
        "Bükümlü çift değil, güç kablolarının yanından geçiyor ya da ekran topraklanmamış",
      ],
      checks: [
        "Besleme kesik: A–B yaklaşık 60 Ω",
        "A–SG ve B–SG ortak mod −7 ile +12 V içinde, motorlar çalışırken de",
        "Bu baud hızı için uzunluk sınırını RS-485 hesaplayıcısında kontrol edin",
      ],
    },
    "r-rs485-framing": {
      title: "Çerçeveler kaymış — ayarlar, yankı ya da bölünme",
      causes: [
        "Baud ya da parite biraz farklı (bazı baytlar yine doğru görünebilir)",
        "2 telli bir dönüştürücü isteği yankılıyor ve bu, yanıtın önünde görünüyor",
        "USB gecikmesi tek bir yanıtı ikiye bölüyor ve alıcı onları ayrı ayrı çözümlüyor",
      ],
      checks: [
        "Alınan baytları Modbus çerçeve çözücüye yapıştırıp adresi, fonksiyonu ve CRC’yi kontrol edin",
        "Dönüştürücü yankısını ve FTDI gecikme zamanlayıcısını Port Inspector’da kontrol edin",
      ],
    },
    "r-rs485-timing": {
      title: "Zamanlama fazla sıkı — zaman aşımı, yoklama aralığı, USB gecikmesi",
      causes: [
        "Zaman aşımı cihazın yanıt süresinden kısa (sürücüler ve sayaçlar onlarca ile yüzlerce ms sürebilir)",
        "Sonraki istek çok erken gönderiliyor ve önceki yanıtla çakışıyor",
        "USB dönüştürücünün gecikme zamanlayıcısı (FTDI varsayılanı 16 ms) her kısa çerçeveye eklenir",
      ],
      checks: [
        "İstek/yanıt süresini ve en kısa zaman aşımını seri haberleşme zamanlama hesaplayıcısıyla bulun",
        "Gecikme zamanlayıcısı değerini Port Inspector ile okuyun",
      ],
    },
    "r-rs485-idle": {
      title: "Hat boştayken yüzüyor ya da yanıtlar çakışıyor — bias ya da adresler",
      causes: [
        "Bias (failsafe) dirençleri yok; boştaki gürültü bayt olarak okunuyor",
        "Aynı adresli iki cihaz zaman zaman çakışıyor",
        "Gürültü yalnızca motorlar ya da sürücüler çalışırken (ekran, toprak)",
      ],
      checks: [
        "Besleme açık, yoklama durdurulmuş: B–A diferansiyeli +200 mV ya da daha fazla",
        "Çakışmaları görmek için tüm cihazları ve adresleri bir sistem şemasında listeleyin",
        "Yanıtların kaybolduğu zamanları motorların çalıştığı zamanlarla karşılaştırın",
      ],
    },
    // ② RS-232
    "rs232-seen": { q: "COM portu PC’nin Aygıt Yöneticisi’nde görünüyor mu?", hint: "USB-RS232 dönüştürücüde «Hayır» dönüştürücü tanıma koluyla devam eder" },
    "rs232-loop": { q: "PC tarafındaki DB9’un 2. (RXD) ve 3. (TXD) pinleri birbirine bağlıyken (geri döngü) gönderilen karakterler geri geliyor mu?" },
    "rs232-cross": { q: "Cihazın TX’i PC’nin RX’ine (2. pin), PC’nin TX’i (3. pin) cihazın RX’ine çapraz bağlı mı?", hint: "Emin değil misiniz? Nasıl kontrol edileceğini görmek için «Hayır»ı seçin" },
    "rs232-flow": { q: "Akış denetimi hem programda hem cihazda «Yok» olarak mı ayarlı?" },
    "r-rs232-pc": {
      title: "PC portunda ya da dönüştürücüde takılıyor",
      causes: ["Başka bir program portu tutuyor ya da yanlış COM numarası açık", "Dönüştürücü ya da port arızası, sürücü sorunu", "Yanlış pinler birleştirilmiş (geri döngü 2–3 pinleridir)"],
      checks: ["Boştayken 3. pin (TXD) ile 5. pin (GND) arası −5 ile −15 V okunur (−3 ile −5 V zayıftır — bakmaya değer)", "Port Inspector’ın geri döngü testini çalıştırın ve her baud hızında baytların geri geldiğini kontrol edin"],
    },
    "r-rs232-cross": {
      title: "TX, TX’e bağlanmış olabilir — çapraz ya da düz kablo",
      causes: ["PC ve cihazın ikisi de DTE ama düz kablo (TX–TX) kullanılıyor — null modem (çapraz) kablo gerekir", "Ya da cihaz DCE ve çapraz kablo kullanılıyor"],
      checks: ["Her konnektörde boştayken −5 ile −15 V (zayıfsa −3 ile −5 V) gösteren pin o tarafın TX’idir — iki TX pini aynı teli paylaşıyorsa çakışıyorlardır", "Kablo boyunca süreklilik (continuity) moduyla 2↔3’ün çaprazlanıp çaprazlanmadığına bakın"],
    },
    "r-rs232-flow": {
      title: "Akış denetimi uyuşmuyor",
      causes: ["Donanımsal akış denetimi (RTS/CTS) açık ama CTS bağlı değil; PC sonsuza dek bekliyor", "Cihaz DTR/DSR’nin etkin olmasını istiyor ama yalnızca 3 telli kablo kullanılıyor"],
      checks: ["Programda akış denetimini «Yok» yapıp yeniden test edin", "Cihaz el sıkışma istiyorsa konnektörün içinde RTS–CTS (7–8) ve DTR–DSR–DCD (4–6–1) köprüleyin ya da tam el sıkışmalı kablo kullanın"],
    },
    "r-rs232-settings": {
      title: "Bağlantı doğru görünüyor — ayarlar, komut biçimi ya da sinyal seviyesi",
      causes: ["Baud, veri bitleri, parite ya da stop bitleri farklı", "Satır sonu (CR, LF, CR LF) ya da sağlama toplamı cihazın beklediğinden farklı", "Cihaz portu RS-232 değil, TTL (3,3/5 V) UART"],
      checks: ["Cihazın TX’i boştayken +3,3 ya da +5 V’taysa TTL’dir — doğrudan bir RS-232 portuna bağlamayın", "HEX olarak gönderip alın; satır sonlarını ve sağlama toplamlarını bayt bayt karşılaştırın"],
    },
    // ③ Modbus TCP · Ethernet
    "tcp-ping": { q: "Cihaz PC’den gelen ping’e yanıt veriyor mu?" },
    "tcp-subnet": { q: "PC ve cihaz IP’leri aynı alt ağda mı? (ör. 192.168.0.10/24 ve 192.168.0.50)" },
    "tcp-link": { q: "PC ve cihazın (ya da switch’in) LAN portlarındaki bağlantı (link) LED’leri yanıyor mu?" },
    "tcp-502": { q: "502 numaralı porta (ya da kılavuzdaki porta) TCP bağlantısı açabiliyor musunuz?", hint: "PortDock TCP ile ya da PowerShell’de Test-NetConnection <IP> -Port 502 ile bağlanmayı deneyin" },
    "tcp-reply": { q: "Bağlandıktan sonra isteğe yanıt geliyor mu?" },
    "tcp-exception": { q: "Yanıt bir istisna mı (fonksiyon kodu + 0x80, ör. 83 02)?", hint: "«Hayır» = yanıtlar geliyor ama değerler yanlış görünüyor" },
    "r-tcp-subnet": {
      title: "Farklı IP alt ağları",
      causes: ["Ağ kısımları farklı; ağ geçidi olmadan birbirlerine ulaşamazlar", "Cihazın IP’si bilinmiyor (fabrika varsayılanı ya da DHCP)"],
      checks: ["Aynı alt ağda olup olmadıklarını görmek için iki IP’yi ve maskeyi alt ağ hesaplayıcısına girin", "PC adaptörüne cihazın alt ağından ikinci bir IP ekleyin (ör. 192.168.0.200/24)", "IP bilinmiyorsa Net Scan ile bulun"],
    },
    "r-tcp-link": {
      title: "Fiziksel bağlantı yok — kablo, port ya da switch",
      causes: ["Kopuk kablo ya da konnektör veya başka bir porta takılı", "Switch beslemesi ya da portu kapalı veya cihazın LAN portu devre dışı"],
      checks: ["Kabloyu ve switch portunu değiştirin", "Bağlantıyı, hızı ve dupleks modunu Port Inspector’ın «Read adapters» (adaptörleri oku) işleviyle okuyun"],
    },
    "r-tcp-noping": {
      title: "Bağlantı var ama ping yok",
      causes: ["Cihaz ping’e (ICMP) yanıt vermeyecek şekilde ayarlı — 502 bağlantısını doğrudan test edin", "İki cihaz aynı IP’yi paylaşıyor (adres çakışması)", "Başka bir PC adaptörü (ör. Wi-Fi) aynı alt ağda ve trafik oradan çıkıyor; güvenlik duvarı"],
      checks: ["Cihazı çıkarıp ping atın — yanıt geliyorsa o IP başka bir cihazdadır", "Alt ağı Net Scan ile IP ve MAC’ler için tarayın; çakışan IP’leri bir sistem şemasında kontrol edin", "Diğer adaptörleri geçici olarak devre dışı bırakıp yeniden deneyin"],
    },
    "r-tcp-port": {
      title: "Ping çalışıyor ama 502 portu reddediyor",
      causes: ["Cihazda Modbus TCP devre dışı ya da bir seçenek (ayrı kart veya lisans)", "Port 502 değil", "Bağlantı sınırı dolu (SCADA ya da HMI zaten bağlı)"],
      checks: ["Kılavuzda Modbus TCP ayarını, portu ve en çok bağlantı sayısını kontrol edin", "Diğer istemcileri kısa süre ayırıp yeniden bağlanın"],
    },
    "r-tcp-unitid": {
      title: "Bağlı ama yanıt yok — Unit ID ya da ağ geçidi",
      causes: [
        "Yanlış Unit ID — bir ağ geçidinin arkasında RTU slave adresine eşit olmalı; doğrudan bağlı cihazlarda kılavuzdaki değeri kullanın (1 ya da 255 yaygındır)",
        "Ağ geçidinin RTU tarafı (baud, bağlantı) çalışmıyor — isteği düşürüyor ya da 0B istisnasını döndürüyor",
        "Cihazın desteklemediği bir fonksiyon kodu",
      ],
      checks: ["MBAP’ı ve Unit ID’yi görmek için alışverişteki baytları Modbus çerçeve çözücüde çözün", "Wireshark ya da pktmon ile yakalayın; yanıtları ve zamanlamayı pcap çözümleyiciyle kontrol edin"],
    },
    "r-tcp-exception": {
      title: "Cihaz istisnayla yanıt veriyor — adres, fonksiyon ya da adet",
      causes: ["İstisna 02: böyle bir adres yok — 40001 yazımı 0 tabanlı adrese dönüştürülmemiş (bir kayma)", "İstisna 01: fonksiyon desteklenmiyor (ör. input register’ları 03 ile okumak)", "İstisna 03: adet 125’ten ya da cihaz sınırından fazla"],
      checks: ["İstisnanın anlamı için yanıtı Modbus çerçeve çözücüye yapıştırın", "Register haritasının 0 tabanlı mı 1 tabanlı mı adres kullandığını kontrol edin"],
    },
    "r-tcp-values": {
      title: "İletişim çalışıyor ama değerler yanlış görünüyor — biçim, sıra ya da ölçek",
      causes: ["32 bitlik değerlerin (float, int32) word sırası farklı (ABCD, CDAB …)", "Ölçek (×0,1, ×0,01), işaret (int16/uint16) ya da CT oranı uygulanmamış", "Adres bir kaymış (0 tabanlı ile 1 tabanlı)"],
      checks: ["İki register’ı Modbus float dönüştürücüye koyup dört sıralamanın hepsini karşılaştırın", "İşaretli ve işaretsiz değerleri tam sayı dönüştürücüyle karşılaştırın"],
    },
    // ④ USB-seri dönüştürücü
    "usb-sound": { q: "Dönüştürücüyü taktığınızda Windows bağlanma sesini çalıyor mu ya da Aygıt Yöneticisi değişiyor mu?" },
    "usb-com": { q: "«Bağlantı noktaları (COM ve LPT)» altında bir COM numarasıyla görünüyor mu?", hint: "«Hayır» = «Diğer aygıtlar» altında, uyarı işaretiyle ya da bilinmeyen aygıt olarak görünüyor" },
    "usb-drops": { q: "Kullanım sırasında kopuyor mu (port kaybolup geri geliyor)?" },
    "usb-motor": { q: "Motorlar, sürücüler ya da kaynak makineleri gibi büyük yükler çalışırken veya devreye girerken kopuyor mu?" },
    "usb-comnum": { q: "COM numarası her takışta değişiyor mu ya da COM15 gibi yüksek bir numaraya mı atlıyor?", hint: "«Hayır» = tanınıyor ve bağlanıyor ama iletişim yavaş ya da yanıtlar bölünüyor" },
    "r-usb-none": {
      title: "USB cihazı olarak hiç görünmüyor — kablo, port ya da dönüştürücü",
      causes: ["Yalnızca şarj için USB kablosu (veri telleri yok)", "Ön panel portu ya da hub bağlantısı veya besleme sorunu", "Dönüştürücü arızası"],
      checks: ["Hub olmadan doğrudan arka porta, başka bir kabloyla takın", "Başka bir PC’nin aynı davranıp davranmadığına bakın", "Takmanın Hardware Tester’ın USB bağlanma/kopma kaydına düşüp düşmediğini kontrol edin (0.10.0’dan itibaren)"],
    },
    "r-usb-driver": {
      title: "Sürücü yok ya da cihaz başlatılamıyor",
      causes: ["Çip için sürücü kurulmamış (FTDI, CH34x, CP210x, PL2303)", "Sürücü çipi reddediyor (kod 10 vb.) — eski PL2303 parçalarında yaygın"],
      checks: ["VID:PID’yi, çip adını ve sorun kodunu anlamıyla birlikte Port Inspector’da okuyun", "Çip üreticisinin sitesindeki sürücüyü kullanın (yönetici hakkı gerekiyorsa BT birimine sorun)"],
    },
    "r-usb-emi": {
      title: "USB’ye gürültü ya da toprak farkı giriyor",
      causes: ["Yalıtımsız dönüştürücüde cihaz ile PC toprağı arasındaki potansiyel farkı USB’yi sıfırlıyor", "İletişim ya da USB kablosu güç kablolarının yanından geçiyor"],
      checks: ["PC USB gövdesi ile cihaz SG/PE’si arasındaki gerilim (V⎓ ve V~): 1 V’un altı olağandır; 7 V ya da fazlası sorundur", "Yalıtımlı bir dönüştürücü, daha kısa bir USB kablosu ya da ferrit nüveler deneyin", "Hardware Tester’ın USB kopma zamanlarını motorların çalıştığı zamanlarla karşılaştırın (0.10.0’dan itibaren)"],
    },
    "r-usb-power": {
      title: "Güç tasarrufu, besleme ya da temas",
      causes: ["USB seçici askıya alma ya da «Güç tasarrufu için bilgisayarın bu aygıtı kapatmasına izin ver»", "Gücü yetmeyen bus beslemeli bir hub ya da gevşek konnektör"],
      checks: ["Güç tasarrufu ayarlarını ve son takma geçmişini Port Inspector ile okuyun (salt okunur — değişikliği Windows’ta kendiniz yapın)", "Kabloyu oynatınca kopma olup olmadığına bakın"],
    },
    "r-usb-comnum": {
      title: "COM numarası değişiyor — port konumu, seri numarası, ayrılmış numaralar",
      causes: ["Seri numarası olmayan çipler (CH34x vb.) her USB portunda yeni numara alır", "Önceden bağlanmış cihazlar numaraları ayrılmış tutar (ComDB)"],
      checks: ["Her zaman aynı USB portunu kullanın", "Port Inspector’da COM numarası ayırmalarına bakın", "PortDock Serial, numarası değişse bile aynı cihazı yeniden açar"],
    },
    "r-usb-latency": {
      title: "Bağlı ama yavaş ya da yanıtlar bölünüyor — USB gecikmesi",
      causes: ["FTDI gecikme zamanlayıcısı (varsayılan 16 ms) her kısa çerçeveye gecikme ekler", "Program her parçayı ayrı bir yanıt sayıyor", "Hiç iletişim yoksa RS-485 ya da RS-232 koluyla devam edin"],
      checks: ["Gecikme zamanlayıcısını ve geri döngü gidiş-dönüş süresini Port Inspector’da kontrol edin", "Seri haberleşme zamanlama hesaplayıcısının verdiği beklenen yanıt süresiyle karşılaştırın"],
    },
    // ⑤ 4-20 mA
    "ma-kind": { q: "Değer nasıl yanlış görünüyor?", opts: ["0’da (ya da en küçükte) takılı", "En büyükte takılı", "Dalgalanıyor ya da sıçrıyor", "Değişiyor ama gerçekle uyuşmuyor"] },
    "ma-flow": { q: "Döngüye seri bağlı bir multimetreyle (mA) 3,6 mA’den fazla akım akıyor mu?" },
    "ma-volt": { q: "Transmitterin + ve − klemensleri arasında gerilim (genellikle 10 V ya da daha fazla) var mı?" },
    "ma-high": { q: "Ölçülen akım 21 mA ya da daha fazla mı?" },
    "ma-motor": { q: "Motorlar ya da sürücüler çalışırken dalgalanma artıyor mu?" },
    "ma-loopv": { q: "20 mA civarında transmitter klemens gerilimi hâlâ kılavuzundaki en düşük çalışma geriliminin üstünde mi?" },
    "r-ma-open": {
      title: "Döngüde ne akım ne gerilim var — açık devre ya da besleme",
      causes: ["Kopuk tel, gevşek klemens ya da sigorta", "Döngü beslemesi (24 V) kapalı ya da başka yere bağlı", "4 telli (ayrı beslemeli) bir transmitter 2 telli gibi bağlanmış; beslemesi yok"],
      checks: ["24 V’u önce güç kaynağında, sonra transmitterde ölçerek nerede kaybolduğunu bulun", "Gerçek bağlantıyı 2/3/4 telli çizimlerle karşılaştırın"],
    },
    "r-ma-tx": {
      title: "Gerilim var ama akım yok — transmitter ya da kutup",
      causes: ["2 telli bağlantıda kutup ters (+ ile − yer değiştirmiş)", "Alıcı giriş gerilim moduna ayarlı; döngü fiilen açık", "Transmitter arızası"],
      checks: ["Transmitterin + ve − uçlarını kılavuz çizimine göre yeniden kontrol edin", "Giriş kartı kanal tipini (akım/gerilim) ayarından ya da köprüsünden kontrol edin"],
    },
    "r-ma-input": {
      title: "Akım akıyor ama değer 0 — alıcı tarafın ayarı ya da ölçek",
      causes: ["Giriş aralığı farklı ayarlanmış (0–20 mA, 1–5 V, 0–10 V)", "Başka bir kanala bakılıyor ya da ölçekleme 0’a ayarlı", "3,6 mA ve altında transmitter bir NE 43 arızası bildiriyor (3,6–3,8 mA arıza sinyali değil, aralık altıdır)"],
      checks: ["% değeri ve NE 43 bölgesi için ölçülen mA’i multimetre denetleyicisine girin", "4-20 mA hesaplayıcısındaki beklenen ham değerle (ör. 0–27648) karşılaştırın"],
    },
    "r-ma-fault-high": {
      title: "21 mA ya da daha fazla — arıza sinyali ya da kısa devre",
      causes: ["Transmitter NE 43 üst arıza sinyalini veriyor (ör. kopuk sensör)", "25 mA’in çok üstünde: besleme transmitteri atlıyor (kısa devre)"],
      checks: ["Transmitterin ekranını ya da tanı bilgilerini kontrol edin", "Açık devre için sensörün (ör. Pt100) direncini ölçün"],
    },
    "r-ma-over": {
      title: "En büyükte takılı — aralık ayarı ya da gerçek değer",
      causes: ["PLC ölçekleme aralığı transmitter aralığından dar", "Proses değeri transmitter aralığını aşıyor (ör. 0–10 bar)", "Birim karışıklığı (bar, psi, kPa)"],
      checks: ["Ölçülen mA’den %’yi hesaplayıp PLC değeriyle karşılaştırın", "Aralığı transmitter etiketinden ya da ayarlarından kontrol edin"],
    },
    "r-ma-noise": {
      title: "Gürültü — ekran, toprak ya da kablo güzergâhı",
      causes: ["Sinyal kablosu güç kablolarıyla aynı kanalı paylaşıyor", "Ekran iki uçtan topraklanmış ve toprak döngüsü oluşmuş (genellikle yalnızca tek uç)", "Transmitter ile PLC arasında toprak potansiyeli farkı"],
      checks: ["İki toprak arasındaki gerilimi ölçün (1 V’un altı olağandır)", "Salınımı mA olarak kaydedin; bir sinyal izolatörü düşünün", "Dalgalanmayı giriş filtresi zaman sabitiyle (RC filtre) azaltın"],
    },
    "r-ma-loadv": {
      title: "Döngü gerilimi çok düşük — yük direnci ya da besleme düşümü",
      causes: ["Döngüde çok fazla alıcı, gösterge ya da bariyer var", "Uzun ya da ince kablolama, 24 V besleme düşümü"],
      checks: ["20 mA’de (ya da 21 mA’de) transmitter gerilimi için döngü yükü hesaplayıcısını kullanın", "24 V beslemeyi yük altında ölçün (%5 ya da daha az düşüm rahattır)"],
    },
    "r-ma-process": {
      title: "Bağlantı ve gerilim düzgün görünüyor — gerçek proses değişimi ya da sönümleme",
      causes: ["Proses değeri gerçekten dalgalanıyor (pompa titreşimi vb.)", "Transmitter sönümlemesi ya da PLC giriş filtresi kısa"],
      checks: ["Değeri bir zaman grafiğine kaydedip periyodik desenlere bakın", "Transmitterin sönümleme (damping) ayarını kontrol edin"],
    },
    "r-ma-scale": {
      title: "Değer gerçekle uyuşmuyor — ölçekleme, birimler ya da ham değerler",
      causes: ["Mühendislik aralığı (alt/üst) transmitter ayarından farklı", "Yanlış PLC ham değer aralığı (0–27648, 0–4000, 0–32000)", "Birim karışıklığı (bar/psi, gösterge/mutlak)"],
      checks: ["Ölçülen mA’i 4-20 mA hesaplayıcısına girip beklenen değer ve ham değerle karşılaştırın", "PLC değerinin 4, 12 ve 20 mA’de orantılı olduğunu kontrol edin"],
    },
    // ⑥ NPN/PNP sensör
    "sn-kind": { q: "Belirti nedir?", opts: ["Giriş hiç AÇIK olmuyor", "Giriş hiç KAPALI olmuyor (hep AÇIK)"] },
    "sn-led": { q: "Hedef varken sensörün kendi gösterge LED’i yanıyor mu?" },
    "sn-power": { q: "Sensörün kahverengi (+) ile mavi (0 V) teli arasındaki gerilim besleme gerilimine (genellikle 24 V) yakın mı?" },
    "sn-type": { q: "Sensör tipi ile PLC giriş COM’u uyuşuyor mu — NPN için giriş COM’u +24 V’a, PNP için 0 V’a?", hint: "Emin değil misiniz? «Hayır»ı seçin" },
    "sn-vin": { q: "Sensör açıkken PLC giriş klemensi ile giriş COM’u arasında 15 V ya da daha fazla var mı?" },
    "sn-plcled": { q: "O anda PLC giriş LED’i yanıyor mu?" },
    "r-sn-power": {
      title: "Sensörde besleme yok",
      causes: ["Kopuk besleme teli, konnektör teması ya da sigorta", "Tel renkleri gelenekten farklı (kahverengi +, mavi 0 V, siyah çıkış)", "Uzaktaki bir sensöre giden gerilimde düşüm"],
      checks: ["Yükler açıkken sensördeki besleme gerilimini ölçün — %15’ten fazla düşüm sorundur", "Tel renklerini ve besleme aralığını sensörün veri sayfasında kontrol edin"],
    },
    "r-sn-sense": {
      title: "Beslemesi var ama algılamıyor — sensör ayarı ya da hedef",
      causes: ["Algılama mesafesi ya da hassasiyet, hedef malzeme (yaklaşım sensörü mesafesi metal türüne bağlıdır)", "Fotoelektrik sensör hizasız ya da merceği kirli", "Sensör arızası"],
      checks: ["LED’in hangi mesafede yandığını görmek için hedefi yaklaştırın", "Aynı tipte bir sensörle değiştirin"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP ile giriş COM kutbu uyuşmuyor olabilir",
      causes: ["NPN sensör ve giriş COM’u 0 V’ta (ya da PNP ve +24 V) — akımın yolu yok", "Üreticiler «sink/source»u birbirinin tersi anlamda kullanır"],
      checks: ["Sensör açıkken siyah–mavi NPN’de 0 V’a, PNP’de besleme gerilimine yakın okunur", "COM’un nereye bağlandığını PLC kılavuzunun giriş bağlantı şeklinde kontrol edin"],
    },
    "r-sn-wire": {
      title: "Sensör açılıyor ama girişe gerilim ulaşmıyor — bağlantı",
      causes: ["Çıkış teli başka bir girişe bağlanmış ya da ara bir klemens bloğunda kopuk", "Giriş COM teli eksik", "Sensörün artık gerilimi yüksek ya da çıkış akımı giriş için yetersiz"],
      checks: ["Siyah–mavi gerilimini sensör açıkken ve kapalıyken ölçüp ikisini de denetleyiciye girin", "PLC girişi ile COM arası: AÇIK 15 V ya da daha fazla (tip 1), KAPALI 5 V ya da daha az"],
    },
    "r-sn-input": {
      title: "Gerilim ulaşıyor ama PLC AÇIK okumuyor — giriş kartı",
      causes: ["Giriş kartının beslemesi ya da arızası veya başka bir yuvaya bakılıyor", "Giriş gerilimi eşiğe yakın (11–15 V) — tip 1 bir giriş kapalı kalabilir"],
      checks: ["Sensörü komşu bir kanala taşıyın", "AÇIK gerilimini ve akımını giriş kartının kılavuzunda kontrol edin"],
    },
    "r-sn-program": {
      title: "Giriş açılıyor — adres, filtre ya da darbe uzunluğu",
      causes: ["Program başka bir giriş adresini okuyor (X numaralandırmasında sekizli ile onaltılı)", "Sinyal giriş filtresi süresinden kısa (hızlı hareket eden hedef)", "İletişim üzerinden okunuyorsa bit adresi hesabı kaymış"],
      checks: ["O giriş bitini PLC izleme ekranında doğrudan izleyin", "MC protokolünde cihaz numarası yazımını kontrol edin"],
    },
    "r-sn-stuck": {
      title: "Giriş hiç kapanmıyor — kaçak akım, kısa devre ya da çıkış modu",
      causes: ["2 telli bir sensörün KAPALI durumdaki kaçak akımı girişi açık tutuyor", "Çıkış teli +24 V’a (PNP) ya da 0 V’a (NPN) kısa devre", "Sensör çıkış modu (NO/NC, ışıkta açık/karanlıkta açık) ters"],
      checks: ["Sensör kapalıyken PLC girişi ile COM arası 5 V ya da daha az olmalı", "Çıkış teli sökülünce girişin kapanıp kapanmadığına bakın"],
    },
    // ⑦ MC protokolü
    "mc-ping": { q: "PLC, PC’den gelen ping’e yanıt veriyor mu?", hint: "«Hayır» Ethernet koluyla (IP alt ağı) devam eder" },
    "mc-port": { q: "PLC Ethernet ayarlarında bir MC protokolü (SLMP) bağlantısı açılmış mı ve port numarası, TCP/UDP ve binary/ASCII programla uyuşuyor mu?" },
    "mc-endcode": { q: "Yanıttaki bitiş kodu sıfırdan farklı mı (ör. C059)?" },
    "mc-noreply": { q: "Bağlantı açık ama hiç yanıt gelmiyor mu (zaman aşımı)?", hint: "«Hayır» = yanıtlar geliyor ama değerler yanlış görünüyor" },
    "r-mc-port": {
      title: "PLC’deki MC protokolü bağlantı ayarları",
      causes: ["MC protokolü (SLMP) bağlantısı yapılandırılmamış ya da ayarlar PLC’ye yazılıp yeniden başlatılmamış", "Port numarası, TCP/UDP ya da kod (binary/ASCII) programdan farklı", "Aynı TCP bağlantısını başka bir program zaten kullanıyor"],
      checks: ["Önce program tarafını PLC olmadan, 127.0.0.1’deki PortDock PLC Simulator’a karşı test edin", "Mühendislik aracının Ethernet ayarlarını program değerlerinin yanına yazıp karşılaştırın"],
    },
    "r-mc-endcode": {
      title: "PLC isteği bir bitiş koduyla reddediyor",
      causes: ["Komut ya da alt komut PLC modelinde desteklenmiyor", "Cihaz kodu ya da numarası aralık dışında veya nokta sayısı fazla", "RUN sırasında yazma koruması gibi PLC tarafı ayarlar"],
      checks: ["Bitiş kodunun anlamı için yanıtı MC protokolü çözücüye yapıştırın", "Bitiş kodları kılavuzundaki kontrol sırasını izleyin"],
    },
    "r-mc-frame": {
      title: "Çerçeve biçimi uyuşmuyor, bu yüzden PLC sessiz kalıyor",
      causes: ["3E/4E çerçeve ya da binary/ASCII PLC ayarından farklı", "Başlık değerleri (ağ no., PC no., hedef modül) ya da veri uzunluğu yanlış", "PLC TCP beklerken UDP kullanılıyor (ya da tersi)"],
      checks: ["Gönderilen baytları MC protokolü çözücüde alan alan çözün", "Wireshark ya da pktmon ile yakalayıp istek/yanıt çiftlerini pcap çözümleyicide kontrol edin"],
    },
    "r-mc-values": {
      title: "Yanıtlar geliyor ama değerler yanlış görünüyor — cihaz numaraları ya da birimler",
      causes: ["X ve Y onaltılıdır ama ondalık girilmiş", "Bit birimli ile word birimli okuma karışıklığı", "32 bitlik değerlerin word sırası ya da işareti"],
      checks: ["Cihaz numaraları kılavuzundaki yazım tablosuyla karşılaştırın", "İşareti ve HEX’i tam sayı dönüştürücüde karşılaştırın"],
    },
    // ⑧ PC USB kopmaları
    "pu-know": { q: "Hangi cihazın koptuğunu biliyor musunuz?", hint: "Yalnızca bağlanma/kopma sesinin tekrarlandığını duyuyorsanız «Hayır»ı seçin" },
    "pu-port": { q: "Başka bir USB portunda (arka panel, hub yok) da kopuyor mu?" },
    "pu-cable": { q: "Başka bir kabloyla da kopuyor mu?" },
    "pu-suspend": { q: "USB güç tasarrufunu (seçici askıya alma, «kapatmaya izin ver») kapatmak kopmaları azaltıyor mu?", hint: "PortDock bunları yalnızca okur — değişikliği Windows ayarlarında kendiniz yapın" },
    "r-pu-find": {
      title: "Önce hangi cihazın koptuğunu bulun",
      causes: ["Henüz bilinmiyor — fare, klavye, kablosuz alıcı (dongle), kamera, USB-seri dönüştürücü ya da hub olabilir"],
      checks: ["Saatler, cihaz adı ve VID:PID için Hardware Tester’ın USB bağlanma/kopma kaydını kullanın (0.10.0’dan itibaren)", "10 dakikada 3 ya da daha fazla kopan bir cihaz «suspected repeated drops» (tekrarlayan kopma şüphesi) olarak işaretlenir — sonra o cihaz için bu kolu yeniden izleyin"],
    },
    "r-pu-port": {
      title: "İlk port ya da hub",
      causes: ["Ön panel portunun iç kablosu ya da teması", "Gücü yetmeyen bus beslemeli hub"],
      checks: ["Arka portu ya da kendi beslemesi olan bir hub kullanın", "Port değiştirdikten sonra kopmaların durduğunu Hardware Tester’ın USB bağlanma/kopma kaydıyla doğrulayın (0.10.0’dan itibaren)"],
    },
    "r-pu-cable": {
      title: "Kablo ya da konnektör",
      causes: ["Kablonun içinde kopukluk (oynatınca kopuyor), gevşek konnektör", "USB kablosu ya da uzatma kablosu çok uzun"],
      checks: ["Kısa ve kaliteli bir kablo kullanın"],
    },
    "r-pu-suspend": {
      title: "USB güç tasarrufu cihazı kapatıyor",
      causes: ["USB seçici askıya alma, cihazda ya da hub’da «bilgisayarın kapatmasına izin ver»"],
      checks: ["USB seçici askıya almayı Port Inspector’ın «Read this PC's settings» (bu PC’nin ayarlarını oku) işleviyle okuyun", "Bir ekipman PC’sindeyse güç planının uyku ayarlarını da gözden geçirin"],
    },
    "r-pu-device": {
      title: "Cihaz, sürücü ya da çevre",
      causes: ["Cihazın kendisi ya da sürücüsü", "USB 2.0 hızında çalışan bir USB 3 cihazı (kablo ya da port sorununun işareti)", "Kablosuz alıcılarda USB 3.0 portlarının yakınındaki 2,4 GHz girişimi", "Ekipman toprak farkı ya da gürültü (endüstriyel sahalar)"],
      checks: ["Başka bir PC’de de kopup kopmadığına bakın", "Hardware Tester’ın USB hızı için «Worth a look» (bakmaya değer) işaretlerine bakın (0.10.0’dan itibaren)", "PC ile ekipman toprağı arasındaki gerilimi ölçün"],
    },
  },
} satisfies TreeText;
