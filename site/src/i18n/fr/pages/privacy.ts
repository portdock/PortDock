// 개인정보처리방침(views/PrivacyPage.astro) — 본문은 fr/PrivacyBody.astro, 시행일은 화면에서 넘긴다
export default (updated: string) => ({
  desc: "Les logiciels PortDock n’envoient pas vos échanges ; erreurs, statistiques et mises à jour seulement avec votre accord. Copie « AI », ping, MCP, site, cookies.",
  effective: `Date d’entrée en vigueur : ${updated}`,
});
