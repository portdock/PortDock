// 산업 현장 단위 변환 — 웹 도구 «압력 단위 변환기» 와 «산업 단위 변환기(유량·토크·전력·온도)» 가 함께 쓴다.
// 환산 계수는 정의값(정확한 값)에서 곱해 만든다. 반올림된 표 값을 옮겨 적지 않는다.
// 근거:
//   SI 브로슈어 9판(BIPM, 2019 · 2025 갱신판) 표 8 — 1 L = 1 dm³, 1 bar = 0.1 MPa, 분·시간 / §2.3.1 — 섭씨 t/°C = T/K − 273.15
//   NIST SP 811(2008) 부록 B.8·B.9 — 표준 중력 가속도 9.806 65 m/s², 파운드 0.453 592 37 kg, 인치 0.0254 m, 피트 0.3048 m,
//     atm = 101 325 Pa, kgf/cm² = 98 066.5 Pa, mmH2O(관용) = 9.806 65 Pa, inH2O(관용) 249.0889 Pa,
//     mmHg(관용) 133.3224 Pa, inHg(관용) 3386.389 Pa, hp(550 ft·lbf/s) 745.6999 W, 미터 마력 735.4988 W, 전기 마력 746 W,
//     Btu_IT/h 0.293 0711 W, 냉동톤(12 000 Btu_IT/h) 3516.853 W, 영국 갤런 4.546 09 L, °F·°R 환산식
//   국제 칼로리 cal_IT = 4.1868 J, Btu_IT = 1055.055 852 62 J(NIST SP 811 B.8)

/** 표준 중력 가속도 m/s² */
export const G0 = 9.80665;
/** 파운드(상용) kg */
export const LB = 0.45359237;
export const INCH = 0.0254;
export const FOOT = 0.3048;
/** 파운드힘 N */
export const LBF = LB * G0;
export const BTU_IT = 1055.05585262;
export const CAL_IT = 4.1868;
/** 미국 갤런 = 231 in³ (m³) */
export const GAL_US = 231 * INCH ** 3;
/** 영국 갤런 (m³) */
export const GAL_UK = 4.54609e-3;
/** 표준 대기압 Pa */
export const ATM = 101325;

export type Lang2 = { ko: string; en: string };
export interface Unit {
  id: string;
  /** 표시 기호 */
  sym: string;
  name: Lang2;
  /** 이 단위 1 = SI 기준 단위로 몇(압력 Pa, 유량 m³/s, 토크 N·m, 전력 W) */
  f: number;
}

export type Qty = "pressure" | "flow" | "torque" | "power" | "temperature";

export const PRESSURE: Unit[] = [
  { id: "Pa", sym: "Pa", name: { ko: "파스칼", en: "pascal" }, f: 1 },
  { id: "kPa", sym: "kPa", name: { ko: "킬로파스칼", en: "kilopascal" }, f: 1e3 },
  { id: "MPa", sym: "MPa", name: { ko: "메가파스칼", en: "megapascal" }, f: 1e6 },
  { id: "bar", sym: "bar", name: { ko: "바", en: "bar" }, f: 1e5 },
  { id: "mbar", sym: "mbar", name: { ko: "밀리바", en: "millibar" }, f: 100 },
  { id: "psi", sym: "psi", name: { ko: "제곱인치당 파운드힘", en: "pound-force per square inch" }, f: LBF / INCH ** 2 },
  { id: "kgfcm2", sym: "kgf/cm²", name: { ko: "제곱센티미터당 킬로그램힘", en: "kilogram-force per cm²" }, f: G0 * 1e4 },
  { id: "mmH2O", sym: "mmH₂O", name: { ko: "수주 밀리미터(관용)", en: "millimetre of water (conventional)" }, f: G0 },
  { id: "mH2O", sym: "mH₂O", name: { ko: "수주 미터(관용)", en: "metre of water (conventional)" }, f: G0 * 1e3 },
  { id: "inH2O", sym: "inH₂O", name: { ko: "수주 인치(관용)", en: "inch of water (conventional)" }, f: G0 * 25.4 },
  { id: "mmHg", sym: "mmHg", name: { ko: "수은주 밀리미터(관용)", en: "millimetre of mercury (conventional)" }, f: 13.5951 * G0 },
  { id: "inHg", sym: "inHg", name: { ko: "수은주 인치(관용)", en: "inch of mercury (conventional)" }, f: 13.5951 * G0 * 25.4 },
  { id: "torr", sym: "Torr", name: { ko: "토르", en: "torr" }, f: ATM / 760 },
  { id: "atm", sym: "atm", name: { ko: "표준 대기압", en: "standard atmosphere" }, f: ATM },
];

