// Deutsch — 7. Paket (15 Web-Tools für Maschinen, Verdrahtungsarbeiten und Dokumente, scope.ts SCOPE7). Aufbau wie das Referenzpaket ja/batch7.ts (site/I18N.md «7차 묶음 붙이는 법»), Quelle ist die englische Fassung.
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page7Id, Scope7Path } from "../scope.ts";
import airConsumption from "./pages/airConsumption.ts";
import ballScrew from "./pages/ballScrew.ts";
import conveyorSpeed from "./pages/conveyorSpeed.ts";
import cylinder from "./pages/cylinder.ts";
import timingBelt from "./pages/timingBelt.ts";
import vacuumPad from "./pages/vacuumPad.ts";
import cableLabels from "./pages/cableLabels.ts";
import ferrules from "./pages/ferrules.ts";
import insulation from "./pages/insulation.ts";
import metricThreads from "./pages/metricThreads.ts";
import panelHeat from "./pages/panelHeat.ts";
import handover from "./pages/handover.ts";
import ioList from "./pages/ioList.ts";
import systemDiagram from "./pages/systemDiagram.ts";
import commissioning from "./pages/commissioning.ts";
import libAirConsumption from "./lib/airConsumption.ts";
import libBallScrew from "./lib/ballScrew.ts";
import libConveyor from "./lib/conveyor.ts";
import libCylinder from "./lib/cylinder.ts";
import libTimingBelt from "./lib/timingBelt.ts";
import libVacuumPad from "./lib/vacuumPad.ts";
import libCableLabels from "./lib/cableLabels.ts";
import libFerrules from "./lib/ferrules.ts";
import libInsulation from "./lib/insulation.ts";
import libPanelHeat from "./lib/panelHeat.ts";
import libHandover from "./lib/handover.ts";
import libIoList from "./lib/ioList.ts";
import libSysDiagram from "./lib/sysDiagram.ts";
import libSysDiff from "./lib/sysDiff.ts";
import libCommissioning from "./lib/commissioning.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/air-consumption/": { name: "Luftverbrauch von Pneumatikzylindern berechnen", blurb: "Bohrung, Hub, Druck und Schlauch → Luftverbrauch pro Zyklus (L ANR), pro Minute, benötigter Volumenstrom und Richtwert für den Kompressor." },
    "tools/ball-screw/": { name: "Kugelgewindetrieb: Drehmoment und Motorauslegung berechnen", blurb: "Masse, Geschwindigkeit, Beschleunigungszeit und Steigung → Axiallast, Motordrehzahl, Drehmoment beim Beschleunigen, konstant und Bremsen, Lastträgheit, effektives Drehmoment. Waagerecht oder senkrecht." },
    "tools/conveyor-speed/": { name: "Fördergeschwindigkeit ↔ Umrichterfrequenz berechnen", blurb: "Walzendurchmesser, Getriebeübersetzung, Polzahl und Schlupf → Bandgeschwindigkeit in m/min, Hz für eine Zielgeschwindigkeit, Geschwindigkeit je Hz." },
    "tools/cylinder-force/": { name: "Zylinderkraft von Pneumatikzylindern berechnen", blurb: "Bohrung, Stange und Druck → Kraft beim Aus- und Einfahren (N, kgf); für eine Kraft und einen Lastfaktor eine Bohrung aus der SMC-Tabelle wählen." },
    "tools/timing-belt/": { name: "Zahnriemen: Länge und Achsabstand berechnen", blurb: "Teilung, Scheibenzähne und Achsabstand → Riemenlänge und Zähnezahl oder Riemen → Achsabstand. Teilkreisdurchmesser, Umschlingung, Zähne im Eingriff, Geschwindigkeit." },
    "tools/vacuum-pad/": { name: "Haltekraft von Vakuumsaugern berechnen", blurb: "Saugerdurchmesser, Vakuum und Sicherheitsfaktor → Haltekraft (N, kgf), nötiges Vakuum oder nötiger Saugerdurchmesser, Rohrvolumen und Ansprechzeit." },
    "tools/cable-labels/": { name: "Etiketten für Kabel und Klemmen erstellen", blurb: "Folgen (W001–W120, X1:1–X1:40), eingefügte E/A-Namen, Etiketten mit zwei Enden «A→B» — auf A4-Etikettenbögen drucken (Zeilen, Spalten, Ränder in mm) oder CSV und Text für Etikettendrucker exportieren." },
    "tools/ferrules/": { name: "Aderendhülsen und Kabelschuhe: Farbtabelle", blurb: "mm² oder AWG → Kragenfarbe der Aderendhülse (DIN 46228-4 und französischer Code), Farbe → Größe, Klasse des Ringkabelschuhs (1.25, 2, 5.5) und Bolzen. Nur Werte mit Quelle." },
    "tools/insulation-resistance/": { name: "Isolationswiderstand prüfen", blurb: "SELV/PELV, Stromkreis bis 500 V oder über 500 V, Prüfspannung und MΩ → Vergleich mit den Mindestwerten nach IEC 60364-6 (0.5 und 1 MΩ), dazu Sicherheitsschritte vor der Prüfung." },
    "tools/metric-threads/": { name: "Metrische Gewinde: Kernlochbohrer- und Schraubentabelle", blurb: "M2–M20 Regel- und Feingewinde, Kernloch (d − P), Größen von Innensechskantschlüssel (ISO 4762) und Schraubenschlüssel (ISO 4032), Werkzeuggröße → Gewinde." },
    "tools/panel-heat/": { name: "Schaltschrank: Wärmeabfuhr und Lüfterauslegung berechnen", blurb: "Summe der Verlustleistung, Schrankgröße und Aufstellung (IEC 60890) → natürliche Wärmeabgabe, Lüfterluftstrom in m³/h (höhenkorrigiert), Leistung von Kühlgerät und Heizung." },
    "tools/handover-pack/": { name: "Übergabedokumentation für die Anlage erstellen", blurb: "Schaubild-JSON, E/A-Listen-JSON, CSV der Inbetriebnahme-Checkliste, Ansprechpartner und Notizen → ein druckbares Dokument mit Deckblatt und Inhaltsverzeichnis. Als HTML speichern oder als PDF drucken, nur im Browser." },
    "tools/io-list/": { name: "E/A-Liste und Kommunikationsspezifikation erstellen", blurb: "Kommunikation je Gerät (RTU/TCP, Unit-ID, IP, Baudrate) mit Tags, Adressen, Funktionen, Typen, Wortreihenfolge und Skalierung. Prüfung auf Überlappung und doppelte IDs, Import von Gerätezuordnungen, CSV (Excel), JSON, Druck." },
    "tools/system-diagram/": { name: "Systemschaubild-Editor", blurb: "PCs, SPS, Bedienterminals, Antriebe und Switches auf Ethernet- oder RS-485-Bussen platzieren. Doppelte IPs, Subnetze, IDs, Abschluss, Einheitslasten, Abfragezeit, Vergleich vor/nach; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Checkliste für Inbetriebnahme und Wartung", blurb: "Neuinstallation, regelmäßige Inspektion, Erweiterung, Austausch oder Ausbau × PC, SPS, Bedienterminal, Antrieb, RS-485, Switch, 24-V-Versorgung — eine gestufte Checkliste. Häkchen und Notizen gespeichert, Druck, CSV." },
  } satisfies Record<Scope7Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    airConsumption: libAirConsumption,
    ballScrew: libBallScrew,
    conveyor: libConveyor,
    cylinder: libCylinder,
    timingBelt: libTimingBelt,
    vacuumPad: libVacuumPad,
    cableLabels: libCableLabels,
    ferrules: libFerrules,
    insulation: libInsulation,
    panelHeat: libPanelHeat,
    handover: libHandover,
    ioList: libIoList,
    sysDiagram: libSysDiagram,
    sysDiff: libSysDiff,
    commissioning: libCommissioning,
  },

  /** 쪽 글 */
  pages: { airConsumption, ballScrew, conveyorSpeed, cylinder, timingBelt, vacuumPad, cableLabels, ferrules, insulation, metricThreads, panelHeat, handover, ioList, systemDiagram, commissioning } satisfies Record<Page7Id, unknown>,
};
