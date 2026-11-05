// 첫 화면(views/Home.astro) — 수는 화면에서 세어 넘긴다
export interface HomeCtx {
  /** 윈도우 프로그램 수(MCP 빼고) */
  nApps: number;
  /** MCP 서버도 공개했나 */
  mcp: boolean;
  /** 이 언어로 옮긴 웹 도구 수 */
  nWeb: number;
  /** PC 하드웨어 테스트 수 */
  nHw: number;
  nDevices: number;
  nGuides: number;
}

export default (c: HomeCtx) => ({
  seo: "PortDock — phần mềm test Serial, Modbus, TCP miễn phí",
  desc: `${c.nApps} chương trình Windows miễn phí${c.mcp ? " + MCP" : ""}: serial, Modbus master/slave, TCP, UDP, SCPI, vẽ đồ thị, kiểm tra cổng COM, mô phỏng PLC (MC), ghi mất Wi-Fi. Mã mở.`,
  sub: `${c.nApps} chương trình Windows để thử thiết bị serial, Modbus và TCP/UDP${c.mcp ? ", một máy chủ MCP cho AI" : ""} và ${c.nWeb} công cụ web không cần cài đặt. Tất cả miễn phí.`,
  dl: "Tải chương trình",
  dlSmall: "miễn phí · Windows 10/11",
  web: "Dùng ngay công cụ web",
  webSmall: "không cần cài",
  pcPre: "PC gặp sự cố? ",
  pcHw: "Kiểm tra micro, bàn phím, chuột, webcam (trên trình duyệt)",
  pcTester: "Ghi mất kết nối Wi-Fi và Bluetooth (Hardware Tester)",
  heroAlt: "Màn hình PortDock Serial — các byte nhận được và một phản hồi Modbus đã giải mã",
  heroCap: "PortDock Serial — màn hình ví dụ (dữ liệu mẫu, giao diện tiếng Anh)",
  appsTitle: `${c.nApps} chương trình Windows${c.mcp ? " + MCP" : ""}`,
  appsLead: "Mỗi việc một chương trình nhỏ — chỉ tải cái bạn cần. Giao diện chương trình có 12 ngôn ngữ, trong đó có tiếng Việt (trợ giúp bằng tiếng Hàn và tiếng Anh; ở màn hình ngôn ngữ khác là tiếng Anh).",
  screen: "– màn hình",
  soon: "Sắp ra mắt",
  webTitle: "Công cụ web — không cần cài",
  webLead: "Công cụ truyền thông và tính toán cho hiện trường, chạy ngay trên trình duyệt. Những gì bạn nhập không được gửi đi đâu.",
  hwTitle: `${c.nHw} bài kiểm tra phần cứng PC`,
  hwBody: "Kiểm tra micro, bàn phím, chuột, webcam, màn hình, loa và nhiều thứ khác ngay trên trình duyệt.",
  allWeb: `Tất cả ${c.nWeb} công cụ web bằng tiếng Việt`,
  guidesTitle: "Hướng dẫn và bảng thanh ghi",
  read: "Đọc",
  devTitle: `Bảng thanh ghi Modbus của ${c.nDevices} thiết bị công nghiệp`, // 링크 글 — 장비 맵이 그 언어로 없으면 화면이 «(영어)» 표시를 붙인다
  devBody: "Biến tần, bộ điều khiển nhiệt độ, đồng hồ đo điện năng — có nguồn tài liệu hướng dẫn, JSON",
  guidesEnTitle: `${c.nGuides} bài hướng dẫn thực hành (tiếng Anh)`,
  guidesEnBody: "Modbus không trả lời, đấu dây RS-485, cách ghi địa chỉ, vòng dòng 4–20 mA, bộ chuyển USB-serial hay rớt kết nối và nhiều nội dung khác.",
  allGuides: "Tất cả bài hướng dẫn (tiếng Anh)",
});
