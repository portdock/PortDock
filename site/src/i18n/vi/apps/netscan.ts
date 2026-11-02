// PortDock Net Scan — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Net Scan — Quét IP miễn phí cho mạng công nghiệp",
    desc: "Quét IP miễn phí cho mạng công nghiệp: quét ping và ARP, hãng theo MAC, cổng công nghiệp (Modbus 502, MC, XGT, S7 …), giám sát ping dài hạn.",
  },
  summary: "Quét mạng con của một card mạng để tìm thiết bị, rồi nhận dạng theo hãng của MAC và các cổng công nghiệp đang mở (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Thiết bị chặn ping vẫn được tìm thấy nhờ ARP trong cùng mạng con.",
  who: [
    "Kỹ sư hiện trường không biết IP của thiết bị mới",
    "Bất kỳ ai phải theo dõi mạng thiết bị qua đêm",
  ],
  features: [
    {
      title: "Quét ping + ARP",
      body: "ARP trong cùng mạng con tìm ra thiết bị chặn ping; hiện thời gian phản hồi, tên, PC này và gateway. Không cần quyền quản trị.",
    },
    {
      title: "Kiểm tra cổng công nghiệp",
      body: "Chỉ kiểm tra một danh sách cổng (mặc định 502, 2004, 5000–5010, 102, 44818, 4840 …; sửa được, tối đa 32) — không quét cổng tổng quát — và hỏi thiết bị Modbus về hãng/model (FC 2B/0E).",
    },
    {
      title: "Ghi chú về mức phơi lộ (từ 0.10.0)",
      body: "Nếu Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 hoặc HTTP 80 nằm trong số cổng đã kiểm tra, sẽ thêm ghi chú như «Giao thức công nghiệp đang mở — ai trong cùng mạng cũng đọc và ghi được (không xác thực) — hãy kiểm tra việc tách mạng». Không quét thêm cổng nào và không đổi cài đặt thiết bị nào.",
    },
    {
      title: "Dò bằng broadcast — EtherNet/IP, BACnet",
      body: "Chỉ khi bạn nhấn, gửi EtherNet/IP ListIdentity (UDP 44818) và BACnet Who-Is (UDP 47808) tới địa chỉ broadcast của card mạng đã chọn, rồi gộp vào bảng hãng, loại thiết bị, tên sản phẩm và phiên bản — cùng mã thể hiện thiết bị BACnet và ID hãng — của những thiết bị chưa biết IP. Chỉ là yêu cầu đọc; số serial không được hiện.",
    },
    {
      title: "Hãng theo MAC",
      body: "Danh sách IEEE nhúng sẵn cho biết hãng mà không cần internet.",
    },
    {
      title: "Giám sát ping dài hạn",
      body: "Ghi mất gói, độ trễ và các lần gián đoạn của nhiều thiết bị ra CSV và làm nhấp nháy thanh tác vụ khi có thiết bị rớt.",
    },
    {
      title: "Mới / mất",
      body: "So với lần quét trước để đánh dấu thiết bị mới và thiết bị mất. Xuất ra CSV.",
    },
    {
      title: "Mốc so sánh — đối chiếu với lần trước (từ 0.10.0)",
      body: "Lưu danh sách thiết bị thành các mốc có tên (nhiều mốc, cũng ở dạng tệp JSON) và so lần quét tiếp theo với một mốc — mới (thêm vào?), mất (bị gỡ hoặc tắt?), MAC đổi (thiết bị khác trên cùng IP, đã thay?), IP đổi (cùng thiết bị ở IP khác, DHCP?) và cổng mở đổi, tô màu theo loại. Có CSV so sánh và sao chép «AI» (ẩn 3 byte cuối của MAC). Tệp mốc có chứa địa chỉ MAC — hãy cẩn thận khi chia sẻ.",
    },
    {
      title: "Wake-on-LAN, mở web",
      body: "Với từng thiết bị: mở trang web của nó, sao chép IP/MAC, gửi magic packet.",
    },
  ],
  steps: [
    "Chọn một card mạng — mạng con của nó thành phạm vi quét (lấy /24 chứa nó nếu mạng rộng hơn)",
    "«Quét» (F4)",
    "Xem các cột dịch vụ và hãng; nhấn vào một thiết bị để mở trang web, sao chép IP, đánh thức hoặc «Thêm vào giám sát ping»",
  ],
  similar: "Công cụ tương tự gồm Angry IP Scanner (mã nguồn mở) và Advanced IP Scanner (freeware). PortDock Net Scan bổ sung kiểm tra cổng công nghiệp (Modbus 502, MC, XGT, S7 …) và giám sát ping dài hạn.",
};
