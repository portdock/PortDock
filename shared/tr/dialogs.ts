// 튀르키예어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Tr<K extends string> = Partial<Record<K, string>>;

export const TR_DEVICE: Tr<DeviceTextKey> = {
  masterTitle: "Cihaz profili yükle",
  slaveTitle: "Cihaz emülasyonu yükle",
  search: "Ara (üretici, model, tür)",
  none: "Eşleşen cihaz yok",
  close: "Kapat",
  cancel: "İptal",
  apply: "Yükle",
  regs: "{n} register",
  comm: "Varsayılan iletişim",
  commOpt: "Seri ayarları da uygula (baud, veri, parite, stop)",
  commNone: "Kılavuzda doğrulanmış varsayılan iletişim ayarı yok",
  gapOpt: "Küçük boşluklu register'ları tek tabloda oku (en çok {n} — cihaz kullanılmayan adresleri reddederse kapatın)",
  masterPlan: "{n} yoklama tablosu ekler (Slave ID {u}): {a}",
  masterSkip: "Yalnızca yazılabilir {n} register yoklanmaz",
  slavePlan: "Geçerli Slave ID {u}'ya adları, türleri ve örnek değerleri doldurur. Gerekirse yanıt aralıkları genişler.",
  slaveUnit: "Bu cihazın varsayılan Slave ID'si {u}",
  sources: "Kaynaklar",
  caution: "Üreticinin kılavuzundan alınan bilgiler (üreticiyle bağlantımız yoktur). Yazılıma veya modele göre farklı olabilir — yazmadan önce cihaz kılavuzunu kontrol edin.",
  thAddr: "Adres (kılavuz)",
  thName: "Ad",
  thType: "Tür",
  thUnit: "Birim",
  thRw: "R/W",
  notes: "Notlar",
  behaveOpt: "Değer üreteçleri ve bağlantı kurallarını da ekle — gerilim/akım dalgalanması, enerji birikimi, çalıştırma komutu → çıkış frekansı rampası",
  guardOpt: "Salt okunur ve salt yazılırı uygula",
  slaveNote: "Bu değerler kılavuz tablolarından alınmıştır — gerçek cihaz davranışı (rampa süreleri vb.) farklı olabilir.",
};

export const TR_PORTCHECK: Tr<PortCheckTextKey> = {
  title: "Bağlantıyı kontrol et",
  close: "Kapat (Esc)",
  reading: "Okunuyor…",
  readFail: "Okunamadı",
  device: "Cihaz ve sürücü",
  settings: "Ayarlar",
  power: "Güç tasarrufu",
  test: "Bağlantı testi",
  cannot: "PC'nin göremedikleri",
  guides: "Kılavuzlar:",
  name: "Ad",
  chip: "VID:PID · çip",
  driver: "Sürücü",
  problem: "Sorun kodu",
  action: "Denenecekler",
  latency: "FTDI gecikme zamanlayıcısı",
  suspend: "USB seçici askıya alma",
  canOff: "PC kapatabilir",
  on: "açık",
  off: "kapalı",
  connected: "Testi çalıştırmak için önce bağlantıyı kesin (test portu kendisi açar).",
  copy: "Metni kopyala",
  copied: "Kopyalandı",
  more: "Sürücü geçmişi, COM numarası ayırmaları ve gizli cihazlar için PortDock Port Inspector'ı kullanın.",
  readOnly: "Salt okunur, yönetici hakları olmadan.",
};

