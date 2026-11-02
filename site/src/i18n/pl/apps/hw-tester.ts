// PortDock Hardware Tester — opis programu.
export default {
  seo: {
    title: "PortDock Hardware Tester — log zrywania Wi-Fi i ping (darmowy)",
    desc: "Darmowe narzędzie Windows zapisujące zrywanie Wi-Fi: ping do bramy i internetu obok siebie, czas DNS, przyczyny rozłączeń z Windows i log połączeń Bluetooth.",
  },
  summary: "Zamienia «moje Wi-Fi ciągle się zrywa» w zapis. Podczas nagrywania pinguje Twoją bramę (router) i jeden adres internetowy obok siebie, rysuje opóźnienie i straty na jednym wykresie razem z przyczynami rozłączeń Wi-Fi zapisanymi przez Windows na tej samej osi czasu i podpowiada, czy szukać po stronie routera, czy dalej. Zapisuje też, kiedy urządzenia Bluetooth się łączą i rozłączają. Tylko odczyt, bez uprawnień administratora; nie zmienia żadnych ustawień.",
  who: [
    "Każdy, komu Wi-Fi ciągle się zrywa i kto chce wiedzieć, czy to router, czy internet",
    "Osoby, które chcą mieć zapis, kiedy rozłączają się słuchawki lub klawiatury Bluetooth",
    "Serwisanci dokumentujący łączność bezprzewodową komputera urządzenia przed rozmową z serwisem",
  ],
  features: [
    {
      title: "Brama a internet",
      body: "Pinguje router i adres internetowy (1.1.1.1, 8.8.8.8 lub własny) w tym samym rytmie i pokazuje obok siebie straty, średnią, 95. percentyl i jitter. Nigdy częściej niż raz na sekundę; jedno nagranie kończy się po 24 godzinach.",
    },
    {
      title: "Przyczyny rozłączeń z Windows na tym samym wykresie",
      body: "Czyta dziennik WLAN-AutoConfig (8001 połączenie, 8003 rozłączenie) i pokazuje go jako linie na wykresie oraz jako sformułowania przyczyn z Windows na liście zdarzeń. Nazwa sieci Wi-Fi nie jest odczytywana.",
    },
    {
      title: "Czas odpowiedzi DNS",
      body: "Co 5 s jedna nazwa (domyślnie example.com) jest odpytywana na serwerze DNS z pominięciem pamięci podręcznej, z pomiarem czasu odpowiedzi i niepowodzeń.",
    },
    {
      title: "Podsumowanie «gdzie szukać» i CSV",
      body: "Mówi «po stronie routera», gdy straty dotyczą bramy, i «dalej niż router», gdy odpowiedzi gubi tylko cel internetowy — gdzie szukać, a nie przyczynę. Nagrania zapisują się jako CSV.",
    },
    {
      title: "Log połączeń Bluetooth",
      body: "Co 2 s odczytuje stan «Połączono» sparowanych urządzeń i zapisuje połączenia oraz zerwania. Nazwy są pokazywane tylko na ekranie; zapisany i skopiowany tekst używa «Urządzenie N».",
    },
    {
      title: "Log podłączeń/odłączeń USB (od 0.10.0)",
      body: "Znajduje urządzenie USB stojące za powtarzającym się dźwiękiem podłączenia/odłączenia. Zapisuje czasy podłączenia i odłączenia z nazwą urządzenia, VID:PID, portem huba i prędkością, oznacza urządzenie, które odłącza się 3 lub więcej razy w 10 minut, jako «podejrzenie powtarzających się zaników», a urządzenie USB 3 pracujące z prędkością USB 2.0 jako «Worth a look». Odczytuje też ostatnie czasy podłączenia/odłączenia sprzed uruchomienia aplikacji.",
    },
    {
      title: "Tryb dźwięku Bluetooth i tony lewy/prawy",
      body: "Pokazuje, czy domyślne wyjście to stereo (A2DP), czy zestaw głośnomówiący do rozmów, i odtwarza tony testowe lewy, prawy i oba.",
    },
    {
      title: "Sygnał Wi-Fi i kanał (na żądanie)",
      body: "Tylko gdy włączone jest «Pokaż sygnał»: siła sygnału, prędkość łącza, pasmo, kanał i liczba pobliskich sieci na każdym kanale (bez nazw). Od Windows 11 24H2 wymaga to zgody na lokalizację (reszta działa bez niej).",
    },
  ],
  steps: [
    "Wybierz cel internetowy i interwał, potem «Rozpocznij zapis»",
    "Zostaw działające do wystąpienia zrywań — opóźnienie routera i internetu oraz przyczyny z Windows na jednym wykresie",
    "Odczytaj w «Podsumowanie», gdzie szukać, potem «Zapisz CSV…» lub «Kopiuj podsumowanie»",
  ],
  faq: [
    {
      q: "Czy mierzy prędkość internetu?",
      a: "Nie. Zapisuje zerwania, opóźnienia i straty, a nie prędkość pobierania ani wysyłania. Do tego użyj strony z testem prędkości.",
    },
    {
      q: "Czy naprawia problem?",
      a: "Nie. Tylko czyta i niczego nie zmienia. Wskazuje, gdzie szukać (po stronie routera, dalej niż router, DNS, przyczyny rozłączeń z Windows).",
    },
    {
      q: "Co wysyła na zewnątrz?",
      a: "Tylko pingi do bramy i wybranego adresu internetowego oraz jedno zapytanie DNS, gdy trwa nagrywanie. Cele są zawsze widoczne, a po zatrzymaniu nic nie jest wysyłane.",
    },
  ],
  similar: "Podobne narzędzia to PingPlotter (komercyjny, z darmową edycją) i WifiHistoryView (darmowy, historia połączeń/rozłączeń). PortDock Hardware Tester jest darmowy (GPL-3.0) i pokazuje pingi do bramy i internetu oraz przyczyny rozłączeń z Windows na jednym wykresie, razem z logiem połączeń Bluetooth.",
};
