// 웹 도구 «LS XGT 전용 프로토콜(FEnet) 프레임 해석기» 의 풀이 — crates/core/src/xgt.rs(PortDock PLC Simulator 0.10.0 의 처리기)와 같은 규칙.
// 머리 20바이트(회사 ID·PLC 정보·CPU 정보·프레임 방향·Invoke ID·길이·FEnet 위치·BCC), 읽기 h0054·쓰기 h0058 요청과
// h0055·h0059 응답(개별·연속), 직접 변수(«%MW100»), 오류 코드(1~6 · h75~h78)를 풀고, 요청이면 그 앱이 어떤 오류 코드로 답할지도 따진다.
// 시험(xgtDecode.test.ts)은 xgt.rs 시험과 같은 프레임(사용설명서 예시 포함)을 쓴다.
// 근거(공개 사용설명서, 링크만): LS ELECTRIC «XGT FEnet I/F Module User's Manual» V2.30 8장(8-1~8-14쪽)·10.4(10-12쪽),
// «XGB FEnet I/F Module XBL-EMTA» V1.8 5.2(5-3~5-7쪽).
import { parseHex, hex } from "./checksum.ts";
import { msg, type Lang } from "./tr.ts";

export interface Field {
  name: string;
  raw: string;
  value: string;
}

/** 값 표 한 줄 */
export interface Item {
  addr: string;
  /** 바이트 수(1·2·4·8) */
  size: number;
  /** 리틀 엔디언으로 읽은 값(8바이트는 BigInt 글) */
  value: string;
  hex: string;
}

export const HEADER_LEN = 20;
export const MAX_BLOCKS = 16;
export const MAX_NAME = 16;
export const MAX_BYTES = 1400;
const COMPANY_XGT = [0x4c, 0x53, 0x49, 0x53, 0x2d, 0x58, 0x47, 0x54, 0x00, 0x00];
const COMPANY_GLOFA = [0x4c, 0x47, 0x49, 0x53, 0x2d, 0x47, 0x4c, 0x4f, 0x46, 0x41];

/** 오류 코드 — 사용설명서 10.4 의 설명과, PortDock PLC Simulator 가 그 코드로 답하는 경우 */
export const XGT_ERRORS: Record<number, { ko: string; en: string; whenKo: string; whenEn: string }> = {
  0x0001: { ko: "블록 수 16 넘음", en: "More than 16 blocks", whenKo: "개별 읽기·쓰기 블록 수가 0 이거나 16 보다 큼, 연속인데 블록 수가 1 이 아님", whenEn: "Individual read/write with 0 or more than 16 blocks; continuous with a block count other than 1" },
  0x0002: { ko: "데이터 형 틀림", en: "Wrong data type", whenKo: "데이터 형 칸이 h00~h04·h14 가 아님, 변수의 형 글자(X·B·W·D·L)가 데이터 형과 다름, 쓰기 데이터 크기가 형과 다름, 연속인데 바이트 변수가 아님", whenEn: "Data type field not h00–h04 or h14, the variable's type letter (X/B/W/D/L) differs from it, write data size differs from the type, or continuous with a non-byte variable" },
  0x0003: { ko: "서비스하지 않는 디바이스", en: "Device not serviced", whenKo: "디바이스 글자가 P·M·K·F·T·C·D·L·N 이 아님, 이름이 «%» 로 시작하지 않음·16글자 넘음·번호가 10진 숫자가 아님", whenEn: "Device letter not P/M/K/F/T/C/D/L/N, or the name does not start with «%», is over 16 characters or the number is not decimal" },
  0x0004: { ko: "디바이스 범위 밖", en: "Device area exceeded", whenKo: "번호가 그 디바이스의 크기(앱에서 정함)를 넘음", whenEn: "The number is beyond the device size (set in the app)" },
  0x0005: { ko: "1,400바이트 넘음(블록)", en: "Over 1,400 bytes (block)", whenKo: "연속 읽기·쓰기 데이터 수가 1,400 보다 큼", whenEn: "Continuous read/write of more than 1,400 bytes" },
  0x0006: { ko: "1,400바이트 넘음(합)", en: "Over 1,400 bytes (total)", whenKo: "(이 앱은 쓰지 않음 — 개별 16블록 합은 1,400바이트를 넘지 않음)", whenEn: "(not used by the app — 16 individual blocks never exceed 1,400 bytes)" },
  0x0075: { ko: "머리 회사 ID 틀림", en: "Wrong company ID", whenKo: "앞 10바이트가 «LSIS-XGT»+00 00 도 «LGIS-GLOFA» 도 아님", whenEn: "The first 10 bytes are neither «LSIS-XGT»+00 00 nor «LGIS-GLOFA»" },
  0x0076: { ko: "머리 길이 틀림", en: "Wrong header length", whenKo: "머리의 길이 칸이 실제 뒤따르는 바이트 수와 다름, 몸체가 블록 수·이름 길이보다 짧거나 김", whenEn: "The header length field differs from the bytes that follow, or the body is shorter/longer than the blocks and name lengths say" },
  0x0077: { ko: "머리 BCC 틀림", en: "Wrong header checksum", whenKo: "BCC(앞 19바이트 합)가 다름 — 앱의 «머리 BCC 검사» 를 끄면 보지 않음", whenEn: "BCC (sum of the first 19 bytes) differs — not checked when «Check header BCC» is off in the app" },
  0x0078: { ko: "명령 틀림", en: "Wrong instruction", whenKo: "명령이 h0054·h0058 이 아님(상태 읽기 h00B0 포함)", whenEn: "Instruction other than h0054/h0058 (status read h00B0 included)" },
};

