// PortDock Simulator — opis programu.
export default {
  seo: {
    title: "PortDock Simulator — darmowy symulator urządzeń (COM, TCP, UDP)",
    desc: "Darmowy symulator urządzeń oparty na regułach: «gdy to przyjdzie, odpowiedz tym» przez COM, TCP i UDP. Pisz oprogramowanie bez sprzętu, testuj opóźnienia.",
  },
  summary: "Naśladuj dowolne urządzenie regułami «gdy przyjdzie to → odpowiedz tym». Twórz oprogramowanie nadrzędne bez sprzętu i testuj obsługę błędów z opóźnieniami, gubionymi odpowiedziami (co N-ta lub losowo) i odpowiedziami na zmianę.",
  who: [
    "Programiści oprogramowania nadrzędnego, którym jeszcze brakuje sprzętu",
    "Zespoły budujące zautomatyzowane stanowiska testowe",
  ],
  features: [
    {
      title: "Reguły z symbolami wieloznacznymi",
      body: "HEX ?? (dowolny bajt) i ** (zero lub więcej). ASCII domyślnie dopasowuje się dosłownie; włącz w regule «Symbole wieloznaczne» dla ? i *. Dopasowanie dokładne lub zawiera.",
    },
    {
      title: "Kształtowane odpowiedzi",
      body: "Automatyczna suma kontrolna i zakończenie linii, opóźnienie odpowiedzi i licznik trafień dla każdej reguły.",
    },
    {
      title: "Wiadomości z inicjatywy urządzenia",
      body: "Wysyłaj sygnały życia lub raporty stanu w stałym odstępie.",
    },
    {
      title: "Cztery rodzaje transportu",
      body: "Port szeregowy, serwer TCP, klient TCP, UDP. Zapisuj i wczytuj reguły razem z ustawieniami połączenia i podziału ramek jako jeden plik JSON.",
    },
    {
      title: "Adres 127.0.0.1 przy pierwszym uruchomieniu (od 0.10.0)",
      body: "«Host» dla serwera TCP i UDP zaczyna od 127.0.0.1 (tylko ten komputer). Dla oprogramowania nadrzędnego na innym komputerze wybierz 0.0.0.0 (wszystkie karty) albo adres karty. Ustawienia zapisane przez wcześniejsze wersje zostają.",
    },
  ],
  steps: [
    "Wybierz transport i wpisz port lub adres",
    "«+ Dodaj regułę» — Gdy / Odpowiedź",
    "«Start» — wyślij zapytanie z oprogramowania nadrzędnego",
  ],
  uses: [
    {
      title: "Budowanie oprogramowania nadrzędnego, zanim dotrze sprzęt",
      body: "Zamień pary zapytanie–odpowiedź z instrukcji urządzenia w reguły «gdy → odpowiedz» i podłącz HMI lub program testowy bez prawdziwego urządzenia.",
    },
    {
      title: "Testowanie timeoutów i obsługi błędów",
      body: "Opóźnienia odpowiedzi (z jitterem), brak odpowiedzi co N-ty raz lub losowo oraz odpowiedzi na zmianę pokazują, jak Twoje oprogramowanie radzi sobie ze spóźnionymi lub brakującymi odpowiedziami.",
    },
    {
      title: "Ćwiczenie SCPI bez przyrządu",
      body: "Uruchom serwer TCP na porcie 5025 z przykładem [SCPI *IDN? reply] i połącz PortDock SCPI z 127.0.0.1. Odpowiedzi takie jak «+1.2{rand 0..9}E+00» zmieniają się przy każdym zapytaniu.",
    },
    {
      title: "Naśladowanie sygnałów życia i raportów stanu",
      body: "«Wiadomości z inicjatywy urządzenia» wysyłają dane bez zapytania w stałym odstępie. Zmienne {counter}, {rand} i {time} są uzupełniane przy każdym wysłaniu.",
    },
  ],
  faq: [
    {
      q: "Zapytania przychodzą, ale odpowiedź nie wychodzi",
      a: "Sprawdź, czy reguła jest włączona, czy zgadza się rodzaj wzorca (HEX/ASCII) i «dokładnie/zawiera» oraz czy powyżej nie stoi reguła «**». Przy włączonym «Loguj niedopasowane zapytania» pojawia się linia «NO MATCH»; kliknij ją prawym przyciskiem, aby utworzyć z niej regułę.",
    },
    {
      q: "Zapytania przychodzą rozdzielone lub sklejone",
      a: "Reguły porównują całe ramki. Dostosuj «Podział ramek» (przerwa lub znak końca) i przerwę w ms. UDP nie potrzebuje podziału — jeden datagram to jedna ramka.",
    },
    {
      q: "Jak połączyć program na tym samym komputerze?",
      a: "Dla TCP uruchom serwer i pozwól programowi nadrzędnemu łączyć się z 127.0.0.1. Dla portu szeregowego użyj wirtualnej pary COM (com0com lub podobnej).",
    },
    {
      q: "Moja reguła «*IDN?» odpowiada na niepowiązane zapytania",
      a: "Przy włączonych «Symbolach wieloznacznych» znaki ? i * w regule ASCII pasują do dowolnego znaku. Dla reguł SCPI zostaw symbole wieloznaczne wyłączone (domyślnie dla nowych reguł).",
    },
    {
      q: "Czy mogę przenieść reguły na inny komputer?",
      a: "«Zapisz zestaw reguł» zapisuje reguły razem z transportem, portem, adresem, podziałem ramek i wiadomościami z inicjatywy urządzenia w jednym pliku JSON — trzymaj po jednym na urządzenie lub test.",
    },
  ],
};
