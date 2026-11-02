// PortDock Modbus Slave — opis programu. Liczba wbudowanych urządzeń jest w tekście-funkcji.
export default {
  seo: {
    title: "PortDock Modbus Slave — darmowy symulator Modbus (RTU/TCP)",
    desc: "Darmowy symulator Modbus RTU/TCP slave dla Windows: testuj PLC, HMI lub mastera bez urządzenia, z tabelami rejestrów, wstrzykiwaniem błędów i profilami.",
  },
  summary: "Zamienia komputer w urządzenie Modbus slave (szeregowe RTU albo serwer Modbus TCP lub RTU przez TCP), abyś mógł testować mastera (PLC, HMI, oprogramowanie nadrzędne) bez prawdziwego urządzenia — także z celowymi opóźnieniami i błędami.",
  who: [
    "Programiści piszący mastera Modbus",
    "Zespoły przygotowujące ekrany HMI, zanim dotrze urządzenie",
  ],
  features: [
    {
      title: "Trzy rodzaje transportu",
      body: "Szeregowy (RTU), serwer TCP (Modbus TCP) i serwer TCP (RTU przez TCP — urządzenie za szeregowym serwerem urządzeń).",
    },
    {
      title: "Cztery tabele",
      body: "Coils, wejścia dyskretne, rejestry podtrzymujące i rejestry wejściowe. Oglądaj tabelę jako U16, S16, HEX lub BIN, ustawiaj dla komórek typy U32, S32, F32, F64 lub tekst z kolejnością bajtów i pozwól wartościom zmieniać się samoczynnie (narastanie, losowo, sinus …).",
    },
    {
      title: "Wiele Slave ID",
      body: "Uruchom kilka Slave ID (1–247), każdy z własnymi wartościami.",
    },
    {
      title: "Wstrzykiwanie błędów",
      body: "Opóźnienie, brak odpowiedzi, uszkodzona CRC, zła długość MBAP lub wymuszone wyjątki — wskazywane przez Slave ID, funkcję, adres, co N-te zapytanie lub prawdopodobieństwo — aby sprawdzić timeouty i ponowienia mastera.",
    },
    {
      title: "Widać każdy zapis",
      body: "Komórki zapisane przez mastera migają, do tego log ruchu i statystyki.",
    },
    {
      title: "Profile urządzeń, zapisane tabele",
      body: (c: { nDevices: number }) => `Wczytaj nazwy i typy rejestrów ${c.nDevices} wbudowanych urządzeń (falowniki, regulatory temperatury, mierniki mocy …) z przykładowymi wartościami. Eksportuj i importuj tabele jako mapy rejestrów CSV (ten sam format co Modbus Master) lub JSON.`,
    },
    {
      title: "Emulacja z profilem urządzenia — żywe wartości (od 0.10.0)",
      body: "Testuj SCADA, HMI lub własny program bez prawdziwego falownika czy miernika mocy. Zapis polecenia pracy rozpędza częstotliwość wyjściową do zadanej (a przy 0 zwalnia), a prąd, napięcie i moc podążają za nią; mierniki mocy lekko zmieniają napięcie i prąd oraz sumują energię. Edytowalne «reguły powiązań» (podążaj, proporcjonalnie, sumuj) łączą komórki. Komórki tylko do odczytu i tylko do zapisu z mapy urządzenia są egzekwowane (wyjątek 02 lub 03 — do wyboru), nieprzypisane adresy dają wyjątek 02, a całość działa razem ze wstrzykiwaniem błędów. Wartości pochodzą z tabel w instrukcji, więc zachowanie prawdziwego urządzenia (czasy rozpędzania itp.) może się różnić.",
    },
    {
      title: "Adres nasłuchu 127.0.0.1 przy pierwszym uruchomieniu (od 0.10.0)",
      body: "«Adres nasłuchu» serwera TCP zaczyna od 127.0.0.1 (tylko ten komputer). Dla mastera na innym komputerze wybierz tam 0.0.0.0 (wszystkie karty) albo adres karty. Ustawienia zapisane przez wcześniejsze wersje zostają.",
    },
  ],
  steps: [
    "Wybierz transport (szeregowy lub TCP) oraz port i prędkość (albo adres i port); w razie potrzeby dodaj Slave ID",
    "Wybierz tabelę, ustaw adres początkowy i liczbę, wpisz wartości",
    "«Połącz» («Start» dla TCP) — zapytania mastera są obsługiwane z tabeli",
  ],
  similar: "Podobne narzędzia to komercyjny Modbus Slave (Witte Software) i otwartoźródłowy ModRSsim2. PortDock Modbus Slave jest darmowy (GPL-3.0) i bez limitu czasu.",
};
