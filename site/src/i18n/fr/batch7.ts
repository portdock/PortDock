// français — 7e lot (15 outils web : machines, travaux de câblage, documents, scope.ts SCOPE7). Structure du lot de référence ja/batch7.ts (site/I18N.md «7차 묶음 붙이는 법»), source : version anglaise.
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
    "tools/air-consumption/": { name: "Calcul de la consommation d’air d’un vérin pneumatique", blurb: "Alésage, course, pression et tuyaux → air par cycle (L ANR), par minute, débit d’air requis et repère pour le compresseur." },
    "tools/ball-screw/": { name: "Calcul du couple d’une vis à billes et choix du moteur", blurb: "Masse, vitesse, temps d’accélération et pas → charge axiale, vitesse du moteur, couples d’accélération, constant et de décélération, inertie de charge, couple efficace. Horizontal ou vertical." },
    "tools/conveyor-speed/": { name: "Calcul de la vitesse d’un convoyeur ↔ fréquence du variateur", blurb: "Diamètre du rouleau, rapport de réduction, pôles et glissement → vitesse de ligne en m/min, Hz pour une vitesse cible, vitesse par Hz." },
    "tools/cylinder-force/": { name: "Calcul de la force d’un vérin pneumatique", blurb: "Alésage, tige et pression → force en sortie et en rentrée (N, kgf) ; choix d’un alésage dans le tableau SMC pour une force et un coefficient de charge." },
    "tools/timing-belt/": { name: "Calcul de la longueur d’une courroie crantée et de l’entraxe", blurb: "Pas, dents des poulies et entraxe → longueur et dents de la courroie, ou courroie → entraxe. Diamètre primitif, enroulement, dents en prise, vitesse." },
    "tools/vacuum-pad/": { name: "Calcul de la force de levage d’une ventouse à vide", blurb: "Diamètre de ventouse, vide et coefficient de sécurité → force de levage (N, kgf), vide ou taille de ventouse nécessaire, volume du tuyau et temps de réponse." },
    "tools/cable-labels/": { name: "Créateur d’étiquettes de câbles et de bornes", blurb: "Séquences (W001–W120, X1:1–X1:40), noms d’E/S collés, étiquettes à deux extrémités « A→B » — impression sur planches A4 (lignes, colonnes, marges en mm) ou export CSV et texte pour imprimantes d’étiquettes." },
    "tools/ferrules/": { name: "Tableau des embouts de câblage et des cosses", blurb: "mm² ou AWG → couleur du collier d’embout (DIN 46228-4 et code français), couleur → taille, classe de cosse à œil (1.25, 2, 5.5) et vis. Valeurs sourcées uniquement." },
    "tools/insulation-resistance/": { name: "Contrôle de la résistance d’isolement", blurb: "SELV/PELV, circuit ≤ 500 V ou > 500 V, tension d’essai et MΩ → comparaison avec les minimums de l’IEC 60364-6 (0.5 et 1 MΩ), plus les étapes de sécurité avant l’essai." },
    "tools/metric-threads/": { name: "Filetages métriques : forets de taraudage et tableau des vis", blurb: "M2–M20 gros et fin, perçage avant taraudage (d − P), tailles de clé six pans (ISO 4762) et de clé plate (ISO 4032), taille d’outil → filetage." },
    "tools/panel-heat/": { name: "Calcul de la chaleur d’une armoire et choix du ventilateur", blurb: "Total des pertes thermiques des équipements, taille d’armoire et installation (IEC 60890) → dissipation naturelle, débit du ventilateur en m³/h (corrigé de l’altitude), puissance du groupe de refroidissement et du chauffage." },
    "tools/handover-pack/": { name: "Créateur de dossier de remise sur site", blurb: "JSON du schéma, JSON de la liste d’E/S, CSV de la liste de contrôle de mise en service, contacts et notes → un document imprimable avec page de garde et sommaire. Enregistrement en HTML ou impression en PDF, dans le navigateur uniquement." },
    "tools/io-list/": { name: "Créateur de liste d’E/S et de spécification de communication", blurb: "Communication par équipement (RTU/TCP, identifiant d’unité, IP, débit) avec repères, adresses, fonctions, types, ordre des mots et échelle. Contrôle des chevauchements et des ID en double, import de table d’équipement, CSV (Excel), JSON, impression." },
    "tools/system-diagram/": { name: "Éditeur de schéma du système", blurb: "Placez PC, automates, IHM, variateurs et switches sur des bus Ethernet ou RS-485. IP en double, sous-réseaux, ID, terminaison, charges unitaires, temps d’interrogation, comparaison avant/après ; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Liste de contrôle de mise en service et de maintenance", blurb: "Nouvelle installation, inspection périodique, extension, remplacement ou retrait × PC, automate, IHM, variateur, RS-485, switch, alimentation 24 V — une liste de contrôle par étapes. Cases et notes enregistrées, impression, CSV." },
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
