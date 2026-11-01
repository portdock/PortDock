// 베트남어 — «Sao chép để hỏi AI» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const VI_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Dưới đây là nhật ký từ ${app}. Hãy liệt kê các nguyên nhân có thể của sự cố và thứ tự cần kiểm tra.`,
  ask2: "Cho biết nên xem cài đặt thiết bị, dây nối hay PC trước, và chỉ ra các dòng nhật ký làm căn cứ. Nếu chưa chắc, hãy cho biết cần kiểm tra thêm gì.",
  situation: "## Tình huống (điền sau khi dán)",
  situationLines: ["- Việc tôi định làm:", "- Kết quả mong đợi / thực tế:", "- Thiết bị (hãng, model) và cách kết nối:"],
  kinds: {
    pc: {
      ask: (app: string) => `Dưới đây là kết quả kiểm tra PC từ ${app}. Hãy liệt kê các nguyên nhân có thể của sự cố và thứ tự cần kiểm tra.`,
      ask2: "Cho biết nên xem cài đặt PC, driver, môi trường không dây (Wi-Fi, Bluetooth) hay router trước, và chỉ ra các dòng làm căn cứ. Nếu chưa chắc, hãy cho biết cần kiểm tra thêm gì.",
      situationLines: ["- Việc tôi định làm:", "- Kết quả mong đợi / thực tế:", "- PC và môi trường không dây (laptop/để bàn, có dây/không dây, model router hoặc thiết bị):"],
    },
    scan: {
      ask: (app: string) => `Dưới đây là danh sách thiết bị mạng do ${app} tìm thấy. Hãy giúp tôi tìm thiết bị đang cần, hoặc vì sao nó không hiện.`,
      ask2: "Cho biết nên xem dải địa chỉ (subnet), cài đặt IP của thiết bị, card mạng hay switch trước, và chỉ ra các dòng làm căn cứ. Nếu chưa chắc, hãy cho biết cần kiểm tra thêm gì.",
      situationLines: ["- Thiết bị đang tìm (hãng, model, IP đã biết):", "- Kết quả mong đợi / thực tế:", "- Cách PC và thiết bị kết nối (trực tiếp, switch, mạng nhà máy):"],
    },
    port: {
      ask: (app: string) => `Dưới đây là kết quả kiểm tra cổng từ ${app}. Hãy liệt kê các nguyên nhân có thể của sự cố và thứ tự cần kiểm tra.`,
      ask2: "Cho biết nên xem số cổng, driver, bộ chuyển USB hay cài đặt tiết kiệm điện trước, và chỉ ra các dòng làm căn cứ. Nếu chưa chắc, hãy cho biết cần kiểm tra thêm gì.",
      situationLines: ["- Việc tôi định làm:", "- Kết quả mong đợi / thực tế:", "- Bộ chuyển hoặc thiết bị (hãng, model) và cổng USB đã dùng:"],
    },
  },
  found: "## Thiết bị tìm thấy",
  program: "## Chương trình",
  state: "Trạng thái hiện tại",
  settings: "## Cài đặt kết nối",
  errors: (n: number) => `## Lỗi trong phiên này (${n})`,
  checks: "## Kết quả kiểm tra",
  log: (n: number) => `## Lưu lượng gần đây (${n} dòng)`,
  logFormat: "Định dạng: thời gian hướng [bên kia] HEX | văn bản | ghi chú do chương trình thêm",
  logEmpty: "(không có lưu lượng)",
  cutLines: (n: number, max: number) => `(đã bỏ ${n} dòng cũ để vừa ${max.toLocaleString("en-US")} ký tự)`,
  cutText: "…(đã cắt — quá dài)",
  masked: (ip: HideIp) => `_PortDock đã che: thư mục người dùng, tên PC (DESKTOP-… v.v.), 3 byte cuối của địa chỉ MAC, ${ip === "all" ? "mọi địa chỉ IP" : "địa chỉ IP công cộng"} («[IP-n]»)._`,
};
