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
  seo: "PortDock — Alat Uji Serial, Modbus, TCP/UDP Gratis untuk Windows",
  desc: `${c.nApps} program Windows gratis${c.mcp ? " + MCP" : ""}: serial, Modbus master/slave, TCP, UDP, SCPI, grafik, cek port COM, simulator PLC (MC), log putus Wi-Fi. Open source.`,
  sub: `${c.nApps} program Windows gratis untuk menguji perangkat serial (COM), Modbus, dan TCP/UDP${c.mcp ? " serta server MCP untuk AI" : ""} — ditambah ${c.nWeb} alat komunikasi dan kalkulator lapangan yang berjalan di browser tanpa instalasi (dalam bahasa Indonesia).`,
  dl: "Unduh programnya",
  dlSmall: "gratis · Windows 10/11",
  web: "Pakai alat web sekarang",
  webSmall: "tanpa instalasi",
  pcPre: "Masalah di PC? ",
  pcHw: "Uji mikrofon, keyboard, mouse, dan webcam (di browser)",
  pcTester: "Log putusnya Wi-Fi dan Bluetooth (Hardware Tester)",
  heroAlt: "Layar PortDock Serial — byte yang diterima dan respons Modbus yang sudah diuraikan",
  heroCap: "PortDock Serial — contoh layar (data contoh, tampilan bahasa Inggris)",
  appsTitle: `${c.nApps} program Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Satu program kecil untuk setiap pekerjaan — ambil yang Anda perlukan saja. Mulai 0.11.0 tampilan program tersedia dalam 12 bahasa, termasuk bahasa Indonesia (0.10.0: bahasa Korea dan Inggris saja; bantuan dalam bahasa Inggris).",
  screen: "– tampilan",
  soon: "Segera hadir",
  webTitle: "Alat web — tanpa instalasi",
  webLead: "Alat komunikasi dan kalkulator lapangan, langsung di browser. Apa pun yang Anda ketik tidak dikirim ke mana pun.",
  hwTitle: `${c.nHw} uji perangkat keras PC`,
  hwBody: "Uji mikrofon, keyboard, mouse, webcam, monitor, speaker, dan lainnya di browser.",
  allWeb: `Semua ${c.nWeb} alat web berbahasa Indonesia`,
  guidesTitle: "Panduan dan peta register",
  read: "Baca",
  devTitle: `Peta register Modbus untuk ${c.nDevices} perangkat industri (bahasa Inggris)`,
  devBody: "Inverter, pengendali suhu, power meter — dengan sumber manual, JSON",
  guidesEnTitle: `${c.nGuides} panduan lapangan (bahasa Inggris)`,
  guidesEnBody: "Modbus tidak menjawab, pengawatan RS-485, cara penulisan alamat, loop 4–20 mA, adaptor USB-serial yang sering putus, dan lainnya.",
  allGuides: "Semua panduan (bahasa Inggris)",
});
