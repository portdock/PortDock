// 웹 도구 «Modbus 프레임 해석기» 의 풀이 — crates/core/src/modbus.rs 의 decode 와 같은 규칙(길이로 요청·응답 가리기,
// 01·02 바이트 수 3 은 둘 다)으로 풀고, 모양이 둘 다 맞으면 두 해석을 다 돌려준다. 시험값도 그쪽 것을 쓴다(modbusDecode.test.ts).
// 근거: Modbus Application Protocol Specification V1.1b3(함수·예외·개수 한도), Modbus over Serial Line V1.02(RTU 프레임·국번·CRC),
// Modbus Messaging on TCP/IP Implementation Guide V1.0b(MBAP 머리).
import { crc16Modbus, hex, type Lang } from "./checksum.ts";

export type WireMode = "auto" | "rtu" | "tcp";
/** 데이터 표 — co 코일 · di 입력 접점 · hr 보유 레지스터 · ir 입력 레지스터 */
export type Space = "co" | "di" | "hr" | "ir";

export interface Field {
  name: string;
  /** 그 항목의 원래 바이트(HEX) */
  raw: string;
  value: string;
}

export interface Table {
  space: Space;
  /** 시작 주소(0 기준). 응답처럼 프레임에 없으면 null */
  start: number | null;
  values: number[];
  /** 값 표의 제목 */
  caption: string;
}

export interface Reading {
  role: "request" | "response" | "echo" | "exception" | "unknown";
  title: string;
  fields: Field[];
  tables: Table[];
  /** 규격과 다른 점 */
  issues: string[];
}

export interface Decoded {
  wire: "rtu" | "tcp";
  /** 자동 판별로 고른 것인지 */
  auto: boolean;
  /** 왜 이 형식으로 봤는지 */
  why: string;
  /** RTU 국번 또는 MBAP 머리 */
  header: Field[];
  /** RTU 만 */
  crc?: { ok: boolean; got: number[]; want: number[] };
  unit: number;
  fc: number;
  fname: string;
  readings: Reading[];
  /** 프레임 전체에 대한 알림 */
  notes: string[];
}

const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);
const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const h4 = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");
const u16 = (b: number[], i: number) => (b[i] << 8) | b[i + 1];

/** 공개 함수 코드(Application Protocol V1.1b3 §5.1). 앞 9개만 풀고, 나머지는 이름만 */
const FUNCS: Record<number, { ko: string; en: string }> = {
  0x01: { ko: "코일 읽기", en: "Read Coils" },
  0x02: { ko: "입력 접점 읽기", en: "Read Discrete Inputs" },
  0x03: { ko: "보유 레지스터 읽기", en: "Read Holding Registers" },
  0x04: { ko: "입력 레지스터 읽기", en: "Read Input Registers" },
  0x05: { ko: "코일 하나 쓰기", en: "Write Single Coil" },
  0x06: { ko: "레지스터 하나 쓰기", en: "Write Single Register" },
  0x0f: { ko: "코일 여러 개 쓰기", en: "Write Multiple Coils" },
  0x10: { ko: "레지스터 여러 개 쓰기", en: "Write Multiple Registers" },
  0x17: { ko: "레지스터 읽기·쓰기 한 번에", en: "Read/Write Multiple Registers" },
  0x07: { ko: "예외 상태 읽기(시리얼 전용)", en: "Read Exception Status (serial line only)" },
  0x08: { ko: "진단(시리얼 전용)", en: "Diagnostics (serial line only)" },
  0x0b: { ko: "통신 이벤트 카운터(시리얼 전용)", en: "Get Comm Event Counter (serial line only)" },
  0x0c: { ko: "통신 이벤트 기록(시리얼 전용)", en: "Get Comm Event Log (serial line only)" },
  0x11: { ko: "장비 ID 보고(시리얼 전용)", en: "Report Server ID (serial line only)" },
  0x14: { ko: "파일 레코드 읽기", en: "Read File Record" },
  0x15: { ko: "파일 레코드 쓰기", en: "Write File Record" },
  0x16: { ko: "마스크 쓰기", en: "Mask Write Register" },
  0x18: { ko: "FIFO 큐 읽기", en: "Read FIFO Queue" },
  0x2b: { ko: "캡슐 인터페이스(장치 식별 등)", en: "Encapsulated Interface Transport" },
};
export const DECODED_FUNCS = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x0f, 0x10, 0x17];

