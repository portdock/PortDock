// I2C — 웹 도구 «I2C 도구 (풀업 저항·주소표·바이트 풀이)». 값만, 화면 문구는 쪽(I2cPage.astro).
// 근거: NXP UM10204 «I2C-bus specification and user manual» Rev. 7.0(2021-10-01)
//   표 10(SDA·SCL 특성): VOL = 0.4 V(싱크 3 mA, VDD > 2 V — Sm·Fm·Fm+), VOL = 0.2·VDD(2 mA, VDD ≤ 2 V — Fm·Fm+),
//     IOL(VOL = 0.4 V) = 3 mA(Sm·Fm)·20 mA(Fm+), tr = 1000 ns(Sm)·300 ns(Fm)·120 ns(Fm+), Cb 최대 400 pF(Sm·Fm)·550 pF(Fm+)
//   §7.1 풀업 저항: Rp(min) = (VDD − VOL(max)) ÷ IOL, Rp(max) = tr ÷ (0.8473 × Cb)
//     (0.8473 = ln(0.7 ÷ 0.3) — RC 충전으로 0.3·VDD 에서 0.7·VDD 까지 가는 시간이 RC × 0.8473)
//   표 4(예약 주소): 0000 000 일반 호출·START 바이트, 0000 001 CBUS, 0000 010 다른 버스 형식, 0000 011 앞으로 쓸 것,
//     0000 1XX Hs 모드 마스터 코드, 1111 1XX 장치 ID, 1111 0XX 10비트 주소
//   §3.1.10·3.1.11 10비트 주소: 첫 바이트 1111 0XX + R/W, 둘째 바이트 = 아래 8비트

export type Mode = "sm" | "fm" | "fmp";

export const SPEC: Record<Mode, { name: string; khz: number; trNs: number; iolMa: number; cbMaxPf: number }> = {
  sm: { name: "Standard-mode", khz: 100, trNs: 1000, iolMa: 3, cbMaxPf: 400 },
  fm: { name: "Fast-mode", khz: 400, trNs: 300, iolMa: 3, cbMaxPf: 400 },
  fmp: { name: "Fast-mode Plus", khz: 1000, trNs: 120, iolMa: 20, cbMaxPf: 550 },
};

export interface Pullup {
  /** Ω */
  rpMin: number;
  rpMax: number;
  vol: number;
  iolMa: number;
  /** 최소 > 최대면 이 용량·속도로는 맞는 저항이 없다 */
  ok: boolean;
  /** 버스 용량이 규격 최대를 넘음 */
  overCb: boolean;
  lowVdd: boolean;
}

export function pullup(vdd: number, cbPf: number, mode: Mode): Pullup {
  if (!(vdd > 0) || !(cbPf > 0)) throw new RangeError("input");
  const s = SPEC[mode];
  const lowVdd = vdd <= 2;
  const vol = lowVdd ? 0.2 * vdd : 0.4;
  const iolMa = lowVdd ? 2 : s.iolMa;
  const rpMin = (vdd - vol) / (iolMa / 1000);
  const rpMax = (s.trNs * 1e-9) / (0.8473 * cbPf * 1e-12);
  return { rpMin, rpMax, vol, iolMa, ok: rpMin <= rpMax, overCb: cbPf > s.cbMaxPf, lowVdd };
}

/** 저항 Rp·용량 Cb 의 상승 시간(0.3 → 0.7 VDD) ns */
export const riseNs = (rp: number, cbPf: number) => 0.8473 * rp * cbPf * 1e-3;

/** 7비트 주소 → 8비트 쓰기·읽기 바이트 */
export const addr8 = (a7: number) => ({ write: (a7 << 1) & 0xff, read: ((a7 << 1) | 1) & 0xff });

/** UM10204 표 4 — 예약 주소면 그 이름 키 */
export function reserved(a7: number): "general" | "cbus" | "other" | "future" | "hs" | "ten" | "devid" | undefined {
  if (a7 === 0) return "general";
  if (a7 === 1) return "cbus";
  if (a7 === 2) return "other";
  if (a7 === 3) return "future";
  if (a7 >= 4 && a7 <= 7) return "hs";
  if (a7 >= 0x78 && a7 <= 0x7b) return "ten";
  if (a7 >= 0x7c) return "devid";
  return undefined;
}

export interface Chip {
  chip: string;
  kind: { ko: string; en: string };
  /** 7비트 주소들(핀·부품 번호로 고름) */
  addrs: number[];
  /** 주소 고르는 법 — 짧게 */
  pins: { ko: string; en: string };
}

