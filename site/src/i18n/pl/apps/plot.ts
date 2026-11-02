// PortDock Plot — opis programu.
export default {
  seo: {
    title: "PortDock Plot — darmowy plotter szeregowy z wykresem na żywo i CSV",
    desc: "Darmowy plotter na żywo dla liczb z portu szeregowego, TCP lub UDP: nazwa:wartość jak w Arduino, ramki binarne, do 32 kanałów, kursory i zapis CSV.",
  },
  summary: "Oglądaj liczby wysyłane przez Arduino, czujnik lub urządzenie jako wykres na żywo. Czyta tekst rozdzielany przecinkiem/spacją/tabulatorem/średnikiem, «name:value» w stylu Arduino i ramki binarne, z kolorem i osią dla kanału, pauzą, powiększaniem i różnicami między dwoma punktami, a podczas odbioru zapisuje CSV.",
  who: [
    "Programiści strojący firmware przy obserwacji wartości czujników lub płytki",
    "Serwisanci zapisujący przez wiele godzin wyjście urządzenia, aby znaleźć anomalie",
  ],
  features: [
    {
      title: "Szeregowo, TCP, UDP",
      body: "Porty COM (prędkość, bity danych, parzystość, bity stopu — domyślnie 8N1 — i DTR), klient TCP łączący się z urządzeniem oraz odbiór UDP (także multicast). Łączy się ponownie po odłączeniu i podłączeniu.",
    },
    {
      title: "Tekst, name:value, binarnie",
      body: "Przecinek, spacja, tabulator lub średnik wykrywane automatycznie, wartości nazwane jak temp:23.1 hum:40, linie nagłówka oraz ramki z bajtami startu, u8–f64, kolejnością bajtów i sumą kontrolną. Błędne linie są czerwone z podaną przyczyną.",
    },
    {
      title: "Oglądanie i pomiar",
      body: "Do 32 kanałów na osi lewej/prawej, ostatnie N punktów lub sekund, Y automatyczne/stałe, pauza (odbiór trwa dalej), odczyt kursora, Δt i Δwartość między dwoma znacznikami, powiększanie kółkiem i przesuwanie przeciąganiem.",
    },
    {
      title: "Nadzór kanałów i alarmy (od 0.10.0)",
      body: "Ustaw dla kanału dolną/górną granicę, zawieszenie przez N sekund i utratę danych przez N sekund: wyzwolone wiersze są podświetlone, do tego lista alarmów, opcjonalnie dźwięk i log alarmów w CSV. Pomoc w nadzorze, nie urządzenie bezpieczeństwa.",
    },
    {
      title: "Dotrzymuje kroku",
      body: "Parsowanie działa w Rust; rysowanie następuje raz na klatkę na płótnie z min/maks. na piksel — tysiące wierszy na sekundę bez gubienia szpilek.",
    },
    {
      title: "Zapis i zapisywanie",
      body: "Każda wartość do CSV podczas odbioru (przyjazny dla Excela), widoczny zakres jako CSV, wykres jako PNG. Tabela ostatniej wartości oraz min., maks. i średniej w widocznym zakresie.",
    },
  ],
  steps: [
    "Spraw, aby urządzenie drukowało liczby w liniach (np. 23.1,40 lub temp:23.1 hum:40)",
    "Wybierz źródło (port szeregowy i prędkość, TCP, UDP) i «Start» (F4)",
    "Kliknij wykres, aby mierzyć; «● Zapis CSV», aby zachować dane",
  ],
  similar: "Podobne narzędzia to Serial Plotter z Arduino IDE i otwartoźródłowy SerialPlot. PortDock Plot przyjmuje też wejście TCP i UDP oraz ramki binarne i zapisuje CSV podczas odbioru.",
};