export function funcName(fc: number, lang: Lang) {
  const f = FUNCS[fc & 0x7f];
  return f ? f[lang] : msg(lang, "알 수 없는 함수", "Unknown function");
}

/** 예외 코드(Application Protocol V1.1b3 §7). 07·09 는 이 판에 정의가 없다 */
export const EXCEPTIONS: Record<number, { name: string; ko: string; en: string }> = {
  0x01: { name: "Illegal Function", ko: "장비가 이 함수 코드를 지원하지 않거나 지금 상태에서 처리할 수 없습니다.", en: "The function code is not supported, or not allowed in the device's current state." },
  0x02: { name: "Illegal Data Address", ko: "요청한 주소(또는 시작 주소+개수 범위)가 장비에 없습니다.", en: "The address, or the start address plus quantity, does not exist in the device." },
  0x03: { name: "Illegal Data Value", ko: "요청에 담긴 값이 허용되지 않습니다(개수·바이트 수 같은 요청 모양 포함).", en: "A value in the request is not allowed, including its structure such as quantity or byte count." },
  0x04: { name: "Server Device Failure", ko: "요청을 처리하는 동안 장비에서 복구할 수 없는 오류가 났습니다.", en: "An unrecoverable error occurred while the device was performing the action." },
  0x05: { name: "Acknowledge", ko: "요청은 받았고 처리에 시간이 걸립니다. 끝났는지는 나중에 다시 물어야 합니다.", en: "The request was accepted but takes a long time; poll later to see whether it finished." },
  0x06: { name: "Server Device Busy", ko: "장비가 오래 걸리는 명령을 처리 중입니다. 나중에 다시 보내야 합니다.", en: "The device is busy with a long-running command; retry later." },
  0x07: { name: "—", ko: "Application Protocol V1.1b3 에 정의되지 않은 코드입니다.", en: "Not defined in Application Protocol V1.1b3." },
  0x08: { name: "Memory Parity Error", ko: "파일 레코드 읽기·쓰기(함수 0x14·0x15)에서 메모리 패리티 오류가 났습니다.", en: "A memory parity error was found while reading or writing a file record (functions 0x14/0x15)." },
  0x09: { name: "—", ko: "Application Protocol V1.1b3 에 정의되지 않은 코드입니다.", en: "Not defined in Application Protocol V1.1b3." },
  0x0a: { name: "Gateway Path Unavailable", ko: "게이트웨이가 대상 장비로 가는 경로를 잡지 못했습니다(설정 오류·과부하).", en: "The gateway could not set up a path to the target (misconfigured or overloaded)." },
  0x0b: { name: "Gateway Target Device Failed to Respond", ko: "게이트웨이 뒤의 대상 장비가 응답하지 않았습니다.", en: "The device behind the gateway did not respond." },
};

const SPACE = {
  co: { prefix: 0, ko: "코일", en: "Coils" },
  di: { prefix: 1, ko: "입력 접점", en: "Discrete inputs" },
  hr: { prefix: 4, ko: "보유 레지스터", en: "Holding registers" },
  ir: { prefix: 3, ko: "입력 레지스터", en: "Input registers" },
} as const;

export const isBitSpace = (s: Space) => s === "co" || s === "di";

/** 40001 식 표기 — 9999 까지 5자리(40001), 넘으면 6자리(410000). core AddrStyle::addr 와 같다 */
export function plcAddr(space: Space, a: number) {
  const p = SPACE[space].prefix;
  return a < 9999 ? `${p}${String(a + 1).padStart(4, "0")}` : `${p}${String(a + 1).padStart(5, "0")}`;
}

export interface Row {
  /** 몇 번째(0부터) */
  i: number;
  zero: string;
  plc: string;
  dec: number;
  signed: number;
  hex: string;
}

/** 값 표의 줄 — 시작 주소를 모르면 주소 칸은 «+n» */
export function tableRows(t: Table, start: number | null = t.start): Row[] {
  return t.values.map((v, i) => {
    const a = start === null ? null : start + i;
    const ok = a !== null && a <= 0xffff;
    return {
      i,
      zero: ok ? String(a) : `+${i}`,
      plc: ok ? plcAddr(t.space, a!) : "",
      dec: v,
      signed: v >= 0x8000 ? v - 0x10000 : v,
      hex: isBitSpace(t.space) ? (v ? "ON" : "OFF") : h4(v),
    };
  });
}

