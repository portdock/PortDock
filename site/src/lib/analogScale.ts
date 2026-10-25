// 웹 도구 «4–20mA 환산 계산기» — 전류·전압 ↔ 공학값 ↔ % ↔ 원시 카운트를 한 비율(r: 0 = 하한, 1 = 상한)로 잇는다.
// 모두 일차식(선형 환산)이라 범위 밖 값도 그대로 늘려 계산하고, 범위 밖이면 상태로 알린다.
// 프리셋 숫자·NE 43 경계는 공식 문서에서 확인한 것만 넣는다(출처는 각 항목의 src, 화면 아래 «출처» 에도 적는다).

export type Lang = "ko" | "en";
export type SignalKind = "4-20mA" | "0-20mA" | "0-10V" | "1-5V";

export interface Signal {
  kind: SignalKind;
  lo: number;
  hi: number;
  unit: "mA" | "V";
}

export const SIGNALS: Signal[] = [
  { kind: "4-20mA", lo: 4, hi: 20, unit: "mA" },
  { kind: "0-20mA", lo: 0, hi: 20, unit: "mA" },
  { kind: "0-10V", lo: 0, hi: 10, unit: "V" },
  { kind: "1-5V", lo: 1, hi: 5, unit: "V" },
];

export const signalOf = (k: SignalKind) => SIGNALS.find((s) => s.kind === k)!;

/** 카운트 범위 — lo·hi 는 신호 하한·상한에 대응하는 값, min·max 는 모듈이 내는 값의 끝(과범위 포함, 문서에 있을 때만) */
export interface CountRange {
  lo: number;
  hi: number;
  min?: number;
  max?: number;
}

export interface CountPreset {
  id: string;
  label: string;
  ko: string;
  en: string;
  /** 신호 종류별 범위 — 문서에서 확인한 신호만 */
  ranges: Partial<Record<SignalKind, CountRange>>;
  /** 출처(문서 이름·표) */
  src: string;
  url: string;
}

const S7: CountRange = { lo: 0, hi: 27648, min: -4864, max: 32511 };

export const COUNT_PRESETS: CountPreset[] = [
  {
    id: "s7",
    label: "SIMATIC S7-1500 · ET 200 (0–27648)",
    ko: "단극 입력: 0 = 하한, 27648 = 상한. 27649~32511 과범위, -1~-4864 저범위, 그 밖은 오버플로·언더플로",
    en: "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow",
    ranges: { "4-20mA": S7, "0-20mA": S7, "0-10V": S7, "1-5V": S7 },
    src: "Siemens, SIMATIC S7-1500/ET 200 Analog value processing Function Manual (A5E03461439-AC, 06/2014), Table 3-4 Unipolar input ranges",
    url: "https://cache.industry.siemens.com/dl/files/094/67989094/att_57770/v1/s71500_analog_value_processing_manual_en-US_en-US.pdf",
  },
  {
    id: "iqr",
    label: "MELSEC iQ-R (0–32000)",
    ko: "4~20 mA(R60AD6-DG 2선식 전송기 입력)·0~20 mA(R60AD4 등 전류 입력) → 디지털 출력 0~32000",
    en: "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000",
    ranges: { "4-20mA": { lo: 0, hi: 32000 }, "0-20mA": { lo: 0, hi: 32000 } },
    src: "Mitsubishi Electric, MELSEC iQ-R Series Product features – Analog – Specifications",
    url: "https://www.mitsubishielectric.com/fa/products/cnt/plcr/pmerit/analog/spec.html",
  },
  {
    id: "cl-eng",
    label: "Compact I/O 1769-IF4 · Engineering Units",
    ko: "4~20 mA → 4000~20000(3200~21000 까지), 0~20 mA → 0~20000, 0~10 V → 0~10000, 1~5 V → 1000~5000",
    en: "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
    ranges: {
      "4-20mA": { lo: 4000, hi: 20000, min: 3200, max: 21000 },
      "0-20mA": { lo: 0, hi: 20000, min: 0, max: 21000 },
      "0-10V": { lo: 0, hi: 10000, min: -500, max: 10500 },
      "1-5V": { lo: 1000, hi: 5000, min: 500, max: 5250 },
    },
    src: "Rockwell Automation, Compact I/O Analog Modules User Manual (1769-UM002B-EN-P, 07/2005), Table 3.7 Valid Input Data",
    url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1769-um002_-en-p.pdf",
  },
  {
    id: "cl-pid",
    label: "Compact I/O 1769-IF4 · Scaled-for-PID (0–16383)",
    ko: "4~20 mA·0~20 mA·0~10 V → 0~16383 (4~20 mA 는 -819~17407 까지)",
    en: "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)",
    ranges: {
      "4-20mA": { lo: 0, hi: 16383, min: -819, max: 17407 },
      "0-20mA": { lo: 0, hi: 16383, min: 0, max: 17202 },
      "0-10V": { lo: 0, hi: 16383, min: -819, max: 17202 },
    },
    src: "Rockwell Automation, Compact I/O Analog Modules User Manual (1769-UM002B-EN-P, 07/2005), Table 3.7 Valid Input Data",
    url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1769-um002_-en-p.pdf",
  },
];

export const presetOf = (id: string) => COUNT_PRESETS.find((p) => p.id === id);

/** 환산 설정 */
export interface Scale {
  signal: SignalKind;
  engLo: number;
  engHi: number;
  countLo: number;
  countHi: number;
}

export type Field = "sig" | "eng" | "pct" | "count";

export interface Values {
  /** 0 = 하한, 1 = 상한 */
  r: number;
  sig: number;
  eng: number;
  pct: number;
  count: number;
}

