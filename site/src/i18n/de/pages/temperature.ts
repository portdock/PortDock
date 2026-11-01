// Pt100- und Thermoelement-Rechner (views/TemperaturePage.astro) — 5. Paket. Begriffe (DIN EN 60751 / DIN EN 60584): Widerstandsthermometer, Thermoelement Typ K, Thermospannung, Vergleichsstelle, Vergleichsstellenkompensation, Grundwertfunktion
// Typnamen und Fehlertexte stehen in lib/temperature. src2 = Text vor und nach dem Link auf its90.nist.gov; nach mmNote folgt der App-Name (PortDock Modbus Master, unverändert), nach nNote der Linktext aus pageName()
export default {
  title: "Pt100- und Thermoelement-Rechner",
  seo: "Pt100 und Thermoelement berechnen: Ω, mV ↔ °C — PortDock",
  desc: "Pt100/Pt1000-Widerstand und mV von Thermoelementen Typ K, J, T, E, N, R, S, B ↔ Temperatur. Nach IEC 60751 und NIST ITS-90, mit Vergleichsstelle.",
  rtdTitle: "Widerstandsthermometer (RTD)",
  sensor: "Sensor",
  temp: "Temperatur (°C)",
  res: "Widerstand (Ω)",
  tcTitle: "Thermoelement",
  type: "Typ",
  cj: "Vergleichsstelle (°C)",
  emf: "Gemessene Spannung (mV)",
  emf0: "Thermospannung (Bezug 0 °C)",
  range: "Bereich",
  rtdNote: "α = 0.00385, -200 bis 850 °C",
  tcNote: "Temperatur → mV gilt im ganzen „Bereich“; mV → Temperatur nur im Bereich der inversen NIST-Funktion.",
  tableTitle: "Temperaturtabelle",
  step: "Schrittweite (°C)",
  tableNote: "Die Thermoelement-Tabellen beziehen sich wie die NIST-Tabellen auf eine Vergleichsstelle von 0 °C.",
  how: "Alles wird in Ihrem Browser berechnet; Ihre Eingaben werden nirgendwohin gesendet. Werte außerhalb des Bereichs werden gemeldet, nicht berechnet.",
  srcTitle: "Gleichungen und Quellen",
  faqTitle: "Häufige Fragen",
  faq: [
    [
      "Wie funktioniert die Vergleichsstellenkompensation?",
      "Die Spannung eines Thermoelements hängt vom Temperaturunterschied zwischen Messstelle und Vergleichsstelle (Klemmen) ab. Addieren Sie die Thermospannung der Vergleichsstelle zur gemessenen Spannung und rechnen Sie um: E(t) = E gemessen + E(Vergleichsstelle). Umgekehrt ist die erwartete Anzeige E(t) − E(Vergleichsstelle).",
    ],
    [
      "Was unterscheidet Pt100 und Pt1000?",
      "Nur der Widerstand bei 0 °C (R0): 100 Ω oder 1000 Ω. Beide nutzen dieselbe Gleichung (α = 0.00385); ein Pt1000 hat also bei jeder Temperatur den zehnfachen Widerstand eines Pt100.",
    ],
    [
      "Warum ist der Bereich mV → Temperatur enger?",
      "NIST veröffentlicht die Umkehrung der Grundwertfunktion (Temperatur → mV) als abschnittsweise Näherungen. Dieses Werkzeug rechnet mV → Temperatur nur dort, wo diese Näherungen gelten, z. B. Typ K −200 bis 1372 °C, Typ B 250 bis 1820 °C.",
    ],
  ],
  src1: "Widerstandsthermometer: die Callendar–Van-Dusen-Gleichung nach IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 ab 0 °C). Widerstand → Temperatur nutzt ab 0 °C die Lösung der quadratischen Gleichung, darunter eine Iteration.",
  src2: [
    "Thermoelemente: die Grundwertfunktionen E = Σ cᵢ·tⁱ (Typ K addiert über 0 °C a₀·exp(a₁·(t − a₂)²)) und die inversen Koeffizienten aus der NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), übernommen aus den Dateien je Typ unter",
    ". mV → Temperatur startet mit der inversen Funktion und wird an der Grundwertfunktion verfeinert. Temperatur → mV stimmt hier mit jedem Eintrag der NIST-Tabellen (0.001 mV) überein.",
  ],
  rngHead: ["Temperatur → mV", "mV → Temperatur"],
  mmNote: "Temperaturregler oder Messumformer über Modbus auslesen: siehe",
  mmEnd: ".",
  nNote: "NTC-Thermistoren (B-Wert, Steinhart–Hart): siehe",
  nEnd: ".",
};