const bits = (bytes: number[], count: number) => Array.from({ length: count }, (_, i) => (bytes[i >> 3] >> (i & 7)) & 1);
const regs = (bytes: number[]) => Array.from({ length: bytes.length >> 1 }, (_, i) => u16(bytes, i * 2));

function spaceOf(fc: number): Space {
  if (fc === 0x01 || fc === 0x05 || fc === 0x0f) return "co";
  if (fc === 0x02) return "di";
  if (fc === 0x04) return "ir";
  return "hr";
}

/** PDU(함수 코드부터) 하나를 풀 수 있는 해석들로 */
export function decodePdu(pdu: number[], lang: Lang): Reading[] {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const fc = pdu[0];
  const n = pdu.length;
  const f = (name: string, from: number, len: number, value: string): Field => ({ name, raw: hex(pdu.slice(from, from + len)), value });
  const fcField = f(t("함수", "Function"), 0, 1, `${h2(fc)} ${funcName(fc, lang)}`);
  const space = spaceOf(fc & 0x7f);
  const out: Reading[] = [];
  const range = (q: number, lo: number, hi: number, what: string, issues: string[]) => {
    if (q < lo || q > hi) issues.push(t(`${what} ${q} — 규격 범위는 ${lo}~${hi}`, `${what} ${q} — the specification allows ${lo} to ${hi}`));
  };
  const addrOver = (a: number, q: number, issues: string[]) => {
    if (q > 0 && a + q > 0x10000) issues.push(t("시작 주소 + 개수가 65535 를 넘습니다", "Start address plus quantity runs past 65535"));
  };

  // 예외 응답: 함수 | 0x80 + 예외 코드
  if (fc & 0x80) {
    const code = pdu[1];
    const e = code === undefined ? undefined : EXCEPTIONS[code];
    const issues: string[] = [];
    if (n !== 2) issues.push(t(`예외 응답 PDU 는 2바이트여야 합니다(지금 ${n})`, `An exception response PDU is 2 bytes (got ${n})`));
    if (code !== undefined && !e) issues.push(t(`예외 코드 ${h2(code)} 는 규격에 없습니다`, `Exception code ${h2(code)} is not in the specification`));
    const fields = [f(t("함수", "Function"), 0, 1, `${h2(fc)} = ${h2(fc & 0x7f)} | 80 — ${funcName(fc, lang)}`)];
    if (code !== undefined) fields.push(f(t("예외 코드", "Exception code"), 1, 1, `${h2(code)} ${e?.name ?? "?"}${e ? " — " + e[lang] : ""}`));
    out.push({ role: "exception", title: t("예외 응답", "Exception response"), fields, tables: [], issues });
    return out;
  }

  const readReq = (lo: number, hi: number): Reading => {
    const a = u16(pdu, 1);
    const q = u16(pdu, 3);
    const issues: string[] = [];
    range(q, lo, hi, t("개수", "Quantity"), issues);
    addrOver(a, q, issues);
    return {
      role: "request",
      title: t("요청으로 보면", "As a request"),
      fields: [fcField, f(t("시작 주소", "Start address"), 1, 2, `${a} (${plcAddr(space, a)})`), f(t("개수", "Quantity"), 3, 2, String(q))],
      tables: [],
      issues,
    };
  };
  const readResp = (bit: boolean): Reading => {
    const data = pdu.slice(2);
    const issues: string[] = [];
    if (!bit && data.length % 2) issues.push(t("레지스터 응답의 바이트 수가 홀수입니다", "Register response byte count is odd"));
    const values = bit ? bits(data, data.length * 8) : regs(data);
    if (bit) issues.push(t("마지막 바이트의 남는 비트는 0 으로 채워집니다 — 요청한 개수만 보세요", "Unused bits in the last byte are padded with 0 — read only as many as were requested"));
    return {
      role: "response",
      title: t("응답으로 보면", "As a response"),
      fields: [fcField, f(t("바이트 수", "Byte count"), 1, 1, String(pdu[1])), f(t("데이터", "Data"), 2, data.length, t(`${values.length} ${bit ? "비트" : "개 레지스터"}`, `${values.length} ${bit ? "bits" : "registers"}`))],
      tables: [{ space, start: null, values, caption: SPACE[space][lang] }],
      issues,
    };
  };

  switch (fc) {
    case 0x01:
    case 0x02:
    case 0x03:
    case 0x04: {
      const bit = fc <= 0x02;
      const asReq = n === 5;
      const asResp = n >= 2 && pdu[1] === n - 2 && (bit || (n - 2) % 2 === 0);
      if (asReq) out.push(readReq(1, bit ? 2000 : 125));
      if (asResp) out.push(readResp(bit));
      break;
    }
    case 0x05:
    case 0x06: {
      if (n !== 5) break;
      const a = u16(pdu, 1);
      const v = u16(pdu, 3);
      const issues: string[] = [];
      let shown = String(v);
      if (fc === 0x05) {
        shown = v === 0xff00 ? "ON (FF 00)" : v === 0 ? "OFF (00 00)" : `${h4(v)} — ${t("규격 값은 FF00(ON)·0000(OFF) 뿐", "only FF00 (ON) and 0000 (OFF) are valid")}`;
        if (v !== 0xff00 && v !== 0) issues.push(t("코일 값은 FF 00 또는 00 00 이어야 합니다", "A coil value must be FF 00 or 00 00"));
      } else shown = `${v} (${h4(v)}${v >= 0x8000 ? `, ${t("부호 있음", "signed")} ${v - 0x10000}` : ""})`;
      out.push({
        role: "echo",
        title: t("요청 또는 응답 — 정상 응답은 요청을 그대로 되돌립니다", "Request or response — a normal response echoes the request"),
        fields: [fcField, f(t("주소", "Address"), 1, 2, `${a} (${plcAddr(space, a)})`), f(t("값", "Value"), 3, 2, shown)],
        tables: fc === 0x06 ? [{ space, start: a, values: [v], caption: SPACE[space][lang] }] : [],
        issues,
      });
      break;
    }
    case 0x0f:
    case 0x10: {
      const bit = fc === 0x0f;
      if (n === 5) {
        const a = u16(pdu, 1);
        const q = u16(pdu, 3);
        out.push({
          role: "response",
          title: t("응답으로 보면(쓴 범위 확인)", "As a response (confirms the written range)"),
          fields: [fcField, f(t("시작 주소", "Start address"), 1, 2, `${a} (${plcAddr(space, a)})`), f(t("개수", "Quantity"), 3, 2, String(q))],
          tables: [],
          issues: [],
        });
      }
      if (n >= 6 && pdu[5] === n - 6) {
        const a = u16(pdu, 1);
        const q = u16(pdu, 3);
        const data = pdu.slice(6);
        const issues: string[] = [];
        range(q, 1, bit ? 1968 : 123, t("개수", "Quantity"), issues);
        addrOver(a, q, issues);
        const want = bit ? Math.ceil(q / 8) : q * 2;
        if (pdu[5] !== want) issues.push(t(`바이트 수 ${pdu[5]} 이 개수 ${q} 에 맞지 않습니다(${want} 이어야 함)`, `Byte count ${pdu[5]} does not match quantity ${q} (should be ${want})`));
        const values = bit ? bits(data, Math.min(q, data.length * 8)) : regs(data);
        out.push({
          role: "request",
          title: t("요청으로 보면", "As a request"),
          fields: [
            fcField,
            f(t("시작 주소", "Start address"), 1, 2, `${a} (${plcAddr(space, a)})`),
            f(t("개수", "Quantity"), 3, 2, String(q)),
            f(t("바이트 수", "Byte count"), 5, 1, String(pdu[5])),
            f(t("쓸 값", "Values"), 6, data.length, t(`${values.length} ${bit ? "비트" : "개 레지스터"}`, `${values.length} ${bit ? "bits" : "registers"}`)),
          ],
          tables: [{ space, start: a, values, caption: SPACE[space][lang] }],
          issues,
        });
      }
      break;
    }
    case 0x17: {
      if (n >= 10 && pdu[9] === n - 10) {
        const ra = u16(pdu, 1);
        const rq = u16(pdu, 3);
        const wa = u16(pdu, 5);
        const wq = u16(pdu, 7);
        const data = pdu.slice(10);
        const issues: string[] = [];
        range(rq, 1, 125, t("읽기 개수", "Read quantity"), issues);
        range(wq, 1, 121, t("쓰기 개수", "Write quantity"), issues);
        if (pdu[9] !== wq * 2) issues.push(t(`바이트 수 ${pdu[9]} 이 쓰기 개수 ${wq} 에 맞지 않습니다(${wq * 2} 이어야 함)`, `Byte count ${pdu[9]} does not match write quantity ${wq} (should be ${wq * 2})`));
        out.push({
          role: "request",
          title: t("요청으로 보면(쓰기를 먼저 하고 읽기를 합니다)", "As a request (the write happens before the read)"),
          fields: [
            fcField,
            f(t("읽기 시작 주소", "Read start"), 1, 2, `${ra} (${plcAddr(space, ra)})`),
            f(t("읽기 개수", "Read quantity"), 3, 2, String(rq)),
            f(t("쓰기 시작 주소", "Write start"), 5, 2, `${wa} (${plcAddr(space, wa)})`),
            f(t("쓰기 개수", "Write quantity"), 7, 2, String(wq)),
            f(t("바이트 수", "Byte count"), 9, 1, String(pdu[9])),
            f(t("쓸 값", "Values"), 10, data.length, t(`${data.length >> 1} 개 레지스터`, `${data.length >> 1} registers`)),
          ],
          tables: [{ space, start: wa, values: regs(data), caption: t("쓸 값", "Values to write") }],
          issues,
        });
      }
      if (n >= 2 && pdu[1] === n - 2 && (n - 2) % 2 === 0) out.push(readResp(false));
      break;
    }
  }
  if (!out.length) {
    const known = DECODED_FUNCS.includes(fc);
    out.push({
      role: "unknown",
      title: known ? t("모양이 맞지 않음", "Shape does not match") : t("이 도구가 풀지 않는 함수", "Function not decoded by this tool"),
      fields: [fcField, ...(n > 1 ? [f(t("데이터", "Data"), 1, n - 1, t(`${n - 1} 바이트`, `${n - 1} bytes`))] : [])],
      tables: [],
      issues: known
        ? [t(`길이(${n}바이트)나 바이트 수가 요청·응답 어느 쪽 모양에도 맞지 않습니다`, `The length (${n} bytes) or byte count fits neither the request nor the response layout`)]
        : [],
    });
  }
  return out;
}

