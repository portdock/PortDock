// PortDock Net Scan — Vorstellungstext.
export default {
  seo: {
    title: "PortDock Net Scan — Kostenloser IP-Scanner für Industrienetze",
    desc: "Kostenloser IP-Scanner für Industrienetze: Ping- und ARP-Suche, MAC-Hersteller, Industrie-Ports (Modbus 502, MC, XGT, S7 …), Ping-Langzeitüberwachung.",
  },
  summary: "Das Subnetz einer Netzwerkkarte absuchen, um Geräte zu finden, und sie am MAC-Hersteller und an offenen Industrie-Ports erkennen (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Geräte, die Ping blockieren, werden im selben Subnetz trotzdem per ARP gefunden.",
  who: [
    "Servicetechniker, die die IP eines neuen Geräts nicht kennen",
    "Alle, die ein Gerätenetz über Nacht beobachten müssen",
  ],
  features: [
    {
      title: "Ping- und ARP-Suche",
      body: "ARP im selben Subnetz findet Geräte, die Ping blockieren; zeigt Antwortzeit, Namen, diesen PC und das Gateway. Keine Administratorrechte nötig.",
    },
    {
      title: "Prüfung der Industrie-Ports",
      body: "Prüft nur eine Portliste (Standard 502, 2004, 5000–5010, 102, 44818, 4840 …; bearbeitbar, bis zu 32) — kein allgemeiner Portscan — und fragt Modbus-Geräte nach Hersteller/Modell (FC 2B/0E).",
    },
    {
      title: "Hinweise auf offene Zugänge (ab 0.10.0)",
      body: "Ist Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 oder HTTP 80 unter den bereits geprüften Ports, kommt ein Hinweis wie «Industrieprotokoll offen — jeder im selben Netz kann lesen und schreiben (keine Authentifizierung) — Netztrennung prüfen». Es werden keine weiteren Ports gescannt und keine Geräteeinstellungen verändert.",
    },
    {
      title: "Broadcast-Suche — EtherNet/IP, BACnet",
      body: "Sendet nur auf Knopfdruck EtherNet/IP ListIdentity (UDP 44818) und BACnet Who-Is (UDP 47808) an die Broadcast-Adresse des gewählten Adapters und führt Hersteller, Gerätetyp, Produktname und Revision — bei BACnet auch Geräteinstanz und Hersteller-ID — von Geräten, deren IP Sie nicht kennen, in die Tabelle ein. Nur lesende Anfragen; Seriennummern werden nicht angezeigt.",
    },
    {
      title: "MAC-Hersteller",
      body: "Die eingebettete IEEE-Liste zeigt den Hersteller ohne Internetzugang.",
    },
    {
      title: "Ping-Langzeitüberwachung",
      body: "Protokolliert Verluste, Latenz und Ausfälle mehrerer Geräte in eine CSV-Datei und lässt die Taskleiste bei einem Ausfall blinken.",
    },
    {
      title: "Neu / fehlend",
      body: "Vergleicht mit der vorherigen Suche und markiert neue und fehlende Geräte. Export als CSV.",
    },
    {
      title: "Referenzstände — mit dem letzten Mal vergleichen (ab 0.10.0)",
      body: "Die Geräteliste als benannte Referenzstände speichern (mehrere, auch als JSON-Dateien) und die nächste Suche damit vergleichen — neu (hinzugefügt?), fehlend (entfernt oder aus?), MAC geändert (anderes Gerät an derselben IP, ausgetauscht?), IP geändert (dasselbe Gerät an anderer IP, DHCP?) und geänderte offene Ports, farblich markiert. Vergleichs-CSV und «AI»-Kopie (letzte 3 MAC-Bytes ausgeblendet). Referenzdateien enthalten MAC-Adressen — beim Weitergeben Vorsicht.",
    },
    {
      title: "Wake-on-LAN, Weboberfläche öffnen",
      body: "Je Gerät: die Webseite öffnen, IP/MAC kopieren, ein Magic Packet senden.",
    },
  ],
  steps: [
    "Einen Netzwerkadapter wählen — sein Subnetz wird zum Suchbereich (das /24, in dem er liegt, falls es größer ist)",
    "«Suchen» (F4)",
    "Die Spalten für Dienste und Hersteller prüfen; ein Klick auf ein Gerät öffnet seine Webseite, kopiert seine IP, weckt es auf oder nimmt es mit «Zum Ping-Monitor» in die Überwachung auf",
  ],
  similar: "Ähnliche Werkzeuge sind Angry IP Scanner (Open Source) und Advanced IP Scanner (Freeware). PortDock Net Scan ergänzt Prüfungen von Industrie-Ports (Modbus 502, MC, XGT, S7 …) und die Ping-Langzeitüberwachung.",
};
