#!/usr/bin/env node
// 장비 레지스터 맵(data/devices/<제조사>/<모델>.json) 검사 — 새 의존성 없이 Node 만 쓴다.
//
//   node tools/devices-check.mjs                     → 모든 장비 검사, 틀리면 종료 코드 1
//   node tools/devices-check.mjs --list              → 장비 목록(id·레지스터 수)
//   node tools/devices-check.mjs --modbus-schema <id> → modbus-schema(nielsbasjes) YAML 로 내보내기(표준 출력)
//
// 무엇을 보나
//  - JSON Schema(data/devices/schema.json) — 이 파일이 쓰는 키워드만 해석하는 작은 검사기
//  - id 가 파일 경로와 같은지
//  - 주소 범위(시작 + 칸 수 ≤ 65536), 같은 표 안에서 주소 중복·형식별 칸 수 겹침(u32·f32 는 2칸, f64 4칸, string 은 len/2)
//  - 표와 형식(비트 표는 bit, 레지스터 표는 bit 아님), 표와 함수 코드, 읽기/쓰기와 함수 코드
//  - 출처 필수·출처 번호·확인일, string 의 len, bit·string 에 배율 금지
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "data", "devices");

// ------------------------------------------------------------------ 작은 JSON Schema 검사기

function typeOk(v, t) {
  switch (t) {
    case "object":
      return v !== null && typeof v === "object" && !Array.isArray(v);
    case "array":
      return Array.isArray(v);
    case "string":
      return typeof v === "string";
    case "integer":
      return Number.isInteger(v);
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "boolean":
      return typeof v === "boolean";
    default:
      return false;
  }
}

