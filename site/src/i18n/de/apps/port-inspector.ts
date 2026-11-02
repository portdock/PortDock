// PortDock Port Inspector — Vorstellungstext. Windows-Bezeichnungen wie im deutschen Windows.
export default {
  seo: {
    title: "PortDock Port Inspector — Kostenlose COM-Port-Diagnose",
    desc: "Kostenlose COM-Port-Diagnose für Windows: USB-Seriell-Treiber, Problemcode des Geräte-Managers, FTDI-Latenz, Geister-COM-Nummern. Nur lesend, Loopback-Test.",
  },
  summary: "Einen COM-Port wählen und an einer Stelle sehen, was Sie sonst aus Geräte-Manager, Ereignisanzeige und Registry zusammensuchen müssten: den Treiber, den Problemcode samt Bedeutung, den USB-Chip, Geräteeinstellungen wie den FTDI-Latenz-Timer, das USB-Energiesparen, den jüngsten Verlauf des Ansteckens und die reservierten COM-Nummern. Es liest nur, ohne Administratorrechte, und misst mit TX an RX die Umlaufzeit bei jeder Baudrate. Weitere Reiter lesen die Netzwerkadapter dieses PCs, seine Windows-Einstellungen als Anlagen-PC sowie WLAN und Bluetooth auf dieselbe Weise.",
  who: [
    "Servicetechniker, deren USB-Seriell-Adapter nicht erkannt wird oder ab und zu aussetzt",
    "Alle, die klären wollen, warum Modbus-RTU-Antworten verspätet wirken (FTDI-Latenz-Timer)",
    "Alle, die der Support-Anfrage oder dem Issue Angaben zum Port auf der PC-Seite beifügen müssen",
  ],
  features: [
    {
      title: "Gerät, Treiber, Problemcode",
      body: "Name, COM-Nummer, Ort, Instanz-ID und Hersteller; Treiberanbieter, Version, Datum, INF und Dienst; Status und der Problemcode des Geräte-Managers mit Bedeutung und Lösungsvorschlag; letztes Anstecken und Entfernen.",
    },
    {
      title: "USB-Chip und Geräteeinstellungen",
      body: "Chipname aus einer VID/PID-Tabelle (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), die Windows-Voreinstellung des Ports und die Geräteparameter des Treibers, mit Erklärung des FTDI-Latenz-Timers (LatencyTimer).",
    },
    {
      title: "Energiesparen und Verlauf",
      body: "Das selektive USB-Energiesparen aus den Energieoptionen, «Der Computer kann das Gerät ausschalten, um Energie zu sparen» für das Gerät und die USB-Geräte darüber sowie Anstecken- und Treiberereignisse aus den Ereignisprotokollen (7, 30 oder 90 Tage).",
    },
    {
      title: "Reservierte COM-Nummern",
      body: "Von Windows reservierte Nummern (ComDB), von gerade nicht angeschlossenen Geräten belegte Nummern, verwaiste Nummern und Nummern, die mehrere Geräte belegen — warum ein neuer Adapter bei COM15 landet.",
    },
    {
      title: "Verbindungstest",
      body: "Ein TX-RX-Loopback je Baudrate: gleiche, verlorene und veränderte Bytes, 1-Byte-Umlaufzeit in ms (Median und Maximum) und Fehlerflags des Treibers (ClearCommError). Zeigt auch, ob ein 2-Draht-RS-485-Adapter ein Echo liefert.",
    },
    {
      title: "Zwei-Port-Test und Muster (ab 0.10.0)",
      body: "Mit zwei miteinander verbundenen Adaptern wird bei jeder Geschwindigkeit in beide Richtungen gesendet und das Angekommene verglichen (zur Prüfung von RS-485-Adaptern). Muster: gemischte Bytes, 0x00–0xFF, 0x55/0xAA; Länge 64–4096 Bytes. Verdrahtungsplan als Text und ein Gesamturteil «No issue found (within this test) / Worth a look / Problem». Dasselbe in Serial unter «Verbindung prüfen…».",
    },
    {
      title: "Netzwerkadapter dieses PCs",
      body: "«Adapter lesen» zeigt je Adapter Verbindung, Geschwindigkeit, Duplex, IPv4 und Gateway sowie die Werte unter «Erweitert» im Geräte-Manager (Jumbo-Frames, Empfangspuffer, Interruptdrosselung, EEE …), Energiesparen, Empfangsfehler, Netzwerkprofil und ob seine Firewall an ist. Der Zweck «GigE-Kamera» zeigt von Kameraherstellern veröffentlichte Werte mit Quellen daneben.",
    },
    {
      title: "Dieser PC — Einstellungen eines Anlagen-PCs",
      body: "«Einstellungen dieses PCs lesen» liest Schnellstart, Energiesparmodus, selektives USB-Energiesparen, Neustartrichtlinie für Updates, Bildschirmschoner, Zeitsynchronisierung sowie jüngste unerwartete Herunterfahrvorgänge und Hardwarefehler. Beim Zweck «Anlagen-PC» werden Werte, die zu Stopps oder Neustarts führen können, mit «Worth a look» markiert.",
    },
    {
      title: "Dieser PC — Bluescreens, SSD-Zustand, Aufweckquellen (ab 0.10.0)",
      body: "Dieselbe Karte «Dieser PC» liest Stoppcodes von Bluescreens mit Namen (z. B. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) und Zeiten plötzlicher Abschaltungen, bei NVMe-SSDs Temperatur, verbrauchten Anteil, Reserve, Betriebsstunden und Medienfehler, was den PC aus dem Energiesparmodus geweckt hat, und bei einem Laptop-Akku Kapazität im Vergleich zur Auslegung sowie Zyklenzahl — ohne Administratorrechte. Dumpdateien werden nur aufgelistet; Seriennummern von Datenträgern werden nicht gelesen.",
    },
    {
      title: "Mit dem letzten Mal vergleichen — gespeicherte Prüfungen (ab 0.10.0)",
      body: "Die aktuelle Prüfung speichern (COM-Port-Liste, Treibername/-version/-datum, USB-Ort, Einstellungen der Netzwerkadapter, Einstellungen von «Dieser PC», Bluescreen-Einträge) und bei der nächsten Wartung erneut lesen, um nur das Veränderte zu sehen — z. B. COM3 → COM7, eine neue Treiberversion (Windows Update?), abgeschaltete Jumbo-Frames, eine geänderte Energieeinstellung, ein neuer Bluescreen. Seriennummern von Geräten, PC-Name und Benutzerordner werden nicht gespeichert. Das Ergebnis als Text oder CSV aufbewahren.",
    },
    {
      title: "Funk — WLAN und Bluetooth",
      body: "Der Reiter «Funk» liest den WLAN-Adapter, den Treiber, das Energiesparen und die von Windows geführten Trennungseinträge (nach Grund gezählt), dazu den Bluetooth-Adapter, den Dienstzustand, Fehlerereignisse und ob Bluetooth-Audio im Freisprechmodus (Anrufe) läuft — ohne Administrator- oder Standortberechtigung. Es sendet keine Pings, und Exporte blenden Gerätenamen aus.",
    },
    {
      title: "Nur lesend, klare Ergebnisse",
      body: "Es ändert nie Einstellungen oder Treiber (die Hilfe erklärt manuelle Korrekturen). Jede Karte ist mit «No issue found (in what was read) / Worth a look / Problem / Could not read» markiert; was der PC nicht sehen kann — A/B-Vertauschung, Abschluss, Bias, Masse — wird immer aufgelistet; Text- und JSON-Exporte blenden Benutzerordnerpfade aus.",
    },
  ],
  steps: [
    "In der Liste «COM-Ports» links einen Port anklicken",
    "Ergebnis und Begründung jeder Karte lesen; bei Bedarf in Windows selbst ändern, wie die Hilfe es erklärt",
    "TX mit RX verbinden für den «Verbindungstest»; mit «Text kopieren» das Ergebnis einer Anfrage beifügen",
  ],
  similar: "Ähnliche Werkzeuge sind der Windows-Geräte-Manager, NirSoft USBDeview (Freeware), Uwe Siebers USB Device Tree Viewer (Freeware) und FT_PROG von FTDI für FTDI-Chips (kostenlos). PortDock Port Inspector fasst Treiber, Problemcode, Energiesparen, Anstecken-Verlauf und COM-Nummern-Reservierungen für einen COM-Port an einer Stelle zusammen und ergänzt einen Loopback-Verbindungstest.",
};
