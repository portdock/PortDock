// 전선 저항·전압 강하 — 웹 도구 «전압 강하·전선 굵기 계산기» 와 «4–20mA 루프 부하 계산기» 가 함께 쓴다.
// 선 저항만 센다(리액턴스 무시). 굵은 교류 케이블은 리액턴스 몫이 커지므로 이 값보다 더 떨어질 수 있다.
// 근거:
//   구리 20 °C 저항률 1/58 Ω·mm²/m(= 0.017241, 국제 표준 연동선), 온도 계수 0.00393 /°C — IEC 60028
//   알루미늄 20 °C 저항률 0.028264 Ω·mm²/m(도전율 61 % IACS), 온도 계수 0.00403 /°C — IEC 60889
//   AWG 지름 d = 0.127 mm × 92^((36 − n) / 39) — ASTM B258
//   공칭 단면적 계열 — IEC 60228

export type Material = "cu" | "al";

export const RHO20: Record<Material, number> = { cu: 1 / 58, al: 0.028264 };
export const ALPHA20: Record<Material, number> = { cu: 0.00393, al: 0.00403 };

/**
 * 온도 T(°C) 에서 저항률 Ω·mm²/m — 직선 근사라 1 + α(T − 20) 이 0 이하가 되는 온도
 * (구리 약 −234.5 °C, 알루미늄 약 −228 °C 아래)에서는 저항이 0·음수가 되므로 RangeError
 */
export const rho = (m: Material, tempC = 20) => {
  const f = 1 + ALPHA20[m] * (tempC - 20);
  if (!Number.isFinite(tempC) || !(f > 0)) throw new RangeError("temp");
  return RHO20[m] * f;
};

/** 도체 한 가닥 저항 Ω (길이 m, 단면적 mm²) */
export function resistance(m: Material, lengthM: number, areaMm2: number, tempC = 20) {
  if (!(areaMm2 > 0)) throw new RangeError("area");
  if (!(lengthM >= 0)) throw new RangeError("length");
  return (rho(m, tempC) * lengthM) / areaMm2;
}

/** AWG 번호(0000 = -3, 000 = -2, 00 = -1) → 지름 mm, 단면적 mm² */
export function awg(n: number) {
  const d = 0.127 * Math.pow(92, (36 - n) / 39);
  return { d, area: (Math.PI / 4) * d * d };
}

/** 표에 쓰는 AWG */
export const AWGS = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1, 0];

/** IEC 60228 공칭 단면적 mm² */
export const IEC_SIZES = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];

export type System = "dc" | "1ph" | "3ph";

/**
 * 왕복 계수 — 전압 강하 = k × I × (한 가닥 저항)
 * 직류·단상 2선: 가는 선과 오는 선 2 가닥 → 2
 * 3상 3선(선간 전압 기준, 평형 부하): √3
 */
export const K: Record<System, number> = { dc: 2, "1ph": 2, "3ph": Math.sqrt(3) };

export interface DropInput {
  system: System;
  /** 전원 전압 V(3상은 선간) */
  volts: number;
  amps: number;
  /** 편도 길이 m */
  lengthM: number;
  areaMm2: number;
  material: Material;
  tempC: number;
}

export interface DropResult {
  /** 한 가닥 저항 Ω */
  r1: number;
  drop: number;
  pct: number;
  /** 부하 쪽 전압 */
  atLoad: number;
  /** 선에서 열로 잃는 전력 W */
  loss: number;
}

export function voltageDrop(x: DropInput): DropResult {
  if (!(x.volts > 0)) throw new RangeError("volts");
  if (!(x.amps >= 0)) throw new RangeError("amps");
  const r1 = resistance(x.material, x.lengthM, x.areaMm2, x.tempC);
  const drop = K[x.system] * x.amps * r1;
  const conductors = x.system === "3ph" ? 3 : 2;
  return { r1, drop, pct: (drop / x.volts) * 100, atLoad: x.volts - drop, loss: conductors * x.amps * x.amps * r1 };
}

/** 강하율 pct % 이하가 되는 최소 단면적 mm² */
export function minArea(x: Omit<DropInput, "areaMm2">, pct: number) {
  if (!(pct > 0)) throw new RangeError("pct");
  const maxDrop = (x.volts * pct) / 100;
  return (K[x.system] * x.amps * rho(x.material, x.tempC) * x.lengthM) / maxDrop;
}

/** 강하율 pct % 이하로 갈 수 있는 최대 편도 길이 m */
export function maxLength(x: Omit<DropInput, "lengthM">, pct: number) {
  if (!(pct > 0)) throw new RangeError("pct");
  const maxDrop = (x.volts * pct) / 100;
  if (x.amps === 0) return Infinity;
  return (maxDrop * x.areaMm2) / (K[x.system] * x.amps * rho(x.material, x.tempC));
}

/** a 이상인 가장 작은 IEC 공칭 단면적 (없으면 undefined) */
export const nextIec = (a: number) => IEC_SIZES.find((s) => s >= a - 1e-9);

/** a 이상인 가장 가는(번호가 큰) AWG */
export function nextAwg(a: number) {
  for (let n = 40; n >= -3; n--) if (awg(n).area >= a - 1e-9) return n;
  return undefined;
}

export const awgName = (n: number) => (n >= 0 ? `${n} AWG` : `${"0".repeat(-n + 1)} AWG`);
