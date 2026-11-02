// 웹 도구 «IO 리스트·통신 사양서 만들기» — 장비(통신 방식·국번/IP·보율/패리티)와 신호·레지스터 표의 문서(JSON) 모양·검사,
// 장비 맵(data/devices/*.json)에서 가져오기, CSV·인쇄 표 HTML 만들기. 화면 없이 계산만(node --test). 편집 화면은 views/IoListPage.astro.
// 주소(address)는 늘 통신선에 실리는 0 기준 주소 — 장비 맵과 같다. 매뉴얼 표기(40001 등)는 manual 에 그대로 둔다.
// 점검: 같은 장비·같은 영역의 주소 겹침(32비트·64비트·문자열은 여러 레지스터를 차지), 태그 이름 중복, 국번 중복(같은 통신 선·같은 IP), 국번 범위, 같은 선의 보율·패리티 다름.

import { msg, tx, type Lang } from "./tr.ts";
export type { Lang };
export type Protocol = "rtu" | "ascii" | "tcp" | "other";
export type Parity = "none" | "even" | "odd";
export type Table = "coils" | "discrete-inputs" | "input-registers" | "holding-registers";
export type SigType = "bit" | "u16" | "s16" | "u32" | "s32" | "f32" | "f64" | "string";
export type Order = "ABCD" | "CDAB" | "BADC" | "DCBA";
export type Access = "r" | "rw" | "w";

export const FORMAT = "portdock-io-list";
export const PROTOCOLS: Protocol[] = ["rtu", "ascii", "tcp", "other"];
export const TABLES: Table[] = ["holding-registers", "input-registers", "coils", "discrete-inputs"];
export const TYPES: SigType[] = ["u16", "s16", "u32", "s32", "f32", "f64", "bit", "string"];
export const ORDERS: Order[] = ["ABCD", "CDAB", "BADC", "DCBA"];
export const ACCESSES: Access[] = ["r", "rw", "w"];
export const PARITIES: Parity[] = ["none", "even", "odd"];
export const LIMITS = { devices: 100, signals: 2000, text: 80, desc: 300 };

export const PROTOCOL_NAME: Record<Protocol, { ko: string; en: string }> = {
  rtu: { ko: "Modbus RTU", en: "Modbus RTU" },
  ascii: { ko: "Modbus ASCII", en: "Modbus ASCII" },
  tcp: { ko: "Modbus TCP", en: "Modbus TCP" },
  other: { ko: "기타", en: "Other" },
};
export const TABLE_NAME: Record<Table, { ko: string; en: string }> = {
  coils: { ko: "코일(0x)", en: "Coils (0x)" },
  "discrete-inputs": { ko: "입력 접점(1x)", en: "Discrete inputs (1x)" },
  "input-registers": { ko: "입력 레지스터(3x)", en: "Input registers (3x)" },
  "holding-registers": { ko: "홀딩 레지스터(4x)", en: "Holding registers (4x)" },
};
export const ACCESS_NAME: Record<Access, { ko: string; en: string }> = {
  r: { ko: "읽기", en: "Read only" },
  rw: { ko: "읽기/쓰기", en: "Read/write" },
  w: { ko: "쓰기", en: "Write only" },
};
export const PARITY_NAME: Record<Parity, { ko: string; en: string }> = {
  none: { ko: "없음", en: "None" },
  even: { ko: "짝수", en: "Even" },
  odd: { ko: "홀수", en: "Odd" },
};

export interface IoSignal {
  tag: string;
  table: Table;
  /** 통신선 주소(0 기준, 0~65535) */
  address: number;
  /** 매뉴얼 표기(선택) */
  manual?: string;
  type: SigType;
  /** 32·64비트 워드 순서 */
  order?: Order;
  /** 문자열 글자 수 */
  len?: number;
  /** 실제 값 = 원시 값 × scale */
  scale?: number;
  unit?: string;
  access: Access;
  /** 함수 코드 글(비우면 영역·읽기/쓰기에서 만든다) */
  fc?: string;
  desc?: string;
}

