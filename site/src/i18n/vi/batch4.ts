// Tiếng Việt — gói 4 (11 công cụ web truyền thông, scope.ts SCOPE4). Cùng dạng với ja/batch4.ts; dịch từ bản tiếng Anh (site/I18N.md «4차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page4Id, Scope4Path } from "../scope.ts";
import ascii from "./pages/ascii.ts";
import hexAscii from "./pages/hexAscii.ts";
import integer from "./pages/integer.ts";
import modbusBlocks from "./pages/modbusBlocks.ts";
import modbusPractice from "./pages/modbusPractice.ts";
import mqttDecoder from "./pages/mqttDecoder.ts";
import spi from "./pages/spi.ts";
import uartWaveform from "./pages/uartWaveform.ts";
import webSerial from "./pages/webSerial.ts";
import libAscii from "./lib/ascii.ts";
import libIntConv from "./lib/intConv.ts";
import libModbusBlocks from "./lib/modbusBlocks.ts";
import libModbusQuiz from "./lib/modbusQuiz.ts";
import libMqttDecode from "./lib/mqttDecode.ts";
import libSpi from "./lib/spi.ts";
import libUartWave from "./lib/uartWave.ts";
import libWebSerial from "./lib/webSerial.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/ascii/": { name: "Bảng mã ASCII và ký tự điều khiển", blurb: "0–127 ở dạng thập phân, hex, nhị phân và ký tự, kèm tên, ký hiệu ^ và cách dùng của STX, ETX, ACK, NAK, CR, LF." },
    "tools/hex-ascii/": { name: "Chuyển đổi HEX ↔ ASCII", blurb: "Byte sang chữ và ngược lại. Ký tự điều khiển hiện dạng \\r \\n \\xNN." },
    "tools/integer/": { name: "Chuyển đổi số nguyên và hệ cơ số", blurb: "Hex, thập phân, nhị phân ↔ 8/16/32 bit, số có dấu (bù hai), BCD, mã Gray, thứ tự byte của thanh ghi." },
    "tools/modbus-blocks/": { name: "Gộp lệnh đọc Modbus", blurb: "Danh sách địa chỉ → lệnh hỏi theo mã hàm. Giới hạn 125 thanh ghi, khoảng trống cho phép, thanh ghi không dùng, chu kỳ polling RTU và số byte." },
    "tools/modbus-practice/": { name: "Bài tập trắc nghiệm Modbus", blurb: "Câu hỏi tự sinh cho người mới — HEX của lệnh đọc, giá trị 40003 trong phản hồi, ngoại lệ 83 02, thứ tự byte CRC, float ABCD và CDAB. Có lời giải, liên kết hướng dẫn và điểm." },
    "tools/mqtt-decoder/": { name: "Giải mã payload MQTT (Sparkplug B)", blurb: "HEX, Base64 hoặc văn bản → JSON đã định dạng, metric Sparkplug B (tên, alias, kiểu, giá trị), gói MQTT thô (header, topic, QoS, packet ID)." },
    "tools/spi/": { name: "Trợ giúp chế độ SPI (dạng sóng CPOL/CPHA)", blurb: "Chế độ 0–3 → dạng sóng SCK, MOSI, MISO, CS với sườn lấy mẫu và sườn dịch, các bit của byte (MSB/LSB trước), thời gian truyền, cách ghi của các hãng (CKE, UCCKPH)." },
    "tools/uart-waveform/": { name: "Vẽ dạng sóng UART", blurb: "Văn bản hoặc hex → dạng sóng bit start, dữ liệu (LSB trước), parity, stop ở mức TTL hoặc RS-232, thời gian bit và khung, độ rộng xung → tốc độ baud chuẩn." },
    "tools/web-serial/": { name: "Terminal serial trên web", blurb: "Mở cổng COM ngay trên trình duyệt. Xem HEX/ASCII, thêm checksum và ký tự xuống dòng, lưu log." },
  } satisfies Record<Scope4Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    ascii: libAscii,
    intConv: libIntConv,
    modbusBlocks: libModbusBlocks,
    modbusQuiz: libModbusQuiz,
    mqttDecode: libMqttDecode,
    spi: libSpi,
    uartWave: libUartWave,
    webSerial: libWebSerial,
  },

  /** 쪽 글 */
  pages: { ascii, hexAscii, integer, modbusBlocks, modbusPractice, mqttDecoder, spi, uartWaveform, webSerial } satisfies Record<Page4Id, unknown>,
};
