// Tiếng Việt — đợt 9 (bản đồ thanh ghi thiết bị: danh sách + 77 thiết bị, scope.ts SCOPE9). Mẫu: ja/batch9.ts.
// Không dịch: tên hãng và model, tên/mô tả/giá trị/bit/đơn vị thanh ghi, lưu ý, tên và trang tài liệu nguồn (dữ liệu giữ tiếng Anh — màn hình gắn lang="en").
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Biến tần (VFD)",
    "power-meter": "Đồng hồ điện",
    "temperature-controller": "Bộ điều khiển nhiệt độ",
    "panel-meter": "Đồng hồ gắn tủ",
    "servo-drive": "Bộ điều khiển servo",
    sensor: "Cảm biến",
    other: "Khác",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
