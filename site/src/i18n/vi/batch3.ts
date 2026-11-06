// Tiếng Việt — gói 3 (10 công cụ web kiểm tra phần cứng PC, scope.ts SCOPE3). Cùng dạng với ja/batch3.ts; dịch từ bản tiếng Anh (site/I18N.md «3차 묶음 붙이는 법»).
// webTools = 도구 이름·한 줄 소개, hwPrivacy = 하드웨어 테스트 쪽 개인정보 줄(components/HwPrivacy.astro), lib = 라이브러리·화면 스크립트 문구(영어 문장 → 번역), pages = 쪽 글
import type { Page3Id, Scope3Path } from "../scope.ts";
import micTest from "./pages/micTest.ts";
import keyboardTest from "./pages/keyboardTest.ts";
import webcamTest from "./pages/webcamTest.ts";
import speakerTest from "./pages/speakerTest.ts";
import mouseTest from "./pages/mouseTest.ts";
import gamepadTest from "./pages/gamepadTest.ts";
import monitorTest from "./pages/monitorTest.ts";
import bsodCodes from "./pages/bsodCodes.ts";
import barcodeTest from "./pages/barcodeTest.ts";
import libHwSignal from "./lib/hwSignal.ts";
import libBsod from "./lib/bsod.ts";
import libBarcode from "./lib/barcode.ts";
import libInputTiming from "./lib/inputTiming.ts";
import libKeyboardLayout from "./lib/keyboardLayout.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/mic-test/": { name: "Kiểm tra micro", blurb: "Đồng hồ mức âm vào, tần số lấy mẫu thực, nền tạp âm, clipping, so sánh khử tiếng vang bật/tắt và ghi âm 5 giây nghe lại ngay trên máy." },
    "tools/keyboard-test/": { name: "Kiểm tra bàn phím (dội phím, nhấn nhiều phím)", blurb: "Phím đã nhấn trên bố cục ANSI, ISO hoặc tiếng Hàn 106, số phím cùng lúc, số lần mỗi phím, nghi dội phím (ms) và các phím trình duyệt không nhận." },
    "tools/webcam-test/": { name: "Kiểm tra webcam", blurb: "Xem trước, độ phân giải yêu cầu so với thực tế, đo fps và chọn camera. Hình ảnh không được lưu hay gửi đi." },
    "tools/speaker-test/": { name: "Kiểm tra loa trái phải", blurb: "Trái, phải, cả hai, từng kênh 5.1 và 7.1, kiểm tra cực tính, quét tần số, âm chuẩn và chọn thiết bị đầu ra." },
    "tools/mouse-test/": { name: "Kiểm tra double click chuột", blurb: "Năm nút và bốn hướng con lăn, khoảng cách double click (ms), nghi dội nút, kéo bị đứt và ước lượng polling rate." },
    "tools/gamepad-test/": { name: "Kiểm tra tay cầm (drift cần analog, vùng chết)", blurb: "Nút, cò và trục theo thời gian thực, độ lệch và vết của cần analog khi thả, xem trước vùng chết và rung (trên trình duyệt hỗ trợ)." },
    "tools/monitor-test/": { name: "Kiểm tra điểm chết và tần số quét màn hình", blurb: "Màu toàn màn hình để tìm điểm chết, điểm kẹt, phân dải màu trên dải chuyển, ước lượng tần số quét và thanh chạy để xem bóng mờ." },
    "tools/bsod-codes/": { name: "Tra mã dừng màn hình xanh", blurb: "Dán mã như 0xD1, 0x133, tên mã hoặc thông báo sự kiện 1001 để xem ý nghĩa, nguyên nhân khả dĩ, thứ tự kiểm tra và tài liệu Microsoft." },
    "tools/barcode-scanner-test/": { name: "Kiểm tra máy quét mã vạch", blurb: "Chuỗi đã nhận kèm Enter, Tab, GS, khoảng cách ms giữa ký tự (máy quét hay người gõ), lỗi do bộ gõ, Caps Lock và giải mã AI GS1." },
  } satisfies Record<Scope3Path, { name: string; blurb: string }>,

  /** 하드웨어 테스트 쪽의 개인정보 줄 — ads·tester 는 링크 앞뒤 조각(링크 글 «PortDock Hardware Tester» 는 그대로) */
  hwPrivacy: {
    media: "Quyền riêng tư: hình ảnh camera và âm thanh micro chỉ được xử lý trong trình duyệt này, không lưu và không tải lên — dữ liệu camera, micro và tên thiết bị không được gửi ra ngoài.",
    input: "Quyền riêng tư: phím, nút và chuyển động bạn thực hiện chỉ được đếm trong trình duyệt này và không được gửi ra ngoài.",
    output: "Quyền riêng tư: công cụ này chỉ phát hình và tiếng, không gửi nội dung kiểm tra ra ngoài.",
    ads: [" Quảng cáo trên trang này (Google AdSense) hoạt động riêng — xem ", "chính sách quyền riêng tư", "."],
    tester: ["Để ghi lại theo thời gian các lần mất Wi-Fi, mất Internet hay kết nối và ngắt Bluetooth, hãy dùng chương trình Windows ", " (miễn phí)."],
  },

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    hwSignal: libHwSignal,
    bsod: libBsod,
    barcode: libBarcode,
    inputTiming: libInputTiming,
    keyboardLayout: libKeyboardLayout,
  },

  /** 쪽 글 */
  pages: { micTest, keyboardTest, webcamTest, speakerTest, mouseTest, gamepadTest, monitorTest, bsodCodes, barcodeTest } satisfies Record<Page3Id, unknown>,
};