const r = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const K = {
  eeprom: { ko: "EEPROM", en: "EEPROM" },
  rtc: { ko: "RTC(시계)", en: "RTC" },
  th: { ko: "온도·습도", en: "Temperature/humidity" },
  temp: { ko: "온도", en: "Temperature" },
  press: { ko: "기압·온도", en: "Pressure/temperature" },
  imu: { ko: "가속도·자이로(IMU)", en: "Accel/gyro (IMU)" },
  acc: { ko: "가속도", en: "Accelerometer" },
  mag: { ko: "지자기", en: "Magnetometer" },
  oled: { ko: "OLED 표시기", en: "OLED display" },
  io: { ko: "I/O 확장", en: "I/O expander" },
  pwm: { ko: "PWM(서보) 구동", en: "PWM/servo driver" },
  adc: { ko: "ADC", en: "ADC" },
  dac: { ko: "DAC", en: "DAC" },
  pwr: { ko: "전류·전력 감시", en: "Current/power monitor" },
  mux: { ko: "I2C 멀티플렉서", en: "I2C multiplexer" },
  tof: { ko: "거리(ToF)", en: "Distance (ToF)" },
  light: { ko: "조도", en: "Light" },
  gas: { ko: "공기질·CO2", en: "Air quality / CO2" },
  enc: { ko: "자기 각도 센서", en: "Magnetic angle sensor" },
  touch: { ko: "정전 터치", en: "Capacitive touch" },
  clk: { ko: "클럭 발생기", en: "Clock generator" },
  sec: { ko: "보안 칩", en: "Secure element" },
  gauge: { ko: "배터리 잔량계", en: "Battery fuel gauge" },
  hr: { ko: "심박·SpO2", en: "Heart rate / SpO2" },
};
const P = (ko: string, en: string) => ({ ko, en });
const FIXED = P("고정", "Fixed");

