// Quy đổi nhiệt độ Pt100 và cặp nhiệt điện (views/TemperaturePage.astro) — đợt 5. Thuật ngữ: nhiệt điện trở (RTD), cặp nhiệt điện, sức điện động nhiệt, bù đầu lạnh, hàm tham chiếu
// Tên loại cặp nhiệt (loại K…) và câu lỗi ở bảng lib/temperature. src2 là hai mảnh trước và sau liên kết its90.nist.gov
// Liên kết sau mmNote là tên ứng dụng (PortDock Modbus Master, giữ nguyên), chữ liên kết sau nNote do màn hình lấy từ pageName()
export default {
  title: "Quy đổi nhiệt độ Pt100 và cặp nhiệt điện",
  seo: "Tính Pt100 và cặp nhiệt điện: Ω, mV ↔ °C — PortDock",
  desc: "Đổi điện trở Pt100/Pt1000 và mV của cặp nhiệt điện loại K, J, T, E, N, R, S, B sang nhiệt độ và ngược lại. Theo IEC 60751 và NIST ITS-90, có bù đầu lạnh.",
  rtdTitle: "Nhiệt điện trở (RTD)",
  sensor: "Cảm biến",
  temp: "Nhiệt độ (°C)",
  res: "Điện trở (Ω)",
  tcTitle: "Cặp nhiệt điện",
  type: "Loại",
  cj: "Nhiệt độ đầu lạnh (°C)",
  emf: "Điện áp đo được (mV)",
  emf0: "Sức điện động (đầu lạnh 0 °C)",
  range: "Dải",
  rtdNote: "α = 0.00385, -200 đến 850 °C",
  tcNote: "Nhiệt độ → mV tính trên toàn bộ «Dải»; mV → nhiệt độ chỉ trong dải của hàm ngược NIST.",
  tableTitle: "Bảng nhiệt độ",
  step: "Bước (°C)",
  tableNote: "Bảng cặp nhiệt điện dùng đầu lạnh 0 °C, giống bảng NIST.",
  how: "Mọi phép tính chạy trong trình duyệt; những gì bạn nhập không được gửi đi đâu. Giá trị ngoài dải được báo, không tính.",
  srcTitle: "Phương trình và nguồn",
  faqTitle: "Câu hỏi thường gặp",
  faq: [
    [
      "Bù đầu lạnh hoạt động thế nào?",
      "Điện áp của cặp nhiệt điện phụ thuộc vào chênh lệch giữa đầu đo và đầu lạnh (các cực nối). Cộng sức điện động của đầu lạnh vào mV đo được rồi đổi: E(t) = E đo + E(đầu lạnh). Ngược lại, giá trị đo dự kiến là E(t) − E(đầu lạnh).",
    ],
    [
      "Pt100 và Pt1000 khác nhau thế nào?",
      "Chỉ khác điện trở ở 0 °C (R0): 100 Ω hoặc 1000 Ω. Cả hai dùng cùng phương trình (α = 0.00385), nên ở mọi nhiệt độ Pt1000 có điện trở gấp mười lần Pt100.",
    ],
    [
      "Vì sao dải mV → nhiệt độ hẹp hơn?",
      "NIST công bố hàm ngược của hàm tham chiếu nhiệt độ → mV dưới dạng xấp xỉ từng đoạn. Công cụ này chỉ đổi mV → nhiệt độ ở nơi các xấp xỉ đó áp dụng, ví dụ loại K từ −200 đến 1372 °C, loại B từ 250 đến 1820 °C.",
    ],
  ],
  src1: "RTD: phương trình Callendar–Van Dusen của IEC 60751. R(t) = R0·[1 + A·t + B·t² + C·(t − 100)·t³], A = 3.9083×10⁻³, B = −5.775×10⁻⁷, C = −4.183×10⁻¹² (C = 0 từ 0 °C trở lên). Điện trở → nhiệt độ dùng nghiệm phương trình bậc hai từ 0 °C trở lên và phép lặp dưới 0 °C.",
  src2: [
    "Cặp nhiệt điện: các hàm tham chiếu E = Σ cᵢ·tⁱ (loại K cộng thêm a₀·exp(a₁·(t − a₂)²) trên 0 °C) và hệ số hàm ngược công bố trong NIST ITS-90 Thermocouple Database (NIST SRD 60, NIST Monograph 175), chép từ các tệp theo từng loại tại",
    ". mV → nhiệt độ bắt đầu từ hàm ngược rồi được tinh chỉnh theo hàm tham chiếu. Nhiệt độ → mV ở đây khớp mọi giá trị trong bảng NIST (0.001 mV).",
  ],
  rngHead: ["Nhiệt độ → mV", "mV → nhiệt độ"],
  mmNote: "Để đọc bộ điều khiển nhiệt độ hay transmitter qua Modbus, dùng",
  mmEnd: ".",
  nNote: "Với nhiệt điện trở NTC (hệ số B, Steinhart–Hart), dùng",
  nEnd: ".",
};
