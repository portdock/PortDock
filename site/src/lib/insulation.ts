// 웹 도구 «절연 저항 판정» — 회로 종류·측정 전압·잰 값(MΩ) → «문제 없음(이 측정 범위) / 볼 것 / 문제 있음».
// 순수 함수만(node --test). 화면은 views/InsulationPage.astro.
// 근거(저압 전로, 2021년 이후 새 설비 기준):
//   전기설비기술기준 제52조(저압전로의 절연성능) 표 — SELV·PELV: DC 250 V 시험, 0.5 MΩ 이상 /
//     FELV, 500 V 이하: DC 500 V, 1.0 MΩ 이상 / 500 V 초과: DC 1000 V, 1.0 MΩ 이상.
//   IEC 60364-6:2016 표 6.1 — 같은 세 줄(SELV·PELV 250 V·0.5 MΩ, ≤500 V 500 V·1 MΩ, >500 V 1000 V·1 MΩ).
//   특별저압(ELV)은 교류 50 V·직류 120 V 이하.
// 이 모듈은 규격의 최소값과만 비교한다 — 장비·케이블 제조사 값, 지난 측정과의 추세는 따로 본다.

import { msg, tx, type Lang } from "./tr.ts";
export type { Lang };
export type Level = "ok" | "warn" | "fault";
export interface T {
  ko: string;
  en: string;
}
const t = (ko: string, en: string): T => ({ ko, en });

export type Circuit = "selv" | "le500" | "gt500";

export interface Row {
  id: Circuit;
  name: T;
  /** 시험 전압 DC (V) */
  testV: number;
  /** 최소 절연 저항 (MΩ) */
  minMohm: number;
}

export const ROWS: Row[] = [
  { id: "selv", name: t("SELV·PELV (특별저압: AC 50 V·DC 120 V 이하)", "SELV and PELV (extra-low voltage: ≤ 50 V AC, ≤ 120 V DC)"), testV: 250, minMohm: 0.5 },
  { id: "le500", name: t("FELV, 500 V 이하 (예: 220 V·380 V·440 V)", "FELV, up to 500 V (e.g. 230 V, 400 V, 480 V)"), testV: 500, minMohm: 1.0 },
  { id: "gt500", name: t("500 V 초과 (~1000 V)", "Above 500 V (up to 1000 V)"), testV: 1000, minMohm: 1.0 },
];

export const rowOf = (c: Circuit) => ROWS.find((r) => r.id === c)!;

/** 공칭 전압(V)·SELV·PELV 여부·직류 여부 → 줄. 특별저압 한계는 교류 50 V·직류 120 V(IEC 60364, ELV) */
export function circuitFor(nominalV: number, selvPelv: boolean, dc = false): Circuit | null {
  if (!Number.isFinite(nominalV) || nominalV <= 0 || nominalV > 1000) return null;
  if (selvPelv) return nominalV <= (dc ? 120 : 50) ? "selv" : null;
  return nominalV <= 500 ? "le500" : "gt500";
}

export const LEVEL_NAME: Record<Level, T> = {
  ok: t("문제 없음(이 측정 범위)", "No issue found (in this measurement)"),
  warn: t("볼 것", "Worth a look"),
  fault: t("문제 있음", "Problem"),
};

export interface Verdict {
  level: Level;
  msg: T;
  more: T[];
}

/** 측정값 글 → MΩ. «>2000»·«OL»·«∞» 는 Infinity(측정 범위 초과 = 아주 큼), «kΩ»·«GΩ» 접미사 허용 */
export function parseMohm(s: string): number {
  const x = s.trim().replace(/,/g, ".").replace(/\s+/g, "");
  if (!x) return NaN;
  if (/^(ol|∞|inf|over)/i.test(x)) return Infinity;
  const m = x.match(/^>?=?(\d+(?:\.\d+)?)(k|m|g)?(Ω|ohm)?$/i);
  if (!m) return NaN;
  const v = Number(m[1]);
  const u = (m[2] ?? "M").toLowerCase();
  return u === "k" ? v / 1000 : u === "g" ? v * 1000 : v;
}

const fmt = (v: number) => (v === Infinity ? "∞" : v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : String(Math.round(v * 1000) / 1000));

/** 판정 — 측정 전압이 규정과 다르면 «볼 것», 최소값보다 작으면 «문제 있음» */
export function judge(c: Circuit, testV: number, mohm: number): Verdict {
  const r = rowOf(c);
  const more: T[] = [];
  if (!Number.isFinite(testV) || testV <= 0 || Number.isNaN(mohm) || mohm < 0)
    return { level: "warn", msg: t("측정 전압과 잰 값(MΩ)을 넣으세요.", "Enter the test voltage and the reading (MΩ)."), more };
  let level: Level = "ok";
  let msg: T;
  if (mohm < r.minMohm) {
    level = "fault";
    msg = t(`${fmt(mohm)} MΩ — 최소 ${r.minMohm} MΩ 보다 작습니다.`, `${fmt(mohm)} MΩ — below the ${r.minMohm} MΩ minimum.`);
    more.push(
      t(
        "원인 후보: 습기·먼지·물 들어감, 피복 손상, 단자대 오염, 분리하지 않은 장비(서지 보호기·노이즈 필터·인버터)가 회로에 남음. 구간을 나눠 다시 잴 것.",
        "Possible causes: moisture, dust or water ingress, damaged insulation, contaminated terminals, or equipment left connected (surge protectors, EMC filters, drives). Split the circuit into sections and measure again.",
      ),
    );
  } else {
    msg = t(`${fmt(mohm)} MΩ — 최소 ${r.minMohm} MΩ 이상입니다.`, `${fmt(mohm)} MΩ — at or above the ${r.minMohm} MΩ minimum.`);
  }
  if (testV < r.testV) {
    if (level === "ok") level = "warn";
    more.push(
      t(
        `측정 전압 ${testV} V 는 규정 시험 전압(DC ${r.testV} V)보다 낮습니다 — 낮은 전압에서 높게 나와도 규정 전압에서는 다를 수 있습니다.`,
        `The ${testV} V test voltage is lower than the specified DC ${r.testV} V — a good result at a lower voltage may not hold at the specified one.`,
      ),
    );
  } else if (testV > r.testV) {
    if (level === "ok") level = "warn";
    more.push(
      t(
        `측정 전압 ${testV} V 는 규정 시험 전압(DC ${r.testV} V)보다 높습니다 — 이 회로의 장비가 견디는지 먼저 확인할 것(전자 장비 손상 위험).`,
        `The ${testV} V test voltage is higher than the specified DC ${r.testV} V — check the equipment on this circuit can withstand it first (risk of damaging electronics).`,
      ),
    );
  }
  return { level, msg, more };
}

/** 결과 복사용 글 */
export function verdictText(c: Circuit, testV: number, mohm: number, v: Verdict, lang: Lang): string {
  const r = rowOf(c);
  const head = msg(lang, "절연 저항 판정", "Insulation resistance check");
  const lines = [
    `${head}: ${tx(LEVEL_NAME[v.level], lang)}`,
    `${msg(lang, "회로", "Circuit")}: ${tx(r.name, lang)}`,
    `${msg(lang, "측정", "Test")}: DC ${testV} V, ${fmt(mohm)} MΩ (${msg(lang, "기준", "requirement")}: DC ${r.testV} V, ≥ ${r.minMohm} MΩ)`,
    tx(v.msg, lang),
    ...v.more.map((m) => `- ${tx(m, lang)}`),
  ];
  return lines.join("\n");
}
