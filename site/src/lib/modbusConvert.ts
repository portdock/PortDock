// 웹 도구 «Modbus RTU ↔ TCP 프레임 변환기» — 같은 PDU(함수 코드부터)를 RTU·TCP·ASCII 세 가지 겉포장으로 바꾼다.
// RTU: 국번 + PDU + CRC16(낮은 바이트 먼저). TCP: MBAP(트랜잭션 ID·프로토콜 0·길이·유닛 ID) + PDU, CRC 없음.
// ASCII: «:» + (국번 + PDU + LRC) 를 HEX 글자 2자씩 + CR LF. LRC = 바이트 합의 2의 보수.
// 근거: Modbus over Serial Line V1.02(RTU·ASCII 프레임, CRC·LRC), Modbus Messaging on TCP/IP Implementation Guide V1.0b(MBAP·유닛 ID).
// CRC·LRC 계산은 checksum.ts(crates/core 와 같은 시험값), PDU 풀이는 modbusDecode.ts 의 decodePdu 를 그대로 쓴다.
import { compute, crc16Modbus, hex, parseHex, type Lang } from "./checksum.ts";
import { decodePdu, funcName, type Reading } from "./modbusDecode.ts";

export type Format = "rtu" | "tcp" | "ascii";
export type InFormat = Format | "auto";

/** 바이트(또는 ASCII 글자) 묶음 하나 — 색으로 나눠 보여 줄 단위 */
export interface Segment {
  /** 색 구분 이름 */
  kind: "tid" | "proto" | "len" | "unit" | "pdu" | "crc" | "lrc" | "start" | "end";
  name: string;
  /** 선 위에 실리는 모양(HEX 바이트, ASCII 는 글자) */
  raw: string;
  value: string;
  /** pdu 조각일 때 몇 번째 조각인지(색 돌리기) */
  part?: number;
}

/** 겉포장을 벗긴 프레임 */
export interface Parsed {
  format: Format;
  /** 자동 판별 이유 */
  why: string;
  unit: number;
  pdu: number[];
  /** TCP 만 */
  tid?: number;
  /** 틀린 점(CRC·LRC·길이·프로토콜 등) — 비면 겉포장은 맞음 */
  problems: string[];
  /** 알아 둘 점 */
  notes: string[];
  segments: Segment[];
}

export interface Built {
  format: Format;
  /** RTU·TCP 는 HEX 바이트, ASCII 는 글자(CR LF 는 \r\n 으로) */
  text: string;
  /** ASCII 는 실제로 선에 실리는 바이트(HEX) */
  bytes: number[];
  segments: Segment[];
}

const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);
const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const u16 = (b: number[], i: number) => (b[i] << 8) | b[i + 1];

export const crcBytes = (b: number[]) => {
  const c = crc16Modbus(b);
  return [c & 0xff, c >> 8];
};
export const lrc = (b: number[]) => compute("lrc", b)[0];

const crcOk = (b: number[]) => {
  if (b.length < 4) return false;
  const [lo, hi] = crcBytes(b.slice(0, -2));
  return b[b.length - 2] === lo && b[b.length - 1] === hi;
};
const mbapOk = (b: number[]) => b.length >= 8 && b[2] === 0 && b[3] === 0 && u16(b, 4) === b.length - 6;

/** 국번·유닛 ID 의 뜻 — RTU 쪽에서 볼 때와 TCP 쪽에서 볼 때 */
export function unitMeaning(unit: number, side: "rtu" | "tcp", lang: Lang): string {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  if (side === "rtu") {
    if (unit === 0) return t("0 — 브로드캐스트(쓰기만, 아무도 응답하지 않음)", "0 — broadcast (writes only, nobody replies)");
    if (unit >= 248) return t(`${unit} — 시리얼 규격상 예약(장비 주소는 1~247)`, `${unit} — reserved on a serial line (device addresses are 1 to 247)`);
    return String(unit);
  }
  if (unit === 0) return t("0 — 게이트웨이에 따라 시리얼 브로드캐스트로 넘기거나 게이트웨이 자신으로 봅니다", "0 — depending on the gateway, forwarded as a serial broadcast or taken as the gateway itself");
  if (unit === 255) return t("255(FF) — 직접 연결한 TCP 장비에 권장되는 값. 게이트웨이에서는 보통 시리얼로 넘기지 않습니다", "255 (FF) — recommended for a TCP device addressed directly; a gateway usually does not forward it to the serial line");
  if (unit >= 248) return t(`${unit} — 시리얼 국번(1~247) 밖이라 게이트웨이가 넘기지 못할 수 있습니다`, `${unit} — outside serial addresses (1 to 247), so a gateway may not forward it`);
  return t(`${unit} — 게이트웨이 뒤 시리얼 장비의 국번`, `${unit} — address of the serial device behind the gateway`);
}