export const errText = (code: number, lang: Lang = "ko") => {
  const e = XGT_ERRORS[code];
  return e ? msg(lang, e.ko, e.en) : msg(lang, "모르는 오류 코드", "unknown error code");
};
/** 오류 코드를 앱이 내는 경우 */
export const errWhen = (code: number, lang: Lang = "ko") => {
  const e = XGT_ERRORS[code];
  return e ? msg(lang, e.whenKo, e.whenEn) : "";
};

/** 디바이스 — 사용설명서 표 8.1.2·8.2.1·8.2.2절에 나온 것 */
export const XGT_DEVICES: { letter: string; ko: string; en: string }[] = [
  { letter: "P", ko: "입출력 릴레이", en: "I/O relay" },
  { letter: "M", ko: "보조 릴레이", en: "Auxiliary relay" },
  { letter: "K", ko: "킵 릴레이", en: "Keep relay" },
  { letter: "F", ko: "특수 릴레이", en: "Special relay" },
  { letter: "T", ko: "타이머", en: "Timer" },
  { letter: "C", ko: "카운터", en: "Counter" },
  { letter: "D", ko: "데이터 레지스터", en: "Data register" },
  { letter: "L", ko: "링크 릴레이", en: "Link relay" },
  { letter: "N", ko: "통신 데이터 레지스터", en: "Communication data register" },
];

export type Kind = "X" | "B" | "W" | "D" | "L";
export const KIND_SIZE: Record<Kind, number> = { X: 1, B: 1, W: 2, D: 4, L: 8 };
const KIND_CODE: Record<Kind, number> = { X: 0, B: 1, W: 2, D: 3, L: 4 };
const KIND_NAME: Record<Kind, string> = { X: "BIT", B: "BYTE", W: "WORD", D: "DWORD", L: "LWORD" };
const kindOf = (code: number) => (Object.keys(KIND_CODE) as Kind[]).find((k) => KIND_CODE[k] === code);
export const CONTINUOUS = 0x14;

export interface Var {
  dev: string;
  kind: Kind;
  index: number;
  text: string;
}

/** «%MW100» → 변수. 틀리면 오류 코드(3·2·4) */
export function parseVar(name: string): Var | number {
  if (!name || name.length > MAX_NAME || name[0] !== "%" || name.length < 4) return 0x0003;
  if (!/^[0-9A-Za-z%.]+$/.test(name)) return 0x0003;
  const dev = name[1].toUpperCase();
  if (!XGT_DEVICES.some((d) => d.letter === dev)) return 0x0003;
  const kind = name[2].toUpperCase() as Kind;
  if (!(kind in KIND_SIZE)) return 0x0002;
  const digits = name.slice(3);
  if (!/^\d+$/.test(digits)) return 0x0003;
  const index = Number(digits);
  if (index > 0xffffffff) return 0x0004;
  return { dev, kind, index, text: `%${dev}${kind}${index}` };
}

