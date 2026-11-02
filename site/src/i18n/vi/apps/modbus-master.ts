// PortDock Modbus Master — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Modbus Master — Công cụ thử Modbus RTU/TCP miễn phí",
    desc: "Modbus master RTU/TCP (công cụ poll) miễn phí cho Windows: nhiều bảng poll, F32/U32 và thứ tự byte, ký hiệu 40001, ghi, quét Slave ID, log CSV.",
  },
  summary: "Hỏi dữ liệu thiết bị Modbus thay cho PLC hoặc HMI. Poll nhiều bảng theo Slave ID, mã hàm, địa chỉ và chu kỳ, xem F32/U32/chuỗi với thứ tự byte và ký hiệu 40001, và nhấp đúp vào ô để ghi. Có sẵn HEX yêu cầu/phản hồi đã giải mã, thống kê và ghi giá trị ra CSV.",
  who: [
    "Kỹ sư hiện trường kiểm tra bản đồ Modbus của biến tần hay đồng hồ mới",
    "Lập trình viên thử firmware của thiết bị slave",
  ],
  features: [
    {
      title: "Nhiều bảng poll",
      body: "Mỗi bảng có Slave ID, mã hàm (01–04), địa chỉ bắt đầu, số lượng và chu kỳ riêng, kèm số lỗi ngay trên thẻ. Hỗ trợ RTU nối tiếp, Modbus TCP và RTU over TCP.",
    },
    {
      title: "Giá trị có kiểu và thứ tự byte",
      body: "Từ U16 đến F64 và chuỗi theo ABCD/CDAB/BADC/DCBA, HEX/BIN và ký hiệu 40001. Dùng chung định dạng bản đồ thanh ghi CSV với Modbus Slave.",
    },
    {
      title: "Ghi có xem trước",
      body: "Nhấp đúp để ghi bằng 05/06/0F/10 và xem trước chính xác các byte sẽ gửi. Tùy chọn «luôn FC15/16» gửi cả giá trị đơn bằng 0F/10.",
    },
    {
      title: "Hồ sơ thiết bị",
      body: (c: { nDevices: number }) => `Chọn một trong ${c.nDevices} thiết bị tích hợp (biến tần, bộ điều khiển nhiệt độ, đồng hồ điện …) để thêm các bảng poll kèm tên (đơn vị và hệ số), kiểu, Slave ID và cài đặt nối tiếp mặc định.`,
    },
    {
      title: "Quét Slave ID và địa chỉ",
      body: "Tìm xem Slave ID nào (1–247) có trả lời và dải địa chỉ nào đọc được, rồi biến chúng thành bảng.",
    },
    {
      title: "Tìm cài đặt đường truyền (từ 0.10.0)",
      body: "Khi chưa biết baud, parity và ID của thiết bị, gửi một lệnh đọc ngắn cho từng baud đã chọn (1200–115200) × parity/bit stop × dải ID và liệt kê các tổ hợp có trả lời. Phản hồi mã lỗi vẫn nghĩa là «có thiết bị ở đó». Có ước tính thời gian, nút dừng và «Kết nối với cài đặt này»; ID 0 (broadcast) không bao giờ được dùng. Không dùng cho bus đã có master khác.",
    },
    {
      title: "«Không phản hồi» — các nguyên nhân có thể (từ 0.10.0)",
      body: "Phân loại kết quả các yêu cầu gần đây thành nguyên nhân có thể và cách kiểm tra — không có byte nào (đấu dây, ID, cực A/B), chỉ có yêu cầu bị dội lại (echo của bộ chuyển 2 dây), lỗi CRC (baud, parity, nhiễu, điện trở cuối), khung bị cụt (thời gian chờ, độ trễ USB), ý nghĩa của từng mã lỗi, ID khác đang trả lời. Có liên kết tới các hướng dẫn và công cụ hỗ trợ xử lý sự cố; sao chép dạng văn bản.",
    },
    {
      title: "Sao lưu, so sánh, khôi phục cài đặt thiết bị (từ 0.10.0)",
      body: "Dùng khi thay thiết bị và bảo trì. Đọc nhiều dải cùng lúc (hoặc điền từ hồ sơ thiết bị) ra JSON và CSV — dải trên 125 được chia nhỏ, dải bị lỗi được liệt kê — rồi so với thiết bị hiện tại hoặc một bản sao lưu khác, chỉ hiện chỗ khác nhau. Khôi phục chỉ ghi những ô bạn chọn: xem trước (hiện tại so với sẽ ghi), nhấn lần hai để ghi, rồi đọc lại để kiểm tra. Input register và thanh ghi chỉ đọc theo hồ sơ bị chặn.",
    },
    {
      title: "Thời gian chờ, thử lại, thống kê",
      body: "Đặt thời gian chờ, số lần thử lại và độ trễ; đếm yêu cầu, thành công, hết thời gian chờ, lỗi CRC và mã lỗi kèm thời gian phản hồi cho từng bảng. Mã lỗi được giải thích.",
    },
    {
      title: "Log giá trị và xu hướng",
      body: "Ghi giá trị ra CSV ở mỗi lần poll hoặc khi có thay đổi, và theo dõi các ô đã chọn bằng đường xu hướng nhỏ.",
    },
    {
      title: "Theo dõi giá trị và cảnh báo (từ 0.10.0)",
      body: "Cho từng ô: giới hạn thấp/cao, không đổi (kẹt) trong N giây và mất liên lạc trong N giây, kèm biên quay về (trễ). Ô vượt ngưỡng được tô sáng, có danh sách cảnh báo (phát sinh, hết, thời lượng, xác nhận), âm thanh tùy chọn, nhấp nháy thanh tác vụ và log cảnh báo CSV. Chỉ là công cụ hỗ trợ giám sát, không phải thiết bị an toàn.",
    },
  ],
  steps: [
    "Chọn kiểu kết nối và cổng (hoặc IP) khớp với thiết bị",
    "«Kết nối» (F4), rồi đặt Slave ID, mã hàm, địa chỉ bắt đầu và số lượng theo sổ tay",
    "Nhấp đúp vào ô để ghi; nhấn chuột phải để đặt tên và kiểu",
  ],
  similar: "Công cụ tương tự gồm Modbus Poll thương mại (Witte Software) và QModMaster mã nguồn mở. PortDock Modbus Master miễn phí (GPL-3.0), không giới hạn thời gian.",
};