/** PDU 를 decodePdu 의 첫 해석 항목대로 조각낸다(조각마다 색). 바이트가 남으면 «나머지» */
export function pduSegments(pdu: number[], lang: Lang): { segments: Segment[]; readings: Reading[] } {
  if (!pdu.length) return { segments: [], readings: [] };
  const readings = decodePdu(pdu, lang);
  const segs: Segment[] = [];
  let at = 0;
  for (const f of readings[0].fields) {
    const n = f.raw ? f.raw.split(" ").length : 0;
    if (!n || at + n > pdu.length) break;
    segs.push({ kind: "pdu", name: f.name, raw: hex(pdu.slice(at, at + n)), value: f.value, part: segs.length });
    at += n;
  }
  if (at < pdu.length) segs.push({ kind: "pdu", name: msg(lang, "나머지", "Rest"), raw: hex(pdu.slice(at)), value: msg(lang, `${pdu.length - at} 바이트`, `${pdu.length - at} bytes`), part: segs.length });
  return { segments: segs, readings };
}

/** HEX 바이트로 붙여 넣은 ASCII 프레임(3A 30 31 … 0D 0A)인지 — 첫 바이트 3A 이고 나머지가 HEX 글자·CR·LF 뿐 */
function asciiAsBytes(text: string): number[] | null {
  if (!/^(0x)?3a/i.test(text)) return null;
  let b: number[];
  try {
    b = parseHex(text);
  } catch {
    return null;
  }
  const ok = b.length >= 7 && b[0] === 0x3a && b.slice(1).every((x) => (x >= 0x30 && x <= 0x39) || (x >= 0x41 && x <= 0x46) || (x >= 0x61 && x <= 0x66) || x === 0x0d || x === 0x0a);
  return ok ? b : null;
}

/** ASCII 글자열에서 «:» 다음부터 CR LF 앞까지. 실제 CR LF·«\r\n» 글자·<CR><LF> 모두 받는다 */
function asciiBody(text: string, lang: Lang): { body: string; crlf: boolean } {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  // 끝은 자르지 않는다 — 실제 CR LF(0D 0A 글자)가 trim 에 지워지면 «CR LF 없음» 으로 잘못 알린다
  let s = text.replace(/^\s+/, "");
  // HEX 바이트로 붙여 넣은 ASCII(3A 30 31 …)
  const asBytes = s.startsWith(":") ? null : asciiAsBytes(s.trim());
  if (asBytes) s = String.fromCharCode(...asBytes);
  if (!s.startsWith(":")) throw new Error(t("ASCII 프레임은 «:» 로 시작합니다", "An ASCII frame starts with «:»"));
  let crlf = false;
  const tail = /(\r\n|\\r\\n|<CR><LF>|<CR>\s*<LF>)\s*$/i;
  if (tail.test(s)) {
    crlf = true;
    s = s.replace(tail, "");
  }
  s = s.slice(1).replace(/\s+/g, "");
  return { body: s, crlf };
}

