// Deutsch — Namen und Kurzbeschreibungen für mehrere Seiten (Programme, Web-Tools, Gruppen, „Was möchten Sie tun?“, Dateigrößen).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Kurzbeschreibung der Programme (tagline in tools.ts) */
  apps: {
    serial: "Serielles Terminal (COM) mit Steuerleitungen und automatischer Neuverbindung",
    "modbus-slave": "Modbus-Slave-Simulator (RTU und TCP) mit Registertabellen und Fehlereinspeisung",
    tcp: "TCP-Client, -Server und -Relay mit mehreren Verbindungen, Echo und automatischer Neuverbindung",
    udp: "UDP senden und empfangen — Broadcast, Multicast, Echo",
    simulator: "Regelbasiertes Ersatzgerät über Seriell, TCP und UDP",
    netscan: "Geräte in Industrienetzen finden — Industrie-Ports erkennen, Langzeit-Ping",
    "modbus-master": "Modbus-RTU/TCP-Master (Polling) — typisierte Werte, Schreiben, Slave-Adressen-Scan",
    scpi: "SCPI-Terminal für Messgeräte — LAN-Socket und RS-232, ohne VISA",
    plot: "Zahlen aus Seriell, TCP und UDP live als Diagramm",
    "port-inspector": "Prüfung von COM-Ports, Netzwerkadaptern, PC-Einstellungen und Funk (WLAN, Bluetooth) — nur lesend",
    "plc-simulator": "Server-Simulator für das MC-Protokoll (SLMP) — HMI und Datenerfassung ohne SPS testen",
    "hw-tester": "Protokolliert WLAN- und Internetabbrüche und Latenz, dazu Verbindungen von Bluetooth und USB (ab 0.10.0)",
    mcp: "MCP-Server für KI-Clients — liest Ports, Modbus, MC und SCPI; schreibt nur in Simulatoren auf diesem PC",
  } satisfies Record<Tool["id"], string>,

  /** Name und Kurzbeschreibung der Web-Tools (name, blurb in webTools.ts) */
  webTools: {
    "tools/4-20ma/": { name: "4–20-mA-Rechner (Skalierung)", blurb: "Strom/Spannung ↔ physikalischer Wert ↔ % ↔ SPS-Rohwert (0–27648 usw.). Mit Tabelle für 4, 8, 12, 16 und 20 mA." },
    "tools/modbus/": { name: "Modbus-RTU-Anfrage erstellen", blurb: "Slave-Adresse, Funktion, Adresse, Anzahl → Anfrage-Bytes mit CRC. Versteht auch die Schreibweise 40001." },
    "tools/modbus-decoder/": { name: "Modbus-Telegramm-Decoder", blurb: "RTU- oder TCP-Bytes einfügen: Slave-Adresse, Funktion, Werte, CRC, MBAP und Exception-Codes werden entschlüsselt." },
    "tools/modbus-float/": { name: "Modbus-Float-Umrechner", blurb: "2 oder 4 Register ↔ float32, float64, int32. Die Wortfolgen ABCD, CDAB, BADC und DCBA in einer Tabelle." },
    "tools/mc-decoder/": { name: "MC-Protokoll-(SLMP-)Telegramm-Decoder", blurb: "3E/4E, binär oder ASCII → Kopf, Befehl, Operand, Werte und Endcode. Antwort mit zugehöriger Anfrage entschlüsseln, Anfragen erstellen." },
    "tools/rs485/": { name: "RS-485-Rechner für Busabschluss und Bias", blurb: "Pull-up/Pull-down und Abschluss mit 120 oder 150 Ω → Ruhepegel gegen die 200-mV-Schwelle, Widerstandsleistung, Leitungslänge je Baudrate." },
    "tools/serial-timing/": { name: "Rechner für serielle Übertragungszeiten", blurb: "Baudrate und Parität → Zeichenzeit, Modbus RTU t3.5 und t1.5, Anfrage- und Antwortzeit, Pollzyklus, minimales Timeout." },
    "tools/checksum/": { name: "CRC- und Prüfsummenrechner", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 und SUM16 auf einmal." },
    "tools/subnet/": { name: "IP-Subnetzrechner", blurb: "Adresse und Maske (/24) → Netz, Broadcast, Bereich. Prüft mit beiden Masken, ob PC und SPS im selben Subnetz liegen." },
    "tools/pinouts/": { name: "Steckerbelegungen (Pinbelegung)", blurb: "DB9/DB25 RS-232, RJ45 T568A/B und Ethernet, Modbus RJ45/DB9 (Spezifikation), M12 A-/D-/X-codiert, M8, USB-A/B/C, RS-485-Klemmenbezeichnungen — Stecker/Buchse von vorn, Aderfarben, Quellen, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Gruppen der Web-Tools (webToolGroups.ts) */
  groups: {
    comm: "Seriell und Modbus",
    net: "Netzwerk",
    draw: "Verdrahtung und Pläne",
    diag: "Fehlersuche und Prüfung",
    field: "Werkzeuge für die Baustelle",
    signal: "Signale und Sensoren",
    elec: "Elektrik und Motoren",
    mech: "Mechanik und Pneumatik",
    units: "Einheiten umrechnen",
    hw: "PC-Hardwaretests",
    etc: "Weitere Tools",
  } satisfies Record<GroupId, string>,

  /** „Was möchten Sie tun?“ (components/PickApp.astro) — nach Pfad-ID */
  pick: {
    title: "Was möchten Sie tun?",
    q: {
      serial: "Mit einem seriellen (COM-) oder RS-485-Gerät kommunizieren",
      modbus: "Modbus-Geräte lesen und schreiben oder ein Gerät simulieren",
      net: "Geräte im Netzwerk finden, TCP und UDP",
      sim: "HMI oder Leitrechner-Software ohne SPS oder Gerät testen",
      scpi: "Messgerät (SCPI) steuern und Messwerte aufzeichnen",
      pc: "Verbindungsprobleme am PC — COM-Port, Netzwerkadapter, WLAN, Bluetooth",
      mcp: "Geräte aus einem KI-Client lesen (MCP)",
    },
    hwTitle: "Mikrofon, Tastatur, Maus, Webcam und Monitor testen",
    hwName: "PC-Hardwaretests",
    hwNote: (n: number) => `Kein Windows-Programm, sondern direkt im Browser (ohne Installation) — ${n} Tests`,
  },

  /** Dateigrößen (SIZE in release.ts) */
  size: { setup: "ca. 4 MB", offline: "ca. 220 MB", portable: "ca. 3 MB" },
};
