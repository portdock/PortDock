// 장비 프로필로 흉내(0.10.0) — 장비 데이터(data/devices) → 읽기/쓰기 제한·값 만들기(고정·잡음·누적)·칸 잇기 규칙.
// 화면(React) 없는 부분. node --test apps/modbus-slave/src/profile.test.ts 로 시험한다.
// 실행은 백엔드(crates/core/src/slave_profile.rs·regmap.rs)가 한다 — 여기서는 설정을 만들고 검사·설명한다.
//
// 장비 데이터에는 «운전 지령·주파수 설정·출력 주파수» 같은 역할 표시가 없다. 그래서 이름·단위·읽기/쓰기로 짐작한 규칙을 «짐작» 으로
// 넣고, 사용자가 «칸 잇기 규칙» 창에서 칸을 바꾸거나 지우고 새로 만든다. 값은 그럴듯한 예시이지 실제 장비 동작이 아니다.

import { devRegs, type Device, type DevRegister } from "../../../shared/devices.ts";
import { defaultSim, isBits, regsOf, type Lang, type Order, type Point, type SimCfg, type Table, type VType } from "./regmap.ts";

// ------------------------------------------------------------------ 모양

export interface CellRef {
  table: Table;
  addr: number;
}
export type LinkKind = "approach" | "scale" | "integrate";
export const LINK_KINDS: LinkKind[] = ["approach", "scale", "integrate"];

/** 칸 잇기 규칙 하나(화면 저장 모양) — 종류에 맞는 칸만 쓴다 */
export interface LinkCfg {
  kind: LinkKind;
  /** 결과 칸 */
  out: CellRef;
  /** 원본 칸(누적은 없어도 됨 — 그러면 gain 이 초당 늘어나는 양) */
  src: CellRef | null;
  /** 따라가기: 운전 지령 칸(없으면 늘 따라감) */
  run: CellRef | null;
  /** 운전 지령에서 볼 비트 묶음(0 이면 «0 이 아님») */
  runMask: number;
  gain: number;
  offset: number;
  /** 따라가기: 결과 칸 원시 값/초 */
  rate: number;
}

export type Access = "r" | "w" | "rw";
export interface GuardCell {
  table: Table;
  addr: number;
  count: number;
  access: Access;
}
export interface GuardCfg {
  /** 읽기 전용 칸 쓰기·쓰기 전용 칸 읽기를 막는다 */
  access: boolean;
  /** 맵에 없는 주소 → 예외 02 */
  unmapped: boolean;
  /** 막을 때 예외(02·03) */
  code: 2 | 3;
}
/** 맵에 없는 주소 → 예외 02 는 기본 끔 — 0.9 처럼 빈 번지를 0 으로 읽던 마스터 시험이 깨지지 않게(켜면 실제 장비처럼) */
export const DEFAULT_GUARD: GuardCfg = { access: true, unmapped: false, code: 2 };

/** 국번 하나의 장비 프로필 흉내 */
export interface SlaveProfile {
  /** 장비 id(«ls-electric/s100») */
  device: string;
  /** 화면 이름(«LS ELECTRIC LSLV-S100») */
  name: string;
  cells: GuardCell[];
  guard: GuardCfg;
  links: LinkCfg[];
}

/** 백엔드(set_guard) 모양 */
export interface GuardSpec {
  cells: GuardCell[];
  access: boolean;
  denyException: number;
  unmapped: boolean;
}
/** 백엔드(set_links) 모양 */
export interface CellSpec {
  table: Table;
  addr: number;
  valueType: Exclude<VType, "string">;
  order: Order;
}
export interface LinkSpec {
  out: CellSpec;
  rule:
    | { kind: "approach"; src: CellSpec; run: CellSpec | null; runMask: number; gain: number; rate: number }
    | { kind: "scale"; src: CellSpec; gain: number; offset: number }
    | { kind: "integrate"; src: CellSpec | null; gain: number };
}

// ------------------------------------------------------------------ 제한

/** 장비 → 칸마다 읽기/쓰기(주소·칸 수) */
export function guardCells(d: Device): GuardCell[] {
  return d.registers.map((r) => ({ table: r.table, addr: r.address, count: isBits(r.table) ? 1 : devRegs(r), access: r.access }));
}

