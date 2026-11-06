// Deutsch — 3. Paket (10 PC-Hardwaretests als Web-Tools, scope.ts SCOPE3). Aufbau wie das Referenzpaket ja/batch3.ts (site/I18N.md «3차 묶음 붙이는 법»).
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
import barcodeTest from "./pages/barcodeTest.ts";
import libHwSignal from "./lib/hwSignal.ts";
import libBsod from "./lib/bsod.ts";
import libBarcode from "./lib/barcode.ts";
import libInputTiming from "./lib/inputTiming.ts";
import libKeyboardLayout from "./lib/keyboardLayout.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/mic-test/": { name: "Mikrofon testen", blurb: "Pegelanzeige live, tatsächliche Abtastrate, Grundrauschen und Übersteuerung, Echounterdrückung an/aus, 5 Sekunden lokale Aufnahme abspielen." },
    "tools/keyboard-test/": { name: "Tastatur testen (Prellen und Rollover)", blurb: "Koreanisches 106-, ANSI- oder ISO-Layout: gedrückte Tasten, Rollover, Anschläge je Taste, Prell-Verdacht in ms, Tasten, die der Browser nicht sieht." },
    "tools/webcam-test/": { name: "Webcam testen", blurb: "Vorschau, angeforderte und tatsächliche Auflösung, gemessene fps, Kamerawahl. Das Video wird nie gespeichert oder gesendet." },
    "tools/speaker-test/": { name: "Lautsprechertest links/rechts", blurb: "Links, rechts und beide, einzelne Kanäle bei 5.1/7.1, Polaritätsprüfung, Frequenz-Sweep und Ton, Wahl des Ausgabegeräts." },
    "tools/mouse-test/": { name: "Maus-Doppelklick-Test", blurb: "Fünf Tasten und vier Radrichtungen, Doppelklick-Abstand in ms, Prell-Verdacht, Abbrüche beim Ziehen, geschätzte Polling-Rate." },
    "tools/gamepad-test/": { name: "Gamepad testen (Stick-Drift und Deadzone)", blurb: "Tasten, Trigger und Achsen live, Stick-Drift in Ruhe mit Spur, Deadzone-Vorschau, Vibration, wo unterstützt." },
    "tools/monitor-test/": { name: "Pixelfehler- und Hz-Test", blurb: "Vollbild-Volltonfarben für tote oder hängende Pixel, Banding im Verlauf, geschätzte Bildwiederholrate, bewegter Balken für Schlieren." },
    "tools/bsod-codes/": { name: "Bluescreen-Stoppcodes nachschlagen", blurb: "Code wie 0xD1 oder 0x133, Namen oder Meldung von Ereignis 1001 einfügen: Bedeutung, mögliche Ursachen, Prüfschritte und Microsoft-Seite." },
    "tools/barcode-scanner-test/": { name: "Barcodescanner testen", blurb: "Gescannter Text mit sichtbarem Enter, Tab und GS, ms zwischen Zeichen, Präfix/Suffix, Caps Lock, GS1-AIs ausgewertet." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Datenschutz: Kamerabild und Mikrofonton bleiben in diesem Browser und werden nie gespeichert oder hochgeladen — Kamera- und Mikrofondaten sowie Gerätenamen werden nirgendwohin gesendet.",
    input: "Datenschutz: Tasten, Knöpfe und Bewegungen werden in diesem Browser gezählt und nirgendwohin gesendet.",
    output: "Datenschutz: Dieses Tool gibt nur Bild oder Ton aus und sendet nichts über Ihren Test.",
    ads: [" Werbung auf dieser Seite (Google AdSense) läuft getrennt davon — siehe ", "Datenschutzerklärung", "."],
    tester: ["Um WLAN- oder Internetabbrüche und Bluetooth-Verbindungen und -Trennungen über die Zeit zu protokollieren, nutzen Sie das Windows-Programm ", " (kostenlos)."],
  },

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    hwSignal: libHwSignal,
    bsod: libBsod,
    barcode: libBarcode,
    inputTiming: libInputTiming,
    keyboardLayout: libKeyboardLayout,
  },

  /** 쪽 글 */
  pages: { micTest, keyboardTest, webcamTest, speakerTest, mouseTest, gamepadTest, monitorTest, bsodCodes, barcodeTest } satisfies Record<Page3Id, unknown>,
};
