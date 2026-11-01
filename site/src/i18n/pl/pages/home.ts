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
  seo: "PortDock — darmowe programy do testów RS-232/485, Modbus, TCP/UDP",
  desc: `${c.nApps} darmowych programów testowych na Windows${c.mcp ? " + MCP" : ""}: port szeregowy, Modbus master/slave, TCP, UDP, SCPI, wykresy, porty COM, symulator PLC (MC). Otwarty kod.`,
  sub: `${c.nApps} darmowych programów na Windows do testowania urządzeń na porcie szeregowym (COM), Modbus i TCP/UDP${c.mcp ? " oraz serwer MCP dla AI" : ""} — a do tego ${c.nWeb} kalkulatorów i narzędzi komunikacyjnych po polsku, które działają w przeglądarce bez instalacji.`,
  dl: "Pobierz programy",
  dlSmall: "za darmo · Windows 10/11",
  web: "Otwórz narzędzia online",
  webSmall: "bez instalacji",
  pcPre: "Kłopot z komputerem? ",
  pcHw: "Test mikrofonu, klawiatury, myszy i kamery (przeglądarka, po angielsku)",
  pcTester: "Dziennik zaników Wi-Fi i Bluetooth (Hardware Tester, po angielsku)",
  heroAlt: "Ekran PortDock Serial — odebrane bajty i rozłożona odpowiedź Modbus",
  heroCap: "PortDock Serial — przykładowy ekran (dane przykładowe, interfejs po angielsku)",
  appsTitle: `${c.nApps} programów na Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Jeden mały program do jednego zadania — pobierz tylko to, czego potrzebujesz. Interfejs programów jest po koreańsku i po angielsku.",
  screen: "— zrzut ekranu",
  soon: "Wkrótce",
  webTitle: "Narzędzia online — bez instalacji",
  webLead: "Kalkulatory i narzędzia komunikacyjne prosto w przeglądarce. Nic z tego, co wpiszesz, nie jest nigdzie wysyłane.",
  hwTitle: `Testy sprzętu PC: ${c.nHw} (po angielsku)`,
  hwBody: "Mikrofon, klawiatura, mysz, kamera internetowa, monitor, głośniki i inne — sprawdzisz je w przeglądarce.",
  allWeb: `Wszystkie narzędzia online po polsku (${c.nWeb})`,
  guidesTitle: "Poradniki i mapy rejestrów urządzeń",
  read: "Czytaj",
  devTitle: `Mapy rejestrów Modbus dla urządzeń przemysłowych: ${c.nDevices} (po angielsku)`,
  devBody: "Falowniki, regulatory temperatury, mierniki energii — źródła z instrukcji, JSON",
  guidesEnTitle: `Poradniki dla praktyków: ${c.nGuides} (po angielsku)`,
  guidesEnBody: "Brak odpowiedzi Modbus, okablowanie RS-485, zapis adresów, pętla 4–20 mA, zaniki konwerterów USB–RS i więcej.",
  allGuides: "Lista poradników (po angielsku)",
});
