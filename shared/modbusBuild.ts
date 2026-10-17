// Modbus RTU 요청 만들기 — 화면(React) 없이 바이트만 만든다. CRC 는 붙이지 않는다(보내기 줄의 «체크섬: CRC16 Modbus» 가 붙임).
// node --test shared/modbusBuild.test.ts 로 시험한다(Node 24 는 타입을 지우고 바로 돌린다 — enum 같은 TS 전용 문법은 쓰지 않는다).

export type MbLang = "ko" | "en";
/** 0 기준 주소(0~65535) 또는 PLC 식 표기(00001·10001·30001·40001) */
export type AddrMode = "zero" | "plc";

export interface MbFunc {
  code: number;
  ko: string;
  en: string;
  /** 읽기면 개수, 쓰기면 값 */
  write: boolean;
  /** 비트(코일·입력 접점)인지 */
  bit: boolean;
  /** PLC 식 표기의 앞자리 — 0xxxx 코일, 1xxxx 입력 접점, 3xxxx 입력 레지스터, 4xxxx 보유 레지스터 */
  prefix: "0" | "1" | "3" | "4";
  /** 개수 한도(규격) */
  max: number;
}

// 한국어 이름은 apps/serial/src/mbwords.ts 의 풀이와 같다
export const MB_FUNCS: MbFunc[] = [
  { code: 0x01, ko: "코일 읽기", en: "Read Coils", write: false, bit: true, prefix: "0", max: 2000 },
  { code: 0x02, ko: "입력 접점 읽기", en: "Read Discrete Inputs", write: false, bit: true, prefix: "1", max: 2000 },
  { code: 0x03, ko: "보유 레지스터 읽기", en: "Read Holding Registers", write: false, bit: false, prefix: "4", max: 125 },
  { code: 0x04, ko: "입력 레지스터 읽기", en: "Read Input Registers", write: false, bit: false, prefix: "3", max: 125 },
  { code: 0x05, ko: "코일 하나 쓰기", en: "Write Single Coil", write: true, bit: true, prefix: "0", max: 1 },
  { code: 0x06, ko: "레지스터 하나 쓰기", en: "Write Single Register", write: true, bit: false, prefix: "4", max: 1 },
  { code: 0x0f, ko: "코일 여러 개 쓰기", en: "Write Multiple Coils", write: true, bit: true, prefix: "0", max: 1968 },
  { code: 0x10, ko: "레지스터 여러 개 쓰기", en: "Write Multiple Registers", write: true, bit: false, prefix: "4", max: 123 },
];

export const mbFuncInfo = (code: number) => MB_FUNCS.find((f) => f.code === code);

const hi = (n: number) => (n >> 8) & 0xff;
const lo = (n: number) => n & 0xff;

/** 코일 값 묶기 — 첫 코일이 첫 바이트의 가장 낮은 비트(LSB first) */
export function packBits(bits: number[]): number[] {
  const out = new Array<number>(Math.ceil(bits.length / 8)).fill(0);
  bits.forEach((b, i) => {
    if (b) out[i >> 3] |= 1 << (i & 7);
  });
  return out;
}

/** FC01~04: 국번 함수 시작주소(2) 개수(2) */
export const readReq = (slave: number, fc: number, addr: number, qty: number) => [slave, fc, hi(addr), lo(addr), hi(qty), lo(qty)];
/** FC05: ON = FF 00, OFF = 00 00 */
export const writeCoilReq = (slave: number, addr: number, on: boolean) => [slave, 0x05, hi(addr), lo(addr), on ? 0xff : 0, 0];
/** FC06: 값 하나(0~65535) */
export const writeRegReq = (slave: number, addr: number, v: number) => [slave, 0x06, hi(addr), lo(addr), hi(v), lo(v)];
/** FC0F: 개수(2) 바이트 수(1) 묶은 비트 */
export function writeCoilsReq(slave: number, addr: number, bits: number[]) {
  const packed = packBits(bits);
  return [slave, 0x0f, hi(addr), lo(addr), hi(bits.length), lo(bits.length), packed.length, ...packed];
}
/** FC10: 개수(2) 바이트 수(1) 값(2씩) */
export function writeRegsReq(slave: number, addr: number, regs: number[]) {
  return [slave, 0x10, hi(addr), lo(addr), hi(regs.length), lo(regs.length), regs.length * 2, ...regs.flatMap((v) => [hi(v), lo(v)])];
}

