// PortDock Port Inspector — opis programu. Nazwy okien Windows jak w polskim Windows.
export default {
  seo: {
    title: "PortDock Port Inspector — darmowa diagnostyka portów COM (USB)",
    desc: "Darmowa diagnostyka portów COM dla Windows: sterownik USB, kod problemu Menedżera urządzeń, opóźnienie FTDI, duchy numerów COM. Tylko odczyt, test pętli.",
  },
  summary: "Wybierz port COM i zobacz w jednym miejscu to, czego inaczej szukałbyś w Menedżerze urządzeń, Podglądzie zdarzeń i rejestrze: sterownik, kod problemu i jego znaczenie, układ USB, ustawienia urządzenia, takie jak FTDI latency timer, oszczędzanie energii USB, niedawną historię podłączeń i rezerwacje numerów COM. Tylko czyta, bez uprawnień administratora, a przy połączeniu TX z RX mierzy czas obiegu dla każdej prędkości. Pozostałe karty czytają w ten sam sposób karty sieciowe tego komputera, jego ustawienia Windows jako PC maszyny oraz Wi-Fi i Bluetooth.",
  who: [
    "Serwisanci, których adapter USB-szeregowy nie jest wykrywany albo od czasu do czasu znika",
    "Każdy, kto szuka przyczyny, dla której odpowiedzi Modbus RTU wydają się spóźnione (FTDI latency timer)",
    "Każdy, kto musi dołączyć do zgłoszenia lub issue szczegóły portu po stronie komputera",
  ],
  features: [
    {
      title: "Urządzenie, sterownik, kod problemu",
      body: "Nazwa, numer COM, lokalizacja, ID wystąpienia i producent; dostawca sterownika, wersja, data, INF i usługa; stan i kod problemu Menedżera urządzeń z jego znaczeniem i tym, co spróbować; ostatnie podłączenie i odłączenie.",
    },
    {
      title: "Układ USB i ustawienia urządzenia",
      body: "Nazwa układu z tabeli VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), ustawienie domyślne portu w Windows i parametry urządzenia ze sterownika, z objaśnionym FTDI latency timer (LatencyTimer).",
    },
    {
      title: "Oszczędzanie energii i historia",
      body: "Selektywne zawieszanie USB z opcji zasilania, «Zezwalaj komputerowi na wyłączanie tego urządzenia w celu oszczędzania energii» dla urządzenia i urządzeń USB powyżej niego oraz zdarzenia podłączeń i sterownika z dzienników zdarzeń (7, 30 lub 90 dni).",
    },
    {
      title: "Rezerwacje numerów COM",
      body: "Numery zarezerwowane przez Windows (ComDB), numery zajęte przez urządzenia niepodłączone teraz, numery osierocone i numery zajęte przez więcej niż jedno urządzenie — dlaczego nowy adapter trafia na COM15.",
    },
    {
      title: "Test połączenia",
      body: "Pętla zwrotna TX–RX dla każdej prędkości: bajty takie same, utracone i zmienione, czas obiegu 1 bajtu w ms (mediana i maksimum) oraz flagi błędów sterownika (ClearCommError). Pokazuje też, czy adapter 2-przewodowy RS-485 odbija echo.",
    },
    {
      title: "Test dwóch portów i wzorce (od 0.10.0)",
      body: "Przy dwóch adapterach połączonych ze sobą wysyła w obu kierunkach przy każdej prędkości i porównuje to, co dotarło (do sprawdzania adapterów RS-485). Wzorce: mieszane bajty, 0x00–0xFF, 0x55/0xAA; długość 64–4096 bajtów. Tekstowy schemat połączeń i ogólna ocena «No issue found (within this test) / Worth a look / Problem». To samo w Serial w «Sprawdź połączenie…».",
    },
    {
      title: "Karty sieciowe tego komputera",
      body: "«Odczytaj karty» pokazuje dla każdej karty łącze, prędkość, dupleks, IPv4 i bramę oraz wartości z «Zaawansowane» w Menedżerze urządzeń (ramki jumbo, bufory odbioru, moderacja przerwań, EEE …), oszczędzanie energii, błędy odbioru, profil sieci i to, czy jej zapora jest włączona. Cel «kamera GigE» pokazuje opublikowane przez producentów kamer wartości wraz ze źródłami.",
    },
    {
      title: "Ten PC — ustawienia PC maszyny",
      body: "«Odczytaj ustawienia tego PC» odczytuje szybkie uruchamianie, uśpienie, selektywne zawieszanie USB, politykę restartu po aktualizacjach, wygaszacz ekranu, synchronizację czasu oraz niedawne nieoczekiwane wyłączenia i błędy sprzętowe. Przy celu «PC maszyny» wartości, które mogą prowadzić do zatrzymań lub restartów, są oznaczane jako «Worth a look».",
    },
    {
      title: "Ten PC — niebieskie ekrany, kondycja SSD, źródła wybudzenia (od 0.10.0)",
      body: "Ta sama karta «Ten PC» odczytuje kody zatrzymania niebieskich ekranów wraz z nazwami (np. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) i godziny nagłych wyłączeń, a dla dysków NVMe SSD temperaturę, zużycie w procentach, rezerwę, godziny pracy i błędy nośnika, co wybudziło komputer z uśpienia oraz pojemność baterii laptopa w porównaniu z projektową i liczbę cykli — bez uprawnień administratora. Pliki zrzutów są tylko wypisywane; numery seryjne dysków nie są odczytywane.",
    },
    {
      title: "Porównanie z poprzednim razem — zapisane kontrole (od 0.10.0)",
      body: "Zapisz bieżącą kontrolę (lista portów COM, nazwa/wersja/data sterownika, lokalizacja USB, ustawienia kart sieciowych, ustawienia «Ten PC», zapisy niebieskich ekranów) i przy następnej konserwacji odczytaj ponownie, aby zobaczyć tylko to, co się zmieniło — np. COM3 → COM7, nowa wersja sterownika (Windows Update?), wyłączone ramki jumbo, zmienione ustawienie zasilania, nowy niebieski ekran. Nie są zapisywane numery seryjne urządzeń, nazwa komputera ani folder użytkownika. Zachowaj wynik jako tekst lub CSV.",
    },
    {
      title: "Bezprzewodowe — Wi-Fi i Bluetooth",
      body: "Karta «Bezprzewodowe» odczytuje adapter Wi-Fi, sterownik, oszczędzanie energii i zapisy rozłączeń prowadzone przez Windows (liczone według przyczyny), a także adapter Bluetooth, stan usługi, zdarzenia błędów i to, czy dźwięk Bluetooth działa w trybie zestawu głośnomówiącego (rozmowy) — bez uprawnień administratora ani lokalizacji. Nie wysyła pingów, a eksporty maskują nazwy urządzeń.",
    },
    {
      title: "Tylko odczyt, czytelne wyniki",
      body: "Nigdy nie zmienia ustawień ani sterowników (pomoc objaśnia ręczne poprawki). Każda karta jest oznaczona «No issue found (in what was read) / Worth a look / Problem / Could not read»; to, czego komputer nie widzi — zamiana A/B, terminacja, polaryzacja, uziemienie — jest zawsze wypisane; eksporty tekstu i JSON maskują ścieżki folderów użytkownika.",
    },
  ],
  steps: [
    "Kliknij port na liście «Porty COM» po lewej",
    "Przeczytaj wynik i uzasadnienie każdej karty; w razie potrzeby zmień ustawienia samodzielnie w Windows, tak jak objaśnia pomoc",
    "Połącz TX z RX dla «Test połączenia»; użyj «Kopiuj tekst», aby dołączyć wynik do pytania",
  ],
  similar: "Podobne narzędzia to Menedżer urządzeń Windows, NirSoft USBDeview (freeware), USB Device Tree Viewer Uwe Siebera (freeware) i FT_PROG firmy FTDI dla układów FTDI (darmowy). PortDock Port Inspector zbiera w jednym miejscu sterownik, kod problemu, oszczędzanie energii, historię podłączeń i rezerwacje numerów COM dla jednego portu COM oraz dodaje test połączenia w pętli zwrotnej.",
};