/** 둘 다 끄면 null(제한 없음) */
export function guardSpec(p: SlaveProfile | undefined): GuardSpec | null {
  if (!p || (!p.guard.access && !p.guard.unmapped)) return null;
  return { cells: p.cells, access: p.guard.access, denyException: p.guard.code, unmapped: p.guard.unmapped };
}

/** 칸의 읽기/쓰기(맵에 없으면 undefined) — 화면 표시용 */
export function accessAt(p: SlaveProfile | undefined, table: Table, addr: number): Access | undefined {
  return p?.cells.find((c) => c.table === table && addr >= c.addr && addr < c.addr + c.count)?.access;
}

// ------------------------------------------------------------------ 칸 잇기 규칙 → 백엔드

/** 칸 → 백엔드 칸(형식은 그 자리 점, 없으면 u16·비트) */
export function cellSpec(c: CellRef, point: Point | undefined): CellSpec | null {
  if (isBits(c.table)) return { table: c.table, addr: c.addr, valueType: "bit", order: "ABCD" };
  const type = point?.type ?? "u16";
  if (type === "string") return null;
  return { table: c.table, addr: c.addr, valueType: type, order: point?.order ?? "ABCD" };
}

export type PointAt = (c: CellRef) => Point | undefined;

/** 설정 → 백엔드 모양. 칸이 문자열이거나 필요한 칸이 없으면 null */
export function linkSpec(l: LinkCfg, pointAt: PointAt): LinkSpec | null {
  const cs = (c: CellRef | null) => (c ? cellSpec(c, isBits(c.table) ? undefined : pointAt(c)) : null);
  const out = cs(l.out);
  if (!out) return null;
  const src = cs(l.src);
  if (l.kind === "approach") {
    if (!src || (l.run && !cs(l.run))) return null;
    return { out, rule: { kind: "approach", src, run: cs(l.run), runMask: l.runMask >>> 0, gain: l.gain, rate: l.rate } };
  }
  if (l.kind === "scale") return src ? { out, rule: { kind: "scale", src, gain: l.gain, offset: l.offset } } : null;
  if (l.src && !src) return null;
  return { out, rule: { kind: "integrate", src, gain: l.gain } };
}

const LM = {
  ko: {
    approach: "따라가기(가감속)",
    scale: "비례",
    integrate: "누적",
    noOut: "결과 칸을 고르세요.",
    noSrc: "원본 칸을 고르세요.",
    same: "결과 칸과 원본 칸이 같습니다.",
    num: "숫자가 아닌 칸이 있습니다.",
    rate: "빠르기는 0 보다 커야 합니다.",
    mask: "비트 묶음은 0~4294967295 입니다(0 이면 «0 이 아님»).",
    always: "늘",
    whenRun: "«{a}» 가 운전일 때",
    bitsOf: "비트 {a}",
    perSec: "/초",
    sumApproach: "{out} → {src} × {g} 로 {r}{ps} ({when}, 아니면 0 으로)",
    sumScale: "{out} = {src} × {g} + {o}",
    sumIntegrate: "{out} += {src} × {g}{ps}",
    sumIntegrateConst: "{out} += {g}{ps}",
  },
  en: {
    approach: "Follow (ramp)",
    scale: "Proportional",
    integrate: "Accumulate",
    noOut: "Choose the result cell.",
    noSrc: "Choose the source cell.",
    same: "The result and source cells are the same.",
    num: "Some fields are not numbers.",
    rate: "Rate must be greater than 0.",
    mask: "Bit mask is 0–4294967295 (0 means «not 0»).",
    always: "always",
    whenRun: "while «{a}» is running",
    bitsOf: "bits {a}",
    perSec: "/s",
    sumApproach: "{out} → {src} × {g} at {r}{ps} ({when}, otherwise to 0)",
    sumScale: "{out} = {src} × {g} + {o}",
    sumIntegrate: "{out} += {src} × {g}{ps}",
    sumIntegrateConst: "{out} += {g}{ps}",
  },
};

export const linkKindName = (k: LinkKind, lang: Lang) => LM[lang][k];
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
const sameCell = (a: CellRef | null, b: CellRef | null) => !!a && !!b && a.table === b.table && a.addr === b.addr;