/** 붙여 넣은 글을 프레임 하나로 풀어 겉포장을 벗긴다. 너무 짧거나 HEX 가 아니면 Error */
export function parseFrame(text: string, fmt: InFormat = "auto", lang: Lang = "ko"): Parsed {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const trimmed = text.trim();
  if (!trimmed) throw new Error(t("프레임을 넣으세요", "Enter a frame"));
  let format: Format;
  let why = t("직접 고른 형식", "Format chosen by hand");
  let bytes: number[] = [];
  if (fmt === "auto") {
    if (trimmed.startsWith(":") || asciiAsBytes(trimmed)) {
      format = "ascii";
      why = t("«:» 로 시작해서 ASCII 로 봤습니다", "Starts with «:», so read as ASCII");
    } else {
      bytes = parseHex(trimmed, lang);
      if (crcOk(bytes)) {
        format = "rtu";
        why = mbapOk(bytes) ? t("CRC 가 맞아서 RTU 로 봤습니다(MBAP 모양도 맞음 — 아니면 TCP 를 고르세요)", "The CRC matches, so read as RTU (an MBAP header also fits — pick TCP if that is wrong)") : t("끝 2바이트 CRC 가 맞아서 RTU 로 봤습니다", "The trailing 2-byte CRC matches, so read as RTU");
      } else if (mbapOk(bytes)) {
        format = "tcp";
        why = t("프로토콜 ID 가 0 이고 길이 칸이 뒤 바이트 수와 같아서 TCP 로 봤습니다", "Protocol ID is 0 and the length field equals the remaining byte count, so read as TCP");
      } else {
        format = "rtu";
        why = t("CRC 도 MBAP 머리도 맞지 않습니다 — CRC 가 틀린 RTU 로 봤습니다", "Neither the CRC nor an MBAP header fits — read as RTU with a bad CRC");
      }
    }
  } else {
    format = fmt;
    if (fmt !== "ascii") bytes = parseHex(trimmed, lang);
  }

  const problems: string[] = [];
  const notes: string[] = [];
  const segments: Segment[] = [];
  let unit: number;
  let pdu: number[];
  let tid: number | undefined;

  if (format === "rtu") {
    if (bytes.length < 4) throw new Error(t("RTU 프레임은 국번·함수·CRC 2바이트로 적어도 4바이트입니다", "An RTU frame is at least 4 bytes: address, function and a 2-byte CRC"));
    unit = bytes[0];
    pdu = bytes.slice(1, -2);
    const want = crcBytes(bytes.slice(0, -2));
    const got = bytes.slice(-2);
    const ok = got[0] === want[0] && got[1] === want[1];
    segments.push({ kind: "unit", name: t("국번", "Slave address"), raw: h2(unit), value: unitMeaning(unit, "rtu", lang) });
    segments.push(...pduSegments(pdu, lang).segments);
    segments.push({ kind: "crc", name: "CRC", raw: hex(got), value: ok ? t("맞음(낮은 바이트 먼저)", "OK (low byte first)") : t(`틀림 — 올바른 값 ${hex(want)}`, `mismatch — correct value ${hex(want)}`) });
    if (!ok) problems.push(t(`CRC 가 틀립니다 — 받은 값 ${hex(got)}, 올바른 값 ${hex(want)}. 끝 2바이트를 CRC 로 보고 빼서 변환했습니다`, `CRC mismatch — received ${hex(got)}, correct ${hex(want)}. The last 2 bytes were taken as the CRC and dropped`));
    if (bytes.length > 256) problems.push(t(`RTU 프레임은 최대 256바이트입니다(지금 ${bytes.length})`, `An RTU frame is at most 256 bytes (got ${bytes.length})`));
  } else if (format === "tcp") {
    if (bytes.length < 8) throw new Error(t("Modbus TCP 프레임은 MBAP 머리 7바이트 + 함수로 적어도 8바이트입니다", "A Modbus TCP frame is at least 8 bytes: the 7-byte MBAP header plus a function code"));
    tid = u16(bytes, 0);
    const proto = u16(bytes, 2);
    const len = u16(bytes, 4);
    unit = bytes[6];
    pdu = bytes.slice(7);
    segments.push({ kind: "tid", name: t("트랜잭션 ID", "Transaction ID"), raw: hex(bytes.slice(0, 2)), value: t(`${tid} — 응답은 요청과 같은 번호`, `${tid} — the response repeats the request's number`) });
    segments.push({ kind: "proto", name: t("프로토콜 ID", "Protocol ID"), raw: hex(bytes.slice(2, 4)), value: proto === 0 ? "0 — Modbus" : t(`${proto} — 0 이어야 함`, `${proto} — must be 0`) });
    segments.push({ kind: "len", name: t("길이", "Length"), raw: hex(bytes.slice(4, 6)), value: len === bytes.length - 6 ? t(`${len} — 유닛 ID 부터 끝까지(맞음)`, `${len} — Unit ID to the end (matches)`) : t(`${len} — 뒤 바이트는 ${bytes.length - 6} 개(틀림)`, `${len} — ${bytes.length - 6} bytes follow (mismatch)`) });
    segments.push({ kind: "unit", name: t("유닛 ID", "Unit ID"), raw: h2(unit), value: unitMeaning(unit, "tcp", lang) });
    segments.push(...pduSegments(pdu, lang).segments);
    if (proto !== 0) problems.push(t("프로토콜 ID 가 0 이 아닙니다 — Modbus 가 아닐 수 있습니다", "Protocol ID is not 0 — this may not be Modbus"));
    if (len !== bytes.length - 6) problems.push(t(`길이 칸(${len})이 실제 뒤 바이트 수(${bytes.length - 6})와 다릅니다 — 프레임이 잘렸거나 두 개가 붙었을 수 있습니다. 실제 바이트로 변환했습니다`, `The length field (${len}) differs from the bytes that follow (${bytes.length - 6}) — the frame may be cut off or two frames joined. Converted using the actual bytes`));
  } else {
    const { body, crlf } = asciiBody(text, lang);
    if (!body.length || body.length % 2) throw new Error(t("«:» 뒤 HEX 글자 수가 짝수여야 합니다(바이트마다 2글자)", "The HEX characters after «:» must come in pairs (2 per byte)"));
    const bad = [...body].find((c) => !/[0-9a-fA-F]/.test(c));
    if (bad) throw new Error(t(`HEX 가 아닌 글자: «${bad}»`, `Not a HEX digit: «${bad}»`));
    const b: number[] = [];
    for (let i = 0; i < body.length; i += 2) b.push(parseInt(body.slice(i, i + 2), 16));
    if (b.length < 3) throw new Error(t("ASCII 프레임은 국번·함수·LRC 로 적어도 3바이트(6글자)입니다", "An ASCII frame is at least 3 bytes (6 characters): address, function and LRC"));
    unit = b[0];
    pdu = b.slice(1, -1);
    const got = b[b.length - 1];
    const want = lrc(b.slice(0, -1));
    segments.push({ kind: "start", name: t("시작", "Start"), raw: ":", value: t("3A — 프레임 시작", "3A — frame start") });
    segments.push({ kind: "unit", name: t("국번", "Slave address"), raw: body.slice(0, 2), value: unitMeaning(unit, "rtu", lang) });
    let at = 2;
    for (const s of pduSegments(pdu, lang).segments) {
      const n = s.raw.split(" ").length * 2;
      segments.push({ ...s, raw: body.slice(at, at + n) });
      at += n;
    }
    segments.push({ kind: "lrc", name: "LRC", raw: body.slice(-2), value: got === want ? t("맞음", "OK") : t(`틀림 — 올바른 값 ${h2(want)}`, `mismatch — correct value ${h2(want)}`) });
    if (crlf) segments.push({ kind: "end", name: t("끝", "End"), raw: "CR LF", value: "0D 0A" });
    if (got !== want) problems.push(t(`LRC 가 틀립니다 — 받은 값 ${h2(got)}, 올바른 값 ${h2(want)}. 마지막 바이트를 LRC 로 보고 빼서 변환했습니다`, `LRC mismatch — received ${h2(got)}, correct ${h2(want)}. The last byte was taken as the LRC and dropped`));
    if (!crlf) notes.push(t("끝의 CR LF(0D 0A)가 없습니다 — 보낼 때는 꼭 붙여야 합니다", "The trailing CR LF (0D 0A) is missing — it must be sent"));
    if (/[a-f]/.test(body)) notes.push(t("규격은 HEX 를 대문자로 보냅니다 — 소문자를 받지 않는 장비가 있습니다", "The specification sends HEX in upper case — some devices reject lower case"));
  }
  if (!pdu.length) throw new Error(t("함수 코드가 없습니다", "No function code"));
  return { format, why, unit, pdu, tid, problems, notes, segments };
}

