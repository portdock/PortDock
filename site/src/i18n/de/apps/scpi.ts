// PortDock SCPI — Vorstellungstext.
export default {
  seo: {
    title: "PortDock SCPI — Kostenloses SCPI-Terminal (LAN, RS-232, ohne VISA)",
    desc: "Kostenloses SCPI-Terminal für Messgeräte über LAN-Socket (5025) oder RS-232 ohne VISA: *IDN?, Fehlerwarteschlange, *OPC?-Warten, Wiederholmessungen als CSV.",
  },
  summary: "Befehle an SCPI-Geräte wie Netzgeräte, Multimeter und Oszilloskope senden und die Antworten lesen. Verbindet sich über einen LAN-Socket (TCP 5025) oder RS-232 ohne installiertes VISA, erkennt das Gerät mit *IDN?, leert die Fehlerwarteschlange und protokolliert wiederholte Messwerte als CSV.",
  who: [
    "Entwickler, die Befehle von Hand prüfen, bevor sie eine Testautomatisierung schreiben",
    "Servicetechniker, die ein Messgerät schnell an einem PC ohne VISA ansehen wollen",
  ],
  features: [
    {
      title: "Ohne VISA",
      body: "LAN-Socket (meist 5025) und RS-232 (Baudrate, Parität, Flusssteuerung) mit LF, CR LF oder CR als Zeilenende. VXI-11, HiSLIP und USBTMC werden noch nicht unterstützt.",
    },
    {
      title: "Abfragen, Schreiben, Lesen",
      body: "Befehle mit abschließendem ? werden abgefragt, alle anderen geschrieben. Antwortzeiten, Timeouts und Antworten ohne Zeilenende werden angezeigt. Befehlsverlauf, Befehlsliste und Vervollständigung für gängige Befehle.",
    },
    {
      title: "ID, Fehlerwarteschlange, *OPC?",
      body: "*IDN? zerlegt in Hersteller, Modell, Seriennummer und Firmware; SYST:ERR? wird bis 0 abgefragt, um alle Einträge der Warteschlange aufzulisten. Schaltflächen für *RST, *CLS und das Warten auf *OPC?.",
    },
    {
      title: "Wiederholmessung",
      body: "Eine Abfrage wie MEAS:VOLT:DC? im Intervall mehrfach wiederholen, mit Wertetabelle, Trend und Statistik (Min, Max, Mittelwert, Standardabweichung), gespeichert als CSV.",
    },
    {
      title: "Blockdaten",
      body: "IEEE-488.2-Blöcke (#NXXXX…) werden über ihren Längenkopf gelesen, sodass LF-Bytes in Binärdaten sie nicht abschneiden. HEX-Vorschau und Speichern in eine Datei (z. B. PNG-Screenshots).",
    },
  ],
  steps: [
    "LAN: IP des Geräts und Port 5025; seriell: Port und Baudrate wie am Gerät",
    "«Verbinden» (F4) — *IDN? zeigt den Namen des Geräts",
    "Befehl eingeben und Enter drücken; Fehler mit «Fehlerwarteschlange leeren» prüfen",
  ],
  uses: [
    {
      title: "Befehle prüfen, bevor Sie automatisieren",
      body: "Befehle von Hand eingeben und Antwort und Antwortzeit sehen. Befehle mit abschließendem ? sind Abfragen, alle anderen Schreibbefehle. Fehler sofort mit «Fehlerwarteschlange leeren» prüfen.",
    },
    {
      title: "Ein Messgerät an einem PC ohne VISA erreichen",
      body: "Direkt über einen LAN-Socket (meist Port 5025) oder RS-232 verbinden. *IDN? wird in Hersteller, Modell, Seriennummer und Firmware zerlegt.",
    },
    {
      title: "Wiederholte Messwerte als CSV protokollieren",
      body: "Fragen Sie unter «Wiederholmessung» eine Abfrage wie MEAS:VOLT:DC? im Intervall mehrfach ab, sehen Sie Tabelle, Trend und Statistik (Min, Max, Mittelwert, Standardabweichung) und speichern alles als CSV.",
    },
    {
      title: "Blockdaten wie Screenshots abholen",
      body: "IEEE-488.2-Blöcke (#N…) werden über ihren Längenkopf gelesen, sodass LF-Bytes in Binärdaten sie nicht abschneiden. Vorschau in HEX und Speichern in eine Datei (PNG und so weiter).",
    },
  ],
  faq: [
    {
      q: "Ich erhalte «connection refused»",
      a: "Der Port ist ein anderer (siehe «socket port» im Handbuch — nicht jedes Gerät nutzt 5025) oder die Socket-Schnittstelle ist aus. Manche Geräte lehnen eine neue Verbindung ab, solange ein anderes Programm (eine VISA-Sitzung) angeschlossen ist.",
    },
    {
      q: "Ich erhalte «no response (timeout)»",
      a: "Ein Schreibbefehl wurde als Abfrage gesendet, der Befehl ist falsch geschrieben (Fehlerwarteschlange prüfen) oder das Gerät ist mit einer Messung beschäftigt. Erhöhen Sie die Antwortwartezeit oder nutzen Sie *OPC?. «Reply not finished» bedeutet, dass sich das Zeilenende (LF, CR LF, CR) von dem des Geräts unterscheidet.",
    },
    {
      q: "Was ist -410 Query INTERRUPTED?",
      a: "Der nächste Befehl wurde gesendet, bevor die Antwort gelesen war. Haben Sie eine Abfrage mit «Schreiben» gesendet, holen Sie die Antwort zuerst mit «Lesen» ab.",
    },
    {
      q: "Werden USBTMC, GPIB, VXI-11 oder HiSLIP unterstützt?",
      a: "Derzeit nicht. VXI-11 wird im Moment nicht unterstützt; HiSLIP, USBTMC und GPIB brauchen VISA oder Treiber und liegen außerhalb des Umfangs. Die meisten LAN-Geräte bieten auch einen Socket (5025), und reine USB-Geräte mit der Einstellung «USB virtual COM» funktionieren über seriell.",
    },
    {
      q: "Kann ich es ohne Messgerät ausprobieren?",
      a: "Starten Sie PortDock Simulator als TCP-Server an Port 5025 mit LF-Framing und dem Beispiel [SCPI *IDN? reply] und verbinden Sie sich dann mit 127.0.0.1:5025.",
    },
  ],
  similar: "VISA-basierte Herstellerwerkzeuge (NI MAX, Keysight Connection Expert …) können ebenfalls Befehle senden. PortDock SCPI verbindet sich über einen LAN-Socket oder RS-232 auf PCs ohne VISA.",
};
