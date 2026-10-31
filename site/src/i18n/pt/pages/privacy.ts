// Política de privacidade (views/PrivacyPage.astro) — o texto está em pt/PrivacyBody.astro, a data de vigência vem da tela
export default (updated: string) => ({
  desc: "O PortDock não envia o seu tráfego; relatórios de erro, estatísticas e atualizações só com permissão. Cópia para IA, ping, MCP, análise do site e anúncios.",
  effective: `Em vigor desde ${updated}`,
});
