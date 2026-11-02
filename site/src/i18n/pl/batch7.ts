// polski — 7. pakiet (15 narzędzi webowych: maszyny, prace przy okablowaniu, dokumenty, scope.ts SCOPE7). Układ jak w pakiecie wzorcowym ja/batch7.ts (site/I18N.md «7차 묶음 붙이는 법»), źródłem jest wersja angielska.
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
    "tools/air-consumption/": { name: "Kalkulator zużycia powietrza przez cylinder pneumatyczny", blurb: "Średnica, skok, ciśnienie i przewody → zużycie powietrza na cykl (L ANR), na minutę, wymagany przepływ i wskazówka co do sprężarki." },
    "tools/ball-screw/": { name: "Kalkulator momentu śruby kulowej i doboru silnika", blurb: "Masa, prędkość, czas przyspieszania i skok gwintu → obciążenie osiowe, prędkość silnika, moment przy przyspieszaniu, stały i hamowaniu, bezwładność obciążenia, moment skuteczny. Poziomo lub pionowo." },
    "tools/conveyor-speed/": { name: "Kalkulator prędkości przenośnika ↔ częstotliwości falownika", blurb: "Średnica rolki, przełożenie, liczba biegunów i poślizg → prędkość taśmy w m/min, Hz dla zadanej prędkości, prędkość na 1 Hz." },
    "tools/cylinder-force/": { name: "Kalkulator siły cylindra pneumatycznego", blurb: "Średnica, tłoczysko i ciśnienie → siła wysuwu i wsuwu (N, kgf); dobór średnicy z tabeli SMC dla siły i współczynnika obciążenia." },
    "tools/timing-belt/": { name: "Kalkulator długości pasa zębatego i rozstawu osi", blurb: "Podziałka, zęby kół i rozstaw osi → długość i liczba zębów pasa, albo pas → rozstaw osi. Średnica podziałowa, opasanie, zęby w zazębieniu, prędkość." },
    "tools/vacuum-pad/": { name: "Kalkulator siły podnoszenia przyssawki próżniowej", blurb: "Średnica przyssawki, podciśnienie i współczynnik bezpieczeństwa → siła podnoszenia (N, kgf), wymagane podciśnienie lub rozmiar przyssawki, objętość rury i czas reakcji." },
    "tools/cable-labels/": { name: "Generator etykiet kabli i zacisków", blurb: "Sekwencje (W001–W120, X1:1–X1:40), wklejone nazwy I/O, etykiety dwustronne «A→B» — drukuj na arkuszach A4 (wiersze, kolumny, marginesy w mm) albo eksportuj CSV i tekst dla drukarek etykiet." },
    "tools/ferrules/": { name: "Tabela końcówek tulejkowych i oczkowych", blurb: "mm² lub AWG → kolor kołnierza końcówki tulejkowej (DIN 46228-4 i kod francuski), kolor → rozmiar, klasa końcówki oczkowej (1.25, 2, 5.5) i śruba. Tylko wartości ze źródłem." },
    "tools/insulation-resistance/": { name: "Kontrola rezystancji izolacji", blurb: "SELV/PELV, obwód do 500 V lub powyżej 500 V, napięcie próby i MΩ → porównanie z minimami IEC 60364-6 (0.5 i 1 MΩ) oraz kroki bezpieczeństwa przed pomiarem." },
    "tools/metric-threads/": { name: "Gwinty metryczne: średnice wierteł pod gwint i tabela śrub", blurb: "M2–M20 zwykłe i drobnozwojne, wiertło pod gwint (d − P), rozmiary klucza imbusowego (ISO 4762) i płaskiego (ISO 4032), rozmiar narzędzia → gwint." },
    "tools/panel-heat/": { name: "Kalkulator ciepła szafy sterowniczej i doboru wentylatora", blurb: "Suma strat cieplnych urządzeń, rozmiar szafy i sposób montażu (IEC 60890) → naturalne odprowadzanie ciepła, przepływ wentylatora w m³/h (z korektą wysokości), moc klimatyzatora i grzałki." },
    "tools/handover-pack/": { name: "Generator dokumentacji przekazania obiektu", blurb: "JSON schematu, JSON listy I/O, CSV listy kontrolnej uruchomienia, kontakty i uwagi → jeden dokument do druku ze stroną tytułową i spisem treści. Zapis jako HTML lub druk do PDF, tylko w przeglądarce." },
    "tools/io-list/": { name: "Generator listy I/O i specyfikacji komunikacji", blurb: "Komunikacja każdego urządzenia (RTU/TCP, identyfikator jednostki, IP, prędkość) ze znacznikami, adresami, funkcjami, typami, kolejnością słów i skalą. Kontrola nakładania i duplikatów ID, import mapy urządzenia, CSV (Excel), JSON, druk." },
    "tools/system-diagram/": { name: "Edytor schematu systemu", blurb: "Umieszczaj PC, PLC, panele HMI, napędy i switche na magistralach Ethernet lub RS-485. Zduplikowane IP, podsieci, ID, terminacja, obciążenia jednostkowe, czas odpytywania, porównanie przed/po; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Lista kontrolna uruchomienia i konserwacji", blurb: "Nowa instalacja, przegląd okresowy, rozbudowa, wymiana lub demontaż × PC, PLC, HMI, napęd, RS-485, switch, zasilanie 24 V — lista kontrolna etapami. Zaznaczenia i uwagi zapisane, druk, CSV." },
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
