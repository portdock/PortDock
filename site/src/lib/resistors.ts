// 합성 저항(직렬·병렬) — 웹 도구 «합성 저항 계산기 (직렬·병렬)».
// 근거: 정의식(옴의 법칙·키르히호프 법칙)
//   직렬 R = R1 + R2 + …,  병렬 1/R = 1/R1 + 1/R2 + …  (두 개면 R1 × R2 ÷ (R1 + R2))
//   원하는 값 Rt 를 만들 짝: 직렬은 Rt − R1, 병렬은 R1 × Rt ÷ (R1 − Rt) (R1 > Rt 일 때만)
//   표준 값(E12·E24·E96)은 lib/divider 의 표(Vishay 28372, IEC 60063 표)를 그대로 쓴다.
import { bracketE, eValues, type ESeries } from "./divider.ts";

const ok = (r: number) => r > 0 && Number.isFinite(r);
function check(rs: number[]) {
  if (rs.length === 0 || !rs.every(ok)) throw new RangeError("R");
}
/** 결과가 넘치거나 0 이 되면(1e999·1e-400 같은 입력) «Infinity Ω» 로 찍히지 않게 거절 */
function fin(x: number) {
  if (!ok(x)) throw new RangeError("R");
  return x;
}

/** 직렬 합성 */
export function series(rs: number[]): number {
  check(rs);
  return fin(rs.reduce((a, b) => a + b, 0));
}
/** 병렬 합성 */
export function parallel(rs: number[]): number {
  check(rs);
  return fin(1 / rs.reduce((a, b) => a + 1 / b, 0));
}
/** 병렬 합성에서 각 저항에 흐르는 전류 몫(0~1) — 전류는 저항에 반비례 */
export function parallelShares(rs: number[]): number[] {
  const rt = parallel(rs);
  return rs.map((r) => rt / r);
}

/** 전압 v 를 병렬 저항들에 걸 때 전체·저항별 전류(A) — 넘치면(1e307 V ÷ 0.001 Ω 같은 입력) «Infinity A» 로 찍히지 않게 거절 */
export function parallelCurrents(v: number, rs: number[]): { total: number; each: number[] } {
  if (!ok(v)) throw new RangeError("V");
  const total = fin(v / parallel(rs));
  return { total, each: rs.map((r) => fin(v / r)) };
}

/** r 에 병렬로 붙여 target 이 되는 저항 — r 이 target 보다 커야 한다 */
export function parallelPartner(r: number, target: number): number {
  if (!ok(r) || !ok(target) || !(r > target)) throw new RangeError("R");
  return fin((r * target) / (r - target));
}
/** r 에 직렬로 붙여 target 이 되는 저항 — r 이 target 보다 작아야 한다 */
export function seriesPartner(r: number, target: number): number {
  if (!ok(r) || !ok(target) || !(r < target)) throw new RangeError("R");
  return fin(target - r);
}

export interface Combo {
  mode: "series" | "parallel";
  /** 큰 쪽(병렬은 작은 쪽이 앞) — 표시 순서 그대로 */
  a: number;
  b: number;
  value: number;
  /** 목표 대비 오차 % */
  err: number;
}

const clean = (x: number) => Number(x.toPrecision(12));

/**
 * 표준 값 두 개로 target 에 가장 가까운 직렬·병렬 조합(오차가 작은 순, 같은 값은 하나만).
 * 병렬: a ≤ b 로 두면 a 는 target 초과 2·target 이하 — a 를 훑고 짝 b 의 위·아래 표준 값을 본다.
 * 직렬: a ≥ b 로 두면 a 는 target/2 이상 target 미만.
 * 한 개로 정확히 되는 값(target 이 표준 값)도 조합 오차 0 이 나올 수 있지만, 그때는 한 개를 쓰면 된다 — 화면이 따로 보여 준다.
 */
export function bestCombos(target: number, s: ESeries, mode: "series" | "parallel" | "both" = "both", n = 6): Combo[] {
  if (!ok(target)) throw new RangeError("R");
  const out: Combo[] = [];
  const seen = new Set<string>();
  const push = (m: Combo["mode"], a: number, b: number) => {
    const value = clean(m === "series" ? a + b : (a * b) / (a + b));
    const key = `${m}/${Math.min(a, b)}/${Math.max(a, b)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ mode: m, a, b, value, err: ((value - target) / target) * 100 });
  };
  if (mode !== "series") {
    for (const a of eValues(s, target * 1.000001, target * 2)) {
      for (const b of bracketE((a * target) / (a - target), s)) if (b >= a) push("parallel", a, b);
    }
  }
  if (mode !== "parallel") {
    for (const a of eValues(s, target / 2, target * 0.999999)) {
      for (const b of bracketE(target - a, s)) if (b <= a) push("series", a, b);
    }
  }
  out.sort((x, y) => Math.abs(x.err) - Math.abs(y.err) || (x.mode === y.mode ? 0 : x.mode === "series" ? -1 : 1));
  const vals = new Set<string>();
  return out
    .filter((c) => {
      const k = `${c.mode}/${c.value}`;
      if (vals.has(k)) return false;
      vals.add(k);
      return true;
    })
    .slice(0, n);
}

/**
 * 저항 값 글자 → Ω. «4.7k», «4k7», «2M2», «470», «0R47», «10 kΩ» 꼴. 단위 글자(R·k·M)가 소수점 자리에 오는 회로도 표기(4k7 = 4.7 kΩ)도 받는다. 소수점은 «.» 또는 «,»(한 값만 읽을 때).
 * 못 읽으면 NaN.
 */
export function parseOhm(s: string): number {
  const t = s.trim().replace(/Ω|ohms?$/i, "").replace(",", ".").trim();
  const m = /^(\d*)(?:\.(\d+))?\s*([rRkKmM]?)(\d*)$/.exec(t);
  if (!m || (m[1] === "" && m[2] === undefined && m[4] === "")) return NaN;
  const [, a, frac, u, tail] = m;
  if (frac !== undefined && tail !== "") return NaN; // 4.7k7 같은 꼴은 거절
  const mult = u === "" || u === "r" || u === "R" ? 1 : u === "k" || u === "K" ? 1e3 : u === "M" ? 1e6 : u === "m" ? NaN : 1;
  const num = Number(`${a || "0"}.${frac ?? tail ?? ""}`.replace(/\.$/, ""));
  return num * mult;
}

/** 쉼표·빈칸·세미콜론으로 나눈 여러 값 — 하나라도 못 읽으면 NaN 을 그 자리에 */
export const parseOhms = (s: string) =>
  s
    .split(/[,;\s]+/)
    .filter((x) => x !== "")
    .map(parseOhm);
