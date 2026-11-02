// PortDock Modbus Master — opis programu. Liczba wbudowanych urządzeń jest w tekście-funkcji.
export default {
  seo: {
    title: "PortDock Modbus Master — darmowe narzędzie testowe Modbus RTU/TCP",
    desc: "Darmowy master Modbus RTU/TCP (odpytywanie) dla Windows: wiele tabel, F32/U32 i kolejność bajtów, zapis 40001, zapisy, skan Slave ID, logi CSV.",
  },
  summary: "Pytaj urządzenia Modbus o dane zamiast sterownika PLC lub panelu HMI. Odpytuj wiele tabel według Slave ID, funkcji, adresu i interwału, oglądaj F32/U32/tekst z kolejnością bajtów i zapisem 40001, a kliknięciem dwukrotnym komórki zapisuj wartości. W zestawie zdekodowany HEX zapytań i odpowiedzi, statystyki i zapis wartości do CSV.",
  who: [
    "Serwisanci sprawdzający mapę Modbus nowego napędu lub licznika",
    "Programiści testujący firmware urządzeń slave",
  ],
  features: [
    {
      title: "Wiele tabel odpytywania",
      body: "Każda tabela ma własne Slave ID, funkcję (01–04), adres początkowy, liczbę i interwał, z licznikiem błędów na swojej karcie. Szeregowy RTU, Modbus TCP i RTU przez TCP.",
    },
    {
      title: "Wartości z typami i kolejność bajtów",
      body: "Od U16 do F64 i tekst w ABCD/CDAB/BADC/DCBA, HEX/BIN i zapis 40001. Używa tego samego formatu CSV mapy rejestrów co Modbus Slave.",
    },
    {
      title: "Zapis z podglądem",
      body: "Kliknij dwukrotnie, aby zapisać przez 05/06/0F/10 i obejrzyj dokładne bajty. Opcja «zawsze FC15/16» wysyła nawet pojedyncze wartości przez 0F/10.",
    },
    {
      title: "Profile urządzeń",
      body: (c: { nDevices: number }) => `Wybierz jedno z ${c.nDevices} wbudowanych urządzeń (falowniki, regulatory temperatury, mierniki mocy …), aby dodać tabele odpytywania z nazwami (jednostka i skala), typami, Slave ID i domyślnymi ustawieniami portu szeregowego.`,
    },
    {
      title: "Skan Slave ID i adresów",
      body: "Sprawdź, które Slave ID (1–247) odpowiadają i które zakresy adresów da się odczytać, a potem zamień je w tabele.",
    },
    {
      title: "Wyszukiwanie ustawień łącza (od 0.10.0)",
      body: "Gdy prędkość, parzystość i ID urządzenia są nieznane, wysyła krótki odczyt dla każdej wybranej prędkości (1200–115200) × parzystości/bitów stopu × zakresu ID i wypisuje kombinacje, które odpowiadają. Odpowiedź z wyjątkiem też oznacza «jest tu urządzenie». Szacowany czas, przycisk stopu i «Połącz z tym ustawieniem»; ID 0 (broadcast) nigdy nie jest używane. Nie dla magistral z innym masterem.",
    },
    {
      title: "«Brak odpowiedzi» — możliwe przyczyny (od 0.10.0)",
      body: "Porządkuje ostatnie wyniki zapytań według możliwych przyczyn i sposobu sprawdzenia — brak jakichkolwiek bajtów (okablowanie, ID, polaryzacja A/B), tylko odbite zapytanie (echo adaptera 2-przewodowego), błędy CRC (prędkość, parzystość, zakłócenia, terminacja), ucięte ramki (timeout, opóźnienie USB), co znaczy każdy kod wyjątku, odpowiada inne ID. Z odnośnikami do poradników i pomocnika diagnostyki; do skopiowania jako tekst.",
    },
    {
      title: "Kopia ustawień urządzenia, porównanie, przywracanie (od 0.10.0)",
      body: "Do wymiany urządzeń i konserwacji. Odczytuje naraz kilka zakresów (albo wypełnia je z profilu urządzenia) do JSON i CSV — zakresy powyżej 125 są dzielone, nieudane zakresy wypisane — i porównuje z urządzeniem teraz lub z inną kopią, pokazując tylko różnice. Przywracanie zapisuje wyłącznie wybrane komórki: podgląd (teraz vs. do zapisu), drugie kliknięcie zapisuje, na końcu kontrola odczytem zwrotnym. Rejestry wejściowe i rejestry tylko do odczytu z profilu są zablokowane.",
    },
    {
      title: "Timeouty, ponowienia, statystyki",
      body: "Ustaw timeout, ponowienia i opóźnienie; licz zapytania, OK, timeouty, błędy CRC i wyjątki z czasami odpowiedzi dla każdej tabeli. Wyjątki są wyjaśniane.",
    },
    {
      title: "Log wartości i trendy",
      body: "Zapisuj wartości do CSV przy każdym odpytaniu lub przy zmianie i obserwuj wybrane komórki jako małe wykresy trendu.",
    },
    {
      title: "Nadzór wartości i alarmy (od 0.10.0)",
      body: "Dla komórki: dolna/górna granica, brak zmiany (zawieszenie) przez N sekund i utrata komunikacji przez N sekund, z marginesem powrotu (histereza). Wyzwolona komórka jest podświetlona, a do tego lista alarmów (wystąpił, ustąpił, czas trwania, potwierdzenie), opcjonalnie dźwięk, miganie paska zadań i log alarmów w CSV. Pomoc w nadzorze, nie urządzenie bezpieczeństwa.",
    },
  ],
  steps: [
    "Dopasuj połączenie i port (lub IP) do urządzenia",
    "«Połącz» (F4), potem ustaw Slave ID, funkcję, adres początkowy i liczbę według instrukcji",
    "Kliknij komórkę dwukrotnie, aby zapisać; prawy przycisk – nazwa i typ",
  ],
  similar: "Podobne narzędzia to komercyjny Modbus Poll (Witte Software) i otwartoźródłowy QModMaster. PortDock Modbus Master jest darmowy (GPL-3.0) i bez limitu czasu.",
};
