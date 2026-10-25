// 웹 도구 «4–20mA 루프 부하 계산기» — 2선식(루프 전원) 전송기가 원하는 전류를 낼 만큼 전원 전압이 남는지 본다.
// 직렬 루프라 옴의 법칙만 쓴다: 전송기 단자 전압 = 전원 − 전류 × (입력 저항 + 선 왕복 저항 + 그 밖의 저항) − 그 밖의 고정 전압 강하.
// 전송기 최소 동작 전압(리프트오프 전압)과 부하 그림(load diagram)의 전류는 전송기 매뉴얼 값을 넣는다 — 여기 기본값은 예시일 뿐이다.
import { resistance, type Material } from "./wire.ts";

export interface LoopInput {
  /** 루프 전원 V */
  supply: number;
  /** 전송기 최소 동작 전압 V */
  txMin: number;
  /** 확인할 최대 전류 A (보통 0.020, NE 43 고장 신호까지 보려면 0.021 이상) */
  iMax: number;
  /** 받는 쪽 입력 저항 Ω (예: 250 Ω) */
  rIn: number;
  /** 표시기·절연기 등 저항 Ω */
  rOther: number;
  /** 배리어·루프 전원 표시기 등 고정 전압 강하 V */
  vOther: number;
  /** 편도 케이블 길이 m · 단면적 mm² · 재질 · 온도 */
  lengthM: number;
  areaMm2: number;
  material: Material;
  tempC: number;
}

export interface LoopResult {
  /** 선 왕복 저항 Ω */
  rWire: number;
  /** 루프 전체 저항 Ω */
  rTotal: number;
  /** iMax 에서 전송기 단자 전압 V */
  vTx: number;
  /** vTx − txMin (음수면 모자람) */
  margin: number;
  ok: boolean;
  /** 전송기 밖에서 허용되는 최대 저항 Ω */
  rMax: number;
  /** 필요한 최소 전원 전압 V */
  minSupply: number;
  /** 이 굵기로 갈 수 있는 최대 편도 길이 m (입력·그 밖 저항을 뺀 나머지로) */
  maxLength: number;
  /** 입력 저항 양단 전압: 4 mA·20 mA */
  vIn4: number;
  vIn20: number;
}

export function loop(x: LoopInput): LoopResult {
  for (const [k, v] of Object.entries(x)) if (typeof v === "number" && !Number.isFinite(v)) throw new RangeError(k);
  if (!(x.iMax > 0)) throw new RangeError("iMax");
  if (x.rIn < 0 || x.rOther < 0 || x.vOther < 0) throw new RangeError("negative");
  const rWire = 2 * resistance(x.material, x.lengthM, x.areaMm2, x.tempC);
  const rTotal = x.rIn + x.rOther + rWire;
  const vTx = x.supply - x.iMax * rTotal - x.vOther;
  const margin = vTx - x.txMin;
  const rMax = (x.supply - x.txMin - x.vOther) / x.iMax;
  const perMeter = (2 * resistance(x.material, 1, x.areaMm2, x.tempC));
  const left = rMax - x.rIn - x.rOther;
  return {
    rWire,
    rTotal,
    vTx,
    margin,
    ok: margin >= 0,
    rMax,
    minSupply: x.txMin + x.vOther + x.iMax * rTotal,
    maxLength: left > 0 ? left / perMeter : 0,
    vIn4: 0.004 * x.rIn,
    vIn20: 0.02 * x.rIn,
  };
}
