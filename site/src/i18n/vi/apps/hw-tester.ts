// PortDock Hardware Tester — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Hardware Tester — Ghi log rớt Wi-Fi và ping (miễn phí)",
    desc: "Công cụ Windows miễn phí ghi lại các lần rớt Wi-Fi: ping gateway và internet song song, thời gian DNS, lý do Windows ngắt kết nối và log Bluetooth kết nối/ngắt.",
  },
  summary: "Biến câu «Wi-Fi của tôi cứ rớt» thành một bản ghi. Trong khi ghi, chương trình ping gateway (router) và một địa chỉ internet song song, vẽ độ trễ và mất gói trên một đồ thị cùng lý do ngắt Wi-Fi mà Windows ghi lại trên cùng trục thời gian, rồi cho biết nên tìm ở phía router hay ở xa hơn. Nó cũng ghi lại lúc các thiết bị Bluetooth kết nối và ngắt. Chỉ đọc, không cần quyền quản trị; không đổi cài đặt nào.",
  who: [
    "Bất kỳ ai bị rớt Wi-Fi và muốn biết lỗi ở router hay ở internet",
    "Người muốn có bản ghi thời điểm tai nghe hay bàn phím Bluetooth bị ngắt",
    "Kỹ sư hiện trường ghi lại đường truyền không dây của PC thiết bị trước khi gọi hỗ trợ",
  ],
  features: [
    {
      title: "Gateway so với internet",
      body: "Ping router và một địa chỉ internet (1.1.1.1, 8.8.8.8 hoặc của bạn) cùng nhịp và hiện mất gói, trung bình, phân vị 95 và jitter cạnh nhau. Không bao giờ quá một lần mỗi giây; một lần ghi tự dừng sau 24 giờ.",
    },
    {
      title: "Lý do ngắt kết nối của Windows trên cùng đồ thị",
      body: "Đọc nhật ký WLAN-AutoConfig (8001 kết nối, 8003 ngắt) và hiện thành các đường trên đồ thị và dưới dạng lời lý do của Windows trong danh sách sự kiện. Tên Wi-Fi không được đọc.",
    },
    {
      title: "Thời gian phản hồi DNS",
      body: "Cứ 5 giây tra một tên (mặc định example.com) tại máy chủ DNS mà không dùng cache, đo thời gian phản hồi và các lần lỗi.",
    },
    {
      title: "Tóm tắt nơi cần tìm và CSV",
      body: "Báo «phía router» khi mất gói ngay từ gateway và «xa hơn router» khi chỉ đích internet mất phản hồi — chỉ ra nơi cần tìm chứ không phải nguyên nhân. Bản ghi lưu được ra CSV.",
    },
    {
      title: "Log kết nối Bluetooth",
      body: "Cứ 2 giây đọc trạng thái «Connected» của các thiết bị đã ghép đôi và ghi lại các lần kết nối và rớt. Tên chỉ hiện trên màn hình; văn bản đã lưu và đã sao chép dùng «Thiết bị N».",
    },
    {
      title: "Log USB kết nối/ngắt (từ 0.10.0)",
      body: "Tìm ra thiết bị USB nào đứng sau âm thanh kết nối/ngắt cứ lặp lại. Ghi thời điểm cắm và rút kèm tên thiết bị, VID:PID, cổng hub và tốc độ, đánh dấu thiết bị rớt từ 3 lần trở lên trong 10 phút là «nghi rớt lặp lại» và thiết bị USB 3 chạy ở tốc độ USB 2.0 là «Nên xem». Cũng đọc thời điểm cắm/rút gần nhất từ trước khi ứng dụng khởi động.",
    },
    {
      title: "Chế độ âm thanh Bluetooth và âm thử trái/phải",
      body: "Cho biết đầu ra mặc định đang là stereo (A2DP) hay rảnh tay để gọi, và phát âm thử bên trái, bên phải và cả hai bên.",
    },
    {
      title: "Tín hiệu và kênh Wi-Fi (khi bạn yêu cầu)",
      body: "Chỉ khi «Hiện tín hiệu» đang bật: cường độ tín hiệu, tốc độ liên kết, băng tần, kênh và số mạng lân cận dùng chung từng kênh (không có tên). Từ Windows 11 24H2 mục này cần quyền vị trí (phần còn lại vẫn chạy khi không có).",
    },
  ],
  steps: [
    "Chọn đích internet và chu kỳ, rồi «Bắt đầu ghi»",
    "Để chạy cho đến khi sự cố rớt xảy ra — độ trễ của router và internet cùng lý do của Windows trên một đồ thị",
    "Xem nơi cần tìm ở «Tóm tắt», rồi «Lưu CSV…» hoặc «Sao chép tóm tắt»",
  ],
  faq: [
    {
      q: "Nó có đo tốc độ internet không?",
      a: "Không. Nó ghi lại các lần rớt, độ trễ và mất gói, không phải tốc độ tải xuống hay tải lên. Hãy dùng trang đo tốc độ cho việc đó.",
    },
    {
      q: "Nó có sửa được sự cố không?",
      a: "Không. Nó chỉ đọc và không đổi cài đặt nào. Nó chỉ ra nơi cần tìm (phía router, xa hơn router, DNS, lý do ngắt kết nối của Windows).",
    },
    {
      q: "Nó gửi gì ra ngoài?",
      a: "Chỉ các ping tới gateway và địa chỉ internet đã chọn cùng một lần tra DNS, trong lúc ghi. Các đích luôn được hiển thị, và sau khi bạn dừng thì không gửi gì nữa.",
    },
  ],
  similar: "Công cụ tương tự gồm PingPlotter (thương mại, có bản miễn phí) và WifiHistoryView (miễn phí, lịch sử kết nối/ngắt). PortDock Hardware Tester miễn phí (GPL-3.0) và đưa ping gateway và internet cùng lý do ngắt kết nối của Windows lên một đồ thị, kèm log kết nối Bluetooth.",
};
