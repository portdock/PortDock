// PortDock SCPI — opis programu.
export default {
  seo: {
    title: "PortDock SCPI — darmowy terminal SCPI (LAN, RS-232, bez VISA)",
    desc: "Darmowy terminal przyrządów SCPI przez gniazdo LAN (5025) lub RS-232 bez VISA: *IDN?, kolejka błędów, oczekiwanie *OPC?, powtarzane pomiary do CSV.",
  },
  summary: "Wysyłaj polecenia do przyrządów SCPI, takich jak zasilacze, multimetry i oscyloskopy, i czytaj odpowiedzi. Łączy się przez gniazdo LAN (TCP 5025) lub RS-232 bez instalowania VISA, rozpoznaje przyrząd poleceniem *IDN?, opróżnia kolejkę błędów i zapisuje powtarzane odczyty liczbowe do CSV.",
  who: [
    "Programiści sprawdzający polecenia ręcznie, zanim napiszą automatyczne testy",
    "Serwisanci, którzy chcą szybko zajrzeć do przyrządu na komputerze bez VISA",
  ],
  features: [
    {
      title: "Bez VISA",
      body: "Gniazdo LAN (zwykle 5025) i RS-232 (prędkość, parzystość, sterowanie przepływem) z zakończeniem linii LF, CR LF lub CR. VXI-11, HiSLIP i USBTMC nie są jeszcze obsługiwane.",
    },
    {
      title: "Zapytanie, zapis, odczyt",
      body: "Polecenia kończące się znakiem ? są wysyłane jako zapytania, pozostałe jako zapis. Pokazywane są czasy odpowiedzi, timeouty i odpowiedzi bez zakończenia linii. Historia poleceń, lista poleceń i uzupełnianie popularnych poleceń.",
    },
    {
      title: "ID, kolejka błędów, *OPC?",
      body: "*IDN? rozbite na producenta, model, numer seryjny i firmware; SYST:ERR? pytane do zwrotu 0, aby wypisać każdy błąd z kolejki. Przyciski dla *RST, *CLS i oczekiwania na *OPC?.",
    },
    {
      title: "Powtarzany pomiar",
      body: "Powtarzaj zapytanie, np. MEAS:VOLT:DC?, w odstępach określoną liczbę razy, z tabelą wartości, trendem i statystykami (min, maks., średnia, odchylenie standardowe), zapisem do CSV.",
    },
    {
      title: "Dane blokowe",
      body: "Bloki IEEE 488.2 (#NXXXX…) są czytane według nagłówka długości, więc bajty LF wewnątrz danych binarnych ich nie przerywają. Podgląd HEX i zapis do pliku (np. zrzuty ekranu PNG).",
    },
  ],
  steps: [
    "LAN: IP przyrządu i port 5025; szeregowo: port i prędkość jak w przyrządzie",
    "«Połącz» (F4) — *IDN? pokaże nazwę przyrządu",
    "Wpisz polecenie i naciśnij Enter; błędy sprawdzaj przyciskiem «Opróżnij kolejkę błędów»",
  ],
  uses: [
    {
      title: "Sprawdzanie poleceń przed automatyzacją",
      body: "Wpisuj polecenia ręcznie i oglądaj odpowiedź oraz czas odpowiedzi. Polecenia kończące się znakiem ? to zapytania, pozostałe to zapisy. Pomyłki sprawdzisz od razu przyciskiem «Opróżnij kolejkę błędów».",
    },
    {
      title: "Dostęp do przyrządu na komputerze bez VISA",
      body: "Łącz się bezpośrednio przez gniazdo LAN (zwykle port 5025) lub RS-232. *IDN? jest rozbijane na producenta, model, numer seryjny i firmware.",
    },
    {
      title: "Zapis powtarzanych odczytów do CSV",
      body: "W «Pomiar powtarzany» zadawaj zapytanie, np. MEAS:VOLT:DC?, w odstępach określoną liczbę razy, oglądaj tabelę, trend i statystyki (min, maks., średnia, odchylenie standardowe) i zapisz wszystko do CSV.",
    },
    {
      title: "Pobieranie danych blokowych, np. zrzutów ekranu",
      body: "Bloki IEEE 488.2 (#N…) są czytane według nagłówka długości, więc bajty LF wewnątrz danych binarnych ich nie przerywają. Podgląd w HEX i zapis do pliku (PNG itp.).",
    },
  ],
  faq: [
    {
      q: "Dostaję «connection refused»",
      a: "Port jest inny (sprawdź w instrukcji «socket port» — nie każdy przyrząd używa 5025) albo interfejs gniazda jest wyłączony. Niektóre przyrządy odrzucają nowe połączenie, gdy podłączony jest inny program (sesja VISA).",
    },
    {
      q: "Dostaję «no response (timeout)»",
      a: "Polecenie niebędące zapytaniem wysłano jako zapytanie, polecenie zawiera literówkę (sprawdź kolejkę błędów) albo przyrząd jest zajęty pomiarem. Wydłuż czas oczekiwania na odpowiedź lub użyj *OPC?. «Reply not finished» oznacza, że zakończenie linii (LF, CR LF, CR) różni się od tego w przyrządzie.",
    },
    {
      q: "Co to jest -410 Query INTERRUPTED?",
      a: "Następne polecenie wysłano, zanim odczytano odpowiedź. Jeśli zapytanie wysłano przyciskiem «Zapisz», najpierw pobierz odpowiedź przyciskiem «Czytaj».",
    },
    {
      q: "Czy obsługuje USBTMC, GPIB, VXI-11 lub HiSLIP?",
      a: "Na razie nie. VXI-11 w tej chwili nie jest obsługiwane; HiSLIP, USBTMC i GPIB wymagają VISA lub sterowników i wykraczają poza zakres. Większość przyrządów LAN oferuje też gniazdo (5025), a przyrządy tylko z USB z ustawieniem «USB virtual COM» działają przez port szeregowy.",
    },
    {
      q: "Czy mogę to wypróbować bez przyrządu?",
      a: "Uruchom PortDock Simulator jako serwer TCP na porcie 5025 z podziałem ramek LF i przykładem [SCPI *IDN? reply], a potem połącz się z 127.0.0.1:5025.",
    },
  ],
  similar: "Narzędzia producentów oparte na VISA (NI MAX, Keysight Connection Expert …) też potrafią wysyłać polecenia. PortDock SCPI łączy się przez gniazdo LAN lub RS-232 na komputerach bez VISA.",
};
