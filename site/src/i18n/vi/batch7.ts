// Tiếng Việt — đợt 7 (15 công cụ web về máy móc, đi dây và tài liệu; scope.ts SCOPE7). Theo mẫu ja/batch7.ts, nguồn dịch là bản tiếng Anh (site/I18N.md «7차 묶음 붙이는 법»).
// webTools = tên và giới thiệu công cụ, lib = chữ cho thư viện và script màn hình (câu tiếng Anh → bản dịch), pages = chữ của trang
import type { Page7Id, Scope7Path } from "../scope.ts";
import airConsumption from "./pages/airConsumption.ts";
import ballScrew from "./pages/ballScrew.ts";
import conveyorSpeed from "./pages/conveyorSpeed.ts";
import cylinder from "./pages/cylinder.ts";
import timingBelt from "./pages/timingBelt.ts";
import vacuumPad from "./pages/vacuumPad.ts";
import cableLabels from "./pages/cableLabels.ts";
import ferrules from "./pages/ferrules.ts";
import insulation from "./pages/insulation.ts";
import metricThreads from "./pages/metricThreads.ts";
import panelHeat from "./pages/panelHeat.ts";
import handover from "./pages/handover.ts";
import ioList from "./pages/ioList.ts";
import systemDiagram from "./pages/systemDiagram.ts";
import commissioning from "./pages/commissioning.ts";
import libAirConsumption from "./lib/airConsumption.ts";
import libBallScrew from "./lib/ballScrew.ts";
import libConveyor from "./lib/conveyor.ts";
import libCylinder from "./lib/cylinder.ts";
import libTimingBelt from "./lib/timingBelt.ts";
import libVacuumPad from "./lib/vacuumPad.ts";
import libCableLabels from "./lib/cableLabels.ts";
import libFerrules from "./lib/ferrules.ts";
import libInsulation from "./lib/insulation.ts";
import libPanelHeat from "./lib/panelHeat.ts";
import libHandover from "./lib/handover.ts";
import libIoList from "./lib/ioList.ts";
import libSysDiagram from "./lib/sysDiagram.ts";
import libSysDiff from "./lib/sysDiff.ts";
import libCommissioning from "./lib/commissioning.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/air-consumption/": { name: "Tính lượng tiêu thụ khí nén của xi lanh khí nén", blurb: "Đường kính, hành trình, áp suất và ống dẫn → lượng khí mỗi chu kỳ (L ANR), mỗi phút, lưu lượng khí cần và gợi ý cỡ máy nén khí." },
    "tools/ball-screw/": { name: "Tính mô-men xoắn vít me bi và chọn động cơ", blurb: "Khối lượng, tốc độ, thời gian tăng tốc và bước vít → tải dọc trục, tốc độ động cơ, mô-men tăng tốc/đều/giảm tốc, quán tính tải, mô-men RMS. Ngang hoặc đứng." },
    "tools/conveyor-speed/": { name: "Tính tốc độ băng tải ↔ tần số biến tần", blurb: "Đường kính con lăn, tỉ số truyền, số cực và độ trượt → tốc độ băng tải m/min, Hz cho tốc độ mục tiêu, tốc độ trên mỗi Hz." },
    "tools/cylinder-force/": { name: "Tính lực xi lanh khí nén", blurb: "Đường kính, cần và áp suất → lực đẩy ra và kéo về (N, kgf); chọn đường kính trong bảng SMC theo lực và hệ số tải." },
    "tools/timing-belt/": { name: "Tính chiều dài dây đai răng và khoảng cách trục", blurb: "Bước răng, số răng puly và khoảng cách trục → chiều dài và số răng dây đai, hoặc dây đai → khoảng cách trục. Đường kính bước, góc ôm, số răng ăn khớp, tốc độ." },
    "tools/vacuum-pad/": { name: "Tính lực nâng của đệm hút chân không", blurb: "Đường kính đệm, độ chân không và hệ số an toàn → lực nâng (N, kgf), độ chân không hoặc cỡ đệm cần thiết, thể tích ống và thời gian đáp ứng." },
    "tools/cable-labels/": { name: "Tạo nhãn cáp và nhãn đầu cốt", blurb: "Dãy số (W001–W120, X1:1–X1:40), tên I/O đã dán, nhãn hai đầu «A→B» — in trên giấy nhãn A4 (hàng, cột, lề tính bằng mm) hoặc xuất CSV và văn bản cho máy in nhãn." },
    "tools/ferrules/": { name: "Bảng cốt pin và đầu cốt bấm", blurb: "mm² hoặc AWG → màu vành cốt pin (DIN 46228-4 và mã Pháp), màu → cỡ, cấp cốt tròn (1.25, 2, 5.5) và bu lông. Chỉ các giá trị có nguồn." },
    "tools/insulation-resistance/": { name: "Kiểm tra điện trở cách điện", blurb: "Mạch SELV/PELV, ≤ 500 V hoặc > 500 V, điện áp thử và MΩ → so với mức tối thiểu của IEC 60364-6 (0.5 và 1 MΩ), kèm các bước an toàn trước khi thử." },
    "tools/metric-threads/": { name: "Bảng mũi khoan taro ren hệ mét và bu lông", blurb: "M2–M20 bước lớn và nhỏ, mũi khoan taro (d − P), cỡ khóa lục giác (ISO 4762) và cờ lê (ISO 4032), cỡ dụng cụ → ren." },
    "tools/panel-heat/": { name: "Tính tỏa nhiệt tủ điện và chọn quạt", blurb: "Tổng tổn hao nhiệt thiết bị, kích thước tủ và cách lắp (IEC 60890) → nhiệt tản tự nhiên, lưu lượng gió quạt m³/h (hiệu chỉnh độ cao), công suất máy làm mát và bộ sấy." },
    "tools/handover-pack/": { name: "Tạo hồ sơ bàn giao tại hiện trường", blurb: "JSON sơ đồ, JSON danh sách I/O, CSV checklist chạy thử, danh bạ và ghi chú → một tài liệu in được có bìa và mục lục. Lưu HTML hoặc in PDF, chỉ trong trình duyệt." },
    "tools/io-list/": { name: "Tạo danh sách I/O và thông số truyền thông", blurb: "Truyền thông theo từng thiết bị (RTU/TCP, unit ID, IP, baud) với tag, địa chỉ, mã hàm, kiểu, thứ tự word và tỉ lệ. Kiểm tra chồng lấn và ID trùng, nhập bản đồ thiết bị, CSV (Excel), JSON, in." },
    "tools/system-diagram/": { name: "Trình soạn sơ đồ hệ thống", blurb: "Đặt PC, PLC, HMI, biến tần và switch lên bus Ethernet hoặc RS-485. IP trùng, subnet, ID, điện trở cuối, unit load, thời gian polling, so sánh trước/sau; JSON, SVG, PNG." },
    "tools/commissioning-checklist/": { name: "Checklist chạy thử và bảo trì", blurb: "Lắp mới, kiểm tra định kỳ, mở rộng, thay thế hoặc tháo bỏ × PC, PLC, HMI, biến tần, RS-485, switch, nguồn 24 V — checklist theo giai đoạn. Lưu dấu tích và ghi chú, in, CSV." },
  } satisfies Record<Scope7Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    airConsumption: libAirConsumption,
    ballScrew: libBallScrew,
    conveyor: libConveyor,
    cylinder: libCylinder,
    timingBelt: libTimingBelt,
    vacuumPad: libVacuumPad,
    cableLabels: libCableLabels,
    ferrules: libFerrules,
    insulation: libInsulation,
    panelHeat: libPanelHeat,
    handover: libHandover,
    ioList: libIoList,
    sysDiagram: libSysDiagram,
    sysDiff: libSysDiff,
    commissioning: libCommissioning,
  },

  /** 쪽 글 */
  pages: { airConsumption, ballScrew, conveyorSpeed, cylinder, timingBelt, vacuumPad, cableLabels, ferrules, insulation, metricThreads, panelHeat, handover, ioList, systemDiagram, commissioning } satisfies Record<Page7Id, unknown>,
};
