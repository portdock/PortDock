// Türkçe — 3. paket (PC donanım testi için 10 web aracı, scope.ts SCOPE3). ja/batch3.ts ile aynı biçim; İngilizce sürümden çevrildi (site/I18N.md «3차 묶음 붙이는 법»).
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
    "tools/mic-test/": { name: "Mikrofon testi", blurb: "Giriş seviyesi göstergesi, gerçek örnekleme hızı, gürültü tabanı, kırpılma, yankı engelleme açık/kapalı karşılaştırması ve 5 saniyelik yerel kaydı dinleme." },
    "tools/keyboard-test/": { name: "Klavye testi (tuş çift basma, çoklu tuş)", blurb: "ANSI, ISO veya Korece 106 düzeninde basılan tuşlar, aynı anda basılan tuş sayısı, tuş başına basış, çift basma şüphesi (ms) ve tarayıcının alamadığı tuşlar." },
    "tools/webcam-test/": { name: "Web kamerası testi", blurb: "Önizleme, istenen ve gerçek çözünürlük, FPS ölçümü ve kamera seçimi. Görüntü kaydedilmez, gönderilmez." },
    "tools/speaker-test/": { name: "Sol/sağ hoparlör testi", blurb: "Sol, sağ, ikisi, 5.1 ve 7.1 kanal kanal ses, polarite kontrolü, frekans taraması ve ton, çıkış aygıtı seçimi." },
    "tools/mouse-test/": { name: "Fare çift tıklama testi", blurb: "Beş düğme ve dört tekerlek yönü, çift tıklama aralığı (ms), çift basma şüphesi, sürükleme kopması ve yoklama hızı tahmini." },
    "tools/gamepad-test/": { name: "Gamepad testi (analog çubuk kayması, ölü bölge)", blurb: "Düğmeler, tetikler ve eksenler canlı, bırakılan çubuğun kayması ve izi, ölü bölge önizlemesi ve titreşim (destekleyen tarayıcılarda)." },
    "tools/monitor-test/": { name: "Ölü piksel ve yenileme hızı testi", blurb: "Ölü ve takılı pikseller için tam ekran düz renkler, renk geçişinde bantlanma, yenileme hızı tahmini ve gölgelenmeyi gösteren hareketli çubuk." },
    "tools/bsod-codes/": { name: "Mavi ekran durdurma kodu sözlüğü", blurb: "0xD1, 0x133 gibi kodları, adları veya olay 1001 iletisini yapıştırın; anlamı, olası nedenler, kontrol sırası ve Microsoft belgeleri." },
    "tools/battery-report/": { name: "Dizüstü pil raporu okuyucu", blurb: "powercfg /batteryreport HTML dosyasını bırakın: tasarıma göre kalan kapasite, döngü sayısı ve kapasite geçmişi grafiği. Yalnızca tarayıcıda işlenir." },
    "tools/barcode-scanner-test/": { name: "Barkod okuyucu testi", blurb: "Enter, Tab ve GS gösterilerek okunan metin, karakterler arası ms (okuyucu mu insan mı), klavye düzeni kaynaklı bozulma, Caps Lock ve GS1 AI çözümü." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Gizlilik: kamera görüntüsü ve mikrofon sesi yalnızca bu tarayıcıda işlenir, kaydedilmez ve yüklenmez — kamera ve mikrofon verileri ile aygıt adları hiçbir yere gönderilmez.",
    input: "Gizlilik: tuşlar, düğmeler ve hareketler yalnızca bu tarayıcıda sayılır ve hiçbir yere gönderilmez.",
    output: "Gizlilik: bu araç yalnızca görüntü veya ses üretir, testinizle ilgili hiçbir şeyi bir yere göndermez.",
    ads: [" Bu sayfadaki reklamlar (Google AdSense) ayrı çalışır — ", "gizlilik politikası", " sayfasına bakın."],
    tester: ["Wi-Fi veya internet kopmalarını ve Bluetooth bağlanıp kopmalarını zamana göre kaydetmek için Windows programı ", " kullanılır (ücretsiz)."],
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
