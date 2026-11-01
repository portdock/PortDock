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
  seo: "PortDock — Programas gratis para probar serie, Modbus y TCP/UDP",
  desc: `${c.nApps} programas gratis y de código abierto (Windows)${c.mcp ? " + MCP" : ""}: terminal serie, maestro/esclavo Modbus, TCP, UDP, SCPI, gráficas, puertos COM, simulador de PLC (MC).`,
  sub: `${c.nApps} programas gratuitos para Windows para probar equipos serie (COM), Modbus y TCP/UDP${c.mcp ? ", un servidor MCP para IA" : ""} y ${c.nWeb} herramientas de comunicación y cálculo para campo que funcionan en el navegador, sin instalar (en español).`,
  dl: "Descargar los programas",
  dlSmall: "gratis · Windows 10/11",
  web: "Usar las herramientas web",
  webSmall: "sin instalar",
  pcPre: "¿Problemas con el PC? ",
  pcHw: "Pruebas de micrófono, teclado, ratón y cámara web (navegador, en inglés)",
  pcTester: "Registro de cortes de Wi-Fi y Bluetooth (Hardware Tester, en inglés)",
  heroAlt: "Pantalla de PortDock Serial: bytes recibidos y una respuesta Modbus decodificada",
  heroCap: "PortDock Serial — pantalla de ejemplo (datos de muestra; la interfaz está en inglés)",
  appsTitle: `${c.nApps} programas para Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Un programa pequeño para cada tarea: descargue solo lo que necesite. Los programas tienen la interfaz en coreano, inglés y japonés (japonés desde la 0.11.0).",
  screen: ": pantalla",
  soon: "Próximamente",
  webTitle: "Herramientas web — sin instalar",
  webLead: "Herramientas de comunicación y cálculo para campo, directamente en el navegador. Nada de lo que escribe se envía a ningún sitio.",
  hwTitle: `${c.nHw} pruebas de hardware del PC (en inglés)`,
  hwBody: "Pruebe en el navegador el micrófono, el teclado, el ratón, la cámara web, el monitor, los altavoces y más.",
  allWeb: `Ver las ${c.nWeb} herramientas web en español`,
  guidesTitle: "Guías y mapas de registros de equipos",
  read: "Leer",
  devTitle: `Mapas de registros Modbus de ${c.nDevices} equipos industriales (en inglés)`,
  devBody: "Variadores, controladores de temperatura, medidores de energía: fuentes de los manuales, JSON",
  guidesEnTitle: `${c.nGuides} guías para campo (en inglés)`,
  guidesEnBody: "Esclavos Modbus que no responden, cableado RS-485, notación de direcciones, lazos de 4-20 mA, cortes de USB serie y más.",
  allGuides: "Todas las guías (en inglés)",
});
