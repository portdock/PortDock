// Quy đổi nhiệt độ Pt100 và cặp nhiệt điện (lỗi dải đo của lib/temperature.ts, tên loại và script màn hình của views/TemperaturePage.astro), đợt 5. Câu tiếng Anh → tiếng Việt (khóa giữ nguyên câu tiếng Anh trong mã, chỗ {} là {0} {1} …)
// «mV-to-temperature» và «measured mV (cold junction {} °C)» được dịch trước rồi chèn vào chỗ {1} của câu «Outside the type {} {} range …»
export default {
  "Type {}": "Loại {0}",
  "Type {} thermocouple": "Cặp nhiệt điện loại {0}",
  "Type {} (mV)": "Loại {0} (mV)",
  "Not a number: «{}»": "Không phải số: «{0}»",
  "Outside the RTD range ({} to {} °C)": "Ngoài dải của nhiệt điện trở RTD ({0} đến {1} °C)",
  "Resistance outside the range ({} to {} Ω)": "Điện trở ngoài dải ({0} đến {1} Ω)",
  "Outside the type {} range ({} to {} °C)": "Ngoài dải của loại {0} ({1} đến {2} °C)",
  "Outside the type {} {} range ({} to {} mV, {} to {} °C)": "Ngoài dải {1} của loại {0} ({2} đến {3} mV, {4} đến {5} °C)",
  "mV-to-temperature": "mV → nhiệt độ",
  "measured mV (cold junction {} °C)": "mV đo được (đầu lạnh {0} °C)",
};
