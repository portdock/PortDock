// PortDock SCPI — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock SCPI — Terminal SCPI miễn phí (LAN, RS-232, không VISA)",
    desc: "Terminal máy đo SCPI miễn phí qua LAN socket (5025) hoặc RS-232 không cần VISA: *IDN?, hàng lỗi, chờ *OPC?, đo lặp ghi ra CSV.",
  },
  summary: "Gửi lệnh tới các máy đo SCPI như nguồn, đồng hồ vạn năng và máy hiện sóng rồi đọc câu trả lời. Kết nối qua LAN socket (TCP 5025) hoặc RS-232 mà không cần cài VISA, nhận dạng máy bằng *IDN?, đọc hết hàng lỗi và ghi các số đo lặp lại ra CSV.",
  who: [
    "Lập trình viên kiểm tra lệnh bằng tay trước khi viết tự động hóa kiểm tra",
    "Kỹ sư hiện trường cần xem nhanh một máy đo trên PC không có VISA",
  ],
  features: [
    {
      title: "Không cần VISA",
      body: "LAN socket (thường là 5025) và RS-232 (baud, parity, điều khiển luồng) với ký tự cuối dòng LF, CR LF hoặc CR. Chưa hỗ trợ VXI-11, HiSLIP và USBTMC.",
    },
    {
      title: "Truy vấn, ghi, đọc",
      body: "Lệnh kết thúc bằng ? được truy vấn, lệnh khác được ghi. Hiện thời gian phản hồi, hết thời gian chờ và phản hồi không có ký tự cuối dòng. Có lịch sử lệnh, danh sách lệnh và gợi ý hoàn thành cho các lệnh thông dụng.",
    },
    {
      title: "ID, hàng lỗi, *OPC?",
      body: "*IDN? được tách thành hãng, model, số serial và firmware; SYST:ERR? được hỏi đến khi bằng 0 để liệt kê mọi lỗi trong hàng. Có nút cho *RST, *CLS và chờ *OPC?.",
    },
    {
      title: "Đo lặp",
      body: "Lặp một truy vấn như MEAS:VOLT:DC? theo chu kỳ với số lần đã đặt, có bảng giá trị, xu hướng và thống kê (nhỏ nhất, lớn nhất, trung bình, độ lệch chuẩn), lưu ra CSV.",
    },
    {
      title: "Dữ liệu khối",
      body: "Khối IEEE 488.2 (#NXXXX…) được đọc theo tiêu đề độ dài, nên byte LF nằm trong dữ liệu nhị phân không cắt ngang chúng. Xem trước dạng HEX và lưu ra tệp (ví dụ ảnh chụp màn hình PNG).",
    },
  ],
  steps: [
    "LAN: IP máy đo và cổng 5025; nối tiếp: cổng và baud như trên máy đo",
    "«Kết nối» (F4) — *IDN? cho biết tên máy đo",
    "Gõ lệnh rồi nhấn Enter; kiểm tra lỗi bằng «Đọc hết hàng lỗi»",
  ],
  uses: [
    {
      title: "Kiểm tra lệnh trước khi viết tự động hóa",
      body: "Gõ lệnh bằng tay và xem phản hồi cùng thời gian phản hồi. Lệnh kết thúc bằng ? là truy vấn, lệnh khác là ghi. Kiểm tra lỗi ngay bằng «Đọc hết hàng lỗi».",
    },
    {
      title: "Truy cập máy đo trên PC không có VISA",
      body: "Kết nối thẳng qua LAN socket (thường là cổng 5025) hoặc RS-232. *IDN? được tách thành hãng, model, số serial và firmware.",
    },
    {
      title: "Ghi các số đo lặp ra CSV",
      body: "Trong «Đo lặp», hỏi một truy vấn như MEAS:VOLT:DC? theo chu kỳ với số lần đã đặt, xem bảng, xu hướng và thống kê (nhỏ nhất, lớn nhất, trung bình, độ lệch chuẩn) rồi lưu ra CSV.",
    },
    {
      title: "Lấy dữ liệu khối như ảnh chụp màn hình",
      body: "Khối IEEE 488.2 (#N…) được đọc theo tiêu đề độ dài, nên byte LF nằm trong dữ liệu nhị phân không cắt ngang chúng. Xem trước dạng HEX và lưu ra tệp (PNG và các loại khác).",
    },
  ],
  faq: [
    {
      q: "Tôi gặp «connection refused»",
      a: "Cổng khác (xem «socket port» trong sổ tay — không phải máy nào cũng dùng 5025) hoặc giao diện socket đang tắt. Một số máy đo từ chối kết nối mới khi chương trình khác (một phiên VISA) đang giữ kết nối.",
    },
    {
      q: "Tôi gặp «no response (timeout)»",
      a: "Lệnh không phải truy vấn lại được gửi như truy vấn, lệnh bị gõ sai (kiểm tra hàng lỗi) hoặc máy đo đang bận đo. Hãy tăng thời gian chờ phản hồi hoặc dùng *OPC?. «Reply not finished» nghĩa là ký tự cuối dòng (LF, CR LF, CR) khác với máy đo.",
    },
    {
      q: "-410 Query INTERRUPTED là gì?",
      a: "Lệnh tiếp theo đã được gửi trước khi phản hồi được đọc. Nếu bạn gửi một truy vấn bằng «Ghi», hãy lấy câu trả lời bằng «Đọc» trước.",
    },
    {
      q: "Có hỗ trợ USBTMC, GPIB, VXI-11 hay HiSLIP không?",
      a: "Hiện chưa. VXI-11 chưa được hỗ trợ lúc này; HiSLIP, USBTMC và GPIB cần VISA hoặc driver nên nằm ngoài phạm vi. Hầu hết máy đo LAN cũng có socket (5025), và máy đo chỉ có USB với thiết lập «USB virtual COM» dùng được qua cổng nối tiếp.",
    },
    {
      q: "Có thử được khi không có máy đo không?",
      a: "Chạy PortDock Simulator làm TCP server trên cổng 5025 với tách khung LF và ví dụ [SCPI *IDN? reply], rồi kết nối tới 127.0.0.1:5025.",
    },
  ],
  similar: "Các công cụ của hãng dựa trên VISA (NI MAX, Keysight Connection Expert …) cũng gửi lệnh được. PortDock SCPI kết nối qua LAN socket hoặc RS-232 trên PC không có VISA.",
};