/** PDU 를 원하는 형식으로 싸기 */
export function buildFrame(format: Format, unit: number, pdu: number[], tid = 1, lang: Lang = "ko"): Built {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const { segments: ps } = pduSegments(pdu, lang);
  if (format === "rtu") {
    const body = [unit, ...pdu];
    const c = crcBytes(body);
    const bytes = [...body, ...c];
    return {
      format,
      text: hex(bytes),
      bytes,
      segments: [
        { kind: "unit", name: t("국번", "Slave address"), raw: h2(unit), value: unitMeaning(unit, "rtu", lang) },
        ...ps,
        { kind: "crc", name: "CRC", raw: hex(c), value: t(`CRC16 0x${h2(c[1])}${h2(c[0])} — 낮은 바이트 먼저`, `CRC16 0x${h2(c[1])}${h2(c[0])} — low byte first`) },
      ],
    };
  }
  if (format === "tcp") {
    const len = pdu.length + 1;
    const bytes = [(tid >> 8) & 0xff, tid & 0xff, 0, 0, len >> 8, len & 0xff, unit, ...pdu];
    return {
      format,
      text: hex(bytes),
      bytes,
      segments: [
        { kind: "tid", name: t("트랜잭션 ID", "Transaction ID"), raw: hex(bytes.slice(0, 2)), value: t(`${tid} — 응답은 요청과 같은 번호`, `${tid} — the response repeats the request's number`) },
        { kind: "proto", name: t("프로토콜 ID", "Protocol ID"), raw: "00 00", value: "0 — Modbus" },
        { kind: "len", name: t("길이", "Length"), raw: hex(bytes.slice(4, 6)), value: t(`${len} — 유닛 ID 1 + PDU ${pdu.length}`, `${len} — Unit ID 1 + PDU ${pdu.length}`) },
        { kind: "unit", name: t("유닛 ID", "Unit ID"), raw: h2(unit), value: unitMeaning(unit, "tcp", lang) },
        ...ps,
      ],
    };
  }
  const body = [unit, ...pdu];
  const l = lrc(body);
  const chars = ":" + [...body, l].map(h2).join("");
  const bytes = [...chars, "\r", "\n"].map((c) => c.charCodeAt(0));
  return {
    format,
    text: chars + "\\r\\n",
    bytes,
    segments: [
      { kind: "start", name: t("시작", "Start"), raw: ":", value: t("3A — 프레임 시작", "3A — frame start") },
      { kind: "unit", name: t("국번", "Slave address"), raw: h2(unit), value: unitMeaning(unit, "rtu", lang) },
      ...ps.map((s) => ({ ...s, raw: s.raw.replace(/ /g, "") })),
      { kind: "lrc", name: "LRC", raw: h2(l), value: t(`국번+PDU 바이트 합의 2의 보수`, `Two's complement of the address + PDU byte sum`) },
      { kind: "end", name: t("끝", "End"), raw: "CR LF", value: "0D 0A" },
    ],
  };
}

