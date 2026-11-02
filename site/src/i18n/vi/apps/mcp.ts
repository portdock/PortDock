// PortDock MCP — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock MCP — Đọc cổng COM và Modbus từ AI client",
    desc: "MCP server miễn phí cho Claude Desktop và các AI client khác đọc báo cáo cổng COM, Modbus, giao thức MC và giá trị SCPI. Chỉ ghi vào trình mô phỏng 127.0.0.1.",
  },
  summary: "Một MCP server không có cửa sổ do các AI client (Claude Desktop, VS Code, Cursor …) khởi động. AI đọc các cổng COM và card mạng của PC này, đồng thời đọc giá trị Modbus, giao thức MC và SCPI từ các thiết bị bạn chỉ định. Các công cụ ghi chỉ chấp nhận địa chỉ của chính PC này (127.0.0.1) và dành cho trình mô phỏng. Từ 0.10.0, việc ghi Modbus chỉ đến đích tự nhận là PortDock. Việc ghi MC chỉ được kiểm tra theo địa chỉ, nên nếu một chương trình trên PC này chuyển tiếp sang thiết bị khác (TCP relay, gateway hoặc tunnel) thì lệnh ghi có thể đến thiết bị thật.",
  who: [
    "Bất kỳ ai muốn trợ lý AI cùng xem các vấn đề về cổng COM và bộ chuyển USB",
    "Lập trình viên muốn đọc giá trị Modbus, MC hoặc SCPI ngay trong cuộc trò chuyện với AI",
    "Người tập dùng công cụ AI với trình mô phỏng thay vì thiết bị thật",
  ],
  features: [
    {
      title: "Chín công cụ đọc",
      body: "Danh sách cổng COM, báo cáo Port Inspector, nghe serial (không gửi gì), đọc Modbus (FC 01–04), đọc hàng loạt MC 3E, truy vấn SCPI, ping, card mạng và bản đồ thanh ghi của thiết bị.",
    },
    {
      title: "Chỉ ghi vào trình mô phỏng 127.0.0.1",
      body: "Tập «ghi rồi đọc lại» với Modbus Slave hay PLC Simulator trên PC này. Mọi địa chỉ khác bị từ chối trước khi kết nối. Từ 0.10.0, việc ghi Modbus còn yêu cầu đích tự nhận là «PortDock» (FC 2B/0E); việc ghi MC chỉ được kiểm tra theo địa chỉ, nên đừng dùng khi đang chạy chương trình relay.",
    },
    {
      title: "Chỉ truy vấn SCPI",
      body: "Gửi một truy vấn kết thúc bằng «?»; các lệnh có thể đổi trạng thái như *TST?, *CAL? và *RST bị từ chối. READ? và MEAS…? bắt đầu một phép đo mới bị từ chối theo mặc định và chỉ được gửi khi bạn cho phép bằng allow_measure (từ 0.8.0). Dùng FETC? để chỉ đọc giá trị gần nhất.",
    },
    {
      title: "Log phiên và giới hạn tốc độ",
      body: "Mọi lệnh gọi được giữ trên PC này dưới dạng các dòng JSON và không bao giờ gửi ra ngoài. Cùng một đích tối đa một lần mỗi 100 ms, 120 lệnh gọi mỗi phút.",
    },
    {
      title: "Dữ liệu cá nhân được che",
      body: "Đường dẫn thư mục người dùng trong kết quả thành «~», địa chỉ MAC thành «xx-…» và tên mạng thành «(hidden)».",
    },
    {
      title: "Chỉ một tệp để cài",
      body: "Không cần Python, Node hay Docker: một tệp .mcpb (mở bằng Claude Desktop) hoặc một exe duy nhất trong tệp zip.",
    },
  ],
  steps: [
    "Mở PortDock-MCP.mcpb trong Claude Desktop (client khác: điền đường dẫn exe trong tệp zip vào phần cài đặt của chúng)",
    "Hỏi AI điều như «list my COM ports» — client sẽ hỏi bạn trước mỗi lần gọi công cụ",
    "Cho địa chỉ, cổng và unit để đọc một thiết bị. Tập với Modbus Slave hoặc PLC Simulator trên 127.0.0.1",
  ],
  faq: [
    {
      q: "AI có thể đổi cài đặt thiết bị không?",
      a: "Hai công cụ ghi chỉ hoạt động khi đích là 127.0.0.1 hoặc localhost (PC này); mọi địa chỉ khác bị từ chối trước khi kết nối. Từ 0.10.0, modbus_write_sim chỉ ghi khi đích trả lời nhận dạng thiết bị (FC 2B/0E) bằng tên hãng bắt đầu bằng «PortDock», nên nó không ghi vào thiết bị thật phía sau gateway Modbus TCP ↔ RTU của PortDock Serial (mặc định 127.0.0.1:502). mc_write_sim chỉ được kiểm tra theo địa chỉ, nên nếu một chương trình trên PC này chuyển tiếp sang thiết bị khác (TCP relay, gateway của hãng, SSH tunnel …) thì lệnh ghi có thể đến thiết bị thật — đừng dùng các công cụ ghi khi chương trình như vậy đang chạy.",
    },
    {
      q: "Nó gửi gì ra ngoài?",
      a: "Bản thân PortDock MCP chỉ trao đổi với các địa chỉ và cổng thiết bị bạn đưa ra, và log phiên chỉ nằm trên PC này. Kết quả của công cụ được gửi tới AI client bạn dùng, nên từ đó chính sách của client ấy áp dụng.",
    },
  ],
};
