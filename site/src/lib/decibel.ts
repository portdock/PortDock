// 데시벨 변환 — 웹 도구 «dB·dBm 변환기».
// 근거:
//   ITU-R V.574-5(2015) §1·§4·§6.1·§6.5·§8 — dB 는 전력 비(전압 같은 장(field) 양은 20 lg), dBW = 1 W 기준, dBm = 1 mW 기준, dBu = 0.775 V 기준(600 Ω 에서 1 mW),
//     전압 레벨 Lu = 20 lg(U1/U2), 600 Ω 이 아니면 Lu = Lp + 10 lg(R/600) 처럼 저항으로 잇는다(§6.5), dB(µV) 처럼 괄호 안 기준값 표기(§4.2)
//   SI 브로슈어 9판(BIPM, 2019 · 2025 갱신판) 표 8 주(m) — 네퍼·벨·데시벨, 기준값을 함께 밝힐 것, 1 Np = 20 lg e dB ≈ 8.686 dB(ITU-R V.574 §2·§3)
// dBu 기준은 «600 Ω 에서 1 mW» 인 √0.6 V ≈ 0.774 597 V 로 계산한다(V.574 의 0.775 V 는 이를 반올림한 값, 차이 약 0.004 dB).

/** 전력 비 → dB */
export const powerDb = (ratio: number) => {
  if (!(ratio > 0)) throw new RangeError("ratio");
  return 10 * Math.log10(ratio);
};
/** 전압·전류(진폭) 비 → dB — 같은 저항에 걸린 경우 전력 비의 dB 와 같다 */
export const ampDb = (ratio: number) => {
  if (!(ratio > 0)) throw new RangeError("ratio");
  return 20 * Math.log10(ratio);
};
export const dbToPower = (db: number) => 10 ** (db / 10);
export const dbToAmp = (db: number) => 10 ** (db / 20);

/** 1 Np 를 dB 로 */
export const NP_DB = 20 * Math.log10(Math.E);

/** dBu 기준 전압 V (600 Ω 에서 1 mW) */
export const DBU_REF = Math.sqrt(0.6);

export type LevelUnit = "dBm" | "dBW" | "mW" | "W" | "dBuV" | "dBV" | "dBu" | "V" | "mV" | "uV";

export const LEVEL_UNITS: { id: LevelUnit; sym: string; kind: "power" | "voltage" }[] = [
  { id: "dBm", sym: "dBm", kind: "power" },
  { id: "dBW", sym: "dBW", kind: "power" },
  { id: "mW", sym: "mW", kind: "power" },
  { id: "W", sym: "W", kind: "power" },
  { id: "dBuV", sym: "dBµV", kind: "voltage" },
  { id: "dBV", sym: "dBV", kind: "voltage" },
  { id: "dBu", sym: "dBu", kind: "voltage" },
  { id: "V", sym: "V (rms)", kind: "voltage" },
  { id: "mV", sym: "mV (rms)", kind: "voltage" },
  { id: "uV", sym: "µV (rms)", kind: "voltage" },
];

/** 레벨 하나 → 전력 W (전압이면 저항 ohms 에 걸린 전력 P = V² ÷ R). 너무 커서 W 가 무한대가 되면 RangeError */
export function toWatts(v: number, u: LevelUnit, ohms: number) {
  const w = toWattsRaw(v, u, ohms);
  if (!Number.isFinite(w)) throw new RangeError("overflow");
  return w;
}

function toWattsRaw(v: number, u: LevelUnit, ohms: number) {
  if (!Number.isFinite(v)) throw new RangeError("value");
  if (!(ohms > 0)) throw new RangeError("ohms");
  const volts = (x: number) => {
    if (!(x >= 0)) throw new RangeError("value");
    return (x * x) / ohms;
  };
  switch (u) {
    case "dBm":
      return 1e-3 * dbToPower(v);
    case "dBW":
      return dbToPower(v);
    case "mW":
      if (!(v >= 0)) throw new RangeError("value");
      return v / 1000;
    case "W":
      if (!(v >= 0)) throw new RangeError("value");
      return v;
    case "dBuV":
      return volts(1e-6 * dbToAmp(v));
    case "dBV":
      return volts(dbToAmp(v));
    case "dBu":
      return volts(DBU_REF * dbToAmp(v));
    case "V":
      return volts(v);
    case "mV":
      return volts(v / 1000);
    case "uV":
      return volts(v / 1e6);
  }
}

/** 전력 W → 모든 단위 (전압은 저항 ohms 기준 rms) */
export function levels(watts: number, ohms: number): Record<LevelUnit, number> {
  const V = Math.sqrt(watts * ohms);
  const lg = (x: number) => (x > 0 ? Math.log10(x) : -Infinity);
  return {
    dBm: 10 * lg(watts / 1e-3),
    dBW: 10 * lg(watts),
    mW: watts * 1000,
    W: watts,
    dBuV: 20 * lg(V / 1e-6),
    dBV: 20 * lg(V),
    dBu: 20 * lg(V / DBU_REF),
    V,
    mV: V * 1000,
    uV: V * 1e6,
  };
}

/** 표시용 — 0 W 의 dB 는 «−∞», 넘쳐서 +∞ 면 «+∞», 유한하면 undefined(숫자로 적는다) */
export const infText = (x: number) => (x === -Infinity ? "−∞" : x === Infinity ? "+∞" : undefined);

/** dBm → dBµV 로 더하는 값 (저항 R): 10 lg(R × 1 mW) + 120 — 50 Ω 이면 약 107 */
export const dbmToDbuvOffset = (ohms: number) => 10 * Math.log10(ohms * 1e-3) + 120;

/** 여러 dB 를 직렬로 더함(이득 +, 손실 −) */
export const chain = (dbs: number[]) => dbs.reduce((a, b) => a + b, 0);
