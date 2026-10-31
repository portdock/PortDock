// 웹 도구 «제어반 발열·환기 팬 계산기» — 장비 발열 합, 외함 유효 표면적(설치 방식별), 자연 방열, 필요한 팬 풍량, 쿨러·히터 출력.
// 순수 함수만(node --test). 화면은 views/PanelHeatPage.astro.
// 근거:
//   유효 표면적: IEC TR 60890:2014 5.2.2·표 3 — Ae = Σ(Ao × b), b = 노출된 윗면 1.4 · 덮인 윗면 0.7 · 노출된 옆면(앞·뒤·좌우) 0.9 ·
//     덮인 옆면(벽에 붙은 뒷면) 0.5 · 가운데 외함의 옆면 0.5 · 바닥은 넣지 않음.
//     Rittal 백서 «The Perfect Climate Inside Your Enclosure»(US573-WP-TR) 의 설치 방식 7가지 식(IEC 60890)과 시험으로 맞춰 봤다.
//   방열·출력: 같은 Rittal 백서 — Pc = k × A × ΔT (강판 k = 5.5 W/m²K), Pa = Pt − Pc,
//     팬 풍량 V = f × Pa / ΔT (m³/h), f = 3.1(해발 0 m) … 5.2(3500 m), 쿨러 Pn = Pt − Pc, 히터 Pv = k × A × ΔT,
//     공기/공기 열교환기 Qw = (Pt − Pc) / ΔT (W/K). 외기는 원하는 내부 온도보다 약 5 K 낮아야 한다.
// 이 계산은 고르게 섞인 공기를 가정한 대략값이다 — 직사광선·장비 배치·필터 막힘은 들어 있지 않다.

export type Lang = "ko" | "en";
export interface T {
  ko: string;
  en: string;
}
const t = (ko: string, en: string): T => ({ ko, en });

/** IEC TR 60890 표 3 의 표면 계수 b */
export const SURFACE_FACTOR = {
  topExposed: 1.4,
  topCovered: 0.7,
  sideExposed: 0.9,
  sideCovered: 0.5,
  sideCentral: 0.5,
} as const;

/** 강판 외함의 열전달 계수(Rittal) */
export const K_STEEL = 5.5;

export interface Install {
  /** 윗면이 덮였나(다른 것 아래에 들어간 외함) */
  topCovered: boolean;
  /** 뒷면이 벽에 붙었나 */
  wall: boolean;
  /** 옆에 다른 외함이 붙은 면 수(0~2) — 열 배치의 처음·끝 = 1, 가운데 = 2 */
  neighbours: 0 | 1 | 2;
}

/** Rittal 백서의 설치 방식 1~7 (IEC 60890) */
export const INSTALL_TYPES: { id: number; name: T; i: Install }[] = [
  { id: 1, name: t("한 대, 사방이 트임", "Single enclosure, free-standing on all sides"), i: { topCovered: false, wall: false, neighbours: 0 } },
  { id: 2, name: t("한 대, 뒷면이 벽", "Single enclosure, wall-mounted"), i: { topCovered: false, wall: true, neighbours: 0 } },
  { id: 3, name: t("열의 처음·끝, 사방 트임", "First or last in a row, free-standing"), i: { topCovered: false, wall: false, neighbours: 1 } },
  { id: 4, name: t("열의 처음·끝, 뒷면이 벽", "First or last in a row, wall-mounted"), i: { topCovered: false, wall: true, neighbours: 1 } },
  { id: 5, name: t("열의 가운데, 사방 트임", "Middle of a row, free-standing"), i: { topCovered: false, wall: false, neighbours: 2 } },
  { id: 6, name: t("열의 가운데, 뒷면이 벽", "Middle of a row, wall-mounted"), i: { topCovered: false, wall: true, neighbours: 2 } },
  { id: 7, name: t("열의 가운데, 뒷면이 벽·윗면 덮임", "Middle of a row, wall-mounted, top covered"), i: { topCovered: true, wall: true, neighbours: 2 } },
];

/** 유효 표면적 Ae(m²) — W·H·D 는 m */
export function effectiveArea(w: number, h: number, d: number, i: Install): number {
  const b = SURFACE_FACTOR;
  const top = w * d * (i.topCovered ? b.topCovered : b.topExposed);
  const front = w * h * b.sideExposed;
  const back = w * h * (i.wall ? b.sideCovered : b.sideExposed);
  const sides = d * h * ((2 - i.neighbours) * b.sideExposed + i.neighbours * b.sideCentral);
  return top + front + back + sides;
}

/** Rittal 표의 팬 계수 f — 해발 고도(m) 별 */
export const ALTITUDE_F: [number, number][] = [
  [0, 3.1],
  [500, 3.3],
  [1000, 3.5],
  [1500, 3.8],
  [2000, 4.1],
  [2500, 4.4],
  [3000, 4.8],
  [3500, 5.2],
];

