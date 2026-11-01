// Polski — 6. pakiet (15 narzędzi internetowych z elektryki, scope.ts SCOPE6). Układ jak wersja wzorcowa ja/batch6.ts (site/I18N.md «6차 묶음 붙이는 법»), źródłem jest wersja angielska.
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page6Id, Scope6Path } from "../scope.ts";
import awgMm2 from "./pages/awgMm2.ts";
import conduitFill from "./pages/conduitFill.ts";
import ctRatio from "./pages/ctRatio.ts";
import energyPulse from "./pages/energyPulse.ts";
import heater from "./pages/heater.ts";
import ledResistor from "./pages/ledResistor.ts";
import motorCurrent from "./pages/motorCurrent.ts";
import motorSpeed from "./pages/motorSpeed.ts";
import resistor from "./pages/resistor.ts";
import pfCapacitor from "./pages/pfCapacitor.ts";
import psuSizing from "./pages/psuSizing.ts";
import affinity from "./pages/affinity.ts";
import reactance from "./pages/reactance.ts";
import power from "./pages/power.ts";
import voltageDrop from "./pages/voltageDrop.ts";
import libConduitFill from "./lib/conduitFill.ts";
import libCtRatio from "./lib/ctRatio.ts";
import libEnergyPulse from "./lib/energyPulse.ts";
import libHeater from "./lib/heater.ts";
import libLedResistor from "./lib/ledResistor.ts";
import libMotorCurrent from "./lib/motorCurrent.ts";
import libMotorSpeed from "./lib/motorSpeed.ts";
import libResistor from "./lib/resistor.ts";
import libPfCapacitor from "./lib/pfCapacitor.ts";
import libPsuSizing from "./lib/psuSizing.ts";
import libAffinity from "./lib/affinity.ts";
import libReactance from "./lib/reactance.ts";
import libPower from "./lib/power.ts";
import libVoltageDrop from "./lib/voltageDrop.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/awg-mm2/": { name: "Tabela przeliczeń AWG ↔ mm²", blurb: "Średnica i przekrój od AWG 0000 do 40 (wzór ASTM B258), najbliższy rozmiar metryczny (IEC 60228), rezystancja miedzi w Ω/km. Przeliczanie w obie strony." },
    "tools/conduit-fill/": { name: "Kalkulator wypełnienia rur i koryt", blurb: "Średnica zewnętrzna i liczba przewodów → wypełnienie w %. Porównanie z NEC: rura 53/31/40 %, koryto 20 %, korytko szafy NFPA 79 50 %; najmniejsza średnica rury i największa liczba przewodów." },
    "tools/ct-ratio/": { name: "Kalkulator przekładni i obciążenia przekładnika prądowego", blurb: "Prąd pierwotny ↔ wtórny z przekładni, przewody tam i z powrotem plus VA licznika → obciążenie całkowite (VA, Ω) wobec wartości znamionowej, współczynnik poprawkowy przekładni." },
    "tools/energy-pulse/": { name: "Kalkulator impulsów licznika energii", blurb: "imp/kWh, odstęp lub liczba impulsów → kW i kWh, mnożnik przekładników prądowego i napięciowego, częstość i szerokość impulsów przy pełnym obciążeniu." },
    "tools/heater-power/": { name: "Kalkulator mocy grzałki (kW, amperów)", blurb: "Masa, ciepło właściwe, przyrost temperatury i czas → moc grzałki w kW, kW dla płynu w przepływie, prąd jedno- i trójfazowy, moc przy innych napięciach." },
    "tools/led-resistor/": { name: "Kalkulator rezystora do diody LED", blurb: "Zasilanie, Vf, prąd i liczba diod szeregowo → rezystor i jego moc, prąd dla wartości z szeregu E12/E24. Kontrolki 5, 12, 24 V." },
    "tools/motor-current/": { name: "Kalkulator prądu silnika", blurb: "Trójfazowy, jednofazowy lub prądu stałego, kW (HP) → amper, moc pobierana, kVA, moment. Sprawność z tabliczki znamionowej." },
    "tools/motor-speed/": { name: "Częstotliwość przemiennika ↔ obroty silnika", blurb: "Hz i liczba biegunów → prędkość synchroniczna, poślizg z tabliczki, prędkość wyjściowa przekładni, Hz dla zadanych obrotów." },
    "tools/parallel-resistor/": { name: "Kalkulator rezystorów połączonych szeregowo i równolegle", blurb: "Wartość wypadkowa w szeregu i równolegle, podział prądu, rezystor dopełniający do wartości docelowej i pary z szeregów E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Kalkulator kondensatorów do kompensacji współczynnika mocy", blurb: "kW, obecny i docelowy współczynnik mocy → potrzebne kvar, µF na kondensator w trójkącie lub gwieździe, prąd przed i po kompensacji." },
    "tools/power-supply-sizing/": { name: "Kalkulator doboru zasilacza 24 V DC", blurb: "Prąd, prąd załączeniowy i czas pracy sterowników, paneli HMI, czujników, zaworów i cewek → suma, moc znamionowa z zapasem (typowe wielkości), kontrola prądu załączeniowego, kanały zabezpieczeń." },
    "tools/pump-fan-affinity/": { name: "Kalkulator prędkości i mocy pomp oraz wentylatorów", blurb: "Częstotliwość przemiennika → przepływ, ciśnienie i moc (prawa podobieństwa), roczna różnica energii, częstotliwość dla zadanego przepływu." },
    "tools/reactance/": { name: "Kalkulator reaktancji i rezonansu LC", blurb: "Xc i XL przy danej częstotliwości, C lub L dla zadanego X, częstotliwość rezonansowa i impedancja LC, prąd kondensatora i kvar." },
    "tools/three-phase-power/": { name: "Kalkulator mocy trójfazowej", blurb: "Napięcie oraz prąd, kW lub kVA i współczynnik mocy → kVA, kW, kvar i prąd; współczynnik mocy z kW i kVA." },
    "tools/voltage-drop/": { name: "Kalkulator spadku napięcia i przekroju przewodu", blurb: "Prąd stały, jedno- i trójfazowy, mm² lub AWG, miedź lub aluminium → spadek i %, przekrój i długość dla dopuszczalnego spadku." },
  } satisfies Record<Scope6Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다 — conduitFill 은 서버에서만 그린다) */
  lib: {
    conduitFill: libConduitFill,
    ctRatio: libCtRatio,
    energyPulse: libEnergyPulse,
    heater: libHeater,
    ledResistor: libLedResistor,
    motorCurrent: libMotorCurrent,
    motorSpeed: libMotorSpeed,
    resistor: libResistor,
    pfCapacitor: libPfCapacitor,
    psuSizing: libPsuSizing,
    affinity: libAffinity,
    reactance: libReactance,
    power: libPower,
    voltageDrop: libVoltageDrop,
  },

  /** 쪽 글 */
  pages: { awgMm2, conduitFill, ctRatio, energyPulse, heater, ledResistor, motorCurrent, motorSpeed, resistor, pfCapacitor, psuSizing, affinity, reactance, power, voltageDrop } satisfies Record<Page6Id, unknown>,
};
