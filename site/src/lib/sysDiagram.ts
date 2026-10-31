// 웹 도구 «시스템 구성도 그리기» — 구성도 문서(JSON) 스키마·검사, «구성 점검» 규칙, 예시, Net Scan CSV 불러오기, 그리기(Drawing).
// 화면 없이 계산만 한다(node --test 로 시험). 편집 화면은 views/SystemDiagramPage.astro.
// 점검 규칙:
//   - IP 중복, IP·마스크 모양
//   - 이더넷·Wi-Fi 로 이어진 «같은 L2 묶음»(스위치·무선 AP 는 지나가고, 라우터·클라우드에서 끊음) 안에서 네트워크 주소가 다르면 경고(subnet.ts 와 같은 계산)
//   - RS-485·CAN 버스: 같은 버스의 국번 중복, 국번 1~247(Modbus), 장비 보율·패리티가 버스와 다름, 버스에 마스터(USB-RS485·게이트웨이) 둘 이상
//   - RS-485 단위 부하 합이 32 를 넘음(장비마다 1·1/2·1/4·1/8, 없으면 1)
//   - RS-485 종단: 종단 정보(장비 «종단 켬»·버스 끝 종단)를 하나라도 적었으면 — 버스 위 장비 순서(닿는 x)로 양 끝에 종단이 있는지, 중간 장비에 켜져 있는지
//   - 아무 선도 없는 장비
// 버스 요약(busStats): 장비 수·단위 부하·종단 위치·한 바퀴 폴링 어림(serialTiming.ts 의 poll 계산식 재사용).
// JSON 스키마는 version 1 그대로 — 새 칸(term·ul·regs·termStart·termEnd)은 모두 고를 수 있는 칸이라 옛 파일도 그대로 열린다.
import type { Drawing, Ink, LegendItem, Shape } from "./diagramSvg.ts";
import { maskOf, parseIp, parseMask, ipStr } from "./subnet.ts";
import { poll, QTY_MAX, type CharFormat } from "./serialTiming.ts";

export type Lang = "ko" | "en";
export type NodeKind = "pc" | "ipc" | "plc" | "hmi" | "inverter" | "meter" | "sensor" | "switch" | "usb485" | "gateway" | "ap" | "router" | "cloud" | "other";
export const NODE_KINDS: NodeKind[] = ["pc", "ipc", "plc", "hmi", "inverter", "meter", "sensor", "switch", "usb485", "gateway", "ap", "router", "cloud", "other"];
export const NODE_NAME: Record<NodeKind, Record<Lang, string>> = {
  pc: { ko: "PC", en: "PC" },
  ipc: { ko: "산업용 PC", en: "Industrial PC" },
  plc: { ko: "PLC", en: "PLC" },
  hmi: { ko: "HMI", en: "HMI" },
  inverter: { ko: "인버터", en: "Inverter (VFD)" },
  meter: { ko: "전력 미터", en: "Power meter" },
  sensor: { ko: "센서·계측기", en: "Sensor / instrument" },
  switch: { ko: "스위치", en: "Switch" },
  usb485: { ko: "USB-RS485 변환기", en: "USB-RS485 adapter" },
  gateway: { ko: "시리얼 서버·게이트웨이", en: "Serial server / gateway" },
  ap: { ko: "무선 AP", en: "Wireless AP" },
  router: { ko: "라우터", en: "Router" },
  cloud: { ko: "클라우드·서버", en: "Cloud / server" },
  other: { ko: "기타 장비", en: "Other device" },
};

export type LinkKind = "eth" | "rs485" | "rs232" | "usb" | "can" | "wifi" | "analog";
export const LINK_KINDS: LinkKind[] = ["eth", "rs485", "rs232", "usb", "can", "wifi", "analog"];
export const LINK_NAME: Record<LinkKind, Record<Lang, string>> = {
  eth: { ko: "이더넷", en: "Ethernet" },
  rs485: { ko: "RS-485", en: "RS-485" },
  rs232: { ko: "RS-232", en: "RS-232" },
  usb: { ko: "USB", en: "USB" },
  can: { ko: "CAN", en: "CAN" },
  wifi: { ko: "Wi-Fi", en: "Wi-Fi" },
  analog: { ko: "4-20mA", en: "4-20 mA" },
};
export const LINK_STYLE: Record<LinkKind, { c: Ink; dash?: boolean; w: number }> = {
  eth: { c: "eth", w: 2.6 },
  rs485: { c: "dp", w: 2.6 },
  rs232: { c: "dn", w: 2.2, dash: true },
  usb: { c: "usb", w: 2.2 },
  can: { c: "can", w: 2.6 },
  wifi: { c: "wifi", w: 2, dash: true },
  analog: { c: "loop", w: 2, dash: true },
};

export type Parity = "none" | "even" | "odd";
export interface SysNode {
  id: string;
  kind: NodeKind;
  name: string;
  x: number;
  y: number;
  ip?: string;
  mask?: string;
  unit?: number;
  baud?: number;
  parity?: Parity;
  note?: string;
  /** RS-485: 이 장비의 종단 저항을 켰나(버스 끝 장비) */
  term?: boolean;
  /** RS-485: 단위 부하(1·0.5·0.25·0.125) — 없으면 1 */
  ul?: number;
  /** 폴링 어림: 이 장비에서 한 바퀴에 읽는 레지스터 수 — 없으면 DEFAULT_REGS */
  regs?: number;
}
export interface SysBus {
  id: string;
  kind: "rs485" | "can";
  name: string;
  x: number;
  y: number;
  len: number;
  baud?: number;
  parity?: Parity;
  /** RS-485: 버스 왼쪽·오른쪽 끝에 따로 단 종단(장비 밖 종단 저항) */
  termStart?: boolean;
  termEnd?: boolean;
}
export interface SysLink {
  id: string;
  kind: LinkKind;
  a: string;
  b: string;
  label?: string;
}
export interface SysDoc {
  format: "portdock-system-diagram";
  version: 1;
  title: string;
  nodes: SysNode[];
  buses: SysBus[];
  links: SysLink[];
}

