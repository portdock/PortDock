// 튀르키예어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Tr<K extends string> = Partial<Record<K, string>>;

export const TR_SETTINGS: Tr<SettingsTextKey> = {
  title: "Ayarlar",
  lang: "Dil",
  theme: "Tema",
  system: "Windows'u izle",
  light: "Açık",
  dark: "Koyu",
  fontSize: "Yazı boyutu (px)",
  timeFormat: "Günlük zaman damgası",
  local: "hh:mm:ss.ms",
  localDate: "Tarih + saat",
  utc: "UTC",
  elapsed: "Başlangıçtan geçen süre (Temizle sıfırlar)",
  maxLines: "Ekranda tutulan satır",
  maxLinesHint: "Eski satırlar yalnızca ekrandan atılır (dosya kayıtları her şeyi tutar).",
  autoScroll: "Yeni satırlarda otomatik kaydır (yukarı kaydırınca durur)",
  alwaysOnTop: "Her zaman üstte — bu pencereyi diğerlerinin üstünde tut (başlıkta 📌)",
  expandAll: "Tümünü aç (uzman görünümü) — daraltılmış grupları (gelişmiş bağlantı, alım ayarları, hata enjeksiyonu, istatistikler …) hep açık göster",
  autoLog: "Bağlanınca dosya kaydını başlat",
  logFolder: "Otomatik kayıt klasörü",
  choose: "Seç",
  noFolder: "Bir klasör seçin",
  confirmExit: "Bağlıyken veya kayıt sürerken kapatmadan önce sor",
  lostAlert: "Bağlantı kopunca görev çubuğu düğmesini yak-söndür (pencere arka plandayken)",
  keepAwake: "Bağlıyken veya kayıt sürerken PC'yi uyanık tut (ekran yine kapanabilir)",
  autoConnect: "Açılışta son bağlantıyı yeniden aç",
  autoReport: "Otomatik hata raporları",
  arAsk: "Çökmeden sonra sor",
  arOn: "Otomatik gönder",
  arOff: "Hiç gönderme",
  autoReportHint: "Yalnızca program hatalarının nedenini (istisnalar, çökmeler) ve program/Windows sürümünü gönderir. Trafik, komutlar, kurallar ve IP ayarları asla gönderilmez. Çevrimdışı PC'ler bir dahaki sefere yeniden dener.",
  backup: "Yedek",
  exportAll: "Ayarları dışa aktar",
  importAll: "Ayarları içe aktar",
  reset: "Varsayılana döndür",
  resetAsk: "Görünüm ayarları varsayılana döndürülsün mü? (komutlar ve kurallar korunur)",
  importAsk: "İçe aktarma tüm mevcut ayarları, komutları ve kuralları değiştirir. Devam edilsin mi?",
  importBusy: "İçe aktarmadan önce bağlantıyı ve kaydı durdurun.",
  noFolderWarn: "Klasör seçilene kadar otomatik kayıt başlamaz.",
  close: "Kapat",
  about: "Hakkında",
  copyright: "Copyright (C) 2026 PortDock",
  gpl: "Bu program özgür yazılımdır, GNU GPL v3 ile dağıtılır. HİÇBİR GARANTİ verilmez.",
  license: "Lisans metni",
  source: "Kaynak kod",
  site: "Web sitesi",
  notices: "Üçüncü taraf bildirimleri",
  sponsor: "Destek ol",
  checkUpdate: "Güncellemeleri denetle",
  checkUpdateHint: "En son sürüm sayfasını tarayıcıda açar.",
  updateCheck: "Yeni sürümü denetle (günde bir kez)",
  updateCheckHint: "Açıkken günde bir kez GitHub'a (api.github.com) yalnızca en son sürümü sorar ve daha yeni bir sürüm varsa pencerenin altında bir bildirim gösterir. Veri gönderilmez; hiçbir şey indirilmez veya kurulmaz.",
};

export const TR_HELP_UI: Tr<HelpUiKey> = {
  title: "Yardım",
  search: "Ara…",
  close: "Kapat",
  none: "Eşleşme yok",
  enOnly: "Yardım yalnızca İngilizce (ekran Türkçe).",
};