/** 흔한 칩 — 데이터시트의 I2C 주소(7비트). 모듈 보드는 주소 핀을 다르게 묶을 수 있다 */
export const CHIPS: Chip[] = [
  { chip: "24C02 · 24LC256 · AT24Cxx", kind: K.eeprom, addrs: r(0x50, 0x57), pins: P("A2·A1·A0 핀(용량 큰 부품은 일부 핀이 블록 선택)", "A2/A1/A0 pins (larger parts use some bits for block select)") },
  { chip: "DS1307", kind: K.rtc, addrs: [0x68], pins: FIXED },
  { chip: "DS3231", kind: K.rtc, addrs: [0x68], pins: FIXED },
  { chip: "PCF8523", kind: K.rtc, addrs: [0x68], pins: FIXED },
  { chip: "PCF8563", kind: K.rtc, addrs: [0x51], pins: FIXED },
  { chip: "MCP7940N", kind: K.rtc, addrs: [0x6f], pins: FIXED },
  { chip: "SHT30 · SHT31 · SHT35", kind: K.th, addrs: [0x44, 0x45], pins: P("ADDR 핀 Low/High", "ADDR pin low/high") },
  { chip: "SHTC3", kind: K.th, addrs: [0x70], pins: FIXED },
  { chip: "Si7021 · HTU21D", kind: K.th, addrs: [0x40], pins: FIXED },
  { chip: "HDC1080", kind: K.th, addrs: [0x40], pins: FIXED },
  { chip: "AHT20", kind: K.th, addrs: [0x38], pins: FIXED },
  { chip: "TMP102", kind: K.temp, addrs: r(0x48, 0x4b), pins: P("ADD0 을 GND·V+·SDA·SCL 에", "ADD0 to GND, V+, SDA or SCL") },
  { chip: "LM75", kind: K.temp, addrs: r(0x48, 0x4f), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "MCP9808", kind: K.temp, addrs: r(0x18, 0x1f), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "BMP280 · BME280", kind: K.press, addrs: [0x76, 0x77], pins: P("SDO 핀 GND/VDDIO", "SDO pin to GND/VDDIO") },
  { chip: "BMP180", kind: K.press, addrs: [0x77], pins: FIXED },
  { chip: "MPU-6050 · MPU-9250 · ICM-20948", kind: K.imu, addrs: [0x68, 0x69], pins: P("AD0 핀 — 0x68 은 DS1307·DS3231 과 겹침", "AD0 pin — 0x68 clashes with DS1307/DS3231") },
  { chip: "LSM6DS3", kind: K.imu, addrs: [0x6a, 0x6b], pins: P("SDO/SA0 핀", "SDO/SA0 pin") },
  { chip: "BNO055", kind: K.imu, addrs: [0x28, 0x29], pins: P("COM3 핀", "COM3 pin") },
  { chip: "ADXL345", kind: K.acc, addrs: [0x53, 0x1d], pins: P("ALT ADDRESS 핀 Low → 0x53, High → 0x1D", "ALT ADDRESS pin low → 0x53, high → 0x1D") },
  { chip: "LIS3DH", kind: K.acc, addrs: [0x18, 0x19], pins: P("SDO/SA0 핀", "SDO/SA0 pin") },
  { chip: "MMA8451Q", kind: K.acc, addrs: [0x1c, 0x1d], pins: P("SA0 핀", "SA0 pin") },
  { chip: "HMC5883L", kind: K.mag, addrs: [0x1e], pins: FIXED },
  { chip: "QMC5883L", kind: K.mag, addrs: [0x0d], pins: FIXED },
  { chip: "SSD1306 · SH1106", kind: K.oled, addrs: [0x3c, 0x3d], pins: P("SA0(D/C#) 핀", "SA0 (D/C#) pin") },
  { chip: "PCF8574", kind: K.io, addrs: r(0x20, 0x27), pins: P("A2·A1·A0 — 문자 LCD 백팩에 흔함", "A2/A1/A0 — common on character LCD backpacks") },
  { chip: "PCF8574A", kind: K.io, addrs: r(0x38, 0x3f), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "MCP23017 · MCP23008", kind: K.io, addrs: r(0x20, 0x27), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "PCA9685", kind: K.pwm, addrs: r(0x40, 0x77), pins: P("A5~A0(6핀). 0x70 은 기본 All Call 주소와 겹침, 0x78 이상은 I2C 예약", "A5–A0 (6 pins). 0x70 clashes with the default All Call address; 0x78 and up are reserved by I2C") },
  { chip: "ADS1115 · ADS1015", kind: K.adc, addrs: r(0x48, 0x4b), pins: P("ADDR 을 GND·VDD·SDA·SCL 에", "ADDR to GND, VDD, SDA or SCL") },
  { chip: "PCF8591", kind: K.adc, addrs: r(0x48, 0x4f), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "MCP4725", kind: K.dac, addrs: r(0x60, 0x67), pins: P("부품 번호(A0~A3 판) + A0 핀", "Part variant (A0–A3) + A0 pin") },
  { chip: "INA219 · INA226", kind: K.pwr, addrs: r(0x40, 0x4f), pins: P("A1·A0 을 GND·VS·SDA·SCL 에", "A1/A0 to GND, VS, SDA or SCL") },
  { chip: "TCA9548A · PCA9548A", kind: K.mux, addrs: r(0x70, 0x77), pins: P("A2·A1·A0", "A2/A1/A0") },
  { chip: "VL53L0X · VL53L1X", kind: K.tof, addrs: [0x29], pins: P("기본값 — 소프트웨어로 바꿈", "Default — changed in software") },
  { chip: "BH1750", kind: K.light, addrs: [0x23, 0x5c], pins: P("ADDR 핀 Low → 0x23, High → 0x5C", "ADDR pin low → 0x23, high → 0x5C") },
  { chip: "TSL2561", kind: K.light, addrs: [0x29, 0x39, 0x49], pins: P("ADDR SEL 핀 GND·뜸·VDD", "ADDR SEL pin GND, float, VDD") },
  { chip: "VEML7700", kind: K.light, addrs: [0x10], pins: FIXED },
  { chip: "APDS-9960", kind: K.light, addrs: [0x39], pins: FIXED },
  { chip: "CCS811", kind: K.gas, addrs: [0x5a, 0x5b], pins: P("ADDR 핀", "ADDR pin") },
  { chip: "SGP30", kind: K.gas, addrs: [0x58], pins: FIXED },
  { chip: "SCD30", kind: K.gas, addrs: [0x61], pins: FIXED },
  { chip: "SCD40 · SCD41", kind: K.gas, addrs: [0x62], pins: FIXED },
  { chip: "AS5600", kind: K.enc, addrs: [0x36], pins: FIXED },
  { chip: "MPR121", kind: K.touch, addrs: r(0x5a, 0x5d), pins: P("ADDR 을 GND·VDD·SDA·SCL 에", "ADDR to GND, VDD, SDA or SCL") },
  { chip: "Si5351A", kind: K.clk, addrs: [0x60], pins: P("기본값(일부 판 0x61)", "Default (0x61 on some variants)") },
  { chip: "ATECC608", kind: K.sec, addrs: [0x60], pins: P("공장 기본값(8비트 0xC0) — 설정으로 바꿈", "Factory default (8-bit 0xC0) — configurable") },
  { chip: "MAX17048", kind: K.gauge, addrs: [0x36], pins: FIXED },
  { chip: "MAX30102", kind: K.hr, addrs: [0x57], pins: FIXED },
];

