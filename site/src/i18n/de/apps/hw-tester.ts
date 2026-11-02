// PortDock Hardware Tester — Vorstellungstext.
export default {
  seo: {
    title: "PortDock Hardware Tester — WLAN-Abbrüche & Ping-Logger (kostenlos)",
    desc: "Kostenloses Windows-Werkzeug zum Protokollieren von WLAN-Abbrüchen: Ping zu Gateway und Internet im Vergleich, DNS-Zeit, Trennungsgründe und Bluetooth-Log.",
  },
  summary: "Macht aus «mein WLAN bricht ständig ab» eine Aufzeichnung. Während der Aufnahme pingt es Ihr Gateway (den Router) und eine Internetadresse nebeneinander, zeichnet Latenz und Verluste in einem Diagramm mit den von Windows protokollierten WLAN-Trennungsgründen auf derselben Zeitachse und sagt Ihnen, ob Sie auf der Router-Seite oder dahinter suchen sollten. Es protokolliert außerdem, wann sich Bluetooth-Geräte verbinden und trennen. Nur lesend, ohne Administratorrechte; es ändert keine Einstellungen.",
  who: [
    "Alle, deren WLAN ständig abbricht und die wissen wollen, ob es am Router oder am Internet liegt",
    "Menschen, die festhalten wollen, wann sich Bluetooth-Ohrhörer oder -Tastaturen trennen",
    "Servicetechniker, die vor einem Support-Gespräch die Funkverbindung eines Geräte-PCs dokumentieren",
  ],
  features: [
    {
      title: "Gateway gegen Internet",
      body: "Pingt Router und eine Internetadresse (1.1.1.1, 8.8.8.8 oder eine eigene) im selben Takt und zeigt Verlust, Mittelwert, 95. Perzentil und Jitter nebeneinander. Nie öfter als einmal pro Sekunde; eine Aufnahme endet nach 24 Stunden.",
    },
    {
      title: "Trennungsgründe von Windows im selben Diagramm",
      body: "Liest das WLAN-AutoConfig-Log (8001 Verbinden, 8003 Trennen) und zeigt es als Linien im Diagramm und mit dem Wortlaut der Windows-Gründe in der Ereignisliste. Der WLAN-Name wird nicht gelesen.",
    },
    {
      title: "DNS-Antwortzeit",
      body: "Alle 5 s wird ein Name (standardmäßig example.com) ohne Cache beim DNS-Server abgefragt, wobei Antwortzeiten und Fehlschläge gemessen werden.",
    },
    {
      title: "Zusammenfassung «Wo suchen» und CSV",
      body: "Sagt «Router-Seite», wenn Verluste das Gateway erreichen, und «hinter dem Router», wenn nur das Internetziel Antworten verliert — wo Sie suchen sollten, nicht die Ursache. Aufnahmen lassen sich als CSV speichern.",
    },
    {
      title: "Bluetooth-Verbindungslog",
      body: "Liest alle 2 s den Zustand «Verbunden» gekoppelter Geräte und protokolliert Verbindungen und Abbrüche. Namen erscheinen nur auf dem Bildschirm; gespeicherter und kopierter Text verwendet «Gerät N».",
    },
    {
      title: "USB-Verbindungs-/Trennungslog (ab 0.10.0)",
      body: "Findet heraus, welches USB-Gerät hinter einem sich wiederholenden Verbinden-/Trennen-Ton steckt. Protokolliert Zeiten von Anstecken und Entfernen mit Gerätename, VID:PID, Hub-Port und Geschwindigkeit, markiert ein Gerät, das innerhalb von 10 Minuten 3-mal oder öfter abbricht, als «Verdacht auf wiederholte Abbrüche» und ein USB-3-Gerät mit USB-2.0-Geschwindigkeit als «Worth a look». Es liest auch die letzten Zeiten von Ankunft/Entfernen aus der Zeit vor dem Start der App.",
    },
    {
      title: "Bluetooth-Audiomodus und Töne links/rechts",
      body: "Zeigt, ob die Standardausgabe Stereo (A2DP) oder Freisprechen für Anrufe ist, und spielt Testtöne links, rechts und beidseitig ab.",
    },
    {
      title: "WLAN-Signal und Kanal (auf Anforderung)",
      body: "Nur solange «Signal zeigen» an ist: Signalstärke, Verbindungsgeschwindigkeit, Band, Kanal und wie viele Netze in der Nähe jeden Kanal teilen (ohne Namen). Ab Windows 11 24H2 braucht das die Standortberechtigung (alles andere funktioniert ohne).",
    },
  ],
  steps: [
    "Internetziel und Intervall wählen, dann «Aufzeichnung starten»",
    "Laufen lassen, bis die Abbrüche auftreten — Router- und Internet-Latenz und die Windows-Gründe in einem Diagramm",
    "Unter «Zusammenfassung» ablesen, wo zu suchen ist, dann «CSV speichern…» oder «Zusammenfassung kopieren»",
  ],
  faq: [
    {
      q: "Misst es die Internetgeschwindigkeit?",
      a: "Nein. Es zeichnet Abbrüche, Latenz und Verluste auf, nicht die Download- oder Upload-Geschwindigkeit. Dafür nutzen Sie eine Speedtest-Seite.",
    },
    {
      q: "Behebt es das Problem?",
      a: "Nein. Es liest nur und ändert keine Einstellungen. Es zeigt, wo zu suchen ist (Router-Seite, hinter dem Router, DNS, Trennungsgründe von Windows).",
    },
    {
      q: "Was sendet es hinaus?",
      a: "Nur die Pings an das Gateway und die gewählte Internetadresse sowie eine DNS-Abfrage, solange aufgezeichnet wird. Die Ziele werden immer angezeigt, und nach dem Beenden wird nichts mehr gesendet.",
    },
  ],
  similar: "Ähnliche Werkzeuge sind PingPlotter (kommerziell, mit kostenloser Edition) und WifiHistoryView (kostenlos, Verlauf der Verbindungen/Trennungen). PortDock Hardware Tester ist kostenlos (GPL-3.0) und stellt Pings an Gateway und Internet sowie die Trennungsgründe von Windows zusammen mit einem Bluetooth-Verbindungslog in einem Diagramm dar.",
};
