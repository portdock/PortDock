// PortDock Modbus Slave — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Modbus Slave — Mô phỏng Modbus Slave miễn phí (RTU/TCP)",
    desc: "Mô phỏng Modbus slave RTU/TCP miễn phí cho Windows: thử PLC, HMI hay master khi chưa có thiết bị, có bảng thanh ghi, chèn lỗi và hồ sơ thiết bị.",
  },
  summary: "Biến PC thành Modbus slave (RTU nối tiếp, hoặc máy chủ Modbus TCP hay RTU over TCP) để thử master (PLC, HMI, phần mềm máy chủ) mà không cần thiết bị thật — kể cả cố ý làm chậm hoặc gây lỗi.",
  who: [
    "Lập trình viên viết Modbus master",
    "Nhóm chuẩn bị màn hình HMI trước khi thiết bị về",
  ],
  features: [
    {
      title: "Ba kiểu truyền",
      body: "Nối tiếp (RTU), máy chủ TCP (Modbus TCP) và máy chủ TCP (RTU over TCP — thiết bị sau một server thiết bị nối tiếp).",
    },
    {
      title: "Bốn bảng dữ liệu",
      body: "Coil, discrete input, holding register và input register. Xem bảng dạng U16, S16, HEX hoặc BIN, đặt kiểu U32, S32, F32, F64 hoặc chuỗi cho từng ô kèm thứ tự byte, và cho giá trị tự thay đổi (tăng dần, ngẫu nhiên, hình sin …).",
    },
    {
      title: "Nhiều Slave ID",
      body: "Chạy nhiều Slave ID (1–247), mỗi ID có giá trị riêng.",
    },
    {
      title: "Chèn lỗi",
      body: "Làm chậm, không phản hồi, CRC hỏng, độ dài MBAP sai hoặc ép mã lỗi — chọn theo Slave ID, mã hàm, địa chỉ, cứ N yêu cầu hoặc theo xác suất — để thử thời gian chờ và việc thử lại của master.",
    },
    {
      title: "Thấy mọi lần ghi",
      body: "Ô mà master ghi sẽ nhấp nháy, kèm log lưu lượng và thống kê.",
    },
    {
      title: "Hồ sơ thiết bị, bảng đã lưu",
      body: (c: { nDevices: number }) => `Nạp tên và kiểu thanh ghi của ${c.nDevices} thiết bị tích hợp (biến tần, bộ điều khiển nhiệt độ, đồng hồ điện …) kèm giá trị ví dụ. Xuất và nhập bảng dạng bản đồ thanh ghi CSV (cùng định dạng với Modbus Master) hoặc JSON.`,
    },
    {
      title: "Mô phỏng theo hồ sơ thiết bị — giá trị sống động (từ 0.10.0)",
      body: "Thử SCADA, HMI hoặc chương trình của bạn mà không cần biến tần hay đồng hồ điện thật. Ghi lệnh chạy thì tần số ra tăng dần tới tần số đặt (giảm khi bằng 0), dòng điện, điện áp và công suất đi theo; đồng hồ điện làm điện áp và dòng điện dao động nhẹ và cộng dồn điện năng. «Luật liên kết» (đi theo, tỷ lệ, cộng dồn) chỉnh sửa được nối các ô với nhau. Ô chỉ đọc và chỉ ghi theo bản đồ thiết bị được áp dụng (mã lỗi 02 hoặc 03, tùy bạn chọn), địa chỉ chưa có trong bản đồ trả mã lỗi 02, và dùng được cùng với chèn lỗi. Giá trị lấy từ các bảng trong sổ tay nên hành vi thiết bị thật (thời gian tăng tốc, v.v.) có thể khác.",
    },
    {
      title: "Địa chỉ gắn lần đầu là 127.0.0.1 (từ 0.10.0)",
      body: "«Địa chỉ gắn» của máy chủ TCP ban đầu là 127.0.0.1 (chỉ PC này). Với master ở PC khác, hãy chọn 0.0.0.0 (mọi card mạng) hoặc địa chỉ của một card mạng ở đó. Cài đặt do các phiên bản trước lưu vẫn được giữ.",
    },
  ],
  steps: [
    "Chọn kiểu truyền (nối tiếp hoặc TCP) cùng cổng và tốc độ baud (hoặc địa chỉ và cổng); thêm Slave ID nếu cần",
    "Chọn một bảng, đặt địa chỉ bắt đầu và số lượng, rồi nhập giá trị",
    "«Kết nối» («Bắt đầu» với TCP) — yêu cầu của master được trả lời từ bảng",
  ],
  similar: "Công cụ tương tự gồm Modbus Slave thương mại (Witte Software) và ModRSsim2 mã nguồn mở. PortDock Modbus Slave miễn phí (GPL-3.0), không giới hạn thời gian.",
};
