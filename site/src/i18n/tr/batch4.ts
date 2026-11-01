// Türkçe — 4. paket (11 haberleşme web aracı, scope.ts SCOPE4). ja/batch4.ts ile aynı yapı; İngilizce sürümden çevrildi (site/I18N.md «4차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import pcapAnalyzer from "./pages/pcapAnalyzer.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import logicCapture from "./pages/logicCapture.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libPcap from "./lib/pcap.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";
import libLogic from "./lib/logic.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/ascii/": { name: "ASCII tablosu ve kontrol karakterleri", blurb: "0–127 ondalık, hex, ikilik ve karakter olarak; STX, ETX, ACK, NAK, CR, LF adları, şapka gösterimi ve kullanımlarıyla." },
    "tools/hex-ascii/": { name: "HEX ↔ ASCII dönüştürücü", blurb: "Baytlardan metne ve geri. Kontrol karakterleri \\r \\n \\xNN olarak." },
    "tools/integer/": { name: "Tam sayı ve taban dönüştürücü", blurb: "Hex, ondalık, ikilik ↔ 8/16/32 bit, işaretli (ikiye tümleyen), BCD, Gray kodu, register bayt sıraları." },
    "tools/modbus-blocks/": { name: "Modbus okuma isteği planlayıcı", blurb: "Adres listesi → fonksiyon koduna göre istekler. 125 register sınırı, izin verilen boşluk, kullanılmayan register’lar, RTU tarama süresi ve baytlar." },
    "tools/modbus-practice/": { name: "Modbus alıştırma testi", blurb: "Yeni başlayanlar için otomatik alıştırmalar — okuma isteği HEX’i, yanıttaki 40003 değeri, istisna 83 02, CRC bayt sırası, float ABCD ve CDAB. Açıklamalar, rehber bağlantıları, puan." },
    "tools/mqtt-decoder/": { name: "MQTT payload çözücü (Sparkplug B)", blurb: "HEX, Base64 veya metin → biçimli JSON, Sparkplug B metrikleri (ad, alias, tip, değer), ham MQTT paketleri (başlık, topic, QoS, paket ID)." },
    "tools/pcap-analyzer/": { name: "Endüstriyel pcap çözümleyici", blurb: "Wireshark veya pktmon kaydı → Modbus TCP ve MC istek/yanıt çiftleri, yanıt süreleri, yanıtsız istekler, istisna ve bitiş kodları. Yalnızca tarayıcınızda." },
    "tools/spi/": { name: "SPI mod yardımcısı (CPOL/CPHA dalga biçimleri)", blurb: "Mod 0–3 → örnekleme ve kaydırma kenarlarıyla SCK, MOSI, MISO ve CS dalga biçimleri, bayt bitleri (MSB/LSB önce), aktarım süresi, üretici gösterimleri (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "UART dalga biçimi çizici", blurb: "Metin veya hex → TTL ya da RS-232 seviyesinde start, veri (önce LSB), parite ve stop biti dalga biçimi, bit ve çerçeve süresi, darbe genişliği → standart baud." },
    "tools/web-serial/": { name: "Web seri terminal", blurb: "Tarayıcıda COM portu açın. HEX/ASCII görünüm, checksum ve satır sonu, günlüğü kaydetme." },
    "tools/logic-capture/": { name: "Lojik analizör kayıt çözücüsü (UART, SPI, I2C, CAN)", blurb: "sigrok/PulseView CSV, Saleae Logic 2 CSV veya VCD → kanal seçip UART (baud algılama), SPI mod 0–3, I2C adres/ACK, CAN (bit doldurma, CRC) çözme; mini dalga biçimi, tablo, CSV. Yalnızca tarayıcınızda." },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    pcap: libPcap,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
    logic: libLogic,
  },

  /** 쪽 글 */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, pcapAnalyzer, spi, uartWaveform, webSerial, logicCapture } satisfies Record<Page4Id, unknown>,
};