/** 설정 검사 — 틀리면 이유 */
export function linkCheck(l: LinkCfg, lang: Lang): string | null {
  const m = LM[lang];
  if (!l.out) return m.noOut;
  if ((l.kind === "approach" || l.kind === "scale") && !l.src) return m.noSrc;
  if (sameCell(l.out, l.src) || sameCell(l.out, l.run)) return m.same;
  if (![l.gain, l.offset, l.rate, l.runMask].every((x) => typeof x === "number" && Number.isFinite(x))) return m.num;
  if (l.kind === "approach" && !(l.rate > 0)) return m.rate;
  if (!Number.isInteger(l.runMask) || l.runMask < 0 || l.runMask > 0xffffffff) return m.mask;
  return null;
}

/** 마스크 → «비트 1·2» */
export function maskBits(mask: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < 32; b++) if (Math.floor(mask / 2 ** b) % 2 === 1) out.push(b);
  return out;
}

const num = (x: number) => String(Number(x.toPrecision(6)));

/** 한 줄 설명 — label 은 칸 → «출력 주파수 (×0.01 Hz)» */
export function linkSummary(l: LinkCfg, label: (c: CellRef) => string, lang: Lang): string {
  const m = LM[lang];
  const out = label(l.out);
  const src = l.src ? label(l.src) : "";
  if (l.kind === "approach") {
    const when = !l.run ? m.always : fill(m.whenRun, { a: label(l.run) + (l.runMask ? ` ${fill(m.bitsOf, { a: maskBits(l.runMask).join("·") })}` : "") });
    return fill(m.sumApproach, { out, src, g: num(l.gain), r: num(l.rate), ps: m.perSec, when });
  }
  if (l.kind === "scale") return fill(m.sumScale, { out, src, g: num(l.gain), o: num(l.offset) });
  return l.src ? fill(m.sumIntegrate, { out, src, g: num(l.gain), ps: m.perSec }) : fill(m.sumIntegrateConst, { out, g: num(l.gain), ps: m.perSec });
}

export const newLink = (out: CellRef): LinkCfg => ({ kind: "approach", out, src: null, run: null, runMask: 0, gain: 1, offset: 0, rate: 100 });

// ------------------------------------------------------------------ 짐작(장비 데이터 → 값·규칙)

const en = (r: DevRegister) => r.name.en;
const unitOf = (r: DevRegister) => (r.unit ?? "").trim();
const sc = (r: DevRegister) => r.scale ?? 1;
const readable = (r: DevRegister) => r.access !== "w";
const writable = (r: DevRegister) => r.access !== "r";
const ref = (r: DevRegister): CellRef => ({ table: r.table, addr: r.address });
const numeric = (r: DevRegister) => r.type !== "string";

/** 형식이 담을 수 있는 원시 값 범위 */
function rawBounds(t: VType): [number, number] {
  switch (t) {
    case "bit":
      return [0, 1];
    case "u16":
      return [0, 0xffff];
    case "s16":
      return [-0x8000, 0x7fff];
    case "u32":
      return [0, 0xffffffff];
    case "s32":
      return [-0x80000000, 0x7fffffff];
    default:
      return [-3.4e38, 3.4e38];
  }
}
const isFloat = (t: VType) => t === "f32" || t === "f64";

/** 실제 값 → 원시 값(배율로 나누고 정수형은 반올림, 형식·범위 안으로) */
export function toRaw(r: DevRegister, real: number): number {
  let v = real;
  if (r.range?.min != null) v = Math.max(v, r.range.min);
  if (r.range?.max != null) v = Math.min(v, r.range.max);
  const raw = v / sc(r);
  const [lo, hi] = rawBounds(r.type);
  const x = Math.min(hi, Math.max(lo, raw));
  return isFloat(r.type) ? x : Math.round(x);
}

const POWER_UNIT: Record<string, ["p" | "q" | "s", number]> = {
  w: ["p", 1],
  kw: ["p", 1e3],
  mw: ["p", 1e6],
  var: ["q", 1],
  kvar: ["q", 1e3],
  mvar: ["q", 1e6],
  va: ["s", 1],
  kva: ["s", 1e3],
  mva: ["s", 1e6],
};
const ENERGY_UNIT: Record<string, ["p" | "q" | "s", number]> = {
  wh: ["p", 1],
  kwh: ["p", 1e3],
  mwh: ["p", 1e6],
  varh: ["q", 1],
  kvarh: ["q", 1e3],
  mvarh: ["q", 1e6],
  vah: ["s", 1],
  kvah: ["s", 1e3],
  mvah: ["s", 1e6],
};
const powerOf = (r: DevRegister) => POWER_UNIT[unitOf(r).toLowerCase()];
const energyOf = (r: DevRegister) => ENERGY_UNIT[unitOf(r).toLowerCase()];
const isPf = (r: DevRegister) => /power factor|\bPF/i.test(en(r)) && !unitOf(r);
const isHours = (r: DevRegister) => unitOf(r) === "h" && readable(r) && !writable(r);
/** 알람·최대·피크 때 값 — 움직이지 않는다 */
const frozen = (r: DevRegister) => /on alarm|peak|maximum|\bmax\b|giga|record|history|trip/i.test(en(r));