export const FORMAT = "portdock-system-diagram";
export const NODE_W = 150;
export const NODE_H = 66;
export const LIMITS = { nodes: 200, buses: 20, links: 400, text: 80, note: 300 };
/** 고를 수 있는 단위 부하 */
export const UNIT_LOADS = [1, 0.5, 0.25, 0.125];
/** 표준 송수신기(1 단위 부하) 기준 한 버스 한도 */
export const UL_MAX = 32;
/** 장비당 읽는 레지스터 수를 적지 않았을 때 */
export const DEFAULT_REGS = 10;
/** 폴링 어림에 쓰는 슬레이브 응답 지연(초) — 시리얼 통신 시간 계산기 기본값과 같다 */
export const DEFAULT_SLAVE_DELAY = 0.01;

export const emptyDoc = (title = ""): SysDoc => ({ format: FORMAT, version: 1, title, nodes: [], buses: [], links: [] });

// ---------------------------------------------------------------- JSON 검사

export interface Validated {
  doc: SysDoc | null;
  errors: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const PARITIES: Parity[] = ["none", "even", "odd"];

/** 불러온 JSON → 문서. 모양이 틀린 칸은 오류 목록에(영어 짧은 글 — 화면이 앞에 «불러오지 못함» 을 붙인다) */
export function validateDoc(raw: unknown): Validated {
  const errors: string[] = [];
  if (!isObj(raw)) return { doc: null, errors: ["not an object"] };
  if (raw.format !== FORMAT) errors.push(`format must be "${FORMAT}"`);
  if (raw.version !== 1) errors.push("version must be 1");
  if (!Array.isArray(raw.nodes)) errors.push("nodes must be an array");
  if (raw.buses !== undefined && !Array.isArray(raw.buses)) errors.push("buses must be an array");
  if (raw.links !== undefined && !Array.isArray(raw.links)) errors.push("links must be an array");
  if (errors.length) return { doc: null, errors };
  const doc = emptyDoc(str(raw.title, LIMITS.text) ?? "");
  const ids = new Set<string>();
  const nodes = raw.nodes as unknown[];
  const buses = (raw.buses ?? []) as unknown[];
  const links = (raw.links ?? []) as unknown[];
  if (nodes.length > LIMITS.nodes) errors.push(`too many nodes (max ${LIMITS.nodes})`);
  if (buses.length > LIMITS.buses) errors.push(`too many buses (max ${LIMITS.buses})`);
  if (links.length > LIMITS.links) errors.push(`too many links (max ${LIMITS.links})`);
  const okId = (id: unknown, where: string) => {
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
      errors.push(`${where}: bad id`);
      return null;
    }
    if (ids.has(id)) {
      errors.push(`${where}: duplicate id ${id}`);
      return null;
    }
    ids.add(id);
    return id;
  };
  nodes.slice(0, LIMITS.nodes).forEach((n, i) => {
    const w = `nodes[${i}]`;
    if (!isObj(n)) return void errors.push(`${w}: not an object`);
    const id = okId(n.id, w);
    const kind = NODE_KINDS.includes(n.kind as NodeKind) ? (n.kind as NodeKind) : null;
    if (!kind) errors.push(`${w}: unknown kind`);
    const x = finite(n.x);
    const y = finite(n.y);
    if (x === undefined || y === undefined) errors.push(`${w}: x, y must be numbers`);
    if (!id || !kind || x === undefined || y === undefined) return;
    const node: SysNode = { id, kind, name: str(n.name, LIMITS.text) ?? "", x: clampPos(x), y: clampPos(y) };
    const ip = str(n.ip, 40);
    if (ip) node.ip = ip;
    const mask = str(n.mask, 40);
    if (mask) node.mask = mask;
    const unit = finite(n.unit);
    if (unit !== undefined) node.unit = Math.round(unit);
    const baud = finite(n.baud);
    if (baud !== undefined && baud > 0) node.baud = Math.round(baud);
    if (PARITIES.includes(n.parity as Parity)) node.parity = n.parity as Parity;
    const note = str(n.note, LIMITS.note);
    if (note) node.note = note;
    if (n.term === true) node.term = true;
    const ul = finite(n.ul);
    if (ul !== undefined && UNIT_LOADS.includes(ul)) node.ul = ul;
    const regs = finite(n.regs);
    if (regs !== undefined && regs >= 1) node.regs = Math.min(10000, Math.round(regs));
    doc.nodes.push(node);
  });
  buses.slice(0, LIMITS.buses).forEach((b, i) => {
    const w = `buses[${i}]`;
    if (!isObj(b)) return void errors.push(`${w}: not an object`);
    const id = okId(b.id, w);
    const kind = b.kind === "rs485" || b.kind === "can" ? b.kind : null;
    if (!kind) errors.push(`${w}: kind must be rs485 or can`);
    const x = finite(b.x);
    const y = finite(b.y);
    const len = finite(b.len);
    if (x === undefined || y === undefined || len === undefined) errors.push(`${w}: x, y, len must be numbers`);
    if (!id || !kind || x === undefined || y === undefined || len === undefined) return;
    const bus: SysBus = { id, kind, name: str(b.name, LIMITS.text) ?? "", x: clampPos(x), y: clampPos(y), len: Math.max(120, Math.min(4000, len)) };
    const baud = finite(b.baud);
    if (baud !== undefined && baud > 0) bus.baud = Math.round(baud);
    if (PARITIES.includes(b.parity as Parity)) bus.parity = b.parity as Parity;
    if (b.termStart === true) bus.termStart = true;
    if (b.termEnd === true) bus.termEnd = true;
    doc.buses.push(bus);
  });
  const busIds = new Set(doc.buses.map((b) => b.id));
  const nodeIds = new Set(doc.nodes.map((n) => n.id));
  links.slice(0, LIMITS.links).forEach((l, i) => {
    const w = `links[${i}]`;
    if (!isObj(l)) return void errors.push(`${w}: not an object`);
    const id = okId(l.id, w);
    const kind = LINK_KINDS.includes(l.kind as LinkKind) ? (l.kind as LinkKind) : null;
    if (!kind) errors.push(`${w}: unknown kind`);
    const a = typeof l.a === "string" ? l.a : "";
    const b = typeof l.b === "string" ? l.b : "";
    const known = (v: string) => nodeIds.has(v) || busIds.has(v);
    if (!known(a) || !known(b)) errors.push(`${w}: a, b must be node or bus ids`);
    if (a === b) errors.push(`${w}: a and b are the same`);
    if (!id || !kind || !known(a) || !known(b) || a === b) return;
    const why = linkProblem(kind, a, b, busIds, doc.buses);
    if (why) return void errors.push(`${w}: ${why}`);
    const link: SysLink = { id, kind, a, b };
    const label = str(l.label, LIMITS.text);
    if (label) link.label = label;
    doc.links.push(link);
  });
  return { doc, errors };
}

