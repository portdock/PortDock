// 공압 실린더 이론 출력·보어 고르기 — 웹 도구 «공압 실린더 추력 계산기».
// 근거(SMC 공식 자료):
//   SMC «Best Pneumatics» 기술 자료 «Air Cylinders Model Selection»·«Technical Data 1: Bore Size Selection»·
//   «Technical Data 3: Theoretical Output Table»(ca01.smcworld.com/catalog/BEST-technical-data-en/pdf/6-2-1-m21-43-tech_en.pdf)
//     식 (1)(2)  F1 = η × A1 × P,  F2 = η × A2 × P   (N, mm², MPa — η 부하율)
//     A2 = 피스톤 면적 − 로드 단면적(로드 쪽은 로드 단면만큼 작다)
//     부하율: 정적(클램프·저속 압입) 0.7 이하, 동적(부하를 움직임) 0.5 이하, 가이드 위 수평 이동 1 이하.
//             고속이면 더 낮춘다(0.4·0.3·0.2). 압력은 보통 공급 압력의 85 % 로 레귤레이터를 둔다.
//     «이론 출력» = 압력 × 받는 면적(실린더 안 저항이 없다고 본 값).
//     예제 1(정적 1000 N, η 0.7, 0.5 MPa → ø63) · 예제 2(가이드 위 30 kg, η 1, 0.4 MPa, 당김 쪽 → ø40) ·
//     예제 3(100 kg 수직 들어 올림, η 0.5, 0.5 MPa, 당김 쪽 → ø80)
//     Data 3 표: 면적을 유효 숫자 3자리로 반올림해 적고, 출력은 그 면적 × 압력을 다시 3자리로 적는다.
//   SMC CLQ 카탈로그 «Theoretical Output» — 반올림하지 않은 면적 × 압력을 정수로 적음
// 1 kgf = 9.806 65 N(표준 중력 가속도, NIST SP 811 — lib/units G0).
import { G0 } from "./units.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);

/** 보어 D(mm)의 피스톤 면적 mm² — 밀 때(헤드 쪽) */
export function pistonArea(bore: number) {
  if (!pos(bore) || bore > 1e5) throw new RangeError("bore");
  return (Math.PI / 4) * bore * bore;
}

/** 로드 쪽(당길 때) 받는 면적 mm² = π/4 × (D² − d²) */
export function rodSideArea(bore: number, rod: number) {
  if (!pos(bore) || bore > 1e5 || !(Number.isFinite(rod) && rod >= 0) || rod >= bore) throw new RangeError("rod");
  return (Math.PI / 4) * (bore * bore - rod * rod);
}

/** 출력 N = 부하율 × 면적(mm²) × 압력(MPa) */
export function force(area: number, mpa: number, loadFactor = 1) {
  if (!pos(area) || !pos(mpa) || !pos(loadFactor) || loadFactor > 1) throw new RangeError("force");
  const f = loadFactor * area * mpa;
  if (!Number.isFinite(f)) throw new RangeError("force");
  return f;
}

export const toKgf = (n: number) => n / G0;

/** 유효 숫자 3자리 — SMC Data 3 표가 쓰는 자리수 */
export const sig3 = (x: number) => Number(x.toPrecision(3));

/** SMC Data 3 표 방식: 면적(3자리) × 압력 → 출력(3자리) */
export function smcTable(bore: number, rod: number, mpa: number) {
  const aOut = sig3(pistonArea(bore));
  const aIn = sig3(rodSideArea(bore, rod));
  return { aOut, aIn, out: sig3(aOut * mpa), in: sig3(aIn * mpa) };
}

/**
 * SMC Data 3 표에 있는 보어와 로드 지름(mm). 같은 보어에 로드가 둘이면 첫째 줄(작은 쪽).
 * 표 머리: CJ2(ø6~16)·CM2(ø20~40)·CG1(ø20~100)·CA2(ø40~100)·MB(ø32~125)·CS1(ø125~300)·CS2(ø125~160).
 * 시리즈마다 로드 지름이 다를 수 있다 — 쓰는 실린더의 카탈로그 값을 넣는다.
 */
export const SMC_BORES: readonly (readonly [number, number])[] = [
  [6, 3], [10, 4], [16, 5], [20, 8], [25, 10], [32, 12], [40, 14], [50, 20], [63, 20], [80, 25],
  [100, 30], [125, 32], [140, 32], [160, 38], [180, 45], [200, 50], [250, 60], [300, 70],
];

export type Dir = "out" | "in";

/** 필요한 받는 면적 mm² = 힘 ÷ (부하율 × 압력) */
export function requiredArea(forceN: number, mpa: number, loadFactor: number) {
  if (!pos(forceN) || !pos(mpa) || !pos(loadFactor) || loadFactor > 1) throw new RangeError("need");
  const a = forceN / (loadFactor * mpa);
  if (!Number.isFinite(a)) throw new RangeError("need");
  return a;
}

/** 미는 쪽만 볼 때 필요한 최소 보어 mm (로드 무시) */
export const minBoreOut = (area: number) => Math.sqrt((4 * area) / Math.PI);

/**
 * 힘·압력·부하율·방향 → SMC 표 보어 중 가장 작은 것(그 보어의 첫째 로드로 당김 쪽 면적).
 * 표의 가장 큰 보어로도 모자라면 null.
 */
export function pickBore(forceN: number, mpa: number, loadFactor: number, dir: Dir) {
  const need = requiredArea(forceN, mpa, loadFactor);
  for (const [d, r] of SMC_BORES) {
    const a = dir === "out" ? pistonArea(d) : rodSideArea(d, r);
    if (a >= need) return { bore: d, rod: r, area: a, need, force: force(a, mpa, loadFactor) };
  }
  return null;
}
