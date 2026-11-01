// Luyện tập Modbus (views/ModbusPracticePage.astro) — gói 4. rtu là hai mảnh trước/sau liên kết tới công cụ chuyển RTU↔TCP (chữ liên kết do weave() chèn)
export default {
  title: "Bài tập trắc nghiệm Modbus",
  seo: "Trắc nghiệm Modbus RTU: khung, CRC, mã ngoại lệ — PortDock",
  desc: "Luyện tập Modbus RTU: HEX của lệnh đọc, giá trị 40003 trong phản hồi, ngoại lệ 83 02, thứ tự byte CRC, float ABCD và CDAB. Câu hỏi tự sinh, có lời giải.",
  kind: "Loại câu hỏi",
  mixed: "Ngẫu nhiên",
  check: "Kiểm tra đáp án",
  next: "Câu tiếp theo",
  reset: "Xóa điểm",
  answerLabel: "Đáp án",
  how: "Câu hỏi được tạo và chấm ngay trong trình duyệt của bạn. Điểm chỉ lưu trong trình duyệt này và không gửi đi đâu cả.",
  faqTitle: "Cách dùng",
  faq: [
    ["Dành cho ai?", "Kỹ sư mới và học viên đang học Modbus RTU, hoặc bất kỳ ai muốn ôn lại trước khi xuống công trường. Sau mỗi câu trả lời có lời giải và liên kết tới hướng dẫn, công cụ web liên quan."],
    ["Có thể gửi cùng một câu hỏi cho người khác không?", "Hãy sao chép “Liên kết tới câu hỏi này” bên dưới câu hỏi và gửi đi; liên kết mở đúng câu hỏi đó. Mỗi câu hỏi được tạo từ một con số (seed), nên cùng số thì cùng câu hỏi."],
    ["Câu trả lời tự luận viết thế nào?", "HEX không phân biệt dấu cách, chữ hoa/thường và tiền tố 0x (01 03 00 00 00 0A C5 CD giống 0103000000 0ac5cd). Giá trị viết ở thập phân; thêm 0x phía trước để nhập HEX."],
  ],
  srcTitle: "Tài liệu tham khảo",
  qlink: "Liên kết tới câu hỏi này",
  guidesTitle: "Hướng dẫn nên đọc kèm",
  src: ["mã hàm, cấu trúc lệnh hỏi/phản hồi, mã ngoại lệ", "khung RTU, CRC (byte thấp trước)", "float32. Thứ tự word của thanh ghi (ABCD, CDAB) không có trong đặc tả Modbus và khác nhau theo thiết bị"],
  rtu: ["Để chuyển khung qua lại giữa RTU, TCP và ASCII, hãy dùng ", "."],
};
