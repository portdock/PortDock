// PortDock MCP — opis programu.
export default {
  seo: {
    title: "PortDock MCP — odczyt portów COM i Modbus z klientów AI",
    desc: "Darmowy serwer MCP: Claude Desktop i inne klienty AI czytają raporty portów COM oraz wartości Modbus, MC i SCPI. Zapisuje tylko do symulatorów na 127.0.0.1.",
  },
  summary: "Bezokienkowy serwer MCP uruchamiany przez klienty AI (Claude Desktop, VS Code, Cursor …). AI czyta porty COM i karty sieciowe tego komputera oraz wartości Modbus, protokołu MC i SCPI z urządzeń, które wskażesz. Narzędzia zapisu przyjmują tylko adres tego komputera (127.0.0.1) i są przeznaczone dla symulatorów. Od 0.10.0 zapisy Modbus trafiają tylko do celu przedstawiającego się jako PortDock. Zapisy MC są sprawdzane wyłącznie po adresie, więc jeśli program na tym komputerze przekazuje dane do innego urządzenia (przekaźnik TCP, brama lub tunel), zapis może dotrzeć do prawdziwego urządzenia.",
  who: [
    "Każdy, kto chce razem z asystentem AI przyjrzeć się problemom z portem COM i adapterem USB",
    "Programiści, którzy chcą czytać wartości Modbus, MC lub SCPI w rozmowie z AI",
    "Osoby ćwiczące korzystanie z narzędzi przez AI na symulatorach zamiast na prawdziwych urządzeniach",
  ],
  features: [
    {
      title: "Dziewięć narzędzi odczytu",
      body: "Lista portów COM, raport Port Inspector, nasłuch szeregowy (niczego nie wysyła), odczyty Modbus (FC 01–04), odczyt zbiorczy MC 3E, zapytania SCPI, ping, karty sieciowe i mapy rejestrów urządzeń.",
    },
    {
      title: "Zapis tylko do symulatorów na 127.0.0.1",
      body: "Ćwicz «zapisz, potem odczytaj» z Modbus Slave lub PLC Simulator na tym komputerze. Każdy inny adres jest odrzucany przed połączeniem. Od 0.10.0 zapisy Modbus wymagają też, aby cel przedstawiał się jako «PortDock» (FC 2B/0E); zapisy MC są sprawdzane tylko po adresie, więc nie używaj ich, gdy działa program przekaźnikowy.",
    },
    {
      title: "Tylko zapytania SCPI",
      body: "Wysyła jedno zapytanie kończące się «?»; takie, które mogą zmienić stan, jak *TST?, *CAL? i *RST, są odrzucane. READ? i MEAS…?, które zaczynają nowy pomiar, są domyślnie odrzucane i wysyłane tylko po zezwoleniu przez allow_measure (od 0.8.0). Użyj FETC?, aby odczytać tylko ostatnią wartość.",
    },
    {
      title: "Log sesji i limity częstotliwości",
      body: "Każde wywołanie jest zapisywane na tym komputerze jako linie JSON i nigdy nie jest wysyłane na zewnątrz. Do tego samego celu najwyżej raz na 100 ms, 120 wywołań na minutę.",
    },
    {
      title: "Maskowanie danych osobowych",
      body: "Ścieżki folderów użytkownika w wynikach zmieniają się w «~», adresy MAC w «xx-…», a nazwy sieci w «(hidden)».",
    },
    {
      title: "Jeden plik do instalacji",
      body: "Bez Pythona, Node ani Dockera: plik .mcpb (otwórz w Claude Desktop) albo pojedynczy exe w archiwum zip.",
    },
  ],
  steps: [
    "Otwórz PortDock-MCP.mcpb w Claude Desktop (inne klienty: wpisz w ich ustawieniach ścieżkę do exe z archiwum zip)",
    "Poproś AI o coś w rodzaju «Pokaż moje porty COM» — klient pyta Cię przed każdym wywołaniem narzędzia",
    "Podaj adres, port i unit, aby odczytać urządzenie. Ćwicz z Modbus Slave lub PLC Simulator na 127.0.0.1",
  ],
  faq: [
    {
      q: "Czy AI może zmienić ustawienia urządzenia?",
      a: "Oba narzędzia zapisu działają tylko wtedy, gdy celem jest 127.0.0.1 lub localhost (ten komputer); każdy inny adres jest odrzucany przed połączeniem. Od 0.10.0 modbus_write_sim zapisuje tylko wtedy, gdy cel odpowie na identyfikację urządzenia (FC 2B/0E) nazwą producenta zaczynającą się od «PortDock», więc nie zapisuje do prawdziwych urządzeń za bramą Modbus TCP ↔ RTU w PortDock Serial (domyślnie 127.0.0.1:502). mc_write_sim jest sprawdzany tylko po adresie, więc jeśli program na tym komputerze przekazuje dane do innego urządzenia (przekaźnik TCP, brama producenta, tunel SSH …), zapis może dotrzeć do prawdziwego urządzenia — nie używaj narzędzi zapisu, gdy taki program działa.",
    },
    {
      q: "Co wysyła na zewnątrz?",
      a: "Sam PortDock MCP komunikuje się tylko z adresami urządzeń i portami, które podasz, a log sesji zostaje na tym komputerze. Wyniki narzędzi trafiają do używanego klienta AI, więc od tej chwili obowiązują zasady tego klienta.",
    },
  ],
};
