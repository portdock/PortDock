// PortDock TCP — Vorstellungstext.
export default {
  seo: {
    title: "PortDock TCP — Kostenloser TCP-Client, -Server und -Relay-Test",
    desc: "Kostenloses TCP-Socket-Testwerkzeug für Windows: Client, Mehrfach-Server und Relay (Mithören), Echo, Auto-Reconnect und Modbus-TCP-Framing.",
  },
  summary: "Mit einem Ethernet-Gerät verbinden (Client) oder Geräte sich mit dem PC verbinden lassen (Server). Der Server nimmt mehrere Gegenstellen an und kann an eine oder alle senden; das Relay sitzt zwischen zwei Geräten und protokolliert beide Richtungen.",
  who: [
    "Entwickler von HMI-, MES- und Host-Software",
    "Firmware-Entwickler von TCP-Geräten",
  ],
  features: [
    {
      title: "Client und Server",
      body: "Der Server nimmt bis zu 64 Gegenstellen an; an eine oder alle senden und sie einzeln trennen.",
    },
    {
      title: "Relay (Mithören)",
      body: "Sitzt zwischen A (z. B. einem HMI) und B (z. B. einer SPS), reicht den Verkehr durch und protokolliert beide Richtungen.",
    },
    {
      title: "Auto-Reconnect",
      body: "Der Client verbindet sich in einem einstellbaren Abstand neu, wenn die Verbindung abbricht.",
    },
    {
      title: "Echo-Funktion",
      body: "Der Server sendet Empfangenes zurück; über 200 pro Sekunde schaltet sich das Echo selbst ab, um Echoschleifen zu verhindern.",
    },
    {
      title: "Framing und Prüfsummen",
      body: "Den TCP-Datenstrom nach Pause, Endezeichen, fester Länge oder Modbus TCP (MBAP-Länge) trennen und neun Prüfsummenarten oder eine eigene CRC prüfen.",
    },
    {
      title: "Bind-Adresse 127.0.0.1 beim ersten Start (ab 0.10.0)",
      body: "Die «Bind-Adresse» des Servers und «Adresse dieses PCs, mit der sich A verbindet» des Relays starten mit 127.0.0.1 (nur dieser PC). Soll sich ein anderer PC oder ein HMI verbinden, wählen Sie dort 0.0.0.0 (alle Netzwerkkarten) oder die Adresse eines Adapters. Von früheren Versionen gespeicherte Einstellungen bleiben erhalten.",
    },
  ],
  steps: [
    "«Client» oder «Server» wählen, Adresse und Port eingeben",
    "«Verbinden» oder «Lauschen starten»",
    "Eingeben und «Senden»",
  ],
  uses: [
    {
      title: "Mit einem Gerät sprechen",
      body: "Wartet das Gerät auf Verbindungen, nutzen Sie «Client» mit seiner IP und seinem Port, senden Befehle und lesen die Antworten in HEX oder ASCII. Der Client verbindet sich in einem einstellbaren Abstand neu, wenn die Verbindung abbricht.",
    },
    {
      title: "Wenn sich das Gerät mit dem PC verbindet",
      body: "Öffnen Sie mit «Server» einen Port; bis zu 64 Geräte können sich verbinden. An eines oder alle senden und sie einzeln trennen.",
    },
    {
      title: "HMI-⇄-SPS-Verkehr protokollieren",
      body: "Mit «Relay» sitzt der PC zwischen zwei Geräten; richten Sie das HMI auf diesen PC, dann werden beide Richtungen protokolliert. Die Bytes laufen unverändert durch. Ab 0.8.0 kann das Relay eine pcap speichern und zeigt Modbus-/MC-Anfrage-Antwort-Paare mit Antwortzeiten.",
    },
    {
      title: "Ein Modbus-TCP-Gerät einmal auslesen",
      body: "Verbinden Sie sich mit Port 502, dann erscheint die Leiste «Als Modbus TCP zeigen». Sie trennt Anfragen und Antworten einzeln und dekodiert sie im Detailbereich. Für dauerndes Abfragen ist Modbus Master bequemer.",
    },
  ],
  faq: [
    {
      q: "Der Client kann sich nicht verbinden (CONNECT FAIL)",
      a: "Prüfen Sie Stromversorgung und Kabel des Geräts, IP und Port und ob PC und Gerät im selben Subnetz liegen (z. B. 192.168.0.x).",
    },
    {
      q: "Ich habe den Server gestartet, aber das Gerät kann sich nicht verbinden",
      a: "Achten Sie darauf, dass Sie die Windows-Firewall-Abfrage zugelassen haben und dass sich das Gerät mit der IP dieses PCs verbindet. Der Fehler «already in use» bedeutet, dass ein anderes Programm den Port belegt.",
    },
    {
      q: "Daten wirken zusammengefasst oder zerteilt",
      a: "TCP behält keine Nachrichtengrenzen. Stellen Sie das Framing unter «Empfangseinstellungen» auf Endezeichen, feste Länge oder Modbus TCP (MBAP-Länge) um oder passen Sie die Pause an.",
    },
    {
      q: "Verändert das Relay den Verkehr?",
      a: "Nein. Die Bytes werden so weitergegeben, wie sie ankommen; Framing und Prüfsummenkontrolle dienen nur dem Log, automatische Antwort und Echo sind aus. Nur was Sie selbst einspeisen, erreicht die Geräte — also Vorsicht.",
    },
  ],
  similar: "Ähnliche Werkzeuge sind das Hercules SETUP utility (HW-group, Freeware).",
};
