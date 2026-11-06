// 포르투갈어(브라질) — 3차 묶음(PC 하드웨어 테스트 웹 도구 9개, scope.ts SCOPE3). 기준판 ja/batch3.ts 와 같은 모양, 번역 원천은 영어판(site/I18N.md «3차 묶음 붙이는 법»).
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
    "tools/mic-test/": { name: "Teste de microfone", blurb: "Medidor do nível de entrada, taxa de amostragem real, ruído de fundo, clipping, comparação com e sem cancelamento de eco e gravação local de 5 s." },
    "tools/keyboard-test/": { name: "Teste de teclado (chattering e rollover)", blurb: "Teclas pressionadas em layout ANSI, ISO ou coreano 106, teclas simultâneas, contagem por tecla, suspeitas de chattering (ms) e teclas que o navegador não recebe." },
    "tools/webcam-test/": { name: "Teste de webcam", blurb: "Prévia, resolução pedida x real, FPS medidos e troca de câmera. O vídeo não é salvo nem enviado." },
    "tools/speaker-test/": { name: "Teste de alto-falantes esquerdo e direito", blurb: "Esquerda, direita ou os dois, som por canal em 5.1 e 7.1, verificação de fase (polaridade), varredura de frequência e tom, escolha da saída." },
    "tools/mouse-test/": { name: "Teste de clique duplo do mouse", blurb: "Cinco botões e quatro direções da roda, intervalo do clique duplo em ms, suspeitas de chattering, quebras de arraste e taxa de polling estimada." },
    "tools/gamepad-test/": { name: "Teste de controle (drift do analógico e zona morta)", blurb: "Botões, gatilhos e eixos ao vivo, desvio e rastro do analógico solto, prévia da zona morta e vibração (navegadores compatíveis)." },
    "tools/monitor-test/": { name: "Teste de pixels mortos e taxa de atualização", blurb: "Cores sólidas em tela cheia para pixels mortos ou presos, banding em degradês, estimativa dos Hz e barra em movimento para ver o ghosting." },
    "tools/bsod-codes/": { name: "Códigos de erro da tela azul (BSOD)", blurb: "Cole um código como 0xD1 ou 0x133, o nome ou uma mensagem do evento 1001: significado, causas possíveis, o que verificar em ordem e documentação da Microsoft." },
    "tools/barcode-scanner-test/": { name: "Teste de leitor de código de barras", blurb: "Caracteres lidos com Enter, Tab e GS visíveis, ms entre caracteres (leitor ou digitação), layout do teclado, Caps Lock e análise de AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Privacidade: a imagem da câmera e o som do microfone são tratados só dentro deste navegador e nunca são salvos nem enviados — nem os dados nem os nomes dos dispositivos vão para lugar nenhum.",
    input: "Privacidade: teclas, botões e movimentos são contados só dentro deste navegador e não são enviados para lugar nenhum.",
    output: "Privacidade: esta ferramenta só produz imagem ou som e não envia nada do teste para lugar nenhum.",
    ads: [" Os anúncios desta página (Google AdSense) funcionam à parte — veja a ", "política de privacidade", "."],
    tester: ["Para registrar ao longo do tempo as quedas de Wi-Fi e internet ou as conexões e desconexões de Bluetooth, use o programa para Windows ", " (gratuito)."],
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
