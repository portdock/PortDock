// 웹 도구 «24V DC 전원 용량 계산기» — 부하 목록(정상 전류·돌입 전류·동시 사용률) → 합계 전류·전력, 여유를 둔 필요 정격,
// 돌입 피크와 전원 피크 정격 비교, 흔한 정격에서 고르기, 서킷 프로텍터 채널 나누기 제안. 화면 없이 계산만(node --test).
// 수치는 사용자가 매뉴얼에서 넣는다 — 예시 값(EXAMPLE)은 «예시» 로만 쓰고, 돌입 전류·피크 정격·지속 시간은 제조사마다 달라 기본값을 두지 않는다.
// 여유율 m: 부하 ≤ 정격 × (1 − m) — 정격의 (100 − m) % 까지만 쓴다. 일반적으로 20~30 % 를 둔다(기본 25 %).

export type Lang = "ko" | "en";
type L = Record<Lang, string>;

/** 부하 종류 — 채널을 나눌 때 묶음을 가른다 */
export type LoadKind = "plc" | "hmi" | "comm" | "rio" | "sensor" | "lamp" | "valve" | "relay" | "fan" | "other";
/** 채널 묶음 — 제어·통신 / 센서·표시 / 밸브·릴레이·팬(켜고 끌 때 돌입·서지가 큰 부하) */
export type LoadGroup = "control" | "field" | "actuator";

export const KINDS: { id: LoadKind; name: L; group: LoadGroup }[] = [
  { id: "plc", name: { ko: "PLC(CPU·I/O)", en: "PLC (CPU, I/O)" }, group: "control" },
  { id: "hmi", name: { ko: "HMI·터치 패널", en: "HMI / touch panel" }, group: "control" },
  { id: "comm", name: { ko: "통신 변환기·스위치", en: "Converter / switch" }, group: "control" },
  { id: "rio", name: { ko: "리모트 I/O", en: "Remote I/O" }, group: "control" },
  { id: "sensor", name: { ko: "센서", en: "Sensor" }, group: "field" },
  { id: "lamp", name: { ko: "표시등·경광등", en: "Indicator / beacon" }, group: "field" },
  { id: "valve", name: { ko: "솔레노이드 밸브", en: "Solenoid valve" }, group: "actuator" },
  { id: "relay", name: { ko: "릴레이·접촉기 코일", en: "Relay / contactor coil" }, group: "actuator" },
  { id: "fan", name: { ko: "팬", en: "Fan" }, group: "actuator" },
  { id: "other", name: { ko: "기타", en: "Other" }, group: "control" },
];
export const GROUP_NAME: Record<LoadGroup, L> = {
  control: { ko: "제어·통신", en: "Control and communication" },
  field: { ko: "센서·표시", en: "Sensors and indicators" },
  actuator: { ko: "밸브·릴레이·팬", en: "Valves, relays and fans" },
};
export const groupOfKind = (k: LoadKind): LoadGroup => KINDS.find((x) => x.id === k)?.group ?? "control";

export interface Load {
  kind: LoadKind;
  name: string;
  /** 개수 */
  qty: number;
  /** 한 개의 정상 전류(mA) */
  ma: number;
  /** 한 개의 돌입(켤 때) 전류(mA). 모르면 0 → 정상 전류로 셈 */
  inrushMa: number;
  /** 동시 사용률 % (0~100). 늘 켜져 있으면 100 */
  duty: number;
}

/** 흔한 DIN 레일 24 V 전원 정격(A) — 제조사·계열마다 다르다. 이 안에서 맞는 가장 작은 것을 고른다 */
export const STD_RATINGS = [1.3, 2.5, 3.8, 5, 10, 20, 40];

export interface Opts {
  volts: number;
  /** 여유율 % (0~90) */
  margin: number;
  /** 전원 피크 정격 — 정격 전류의 몇 %(매뉴얼의 부스트·피크 값, 모르면 100) */
  peakPct: number;
  /** 서킷 프로텍터 한 채널 정격(A) */
  channelA: number;
}

