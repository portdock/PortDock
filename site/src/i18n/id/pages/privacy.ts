// Kebijakan privasi (views/PrivacyPage.astro) — isi di id/PrivacyBody.astro, tanggal berlaku dari tampilan
export default (updated: string) => ({
  desc: "PortDock tidak mengirim data perangkat; laporan galat, statistik, cek pembaruan hanya dengan izin. Salinan AI, ping, MCP; statistik situs, iklan, kontak.",
  effective: `Berlaku sejak ${updated}`,
});