/** schema.json 이 쓰는 키워드만 — $ref(#/$defs/..)·type·const·enum·required·properties·additionalProperties·items·min/max… */
export function validateSchema(value, schema, root = schema, at = "") {
  const errs = [];
  const s = schema.$ref ? resolveRef(root, schema.$ref) : schema;
  if (s.const !== undefined && value !== s.const) errs.push(`${at || "/"}: ${JSON.stringify(s.const)} 이어야 함`);
  if (s.enum && !s.enum.includes(value)) errs.push(`${at || "/"}: ${JSON.stringify(value)} 는 허용 값(${s.enum.join(", ")})이 아님`);
  if (s.type && !typeOk(value, s.type)) {
    errs.push(`${at || "/"}: ${s.type} 이어야 함`);
    return errs;
  }
  if (typeof value === "string") {
    if (s.minLength != null && value.length < s.minLength) errs.push(`${at}: 비어 있음`);
    if (s.pattern && !new RegExp(s.pattern).test(value)) errs.push(`${at}: 모양이 틀림(${s.pattern})`);
  }
  if (typeof value === "number") {
    if (s.minimum != null && value < s.minimum) errs.push(`${at}: ${s.minimum} 이상이어야 함`);
    if (s.maximum != null && value > s.maximum) errs.push(`${at}: ${s.maximum} 이하여야 함`);
    if (s.exclusiveMinimum != null && value <= s.exclusiveMinimum) errs.push(`${at}: ${s.exclusiveMinimum} 보다 커야 함`);
  }
  if (Array.isArray(value)) {
    if (s.minItems != null && value.length < s.minItems) errs.push(`${at}: 최소 ${s.minItems}개`);
    if (s.maxItems != null && value.length > s.maxItems) errs.push(`${at}: 최대 ${s.maxItems}개`);
    if (s.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) errs.push(`${at}: 중복 항목`);
    if (s.items) value.forEach((x, i) => errs.push(...validateSchema(x, s.items, root, `${at}/${i}`)));
  }
  if (typeOk(value, "object")) {
    for (const k of s.required ?? []) if (!(k in value)) errs.push(`${at || "/"}: «${k}» 없음`);
    for (const [k, v] of Object.entries(value)) {
      const ps = s.properties?.[k];
      if (ps) errs.push(...validateSchema(v, ps, root, `${at}/${k}`));
      else if (s.additionalProperties === false) errs.push(`${at || "/"}: 모르는 키 «${k}»`);
    }
  }
  return errs;
}

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`지원하지 않는 $ref: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((o, k) => o[k], root);
}

// ------------------------------------------------------------------ 뜻 검사

/** 형식이 차지하는 레지스터 수 — apps/modbus-slave/src/regmap.ts regsOf 와 같다 */
export function regsOf(type, len = 2) {
  if (type === "u32" || type === "s32" || type === "f32") return 2;
  if (type === "f64") return 4;
  if (type === "string") return Math.max(1, Math.ceil(Math.min(250, Math.max(1, len)) / 2));
  return 1;
}

const BIT_TABLES = new Set(["coils", "discrete-inputs"]);
/** 표마다 매뉴얼에 적힐 수 있는 함수 코드(보유 레지스터를 04 로도 읽게 하는 장비가 있어 04 허용) */
const TABLE_FC = {
  coils: [1, 5, 15],
  "discrete-inputs": [2],
  "input-registers": [4],
  "holding-registers": [3, 4, 6, 16],
};
const READ_FC = new Set([1, 2, 3, 4]);
const WRITE_FC = new Set([5, 6, 15, 16]);

/** 장비 하나의 뜻 검사. rel 은 data/devices 기준 경로(예 «ls-electric/ig5a.json») */
export function checkDevice(dev, rel, today = new Date().toISOString().slice(0, 10)) {
  const errs = [];
  const want = rel.replace(/\\/g, "/").replace(/\.json$/, "");
  if (dev.id !== want) errs.push(`id «${dev.id}» 가 파일 경로 «${want}» 와 다름`);
  const nSrc = Array.isArray(dev.sources) ? dev.sources.length : 0;
  if (!nSrc) errs.push("출처(sources)가 없음");
  for (const [i, s] of (dev.sources ?? []).entries()) {
    if (s.checked > today) errs.push(`sources/${i}: 확인일 ${s.checked} 이 미래`);
  }
  const used = new Map(); // "표:주소" → 레지스터 번호
  for (const [i, r] of (dev.registers ?? []).entries()) {
    const at = `registers/${i} (${r.table} ${r.address} ${r.name?.ko ?? ""})`;
    const bits = BIT_TABLES.has(r.table);
    if (bits && r.type !== "bit") errs.push(`${at}: 비트 표는 형식이 bit 이어야 함`);
    if (!bits && r.type === "bit") errs.push(`${at}: 레지스터 표에 bit 형식`);
    if (r.type === "string" && !r.len) errs.push(`${at}: string 은 len 필요`);
    if (r.type !== "string" && r.len != null) errs.push(`${at}: len 은 string 에만`);
    if ((r.type === "bit" || r.type === "string") && r.scale != null) errs.push(`${at}: bit·string 에 배율`);
    if (bits && r.order) errs.push(`${at}: 비트 표에 바이트 순서`);
    const allowed = TABLE_FC[r.table] ?? [];
    for (const f of r.fc ?? []) if (!allowed.includes(f)) errs.push(`${at}: 함수 코드 ${f} 는 ${r.table} 에 맞지 않음`);
    const fcs = r.fc ?? [];
    const canRead = fcs.some((f) => READ_FC.has(f));
    const canWrite = fcs.some((f) => WRITE_FC.has(f));
    if (r.access === "r" && canWrite) errs.push(`${at}: 읽기 전용인데 쓰기 함수 코드`);
    if ((r.access === "rw" || r.access === "w") && !canWrite) errs.push(`${at}: 쓰기인데 쓰기 함수 코드 없음`);
    if ((r.access === "r" || r.access === "rw") && !canRead) errs.push(`${at}: 읽기인데 읽기 함수 코드 없음`);
    if (r.access === "w" && canRead) errs.push(`${at}: 쓰기 전용인데 읽기 함수 코드`);
    const multi = regsOf(r.type, r.len) > 1;
    if (multi && (r.type === "u32" || r.type === "s32" || r.type === "f32" || r.type === "f64") && (r.fc ?? []).includes(6))
      errs.push(`${at}: 여러 칸 형식에 06(한 칸 쓰기)`);
    if (r.source != null && r.source >= nSrc) errs.push(`${at}: 출처 번호 ${r.source} 없음`);
    if (r.range && r.range.min != null && r.range.max != null && r.range.min > r.range.max) errs.push(`${at}: 범위 min > max`);
    const span = regsOf(r.type, r.len);
    if (Number.isInteger(r.address) && r.address + span > 65536) errs.push(`${at}: 주소 범위(65535)를 넘음`);
    for (let k = 0; k < span; k++) {
      const key = `${r.table}:${r.address + k}`;
      const prev = used.get(key);
      if (prev != null) errs.push(`${at}: 주소 ${r.address + k} 가 registers/${prev} 와 겹침`);
      else used.set(key, i);
    }
    for (const v of r.values ?? []) if (bits && v.value !== 0 && v.value !== 1) errs.push(`${at}: 비트 값 뜻은 0·1 만`);
    const seenV = new Set();
    for (const v of r.values ?? []) {
      if (seenV.has(v.value)) errs.push(`${at}: 값 ${v.value} 뜻이 두 번`);
      seenV.add(v.value);
    }
    const seenB = new Set();
    for (const b of r.bits ?? []) {
      if (b.bit >= span * 16) errs.push(`${at}: 비트 ${b.bit} 가 형식 크기를 넘음`);
      if (seenB.has(b.bit)) errs.push(`${at}: 비트 ${b.bit} 뜻이 두 번`);
      seenB.add(b.bit);
    }
  }
  return errs;
}

// ------------------------------------------------------------------ 불러오기

export function deviceFiles(dir = DATA_DIR) {
  const out = [];
  for (const maker of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!maker.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(dir, maker.name))) if (f.endsWith(".json")) out.push(`${maker.name}/${f}`);
  }
  return out.sort();
}

export function loadSchema(dir = DATA_DIR) {
  return JSON.parse(fs.readFileSync(path.join(dir, "schema.json"), "utf8"));
}

/** 모든 장비 검사 → { devices, errors: [«파일: 내용»] } */
export function checkAll(dir = DATA_DIR) {
  const schema = loadSchema(dir);
  const errors = [];
  const devices = [];
  const ids = new Set();
  for (const rel of deviceFiles(dir)) {
    let dev;
    try {
      dev = JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
    } catch (e) {
      errors.push(`${rel}: JSON 이 아님 — ${e.message}`);
      continue;
    }
    const es = [...validateSchema(dev, schema), ...checkDevice(dev, rel)];
    if (ids.has(dev.id)) es.push(`id «${dev.id}» 중복`);
    ids.add(dev.id);
    errors.push(...es.map((e) => `${rel}: ${e}`));
    devices.push(dev);
  }
  if (!devices.length) errors.push("장비 파일이 하나도 없음");
  return { devices, errors };
}

// ------------------------------------------------------------------ modbus-schema(nielsbasjes, Apache-2.0) 로 내보내기

const MS_TABLE = { coils: "c", "discrete-inputs": "di", "input-registers": "ir", "holding-registers": "hr" };
const MS_FN = { u16: "uint16", s16: "int16", u32: "uint32", s32: "int32", f32: "ieee754_32", f64: "ieee754_64" };

/** 레지스터 하나의 modbus-schema 식. 바이트 바꿈 순서(BADC·DCBA)는 표현하지 않고 null */
export function modbusSchemaExpr(r) {
  const t = MS_TABLE[r.table];
  if (r.type === "bit") return `boolean(${t}:${r.address})`;
  const n = regsOf(r.type, r.len);
  const order = r.order ?? "ABCD";
  if (order === "BADC" || order === "DCBA") return null;
  const regs = Array.from({ length: n }, (_, k) => `${t}:${r.address + k}`);
  if (r.type === "string") return `utf8(${t}:${r.address}#${n})`;
  const list = order === "CDAB" ? regs.reverse().join(", ") : n === 1 ? regs[0] : `${t}:${r.address}#${n}`;
  const base = `${MS_FN[r.type]}(${list})`;
  return r.scale != null && r.scale !== 1 ? `${base} * ${r.scale}` : base;
}

