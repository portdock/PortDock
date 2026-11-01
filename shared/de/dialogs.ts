// 독일어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type De<K extends string> = Partial<Record<K, string>>;

export const DE_DEVICE: De<DeviceTextKey> = {
  masterTitle: "Geräteprofil laden",
  slaveTitle: "Geräte-Emulation laden",
  search: "Suchen (Hersteller, Modell, Typ)",
  none: "Kein passendes Gerät",
  close: "Schließen",
  cancel: "Abbrechen",
  apply: "Laden",
  regs: "{n} Register",
  comm: "Standard-Kommunikation",
  commOpt: "Auch serielle Einstellungen übernehmen (Baudrate, Daten, Parität, Stopp)",
  commNone: "Keine im Handbuch bestätigten Standard-Kommunikationseinstellungen",
  gapOpt: "Register mit kleinen Lücken in einer Tabelle lesen (bis {n} — ausschalten, wenn das Gerät unbenutzte Adressen ablehnt)",
  masterPlan: "Fügt {n} Polling-Tabellen hinzu (Slave-Adresse {u}): {a}",
  masterSkip: "{n} Nur-Schreib-Register werden nicht gepollt",
  slavePlan: "Trägt Namen, Typen und Beispielwerte in die aktuelle Slave-Adresse {u} ein. Antwortbereiche wachsen bei Bedarf.",
  slaveUnit: "Die Standard-Slave-Adresse dieses Geräts ist {u}",
  sources: "Quellen",
  caution: "Fakten aus dem Handbuch des Herstellers (keine Verbindung zum Hersteller). Sie können je nach Firmware oder Modell abweichen — vor dem Schreiben das Gerätehandbuch prüfen.",
  thAddr: "Adresse (Handbuch)",
  thName: "Name",
  thType: "Typ",
  thUnit: "Einheit",
  thRw: "R/W",
  notes: "Hinweise",
  behaveOpt: "Auch Wertgeneratoren und Verknüpfungsregeln hinzufügen — Spannungs-/Stromschwankung, Energiezähler, Startbefehl → Rampe der Ausgangsfrequenz",
  guardOpt: "Nur-Lesen und Nur-Schreiben durchsetzen",
  slaveNote: "Diese Werte stammen aus den Tabellen des Handbuchs — das echte Geräteverhalten (Rampenzeiten usw.) kann abweichen.",
};

export const DE_PORTCHECK: De<PortCheckTextKey> = {
  title: "Verbindung prüfen",
  close: "Schließen (Esc)",
  reading: "Lesen…",
  readFail: "Nicht lesbar",
  device: "Gerät und Treiber",
  settings: "Einstellungen",
  power: "Energiesparen",
  test: "Verbindungstest",
  cannot: "Was der PC nicht sieht",
  guides: "Anleitungen:",
  name: "Name",
  chip: "VID:PID · Chip",
  driver: "Treiber",
  problem: "Problemcode",
  action: "Was versuchen",
  latency: "FTDI-Latenz-Timer",
  suspend: "Selektives USB-Energiesparen",
  canOff: "PC darf es abschalten",
  on: "an",
  off: "aus",
  connected: "Zum Testen zuerst trennen (der Test öffnet den Port selbst).",
  copy: "Text kopieren",
  copied: "Kopiert",
  more: "Für Treiberverlauf, reservierte COM-Nummern und ausgeblendete Geräte PortDock Port Inspector verwenden.",
  readOnly: "Nur lesen, ohne Administratorrechte.",
};

