// Tiếng Việt — tên và mô tả ngắn dùng ở nhiều trang (chương trình, công cụ web, nhóm, «Bạn muốn làm gì?», dung lượng tệp).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Mô tả ngắn của chương trình (tagline trong tools.ts) */
  apps: {
    serial: "Terminal serial (COM) có đường tín hiệu điều khiển và tự kết nối lại",
    "modbus-slave": "Mô phỏng Modbus slave (RTU và TCP) với bảng thanh ghi và chèn lỗi",
    tcp: "TCP client, server và relay — nhiều kết nối, echo, tự kết nối lại",
    udp: "Gửi và nhận UDP — broadcast, multicast, echo",
    simulator: "Thiết bị giả trả lời theo quy tắc qua serial, TCP và UDP",
    netscan: "Tìm thiết bị trong mạng công nghiệp — nhận diện cổng công nghiệp, ping dài hạn",
    "modbus-master": "Modbus RTU/TCP master (đọc vòng — polling) — giá trị theo kiểu, ghi, dò địa chỉ trạm (slave ID)",
    scpi: "Terminal SCPI cho máy đo — LAN socket và RS-232, không cần VISA",
    plot: "Vẽ đồ thị thời gian thực các số nhận từ serial, TCP và UDP",
    "port-inspector": "Kiểm tra cổng COM, card mạng, cài đặt PC và kết nối không dây (Wi-Fi, Bluetooth) — chỉ đọc",
    "plc-simulator": "Mô phỏng server giao thức MC (SLMP) — thử HMI và phần mềm thu thập dữ liệu khi không có PLC",
    "hw-tester": "Ghi lại mất kết nối và độ trễ Wi-Fi, Internet, cùng nhật ký kết nối Bluetooth và USB (từ 0.10.0)",
    mcp: "Máy chủ MCP cho ứng dụng AI — đọc cổng, Modbus, MC và SCPI; chỉ ghi vào bộ mô phỏng trên PC này",
  } satisfies Record<Tool["id"], string>,

  /** Tên và mô tả ngắn của công cụ web (name, blurb trong webTools.ts) */
  webTools: {
    "tools/4-20ma/": { name: "Tính quy đổi tín hiệu 4–20 mA (scaling)", blurb: "Dòng/áp ↔ giá trị kỹ thuật ↔ % ↔ giá trị thô của PLC (0–27648…). Kèm bảng 4, 8, 12, 16, 20 mA." },
    "tools/modbus/": { name: "Tạo lệnh hỏi Modbus RTU", blurb: "Địa chỉ trạm (slave ID), mã hàm, địa chỉ, số lượng → các byte lệnh hỏi kèm CRC. Hiểu cả cách ghi 40001." },
    "tools/modbus-decoder/": { name: "Giải mã khung Modbus", blurb: "Dán byte RTU hoặc TCP để giải mã địa chỉ trạm, mã hàm, giá trị, CRC, MBAP và mã ngoại lệ (exception)." },
    "tools/modbus-float/": { name: "Chuyển đổi số thực (float) Modbus", blurb: "2 hoặc 4 thanh ghi ↔ float32/float64/int32. So sánh thứ tự từ ABCD, CDAB, BADC, DCBA trong một bảng." },
    "tools/mc-decoder/": { name: "Giải mã khung giao thức MC (SLMP)", blurb: "Khung 3E/4E dạng binary hoặc ASCII → header, lệnh, thiết bị (device), giá trị và mã kết thúc. Ghép phản hồi với lệnh hỏi; tạo lệnh hỏi." },
    "tools/rs485/": { name: "Tính điện trở đầu cuối và phân cực RS-485", blurb: "Điện trở kéo lên/kéo xuống với điện trở đầu cuối 120/150 Ω → điện áp lúc nghỉ so với ngưỡng 200 mV, công suất điện trở, chiều dài cáp theo baud." },
    "tools/serial-timing/": { name: "Tính thời gian truyền serial", blurb: "Tốc độ baud và parity → thời gian một ký tự, Modbus RTU t3.5/t1.5, thời gian hỏi/đáp, chu kỳ polling, timeout tối thiểu." },
    "tools/checksum/": { name: "Tính CRC và checksum", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 và SUM16 cùng lúc." },
    "tools/subnet/": { name: "Tính subnet IP", blurb: "Địa chỉ và mặt nạ (/24) → địa chỉ mạng, broadcast, dải địa chỉ. Kiểm tra theo cả hai mặt nạ: PC và PLC có cùng subnet không?" },
    "tools/pinouts/": { name: "Tra sơ đồ chân đầu nối (pinout)", blurb: "DB9/DB25 RS-232, RJ45 T568A/B và Ethernet, Modbus RJ45/DB9 (theo đặc tả), M12 mã A/D/X, M8, USB-A/B/C, tên cực RS-485 — nhìn mặt trước đực/cái, màu dây, nguồn tham khảo, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Nhóm công cụ web (webToolGroups.ts) */
  groups: {
    comm: "Serial và Modbus",
    net: "Mạng",
    draw: "Đấu dây và sơ đồ",
    diag: "Tìm lỗi và kiểm tra",
    field: "Dụng cụ hiện trường",
    signal: "Tín hiệu và cảm biến",
    elec: "Điện và động cơ",
    mech: "Cơ khí và khí nén",
    units: "Đổi đơn vị",
    hw: "Kiểm tra phần cứng PC",
    etc: "Công cụ khác",
  } satisfies Record<GroupId, string>,

  /** «Bạn muốn làm gì?» (components/PickApp.astro) — theo ID nhánh */
  pick: {
    title: "Bạn muốn làm gì?",
    q: {
      serial: "Giao tiếp với thiết bị serial (COM) hoặc RS-485",
      modbus: "Đọc, ghi thiết bị Modbus hoặc mô phỏng một thiết bị",
      net: "Tìm thiết bị trong mạng, TCP và UDP",
      sim: "Thử HMI hoặc phần mềm máy chủ khi không có PLC hay thiết bị",
      scpi: "Điều khiển máy đo (SCPI) và ghi kết quả đo",
      pc: "Sự cố kết nối trên PC — cổng COM, card mạng, Wi-Fi, Bluetooth",
      mcp: "Đọc thiết bị từ ứng dụng AI (MCP)",
      pcap: "Phân tích bản ghi lưu lượng (pcap) — thời gian phản hồi, lệnh không được trả lời",
    },
    notes: {
      "pcap:tcp": "Đặt làm relay giữa HMI và PLC rồi lưu thành pcap — không cần Wireshark",
    },
    pcapName: "Trình phân tích pcap (tiếng Anh)",
    pcapNote: "Mở bản ghi Wireshark hoặc pktmon ngay trên trình duyệt, không cần cài — ghép cặp hỏi/đáp Modbus TCP và MC",
    hwTitle: "Kiểm tra micro, bàn phím, chuột, webcam và màn hình",
    hwName: "Kiểm tra phần cứng PC",
    hwNote: (n: number) => `Không phải chương trình Windows mà chạy ngay trên trình duyệt (không cần cài) — ${n} bài kiểm tra`,
  },

  /** Dung lượng tệp (SIZE trong release.ts) */
  size: { setup: "khoảng 4 MB", offline: "khoảng 220 MB", portable: "khoảng 3 MB" },
};