export const FLOW: Unit[] = [
  { id: "m3h", sym: "m³/h", name: { ko: "시간당 세제곱미터", en: "cubic metre per hour" }, f: 1 / 3600 },
  { id: "m3min", sym: "m³/min", name: { ko: "분당 세제곱미터", en: "cubic metre per minute" }, f: 1 / 60 },
  { id: "m3s", sym: "m³/s", name: { ko: "초당 세제곱미터", en: "cubic metre per second" }, f: 1 },
  { id: "Lmin", sym: "L/min", name: { ko: "분당 리터", en: "litre per minute" }, f: 1e-3 / 60 },
  { id: "Ls", sym: "L/s", name: { ko: "초당 리터", en: "litre per second" }, f: 1e-3 },
  { id: "Lh", sym: "L/h", name: { ko: "시간당 리터", en: "litre per hour" }, f: 1e-3 / 3600 },
  { id: "gpmUS", sym: "gpm (US)", name: { ko: "분당 미국 갤런", en: "US gallon per minute" }, f: GAL_US / 60 },
  { id: "gpmUK", sym: "gpm (UK)", name: { ko: "분당 영국 갤런", en: "imperial gallon per minute" }, f: GAL_UK / 60 },
  { id: "cfm", sym: "cfm", name: { ko: "분당 세제곱피트", en: "cubic foot per minute" }, f: FOOT ** 3 / 60 },
];

export const TORQUE: Unit[] = [
  { id: "Nm", sym: "N·m", name: { ko: "뉴턴미터", en: "newton metre" }, f: 1 },
  { id: "kNm", sym: "kN·m", name: { ko: "킬로뉴턴미터", en: "kilonewton metre" }, f: 1e3 },
  { id: "mNm", sym: "mN·m", name: { ko: "밀리뉴턴미터", en: "millinewton metre" }, f: 1e-3 },
  { id: "kgfm", sym: "kgf·m", name: { ko: "킬로그램힘 미터", en: "kilogram-force metre" }, f: G0 },
  { id: "kgfcm", sym: "kgf·cm", name: { ko: "킬로그램힘 센티미터", en: "kilogram-force centimetre" }, f: G0 / 100 },
  { id: "gfcm", sym: "gf·cm", name: { ko: "그램힘 센티미터", en: "gram-force centimetre" }, f: G0 / 1e5 },
  { id: "lbfft", sym: "lbf·ft", name: { ko: "파운드힘 피트", en: "pound-force foot" }, f: LBF * FOOT },
  { id: "lbfin", sym: "lbf·in", name: { ko: "파운드힘 인치", en: "pound-force inch" }, f: LBF * INCH },
  { id: "ozfin", sym: "ozf·in", name: { ko: "온스힘 인치", en: "ounce-force inch" }, f: (LBF / 16) * INCH },
];

