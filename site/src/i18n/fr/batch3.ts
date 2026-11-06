// 프랑스어 — 3차 묶음(PC 하드웨어 테스트 웹 도구 9개, scope.ts SCOPE3). 기준판 ja/batch3.ts 를 본떠 영어판에서 옮겼다(site/I18N.md «3차 묶음 붙이는 법»).
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
    "tools/mic-test/": { name: "Test du micro", blurb: "Vumètre en direct, fréquence d’échantillonnage réelle, bruit de fond et saturation, annulation d’écho activée/désactivée, écoute locale de 5 secondes." },
    "tools/keyboard-test/": { name: "Test du clavier (rebonds et rollover)", blurb: "Dispositions coréenne 106, ANSI ou ISO : touches pressées, touches simultanées, appuis par touche, rebonds suspects en ms, touches invisibles pour le navigateur." },
    "tools/webcam-test/": { name: "Test de la webcam", blurb: "Aperçu, résolution demandée et obtenue, fps mesurés, choix de la caméra. La vidéo n’est jamais enregistrée ni envoyée." },
    "tools/speaker-test/": { name: "Test des haut-parleurs gauche/droite", blurb: "Gauche, droite et les deux, canal par canal en 5.1/7.1, polarité, balayage de fréquence et tonalité, choix de la sortie audio." },
    "tools/mouse-test/": { name: "Test du double-clic de la souris", blurb: "Cinq boutons et quatre sens de molette, intervalle du double-clic en ms, rebonds suspects, glisser interrompu, estimation du taux de polling." },
    "tools/gamepad-test/": { name: "Test de manette (drift des sticks et zone morte)", blurb: "Boutons, gâchettes et axes en direct, drift des sticks au repos avec trajectoire, aperçu de la zone morte, vibration selon le navigateur." },
    "tools/monitor-test/": { name: "Test des pixels morts et du taux de rafraîchissement", blurb: "Couleurs unies en plein écran pour les pixels morts ou bloqués, banding des dégradés, estimation du taux de rafraîchissement, barre mobile pour la rémanence." },
    "tools/bsod-codes/": { name: "Codes d’arrêt de l’écran bleu (BSOD)", blurb: "Collez un code comme 0xD1 ou 0x133, un nom ou un message de l’événement 1001 : signification, causes possibles, vérifications et page Microsoft." },
    "tools/barcode-scanner-test/": { name: "Test de lecteur de codes-barres", blurb: "Texte scanné avec Entrée, Tab et GS visibles, ms entre caractères, texte déformé par un IME coréen restauré, Verr. Maj, AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Confidentialité : l’image de la caméra et le son du micro restent dans ce navigateur et ne sont jamais enregistrés ni envoyés — ni les données de la caméra et du micro, ni les noms des périphériques ne sont transmis.",
    input: "Confidentialité : les touches, boutons et mouvements sont comptés dans ce navigateur et ne sont envoyés nulle part.",
    output: "Confidentialité : cet outil ne fait que produire une image ou un son et n’envoie rien de votre test.",
    ads: [" Les publicités de cette page (Google AdSense) fonctionnent à part — voir la ", "politique de confidentialité", "."],
    tester: ["Pour journaliser dans le temps les coupures Wi-Fi ou Internet et les connexions et déconnexions Bluetooth, utilisez le logiciel Windows ", " (gratuit)."],
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
