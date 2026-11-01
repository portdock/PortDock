// Informativa sulla privacy (views/PrivacyPage.astro) — testo in it/PrivacyBody.astro, la data di validità arriva dalla vista
export default (updated: string) => ({
  desc: "PortDock non invia il traffico dei dispositivi; errori, statistiche e aggiornamenti solo con consenso. Copia per IA, ping, MCP; statistiche, cookie, contatti.",
  effective: `In vigore dal ${updated}`,
});
