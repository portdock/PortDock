// PortDock TCP — opis programu.
export default {
  seo: {
    title: "PortDock TCP — darmowy klient, serwer i przekaźnik TCP do testów",
    desc: "Darmowe narzędzie do testów gniazd TCP dla Windows: klient, serwer wielu połączeń i przekaźnik (podsłuch), echo, auto-łączenie i podział ramek Modbus TCP.",
  },
  summary: "Połącz się z urządzeniem Ethernet (klient) albo pozwól urządzeniom łączyć się z komputerem (serwer). Serwer przyjmuje wiele partnerów i może wysyłać do jednego lub do wszystkich; przekaźnik stoi między dwoma urządzeniami i zapisuje ruch w obu kierunkach.",
  who: [
    "Programiści HMI, MES i oprogramowania nadrzędnego",
    "Programiści firmware urządzeń TCP",
  ],
  features: [
    {
      title: "Klient i serwer",
      body: "Serwer przyjmuje do 64 partnerów; wysyłaj do jednego lub wszystkich i rozłączaj ich pojedynczo.",
    },
    {
      title: "Przekaźnik (podsłuch)",
      body: "Stoi między A (np. panelem HMI) a B (np. sterownikiem PLC), przepuszcza ruch i zapisuje go w obu kierunkach.",
    },
    {
      title: "Automatyczne łączenie",
      body: "Klient łączy się ponownie w ustawionym odstępie, gdy połączenie się zerwie.",
    },
    {
      title: "Funkcja echa",
      body: "Serwer odsyła to, co dotrze; powyżej 200 na sekundę echo wyłącza się samo, aby zatrzymać pętle echa.",
    },
    {
      title: "Podział ramek i sumy kontrolne",
      body: "Dziel strumień TCP według przerwy, znaku końca, stałej długości lub Modbus TCP (długość MBAP) i sprawdzaj dziewięć rodzajów sum kontrolnych lub własną CRC.",
    },
    {
      title: "Adres nasłuchu 127.0.0.1 przy pierwszym uruchomieniu (od 0.10.0)",
      body: "«Adres nasłuchu» serwera i «Adres tego PC, z którym łączy się A» w przekaźniku zaczynają od 127.0.0.1 (tylko ten komputer). Aby połączył się inny komputer lub panel HMI, wybierz tam 0.0.0.0 (wszystkie karty sieciowe) albo adres karty. Ustawienia zapisane przez wcześniejsze wersje zostają.",
    },
  ],
  steps: [
    "Wybierz «Klient» lub «Serwer», wpisz adres i port",
    "«Połącz» lub «Rozpocznij nasłuch»",
    "Wpisz tekst i «Wyślij»",
  ],
  uses: [
    {
      title: "Rozmowa z urządzeniem",
      body: "Jeśli urządzenie czeka na połączenia, użyj «Klient» z jego IP i portem, wysyłaj polecenia i czytaj odpowiedzi w HEX lub ASCII. Klient łączy się ponownie w ustawionym odstępie, gdy połączenie się zerwie.",
    },
    {
      title: "Gdy urządzenie łączy się z komputerem",
      body: "Otwórz port jako «Serwer», a połączyć się może do 64 urządzeń. Wysyłaj do jednego lub wszystkich i rozłączaj je pojedynczo.",
    },
    {
      title: "Zapis ruchu HMI ⇄ PLC",
      body: "Z «Przekaźnik» komputer stoi między dwoma urządzeniami; skieruj HMI na ten komputer, a ruch w obu kierunkach zostanie zapisany. Bajty przechodzą bez zmian. Od 0.8.0 przekaźnik może zapisać pcap i pokazuje pary zapytanie–odpowiedź Modbus/MC oraz czasy odpowiedzi.",
    },
    {
      title: "Jednorazowy odczyt urządzenia Modbus TCP",
      body: "Połącz się z portem 502, a pojawi się pasek «Pokaż jako Modbus TCP». Rozdziela zapytania i odpowiedzi jedno po drugim i dekoduje je w panelu szczegółów. Do ciągłego odpytywania wygodniejszy jest Modbus Master.",
    },
  ],
  faq: [
    {
      q: "Klient ciągle nie może się połączyć (CONNECT FAIL)",
      a: "Sprawdź zasilanie i kabel urządzenia, IP i port oraz to, czy komputer i urządzenie są w tej samej podsieci (np. 192.168.0.x).",
    },
    {
      q: "Uruchomiłem serwer, ale urządzenie nie może się połączyć",
      a: "Upewnij się, że zezwoliłeś w oknie Zapory Windows i że urządzenie łączy się z adresem IP tego komputera. Błąd «already in use» oznacza, że port zajmuje inny program.",
    },
    {
      q: "Dane wyglądają na sklejone lub rozdzielone",
      a: "TCP nie zachowuje granic wiadomości. Przełącz podział ramek w «Ustawienia odbioru» na znak końca, stałą długość lub Modbus TCP (długość MBAP) albo dostosuj przerwę.",
    },
    {
      q: "Czy przekaźnik zmienia ruch?",
      a: "Nie. Bajty są przekazywane tak, jak przychodzą; podział ramek i kontrola sum służą tylko do logu, a automatyczna odpowiedź i echo są wyłączone. Do urządzeń trafia tylko to, co sam wstrzykniesz, więc zachowaj ostrożność.",
    },
  ],
  similar: "Podobne narzędzia to Hercules SETUP utility (HW-group, freeware).",
};