export interface IoDevice {
  id: string;
  name: string;
  location?: string;
  protocol: Protocol;
  /** RTU·ASCII: 통신 선(포트·버스 이름) — 같은 선끼리 국번·보율을 대조한다 */
  line?: string;
  unit?: number;
  ip?: string;
  port?: number;
  baud?: number;
  parity?: Parity;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  /** 장비 맵에서 가져왔으면 그 id(제조사/모델) */
  source?: string;
  note?: string;
  signals: IoSignal[];
}

export interface IoDoc {
  format: typeof FORMAT;
  version: 1;
  title: string;
  devices: IoDevice[];
}

export const emptyDoc = (title = ""): IoDoc => ({ format: FORMAT, version: 1, title, devices: [] });

/** 형식이 차지하는 레지스터(비트 영역은 1) 수 — shared/devices.ts devRegs 와 같은 셈 */
export function regCount(s: Pick<IoSignal, "type" | "len" | "table">): number {
  if (s.table === "coils" || s.table === "discrete-inputs") return 1;
  if (s.type === "u32" || s.type === "s32" || s.type === "f32") return 2;
  if (s.type === "f64") return 4;
  if (s.type === "string") return Math.max(1, Math.ceil(Math.min(250, Math.max(1, s.len ?? 2)) / 2));
  return 1;
}

/** 함수 코드 기본값 — 영역·읽기/쓰기로 */
export function defaultFc(s: Pick<IoSignal, "table" | "access" | "type" | "len">): string {
  const multi = regCount({ ...s }) > 1;
  switch (s.table) {
    case "coils":
      return s.access === "r" ? "01" : s.access === "w" ? "05/15" : "01/05";
    case "discrete-inputs":
      return "02";
    case "input-registers":
      return "04";
    default:
      return s.access === "r" ? "03" : s.access === "w" ? (multi ? "16" : "06/16") : multi ? "03/16" : "03/06";
  }
}
export const fcText = (s: IoSignal) => (s.fc?.trim() ? s.fc.trim() : defaultFc(s));

/** 매뉴얼 표기가 없을 때 보일 PLC 꼴 번호(40001 = 홀딩 0). 65536 넘는 주소는 6자리(400001) */
export function plcNumber(table: Table, address: number): string {
  const lead = { coils: "0", "discrete-inputs": "1", "input-registers": "3", "holding-registers": "4" }[table];
  const n = address + 1;
  return address <= 9998 ? `${lead}${String(n).padStart(4, "0")}` : `${lead}${String(n).padStart(5, "0")}`;
}

// ---------------------------------------------------------------- JSON 검사

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const int = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);
const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined);

export interface Validated {
  doc: IoDoc | null;
  errors: string[];
}

