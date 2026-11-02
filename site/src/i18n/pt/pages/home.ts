// Página inicial (views/Home.astro) — os números são contados na tela e passados aqui
export interface HomeCtx {
  /** Número de programas para Windows (sem o MCP) */
  nApps: number;
  /** O servidor MCP também foi publicado? */
  mcp: boolean;
  /** Número de ferramentas web traduzidas para este idioma */
  nWeb: number;
  /** Número de testes de hardware do PC */
  nHw: number;
  nDevices: number;
  nGuides: number;
}

export default (c: HomeCtx) => ({
  seo: "PortDock — Programas grátis para testar serial, Modbus e TCP/UDP",
  desc: `${c.nApps} programas grátis para Windows${c.mcp ? " + MCP" : ""}: serial, mestre/escravo Modbus, TCP, UDP, SCPI, gráfico, portas COM e simulador de CLP (MC). Código aberto.`,
  sub: `${c.nApps} programas grátis para Windows que testam equipamentos serial (COM), Modbus e TCP/UDP${c.mcp ? ", um servidor MCP para IA" : ""} e ${c.nWeb} ferramentas web de comunicação e cálculo para o campo que rodam no navegador, sem instalar (versão em português).`,
  dl: "Baixar os programas",
  dlSmall: "grátis · Windows 10 e 11",
  web: "Usar as ferramentas web",
  webSmall: "sem instalar",
  pcPre: "Problemas no PC? ",
  pcHw: "Testes de microfone, teclado, mouse e webcam (no navegador)",
  pcTester: "Registro de quedas de Wi-Fi e Bluetooth (Hardware Tester)",
  heroAlt: "Tela do PortDock Serial — bytes recebidos e uma resposta Modbus decodificada",
  heroCap: "PortDock Serial — tela de exemplo (dados de amostra, tela em inglês)",
  appsTitle: `${c.nApps} programas para Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Um programa pequeno para cada tarefa — baixe só o que precisar. A partir da 0.11.0, as telas dos programas estão em 12 idiomas, incluindo o português (a 0.10.0, só em coreano e inglês; a ajuda, em inglês).",
  screen: "— tela do programa",
  soon: "Em breve",
  webTitle: "Ferramentas web — sem instalar",
  webLead: "Ferramentas de comunicação e cálculo para o campo, direto no navegador. Nada do que você digita é enviado para lugar nenhum.",
  hwTitle: `${c.nHw} testes de hardware do PC`,
  hwBody: "Teste microfone, teclado, mouse, webcam, monitor, alto-falantes e mais, no navegador.",
  allWeb: `Ver as ${c.nWeb} ferramentas web em português`,
  guidesTitle: "Guias e mapas de registradores de equipamentos",
  read: "Ler",
  devTitle: `Mapas de registradores Modbus de ${c.nDevices} equipamentos industriais`, // 링크 글 — 장비 맵이 그 언어로 없으면 화면이 «(영어)» 표시를 붙인다
  devBody: "Inversores de frequência, controladores de temperatura, medidores de energia — fontes dos manuais, JSON",
  guidesEnTitle: `${c.nGuides} guias para o campo (em inglês)`,
  guidesEnBody: "Modbus sem resposta, ligação RS-485, notação de endereços, malha 4-20 mA, quedas de USB-serial e mais.",
  allGuides: "Todos os guias (em inglês)",
});