/** 짐작 결과 — 넣을 원시 값, 칸마다 값 만들기, 칸 잇기 규칙, 짐작한 역할 설명 */
export interface ProfilePlan {
  values: { table: Table; addr: number; value: number }[];
  sims: { table: Table; sim: SimCfg }[];
  links: LinkCfg[];
  /** 찾은 역할(«운전 지령 → 주소 5») — 화면 알림용 */
  roles: { role: Role; reg: DevRegister }[];
}
export type Role = "run" | "freqSet" | "outFreq" | "setpoint" | "pv" | "power" | "energy";

/** 잡음 설정 — 실제 값 v ± amp(원시 값으로), 한 번에 움직이는 폭은 amp/4. 정수형에서 1 칸도 못 움직이면 null(고정) */
function noise(r: DevRegister, v: number, amp: number): SimCfg | null {
  const lo = toRaw(r, v - amp);
  const hi = toRaw(r, v + amp);
  const step = Math.abs(hi - lo) / 8;
  if (!(hi > lo) || (!isFloat(r.type) && hi - lo < 2)) return null;
  const bits = isBits(r.table);
  return { ...defaultSim(r.address, bits), kind: "noise", min: Math.min(lo, hi), max: Math.max(lo, hi), step: isFloat(r.type) ? Number(step.toPrecision(3)) : Math.max(1, Math.round(step)), periodMs: 1000 };
}

/** 원본 실제 값 × k = 결과 실제 값 일 때 원시 값끼리의 배율 */
const rawGain = (src: DevRegister, out: DevRegister, k: number) => (k * sc(src)) / sc(out);

/** 채널 이름(«CH2 present value» → «2», 없으면 «1») */
const channel = (r: DevRegister) => /\bCH\s*(\d+)/i.exec(en(r))?.[1] ?? "1";

