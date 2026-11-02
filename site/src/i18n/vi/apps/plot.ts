// PortDock Plot — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Plot — Vẽ đồ thị serial thời gian thực miễn phí, ghi CSV",
    desc: "Vẽ đồ thị trực tiếp miễn phí cho số liệu từ serial, TCP hoặc UDP: name:value kiểu Arduino, khung nhị phân, tối đa 32 kênh, con trỏ đo và ghi CSV.",
  },
  summary: "Xem các con số mà Arduino, cảm biến hay thiết bị gửi về dưới dạng đồ thị trực tiếp. Đọc văn bản phân tách bằng dấu phẩy/khoảng trắng/tab/chấm phẩy, «name:value» kiểu Arduino và khung nhị phân, với màu và trục riêng cho từng kênh, tạm dừng, thu phóng và hiệu giữa hai điểm, đồng thời ghi CSV trong khi nhận.",
  who: [
    "Lập trình viên chỉnh firmware vừa xem giá trị cảm biến hay bo mạch",
    "Kỹ sư hiện trường ghi dữ liệu thiết bị hàng giờ để tìm bất thường",
  ],
  features: [
    {
      title: "Serial (nối tiếp), TCP, UDP",
      body: "Cổng COM (baud, bit dữ liệu, parity, bit stop — mặc định 8N1 — và DTR), TCP client kết nối tới thiết bị, và nhận UDP (cả multicast). Tự kết nối lại sau khi rút rồi cắm lại.",
    },
    {
      title: "Văn bản, name:value, nhị phân",
      body: "Tự nhận dấu phẩy, khoảng trắng, tab hay chấm phẩy, giá trị có tên như temp:23.1 hum:40, dòng tiêu đề, và khung có byte bắt đầu, u8–f64, endian và checksum. Dòng lỗi hiện màu đỏ kèm lý do.",
    },
    {
      title: "Xem và đo",
      body: "Tối đa 32 kênh trên trục trái/phải, N điểm hoặc N giây gần nhất, Y tự động/cố định, tạm dừng (vẫn tiếp tục nhận), hiện giá trị tại con trỏ, Δt và Δgiá trị giữa hai đánh dấu, thu phóng bằng con lăn và kéo để di chuyển.",
    },
    {
      title: "Theo dõi kênh và cảnh báo (từ 0.10.0)",
      body: "Đặt giới hạn thấp/cao, kẹt trong N giây và mất dữ liệu trong N giây cho từng kênh: hàng vượt ngưỡng được tô sáng, kèm danh sách cảnh báo, âm thanh tùy chọn và log cảnh báo CSV. Chỉ là công cụ hỗ trợ giám sát, không phải thiết bị an toàn.",
    },
    {
      title: "Theo kịp tốc độ dữ liệu",
      body: "Việc phân tích chạy bằng Rust; việc vẽ diễn ra một lần mỗi khung hình trên canvas với giá trị nhỏ nhất/lớn nhất trên mỗi pixel — hàng nghìn dòng mỗi giây mà không mất các đỉnh nhọn.",
    },
    {
      title: "Ghi và lưu",
      body: "Mọi giá trị ra CSV trong khi nhận (tương thích Excel), phần đang hiển thị ra CSV, đồ thị ra PNG. Bảng giá trị gần nhất cùng nhỏ nhất, lớn nhất và trung bình trên phần đang hiển thị.",
    },
  ],
  steps: [
    "Cho thiết bị in số trên mỗi dòng (ví dụ 23.1,40 hoặc temp:23.1 hum:40)",
    "Chọn nguồn (cổng serial và baud, TCP, UDP) và «Bắt đầu» (F4)",
    "Nhấn vào đồ thị để đo; «● Ghi CSV» để lưu lại",
  ],
  similar: "Công cụ tương tự gồm Serial Plotter của Arduino IDE và SerialPlot mã nguồn mở. PortDock Plot còn nhận dữ liệu TCP và UDP, khung nhị phân, và ghi CSV trong khi nhận.",
};