const clampPos = (v: number) => Math.max(0, Math.min(6000, Math.round(v)));

/** 선 종류와 양 끝이 맞는가 — 버스에는 그 버스 종류 선만, 버스끼리는 잇지 않음 */
export function linkProblem(kind: LinkKind, a: string, b: string, busIds: Set<string>, buses: SysBus[]): string | null {
  const ab = busIds.has(a);
  const bb = busIds.has(b);
  if (ab && bb) return "bus to bus";
  if (ab || bb) {
    const bus = buses.find((x) => x.id === (ab ? a : b))!;
    if (bus.kind !== kind) return `${kind} link to a ${bus.kind} bus`;
  }
  return null;
}

// ---------------------------------------------------------------- 구성 점검

export type Level = "info" | "warn" | "fault";
export interface Finding {
  level: Level;
  text: string;
  /** 관련 노드·버스 id(누르면 그것을 고른다) */
  ids: string[];
}

const DEFAULT_PREFIX = 24;
const MASTER_KINDS: NodeKind[] = ["usb485", "gateway"];
/** 라우터·클라우드에서 L2 묶음을 끊는다(스위치·AP 등 나머지는 지나간다) */
const L2_STOP: NodeKind[] = ["router", "cloud"];

export function nodePrefix(n: SysNode): number | null {
  if (!n.mask) return null;
  return parseMask(n.mask);
}

/** 이더넷·Wi-Fi 로 이어진 묶음 — 스위치·AP 를 지나가고, 라우터·클라우드에서 끊는다. 각 묶음은 노드 id 목록 */
export function l2Groups(doc: SysDoc): string[][] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const l of doc.links) {
    if (l.kind !== "eth" && l.kind !== "wifi") continue;
    if (!byId.has(l.a) || !byId.has(l.b)) continue;
    adj.set(l.a, [...(adj.get(l.a) ?? []), l.b]);
    adj.set(l.b, [...(adj.get(l.b) ?? []), l.a]);
  }
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of doc.nodes) {
    if (seen.has(start.id) || !adj.has(start.id) || L2_STOP.includes(start.kind)) continue;
    const g: string[] = [];
    const stack = [start.id];
    seen.add(start.id);
    while (stack.length) {
      const id = stack.pop()!;
      g.push(id);
      const n = byId.get(id)!;
      // 라우터·클라우드는 묶음 끝 — 들어가되 더 지나가지 않는다(시작점일 때는 위에서 건너뜀)
      if (L2_STOP.includes(n.kind)) continue;
      for (const nb of adj.get(id) ?? []) {
        if (seen.has(nb)) continue;
        const m = byId.get(nb)!;
        if (L2_STOP.includes(m.kind)) {
          g.push(nb); // 경계로 기록만(다른 묶음에도 들어갈 수 있게 seen 에 넣지 않음)
          continue;
        }
        seen.add(nb);
        stack.push(nb);
      }
    }
    groups.push([...new Set(g)]);
  }
  return groups;
}

// ---------------------------------------------------------------- 버스 요약

export interface BusTerm {
  /** 버스 위 x */
  x: number;
  /** 장비 id, 버스 끝 종단이면 버스 id */
  id: string;
  /** "node" | "start" | "end" */
  at: "node" | "start" | "end";
}
export interface BusStat {
  bus: SysBus;
  /** 이어진 장비(버스 위 닿는 x 순) */
  devices: SysNode[];
  slaves: SysNode[];
  masters: SysNode[];
  unitLoads: number;
  baud: number;
  /** 버스·장비 어디에도 보율이 없어 9600 으로 봤나 */
  baudAssumed: boolean;
  parity: Parity;
  /** regs 를 적지 않아 DEFAULT_REGS 로 본 슬레이브 수 */
  regsAssumed: number;
  /** 한 바퀴 폴링 어림(초) — RS-485 슬레이브가 없으면 0 */
  cycle: number;
  /** 종단 위치 — termKnown 이 false 면 비어 있다 */
  terms: BusTerm[];
  /** 종단 정보를 하나라도 적었나(옛 파일·안 적은 버스는 종단 점검을 하지 않는다) */
  termKnown: boolean;
  /** 버스 양 끝 장비(닿는 x 가장 작은·큰) */
  left: SysNode | null;
  right: SysNode | null;
}

/** 버스 위 장비 목록(중복 없이, 닿는 x 순 — 같으면 id 순) */
export function busDevices(doc: SysDoc, bus: SysBus): SysNode[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const on = doc.links.filter((l) => l.a === bus.id || l.b === bus.id).map((l) => byId.get(l.a === bus.id ? l.b : l.a)).filter((n): n is SysNode => !!n);
  const uniq = [...new Map(on.map((n) => [n.id, n])).values()];
  return uniq.sort((a, b) => busTouchX(bus, a) - busTouchX(bus, b) || (a.id < b.id ? -1 : 1));
}

/** 한 장비 폴링 시간 — 125 개씩 나눠 FC03 으로 읽는다고 보고 serialTiming.poll 로 계산 */
export function devicePollTime(regs: number, baud: number, parity: Parity): number {
  const n = Math.max(1, Math.round(regs));
  const k = Math.ceil(n / QTY_MAX[3]);
  // RTU 문자 형식(11 비트): 패리티 있으면 정지 1, 없으면 정지 2
  const format: CharFormat = { dataBits: 8, parity, stopBits: parity === "none" ? 2 : 1 };
  return poll({ baud, format, fc: 3, qty: Math.ceil(n / k), slaveDelay: DEFAULT_SLAVE_DELAY, masterGap: 0, transactions: k }).cycle;
}

