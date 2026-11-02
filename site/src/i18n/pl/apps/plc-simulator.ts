// PortDock PLC Simulator — opis programu. Nazwy poleceń MC zgodnie z polskimi opisami SLMP Mitsubishi Electric.
export default {
  seo: {
    title: "PortDock PLC Simulator — darmowy symulator protokołu MC (SLMP)",
    desc: "Darmowe narzędzie dla Windows do testów protokołu MC (3E/4E, binarnie/ASCII) bez PLC: tabele urządzeń (D, M, X, Y …), odczyt/zapis, wstrzykiwanie błędów.",
  },
  summary: "Komputer odpowiada na zapytania protokołu MC (SLMP) jak port Ethernet sterownika PLC. Wpisz wartości do tabel urządzeń, a oprogramowanie HMI, zbierania danych lub nadrzędne może je czytać i zapisywać; celowe opóźnienia i kody zakończenia z błędem sprawdzają jego obsługę błędów. Program opiera się na formatach komunikatów z publicznych instrukcji Mitsubishi Electric (SLMP/MC); nie jest powiązany z firmą, a zachowanie może różnić się od prawdziwego PLC.",
  who: [
    "Zespoły przygotowujące ekrany HMI i komunikację, zanim dotrze sterownik PLC",
    "Programiści oprogramowania do zbierania danych lub nadrzędnego, które czyta PLC przez protokół MC",
  ],
  features: [
    {
      title: "3E/4E, binarnie/ASCII, TCP/UDP",
      body: "Nasłuchuje jako serwer TCP (wielu klientów) lub na UDP. Odpowiedzi 4E zawierają numer seryjny zapytania. Domyślnie może się łączyć tylko ten komputer (127.0.0.1); zezwolenie innym komputerom to Twoja decyzja.",
    },
    {
      title: "Zaimplementowane polecenia",
      body: "0401 odczyt zbiorczy i 1401 zapis zbiorczy (słowa i bity, podpolecenia 0000–0003), 0403 odczyt losowy, 1402 zapis losowy i 0619 test pętli zwrotnej. Od 0.6.0 także 0406/1406 odczyt/zapis blokowy, 0801/0802 monitor, 1001–1006 zdalne RUN/STOP/PAUSE/kasowanie zatrzasku/reset (tylko stan symulowany) i 0101 odczyt nazwy typu (wartości symulowane). Inne polecenia dostają kod zakończenia C059.",
    },
    {
      title: "Protokół dedykowany LS XGT (od 0.10.0)",
      body: "Przełącz «Protokół» na «XGT dedicated», a odpowie na dedykowany protokół FEnet sterowników LS ELECTRIC XGT (nagłówek «LSIS-XGT», domyślnie TCP 2004 · UDP 2005): odczyt h0054 i zapis h0058, pojedynczy (%MX, %MB, %MW, %MD, %ML, do 16 bloków) i ciągły (bajty %MB, do 1400 bajtów), urządzenia P, M, K, F, T, C, D, L, N oraz odpowiedzi z kodem błędu (1–6, h75–h78). Zbudowany na podstawie publicznych instrukcji użytkownika LS ELECTRIC — bez powiązania z firmą.",
    },
    {
      title: "Reguły warunkowe (od 0.6.0)",
      body: "Naśladuj uzgadnianie, np. «gdy bit żądania się włączy, włącz bit gotowości po 300 ms»: warunek (bit ON/OFF/zbocze, porównanie słowa, okresowo) → opóźnienie (stałe lub losowe) → akcje (zapisy bitów i słów). To nie jest program drabinkowy.",
    },
    {
      title: "18 urządzeń",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC i CN. X, Y, B, W i ZR używają numerów szesnastkowych; każde urządzenie ma rozmiar, a zapytania poza nim dostają C056. Urządzenia bitowe można oglądać jako słowa po 16 punktów; komórki mogą być 32-bitowe, zmiennoprzecinkowe, tekstowe lub nazwane.",
    },
    {
      title: "Wstrzykiwanie błędów",
      body: "Opóźnienie odpowiedzi (z zakresem), brak odpowiedzi lub wybrany kod zakończenia — wskazywane przez polecenie, urządzenie, co N-te zapytanie lub prawdopodobieństwo.",
    },
    {
      title: "Zdekodowany ruch",
      body: "Każde zapytanie pokazuje nazwę polecenia, urządzenie i punkty; każda odpowiedź kod zakończenia i jego znaczenie. Komórki zmienione przez klienta migają, do tego statystyki.",
    },
    {
      title: "Symulacja i zapisane stany",
      body: "Wartości mogą zmieniać się samoczynnie (narastanie, losowo, sinus, rampa, przełączanie), a wartości urządzeń i ustawienia komórek można zapisywać do pliku JSON i wczytywać z niego.",
    },
  ],
  steps: [
    "Dopasuj ramkę (3E/4E), kod danych (binarnie/ASCII) i port do klienta",
    "Wybierz urządzenie (D, M, X …) i wpisz wartości",
    "«Start» — odczyty i zapisy klienta są obsługiwane z tabel",
  ],
  faq: [
    {
      q: "Czy zachowuje się dokładnie jak prawdziwe PLC?",
      a: "Nie. Opiera się na formatach komunikatów z publicznych instrukcji i nie był porównywany z prawdziwym sprzętem. Nie działa program drabinkowy, a kody błędów, czasy, limity połączeń i zakresy urządzeń dla poszczególnych modeli mogą się różnić.",
    },
    {
      q: "Jak podłączyć HMI na innym komputerze?",
      a: "Włącz «Zezwól na połączenia z innych PC (0.0.0.0)» i zezwól programowi w Zaporze Windows. Nie uruchamiaj go w sieci zakładowej z tym samym IP i portem co prawdziwe PLC.",
    },
  ],
  similar: "Podobne narzędzia to DummyPLC (darmowy, zamknięty kod) i HslCommunication (komercyjny). PortDock PLC Simulator jest darmowy (GPL-3.0) i dodaje wstrzykiwanie błędów, zdekodowany ruch i symulację wartości.",
};
