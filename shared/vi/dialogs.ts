// 베트남어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Vi<K extends string> = Partial<Record<K, string>>;

export const VI_DEVICE: Vi<DeviceTextKey> = {
  masterTitle: "Nạp hồ sơ thiết bị",
  slaveTitle: "Nạp giả lập thiết bị",
  search: "Tìm (hãng, model, loại)",
  none: "Không có thiết bị phù hợp",
  close: "Đóng",
  cancel: "Hủy",
  apply: "Nạp",
  regs: "{n} thanh ghi",
  comm: "Giao tiếp mặc định",
  commOpt: "Áp dụng cả cài đặt serial (baud, data, parity, stop)",
  commNone: "Không có cài đặt giao tiếp mặc định được xác nhận trong sách hướng dẫn",
  gapOpt: "Đọc các thanh ghi cách nhau ít địa chỉ trong một bảng (tối đa {n} — tắt nếu thiết bị từ chối địa chỉ không dùng)",
  masterPlan: "Thêm {n} bảng polling (Slave ID {u}): {a}",
  masterSkip: "{n} thanh ghi chỉ ghi không được polling",
  slavePlan: "Điền tên, kiểu và giá trị ví dụ vào Slave ID hiện tại {u}. Dải phản hồi được mở rộng nếu cần.",
  slaveUnit: "Slave ID mặc định của thiết bị này là {u}",
  sources: "Nguồn",
  caution: "Thông tin lấy từ sách hướng dẫn của hãng (không liên kết với hãng). Có thể khác theo firmware hoặc model — hãy kiểm tra sách hướng dẫn thiết bị trước khi ghi.",
  thAddr: "Địa chỉ (sách HD)",
  thName: "Tên",
  thType: "Kiểu",
  thUnit: "Đơn vị",
  thRw: "R/W",
  notes: "Ghi chú",
  behaveOpt: "Thêm cả bộ tạo giá trị và quy tắc liên kết — dao động điện áp/dòng điện, cộng dồn điện năng, lệnh chạy → tăng giảm tần số ra",
  guardOpt: "Áp đặt chỉ đọc và chỉ ghi",
  slaveNote: "Các giá trị này lấy từ bảng trong sách hướng dẫn — hành vi thiết bị thật (thời gian tăng tốc …) có thể khác.",
};

export const VI_PORTCHECK: Vi<PortCheckTextKey> = {
  title: "Kiểm tra kết nối",
  close: "Đóng (Esc)",
  reading: "Đang đọc…",
  readFail: "Không đọc được",
  device: "Thiết bị và driver",
  settings: "Cài đặt",
  power: "Tiết kiệm điện",
  test: "Thử kết nối",
  cannot: "Những gì PC không thấy được",
  guides: "Hướng dẫn:",
  name: "Tên",
  chip: "VID:PID · chip",
  driver: "Driver",
  problem: "Mã lỗi",
  action: "Nên thử",
  latency: "FTDI latency timer",
  suspend: "USB selective suspend",
  canOff: "PC có thể tắt",
  on: "bật",
  off: "tắt",
  connected: "Hãy ngắt kết nối trước khi thử (bài thử tự mở cổng).",
  copy: "Sao chép văn bản",
  copied: "Đã sao chép",
  more: "Để xem lịch sử driver, số COM đã giữ chỗ và thiết bị ẩn, hãy dùng PortDock Port Inspector.",
  readOnly: "Chỉ đọc, không cần quyền quản trị.",
};

