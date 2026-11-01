// Tiếng Việt — đợt 6 (15 công cụ web về điện; scope.ts SCOPE6). Theo mẫu ja/batch6.ts, nguồn dịch là bản tiếng Anh (site/I18N.md «6차 묶음 붙이는 법»).
// webTools = tên và giới thiệu công cụ, lib = chữ cho thư viện và script màn hình (câu tiếng Anh → bản dịch), pages = chữ của trang
import type { Page6Id, Scope6Path } from "../scope.ts";
import awgMm2 from "./pages/awgMm2.ts";
import conduitFill from "./pages/conduitFill.ts";
import ctRatio from "./pages/ctRatio.ts";
import energyPulse from "./pages/energyPulse.ts";
import heater from "./pages/heater.ts";
import ledResistor from "./pages/ledResistor.ts";
import motorCurrent from "./pages/motorCurrent.ts";
import motorSpeed from "./pages/motorSpeed.ts";
import resistor from "./pages/resistor.ts";
import pfCapacitor from "./pages/pfCapacitor.ts";
import psuSizing from "./pages/psuSizing.ts";
import affinity from "./pages/affinity.ts";
import reactance from "./pages/reactance.ts";
import power from "./pages/power.ts";
import voltageDrop from "./pages/voltageDrop.ts";
import libConduitFill from "./lib/conduitFill.ts";
import libCtRatio from "./lib/ctRatio.ts";
import libEnergyPulse from "./lib/energyPulse.ts";
import libHeater from "./lib/heater.ts";
import libLedResistor from "./lib/ledResistor.ts";
import libMotorCurrent from "./lib/motorCurrent.ts";
import libMotorSpeed from "./lib/motorSpeed.ts";
import libResistor from "./lib/resistor.ts";
import libPfCapacitor from "./lib/pfCapacitor.ts";
import libPsuSizing from "./lib/psuSizing.ts";
import libAffinity from "./lib/affinity.ts";
import libReactance from "./lib/reactance.ts";
import libPower from "./lib/power.ts";
import libVoltageDrop from "./lib/voltageDrop.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/awg-mm2/": { name: "Bảng quy đổi AWG sang mm²", blurb: "Đường kính và tiết diện AWG 0000 đến 40 (công thức ASTM B258), cỡ hệ mét gần nhất (IEC 60228), Ω/km của dây đồng. Quy đổi hai chiều." },
    "tools/conduit-fill/": { name: "Tính độ đầy ống luồn dây và máng cáp", blurb: "Đường kính và số lượng dây → độ đầy %. So với ống NEC 53/31/40 %, máng cáp kín 20 %, máng tủ điện NFPA 79 50 %; đường kính trong tối thiểu và số dây tối đa." },
    "tools/ct-ratio/": { name: "Tính tỉ số CT và tải thứ cấp", blurb: "Đổi dòng sơ cấp ↔ thứ cấp theo tỉ số CT, dây dẫn đi về + VA đồng hồ → tổng tải (VA, Ω) so với định mức, hệ số hiệu chỉnh tỉ số." },
    "tools/energy-pulse/": { name: "Tính xung công tơ điện", blurb: "imp/kWh, khoảng xung hay số xung → kW và kWh, hệ số nhân CT/VT, tần số và độ rộng xung ở đầy tải." },
    "tools/heater-power/": { name: "Tính công suất điện trở sấy (kW, dòng điện)", blurb: "Khối lượng, nhiệt dung riêng, độ tăng nhiệt và thời gian → kW điện trở sấy, kW cho chất lỏng chảy qua, dòng một pha và ba pha, công suất ở điện áp khác." },
    "tools/led-resistor/": { name: "Tính điện trở cho LED", blurb: "Nguồn, Vf, dòng điện và số LED nối tiếp → điện trở và công suất, dòng điện với giá trị E12/E24. Đèn báo 5, 12, 24 V." },
    "tools/motor-current/": { name: "Tính dòng điện động cơ", blurb: "kW (HP) ba pha, một pha hoặc DC → ampe, công suất đầu vào, kVA, mô-men. Hiệu suất từ nhãn." },
    "tools/motor-speed/": { name: "Tần số biến tần ↔ tốc độ động cơ", blurb: "Hz và số cực → tốc độ đồng bộ, độ trượt từ nhãn, tốc độ ra hộp giảm tốc, Hz cho tốc độ mong muốn." },
    "tools/parallel-resistor/": { name: "Tính điện trở song song và nối tiếp", blurb: "Tổng nối tiếp và song song, cách dòng điện chia, điện trở bổ sung cho giá trị mong muốn, các cặp E12/E24/E96." },
    "tools/pf-capacitor/": { name: "Tính tụ bù hệ số công suất", blurb: "kW, hệ số công suất hiện tại và mong muốn → kvar cần thiết, µF mỗi tụ khi đấu tam giác hay sao, dòng điện trước và sau khi bù." },
    "tools/power-supply-sizing/": { name: "Tính công suất nguồn 24 V DC", blurb: "Dòng điện, dòng khởi động và tỉ lệ làm việc của PLC, HMI, cảm biến, van, cuộn rơle → tổng, định mức có dự phòng (cỡ thường gặp), kiểm tra dòng khởi động, kênh bảo vệ mạch." },
    "tools/pump-fan-affinity/": { name: "Tính tốc độ và công suất bơm, quạt", blurb: "Tần số biến tần → lưu lượng, áp suất, công suất (định luật tương tự), chênh lệch điện năng mỗi năm, tần số cho lưu lượng mong muốn." },
    "tools/reactance/": { name: "Tính kháng trở và cộng hưởng LC", blurb: "Xc và XL ở một tần số, C hoặc L cho X mong muốn, tần số cộng hưởng và tổng trở LC, dòng điện và kvar của tụ." },
    "tools/three-phase-power/": { name: "Tính công suất ba pha", blurb: "Điện áp cùng ampe, kW hoặc kVA và hệ số công suất → kVA, kW, kvar và ampe; hệ số công suất từ kW và kVA." },
    "tools/voltage-drop/": { name: "Tính sụt áp và chọn cỡ dây", blurb: "DC, một pha và ba pha, mm² hoặc AWG, đồng hoặc nhôm → sụt áp và %, cỡ dây và chiều dài cho sụt áp cho phép." },
  } satisfies Record<Scope6Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다 — conduitFill 은 서버에서만 그린다) */
  lib: {
    conduitFill: libConduitFill,
    ctRatio: libCtRatio,
    energyPulse: libEnergyPulse,
    heater: libHeater,
    ledResistor: libLedResistor,
    motorCurrent: libMotorCurrent,
    motorSpeed: libMotorSpeed,
    resistor: libResistor,
    pfCapacitor: libPfCapacitor,
    psuSizing: libPsuSizing,
    affinity: libAffinity,
    reactance: libReactance,
    power: libPower,
    voltageDrop: libVoltageDrop,
  },

  /** 쪽 글 */
  pages: { awgMm2, conduitFill, ctRatio, energyPulse, heater, ledResistor, motorCurrent, motorSpeed, resistor, pfCapacitor, psuSizing, affinity, reactance, power, voltageDrop } satisfies Record<Page6Id, unknown>,
};
