// PortDock Modbus Slave — Vorstellungstext. Die Zahl der eingebauten Geräte steckt im Funktionstext.
export default {
  seo: {
    title: "PortDock Modbus Slave — Kostenloser Modbus-Slave-Simulator",
    desc: "Kostenloser Modbus-RTU/TCP-Slave-Simulator für Windows: SPS, HMI oder Master ohne das Gerät testen, mit Registertabellen, Fehlerinjektion und Geräteprofilen.",
  },
  summary: "Macht den PC zum Modbus-Slave (serielles RTU oder ein Server für Modbus TCP oder RTU über TCP), damit Sie einen Master (SPS, HMI, Host-Software) ohne das echte Gerät testen können — auch mit absichtlichen Verzögerungen und Fehlern.",
  who: [
    "Entwickler, die einen Modbus-Master schreiben",
    "Teams, die HMI-Bilder vorbereiten, bevor das Gerät eintrifft",
  ],
  features: [
    {
      title: "Drei Übertragungsarten",
      body: "Seriell (RTU), TCP-Server (Modbus TCP) und TCP-Server (RTU über TCP — ein Gerät hinter einem seriellen Geräteserver).",
    },
    {
      title: "Vier Tabellen",
      body: "Coils, Diskrete Eingänge, Halteregister und Eingangsregister. Eine Tabelle als U16, S16, HEX oder BIN ansehen, je Zelle U32, S32, F32, F64 oder Zeichenketten mit Bytereihenfolge festlegen und Werte sich selbst ändern lassen (Hochzählen, Zufall, Sinus …).",
    },
    {
      title: "Mehrere Slave-IDs",
      body: "Mehrere Slave-IDs (1–247) betreiben, jede mit eigenen Werten.",
    },
    {
      title: "Fehlerinjektion",
      body: "Verzögerung, keine Antwort, defekte CRC, falsche MBAP-Länge oder erzwungene Exceptions — gezielt nach Slave-ID, Funktion, Adresse, jeder N-ten Anfrage oder Wahrscheinlichkeit — um Timeouts und Wiederholungen des Masters zu prüfen.",
    },
    {
      title: "Jeden Schreibvorgang sehen",
      body: "Vom Master beschriebene Zellen blinken, dazu ein Verkehrslog und Statistik.",
    },
    {
      title: "Geräteprofile, gespeicherte Tabellen",
      body: (c: { nDevices: number }) => `Registernamen und Typen von ${c.nDevices} eingebauten Geräten (Frequenzumrichter, Temperaturregler, Leistungsmesser …) mit Beispielwerten laden. Tabellen als CSV-Registerkarten (gleiches Format wie Modbus Master) oder JSON exportieren und importieren.`,
    },
    {
      title: "Mit einem Geräteprofil nachbilden — lebendige Werte (ab 0.10.0)",
      body: "SCADA, HMI oder das eigene Programm ohne echten Frequenzumrichter oder Leistungsmesser testen. Beim Schreiben des Startbefehls fährt die Ausgangsfrequenz auf den Frequenzsollwert hoch (bei 0 herunter), Strom, Spannung und Leistung folgen; Leistungsmesser lassen Spannung und Strom leicht schwanken und summieren Energie auf. Bearbeitbare «Verknüpfungsregeln» (folgen, proportional, aufsummieren) verbinden Zellen. Nur lesbare und nur schreibbare Zellen aus der Gerätekarte werden durchgesetzt (Exception 02 oder 03, nach Wahl), nicht belegte Adressen ergeben Exception 02, und das Ganze arbeitet zusammen mit der Fehlerinjektion. Die Werte stammen aus den Tabellen des Handbuchs, daher kann das Verhalten echter Geräte (Rampenzeiten usw.) abweichen.",
    },
    {
      title: "Bind-Adresse 127.0.0.1 beim ersten Start (ab 0.10.0)",
      body: "Die «Bind-Adresse» des TCP-Servers startet mit 127.0.0.1 (nur dieser PC). Für einen Master auf einem anderen PC wählen Sie dort 0.0.0.0 (alle Adapter) oder die Adresse eines Adapters. Von früheren Versionen gespeicherte Einstellungen bleiben erhalten.",
    },
  ],
  steps: [
    "Übertragungsart (seriell oder TCP) sowie Port und Baudrate (oder Adresse und Port) wählen; bei Bedarf Slave-IDs hinzufügen",
    "Eine Tabelle wählen, Startadresse und Anzahl festlegen, Werte eingeben",
    "«Verbinden» («Start» bei TCP) — Anfragen des Masters werden aus der Tabelle beantwortet",
  ],
  similar: "Ähnliche Werkzeuge sind das kommerzielle Modbus Slave (Witte Software) und das Open-Source-Programm ModRSsim2. PortDock Modbus Slave ist kostenlos (GPL-3.0) und zeitlich unbegrenzt.",
};
