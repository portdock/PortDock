// 웹 도구 «AWG ↔ mm² 변환표» — AWG 지름·단면적은 공식으로 계산하고, 가까운 미터 규격(IEC 60228)과 구리 저항을 붙인다.
// 근거:
//   AWG 지름 d = 0.127 mm × 92^((36 − n) / 39) — ASTM B258 (lib/wire.ts 의 awg)
//   단면적 = π ÷ 4 × d²  (단선 기준 — 연선은 같은 AWG 라도 실제 구리 단면적이 조금 다르다)
//   구리 20 °C 저항률 1/58 Ω·mm²/m — IEC 60028 → Ω/km = 1000 ÷ 58 ÷ 단면적
// DOM 없이 순수 함수만(node --test 로 시험).
import { IEC_SIZES, awg, awgName, resistance } from "./wire.ts";

/** 표에 싣는 AWG — 0000(= −3) 부터 40 까지 */
export const TABLE_AWGS = Array.from({ length: 44 }, (_, i) => -3 + i);

/** "4/0"·"0000"·"00"·"2/0"·"18"·"18 AWG"·"#18" → AWG 번호(0000 = −3). 못 읽으면 undefined */
export function parseAwg(s: string): number | undefined {
  const x = s.trim().toUpperCase().replace(/^#/, "").replace(/\s*(AWG|GA|GAUGE)$/, "").trim();
  let m = /^([1-4])\/0$/.exec(x);
  if (m) return 1 - Number(m[1]);
  if (/^0{1,4}$/.test(x)) return 1 - x.length;
  m = /^(\d{1,2})$/.exec(x);
  if (m) {
    const n = Number(m[1]);
    return n <= 50 ? n : undefined;
  }
  return undefined;
}

/** AWG 이름 — 0 이하는 «2/0 (00)» 처럼 두 표기를 같이 */
export const awgLabel = (n: number) => (n > 0 ? awgName(n) : `${1 - n}/0 (${"0".repeat(1 - n)}) AWG`);

/** 단면적이 가장 가까운(비율로) IEC 공칭 단면적 */
export function nearestIec(area: number) {
  if (!(area > 0)) throw new RangeError("area");
  let best = IEC_SIZES[0];
  for (const s of IEC_SIZES) if (Math.abs(Math.log(s / area)) < Math.abs(Math.log(best / area))) best = s;
  return best;
}

/** a 이상인 가장 작은 IEC 공칭 단면적 */
export const iecAtLeast = (a: number) => IEC_SIZES.find((s) => s >= a - 1e-9);

export interface GaugeRow {
  n: number;
  label: string;
  /** 지름 mm, 단면적 mm² */
  d: number;
  area: number;
  /** 구리 20 °C 한 가닥 Ω/km */
  ohmKm: number;
  /** 가장 가까운 IEC 규격과 그 차이 % (IEC 가 크면 +) */
  near: number;
  nearDiff: number;
}

export function gaugeRow(n: number): GaugeRow {
  const { d, area } = awg(n);
  const near = nearestIec(area);
  return { n, label: awgLabel(n), d, area, ohmKm: resistance("cu", 1000, area), near, nearDiff: (near / area - 1) * 100 };
}

export const gaugeTable = () => TABLE_AWGS.map(gaugeRow);

/** mm² → 가장 가까운 AWG(지름 비율로, 0000 ~ 50 안에서)와 같거나 굵은 가장 가는 AWG */
export function mm2ToAwg(area: number) {
  if (!(area > 0)) throw new RangeError("area");
  // 연속 AWG 번호: n = 36 − 39 × log92(d / 0.127)
  const d = Math.sqrt((4 * area) / Math.PI);
  const exact = 36 - 39 * (Math.log(d / 0.127) / Math.log(92));
  // 표 범위(0000 ~ 50) 밖이면 undefined
  const nearest = exact < -3.5 || exact > 50.5 ? undefined : Math.round(exact);
  let atLeast: number | undefined;
  for (let n = 50; n >= -3; n--)
    if (awg(n).area >= area - 1e-9) {
      atLeast = n;
      break;
    }
  return { exact, nearest, atLeast };
}

/** 미터 규격 행 — IEC 계열 mm² 마다 지름(단선 환산)·Ω/km·가까운 AWG */
export const metricRows = (sizes = IEC_SIZES) =>
  sizes.map((a) => {
    const m = mm2ToAwg(a);
    return { area: a, d: Math.sqrt((4 * a) / Math.PI), ohmKm: resistance("cu", 1000, a), nearest: m.nearest, atLeast: m.atLeast };
  });
