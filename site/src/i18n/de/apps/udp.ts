// PortDock UDP — Vorstellungstext.
export default {
  seo: {
    title: "PortDock UDP — Kostenloser UDP-Sender/-Empfänger mit Broadcast",
    desc: "Kostenloses UDP-Testwerkzeug für Windows: Datagramme empfangen und senden, Broadcast und Multicast, Antwort an den letzten Absender, Echo, Logs mit Zeitstempel.",
  },
  summary: "Datagramme an einem Port empfangen und an ein festes Ziel oder den letzten Absender antworten. Gemacht für Geräte mit Broadcast und Multicast.",
  who: [
    "Alle, die mit Geräten arbeiten, die ihren Status per UDP als Broadcast senden",
    "Teams, die den Multicast-Empfang prüfen",
  ],
  features: [
    {
      title: "Absenderliste",
      body: "Sammelt Absenderadressen; ein Klick übernimmt eine davon als Ziel.",
    },
    {
      title: "Broadcast und Multicast",
      body: "Broadcast erlauben, einer Multicast-Gruppe beitreten oder neu beitreten, die Netzwerkkarte wählen.",
    },
    {
      title: "Echo-Funktion",
      body: "Sendet das Empfangene an den Absender zurück, mit automatischem Schutz vor Endlosschleifen.",
    },
  ],
  steps: [
    "Empfangsport und Ziel eingeben",
    "«Start» drücken",
    "Eingeben und «Senden»",
  ],
  uses: [
    {
      title: "Status-Broadcasts empfangen",
      body: "Empfangsport eingeben und «Start» drücken. Jedes Datagramm ergibt eine Logzeile, die Absender sammeln sich in der Liste «Absender» (bis zu 256).",
    },
    {
      title: "Wenn die Geräteadresse unbekannt ist",
      body: "Hören Sie an dem Port mit, an den das Gerät sendet, und beobachten Sie «Absender». Mit «Als Ziel» neben einer Adresse antworten Sie dorthin.",
    },
    {
      title: "Einen Broadcast senden",
      body: "Schalten Sie vor dem Start «Broadcast erlauben» ein und senden Sie dann an 255.255.255.255 oder eine Adresse wie 192.168.0.255. Ist die Option aus, werden Sie gewarnt.",
    },
    {
      title: "Multicast-Empfang prüfen",
      body: "Geben Sie eine Gruppe (224–239.x.x.x) ein; beim Start wird ihr beigetreten. Bei mehreren Netzwerkkarten (Büro- und Maschinennetz) wählen Sie den «Multicast-Adapter» auf der Maschinenseite. Die Standard-TTL von 1 bleibt im lokalen Netz.",
    },
  ],
  faq: [
    {
      q: "Es kommt nichts an",
      a: "Prüfen Sie IP und Port, an die das Gerät sendet, die Freigabe in der Windows-Firewall und ob beide im selben Subnetz liegen. Bei Multicast Gruppe und Netzwerkkarte prüfen und «Neu beitreten» versuchen.",
    },
    {
      q: "Der Start schlägt mit «address in use» fehl",
      a: "Ein anderes Programm belegt den Port; die Ereigniszeile nennt dieses Programm und seine PID. Einen anderen Port wählen oder das Programm schließen.",
    },
    {
      q: "Was bedeutet «ICMP port unreachable»?",
      a: "Das Betriebssystem meldet, dass am Ziel nichts an diesem Port lauscht. Portnummer und Stromversorgung des Geräts prüfen.",
    },
    {
      q: "Wie viel kann ich auf einmal senden?",
      a: "Ein Sendevorgang ist ein Datagramm. Ab etwa 64 KB lehnt das Betriebssystem es ab.",
    },
  ],
};
