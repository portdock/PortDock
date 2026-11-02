// PortDock MCP — Vorstellungstext.
export default {
  seo: {
    title: "PortDock MCP — COM-Ports & Modbus aus KI-Clients lesen",
    desc: "Kostenloser MCP-Server: Claude Desktop und andere KI-Clients lesen COM-Port-Berichte sowie Modbus-, MC- und SCPI-Werte. Schreibt nur in Simulatoren an 127.0.0.1",
  },
  summary: "Ein fensterloser MCP-Server, den KI-Clients (Claude Desktop, VS Code, Cursor …) starten. Die KI liest die COM-Ports und Netzwerkadapter dieses PCs und Modbus-, MC-Protokoll- und SCPI-Werte von Geräten, die Sie nennen. Die Schreibwerkzeuge akzeptieren nur die Adresse dieses PCs (127.0.0.1) und sind für Simulatoren gedacht. Ab 0.10.0 gehen Modbus-Schreibzugriffe nur an ein Ziel, das sich als PortDock ausweist. MC-Schreibzugriffe werden nur anhand der Adresse geprüft; leitet also ein Programm auf diesem PC an ein anderes Gerät weiter (ein TCP-Relay, Gateway oder Tunnel), kann ein Schreibzugriff ein echtes Gerät erreichen.",
  who: [
    "Alle, die mit einem KI-Assistenten gemeinsam COM-Port- und USB-Adapter-Probleme untersuchen wollen",
    "Entwickler, die Modbus-, MC- oder SCPI-Werte in einem KI-Gespräch lesen wollen",
    "Menschen, die den Umgang der KI mit Werkzeugen an Simulatoren statt an echten Geräten üben",
  ],
  features: [
    {
      title: "Neun Lesewerkzeuge",
      body: "COM-Port-Liste, Port-Inspector-Bericht, serielles Mithören (sendet nichts), Modbus-Lesen (FC 01–04), MC-3E-Batch-Lesen, SCPI-Abfragen, Ping, Netzwerkadapter und Registerkarten von Geräten.",
    },
    {
      title: "Schreiben nur in Simulatoren an 127.0.0.1",
      body: "Üben Sie «schreiben, dann zurücklesen» mit Modbus Slave oder PLC Simulator auf diesem PC. Jede andere Adresse wird vor dem Verbinden abgewiesen. Ab 0.10.0 muss sich das Ziel bei Modbus-Schreibzugriffen außerdem als «PortDock» ausweisen (FC 2B/0E); MC-Schreibzugriffe werden nur anhand der Adresse geprüft, nutzen Sie sie also nicht, solange ein Relay-Programm läuft.",
    },
    {
      title: "Nur SCPI-Abfragen",
      body: "Sendet eine Abfrage, die mit «?» endet; solche, die den Zustand ändern können, wie *TST?, *CAL? und *RST, werden abgewiesen. READ? und MEAS…?, die eine neue Messung starten, werden standardmäßig abgewiesen und nur gesendet, wenn Sie es mit allow_measure erlauben (seit 0.8.0). Mit FETC? lesen Sie nur den letzten Wert.",
    },
    {
      title: "Sitzungslog und Ratenbegrenzung",
      body: "Jeder Aufruf wird als JSON-Zeilen auf diesem PC gespeichert und nie hinausgesendet. Dasselbe Ziel höchstens einmal pro 100 ms, 120 Aufrufe pro Minute.",
    },
    {
      title: "Personenbezogene Daten ausgeblendet",
      body: "Pfade von Benutzerordnern in Ergebnissen werden zu «~», MAC-Adressen zu «xx-…» und Netzwerknamen zu «(hidden)».",
    },
    {
      title: "Eine Datei zum Installieren",
      body: "Kein Python, Node oder Docker: eine .mcpb (in Claude Desktop öffnen) oder eine einzelne exe in einer Zip-Datei.",
    },
  ],
  steps: [
    "PortDock-MCP.mcpb in Claude Desktop öffnen (andere Clients: den exe-Pfad aus der Zip-Datei in deren Einstellungen eintragen)",
    "Die KI etwa fragen: «Zeig mir meine COM-Ports» — der Client fragt vor jedem Werkzeugaufruf bei Ihnen nach",
    "Adresse, Port und Unit angeben, um ein Gerät zu lesen. Mit Modbus Slave oder PLC Simulator an 127.0.0.1 üben",
  ],
  faq: [
    {
      q: "Kann die KI Geräteeinstellungen ändern?",
      a: "Die beiden Schreibwerkzeuge funktionieren nur, wenn das Ziel 127.0.0.1 oder localhost (dieser PC) ist; jede andere Adresse wird vor dem Verbinden abgewiesen. Ab 0.10.0 schreibt modbus_write_sim nur, wenn das Ziel auf die Geräteidentifikation (FC 2B/0E) mit einem Herstellernamen antwortet, der mit «PortDock» beginnt; so schreibt es nicht in echte Geräte hinter dem Modbus-TCP-↔-RTU-Gateway von PortDock Serial (standardmäßig 127.0.0.1:502). mc_write_sim wird nur anhand der Adresse geprüft; leitet also ein Programm auf diesem PC an ein anderes Gerät weiter (ein TCP-Relay, ein Hersteller-Gateway, ein SSH-Tunnel …), kann ein Schreibzugriff ein echtes Gerät erreichen — nutzen Sie die Schreibwerkzeuge nicht, solange ein solches Programm läuft.",
    },
    {
      q: "Was sendet es hinaus?",
      a: "PortDock MCP selbst spricht nur mit den Geräteadressen und Ports, die Sie angeben, und das Sitzungslog bleibt auf diesem PC. Ergebnisse der Werkzeuge gehen an den KI-Client, den Sie verwenden; ab dort gelten dessen Richtlinien.",
    },
  ],
};
