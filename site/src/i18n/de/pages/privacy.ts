// Datenschutzerklärung (views/PrivacyPage.astro) — Text in de/PrivacyBody.astro, Gültigkeitsdatum kommt aus der Ansicht
export default (updated: string) => ({
  desc: "PortDock sendet keine Gerätedaten; Fehlerberichte, Statistik und Updateprüfung nur mit Zustimmung. KI-Kopie, Ping, MCP; Statistik, Werbe-Cookies, Kontakt.",
  effective: `Gültig ab ${updated}`,
});