export const TR_REPORT: Tr<ReportTextKey> = {
  button: "Sorun bildir — hataları geliştiriciye gönder",
  title: "Sorun bildir",
  intro: "Rapor bu PC'de oluşturulur ve aşağıda gösterilir. Hiçbir şey otomatik gönderilmez. İnceleyin, sonra nasıl göndereceğinizi seçin.",
  what: "Ne oldu? (ne yapıyordunuz, neye tıkladınız, beklenen ve gerçek sonuç)",
  whatPh: "ör. TCP sunucusuna üçüncü taraf bağlanınca pencere dondu.",
  env: "Program ve Windows sürümü (her zaman eklenir)",
  errors: "Bu oturumda {n} hata",
  crashes: "{n} çökme kaydı",
  dumps: "Döküm dosyası eklendi ({n} KB)",
  dumpsSend: " — «Şimdi gönder» ile yüklenir",
  dumpManual: "E-posta veya GitHub ile gönderirken döküm dosyasını kendiniz ekleyin (gönderilene veya atılana kadar tutulur): {a}",
  config: "Bağlantı ve görünüm ayarları (IP, port, baud … — komutlar ve kurallar dahil değil)",
  log: "Son {n} trafik satırı",
  logWarn: "Trafik şirket veya cihaz verisi içerebilir. Yalnızca izin veriliyorsa ekleyin.",
  preview: "Rapor önizlemesi",
  copy: "Kopyala",
  copied: "Kopyalandı",
  saveFile: "Dosyaya kaydet",
  saved: "Kaydedildi: {a}",
  email: "E-postayla gönder",
  emailHint: "E-posta programınız açılır. Uzun raporlar kesilir, bu yüzden «Dosyaya kaydet»teki dosyayı ekleyin.",
  issue: "GitHub issue aç",
  issueHint: "GitHub'da herkese açık yayımlanır (hesap gerekir). Şirket verisi içermediğinden emin olun.",
  offline: "Çevrimdışı bir PC'de «Dosyaya kaydet», USB ile taşıyıp başka bir PC'den gönderin.",
  close: "Kapat",
  crashTitle: "Program geçen sefer çöktü",
  crashBody: "{a} geçen sefer beklenmedik şekilde kapandı ve bir çökme kaydı bıraktı. Bunu geliştiriciye göndermek çok yardımcı olur.",
  crashOpen: "Raporu gör",
  crashLater: "Sonra",
  crashDiscard: "Göndermeden at",
  noTarget: "Henüz hedef ayarlanmadı. «Dosyaya kaydet»i kullanın.",
  sendNow: "Şimdi gönder",
  sendNowHint: "Yukarıdaki önizlemeyi doğrudan geliştiriciye gönderir (internet gerekir, hesap gerekmez).",
  sending: "Gönderiliyor…",
  sentOk: "Gönderildi. Teşekkürler!",
  sendFail: "Gönderilemedi (internet bağlantısını kontrol edin). «Dosyaya kaydet» ve sonra gönderin.",
  crashSend: "Şimdi gönder",
  crashAlways: "Bundan sonra sormadan otomatik gönder",
};

export const TR_AI_UI: Tr<AiUiKey> = {
  button: "AI'ya sor — yalnızca kopyalar, hiçbir şey gönderilmez: mevcut durum bir AI sohbeti için metin olarak panoya",
  title: "AI'ya sormak için kopyala",
  introLog: "Bir AI sohbeti için (soru şablonuyla) metin oluşturur: program, bağlantı ayarları, bu oturumdaki hatalar ve son trafik.",
  introChecks: "Bir AI sohbeti için (soru şablonuyla) metin oluşturur: program, bu oturumdaki hatalar ve kontrol sonuçları.",
  local: "PortDock hiçbir yere bir şey göndermez — yalnızca panoya gider.",
  warn: "Yapıştırdığınız her şey o AI hizmetine gider. Yapıştırmadan önce cihaz ve şirket bilgilerini kontrol edin.",
  hideIp: "Özel IP'leri de gizle (genel IP'ler her zaman gizlenir)",
  incLog: "Son trafiği ekle",
  incChecks: "Kontrol sonuçlarını ekle",
  incFound: "Bulunan cihazları ekle",
  introFound: "Bir AI sohbeti için (soru şablonuyla) metin oluşturur: program, bu oturumdaki hatalar ve bulunan cihazlar.",
  preview: "Yapıştırılacak metin (önizleme)",
  size: "{n} / {max} karakter",
  cut: " · {n} eski satır çıkarıldı",
  cutText: " · uzun metin kesildi",
  copy: "Kopyala",
  copied: "Kopyalandı — AI sohbetine yapıştırın (Ctrl+V) ve «Durum»u doldurun.",
  copyFail: "Kopyalanamadı — panoyu başka bir program tutuyor olabilir",
  close: "Kapat",
};

