// PortDock Simulator — Vorstellungstext.
export default {
  seo: {
    title: "PortDock Simulator — Kostenloser Geräte-Simulator (seriell, TCP)",
    desc: "Kostenloser regelbasierter Geräte-Simulator: «kommt das an, antworte das» über seriell, TCP und UDP. Host-Software ohne Hardware bauen, Verzögerungen testen.",
  },
  summary: "Jedes Gerät mit Regeln nach dem Muster «wenn das ankommt → antworte das» nachahmen. Host-Software ohne Hardware entwickeln und die Fehlerbehandlung mit Verzögerungen, ausbleibenden Antworten (jede N-te oder zufällig) und wechselnden Antworten testen.",
  who: [
    "Entwickler von Host-Software, denen die Hardware noch fehlt",
    "Teams, die automatisierte Prüfstände bauen",
  ],
  features: [
    {
      title: "Regeln mit Platzhaltern",
      body: "HEX ?? (beliebiges Byte) und ** (null oder mehr). ASCII wird standardmäßig wörtlich verglichen; schalten Sie bei einer Regel «Platzhalter» für ? und * ein. Genau oder enthält.",
    },
    {
      title: "Geformte Antworten",
      body: "Automatische Prüfsumme und automatisches Zeilenende, Antwortverzögerung und Trefferzähler je Regel.",
    },
    {
      title: "Vom Gerät ausgehende Nachrichten",
      body: "Heartbeats oder Statusmeldungen in einem festen Takt senden.",
    },
    {
      title: "Vier Übertragungsarten",
      body: "Seriell, TCP-Server, TCP-Client, UDP. Regeln samt Verbindungs- und Framing-Einstellungen als eine JSON-Datei speichern und laden.",
    },
    {
      title: "Adresse 127.0.0.1 beim ersten Start (ab 0.10.0)",
      body: "Der «Host» für TCP-Server und UDP startet mit 127.0.0.1 (nur dieser PC). Für Host-Software auf einem anderen PC wählen Sie 0.0.0.0 (alle Adapter) oder die Adresse eines Adapters. Von früheren Versionen gespeicherte Einstellungen bleiben erhalten.",
    },
  ],
  steps: [
    "Übertragungsart wählen und Port oder Adresse eingeben",
    "«+ Regel hinzufügen» — Wenn / Antwort",
    "«Start» — eine Anfrage aus Ihrer Host-Software senden",
  ],
  uses: [
    {
      title: "Host-Software bauen, bevor die Hardware eintrifft",
      body: "Machen Sie aus den Anfrage-Antwort-Paaren des Gerätehandbuchs Regeln «wenn → antworte» und verbinden Sie Ihr HMI oder Testprogramm ohne das echte Gerät.",
    },
    {
      title: "Timeouts und Fehlerbehandlung testen",
      body: "Antwortverzögerungen (mit Jitter), jedes N-te Mal oder zufällig keine Antwort und wechselnde Antworten zeigen, wie Ihre Host-Software mit verspäteten oder fehlenden Antworten umgeht.",
    },
    {
      title: "SCPI ohne Messgerät üben",
      body: "Starten Sie einen TCP-Server an Port 5025 mit dem Beispiel [SCPI *IDN? reply] und verbinden Sie PortDock SCPI mit 127.0.0.1. Antworten wie «+1.2{rand 0..9}E+00» ändern sich bei jeder Anfrage.",
    },
    {
      title: "Heartbeats und Statusmeldungen nachahmen",
      body: "«Vom Gerät ausgehende Nachrichten» sendet ohne Anfrage in einem festen Takt. Die Platzhalter {counter}, {rand} und {time} werden bei jedem Senden ausgefüllt.",
    },
  ],
  faq: [
    {
      q: "Anfragen kommen an, aber es geht keine Antwort hinaus",
      a: "Prüfen Sie, ob die Regel eingeschaltet ist, ob Mustertyp (HEX/ASCII) und «genau/enthält» passen und ob darüber keine «**»-Regel steht. Bei eingeschaltetem «Nicht passende Anfragen protokollieren» erscheint eine «NO MATCH»-Zeile; per Rechtsklick darauf erzeugen Sie daraus eine Regel.",
    },
    {
      q: "Anfragen kommen zerteilt oder zusammengefasst an",
      a: "Regeln vergleichen ganze Telegramme. Passen Sie «Framing» (Pause oder Endezeichen) und die Pause in ms an. UDP braucht kein Framing — ein Datagramm ist ein Telegramm.",
    },
    {
      q: "Wie verbinde ich ein Programm auf demselben PC?",
      a: "Bei TCP einen Server starten und das Host-Programm mit 127.0.0.1 verbinden lassen. Bei seriell ein virtuelles COM-Paar nutzen (com0com o. Ä.).",
    },
    {
      q: "Meine «*IDN?»-Regel beantwortet fremde Anfragen",
      a: "Bei eingeschalteten «Platzhaltern» stehen ? und * in einer ASCII-Regel für beliebige Zeichen. Lassen Sie Platzhalter bei SCPI-Regeln aus (Standard für neue Regeln).",
    },
    {
      q: "Kann ich Regeln auf einen anderen PC mitnehmen?",
      a: "«Regelsatz speichern» legt die Regeln samt Übertragungsart, Port, Adresse, Framing und vom Gerät ausgehenden Nachrichten in einer JSON-Datei ab — am besten eine je Gerät oder Test.",
    },
  ],
};
