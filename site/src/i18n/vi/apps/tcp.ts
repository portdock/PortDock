// PortDock TCP — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock TCP — Công cụ thử TCP Client, Server và Relay miễn phí",
    desc: "Công cụ thử TCP socket miễn phí cho Windows: chế độ client, server nhiều kết nối và relay (giám sát), echo, tự kết nối lại và tách khung Modbus TCP.",
  },
  summary: "Kết nối tới thiết bị Ethernet (client) hoặc để thiết bị kết nối tới PC (server). Server nhận nhiều đầu kết nối và gửi được cho một hoặc tất cả; relay nằm giữa hai thiết bị và ghi log cả hai chiều.",
  who: [
    "Lập trình viên HMI, MES và phần mềm máy chủ",
    "Lập trình viên firmware của thiết bị TCP",
  ],
  features: [
    {
      title: "Client và server",
      body: "Server nhận tối đa 64 đầu kết nối; gửi cho một hoặc tất cả, và ngắt từng kết nối riêng.",
    },
    {
      title: "Relay (giám sát)",
      body: "Nằm giữa A (ví dụ HMI) và B (ví dụ PLC), chuyển tiếp dữ liệu và ghi log cả hai chiều.",
    },
    {
      title: "Tự kết nối lại",
      body: "Client kết nối lại theo chu kỳ đã đặt khi đường truyền rớt.",
    },
    {
      title: "Echo (phản hồi)",
      body: "Server gửi trả lại dữ liệu nhận được; echo tự tắt khi vượt 200 lần mỗi giây để tránh vòng lặp echo.",
    },
    {
      title: "Tách khung và checksum",
      body: "Tách luồng TCP theo khoảng nghỉ, ký tự kết thúc, độ dài cố định hoặc Modbus TCP (độ dài MBAP), và kiểm tra chín loại checksum hoặc CRC tùy chỉnh.",
    },
    {
      title: "Địa chỉ gắn lần đầu là 127.0.0.1 (từ 0.10.0)",
      body: "«Địa chỉ gắn» của server và «Địa chỉ PC này để A kết nối tới» của relay ban đầu là 127.0.0.1 (chỉ PC này). Để PC khác hoặc HMI kết nối, hãy chọn 0.0.0.0 (mọi card mạng) hoặc địa chỉ của một card mạng ở đó. Cài đặt do các phiên bản trước lưu vẫn được giữ.",
    },
  ],
  steps: [
    "Chọn «Client» hoặc «Server», nhập địa chỉ và cổng",
    "«Kết nối» hoặc «Bắt đầu nghe»",
    "Nhập nội dung và «Gửi»",
  ],
  uses: [
    {
      title: "Trao đổi với thiết bị",
      body: "Nếu thiết bị chờ kết nối, dùng «Client» với IP và cổng của nó, gửi lệnh và đọc phản hồi dạng HEX hoặc ASCII. Client sẽ kết nối lại theo chu kỳ đã đặt nếu đường truyền rớt.",
    },
    {
      title: "Khi thiết bị tự kết nối tới PC",
      body: "Mở một cổng bằng «Server» thì tối đa 64 thiết bị có thể kết nối. Gửi cho một hoặc tất cả, và ngắt từng thiết bị một.",
    },
    {
      title: "Ghi log dữ liệu HMI ⇄ PLC",
      body: "Với «Relay», PC nằm giữa hai thiết bị; trỏ HMI tới PC này là cả hai chiều đều được ghi log. Các byte được chuyển tiếp nguyên vẹn. Từ 0.8.0 relay có thể lưu pcap và hiện các cặp yêu cầu-phản hồi Modbus/MC cùng thời gian phản hồi.",
    },
    {
      title: "Đọc thử thiết bị Modbus TCP một lần",
      body: "Kết nối tới cổng 502 thì thanh «Xem dạng Modbus TCP» xuất hiện. Nó tách từng yêu cầu và phản hồi rồi giải mã trong ngăn chi tiết. Để đọc liên tục, dùng Modbus Master sẽ dễ hơn.",
    },
  ],
  faq: [
    {
      q: "Client cứ kết nối không được (CONNECT FAIL)",
      a: "Kiểm tra nguồn và cáp của thiết bị, IP và cổng, và PC cùng thiết bị phải ở cùng mạng con (ví dụ 192.168.0.x).",
    },
    {
      q: "Tôi đã bật server nhưng thiết bị không kết nối được",
      a: "Hãy chắc là bạn đã cho phép trong hộp thoại Windows Firewall và thiết bị kết nối tới đúng IP của PC này. Lỗi «already in use» nghĩa là chương trình khác đang giữ cổng.",
    },
    {
      q: "Dữ liệu bị dính lại hoặc bị tách ra",
      a: "TCP không giữ ranh giới bản tin. Hãy đổi cách tách khung trong «Cài đặt nhận» sang ký tự kết thúc, độ dài cố định hoặc Modbus TCP (độ dài MBAP), hoặc chỉnh khoảng nghỉ.",
    },
    {
      q: "Relay có thay đổi dữ liệu không?",
      a: "Không. Các byte được chuyển tiếp đúng như khi đến; tách khung và kiểm tra checksum chỉ dùng cho log, còn tự trả lời và echo đều tắt. Chỉ những gì bạn tự chèn vào mới đến thiết bị, nên hãy cẩn thận.",
    },
  ],
  similar: "Công cụ tương tự gồm Hercules SETUP utility (HW-group, freeware).",
};