export interface Result {
  /** 동시 사용률을 반영한 정상 합계(A) */
  steadyA: number;
  /** 모두 켜졌을 때 합계(A) */
  allOnA: number;
  /** 전력(W) = steadyA × V */
  watts: number;
  /** 여유를 둔 필요 정격(A) = steadyA ÷ (1 − m) */
  needA: number;
  /** 전원을 켤 때 모든 부하가 함께 켜질 때의 피크(A) = Σ qty × max(돌입, 정상) */
  peakA: number;
  /** 고른 정격(A). 목록보다 크면 undefined */
  ratingA?: number;
  /** 고른 정격의 부하율 % (steadyA ÷ ratingA) */
  loadPct?: number;
  /** 고른 정격의 피크 한도(A) = ratingA × peakPct */
  peakLimitA?: number;
  /** 피크가 피크 한도 안에 드는지(정격을 고르지 못했으면 false) */
  peakOk: boolean;
  /** 정상 기준만으로 고른 정격(돌입 때문에 올렸는지 비교용) */
  ratingBySteadyA?: number;
  /** 부하가 담긴 줄 수 */
  rows: number;
}

const fin = (x: number) => Number.isFinite(x);
const clean = (l: Load): Load => ({
  ...l,
  qty: fin(l.qty) && l.qty > 0 ? Math.floor(l.qty) : 0,
  ma: fin(l.ma) && l.ma > 0 ? l.ma : 0,
  inrushMa: fin(l.inrushMa) && l.inrushMa > 0 ? l.inrushMa : 0,
  duty: fin(l.duty) ? Math.min(100, Math.max(0, l.duty)) : 100,
});

/** 한 줄의 정상 전류(A, 동시 사용률 반영) */
export const rowSteadyA = (l: Load) => {
  const c = clean(l);
  return (c.qty * c.ma * c.duty) / 100 / 1000;
};
/** 한 줄의 모두 켜짐 전류(A) */
export const rowAllOnA = (l: Load) => {
  const c = clean(l);
  return (c.qty * c.ma) / 1000;
};
/** 한 줄의 켤 때 피크(A) */
export const rowPeakA = (l: Load) => {
  const c = clean(l);
  return (c.qty * Math.max(c.inrushMa, c.ma)) / 1000;
};

/** 정상 합계 need 와 피크 peak 를 모두 만족하는 가장 작은 흔한 정격 */
export function pickRating(needA: number, peakA: number, peakPct: number, list = STD_RATINGS): number | undefined {
  const pk = peakPct / 100;
  return list.find((r) => r >= needA - 1e-9 && r * pk >= peakA - 1e-9);
}

export function checkOpts(o: Opts): string | null {
  if (!fin(o.volts) || o.volts <= 0) return "volts";
  if (!fin(o.margin) || o.margin < 0 || o.margin >= 90) return "margin";
  if (!fin(o.peakPct) || o.peakPct < 100 || o.peakPct > 1000) return "peakPct";
  if (!fin(o.channelA) || o.channelA <= 0) return "channelA";
  return null;
}

export function sizeSupply(loads: Load[], o: Opts): Result {
  const bad = checkOpts(o);
  if (bad) throw new Error(bad);
  const ls = loads.map(clean).filter((l) => l.qty > 0 && l.ma > 0);
  const steadyA = ls.reduce((s, l) => s + rowSteadyA(l), 0);
  const allOnA = ls.reduce((s, l) => s + rowAllOnA(l), 0);
  const peakA = ls.reduce((s, l) => s + rowPeakA(l), 0);
  const needA = steadyA / (1 - o.margin / 100);
  const ratingA = pickRating(needA, peakA, o.peakPct);
  const ratingBySteadyA = pickRating(needA, 0, o.peakPct);
  return {
    steadyA,
    allOnA,
    watts: steadyA * o.volts,
    needA,
    peakA,
    ratingA,
    loadPct: ratingA ? (steadyA / ratingA) * 100 : undefined,
    peakLimitA: ratingA ? (ratingA * o.peakPct) / 100 : undefined,
    peakOk: ratingA !== undefined,
    ratingBySteadyA,
    rows: ls.length,
  };
}

// ---------------------------------------------------------------- 채널 나누기

export interface Part {
  /** loads 배열의 번호 */
  row: number;
  /** 이 채널에 넣은 개수 */
  qty: number;
}
export interface Channel {
  group: LoadGroup;
  parts: Part[];
  /** 모두 켜짐 기준 전류(A) */
  amps: number;
  /** 켤 때 피크(A) */
  peakA: number;
}
export interface Split {
  channels: Channel[];
  /** 한 개만으로도 채널 한도를 넘는 줄(나눌 수 없음) */
  tooBig: number[];
  /** 채널 한 개에 쓸 수 있는 전류(A) = channelA × (1 − m) */
  usableA: number;
}

