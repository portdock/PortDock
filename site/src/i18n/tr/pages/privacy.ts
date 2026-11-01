// Gizlilik politikası (views/PrivacyPage.astro) — metin tr/PrivacyBody.astro içinde, yürürlük tarihi görünümden gelir
export default (updated: string) => ({
  desc: "PortDock cihaz verisi göndermez; hata raporu, istatistik ve güncelleme denetimi yalnızca izinle. AI kopyası, ping, MCP; site istatistiği, reklam, iletişim.",
  effective: `Yürürlük tarihi: ${updated}`,
});
