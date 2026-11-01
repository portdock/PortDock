// Polski — 3. pakiet (10 testów sprzętu PC jako narzędzia online, scope.ts SCOPE3). Układ jak w pakiecie wzorcowym ja/batch3.ts (site/I18N.md «3차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, hwPrivacy = 하드웨어 테스트 쪽 개인정보 줄(components/HwPrivacy.astro), lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page3Id, Scope3Path } from "../scope.ts";
import micTest from "./pages/micTest.ts";
import keyboardTest from "./pages/keyboardTest.ts";
import webcamTest from "./pages/webcamTest.ts";
import speakerTest from "./pages/speakerTest.ts";
import mouseTest from "./pages/mouseTest.ts";
import gamepadTest from "./pages/gamepadTest.ts";
import monitorTest from "./pages/monitorTest.ts";
import bsodCodes from "./pages/bsodCodes.ts";
import batteryReport from "./pages/batteryReport.ts";
import barcodeTest from "./pages/barcodeTest.ts";
import libHwSignal from "./lib/hwSignal.ts";
import libBsod from "./lib/bsod.ts";
import libBatteryReport from "./lib/batteryReport.ts";
import libBarcode from "./lib/barcode.ts";
import libInputTiming from "./lib/inputTiming.ts";
import libKeyboardLayout from "./lib/keyboardLayout.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/mic-test/": { name: "Test mikrofonu", blurb: "Miernik poziomu na żywo, rzeczywista częstotliwość próbkowania, szum tła i przesterowanie, redukcja echa wł./wył., odsłuch 5 s lokalnego nagrania." },
    "tools/keyboard-test/": { name: "Test klawiatury (drgania styków i rollover)", blurb: "Układ koreański 106, ANSI lub ISO: wciśnięte klawisze, rollover, wciśnięcia każdego klawisza, podejrzenia drgań styków w ms, klawisze niewidoczne dla przeglądarki." },
    "tools/webcam-test/": { name: "Test kamery internetowej", blurb: "Podgląd, żądana i rzeczywista rozdzielczość, zmierzone fps, wybór kamery. Obraz nigdy nie jest zapisywany ani wysyłany." },
    "tools/speaker-test/": { name: "Test głośników lewy/prawy", blurb: "Lewy, prawy i oba, osobne kanały 5.1/7.1, sprawdzenie polaryzacji, przemiatanie częstotliwości i ton, wybór urządzenia wyjściowego." },
    "tools/mouse-test/": { name: "Test podwójnego kliknięcia myszy", blurb: "Pięć przycisków i cztery kierunki kółka, odstęp podwójnego kliknięcia w ms, podejrzenia drgań styków, zerwania przeciągania, szacunek polling rate." },
    "tools/gamepad-test/": { name: "Test pada (drift gałki i martwa strefa)", blurb: "Przyciski, spusty i osie na żywo, drift gałki w spoczynku ze śladem, podgląd martwej strefy, wibracja tam, gdzie działa." },
    "tools/monitor-test/": { name: "Test martwych pikseli i odświeżania", blurb: "Jednolite kolory na pełnym ekranie do szukania martwych pikseli, banding w gradiencie, szacunek częstotliwości odświeżania, ruchomy pasek do smużenia." },
    "tools/bsod-codes/": { name: "Kody błędów niebieskiego ekranu (BSOD)", blurb: "Wklej kod, np. 0xD1 lub 0x133, nazwę albo komunikat zdarzenia 1001: znaczenie, możliwe przyczyny, co sprawdzić i strona Microsoft." },
    "tools/battery-report/": { name: "Czytnik raportu baterii laptopa", blurb: "Upuść plik HTML z powercfg /batteryreport: pozostała pojemność względem projektowej, liczba cykli, wykres historii pojemności. Tylko w przeglądarce." },
    "tools/barcode-scanner-test/": { name: "Test czytnika kodów kreskowych", blurb: "Zeskanowany tekst z widocznymi Enter, Tab i GS, ms między znakami, prefiks/sufiks, Caps Lock, odczyt AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Prywatność: obraz z kamery i dźwięk z mikrofonu zostają w tej przeglądarce i nigdy nie są zapisywane ani wysyłane — dane kamery i mikrofonu oraz nazwy urządzeń nigdzie nie trafiają.",
    input: "Prywatność: klawisze, przyciski i ruchy są liczone w tej przeglądarce i nigdzie nie są wysyłane.",
    output: "Prywatność: to narzędzie tylko wyświetla obraz lub odtwarza dźwięk i nie wysyła nic o twoim teście.",
    ads: [" Reklamy na tej stronie (Google AdSense) działają osobno — zobacz ", "politykę prywatności", "."],
    tester: ["Aby rejestrować w czasie zaniki Wi-Fi lub internetu oraz połączenia i rozłączenia Bluetooth, użyj programu dla Windows ", " (bezpłatny)."],
  },

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    hwSignal: libHwSignal,
    bsod: libBsod,
    batteryReport: libBatteryReport,
    barcode: libBarcode,
    inputTiming: libInputTiming,
    keyboardLayout: libKeyboardLayout,
  },

  /** 쪽 글 */
  pages: { micTest, keyboardTest, webcamTest, speakerTest, mouseTest, gamepadTest, monitorTest, bsodCodes, batteryReport, barcodeTest } satisfies Record<Page3Id, unknown>,
};
