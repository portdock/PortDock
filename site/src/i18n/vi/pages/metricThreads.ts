// metricThreads — tiếng Việt, cùng khóa với ja/pages/metricThreads.ts
export default {
  h1: "Bảng mũi khoan taro ren hệ mét và bu lông",
  desc: "Bước ren và mũi khoan taro (d − P) cho ren mét bước lớn và nhỏ M2–M20, cùng cỡ khóa lục giác (ISO 4762) và cờ lê (ISO 4032). Tra theo ren hoặc dụng cụ.",
  seo: "Bảng mũi khoan taro ren mét, cỡ khóa lục giác và cờ lê — PortDock",
  find: "Tra một loại ren",
  thread: "Ren (ví dụ M8, M10x1.25)",
  bad: "Không có trong bảng — hãy nhập M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 hoặc M20 kèm bước ren lớn hoặc nhỏ của nó.",
  k: { p: "Bước ren", kind: "Loại", coarse: "Bước lớn", fine: "Bước nhỏ", drill: "Mũi khoan taro ≈ d − P", key: "Khóa lục giác (vít đầu trụ ISO 4762)", sp: "Cờ lê (đai ốc ISO 4032, bu lông ISO 4014/4017)", din: "DIN 934 (tiêu chuẩn cũ)" },
  rev: "Tra theo cỡ dụng cụ",
  bySp: "Cờ lê (mm)",
  byKey: "Khóa lục giác (mm)",
  tTitle: "Bảng ren hệ mét (M2–M20)",
  tHead: ["Ren", "Bước lớn", "Mũi khoan taro", "Bước nhỏ (mũi khoan taro)", "Khóa lục giác", "Cờ lê"],
  tNote:
    "Mũi khoan taro d − P là giá trị gần đúng cho taro cắt. Trên thực tế hãy dùng mũi khoan gần nhất bạn có và điều chỉnh theo vật liệu và chiều sâu ren. Taro ép (cán ren) cần cỡ mũi khoan khác — xem bảng của nhà sản xuất taro. Cỡ cờ lê theo ISO 4032; đai ốc DIN 934 cũ là 17 mm cho M10, 19 mm cho M12 và 22 mm cho M14.",
  torqueTitle: "Mô-men siết",
  torque:
    "Mô-men siết bu lông phụ thuộc vào cấp bền (8.8, A2-70, v.v.), chất bôi trơn và vật liệu ghép; còn domino, aptomat và khởi động từ có mô-men do nhà sản xuất quy định (in trên sản phẩm hoặc trong bảng dữ liệu). Bảng này không có giá trị mô-men — hãy xem giá trị của nhà sản xuất và dùng tua vít lực.",
  privacy: "Trang này tra cứu ngay trong trình duyệt của bạn; những gì bạn nhập không được gửi tới máy chủ.",
  srcTitle: "Nguồn",
  see: ["Về cốt tròn vừa với bu lông, xem ", ". Để đổi giữa inch và mm, dùng ", "."],
  isoNut: "Đai ốc lục giác thường (kiểu 1)",
  dinNut: "tiêu chuẩn đai ốc lục giác trước đây",
  faqTitle: "Hỏi đáp",
  faq: [
    ["Vì sao mũi khoan taro là «d − P»?", "Đó là cách tính gần đúng thường dùng cho taro cắt (đường kính danh định trừ bước ren). Trên thực tế hãy dùng mũi khoan gần nhất bạn có và điều chỉnh theo vật liệu và chiều sâu ren. Taro ép (cán ren) cần mũi khoan khác — xem bảng của nhà sản xuất taro."],
    ["Cỡ cờ lê của tôi không khớp với bảng", "Đai ốc DIN 934 cũ dùng cỡ cờ lê khác với ISO 4032 ở M10, M12 và M14. Hãy xem giá trị «DIN 934» trong bảng."],
    ["Vì sao không có mô-men siết?", "Nó phụ thuộc vào cấp bền của bu lông, chất bôi trơn và vật liệu ghép; còn domino, aptomat và khởi động từ có mô-men riêng của nhà sản xuất. Hãy theo nhãn trên sản phẩm hoặc bảng dữ liệu."],
  ] as [string, string][],
};
