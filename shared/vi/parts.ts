// 베트남어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Vi<K extends string> = Partial<Record<K, string>>;

export const VI_SETTINGS: Vi<SettingsTextKey> = {
  title: "Cài đặt",
  lang: "Ngôn ngữ",
  theme: "Giao diện",
  system: "Theo Windows",
  light: "Sáng",
  dark: "Tối",
  fontSize: "Cỡ chữ (px)",
  timeFormat: "Dấu thời gian nhật ký",
  local: "hh:mm:ss.ms",
  localDate: "Ngày + giờ",
  utc: "UTC",
  elapsed: "Thời gian từ lúc bắt đầu (Xóa sẽ đặt lại)",
  maxLines: "Số dòng giữ trên màn hình",
  maxLinesHint: "Dòng cũ chỉ bị bỏ khỏi màn hình (tệp nhật ký giữ tất cả).",
  autoScroll: "Tự cuộn khi có dòng mới (dừng khi bạn cuộn lên)",
  alwaysOnTop: "Luôn ở trên — giữ cửa sổ này trên các cửa sổ khác (📌 ở thanh tiêu đề)",
  expandAll: "Mở hết (chế độ chuyên gia) — luôn mở các nhóm thu gọn (kết nối nâng cao, cài đặt nhận, tạo lỗi giả, thống kê …)",
  autoLog: "Bắt đầu ghi tệp khi kết nối",
  logFolder: "Thư mục tự ghi",
  choose: "Chọn",
  noFolder: "Chọn một thư mục",
  confirmExit: "Hỏi trước khi đóng khi đang kết nối hoặc đang ghi",
  lostAlert: "Nháy nút trên thanh tác vụ khi mất kết nối (khi cửa sổ ở nền)",
  keepAwake: "Giữ PC không ngủ khi đang kết nối hoặc đang ghi (màn hình vẫn có thể tắt)",
  autoConnect: "Mở lại kết nối lần trước khi khởi động",
  autoReport: "Tự động báo lỗi",
  arAsk: "Hỏi sau khi bị crash",
  arOn: "Tự động gửi",
  arOff: "Không bao giờ gửi",
  autoReportHint: "Chỉ gửi nguyên nhân lỗi chương trình (ngoại lệ, crash) và phiên bản chương trình/Windows. Không bao giờ gửi lưu lượng, lệnh, luật hay cài đặt IP. PC ngoại tuyến sẽ thử lại lần sau.",
  backup: "Sao lưu",
  exportAll: "Xuất cài đặt",
  importAll: "Nhập cài đặt",
  reset: "Về mặc định",
  resetAsk: "Đưa cài đặt hiển thị về mặc định? (lệnh và luật được giữ)",
  importAsk: "Nhập sẽ thay toàn bộ cài đặt, lệnh và luật hiện tại. Tiếp tục?",
  importBusy: "Hãy dừng kết nối và ghi trước khi nhập.",
  noFolderWarn: "Tự ghi sẽ không bắt đầu cho đến khi chọn thư mục.",
  close: "Đóng",
  about: "Giới thiệu",
  copyright: "Copyright (C) 2026 PortDock",
  gpl: "Chương trình này là phần mềm tự do, phát hành theo GNU GPL v3. KHÔNG CÓ BẤT KỲ BẢO HÀNH NÀO.",
  license: "Văn bản giấy phép",
  source: "Mã nguồn",
  site: "Trang web",
  notices: "Thông báo bên thứ ba",
  sponsor: "Ủng hộ",
  checkUpdate: "Kiểm tra cập nhật",
  checkUpdateHint: "Mở trang phát hành mới nhất trong trình duyệt.",
  updateCheck: "Kiểm tra phiên bản mới (mỗi ngày một lần)",
  updateCheckHint: "Khi bật, mỗi ngày hỏi GitHub (api.github.com) một lần chỉ về bản phát hành mới nhất và hiện thông báo ở cuối cửa sổ nếu có bản mới hơn. Không gửi dữ liệu; không tải hay cài gì.",
};

export const VI_HELP_UI: Vi<HelpUiKey> = {
  title: "Trợ giúp",
  search: "Tìm…",
  close: "Đóng",
  none: "Không tìm thấy",
  enOnly: "Trợ giúp chỉ có tiếng Anh (màn hình là tiếng Việt).",
};