/** 변환할 때 알아 둘 점 — 형식이 바뀌며 생기는 일(유닛 ID·트랜잭션 ID·함수 제한) */
export function convertNotes(p: Parsed, to: Format, lang: Lang): string[] {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const out: string[] = [];
  if (p.format === to) return out;
  if (to === "tcp" && p.format !== "tcp") {
    out.push(t(`국번 ${p.unit} 을 유닛 ID 로 옮겼습니다. 게이트웨이를 거치면 이 값이 시리얼 쪽 국번이 됩니다`, `Slave address ${p.unit} became the Unit ID. Through a gateway this becomes the address on the serial side`));
    out.push(t("트랜잭션 ID 는 보내는 쪽이 정합니다 — 응답이면 짝 요청의 번호를 넣으세요", "The sender picks the Transaction ID — for a response, use the number from its request"));
  }
  if (to !== "tcp" && p.format === "tcp") {
    out.push(t(`유닛 ID ${p.unit} 을 국번으로 옮겼습니다. 트랜잭션 ID(${p.tid})는 시리얼 프레임에 없어서 사라집니다`, `Unit ID ${p.unit} became the slave address. The Transaction ID (${p.tid}) has no place in a serial frame and is dropped`));
    if (p.unit === 0) out.push(t("국번 0 은 시리얼에서 브로드캐스트입니다 — 모든 장비가 받고 아무도 응답하지 않습니다(읽기 요청은 쓸 수 없음)", "Address 0 is a broadcast on a serial line — every device acts on it and none replies (read requests cannot be broadcast)"));
    else if (p.unit >= 248) out.push(t(`국번 ${p.unit} 은 시리얼에서 쓰지 않는 값입니다(1~247). 장비에 맞는 국번으로 바꿔야 합니다`, `Address ${p.unit} is not used on a serial line (1 to 247). Change it to the device's address`));
  }
  const fc = p.pdu[0] & 0x7f;
  if (to === "tcp" && [0x07, 0x08, 0x0b, 0x0c, 0x11].includes(fc)) out.push(t(`함수 ${h2(fc)}(${funcName(fc, lang)})는 시리얼 전용입니다 — TCP 장비가 받지 않을 수 있습니다`, `Function ${h2(fc)} (${funcName(fc, lang)}) is serial-line only — a TCP device may reject it`));
  if (p.pdu.length > 253) out.push(t(`PDU 가 ${p.pdu.length} 바이트로 규격 최대 253 을 넘습니다`, `The PDU is ${p.pdu.length} bytes, over the 253-byte maximum`));
  return out;
}
