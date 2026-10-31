// 웹 도구 «전선관·덕트 점유율 계산기» — 전선(케이블) 외경·개수로 단면 점유율 % 를 내고, 출처가 확인된 기준과 비교한다.
// 근거(원문 대신 여러 해설·인용으로 확인한 값 — 화면에도 «그 나라 규정·판(edition) 확인» 을 적는다):
//   NEC(NFPA 70) Chapter 9 Table 1 — 전선관 점유율: 1가닥 53 %, 2가닥 31 %, 3가닥 이상 40 %.
//     Note 9: 다심 케이블 하나는 전선 한 가닥으로 센다. 타원 케이블은 긴 지름을 원 지름으로.
//     (Note 4: 길이 600 mm 이하 니플은 60 % — 이 도구는 다루지 않는다)
//   NEC 376.22(A) 금속 와이어웨이·378.22 비금속 와이어웨이 — 전선 단면적 합 ≤ 내부 단면적의 20 %.
//   NFPA 79(산업 기계 전기 설비) 13.5.2 «Percentage Fills of Raceways (Duct)» — 제어반 배선 덕트의 전선·케이블 단면적 합 ≤ 내부 단면적의 50 %
//     (2007·2012 판 절 번호 — 판에 따라 번호가 다를 수 있다).
//   KEC 의 전선관·덕트 점유율 조문은 원문을 확인하지 못해 싣지 않는다.
// 단면적은 피복을 포함한 외경으로 π ÷ 4 × D² — 실제 전선 외경은 제조사 자료 값을 쓴다.

export type Lang = "ko" | "en";
type L = { ko: string; en: string };
const t = (ko: string, en: string): L => ({ ko, en });

export interface WireGroup {
  /** 피복 포함 외경 mm */
  od: number;
  count: number;
}

export const circleArea = (d: number) => (Math.PI / 4) * d * d;

/** 전선 단면적 합 mm² */
export function wiresArea(groups: WireGroup[]) {
  let sum = 0;
  for (const g of groups) {
    if (!(g.od > 0) || !(g.count >= 0) || !Number.isInteger(g.count)) throw new RangeError("wire");
    sum += g.count * circleArea(g.od);
  }
  return sum;
}

export const wiresCount = (groups: WireGroup[]) => groups.reduce((s, g) => s + g.count, 0);

/** NEC Chapter 9 Table 1 — 가닥 수(다심 케이블은 1) → 최대 점유율 % */
export const necConduitLimit = (n: number) => (n <= 0 ? undefined : n === 1 ? 53 : n === 2 ? 31 : 40);

export type DuctRule = "wireway" | "panel";
export const DUCT_LIMIT: Record<DuctRule, number> = { wireway: 20, panel: 50 };
export const DUCT_RULES: { id: DuctRule; name: L; src: L }[] = [
  { id: "panel", name: t("제어반 배선 덕트 (NFPA 79 — 50 %)", "Control panel wiring duct (NFPA 79 — 50 %)"), src: t("NFPA 79 13.5.2(2007·2012 판) — 판에 따라 절 번호가 다를 수 있음", "NFPA 79 13.5.2 (2007 and 2012 editions) — the clause number may differ by edition") },
  { id: "wireway", name: t("와이어웨이 (NEC 376.22·378.22 — 20 %)", "Wireway (NEC 376.22, 378.22 — 20 %)"), src: t("NEC 376.22(A) 금속·378.22 비금속 와이어웨이", "NEC 376.22(A) metal and 378.22 nonmetallic wireways") },
];

export interface FillResult {
  wires: number;
  count: number;
  inner: number;
  pct: number;
  limit?: number;
  over?: boolean;
}

/** 전선관(원형) — 안지름 mm */
export function conduitFill(groups: WireGroup[], innerD: number): FillResult {
  if (!(innerD > 0)) throw new RangeError("inner");
  const wires = wiresArea(groups);
  const count = wiresCount(groups);
  const inner = circleArea(innerD);
  const pct = (wires / inner) * 100;
  const limit = necConduitLimit(count);
  return { wires, count, inner, pct, limit, over: limit !== undefined ? pct > limit : undefined };
}

/** 덕트(사각) — 안쪽 폭·높이 mm */
export function ductFill(groups: WireGroup[], w: number, h: number, rule: DuctRule): FillResult {
  if (!(w > 0) || !(h > 0)) throw new RangeError("duct");
  const wires = wiresArea(groups);
  const inner = w * h;
  const pct = (wires / inner) * 100;
  const limit = DUCT_LIMIT[rule];
  return { wires, count: wiresCount(groups), inner, pct, limit, over: pct > limit };
}

/** 기준(limit %) 안에 들어가는 최소 전선관 안지름 mm */
export function minConduitInner(groups: WireGroup[]) {
  const limit = necConduitLimit(wiresCount(groups));
  if (limit === undefined) return undefined;
  return Math.sqrt((4 * wiresArea(groups)) / (Math.PI * (limit / 100)));
}

/** 같은 외경 전선이 기준 안에 몇 가닥까지 들어가나(전선관) */
export function maxSameWires(od: number, innerD: number) {
  if (!(od > 0) || !(innerD > 0)) throw new RangeError("od");
  const ratio = circleArea(innerD) / circleArea(od);
  let best = 0;
  for (let n = 1; n <= 10000; n++) {
    const lim = necConduitLimit(n)!;
    if ((n / ratio) * 100 <= lim + 1e-9) best = n;
    else if (n > 2) break;
  }
  return best;
}

/** 덕트에 같은 외경 전선이 몇 가닥까지 */
export const maxSameDuct = (od: number, w: number, h: number, rule: DuctRule) => Math.floor(((w * h * DUCT_LIMIT[rule]) / 100) / circleArea(od) + 1e-9);