/** 불러온 JSON → 문서. 칸 모양이 틀린 장비·신호는 오류 목록(영어 짧은 글)에 적고 그 칸만 버린다 */
export function validateDoc(raw: unknown): Validated {
  const errors: string[] = [];
  if (!isObj(raw)) return { doc: null, errors: ["not an object"] };
  if (raw.format !== FORMAT) errors.push(`format must be "${FORMAT}"`);
  if (raw.version !== 1) errors.push("version must be 1");
  if (!Array.isArray(raw.devices)) errors.push("devices must be an array");
  if (errors.length) return { doc: null, errors };
  const devs = raw.devices as unknown[];
  if (devs.length > LIMITS.devices) errors.push(`too many devices (max ${LIMITS.devices})`);
  const doc = emptyDoc(str(raw.title, LIMITS.text) ?? "");
  const ids = new Set<string>();
  let sigTotal = 0;
  devs.slice(0, LIMITS.devices).forEach((d, di) => {
    if (!isObj(d)) return errors.push(`devices[${di}] is not an object`);
    let id = typeof d.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(d.id) ? d.id : `d${di + 1}`;
    while (ids.has(id)) id = `${id}_`;
    ids.add(id);
    const dev: IoDevice = {
      id,
      name: str(d.name, LIMITS.text) ?? "",
      location: str(d.location, LIMITS.text),
      protocol: oneOf(d.protocol, PROTOCOLS) ?? "other",
      line: str(d.line, LIMITS.text),
      unit: int(d.unit, 0, 255),
      ip: str(d.ip, 45),
      port: int(d.port, 1, 65535),
      baud: int(d.baud, 1, 10_000_000),
      parity: oneOf(d.parity, PARITIES),
      dataBits: d.dataBits === 7 || d.dataBits === 8 ? d.dataBits : undefined,
      stopBits: d.stopBits === 1 || d.stopBits === 2 ? d.stopBits : undefined,
      source: str(d.source, 80),
      note: str(d.note, LIMITS.desc),
      signals: [],
    };
    const sigs = Array.isArray(d.signals) ? d.signals : [];
    sigs.forEach((s, si) => {
      if (sigTotal >= LIMITS.signals) {
        if (sigTotal === LIMITS.signals) errors.push(`too many signals (max ${LIMITS.signals})`);
        sigTotal++;
        return;
      }
      if (!isObj(s)) return errors.push(`devices[${di}].signals[${si}] is not an object`);
      const table = oneOf(s.table, TABLES);
      const address = int(s.address, 0, 65535);
      if (!table || address === undefined) return errors.push(`devices[${di}].signals[${si}]: table/address`);
      sigTotal++;
      dev.signals.push({
        tag: str(s.tag, LIMITS.text) ?? "",
        table,
        address,
        manual: str(s.manual, 20),
        type: oneOf(s.type, TYPES) ?? (table === "coils" || table === "discrete-inputs" ? "bit" : "u16"),
        order: oneOf(s.order, ORDERS),
        len: int(s.len, 1, 250),
        scale: finite(s.scale),
        unit: str(s.unit, 20),
        access: oneOf(s.access, ACCESSES) ?? "r",
        fc: str(s.fc, 20),
        desc: str(s.desc, LIMITS.desc),
      });
    });
    doc.devices.push(dev);
  });
  return { doc, errors };
}

/** JSON 글 → 문서(파일 불러오기·localStorage) */
export function parseDoc(text: string): Validated {
  try {
    return validateDoc(JSON.parse(text.replace(/^﻿/, "")));
  } catch {
    return { doc: null, errors: ["not JSON"] };
  }
}

export const toJson = (doc: IoDoc) => JSON.stringify(doc, null, 2) + "\n";

// ---------------------------------------------------------------- 점검

export type Level = "warn" | "fault";
export interface Finding {
  level: Level;
  text: string;
  /** 문제 장비 id */
  dev?: string;
  /** 문제 신호(장비 id + 번호) */
  sig?: [string, number];
}

const devLabel = (d: IoDevice, i: number) => d.name.trim() || `#${i + 1}`;