function inverterPlan(d: Device, plan: ProfilePlan) {
  const regs = d.registers.filter(numeric);
  const runRe = /operation command|run command|control input (command|instruction)|operation signals|operation commands|command word|control word|^FW \(forward run\)/i;
  const runNo = /selection|source|enter|\(ext\.?\)|PID|reset|speed|torque|frequency|extended|universal|virtual/i;
  const run = regs.find((r) => writable(r) && runRe.test(en(r)) && !runNo.test(en(r)));
  const freqRe = /frequency (command|reference|setting|setpoint)|(set|target|running|command) frequency|speed reference/i;
  const freqNo = /EEPROM|limit|upper|lower|jog|max|min|\(ext\.?\)|p\.u\.|final|alarm/i;
  // 단위가 Hz 인 칸을 먼저, 없으면 단위 없는 칸(배율이 장비 설정에 따르는 장비 — 0.01 Hz 로 본다)
  const hzOr = (r: DevRegister, noUnit: boolean) => unitOf(r) === "Hz" || (noUnit && !unitOf(r));
  const findSet = (noUnit: boolean) => regs.find((r) => writable(r) && hzOr(r, noUnit) && freqRe.test(en(r)) && !freqNo.test(en(r)));
  const freqSet = findSet(false) ?? findSet(true);
  const loose = !!freqSet && !unitOf(freqSet);
  const outFreqs = regs.filter((r) => readable(r) && !writable(r) && hzOr(r, loose) && /output frequency|operating frequency|actual frequency/i.test(en(r)) && !frozen(r) && !/p\.u\.|%/i.test(en(r)));
  if (run) plan.roles.push({ role: "run", reg: run });
  if (freqSet) plan.roles.push({ role: "freqSet", reg: freqSet });
  for (const o of outFreqs) plan.roles.push({ role: "outFreq", reg: o });
  // 운전 비트 — 정방향·역방향·운전(정지·리셋·조그·입력 단자 비트는 뺀다). DS402 제어 워드는 «운전 허가» 비트
  let mask = 0;
  for (const b of run?.bits ?? []) {
    const n = b.en;
    const yes = /enable operation/i.test(n) || (/forward|reverse|\bFWD\b|\bREV\b|\brun\b/i.test(n) && !/stop|reset|fault|external|jog|direction|selection|switch|general-purpose|multi-function|input|virtual|\bDI\d/i.test(n));
    if (yes) mask += 2 ** b.bit;
  }
  // 설정 주파수 예시 30 Hz — 마스터가 운전 지령만 써도 움직이게
  // 단위 없는 주파수 칸은 0.01 Hz 로 본다
  const hz = (r: DevRegister) => (unitOf(r) ? sc(r) : 0.01);
  if (freqSet) plan.values.push({ table: freqSet.table, addr: freqSet.address, value: toRaw(freqSet, (30 / hz(freqSet)) * sc(freqSet)) });
  const out = outFreqs[0];
  if (freqSet) {
    for (const o of outFreqs) {
      // 0 → 60 Hz 10초(초당 6 Hz) — 실제 가감속 시간은 장비 설정(파라미터)에 따른다
      plan.links.push({ kind: "approach", out: ref(o), src: ref(freqSet), run: run ? ref(run) : null, runMask: mask, gain: hz(freqSet) / hz(o), offset: 0, rate: 6 / hz(o) });
    }
  }
  if (!out) return;
  // 출력 주파수에 비례 — 60 Hz 일 때 값(그럴듯한 예시)
  const at60: { re: RegExp; units: Record<string, number> }[] = [
    { re: /output current/i, units: { A: 5, "%": 50 } },
    { re: /^(?!.*(converter|DC|reference|gain)).*output voltage/i, units: { V: 220, "%": 100 } },
    { re: /output power/i, units: { kW: 1.5, W: 1500, "%": 50 } },
    { re: /speed|rpm/i, units: { rpm: 1800, "r/min": 1800 } },
  ];
  const used = new Set<DevRegister>(outFreqs);
  for (const { re, units } of at60) {
    for (const r of regs) {
      if (used.has(r) || writable(r) || frozen(r) || !re.test(en(r)) || /command|reference|p\.u\./i.test(en(r))) continue;
      const nominal = units[unitOf(r)];
      if (nominal == null) continue;
      used.add(r);
      plan.links.push({ kind: "scale", out: ref(r), src: ref(out), run: null, runMask: 0, gain: (hz(out) * nominal) / 60 / sc(r), offset: 0, rate: 0 });
      if (powerOf(r)) plan.roles.push({ role: "power", reg: r });
    }
  }
  // DC 링크 전압 — 310 V 근처 잡음
  for (const r of regs) {
    if (used.has(r) || writable(r) || frozen(r) || unitOf(r) !== "V" || !/DC link|DC bus|converter output voltage|P-N/i.test(en(r))) continue;
    used.add(r);
    plan.values.push({ table: r.table, addr: r.address, value: toRaw(r, 310) });
    const s = noise(r, 310, 3);
    if (s) plan.sims.push({ table: r.table, sim: s });
  }
  // 전력량 — 출력 전력(kW·W)을 누적
  const power = regs.find((r) => used.has(r) && powerOf(r)?.[0] === "p");
  // kWh·MWh 두 칸에 나눠 담는 장비는 작은 단위 칸만 센다(자리 올림은 흉내 내지 않는다)
  const energies = regs.filter((r) => energyOf(r)?.[0] === "p" && !writable(r) && !frozen(r));
  const split = energies.some((r) => energyOf(r)![1] >= 1e6) && energies.some((r) => energyOf(r)![1] < 1e6);
  for (const r of energies) {
    const e = energyOf(r)!;
    if (split && e[1] >= 1e6) continue;
    if (power) {
      const p = powerOf(power)!;
      plan.links.push({ kind: "integrate", out: ref(r), src: ref(power), run: null, runMask: 0, gain: (sc(power) * p[1]) / (3600 * sc(r) * e[1]), offset: 0, rate: 0 });
      plan.roles.push({ role: "energy", reg: r });
    }
  }
}

