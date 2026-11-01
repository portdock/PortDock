// 개인정보처리방침(views/PrivacyPage.astro) — 본문은 pl/PrivacyBody.astro, 시행일은 화면에서 넘긴다
export default (updated: string) => ({
  desc: "PortDock nie wysyła Twojej komunikacji; raporty błędów, statystyki i aktualizacje tylko za zgodą. Kopia dla AI, ping, MCP; analityka, reklamy, kontakt.",
  effective: `Obowiązuje od ${updated}`,
});