const lerp = (lo: number, hi: number, r: number) => lo + r * (hi - lo);
const ratio = (lo: number, hi: number, v: number) => (v - lo) / (hi - lo);

/** 비율 r 에서 네 값 */
export function fromRatio(s: Scale, r: number): Values {
  const g = signalOf(s.signal);
  return { r, sig: lerp(g.lo, g.hi, r), eng: lerp(s.engLo, s.engHi, r), pct: r * 100, count: lerp(s.countLo, s.countHi, r) };
}

/** 한 칸에 넣은 값에서 네 값 — 범위 폭이 0 이거나 숫자가 아니면 오류 */
export function convert(s: Scale, from: Field, v: number, lang: Lang = "ko"): Values {
  const ko = lang === "ko";
  for (const [n, x] of [
    ["v", v],
    ["engLo", s.engLo],
    ["engHi", s.engHi],
    ["countLo", s.countLo],
    ["countHi", s.countHi],
  ] as const)
    if (!Number.isFinite(x)) throw new Error(ko ? (n === "v" ? "숫자를 넣으세요" : "범위에 숫자를 넣으세요") : n === "v" ? "Enter a number" : "Enter numbers for the ranges");
  if (s.engLo === s.engHi) throw new Error(ko ? "공학값 하한과 상한이 같습니다" : "Engineering low and high are equal");
  if (s.countLo === s.countHi) throw new Error(ko ? "카운트 하한과 상한이 같습니다" : "Count low and high are equal");
  const g = signalOf(s.signal);
  const r =
    from === "sig" ? ratio(g.lo, g.hi, v) : from === "eng" ? ratio(s.engLo, s.engHi, v) : from === "pct" ? v / 100 : ratio(s.countLo, s.countHi, v);
  return fromRatio(s, r);
}

/** 0·25·50·75·100 % 환산 표(4~20 mA 면 4·8·12·16·20 mA) */
export function table(s: Scale): Values[] {
  return [0, 0.25, 0.5, 0.75, 1].map((r) => fromRatio(s, r));
}

export type Level = "ok" | "warn" | "fault";
export interface Status {
  level: Level;
  ko: string;
  en: string;
}

const EPS = 1e-9;

/**
 * 신호 값의 상태.
 * 4~20 mA 는 NAMUR NE 43 경계: 측정 정보 3.8~20.5 mA, 고장 신호 ≤3.6 mA·≥21 mA.
 * (Vaisala·Endress+Hauser 매뉴얼의 NE 43 설명으로 확인 — NE 43 원문은 유료)
 */
export function signalStatus(kind: SignalKind, v: number): Status {
  const g = signalOf(kind);
  const u = g.unit;
  if (kind === "4-20mA") {
    if (v <= 3.6 + EPS) return { level: "fault", ko: "3.6 mA 이하 — NE 43 의 고장 신호 범위(단선·센서 고장 등)", en: "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)" };
    if (v >= 21 - EPS) return { level: "fault", ko: "21 mA 이상 — NE 43 의 고장 신호 범위", en: "≥ 21 mA — NE 43 failure signal range" };
    if (v < 3.8 - EPS) return { level: "warn", ko: "3.6~3.8 mA — NE 43 의 측정 범위(3.8~20.5 mA) 밖", en: "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)" };
    if (v > 20.5 + EPS) return { level: "warn", ko: "20.5~21 mA — NE 43 의 측정 범위(3.8~20.5 mA) 밖", en: "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)" };
    if (v < 4 - EPS) return { level: "warn", ko: "4 mA 아래 — 하한 미만이지만 NE 43 측정 범위(3.8 mA 까지) 안", en: "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)" };
    if (v > 20 + EPS) return { level: "warn", ko: "20 mA 위 — 상한 초과지만 NE 43 측정 범위(20.5 mA 까지) 안", en: "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)" };
    return { level: "ok", ko: "정상 범위(4~20 mA)", en: "Within 4–20 mA" };
  }
  if (v < g.lo - EPS) return { level: "warn", ko: `하한(${g.lo} ${u}) 아래`, en: `Below the low end (${g.lo} ${u})` };
  if (v > g.hi + EPS) return { level: "warn", ko: `상한(${g.hi} ${u}) 위`, en: `Above the high end (${g.hi} ${u})` };
  return { level: "ok", ko: `정상 범위(${g.lo}~${g.hi} ${u})`, en: `Within ${g.lo}–${g.hi} ${u}` };
}

/** 카운트가 모듈이 내는 범위(min·max) 밖이면 알린다 */
export function countStatus(range: CountRange | undefined, count: number): Status | null {
  if (!range || range.min === undefined || range.max === undefined) return null;
  const c = Math.round(count);
  if (c > range.max) return { level: "fault", ko: `카운트 ${c} — 모듈이 내는 최대값(${range.max})을 넘습니다(오버플로)`, en: `Count ${c} exceeds the module maximum (${range.max}) — overflow` };
  if (c < range.min) return { level: "fault", ko: `카운트 ${c} — 모듈이 내는 최소값(${range.min}) 아래입니다(언더플로)`, en: `Count ${c} is below the module minimum (${range.min}) — underflow` };
  return null;
}

/** 보기 좋게 — 소수 넷째 자리까지, 끝 0 지움 */
export function fmt(v: number, digits = 4) {
  if (!Number.isFinite(v)) return "";
  const s = v.toFixed(digits);
  const t = s.includes(".") ? s.replace(/\.?0+$/, "") : s;
  return t === "-0" ? "0" : t;
}

/** 입력 글자 → 숫자(앞뒤 공백 허용, 빈칸은 NaN) */
export function num(s: string) {
  const t = s.trim();
  return t === "" ? NaN : Number(t);
}
