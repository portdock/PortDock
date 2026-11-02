// PortDock Plot — Vorstellungstext.
export default {
  seo: {
    title: "PortDock Plot — Kostenloser serieller Plotter mit Live-Diagramm",
    desc: "Kostenloser Live-Plotter für Zahlen von seriell, TCP oder UDP: Name:Wert im Arduino-Stil, Binärtelegramme, bis zu 32 Kanäle, Cursor und CSV-Aufzeichnung.",
  },
  summary: "Die Zahlen, die ein Arduino, Sensor oder Gerät sendet, als Live-Diagramm sehen. Liest Text mit Komma/Leerzeichen/Tab/Semikolon, «name:value» im Arduino-Stil und Binärtelegramme, mit Farbe und Achse je Kanal, Pause, Zoom und Differenzen zwischen zwei Punkten, und zeichnet beim Empfang CSV auf.",
  who: [
    "Entwickler, die Firmware abstimmen und dabei Sensor- oder Platinenwerte beobachten",
    "Servicetechniker, die die Ausgabe eines Geräts stundenlang aufzeichnen, um Auffälligkeiten zu finden",
  ],
  features: [
    {
      title: "Seriell, TCP, UDP",
      body: "COM-Ports (Baudrate, Datenbits, Parität, Stoppbits — standardmäßig 8N1 — und DTR), ein TCP-Client, der sich mit dem Gerät verbindet, und UDP-Empfang (auch Multicast). Verbindet sich nach Ab- und Anstecken neu.",
    },
    {
      title: "Text, name:value, binär",
      body: "Komma, Leerzeichen, Tab oder Semikolon werden automatisch erkannt, dazu benannte Werte wie temp:23.1 hum:40, Kopfzeilen und Telegramme mit Startbytes, u8–f64, Bytereihenfolge und Prüfsumme. Fehlerhafte Zeilen erscheinen rot mit dem Grund.",
    },
    {
      title: "Ansehen und messen",
      body: "Bis zu 32 Kanäle auf linker/rechter Achse, letzte N Punkte oder Sekunden, automatisches/festes Y, Pause (der Empfang läuft weiter), Cursor-Anzeige, Δt und Δ-Wert zwischen zwei Markern, Zoom mit dem Mausrad und Verschieben durch Ziehen.",
    },
    {
      title: "Kanalüberwachung und Alarme (ab 0.10.0)",
      body: "Je Kanal untere/obere Grenzen, hängend seit N Sekunden und Daten seit N Sekunden verloren einstellen: ausgelöste Zeilen werden hervorgehoben, dazu eine Alarmliste, optional Ton und ein Alarm-CSV-Log. Ein Hilfsmittel zur Überwachung, keine Sicherheitseinrichtung.",
    },
    {
      title: "Hält Schritt",
      body: "Das Parsen läuft in Rust; gezeichnet wird einmal pro Bild auf einem Canvas mit Min/Max je Pixel — Tausende Zeilen pro Sekunde, ohne Spitzen zu verlieren.",
    },
    {
      title: "Aufzeichnen und speichern",
      body: "Jeder Wert beim Empfang als CSV (Excel-tauglich), der sichtbare Bereich als CSV, das Diagramm als PNG. Eine Tabelle mit dem letzten Wert sowie Min, Max und Mittelwert im sichtbaren Bereich.",
    },
  ],
  steps: [
    "Das Gerät Zahlen zeilenweise ausgeben lassen (z. B. 23.1,40 oder temp:23.1 hum:40)",
    "Die Quelle wählen (serieller Port und Baudrate, TCP, UDP) und «Start» (F4)",
    "Zum Messen ins Diagramm klicken; mit «● CSV aufzeichnen» festhalten",
  ],
  similar: "Ähnliche Werkzeuge sind der Serial Plotter der Arduino IDE und das Open-Source-Programm SerialPlot. PortDock Plot nimmt zusätzlich TCP- und UDP-Eingang sowie Binärtelegramme entgegen und zeichnet beim Empfang CSV auf.",
};