const M = {
  ko: {
    slave: "국번은 1~247 입니다(0 은 쓰기 함수의 브로드캐스트 — 응답이 없습니다).",
    slaveRead: "읽기 함수는 국번 0(브로드캐스트)을 쓸 수 없습니다 — 응답이 오지 않습니다. 1~247 로 쓰세요.",
    func: "지원하지 않는 함수입니다.",
    addrEmpty: "주소를 넣으세요.",
    addrNum: "주소는 숫자(10진수, 0 기준이면 0x 16진수도)로 씁니다.",
    addrZero: "0 기준 주소는 0~65535 입니다.",
    addrPlcLen: "PLC 표기는 5자리(예: 40001) 또는 6자리(예: 400001)입니다.",
    addrPlcOff: "PLC 표기의 뒷자리는 1부터 시작합니다(5자리 0001~9999, 6자리 00001~65536).",
    addrPrefix: "«{a}» 은(는) {b} 표기입니다. 이 함수는 {c} 를 씁니다.",
    addrBadPrefix: "앞자리 {a} 는 Modbus 표기에 없습니다(0 코일, 1 입력 접점, 3 입력 레지스터, 4 보유 레지스터).",
    addrPlcNote: "{a} → 0 기준 {b} (0x{c})",
    qty: "개수는 1~{a} 입니다(규격 한도).",
    overflow: "끝 주소가 65535 를 넘습니다(시작 {a} + 개수 {b}).",
    valEmpty: "쓸 값을 넣으세요.",
    valBad: "«{a}» 는 값이 아닙니다 — 10진수 또는 0x16진수로 씁니다.",
    valReg: "레지스터 값 «{a}» 는 -32768~65535 범위여야 합니다(음수는 2의 보수로 보냅니다).",
    valCoil: "코일 값 «{a}» 는 1(ON) 또는 0(OFF) 입니다.",
    valOne: "이 함수는 값 하나만 씁니다.",
    valCount: "값 개수 {n} 개 — 이 함수는 1~{a} 개까지입니다.",
    plcNames: { "0": "0xxxx(코일)", "1": "1xxxx(입력 접점, FC02)", "3": "3xxxx(입력 레지스터, FC04)", "4": "4xxxx(보유 레지스터, FC03·06·10)" },
  },
  en: {
    slave: "Slave ID is 1–247 (0 = broadcast for write functions — no reply).",
    slaveRead: "Read functions cannot use slave 0 (broadcast) — no reply would come. Use 1–247.",
    func: "Unsupported function.",
    addrEmpty: "Enter an address.",
    addrNum: "Address must be a number (decimal; 0x hex is allowed for 0-based).",
    addrZero: "0-based address is 0–65535.",
    addrPlcLen: "PLC notation has 5 digits (e.g. 40001) or 6 digits (e.g. 400001).",
    addrPlcOff: "PLC notation counts from 1 (5 digits 0001–9999, 6 digits 00001–65536).",
    addrPrefix: "«{a}» is {b} notation. This function uses {c}.",
    addrBadPrefix: "Leading digit {a} is not Modbus notation (0 coil, 1 discrete input, 3 input register, 4 holding register).",
    addrPlcNote: "{a} → 0-based {b} (0x{c})",
    qty: "Quantity is 1–{a} (protocol limit).",
    overflow: "End address exceeds 65535 (start {a} + quantity {b}).",
    valEmpty: "Enter the value(s) to write.",
    valBad: "«{a}» is not a value — use decimal or 0x hex.",
    valReg: "Register value «{a}» must be -32768–65535 (negatives are sent as two's complement).",
    valCoil: "Coil value «{a}» must be 1 (ON) or 0 (OFF).",
    valOne: "This function writes a single value.",
    valCount: "{n} values — this function takes 1–{a}.",
    plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (discrete input, FC02)", "3": "3xxxx (input register, FC04)", "4": "4xxxx (holding register, FC03/06/10)" },
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

/** 주소 칸 해석. plc 면 함수에 맞는 앞자리(0·1·3·4)인지도 본다 */
export function parseAddr(text: string, fc: number, mode: AddrMode, lang: MbLang = "ko"): { addr: number | null; error: string | null; note: string | null } {
  const m = M[lang];
  const t = text.trim().replace(/[\s_]/g, "");
  const bad = (error: string) => ({ addr: null, error, note: null });
  if (!t) return bad(m.addrEmpty);
  if (mode === "zero") {
    const n = /^0x[0-9a-f]+$/i.test(t) ? parseInt(t.slice(2), 16) : /^\d+$/.test(t) ? Number(t) : NaN;
    if (Number.isNaN(n)) return bad(m.addrNum);
    if (n > 0xffff) return bad(m.addrZero);
    return { addr: n, error: null, note: null };
  }
  if (!/^\d+$/.test(t)) return bad(m.addrNum);
  const f = mbFuncInfo(fc);
  if (!f) return bad(m.func);
  // 5자리 이하는 앞의 0 이 빠진 것으로 본다(«1» = 00001)
  if (t.length > 6) return bad(m.addrPlcLen);
  const six = t.length === 6;
  const prefix = t.length >= 5 ? t[0] : "0";
  const off = Number(t.length >= 5 ? t.slice(1) : t);
  if (!"0134".includes(prefix)) return bad(fill(m.addrBadPrefix, { a: prefix }));
  if (prefix !== f.prefix) {
    const names = m.plcNames as Record<string, string>;
    return bad(fill(m.addrPrefix, { a: t, b: names[prefix], c: names[f.prefix] }));
  }
  if (off < 1 || off > (six ? 65536 : 9999)) return bad(m.addrPlcOff);
  const addr = off - 1;
  return { addr, error: null, note: fill(m.addrPlcNote, { a: t, b: addr, c: addr.toString(16).toUpperCase().padStart(4, "0") }) };
}

/** 0 기준 주소 → PLC 표기(40001 식). 9999 를 넘으면 6자리(400001 식) */
export function plcText(fc: number, addr: number) {
  const p = mbFuncInfo(fc)?.prefix ?? "4";
  return addr + 1 <= 9999 ? p + String(addr + 1).padStart(4, "0") : p + String(addr + 1).padStart(5, "0");
}

/** 표기·함수를 바꿀 때 주소 칸을 같은 주소로 옮겨 쓴다. 읽을 수 없으면 그대로 */
export function convertAddrText(text: string, from: { fc: number; mode: AddrMode }, to: { fc: number; mode: AddrMode }) {
  const a = parseAddr(text, from.fc, from.mode);
  if (a.addr == null) return text;
  return to.mode === "zero" ? String(a.addr) : plcText(to.fc, a.addr);
}

/** 값 칸 해석 — 쉼표·공백으로 나눔, 10진수·0x16진수. 코일은 1/0(ON/OFF 도 됨), 레지스터는 음수를 2의 보수로 */
export function parseValues(text: string, fc: number, lang: MbLang = "ko"): { values: number[] | null; error: string | null } {
  const m = M[lang];
  const f = mbFuncInfo(fc);
  if (!f || !f.write) return { values: null, error: m.func };
  const toks = text.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return { values: null, error: m.valEmpty };
  const values: number[] = [];
  for (const tok of toks) {
    const up = tok.toUpperCase();
    if (f.bit && (up === "ON" || up === "OFF")) {
      values.push(up === "ON" ? 1 : 0);
      continue;
    }
    const n = /^-?0x[0-9a-f]+$/i.test(tok) ? (tok.startsWith("-") ? -1 : 1) * parseInt(tok.replace(/^-?0x/i, ""), 16) : /^-?\d+$/.test(tok) ? Number(tok) : NaN;
    if (Number.isNaN(n)) return { values: null, error: fill(m.valBad, { a: tok }) };
    if (f.bit) {
      if (n !== 0 && n !== 1) return { values: null, error: fill(m.valCoil, { a: tok }) };
      values.push(n);
    } else {
      if (n < -32768 || n > 0xffff) return { values: null, error: fill(m.valReg, { a: tok }) };
      values.push(n & 0xffff);
    }
  }
  if (f.max === 1 && values.length !== 1) return { values: null, error: m.valOne };
  if (values.length > f.max) return { values: null, error: fill(m.valCount, { n: values.length, a: f.max }) };
  return { values, error: null };
}

export interface MbForm {
  slave: number;
  fc: number;
  addrText: string;
  addrMode: AddrMode;
  /** 읽기 함수의 개수(쓰기는 값 개수로 정해진다) */
  qty: number;
  valuesText: string;
}

export interface MbResult {
  /** CRC 앞까지의 요청 바이트(국번 + PDU). 틀렸으면 null */
  bytes: number[] | null;
  error: string | null;
  /** 주소 풀이(PLC 표기일 때) */
  note: string | null;
  /** 실제 시작 주소(0 기준)와 개수 — 이름 짓기에 쓴다 */
  addr: number | null;
  qty: number;
}

/** 칸 전체 → 요청 바이트. 가장 먼저 걸린 오류 하나만 돌려준다 */
export function buildRequest(form: MbForm, lang: MbLang = "ko"): MbResult {
  const m = M[lang];
  const f = mbFuncInfo(form.fc);
  const out = (error: string | null, extra: Partial<MbResult> = {}): MbResult => ({ bytes: null, error, note: null, addr: null, qty: 0, ...extra });
  if (!f) return out(m.func);
  if (!Number.isInteger(form.slave) || form.slave < 0 || form.slave > 247) return out(m.slave);
  if (form.slave === 0 && !f.write) return out(m.slaveRead);
  const a = parseAddr(form.addrText, form.fc, form.addrMode, lang);
  if (a.addr == null) return out(a.error);
  const addr = a.addr;
  let qty = form.qty;
  let values: number[] = [];
  if (f.write) {
    const v = parseValues(form.valuesText, form.fc, lang);
    if (!v.values) return out(v.error, { note: a.note, addr });
    values = v.values;
    qty = values.length;
  } else if (!Number.isInteger(qty) || qty < 1 || qty > f.max) {
    return out(fill(m.qty, { a: f.max }), { note: a.note, addr });
  }
  if (addr + qty - 1 > 0xffff) return out(fill(m.overflow, { a: addr, b: qty }), { note: a.note, addr, qty });
  const s = form.slave;
  const bytes =
    f.code === 0x05
      ? writeCoilReq(s, addr, values[0] === 1)
      : f.code === 0x06
        ? writeRegReq(s, addr, values[0])
        : f.code === 0x0f
          ? writeCoilsReq(s, addr, values)
          : f.code === 0x10
            ? writeRegsReq(s, addr, values)
            : readReq(s, f.code, addr, qty);
  return { bytes, error: null, note: a.note, addr, qty };
}