function meterPlan(d: Device, plan: ProfilePlan) {
  // 측정값은 읽기 전용만, 전력량은 지울 수 있게(rw) 둔 장비도 있어 함께
  const regs = d.registers.filter((r) => numeric(r) && readable(r) && (!writable(r) || !!energyOf(r)));
  const totalRe = /total|sum|system|^active power$|^power$/i;
  const phase = (r: DevRegister) => /phase|\bL\d\b|\b[ABC]\b|line \d|P[abc]\b|Q[abc]\b/i.test(en(r)) && !totalRe.test(en(r));
  const famPower = (f: "p" | "q" | "s") => regs.find((r) => powerOf(r)?.[0] === f && !/demand/i.test(en(r)) && !frozen(r) && !phase(r)) ?? regs.find((r) => powerOf(r)?.[0] === f && !/demand/i.test(en(r)) && !frozen(r));
  // 기준(실제 값, W) — 3상 6 kW·무효 1 kvar·피상 6.1 kVA, 상마다 1/3
  const totals = { p: 6000, q: 1000, s: 6100 };
  const totalOf = { p: famPower("p"), q: famPower("q"), s: famPower("s") };
  if (totalOf.p) plan.roles.push({ role: "power", reg: totalOf.p });
  const put = (r: DevRegister, v: number, amp: number) => {
    plan.values.push({ table: r.table, addr: r.address, value: toRaw(r, v) });
    const s = amp > 0 ? noise(r, v, amp) : null;
    if (s) plan.sims.push({ table: r.table, sim: s });
  };
  for (const r of regs) {
    const n = en(r);
    const u = unitOf(r);
    const pw = powerOf(r);
    const eg = energyOf(r);
    if (/giga|counter|speed|swap|baud/i.test(n)) continue;
    if (eg) {
      // 내보낸(역방향) 에너지는 0 그대로. 나머지는 같은 종류 전력을 누적하고, 시작 값은 1,234.5 kWh 꼴
      if (/export|reverse|delivered|negative/i.test(n) || frozen(r)) continue;
      const [lo, hi] = rawBounds(r.type);
      const start = Math.min(1234.5 * 1000, (hi * sc(r) * eg[1]) / 2);
      plan.values.push({ table: r.table, addr: r.address, value: Math.max(lo, toRaw(r, start / eg[1])) });
      const src = totalOf[eg[0]];
      const p = src && powerOf(src);
      if (src && p) {
        plan.links.push({ kind: "integrate", out: ref(r), src: ref(src), run: null, runMask: 0, gain: (sc(src) * p[1]) / (3600 * sc(r) * eg[1]), offset: 0, rate: 0 });
        plan.roles.push({ role: "energy", reg: r });
      }
      continue;
    }
    if (pw) {
      const base = totals[pw[0]] / pw[1];
      const v = phase(r) ? base / 3 : base;
      put(r, v, frozen(r) ? 0 : v * 0.05);
      continue;
    }
    if (isPf(r)) put(r, 0.95, 0.01);
    else if (u === "V") put(r, /line voltage|line-to-line|L\d-L\d|\b[ABC]-[ABC]\b|V12|V23|V31|line \d to line \d/i.test(n) ? 380 : 220, 2);
    else if (u === "A") {
      const v = /neutral/i.test(n) ? 0.5 : /sum/i.test(n) ? 30 : 10;
      put(r, v, frozen(r) ? 0 : v * 0.05);
    } else if (u === "Hz") put(r, 60, 0.05);
    else if (u === "%" && /unbalance/i.test(n)) put(r, 1, 0.5);
    else if (isHours(r)) {
      plan.values.push({ table: r.table, addr: r.address, value: toRaw(r, 1234) });
      plan.links.push({ kind: "integrate", out: ref(r), src: null, run: null, runMask: 0, gain: 1 / 3600 / sc(r), offset: 0, rate: 0 });
    }
  }
}

