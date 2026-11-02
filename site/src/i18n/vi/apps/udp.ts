// PortDock UDP — Tiếng Việt (đợt 8)
export default {
  seo: {
    title: "PortDock UDP — Gửi/nhận UDP miễn phí (Broadcast, Multicast)",
    desc: "Công cụ thử UDP miễn phí cho Windows: nhận và gửi datagram, broadcast và multicast, trả lời bên gửi gần nhất, echo và log có dấu thời gian.",
  },
  summary: "Nhận datagram trên một cổng và trả lời tới đích cố định hoặc bên gửi gần nhất. Dành cho thiết bị dùng broadcast và multicast.",
  who: [
    "Bất kỳ ai làm việc với thiết bị phát trạng thái qua UDP bằng broadcast",
    "Nhóm kiểm tra việc nhận multicast",
  ],
  features: [
    {
      title: "Danh sách bên gửi",
      body: "Thu thập địa chỉ bên gửi; nhấn vào một địa chỉ để dùng làm đích.",
    },
    {
      title: "Broadcast và multicast",
      body: "Cho phép broadcast, tham gia hoặc tham gia lại nhóm multicast, chọn card mạng.",
    },
    {
      title: "Echo (phản hồi)",
      body: "Gửi trả lại cho bên gửi, có tự động chống vòng lặp.",
    },
  ],
  steps: [
    "Nhập cổng nghe và đích",
    "«Bắt đầu»",
    "Nhập nội dung và «Gửi»",
  ],
  uses: [
    {
      title: "Nhận bản tin trạng thái dạng broadcast",
      body: "Nhập cổng nghe rồi nhấn «Bắt đầu». Mỗi datagram là một dòng log, và các bên gửi được thu vào danh sách «Bên gửi» (tối đa 256).",
    },
    {
      title: "Khi bạn không biết địa chỉ của thiết bị",
      body: "Bắt đầu nghe trên cổng mà thiết bị gửi tới và theo dõi «Bên gửi». Nhấn «Dùng làm đích» cạnh một địa chỉ để trả lời tới đó.",
    },
    {
      title: "Gửi broadcast",
      body: "Bật «Cho phép broadcast» trước khi bắt đầu, rồi gửi tới 255.255.255.255 hoặc một địa chỉ như 192.168.0.255. Nếu đang tắt, chương trình sẽ cảnh báo.",
    },
    {
      title: "Kiểm tra việc nhận multicast",
      body: "Nhập một nhóm (224–239.x.x.x) và nó được tham gia khi bắt đầu. Khi có nhiều card mạng (mạng văn phòng và mạng máy), hãy chọn «Card mạng multicast» phía máy. TTL mặc định là 1 nên chỉ ở trong mạng nội bộ.",
    },
  ],
  faq: [
    {
      q: "Không có gì đến",
      a: "Kiểm tra IP và cổng mà thiết bị gửi tới, quyền trong Windows Firewall, và cả hai phải cùng mạng con. Với multicast, kiểm tra nhóm và card mạng, rồi thử «Tham gia lại».",
    },
    {
      q: "Bắt đầu bị lỗi «address in use»",
      a: "Chương trình khác đang giữ cổng; dòng sự kiện nêu tên chương trình đó và PID của nó. Hãy dùng cổng khác hoặc đóng chương trình ấy.",
    },
    {
      q: "«ICMP port unreachable» nghĩa là gì?",
      a: "Hệ điều hành báo rằng ở đích không có gì đang nghe trên cổng đó. Hãy kiểm tra số cổng và nguồn điện của thiết bị.",
    },
    {
      q: "Mỗi lần gửi được bao nhiêu?",
      a: "Một lần gửi là một datagram. Trên khoảng 64 KB thì hệ điều hành sẽ từ chối.",
    },
  ],
};
