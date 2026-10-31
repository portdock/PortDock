// 개인정보처리방침(views/PrivacyPage.astro) — 본문은 es/PrivacyBody.astro, 시행일은 화면에서 넘긴다
export default (updated: string) => ({
  desc: "PortDock no envía su tráfico; informes de error, estadísticas y actualizaciones solo con permiso. Copia «AI», ping, MCP; analítica, anuncios y contacto.",
  effective: `En vigor desde el ${updated}`,
});
