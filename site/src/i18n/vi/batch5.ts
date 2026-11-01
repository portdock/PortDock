// Tiếng Việt — đợt 5 (12 công cụ web tín hiệu, đơn vị, mạng; scope.ts SCOPE5). Theo mẫu ja/batch5.ts, nguồn dịch là bản tiếng Anh (site/I18N.md «5차 묶음 붙이는 법»).
import type { Page5Id, Scope5Path } from "../scope.ts";
import adc from "./pages/adc.ts";
import encoder from "./pages/encoder.ts";
import loopLoad from "./pages/loopLoad.ts";
import ntc from "./pages/ntc.ts";
import opAmp from "./pages/opAmp.ts";
import rcFilter from "./pages/rcFilter.ts";
import temperature from "./pages/temperature.ts";
import voltageDivider from "./pages/voltageDivider.ts";
import gigeBandwidth from "./pages/gigeBandwidth.ts";
import decibel from "./pages/decibel.ts";
import pressure from "./pages/pressure.ts";
import units from "./pages/units.ts";
import libAdc from "./lib/adc.ts";
import libEncoder from "./lib/encoder.ts";
import libLoopLoad from "./lib/loopLoad.ts";
import libNtc from "./lib/ntc.ts";
import libOpAmp from "./lib/opAmp.ts";
import libRcFilter from "./lib/rcFilter.ts";
import libTemperature from "./lib/temperature.ts";
import libVoltageDivider from "./lib/voltageDivider.ts";
import libGige from "./lib/gige.ts";
import libDecibel from "./lib/decibel.ts";
import libPressure from "./lib/pressure.ts";
import libUnits from "./lib/units.ts";

export default {
  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/adc/": { name: "Tính độ phân giải và scaling ADC", blurb: "Số bit, điện áp tham chiếu → 1 LSB, mã ↔ điện áp; 4–20 mA (shunt), 0–10 V (phân áp) → giá trị kỹ thuật, giá trị mỗi đơn vị đếm." },
    "tools/encoder/": { name: "Tính xung encoder ↔ rpm", blurb: "PPR, hệ số nhân → tần số ra và tốc độ đếm, rpm từ số xung đếm, rpm tối đa theo tần số đáp ứng, góc và quãng mỗi xung." },
    "tools/loop-load/": { name: "Tính tải vòng dòng 4–20 mA", blurb: "Nguồn vòng, điện áp tối thiểu transmitter, 250 Ω, điện trở dây → điện áp còn lại, điện trở tải tối đa, chiều dài cáp tối đa." },
    "tools/ntc/": { name: "Tính nhiệt điện trở NTC", blurb: "Điện trở ↔ nhiệt độ theo hệ số B hoặc Steinhart–Hart, điện áp phân áp, giá trị ADC, bảng nhiệt độ, tự gia nhiệt." },
    "tools/op-amp-gain/": { name: "Tính hệ số khuếch đại op-amp", blurb: "Hệ số không đảo, đảo, vi sai và dB, điện áp ra, sai số do độ lợi vòng hở, băng thông, điện trở tiêu chuẩn cho hệ số mục tiêu." },
    "tools/rc-filter/": { name: "Tính hằng số thời gian RC và tần số cắt", blurb: "R, C → τ, thời gian nạp đến 63 % và 99 %, tần số cắt, suy giảm và pha của lọc thông thấp bậc 1, R hoặc C cho fc." },
    "tools/temperature/": { name: "Quy đổi nhiệt độ Pt100 và cặp nhiệt điện", blurb: "Điện trở Pt100, Pt1000; mV ↔ nhiệt độ của cặp nhiệt điện K, J, T, E, N, R, S, B. Bù đầu lạnh, bảng nhiệt độ." },
    "tools/voltage-divider/": { name: "Tính điện trở phân áp", blurb: "Điện áp vào, ra → R1, R2, cặp tiêu chuẩn E12, E24, E96 theo sai số; tải, dòng, công suất, trở kháng ra, dung sai." },
    "tools/gige-bandwidth/": { name: "Tính băng thông camera GigE", blurb: "Độ phân giải, định dạng điểm ảnh, fps, số camera → MB/s, % của 1, 2.5, 5, 10 GbE, fps tối đa trong đường truyền." },
    "tools/db/": { name: "Đổi dB và dBm", blurb: "dBm ↔ mW, W; dBµV, dBV, dBu và vôn với 50, 75, 600 Ω; tỉ số công suất, điện áp ↔ dB." },
    "tools/pressure/": { name: "Đổi đơn vị áp suất", blurb: "bar, psi, kPa, MPa, kgf/cm², mmH₂O, mmHg cùng lúc. Áp suất tương đối ↔ tuyệt đối, bảng 4–20 mA cho dải cảm biến." },
    "tools/units/": { name: "Đổi đơn vị công nghiệp", blurb: "Lưu lượng m³/h, L/min, gpm; mô-men N·m, kgf·cm, lbf·ft; công suất kW, HP, PS, kcal/h; nhiệt độ °C, °F, K." },
  } satisfies Record<Scope5Path, { name: string; blurb: string }>,

  /** 라이브러리·화면 스크립트 문구 묶음(쪽의 Base libText 로 고른 묶음만 싣는다) */
  lib: {
    adc: libAdc,
    encoder: libEncoder,
    loopLoad: libLoopLoad,
    ntc: libNtc,
    opAmp: libOpAmp,
    rcFilter: libRcFilter,
    temperature: libTemperature,
    voltageDivider: libVoltageDivider,
    gige: libGige,
    decibel: libDecibel,
    pressure: libPressure,
    units: libUnits,
  },

  /** 쪽 글 */
  pages: { adc, encoder, loopLoad, ntc, opAmp, rcFilter, temperature, voltageDivider, gigeBandwidth, decibel, pressure, units } satisfies Record<Page5Id, unknown>,
};
