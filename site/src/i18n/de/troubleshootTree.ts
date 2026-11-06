// Texte des Fragebaums im Fehlersuche-Assistenten (Deutsch) — die Baumform (IDs, nächste Knoten, Links) teilen alle Sprachen in data/troubleshoot.ts, hier stehen nur die Texte je Knoten-ID.
// Fragen: q, hint (nur wenn der Baum einen Hinweis hat), opts (nur Antworten außer Ja/Nein, in Antwortreihenfolge). Ergebnisse: title, causes, checks (gleiche Anzahl und Reihenfolge wie im Baum).
// Fehlende IDs oder abweichende Anzahlen findet checkText() in lib/troubleshoot.ts (i18n.test.ts). Wortwahl „mögliche Ursache“ — nichts wird als sicher hingestellt.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Ja",
  no: "Nein",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: keine Antwort oder verstümmelt",
    rs232: "RS-232 kommuniziert nicht",
    tcp: "Modbus-TCP-/Ethernet-Gerät lässt sich nicht verbinden",
    usb: "USB-Seriell-Adapter wird nicht erkannt oder bricht ab",
    ma: "4–20-mA-Wert sieht falsch aus",
    sensor: "NPN/PNP-Sensoreingang kommt nicht an",
    mc: "MC-Protokoll (Mitsubishi) verbindet nicht",
    pcusb: "Ein USB-Gerät am PC trennt sich immer wieder",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Kommt überhaupt keine Antwort?", hint: "„Nein“ = Antworten kommen manchmal oder enthalten verstümmelte Bytes" },
    "rs485-txled": { q: "Blinkt die TX-LED des Adapters, wenn eine Anfrage gesendet wird?", hint: "Keine LED? Stattdessen prüfen, ob die gesendeten Bytes im Protokoll von PortDock Serial erscheinen" },
    "rs485-settings": { q: "Haben Sie Baudrate, Parität, Stoppbits und Slave-Adresse einzeln mit dem Einstellmenü des Geräts (oder dem Handbuch) abgeglichen?" },
    "rs485-swap": { q: "Kommt eine Antwort, wenn Sie die Adern A und B (D+/D−) tauschen?", hint: "Das Tauschen beschädigt die Geräte nicht" },
    "rs485-single": { q: "Antwortet ein einzelnes Gerät, das mit kurzem Kabel direkt am Adapter hängt?" },
    "rs485-garbled": { q: "Sehen die empfangenen Bytes verfälscht aus (CRC-Fehler, seltsame Zeichen)?", hint: "„Nein“ = die Bytes sehen richtig aus, aber Antworten fehlen gelegentlich (Zeitüberschreitungen)" },
    "rs485-slower": { q: "Wird die Verfälschung geringer, wenn Sie die Baudrate senken oder das Kabel kürzen?" },
    "rs485-timeout": { q: "Fehlen weniger Antworten, wenn Sie die Antwortzeitüberwachung verlängern (z. B. 1000 ms)?" },
    "r-rs485-port": {
      title: "Die Anfrage verlässt den PC nicht — Schnittstelle oder Treiber",
      causes: [
        "Die falsche COM-Nummer ist geöffnet (sie ändert sich, wenn der Adapter an einen anderen USB-Port kommt)",
        "Ein anderes Programm (SCADA, ein zuvor benutztes Terminal) belegt die Schnittstelle noch",
        "Treiberproblem (Warnsymbol oder Problemcode im Geräte-Manager)",
        "Der Adapter schaltet bei 2-Draht-RS-485 die Senderichtung nicht automatisch um",
      ],
      checks: [
        "Die COM-Nummer des Adapters im Geräte-Manager unter „Anschlüsse (COM & LPT)“ suchen und mit der Programmeinstellung abgleichen",
        "Treiber und Problemcode der Schnittstelle in Port Inspector lesen und mit dem 2-Draht-RS-485-Echotest prüfen, ob überhaupt gesendet wird",
        "Mit einem Messgerät (V⎓) an A–B sollte der Wert springen, wenn wiederholt Anfragen gesendet werden — bleibt er ruhig, wird nichts gesendet",
      ],
    },
    "r-rs485-settings": {
      title: "Die Kommunikationseinstellungen weichen wahrscheinlich ab",
      causes: [
        "Baudrate oder Parität weichen ab (z. B. Gerät 8E1, Programm 8N1)",
        "Die Slave-Adresse weicht ab, oder es wird 0 (Broadcast) verwendet — auf Broadcasts gibt es keine Antwort",
        "Das Geräteprotokoll ist nicht Modbus RTU (Herstellerprotokoll oder ASCII), oder Einstellungen wurden geändert, ohne zu speichern und neu zu starten",
      ],
      checks: [
        "Die Kommunikationsparameter vom Gerätedisplay notieren und Zeile für Zeile mit dem Programm vergleichen",
        "Bei Frequenzumrichtern auch die Parameter „Quelle für Fahrbefehl“ und „Protokollauswahl“ prüfen",
        "Ist die Baudrate unbekannt, mit Modbus Master suchen — Suche nach Slave-Adressen, Baudrate/Parität mit „Leitungseinstellungen suchen“ (ab 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Die A/B-Bezeichnung (+/−) war vertauscht",
      causes: ["Hersteller sind sich uneinig, ob A oder B das + ist (die Modbus-Spezifikation sagt D1 = B = +, D0 = A = −)", "Vielleicht sind nur einige Geräte vertauscht — antworten nach dem Tausch andere nicht mehr, deren Bezeichnung prüfen"],
      checks: ["Versorgung ein, Polling angehalten: rot an B (D1·+), schwarz an A (D0·−) sollte bei vorhandenem Bias +200 mV oder mehr zeigen", "Den getauschten Zustand im Anschlussplan festhalten, damit niemand ihn zurücktauscht"],
    },
    "r-rs485-bus": {
      title: "Ein Gerät allein geht, am Bus nicht — Busverdrahtung oder Aufbau",
      causes: [
        "Drei oder mehr Abschlüsse (Schalter eines Geräts in der Mitte an) oder gar keiner",
        "Zwei Geräte haben dieselbe Slave-Adresse und antworten gleichzeitig, was beide Antworten zerstört",
        "Lange Stichleitungen oder Sternverdrahtung, oder eine Unterbrechung an einer Zwischenklemme",
        "Keine SG-Ader (Common), wodurch entfernte Geräte aus dem Gleichtaktbereich geraten",
      ],
      checks: [
        "Alles spannungsfrei, Widerstand A–B: etwa 60 Ω (beide Enden), etwa 120 Ω (ein Ende), einige hundert Ω bis mehrere kΩ oder mehr (keiner — viele Geräte oder sichtbare Bias-Widerstände ziehen ihn auf etwa 1 kΩ herunter), 40 Ω oder weniger (zu viele). Ein RC-Abschluss (1 nF + 120 Ω) ist für Gleichstrom unsichtbar und misst sich wie „keiner“",
        "Versorgung ein: A–SG und B–SG innerhalb −7 bis +12 V",
        "Geräte einzeln wieder anschließen, um zu sehen, wo es scheitert; alle Slave-Adressen auflisten",
      ],
    },
    "r-rs485-device": {
      title: "Scheitert schon mit einem Gerät — Geräteeinstellungen, Kommunikationsanschluss oder Adapter",
      causes: ["Geräteeinstellungen nicht gespeichert oder erst nach einem Neustart wirksam", "Die Kommunikation liegt auf einer Optionskarte oder an eigenen Klemmen, oder eine 2-Draht/4-Draht-Moduseinstellung", "Adapter defekt, oder an RS-422-/RS-232-Klemmen statt RS-485 angeschlossen"],
      checks: ["Den Adapter allein mit dem 2-Draht-RS-485-Echotest von Port Inspector testen", "Dasselbe Gerät mit einem anderen Adapter oder PC versuchen", "Im Gerätehandbuch die Nummern der Kommunikationsklemmen nachschlagen und wann neue Einstellungen wirksam werden"],
    },
    "r-rs485-signal": {
      title: "Signalqualität — Reflexionen, Störungen, Länge",
      causes: ["Kein Abschluss oder nur an einem Ende — Reflexionen auf langen, schnellen Leitungen", "Kabel zu lang für die Baudrate (etwa Baudrate × Meter ≤ 10^8)", "Nicht verdrillt, parallel zu Leistungskabeln verlegt oder Schirm nicht geerdet"],
      checks: ["Spannungsfrei: A–B etwa 60 Ω", "Gleichtaktspannung A–SG und B–SG innerhalb −7 bis +12 V, auch bei laufenden Motoren", "Die Längengrenze für diese Baudrate im RS-485-Rechner nachsehen"],
    },
    "r-rs485-framing": {
      title: "Telegramme verschoben — Einstellungen, Echo oder Zerteilung",
      causes: ["Baudrate oder Parität leicht daneben (einige Bytes können trotzdem richtig aussehen)", "Ein 2-Draht-Adapter gibt die Anfrage als Echo zurück, das vor der Antwort erscheint", "USB-Latenz teilt eine Antwort in zwei Stücke, die der Empfänger getrennt auswertet"],
      checks: ["Die empfangenen Bytes in den Modbus-Telegramm-Decoder einfügen und Adresse, Funktion und CRC prüfen", "Adapter-Echo und FTDI-Latenz-Timer in Port Inspector prüfen"],
    },
    "r-rs485-timing": {
      title: "Zeitverhalten zu knapp — Timeout, Abfrageintervall, USB-Latenz",
      causes: ["Timeout kürzer als die Antwortzeit des Geräts (Umrichter und Zähler brauchen einige zehn bis hundert ms)", "Die nächste Anfrage kommt zu früh und überlappt die vorige Antwort", "Der Latenz-Timer des USB-Adapters (FTDI-Standard 16 ms) kommt bei jedem kurzen Telegramm hinzu"],
      checks: ["Anfrage-/Antwortzeit und das Mindest-Timeout mit dem Rechner für serielle Übertragungszeiten bestimmen", "Den Wert des Latenz-Timers mit Port Inspector lesen"],
    },
    "r-rs485-idle": {
      title: "Leitung schwebt im Ruhezustand oder Antworten kollidieren — Bias oder Adressen",
      causes: ["Keine Bias-Widerstände (Failsafe), daher werden Störungen im Ruhezustand als Bytes gelesen", "Zwei Geräte mit derselben Adresse kollidieren gelegentlich", "Störungen nur, wenn Motoren oder Umrichter laufen (Schirm, Erdung)"],
      checks: ["Versorgung ein, Polling angehalten: Differenzspannung B–A +200 mV oder mehr", "Alle Geräte und Adressen in einem Systemplan auflisten, um Doppelte zu finden", "Vergleichen, wann Antworten fehlen und wann Motoren laufen"],
    },

    // ② RS-232
    "rs232-seen": { q: "Erscheint die COM-Schnittstelle im Geräte-Manager des PCs?", hint: "Bei einem USB-RS232-Adapter führt „Nein“ zum Zweig für die Adaptererkennung" },
    "rs232-loop": { q: "Kommen gesendete Zeichen zurück, wenn Pin 2 (RXD) und Pin 3 (TXD) der DB9 am PC gebrückt sind (Loopback)?" },
    "rs232-cross": { q: "Ist TX des Geräts mit RX des PCs (Pin 2) und TX des PCs (Pin 3) mit RX des Geräts verbunden — also gekreuzt?", hint: "Unsicher? „Nein“ wählen, um zu sehen, wie man es prüft" },
    "rs232-flow": { q: "Ist die Flusssteuerung im Programm und am Gerät auf „Keine“ gestellt?" },
    "r-rs232-pc": {
      title: "Blockiert an der PC-Schnittstelle oder am Adapter",
      causes: ["Ein anderes Programm belegt die Schnittstelle, oder die falsche COM-Nummer ist geöffnet", "Adapter oder Schnittstelle defekt, Treiberproblem", "Falsche Pins gebrückt (Loopback ist Pin 2–3)"],
      checks: ["Im Ruhezustand zeigt Pin 3 (TXD) gegen Pin 5 (GND) −5 bis −15 V (−3 bis −5 V ist schwach — prüfenswert)", "Den Loopback-Test von Port Inspector ausführen und prüfen, ob die Bytes bei jeder Baudrate zurückkommen"],
    },
    "r-rs232-cross": {
      title: "Vielleicht ist TX mit TX verbunden — gekreuztes oder 1:1-Kabel",
      causes: ["PC und Gerät sind beide DTE, verwendet wird aber ein 1:1-Kabel (TX–TX) — nötig ist ein Nullmodemkabel (gekreuzt)", "Oder das Gerät ist DCE und es wird ein gekreuztes Kabel verwendet"],
      checks: ["An jedem Stecker ist der Pin mit −5 bis −15 V im Ruhezustand (bei schwachem Treiber −3 bis −5 V) der TX dieser Seite — teilen sich beide TX-Pins eine Ader, arbeiten sie gegeneinander", "Mit dem Durchgangsprüfer am Kabel prüfen, ob 2↔3 gekreuzt sind"],
    },
    "r-rs232-flow": {
      title: "Flusssteuerung passt nicht",
      causes: ["Hardware-Flusssteuerung (RTS/CTS) ist an, aber CTS nicht angeschlossen, daher wartet der PC endlos", "Das Gerät braucht ein gesetztes DTR/DSR, verwendet wird aber nur ein 3-adriges Kabel"],
      checks: ["Im Programm die Flusssteuerung auf „Keine“ stellen und erneut testen", "Braucht das Gerät Handshake, RTS–CTS (7–8) und DTR–DSR–DCD (4–6–1) im Stecker brücken oder ein vollständig belegtes Handshake-Kabel verwenden"],
    },
    "r-rs232-settings": {
      title: "Die Verdrahtung sieht richtig aus — Einstellungen, Befehlsformat oder Signalpegel",
      causes: ["Baudrate, Datenbits, Parität oder Stoppbits weichen ab", "Zeilenende (CR, LF, CR LF) oder Prüfsumme weichen von dem ab, was das Gerät erwartet", "Der Geräteanschluss ist ein TTL-UART (3,3/5 V), kein RS-232"],
      checks: ["Liegt TX des Geräts im Ruhezustand auf +3,3 oder +5 V, ist es TTL — nicht direkt an eine RS-232-Schnittstelle anschließen", "In HEX senden und empfangen und Zeilenenden und Prüfsummen Byte für Byte vergleichen"],
    },

    // ③ Modbus TCP · Ethernet
    "tcp-ping": { q: "Antwortet das Gerät auf einen Ping vom PC?" },
    "tcp-subnet": { q: "Liegen die IP-Adressen von PC und Gerät im selben Subnetz? (z. B. 192.168.0.10/24 und 192.168.0.50)" },
    "tcp-link": { q: "Leuchten die Link-LEDs an den LAN-Ports von PC und Gerät (oder Switch)?" },
    "tcp-502": { q: "Lässt sich eine TCP-Verbindung zu Port 502 (oder dem Port aus dem Handbuch) öffnen?", hint: "Mit PortDock TCP verbinden oder in PowerShell Test-NetConnection <IP> -Port 502 ausführen" },
    "tcp-reply": { q: "Bekommt eine Anfrage nach dem Verbinden eine Antwort?" },
    "tcp-exception": { q: "Ist die Antwort eine Ausnahme (Funktionscode + 0x80, z. B. 83 02)?", hint: "„Nein“ = Antworten kommen, aber die Werte sehen falsch aus" },
    "r-tcp-subnet": {
      title: "Unterschiedliche IP-Subnetze",
      causes: ["Die Netzanteile unterscheiden sich, daher erreichen sich beide nicht ohne Gateway", "Die IP-Adresse des Geräts ist unbekannt (Werkseinstellung oder DHCP)"],
      checks: ["Beide IP-Adressen und Masken im Subnetzrechner eingeben, um zu sehen, ob sie ein Subnetz teilen", "Dem PC-Adapter eine zweite IP-Adresse im Subnetz des Geräts geben (z. B. 192.168.0.200/24)", "Ist die IP-Adresse unbekannt, sie mit Net Scan suchen"],
    },
    "r-tcp-link": {
      title: "Keine physische Verbindung — Kabel, Port oder Switch",
      causes: ["Kabel oder Stecker defekt, oder an einem anderen Port eingesteckt", "Switch ohne Versorgung oder Port abgeschaltet, oder LAN-Port des Geräts deaktiviert"],
      checks: ["Kabel und Switch-Port tauschen", "Link, Geschwindigkeit und Duplex mit „Adapter lesen“ in Port Inspector auslesen"],
    },
    "r-tcp-noping": {
      title: "Link steht, aber kein Ping",
      causes: ["Das Gerät ist so eingestellt, dass es nicht auf Ping (ICMP) antwortet — die Verbindung zu 502 direkt testen", "Zwei Geräte haben dieselbe IP-Adresse (Adresskonflikt)", "Ein anderer PC-Adapter (z. B. WLAN) liegt im selben Subnetz und der Verkehr geht dort hinaus; Firewall"],
      checks: ["Das Gerät abstecken und pingen — kommt eine Antwort, hat ein anderes Gerät diese IP-Adresse", "Das Subnetz mit Net Scan nach IP- und MAC-Adressen absuchen; doppelte IP-Adressen in einem Systemplan prüfen", "Andere Adapter vorübergehend deaktivieren und erneut versuchen"],
    },
    "r-tcp-port": {
      title: "Ping geht, aber Port 502 lehnt ab",
      causes: ["Modbus TCP ist am Gerät deaktiviert oder eine Option (eigene Karte oder Lizenz)", "Der Port ist nicht 502", "Die Verbindungsgrenze ist erreicht (SCADA oder HMI bereits verbunden)"],
      checks: ["Modbus-TCP-Einstellung, Port und maximale Verbindungen im Handbuch prüfen", "Andere Clients kurz trennen und neu verbinden"],
    },
    "r-tcp-unitid": {
      title: "Verbunden, aber keine Antwort — Unit-ID oder Gateway",
      causes: ["Falsche Unit-ID — hinter einem Gateway muss sie der RTU-Slave-Adresse entsprechen; bei direkt angeschlossenen Geräten den Wert aus dem Handbuch verwenden (1 oder 255 sind üblich)", "Die RTU-Seite des Gateways (Baudrate, Verdrahtung) scheitert — es verwirft die Anfrage oder gibt Ausnahme 0B zurück", "Ein Funktionscode, den das Gerät nicht unterstützt"],
      checks: ["Die ausgetauschten Bytes im Modbus-Telegramm-Decoder entschlüsseln, um MBAP und Unit-ID zu sehen"],
    },
    "r-tcp-exception": {
      title: "Das Gerät antwortet mit einer Ausnahme — Adresse, Funktion oder Anzahl",
      causes: ["Ausnahme 02: Adresse existiert nicht — Schreibweise 40001 nicht in eine 0-basierte Adresse umgerechnet (um eins verschoben)", "Ausnahme 01: Funktion nicht unterstützt (z. B. Input-Register mit 03 gelesen)", "Ausnahme 03: Anzahl über 125 oder über der Grenze des Geräts"],
      checks: ["Die Antwort in den Modbus-Telegramm-Decoder einfügen, um die Bedeutung der Ausnahme zu sehen", "Prüfen, ob die Registerliste 0- oder 1-basierte Adressen verwendet"],
    },
    "r-tcp-values": {
      title: "Kommunikation läuft, aber die Werte sehen falsch aus — Format, Reihenfolge oder Skalierung",
      causes: ["Die Wortreihenfolge von 32-Bit-Werten (Float, Int32) weicht ab (ABCD, CDAB …)", "Skalierung (×0,1, ×0,01), Vorzeichen (int16/uint16) oder Wandlerverhältnis nicht berücksichtigt", "Adresse um eins verschoben (0- oder 1-basiert)"],
      checks: ["Die beiden Register in den Modbus-Float-Umrechner eingeben und alle vier Reihenfolgen vergleichen", "Mit dem Ganzzahl-Umrechner vorzeichenbehaftet und vorzeichenlos vergleichen"],
    },

    // ④ USB-Seriell-Adapter
    "usb-sound": { q: "Spielt Windows beim Einstecken des Adapters den Verbindungston, oder ändert sich der Geräte-Manager?" },
    "usb-com": { q: "Erscheint er unter „Anschlüsse (COM & LPT)“ mit einer COM-Nummer?", hint: "„Nein“ = er steht unter „Andere Geräte“, mit Warnsymbol oder als unbekannt" },
    "usb-drops": { q: "Bricht er während der Nutzung ab (die Schnittstelle verschwindet und kommt wieder)?" },
    "usb-motor": { q: "Bricht er ab, wenn große Lasten wie Motoren, Umrichter oder Schweißgeräte anlaufen oder laufen?" },
    "usb-comnum": { q: "Ändert sich die COM-Nummer bei jedem Einstecken oder springt sie hoch wie COM15?", hint: "„Nein“ = erkannt und verbunden, aber die Kommunikation ist langsam oder Antworten werden zerteilt" },
    "r-usb-none": {
      title: "Überhaupt nicht als USB-Gerät erkannt — Kabel, Port oder Adapter",
      causes: ["Ein reines Ladekabel (ohne Datenadern)", "Problem mit Front-Port oder Hub, Verbindung oder Stromversorgung", "Adapter defekt"],
      checks: ["Direkt an einem hinteren Port ohne Hub und mit einem anderen Kabel einstecken", "Prüfen, ob sich ein anderer PC genauso verhält", "Prüfen, ob das Einstecken im USB-Verbindungsprotokoll von Hardware Tester erscheint (ab 0.10.0)"],
    },
    "r-usb-driver": {
      title: "Treiber fehlt oder das Gerät kann nicht starten",
      causes: ["Kein Treiber für den Chip installiert (FTDI, CH34x, CP210x, PL2303)", "Der Treiber lehnt den Chip ab (Code 10 o. Ä.) — häufig bei älteren PL2303-Chips"],
      checks: ["VID:PID, Chipnamen und den Problemcode mit seiner Bedeutung in Port Inspector lesen", "Den Treiber von der Website des Chipherstellers verwenden (bei Bedarf an Administratorrechten die IT fragen)"],
    },
    "r-usb-emi": {
      title: "Störungen oder Massedifferenz gelangen in den USB",
      causes: ["Bei einem nicht isolierten Adapter setzt die Potenzialdifferenz zwischen Geräte- und PC-Masse den USB zurück", "Kommunikations- oder USB-Kabel verläuft neben Leistungskabeln"],
      checks: ["Spannung zwischen USB-Schirm des PCs und SG/PE des Geräts (V⎓ und V~): unter 1 V ist üblich; 7 V oder mehr ist ein Problem", "Einen galvanisch getrennten Adapter, ein kürzeres USB-Kabel oder Ferritkerne ausprobieren", "Abbruchzeiten im USB-Protokoll von Hardware Tester mit den Laufzeiten der Motoren vergleichen (ab 0.10.0)"],
    },
    "r-usb-power": {
      title: "Energiesparen, Stromversorgung oder Kontakt",
      causes: ["Selektives USB-Energiesparen oder „Computer kann das Gerät ausschalten, um Energie zu sparen“", "Ein busversorgter Hub mit zu wenig Strom oder ein lockerer Stecker"],
      checks: ["Energiespareinstellungen und die letzten Einsteckvorgänge mit Port Inspector lesen (nur lesend — Änderungen selbst in Windows vornehmen)", "Prüfen, ob Bewegen des Kabels einen Abbruch auslöst"],
    },
    "r-usb-comnum": {
      title: "COM-Nummer wechselt — Port-Position, Seriennummer, Reservierungen",
      causes: ["Chips ohne Seriennummer (CH34x u. a.) bekommen an jedem USB-Port eine neue Nummer", "Früher angeschlossene Geräte halten Nummern reserviert (ComDB)"],
      checks: ["Immer denselben USB-Port verwenden", "Die reservierten COM-Nummern in Port Inspector ansehen", "PortDock Serial öffnet dasselbe Gerät wieder, auch wenn sich seine Nummer ändert"],
    },
    "r-usb-latency": {
      title: "Verbunden, aber langsam oder Antworten zerteilt — USB-Latenz",
      causes: ["Der FTDI-Latenz-Timer (Standard 16 ms) verzögert jedes kurze Telegramm", "Das Programm behandelt jedes Bruchstück als eigene Antwort", "Gibt es gar keine Kommunikation, mit dem Zweig RS-485 oder RS-232 weitermachen"],
      checks: ["Latenz-Timer und Loopback-Umlaufzeit in Port Inspector prüfen", "Mit der erwarteten Antwortzeit aus dem Rechner für serielle Übertragungszeiten vergleichen"],
    },

    // ⑤ 4–20 mA
    "ma-kind": { q: "Wie sieht der Wert falsch aus?", opts: ["Bleibt auf 0 (oder Minimum)", "Bleibt auf Maximum", "Schwankt oder springt", "Bewegt sich, passt aber nicht zur Wirklichkeit"] },
    "ma-flow": { q: "Fließen mit einem Messgerät (mA) in Reihe in der Schleife mehr als 3,6 mA?" },
    "ma-volt": { q: "Liegt an den Klemmen + und − des Messumformers Spannung an (meist 10 V oder mehr)?" },
    "ma-high": { q: "Beträgt der gemessene Strom 21 mA oder mehr?" },
    "ma-motor": { q: "Wird die Schwankung größer, wenn Motoren oder Umrichter laufen?" },
    "ma-loopv": { q: "Liegt die Klemmenspannung des Messumformers nahe 20 mA noch über der Mindestbetriebsspannung aus seinem Handbuch?" },
    "r-ma-open": {
      title: "Weder Strom noch Spannung in der Schleife — Unterbrechung oder Versorgung",
      causes: ["Drahtbruch, lose Klemme oder Sicherung", "Schleifenversorgung (24 V) aus oder woanders angeschlossen", "Ein 4-Leiter-Messumformer (getrennt versorgt) ist wie ein 2-Leiter-Gerät verdrahtet und bekommt keine Versorgung"],
      checks: ["24 V am Netzteil und dann am Messumformer messen, um zu finden, wo sie verschwinden", "Die tatsächliche Verdrahtung mit den Plänen für 2/3/4-Leiter vergleichen"],
    },
    "r-ma-tx": {
      title: "Spannung vorhanden, aber kein Strom — Messumformer oder Polarität",
      causes: ["Polarität bei 2-Leiter vertauscht (+ und − getauscht)", "Der Empfangseingang ist auf Spannung eingestellt und öffnet damit praktisch die Schleife", "Messumformer defekt"],
      checks: ["+ und − des Messumformers erneut mit dem Plan im Handbuch abgleichen", "Kanaltyp (Strom/Spannung) der Eingangsbaugruppe in der Einstellung oder am Jumper prüfen"],
    },
    "r-ma-input": {
      title: "Strom fließt, aber der Wert ist 0 — Einstellung oder Skalierung auf der Empfangsseite",
      causes: ["Eingangsbereich anders eingestellt (0–20 mA, 1–5 V, 0–10 V)", "Ein anderer Kanal wird betrachtet, oder die Skalierung steht auf 0", "Bei 3,6 mA oder weniger meldet der Messumformer einen Fehler nach NE 43 (3,6–3,8 mA ist Bereichsunterschreitung, kein Ausfallsignal)"],
      checks: ["Den gemessenen mA-Wert in die Multimeter-Prüfung eingeben, um % und die NE-43-Zone zu sehen", "Mit dem erwarteten Zählwert (z. B. 0–27648) im 4–20-mA-Rechner vergleichen"],
    },
    "r-ma-fault-high": {
      title: "21 mA oder mehr — Ausfallsignal oder Kurzschluss",
      causes: ["Der Messumformer gibt das obere Ausfallsignal nach NE 43 aus (z. B. Fühlerbruch)", "Deutlich über 25 mA: Die Versorgung läuft am Messumformer vorbei (Kurzschluss)"],
      checks: ["Anzeige oder Diagnose des Messumformers prüfen", "Den Widerstand des Fühlers (z. B. Pt100) auf Unterbrechung messen"],
    },
    "r-ma-over": {
      title: "Bleibt auf Maximum — Bereichseinstellung oder echter Wert",
      causes: ["Skalierbereich der SPS enger als der Bereich des Messumformers", "Der Prozesswert überschreitet den Bereich des Messumformers (z. B. 0–10 bar)", "Einheiten verwechselt (bar, psi, kPa)"],
      checks: ["Aus dem gemessenen mA-Wert die % berechnen und mit dem SPS-Wert vergleichen", "Den Messbereich auf dem Typenschild oder in den Einstellungen des Messumformers prüfen"],
    },
    "r-ma-noise": {
      title: "Störungen — Schirm, Erdung oder Kabelführung",
      causes: ["Signalkabel liegt im selben Kanal wie Leistungskabel", "Schirm an beiden Enden geerdet, sodass eine Masseschleife entsteht (meist nur einseitig)", "Potenzialdifferenz zwischen Messumformer und SPS"],
      checks: ["Die Spannung zwischen den beiden Massen messen (unter 1 V ist üblich)", "Die Schwankung in mA festhalten; einen Signaltrenner erwägen", "Die Schwankung mit einer Eingangsfilter-Zeitkonstante (RC-Filter) verringern"],
    },
    "r-ma-loadv": {
      title: "Schleifenspannung zu niedrig — Bürde oder Spannungsfall der Versorgung",
      causes: ["Zu viele Empfänger, Anzeigen oder Barrieren in der Schleife", "Lange oder dünne Leitungen, Spannungsfall der 24-V-Versorgung"],
      checks: ["Mit dem Bürdenrechner die Spannung am Messumformer bei 20 mA (oder 21 mA) bestimmen", "Die 24-V-Versorgung unter Last messen (höchstens 5 % Spannungsfall ist unkritisch)"],
    },
    "r-ma-process": {
      title: "Verdrahtung und Spannung sehen gut aus — echte Prozessschwankung oder Dämpfung",
      causes: ["Der Prozesswert schwankt tatsächlich (z. B. Pumpenpulsation)", "Kurze Dämpfung im Messumformer oder kurzer Eingangsfilter in der SPS"],
      checks: ["Den Wert als Zeitverlauf aufzeichnen und nach periodischen Mustern suchen", "Die Dämpfungseinstellung des Messumformers prüfen"],
    },
    "r-ma-scale": {
      title: "Wert passt nicht zur Wirklichkeit — Skalierung, Einheiten oder Zählwerte",
      causes: ["Der technische Bereich (Anfang/Ende) weicht von der Einstellung des Messumformers ab", "Falscher Zählbereich in der SPS (0–27648, 0–4000, 0–32000)", "Einheiten verwechselt (bar/psi, Überdruck/Absolutdruck)"],
      checks: ["Den gemessenen mA-Wert in den 4–20-mA-Rechner eingeben und mit erwartetem Wert und Zählwert vergleichen", "Prüfen, ob der SPS-Wert bei 4, 12 und 20 mA proportional ist"],
    },

    // ⑥ NPN/PNP-Sensoren
    "sn-kind": { q: "Was ist das Fehlerbild?", opts: ["Eingang schaltet nie ein", "Eingang schaltet nie aus (immer ein)"] },
    "sn-led": { q: "Leuchtet die eigene Anzeige-LED des Sensors, wenn ein Objekt da ist?" },
    "sn-power": { q: "Liegt die Spannung zwischen Braun (+) und Blau (0 V) des Sensors nahe der Versorgung (meist 24 V)?" },
    "sn-type": { q: "Passen Sensortyp und Eingangs-COM der SPS zusammen — Eingangs-COM an +24 V bei NPN, an 0 V bei PNP?", hint: "Unsicher? „Nein“ wählen" },
    "sn-vin": { q: "Liegen bei eingeschaltetem Sensor 15 V oder mehr zwischen SPS-Eingangsklemme und Eingangs-COM?" },
    "sn-plcled": { q: "Leuchtet in diesem Moment die LED des SPS-Eingangs?" },
    "r-sn-power": {
      title: "Keine Versorgung am Sensor",
      causes: ["Versorgungsader unterbrochen, Steckerkontakt oder Sicherung", "Aderfarben weichen von der Konvention ab (braun +, blau 0 V, schwarz Ausgang)", "Spannungsfall zu einem entfernten Sensor"],
      checks: ["Die Versorgungsspannung am Sensor bei eingeschalteten Lasten messen — mehr als 15 % Spannungsfall ist ein Problem", "Aderfarben und Versorgungsbereich im Datenblatt des Sensors prüfen"],
    },
    "r-sn-sense": {
      title: "Versorgt, erkennt aber nichts — Sensoreinstellung oder Objekt",
      causes: ["Schaltabstand oder Empfindlichkeit, Material des Objekts (der Schaltabstand eines Näherungsschalters hängt vom Metall ab)", "Lichtschranke dejustiert oder Linse verschmutzt", "Sensor defekt"],
      checks: ["Das Objekt annähern, um zu sehen, bei welchem Abstand die LED leuchtet", "Einen Sensor desselben Typs einsetzen"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP und die Polarität des Eingangs-COM passen vielleicht nicht zusammen",
      causes: ["NPN-Sensor mit Eingangs-COM an 0 V (oder PNP mit +24 V) — kein Stromweg", "Hersteller verwenden „sink/source“ in gegensätzlichem Sinn"],
      checks: ["Bei eingeschaltetem Sensor zeigt Schwarz–Blau bei NPN nahe 0 V, bei PNP nahe der Versorgung", "Im Anschlussbild der Eingänge im SPS-Handbuch nachsehen, wohin COM gehört"],
    },
    "r-sn-wire": {
      title: "Sensor schaltet ein, aber am Eingang kommt keine Spannung an — Verdrahtung",
      causes: ["Ausgangsader auf einem anderen Eingang aufgelegt oder an einer Zwischenklemme unterbrochen", "Ader zum Eingangs-COM fehlt", "Hohe Restspannung des Sensors oder Ausgangsstrom zu klein für den Eingang"],
      checks: ["Schwarz–Blau bei Sensor EIN und AUS messen und beide Werte in die Prüfung eingeben", "SPS-Eingang gegen COM: EIN 15 V oder mehr (Typ 1), AUS 5 V oder weniger"],
    },
    "r-sn-input": {
      title: "Spannung kommt an, aber die SPS liest nicht EIN — Eingangsbaugruppe",
      causes: ["Versorgung oder Defekt der Eingangsbaugruppe, oder ein anderer Steckplatz wird betrachtet", "Eingangsspannung nahe der Schwelle (11–15 V) — ein Eingang vom Typ 1 bleibt womöglich aus"],
      checks: ["Den Sensor auf einen benachbarten Kanal umklemmen", "EIN-Spannung und -Strom im Handbuch der Eingangsbaugruppe prüfen"],
    },
    "r-sn-program": {
      title: "Der Eingang schaltet doch ein — Adresse, Filter oder Impulslänge",
      causes: ["Das Programm liest eine andere Eingangsadresse (oktale oder hexadezimale X-Nummerierung)", "Signal kürzer als die Eingangsfilterzeit (schnell bewegtes Objekt)", "Beim Lesen über Kommunikation ist die Berechnung der Bitadresse falsch"],
      checks: ["Dieses Eingangsbit direkt in der Beobachtung der SPS ansehen", "Beim MC-Protokoll die Schreibweise der Operandennummer prüfen"],
    },
    "r-sn-stuck": {
      title: "Eingang schaltet nie aus — Reststrom, Kurzschluss oder Ausgangsfunktion",
      causes: ["Der Reststrom eines 2-Leiter-Sensors im Aus-Zustand hält den Eingang an", "Ausgangsader mit +24 V (PNP) oder 0 V (NPN) kurzgeschlossen", "Ausgangsfunktion des Sensors (Schließer/Öffner, hell-/dunkelschaltend) vertauscht"],
      checks: ["Bei ausgeschaltetem Sensor sollte SPS-Eingang gegen COM 5 V oder weniger zeigen", "Prüfen, ob der Eingang ausschaltet, wenn die Ausgangsader abgeklemmt wird"],
    },

    // ⑦ MC-Protokoll (Mitsubishi)
    "mc-ping": { q: "Antwortet die SPS auf einen Ping vom PC?", hint: "„Nein“ führt zum Ethernet-Zweig (IP-Subnetz)" },
    "mc-port": { q: "Ist in den Ethernet-Einstellungen der SPS eine Verbindung für das MC-Protokoll (SLMP) eingerichtet, und passen Portnummer, TCP/UDP und Binär/ASCII zum Programm?" },
    "mc-endcode": { q: "Ist der Endcode der Antwort ungleich null (z. B. C059)?" },
    "mc-noreply": { q: "Ist die Verbindung offen, aber es kommt nie eine Antwort (Zeitüberschreitung)?", hint: "„Nein“ = Antworten kommen, aber die Werte sehen falsch aus" },
    "r-mc-port": {
      title: "Verbindungseinstellungen für das MC-Protokoll in der SPS",
      causes: ["Keine Verbindung für das MC-Protokoll (SLMP) eingerichtet, oder die Einstellungen wurden nicht in die SPS geschrieben und neu gestartet", "Portnummer, TCP/UDP oder Code (Binär/ASCII) weichen vom Programm ab", "Ein anderes Programm nutzt bereits dieselbe TCP-Verbindung"],
      checks: ["Zuerst die Programmseite gegen PortDock PLC Simulator auf 127.0.0.1 testen, ohne SPS", "Die Ethernet-Einstellungen aus dem Engineering-Tool neben die Programmwerte schreiben und vergleichen"],
    },
    "r-mc-endcode": {
      title: "Die SPS lehnt die Anfrage mit einem Endcode ab",
      causes: ["Befehl oder Unterbefehl wird vom SPS-Modell nicht unterstützt", "Operandencode oder -nummer außerhalb des Bereichs, oder zu viele Punkte", "Einstellungen in der SPS wie Schreibschutz während RUN"],
      checks: ["Die Antwort in den MC-Protokoll-Decoder einfügen, um die Bedeutung des Endcodes zu sehen", "Der Prüfreihenfolge in der Anleitung zu den Endcodes folgen"],
    },
    "r-mc-frame": {
      title: "Telegrammformat passt nicht, daher schweigt die SPS",
      causes: ["3E-/4E-Telegramm oder Binär/ASCII weichen von der SPS-Einstellung ab", "Header-Werte (Netzwerk-Nr., PC-Nr., Zielmodul) oder Datenlänge falsch", "UDP wird verwendet, während die SPS TCP erwartet (oder umgekehrt)"],
      checks: ["Die gesendeten Bytes im MC-Protokoll-Decoder Feld für Feld entschlüsseln"],
    },
    "r-mc-values": {
      title: "Antworten kommen, aber die Werte sehen falsch aus — Operandennummern oder Einheiten",
      causes: ["X und Y sind hexadezimal, wurden aber dezimal eingegeben", "Lesen in Bit- und Worteinheiten verwechselt", "Wortreihenfolge oder Vorzeichen von 32-Bit-Werten"],
      checks: ["Mit der Schreibweisentabelle in der Anleitung zu Operandennummern vergleichen", "Vorzeichen und HEX im Ganzzahl-Umrechner vergleichen"],
    },

    // ⑧ USB-Geräte am PC
    "pu-know": { q: "Wissen Sie, welches Gerät abbricht?", hint: "Hören Sie nur den Verbinden-/Trennen-Ton immer wieder, „Nein“ wählen" },
    "pu-port": { q: "Bricht es auch an einem anderen USB-Port ab (Rückseite, ohne Hub)?" },
    "pu-cable": { q: "Bricht es auch mit einem anderen Kabel ab?" },
    "pu-suspend": { q: "Wird es seltener, wenn Sie das USB-Energiesparen ausschalten (selektives Energiesparen, „ausschalten erlauben“)?", hint: "PortDock liest diese Einstellungen nur — ändern Sie sie selbst in den Windows-Einstellungen" },
    "r-pu-find": {
      title: "Zuerst herausfinden, welches Gerät abbricht",
      causes: ["Noch unbekannt — möglich sind Maus, Tastatur, Funk-Dongle, Kamera, USB-Seriell-Adapter oder Hub"],
      checks: ["Im USB-Verbindungsprotokoll von Hardware Tester (ab 0.10.0) Zeiten, Gerätenamen und VID:PID ansehen", "Ein Gerät, das sich 3-mal oder öfter in 10 Minuten trennt, wird als „Verdacht auf wiederholte Abbrüche“ markiert — dann diesen Zweig für dieses Gerät erneut durchgehen"],
    },
    "r-pu-port": {
      title: "Der ursprüngliche Port oder Hub",
      causes: ["Interne Leitung oder Kontakt eines Front-Ports", "Busversorgter Hub mit zu wenig Strom"],
      checks: ["Einen hinteren Port oder einen Hub mit eigenem Netzteil verwenden", "Im USB-Verbindungsprotokoll von Hardware Tester bestätigen, dass die Abbrüche nach dem Portwechsel aufgehört haben (ab 0.10.0)"],
    },
    "r-pu-cable": {
      title: "Kabel oder Stecker",
      causes: ["Innerer Bruch im Kabel (Abbruch bei Bewegung), lockerer Stecker", "USB-Kabel oder Verlängerung zu lang"],
      checks: ["Ein kurzes, hochwertiges Kabel verwenden"],
    },
    "r-pu-suspend": {
      title: "USB-Energiesparen schaltet das Gerät ab",
      causes: ["Selektives USB-Energiesparen, „Computer kann das Gerät ausschalten“ am Gerät oder Hub"],
      checks: ["Selektives USB-Energiesparen mit „Einstellungen dieses PCs lesen“ in Port Inspector auslesen", "An einem Anlagen-PC auch die Ruhezustand-Einstellungen des Energiesparplans prüfen"],
    },
    "r-pu-device": {
      title: "Gerät, Treiber oder Umgebung",
      causes: ["Das Gerät selbst oder sein Treiber", "Ein USB-3-Gerät läuft mit USB-2.0-Geschwindigkeit (ein Hinweis auf Kabel- oder Portprobleme)", "Bei Funk-Dongles Störungen im 2,4-GHz-Band in der Nähe von USB-3.0-Ports", "Massedifferenz oder Störungen der Anlage (Industrieumgebung)"],
      checks: ["Prüfen, ob es an einem anderen PC abbricht", "Auf „Prüfenswert“-Markierungen bei der USB-Geschwindigkeit in Hardware Tester achten (ab 0.10.0)", "Die Spannung zwischen PC- und Anlagenmasse messen"],
    },
  },
} satisfies TreeText;