export const VI_LOOP: Vi<LoopTextKey> = {
  mode: "Bài thử",
  loop: "Loopback — nối TX với RX",
  loopHint: "Trên DB9 nối chân 2 (RX) với chân 3 (TX); trên bộ chuyển đổi TTL nối TX với RX. Kiểm tra byte quay về không đổi ở từng tốc độ và đo thời gian khứ hồi 1 byte.",
  two: "Hai cổng — hai bộ chuyển đổi nối với nhau",
  twoHint: "Với hai bộ chuyển đổi/cáp nối với nhau, gửi cổng này → cổng kia và cổng kia → cổng này ở từng tốc độ rồi so sánh những gì nhận được. Hữu ích để kiểm tra bộ chuyển đổi RS-485.",
  peer: "Cổng kia",
  peerNone: "Không có cổng khác",
  pattern: "Mẫu",
  patRandom: "Byte hỗn hợp",
  patRamp: "0x00–0xFF theo thứ tự",
  patAlt: "0x55/0xAA xen kẽ",
  length: "Độ dài (byte)",
  wiring: "Cách nối dây",
  overall: "Tổng thể",
  colDir: "Hướng",
  echo: "Echo RS-485 2 dây",
  echoHint: "Khi không có thiết bị trên bus, kiểm tra bộ chuyển đổi có nhận lại byte nó gửi không.",
  bauds: "Tốc độ",
  more: "Tốc độ khác",
  start: "Bắt đầu thử",
  cancel: "Dừng",
  sure: "Thiết bị đã được tách khỏi đường dây/bus chưa? Byte thử có thể tới thiết bị như lệnh.",
  sureYes: "Đã tách — bắt đầu",
  sureNo: "Hủy",
  running: "Đang thử",
  noPort: "Hãy chọn cổng trước.",
  colBaud: "Tốc độ",
  colResult: "Kết quả",
  colBytes: "Đã gửi · giống · mất · đổi",
  colRtt: "Khứ hồi 1 byte ms (trung vị · tối đa)",
  colFlags: "Cờ lỗi",
  flagsNone: "không có",
  flagsUnread: "không đọc",
  flagFrame: "framing",
  flagParity: "parity",
  flagOverrun: "overrun",
  flagRxOver: "tràn bộ đệm",
  flagsNote: "Cờ lỗi chỉ hiện khi driver báo — «không có» không bảo đảm là không có lỗi. Thời gian khứ hồi gồm cả độ trễ USB, driver và chương trình.",
  echoBack: "Byte quay về",
  firstMs: "Tới byte đầu",
};

/** Sơ đồ nối dây (bằng chữ) */
export const VI_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, đực hoặc cái)", "  chân 2 (RX) ──┐", "  chân 3 (TX) ──┘   nối chân 2 với chân 3", "", "Bộ chuyển đổi TTL", "  TX ──┐", "  RX ──┘   nối TX với RX", "", "RS-485 không loopback được trên một cổng — hãy chọn «Hai cổng»."].join("\n"),
  two: ["RS-232 (bắt chéo, null modem)", "  cổng A        cổng B", "  chân 2 RX ──── chân 3 TX", "  chân 3 TX ──── chân 2 RX", "  chân 5 GND ─── chân 5 GND", "", "RS-485 (2 dây)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Một bộ chuyển đổi RS-485 — đã tách thiết bị khỏi bus", "  A(D+)  B(D−)  không nối gì"].join("\n"),
};

export const VI_IFACE: Vi<IfaceTextKey> = {
  title: "PC này",
  all: "mọi bộ điều hợp",
  local: "chỉ PC này",
  down: "chưa kết nối",
  none: "Không đọc được địa chỉ của bộ điều hợp",
  refresh: "Tải lại",
  use: "Dùng địa chỉ này",
  gw: "gateway",
  notHere: "«{a}» không phải địa chỉ của PC này — khởi động sẽ lỗi «address not available». Hãy chọn một địa chỉ trong danh sách bên dưới.",
  downHere: "Bộ điều hợp của «{a}» ({b}) chưa kết nối (kiểm tra cáp / Wi-Fi).",
};

export const VI_OPEN_APP: Vi<OpenAppTextKey> = {
  opened: "Đã mở {a} — {b}. Nhấn kết nối trong cửa sổ đó.",
  missing: "Không tìm thấy {a} trên PC này nên đã sao chép «{b}» — hãy dán vào đó.",
  get: "Trang tải về",
};

/** Xác nhận đóng (exitGuard.ts) */
export const VI_EXIT = "Đang có kết nối hoặc đang ghi tệp. Đóng sẽ ngắt kết nối và dừng ghi. Vẫn đóng?";

/** Lệnh ví dụ (examples.ts) — tiền tố tên và tên tiếng Anh → tên tiếng Việt */
export const VI_EXAMPLE_PREFIX = "vd. ";
export const VI_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (kiểm tra phản hồi)",
  "ATI (device info)": "ATI (thông tin thiết bị)",
  "AT+GMR (firmware version)": "AT+GMR (phiên bản firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus Slave ID 1 đọc 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus Slave ID 1 đọc 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (tên máy đo SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP Slave ID 1 đọc 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP Slave ID 1 đọc 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "Yêu cầu HTTP trang chủ (cổng 80)",
  "text hello": "chữ hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (tên máy đo)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (điện áp DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (một lỗi)",
};