export function busStats(doc: SysDoc, bus: SysBus): BusStat {
  const devices = busDevices(doc, bus);
  const masters = devices.filter((n) => MASTER_KINDS.includes(n.kind));
  const slaves = devices.filter((n) => !MASTER_KINDS.includes(n.kind));
  const unitLoads = devices.reduce((s, n) => s + (n.ul ?? 1), 0);
  const devBaud = devices.find((n) => n.baud)?.baud;
  const baud = bus.baud ?? devBaud ?? 9600;
  const parity: Parity = bus.parity ?? devices.find((n) => n.parity)?.parity ?? "none";
  let regsAssumed = 0;
  let cycle = 0;
  if (bus.kind === "rs485")
    for (const n of slaves) {
      if (n.regs === undefined) regsAssumed++;
      cycle += devicePollTime(n.regs ?? DEFAULT_REGS, baud, parity);
    }
  const terms: BusTerm[] = [];
  if (bus.kind === "rs485") {
    if (bus.termStart) terms.push({ x: bus.x, id: bus.id, at: "start" });
    for (const n of devices) if (n.term) terms.push({ x: busTouchX(bus, n), id: n.id, at: "node" });
    if (bus.termEnd) terms.push({ x: bus.x + bus.len, id: bus.id, at: "end" });
  }
  return {
    bus,
    devices,
    slaves,
    masters,
    unitLoads,
    baud,
    baudAssumed: !bus.baud && !devBaud,
    parity,
    regsAssumed,
    cycle,
    terms,
    termKnown: terms.length > 0,
    left: devices[0] ?? null,
    right: devices[devices.length - 1] ?? null,
  };
}

/** 종단 점검 — 양 끝에 하나씩, 중간에는 없게. 종단 정보를 적지 않은 버스·장비 둘 미만이면 빈 목록 */
export function termProblems(st: BusStat): { side: "left" | "right" | "middle" | "double"; ids: string[] }[] {
  if (!st.termKnown || st.devices.length < 2) return [];
  const minX = busTouchX(st.bus, st.left!);
  const maxX = busTouchX(st.bus, st.right!);
  const atLeft = st.terms.filter((t) => t.x <= minX + 1);
  const atRight = st.terms.filter((t) => t.x >= maxX - 1);
  const out: { side: "left" | "right" | "middle" | "double"; ids: string[] }[] = [];
  if (!atLeft.length) out.push({ side: "left", ids: [st.left!.id] });
  if (!atRight.length) out.push({ side: "right", ids: [st.right!.id] });
  for (const side of [atLeft, atRight]) if (side.length > 1) out.push({ side: "double", ids: side.map((t) => t.id) });
  const mid = st.terms.filter((t) => t.x > minX + 1 && t.x < maxX - 1);
  if (mid.length) out.push({ side: "middle", ids: mid.map((t) => t.id) });
  return out;
}

