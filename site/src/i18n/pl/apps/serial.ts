// PortDock Serial — opis programu (struktura jak data/tools.ts; nazwy, polecenia i wersje bez zmian).
export default {
  seo: {
    title: "PortDock Serial — darmowy terminal szeregowy (RS-232/485)",
    desc: "Darmowy terminal szeregowy dla Windows (RS-232, RS-485, USB COM): HEX/ASCII, auto-łączenie, dziewięć sum kontrolnych, dekodowanie Modbus RTU, logi z czasem.",
  },
  summary: "Wymieniaj dane z urządzeniami RS-232, RS-485 i USB szeregowymi oraz zapisuj log testu ze znacznikami czasu. Po odłączeniu i ponownym podłączeniu adaptera USB program łączy się z tym samym urządzeniem.",
  who: [
    "Serwisanci uruchamiający nowe urządzenie",
    "Programiści firmware testujący protokół UART",
    "Każdy, kto musi czytać ramki Modbus RTU",
  ],
  features: [
    {
      title: "Porty, które da się rozpoznać",
      body: "Pokazuje przy każdym porcie nazwę urządzenia, USB VID:PID i numer seryjny oraz odświeża się przy podłączaniu i odłączaniu.",
    },
    {
      title: "Przetrwa rozłączenia",
      body: "Po ponownym podłączeniu otwiera to samo urządzenie, nawet gdy zmienił się numer COM, i zapisuje w logu każde zerwanie i ponowne połączenie.",
    },
    {
      title: "Cztery tryby podziału ramek",
      body: "Przerwa, znak końca, stała długość lub Modbus RTU — tak, aby jedna wiadomość była jedną linią.",
    },
    {
      title: "Dziewięć sum kontrolnych i własna CRC",
      body: "Dodawaj przy wysyłaniu CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 lub własną CRC i sprawdzaj je przy odbiorze.",
    },
    {
      title: "Dekodowanie Modbus RTU",
      body: "Rozkłada zapytania, odpowiedzi i wyjątki na adres, funkcję i wartości.",
    },
    {
      title: "Linie sygnałowe",
      body: "Przełączaj DTR/RTS i obserwuj CTS/DSR/RI/CD na wskaźnikach i w logu.",
    },
    {
      title: "Logi testów",
      body: "Znaczniki czasu co do milisekundy, lista poleceń, powtarzane wysyłanie i ciągły zapis logu do pliku.",
    },
    {
      title: "Sprawdź połączenie…",
      body: "Bez uprawnień administratora odczytuje urządzenie, sterownik, kod problemu, FTDI latency timer i oszczędzanie energii USB wybranego portu oraz wykonuje test pętli zwrotnej lub echa 2-przewodowego RS-485. Od 0.10.0 także test dwóch portów (dwa adaptery połączone ze sobą), wzorce (0x00–0xFF, 0x55/0xAA) i schemat połączeń. Nic nie jest zmieniane.",
    },
    {
      title: "Udostępnianie portu — COM ↔ TCP (od 0.10.0)",
      body: "Udostępnia otwarty port COM jako serwer TCP, aby inne programy, WSL2, Docker lub inny komputer mogły korzystać z tego samego portu. Surowo lub RFC 2217 (zdalna zmiana prędkości i parzystości); odebrane dane trafiają do wszystkich klientów, a klient wysyłający jest oznaczony w logu. Domyślnie tylko ten komputer (127.0.0.1); inne komputery tylko za Twoją zgodą. Bez wirtualnego sterownika COM i bez uprawnień administratora.",
    },
    {
      title: "Brama Modbus TCP ↔ RTU (od 0.10.0)",
      body: "Zamienia komputer w bramę — SCADA, panel HMI lub program na PC łączy się przez Modbus TCP (domyślnie port 502), zapytania trafiają do urządzeń RS-485 jako ramki RTU, a odpowiedzi wracają jako MBAP. Jedno zapytanie naraz, brak odpowiedzi → wyjątek 0B, brak trasy → 0A, statystyki zapytań/odpowiedzi/timeoutów i linie logu typu «TCP #1 → RTU adres 3 FC03».",
    },
    {
      title: "Podsłuch Modbus RTU bez wysyłania (od 0.10.0)",
      body: "Podsłuchuje ruch master–slave przez adapter na magistrali RS-485, niczego nie wysyłając. Ramki są wydzielane po CRC (z ponowną synchronizacją, gdy przerwy się zacierają), z parami zapytanie/odpowiedź, czasami odpowiedzi, brakami odpowiedzi, wyjątkami i statystykami. Dla RS-232 dwa porty na kablu Y łączą się na jednej osi czasu. Zapis logu do plików, także CSV.",
    },
  ],
  steps: [
    "Wybierz port, prędkość i parzystość, potem «Połącz»",
    "Wpisz HEX lub ASCII; w razie potrzeby dodaj sumę kontrolną lub zakończenie linii",
    "«Wyślij» — odebrane linie pokazują się jako RX ◀, wysłane jako TX ▶",
  ],
  similar: "Podobne narzędzia to Tera Term i PuTTY (terminale open source). PortDock Serial łączy na jednym ekranie funkcje do testowania urządzeń — ponowne łączenie USB, podział ramek, kontrolę sum, dekodowanie Modbus RTU.",
};