/** 변수가 가리키는 워드(비트·바이트·더블·롱 단위 → 워드 번호, PortDock PLC Simulator 의 규칙) */
export function varWords(v: Var): string {
  const i = v.index;
  switch (v.kind) {
    case "X":
      return `%${v.dev}W${Math.floor(i / 16)} bit ${(i % 16).toString(16).toUpperCase()}`;
    case "B":
      return `%${v.dev}W${Math.floor(i / 2)} ${i % 2 ? "hi" : "lo"}`;
    case "W":
      return `%${v.dev}W${i}`;
    case "D":
      return `%${v.dev}W${i * 2}–${i * 2 + 1}`;
    case "L":
      return `%${v.dev}W${i * 4}–${i * 4 + 3}`;
  }
}

/** 머리 BCC — 앞 19바이트 합의 아래 8비트 */
export const bcc = (b: number[]) => b.slice(0, HEADER_LEN - 1).reduce((a, x) => (a + x) & 0xff, 0);

export interface XgtDecoded {
  dir: "request" | "response";
  header: Field[];
  body: Field[];
  items: Item[];
  notes: string[];
  /** 명령(h0054 …) */
  command: number;
  dataType: number;
  /** 응답의 오류 코드(정상이면 0) */
  error?: number;
  /** 요청이면 PortDock PLC Simulator 가 답할 오류 코드(0 = 정상, 범위 밖 4 는 앱 크기에 따라 달라 따지지 않음) */
  simError?: number;
  /** 요청의 변수들(응답 값 이름 붙이기용) */
  vars: Var[];
}

const le = (b: number[], i: number, n = 2) => b.slice(i, i + n).reduce((a, x, k) => a + x * 2 ** (8 * k), 0);
const h = (n: number, w: number) => n.toString(16).toUpperCase().padStart(w, "0");
const valueOf = (b: number[]) => (b.length === 8 ? b.reduceRight((a, x) => (a << 8n) | BigInt(x), 0n).toString() : String(le(b, 0, b.length)));

class Rd {
  i = 0;
  b: number[];
  constructor(b: number[]) {
    this.b = b;
  }
  take(n: number) {
    if (this.i + n > this.b.length) throw 0x0076;
    const s = this.b.slice(this.i, this.i + n);
    this.i += n;
    return s;
  }
  u16() {
    const s = this.take(2);
    return s[0] | (s[1] << 8);
  }
}

const typeName = (code: number, lang: Lang) => (code === CONTINUOUS ? msg(lang, "연속(블록)", "continuous (block)") : (KIND_NAME[kindOf(code) as Kind] ?? msg(lang, "모르는 형", "unknown type")));
export const commandName = (cmd: number, dtype: number, lang: Lang = "ko") => {
  const cont = dtype === CONTINUOUS;
  switch (cmd) {
    case 0x54:
      return cont ? (msg(lang, "연속 읽기 요청", "Read request (continuous)")) : msg(lang, "개별 읽기 요청", "Read request (individual)");
    case 0x55:
      return msg(lang, "읽기 응답", "Read response");
    case 0x58:
      return cont ? (msg(lang, "연속 쓰기 요청", "Write request (continuous)")) : msg(lang, "개별 쓰기 요청", "Write request (individual)");
    case 0x59:
      return msg(lang, "쓰기 응답", "Write response");
    case 0xb0:
      return msg(lang, "상태 읽기 요청", "Status request");
    case 0xb1:
      return msg(lang, "상태 읽기 응답", "Status response");
    default:
      return msg(lang, "모르는 명령", "unknown instruction");
  }
};