export function checkDoc(doc: SysDoc, lang: Lang): Finding[] {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const out: Finding[] = [];
  const nm = (n: { name: string; id: string }) => n.name || n.id;
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  // IP 모양·중복
  const ipOf = new Map<string, number>();
  for (const n of doc.nodes) {
    if (!n.ip) continue;
    const v = parseIp(n.ip);
    if (v === null) {
      out.push({ level: "warn", text: t(`«${nm(n)}» IP «${n.ip}» 모양이 틀립니다(예: 192.168.0.10).`, `«${nm(n)}»: IP «${n.ip}» is not valid (e.g. 192.168.0.10).`), ids: [n.id] });
      continue;
    }
    if (n.mask && nodePrefix(n) === null) out.push({ level: "warn", text: t(`«${nm(n)}» 마스크 «${n.mask}» 모양이 틀립니다(255.255.255.0 또는 /24).`, `«${nm(n)}»: mask «${n.mask}» is not valid (255.255.255.0 or /24).`), ids: [n.id] });
    ipOf.set(n.id, v);
  }
  const byIp = new Map<number, SysNode[]>();
  for (const n of doc.nodes) {
    const v = ipOf.get(n.id);
    if (v === undefined) continue;
    byIp.set(v, [...(byIp.get(v) ?? []), n]);
  }
  for (const [v, list] of byIp) {
    if (list.length > 1) out.push({ level: "fault", text: t(`IP ${ipStr(v)} 이(가) 겹칩니다 — ${list.map(nm).join(", ")}. 같은 네트워크에서 IP 는 하나씩만.`, `IP ${ipStr(v)} is used twice — ${list.map(nm).join(", ")}. Each IP must be unique on a network.`), ids: list.map((n) => n.id) });
  }
  // 같은 L2 묶음 안의 네트워크 주소
  for (const g of l2Groups(doc)) {
    const members = g.map((id) => byId.get(id)!).filter((n) => ipOf.has(n.id) && !L2_STOP.includes(n.kind));
    if (members.length < 2) continue;
    const anyPrefix = members.map(nodePrefix).find((p) => p !== null) ?? null;
    const prefixFor = (n: SysNode) => nodePrefix(n) ?? anyPrefix ?? DEFAULT_PREFIX;
    const nets = new Map<string, SysNode[]>();
    for (const n of members) {
      const p = prefixFor(n);
      const net = `${ipStr((ipOf.get(n.id)! & maskOf(p)) >>> 0)}/${p}`;
      nets.set(net, [...(nets.get(net) ?? []), n]);
    }
    if (nets.size > 1) {
      const parts = [...nets].map(([net, list]) => `${net}: ${list.map(nm).join(", ")}`);
      const assumed = anyPrefix === null ? t(" (마스크가 없어 /24 로 봄)", " (no mask given — assumed /24)") : "";
      out.push({ level: "warn", text: t(`같은 스위치·선으로 이어졌는데 서브넷이 다릅니다${assumed} — ${parts.join(" · ")}. 라우터 없이 서로 통신하지 못합니다.`, `Connected on the same switch/cable but in different subnets${assumed} — ${parts.join(" · ")}. They cannot talk without a router.`), ids: members.map((n) => n.id) });
    }
  }
  // 버스
  for (const bus of doc.buses) {
    const on = doc.links.filter((l) => l.a === bus.id || l.b === bus.id).map((l) => byId.get(l.a === bus.id ? l.b : l.a)).filter((n): n is SysNode => !!n);
    const uniq = [...new Map(on.map((n) => [n.id, n])).values()];
    const masters = uniq.filter((n) => MASTER_KINDS.includes(n.kind));
    const slaves = uniq.filter((n) => !MASTER_KINDS.includes(n.kind));
    if (bus.kind === "rs485") {
      const units = new Map<number, SysNode[]>();
      for (const n of slaves) if (n.unit !== undefined) units.set(n.unit, [...(units.get(n.unit) ?? []), n]);
      for (const [u, list] of units) {
        if (list.length > 1) out.push({ level: "fault", text: t(`«${nm(bus)}» 버스에서 국번 ${u} 이(가) 겹칩니다 — ${list.map(nm).join(", ")}.`, `Slave ID ${u} is used twice on «${nm(bus)}» — ${list.map(nm).join(", ")}.`), ids: [bus.id, ...list.map((n) => n.id)] });
        if (u < 1 || u > 247) out.push({ level: "warn", text: t(`«${list.map(nm).join(", ")}» 국번 ${u} — Modbus 국번은 1~247 입니다.`, `«${list.map(nm).join(", ")}» ID ${u} — Modbus slave IDs are 1–247.`), ids: list.map((n) => n.id) });
      }
      if (masters.length > 1) out.push({ level: "warn", text: t(`«${nm(bus)}» 버스에 마스터(변환기·게이트웨이)가 ${masters.length}개입니다 — Modbus RTU 는 한 버스에 마스터 하나입니다.`, `«${nm(bus)}» has ${masters.length} masters (adapters/gateways) — Modbus RTU allows one master per bus.`), ids: [bus.id, ...masters.map((n) => n.id)] });
      const st = busStats(doc, bus);
      if (st.unitLoads > UL_MAX)
        out.push({
          level: "warn",
          text: t(
            `«${nm(bus)}» 단위 부하 합 ${fmtUl(st.unitLoads)} (${uniq.length}대) — 표준 기준 32 를 넘습니다. 1/8 단위 부하 송수신기인지 확인하거나 중계기로 나눌 것.`,
            `«${nm(bus)}» totals ${fmtUl(st.unitLoads)} unit loads (${uniq.length} devices) — over the standard 32. Check for 1/8 unit-load transceivers or split with a repeater.`,
          ),
          ids: [bus.id],
        });
      const name = (id: string) => (id === bus.id ? t("버스 끝 종단", "bus-end terminator") : nm(byId.get(id)!));
      for (const p of termProblems(st)) {
        const end = p.side === "left" ? st.left! : st.right!;
        const text =
          p.side === "middle"
            ? t(`«${nm(bus)}»: ${p.ids.map(name).join(", ")} 은(는) 버스 끝이 아닌데 종단이 켜져 있습니다 — 중간 장비 종단은 끕니다.`, `«${nm(bus)}»: termination is on at ${p.ids.map(name).join(", ")}, which is not at a bus end — switch it off on middle devices.`)
            : p.side === "double"
              ? t(`«${nm(bus)}»: 같은 끝에 종단이 둘입니다(${p.ids.map(name).join(", ")}) — 끝마다 하나만.`, `«${nm(bus)}»: two terminators at the same end (${p.ids.map(name).join(", ")}) — one per end.`)
              : t(`«${nm(bus)}»: ${p.side === "left" ? "왼쪽" : "오른쪽"} 끝(«${nm(end)}» 쪽)에 종단이 없습니다 — 버스 양 끝 두 곳에 종단.`, `«${nm(bus)}»: no termination at the ${p.side} end («${nm(end)}») — terminate both ends of the bus.`);
        out.push({ level: "warn", text, ids: [bus.id, ...p.ids.filter((x) => x !== bus.id)] });
      }
    }
    for (const n of slaves) {
      if (bus.baud && n.baud && n.baud !== bus.baud) out.push({ level: "warn", text: t(`«${nm(n)}» 보율 ${n.baud} 이(가) «${nm(bus)}» 버스(${bus.baud})와 다릅니다.`, `«${nm(n)}» baud ${n.baud} differs from bus «${nm(bus)}» (${bus.baud}).`), ids: [n.id, bus.id] });
      if (bus.kind === "rs485" && bus.parity && n.parity && n.parity !== bus.parity) out.push({ level: "warn", text: t(`«${nm(n)}» 패리티가 «${nm(bus)}» 버스와 다릅니다.`, `«${nm(n)}» parity differs from bus «${nm(bus)}».`), ids: [n.id, bus.id] });
    }
    if (!uniq.length) out.push({ level: "info", text: t(`«${nm(bus)}» 버스에 이어진 장비가 없습니다.`, `Nothing is connected to «${nm(bus)}».`), ids: [bus.id] });
  }
  // 이어지지 않은 장비
  const linked = new Set(doc.links.flatMap((l) => [l.a, l.b]));
  for (const n of doc.nodes) if (!linked.has(n.id)) out.push({ level: "info", text: t(`«${nm(n)}» 은(는) 아무 선에도 이어지지 않았습니다.`, `«${nm(n)}» is not connected to anything.`), ids: [n.id] });
  return out;
}

/** 단위 부하 보기 — 0.125 → 0.125, 33 → 33 */
export const fmtUl = (v: number) => String(Math.round(v * 1000) / 1000);

// ---------------------------------------------------------------- 그리기

export interface DrawOpts {
  /** 고른 것(테두리 강조) */
  selected?: string | null;
  /** 선 잇기 중 첫 끝 */
  pending?: string | null;
  /** 점검에서 문제가 있는 id(테두리 경고색) */
  flagged?: Set<string>;
  /** 변경 비교: 더해진·바뀐 노드·버스 id(테두리 색) */
  added?: Set<string>;
  changed?: Set<string>;
  /** 변경 비교: 빠진 장비 — 옛 자리에 점선 상자로 */
  ghosts?: SysNode[];
}

/** 버스 위에서 노드가 닿는 x — 노드 가운데를 버스 양 끝 안으로 */
export const busTouchX = (bus: SysBus, n: SysNode) => Math.max(bus.x + 8, Math.min(bus.x + bus.len - 8, n.x + NODE_W / 2));

export function bounds(doc: SysDoc, extra: SysNode[] = []) {
  let w = 720;
  let h = 420;
  for (const n of [...doc.nodes, ...extra]) {
    w = Math.max(w, n.x + NODE_W + 40);
    h = Math.max(h, n.y + NODE_H + 40);
  }
  for (const b of doc.buses) {
    w = Math.max(w, b.x + b.len + 40);
    h = Math.max(h, b.y + 50);
  }
  return { w, h };
}

const center = (n: SysNode): [number, number] => [n.x + NODE_W / 2, n.y + NODE_H / 2];

