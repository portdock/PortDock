// 웹 도구 «MQTT 페이로드 디코더» 의 풀이 — HEX·Base64·텍스트를 바이트로 바꿔
//   ① 원시 MQTT 패킷(고정 헤더·남은 길이·PUBLISH 토픽·QoS·패킷 ID·v5 속성·페이로드, CONNECT·SUBSCRIBE 등)
//   ② 페이로드: JSON(예쁘게), Sparkplug B(protobuf — 외부 라이브러리 없이 직접 읽는 최소 스키마), 텍스트, 일반 protobuf 필드, 그 밖은 HEX
// 근거(링크만): MQTT 3.1.1 (OASIS 2014) 2·3장, MQTT 5.0 (OASIS 2019) 2.2.2·3장, Eclipse Sparkplug 3.0 sparkplug_b.proto,
// Protocol Buffers Encoding (protobuf.dev/programming-guides/encoding). 연결·전송은 하지 않는다 — 붙여 넣은 바이트만 푼다.

export type Lang = "ko" | "en";
type L2 = { ko: string; en: string };

// ---------------------------------------------------------------- 입력 → 바이트
export type InputMode = "auto" | "hex" | "base64" | "text";

const utf8 = (b: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(b);
export const hexOf = (b: Uint8Array, sep = " ") => [...b].map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(sep);

function hexBytes(s: string): Uint8Array | null {
  const t = s.replace(/0x/gi, "").replace(/[\s:,;-]+/g, "");
  if (!t || t.length % 2 || /[^0-9a-f]/i.test(t)) return null;
  return Uint8Array.from(t.match(/../g)!, (h) => parseInt(h, 16));
}
function b64Bytes(s: string): Uint8Array | null {
  let t = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!t || /[^A-Za-z0-9+/=]/.test(t) || /=[^=]/.test(t)) return null;
  while (t.length % 4) t += "=";
  try {
    return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export class InputError extends Error {}

/** 붙여 넣은 글 → 바이트. auto: JSON 모양이면 텍스트, HEX 로 읽히면 HEX, Base64 로 읽히면 Base64, 아니면 텍스트(UTF-8) */
export function toBytes(input: string, mode: InputMode = "auto"): { bytes: Uint8Array; as: Exclude<InputMode, "auto"> } {
  const s = input.trim();
  if (!s) throw new InputError("empty");
  const text = () => ({ bytes: new TextEncoder().encode(s), as: "text" as const });
  if (mode === "text") return text();
  if (mode === "hex") {
    const b = hexBytes(s);
    if (!b) throw new InputError("hex");
    return { bytes: b, as: "hex" };
  }
  if (mode === "base64") {
    const b = b64Bytes(s);
    if (!b) throw new InputError("base64");
    return { bytes: b, as: "base64" };
  }
  if (/^[{["]/.test(s)) return text();
  const h = hexBytes(s);
  if (h) return { bytes: h, as: "hex" };
  // Base64 는 4의 배수 길이·8자 이상이고, 풀었을 때 바이트가 나오는 것만(낱말 하나가 우연히 맞는 것을 줄이려고)
  const compact = s.replace(/\s+/g, "");
  if (compact.length >= 8 && compact.length % 4 === 0) {
    const b = b64Bytes(s);
    if (b) return { bytes: b, as: "base64" };
  }
  return text();
}

// ---------------------------------------------------------------- protobuf 읽기
export class Reader {
  buf: Uint8Array;
  pos = 0;
  end: number;
  constructor(buf: Uint8Array, start = 0, end = buf.length) {
    this.buf = buf;
    this.pos = start;
    this.end = end;
  }
  get done() {
    return this.pos >= this.end;
  }
  byte() {
    if (this.pos >= this.end) throw new RangeError("eof");
    return this.buf[this.pos++];
  }
  varint(): bigint {
    let v = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      const b = this.byte();
      v |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) return v;
    }
    throw new RangeError("varint too long");
  }
  bytes(n: number) {
    if (n < 0 || this.pos + n > this.end) throw new RangeError("eof");
    const b = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  fixed32() {
    const b = this.bytes(4);
    return new DataView(b.buffer, b.byteOffset, 4);
  }
  fixed64() {
    const b = this.bytes(8);
    return new DataView(b.buffer, b.byteOffset, 8);
  }
}

export interface PbField {
  field: number;
  wire: 0 | 1 | 2 | 5;
  /** varint: bigint, LEN: 바이트, I32·I64: DataView */
  v: bigint | Uint8Array | DataView;
}

/** 메시지 하나를 필드 목록으로 — 그룹(3·4)·잘못된 필드 번호·남는 바이트는 오류 */
export function readFields(buf: Uint8Array): PbField[] {
  const r = new Reader(buf);
  const out: PbField[] = [];
  while (!r.done) {
    const key = r.varint();
    const field = Number(key >> 3n);
    const wire = Number(key & 7n);
    if (field < 1 || field > 536870911) throw new RangeError("bad field number");
    if (wire === 0) out.push({ field, wire, v: r.varint() });
    else if (wire === 1) out.push({ field, wire, v: r.fixed64() });
    else if (wire === 2) out.push({ field, wire, v: r.bytes(Number(r.varint())) });
    else if (wire === 5) out.push({ field, wire, v: r.fixed32() });
    else throw new RangeError("unsupported wire type " + wire);
  }
  return out;
}

// ---------------------------------------------------------------- Sparkplug B
export const SPB_TYPES = [
  "Unknown", "Int8", "Int16", "Int32", "Int64", "UInt8", "UInt16", "UInt32", "UInt64", "Float", "Double", "Boolean", "String", "DateTime", "Text",
  "UUID", "DataSet", "Bytes", "File", "Template", "PropertySet", "PropertySetList", "Int8Array", "Int16Array", "Int32Array", "Int64Array",
  "UInt8Array", "UInt16Array", "UInt32Array", "UInt64Array", "FloatArray", "DoubleArray", "BooleanArray", "StringArray", "DateTimeArray",
];

export interface SpbMetric {
  name?: string;
  alias?: string;
  timestamp?: string;
  datatype?: number;
  typeName?: string;
  /** 보이는 값(64비트는 글자로) */
  value: string;
  isNull?: boolean;
  isHistorical?: boolean;
  isTransient?: boolean;
  properties?: [string, string][];
  hasMetadata?: boolean;
}
export interface SpbPayload {
  timestamp?: string;
  seq?: string;
  uuid?: string;
  body?: number;
  metrics: SpbMetric[];
}

const ms = (v: bigint) => {
  const n = Number(v);
  const d = new Date(n);
  return Number.isFinite(n) && n > 0 && n < 8.64e15 ? `${d.toISOString()} (${v})` : String(v);
};
const str = (b: Uint8Array) => utf8(b);
const W = { varint: 0, i64: 1, len: 2, i32: 5 } as const;
function want(f: PbField, wire: number) {
  if (f.wire !== wire) throw new TypeError(`field ${f.field}: wire ${f.wire} ≠ ${wire}`);
  return f.v;
}
const fmtFloat = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(Math.fround(x) === x ? Number(x.toPrecision(7)) : x));

/** 배열 형(22~34)은 bytes_value 에 작은 자리부터 이어 붙인다(Sparkplug 3.0 6.4.17) */
function arrayValue(type: number, b: Uint8Array): string {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const sizes: Record<number, number> = { 22: 1, 23: 2, 24: 4, 25: 8, 26: 1, 27: 2, 28: 4, 29: 8, 30: 4, 31: 8, 34: 8 };
  if (type === 33) return JSON.stringify(str(b).split("\0").slice(0, -1));
  const sz = sizes[type];
  if (!sz || b.length % sz) return hexOf(b);
  const out: string[] = [];
  for (let i = 0; i < b.length; i += sz) {
    const v =
      type === 22 ? dv.getInt8(i) : type === 23 ? dv.getInt16(i, true) : type === 24 ? dv.getInt32(i, true) : type === 25 ? dv.getBigInt64(i, true)
      : type === 26 ? dv.getUint8(i) : type === 27 ? dv.getUint16(i, true) : type === 28 ? dv.getUint32(i, true) : type === 29 ? dv.getBigUint64(i, true)
      : type === 30 ? fmtFloat(dv.getFloat32(i, true)) : type === 31 ? dv.getFloat64(i, true) : ms(dv.getBigInt64(i, true));
    out.push(String(v));
  }
  return `[${out.join(", ")}]`;
}

function propertyValue(buf: Uint8Array): string {
  let type: number | undefined;
  let long: bigint | undefined;
  let val = "";
  for (const f of readFields(buf)) {
    if (f.field === 1) type = Number(want(f, W.varint));
    else if (f.field === 2) {
      if (want(f, W.varint)) val = "null";
    } else if (f.field === 3) val = String(Number(BigInt.asUintN(32, want(f, W.varint) as bigint)));
    else if (f.field === 4) long = want(f, W.varint) as bigint;
    else if (f.field === 5) val = fmtFloat((want(f, W.i32) as DataView).getFloat32(0, true));
    else if (f.field === 6) val = String((want(f, W.i64) as DataView).getFloat64(0, true));
    else if (f.field === 7) val = want(f, W.varint) ? "true" : "false";
    else if (f.field === 8) val = JSON.stringify(str(want(f, W.len) as Uint8Array));
    else if (f.field === 9) val = "{" + propertySet(want(f, W.len) as Uint8Array).map(([k, v]) => `${k}: ${v}`).join(", ") + "}";
    else if (f.field === 10) val = "[PropertySetList]";
  }
  if (long !== undefined) val = type === 4 ? String(BigInt.asIntN(64, long)) : type === 13 ? ms(long) : String(BigInt.asUintN(64, long));
  return val;
}
function propertySet(buf: Uint8Array): [string, string][] {
  const keys: string[] = [];
  const vals: string[] = [];
  for (const f of readFields(buf)) {
    if (f.field === 1) keys.push(str(want(f, W.len) as Uint8Array));
    else if (f.field === 2) vals.push(propertyValue(want(f, W.len) as Uint8Array));
  }
  return keys.map((k, i) => [k, vals[i] ?? ""]);
}

function dataSet(buf: Uint8Array): string {
  let cols = 0;
  const names: string[] = [];
  let rows = 0;
  for (const f of readFields(buf)) {
    if (f.field === 1) cols = Number(want(f, W.varint));
    else if (f.field === 2) names.push(str(want(f, W.len) as Uint8Array));
    else if (f.field === 4) rows++;
  }
  return `DataSet ${cols || names.length} × ${rows} (${names.join(", ")})`;
}

function metric(buf: Uint8Array): SpbMetric {
  const m: SpbMetric = { value: "" };
  let raw: { kind: "int" | "long" | "float" | "double" | "bool" | "string" | "bytes" | "dataset" | "template" | "ext"; v: unknown } | undefined;
  for (const f of readFields(buf)) {
    switch (f.field) {
      case 1: m.name = str(want(f, W.len) as Uint8Array); break;
      case 2: m.alias = String(want(f, W.varint)); break;
      case 3: m.timestamp = ms(want(f, W.varint) as bigint); break;
      case 4: m.datatype = Number(want(f, W.varint)); break;
      case 5: m.isHistorical = !!want(f, W.varint); break;
      case 6: m.isTransient = !!want(f, W.varint); break;
      case 7: m.isNull = !!want(f, W.varint); break;
      case 8: want(f, W.len); m.hasMetadata = true; break;
      case 9: m.properties = propertySet(want(f, W.len) as Uint8Array); break;
      case 10: raw = { kind: "int", v: want(f, W.varint) }; break;
      case 11: raw = { kind: "long", v: want(f, W.varint) }; break;
      case 12: raw = { kind: "float", v: (want(f, W.i32) as DataView).getFloat32(0, true) }; break;
      case 13: raw = { kind: "double", v: (want(f, W.i64) as DataView).getFloat64(0, true) }; break;
      case 14: raw = { kind: "bool", v: !!want(f, W.varint) }; break;
      case 15: raw = { kind: "string", v: str(want(f, W.len) as Uint8Array) }; break;
      case 16: raw = { kind: "bytes", v: want(f, W.len) }; break;
      case 17: raw = { kind: "dataset", v: want(f, W.len) }; break;
      case 18: raw = { kind: "template", v: want(f, W.len) }; break;
      case 19: raw = { kind: "ext", v: want(f, W.len) }; break;
      default: throw new TypeError("unknown metric field " + f.field);
    }
  }
  const t = m.datatype ?? 0;
  if (m.datatype !== undefined) m.typeName = SPB_TYPES[t] ?? `#${t}`;
  if (m.isNull) m.value = "null";
  else if (raw) {
    const v = raw.v;
    if (raw.kind === "int") {
      const u = Number(BigInt.asUintN(32, v as bigint));
      m.value = String(t === 1 ? (u << 24) >> 24 : t === 2 ? (u << 16) >> 16 : t === 3 ? u | 0 : u);
    } else if (raw.kind === "long") {
      const b = v as bigint;
      m.value = t === 13 ? ms(BigInt.asUintN(64, b)) : t === 4 ? String(BigInt.asIntN(64, b)) : String(BigInt.asUintN(64, b));
    } else if (raw.kind === "float") m.value = fmtFloat(v as number);
    else if (raw.kind === "double") m.value = String(v);
    else if (raw.kind === "bool") m.value = v ? "true" : "false";
    else if (raw.kind === "string") m.value = JSON.stringify(v);
    else if (raw.kind === "bytes") m.value = t >= 22 && t <= 34 ? arrayValue(t, v as Uint8Array) : hexOf(v as Uint8Array);
    else if (raw.kind === "dataset") m.value = dataSet(v as Uint8Array);
    else if (raw.kind === "template") m.value = `Template (${(v as Uint8Array).length} B)`;
    else m.value = `extension (${(v as Uint8Array).length} B)`;
  }
  return m;
}

/** Sparkplug B 페이로드 — 모양이 맞지 않으면 예외 */
export function decodeSparkplug(buf: Uint8Array): SpbPayload {
  const p: SpbPayload = { metrics: [] };
  for (const f of readFields(buf)) {
    if (f.field === 1) p.timestamp = ms(want(f, W.varint) as bigint);
    else if (f.field === 2) p.metrics.push(metric(want(f, W.len) as Uint8Array));
    else if (f.field === 3) p.seq = String(want(f, W.varint));
    else if (f.field === 4) p.uuid = str(want(f, W.len) as Uint8Array);
    else if (f.field === 5) p.body = (want(f, W.len) as Uint8Array).length;
    else throw new TypeError("not sparkplug: field " + f.field);
  }
  if (!p.metrics.length && p.timestamp === undefined && p.seq === undefined) throw new TypeError("not sparkplug: empty");
  return p;
}

/** 일반 protobuf 필드 나무(스키마 없이) — LEN 은 안쪽이 메시지로 읽히면 펼치고, UTF-8 글이면 글로 */
export interface PbNode {
  field: number;
  wire: string;
  value: string;
  children?: PbNode[];
}
export function protoTree(buf: Uint8Array, depth = 0): PbNode[] {
  return readFields(buf).map((f): PbNode => {
    if (f.wire === 0) return { field: f.field, wire: "varint", value: String(f.v) };
    if (f.wire === 5) {
      const d = f.v as DataView;
      return { field: f.field, wire: "i32", value: `${d.getUint32(0, true)} / ${fmtFloat(d.getFloat32(0, true))}f` };
    }
    if (f.wire === 1) {
      const d = f.v as DataView;
      return { field: f.field, wire: "i64", value: `${d.getBigUint64(0, true)} / ${d.getFloat64(0, true)}` };
    }
    const b = f.v as Uint8Array;
    if (depth < 8 && b.length) {
      try {
        const kids = protoTree(b, depth + 1);
        if (kids.length) return { field: f.field, wire: "len", value: `${b.length} B`, children: kids };
      } catch {
        /* 메시지가 아니면 아래로 */
      }
    }
    try {
      const s = utf8(b);
      if (!/[\x00-\x08\x0e-\x1f]/.test(s)) return { field: f.field, wire: "len", value: JSON.stringify(s) };
    } catch {
      /* 글이 아님 */
    }
    return { field: f.field, wire: "len", value: hexOf(b) };
  });
}

// ---------------------------------------------------------------- 페이로드
export type Payload =
  | { kind: "empty" }
  | { kind: "json"; pretty: string }
  | { kind: "text"; text: string }
  | { kind: "sparkplug"; spb: SpbPayload }
  | { kind: "protobuf"; tree: PbNode[] }
  | { kind: "binary"; hex: string };

const printable = (s: string) => !/[\x00-\x08\x0e-\x1f\x7f]/.test(s);

export function decodePayload(b: Uint8Array, topic?: string): Payload {
  if (!b.length) return { kind: "empty" };
  const spbTopic = !!topic && /^spBv1\.0\//.test(topic);
  if (spbTopic) {
    try {
      return { kind: "sparkplug", spb: decodeSparkplug(b) };
    } catch {
      /* 토픽은 Sparkplug 지만 페이로드가 아니면 아래로 */
    }
  }
  let text: string | null = null;
  try {
    text = utf8(b);
  } catch {
    text = null;
  }
  if (text !== null && printable(text)) {
    const t = text.trim();
    if (/^[{[]/.test(t)) {
      try {
        return { kind: "json", pretty: JSON.stringify(JSON.parse(t), null, 2) };
      } catch {
        /* JSON 이 아님 */
      }
    }
    return { kind: "text", text };
  }
  try {
    return { kind: "sparkplug", spb: decodeSparkplug(b) };
  } catch {
    /* 아래로 */
  }
  try {
    const tree = protoTree(b);
    if (tree.length) return { kind: "protobuf", tree };
  } catch {
    /* 아래로 */
  }
  return { kind: "binary", hex: hexOf(b) };
}

// ---------------------------------------------------------------- MQTT 패킷
export const PACKET_NAMES = ["Reserved", "CONNECT", "CONNACK", "PUBLISH", "PUBACK", "PUBREC", "PUBREL", "PUBCOMP", "SUBSCRIBE", "SUBACK", "UNSUBSCRIBE", "UNSUBACK", "PINGREQ", "PINGRESP", "DISCONNECT", "AUTH"];

export const LABELS: Record<string, L2> = {
  type: { ko: "패킷 종류", en: "Packet type" },
  flags: { ko: "플래그(하위 4비트)", en: "Flags (low 4 bits)" },
  remaining: { ko: "남은 길이", en: "Remaining length" },
  dup: { ko: "DUP(다시 보냄)", en: "DUP (redelivery)" },
  qos: { ko: "QoS", en: "QoS" },
  retain: { ko: "RETAIN(보관)", en: "RETAIN" },
  topic: { ko: "토픽", en: "Topic" },
  packetId: { ko: "패킷 ID", en: "Packet ID" },
  props: { ko: "속성(v5)", en: "Properties (v5)" },
  payloadLen: { ko: "페이로드 길이", en: "Payload length" },
  protocol: { ko: "프로토콜 이름", en: "Protocol name" },
  level: { ko: "프로토콜 수준", en: "Protocol level" },
  connectFlags: { ko: "연결 플래그", en: "Connect flags" },
  keepAlive: { ko: "Keep Alive(초)", en: "Keep alive (s)" },
  clientId: { ko: "클라이언트 ID", en: "Client ID" },
  willTopic: { ko: "Will 토픽", en: "Will topic" },
  willPayload: { ko: "Will 메시지", en: "Will message" },
  username: { ko: "사용자 이름", en: "User name" },
  password: { ko: "암호", en: "Password" },
  sessionPresent: { ko: "세션 있음", en: "Session present" },
  returnCode: { ko: "응답 코드", en: "Return code" },
  reason: { ko: "이유 코드", en: "Reason code" },
  filters: { ko: "토픽 필터", en: "Topic filters" },
  codes: { ko: "결과 코드", en: "Return codes" },
};

const CONNACK_V3: Record<number, L2> = {
  0: { ko: "연결 수락", en: "Connection accepted" },
  1: { ko: "프로토콜 수준을 받지 않음", en: "Unacceptable protocol version" },
  2: { ko: "클라이언트 ID 거부", en: "Identifier rejected" },
  3: { ko: "서버 사용 불가", en: "Server unavailable" },
  4: { ko: "사용자 이름·암호 틀림", en: "Bad user name or password" },
  5: { ko: "권한 없음", en: "Not authorized" },
};
const REASON_V5: Record<number, string> = {
  0x00: "Success", 0x01: "Granted QoS 1", 0x02: "Granted QoS 2", 0x04: "Disconnect with Will Message", 0x10: "No matching subscribers",
  0x11: "No subscription existed", 0x18: "Continue authentication", 0x19: "Re-authenticate", 0x80: "Unspecified error", 0x81: "Malformed Packet",
  0x82: "Protocol Error", 0x83: "Implementation specific error", 0x84: "Unsupported Protocol Version", 0x85: "Client Identifier not valid",
  0x86: "Bad User Name or Password", 0x87: "Not authorized", 0x88: "Server unavailable", 0x89: "Server busy", 0x8a: "Banned",
  0x8b: "Server shutting down", 0x8c: "Bad authentication method", 0x8d: "Keep Alive timeout", 0x8e: "Session taken over",
  0x8f: "Topic Filter invalid", 0x90: "Topic Name invalid", 0x91: "Packet Identifier in use", 0x92: "Packet Identifier not found",
  0x93: "Receive Maximum exceeded", 0x94: "Topic Alias invalid", 0x95: "Packet too large", 0x96: "Message rate too high",
  0x97: "Quota exceeded", 0x98: "Administrative action", 0x99: "Payload format invalid", 0x9a: "Retain not supported",
  0x9b: "QoS not supported", 0x9c: "Use another server", 0x9d: "Server moved", 0x9e: "Shared Subscriptions not supported",
  0x9f: "Connection rate exceeded", 0xa0: "Maximum connect time", 0xa1: "Subscription Identifiers not supported",
  0xa2: "Wildcard Subscriptions not supported",
};
const reasonText = (c: number) => `0x${c.toString(16).toUpperCase().padStart(2, "0")} ${REASON_V5[c] ?? ""}`.trim();

// v5 속성: 식별자 → [이름, 형]
const PROPS: Record<number, [string, "byte" | "u16" | "u32" | "varint" | "str" | "bin" | "pair"]> = {
  0x01: ["Payload Format Indicator", "byte"], 0x02: ["Message Expiry Interval", "u32"], 0x03: ["Content Type", "str"], 0x08: ["Response Topic", "str"],
  0x09: ["Correlation Data", "bin"], 0x0b: ["Subscription Identifier", "varint"], 0x11: ["Session Expiry Interval", "u32"],
  0x12: ["Assigned Client Identifier", "str"], 0x13: ["Server Keep Alive", "u16"], 0x15: ["Authentication Method", "str"],
  0x16: ["Authentication Data", "bin"], 0x17: ["Request Problem Information", "byte"], 0x18: ["Will Delay Interval", "u32"],
  0x19: ["Request Response Information", "byte"], 0x1a: ["Response Information", "str"], 0x1c: ["Server Reference", "str"],
  0x1f: ["Reason String", "str"], 0x21: ["Receive Maximum", "u16"], 0x22: ["Topic Alias Maximum", "u16"], 0x23: ["Topic Alias", "u16"],
  0x24: ["Maximum QoS", "byte"], 0x25: ["Retain Available", "byte"], 0x26: ["User Property", "pair"], 0x27: ["Maximum Packet Size", "u32"],
  0x28: ["Wildcard Subscription Available", "byte"], 0x29: ["Subscription Identifier Available", "byte"], 0x2a: ["Shared Subscription Available", "byte"],
};

/** MQTT 남은 길이(가변 바이트 정수, 최대 4바이트) */
export function mqttVarint(r: Reader): number {
  let v = 0;
  for (let i = 0, mul = 1; i < 4; i++, mul *= 128) {
    const b = r.byte();
    v += (b & 0x7f) * mul;
    if (!(b & 0x80)) return v;
  }
  throw new RangeError("remaining length > 4 bytes");
}
const u16 = (r: Reader) => (r.byte() << 8) | r.byte();
const u32 = (r: Reader) => ((r.byte() << 24) | (r.byte() << 16) | (r.byte() << 8) | r.byte()) >>> 0;
const mstr = (r: Reader) => utf8(r.bytes(u16(r)));

function props(r: Reader): string[] {
  const len = mqttVarint(r);
  const end = r.pos + len;
  if (end > r.end) throw new RangeError("properties overrun");
  const out: string[] = [];
  const sub = new Reader(r.buf, r.pos, end);
  while (!sub.done) {
    const id = mqttVarint(sub);
    const def = PROPS[id];
    if (!def) throw new RangeError("unknown property 0x" + id.toString(16));
    const [name, t] = def;
    const v =
      t === "byte" ? String(sub.byte()) : t === "u16" ? String(u16(sub)) : t === "u32" ? String(u32(sub)) : t === "varint" ? String(mqttVarint(sub))
      : t === "str" ? JSON.stringify(mstr(sub)) : t === "bin" ? hexOf(sub.bytes(u16(sub))) : `${JSON.stringify(mstr(sub))} = ${JSON.stringify(mstr(sub))}`;
    out.push(`${name}: ${v}`);
  }
  r.pos = end;
  return out;
}

export interface MqttField {
  k: keyof typeof LABELS;
  v: string;
  /** 설명(뜻) */
  note?: L2;
}
export interface MqttPacket {
  offset: number;
  type: number;
  name: string;
  fields: MqttField[];
  topic?: string;
  payload?: Uint8Array;
  /** 원래 바이트 */
  raw: Uint8Array;
}

const flagOk = (type: number, flags: number) => (type === 3 ? (flags & 6) !== 6 : type === 6 || type === 8 || type === 10 ? flags === 2 : flags === 0);

/** 패킷 하나 풀기 — r 은 패킷 첫 바이트에. version 4 = 3.1.1, 5 = 5.0 */
function packet(r: Reader, version: 4 | 5): MqttPacket {
  const start = r.pos;
  const b0 = r.byte();
  const type = b0 >> 4;
  const flags = b0 & 15;
  if (type === 0 || (type === 15 && version !== 5)) throw new RangeError("reserved packet type");
  if (!flagOk(type, flags)) throw new RangeError("bad flags");
  const remaining = mqttVarint(r);
  const end = r.pos + remaining;
  if (end > r.end) throw new RangeError("truncated");
  const p = new Reader(r.buf, r.pos, end);
  const f: MqttField[] = [
    { k: "type", v: `${type} ${PACKET_NAMES[type]}` },
    { k: "flags", v: `0x${flags.toString(16).toUpperCase()} (${flags.toString(2).padStart(4, "0")})` },
    { k: "remaining", v: String(remaining) },
  ];
  const out: MqttPacket = { offset: start, type, name: PACKET_NAMES[type], fields: f, raw: r.buf.subarray(start, end) };
  const v5props = () => {
    if (version === 5 && !p.done) {
      const ps = props(p);
      if (ps.length) f.push({ k: "props", v: ps.join("\n") });
    }
  };
  switch (type) {
    case 1: {
      const proto = mstr(p);
      const level = p.byte();
      const cf = p.byte();
      const ka = u16(p);
      f.push({ k: "protocol", v: JSON.stringify(proto) });
      f.push({ k: "level", v: String(level), note: { ko: level === 5 ? "MQTT 5.0" : level === 4 ? "MQTT 3.1.1" : level === 3 ? "MQTT 3.1" : "?", en: level === 5 ? "MQTT 5.0" : level === 4 ? "MQTT 3.1.1" : level === 3 ? "MQTT 3.1" : "?" } });
      const names = [cf & 0x80 && "username", cf & 0x40 && "password", cf & 0x20 && "will retain", cf & 0x04 && `will QoS ${(cf >> 3) & 3}`, cf & 0x04 && "will", // bit1: MQTT 3.1.1 §3.1.2.4 «Clean Session», MQTT 5.0 §3.1.2.4 «Clean Start»(뜻도 다름 — 세션 만료는 속성으로)
        cf & 0x02 && (level === 5 ? "clean start" : "clean session")].filter(Boolean);
      f.push({ k: "connectFlags", v: `0x${cf.toString(16).toUpperCase().padStart(2, "0")} (${names.join(", ") || "-"})` });
      f.push({ k: "keepAlive", v: String(ka) });
      const v = level === 5 ? 5 : 4;
      if (v === 5 && !p.done) {
        const ps = props(p);
        if (ps.length) f.push({ k: "props", v: ps.join("\n") });
      }
      f.push({ k: "clientId", v: JSON.stringify(mstr(p)) });
      if (cf & 0x04) {
        if (v === 5) props(p);
        f.push({ k: "willTopic", v: JSON.stringify(mstr(p)) });
        const pl = p.bytes(u16(p));
        f.push({ k: "willPayload", v: `${pl.length} B` });
      }
      if (cf & 0x80) f.push({ k: "username", v: JSON.stringify(mstr(p)) });
      // 암호는 보이지 않는다 — 길이만
      if (cf & 0x40) f.push({ k: "password", v: `${p.bytes(u16(p)).length} B`, note: { ko: "화면에 보이지 않음", en: "not shown" } });
      break;
    }
    case 2: {
      const ack = p.byte();
      const rc = p.byte();
      f.push({ k: "sessionPresent", v: ack & 1 ? "1" : "0" });
      if (version === 5) f.push({ k: "reason", v: reasonText(rc) });
      else f.push({ k: "returnCode", v: String(rc), note: CONNACK_V3[rc] });
      v5props();
      break;
    }
    case 3: {
      const qos = (flags >> 1) & 3;
      f.push({ k: "dup", v: flags & 8 ? "1" : "0" }, { k: "qos", v: String(qos) }, { k: "retain", v: flags & 1 ? "1" : "0" });
      const topic = mstr(p);
      out.topic = topic;
      f.push({ k: "topic", v: topic === "" ? '""' : topic });
      if (qos > 0) f.push({ k: "packetId", v: String(u16(p)) });
      if (version === 5) {
        const ps = props(p);
        if (ps.length) f.push({ k: "props", v: ps.join("\n") });
      }
      out.payload = p.bytes(p.end - p.pos);
      f.push({ k: "payloadLen", v: `${out.payload.length} B` });
      break;
    }
    case 4:
    case 5:
    case 6:
    case 7:
      f.push({ k: "packetId", v: String(u16(p)) });
      if (version === 5 && !p.done) {
        f.push({ k: "reason", v: reasonText(p.byte()) });
        v5props();
      }
      break;
    case 8:
    case 10: {
      f.push({ k: "packetId", v: String(u16(p)) });
      v5props();
      const items: string[] = [];
      while (!p.done) {
        const t = mstr(p);
        items.push(type === 8 ? `${t} (QoS ${p.byte() & 3})` : t);
      }
      f.push({ k: "filters", v: items.join("\n") });
      break;
    }
    case 9:
    case 11: {
      f.push({ k: "packetId", v: String(u16(p)) });
      v5props();
      const codes: string[] = [];
      while (!p.done) {
        const c = p.byte();
        codes.push(version === 5 ? reasonText(c) : type === 9 ? (c === 0x80 ? "0x80 Failure" : `QoS ${c}`) : String(c));
      }
      if (codes.length) f.push({ k: "codes", v: codes.join("\n") });
      break;
    }
    case 14:
    case 15:
      if (version === 5 && !p.done) {
        f.push({ k: "reason", v: reasonText(p.byte()) });
        v5props();
      }
      break;
  }
  if (p.pos !== p.end && type !== 3) throw new RangeError("extra bytes in packet");
  r.pos = end;
  return out;
}

export type MqttVersion = "auto" | 4 | 5;

/** 바이트 전체를 MQTT 패킷 줄로 — 하나라도 어긋나면 예외(«패킷이 아님»). auto 는 CONNECT 의 수준을 따르고 없으면 3.1.1 */
export function decodePackets(b: Uint8Array, version: MqttVersion = "auto"): { version: 4 | 5; packets: MqttPacket[] } {
  let v: 4 | 5 = version === "auto" ? 4 : version;
  if (version === "auto" && b.length > 9 && b[0] >> 4 === 1) {
    try {
      const r = new Reader(b);
      r.byte();
      mqttVarint(r);
      mstr(r);
      if (r.byte() === 5) v = 5;
    } catch {
      /* 아래에서 다시 */
    }
  }
  const r = new Reader(b);
  const packets: MqttPacket[] = [];
  while (!r.done) packets.push(packet(r, v));
  if (!packets.length) throw new RangeError("empty");
  return { version: v, packets };
}

export type Analysis =
  | { kind: "packets"; version: 4 | 5; packets: (MqttPacket & { decoded?: Payload })[]; inputAs: string; bytes: number }
  | { kind: "payload"; payload: Payload; inputAs: string; bytes: number; packetError?: string };

/** 붙여 넣은 것 전체 풀이 — what: auto(패킷이면 패킷, 아니면 페이로드) · packet · payload */
export function analyze(input: string, opts: { mode?: InputMode; what?: "auto" | "packet" | "payload"; version?: MqttVersion; topic?: string } = {}): Analysis {
  const { bytes, as } = toBytes(input, opts.mode ?? "auto");
  const what = opts.what ?? "auto";
  if (what !== "payload" && as !== "text") {
    try {
      const d = decodePackets(bytes, opts.version ?? "auto");
      return {
        kind: "packets",
        version: d.version,
        packets: d.packets.map((p) => (p.payload ? { ...p, decoded: decodePayload(p.payload, p.topic) } : p)),
        inputAs: as,
        bytes: bytes.length,
      };
    } catch (e) {
      if (what === "packet") return { kind: "payload", payload: decodePayload(bytes, opts.topic), inputAs: as, bytes: bytes.length, packetError: (e as Error).message };
    }
  }
  return { kind: "payload", payload: decodePayload(bytes, opts.topic), inputAs: as, bytes: bytes.length };
}
