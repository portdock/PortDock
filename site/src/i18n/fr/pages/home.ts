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
  seo: "PortDock — Logiciels gratuits de test série, Modbus, TCP/UDP",
  desc: `${c.nApps} logiciels Windows gratuits${c.mcp ? " + MCP" : ""} : terminal série, maître/esclave Modbus, TCP, UDP, SCPI, graphes, ports COM, simulateur d’automate (MC). Open source.`,
  sub: `${c.nApps} logiciels Windows pour tester des appareils série, Modbus et TCP/UDP${c.mcp ? ", un serveur MCP pour l’IA" : ""} et ${c.nWeb} outils web sans installation. Tout est gratuit.`,
  dl: "Télécharger les logiciels",
  dlSmall: "gratuit · Windows 10 et 11",
  web: "Utiliser les outils web",
  webSmall: "sans installation",
  pcPre: "Un problème de PC ? ",
  pcHw: "Tests du micro, du clavier, de la souris et de la webcam (dans le navigateur)",
  pcTester: "Journal des coupures Wi-Fi et Bluetooth (Hardware Tester)",
  heroAlt: "Écran de PortDock Serial — octets reçus et réponse Modbus décodée",
  heroCap: "PortDock Serial — exemple d’écran (données fictives, interface en anglais)",
  appsTitle: `${c.nApps} logiciels Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Un petit logiciel par tâche : téléchargez seulement ce dont vous avez besoin. L’interface des logiciels existe en 12 langues, dont le français (l’aide en coréen et en anglais ; en anglais avec un autre écran).",
  screen: "(capture d’écran)",
  soon: "Bientôt disponible",
  webTitle: "Outils web — sans installation",
  webLead: "Des outils de communication et de calcul pour le terrain, directement dans le navigateur. Rien de ce que vous saisissez n’est envoyé.",
  hwTitle: `${c.nHw} tests du matériel PC`,
  hwBody: "Micro, clavier, souris, webcam, écran, haut-parleurs… à tester dans le navigateur.",
  allWeb: `Voir les ${c.nWeb} outils web en français`,
  guidesTitle: "Guides et tables de registres d’appareils",
  read: "Lire",
  devTitle: `Tables de registres Modbus de ${c.nDevices} appareils industriels`, // 링크 글 — 장비 맵이 그 언어로 없으면 화면이 «(영어)» 표시를 붙인다
  devBody: "Variateurs, régulateurs de température, compteurs d’énergie — sources des notices, JSON",
  guidesEnTitle: `${c.nGuides} guides de terrain (en anglais)`,
  guidesEnBody: "Esclave Modbus qui ne répond pas, câblage RS-485, notation des adresses, boucle 4-20 mA, adaptateur USB-série qui se déconnecte, etc.",
  allGuides: "Liste des guides (en anglais)",
});