export const VI_REPORT: Vi<ReportTextKey> = {
  button: "Báo sự cố — gửi lỗi cho nhà phát triển",
  title: "Báo sự cố",
  intro: "Báo cáo được tạo trên PC này và hiện bên dưới. Không có gì được gửi tự động. Hãy xem lại rồi chọn cách gửi.",
  what: "Đã xảy ra gì? (bạn đang làm gì, đã nhấn gì, kết quả mong đợi và thực tế)",
  whatPh: "vd. Cửa sổ bị treo khi bên thứ ba kết nối vào TCP server.",
  env: "Phiên bản chương trình và Windows (luôn kèm theo)",
  errors: "{n} lỗi trong phiên này",
  crashes: "{n} bản ghi crash",
  dumps: "Có kèm tệp dump ({n} KB)",
  dumpsSend: " — được tải lên khi «Gửi ngay»",
  dumpManual: "Khi gửi qua email hoặc GitHub, hãy tự đính kèm tệp dump (được giữ đến khi gửi hoặc bỏ): {a}",
  config: "Cài đặt kết nối và hiển thị (IP, cổng, baud … — không gồm lệnh và luật)",
  log: "{n} dòng lưu lượng gần nhất",
  logWarn: "Lưu lượng có thể chứa dữ liệu công ty hoặc thiết bị. Chỉ kèm khi được phép.",
  preview: "Xem trước báo cáo",
  copy: "Sao chép",
  copied: "Đã sao chép",
  saveFile: "Lưu ra tệp",
  saved: "Đã lưu: {a}",
  email: "Gửi qua email",
  emailHint: "Chương trình email sẽ mở. Báo cáo dài bị cắt, nên hãy đính kèm tệp từ «Lưu ra tệp».",
  issue: "Mở issue trên GitHub",
  issueHint: "Đăng công khai trên GitHub (cần tài khoản). Hãy chắc chắn không có dữ liệu công ty.",
  offline: "Trên PC ngoại tuyến, «Lưu ra tệp», chuyển bằng USB rồi gửi từ PC khác.",
  close: "Đóng",
  crashTitle: "Lần trước chương trình bị crash",
  crashBody: "Lần trước {a} đã đóng bất thường và để lại bản ghi crash. Gửi nó cho nhà phát triển sẽ giúp rất nhiều.",
  crashOpen: "Xem báo cáo",
  crashLater: "Để sau",
  crashDiscard: "Bỏ, không gửi",
  noTarget: "Chưa cấu hình nơi gửi. Hãy dùng «Lưu ra tệp».",
  sendNow: "Gửi ngay",
  sendNowHint: "Gửi bản xem trước ở trên thẳng tới nhà phát triển (cần Internet, không cần tài khoản).",
  sending: "Đang gửi…",
  sentOk: "Đã gửi. Cảm ơn bạn!",
  sendFail: "Không gửi được (kiểm tra kết nối Internet). Hãy «Lưu ra tệp» và gửi sau.",
  crashSend: "Gửi ngay",
  crashAlways: "Từ nay tự động gửi, không hỏi",
};

export const VI_AI_UI: Vi<AiUiKey> = {
  button: "Hỏi AI — chỉ sao chép, không gửi gì: tình huống hiện tại dạng văn bản cho chat AI, vào clipboard",
  title: "Sao chép để hỏi AI",
  introLog: "Tạo văn bản cho chat AI (kèm mẫu câu hỏi): chương trình, cài đặt kết nối, lỗi trong phiên này và lưu lượng gần đây.",
  introChecks: "Tạo văn bản cho chat AI (kèm mẫu câu hỏi): chương trình, lỗi trong phiên này và kết quả kiểm tra.",
  local: "PortDock không gửi gì đi đâu — chỉ đưa vào clipboard.",
  warn: "Mọi thứ bạn dán sẽ tới dịch vụ AI đó. Hãy kiểm tra thông tin thiết bị và công ty trước khi dán.",
  hideIp: "Che cả IP nội bộ (IP công cộng luôn được che)",
  incLog: "Kèm lưu lượng gần đây",
  incChecks: "Kèm kết quả kiểm tra",
  incFound: "Kèm thiết bị tìm thấy",
  introFound: "Tạo văn bản cho chat AI (kèm mẫu câu hỏi): chương trình, lỗi trong phiên này và các thiết bị tìm thấy.",
  preview: "Văn bản sẽ dán (xem trước)",
  size: "{n} / {max} ký tự",
  cut: " · đã bỏ {n} dòng cũ",
  cutText: " · đã cắt văn bản dài",
  copy: "Sao chép",
  copied: "Đã sao chép — dán vào chat AI (Ctrl+V) và điền «Tình huống».",
  copyFail: "Không sao chép được — có thể chương trình khác đang giữ clipboard",
  close: "Đóng",
};

