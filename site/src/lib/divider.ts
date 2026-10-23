// 분압 계산기 — 웹 도구 «분압 저항 계산기 (E12·E24·E96 표준값)».
// 근거:
//   표준 저항 값 — Vishay «Standard Series Values in a Decade for Resistances and Capacitances, E3 to E192, according to IEC 60063»
//     (Document Number 28372, Revision 22-Aug-12). E12·E24 는 두 자리, E96 은 세 자리 값을 그 표에서 옮겼다.
//     E24 의 27·30·33·36·39·43·47·82 는 10^(i/24) 를 반올림한 값과 다르다(표 그대로 써야 하는 이유) — 시험에서 확인.
//   분압 Vout = Vin × R2 ÷ (R1 + R2), 출력 저항(테브난) = R1 ∥ R2, 부하 RL 은 R2 와 병렬 — 옴의 법칙·키르히호프 법칙(정의식).

export type ESeries = "E12" | "E24" | "E96";

/** 한 decade 의 값(10 이상 100 미만 또는 100 이상 1000 미만의 정수) — Vishay 28372 표 */
export const E_BASE: Record<ESeries, number[]> = {
  E12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
  E24: [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91],
  E96: [
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174,
    178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
    316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
    562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
  ],
};

const clean = (x: number) => Number(x.toPrecision(12));

/** 1 Ω ~ 10 MΩ 사이의 그 계열 값(오름차순) */
export function eValues(s: ESeries, min = 1, max = 10e6): number[] {
  const base = E_BASE[s];
  const scale = s === "E96" ? 100 : 10;
  const out: number[] = [];
  for (let d = -1; d <= 7; d++) {
    for (const b of base) {
      const v = clean((b / scale) * 10 ** d);
      if (v >= min && v <= max) out.push(v);
    }
  }
  return out;
}

/** 가장 가까운 표준 값(비율 기준 — 로그 거리) */
export function nearestE(x: number, s: ESeries): number {
  if (!(x > 0)) throw new RangeError("R");
  let best = NaN;
  let bd = Infinity;
  for (const v of eValues(s, 0.1, 1e8)) {
    const d = Math.abs(Math.log(v / x));
    if (d < bd) {
      bd = d;
      best = v;
    }
  }
  return best;
}

/** x 바로 아래·바로 위의 표준 값 */
export function bracketE(x: number, s: ESeries): [number, number] {
  const vs = eValues(s, 0.1, 1e8);
  let lo = vs[0];
  let hi = vs[vs.length - 1];
  for (const v of vs) {
    if (v <= x) lo = v;
    if (v >= x) {
      hi = v;
      break;
    }
  }
  return [lo, hi];
}

/** 병렬 저항 */
export const par = (a: number, b: number) => (a * b) / (a + b);

/** 분압 출력: R1 위(입력 쪽), R2 아래(GND 쪽), 부하 rl(Ω, 없으면 Infinity) */
export function divOut(vin: number, r1: number, r2: number, rl = Infinity) {
  if (!(r1 > 0) || !(r2 > 0) || !(rl > 0)) throw new RangeError("R");
  const r2e = Number.isFinite(rl) ? par(r2, rl) : r2;
  const vout = (vin * r2e) / (r1 + r2e);
  const i = vin / (r1 + r2e);
  return {
    vout,
    /** 비 Vout/Vin */
    ratio: r2e / (r1 + r2e),
    /** R1 을 흐르는 전류(A) */
    current: i,
    /** R1·R2 소비 전력(W) */
    p1: i * i * r1,
    p2: (vout * vout) / r2,
    /** 출력 저항(테브난) R1 ∥ R2 */
    rout: par(r1, r2),
  };
}

/** 원하는 출력이 되는 R2 (R1 을 정했을 때, 부하 없음) */
export function solveR2(vin: number, vout: number, r1: number): number {
  if (!(vout > 0 && vout < vin) || !(r1 > 0)) throw new RangeError("V");
  return (r1 * vout) / (vin - vout);
}
/** 원하는 출력이 되는 R1 (R2 를 정했을 때) */
export function solveR1(vin: number, vout: number, r2: number): number {
  if (!(vout > 0 && vout < vin) || !(r2 > 0)) throw new RangeError("V");
  return (r2 * (vin - vout)) / vout;
}

export interface Pair {
  r1: number;
  r2: number;
  vout: number;
  /** 목표 대비 오차 % */
  err: number;
}

/**
 * 표준 값 두 개로 목표 비에 가장 가까운 조합 — R2 를 계열 값으로 훑고, 필요한 R1 의 위·아래 표준 값을 본다.
 * 합계 저항(R1 + R2)이 rTotal 의 1/3 ~ 3배인 것만, 오차가 작은 순, 같으면 합계가 rTotal 에 가까운 순. 비가 같은 조합은 하나만.
 */
export function bestPairs(vin: number, vout: number, s: ESeries, rTotal = 10e3, n = 5): Pair[] {
  if (!(vout > 0 && vout < vin)) throw new RangeError("V");
  if (!(rTotal > 0)) throw new RangeError("R");
  const target = vout / vin;
  const seen = new Set<string>();
  const out: (Pair & { d: number })[] = [];
  for (const r2 of eValues(s, rTotal / 30, rTotal * 3)) {
    for (const r1 of bracketE((r2 * (1 - target)) / target, s)) {
      const t = r1 + r2;
      if (t < rTotal / 3 || t > rTotal * 3) continue;
      const key = `${r1}/${r2}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const v = (vin * r2) / t;
      out.push({ r1, r2, vout: v, err: ((v - vout) / vout) * 100, d: Math.abs(Math.log(t / rTotal)) });
    }
  }
  out.sort((a, b) => Math.abs(a.err) - Math.abs(b.err) || a.d - b.d);
  // 같은 비(예: 3.6k/1.8k 와 15k/7.5k)는 합계가 rTotal 에 가장 가까운 하나만
  const ratios = new Set<number>();
  const uniq = out.filter((p) => {
    const r = Number((p.r1 / p.r2).toPrecision(9));
    if (ratios.has(r)) return false;
    ratios.add(r);
    return true;
  });
  return uniq.slice(0, n).map(({ d: _d, ...p }) => p);
}

/** 저항 허용차(±tol %)로 본 출력의 최솟값·최댓값(부하 없음) — 두 저항이 반대로 어긋날 때가 끝 */
export function tolRange(vin: number, r1: number, r2: number, tolPct: number): [number, number] {
  const k = tolPct / 100;
  const lo = divOut(vin, r1 * (1 + k), r2 * (1 - k)).vout;
  const hi = divOut(vin, r1 * (1 - k), r2 * (1 + k)).vout;
  return [lo, hi];
}