export function toDrawing(doc: SysDoc, lang: Lang, o: DrawOpts = {}): Drawing {
  const S: Shape[] = [];
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const busById = new Map(doc.buses.map((b) => [b.id, b]));
  const labels: Shape[] = [];
  // 선 먼저(상자가 위에 덮는다)
  for (const l of doc.links) {
    const st = LINK_STYLE[l.kind];
    const busA = busById.get(l.a);
    const busB = busById.get(l.b);
    const bus = busA ?? busB;
    const node = byId.get(busA ? l.b : l.a);
    const other = busA || busB ? undefined : byId.get(l.b);
    if (bus && node) {
      const x = busTouchX(bus, node);
      const ny = node.y + NODE_H / 2 < bus.y ? node.y + NODE_H : node.y;
      S.push({ k: "wire", pts: [[x, ny], [x, bus.y]], c: st.c, w: st.w, dash: st.dash });
      S.push({ k: "dot", x, y: bus.y, c: st.c });
      if (l.label) labels.push({ k: "text", x: x + 5, y: (ny + bus.y) / 2 + 4, t: l.label, size: 11, c: "muted", bg: true });
    } else if (node && other) {
      const [x1, y1] = center(node);
      const [x2, y2] = center(other);
      // 꺾은선: 가로 → 세로 → 가로(가운데에서 꺾음) — 거의 같은 높이면 곧은 선
      const pts: [number, number][] = Math.abs(y1 - y2) < 4 || Math.abs(x1 - x2) < 4 ? [[x1, y1], [x2, y2]] : [[x1, y1], [x1, (y1 + y2) / 2], [x2, (y1 + y2) / 2], [x2, y2]];
      S.push({ k: "wire", pts, c: st.c, w: st.w, dash: st.dash });
      const lx = (x1 + x2) / 2;
      const ly = Math.abs(y1 - y2) < 4 ? y1 - 6 : (y1 + y2) / 2 - 6;
      const tag = l.label || (l.kind === "eth" ? "" : LINK_NAME[l.kind][lang]);
      if (tag) labels.push({ k: "text", x: lx, y: ly, t: tag, anchor: "middle", size: 11, c: "muted", bg: true });
    }
  }
  for (const g of o.ghosts ?? []) {
    S.push({ k: "box", x: g.x, y: g.y, w: NODE_W, h: NODE_H, title: `− ${(g.name || NODE_NAME[g.kind][lang]).slice(0, 18)}`, sub: lang === "ko" ? "빠짐" : "removed", fill: "bg", stroke: "warn", dash: true });
  }
  for (const b of doc.buses) {
    const st = LINK_STYLE[b.kind];
    const sel = o.selected === b.id || o.pending === b.id;
    const diffInk: Ink | null = o.added?.has(b.id) ? "gnd" : o.changed?.has(b.id) ? "aux" : null;
    S.push({ k: "wire", pts: [[b.x, b.y], [b.x + b.len, b.y]], c: sel ? "accent" : (diffInk ?? st.c), w: 6 });
    if (b.kind === "rs485") {
      const bs = busStats(doc, b);
      if (bs.termKnown) {
        // 적어 둔 종단 자리(장비 닿는 곳·버스 끝)
        for (const tm of bs.terms) S.push({ k: "text", x: tm.at === "start" ? tm.x - 4 : tm.at === "end" ? tm.x + 4 : tm.x, y: tm.at === "node" ? b.y - 8 : b.y + 4, t: "Ω", anchor: tm.at === "start" ? "end" : tm.at === "end" ? "start" : "middle", size: 12, c: "ink", bold: true, bg: tm.at === "node" });
      } else {
        // 종단을 적지 않았으면 «양 끝에 둔다» 는 뜻으로 흐리게
        S.push({ k: "text", x: b.x - 4, y: b.y + 4, t: "Ω", anchor: "end", size: 11, c: "muted", bold: true });
        S.push({ k: "text", x: b.x + b.len + 4, y: b.y + 4, t: "Ω", size: 11, c: "muted", bold: true });
      }
    }
    const comm = [b.baud ? `${b.baud}` : "", b.kind === "rs485" && b.parity ? { none: "N", even: "E", odd: "O" }[b.parity] : ""].filter(Boolean).join(" ");
    labels.push({ k: "text", x: b.x + 6, y: b.y + 20, t: `${b.name || LINK_NAME[b.kind][lang]}${comm ? ` · ${comm}` : ""}`, size: 11.5, c: o.flagged?.has(b.id) ? "warn" : "ink", bold: true, bg: true });
  }
  for (const n of doc.nodes) {
    const sel = o.selected === n.id || o.pending === n.id;
    const flagged = o.flagged?.has(n.id);
    const sub = NODE_NAME[n.kind][lang];
    const bits: string[] = [];
    if (n.ip) bits.push(n.ip + (n.mask ? (n.mask.startsWith("/") ? n.mask : parseMask(n.mask) !== null ? `/${parseMask(n.mask)}` : "") : ""));
    if (n.unit !== undefined) bits.push(lang === "ko" ? `국번 ${n.unit}` : `ID ${n.unit}`);
    if (n.baud) bits.push(`${n.baud}${n.parity ? { none: "N", even: "E", odd: "O" }[n.parity] : ""}`);
    if (n.term) bits.push("Ω");
    S.push({
      k: "box",
      x: n.x,
      y: n.y,
      w: NODE_W,
      h: NODE_H,
      title: (n.name || sub).slice(0, 20),
      sub,
      sub2: bits.join(" · ").slice(0, 30) || undefined,
      stroke: sel ? "accent" : flagged ? "warn" : o.added?.has(n.id) ? "gnd" : o.changed?.has(n.id) ? "aux" : "line",
      dash: o.pending === n.id,
    });
  }
  S.push(...labels);
  const used = new Set<LinkKind>([...doc.links.map((l) => l.kind), ...doc.buses.map((b) => b.kind)]);
  const legend: LegendItem[] = LINK_KINDS.filter((k) => used.has(k)).map((k) => ({ c: LINK_STYLE[k].c, label: LINK_NAME[k][lang], dash: LINK_STYLE[k].dash }));
  const { w, h } = bounds(doc, o.ghosts);
  return { w, h, title: doc.title || (lang === "ko" ? "시스템 구성도" : "System diagram"), shapes: S, legend };
}

/** 점 (x, y) 에 있는 노드·버스 id(위에 그린 것부터) */
export function hitTest(doc: SysDoc, x: number, y: number): string | null {
  for (let i = doc.nodes.length - 1; i >= 0; i--) {
    const n = doc.nodes[i];
    if (x >= n.x && x <= n.x + NODE_W && y >= n.y && y <= n.y + NODE_H) return n.id;
  }
  for (const b of doc.buses) if (x >= b.x - 6 && x <= b.x + b.len + 6 && Math.abs(y - b.y) <= 9) return b.id;
  return null;
}

