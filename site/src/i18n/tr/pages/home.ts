// 첫 화면(views/Home.astro) — 수는 화면에서 세어 넘긴다
export interface HomeCtx {
  /** 윈도우 프로그램 수(MCP 빼고) */
  nApps: number;
  /** MCP 서버도 공개했나 */
  mcp: boolean;
  /** 이 언어로 옮긴 웹 도구 수 */
  nWeb: number;
  /** PC 하드웨어 테스트 수 */
  nHw: number;
  nDevices: number;
  nGuides: number;
}

export default (c: HomeCtx) => ({
  seo: "PortDock — ücretsiz seri port, Modbus ve TCP test araçları",
  desc: `${c.nApps} ücretsiz Windows programı${c.mcp ? " + MCP" : ""}: seri port, Modbus master/slave, TCP, UDP, SCPI, grafik, COM port denetimi, PLC (MC) simülatörü, Wi-Fi kopma kaydı.`,
  sub: `Seri port (COM), Modbus ve TCP/UDP cihazlarını test etmek için ${c.nApps} ücretsiz Windows programı${c.mcp ? " ve yapay zekâ için bir MCP sunucusu" : ""} — ayrıca tarayıcıda kurulum olmadan çalışan ${c.nWeb} haberleşme ve hesaplama aracı (Türkçe).`,
  dl: "Programları indirin",
  dlSmall: "ücretsiz · Windows 10/11",
  web: "Web araçlarını hemen kullanın",
  webSmall: "kurulum yok",
  pcPre: "PC’de sorun mu var? ",
  pcHw: "Mikrofon, klavye, fare ve web kamerası testleri (tarayıcıda)",
  pcTester: "Wi-Fi ve Bluetooth kopma kaydı (Hardware Tester, sayfa İngilizce)",
  heroAlt: "PortDock Serial ekranı — alınan baytlar ve çözülmüş bir Modbus yanıtı",
  heroCap: "PortDock Serial — örnek ekran (örnek veri, arayüz İngilizce)",
  appsTitle: `${c.nApps} Windows programı${c.mcp ? " + MCP" : ""}`,
  appsLead: "Her iş için küçük bir program — yalnızca ihtiyacınız olanı indirin. 0.11.0 sürümünden itibaren programların arayüzü Türkçe dahil 12 dildedir (0.10.0 yalnızca Korece ve İngilizce; yardım İngilizce).",
  screen: "– ekran",
  soon: "Yakında",
  webTitle: "Web araçları — kurulum yok",
  webLead: "Saha için haberleşme ve hesaplama araçları, doğrudan tarayıcıda. Girdiğiniz hiçbir şey bir yere gönderilmez.",
  hwTitle: `${c.nHw} PC donanım testi`,
  hwBody: "Mikrofon, klavye, fare, web kamerası, monitör, hoparlör ve daha fazlasını tarayıcıda test edin.",
  allWeb: `Türkçe ${c.nWeb} web aracının tamamı`,
  guidesTitle: "Kılavuzlar ve register haritaları",
  read: "Oku",
  devTitle: `${c.nDevices} endüstriyel cihaz için Modbus register haritaları (İngilizce)`,
  devBody: "Sürücüler (inverter), sıcaklık kontrol cihazları, enerji analizörleri — kılavuz kaynakları, JSON",
  guidesEnTitle: `${c.nGuides} saha kılavuzu (İngilizce)`,
  guidesEnBody: "Modbus yanıt vermiyor, RS-485 kablolaması, adres yazımları, 4–20 mA döngüleri, kopan USB-seri dönüştürücüler ve daha fazlası.",
  allGuides: "Tüm kılavuzlar (İngilizce)",
});