const yq = (s) => `'${String(s).replace(/'/g, "''")}'`;

export function toModbusSchemaYaml(dev) {
  const lines = [
    "# $schema: https://modbus.basjes.nl/v2/ModbusSchema.json",
    `# PortDock ${dev.id} 에서 만듦 — 데이터 CC BY 4.0, 사용 전 장비 매뉴얼로 확인`,
    `description: ${yq(`${dev.manufacturer.en} ${dev.model}`)}`,
    "schemaFeatureLevel: 2",
  ];
  if (dev.comm?.maxRegisters) lines.push(`maxRegistersPerModbusRequest: ${dev.comm.maxRegisters}`);
  lines.push("blocks:", "  - id: 'Main'", `    description: ${yq(dev.title.en)}`, "    fields:");
  const seen = new Set();
  for (const r of dev.registers) {
    const expr = modbusSchemaExpr(r);
    if (!expr) {
      lines.push(`      # ${r.name.en}: byte order ${r.order} not expressible — skipped`);
      continue;
    }
    let id = r.name.en.replace(/[^A-Za-z0-9 ]+/g, " ").trim().replace(/\s+/g, " ") || `${r.table} ${r.address}`;
    while (seen.has(id)) id += "_";
    seen.add(id);
    lines.push(`      - id: ${yq(id)}`);
    if (r.description) lines.push(`        description: ${yq(r.description.en)}`);
    lines.push(`        expression: ${yq(expr)}`);
    if (r.unit) lines.push(`        unit: ${yq(r.unit)}`);
  }
  return lines.join("\n") + "\n";
}

// ------------------------------------------------------------------ 실행

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const { devices, errors } = checkAll();
  if (args[0] === "--list") {
    for (const d of devices) console.log(`${d.id}\t${d.registers.length}`);
  } else if (args[0] === "--modbus-schema") {
    const d = devices.find((x) => x.id === args[1]);
    if (!d) {
      console.error(`장비 «${args[1] ?? ""}» 없음 — --list 로 id 를 보세요`);
      process.exit(2);
    }
    process.stdout.write(toModbusSchemaYaml(d));
  }
  if (errors.length) {
    for (const e of errors) console.error(e);
    console.error(`\n장비 맵 오류 ${errors.length}건`);
    process.exit(1);
  }
  if (!args.length) console.log(`장비 맵 ${devices.length}종, 레지스터 ${devices.reduce((n, d) => n + d.registers.length, 0)}개 — 이상 없음`);
}
