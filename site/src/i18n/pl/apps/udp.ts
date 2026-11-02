// PortDock UDP — opis programu.
export default {
  seo: {
    title: "PortDock UDP — darmowy nadajnik/odbiornik UDP (broadcast)",
    desc: "Darmowe narzędzie do testów UDP dla Windows: odbiór i wysyłanie datagramów, broadcast i multicast, odpowiedź do ostatniego nadawcy, echo i logi z czasem.",
  },
  summary: "Odbieraj datagramy na porcie i odpowiadaj na stały adres lub do ostatniego nadawcy. Stworzone dla urządzeń używających broadcastu i multicastu.",
  who: [
    "Każdy, kto pracuje z urządzeniami rozgłaszającymi swój stan przez UDP",
    "Zespoły sprawdzające odbiór multicastu",
  ],
  features: [
    {
      title: "Lista nadawców",
      body: "Zbiera adresy nadawców; kliknięcie jednego ustawia go jako cel.",
    },
    {
      title: "Broadcast i multicast",
      body: "Zezwól na broadcast, dołącz do grupy multicast lub dołącz ponownie, wybierz kartę sieciową.",
    },
    {
      title: "Funkcja echa",
      body: "Odsyła dane do nadawcy, z automatyczną ochroną przed pętlą.",
    },
  ],
  steps: [
    "Wpisz port nasłuchu i cel",
    "Naciśnij «Start»",
    "Wpisz tekst i «Wyślij»",
  ],
  uses: [
    {
      title: "Odbieranie rozgłoszeń stanu",
      body: "Wpisz port nasłuchu i naciśnij «Start». Każdy datagram to jedna linia logu, a nadawcy zbierają się na liście «Nadawcy» (do 256).",
    },
    {
      title: "Gdy nie znasz adresu urządzenia",
      body: "Zacznij nasłuch na porcie, na który urządzenie wysyła, i obserwuj «Nadawcy». Kliknij «Jako cel» obok adresu, aby tam odpowiadać.",
    },
    {
      title: "Wysyłanie broadcastu",
      body: "Przed startem włącz «Zezwól na broadcast», a potem wysyłaj na 255.255.255.255 lub adres typu 192.168.0.255. Gdy opcja jest wyłączona, pojawi się ostrzeżenie.",
    },
    {
      title: "Sprawdzanie odbioru multicastu",
      body: "Wpisz grupę (224–239.x.x.x), a program dołączy do niej przy starcie. Przy kilku kartach sieciowych (sieć biurowa i sieć maszyny) wybierz «Karta multicast» po stronie maszyny. Domyślny TTL równy 1 zostawia ruch w sieci lokalnej.",
    },
  ],
  faq: [
    {
      q: "Nic nie przychodzi",
      a: "Sprawdź IP i port, na które wysyła urządzenie, zezwolenie w Zaporze Windows i to, czy oba urządzenia są w tej samej podsieci. Przy multicaście sprawdź grupę i kartę sieciową oraz spróbuj «Dołącz ponownie».",
    },
    {
      q: "Start kończy się błędem «address in use»",
      a: "Inny program zajmuje port; wiersz zdarzenia podaje ten program i jego PID. Użyj innego portu lub zamknij ten program.",
    },
    {
      q: "Co znaczy «ICMP port unreachable»?",
      a: "System zgłasza, że w miejscu docelowym nic nie nasłuchuje na tym porcie. Sprawdź numer portu urządzenia i jego zasilanie.",
    },
    {
      q: "Ile mogę wysłać naraz?",
      a: "Jedno wysłanie to jeden datagram. Powyżej około 64 KB system go odrzuca.",
    },
  ],
};