export const VI_FIRST: Vi<FirstTextKey> = {
  hide: "Không hiện lại",
  help: "Trợ giúp:",
  narrow: "Cửa sổ hẹp nên bảng bên trái đã gập — «bên trái» dưới đây là bảng sau nút «⚙ {b}» ở góc trên bên trái.",
  open: "Mở bảng bên trái",
};

export const VI_UPDATE: Vi<UpdateTextKey> = {
  msg: "Đã có phiên bản {a} (bạn đang dùng {b}).",
  open: "Trang phát hành",
  later: "Không nhắc về phiên bản này nữa",
  close: "Đóng (sẽ hiện lại lần mở sau)",
};

export const VI_FILTER: Vi<FilterTextKey> = {
  find: "Tìm (Ctrl+F) — 01 03 hoặc văn bản",
  auto: "Tự động",
  hex: "HEX",
  text: "Văn bản",
  prev: "Trước (Shift+Enter)",
  next: "Sau (Enter)",
  hitsOnly: "Chỉ dòng khớp",
  failOnly: "Chỉ LỖI",
  all: "Tất cả",
  off: "Bỏ lọc (Esc)",
  badHex: "không phải HEX",
  none: "không có",
  shown: "{a}/{b} dòng",
};

export const VI_BOUNDARY: Vi<BoundaryTextKey> = {
  title: "Màn hình bị lỗi",
  body: "Gửi nội dung này cho nhà phát triển sẽ giúp sửa lỗi. Mở lại chương trình thường sẽ khôi phục.",
  report: "Báo sự cố",
  reload: "Tải lại",
  resetTip: "Nếu tải lại vẫn lỗi — xóa cài đặt màn hình đã lưu (kể cả danh sách lệnh và luật)",
  resetArm: "Thật sự đặt lại — nhấp lần nữa",
  reset: "Đặt lại cài đặt",
};

export const VI_USAGE: Partial<UsageText> = {
  title: "Gửi thống kê sử dụng?",
  why: "Biết tính năng nào được dùng giúp quyết định cải tiến gì tiếp theo. Nếu bật, các mục dưới đây được gửi ẩn danh một lần khi bạn đóng cửa sổ.",
  sendsTitle: "Được gửi",
  sends: ["Tên và phiên bản chương trình, phiên bản Windows (10/11), ngôn ngữ hiển thị", "Số phút chương trình mở", "Số lần dùng mỗi tính năng (kết nối, gửi, đọc … — chỉ số lần)", "Bản cài đặt hay bản portable"],
  neverTitle: "Không bao giờ gửi",
  never: ["Nội dung lưu lượng", "Địa chỉ IP, cổng, tên COM", "Đường dẫn tệp", "Tên PC, người dùng và thiết bị", "Bất kỳ ID nào nhận dạng bản cài hoặc PC"],
  where: "Nơi nhận: Aptabase (EU). Nếu ngoại tuyến hoặc gửi lỗi, dữ liệu bị bỏ. Câu trả lời của bạn cũng là giá trị ban đầu cho các ứng dụng PortDock khác trên PC này (chúng sẽ không hỏi lại), và mỗi ứng dụng có thể đổi bất cứ lúc nào trong Cài đặt (⚙).",
  yes: "Gửi",
  no: "Không gửi",
  setting: "Gửi thống kê sử dụng (ẩn danh, khi đóng)",
  hint: "Chỉ gửi số lần dùng tính năng, số phút mở, phiên bản chương trình/Windows, ngôn ngữ hiển thị và bản cài đặt/portable. Không bao giờ gửi lưu lượng, địa chỉ IP, cổng, tên COM, đường dẫn tệp và tên PC/người dùng/thiết bị. Nơi nhận: Aptabase (EU).",
};
