// 장비 프로필(data/devices/<제조사>/<모델>.json, 스키마 data/devices/schema.json) → Modbus Master 폴링 표·Modbus Slave 칸.
// 화면(React) 없는 부분 — node --test shared/devices.test.ts 로 시험한다(Node 24 는 타입을 지우고 바로 돌린다).
// 데이터 자체는 빌드 때 shared/deviceData.ts 가 묶는다.

export type Lang = "ko" | "en";
export type DevTable = "coils" | "discrete-inputs" | "input-registers" | "holding-registers";
export type DevType = "bit" | "u16" | "s16" | "u32" | "s32" | "f32" | "f64" | "string";
export type DevOrder = "ABCD" | "CDAB" | "BADC" | "DCBA";
export interface Text {
  ko: string;
  en: string;
}

export interface DevRegister {
  table: DevTable;
  address: number;
  manualAddress: string;
  type: DevType;
  order?: DevOrder;
  len?: number;
  name: Text;
  unit?: string;
  scale?: number;
  access: "r" | "rw" | "w";
  fc: number[];
  range?: { min?: number; max?: number };
  values?: { value: number; ko: string; en: string }[];
  bits?: { bit: number; ko: string; en: string }[];
  description?: Text;
  ref?: string;
  source?: number;
}

export interface DevComm {
  baud?: number;
  bauds?: number[];
  dataBits?: 7 | 8;
  parity?: "none" | "even" | "odd";
  stopBits?: 1 | 2;
  unit?: number;
  unitRange?: [number, number];
  tcpPort?: number;
  order?: DevOrder;
  maxRegisters?: number;
  addressing: "zero" | "one" | "plc";
  notes?: Text[];
}

export interface DevSource {
  title: string;
  publisher?: string;
  edition?: string;
  url: string;
  pages?: string;
  checked: string;
}

export interface Device {
  schemaVersion: 1;
  id: string;
  manufacturer: Text;
  model: string;
  models?: string[];
  kind: "inverter" | "power-meter" | "temperature-controller" | "panel-meter" | "servo-drive" | "sensor" | "other";
  title: Text;
  summary?: Text;
  protocols: ("rtu" | "ascii" | "tcp")[];
  comm: DevComm;
  registers: DevRegister[];
  notes?: Text[];
  sources: DevSource[];
}

/** 장비 종류 이름 */
export const KIND_TEXT: Record<Device["kind"], Text> = {
  inverter: { ko: "인버터", en: "Inverter (VFD)" },
  "power-meter": { ko: "전력 미터", en: "Power meter" },
  "temperature-controller": { ko: "온도 조절기", en: "Temperature controller" },
  "panel-meter": { ko: "패널 미터", en: "Panel meter" },
  "servo-drive": { ko: "서보 드라이브", en: "Servo drive" },
  sensor: { ko: "센서", en: "Sensor" },
  other: { ko: "기타", en: "Other" },
};

/** 형식이 차지하는 레지스터 수(apps/modbus-slave/src/regmap.ts regsOf 와 같다) */
export function devRegs(r: Pick<DevRegister, "type" | "len">): number {
  if (r.type === "u32" || r.type === "s32" || r.type === "f32") return 2;
  if (r.type === "f64") return 4;
  if (r.type === "string") return Math.max(1, Math.ceil(Math.min(250, Math.max(1, r.len ?? 2)) / 2));
  return 1;
}

/** 배율 글 — 0.01 → «0.01», 1 → «» */
const scaleText = (s: number | undefined) => (s == null || s === 1 ? "" : String(s));

/** 칸 이름 — «출력 주파수 (×0.01 Hz)» · «출력 전류 (A)». 이름 칸(80자)에 들어가게 자른다 */
export function pointName(r: DevRegister, lang: Lang): string {
  const sc = scaleText(r.scale);
  const u = [sc && `×${sc}`, r.unit].filter(Boolean).join(" ");
  return (u ? `${r.name[lang]} (${u})` : r.name[lang]).slice(0, 80);
}

