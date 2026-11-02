// PortDock Modbus Master — Vorstellungstext. Die Zahl der eingebauten Geräte steckt im Funktionstext.
export default {
  seo: {
    title: "PortDock Modbus Master — Kostenloses Modbus-RTU/TCP-Testwerkzeug",
    desc: "Kostenloser Modbus-RTU/TCP-Master für Windows: mehrere Abfragetabellen, F32/U32, Bytereihenfolgen, 40001-Schreibweise, Schreiben, Slave-ID-Suche, CSV-Logs.",
  },
  summary: "Modbus-Geräte anstelle einer SPS oder eines HMI nach Daten fragen. Mehrere Tabellen nach Slave-ID, Funktion, Adresse und Intervall abfragen, F32/U32/Zeichenketten mit Bytereihenfolgen und in 40001-Schreibweise ansehen und per Doppelklick auf eine Zelle schreiben. Dekodiertes Anfrage-/Antwort-HEX, Statistik und CSV-Wertelog inklusive.",
  who: [
    "Servicetechniker, die die Modbus-Karte eines neuen Antriebs oder Zählers prüfen",
    "Entwickler, die die Firmware von Slave-Geräten testen",
  ],
  features: [
    {
      title: "Mehrere Abfragetabellen",
      body: "Jede Tabelle hat ihre eigene Slave-ID, Funktion (01–04), Startadresse, Anzahl und ihr Intervall, mit einem Fehlerzähler auf ihrem Reiter. Serielles RTU, Modbus TCP und RTU über TCP.",
    },
    {
      title: "Typisierte Werte und Bytereihenfolge",
      body: "U16 bis F64 und Zeichenketten in ABCD/CDAB/BADC/DCBA, HEX/BIN und 40001-Schreibweise. Teilt das CSV-Format der Registerkarte mit Modbus Slave.",
    },
    {
      title: "Schreiben mit Vorschau",
      body: "Per Doppelklick mit 05/06/0F/10 schreiben und die genauen Bytes vorab ansehen. Die Option «immer FC15/16» sendet selbst einzelne Werte mit 0F/10.",
    },
    {
      title: "Geräteprofile",
      body: (c: { nDevices: number }) => `Eines von ${c.nDevices} eingebauten Geräten (Frequenzumrichter, Temperaturregler, Leistungsmesser …) wählen, um Abfragetabellen mit Namen (Einheit und Skalierung), Typen, Slave-ID und seriellen Standardeinstellungen anzulegen.`,
    },
    {
      title: "Slave-ID- und Adresssuche",
      body: "Herausfinden, welche Slave-IDs (1–247) antworten und welche Adressbereiche lesbar sind, und sie dann in Tabellen umwandeln.",
    },
    {
      title: "Leitungseinstellungen finden (ab 0.10.0)",
      body: "Sind Baudrate, Parität und ID eines Geräts unbekannt, sendet das Programm für jede gewählte Baudrate (1200–115200) × Parität/Stoppbits × ID-Bereich einen kurzen Lesebefehl und listet die Kombinationen auf, die antworten. Auch eine Exception-Antwort bedeutet «hier ist ein Gerät». Mit Zeitschätzung, Stopp-Taste und «Mit dieser Einstellung verbinden»; ID 0 (Broadcast) wird nie benutzt. Nicht für Busse mit einem weiteren Master.",
    },
    {
      title: "«Keine Antwort» — mögliche Ursachen (ab 0.10.0)",
      body: "Ordnet die letzten Anfrageergebnisse möglichen Ursachen samt Prüfhinweisen zu — gar keine Bytes (Verdrahtung, ID, A/B-Polarität), nur die Anfrage als Echo (Echo des 2-Draht-Adapters), CRC-Fehler (Baudrate, Parität, Störungen, Abschluss), abgeschnittene Telegramme (Timeout, USB-Latenz), was die einzelnen Exception-Codes bedeuten, eine andere ID antwortet. Mit Links zu Ratgebern und zur Fehlersuchhilfe; als Text kopierbar.",
    },
    {
      title: "Gerätesicherung, Vergleich, Wiederherstellung (ab 0.10.0)",
      body: "Für Gerätetausch und Wartung. Liest mehrere Bereiche auf einmal (oder füllt sie aus einem Geräteprofil) in JSON und CSV — Bereiche über 125 werden geteilt, fehlgeschlagene Bereiche aufgelistet — und vergleicht mit dem Gerät von jetzt oder einer anderen Sicherung, wobei nur Unterschiede erscheinen. Das Wiederherstellen schreibt nur die gewählten Zellen: Vorschau (jetzt vs. zu schreiben), ein zweiter Klick zum Schreiben, danach eine Rücklesekontrolle. Eingangsregister und nur lesbare Register des Profils sind gesperrt.",
    },
    {
      title: "Timeouts, Wiederholungen, Statistik",
      body: "Timeout, Wiederholungen und Verzögerung einstellen; Anfragen, OK, Timeouts, CRC-Fehler und Exceptions mit Antwortzeiten je Tabelle zählen. Exceptions werden erklärt.",
    },
    {
      title: "Wertelog und Trends",
      body: "Werte bei jeder Abfrage oder bei Änderung als CSV protokollieren und gewählte Zellen als kleine Trendlinien beobachten.",
    },
    {
      title: "Wertüberwachung und Alarme (ab 0.10.0)",
      body: "Je Zelle: untere/obere Grenzen, keine Änderung (hängt) seit N Sekunden und Kommunikation seit N Sekunden verloren, mit Rückkehrabstand (Hysterese). Eine ausgelöste Zelle wird hervorgehoben, dazu eine Alarmliste (ausgelöst, aufgehoben, Dauer, quittieren), optional Ton, Blinken der Taskleiste und ein Alarm-CSV-Log. Ein Hilfsmittel zur Überwachung, keine Sicherheitseinrichtung.",
    },
  ],
  steps: [
    "Verbindung und Port (oder IP) an das Gerät anpassen",
    "«Verbinden» (F4), dann Slave-ID, Funktion, Startadresse und Anzahl nach dem Handbuch einstellen",
    "Zum Schreiben auf eine Zelle doppelklicken; Rechtsklick für Namen und Typ",
  ],
  similar: "Ähnliche Werkzeuge sind das kommerzielle Modbus Poll (Witte Software) und das Open-Source-Programm QModMaster. PortDock Modbus Master ist kostenlos (GPL-3.0) und zeitlich unbegrenzt.",
};