export function checkDoc(doc: IoDoc, lang: Lang): Finding[] {
  const out: Finding[] = [];
  // 태그 이름 중복(대소문자 무시)
  const tags = new Map<string, { name: string; where: string[] }>();
  doc.devices.forEach((d, di) =>
    d.signals.forEach((s) => {
      const t = s.tag.trim().toLowerCase();
      if (!t) return;
      const e = tags.get(t) ?? { name: s.tag.trim(), where: [] };
      e.where.push(devLabel(d, di));
      tags.set(t, e);
    }),
  );
  for (const { name, where } of tags.values())
    if (where.length > 1)
      out.push({ level: "warn", text: msg(lang, `태그 이름 «${name}» 이 ${where.length}번 나옵니다 (${[...new Set(where)].join(", ")}).`, `Tag name «${name}» appears ${where.length} times (${[...new Set(where)].join(", ")}).`) });

  doc.devices.forEach((d, di) => {
    const dn = devLabel(d, di);
    // 국번 범위
    if ((d.protocol === "rtu" || d.protocol === "ascii") && d.unit !== undefined && (d.unit < 1 || d.unit > 247))
      out.push({ level: "fault", dev: d.id, text: msg(lang, `${dn}: 국번 ${d.unit} — RTU·ASCII 장비 국번은 1~247 입니다(0 은 브로드캐스트).`, `${dn}: unit ID ${d.unit} — RTU/ASCII slave IDs are 1–247 (0 is broadcast).`) });
    if ((d.protocol === "rtu" || d.protocol === "ascii") && d.unit === undefined)
      out.push({ level: "warn", dev: d.id, text: msg(lang, `${dn}: 국번이 비어 있습니다.`, `${dn}: unit ID is empty.`) });
    if (d.protocol === "tcp" && !d.ip?.trim()) out.push({ level: "warn", dev: d.id, text: msg(lang, `${dn}: IP 가 비어 있습니다.`, `${dn}: IP is empty.`) });
    // 주소 겹침 — 같은 영역에서 [address, address + n) 가 겹치면
    for (const table of TABLES) {
      const list = d.signals.map((s, si) => ({ s, si })).filter(({ s }) => s.table === table).sort((a, b) => a.s.address - b.s.address || a.si - b.si);
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const b = list[i];
        const aEnd = a.s.address + regCount(a.s) - 1;
        if (b.s.address === a.s.address)
          out.push({ level: "fault", dev: d.id, sig: [d.id, b.si], text: msg(lang, `${dn}: ${TABLE_NAME[table].ko} 주소 ${b.s.address} 가 두 번 나옵니다 (${a.s.tag || "—"}, ${b.s.tag || "—"}).`, `${dn}: ${TABLE_NAME[table].en} address ${b.s.address} appears twice (${a.s.tag || "—"}, ${b.s.tag || "—"}).`) });
        else if (b.s.address <= aEnd)
          out.push({ level: "fault", dev: d.id, sig: [d.id, b.si], text: msg(lang, `${dn}: ${a.s.tag || a.s.address}(${a.s.type}, ${a.s.address}~${aEnd}) 와 ${b.s.tag || b.s.address}(${b.s.address}) 의 범위가 겹칩니다.`, `${dn}: ${a.s.tag || a.s.address} (${a.s.type}, ${a.s.address}–${aEnd}) overlaps ${b.s.tag || b.s.address} (${b.s.address}).`) });
      }
      for (const { s, si } of list) {
        const end = s.address + regCount(s) - 1;
        if (end > 65535) out.push({ level: "fault", dev: d.id, sig: [d.id, si], text: msg(lang, `${dn}: ${s.tag || s.address} 가 주소 65535 를 넘습니다.`, `${dn}: ${s.tag || s.address} runs past address 65535.`) });
        if ((table === "coils" || table === "discrete-inputs") && s.type !== "bit")
          out.push({ level: "warn", dev: d.id, sig: [d.id, si], text: msg(lang, `${dn}: ${s.tag || s.address} — 코일·입력 접점은 비트(bit) 형식입니다.`, `${dn}: ${s.tag || s.address} — coils and discrete inputs are bits.`) });
        if ((table === "discrete-inputs" || table === "input-registers") && s.access !== "r")
          out.push({ level: "warn", dev: d.id, sig: [d.id, si], text: msg(lang, `${dn}: ${s.tag || s.address} — ${TABLE_NAME[table].ko} 는 읽기 전용입니다.`, `${dn}: ${s.tag || s.address} — ${TABLE_NAME[table].en} are read-only.`) });
      }
    }
  });

  // 국번 중복: RTU·ASCII 는 같은 선(이름 없으면 «선 이름 없음» 하나로 본다), TCP 는 같은 IP
  const groups = new Map<string, { d: IoDevice; i: number }[]>();
  doc.devices.forEach((d, i) => {
    if (d.unit === undefined) return;
    let key: string | null = null;
    if (d.protocol === "rtu" || d.protocol === "ascii") key = `line:${(d.line ?? "").trim().toLowerCase()}`;
    else if (d.protocol === "tcp" && d.ip?.trim()) key = `ip:${d.ip.trim()}:${d.port ?? 502}`;
    if (!key) return;
    const list = groups.get(key) ?? [];
    list.push({ d, i });
    groups.set(key, list);
  });
  for (const [key, list] of groups) {
    const byUnit = new Map<number, string[]>();
    for (const { d, i } of list) byUnit.set(d.unit!, [...(byUnit.get(d.unit!) ?? []), devLabel(d, i)]);
    for (const [u, names] of byUnit) {
      if (names.length < 2) continue;
      const where = key.startsWith("ip:") ? key.slice(3) : key.slice(5) || (msg(lang, "선 이름 없음", "unnamed line"));
      for (const { d } of list.filter((x) => x.d.unit === u))
        out.push({ level: "fault", dev: d.id, text: msg(lang, `국번 ${u} 중복 — ${where}: ${names.join(", ")}`, `Duplicate unit ID ${u} — ${where}: ${names.join(", ")}`) });
    }
    // 같은 선의 보율·패리티
    if (key.startsWith("line:")) {
      const set = new Set(list.filter(({ d }) => d.baud !== undefined || d.parity !== undefined).map(({ d }) => `${d.baud ?? "?"}/${d.parity ?? "?"}`));
      if (set.size > 1)
        out.push({ level: "warn", text: msg(lang, `같은 통신 선(${key.slice(5) || "선 이름 없음"})에 보율·패리티가 다른 장비가 있습니다: ${[...set].join(", ")}`, `Devices on the same line (${key.slice(5) || "unnamed line"}) use different baud/parity: ${[...set].join(", ")}`) });
    }
  }
  // 같은 국번 중복 메시지는 장비마다 하나씩 나가므로, 같은 글은 한 번만
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = `${f.level}|${f.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------------------------------------------------------------- 장비 맵에서 가져오기

/** 장비 맵 JSON(shared/devices.ts Device)의 필요한 부분 */
export interface MapDevice {
  id: string;
  manufacturer: { ko: string; en: string };
  model: string;
  protocols: string[];
  comm: { baud?: number; parity?: Parity; dataBits?: 7 | 8; stopBits?: 1 | 2; unit?: number; tcpPort?: number; order?: Order };
  registers: {
    table: Table;
    address: number;
    manualAddress?: string;
    type: SigType;
    order?: Order;
    len?: number;
    name: { ko: string; en: string };
    unit?: string;
    scale?: number;
    access: Access;
    fc?: number[];
    description?: { ko: string; en: string };
  }[];
}

/** 태그 이름 — 영어 이름에서 글자·숫자만 «_» 로 이어 붙인다(최대 40자) */
export function tagFrom(prefix: string, name: string): string {
  const body = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return [prefix, body].filter(Boolean).join("_").slice(0, 40);
}

/** 장비 맵 한 대 → IO 리스트 장비(통신 기본값 + 레지스터 전부). id·접두어는 화면이 정한다 */
export function fromDeviceMap(m: MapDevice, lang: Lang, id: string, prefix = ""): IoDevice {
  const proto: Protocol = m.protocols.includes("rtu") ? "rtu" : m.protocols.includes("tcp") ? "tcp" : m.protocols.includes("ascii") ? "ascii" : "other";
  const fcStr = (fc?: number[]) => (fc && fc.length ? fc.map((f) => String(f).padStart(2, "0")).join("/") : undefined);
  return {
    id,
    name: `${lang === "ko" ? m.manufacturer.ko : m.manufacturer.en} ${m.model}`.slice(0, LIMITS.text),
    protocol: proto,
    unit: m.comm.unit ?? (proto === "tcp" ? undefined : 1),
    port: proto === "tcp" ? (m.comm.tcpPort ?? 502) : undefined,
    baud: proto === "tcp" ? undefined : m.comm.baud,
    parity: proto === "tcp" ? undefined : m.comm.parity,
    dataBits: proto === "tcp" ? undefined : m.comm.dataBits,
    stopBits: proto === "tcp" ? undefined : m.comm.stopBits,
    source: m.id,
    signals: m.registers.map((r) => {
      const multi = r.type === "u32" || r.type === "s32" || r.type === "f32" || r.type === "f64";
      return {
        tag: tagFrom(prefix, r.name.en),
        table: r.table,
        address: r.address,
        manual: r.manualAddress,
        type: r.type,
        order: multi ? (r.order ?? m.comm.order) : undefined,
        len: r.type === "string" ? r.len : undefined,
        scale: r.scale,
        unit: r.unit,
        access: r.access,
        fc: fcStr(r.fc),
        desc: (lang === "ko" ? r.name.ko : r.name.en).slice(0, LIMITS.desc),
      };
    }),
  };
}

// ---------------------------------------------------------------- 내보내기

/** CSV 한 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로, 수식으로 읽히는 첫 글자(= + - @)는 앞에 ' (음수 숫자는 그대로) */
export function csvCell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV 머리 줄 — 화면 언어를 따른다 */
const csvHead = (lang: Lang) => [
  msg(lang, "장비", "Device name"),
  msg(lang, "위치", "Location"),
  msg(lang, "통신", "Protocol"),
  msg(lang, "통신 선", "Line"),
  msg(lang, "국번", "Unit ID"),
  "IP",
  msg(lang, "포트", "Port"),
  msg(lang, "보율", "Baud"),
  msg(lang, "패리티", "Parity"),
  msg(lang, "태그", "Tag"),
  msg(lang, "영역", "Table"),
  msg(lang, "주소(0 기준)", "Address (0-based)"),
  msg(lang, "매뉴얼 주소", "Manual address"),
  msg(lang, "함수", "Function"),
  msg(lang, "형식", "Type"),
  msg(lang, "워드 순서", "Word order"),
  msg(lang, "스케일", "Scale"),
  msg(lang, "단위", "Unit"),
  msg(lang, "읽기/쓰기", "Access"),
  msg(lang, "설명", "Description"),
];
export const CSV_HEAD = { ko: csvHead("ko"), en: csvHead("en") };

const devCells = (d: IoDevice, lang: Lang) => [
  d.name,
  d.location ?? "",
  tx(PROTOCOL_NAME[d.protocol], lang),
  d.line ?? "",
  d.unit !== undefined ? String(d.unit) : "",
  d.ip ?? "",
  d.port !== undefined ? String(d.port) : "",
  d.baud !== undefined ? String(d.baud) : "",
  d.parity ? tx(PARITY_NAME[d.parity], lang) : "",
];
const sigCells = (s: IoSignal, lang: Lang) => [
  s.tag,
  tx(TABLE_NAME[s.table], lang),
  String(s.address),
  s.manual ?? "",
  fcText(s),
  s.type === "string" ? `string(${s.len ?? 2})` : s.type,
  s.order ?? "",
  s.scale !== undefined && s.scale !== 1 ? String(s.scale) : "",
  s.unit ?? "",
  tx(ACCESS_NAME[s.access], lang),
  s.desc ?? "",
];

/** 표 줄(머리 포함) — 신호 한 줄에 장비 칸을 되풀이, 신호 없는 장비는 장비 칸만 */
export function toRows(doc: IoDoc, lang: Lang): string[][] {
  const rows: string[][] = [csvHead(lang)];
  for (const d of doc.devices) {
    if (!d.signals.length) rows.push([...devCells(d, lang), ...Array(11).fill("")]);
    for (const s of d.signals) rows.push([...devCells(d, lang), ...sigCells(s, lang)]);
  }
  return rows;
}

/** CSV(엑셀용으로 저장할 때 화면이 BOM 을 붙인다) */
export const toCsv = (doc: IoDoc, lang: Lang) => toRows(doc, lang).map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 통신 설정 한 줄 — «RTU · 국번 1 · 9600 8E1 · 선 COM3» */
export function commText(d: IoDevice, lang: Lang): string {
  const parts: string[] = [tx(PROTOCOL_NAME[d.protocol], lang)];
  if (d.unit !== undefined) parts.push(`${msg(lang, "국번", "ID")} ${d.unit}`);
  if (d.protocol === "tcp") {
    if (d.ip) parts.push(`${d.ip}${d.port ? `:${d.port}` : ""}`);
  } else if (d.baud !== undefined || d.parity) {
    const p = d.parity ? d.parity[0].toUpperCase() : "?";
    parts.push(`${d.baud ?? "?"} ${d.dataBits ?? 8}${p}${d.stopBits ?? 1}`);
  }
  if (d.line?.trim()) parts.push(`${msg(lang, "선", "line")} ${d.line.trim()}`);
  return parts.join(" · ");
}

/** 인쇄·문서 묶음용 HTML 조각(장비마다 제목 + 표). 글은 모두 escape */
export function toTableHtml(doc: IoDoc, lang: Lang, headLevel = 3): string {
  const h = `h${headLevel}`;
  const head = [msg(lang, "태그", "Tag"), msg(lang, "영역", "Table"), msg(lang, "주소", "Addr"), msg(lang, "매뉴얼", "Manual"), msg(lang, "함수", "FC"), msg(lang, "형식", "Type"), msg(lang, "순서", "Order"), msg(lang, "스케일", "Scale"), msg(lang, "단위", "Unit"), "R/W", msg(lang, "설명", "Description")];
  return doc.devices
    .map((d, i) => {
      const title = `${esc(d.name || `#${i + 1}`)}${d.location ? ` <small>(${esc(d.location)})</small>` : ""}`;
      const comm = `<p class="io-comm">${esc(commText(d, lang))}${d.source ? ` · ${msg(lang, "장비 맵", "device map")} ${esc(d.source)}` : ""}${d.note ? ` — ${esc(d.note)}` : ""}</p>`;
      const rows = d.signals
        .map((s) => {
          const c = sigCells(s, lang);
          c[1] = { coils: "0x", "discrete-inputs": "1x", "input-registers": "3x", "holding-registers": "4x" }[s.table];
          if (!c[3]) c[3] = plcNumber(s.table, s.address);
          c[9] = s.access.toUpperCase();
          return `<tr>${c.map((x, k) => `<td${k === 0 || (k >= 2 && k <= 7) ? ' class="mono"' : ""}>${esc(x)}</td>`).join("")}</tr>`;
        })
        .join("");
      const table = d.signals.length
        ? `<table class="io-t"><thead><tr>${head.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`
        : `<p class="io-empty">${msg(lang, "신호 없음", "No signals")}</p>`;
      return `<${h}>${title}</${h}>${comm}${table}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------- 편집 도우미

export function newDeviceId(doc: IoDoc): string {
  let n = doc.devices.length + 1;
  while (doc.devices.some((d) => d.id === `d${n}`)) n++;
  return `d${n}`;
}

/** 다음 신호 기본 주소 — 그 장비 같은 영역의 마지막 신호 바로 뒤 */
export function nextAddress(d: IoDevice, table: Table): number {
  const list = d.signals.filter((s) => s.table === table);
  if (!list.length) return 0;
  return Math.min(65535, Math.max(...list.map((s) => s.address + regCount(s))));
}

export const STORE_KEY = "portdock-io-list-v1";

/** 예시 문서 — 이름·주소는 예시(실제 장비 값이 아님) */
export function exampleDoc(lang: Lang): IoDoc {
  return {
    format: FORMAT,
    version: 1,
    title: msg(lang, "예시 — 2라인 IO 리스트", "Example — Line 2 I/O list"),
    devices: [
      {
        id: "d1",
        name: msg(lang, "인버터 1", "Drive 1"),
        location: msg(lang, "MCC 판넬", "MCC panel"),
        protocol: "rtu",
        line: "RS-485 #1",
        unit: 1,
        baud: 9600,
        parity: "even",
        dataBits: 8,
        stopBits: 1,
        signals: [
          { tag: "INV1_RUN_CMD", table: "holding-registers", address: 0, type: "u16", access: "rw", desc: msg(lang, "운전 지령", "Run command") },
          { tag: "INV1_FREQ_REF", table: "holding-registers", address: 1, type: "u16", scale: 0.01, unit: "Hz", access: "rw", desc: msg(lang, "주파수 지령", "Frequency reference") },
          { tag: "INV1_OUT_FREQ", table: "input-registers", address: 10, type: "u16", scale: 0.01, unit: "Hz", access: "r", desc: msg(lang, "출력 주파수", "Output frequency") },
        ],
      },
      {
        id: "d2",
        name: msg(lang, "전력 미터", "Power meter"),
        location: msg(lang, "수전 판넬", "Incoming panel"),
        protocol: "rtu",
        line: "RS-485 #1",
        unit: 2,
        baud: 9600,
        parity: "even",
        dataBits: 8,
        stopBits: 1,
        signals: [
          { tag: "PM_VOLT_L1", table: "input-registers", address: 0, type: "f32", order: "ABCD", unit: "V", access: "r", desc: msg(lang, "L1 전압", "L1 voltage") },
          { tag: "PM_KWH", table: "input-registers", address: 2, type: "u32", order: "CDAB", scale: 0.1, unit: "kWh", access: "r", desc: msg(lang, "누적 전력량", "Energy") },
        ],
      },
    ],
  };
}