/** 요청 몸체 풀이 — 오류면 그 코드를 던진다(xgt.rs parse 와 같은 순서) */
function parseRequest(body: number[], lang: Lang, out: Field[], vars: Var[]): void {
  const r = new Rd(body);
  const cmd = r.u16();
  const dtype = r.u16();
  r.u16();
  if (cmd !== 0x54 && cmd !== 0x58) throw 0x0078;
  const write = cmd === 0x58;
  const at = () => hex(body.slice(r.i - 2, r.i));
  const blocks = r.u16();
  out.push({ name: msg(lang, "블록 수", "Number of blocks"), raw: at(), value: String(blocks) });
  const readVar = (k: number) => {
    const n = r.u16();
    out.push({ name: `${msg(lang, "변수 길이", "Variable length")} ${k}`, raw: at(), value: `${n} ${msg(lang, "글자", "chars")}` });
    if (n === 0 || n > MAX_NAME) throw 0x0003;
    const bytes = r.take(n);
    const text = String.fromCharCode(...bytes);
    const v = parseVar(text);
    out.push({ name: `${msg(lang, "변수", "Variable")} ${k}`, raw: hex(bytes), value: typeof v === "number" ? `«${text}»` : `${v.text} → ${varWords(v)}` });
    if (typeof v === "number") throw v;
    vars.push(v);
    return v;
  };
  if (dtype === CONTINUOUS) {
    if (blocks !== 1) throw 0x0001;
    const v = readVar(1);
    if (v.kind !== "B") throw 0x0002;
    const n = r.u16();
    out.push({ name: msg(lang, "데이터 수", "Number of data"), raw: at(), value: `${n} ${msg(lang, "바이트", "bytes")} (%${v.dev}B${v.index}–%${v.dev}B${v.index + Math.max(n, 1) - 1})` });
    if (n > MAX_BYTES) throw 0x0005;
    if (write) {
      const d = r.take(n);
      out.push({ name: msg(lang, "쓸 데이터", "Data to write"), raw: hex(d), value: `${n} ${msg(lang, "바이트", "bytes")}` });
    }
  } else {
    const kind = kindOf(dtype);
    if (!kind) throw 0x0002;
    if (blocks === 0 || blocks > MAX_BLOCKS) throw 0x0001;
    for (let k = 1; k <= blocks; k++) {
      const v = readVar(k);
      if (v.kind !== kind) throw 0x0002;
    }
    if (write) {
      for (let k = 1; k <= blocks; k++) {
        const n = r.u16();
        out.push({ name: `${msg(lang, "데이터 크기", "Data size")} ${k}`, raw: at(), value: `${n} ${msg(lang, "바이트", "bytes")}` });
        if (n !== KIND_SIZE[kind]) throw 0x0002;
        const d = r.take(n);
        out.push({ name: `${msg(lang, "쓸 값", "Value")} ${k} (${vars[k - 1].text})`, raw: hex(d), value: kind === "X" ? (d[0] & 1 ? "ON (1)" : "OFF (0)") : `${valueOf(d)} (0x${h(Number(le(d, 0, Math.min(n, 4))), Math.min(n, 4) * 2)}${n === 8 ? "…" : ""})` });
      }
    }
  }
  if (r.i !== body.length) throw 0x0076;
}

/**
 * 프레임 하나 풀기. pair = 응답일 때 그 응답을 부른 요청(값에 변수 이름을 붙임)
 */