function tempPlan(d: Device, plan: ProfilePlan) {
  const regs = d.registers.filter(numeric);
  const svRe = /\bSV\b|\bset ?value|\bset ?point/i;
  const svNo = /limit|number|read|low|high|multi|bank|alarm|ramp/i;
  const pvRe = /present value|\bPV\b|process value|measured value/i;
  const byCh = new Map<string, { sv?: DevRegister; pv?: DevRegister; svRead?: DevRegister }>();
  const ch = (r: DevRegister) => byCh.get(channel(r)) ?? byCh.set(channel(r), {}).get(channel(r))!;
  for (const r of regs) {
    const n = en(r);
    if (writable(r) && svRe.test(n) && !svNo.test(n)) ch(r).sv ??= r;
    else if (!writable(r) && pvRe.test(n) && !/alarm|peak|max|min|hold|internal|%FS/i.test(n)) ch(r).pv ??= r;
    else if (!writable(r) && svRe.test(n) && /read|in use|internal/i.test(n)) ch(r).svRead ??= r;
  }
  for (const { sv, pv, svRead } of byCh.values()) {
    if (!sv || !pv) continue;
    plan.roles.push({ role: "setpoint", reg: sv }, { role: "pv", reg: pv });
    plan.values.push({ table: sv.table, addr: sv.address, value: toRaw(sv, 50) }, { table: pv.table, addr: pv.address, value: toRaw(pv, 25) });
    // PV 가 SV 로 초당 1 (표시 단위)씩 — 실제 온도 변화는 히터·부하에 따른다
    plan.links.push({ kind: "approach", out: ref(pv), src: ref(sv), run: null, runMask: 0, gain: rawGain(sv, pv, 1), offset: 0, rate: 1 / sc(pv) });
    if (svRead) plan.links.push({ kind: "scale", out: ref(svRead), src: ref(sv), run: null, runMask: 0, gain: rawGain(sv, svRead, 1), offset: 0, rate: 0 });
  }
}

/** 장비 → 값·값 만들기·칸 잇기 규칙 짐작. 인버터·전력 미터·온도 조절기만, 나머지는 빈 계획(예시 값 그대로) */
export function planProfile(d: Device): ProfilePlan {
  const plan: ProfilePlan = { values: [], sims: [], links: [], roles: [] };
  if (d.kind === "inverter") inverterPlan(d, plan);
  else if (d.kind === "power-meter") meterPlan(d, plan);
  else if (d.kind === "temperature-controller") tempPlan(d, plan);
  // 같은 칸에 규칙과 값 만들기가 함께 걸리지 않게 — 규칙이 이긴다
  const outs = new Set(plan.links.map((l) => `${l.out.table}:${l.out.addr}`));
  plan.sims = plan.sims.filter((s) => !outs.has(`${s.table}:${s.sim.addr}`));
  return plan;
}

/** 새 프로필(제한은 기본값) */
export function makeProfile(d: Device, name: string, links: LinkCfg[]): SlaveProfile {
  return { device: d.id, name, cells: guardCells(d), guard: { ...DEFAULT_GUARD }, links };
}

// ------------------------------------------------------------------ 저장된 값 되살리기

const TABLES: Table[] = ["coils", "discrete-inputs", "holding-registers", "input-registers"];
const okCell = (c: unknown): c is CellRef => !!c && typeof c === "object" && TABLES.includes((c as CellRef).table) && Number.isInteger((c as CellRef).addr) && (c as CellRef).addr >= 0 && (c as CellRef).addr < 65536;

/** localStorage·설정 파일에서 읽은 프로필 — 모양이 틀린 것은 빼고 고쳐 넣는다 */
export function cleanProfiles(v: unknown): Record<string, SlaveProfile> {
  const out: Record<string, SlaveProfile> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, p] of Object.entries(v as Record<string, Partial<SlaveProfile>>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > 247 || !p || typeof p !== "object" || typeof p.device !== "string") continue;
    const cells = (Array.isArray(p.cells) ? p.cells : []).filter(
      (c) => okCell(c) && Number.isInteger(c.count) && c.count >= 1 && c.addr + c.count <= 65536 && ["r", "w", "rw"].includes(c.access),
    );
    const g = (p.guard ?? {}) as Partial<GuardCfg>;
    const links = (Array.isArray(p.links) ? p.links : []).filter(
      (l) => l && LINK_KINDS.includes(l.kind) && okCell(l.out) && (l.src == null || okCell(l.src)) && (l.run == null || okCell(l.run)) && linkCheck({ ...l, src: l.src ?? null, run: l.run ?? null }, "en") == null,
    );
    out[k] = {
      device: p.device,
      name: typeof p.name === "string" ? p.name : p.device,
      cells,
      guard: { access: g.access !== false, unmapped: g.unmapped === true, code: g.code === 3 ? 3 : 2 },
      links: links.map((l) => ({ ...l, src: l.src ?? null, run: l.run ?? null })),
    };
  }
  return out;
}

/** 칸의 원시 값 수(문자열 칸 길이 포함) — 화면에서 고를 칸 목록을 만들 때 */
export const cellRegs = (p: Point | undefined, table: Table) => (isBits(table) ? 1 : p ? regsOf(p.type, p.len) : 1);