export const TR_FIRST: Tr<FirstTextKey> = {
  hide: "Bir daha gösterme",
  help: "Yardım:",
  narrow: "Pencere dar olduğu için sol panel katlandı — aşağıdaki «sol», sol üstteki «⚙ {b}» düğmesinin arkasındaki paneldir.",
  open: "Sol paneli aç",
};

export const TR_UPDATE: Tr<UpdateTextKey> = {
  msg: "{a} sürümü çıktı (sizdeki {b}).",
  open: "Sürüm sayfası",
  later: "Bu sürümü bir daha hatırlatma",
  close: "Kapat (sonraki açılışta yine gösterilir)",
};

export const TR_FILTER: Tr<FilterTextKey> = {
  find: "Bul (Ctrl+F) — 01 03 veya metin",
  auto: "Otomatik",
  hex: "HEX",
  text: "Metin",
  prev: "Önceki (Shift+Enter)",
  next: "Sonraki (Enter)",
  hitsOnly: "Yalnızca eşleşenler",
  failOnly: "Yalnızca HATA",
  all: "Tümü",
  off: "Süzgeci temizle (Esc)",
  badHex: "HEX değil",
  none: "yok",
  shown: "{a}/{b} satır",
};

export const TR_BOUNDARY: Tr<BoundaryTextKey> = {
  title: "Ekran çöktü",
  body: "Bunu geliştiriciye göndermek düzeltmeye yardımcı olur. Programı yeniden açmak çoğu zaman düzeltir.",
  report: "Sorun bildir",
  reload: "Yeniden yükle",
  resetTip: "Yeniden yükleme yine çökerse — kayıtlı ekran ayarlarını (komut listeleri ve kurallar dahil) siler",
  resetArm: "Gerçekten sıfırla — yine tıklayın",
  reset: "Ayarları sıfırla",
};

export const TR_USAGE: Partial<UsageText> = {
  title: "Kullanım istatistikleri gönderilsin mi?",
  why: "Hangi özelliklerin kullanıldığını bilmek, sırada neyin iyileştirileceğine karar vermeye yardımcı olur. Açarsanız aşağıdaki öğeler pencereyi kapatırken bir kez, anonim olarak gönderilir.",
  sendsTitle: "Gönderilenler",
  sends: ["Program adı ve sürümü, Windows sürümü (10/11), ekran dili", "Programın açık kaldığı dakika", "Her özelliğin kaç kez kullanıldığı (bağlanma, gönderme, okuma … — yalnızca sayılar)", "Kurulu veya taşınabilir sürüm"],
  neverTitle: "Asla gönderilmeyenler",
  never: ["Trafik içeriği", "IP adresleri, portlar, COM adları", "Dosya yolları", "PC, kullanıcı ve cihaz adları", "Kurulumu veya PC'yi tanımlayan herhangi bir kimlik"],
  where: "Alıcı: Aptabase (AB). Çevrimdışıysa veya gönderim başarısız olursa veri atılır. Yanıtınız bu PC'deki diğer PortDock uygulamaları için de başlangıç değeri olur (yeniden sormazlar) ve her uygulama Ayarlar'da (⚙) istediği zaman değiştirebilir.",
  yes: "Gönder",
  no: "Gönderme",
  setting: "Kullanım istatistiklerini gönder (anonim, kapatırken)",
  hint: "Yalnızca özellik kullanım sayılarını, açık kalınan dakikaları, program/Windows sürümünü, ekran dilini ve kurulu/taşınabilir sürümü gönderir. Trafik, IP adresleri, portlar, COM adları, dosya yolları ve PC/kullanıcı/cihaz adları asla gönderilmez. Alıcı: Aptabase (AB).",
};