// ---------------------------------------------------------------- 만들기·고치기

export function newId(doc: SysDoc, prefix: string): string {
  const used = new Set([...doc.nodes.map((n) => n.id), ...doc.buses.map((b) => b.id), ...doc.links.map((l) => l.id)]);
  for (let i = 1; ; i++) if (!used.has(`${prefix}${i}`)) return `${prefix}${i}`;
}

/** 빈 자리 — 겹치지 않는 첫 칸(격자 180 × 110) */
export function freeSpot(doc: SysDoc, cols = 5): { x: number; y: number } {
  for (let i = 0; i < 400; i++) {
    const x = 30 + (i % cols) * 180;
    const y = 30 + Math.floor(i / cols) * 110;
    const hit = doc.nodes.some((n) => Math.abs(n.x - x) < NODE_W && Math.abs(n.y - y) < NODE_H) || doc.buses.some((b) => y <= b.y + 20 && y + NODE_H >= b.y - 20 && x + NODE_W >= b.x && x <= b.x + b.len);
    if (!hit) return { x, y };
  }
  return { x: 30, y: 30 };
}

/** 노드·버스 지우기 — 그것에 붙은 선도 함께 */
export function removeItem(doc: SysDoc, id: string): SysDoc {
  return {
    ...doc,
    nodes: doc.nodes.filter((n) => n.id !== id),
    buses: doc.buses.filter((b) => b.id !== id),
    links: doc.links.filter((l) => l.id !== id && l.a !== id && l.b !== id),
  };
}

/** 선 잇기 — 같은 두 끝·같은 종류가 이미 있으면 그대로. 종류가 버스와 맞지 않으면 null */
export function addLink(doc: SysDoc, kind: LinkKind, a: string, b: string): SysDoc | null {
  if (a === b) return null;
  const busIds = new Set(doc.buses.map((x) => x.id));
  // 버스에 이을 때는 선 종류를 버스 종류로 맞춘다
  const bus = doc.buses.find((x) => x.id === a || x.id === b);
  const k: LinkKind = bus && !(busIds.has(a) && busIds.has(b)) ? bus.kind : kind;
  if (linkProblem(k, a, b, busIds, doc.buses)) return null;
  if (doc.links.some((l) => l.kind === k && ((l.a === a && l.b === b) || (l.a === b && l.b === a)))) return doc;
  return { ...doc, links: [...doc.links, { id: newId(doc, "l"), kind: k, a, b }] };
}

// ---------------------------------------------------------------- 예시

export const EXAMPLES: { id: string; name: Record<Lang, string>; make: (lang: Lang) => SysDoc }[] = [
  {
    id: "usb485-vfd",
    name: { ko: "PC + USB-485 + 인버터 3대", en: "PC + USB-485 + 3 inverters" },
    make: (lang) => {
      const ko = lang === "ko";
      return {
        format: FORMAT,
        version: 1,
        title: ko ? "PC + USB-RS485 + 인버터 3대" : "PC + USB-RS485 + 3 inverters",
        nodes: [
          { id: "pc", kind: "pc", name: ko ? "점검 PC" : "Test PC", x: 40, y: 40, note: ko ? "PortDock Modbus Master" : "PortDock Modbus Master" },
          { id: "cv", kind: "usb485", name: "USB-RS485", x: 40, y: 170, baud: 9600, parity: "even", term: true },
          { id: "i1", kind: "inverter", name: ko ? "컨베이어 1" : "Conveyor 1", x: 250, y: 330, unit: 1, baud: 9600, parity: "even" },
          { id: "i2", kind: "inverter", name: ko ? "컨베이어 2" : "Conveyor 2", x: 440, y: 330, unit: 2, baud: 9600, parity: "even" },
          { id: "i3", kind: "inverter", name: ko ? "팬" : "Fan", x: 630, y: 330, unit: 3, baud: 9600, parity: "even", term: true },
        ],
        buses: [{ id: "b1", kind: "rs485", name: "RS-485 #1", x: 100, y: 290, len: 700, baud: 9600, parity: "even" }],
        links: [
          { id: "l1", kind: "usb", a: "pc", b: "cv" },
          { id: "l2", kind: "rs485", a: "cv", b: "b1" },
          { id: "l3", kind: "rs485", a: "i1", b: "b1" },
          { id: "l4", kind: "rs485", a: "i2", b: "b1" },
          { id: "l5", kind: "rs485", a: "i3", b: "b1" },
        ],
      };
    },
  },
  {
    id: "hmi-plc-io",
    name: { ko: "HMI + PLC + 스위치 + 원격 I/O", en: "HMI + PLC + switch + remote I/O" },
    make: (lang) => {
      const ko = lang === "ko";
      return {
        format: FORMAT,
        version: 1,
        title: ko ? "HMI + PLC + 스위치 + 원격 I/O" : "HMI + PLC + switch + remote I/O",
        nodes: [
          { id: "sw", kind: "switch", name: ko ? "제어반 스위치" : "Panel switch", x: 290, y: 170 },
          { id: "hmi", kind: "hmi", name: "HMI", x: 60, y: 40, ip: "192.168.10.20", mask: "255.255.255.0" },
          { id: "plc", kind: "plc", name: "PLC", x: 290, y: 40, ip: "192.168.10.10", mask: "255.255.255.0" },
          { id: "pc", kind: "pc", name: ko ? "엔지니어링 PC" : "Engineering PC", x: 520, y: 40, ip: "192.168.10.100", mask: "255.255.255.0" },
          { id: "io1", kind: "other", name: ko ? "원격 I/O 1" : "Remote I/O 1", x: 130, y: 320, ip: "192.168.10.31", mask: "255.255.255.0", note: "Modbus TCP" },
          { id: "io2", kind: "other", name: ko ? "원격 I/O 2" : "Remote I/O 2", x: 450, y: 320, ip: "192.168.10.32", mask: "255.255.255.0", note: "Modbus TCP" },
          { id: "ts", kind: "sensor", name: ko ? "압력 트랜스미터" : "Pressure transmitter", x: 130, y: 450 },
        ],
        buses: [],
        links: [
          { id: "l1", kind: "eth", a: "hmi", b: "sw" },
          { id: "l2", kind: "eth", a: "plc", b: "sw" },
          { id: "l3", kind: "eth", a: "pc", b: "sw" },
          { id: "l4", kind: "eth", a: "io1", b: "sw" },
          { id: "l5", kind: "eth", a: "io2", b: "sw" },
          { id: "l6", kind: "analog", a: "ts", b: "io1" },
        ],
      };
    },
  },
  {
    id: "gateway-meters",
    name: { ko: "게이트웨이 + 전력 미터 + 클라우드", en: "Gateway + power meters + cloud" },
    make: (lang) => {
      const ko = lang === "ko";
      return {
        format: FORMAT,
        version: 1,
        title: ko ? "전력 감시 — 게이트웨이 + 전력 미터 + 클라우드" : "Energy monitoring — gateway + meters + cloud",
        nodes: [
          { id: "cl", kind: "cloud", name: ko ? "감시 서버" : "Monitoring server", x: 300, y: 20 },
          { id: "rt", kind: "router", name: ko ? "공장 라우터" : "Plant router", x: 300, y: 130, ip: "192.168.1.1", mask: "/24" },
          { id: "gw", kind: "gateway", name: "Modbus TCP ↔ RTU", x: 300, y: 250, ip: "192.168.1.50", mask: "/24", baud: 9600, parity: "none" },
          { id: "m1", kind: "meter", name: ko ? "수전반 미터" : "Main meter", x: 120, y: 420, unit: 1, baud: 9600, parity: "none", term: true },
          { id: "m2", kind: "meter", name: ko ? "라인 A 미터" : "Line A meter", x: 300, y: 420, unit: 2, baud: 9600, parity: "none" },
          { id: "m3", kind: "meter", name: ko ? "라인 B 미터" : "Line B meter", x: 480, y: 420, unit: 3, baud: 9600, parity: "none", term: true },
        ],
        buses: [{ id: "b1", kind: "rs485", name: "RS-485", x: 80, y: 380, len: 600, baud: 9600, parity: "none" }],
        links: [
          { id: "l1", kind: "eth", a: "cl", b: "rt", label: ko ? "인터넷" : "Internet" },
          { id: "l2", kind: "eth", a: "rt", b: "gw" },
          { id: "l3", kind: "rs485", a: "gw", b: "b1" },
          { id: "l4", kind: "rs485", a: "m1", b: "b1" },
          { id: "l5", kind: "rs485", a: "m2", b: "b1" },
          { id: "l6", kind: "rs485", a: "m3", b: "b1" },
        ],
      };
    },
  },
];

