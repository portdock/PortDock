// 이탈리아어 — 3차 묶음(PC 하드웨어 테스트 웹 도구 10개, scope.ts SCOPE3). 기준판 ja/batch3.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «3차 묶음 붙이는 법»).
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
    "tools/mic-test/": { name: "Test del microfono", blurb: "Indicatore di livello in tempo reale, frequenza di campionamento reale, rumore di fondo e clipping, cancellazione dell'eco on/off, riascolto locale di 5 secondi." },
    "tools/keyboard-test/": { name: "Test della tastiera (rimbalzi e rollover)", blurb: "Layout coreano 106, ANSI o ISO: tasti premuti, tasti simultanei, pressioni per tasto, rimbalzi sospetti in ms, tasti che il browser non vede." },
    "tools/webcam-test/": { name: "Test della webcam", blurb: "Anteprima, risoluzione richiesta e ottenuta, fps misurati, scelta della videocamera. Il video non viene mai salvato né inviato." },
    "tools/speaker-test/": { name: "Test altoparlanti sinistro/destro", blurb: "Sinistra, destra ed entrambi, canale per canale in 5.1/7.1, polarità, sweep di frequenza e tono, scelta del dispositivo di output." },
    "tools/mouse-test/": { name: "Test del doppio clic del mouse", blurb: "Cinque pulsanti e quattro direzioni della rotellina, intervallo del doppio clic in ms, rimbalzi sospetti, trascinamenti interrotti, polling rate stimato." },
    "tools/gamepad-test/": { name: "Test del gamepad (drift degli stick e zona morta)", blurb: "Pulsanti, grilletti e assi in tempo reale, drift degli stick a riposo con la traccia, anteprima della zona morta, vibrazione dove supportata." },
    "tools/monitor-test/": { name: "Test pixel difettosi e frequenza di aggiornamento", blurb: "Colori pieni a schermo intero per pixel morti o bloccati, banding dei gradienti, frequenza di aggiornamento stimata, barra in movimento per il ghosting." },
    "tools/bsod-codes/": { name: "Codici di arresto della schermata blu (BSOD)", blurb: "Incollate un codice come 0xD1 o 0x133, un nome o un messaggio dell'evento 1001: significato, cause possibili, cosa controllare e pagina Microsoft." },
    "tools/battery-report/": { name: "Lettore del report della batteria del portatile", blurb: "Trascinate l'HTML di powercfg /batteryreport: capacità residua rispetto a quella di progetto, numero di cicli, storico della capacità. Solo nel browser." },
    "tools/barcode-scanner-test/": { name: "Test del lettore di codici a barre", blurb: "Testo letto con Invio, Tab e GS visibili, ms tra i caratteri, testo alterato da un IME coreano ripristinato, Bloc Maiusc, AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Privacy: il video della videocamera e il suono del microfono restano dentro questo browser e non vengono mai salvati né caricati — né i dati di videocamera e microfono né i nomi dei dispositivi vengono inviati.",
    input: "Privacy: tasti, pulsanti e movimenti vengono contati dentro questo browser e non vengono inviati da nessuna parte.",
    output: "Privacy: questo strumento produce solo immagini o suoni e non invia nulla del vostro test.",
    ads: [" Gli annunci di questa pagina (Google AdSense) funzionano a parte — vedete l'", "informativa sulla privacy", "."],
    tester: ["Per registrare nel tempo le disconnessioni Wi-Fi o di Internet e le connessioni e disconnessioni Bluetooth, usate il programma per Windows ", " (gratuito)."],
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
