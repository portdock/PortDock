// Przelicznik Pt100 i termopar (views/TemperaturePage.astro) — 5. pakiet. Terminy (PN-EN 60751 / PN-EN 60584): termometr rezystancyjny, termopara typu K, siła termoelektryczna (SEM), spoina odniesienia, kompensacja spoiny odniesienia, funkcja odniesienia
// Nazwy typów i komunikaty błędów są w lib/temperature. src2 = tekst przed i po linku do its90.nist.gov; po mmNote stoi nazwa aplikacji (PortDock Modbus Master, bez zmian), po nNote tekst linku z pageName()
export default {
  title: "Przelicznik Pt100 i termopar",
  seo: "Pt100 i termopary: przelicznik Ω, mV ↔ °C — PortDock",
  desc: "Rezystancja Pt100/Pt1000 i mV termopar typu K, J, T, E, N, R, S, B ↔ temperatura. Według IEC 60751 i NIST ITS-90, z kompensacją spoiny odniesienia.",
  rtdTitle: "Termometr rezystancyjny (RTD)",
  sensor: "Czujnik",
  temp: "Temperatura (°C)",
  res: "Rezystancja (Ω)",
  tcTitle: "Termopara",
  type: "Typ",
  cj: "Spoina odniesienia (°C)",
  emf: "Zmierzone napięcie (mV)",
  emf0: "SEM (odniesienie 0 °C)",
  range: "Zakres",
  rtdNote: "α = 0.00385, od -200 do 850 °C",
  tcNote: "Temperatura → mV działa w całym „Zakresie”; mV → temperatura tylko w zakresie funkcji odwrotnej NIST.",
  tableTitle: "Tabela temperatur",
  step: "Krok (°C)",
  tableNote: "Tabele termopar zakładają spoinę odniesienia 0 °C, tak jak tabele NIST.",
  how: "Wszystko jest liczone w Twojej przeglądarce; nic, co wpiszesz, nie jest nigdzie wysyłane. Wartości spoza zakresu są zgłaszane, a nie liczone.",
  srcTitle: "Równania i źródła",
  faqTitle: "Najczęstsze pytania",
  faq: [
    [
      "Jak działa kompensacja spoiny odniesienia?",
      "Napięcie termopary zależy od różnicy temperatur między spoiną pomiarową a spoiną odniesienia (zaciskami). Dodaj SEM spoiny odniesienia do zmierzonych mV i przelicz: E(t) = E zmierzone + E(spoina odniesienia). W drugą stronę oczekiwany odczyt to E(t) − E(spoina odniesienia).",
    ],
    [
      "Czym różni się Pt100 od Pt1000?",
      "Tylko rezystancją w 0 °C (R0): 100 Ω lub 1000 Ω. Oba korzystają z tego samego równania (α = 0.00385), więc w każdej temperaturze Pt1000 ma dziesięć razy większą rezystancję niż Pt100.",
    ],
    [
      "Dlaczego zakres mV → temperatura jest węższy?",
      "NIST publikuje odwrotność funkcji odniesienia (temperatura → mV) jako przybliżenia przedziałowe. To narzędzie liczy mV → temperatura tylko tam, gdzie te przybliżenia obowiązują, np. typ K od −200 do 1372 °C, typ B od 250 do 1820 °C.",
    ],
  ],
  src1: "Termometry rezystancyjne: równanie Callendara–Van Dusena z IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 od 0 °C w górę). Rezystancja → temperatura używa pierwiastka równania kwadratowego od 0 °C w górę i iteracji poniżej.",
  src2: [
    "Termopary: funkcje odniesienia E = Σ cᵢ·tⁱ (typ K powyżej 0 °C dodaje a₀·exp(a₁·(t − a₂)²)) i współczynniki odwrotne opublikowane w NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), przepisane z plików dla poszczególnych typów pod adresem",
    ". mV → temperatura startuje od funkcji odwrotnej i jest doprecyzowywana względem funkcji odniesienia. Temperatura → mV zgadza się tu z każdą pozycją tabel NIST (0.001 mV).",
  ],
  rngHead: ["Temperatura → mV", "mV → temperatura"],
  mmNote: "Odczyt regulatorów temperatury lub przetworników przez Modbus: zobacz",
  mmEnd: ".",
  nNote: "Termistory NTC (stała B, Steinhart–Hart): zobacz",
  nEnd: ".",
};