export function decodeXgt(input: string, opts: { lang?: Lang; pair?: string } = {}): XgtDecoded {
  const lang = opts.lang ?? "ko";
  const b = parseHex(input, lang);
  if (b.length < HEADER_LEN + 2) throw new Error(msg(lang, `머리 20바이트 + 명령 2바이트보다 짧습니다(${b.length}바이트)`, `Shorter than the 20-byte header + 2-byte instruction (${b.length} bytes)`));
  const company = b.slice(0, 10);
  const companyOk = COMPANY_XGT.every((x, i) => x === company[i]) || COMPANY_GLOFA.every((x, i) => x === company[i]);
  const companyText = String.fromCharCode(...company.filter((c) => c >= 0x20 && c < 0x7f));
  const plcInfo = le(b, 10);
  const cpu = b[12];
  const src = b[13];
  const invoke = le(b, 14);
  const length = le(b, 16);
  const pos = b[18];
  const sum = bcc(b);
  const body = b.slice(HEADER_LEN);
  const dir = src === 0x11 ? "response" : "request";
  const notes: string[] = [];
  const cpuName = ({ 0xa0: "XGK", 0xa4: "XGI", 0xa8: "XGR", 0xb0: "XGB (MK)", 0xb4: "XGB (IEC)" } as Record<number, string>)[cpu];
  const state = ({ 1: "RUN", 2: "STOP", 4: "ERROR", 8: "DEBUG" } as Record<number, string>)[(plcInfo >> 8) & 0x1f];
  const header: Field[] = [
    { name: msg(lang, "회사 ID", "Company ID"), raw: hex(company), value: companyOk ? `«${companyText}»` : `«${companyText}» — ${msg(lang, "LSIS-XGT·LGIS-GLOFA 가 아님(오류 h75)", "not LSIS-XGT/LGIS-GLOFA (error h75)")}` },
    {
      name: msg(lang, "PLC 정보", "PLC info"),
      raw: hex(b.slice(10, 12)),
      value: dir === "request" ? (msg(lang, "요청은 쓰지 않음(h00)", "not used in requests (h00)")) : `CPU TYPE ${plcInfo & 0x3f} · ${plcInfo & 0x40 ? (msg(lang, "이중화 슬레이브", "redundant slave")) : msg(lang, "단독·이중화 마스터", "single/redundant master")} · ${plcInfo & 0x80 ? (msg(lang, "CPU 오류", "CPU error")) : msg(lang, "CPU 정상 동작", "CPU running normally")} · ${state ?? (msg(lang, "상태 ", "state ")) + ((plcInfo >> 8) & 0x1f)}`,
    },
    { name: msg(lang, "CPU 정보", "CPU info"), raw: h(cpu, 2), value: cpuName ?? (msg(lang, "모름", "unknown")) },
    { name: msg(lang, "프레임 방향", "Source of frame"), raw: h(src, 2), value: src === 0x33 ? (msg(lang, "클라이언트 → PLC (요청)", "client → PLC (request)")) : src === 0x11 ? (msg(lang, "PLC → 클라이언트 (응답)", "PLC → client (response)")) : msg(lang, "h33·h11 이 아님", "neither h33 nor h11") },
    { name: "Invoke ID", raw: hex(b.slice(14, 16)), value: `${invoke} (0x${h(invoke, 4)})` },
    { name: msg(lang, "길이", "Length"), raw: hex(b.slice(16, 18)), value: length === body.length ? `${length} ${msg(lang, "바이트 (맞음)", "bytes (matches)")}` : `${length} — ${msg(lang, `실제 ${body.length}바이트(오류 h76)`, `actually ${body.length} bytes (error h76)`)}` },
    { name: msg(lang, "FEnet 위치", "FEnet position"), raw: h(pos, 2), value: `${msg(lang, "베이스", "base")} ${pos >> 4} · ${msg(lang, "슬롯", "slot")} ${pos & 0x0f}` },
    { name: "BCC", raw: h(b[19], 2), value: b[19] === sum ? (msg(lang, "맞음(앞 19바이트 합)", "correct (sum of the first 19 bytes)")) : `${msg(lang, "다름 — 계산값", "differs — computed")} ${h(sum, 2)}${dir === "request" ? (msg(lang, " (오류 h77)", " (error h77)")) : ""}` },
  ];
  const cmd = le(body, 0);
  const dtype = body.length >= 4 ? le(body, 2) : 0;
  const bodyFields: Field[] = [
    { name: msg(lang, "명령", "Instruction"), raw: hex(body.slice(0, 2)), value: `h${h(cmd, 4)} ${commandName(cmd, dtype, lang)}` },
    { name: msg(lang, "데이터 형", "Data type"), raw: hex(body.slice(2, 4)), value: `h${h(dtype, 4)} ${typeName(dtype, lang)}` },
    { name: msg(lang, "예약", "Reserved"), raw: hex(body.slice(4, 6)), value: msg(lang, "쓰지 않음", "don't care") },
  ];
  const vars: Var[] = [];
  const items: Item[] = [];
  const out: XgtDecoded = { dir, header, body: bodyFields, items, notes, command: cmd, dataType: dtype, vars };
  if (dir === "request") {
    let sim = 0;
    if (!companyOk) sim = 0x0075;
    else if (length !== body.length) sim = 0x0076;
    else if (b[19] !== sum) sim = 0x0077;
    try {
      parseRequest(body, lang, bodyFields, vars);
    } catch (e) {
      if (typeof e !== "number") throw e;
      if (!sim) sim = e;
    }
    out.simError = sim;
    if (src !== 0x33) notes.push(msg(lang, "프레임 방향이 h33 이 아니라 PortDock PLC Simulator 는 답하지 않습니다.", "Source of frame is not h33, so PortDock PLC Simulator does not answer it."));
    if (sim === 0x0077) notes.push(msg(lang, "BCC 만 틀렸다면 앱의 «머리 BCC 검사» 를 끄고 시험할 수 있습니다(사용설명서 XBL-EMTA 표 5-6 예시도 BCC 가 머리 합과 다름).", "If only the BCC is wrong you can test with «Check header BCC» off in the app (the XBL-EMTA manual's table 5-6 example also differs from the header sum)."));
    notes.push(msg(lang, "범위 밖(오류 4)은 앱에서 정한 디바이스 크기에 따라 달라 여기서는 따지지 않습니다.", "Out of range (error 4) depends on the device sizes set in the app and is not checked here."));
    return out;
  }
  // 응답
  const r = new Rd(body);
  try {
    r.take(6);
    const status = r.u16();
    bodyFields.push({ name: msg(lang, "오류 상태", "Error status"), raw: hex(body.slice(6, 8)), value: status === 0 ? (msg(lang, "h0000 정상(ACK)", "h0000 normal (ACK)")) : `h${h(status, 4)} ${msg(lang, "오류(NAK)", "error (NAK)")}` });
    if (status !== 0) {
      const code = r.u16();
      out.error = code;
      bodyFields.push({ name: msg(lang, "오류 코드", "Error code"), raw: hex(body.slice(8, 10)), value: `h${h(code, 4)} ${errText(code & 0xff, lang)}` });
      return out;
    }
    out.error = 0;
    const blocks = r.u16();
    bodyFields.push({ name: msg(lang, "블록 수", "Number of blocks"), raw: hex(body.slice(8, 10)), value: String(blocks) });
    if (cmd === 0x59) return out;
    const pv: Var[] = [];
    if (opts.pair?.trim()) {
      try {
        const p = decodeXgt(opts.pair, { lang });
        if (p.dir === "request") pv.push(...p.vars);
      } catch {
        notes.push(msg(lang, "짝 요청을 풀지 못했습니다.", "Could not decode the matching request."));
      }
    }
    if (dtype === CONTINUOUS) {
      const n = r.u16();
      bodyFields.push({ name: msg(lang, "데이터 수", "Number of data"), raw: hex(body.slice(10, 12)), value: `${n} ${msg(lang, "바이트", "bytes")}` });
      const d = r.take(n);
      const v = pv[0];
      d.forEach((x, k) => items.push({ addr: v ? `%${v.dev}B${v.index + k}` : `+${k}`, size: 1, value: String(x), hex: h(x, 2) }));
      if (!v) notes.push(msg(lang, "짝 요청을 넣으면 바이트마다 변수 이름이 붙습니다.", "Add the matching request to label each byte with its variable."));
    } else {
      for (let k = 0; k < blocks; k++) {
        const n = r.u16();
        const d = r.take(n);
        const v = pv[k];
        items.push({ addr: v ? v.text : `${msg(lang, "블록", "block")} ${k + 1}`, size: n, value: valueOf(d), hex: [...d].reverse().map((x) => h(x, 2)).join("") });
      }
      if (!pv.length && blocks) notes.push(msg(lang, "응답에는 변수 이름이 없습니다 — 짝 요청을 넣으면 블록마다 이름이 붙습니다.", "A reply carries no variable names — add the matching request to label each block."));
    }
    if (r.i !== body.length) notes.push(msg(lang, `뒤에 ${body.length - r.i}바이트가 남습니다.`, `${body.length - r.i} bytes left over at the end.`));
  } catch (e) {
    if (typeof e !== "number") throw e;
    notes.push(msg(lang, "응답 몸체가 블록·데이터 크기보다 짧습니다.", "The reply body is shorter than its blocks and data sizes."));
  }
  return out;
}