/**
 * 서킷 프로텍터 채널 나누기 제안 — 묶음(제어·통신 / 센서·표시 / 밸브·릴레이·팬)을 섞지 않고,
 * 큰 줄부터 «모두 켜짐» 전류로 채널 한도(channelA × (1 − m))에 채운다(first-fit decreasing).
 * 한 줄이 한도를 넘으면 개수로 쪼갠다. 돌입은 채널마다 피크만 보여 주고(프로텍터 특성은 매뉴얼) 나누는 기준에 넣지 않는다.
 */
export function splitChannels(loads: Load[], o: Opts): Split {
  const bad = checkOpts(o);
  if (bad) throw new Error(bad);
  const usableA = o.channelA * (1 - o.margin / 100);
  const channels: Channel[] = [];
  const tooBig: number[] = [];
  const order: LoadGroup[] = ["control", "field", "actuator"];
  for (const g of order) {
    const rows = loads
      .map((l, i) => ({ l: clean(l), i }))
      .filter(({ l }) => l.qty > 0 && l.ma > 0 && groupOfKind(l.kind) === g)
      .sort((a, b) => rowAllOnA(b.l) - rowAllOnA(a.l) || a.i - b.i);
    const mine: Channel[] = [];
    for (const { l, i } of rows) {
      const unit = l.ma / 1000;
      const unitPk = Math.max(l.inrushMa, l.ma) / 1000;
      if (unit > usableA + 1e-9) {
        tooBig.push(i);
        continue;
      }
      let left = l.qty;
      while (left > 0) {
        let ch = mine.find((c) => c.amps + unit <= usableA + 1e-9);
        if (!ch) {
          ch = { group: g, parts: [], amps: 0, peakA: 0 };
          mine.push(ch);
        }
        const fit = Math.min(left, Math.floor((usableA - ch.amps + 1e-9) / unit));
        const part = ch.parts.find((p) => p.row === i);
        if (part) part.qty += fit;
        else ch.parts.push({ row: i, qty: fit });
        ch.amps += fit * unit;
        ch.peakA += fit * unitPk;
        left -= fit;
      }
    }
    channels.push(...mine);
  }
  return { channels, tooBig, usableA };
}

// ---------------------------------------------------------------- 저장·예시

export const STORE_KEY = "portdock-psu-sizing-v1";
export interface Saved {
  v: 1;
  loads: Load[];
  opts: Opts;
}
export const DEFAULT_OPTS: Opts = { volts: 24, margin: 25, peakPct: 100, channelA: 4 };

/** 예시 — 값은 «예시» 이고 실제는 장비 매뉴얼의 소비 전류·돌입 전류를 넣는다 */
export const EXAMPLE = (lang: Lang): Load[] => {
  const n = (k: LoadKind) => KINDS.find((x) => x.id === k)!.name[lang];
  return [
    { kind: "plc", name: n("plc"), qty: 1, ma: 600, inrushMa: 0, duty: 100 },
    { kind: "hmi", name: n("hmi"), qty: 1, ma: 500, inrushMa: 0, duty: 100 },
    { kind: "sensor", name: n("sensor"), qty: 16, ma: 25, inrushMa: 0, duty: 100 },
    { kind: "valve", name: n("valve"), qty: 8, ma: 100, inrushMa: 0, duty: 50 },
    { kind: "relay", name: n("relay"), qty: 6, ma: 40, inrushMa: 0, duty: 50 },
    { kind: "comm", name: n("comm"), qty: 1, ma: 150, inrushMa: 0, duty: 100 },
  ];
};

const KIND_IDS = new Set(KINDS.map((k) => k.id));
export function parseSaved(text: string | null): Saved | null {
  if (!text) return null;
  try {
    const o = JSON.parse(text) as Partial<Saved>;
    if (!o || o.v !== 1 || !Array.isArray(o.loads)) return null;
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
    const loads: Load[] = o.loads.slice(0, 200).map((x) => {
      const r = (x ?? {}) as Partial<Load>;
      return {
        kind: KIND_IDS.has(r.kind as LoadKind) ? (r.kind as LoadKind) : "other",
        name: typeof r.name === "string" ? r.name.slice(0, 80) : "",
        qty: num(r.qty, 1),
        ma: num(r.ma, 0),
        inrushMa: num(r.inrushMa, 0),
        duty: num(r.duty, 100),
      };
    });
    const p = (o.opts ?? {}) as Partial<Opts>;
    const opts: Opts = { volts: num(p.volts, 24), margin: num(p.margin, 25), peakPct: num(p.peakPct, 100), channelA: num(p.channelA, 4) };
    return { v: 1, loads, opts: checkOpts(opts) ? DEFAULT_OPTS : opts };
  } catch {
    return null;
  }
}
