// PortDock Serial — Vorstellungstext (Struktur wie data/tools.ts, Namen/Befehle/Versionen unverändert).
export default {
  seo: {
    title: "PortDock Serial — Kostenloses serielles Terminal (RS-232/485)",
    desc: "Kostenloses serielles Terminal für Windows (RS-232, RS-485, USB-COM): HEX/ASCII, Auto-Reconnect, neun Prüfsummen, Modbus-RTU-Dekodierung, Logs mit Zeitstempel.",
  },
  summary: "Daten mit RS-232-, RS-485- und USB-Seriell-Geräten austauschen und ein Testprotokoll mit Zeitstempeln führen. Wird ein USB-Adapter ab- und wieder angesteckt, verbindet sich das Programm mit demselben Gerät neu.",
  who: [
    "Servicetechniker bei der Inbetriebnahme eines neuen Geräts",
    "Firmware-Entwickler, die ein UART-Protokoll testen",
    "Alle, die Modbus-RTU-Telegramme lesen müssen",
  ],
  features: [
    {
      title: "Erkennbare Ports",
      body: "Zeigt neben jedem Port Gerätename, USB-VID:PID und Seriennummer und aktualisiert beim Ein- und Ausstecken.",
    },
    {
      title: "Übersteht Unterbrechungen",
      body: "Öffnet nach dem Wiederanstecken dasselbe Gerät, auch wenn sich die COM-Nummer geändert hat, und protokolliert jeden Abbruch und jede Wiederverbindung.",
    },
    {
      title: "Vier Framing-Modi",
      body: "Pause, Endezeichen, feste Länge oder Modbus RTU — so wird aus einem Telegramm eine Zeile.",
    },
    {
      title: "Neun Prüfsummen plus eigene CRC",
      body: "Beim Senden CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 oder eine eigene CRC anhängen und beim Empfang prüfen.",
    },
    {
      title: "Modbus-RTU-Dekodierung",
      body: "Zerlegt Anfragen, Antworten und Exceptions in Adresse, Funktion und Werte.",
    },
    {
      title: "Signalleitungen",
      body: "DTR/RTS schalten und CTS/DSR/RI/CD über Anzeigen und im Log beobachten.",
    },
    {
      title: "Testprotokolle",
      body: "Zeitstempel auf die Millisekunde, eine Befehlsliste, wiederholtes Senden und fortlaufendes Protokollieren in eine Datei.",
    },
    {
      title: "Verbindung prüfen…",
      body: "Liest ohne Administratorrechte Gerät, Treiber, Problemcode, FTDI-Latenz-Timer und USB-Energiesparen des gewählten Ports aus und führt einen Loopback- oder 2-Draht-RS-485-Echotest durch. Ab 0.10.0 auch ein Zwei-Port-Test (zwei miteinander verbundene Adapter), Muster (0x00–0xFF, 0x55/0xAA) und ein Verdrahtungsplan. Es wird nichts verändert.",
    },
    {
      title: "Port-Freigabe — COM ↔ TCP (ab 0.10.0)",
      body: "Stellt den geöffneten COM-Port als TCP-Server bereit, sodass andere Programme, WSL2, Docker oder ein anderer PC denselben Port nutzen können. Roh oder RFC 2217 (Baudrate/Parität aus der Ferne ändern); empfangene Daten gehen an alle Clients, der sendende Client wird im Log markiert. Standardmäßig nur dieser PC (127.0.0.1); andere PCs nur, wenn Sie es erlauben. Kein virtueller COM-Treiber, keine Administratorrechte.",
    },
    {
      title: "Modbus-TCP-↔-RTU-Gateway (ab 0.10.0)",
      body: "Macht den PC zum Gateway — SCADA, ein HMI oder ein PC-Programm verbindet sich per Modbus TCP (standardmäßig Port 502), die Anfragen gehen als RTU-Telegramme an RS-485-Geräte, die Antworten kommen als MBAP zurück. Eine Anfrage nach der anderen, keine Antwort → Exception 0B, kein Weg → 0A, Statistik zu Anfragen/Antworten/Timeouts und Logzeilen wie «TCP #1 → RTU Adresse 3 FC03».",
    },
    {
      title: "Modbus-RTU-Mithören ohne Senden (ab 0.10.0)",
      body: "Hört den Verkehr zwischen Master und Slave über einen Adapter am RS-485-Bus mit, ohne zu senden. Telegramme werden per CRC getrennt (mit erneuter Synchronisierung, wenn Pausen verschwimmen), mit Anfrage/Antwort-Paaren, Antwortzeiten, ausbleibenden Antworten, Exceptions und Statistik. Bei RS-232 laufen zwei Ports an einem Y-Kabel auf einer Zeitachse zusammen. Protokollierung in Dateien, auch als CSV.",
    },
  ],
  steps: [
    "Port, Baudrate und Parität wählen, dann «Verbinden»",
    "HEX oder ASCII eingeben; bei Bedarf Prüfsumme oder Zeilenende anhängen",
    "«Senden» — Empfangenes erscheint als RX ◀, Gesendetes als TX ▶",
  ],
  similar: "Ähnliche Werkzeuge sind Tera Term und PuTTY (Open-Source-Terminals). PortDock Serial bringt Funktionen für den Gerätetest — USB-Wiederverbindung, Framing, Prüfsummenkontrolle, Modbus-RTU-Dekodierung — auf einen Bildschirm.",
};
