// PortDock Simulator — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock Simulator — Mô phỏng thiết bị miễn phí: Serial, TCP, UDP",
    desc: "Mô phỏng thiết bị miễn phí theo luật: «khi nhận cái này thì trả lời cái kia» qua serial, TCP, UDP. Viết phần mềm không cần phần cứng; thử độ trễ, mất phản hồi.",
  },
  summary: "Giả lập bất kỳ thiết bị nào bằng các luật «khi nhận cái này → trả lời cái kia». Phát triển phần mềm máy chủ khi chưa có phần cứng và thử xử lý lỗi với độ trễ, bỏ phản hồi (cứ N lần hoặc ngẫu nhiên) và phản hồi xoay vòng.",
  who: [
    "Lập trình viên phần mềm máy chủ chưa có phần cứng",
    "Nhóm xây dựng giàn kiểm tra tự động",
  ],
  features: [
    {
      title: "Luật có ký tự đại diện",
      body: "HEX ?? (một byte bất kỳ) và ** (không hoặc nhiều byte). ASCII mặc định khớp đúng nghĩa đen; bật «Ký tự đại diện» của luật để dùng ? và *. Khớp hẳn hoặc chứa.",
    },
    {
      title: "Phản hồi được định dạng",
      body: "Tự thêm checksum và ký tự cuối dòng, độ trễ phản hồi và đếm số lần khớp của từng luật.",
    },
    {
      title: "Bản tin do thiết bị tự gửi",
      body: "Gửi heartbeat hoặc báo cáo trạng thái theo chu kỳ.",
    },
    {
      title: "Bốn kiểu truyền",
      body: "Serial, TCP server, TCP client, UDP. Lưu và nạp các luật cùng cài đặt kết nối và tách khung trong một tệp JSON.",
    },
    {
      title: "Địa chỉ lần đầu là 127.0.0.1 (từ 0.10.0)",
      body: "«Địa chỉ» của TCP server và UDP ban đầu là 127.0.0.1 (chỉ PC này). Với phần mềm máy chủ ở PC khác, hãy chọn 0.0.0.0 (mọi card mạng) hoặc địa chỉ của một card mạng. Cài đặt do các phiên bản trước lưu vẫn được giữ.",
    },
  ],
  steps: [
    "Chọn kiểu truyền và nhập cổng hoặc địa chỉ",
    "«+ Thêm luật» — Khi nhận / Trả lời",
    "«Bắt đầu» — gửi yêu cầu từ phần mềm máy chủ của bạn",
  ],
  uses: [
    {
      title: "Viết phần mềm máy chủ trước khi phần cứng về",
      body: "Biến các cặp yêu cầu/phản hồi trong sổ tay thiết bị thành luật «khi nhận → trả lời» và kết nối HMI hoặc chương trình thử của bạn mà không cần thiết bị thật.",
    },
    {
      title: "Thử thời gian chờ và xử lý lỗi",
      body: "Độ trễ phản hồi (có dao động), không trả lời cứ N lần hoặc ngẫu nhiên, và phản hồi xoay vòng cho thấy phần mềm máy chủ của bạn ứng phó ra sao với câu trả lời muộn hoặc thiếu.",
    },
    {
      title: "Tập SCPI khi không có máy đo",
      body: "Chạy TCP server trên cổng 5025 với ví dụ [SCPI *IDN? reply] rồi kết nối PortDock SCPI tới 127.0.0.1. Phản hồi như «+1.2{rand 0..9}E+00» thay đổi sau mỗi yêu cầu.",
    },
    {
      title: "Giả lập heartbeat và báo cáo trạng thái",
      body: "«Thiết bị tự gửi» gửi đi mà không cần yêu cầu theo chu kỳ đã đặt. Các ký hiệu {counter}, {rand} và {time} được điền vào mỗi lần gửi.",
    },
  ],
  faq: [
    {
      q: "Yêu cầu đến nhưng không có phản hồi nào được gửi đi",
      a: "Kiểm tra luật đang bật, kiểu mẫu (HEX/ASCII) và «khớp hẳn/chứa» đúng, và không có luật «**» nằm phía trên. Khi bật «Ghi yêu cầu không khớp», một dòng «NO MATCH» sẽ hiện; nhấn chuột phải vào đó để tạo luật từ nó.",
    },
    {
      q: "Yêu cầu đến bị tách ra hoặc dính lại",
      a: "Các luật so sánh cả khung. Hãy chỉnh «Tách khung» (khoảng nghỉ hoặc ký tự kết thúc) và khoảng nghỉ tính bằng ms. UDP không cần tách khung — một datagram là một khung.",
    },
    {
      q: "Làm sao kết nối chương trình trên cùng PC?",
      a: "Với TCP, bật một server và để chương trình máy chủ kết nối tới 127.0.0.1. Với serial, dùng một cặp COM ảo (com0com hoặc tương tự).",
    },
    {
      q: "Luật «*IDN?» của tôi trả lời cả những yêu cầu không liên quan",
      a: "Khi bật «Ký tự đại diện», ? và * trong luật ASCII khớp với mọi ký tự. Hãy để tắt ký tự đại diện cho các luật SCPI (mặc định của luật mới).",
    },
    {
      q: "Có chuyển luật sang PC khác được không?",
      a: "«Lưu bộ luật» lưu các luật cùng kiểu truyền, cổng, địa chỉ, tách khung và bản tin do thiết bị tự gửi vào một tệp JSON — mỗi thiết bị hoặc mỗi bài thử nên có một tệp.",
    },
  ],
};
