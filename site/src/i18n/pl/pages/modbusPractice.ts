// Ćwiczenia Modbus (views/ModbusPracticePage.astro) — 4. pakiet. rtu = fragmenty przed i po linku do konwertera RTU↔TCP (tekst linku wstawia weave())
export default {
  title: "Ćwiczenia Modbus (quiz)",
  seo: "Ćwiczenia Modbus: quiz z ramek RTU, CRC i wyjątków — PortDock",
  desc: "Ćwiczenia z Modbus RTU: HEX zapytania odczytu, wartość 40003 w odpowiedzi, wyjątek 83 02, kolejność bajtów CRC, float ABCD czy CDAB. Z objaśnieniami.",
  kind: "Rodzaj zadania",
  mixed: "Mieszane",
  check: "Sprawdź odpowiedź",
  next: "Następne zadanie",
  reset: "Wyzeruj wynik",
  answerLabel: "Odpowiedź",
  how: "Zadania są tworzone i oceniane w Twojej przeglądarce. Wynik jest zapisywany tylko w tej przeglądarce i nigdzie nie jest wysyłany.",
  faqTitle: "Jak korzystać",
  faq: [
    ["Dla kogo to jest?", "Dla początkujących inżynierów i praktykantów uczących się Modbus RTU albo dla każdego, kto chce odświeżyć wiedzę przed wyjazdem na obiekt. Po każdej odpowiedzi pojawia się objaśnienie i linki do pasującego poradnika i narzędzia."],
    ["Czy mogę dać komuś to samo zadanie?", "Skopiuj „Link do tego zadania” pod zadaniem i wyślij go; otworzy to samo zadanie. Każde zadanie powstaje z jednej liczby (ziarna), więc ta sama liczba daje to samo zadanie."],
    ["Jak wpisać odpowiedź otwartą?", "W HEX spacje, wielkość liter i 0x nie mają znaczenia (01 03 00 00 00 0A C5 CD to to samo co 0103000000 0ac5cd). Wartości są dziesiętne; z przedrostkiem 0x czytane są jako HEX."],
  ],
  srcTitle: "Podstawa",
  qlink: "Link do tego zadania",
  guidesTitle: "Poradniki do przeczytania",
  src: ["kody funkcji, budowa zapytań i odpowiedzi, kody wyjątków", "ramka RTU, CRC (młodszy bajt pierwszy)", "float32. Kolejności słów rejestrów (ABCD, CDAB) nie ma w specyfikacji Modbus i zależy od urządzenia"],
  rtu: ["Aby przekształcać ramki między RTU, TCP i ASCII, użyj narzędzia ", "."],
};