export const TR_LOOP: Tr<LoopTextKey> = {
  mode: "Test",
  loop: "Loopback — TX, RX'e bağlı",
  loopHint: "DB9'da 2. pini (RX) 3. pine (TX) bağlayın; TTL adaptörde TX'i RX'e bağlayın. Her hızda baytların değişmeden geri geldiğini kontrol eder ve 1 baytlık gidiş-dönüşü ölçer.",
  two: "İki port — birbirine bağlı iki adaptör",
  twoHint: "Birbirine bağlı iki adaptör/kabloyla her hızda bu port → diğeri ve diğeri → bu port yönünde gönderir ve gelenleri karşılaştırır. RS-485 adaptörlerini kontrol etmek için kullanışlı.",
  peer: "Diğer port",
  peerNone: "Başka port yok",
  pattern: "Desen",
  patRandom: "Karışık baytlar",
  patRamp: "Sırayla 0x00–0xFF",
  patAlt: "Dönüşümlü 0x55/0xAA",
  length: "Uzunluk (bayt)",
  wiring: "Nasıl bağlanır",
  overall: "Genel",
  colDir: "Yön",
  echo: "2 telli RS-485 yankısı",
  echoHint: "Hatta cihaz yokken adaptörün gönderdiği baytları alıp almadığını kontrol eder.",
  bauds: "Hızlar",
  more: "Diğer hızlar",
  start: "Testi başlat",
  cancel: "Durdur",
  sure: "Cihaz hattan/bus'tan ayrıldı mı? Test baytları bir cihaza komut olarak ulaşabilir.",
  sureYes: "Ayrıldı — başlat",
  sureNo: "İptal",
  running: "Test ediliyor",
  noPort: "Önce bir port seçin.",
  colBaud: "Hız",
  colResult: "Sonuç",
  colBytes: "Gönderilen · aynı · kayıp · değişen",
  colRtt: "1 bayt gidiş-dönüş ms (ortanca · en çok)",
  colFlags: "Hata bayrakları",
  flagsNone: "yok",
  flagsUnread: "okunmadı",
  flagFrame: "çerçeveleme",
  flagParity: "parite",
  flagOverrun: "taşma",
  flagRxOver: "arabellek taşması",
  flagsNote: "Hata bayrakları yalnızca sürücü bildirdiğinde görünür — «yok» hiç hata olmadığını garanti etmez. Gidiş-dönüş süresi USB gecikmesini, sürücü ve program süresini içerir.",
  echoBack: "Geri gelen bayt",
  firstMs: "İlk bayta kadar",
};

/** Bağlantı şeması (metinle) */
export const TR_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, erkek veya dişi)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   pin 2'yi pin 3'e bağla", "", "TTL adaptör", "  TX ──┐", "  RX ──┘   TX'i RX'e bağla", "", "RS-485 tek portta loopback yapılamaz — «İki port»u seçin."].join("\n"),
  two: ["RS-232 (çapraz, null modem)", "  port A        port B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2 telli)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Tek RS-485 adaptör — cihaz hattan ayrılmış olarak", "  A(D+)  B(D−)  hiçbir şey bağlı değil"].join("\n"),
};

export const TR_IFACE: Tr<IfaceTextKey> = {
  title: "Bu PC",
  all: "tüm bağdaştırıcılar",
  local: "yalnızca bu PC",
  down: "bağlı değil",
  none: "Bağdaştırıcı adresleri okunamadı",
  refresh: "Yenile",
  use: "Bu adresi kullan",
  gw: "ağ geçidi",
  notHere: "«{a}» bu PC'nin adresi değil — başlatmak «adres kullanılamıyor» hatasıyla başarısız olur. Aşağıdaki listeden birini seçin.",
  downHere: "«{a}» bağdaştırıcısı ({b}) bağlı değil (kabloyu / Wi-Fi'ı kontrol edin).",
};

export const TR_OPEN_APP: Tr<OpenAppTextKey> = {
  opened: "{a} açıldı — {b}. O pencerede bağlan'a basın.",
  missing: "{a} bu PC'de bulunamadı, bu yüzden «{b}» kopyalandı — oraya yapıştırın.",
  get: "İndirme sayfası",
};

/** Kapatma onayı (exitGuard.ts) */
export const TR_EXIT = "Bir bağlantı veya dosya kaydı etkin. Kapatmak bağlantıyı keser ve kaydı durdurur. Yine de kapatılsın mı?";

/** Örnek komutlar (examples.ts) — ad öneki ve İngilizce ad → Türkçe ad */
export const TR_EXAMPLE_PREFIX = "ör. ";
export const TR_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (yanıtı kontrol et)",
  "ATI (device info)": "ATI (cihaz bilgisi)",
  "AT+GMR (firmware version)": "AT+GMR (yazılım sürümü)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus Slave ID 1 oku 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus Slave ID 1 oku 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (SCPI cihaz kimliği)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP Slave ID 1 oku 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP Slave ID 1 oku 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "Ana sayfa için HTTP isteği (port 80)",
  "text hello": "metin hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (cihaz kimliği)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (DC gerilim)",
  "SYST:ERR? (one error)": "SYST:ERR? (bir hata)",
};
