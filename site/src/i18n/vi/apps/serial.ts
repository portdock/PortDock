// PortDock Serial — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Serial — Terminal Serial miễn phí Windows (RS-232/485)",
    desc: "Terminal serial miễn phí cho Windows: cổng RS-232, RS-485, USB COM, HEX/ASCII, tự kết nối lại, 9 loại checksum, giải mã Modbus RTU, log có dấu thời gian.",
  },
  summary: "Trao đổi dữ liệu với thiết bị RS-232, RS-485 và USB serial, đồng thời lưu log kiểm tra có dấu thời gian. Rút rồi cắm lại bộ chuyển USB, chương trình sẽ kết nối lại đúng thiết bị đó.",
  who: [
    "Kỹ sư hiện trường đưa thiết bị mới vào hoạt động",
    "Lập trình viên firmware kiểm tra giao thức UART",
    "Bất kỳ ai cần đọc dữ liệu Modbus RTU",
  ],
  features: [
    {
      title: "Nhận ra cổng dễ dàng",
      body: "Hiện tên thiết bị, USB VID:PID và số serial cạnh mỗi cổng, tự cập nhật khi cắm hoặc rút.",
    },
    {
      title: "Không sợ mất kết nối",
      body: "Mở lại đúng thiết bị sau khi cắm lại dù số COM đã đổi, và ghi log mọi lần rớt và kết nối lại.",
    },
    {
      title: "Bốn chế độ tách khung",
      body: "Khoảng nghỉ, ký tự kết thúc, độ dài cố định hoặc Modbus RTU — để mỗi bản tin là một dòng.",
    },
    {
      title: "Chín loại checksum và CRC tùy chỉnh",
      body: "Khi gửi, thêm CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 hoặc CRC tùy chỉnh, và kiểm tra khi nhận.",
    },
    {
      title: "Giải mã Modbus RTU",
      body: "Giải mã yêu cầu, phản hồi và mã lỗi thành địa chỉ, mã hàm và giá trị.",
    },
    {
      title: "Các đường tín hiệu",
      body: "Bật tắt DTR/RTS và theo dõi CTS/DSR/RI/CD trên đèn báo và trong log.",
    },
    {
      title: "Log kiểm tra",
      body: "Dấu thời gian đến mili giây, danh sách lệnh, gửi lặp lại và ghi log liên tục ra tệp.",
    },
    {
      title: "Kiểm tra kết nối…",
      body: "Không cần quyền quản trị: đọc thiết bị, driver, mã sự cố, bộ đếm thời gian trễ FTDI và chế độ tiết kiệm điện USB của cổng đã chọn, rồi chạy thử loopback hoặc echo RS-485 2 dây. Từ 0.10.0 còn có thử hai cổng (hai bộ chuyển nối với nhau), các mẫu dữ liệu (0x00–0xFF, 0x55/0xAA) và sơ đồ đấu dây. Không thay đổi gì.",
    },
    {
      title: "Chia sẻ cổng — COM ↔ TCP (từ 0.10.0)",
      body: "Mở cổng COM đang dùng thành máy chủ TCP để chương trình khác, WSL2, Docker hay một PC khác dùng chung cổng đó. Dạng thô hoặc RFC 2217 (đổi baud/parity từ xa); dữ liệu nhận được gửi tới mọi client và client gửi được gắn nhãn trong log. Mặc định chỉ PC này (127.0.0.1); PC khác chỉ khi bạn cho phép. Không cần driver COM ảo, không cần quyền quản trị.",
    },
    {
      title: "Gateway Modbus TCP ↔ RTU (từ 0.10.0)",
      body: "Biến PC thành gateway — SCADA, HMI hoặc chương trình trên PC kết nối qua Modbus TCP (mặc định cổng 502), yêu cầu được chuyển tới thiết bị RS-485 dưới dạng khung RTU và phản hồi trả về dạng MBAP. Mỗi lần một yêu cầu, không có phản hồi → mã lỗi 0B, không có đường đi → 0A, thống kê yêu cầu/phản hồi/hết thời gian chờ và các dòng log «TCP #1 → RTU unit 3 FC03».",
    },
    {
      title: "Nghe lén Modbus RTU ở chế độ chỉ nghe (từ 0.10.0)",
      body: "Nghe dữ liệu giữa master và slave qua bộ chuyển cắm vào bus RS-485 mà không gửi gì. Khung được cắt theo CRC (đồng bộ lại khi khoảng nghỉ mờ đi), kèm các cặp yêu cầu/phản hồi, thời gian phản hồi, trường hợp không phản hồi, mã lỗi và thống kê. Với RS-232, hai cổng nối bằng cáp chữ Y được gộp trên một trục thời gian. Ghi log ra tệp, kể cả CSV.",
    },
  ],
  steps: [
    "Chọn cổng, tốc độ baud và parity, rồi nhấn «Kết nối»",
    "Nhập HEX hoặc ASCII; thêm checksum hoặc ký tự cuối dòng nếu cần",
    "«Gửi» — dòng nhận hiện là RX ◀, dòng gửi là TX ▶",
  ],
  similar: "Công cụ tương tự gồm Tera Term và PuTTY (terminal mã nguồn mở). PortDock Serial đưa các tính năng kiểm tra thiết bị — kết nối lại USB, tách khung, kiểm tra checksum, giải mã Modbus RTU — vào một màn hình.",
};
