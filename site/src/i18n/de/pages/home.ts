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
  seo: "PortDock — kostenlose Testtools für Seriell, Modbus und TCP",
  desc: `${c.nApps} kostenlose Windows-Programme${c.mcp ? " + MCP" : ""}: Seriell, Modbus Master/Slave, TCP, UDP, SCPI, Plotter, COM-Port-Prüfung, SPS-Simulator (MC), WLAN-Abbrüche. Quelloffen.`,
  sub: `${c.nApps} kostenlose Windows-Programme zum Testen von seriellen (COM-), Modbus- und TCP/UDP-Geräten${c.mcp ? " und ein MCP-Server für KI" : ""} — dazu ${c.nWeb} Kommunikations- und Rechentools für die Praxis, die ohne Installation im Browser laufen (auf Deutsch).`,
  dl: "Programme herunterladen",
  dlSmall: "kostenlos · Windows 10/11",
  web: "Web-Tools sofort nutzen",
  webSmall: "ohne Installation",
  pcPre: "Probleme am PC? ",
  pcHw: "Mikrofon-, Tastatur-, Maus- und Webcam-Tests (im Browser)",
  pcTester: "Protokoll für WLAN- und Bluetooth-Abbrüche (Hardware Tester)",
  heroAlt: "Oberfläche von PortDock Serial — empfangene Bytes und eine entschlüsselte Modbus-Antwort",
  heroCap: "PortDock Serial — Beispielansicht (Beispieldaten, Oberfläche auf Englisch)",
  appsTitle: `${c.nApps} Windows-Programme${c.mcp ? " + MCP" : ""}`,
  appsLead: "Ein kleines Programm pro Aufgabe — laden Sie nur, was Sie brauchen. Die Programmoberfläche gibt es in 12 Sprachen, darunter Deutsch (die Hilfe auf Koreanisch und Englisch, bei anderen Sprachen auf Englisch).",
  screen: "– Oberfläche",
  soon: "Bald verfügbar",
  webTitle: "Web-Tools — ohne Installation",
  webLead: "Kommunikations- und Rechentools für die Praxis, direkt im Browser. Ihre Eingaben werden nirgendwohin gesendet.",
  hwTitle: `${c.nHw} PC-Hardwaretests`,
  hwBody: "Mikrofon, Tastatur, Maus, Webcam, Monitor, Lautsprecher und mehr im Browser testen.",
  allWeb: `Alle ${c.nWeb} Web-Tools auf Deutsch`,
  guidesTitle: "Anleitungen und Register-Maps",
  read: "Lesen",
  devTitle: `Modbus-Register-Maps für ${c.nDevices} Industriegeräte`, // 링크 글 — 장비 맵이 그 언어로 없으면 화면이 «(영어)» 표시를 붙인다
  devBody: "Frequenzumrichter, Temperaturregler, Energiemessgeräte — mit Handbuchquellen, JSON",
  guidesEnTitle: `${c.nGuides} Praxisanleitungen (Englisch)`,
  guidesEnBody: "Modbus antwortet nicht, RS-485-Verdrahtung, Adressschreibweisen, 4–20-mA-Schleifen, abreißende USB-Seriell-Adapter und mehr.",
  allGuides: "Alle Anleitungen (Englisch)",
});