export const DE_LOOP: De<LoopTextKey> = {
  mode: "Test",
  loop: "Loopback — TX mit RX verbunden",
  loopHint: "Bei DB9 Pin 2 (RX) mit Pin 3 (TX) verbinden, beim TTL-Adapter TX mit RX. Prüft bei jeder Geschwindigkeit, ob die Bytes unverändert zurückkommen, und misst die 1-Byte-Umlaufzeit.",
  two: "Zwei Ports — zwei Adapter miteinander verbunden",
  twoHint: "Mit zwei miteinander verbundenen Adaptern/Kabeln wird bei jeder Geschwindigkeit dieser Port → der andere und der andere → dieser Port gesendet und das Empfangene verglichen. Nützlich zum Prüfen von RS-485-Adaptern.",
  peer: "Anderer Port",
  peerNone: "Kein anderer Port",
  pattern: "Muster",
  patRandom: "Gemischte Bytes",
  patRamp: "0x00–0xFF der Reihe nach",
  patAlt: "0x55/0xAA abwechselnd",
  length: "Länge (Bytes)",
  wiring: "Verdrahtung",
  overall: "Gesamt",
  colDir: "Richtung",
  echo: "2-Draht-RS-485-Echo",
  echoHint: "Ohne Gerät am Bus prüfen, ob der Adapter die gesendeten Bytes selbst empfängt.",
  bauds: "Geschwindigkeiten",
  more: "Weitere",
  start: "Test starten",
  cancel: "Stopp",
  sure: "Ist das Gerät von Leitung/Bus getrennt? Testbytes könnten als Befehle bei einem Gerät ankommen.",
  sureYes: "Getrennt — starten",
  sureNo: "Abbrechen",
  running: "Test läuft",
  noPort: "Zuerst einen Port wählen.",
  colBaud: "Geschw.",
  colResult: "Ergebnis",
  colBytes: "Gesendet · gleich · verloren · geändert",
  colRtt: "1-Byte-Umlauf ms (Median · Max.)",
  colFlags: "Fehlerflags",
  flagsNone: "keine",
  flagsUnread: "nicht gelesen",
  flagFrame: "Framing",
  flagParity: "Parität",
  flagOverrun: "Overrun",
  flagRxOver: "Pufferüberlauf",
  flagsNote: "Fehlerflags erscheinen nur, wenn der Treiber sie meldet — «keine» garantiert nicht, dass es keine Fehler gab. Die Umlaufzeit enthält USB-Latenz, Treiber- und Programmzeit.",
  echoBack: "Zurück",
  firstMs: "Erstes Byte nach",
};

/** Verdrahtung als Textbild */
export const DE_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, Stecker oder Buchse)", "  Pin 2 (RX) ──┐", "  Pin 3 (TX) ──┘   Pin 2 mit Pin 3 verbinden", "", "TTL-Adapter", "  TX ──┐", "  RX ──┘   TX mit RX verbinden", "", "RS-485 geht nicht an einem Port — «Zwei Ports» wählen."].join("\n"),
  two: ["RS-232 (gekreuzt, Nullmodem)", "  Port A        Port B", "  Pin 2 RX ──── Pin 3 TX", "  Pin 3 TX ──── Pin 2 RX", "  Pin 5 GND ─── Pin 5 GND", "", "RS-485 (2-Draht)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Ein RS-485-Adapter — Gerät vom Bus getrennt", "  A(D+)  B(D−)  nichts angeschlossen"].join("\n"),
};

export const DE_IFACE: De<IfaceTextKey> = {
  title: "Dieser PC",
  all: "alle Adapter",
  local: "nur dieser PC",
  down: "nicht verbunden",
  none: "Die Adapteradressen ließen sich nicht lesen",
  refresh: "Neu laden",
  use: "Diese Adresse verwenden",
  gw: "Gateway",
  notHere: "«{a}» ist keine Adresse dieses PCs — der Start schlägt mit «Adresse nicht verfügbar» fehl. Eine aus der Liste unten wählen.",
  downHere: "Der Adapter für «{a}» ({b}) ist nicht verbunden (Kabel / WLAN prüfen).",
};

export const DE_OPEN_APP: De<OpenAppTextKey> = {
  opened: "{a} geöffnet — {b}. In diesem Fenster auf Verbinden drücken.",
  missing: "{a} wurde auf diesem PC nicht gefunden, daher wurde «{b}» kopiert — dort einfügen.",
  get: "Download-Seite",
};

/** Schließen bestätigen (exitGuard.ts) */
export const DE_EXIT = "Eine Verbindung oder Dateiaufzeichnung ist aktiv. Beim Schließen wird die Verbindung getrennt und die Aufzeichnung beendet. Trotzdem schließen?";

/** Beispielbefehle (examples.ts) — Namensanfang und englischer Name → deutscher Name */
export const DE_EXAMPLE_PREFIX = "z. B. ";
export const DE_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (Antwort prüfen)",
  "ATI (device info)": "ATI (Geräteinfo)",
  "AT+GMR (firmware version)": "AT+GMR (Firmware-Version)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus Slave-Adresse 1 lesen 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus Slave-Adresse 1 lesen 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (SCPI-Gerätekennung)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP Slave-Adresse 1 lesen 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP Slave-Adresse 1 lesen 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "HTTP-Anfrage der Startseite (Port 80)",
  "text hello": "Text hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (Gerätekennung)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (Gleichspannung)",
  "SYST:ERR? (one error)": "SYST:ERR? (ein Fehler)",
};
