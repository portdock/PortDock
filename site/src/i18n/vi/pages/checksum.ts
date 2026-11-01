// Tính CRC và checksum (views/ChecksumPage.astro)
export default {
  title: "Tính CRC và checksum",
  seo: "Tính CRC16 Modbus và checksum trực tuyến — PortDock",
  desc: "Tính cùng lúc CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC (XOR), SUM8 và SUM16. Nhập HEX hoặc ASCII (\\r \\n \\xNN), kết quả theo thứ tự byte khi truyền.",
  input: "Dữ liệu",
  mode: "Kiểu nhập",
  kind: "Thuật toán",
  value: "Checksum (thứ tự byte khi truyền)",
  frame: "Dữ liệu + checksum",
  bytes: "byte",
  hexHelp: "ví dụ 01 03 00 00 00 0A · 01030000000A · 0x01,0x03",
  asciiHelp: "ví dụ STATUS?\\r\\n · \\x02DATA\\x03",
  howTitle: "Thuật toán",
  how: "Mọi phép tính chạy trong trình duyệt; những gì bạn nhập không được gửi đi đâu.",
  appNote: "Để gắn và kiểm tra checksum ngay khi giao tiếp với thiết bị, dùng",
  appLink: "PortDock Serial",
  faqTitle: "Câu hỏi thường gặp",
  faq: [
    ["Vì sao thứ tự byte CRC của Modbus RTU bị đảo?", "Modbus RTU gửi byte thấp của CRC16 trước. CRC của “01 03 00 00 00 0A” là 0xCDC5 và trên đường truyền là “C5 CD”."],
    ["CRC16 CCITT của tôi khác với máy tính khác", "CCITT có nhiều biến thể theo giá trị khởi tạo. “CRC16 CCITT” ở đây dùng giá trị khởi tạo 0xFFFF (CCITT-FALSE), còn “CRC16 XMODEM” dùng 0x0000. Kermit là một biến thể khác với thứ tự bit đảo."],
    ["LRC này có giống LRC của Modbus ASCII không?", "Cùng công thức (bù hai của tổng các byte), áp dụng trên byte thô. Với Modbus ASCII, hãy đổi các ký tự ra byte trước."],
  ],
};
