// Chuyển đổi HEX ↔ ASCII (views/HexAsciiPage.astro) — gói 4
export default {
  title: "Chuyển đổi HEX ↔ ASCII",
  seo: "Chuyển HEX sang ASCII (text) kèm ký tự điều khiển — PortDock",
  desc: "Đổi byte HEX thành chữ và chữ thành HEX. Ký tự điều khiển như CR, LF hiện dưới dạng \\r \\n \\xNN để bạn sao chép và gửi đi nguyên như vậy.",
  hex: "HEX",
  ascii: "Văn bản (ASCII · chuỗi thoát)",
  dec: "Thập phân",
  count: "byte",
  how: "Ký tự in được (0x20–0x7E) giữ nguyên; mọi ký tự khác thành \\r \\n \\t \\0 \\\\ \\xNN. Chữ ngoài ASCII (như chữ tiếng Việt có dấu) thành các byte UTF-8. Mọi thứ chạy trong trình duyệt của bạn.",
  tableTitle: "Các ký tự điều khiển thường dùng",
  appNote: "Để gửi ngay tới thiết bị, hãy dùng",
  appEnd: ".",
  ctrlHead: ["HEX", "Tên", "Chuỗi thoát"],
  asciiNote: "Toàn bộ mã 0–127 và tên các ký tự điều khiển có trong",
  asciiEnd: ".",
};
