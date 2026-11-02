// PortDock PLC Simulator — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock PLC Simulator — Mô phỏng giao thức MC (SLMP) miễn phí",
    desc: "Công cụ Windows miễn phí để thử giao thức MC (3E/4E, binary/ASCII) khi không có PLC: bảng thiết bị (D, M, X, Y …), đọc/ghi hàng loạt và ngẫu nhiên, chèn lỗi.",
  },
  summary: "PC trả lời các yêu cầu giao thức MC (SLMP) như cổng Ethernet của PLC. Đặt giá trị vào các bảng thiết bị là HMI, phần mềm thu thập dữ liệu hay phần mềm máy chủ đọc và ghi được; độ trễ và mã kết thúc lỗi cố ý dùng để thử cách chúng xử lý lỗi. Chương trình theo định dạng bản tin trong tài liệu công khai của Mitsubishi Electric (SLMP/MC); không liên quan đến hãng này, và hành vi có thể khác PLC thật.",
  who: [
    "Nhóm chuẩn bị màn hình HMI và truyền thông trước khi PLC về",
    "Lập trình viên phần mềm thu thập dữ liệu hay phần mềm máy chủ đọc PLC qua giao thức MC",
  ],
  features: [
    {
      title: "3E/4E, nhị phân/ASCII, TCP/UDP",
      body: "Lắng nghe như TCP server (nhiều client) hoặc trên UDP. Phản hồi 4E mang số thứ tự của yêu cầu. Mặc định chỉ PC này (127.0.0.1) kết nối được; có cho PC khác hay không là do bạn chọn.",
    },
    {
      title: "Các lệnh đã triển khai",
      body: "0401 Read và 1401 Write (word và bit, lệnh con 0000–0003), 0403 Read Random, 1402 Write Random và 0619 Loopback. Từ 0.6.0 còn có 0406/1406 Read/Write Block, giám sát 0801/0802, 1001–1006 remote RUN/STOP/PAUSE/latch clear/reset (chỉ là trạng thái mô phỏng) và 0101 Read Type Name (giá trị mô phỏng). Các lệnh khác nhận mã kết thúc C059.",
    },
    {
      title: "Giao thức riêng của LS XGT (từ 0.10.0)",
      body: "Đổi «Giao thức» sang «XGT riêng» là chương trình trả lời giao thức riêng FEnet của PLC XGT hãng LS ELECTRIC (tiêu đề «LSIS-XGT», mặc định TCP 2004 · UDP 2005): đọc h0054 và ghi h0058, từng điểm (%MX, %MB, %MW, %MD, %ML, tối đa 16 khối) và liên tục (%MB byte, tối đa 1.400 byte), các thiết bị P, M, K, F, T, C, D, L, N, và phản hồi mã lỗi (1–6, h75–h78). Xây dựng từ sổ tay người dùng công khai của LS ELECTRIC — không liên quan đến hãng này.",
    },
    {
      title: "Luật điều kiện (từ 0.6.0)",
      body: "Giả lập các bước bắt tay như «khi bit yêu cầu bật, 300 ms sau bật bit hoàn thành»: điều kiện (bit ON/OFF/cạnh, so sánh word, định kỳ) → độ trễ (cố định hoặc ngẫu nhiên) → hành động (ghi bit và word). Không phải chương trình ladder.",
    },
    {
      title: "18 thiết bị",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC và CN. X, Y, B, W và ZR dùng số hex; mỗi thiết bị có kích thước riêng và yêu cầu vượt quá nhận C056. Thiết bị bit xem được dạng word 16 điểm; ô có thể là 32-bit, số thực, chuỗi hoặc có tên.",
    },
    {
      title: "Chèn lỗi",
      body: "Độ trễ phản hồi (theo khoảng), không phản hồi hoặc một mã kết thúc tùy chọn — chọn theo lệnh, thiết bị, cứ N yêu cầu hoặc theo xác suất.",
    },
    {
      title: "Lưu lượng đã giải mã",
      body: "Mỗi yêu cầu hiện tên lệnh, thiết bị và số điểm; mỗi phản hồi hiện mã kết thúc và ý nghĩa của nó. Ô do client thay đổi sẽ nhấp nháy, kèm thống kê.",
    },
    {
      title: "Mô phỏng và trạng thái đã lưu",
      body: "Giá trị có thể tự thay đổi (tăng dần, ngẫu nhiên, hình sin, dốc, đảo trạng thái), và giá trị thiết bị cùng cài đặt ô được lưu vào và nạp từ tệp JSON.",
    },
  ],
  steps: [
    "Chọn khung (3E/4E), mã dữ liệu (binary/ASCII) và cổng khớp với client",
    "Chọn một thiết bị (D, M, X …) và nhập giá trị",
    "«Bắt đầu» — việc đọc và ghi của client được trả lời từ các bảng",
  ],
  faq: [
    {
      q: "Nó có hoạt động đúng như PLC thật không?",
      a: "Không. Nó theo định dạng bản tin trong tài liệu công khai và chưa được so với phần cứng thật. Không có chương trình ladder nào chạy, và mã lỗi, thời gian, giới hạn kết nối cùng dải thiết bị theo từng dòng máy có thể khác.",
    },
    {
      q: "Làm sao kết nối HMI ở PC khác?",
      a: "Bật «Cho phép PC khác kết nối (0.0.0.0)» và cho phép chương trình trong Windows Firewall. Đừng chạy nó trên mạng nhà máy với cùng IP và cổng như một PLC thật.",
    },
  ],
  similar: "Công cụ tương tự gồm DummyPLC (miễn phí, mã nguồn đóng) và HslCommunication (thương mại). PortDock PLC Simulator miễn phí (GPL-3.0) và bổ sung chèn lỗi, lưu lượng đã giải mã và mô phỏng giá trị.",
};