export const deviceName = (d: Device, lang: Lang) => `${d.manufacturer[lang]} ${d.model}`;

/** 목록 찾기 — 제조사·모델·형번·제목·종류에 모든 낱말이 들어 있으면 */
export function matchDevice(d: Device, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [d.id, d.manufacturer.ko, d.manufacturer.en, d.model, ...(d.models ?? []), d.title.ko, d.title.en, KIND_TEXT[d.kind].ko, KIND_TEXT[d.kind].en].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** 표 → 읽기 함수 코드. 보유 레지스터는 03 이 없고 04 만 적힌 장비면 04 */
export function readFc(r: DevRegister): 1 | 2 | 3 | 4 | null {
  if (r.access === "w") return null;
  switch (r.table) {
    case "coils":
      return 1;
    case "discrete-inputs":
      return 2;
    case "input-registers":
      return 4;
    default:
      return r.fc.includes(3) ? 3 : r.fc.includes(4) ? 4 : null;
  }
}

/** Master 폴링 표 하나의 모양(PollTable 의 일부) */
export interface PollGroup {
  name: string;
  fc: 1 | 2 | 3 | 4;
  start: number;
  qty: number;
  points: { addr: number; type: DevType; order: DevOrder; name: string; len?: number }[];
  /** 이 표에 든 레지스터 수 */
  count: number;
}

const FC_SHORT: Record<number, string> = { 1: "CO", 2: "DI", 3: "HR", 4: "IR" };

/**
 * 장비 → 폴링 표들. 읽을 수 있는 레지스터만, 함수 코드별로 주소 순서대로 묶는다.
 * gap = 사이에 둘 수 있는 빈 주소 수(0 이면 이어진 칸만 — 빈 주소를 거부하는 장비가 많다). 한 표는 최대 maxQty 칸
 */
export function pollGroups(d: Device, lang: Lang, gap = 0, maxQty = Math.min(125, d.comm.maxRegisters ?? 125)): PollGroup[] {
  const byFc = new Map<number, DevRegister[]>();
  for (const r of d.registers) {
    const fc = readFc(r);
    if (fc == null) continue;
    (byFc.get(fc) ?? byFc.set(fc, []).get(fc)!).push(r);
  }
  const out: PollGroup[] = [];
  for (const fc of [...byFc.keys()].sort((a, b) => a - b)) {
    const bits = fc === 1 || fc === 2;
    const lim = bits ? 2000 : maxQty;
    const list = byFc.get(fc)!.sort((a, b) => a.address - b.address);
    let cur: PollGroup | null = null;
    for (const r of list) {
      const span = devRegs(r);
      const end = r.address + span;
      if (cur && r.address - (cur.start + cur.qty) <= gap && end - cur.start <= lim) cur.qty = Math.max(cur.qty, end - cur.start);
      else {
        cur = { name: "", fc: fc as PollGroup["fc"], start: r.address, qty: span, points: [], count: 0 };
        out.push(cur);
      }
      cur.count++;
      cur.points.push({ addr: r.address, type: bits ? "bit" : r.type, order: r.order ?? d.comm.order ?? "ABCD", name: pointName(r, lang), ...(r.type === "string" ? { len: r.len } : {}) });
    }
  }
  // 이름: «iG5A HR 0x0000» 꼴(탭 40자 안)
  for (const g of out) g.name = `${d.model} ${FC_SHORT[g.fc]} ${g.start}`.slice(0, 40);
  return out;
}

/** 통신 기본값 → 시리얼 설정 일부(매뉴얼에 있는 것만) */
export function serialDefaults(d: Device): { baud?: number; dataBits?: number; parity?: "none" | "even" | "odd"; stopBits?: number } {
  const c = d.comm;
  return {
    ...(c.baud ? { baud: c.baud } : {}),
    ...(c.dataBits ? { dataBits: c.dataBits } : {}),
    ...(c.parity ? { parity: c.parity } : {}),
    ...(c.stopBits ? { stopBits: c.stopBits } : {}),
  };
}

/** Slave 흉내 줄 — PortDock CSV 줄 모양(table,address,type,order,name,value). 값은 예시 */
export interface SlaveRow {
  table: DevTable;
  address: number;
  type: DevType;
  order: DevOrder;
  name: string;
  value: number | string;
  len?: number;
}

/**
 * 예시 값(원시 값) — 열거가 있으면 첫 값, 범위가 있으면 최솟값(0 이 범위 안이면 0), 문자열은 모델 이름, 나머지 0.
 * 배율이 있으면 원시 값으로 나눠 정수로
 */
export function exampleRaw(r: DevRegister, d: Device): number | string {
  if (r.type === "string") return d.model.slice(0, r.len ?? 2);
  if (r.values?.length) return r.values[0].value;
  const lo = r.range?.min;
  const hi = r.range?.max;
  let v = 0;
  if (lo != null && lo > 0) v = lo;
  else if (hi != null && hi < 0) v = hi;
  const sc = r.scale ?? 1;
  const raw = v / sc;
  return r.type === "f32" || r.type === "f64" ? raw : Math.round(raw);
}

export function slaveRows(d: Device, lang: Lang): SlaveRow[] {
  return d.registers.map((r) => ({
    table: r.table,
    address: r.address,
    type: r.type,
    order: r.order ?? d.comm.order ?? "ABCD",
    name: pointName(r, lang),
    value: exampleRaw(r, d),
    ...(r.type === "string" ? { len: r.len } : {}),
  }));
}

/** 표마다 덮어야 할 주소 범위 [start, end) — Slave 응답 범위를 넓힐 때 */
export function tableSpans(d: Device): Map<DevTable, { start: number; end: number }> {
  const m = new Map<DevTable, { start: number; end: number }>();
  for (const r of d.registers) {
    const end = r.address + devRegs(r);
    const cur = m.get(r.table);
    if (!cur) m.set(r.table, { start: r.address, end });
    else {
      cur.start = Math.min(cur.start, r.address);
      cur.end = Math.max(cur.end, end);
    }
  }
  return m;
}

/** 통신 기본값 한 줄 — «9600 8N1 · 국번 1 · 주소 0 기준» */
export function commLine(d: Device, lang: Lang): string {
  const c = d.comm;
  const p = c.parity === "even" ? "E" : c.parity === "odd" ? "O" : c.parity === "none" ? "N" : "?";
  const parts: string[] = [];
  // 데이터·패리티·정지가 다 있으면 «8E1», 아니면 아는 것만(매뉴얼에 없는 값은 비운다)
  if (c.dataBits && c.parity && c.stopBits) parts.push(`${c.baud ?? ""} ${c.dataBits}${p}${c.stopBits}`.trim());
  else {
    const par = c.parity && { none: { ko: "패리티 없음", en: "no parity" }, even: { ko: "짝수 패리티", en: "even parity" }, odd: { ko: "홀수 패리티", en: "odd parity" } }[c.parity][lang];
    const known = [c.baud && String(c.baud), c.dataBits && (lang === "ko" ? `데이터 ${c.dataBits}` : `${c.dataBits} data bits`), par, c.stopBits && (lang === "ko" ? `정지 ${c.stopBits}` : `${c.stopBits} stop`)].filter(Boolean);
    if (known.length) parts.push(known.join(" "));
  }
  if (c.unit != null) parts.push(lang === "ko" ? `국번 ${c.unit}` : `Slave ID ${c.unit}`);
  if (c.tcpPort) parts.push(`TCP ${c.tcpPort}`);
  const am = { zero: { ko: "매뉴얼 주소 0 기준", en: "manual uses 0-based addresses" }, one: { ko: "매뉴얼 주소 1 기준", en: "manual uses 1-based addresses" }, plc: { ko: "매뉴얼 주소 40001 꼴", en: "manual uses 40001-style addresses" } }[c.addressing];
  parts.push(am[lang]);
  return parts.join(" · ");
}