/** 고도 → f. 표의 칸 사이면 높은 쪽(바람이 더 필요한 쪽) 값. 3500 m 를 넘으면 NaN */
export function fanFactor(altitude: number): number {
  if (!Number.isFinite(altitude) || altitude > 3500) return NaN;
  const a = Math.max(0, altitude);
  return ALTITUDE_F.find(([m]) => m >= a)![1];
}

/** 장비 발열 목록 → 합(W). 줄마다 마지막 숫자를 W 로(«PLC 12», «인버터 3.7kW 손실 150 W» → 150). «×2»·«x2» 가 있으면 곱한다 */
export function parseLoads(text: string): { items: { name: string; w: number; n: number }[]; total: number; bad: number[] } {
  const items: { name: string; w: number; n: number }[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    let s = line;
    let n = 1;
    const mult = s.match(/\s[×xX*]\s*(\d+)\s*$/) ?? s.match(/^(\d+)\s*[×xX*]\s+/);
    if (mult) {
      n = Number(mult[1]);
      s = s.replace(mult[0], " ").trim();
    }
    const nums = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(k?W)?/gi)];
    const last = nums.at(-1);
    if (!last) {
      bad.push(idx + 1);
      return;
    }
    let w = Number(last[1].replace(",", "."));
    if (last[2] && /^k/i.test(last[2])) w *= 1000;
    const name = s.slice(0, last.index).trim() || s;
    items.push({ name, w, n });
  });
  return { items, total: items.reduce((a, x) => a + x.w * x.n, 0), bad };
}

export interface HeatIn {
  /** 장비 발열 합 Pt (W) */
  pt: number;
  /** 유효 표면적 A (m²) */
  area: number;
  /** 열전달 계수 k (W/m²K) */
  k: number;
  /** 외기(주변) 최고 온도 Tu (°C) */
  tAmb: number;
  /** 허용 내부 온도 Ti (°C) */
  tIn: number;
  /** 해발 고도(m) */
  altitude: number;
}

export type Advice = "natural" | "fan" | "fan-tight" | "cooler";

export interface HeatOut {
  dT: number;
  /** 자연 방열 Pc = k × A × ΔT (W) — ΔT < 0 이면 음수(밖에서 들어오는 열) */
  pc: number;
  /** 팬으로 빼야 할 열 Pa = Pt − Pc (W) */
  pa: number;
  f: number;
  /** 필요한 팬 풍량 (m³/h) — 팬이 쓸모 있을 때만 */
  airflow: number | null;
  /** 쿨러(또는 공기/물 열교환기) 필요 출력 Pn = Pt − Pc (W) */
  pn: number;
  /** 공기/공기 열교환기 비출력 Qw (W/K) — ΔT > 0 일 때만 */
  qw: number | null;
  advice: Advice;
}

/** 열 균형 — ΔT = Ti − Tu */
export function heatBalance(x: HeatIn): HeatOut {
  const dT = x.tIn - x.tAmb;
  const pc = x.k * x.area * dT;
  const pa = x.pt - pc;
  const f = fanFactor(x.altitude);
  const pn = x.pt - pc;
  let advice: Advice;
  let airflow: number | null = null;
  if (dT <= 0) advice = "cooler";
  else if (pa <= 0) advice = "natural";
  else {
    airflow = (f * pa) / dT;
    // Rittal: 외기는 원하는 내부 온도보다 약 5 K 낮아야 한다
    advice = dT < 5 ? "fan-tight" : "fan";
  }
  return { dT, pc, pa, f, airflow, pn, qw: dT > 0 ? pa / dT : null, advice };
}

/** 겨울 — 최저 외기에서 내부를 tIn 으로 지키는 히터 출력 Pv = k × A × ΔT (장비 발열은 빼지 않은 값과 뺀 값) */
export function heaterPower(area: number, k: number, tMinAmb: number, tIn: number, pt: number) {
  const dT = tIn - tMinAmb;
  const pv = dT > 0 ? k * area * dT : 0;
  return { dT, pv, pvMinusLoad: Math.max(0, pv - pt) };
}

export const ADVICE: Record<Advice, T> = {
  natural: t("자연 방열로 충분한 계산입니다(팬 없이).", "Natural convection is enough by this calculation (no fan)."),
  fan: t("팬(필터 팬)으로 뺄 수 있는 계산입니다 — 아래 풍량 이상의 팬을 고를 것.", "A filter fan can remove the heat — pick a fan with at least the airflow below."),
  "fan-tight": t(
    "외기와 내부 허용 온도 차가 5 K 보다 작아 팬 풍량이 크게 나옵니다 — 쿨러·열교환기도 볼 것(Rittal: 외기는 약 5 K 낮아야).",
    "The ambient is less than 5 K below the allowed internal temperature, so the airflow gets large — also consider a cooling unit or heat exchanger (Rittal: ambient should be about 5 K lower).",
  ),
  cooler: t(
    "외기가 허용 내부 온도 이상입니다 — 팬(바깥 공기)으로는 내부를 그 아래로 낮출 수 없습니다. 쿨러(에어컨)·공기/물 열교환기를 볼 것.",
    "The ambient is at or above the allowed internal temperature — a fan with outside air cannot get below it. Look at a cooling unit or air/water heat exchanger.",
  ),
};