const crcBytes = (b: number[]) => {
  const c = crc16Modbus(b);
  return [c & 0xff, c >> 8];
};
const crcOk = (b: number[]) => {
  if (b.length < 4) return false;
  const [lo, hi] = crcBytes(b.slice(0, -2));
  return b[b.length - 2] === lo && b[b.length - 1] === hi;
};
const mbapOk = (b: number[]) => b.length >= 8 && b[2] === 0 && b[3] === 0 && u16(b, 4) === b.length - 6;

/** 바이트 한 묶음(프레임 하나)을 RTU 또는 TCP 로 풀이. 너무 짧으면 Error */
export function decodeFrame(bytes: number[], mode: WireMode = "auto", lang: Lang = "ko"): Decoded {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  let wire: "rtu" | "tcp";
  let why: string;
  if (mode === "auto") {
    const rtu = crcOk(bytes);
    const tcp = mbapOk(bytes);
    if (rtu) {
      wire = "rtu";
      why = tcp ? t("CRC 가 맞아서 RTU 로 봤습니다(MBAP 머리 모양도 맞음 — 아니면 TCP 로 바꿔 보세요)", "The CRC matches, so read as RTU (an MBAP header also fits — switch to TCP if that is wrong)") : t("끝 2바이트 CRC 가 맞아서 RTU 로 봤습니다", "The trailing 2-byte CRC matches, so read as RTU");
    } else if (tcp) {
      wire = "tcp";
      why = t("프로토콜 ID 가 0 이고 길이 칸이 뒤 바이트 수와 같아서 TCP 로 봤습니다", "Protocol ID is 0 and the length field equals the remaining byte count, so read as TCP");
    } else {
      wire = "rtu";
      why = t("CRC 도 MBAP 머리도 맞지 않습니다 — CRC 가 틀린 RTU 로 풀었습니다", "Neither the CRC nor an MBAP header fits — read as RTU with a bad CRC");
    }
  } else {
    wire = mode;
    why = t("직접 고른 형식", "Format chosen by hand");
  }

  const notes: string[] = [];
  let header: Field[];
  let pdu: number[];
  let unit: number;
  let crc: Decoded["crc"];
  if (wire === "rtu") {
    if (bytes.length < 4) throw new Error(t("RTU 프레임은 국번·함수·CRC 2바이트로 적어도 4바이트입니다", "An RTU frame is at least 4 bytes: address, function and a 2-byte CRC"));
    unit = bytes[0];
    pdu = bytes.slice(1, -2);
    const want = crcBytes(bytes.slice(0, -2));
    const got = bytes.slice(-2);
    crc = { ok: got[0] === want[0] && got[1] === want[1], got, want };
    header = [{ name: t("국번(슬레이브 주소)", "Slave address"), raw: hex([unit]), value: unit === 0 ? t("0 — 브로드캐스트(쓰기만, 응답 없음)", "0 — broadcast (writes only, no reply)") : unit >= 248 ? t(`${unit} — 규격상 예약(1~247 만 장비 주소)`, `${unit} — reserved (device addresses are 1 to 247)`) : String(unit) }];
    if (!crc.ok) notes.push(t(`CRC 를 빼고 붙여 넣었다면 이 전체 뒤에 붙일 CRC 는 ${hex(crcBytes(bytes))} 입니다`, `If you pasted the frame without its CRC, the CRC to append to all of it is ${hex(crcBytes(bytes))}`));
    if (bytes.length > 256) notes.push(t(`RTU 프레임은 최대 256바이트입니다(지금 ${bytes.length})`, `An RTU frame is at most 256 bytes (got ${bytes.length})`));
  } else {
    if (bytes.length < 8) throw new Error(t("Modbus TCP 프레임은 MBAP 머리 7바이트 + 함수로 적어도 8바이트입니다", "A Modbus TCP frame is at least 8 bytes: the 7-byte MBAP header plus a function code"));
    const len = u16(bytes, 4);
    const proto = u16(bytes, 2);
    unit = bytes[6];
    pdu = bytes.slice(7);
    header = [
      { name: t("트랜잭션 ID", "Transaction ID"), raw: hex(bytes.slice(0, 2)), value: t(`${u16(bytes, 0)} — 응답은 요청과 같은 번호를 되돌립니다`, `${u16(bytes, 0)} — the response carries the same number as its request`) },
      { name: t("프로토콜 ID", "Protocol ID"), raw: hex(bytes.slice(2, 4)), value: proto === 0 ? t("0 — Modbus", "0 — Modbus") : t(`${proto} — Modbus 는 0 이어야 합니다`, `${proto} — must be 0 for Modbus`) },
      { name: t("길이", "Length"), raw: hex(bytes.slice(4, 6)), value: len === bytes.length - 6 ? t(`${len} — 유닛 ID 부터 끝까지 바이트 수(맞음)`, `${len} — bytes from Unit ID to the end (matches)`) : t(`${len} — 뒤 바이트는 ${bytes.length - 6} 개입니다(틀림)`, `${len} — but ${bytes.length - 6} bytes follow (mismatch)`) },
      { name: t("유닛 ID", "Unit ID"), raw: hex([unit]), value: t(`${unit} — 게이트웨이 뒤 시리얼 장비의 국번. 직접 연결한 TCP 장비는 보통 무시(권장 255)`, `${unit} — slave address behind a gateway; a TCP device addressed directly usually ignores it (255 recommended)`) },
    ];
    if (proto !== 0) notes.push(t("프로토콜 ID 가 0 이 아닙니다", "Protocol ID is not 0"));
    if (len !== bytes.length - 6) notes.push(t(`길이 칸(${len})이 실제 뒤 바이트 수(${bytes.length - 6})와 다릅니다 — 프레임이 잘렸거나 두 개가 붙었을 수 있습니다`, `The length field (${len}) differs from the bytes that follow (${bytes.length - 6}) — the frame may be cut off or two frames joined`));
    if (pdu.length > 253) notes.push(t(`PDU 는 최대 253바이트입니다(지금 ${pdu.length})`, `A PDU is at most 253 bytes (got ${pdu.length})`));
  }
  if (!pdu.length) throw new Error(t("함수 코드가 없습니다", "No function code"));
  const fc = pdu[0];
  return { wire, auto: mode === "auto", why, header, crc, unit, fc, fname: funcName(fc, lang), readings: decodePdu(pdu, lang), notes };
}
