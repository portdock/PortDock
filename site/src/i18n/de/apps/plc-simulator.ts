// PortDock PLC Simulator — Vorstellungstext. MC-Befehlsnamen nach deutschen Mitsubishi-Electric-Handbüchern (SLMP).
export default {
  seo: {
    title: "PortDock PLC Simulator — Kostenloser MC-Protokoll-Simulator (SLMP)",
    desc: "Kostenloses Werkzeug zum Testen von MC-Protokoll-Verbindungen (3E/4E, binär/ASCII) ohne SPS: Gerätetabellen (D, M, X, Y …), Lesen/Schreiben, Fehlerinjektion.",
  },
  summary: "Der PC beantwortet MC-Protokoll-Anfragen (SLMP) wie die Ethernet-Schnittstelle einer SPS. Tragen Sie Werte in die Gerätetabellen ein, dann können HMI-, Datenerfassungs- oder Host-Software sie lesen und schreiben; absichtliche Verzögerungen und Fehler-Endecodes prüfen deren Fehlerbehandlung. Es folgt den Nachrichtenformaten aus den öffentlichen Handbüchern von Mitsubishi Electric (SLMP/MC); es steht in keiner Verbindung zu Mitsubishi Electric, und das Verhalten kann von einer echten SPS abweichen.",
  who: [
    "Teams, die HMI-Bilder und Kommunikation vorbereiten, bevor die SPS eintrifft",
    "Entwickler von Datenerfassungs- oder Host-Software, die SPSen über das MC-Protokoll lesen",
  ],
  features: [
    {
      title: "3E/4E, binär/ASCII, TCP/UDP",
      body: "Lauscht als TCP-Server (mehrere Clients) oder an UDP. 4E-Antworten tragen die Seriennummer der Anfrage. Standardmäßig kann sich nur dieser PC (127.0.0.1) verbinden; andere PCs zuzulassen ist Ihre Entscheidung.",
    },
    {
      title: "Umgesetzte Befehle",
      body: "0401 Batch-Lesen und 1401 Batch-Schreiben (Wörter und Bits, Subbefehle 0000–0003), 0403 Zufallslesen, 1402 Zufallsschreiben und 0619 Rückmeldetest. Ab 0.6.0 auch 0406/1406 Blocklesen/-schreiben, 0801/0802 Monitor, 1001–1006 Remote-RUN/-STOP/-PAUSE/Latch löschen/Reset (nur simulierter Zustand) und 0101 Typenbezeichnung lesen (simulierte Werte). Andere Befehle erhalten den Endecode C059.",
    },
    {
      title: "Proprietäres LS-XGT-Protokoll (ab 0.10.0)",
      body: "Schalten Sie «Protokoll» auf «XGT dedicated», dann beantwortet es das proprietäre FEnet-Protokoll der LS-ELECTRIC-XGT-SPSen («LSIS-XGT»-Kopf, Standard TCP 2004 · UDP 2005): Lesen h0054 und Schreiben h0058, einzeln (%MX, %MB, %MW, %MD, %ML, bis zu 16 Blöcke) und fortlaufend (%MB-Bytes, bis zu 1.400 Bytes), Geräte P, M, K, F, T, C, D, L, N sowie Antworten mit Fehlercode (1–6, h75–h78). Erstellt nach den öffentlichen Benutzerhandbüchern von LS ELECTRIC — ohne Verbindung zu LS ELECTRIC.",
    },
    {
      title: "Bedingungsregeln (ab 0.6.0)",
      body: "Handshakes nachbilden wie «wenn das Anforderungsbit einschaltet, schalte das Fertig-Bit 300 ms später ein»: Bedingung (Bit EIN/AUS/Flanke, Wortvergleich, periodisch) → Verzögerung (fest oder zufällig) → Aktionen (Bit- und Wortschreiben). Kein Kontaktplanprogramm.",
    },
    {
      title: "18 Geräte",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC und CN. X, Y, B, W und ZR verwenden Hexadezimalnummern; jedes Gerät hat eine Größe, und Anfragen darüber hinaus erhalten C056. Bitgeräte lassen sich als Wörter zu 16 Punkten ansehen; Zellen können 32-Bit, Gleitkomma, Zeichenkette oder benannt sein.",
    },
    {
      title: "Fehlerinjektion",
      body: "Antwortverzögerung (mit Bereich), keine Antwort oder ein gewählter Endecode — gezielt nach Befehl, Gerät, jeder N-ten Anfrage oder Wahrscheinlichkeit.",
    },
    {
      title: "Dekodierter Verkehr",
      body: "Jede Anfrage zeigt Befehlsnamen, Gerät und Punkte; jede Antwort den Endecode und seine Bedeutung. Von einem Client geänderte Zellen blinken, dazu Statistik.",
    },
    {
      title: "Simulation und gespeicherte Zustände",
      body: "Werte können sich selbst ändern (Hochzählen, Zufall, Sinus, Rampe, Umschalten), und Gerätewerte und Zelleneinstellungen lassen sich in eine JSON-Datei speichern und von dort laden.",
    },
  ],
  steps: [
    "Rahmen (3E/4E), Datencode (binär/ASCII) und Port auf den Client abstimmen",
    "Ein Gerät (D, M, X …) wählen und Werte eingeben",
    "«Start» — Lese- und Schreibzugriffe des Clients werden aus den Tabellen beantwortet",
  ],
  faq: [
    {
      q: "Verhält es sich genau wie eine echte SPS?",
      a: "Nein. Es folgt den Nachrichtenformaten aus den öffentlichen Handbüchern und wurde nicht mit echter Hardware verglichen. Es läuft kein Kontaktplanprogramm, und Fehlercodes, Zeitverhalten, Verbindungsgrenzen und Gerätebereiche je Modell können abweichen.",
    },
    {
      q: "Wie verbinde ich ein HMI auf einem anderen PC?",
      a: "Schalten Sie «Verbindungen von anderen PCs erlauben (0.0.0.0)» ein und lassen Sie das Programm in der Windows-Firewall zu. Betreiben Sie es nicht in einem Anlagennetz mit derselben IP und demselben Port wie eine echte SPS.",
    },
  ],
  similar: "Ähnliche Werkzeuge sind DummyPLC (kostenlos, Closed Source) und HslCommunication (kommerziell). PortDock PLC Simulator ist kostenlos (GPL-3.0) und ergänzt Fehlerinjektion, dekodierten Verkehr und Wertesimulation.",
};
