// PortDock Port Inspector — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Port Inspector — Kiểm tra cổng COM miễn phí (USB Serial)",
    desc: "Kiểm tra cổng COM trên Windows miễn phí: driver USB serial, mã sự cố Device Manager, độ trễ FTDI, số COM ma. Chỉ đọc, không cần quyền quản trị, có thử loopback.",
  },
  summary: "Chọn một cổng COM và xem gộp trong một chỗ những gì bình thường phải lần mò trong Device Manager, Event Viewer và registry: driver, mã sự cố và ý nghĩa của nó, chip USB, các thiết lập thiết bị như bộ đếm thời gian trễ FTDI, tiết kiệm điện USB, lịch sử cắm gần đây và các số COM đã đặt trước. Chỉ đọc, không cần quyền quản trị, và khi nối TX với RX thì đo thời gian đi-về ở từng tốc độ baud. Các thẻ khác đọc card mạng của PC này, cài đặt Windows của nó dưới vai trò PC thiết bị, cùng Wi-Fi và Bluetooth theo cách tương tự.",
  who: [
    "Kỹ sư hiện trường có bộ chuyển USB-serial không được nhận hoặc thỉnh thoảng bị rớt",
    "Bất kỳ ai tìm lý do vì sao phản hồi Modbus RTU có vẻ chậm (bộ đếm thời gian trễ FTDI)",
    "Bất kỳ ai cần đính kèm thông tin cổng phía PC vào yêu cầu hỗ trợ hoặc issue",
  ],
  features: [
    {
      title: "Thiết bị, driver, mã sự cố",
      body: "Tên, số COM, vị trí, instance ID và nhà sản xuất; nhà cung cấp driver, phiên bản, ngày, INF và dịch vụ; trạng thái và mã sự cố của Device Manager cùng ý nghĩa và cách thử xử lý; lần cắm và gỡ gần nhất.",
    },
    {
      title: "Chip USB và thiết lập thiết bị",
      body: "Tên chip lấy từ bảng VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), giá trị mặc định của cổng trong Windows và Device Parameters của driver, kèm giải thích bộ đếm thời gian trễ FTDI (LatencyTimer).",
    },
    {
      title: "Tiết kiệm điện và lịch sử",
      body: "USB selective suspend trong tùy chọn nguồn, «Cho phép máy tính tắt thiết bị này để tiết kiệm điện» cho thiết bị và các thiết bị USB phía trên nó, cùng sự kiện cắm và driver trong nhật ký sự kiện (7, 30 hoặc 90 ngày).",
    },
    {
      title: "Số COM đã đặt trước",
      body: "Các số Windows giữ chỗ (ComDB), số đang bị thiết bị hiện không kết nối giữ, số mồ côi và số bị nhiều thiết bị cùng giữ — vì sao bộ chuyển mới lại thành COM15.",
    },
    {
      title: "Thử kết nối",
      body: "Loopback TX–RX ở từng tốc độ baud: byte giống nhau, mất và bị đổi, thời gian đi-về của 1 byte tính bằng ms (trung vị và lớn nhất) và cờ lỗi driver (ClearCommError). Cũng cho biết bộ chuyển RS-485 2 dây có echo hay không.",
    },
    {
      title: "Thử hai cổng và các mẫu dữ liệu (từ 0.10.0)",
      body: "Khi hai bộ chuyển nối với nhau, gửi theo cả hai chiều ở từng tốc độ và so sánh dữ liệu nhận được (để kiểm tra bộ chuyển RS-485). Mẫu dữ liệu: byte hỗn hợp, 0x00–0xFF, 0x55/0xAA; độ dài 64–4096 byte. Sơ đồ đấu dây dạng văn bản và kết luận chung «Không thấy vấn đề (trong phạm vi lần thử này) / Nên xem / Có vấn đề». Giống như «Kiểm tra kết nối…» của Serial.",
    },
    {
      title: "Card mạng trên PC này",
      body: "«Đọc card mạng» hiện, với từng card, liên kết, tốc độ, duplex, IPv4 và gateway cùng các giá trị «Nâng cao» của Device Manager (jumbo frame, bộ đệm nhận, interrupt moderation, EEE …), tiết kiệm điện, lỗi nhận, hồ sơ mạng và tường lửa của nó có bật không. Mục đích «Camera GigE» hiện song song các giá trị mà hãng camera công bố kèm nguồn.",
    },
    {
      title: "PC này — cài đặt của PC thiết bị",
      body: "«Đọc cài đặt của PC này» đọc fast startup, ngủ, USB selective suspend, chính sách khởi động lại khi cập nhật, trình bảo vệ màn hình, đồng bộ giờ cùng các lần tắt bất thường và lỗi phần cứng gần đây. Với mục đích «PC thiết bị», các giá trị có thể dẫn đến dừng hoặc khởi động lại được đánh dấu «Nên xem».",
    },
    {
      title: "PC này — màn hình xanh, sức khỏe SSD, nguyên nhân đánh thức (từ 0.10.0)",
      body: "Cùng thẻ «PC này» đọc mã dừng của màn hình xanh kèm tên (ví dụ 0x50 PAGE_FAULT_IN_NONPAGED_AREA) và thời điểm tắt đột ngột, nhiệt độ SSD NVMe, phần trăm đã dùng, dự phòng, số giờ bật nguồn và lỗi vùng nhớ, thứ đã đánh thức PC khỏi chế độ ngủ, cùng dung lượng pin laptop so với thiết kế và số chu kỳ — không cần quyền quản trị. Tệp dump chỉ được liệt kê; số serial ổ đĩa không được đọc.",
    },
    {
      title: "So với lần trước — lần kiểm tra đã lưu (từ 0.10.0)",
      body: "Lưu lần kiểm tra hiện tại (danh sách cổng COM, tên/phiên bản/ngày driver, vị trí USB, cài đặt card mạng, cài đặt PC này, bản ghi màn hình xanh) và ở lần bảo trì sau đọc lại để chỉ thấy phần đã đổi — ví dụ COM3 → COM7, phiên bản driver mới (Windows Update?), jumbo frame bị tắt, một thiết lập nguồn bị đổi, một màn hình xanh mới. Không lưu số serial thiết bị, tên PC hay thư mục người dùng. Giữ kết quả dạng văn bản hoặc CSV.",
    },
    {
      title: "Không dây — Wi-Fi và Bluetooth",
      body: "Thẻ «Không dây» đọc bộ chuyển Wi-Fi, driver, tiết kiệm điện và các bản ghi ngắt kết nối mà Windows lưu (đếm theo lý do), cùng bộ chuyển Bluetooth, trạng thái dịch vụ, sự kiện lỗi và việc âm thanh Bluetooth có đang ở chế độ rảnh tay (cuộc gọi) không — không cần quyền quản trị hay quyền vị trí. Không gửi ping nào, và khi xuất ra thì tên thiết bị được che.",
    },
    {
      title: "Chỉ đọc, kết quả dễ hiểu",
      body: "Không bao giờ đổi cài đặt hay driver (phần trợ giúp hướng dẫn cách sửa thủ công). Mỗi thẻ được đánh dấu «Không thấy vấn đề (trong phần đã đọc) / Nên xem / Có vấn đề / Không đọc được»; những gì PC không thể thấy — đảo A/B, điện trở cuối, bias, nối đất — luôn được liệt kê; khi xuất ra văn bản và JSON thì đường dẫn thư mục người dùng được che.",
    },
  ],
  steps: [
    "Nhấn vào một cổng trong danh sách «Cổng COM» bên trái",
    "Đọc kết quả và lý do của từng thẻ; nếu cần, tự đổi trong Windows như phần trợ giúp hướng dẫn",
    "Nối TX với RX để chạy «Thử kết nối»; dùng «Sao chép văn bản» để đính kèm kết quả vào câu hỏi",
  ],
  similar: "Công cụ tương tự gồm Trình quản lý Thiết bị (Device Manager) của Windows, NirSoft USBDeview (freeware), USB Device Tree Viewer của Uwe Sieber (freeware) và FT_PROG của FTDI cho chip FTDI (miễn phí). PortDock Port Inspector gom driver, mã sự cố, tiết kiệm điện, lịch sử cắm và số COM đã đặt trước của một cổng COM vào một chỗ, và thêm phần thử kết nối loopback.",
};
