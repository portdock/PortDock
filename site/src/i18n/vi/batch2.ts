// Tiếng Việt — gói 2 (10 công cụ web, scope.ts SCOPE2). Cùng dạng với ja/batch2.ts; dịch từ bản tiếng Anh (site/I18N.md «2차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, lib = 계산 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글(scope.ts SCOPE2 의 값과 같은 이름)
import type { Page2Id, Scope2Path } from "../scope.ts";
import wiring from "./pages/wiring.ts";
import troubleshoot from "./pages/troubleshoot.ts";
import multimeterCheck from "./pages/multimeterCheck.ts";
import canDecoder from "./pages/canDecoder.ts";
import canTiming from "./pages/canTiming.ts";
import i2c from "./pages/i2c.ts";
import uartBaud from "./pages/uartBaud.ts";
import modbusRtuTcp from "./pages/modbusRtuTcp.ts";
import xgtDecoder from "./pages/xgtDecoder.ts";
import cableSelection from "./pages/cableSelection.ts";
import libWiring from "./lib/wiring.ts";
import libTroubleshoot from "./lib/troubleshoot.ts";
import libMeterCheck from "./lib/meterCheck.ts";
import libMeterUi from "./lib/meterUi.ts";
import libCanFrame from "./lib/canFrame.ts";
import libCanTiming from "./lib/canTiming.ts";
import libI2c from "./lib/i2c.ts";
import libUartBaud from "./lib/uartBaud.ts";
import libModbusConvert from "./lib/modbusConvert.ts";
import libXgt from "./lib/xgt.ts";
import libXgtManuals from "./lib/xgtManuals.ts";
import libCableSelect from "./lib/cableSelect.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/wiring/": { name: "Công cụ vẽ sơ đồ đấu dây", blurb: "RS-485 2/4 dây, RS-232 null modem, 4-20 mA 2/3/4 dây, cảm biến NPN/PNP, ngõ ra relay — vẽ theo thiết bị và địa chỉ của bạn, kèm danh sách kiểm tra, SVG/PNG." },
    "tools/troubleshoot/": { name: "Trợ lý tìm nguyên nhân sự cố", blurb: "RS-485, RS-232, Modbus TCP, USB-serial, 4-20 mA, cảm biến NPN/PNP, giao thức MC, USB rớt kết nối — trả lời có/không để khoanh vùng nguyên nhân có thể, cách đo kiểm và hướng dẫn. Sao chép dạng văn bản." },
    "tools/multimeter-check/": { name: "Kiểm tra giá trị đo đồng hồ vạn năng", blurb: "Điện trở A–B, điện áp nghỉ và common mode RS-485, 4-20 mA (NE 43), sụt áp 24 V, ngõ ra NPN/PNP, RS-232 TX, chênh lệch đất — nhập số đo, nhận nhận định." },
    "tools/can-decoder/": { name: "Giải mã khung CAN (J1939, CANopen)", blurb: "Dòng candump, ID DLC dữ liệu hoặc bit thô → ID chuẩn/mở rộng, DLC (độ dài FD), bỏ bit chèn và CRC15, PGN, địa chỉ và SPN của J1939, COB-ID, NMT và SDO của CANopen." },
    "tools/can-bit-timing/": { name: "Tính định thời bit CAN", blurb: "Xung nhịp CAN, tốc độ bit và điểm lấy mẫu → prescaler, TQ, PROP, PHASE_SEG1/2 và SJW, kèm dung sai bộ dao động." },
    "tools/i2c/": { name: "Công cụ I2C (kéo lên, địa chỉ, giải mã)", blurb: "VDD, điện dung bus và 100k/400k/1M → điện trở kéo lên Rp tối thiểu và tối đa (UM10204), bảng địa chỉ 7 bit của chip phổ biến kèm quy đổi 8 bit, giải mã «S A0 A … P»." },
    "tools/uart-baud/": { name: "Tính sai số tốc độ baud UART", blurb: "Xung nhịp MCU và oversampling → hệ số chia (UBRR), baud thực và sai số %, dung sai bộ thu, bảng tốc độ baud chuẩn." },
    "tools/modbus-rtu-tcp/": { name: "Chuyển đổi khung Modbus RTU ↔ TCP", blurb: "RTU (địa chỉ + CRC) ↔ TCP (MBAP: giao dịch, độ dài, Unit ID) ↔ ASCII (dấu hai chấm, LRC, CR LF). Lệnh hỏi và phản hồi, byte tô màu, giải thích Unit ID 0 và 255 ở gateway." },
    "tools/xgt-decoder/": { name: "Giải mã khung giao thức chuyên dụng LS XGT (FEnet)", blurb: "Khung có header «LSIS-XGT» → các trường header, BCC, lệnh, biến (%MW, %MX, %DB), giá trị và mã lỗi. Ghép phản hồi với lệnh hỏi; tạo lệnh hỏi. Dùng cùng chế độ XGT của PLC Simulator (từ 0.10.0)." },
    "tools/cable-selection/": { name: "Trợ giúp chọn cáp", blurb: "Nguồn AC và 24 V DC, RS-485, RS-232, 4-20 mA, cặp nhiệt điện và RTD, Ethernet, servo, xích đi cáp — loại cáp và điều kiện theo mục đích; tiết diện theo sụt áp, kiểm tra chiều dài cho truyền thông." },
  } satisfies Record<Scope2Path, { name: string; blurb: string }>,

  /** 계산 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    // 쪽 JSON 에 싣는 묶음(화면 스크립트가 쓴다) — 쪽의 Base libText
    wiring: libWiring,
    troubleshoot: libTroubleshoot,
    meterCheck: libMeterCheck,
    canFrame: libCanFrame,
    canTiming: libCanTiming,
    i2c: libI2c,
    uartBaud: libUartBaud,
    modbusConvert: libModbusConvert,
    xgt: libXgt,
    cableSelect: libCableSelect,
    // 서버에서만 그리는 묶음(쪽 JSON 에 싣지 않음)
    meterUi: libMeterUi,
    xgtManuals: libXgtManuals,
  },


  /** 쪽 글 */
  pages: { wiring, troubleshoot, multimeterCheck, canDecoder, canTiming, i2c, uartBaud, modbusRtuTcp, xgtDecoder, cableSelection } satisfies Record<Page2Id, unknown>,
};