export type BuildOp = "read" | "write" | "read-cont" | "write-cont";

/** 요청 만들기 — 머리(LSIS-XGT·방향 h33·BCC 계산) + 몸체 */
export function buildXgtRequest(o: { op: BuildOp; vars: string[]; values?: number[]; count?: number; invoke?: number }, lang: Lang = "ko"): number[] {
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const cont = o.op.endsWith("cont");
  const write = o.op.startsWith("write");
  const vs = o.vars.map((t) => t.trim()).filter(Boolean);
  if (!vs.length) throw new Error(msg(lang, "변수를 넣으세요(예: %MW100)", "Enter a variable (e.g. %MW100)"));
  if (vs.length > (cont ? 1 : MAX_BLOCKS)) throw new Error(cont ? msg(lang, "연속은 변수 하나(%MB0 꼴)", "Continuous takes one variable (%MB0 style)") : msg(lang, "변수는 16개까지", "Up to 16 variables"));
  const parsed = vs.map((t) => {
    const v = parseVar(t);
    if (typeof v === "number") throw new Error(`«${t}»: ${errText(v, lang)}`);
    return v;
  });
  const kind = parsed[0].kind;
  if (parsed.some((v) => v.kind !== kind)) throw new Error(msg(lang, "변수의 형 글자(X·B·W·D·L)가 모두 같아야 합니다", "All variables must have the same type letter (X/B/W/D/L)"));
  if (cont && kind !== "B") throw new Error(msg(lang, "연속은 바이트 변수(%MB0 꼴)만", "Continuous takes a byte variable (%MB0 style) only"));
  const body = [...u16(write ? 0x58 : 0x54), ...u16(cont ? CONTINUOUS : KIND_CODE[kind]), 0, 0, ...u16(parsed.length)];
  for (const v of parsed) body.push(...u16(v.text.length), ...[...v.text].map((c) => c.charCodeAt(0)));
  const values = o.values ?? [];
  if (cont) {
    const n = write ? values.length : (o.count ?? 0);
    if (!(n >= 1 && n <= MAX_BYTES)) throw new Error(msg(lang, "데이터 수는 1~1400 바이트", "Number of data must be 1–1400 bytes"));
    body.push(...u16(n));
    if (write) {
      if (values.some((x) => !(Number.isInteger(x) && x >= 0 && x <= 0xff))) throw new Error(msg(lang, "연속 쓰기 값은 바이트(0~255)", "Continuous write values are bytes (0–255)"));
      body.push(...values);
    }
  } else if (write) {
    if (values.length !== parsed.length) throw new Error(msg(lang, `값을 변수 수(${parsed.length})만큼 넣으세요`, `Enter one value per variable (${parsed.length})`));
    const size = KIND_SIZE[kind];
    for (const x of values) {
      if (!Number.isInteger(x) || x < 0 || (size < 8 && x >= 2 ** (8 * size)) || (kind === "X" && x > 1)) throw new Error(msg(lang, `값 ${x} 이(가) ${KIND_NAME[kind]} 범위 밖`, `Value ${x} is out of range for ${KIND_NAME[kind]}`));
      body.push(...u16(size));
      for (let k = 0; k < size; k++) body.push(Number((BigInt(x) >> BigInt(8 * k)) & 0xffn));
    }
  }
  const head = [...COMPANY_XGT, 0, 0, 0xa0, 0x33, ...u16(o.invoke ?? 0), ...u16(body.length), 0];
  head.push(bcc(head));
  return [...head, ...body];
}