/** 주소 → 그 주소를 쓸 수 있는 칩 */
export const chipsAt = (a7: number) => CHIPS.filter((c) => c.addrs.includes(a7));

// ---------------- 바이트 풀이
export type Tok =
  | { t: "S" }
  | { t: "Sr" }
  | { t: "P" }
  | { t: "A" }
  | { t: "N" }
  | { t: "B"; v: number };

/** «S 0xA0 A 0x00 A Sr 0xA1 A 0x12 N P» 또는 «A0 00 A1 12» 를 토큰으로 */
export function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  for (const raw of s.split(/[\s,;]+/).filter(Boolean)) {
    const w = raw.replace(/[[\]()]/g, "");
    if (!w) continue;
    const u = w.toUpperCase();
    if (u === "S" || u === "START") out.push({ t: "S" });
    else if (u === "SR" || u === "RS" || u === "RESTART") out.push({ t: "Sr" });
    else if (u === "P" || u === "STOP") out.push({ t: "P" });
    else if (u === "A" || u === "ACK" || u === "K") out.push({ t: "A" });
    else if (u === "N" || u === "NA" || u === "NAK" || u === "NACK") out.push({ t: "N" });
    else if (/^0X[0-9A-F]{1,2}$/.test(u)) out.push({ t: "B", v: parseInt(u.slice(2), 16) });
    else if (/^[0-9A-F]{2}$/.test(u)) out.push({ t: "B", v: parseInt(u, 16) });
    else if (/^([0-9A-F]{2})+$/.test(u)) for (const h of u.match(/../g)!) out.push({ t: "B", v: parseInt(h, 16) });
    else throw new RangeError(raw);
  }
  return out;
}

export interface Step {
  kind: "start" | "restart" | "stop" | "addr" | "addr10" | "data" | "lone";
  byte?: number;
  /** 주소 바이트: 7비트 주소(10비트면 전체 10비트) */
  addr?: number;
  rw?: "W" | "R";
  /** 이 바이트 뒤의 ACK(true)·NACK(false)·모름(undefined) */
  ack?: boolean;
  /** 데이터 바이트를 보낸 쪽 */
  from?: "master" | "slave";
  /** 이 전송에서 몇 번째 데이터(0부터) */
  n?: number;
  ten?: boolean;
  reserved?: ReturnType<typeof reserved>;
}

/** 토큰 → 단계. S/Sr 이 없으면 첫 바이트를 주소로 본다 */
export function analyze(toks: Tok[]): Step[] {
  const out: Step[] = [];
  let expectAddr = !toks.some((t) => t.t === "S" || t.t === "Sr");
  let rw: "W" | "R" | undefined;
  let tenHi: number | undefined; // 10비트 첫 바이트의 XX
  let pendingTen = false; // 쓰기 10비트: 다음 바이트가 주소 아래 8비트
  let last10: number | undefined;
  let n = 0;
  for (const t of toks) {
    if (t.t === "S" || t.t === "Sr") {
      out.push({ kind: t.t === "S" ? "start" : "restart" });
      expectAddr = true;
      continue;
    }
    if (t.t === "P") {
      out.push({ kind: "stop" });
      rw = undefined;
      continue;
    }
    if (t.t === "A" || t.t === "N") {
      const prev = out[out.length - 1];
      if (prev && prev.byte !== undefined && prev.ack === undefined) prev.ack = t.t === "A";
      else out.push({ kind: "lone", ack: t.t === "A" });
      continue;
    }
    const b = t.v;
    if (expectAddr) {
      expectAddr = false;
      n = 0;
      rw = b & 1 ? "R" : "W";
      const a7 = b >> 1;
      if ((a7 & 0x7c) === 0x78) {
        tenHi = a7 & 3;
        if (rw === "W") {
          pendingTen = true;
          out.push({ kind: "addr10", byte: b, rw, ten: true });
        } else {
          // 읽기: 앞에서 쓴 10비트 주소를 다시 부른다(Sr 뒤)
          out.push({ kind: "addr10", byte: b, rw, ten: true, addr: last10 !== undefined && last10 >> 8 === tenHi ? last10 : undefined });
        }
        continue;
      }
      out.push({ kind: "addr", byte: b, addr: a7, rw, reserved: reserved(a7) });
      continue;
    }
    if (pendingTen) {
      pendingTen = false;
      last10 = ((tenHi ?? 0) << 8) | b;
      out.push({ kind: "addr10", byte: b, addr: last10, ten: true, rw: "W" });
      continue;
    }
    out.push({ kind: "data", byte: b, from: rw === "R" ? "slave" : "master", n: n++ });
  }
  return out;
}