// ---------------------------------------------------------------- Net Scan CSV

/** CSV 한 줄 → 칸(따옴표·"" 처리) */
export function csvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export interface ScanRow {
  ip: string;
  name: string;
  vendor: string;
  services: string[];
  marks: string[];
  modbusProduct: string;
}

/**
 * PortDock Net Scan «CSV 저장» 파일(apps/netscan/src/App.tsx exportCsv) → 줄.
 * 머리: ip,mac,vendor,name,rtt_ms,found_by,open_ports,services,modbus_vendor,modbus_product,modbus_revision,mark,conflict_macs
 * BOM·«#» 주석 줄은 건너뛴다. MAC 은 쓰지 않는다(구성도에 넣지 않음). 사라진(gone) 줄은 뺀다.
 */
export function parseNetScanCsv(text: string): { rows: ScanRow[]; error?: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  if (!lines.length) return { rows: [], error: "empty" };
  const head = csvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (n: string) => head.indexOf(n);
  if (col("ip") < 0) return { rows: [], error: "no ip column" };
  const rows: ScanRow[] = [];
  for (const l of lines.slice(1)) {
    const c = csvLine(l);
    const get = (n: string) => (col(n) >= 0 ? (c[col(n)] ?? "").trim() : "");
    const ip = get("ip");
    if (parseIp(ip) === null) continue;
    const marks = get("mark").split(/\s+/).filter(Boolean);
    if (marks.includes("gone")) continue;
    rows.push({ ip, name: get("name"), vendor: get("vendor"), services: get("services").split(/\s+/).filter(Boolean), marks, modbusProduct: get("modbus_product") });
    if (rows.length >= LIMITS.nodes - 1) break;
  }
  return { rows };
}

/** Net Scan 줄 → 장비 종류 짐작(서비스·표시로만 — 틀릴 수 있어 화면에서 고친다) */
export function guessKind(r: ScanRow): NodeKind {
  if (r.marks.includes("self")) return "pc";
  if (r.marks.includes("gateway")) return "router";
  const s = new Set(r.services);
  if (s.has("FEnet") || s.has("SLMP") || s.has("S7") || s.has("EtherNet/IP")) return "plc";
  if (s.has("SCPI")) return "sensor";
  if (s.has("MQTT") || s.has("OPC UA")) return "gateway";
  if (s.has("Telnet") && !s.has("Modbus")) return "gateway";
  return "other";
}

/** Net Scan 줄 → 문서에 더하기: 스위치 하나 + 장비들(이더넷). 마스크는 대역 머리(# … · a.b.c.x-y ·)를 몰라 /24 로 둔다 */
export function addScanRows(doc: SysDoc, rows: ScanRow[], lang: Lang): SysDoc {
  if (!rows.length) return doc;
  let d: SysDoc = { ...doc, nodes: [...doc.nodes], links: [...doc.links] };
  const baseY = d.nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), d.buses.reduce((m, b) => Math.max(m, b.y + 30), 0)) + (d.nodes.length ? 40 : 30);
  const swId = newId(d, "sw");
  d.nodes.push({ id: swId, kind: "switch", name: lang === "ko" ? "스위치(Net Scan)" : "Switch (Net Scan)", x: 30, y: baseY });
  const cols = 5;
  rows.forEach((r, i) => {
    const id = newId(d, "n");
    const name = r.modbusProduct || r.name || r.vendor || r.ip;
    d.nodes.push({ id, kind: guessKind(r), name: name.slice(0, LIMITS.text), x: 30 + (i % cols) * 180, y: baseY + 110 + Math.floor(i / cols) * 110, ip: r.ip, mask: "/24", ...(r.services.length ? { note: r.services.join(" ") } : {}) });
    d = { ...d, links: [...d.links, { id: newId(d, "l"), kind: "eth", a: swId, b: id }] };
  });
  return d;
}