export const POWER: Unit[] = [
  { id: "W", sym: "W", name: { ko: "와트", en: "watt" }, f: 1 },
  { id: "kW", sym: "kW", name: { ko: "킬로와트", en: "kilowatt" }, f: 1e3 },
  { id: "hp", sym: "hp", name: { ko: "영국·미국 마력(550 ft·lbf/s)", en: "horsepower (550 ft·lbf/s)" }, f: 550 * LBF * FOOT },
  { id: "PS", sym: "PS", name: { ko: "미터 마력(75 kgf·m/s)", en: "metric horsepower (75 kgf·m/s)" }, f: 75 * G0 },
  { id: "hpE", sym: "hp (electric)", name: { ko: "전기 마력", en: "electric horsepower" }, f: 746 },
  { id: "kcalh", sym: "kcal/h", name: { ko: "시간당 킬로칼로리(IT)", en: "kilocalorie (IT) per hour" }, f: (CAL_IT * 1000) / 3600 },
  { id: "btuh", sym: "Btu/h", name: { ko: "시간당 Btu(IT)", en: "Btu (IT) per hour" }, f: BTU_IT / 3600 },
  { id: "RT", sym: "RT (US)", name: { ko: "냉동톤(미국, 12 000 Btu/h)", en: "ton of refrigeration (12 000 Btu/h)" }, f: (12000 * BTU_IT) / 3600 },
];

export const TEMPERATURE: Unit[] = [
  { id: "C", sym: "°C", name: { ko: "섭씨", en: "Celsius" }, f: 1 },
  { id: "F", sym: "°F", name: { ko: "화씨", en: "Fahrenheit" }, f: 5 / 9 },
  { id: "K", sym: "K", name: { ko: "켈빈", en: "kelvin" }, f: 1 },
  { id: "R", sym: "°R", name: { ko: "랭킨", en: "Rankine" }, f: 5 / 9 },
];

export const UNITS: Record<Qty, Unit[]> = { pressure: PRESSURE, flow: FLOW, torque: TORQUE, power: POWER, temperature: TEMPERATURE };

export const unit = (q: Qty, id: string) => {
  const u = UNITS[q].find((x) => x.id === id);
  if (!u) throw new RangeError(`unit ${id}`);
  return u;
};

/** 온도 → 켈빈 */
export function toKelvin(v: number, id: string) {
  switch (id) {
    case "C":
      return v + 273.15;
    case "K":
      return v;
    case "F":
      return ((v - 32) * 5) / 9 + 273.15;
    case "R":
      return (v * 5) / 9;
  }
  throw new RangeError(`unit ${id}`);
}

/** 켈빈 → 온도 */
export function fromKelvin(k: number, id: string) {
  switch (id) {
    case "C":
      return k - 273.15;
    case "K":
      return k;
    case "F":
      return ((k - 273.15) * 9) / 5 + 32;
    case "R":
      return (k * 9) / 5;
  }
  throw new RangeError(`unit ${id}`);
}

/**
 * 값 하나를 다른 단위로. 온도는 눈금 값(°C ↔ °F 는 32 를 더하고 뺌)이다.
 * 온도 «차이»(예: 10 °C 오름 = 18 °F 오름)는 diff = true 로 — 계수만 곱한다.
 */
export function convert(q: Qty, v: number, from: string, to: string, diff = false) {
  if (!Number.isFinite(v)) throw new RangeError("value");
  if (q === "temperature" && !diff) {
    const k = toKelvin(v, from);
    if (k < -1e-9) throw new RangeError("below absolute zero");
    return fromKelvin(k, to);
  }
  return (v * unit(q, from).f) / unit(q, to).f;
}

/** 한 값을 그 양의 모든 단위로 */
export const convertAll = (q: Qty, v: number, from: string, diff = false) => UNITS[q].map((u) => ({ u, v: convert(q, v, from, u.id, diff) }));

/** 게이지 압력 ↔ 절대 압력 (Pa). 대기압 기본값은 표준 대기압 — 실제 대기압은 고도·날씨에 따라 다르다 */
export const gaugeToAbs = (gaugePa: number, atmPa = ATM) => gaugePa + atmPa;
export const absToGauge = (absPa: number, atmPa = ATM) => absPa - atmPa;

/** 유효 숫자 n 자리로 보기 좋게(지수 표기는 아주 크거나 작을 때만) */
export function fmt(x: number, sig = 6) {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e9 || a < 1e-6) return x.toExponential(sig - 1).replace(/\.?0+e/, "e");
  const s = x.toPrecision(sig);
  return (s.includes("e") ? Number(s).toString() : s.includes(".") ? s.replace(/\.?0+$/, "") : s);
}
