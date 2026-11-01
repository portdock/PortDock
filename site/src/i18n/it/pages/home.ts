// Pagina iniziale (views/Home.astro) — i numeri li conta la vista
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
  seo: "PortDock — strumenti gratuiti di test seriale, Modbus e TCP",
  desc: `${c.nApps} programmi Windows gratuiti${c.mcp ? " + MCP" : ""}: seriale, Modbus master/slave, TCP, UDP, SCPI, plotter, porte COM, simulatore PLC (MC), log Wi-Fi. Open source.`,
  sub: `${c.nApps} programmi Windows gratuiti per collaudare dispositivi seriali (COM), Modbus e TCP/UDP${c.mcp ? " e un server MCP per l'IA" : ""}, più ${c.nWeb} strumenti di comunicazione e di calcolo per il cantiere che funzionano nel browser senza installazione (in italiano).`,
  dl: "Scarica i programmi",
  dlSmall: "gratuiti · Windows 10/11",
  web: "Usa gli strumenti web",
  webSmall: "senza installazione",
  pcPre: "Problemi con il PC? ",
  pcHw: "Test di microfono, tastiera, mouse e webcam (browser, in inglese)",
  pcTester: "Registro delle disconnessioni Wi-Fi e Bluetooth (Hardware Tester, in inglese)",
  heroAlt: "Schermata di PortDock Serial — byte ricevuti e una risposta Modbus decodificata",
  heroCap: "PortDock Serial — schermata di esempio (dati di esempio, interfaccia in inglese)",
  appsTitle: `${c.nApps} programmi Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Un piccolo programma per ogni compito: scaricate solo quello che vi serve. L'interfaccia dei programmi è in coreano, inglese e giapponese (giapponese dalla 0.11.0).",
  screen: "– schermata",
  soon: "In arrivo",
  webTitle: "Strumenti web — senza installazione",
  webLead: "Strumenti di comunicazione e di calcolo per il cantiere, direttamente nel browser. Quello che digitate non viene inviato da nessuna parte.",
  hwTitle: `${c.nHw} test dell'hardware del PC (in inglese)`,
  hwBody: "Provate nel browser microfono, tastiera, mouse, webcam, monitor, altoparlanti e altro.",
  allWeb: `Tutti i ${c.nWeb} strumenti web in italiano`,
  guidesTitle: "Guide e mappe dei registri",
  read: "Leggi",
  devTitle: `Mappe dei registri Modbus di ${c.nDevices} dispositivi industriali (in inglese)`,
  devBody: "Inverter, termoregolatori, multimetri di rete — con le fonti dei manuali, JSON",
  guidesEnTitle: `${c.nGuides} guide pratiche (in inglese)`,
  guidesEnBody: "Modbus che non risponde, cablaggio RS-485, notazioni degli indirizzi, loop 4–20 mA, adattatori USB-seriale che si scollegano e altro.",
  allGuides: "Tutte le guide (in inglese)",
});
