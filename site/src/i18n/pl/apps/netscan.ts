// PortDock Net Scan — opis programu.
export default {
  seo: {
    title: "PortDock Net Scan — darmowy skaner IP dla sieci przemysłowych",
    desc: "Darmowy skaner IP dla sieci przemysłowych: skan ping i ARP, producent z MAC, porty przemysłowe (Modbus 502, MC, XGT, S7 …), długotrwały monitor ping.",
  },
  summary: "Przeskanuj podsieć karty sieciowej, aby znaleźć urządzenia, i rozpoznaj je po producencie z adresu MAC i otwartych portach przemysłowych (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Urządzenia blokujące ping i tak zostaną znalezione przez ARP w tej samej podsieci.",
  who: [
    "Serwisanci, którzy nie znają adresu IP nowego urządzenia",
    "Każdy, kto musi przez noc obserwować sieć urządzeń",
  ],
  features: [
    {
      title: "Skan ping + ARP",
      body: "ARP w tej samej podsieci znajduje urządzenia blokujące ping; pokazuje czas odpowiedzi, nazwę, ten komputer i bramę. Bez uprawnień administratora.",
    },
    {
      title: "Sprawdzanie portów przemysłowych",
      body: "Sprawdza tylko listę portów (domyślnie 502, 2004, 5000–5010, 102, 44818, 4840 …; edytowalna, do 32) — bez ogólnego skanowania portów — i pyta urządzenia Modbus o producenta/model (FC 2B/0E).",
    },
    {
      title: "Uwagi o ekspozycji (od 0.10.0)",
      body: "Jeśli wśród już sprawdzanych portów jest Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 lub HTTP 80, dodaje uwagę w rodzaju «Protokół przemysłowy otwarty — każdy w tej samej sieci może czytać i zapisywać (bez uwierzytelniania) — sprawdź separację sieci». Nie skanuje dodatkowych portów i nie zmienia ustawień urządzeń.",
    },
    {
      title: "Wykrywanie rozgłoszeniowe — EtherNet/IP, BACnet",
      body: "Tylko po naciśnięciu wysyła EtherNet/IP ListIdentity (UDP 44818) i BACnet Who-Is (UDP 47808) na adres rozgłoszeniowy wybranej karty i dołącza do tabeli producenta, typ urządzenia, nazwę produktu i rewizję — a dla BACnet także numer instancji urządzenia i ID producenta — urządzeń, których IP nie znasz. Zapytania tylko do odczytu; numery seryjne nie są pokazywane.",
    },
    {
      title: "Producent z MAC",
      body: "Wbudowana lista IEEE pokazuje producenta bez dostępu do internetu.",
    },
    {
      title: "Długotrwały monitor ping",
      body: "Zapisuje do CSV straty, opóźnienia i przerwy wielu urządzeń oraz miga na pasku zadań przy zaniku.",
    },
    {
      title: "Nowe / brakujące",
      body: "Porównuje z poprzednim skanem i oznacza nowe oraz brakujące urządzenia. Eksport do CSV.",
    },
    {
      title: "Wzorce — porównanie z poprzednim razem (od 0.10.0)",
      body: "Zapisz listę urządzeń jako nazwane wzorce (kilka, także jako pliki JSON) i porównaj z nimi następny skan — nowe (dodane?), brakujące (usunięte lub wyłączone?), zmieniony MAC (inne urządzenie pod tym samym IP, wymienione?), zmienione IP (to samo urządzenie pod innym IP, DHCP?) i zmienione otwarte porty, oznaczone kolorami. CSV z porównaniem i kopia «AI» (ostatnie 3 bajty MAC ukryte). Pliki wzorców zawierają adresy MAC — zachowaj ostrożność przy udostępnianiu.",
    },
    {
      title: "Wake-on-LAN, otwieranie strony WWW",
      body: "Dla każdego urządzenia: otwórz jego stronę WWW, skopiuj IP/MAC, wyślij pakiet magic packet.",
    },
  ],
  steps: [
    "Wybierz kartę sieciową — jej podsieć staje się zakresem (sieć /24, w której leży, jeśli jest szersza)",
    "«Skanuj» (F4)",
    "Sprawdź kolumny usług i producenta; kliknij urządzenie, aby otworzyć jego stronę WWW, skopiować jego IP, obudzić je albo dodać do monitora ping przyciskiem «Do monitora ping»",
  ],
  similar: "Podobne narzędzia to Angry IP Scanner (open source) i Advanced IP Scanner (freeware). PortDock Net Scan dodaje sprawdzanie portów przemysłowych (Modbus 502, MC, XGT, S7 …) i długotrwały monitor ping.",
};
